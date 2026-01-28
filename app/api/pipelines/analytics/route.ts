/**
 * Pipeline Analytics API
 * GET /api/pipelines/analytics
 *
 * Returns comprehensive analytics data for pipeline executions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { pipelineAnalyticsService } from '@/server/services/PipelineAnalyticsService';

export const dynamic = 'force-dynamic';

// Date range helpers
function getDateRange(range: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (range) {
    case '24h':
      startDate.setHours(startDate.getHours() - 24);
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    default:
      startDate.setDate(startDate.getDate() - 7); // Default to 7 days
  }

  return { startDate, endDate };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '7d';
    const pipelineId = searchParams.get('pipelineId') || undefined;

    const { startDate, endDate } = getDateRange(range);

    const analytics = await pipelineAnalyticsService.getAnalytics({
      userId: session.user.id,
      pipelineId,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      data: analytics,
      meta: {
        range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('[API] Pipeline analytics error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
