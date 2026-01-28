/**
 * Pipeline Human Approval API
 *
 * Handle human approval/rejection for suspended pipeline executions
 * Integrates with WorkflowExecutionEngineV2's HITL (Human-in-the-Loop) system
 * Part of Phase 3: Human-in-the-Loop Implementation
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { resumePipelineExecution } from "@/server/lib/pipeline-queue";
import { workflowExecutionEngineV2 } from "@/server/services/WorkflowExecutionEngineV2";
import { emitWorkflowUpdate } from "@/server/socket";

async function getAuthenticatedUser(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return null;

  try {
    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user || null;
  } catch {
    return null;
  }
}

/**
 * GET - Get pending approvals for a pipeline
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const pipelineId = params.id;

    // Get pending approvals - check for both 'suspended' (V2) and 'waiting_approval' (legacy)
    const pendingApprovals = await db.execute(sql`
      SELECT
        we.id as execution_id,
        we.status,
        we.started_at,
        we.input,
        we.output,
        we.logs,
        we.current_step_index,
        w.name as pipeline_name,
        w.nodes,
        (
          SELECT jsonb_build_object(
            'nodeId', log->>'nodeId',
            'nodeName', log->>'nodeName',
            'message', log->>'output'->'message',
            'timestamp', log->>'timestamp'
          )
          FROM jsonb_array_elements(we.logs) AS log
          WHERE log->>'status' = 'completed'
            AND log->'output'->>'approvalRequired' = 'true'
          ORDER BY (log->>'timestamp')::timestamp DESC
          LIMIT 1
        ) as approval_node
      FROM workflow_executions we
      JOIN workflows w ON w.id = we.workflow_id
      WHERE we.workflow_id = ${pipelineId}
        AND w.user_id = ${user.id}
        AND (we.status = 'waiting_approval' OR we.status = 'suspended')
      ORDER BY we.started_at DESC
    `);

    // Format pending approvals
    const formattedApprovals = await Promise.all(
      (pendingApprovals as unknown[]).map(async (a: unknown) => {
        const approval = a as {
          execution_id: string;
          status: string;
          started_at: string;
          input: unknown;
          output: Record<string, unknown> | null;
          logs: unknown[];
          current_step_index: number;
          pipeline_name: string;
          nodes: unknown[];
          approval_node: {
            nodeId: string;
            nodeName: string;
            message: string;
            timestamp: string;
          } | null;
        };

        // Try to get V2 engine approval request data
        const v2ApprovalRequest = await workflowExecutionEngineV2.getPendingApproval(
          approval.execution_id
        );

        // Find the approval node details from nodes
        const nodeDetails = approval.approval_node
          ? (approval.nodes as { id: string; data: { approvalMessage?: string } }[]).find(
              (n) => n.id === approval.approval_node?.nodeId
            )
          : null;

        // Use V2 data if available, otherwise fall back to legacy
        if (v2ApprovalRequest) {
          return {
            executionId: approval.execution_id,
            pipelineName: approval.pipeline_name,
            status: approval.status,
            startedAt: approval.started_at,
            waitingSince: v2ApprovalRequest.requestedAt,
            expiresAt: v2ApprovalRequest.expiresAt,
            approvalId: v2ApprovalRequest.approvalId,
            approvalNode: {
              id: v2ApprovalRequest.nodeId,
              name: v2ApprovalRequest.title,
              message: v2ApprovalRequest.description,
            },
            contextData: v2ApprovalRequest.contextData,
            context: {
              input: approval.input,
              completedSteps: approval.current_step_index,
            },
          };
        }

        // Legacy format
        return {
          executionId: approval.execution_id,
          pipelineName: approval.pipeline_name,
          status: approval.status,
          startedAt: approval.started_at,
          waitingSince: approval.approval_node?.timestamp,
          approvalNode: {
            id: approval.approval_node?.nodeId,
            name: approval.approval_node?.nodeName,
            message: nodeDetails?.data?.approvalMessage || "Waiting for approval",
          },
          context: {
            input: approval.input,
            completedSteps: approval.current_step_index,
          },
        };
      })
    );

    return NextResponse.json({ pendingApprovals: formattedApprovals });
  } catch (error) {
    console.error("[APPROVAL_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to get pending approvals" },
      { status: 500 }
    );
  }
}

/**
 * POST - Approve or reject an execution
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const pipelineId = params.id;
    const body = await req.json();

    const {
      executionId,
      action, // 'approve' or 'reject'
      comment,
    } = body;

    if (!executionId) {
      return NextResponse.json(
        { error: "executionId is required" },
        { status: 400 }
      );
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Verify execution exists and is waiting for approval
    // Check for both 'waiting_approval' (legacy) and 'suspended' (V2 engine)
    const [execution] = await db.execute(sql`
      SELECT
        we.id,
        we.status,
        we.logs,
        we.output,
        w.name as pipeline_name
      FROM workflow_executions we
      JOIN workflows w ON w.id = we.workflow_id
      WHERE we.id = ${executionId}
        AND we.workflow_id = ${pipelineId}
        AND w.user_id = ${user.id}
    `) as {
      id: string;
      status: string;
      logs: unknown[];
      output: Record<string, unknown> | null;
      pipeline_name: string;
    }[];

    if (!execution) {
      return NextResponse.json(
        { error: "Execution not found" },
        { status: 404 }
      );
    }

    // Check for suspended status (V2 engine) or waiting_approval (legacy)
    const isSuspended = execution.status === 'suspended' || execution.status === 'waiting_approval';
    if (!isSuspended) {
      return NextResponse.json(
        { error: `Execution is not waiting for approval. Current status: ${execution.status}` },
        { status: 400 }
      );
    }

    // Try to get pending approval from V2 engine first
    const pendingApproval = await workflowExecutionEngineV2.getPendingApproval(executionId);

    // Determine approval node ID from V2 engine or legacy logs
    let approvalNodeId: string;

    if (pendingApproval) {
      approvalNodeId = pendingApproval.nodeId;
    } else {
      // Fallback to legacy detection from logs
      const logs = execution.logs as { nodeId: string; status: string; output?: { approvalRequired?: boolean } }[];
      const approvalLog = logs
        .slice()
        .reverse()
        .find((log) => log.output?.approvalRequired === true);

      if (!approvalLog) {
        return NextResponse.json(
          { error: "Could not find approval node in execution" },
          { status: 400 }
        );
      }
      approvalNodeId = approvalLog.nodeId;
    }

    const approvalTimestamp = new Date().toISOString();

    if (action === 'reject') {
      // Mark execution as failed/error
      await db.execute(sql`
        UPDATE workflow_executions
        SET
          status = 'error',
          error = ${'Rejected by user' + (comment ? `: ${comment}` : '')},
          completed_at = NOW(),
          logs = logs || ${JSON.stringify([{
            nodeId: approvalNodeId,
            nodeName: 'Human Approval',
            timestamp: approvalTimestamp,
            status: 'failed',
            level: 'error',
            message: `Rejected by ${user.email || user.id}${comment ? `: ${comment}` : ''}`,
            output: {
              action: 'rejected',
              rejectedBy: user.id,
              comment,
            },
          }])}::jsonb
        WHERE id = ${executionId}
      `);

      // Emit rejection event
      try {
        emitWorkflowUpdate({
          workflowId: pipelineId,
          executionId,
          status: 'failed',
          error: 'Rejected by user',
          timestamp: approvalTimestamp,
        });
      } catch {
        // Socket might not be available
      }

      return NextResponse.json({
        success: true,
        action: 'rejected',
        message: 'Execution rejected',
      });
    }

    // Approve and resume execution via BullMQ queue
    try {
      // Resume execution via queue with approval data
      const jobId = await resumePipelineExecution(
        executionId,
        user.id,
        approvalNodeId,
        {
          approved: true,
          comment,
        }
      );

      // Emit approval event
      try {
        emitWorkflowUpdate({
          workflowId: pipelineId,
          executionId,
          status: 'step_completed',
          stepId: approvalNodeId,
          output: { approved: true, approvedBy: user.id },
          timestamp: approvalTimestamp,
        });
      } catch {
        // Socket might not be available
      }

      return NextResponse.json({
        success: true,
        action: 'approved',
        jobId,
        message: 'Execution approved and resumed',
        approvalId: pendingApproval?.approvalId,
      });
    } catch (queueError) {
      console.error("[APPROVAL_RESUME_ERROR]", queueError);
      return NextResponse.json(
        { error: "Failed to resume execution" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[APPROVAL_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to process approval" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Get all pending approvals across all pipelines for current user
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    // Get all pending approvals for user - check for both status types
    const pendingApprovals = await db.execute(sql`
      SELECT
        we.id as execution_id,
        we.workflow_id as pipeline_id,
        we.status,
        we.started_at,
        we.output,
        w.name as pipeline_name,
        (
          SELECT log->>'output'->'message'
          FROM jsonb_array_elements(we.logs) AS log
          WHERE log->'output'->>'approvalRequired' = 'true'
          ORDER BY (log->>'timestamp')::timestamp DESC
          LIMIT 1
        ) as approval_message
      FROM workflow_executions we
      JOIN workflows w ON w.id = we.workflow_id
      WHERE w.user_id = ${user.id}
        AND (we.status = 'waiting_approval' OR we.status = 'suspended')
      ORDER BY we.started_at DESC
      LIMIT 50
    `);

    // Enrich with V2 approval request data
    const enrichedApprovals = await Promise.all(
      (pendingApprovals as unknown[]).map(async (a: unknown) => {
        const approval = a as {
          execution_id: string;
          pipeline_id: string;
          status: string;
          started_at: string;
          output: Record<string, unknown> | null;
          pipeline_name: string;
          approval_message: string | null;
        };

        const v2ApprovalRequest = await workflowExecutionEngineV2.getPendingApproval(
          approval.execution_id
        );

        return {
          ...approval,
          approvalId: v2ApprovalRequest?.approvalId,
          expiresAt: v2ApprovalRequest?.expiresAt,
          title: v2ApprovalRequest?.title,
          description: v2ApprovalRequest?.description,
        };
      })
    );

    return NextResponse.json({
      totalPending: enrichedApprovals.length,
      approvals: enrichedApprovals,
    });
  } catch (error) {
    console.error("[APPROVAL_LIST_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to get pending approvals" },
      { status: 500 }
    );
  }
}
