/**
 * Admin Analytics - Model Statistics
 * GET - Get model usage statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAnalyticsService } from '@/server/services/AdminAnalyticsService';

/**
 * GET /api/admin/analytics/models?days=<number>
 * Get model usage statistics
 *
 * Query params:
 * - days: Number of days to analyze (default: 30)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');

    const modelStats = await adminAnalyticsService.getModelStats(days);

    return NextResponse.json({
      success: true,
      data: modelStats,
    });
  } catch (error) {
    console.error('[ADMIN_ANALYTICS_MODELS]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch model statistics' },
      { status: 500 }
    );
  }
}
