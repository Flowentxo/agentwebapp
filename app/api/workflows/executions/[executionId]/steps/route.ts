/**
 * WORKFLOW EXECUTION STEPS API
 *
 * Retrieve Flight Recorder execution steps for time-travel debugging.
 *
 * GET /api/workflows/executions/[executionId]/steps
 * - Returns all execution steps for a workflow run
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { executionSteps, workflowRuns } from '@/lib/db/schema-flight-recorder';
import { workflowExecutions } from '@/lib/db/schema-workflows';
import { eq, asc } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const logger = createLogger('execution-steps-api');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/workflows/executions/[executionId]/steps
 *
 * Get all execution steps for a workflow execution (Flight Recorder data)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { executionId: string } }
) {
  try {
    const { executionId } = params;
    const userId = req.headers.get('x-user-id') || 'demo-user';

    const db = getDb();

    // First, get the workflow run associated with this execution
    const [workflowRun] = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.executionId, executionId))
      .limit(1);

    if (!workflowRun) {
      // If no flight recorder run exists, try to get execution details
      const [execution] = await db
        .select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.id, executionId))
        .limit(1);

      if (!execution) {
        return NextResponse.json(
          { error: 'Execution not found' },
          { status: 404 }
        );
      }

      // Return empty steps if no flight recorder data
      return NextResponse.json({
        executionId,
        steps: [],
        hasFlightRecorder: false,
        execution: {
          id: execution.id,
          status: execution.status,
          startedAt: execution.startedAt,
          completedAt: execution.completedAt,
        },
      });
    }

    // Get all execution steps ordered by sequence
    const steps = await db
      .select()
      .from(executionSteps)
      .where(eq(executionSteps.runId, workflowRun.id))
      .orderBy(asc(executionSteps.stepNumber));

    // Transform steps for the frontend
    const formattedSteps = steps.map((step) => ({
      id: step.id,
      nodeId: step.nodeId,
      nodeName: step.nodeName || step.nodeId,
      nodeType: step.nodeType,
      status: step.status,
      input: step.inputData || {},
      output: step.outputData || null,
      error: step.error || null,
      startedAt: step.startedAt?.toISOString() || null,
      completedAt: step.completedAt?.toISOString() || null,
      duration: step.durationMs || null,
      stepNumber: step.stepNumber,
      metadata: step.metadata || {},
    }));

    logger.info('Retrieved execution steps', {
      executionId,
      runId: workflowRun.id,
      stepCount: formattedSteps.length,
    });

    return NextResponse.json({
      executionId,
      runId: workflowRun.id,
      steps: formattedSteps,
      hasFlightRecorder: true,
      run: {
        id: workflowRun.id,
        status: workflowRun.status,
        startedAt: workflowRun.startedAt?.toISOString(),
        completedAt: workflowRun.completedAt?.toISOString(),
        totalDuration: workflowRun.totalDurationMs,
        totalTokens: workflowRun.totalTokensUsed,
        estimatedCost: workflowRun.estimatedCost,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get execution steps', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Failed to get execution steps', message: error.message },
      { status: 500 }
    );
  }
}
