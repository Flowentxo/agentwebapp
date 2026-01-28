/**
 * Admin Analytics - Cost Trends
 * GET - Get cost trends over time
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAnalyticsService } from '@/server/services/AdminAnalyticsService';

/**
 * GET /api/admin/analytics/cost-trends?days=<number>
 * Get cost trends over time
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');

    const costTrends = await adminAnalyticsService.getCostTrends(days);

    return NextResponse.json({
      success: true,
      data: costTrends,
    });
  } catch (error) {
    console.error('[ADMIN_ANALYTICS_COST_TRENDS]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cost trends' },
      { status: 500 }
    );
  }
}
