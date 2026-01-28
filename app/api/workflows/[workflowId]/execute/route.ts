/**
 * WORKFLOW EXECUTION API
 *
 * Execute a workflow with provided trigger data.
 * Supports both synchronous execution (for testing) and async via BullMQ queue.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { workflows } from '@/lib/db/schema-workflows';
import { eq } from 'drizzle-orm';
import { workflowExecutionEngine } from '@/server/services/WorkflowExecutionEngine';
import { enqueueWorkflowExecution, getWorkflowJob } from '@/workers/workflow-execution-worker';
import { createLogger } from '@/lib/logger';

const logger = createLogger('workflow-execute-api');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/workflows/{workflowId}/execute
 *
 * Execute a workflow with trigger data.
 *
 * Query params:
 *   - async=true: Queue for async execution via BullMQ (production mode)
 *   - async=false (default): Execute synchronously (for testing/preview)
 *
 * Body:
 *   - triggerData: Input data for the workflow
 *   - isTest: Whether this is a test execution (default: true)
 *   - variables: Additional variables to inject
 *   - priority: Job priority (0-10, higher = more priority) for async mode
 *   - delay: Delay in ms before execution for async mode
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const { workflowId } = params;
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const asyncMode = req.nextUrl.searchParams.get('async') === 'true';

    // Parse request body
    const body = await req.json();
    const {
      triggerData = {},
      isTest = true,
      variables = {},
      priority = 0,
      delay = 0,
    } = body;

    // Fetch workflow from database
    const db = getDb();
    const result = await db.execute(
      `SELECT id, name, status, nodes, edges, user_id as "userId"
       FROM workflows
       WHERE id = '${workflowId}'`
    );

    const workflowRows = result.rows || result;
    const workflow = Array.isArray(workflowRows) ? workflowRows[0] : workflowRows;

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Check if workflow belongs to user
    if (workflow.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - workflow does not belong to user' },
        { status: 403 }
      );
    }

    // Check if workflow is active (allow draft for test runs)
    if (workflow.status === 'archived') {
      return NextResponse.json(
        { error: 'Workflow is archived and cannot be executed' },
        { status: 400 }
      );
    }

    if (workflow.status === 'draft' && !isTest) {
      return NextResponse.json(
        { error: 'Draft workflows can only be executed in test mode' },
        { status: 400 }
      );
    }

    // Validate workflow structure
    if (!workflow.nodes || !Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
      return NextResponse.json(
        { error: 'Workflow has no nodes' },
        { status: 400 }
      );
    }

    if (!workflow.edges || !Array.isArray(workflow.edges)) {
      return NextResponse.json(
        { error: 'Workflow has no edges' },
        { status: 400 }
      );
    }

    logger.info('Workflow execution requested', {
      workflowId,
      workflowName: workflow.name,
      asyncMode,
      isTest,
      nodeCount: workflow.nodes.length,
      edgeCount: workflow.edges.length,
    });

    // =========================================================================
    // ASYNC MODE: Queue for BullMQ worker processing
    // =========================================================================
    if (asyncMode) {
      try {
        const executionId = await enqueueWorkflowExecution(
          {
            workflowId,
            userId,
            triggerType: 'api',
            triggerData,
            variables,
            isTest,
          },
          {
            priority,
            delay,
          }
        );

        logger.info('Workflow queued for async execution', {
          executionId,
          workflowId,
          priority,
          delay,
        });

        return NextResponse.json({
          success: true,
          executionId,
          status: 'queued',
          message: 'Workflow queued for execution',
          async: true,
          checkStatusUrl: `/api/workflows/executions/${executionId}/status`,
        }, { status: 202 });
      } catch (queueError: any) {
        logger.error('Failed to queue workflow', { error: queueError.message });

        // Fallback to sync if queue fails
        logger.warn('Falling back to synchronous execution');
      }
    }

    // =========================================================================
    // SYNC MODE: Execute immediately (default for testing)
    // =========================================================================
    const executionContext = await workflowExecutionEngine.executeWorkflow(
      workflowId,
      workflow.nodes,
      workflow.edges,
      userId,
      { ...triggerData, ...variables },
      isTest
    );

    logger.info('Workflow execution completed', {
      executionId: executionContext.executionId,
      status: executionContext.status,
      durationMs: Date.now() - executionContext.startTime,
    });

    // Return execution result
    return NextResponse.json({
      success: executionContext.status === 'success',
      executionId: executionContext.executionId,
      status: executionContext.status,
      async: false,
      message: executionContext.status === 'success'
        ? 'Workflow executed successfully'
        : executionContext.status === 'error'
        ? `Workflow execution failed: ${executionContext.error}`
        : 'Workflow execution in progress',
      error: executionContext.error,
      logs: executionContext.logs,
      output: Object.fromEntries(executionContext.nodeOutputs),
      durationMs: Date.now() - executionContext.startTime,
      totalCost: executionContext.totalCostIncurred,
    }, {
      status: executionContext.status === 'success' ? 200 :
              executionContext.status === 'error' ? 500 : 202
    });

  } catch (error: any) {
    logger.error('Workflow execution error', { error: error.message, stack: error.stack });

    return NextResponse.json(
      {
        success: false,
        error: 'Workflow execution failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workflows/{workflowId}/execute?executionId=xxx
 *
 * Get the status of a queued workflow execution
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const executionId = req.nextUrl.searchParams.get('executionId');

    if (!executionId) {
      return NextResponse.json(
        { error: 'executionId query parameter is required' },
        { status: 400 }
      );
    }

    const job = await getWorkflowJob(executionId);

    if (!job) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;

    return NextResponse.json({
      executionId,
      workflowId: params.workflowId,
      state,
      progress,
      result: state === 'completed' ? result : undefined,
      failedReason: state === 'failed' ? job.failedReason : undefined,
    });
  } catch (error: any) {
    logger.error('Failed to get execution status', { error: error.message });

    return NextResponse.json(
      { error: 'Failed to get execution status', message: error.message },
      { status: 500 }
    );
  }
}
