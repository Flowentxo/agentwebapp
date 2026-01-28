/**
 * Brain AI Analytics API
 * GET /api/brain/analytics
 *
 * Returns analytics dashboard data for Brain AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/brain/AnalyticsService';
import { getSessionFromRequest } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get workspace ID from request
function getWorkspaceId(req: NextRequest): string {
  return req.headers.get('x-workspace-id') || 'default-workspace';
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const workspaceId = getWorkspaceId(req);
    const searchParams = req.nextUrl.searchParams;

    // Parse time range
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const period = searchParams.get('period') || '30d';

    let timeRange: { start: Date; end: Date };

    if (startParam && endParam) {
      timeRange = {
        start: new Date(startParam),
        end: new Date(endParam),
      };
    } else {
      // Default periods
      const end = new Date();
      const start = new Date();

      switch (period) {
        case '7d':
          start.setDate(start.getDate() - 7);
          break;
        case '30d':
          start.setDate(start.getDate() - 30);
          break;
        case '90d':
          start.setDate(start.getDate() - 90);
          break;
        case '1y':
          start.setFullYear(start.getFullYear() - 1);
          break;
        default:
          start.setDate(start.getDate() - 30);
      }

      timeRange = { start, end };
    }

    // Get specific metrics or full dashboard
    const metricsType = searchParams.get('type');

    if (metricsType) {
      switch (metricsType) {
        case 'query':
          const queryAnalytics = await analyticsService.getQueryAnalytics(workspaceId, timeRange);
          return NextResponse.json({ success: true, data: queryAnalytics, type: 'query' });

        case 'usage':
          const usageMetrics = await analyticsService.getUsageMetrics(workspaceId, timeRange);
          return NextResponse.json({ success: true, data: usageMetrics, type: 'usage' });

        case 'quality':
          const qualityMetrics = await analyticsService.getSearchQualityMetrics(workspaceId, timeRange);
          return NextResponse.json({ success: true, data: qualityMetrics, type: 'quality' });

        case 'performance':
          const performanceMetrics = await analyticsService.getPerformanceMetrics(workspaceId, timeRange);
          return NextResponse.json({ success: true, data: performanceMetrics, type: 'performance' });

        default:
          return NextResponse.json(
            { error: `Unknown metrics type: ${metricsType}` },
            { status: 400 }
          );
      }
    }

    // Return full dashboard
    const dashboardData = await analyticsService.getDashboardData(workspaceId, timeRange);

    return NextResponse.json({
      success: true,
      data: dashboardData,
      workspaceId,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Brain Analytics API] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics',
        message: err.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/brain/analytics
 * Record analytics events
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, data } = body;

    switch (event) {
      case 'query':
        if (typeof data?.latencyMs === 'number') {
          analyticsService.recordQuery(data.latencyMs);
        }
        break;

      case 'cache':
        if (typeof data?.hit === 'boolean') {
          analyticsService.recordCacheAccess(data.hit);
        }
        break;

      case 'interaction':
        if (data?.queryId && data?.type) {
          analyticsService.recordInteraction(data.queryId, data.type);
        }
        break;

      default:
        return NextResponse.json(
          { error: `Unknown event type: ${event}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Brain Analytics API] POST Error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
