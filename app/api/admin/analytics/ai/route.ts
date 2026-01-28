/**
 * AI ANALYTICS API ENDPOINT
 *
 * GET /api/admin/analytics/ai
 * Provides aggregated AI telemetry data for the Analytics Dashboard.
 *
 * Query Parameters:
 * - range: Time range (7d, 30d, 90d) - defaults to 30d
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { adminAnalyticsService } from '@/server/services/AdminAnalyticsService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Map range strings to days
const RANGE_TO_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export async function GET(request: NextRequest) {
  try {
    // Require admin session
    await requireSession({ requireRoles: ['admin'] });

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    const days = RANGE_TO_DAYS[range] || 30;

    // Fetch all analytics data in parallel for performance
    const [
      summary,
      costTrend,
      modelUsage,
      latencyPercentiles,
      tokenUsage,
      anomalies,
    ] = await Promise.all([
      adminAnalyticsService.getAIAnalyticsSummary(days),
      adminAnalyticsService.getDailyCostTrend(days),
      adminAnalyticsService.getModelUsageStats(days),
      adminAnalyticsService.getLatencyPercentiles(days),
      adminAnalyticsService.getTokenUsageTrend(days),
      adminAnalyticsService.detectCostAnomalies(days),
    ]);

    // Transform anomalies into human-readable insights
    const insights = anomalies.map((a) => ({
      type: 'cost_spike' as const,
      date: a.date,
      message: `Cost spike detected: $${a.cost.toFixed(2)} (+${a.deviation}% above average)`,
      severity: a.deviation > 200 ? 'high' : 'medium',
    }));

    // Add success rate insight if below threshold
    if (summary.successRate < 95) {
      insights.unshift({
        type: 'success_rate' as const,
        date: new Date().toISOString().split('T')[0],
        message: `Success rate below target: ${summary.successRate.toFixed(1)}% (target: 95%)`,
        severity: summary.successRate < 90 ? 'high' : 'medium',
      });
    }

    return NextResponse.json({
      range,
      days,
      summary: {
        totalSpend: summary.totalSpend,
        totalRequests: summary.totalRequests,
        avgLatency: summary.avgLatency,
        avgTokensPerRequest: summary.avgTokensPerRequest,
        successRate: summary.successRate,
        spendChange: summary.spendChange,
        requestsChange: summary.requestsChange,
      },
      charts: {
        costTrend,
        modelUsage,
        latencyPercentiles,
        tokenUsage,
      },
      insights,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[ADMIN_ANALYTICS_AI]', error);

    if (error.code === 'SESSION_INVALID' || error.code === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch AI analytics', details: error.message },
      { status: 500 }
    );
  }
}
