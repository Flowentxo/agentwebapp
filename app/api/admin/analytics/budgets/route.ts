/**
 * Admin Analytics - Budget Utilization
 * GET - Get budget utilization across all users
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAnalyticsService } from '@/server/services/AdminAnalyticsService';

/**
 * GET /api/admin/analytics/budgets
 * Get budget utilization statistics
 */
export async function GET(req: NextRequest) {
  try {
    const budgetUtilization = await adminAnalyticsService.getBudgetUtilization();

    return NextResponse.json({
      success: true,
      data: budgetUtilization,
    });
  } catch (error) {
    console.error('[ADMIN_ANALYTICS_BUDGETS]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch budget utilization' },
      { status: 500 }
    );
  }
}
