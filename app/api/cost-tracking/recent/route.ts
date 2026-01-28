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
 * GET /api/cost-tracking/recent
 * Get recent usage records
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const { searchParams } = new URL(req.url);

    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 50;

    let recentUsage = [];
    try {
      recentUsage = await costTrackingService.getRecentUsage(userId, limit);
    } catch (dbError) {
      console.warn('[COST_RECENT_GET] Database error, returning empty array:', dbError);
      // Return empty array if DB fails
    }

    return NextResponse.json({
      success: true,
      data: recentUsage,
    });
  } catch (error) {
    console.error('[COST_RECENT_GET]', error);
    return NextResponse.json(
      { success: true, data: [] }, // Return empty array instead of error
      { status: 200 }
    );
  }
}
