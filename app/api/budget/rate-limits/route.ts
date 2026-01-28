/**
 * Rate Limit Status API
 * GET /api/budget/rate-limits - Get current rate limit status
 */

import { NextRequest, NextResponse } from 'next/server';
import { budgetService } from '@/server/services/BudgetService';
import { rateLimitService } from '@/server/services/RateLimitService';
import { getSessionToken } from '@/lib/auth/cookies';
import { getSessionByToken } from '@/lib/auth/session';

async function getUserId(req: NextRequest): Promise<string | null> {
  try {
    const token = await getSessionToken();
    if (token) {
      const session = await getSessionByToken(token);
      if (session?.userId) {
        return session.userId;
      }
    }
  } catch (error) {
    console.log('[AUTH] No valid session');
  }

  return 'default-user';
}

/**
 * GET /api/budget/rate-limits - Get current rate limit status
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let config;
    let status;

    try {
      // Get rate limit configuration
      config = await budgetService.getRateLimitConfig(userId);
      // Get current status for all windows
      status = await rateLimitService.getRateLimitStatus(userId, config);
    } catch (dbError) {
      console.error('[RATE_LIMITS_GET] Database error, using fallback:', dbError);
      // Fallback configuration
      config = {
        maxRequestsPerMinute: 60,
        maxRequestsPerHour: 1000,
        maxRequestsPerDay: 10000,
      };
      // Get status using fallback config (RateLimitService handles its own fallbacks)
      status = await rateLimitService.getRateLimitStatus(userId, config);
    }

    return NextResponse.json({
      success: true,
      data: {
        config: {
          maxRequestsPerMinute: config.maxRequestsPerMinute,
          maxRequestsPerHour: config.maxRequestsPerHour,
          maxRequestsPerDay: config.maxRequestsPerDay,
        },
        status: {
          minute: {
            allowed: status.minute.allowed,
            limit: status.minute.limit,
            remaining: status.minute.remaining,
            resetAt: status.minute.resetAt,
            percentage: ((status.minute.limit - status.minute.remaining) / status.minute.limit) * 100,
          },
          hour: {
            allowed: status.hour.allowed,
            limit: status.hour.limit,
            remaining: status.hour.remaining,
            resetAt: status.hour.resetAt,
            percentage: ((status.hour.limit - status.hour.remaining) / status.hour.limit) * 100,
          },
          day: {
            allowed: status.day.allowed,
            limit: status.day.limit,
            remaining: status.day.remaining,
            resetAt: status.day.resetAt,
            percentage: ((status.day.limit - status.day.remaining) / status.day.limit) * 100,
          },
        },
      },
    });
  } catch (error) {
    console.error('[RATE_LIMITS_GET] Critical error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rate limit status' },
      { status: 500 }
    );
  }
}
