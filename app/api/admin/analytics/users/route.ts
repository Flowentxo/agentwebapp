/**
 * Admin Analytics - User Activity Statistics
 * GET - Get top users by activity
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAnalyticsService } from '@/server/services/AdminAnalyticsService';

/**
 * GET /api/admin/analytics/users?limit=<number>
 * Get top users by activity
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const userStats = await adminAnalyticsService.getTopUsers(limit);

    return NextResponse.json({
      success: true,
      data: userStats,
    });
  } catch (error) {
    console.error('[ADMIN_ANALYTICS_USERS]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user statistics' },
      { status: 500 }
    );
  }
}
