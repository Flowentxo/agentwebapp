/**
 * Admin Analytics - Agent Statistics
 * GET - Get agent usage statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAnalyticsService } from '@/server/services/AdminAnalyticsService';

/**
 * GET /api/admin/analytics/agents?days=<number>
 * Get agent usage statistics
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');

    const agentStats = await adminAnalyticsService.getAgentStats(days);

    return NextResponse.json({
      success: true,
      data: agentStats,
    });
  } catch (error) {
    console.error('[ADMIN_ANALYTICS_AGENTS]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agent statistics' },
      { status: 500 }
    );
  }
}
