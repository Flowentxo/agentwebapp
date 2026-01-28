/**
 * Pipeline Execution API V2
 *
 * Async pipeline execution using BullMQ queue
 * Supports initialInput for pre-populating workflow state
 * Part of Phase 1: Async Execution Engine
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import {
  enqueuePipelineExecution,
  resumePipelineExecution,
  cancelPipelineExecution,
  getPipelineJob,
  getPipelineQueueStats,
} from "@/server/lib/pipeline-queue";
import { emitWorkflowUpdate } from "@/server/socket";
import { createLogger } from "@/lib/logger";

const logger = createLogger('pipeline-execute-api');

// =============================================================================
// REQUEST VALIDATION TYPES
// =============================================================================

interface ExecuteRequestBody {
  /** Initial input data (populates state.trigger.payload) */
  inputs?: Record<string, unknown>;
  /** Alternative name for inputs (for backwards compatibility) */
  initialInput?: Record<string, unknown>;
  /** How the pipeline was triggered */
  triggerType?: 'manual' | 'webhook' | 'scheduled' | 'api';
  /** Job priority (0 = normal, higher = more urgent) */
  priority?: number;
  /** Custom variables to inject into state.variables */
  variables?: Record<string, unknown>;
  /** Skip budget check (for testing) */
  skipBudgetCheck?: boolean;
}

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
 * POST - Start pipeline execution (async via BullMQ)
 * Returns 202 Accepted immediately
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      logger.warn('Unauthorized pipeline execution attempt', { pipelineId: params.id });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const pipelineId = params.id;

    // Parse request body with type validation
    const body: ExecuteRequestBody = await req.json().catch(() => ({}));

    // Support both 'inputs' and 'initialInput' (backwards compatibility)
    const inputs = { ...(body.inputs || {}), ...(body.initialInput || {}) };
    const triggerType = body.triggerType || "manual";
    const priority = body.priority || 0;
    const variables = body.variables || {};
    const skipBudgetCheck = body.skipBudgetCheck || false;

    logger.info('Pipeline execution requested', {
      pipelineId,
      userId: user.id,
      triggerType,
      hasInputs: Object.keys(inputs).length > 0,
      hasVariables: Object.keys(variables).length > 0,
    });

    // Verify pipeline exists and belongs to user
    const [pipeline] = await db.execute(sql`
      SELECT id, name, status FROM workflows
      WHERE id = ${pipelineId} AND user_id = ${user.id}
    `) as { id: string; name: string; status: string }[];

    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    // Generate execution ID
    const executionId = uuidv4();

    // Create execution record with 'pending' status
    await db.execute(sql`
      INSERT INTO workflow_executions (
        id,
        workflow_id,
        user_id,
        status,
        input,
        logs,
        started_at,
        is_test
      )
      VALUES (
        ${executionId},
        ${pipelineId},
        ${user.id},
        'pending',
        ${JSON.stringify(inputs)}::jsonb,
        '[]'::jsonb,
        NOW(),
        false
      )
    `);

    // Enqueue job for async execution
    const jobId = await enqueuePipelineExecution(
      {
        pipelineId,
        executionId,
        userId: user.id,
        triggerType: triggerType as 'manual' | 'webhook' | 'scheduled' | 'api',
        inputs,
        variables,
        skipBudgetCheck,
      },
      { priority }
    );

    logger.info('Pipeline execution queued', {
      pipelineId,
      executionId,
      jobId,
      userId: user.id,
    });

    // Emit queued event via Socket.IO
    try {
      emitWorkflowUpdate({
        workflowId: pipelineId,
        executionId,
        status: 'started',
        progress: 0,
        timestamp: new Date().toISOString(),
      });
    } catch {
      logger.debug('Socket emit skipped (not in server context)');
    }

    // Return 202 Accepted with execution details
    return NextResponse.json(
      {
        success: true,
        executionId,
        jobId,
        status: 'pending',
        message: 'Pipeline execution queued',
        // URLs for client to track execution
        statusUrl: `/api/pipelines/${pipelineId}/execute?executionId=${executionId}`,
        // Socket rooms to subscribe for real-time updates
        socketRooms: {
          execution: `execution:${executionId}`,
          workflow: `workflow:${pipelineId}`,
        },
      },
      { status: 202 }
    );
  } catch (error: any) {
    logger.error('Pipeline execution failed', {
      pipelineId: params.id,
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Failed to queue pipeline execution", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET - Get execution status
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

    const { searchParams } = new URL(req.url);
    const executionId = searchParams.get("executionId");
    const includeQueueStats = searchParams.get("queueStats") === "true";

    const db = getDb();
    const pipelineId = params.id;

    // Include queue stats if requested
    let queueStats = null;
    if (includeQueueStats) {
      try {
        queueStats = await getPipelineQueueStats();
      } catch {
        // Queue might not be initialized
      }
    }

    if (executionId) {
      // Get specific execution with job status
      const [execution] = await db.execute(sql`
        SELECT
          we.*,
          w.name as workflow_name,
          w.nodes,
          EXTRACT(EPOCH FROM (COALESCE(we.completed_at, NOW()) - we.started_at))::int as duration_seconds
        FROM workflow_executions we
        JOIN workflows w ON w.id = we.workflow_id
        WHERE we.id = ${executionId}
          AND we.workflow_id = ${pipelineId}
          AND w.user_id = ${user.id}
      `);

      if (!execution) {
        return NextResponse.json({ error: "Execution not found" }, { status: 404 });
      }

      // Get BullMQ job status if still running
      let jobStatus = null;
      if ((execution as { status: string }).status === 'pending' || (execution as { status: string }).status === 'running') {
        try {
          const job = await getPipelineJob(executionId);
          if (job) {
            jobStatus = {
              id: job.id,
              state: await job.getState(),
              progress: job.progress,
              attemptsMade: job.attemptsMade,
              failedReason: job.failedReason,
            };
          }
        } catch {
          // Queue might not be available
        }
      }

      return NextResponse.json({
        execution,
        jobStatus,
        queueStats,
      });
    }

    // Get all executions for pipeline
    const executions = await db.execute(sql`
      SELECT
        we.id,
        we.status,
        we.started_at,
        we.completed_at,
        we.current_step_index,
        we.error,
        we.is_test,
        EXTRACT(EPOCH FROM (COALESCE(we.completed_at, NOW()) - we.started_at))::int as duration_seconds,
        jsonb_array_length(COALESCE(we.logs, '[]'::jsonb)) as completed_steps
      FROM workflow_executions we
      JOIN workflows w ON w.id = we.workflow_id
      WHERE we.workflow_id = ${pipelineId} AND w.user_id = ${user.id}
      ORDER BY we.started_at DESC
      LIMIT 50
    `);

    return NextResponse.json({
      executions: executions || [],
      queueStats,
    });
  } catch (error: any) {
    logger.error('Failed to get execution status', {
      pipelineId: params.id,
      error: error.message,
    });
    return NextResponse.json(
      { error: "Failed to get execution status" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Resume a suspended execution (after human approval)
 */
export async function PUT(
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
    const { executionId, fromNodeId } = body;

    if (!executionId || !fromNodeId) {
      return NextResponse.json(
        { error: "executionId and fromNodeId are required" },
        { status: 400 }
      );
    }

    // Verify execution exists and is suspended
    const [execution] = await db.execute(sql`
      SELECT we.id, we.status
      FROM workflow_executions we
      JOIN workflows w ON w.id = we.workflow_id
      WHERE we.id = ${executionId}
        AND we.workflow_id = ${pipelineId}
        AND w.user_id = ${user.id}
    `) as { id: string; status: string }[];

    if (!execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 });
    }

    if (execution.status !== 'waiting_approval') {
      return NextResponse.json(
        { error: `Cannot resume execution with status: ${execution.status}` },
        { status: 400 }
      );
    }

    // Enqueue resume job
    const jobId = await resumePipelineExecution(
      executionId,
      user.id,
      fromNodeId
    );

    return NextResponse.json({
      success: true,
      executionId,
      jobId,
      message: 'Pipeline execution resumed',
    });
  } catch (error: any) {
    logger.error('Failed to resume execution', {
      pipelineId: params.id,
      error: error.message,
    });
    return NextResponse.json(
      { error: "Failed to resume execution" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Cancel execution
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const executionId = searchParams.get("executionId");

    if (!executionId) {
      return NextResponse.json({ error: "executionId required" }, { status: 400 });
    }

    const db = getDb();
    const pipelineId = params.id;

    // Verify execution belongs to user
    const [execution] = await db.execute(sql`
      SELECT we.id, we.status
      FROM workflow_executions we
      JOIN workflows w ON w.id = we.workflow_id
      WHERE we.id = ${executionId}
        AND we.workflow_id = ${pipelineId}
        AND w.user_id = ${user.id}
    `) as { id: string; status: string }[];

    if (!execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 });
    }

    // Try to cancel via queue first
    let queueCancelled = false;
    try {
      queueCancelled = await cancelPipelineExecution(executionId);
    } catch {
      // Queue might not be available
    }

    // Update execution status to cancelled
    await db.execute(sql`
      UPDATE workflow_executions
      SET
        status = 'error',
        error = 'Cancelled by user',
        completed_at = NOW()
      WHERE id = ${executionId}
        AND status IN ('pending', 'running', 'waiting_approval')
    `);

    // Emit cancellation event
    try {
      emitWorkflowUpdate({
        workflowId: pipelineId,
        executionId,
        status: 'failed',
        error: 'Cancelled by user',
        timestamp: new Date().toISOString(),
      });
    } catch {
      logger.debug('Socket emit skipped');
    }

    logger.info('Pipeline execution cancelled', {
      pipelineId,
      executionId,
      queueCancelled,
    });

    return NextResponse.json({
      success: true,
      queueCancelled,
      message: 'Execution cancelled',
    });
  } catch (error: any) {
    logger.error('Failed to cancel execution', {
      pipelineId: params.id,
      error: error.message,
    });
    return NextResponse.json(
      { error: "Failed to cancel execution" },
      { status: 500 }
    );
  }
}
