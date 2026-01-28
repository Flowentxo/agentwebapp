/**
 * WORKFLOW APPROVAL API
 *
 * Approve or reject suspended workflows awaiting human approval.
 *
 * POST /api/workflows/executions/[executionId]/approve
 * - action: 'approve' | 'reject'
 * - reason?: string (for rejection)
 *
 * GET /api/workflows/executions/[executionId]/approve
 * - Get approval request details
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { workflowApprovalRequests, workflowExecutions, workflows } from '@/lib/db/schema-workflows';
import { eq, and, desc } from 'drizzle-orm';
import { workflowExecutionEngine } from '@/server/services/WorkflowExecutionEngine';
import { createLogger } from '@/lib/logger';

const logger = createLogger('approval-api');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/workflows/executions/[executionId]/approve
 *
 * Get approval request details for a suspended execution
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { executionId: string } }
) {
  try {
    const { executionId } = params;
    const userId = req.headers.get('x-user-id') || 'demo-user';

    const db = getDb();

    // Get the approval request
    const [approvalRequest] = await db
      .select()
      .from(workflowApprovalRequests)
      .where(eq(workflowApprovalRequests.executionId, executionId))
      .orderBy(desc(workflowApprovalRequests.createdAt))
      .limit(1);

    if (!approvalRequest) {
      return NextResponse.json(
        { error: 'Approval request not found' },
        { status: 404 }
      );
    }

    // Get workflow info
    const [workflow] = await db
      .select({
        id: workflows.id,
        name: workflows.name,
      })
      .from(workflows)
      .where(eq(workflows.id, approvalRequest.workflowId))
      .limit(1);

    // Get execution info
    const [execution] = await db
      .select({
        id: workflowExecutions.id,
        status: workflowExecutions.status,
        isTest: workflowExecutions.isTest,
        startedAt: workflowExecutions.startedAt,
      })
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId))
      .limit(1);

    return NextResponse.json({
      approvalRequest: {
        id: approvalRequest.id,
        executionId: approvalRequest.executionId,
        workflowId: approvalRequest.workflowId,
        nodeId: approvalRequest.nodeId,
        status: approvalRequest.status,
        title: approvalRequest.title,
        message: approvalRequest.message,
        previewData: approvalRequest.previewData,
        contextData: approvalRequest.contextData,
        assignedUserId: approvalRequest.assignedUserId,
        expiresAt: approvalRequest.expiresAt,
        resolvedBy: approvalRequest.resolvedBy,
        resolvedAt: approvalRequest.resolvedAt,
        rejectionReason: approvalRequest.rejectionReason,
        createdAt: approvalRequest.createdAt,
      },
      workflow: workflow ? {
        id: workflow.id,
        name: workflow.name,
      } : null,
      execution: execution ? {
        id: execution.id,
        status: execution.status,
        isTest: execution.isTest,
        startedAt: execution.startedAt,
      } : null,
    });

  } catch (error: any) {
    logger.error('Failed to get approval request', { error: error.message });

    return NextResponse.json(
      { error: 'Failed to get approval request', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflows/executions/[executionId]/approve
 *
 * Approve or reject a suspended workflow execution
 *
 * Body:
 *   - action: 'approve' | 'reject'
 *   - reason?: string (optional rejection reason)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { executionId: string } }
) {
  try {
    const { executionId } = params;
    const userId = req.headers.get('x-user-id') || 'demo-user';

    const body = await req.json();
    const { action, reason } = body;

    // Validate action
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get the approval request
    const [approvalRequest] = await db
      .select()
      .from(workflowApprovalRequests)
      .where(eq(workflowApprovalRequests.executionId, executionId))
      .orderBy(desc(workflowApprovalRequests.createdAt))
      .limit(1);

    if (!approvalRequest) {
      return NextResponse.json(
        { error: 'Approval request not found' },
        { status: 404 }
      );
    }

    // Check if already resolved
    if (approvalRequest.status !== 'pending') {
      return NextResponse.json(
        {
          error: 'Approval request already resolved',
          currentStatus: approvalRequest.status,
          resolvedBy: approvalRequest.resolvedBy,
          resolvedAt: approvalRequest.resolvedAt,
        },
        { status: 409 }
      );
    }

    // Check if expired
    if (approvalRequest.expiresAt && new Date(approvalRequest.expiresAt) < new Date()) {
      // Mark as expired
      await db
        .update(workflowApprovalRequests)
        .set({
          status: 'expired',
          updatedAt: new Date(),
        })
        .where(eq(workflowApprovalRequests.id, approvalRequest.id));

      return NextResponse.json(
        { error: 'Approval request has expired' },
        { status: 410 }
      );
    }

    // Check authorization (only assigned user or workflow owner can approve)
    // For now, we allow any authenticated user - in production, add proper checks
    // if (approvalRequest.assignedUserId && approvalRequest.assignedUserId !== userId) {
    //   return NextResponse.json(
    //     { error: 'You are not authorized to approve this request' },
    //     { status: 403 }
    //   );
    // }

    logger.info('Processing approval action', {
      executionId,
      action,
      userId,
      approvalRequestId: approvalRequest.id,
    });

    // Resume workflow with approval result
    const result = await workflowExecutionEngine.resumeWorkflow(
      executionId,
      action === 'approve' ? 'approved' : 'rejected',
      userId,
      reason
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to resume workflow' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: action === 'approve'
        ? 'Workflow approved and resumed'
        : 'Workflow rejected and cancelled',
      execution: {
        id: result.executionId,
        status: result.status,
        workflowId: result.workflowId,
      },
      approval: {
        id: approvalRequest.id,
        action,
        resolvedBy: userId,
        resolvedAt: new Date().toISOString(),
        rejectionReason: action === 'reject' ? reason : undefined,
      },
    });

  } catch (error: any) {
    logger.error('Approval action failed', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Approval action failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
