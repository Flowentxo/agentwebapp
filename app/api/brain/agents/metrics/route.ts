/**
 * Agent Metrics API
 * Endpoint: GET /api/brain/agents/metrics
 * Provides metrics and monitoring for agent-brain interactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { agentMetricsTracker } from '@/lib/brain/AgentMetricsTracker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/brain/agents/metrics
 * Get metrics for agents
 *
 * Query params:
 * - agentId: specific agent ID (optional, returns all if not provided)
 * - period: hour | day | week (default: day)
 * - includeAlerts: true | false (default: false)
 * - includeTrends: true | false (default: false)
 * - trendDays: number of days for trends (default: 7)
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    const period = (searchParams.get('period') || 'day') as
      | 'hour'
      | 'day'
      | 'week';
    const includeAlerts = searchParams.get('includeAlerts') === 'true';
    const includeTrends = searchParams.get('includeTrends') === 'true';
    const trendDays = parseInt(searchParams.get('trendDays') || '7');

    // Validate period
    if (!['hour', 'day', 'week'].includes(period)) {
      return NextResponse.json(
        {
          error: 'Invalid period. Must be: hour, day, or week',
        },
        { status: 400 }
      );
    }

    let response: any = {
      success: true,
      timestamp: new Date().toISOString(),
    };

    // Get metrics for specific agent or all agents
    if (agentId) {
      const metrics = await agentMetricsTracker.getAgentMetrics(
        agentId,
        period
      );
      response.agent = metrics;

      // Include alerts if requested
      if (includeAlerts) {
        const alerts = await agentMetricsTracker.checkAnomalies(agentId);
        response.alerts = alerts;
      }

      // Include trends if requested
      if (includeTrends) {
        const trends = await agentMetricsTracker.getAgentTrends(
          agentId,
          trendDays
        );
        response.trends = trends;
      }
    } else {
      const allMetrics = await agentMetricsTracker.getAllAgentsMetrics(period);
      response.agents = allMetrics;
      response.totalAgents = allMetrics.length;

      // Summary statistics
      response.summary = {
        totalQueries: allMetrics.reduce(
          (sum, m) => sum + m.metrics.totalQueries,
          0
        ),
        totalContextsStored: allMetrics.reduce(
          (sum, m) => sum + m.metrics.totalContextsStored,
          0
        ),
        totalDocumentsIndexed: allMetrics.reduce(
          (sum, m) => sum + m.metrics.totalDocumentsIndexed,
          0
        ),
        averageCacheHitRate:
          allMetrics.length > 0
            ? Math.round(
                (allMetrics.reduce(
                  (sum, m) => sum + m.metrics.cacheHitRate,
                  0
                ) /
                  allMetrics.length) *
                  10
              ) / 10
            : 0,
        totalEstimatedCost: allMetrics.reduce(
          (sum, m) => sum + m.usage.estimatedCost,
          0
        ),
      };

      // Include alerts for all agents if requested
      if (includeAlerts) {
        const allAlerts = [];
        for (const metric of allMetrics) {
          const agentAlerts = await agentMetricsTracker.checkAnomalies(
            metric.agentId
          );
          allAlerts.push(...agentAlerts);
        }
        response.alerts = allAlerts;
      }
    }

    response.responseTime = Date.now() - startTime;

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[AGENT_METRICS_API]', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/brain/agents/metrics/reset
 * Reset metrics for an agent (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const { agentId } = await req.json();

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    const success = await agentMetricsTracker.resetAgentMetrics(agentId);

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Metrics reset for agent: ${agentId}`,
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to reset metrics',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[AGENT_METRICS_RESET]', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
