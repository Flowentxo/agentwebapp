/**
 * Rate Limit API Endpoint
 *
 * Provides rate limit status and metrics for the Motion AI system
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  rateLimiter,
  RateLimitContext,
} from '@/lib/agents/motion/services/RateLimitService';

/**
 * GET /api/motion/rate-limit
 *
 * Get rate limit status for the current user
 *
 * Query Parameters:
 * - userId: string (required)
 * - workspaceId: string (optional)
 * - agentId: string (optional)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const workspaceId = searchParams.get('workspaceId');
    const agentId = searchParams.get('agentId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const context: RateLimitContext = {
      userId,
      workspaceId: workspaceId || undefined,
      agentId: agentId || undefined,
    };

    // Get current rate limit status
    const status = await rateLimiter.getStatus(context);
    const result = await rateLimiter.checkLimit(context);

    return NextResponse.json({
      success: true,
      data: {
        allowed: result.allowed,
        remainingTokens: result.remainingTokens,
        remainingRequests: result.remainingRequests,
        resetTime: result.resetTime,
        retryAfter: result.retryAfter,
        details: {
          buckets: status.buckets,
          windows: status.windows,
          queueLength: status.queueLength,
        },
      },
    });
  } catch (error) {
    console.error('[RATE_LIMIT_API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/motion/rate-limit/reset
 *
 * Reset rate limits for a user (admin only)
 *
 * Body:
 * - userId: string (required)
 * - workspaceId: string (optional)
 * - agentId: string (optional)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, workspaceId, agentId, action } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const context: RateLimitContext = {
      userId,
      workspaceId: workspaceId || undefined,
      agentId: agentId || undefined,
    };

    if (action === 'reset') {
      // TODO: Add admin authentication check
      await rateLimiter.reset(context);

      return NextResponse.json({
        success: true,
        message: 'Rate limits reset successfully',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported actions: reset' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[RATE_LIMIT_API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
