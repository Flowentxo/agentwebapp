/**
 * ENTERPRISE AI ANALYTICS API
 *
 * Phase 12: ISO 42001 Compliant Analytics Dashboard
 *
 * Aggregates data from brain_ai_usage table to provide:
 * - Total cost (current month vs previous month)
 * - Token usage (prompt vs completion)
 * - Daily usage trends (last 30 days)
 * - Usage by agent
 * - Usage by model (pie chart data)
 * - Recent audit log entries
 *
 * GET /api/analytics/enterprise?range=30d
 *
 * Security: Admin/Owner only
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/connection';
import { brainAiUsage } from '@/lib/db/schema-connected-intelligence';
import { sql, desc, gte, lte, eq, and, count, sum, avg } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Range to days mapping
const RANGE_TO_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

interface DailyUsage {
  date: string;
  cost: number;
  tokens: number;
  requests: number;
}

interface AgentUsage {
  agentId: string;
  requests: number;
  tokens: number;
  cost: number;
  avgLatency: number;
}

interface ModelUsage {
  model: string;
  provider: string;
  requests: number;
  tokens: number;
  cost: number;
  percentage: number;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  model: string;
  provider: string;
  operation: string;
  tokens: number;
  cost: number;
  latencyMs: number;
  success: boolean;
  agentId?: string;
  traceId?: string;
}

interface EnterpriseAnalyticsResponse {
  range: string;
  days: number;
  kpis: {
    totalCost: number;
    previousPeriodCost: number;
    costChange: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    totalRequests: number;
    avgLatency: number;
    successRate: number;
  };
  dailyUsage: DailyUsage[];
  usageByAgent: AgentUsage[];
  usageByModel: ModelUsage[];
  recentAudit: AuditEntry[];
  generatedAt: string;
}

/**
 * Check if error is due to missing table
 */
function isTableNotFoundError(error: unknown): boolean {
  const message = (error as Error)?.message?.toLowerCase() || '';
  return (
    (message.includes('relation') && message.includes('does not exist')) ||
    (message.includes('table') && message.includes('not found')) ||
    (error as { code?: string })?.code === '42P01'
  );
}

export async function GET(request: NextRequest) {
  try {
    // Require admin session
    await requireSession({ requireRoles: ['admin', 'owner'] });

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    const days = RANGE_TO_DAYS[range] || 30;

    const db = getDb();
    const now = new Date();
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(periodStart.getTime() - days * 24 * 60 * 60 * 1000);

    // ═══════════════════════════════════════════════════════════════════
    // Fetch KPIs
    // ═══════════════════════════════════════════════════════════════════

    let kpis = {
      totalCost: 0,
      previousPeriodCost: 0,
      costChange: 0,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalRequests: 0,
      avgLatency: 0,
      successRate: 100,
    };

    try {
      // Current period stats
      const [currentStats] = await db
        .select({
          totalCost: sum(sql<number>`CAST(${brainAiUsage.costUsd} AS DECIMAL)`),
          totalTokens: sum(brainAiUsage.tokensTotal),
          promptTokens: sum(brainAiUsage.tokensPrompt),
          completionTokens: sum(brainAiUsage.tokensCompletion),
          totalRequests: count(),
          avgLatency: avg(brainAiUsage.latencyMs),
          successCount: count(sql`CASE WHEN ${brainAiUsage.success} = true THEN 1 END`),
        })
        .from(brainAiUsage)
        .where(gte(brainAiUsage.createdAt, periodStart));

      // Previous period stats
      const [previousStats] = await db
        .select({
          totalCost: sum(sql<number>`CAST(${brainAiUsage.costUsd} AS DECIMAL)`),
        })
        .from(brainAiUsage)
        .where(
          and(
            gte(brainAiUsage.createdAt, previousPeriodStart),
            lte(brainAiUsage.createdAt, periodStart)
          )
        );

      const totalCost = Number(currentStats?.totalCost || 0);
      const previousPeriodCost = Number(previousStats?.totalCost || 0);
      const totalRequests = Number(currentStats?.totalRequests || 0);
      const successCount = Number(currentStats?.successCount || 0);

      kpis = {
        totalCost,
        previousPeriodCost,
        costChange: previousPeriodCost > 0
          ? Math.round(((totalCost - previousPeriodCost) / previousPeriodCost) * 100)
          : 0,
        totalTokens: Number(currentStats?.totalTokens || 0),
        promptTokens: Number(currentStats?.promptTokens || 0),
        completionTokens: Number(currentStats?.completionTokens || 0),
        totalRequests,
        avgLatency: Math.round(Number(currentStats?.avgLatency || 0)),
        successRate: totalRequests > 0
          ? Math.round((successCount / totalRequests) * 100)
          : 100,
      };
    } catch (e) {
      if (!isTableNotFoundError(e)) throw e;
      console.warn('[ENTERPRISE_ANALYTICS] brain_ai_usage table not found');
    }

    // ═══════════════════════════════════════════════════════════════════
    // Fetch Daily Usage
    // ═══════════════════════════════════════════════════════════════════

    let dailyUsage: DailyUsage[] = [];

    try {
      const dailyResult = await db.execute<{
        date: string;
        cost: string;
        tokens: string;
        requests: string;
      }>(
        sql`
          SELECT
            DATE(created_at) as date,
            COALESCE(SUM(CAST(cost_usd AS DECIMAL)), 0) as cost,
            COALESCE(SUM(tokens_total), 0) as tokens,
            COUNT(*) as requests
          FROM brain_ai_usage
          WHERE created_at >= ${periodStart}
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `
      );

      dailyUsage = (dailyResult.rows || []).map((row) => ({
        date: row.date && typeof row.date === 'object' && 'toISOString' in row.date
          ? (row.date as Date).toISOString().split('T')[0]
          : String(row.date),
        cost: Number(row.cost || 0),
        tokens: Number(row.tokens || 0),
        requests: Number(row.requests || 0),
      }));
    } catch (e) {
      if (!isTableNotFoundError(e)) throw e;
    }

    // ═══════════════════════════════════════════════════════════════════
    // Fetch Usage by Agent
    // ═══════════════════════════════════════════════════════════════════

    let usageByAgent: AgentUsage[] = [];

    try {
      const agentResult = await db.execute<{
        agent_id: string;
        requests: string;
        tokens: string;
        cost: string;
        avg_latency: string;
      }>(
        sql`
          SELECT
            COALESCE(request_context->>'agentId', 'unknown') as agent_id,
            COUNT(*) as requests,
            COALESCE(SUM(tokens_total), 0) as tokens,
            COALESCE(SUM(CAST(cost_usd AS DECIMAL)), 0) as cost,
            COALESCE(AVG(latency_ms), 0) as avg_latency
          FROM brain_ai_usage
          WHERE created_at >= ${periodStart}
          GROUP BY request_context->>'agentId'
          ORDER BY cost DESC
          LIMIT 10
        `
      );

      usageByAgent = (agentResult.rows || []).map((row) => ({
        agentId: row.agent_id || 'unknown',
        requests: Number(row.requests || 0),
        tokens: Number(row.tokens || 0),
        cost: Number(row.cost || 0),
        avgLatency: Math.round(Number(row.avg_latency || 0)),
      }));
    } catch (e) {
      if (!isTableNotFoundError(e)) throw e;
    }

    // ═══════════════════════════════════════════════════════════════════
    // Fetch Usage by Model
    // ═══════════════════════════════════════════════════════════════════

    let usageByModel: ModelUsage[] = [];

    try {
      const modelResult = await db.execute<{
        model: string;
        provider: string;
        requests: string;
        tokens: string;
        cost: string;
      }>(
        sql`
          SELECT
            model,
            provider,
            COUNT(*) as requests,
            COALESCE(SUM(tokens_total), 0) as tokens,
            COALESCE(SUM(CAST(cost_usd AS DECIMAL)), 0) as cost
          FROM brain_ai_usage
          WHERE created_at >= ${periodStart}
          GROUP BY model, provider
          ORDER BY requests DESC
        `
      );

      const totalModelRequests = (modelResult.rows || []).reduce(
        (sum, row) => sum + Number(row.requests || 0),
        0
      );

      usageByModel = (modelResult.rows || []).map((row) => ({
        model: row.model || 'unknown',
        provider: row.provider || 'unknown',
        requests: Number(row.requests || 0),
        tokens: Number(row.tokens || 0),
        cost: Number(row.cost || 0),
        percentage: totalModelRequests > 0
          ? Math.round((Number(row.requests || 0) / totalModelRequests) * 100)
          : 0,
      }));
    } catch (e) {
      if (!isTableNotFoundError(e)) throw e;
    }

    // ═══════════════════════════════════════════════════════════════════
    // Fetch Recent Audit Log
    // ═══════════════════════════════════════════════════════════════════

    let recentAudit: AuditEntry[] = [];

    try {
      const auditRecords = await db
        .select()
        .from(brainAiUsage)
        .orderBy(desc(brainAiUsage.createdAt))
        .limit(15);

      recentAudit = auditRecords.map((record) => ({
        id: record.id,
        timestamp: record.createdAt?.toISOString() || new Date().toISOString(),
        userId: record.userId,
        model: record.model,
        provider: record.provider,
        operation: record.operation,
        tokens: record.tokensTotal,
        cost: Number(record.costUsd || 0),
        latencyMs: record.latencyMs || 0,
        success: record.success ?? true,
        agentId: (record.requestContext as Record<string, unknown>)?.agentId as string | undefined,
        traceId: (record.requestContext as Record<string, unknown>)?.sessionId as string | undefined,
      }));
    } catch (e) {
      if (!isTableNotFoundError(e)) throw e;
    }

    // ═══════════════════════════════════════════════════════════════════
    // Return Response
    // ═══════════════════════════════════════════════════════════════════

    const response: EnterpriseAnalyticsResponse = {
      range,
      days,
      kpis,
      dailyUsage,
      usageByAgent,
      usageByModel,
      recentAudit,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('[ENTERPRISE_ANALYTICS]', error);

    const err = error as { code?: string; message?: string };
    if (err.code === 'SESSION_INVALID' || err.code === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch enterprise analytics', details: err.message },
      { status: 500 }
    );
  }
}
