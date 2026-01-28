/**
 * AI REQUEST TRACES API
 *
 * GET /api/admin/traces
 * Retrieve AI request traces with pagination and filtering.
 * Used by the Trace Explorer UI for monitoring AI usage and costs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { aiRequestTraces } from '@/lib/db/schema-observability';
import { desc, eq, like, or, and, sql, count } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/traces
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 100)
 * - status: Filter by status (success, failed, rate_limited, etc.)
 * - provider: Filter by provider (openai, anthropic, etc.)
 * - search: Search in userId, agentId, traceId
 * - model: Filter by model name
 * - startDate: Filter by start date (ISO string)
 * - endDate: Filter by end date (ISO string)
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin session
    const session = await requireSession({ requireRoles: ['admin'] });

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const status = searchParams.get('status');
    const provider = searchParams.get('provider');
    const search = searchParams.get('search');
    const model = searchParams.get('model');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const offset = (page - 1) * limit;
    const db = getDb();

    // Build filter conditions
    const conditions: any[] = [];

    if (status) {
      conditions.push(eq(aiRequestTraces.status, status as any));
    }

    if (provider) {
      conditions.push(eq(aiRequestTraces.provider, provider as any));
    }

    if (model) {
      conditions.push(like(aiRequestTraces.model, `%${model}%`));
    }

    if (search) {
      conditions.push(
        or(
          like(aiRequestTraces.userId, `%${search}%`),
          like(aiRequestTraces.agentId, `%${search}%`),
          like(aiRequestTraces.traceId, `%${search}%`),
          like(aiRequestTraces.workspaceId, `%${search}%`)
        )
      );
    }

    if (startDate) {
      conditions.push(sql`${aiRequestTraces.startedAt} >= ${new Date(startDate)}`);
    }

    if (endDate) {
      conditions.push(sql`${aiRequestTraces.startedAt} <= ${new Date(endDate)}`);
    }

    // Build WHERE clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(aiRequestTraces)
      .where(whereClause);

    // Get paginated traces
    const traces = await db
      .select()
      .from(aiRequestTraces)
      .where(whereClause)
      .orderBy(desc(aiRequestTraces.startedAt))
      .limit(limit)
      .offset(offset);

    // Transform traces for frontend
    const transformedTraces = traces.map(trace => ({
      id: trace.id,
      traceId: trace.traceId,
      userId: trace.userId,
      agentId: trace.agentId,
      workspaceId: trace.workspaceId,
      sessionId: trace.sessionId,
      provider: trace.provider,
      model: trace.model,
      requestType: trace.requestType,
      status: trace.status,
      promptTokens: trace.promptTokens,
      completionTokens: trace.completionTokens,
      totalTokens: trace.totalTokens,
      isStreaming: trace.isStreaming,
      responseTimeMs: trace.responseTimeMs,
      finishReason: trace.finishReason,
      promptCost: trace.promptCost ? parseFloat(trace.promptCost) : null,
      completionCost: trace.completionCost ? parseFloat(trace.completionCost) : null,
      totalCost: trace.totalCost ? parseFloat(trace.totalCost) : null,
      errorCode: trace.errorCode,
      errorMessage: trace.errorMessage,
      metadata: trace.metadata,
      startedAt: trace.startedAt?.toISOString(),
      completedAt: trace.completedAt?.toISOString(),
    }));

    // Calculate aggregate stats for the current filter
    const statsResult = await db
      .select({
        totalCost: sql<string>`COALESCE(SUM(${aiRequestTraces.totalCost}), 0)`,
        totalTokens: sql<number>`COALESCE(SUM(${aiRequestTraces.totalTokens}), 0)`,
        avgResponseTime: sql<number>`COALESCE(AVG(${aiRequestTraces.responseTimeMs}), 0)`,
        successCount: sql<number>`COUNT(*) FILTER (WHERE ${aiRequestTraces.status} = 'success')`,
        failedCount: sql<number>`COUNT(*) FILTER (WHERE ${aiRequestTraces.status} = 'failed')`,
      })
      .from(aiRequestTraces)
      .where(whereClause);

    const stats = statsResult[0] || {
      totalCost: '0',
      totalTokens: 0,
      avgResponseTime: 0,
      successCount: 0,
      failedCount: 0,
    };

    return NextResponse.json({
      traces: transformedTraces,
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit),
      stats: {
        totalCost: parseFloat(stats.totalCost) || 0,
        totalTokens: stats.totalTokens || 0,
        avgResponseTime: Math.round(stats.avgResponseTime || 0),
        successCount: stats.successCount || 0,
        failedCount: stats.failedCount || 0,
        successRate: stats.successCount + stats.failedCount > 0
          ? Math.round((stats.successCount / (stats.successCount + stats.failedCount)) * 100)
          : 100,
      },
    });
  } catch (error: any) {
    console.error('[ADMIN_TRACES_GET]', error);

    if (error.code === 'SESSION_INVALID' || error.code === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch traces', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/traces/[id]
 * Get a single trace by ID (for detail view)
 * This is handled in a separate route file
 */
