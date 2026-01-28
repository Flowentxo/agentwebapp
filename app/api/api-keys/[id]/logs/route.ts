/**
 * API Key Usage Logs Endpoint
 *
 * GET /api/api-keys/[id]/logs - Get usage logs for specific API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { apiKeyUsageLogs, apiKeys } from '@/lib/db/schema-api-keys';
import { getSessionUser } from '@/lib/auth/session';
import { eq, and, desc, gte, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/api-keys/[id]/logs - Get usage logs
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in' },
        { status: 401 }
      );
    }

    const db = getDb();

    // Verify ownership
    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, params.id), eq(apiKeys.userId, user.id)))
      .limit(1);

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Not found', message: 'API key not found' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const url = req.nextUrl;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 1000);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const daysAgo = parseInt(url.searchParams.get('days') || '7');

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - daysAgo);

    // Get logs
    const logs = await db
      .select()
      .from(apiKeyUsageLogs)
      .where(and(eq(apiKeyUsageLogs.apiKeyId, params.id), gte(apiKeyUsageLogs.createdAt, sinceDate)))
      .orderBy(desc(apiKeyUsageLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Get statistics
    const statsResult = await db
      .select({
        totalRequests: sql<number>`count(*)`,
        successfulRequests: sql<number>`count(*) filter (where status_code < 400)`,
        failedRequests: sql<number>`count(*) filter (where status_code >= 400)`,
        avgResponseTime: sql<number>`avg(response_time)`,
        totalTokensUsed: sql<number>`sum(tokens_used)`,
      })
      .from(apiKeyUsageLogs)
      .where(and(eq(apiKeyUsageLogs.apiKeyId, params.id), gte(apiKeyUsageLogs.createdAt, sinceDate)));

    const stats = statsResult[0];

    // Get endpoint breakdown
    const endpointStats = await db
      .select({
        endpoint: apiKeyUsageLogs.endpoint,
        count: sql<number>`count(*)`,
        avgResponseTime: sql<number>`avg(response_time)`,
      })
      .from(apiKeyUsageLogs)
      .where(and(eq(apiKeyUsageLogs.apiKeyId, params.id), gte(apiKeyUsageLogs.createdAt, sinceDate)))
      .groupBy(apiKeyUsageLogs.endpoint)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        statistics: {
          totalRequests: Number(stats.totalRequests) || 0,
          successfulRequests: Number(stats.successfulRequests) || 0,
          failedRequests: Number(stats.failedRequests) || 0,
          avgResponseTime: Math.round(Number(stats.avgResponseTime) || 0),
          totalTokensUsed: Number(stats.totalTokensUsed) || 0,
        },
        endpointStats,
        meta: {
          limit,
          offset,
          daysAgo,
        },
      },
    });
  } catch (error) {
    console.error('[API_KEY_LOGS]', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
