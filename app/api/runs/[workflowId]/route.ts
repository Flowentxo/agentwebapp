/**
 * WORKFLOW RUNS API
 *
 * Phase 13: Flight Recorder - List runs for a workflow
 *
 * GET /api/runs/:workflowId
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20, max: 100)
 * - status: Filter by run status
 * - isTest: Filter by test runs (true/false)
 *
 * Returns paginated list of workflow runs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { executionLogger } from '@/server/services/ExecutionLoggerService';
import { type RunStatus } from '@/lib/db/schema-flight-recorder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Valid run status values
const VALID_STATUSES: RunStatus[] = [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
  'suspended',
  'timeout',
];

export async function GET(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    // Authenticate user
    const session = await requireSession();
    const { workflowId } = params;

    if (!workflowId) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    const statusParam = searchParams.get('status');
    const isTestParam = searchParams.get('isTest');

    // Validate status parameter
    let status: RunStatus | undefined;
    if (statusParam) {
      if (!VALID_STATUSES.includes(statusParam as RunStatus)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      status = statusParam as RunStatus;
    }

    // Parse isTest parameter
    let isTest: boolean | undefined;
    if (isTestParam !== null) {
      isTest = isTestParam === 'true';
    }

    // Fetch runs
    const result = await executionLogger.getRuns(workflowId, {
      page,
      pageSize,
      status,
      isTest,
    });

    // Format response
    const response = {
      runs: result.runs.map((run) => ({
        id: run.id,
        runNumber: run.runNumber,
        traceId: run.traceId,
        triggerType: run.triggerType,
        triggerSource: run.triggerSource,
        status: run.status,
        errorCode: run.errorCode,
        errorMessage: run.errorMessage,
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
        userId: run.userId,
        isTest: run.isTest,
        createdAt: run.createdAt.toISOString(),
      })),
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: result.page < result.totalPages,
        hasPrev: result.page > 1,
      },
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('[RUNS_API]', error);

    const err = error as { code?: string; message?: string };
    if (err.code === 'SESSION_INVALID' || err.code === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch runs', details: err.message },
      { status: 500 }
    );
  }
}
