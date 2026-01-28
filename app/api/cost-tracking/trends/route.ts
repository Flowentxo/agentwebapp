import { NextRequest, NextResponse } from 'next/server';
import { costTrackingService } from '@/server/services/CostTrackingService';
import { getSessionToken } from '@/lib/auth/cookies';
import { getSessionByToken } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper to get user ID from session
async function getUserId(req: NextRequest): Promise<string> {
  try {
    const token = await getSessionToken();
    if (token) {
      const session = await getSessionByToken(token);
      if (session?.userId) {
        return session.userId;
      }
    }
  } catch (error) {
    console.log('[AUTH] No valid session, using default user');
  }

  return 'default-user';
}

/**
 * GET /api/cost-tracking/trends
 * Get cost trends (last 7 days vs previous 7 days, last 30 days)
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);

    const trends = await costTrackingService.getCostTrends(userId);

    return NextResponse.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    console.error('[COST_TRENDS_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cost trends' },
      { status: 500 }
    );
  }
}
