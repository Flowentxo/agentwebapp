import { NextRequest, NextResponse } from 'next/server';
import { TraceViewer } from '@/lib/tracing/trace-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/traces
 * Retrieve traces for debugging and monitoring
 *
 * Query params:
 * - traceId: Get specific trace
 * - agentId: Get all traces for an agent
 * - userId: Get all traces for a user
 * - limit: Number of recent traces to return (default: 20)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const traceId = searchParams.get('traceId');
    const agentId = searchParams.get('agentId');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get specific trace
    if (traceId) {
      const trace = TraceViewer.getTrace(traceId);
      if (!trace) {
        return NextResponse.json(
          { success: false, error: 'Trace not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: trace,
      });
    }

    // Get traces by agent
    if (agentId) {
      const traces = TraceViewer.getAgentTraces(agentId);
      return NextResponse.json({
        success: true,
        data: traces,
        count: traces.length,
      });
    }

    // Get traces by user
    if (userId) {
      const traces = TraceViewer.getUserTraces(userId);
      return NextResponse.json({
        success: true,
        data: traces,
        count: traces.length,
      });
    }

    // Get recent traces
    const traces = TraceViewer.getRecentTraces(limit);
    return NextResponse.json({
      success: true,
      data: traces,
      count: traces.length,
    });
  } catch (error) {
    console.error('[TRACES_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch traces' },
      { status: 500 }
    );
  }
}
