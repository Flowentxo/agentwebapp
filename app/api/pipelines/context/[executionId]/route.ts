/**
 * Pipeline Context API
 * GET /api/pipelines/context/[executionId]
 *
 * Returns the shared context for a pipeline execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { pipelineContextManager } from '@/server/services/PipelineContextManager';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { executionId: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { executionId } = params;

    if (!executionId) {
      return NextResponse.json(
        { success: false, error: 'Execution ID is required' },
        { status: 400 }
      );
    }

    // Fetch full context
    const context = await pipelineContextManager.getFullContext(executionId);

    if (!context) {
      return NextResponse.json(
        { success: false, error: 'Context not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: context,
    });
  } catch (error: unknown) {
    console.error('[API] Pipeline context error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pipelines/context/[executionId]
 *
 * Add an entry to the context (for manual testing/debugging)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { executionId: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { executionId } = params;
    const body = await req.json();
    const { key, value, sourceNode, nodeType, summary } = body;

    if (!key || value === undefined || !sourceNode) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: key, value, sourceNode' },
        { status: 400 }
      );
    }

    await pipelineContextManager.addToContext(
      executionId,
      key,
      value,
      sourceNode,
      { nodeType, summary }
    );

    return NextResponse.json({
      success: true,
      message: 'Context entry added',
    });
  } catch (error: unknown) {
    console.error('[API] Add context error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pipelines/context/[executionId]
 *
 * Clean up context for an execution
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { executionId: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { executionId } = params;

    await pipelineContextManager.cleanupContext(executionId);

    return NextResponse.json({
      success: true,
      message: 'Context cleaned up',
    });
  } catch (error: unknown) {
    console.error('[API] Delete context error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
