/**
 * Admin Analytics - Custom Prompts Analytics
 * GET - Get custom prompts usage statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAnalyticsService } from '@/server/services/AdminAnalyticsService';

/**
 * GET /api/admin/analytics/prompts
 * Get custom prompts analytics
 */
export async function GET(req: NextRequest) {
  try {
    const promptAnalytics = await adminAnalyticsService.getPromptAnalytics();

    return NextResponse.json({
      success: true,
      data: promptAnalytics,
    });
  } catch (error) {
    console.error('[ADMIN_ANALYTICS_PROMPTS]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch prompt analytics' },
      { status: 500 }
    );
  }
}
