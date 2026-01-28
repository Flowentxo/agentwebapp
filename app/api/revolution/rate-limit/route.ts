/**
 * RATE LIMIT STATUS API
 *
 * GET /api/revolution/rate-limit
 *
 * Returns user's rate limit status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRateLimitStatus } from '@/lib/middleware/rate-limiter';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Missing user ID',
          message: 'x-user-id header is required',
        },
        { status: 400 }
      );
    }

    // Get rate limit status for this endpoint
    const status = await getRateLimitStatus(userId, '/api/revolution');

    return NextResponse.json({
      success: true,
      rateLimit: status,
    });
  } catch (error: any) {
    console.error('[RATE_LIMIT_STATUS]', error);
    return NextResponse.json(
      {
        error: 'Failed to get rate limit status',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
