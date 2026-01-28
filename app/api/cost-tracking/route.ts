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

  // Fallback for development/testing
  return 'default-user';
}

/**
 * GET /api/cost-tracking
 * Get cost summary with optional date range
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const { searchParams } = new URL(req.url);

    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const period = searchParams.get('period'); // 'week' | 'month' | 'all'

    let dateRange: { startDate: Date; endDate: Date } | undefined;

    if (startDateParam && endDateParam) {
      dateRange = {
        startDate: new Date(startDateParam),
        endDate: new Date(endDateParam),
      };
    } else if (period) {
      const now = new Date();
      const endDate = now;
      let startDate: Date;

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          // Last 30 days as default
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      dateRange = { startDate, endDate };
    }

    const summary = await costTrackingService.getCostSummary(userId, dateRange);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('[COST_TRACKING_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cost summary' },
      { status: 500 }
    );
  }
}
