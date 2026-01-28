/**
 * RUN DETAILS API
 *
 * Phase 13: Flight Recorder - Get full trace for a run
 *
 * GET /api/runs/details/:runId
 *
 * Returns the complete execution trace:
 * - Run metadata (status, timing, cost)
 * - All execution steps with resolved inputs/outputs
 * - Error details for failed steps
 *
 * This is the core API for time-travel debugging.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { executionLogger } from '@/server/services/ExecutionLoggerService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { runId: string } }
) {
  try {
    // Authenticate user
    await requireSession();
    const { runId } = params;

    if (!runId) {
      return NextResponse.json(
        { error: 'Run ID is required' },
        { status: 400 }
      );
    }

    // Fetch run with all steps
    const result = await executionLogger.getRunDetails(runId);

    if (!result) {
      return NextResponse.json(
        { error: 'Run not found' },
        { status: 404 }
      );
    }

    const { run, steps } = result;

    // Format response
    const response = {
      run: {
        id: run.id,
        workflowId: run.workflowId,
        runNumber: run.runNumber,
        traceId: run.traceId,
        triggerType: run.triggerType,
        triggerSource: run.triggerSource,
        triggerPayload: run.triggerPayload,
        status: run.status,
        errorCode: run.errorCode,
        errorMessage: run.errorMessage,
        errorStack: run.errorStack,
        startedAt: run.startedAt?.toISOString(),
        completedAt: run.completedAt?.toISOString(),
        totalDurationMs: run.totalDurationMs,
        totalTokensUsed: run.totalTokensUsed,
        totalCostUsd: run.totalCostUsd ? parseFloat(run.totalCostUsd) : 0,
        nodesTotal: run.nodesTotal,
        nodesExecuted: run.nodesExecuted,
        nodesSucceeded: run.nodesSucceeded,
        nodesFailed: run.nodesFailed,
        nodesSkipped: run.nodesSkipped,
        finalOutput: run.finalOutput,
        userId: run.userId,
        workspaceId: run.workspaceId,
        isTest: run.isTest,
        versionId: run.versionId,
        metadata: run.metadata,
        createdAt: run.createdAt.toISOString(),
        updatedAt: run.updatedAt.toISOString(),
      },
      steps: steps.map((step) => ({
        id: step.id,
        nodeId: step.nodeId,
        nodeType: step.nodeType,
        nodeName: step.nodeName,
        stepNumber: step.stepNumber,
        depth: step.depth,
        parentStepId: step.parentStepId,
        status: step.status,
        // Core Flight Recorder data - resolved inputs/outputs
        inputsRaw: step.inputsRaw,
        inputsResolved: step.inputsResolved,
        output: step.output,
        // Error information
        errorCode: step.errorCode,
        errorMessage: step.errorMessage,
        errorStack: step.errorStack,
        errorDetails: step.errorDetails,
        // Retry information
        retryAttempt: step.retryAttempt,
        maxRetries: step.maxRetries,
        retryDelayMs: step.retryDelayMs,
        previousErrors: step.previousErrors,
        // Timing
        startedAt: step.startedAt?.toISOString(),
        completedAt: step.completedAt?.toISOString(),
        durationMs: step.durationMs,
        waitingDurationMs: step.waitingDurationMs,
        // Cost tracking
        tokensPrompt: step.tokensPrompt,
        tokensCompletion: step.tokensCompletion,
        tokensTotal: step.tokensTotal,
        costUsd: step.costUsd ? parseFloat(step.costUsd) : null,
        model: step.model,
        // Branch/condition info
        branchPath: step.branchPath,
        conditionResult: step.conditionResult,
        // External references
        externalCallId: step.externalCallId,
        approvalId: step.approvalId,
        // Metadata
        metadata: step.metadata,
        createdAt: step.createdAt.toISOString(),
      })),
      // Summary statistics
      summary: {
        totalSteps: steps.length,
        successfulSteps: steps.filter((s) => s.status === 'success').length,
        failedSteps: steps.filter((s) => s.status === 'failure').length,
        skippedSteps: steps.filter((s) => s.status === 'skipped').length,
        totalTokens: steps.reduce((sum, s) => sum + (s.tokensTotal || 0), 0),
        totalCost: steps.reduce((sum, s) => sum + (s.costUsd ? parseFloat(s.costUsd) : 0), 0),
        avgStepDuration: steps.length > 0
          ? Math.round(
              steps.reduce((sum, s) => sum + (s.durationMs || 0), 0) / steps.length
            )
          : 0,
      },
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('[RUN_DETAILS_API]', error);

    const err = error as { code?: string; message?: string };
    if (err.code === 'SESSION_INVALID' || err.code === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch run details', details: err.message },
      { status: 500 }
    );
  }
}

/**
 * Get failed steps for a run
 *
 * GET /api/runs/details/:runId?failedOnly=true
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { runId: string } }
) {
  try {
    // Authenticate user
    await requireSession();
    const { runId } = params;

    if (!runId) {
      return NextResponse.json(
        { error: 'Run ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'getFailedSteps') {
      const failedSteps = await executionLogger.getFailedSteps(runId);

      return NextResponse.json({
        steps: failedSteps.map((step) => ({
          id: step.id,
          nodeId: step.nodeId,
          nodeType: step.nodeType,
          nodeName: step.nodeName,
          stepNumber: step.stepNumber,
          errorCode: step.errorCode,
          errorMessage: step.errorMessage,
          errorStack: step.errorStack,
          errorDetails: step.errorDetails,
          inputsResolved: step.inputsResolved,
          retryAttempt: step.retryAttempt,
          maxRetries: step.maxRetries,
          previousErrors: step.previousErrors,
          durationMs: step.durationMs,
          startedAt: step.startedAt?.toISOString(),
          completedAt: step.completedAt?.toISOString(),
        })),
        count: failedSteps.length,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('[RUN_DETAILS_API_POST]', error);

    const err = error as { code?: string; message?: string };
    if (err.code === 'SESSION_INVALID' || err.code === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process request', details: err.message },
      { status: 500 }
    );
  }
}
