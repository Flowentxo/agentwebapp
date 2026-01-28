/**
 * EXECUTION CANCEL API
 *
 * Cancel a running workflow execution
 *
 * POST /api/workflows/executions/{executionId}/cancel
 */

import { NextRequest, NextResponse } from 'next/server';
import { workflowExecutionEngine } from '@/server/services/WorkflowExecutionEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/workflows/executions/{executionId}/cancel
 *
 * Cancel a running execution
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { executionId: string } }
) {
  try {
    const { executionId } = params;
    const userId = req.headers.get('x-user-id') || 'demo-user';

    if (!executionId) {
      return NextResponse.json(
        { error: 'executionId is required' },
        { status: 400 }
      );
    }

    // Get the execution
    const execution = workflowExecutionEngine.getExecution(executionId);

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found or already completed' },
        { status: 404 }
      );
    }

    // Check ownership
    if (execution.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - execution does not belong to user' },
        { status: 403 }
      );
    }

    // Check if execution is running
    if (execution.status !== 'running' && execution.status !== 'pending') {
      return NextResponse.json(
        {
          error: `Cannot cancel execution with status: ${execution.status}`,
          currentStatus: execution.status
        },
        { status: 400 }
      );
    }

    // Cancel the execution
    const cancelled = workflowExecutionEngine.cancelExecution(executionId);

    if (!cancelled) {
      return NextResponse.json(
        { error: 'Failed to cancel execution' },
        { status: 500 }
      );
    }

    console.log(`[EXECUTION_CANCEL] Execution ${executionId} cancelled by user ${userId}`);

    return NextResponse.json({
      success: true,
      executionId,
      message: 'Execution cancelled successfully',
      previousStatus: 'running',
      newStatus: 'error',
    });

  } catch (error: any) {
    console.error('[EXECUTION_CANCEL] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cancel execution',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
