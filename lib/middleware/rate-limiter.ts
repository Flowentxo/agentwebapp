/**
 * RATE LIMITING MIDDLEWARE
 *
 * Redis-based rate limiting for API endpoints
 * - Free: 100 requests/hour
 * - Pro: 1000 requests/hour
 * - Enterprise: Unlimited
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';
import { getDb } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema-revolution';
import { eq, and } from 'drizzle-orm';

// =====================================================
// CONFIGURATION
// =====================================================

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Rate limits per plan (requests per hour)
const RATE_LIMITS = {
  free: 100,
  pro: 1000,
  enterprise: -1, // Unlimited
};

// Time window in seconds (1 hour)
const WINDOW_SIZE = 60 * 60; // 3600 seconds

// =====================================================
// REDIS CLIENT
// =====================================================

let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: REDIS_URL,
    });

    redisClient.on('error', (err) => {
      console.error('[RATE_LIMITER] Redis error:', err);
    });

    await redisClient.connect();
    console.log('[RATE_LIMITER] Redis connected');
  }

  return redisClient;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get user's subscription plan
 */
async function getUserPlan(userId: string): Promise<'free' | 'pro' | 'enterprise'> {
  try {
    const db = getDb();

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active')
        )
      )
      .limit(1);

    if (!subscription) {
      return 'free'; // Default to free if no subscription found
    }

    return subscription.plan as 'free' | 'pro' | 'enterprise';
  } catch (error) {
    console.error('[RATE_LIMITER] Error fetching user plan:', error);
    return 'free'; // Fallback to free on error
  }
}

/**
 * Get rate limit for user's plan
 */
function getRateLimit(plan: 'free' | 'pro' | 'enterprise'): number {
  return RATE_LIMITS[plan];
}

/**
 * Generate Redis key for rate limiting
 */
function getRateLimitKey(userId: string, endpoint: string): string {
  const now = new Date();
  const hourKey = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}-${now.getUTCHours()}`;
  return `rate_limit:${userId}:${endpoint}:${hourKey}`;
}

// =====================================================
// RATE LIMITER MIDDLEWARE
// =====================================================

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Check if request is within rate limit
 */
export async function checkRateLimit(
  userId: string,
  endpoint: string
): Promise<RateLimitResult> {
  try {
    // Get user's plan
    const plan = await getUserPlan(userId);
    const limit = getRateLimit(plan);

    // Enterprise has unlimited requests
    if (limit === -1) {
      return {
        allowed: true,
        limit: -1,
        remaining: -1,
        resetTime: 0,
      };
    }

    // Get Redis client
    const redis = await getRedisClient();

    // Generate rate limit key
    const key = getRateLimitKey(userId, endpoint);

    // Get current count
    const currentCount = await redis.get(key);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    // Calculate reset time (end of current hour)
    const now = Date.now();
    const resetTime = Math.ceil(now / (WINDOW_SIZE * 1000)) * (WINDOW_SIZE * 1000);

    // Check if limit exceeded
    if (count >= limit) {
      const retryAfter = Math.ceil((resetTime - now) / 1000);

      return {
        allowed: false,
        limit,
        remaining: 0,
        resetTime,
        retryAfter,
      };
    }

    // Increment counter
    const newCount = await redis.incr(key);

    // Set expiry on first request
    if (newCount === 1) {
      await redis.expire(key, WINDOW_SIZE);
    }

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - newCount),
      resetTime,
    };
  } catch (error) {
    console.error('[RATE_LIMITER] Error checking rate limit:', error);

    // On error, allow request (fail open for availability)
    return {
      allowed: true,
      limit: 0,
      remaining: 0,
      resetTime: 0,
    };
  }
}

/**
 * Next.js middleware for rate limiting
 */
export async function rateLimitMiddleware(
  req: NextRequest,
  endpoint: string
): Promise<NextResponse | null> {
  const userId = req.headers.get('x-user-id');

  // Skip rate limiting if no user ID
  if (!userId) {
    console.warn('[RATE_LIMITER] No user ID provided, skipping rate limit');
    return null;
  }

  // Check rate limit
  const result = await checkRateLimit(userId, endpoint);

  // Add rate limit headers to all responses
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

  // If rate limit exceeded, return 429
  if (!result.allowed) {
    headers.set('Retry-After', result.retryAfter?.toString() || '3600');

    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `You have exceeded your rate limit. Please try again in ${result.retryAfter} seconds.`,
        limit: result.limit,
        resetTime: new Date(result.resetTime).toISOString(),
      },
      {
        status: 429,
        headers,
      }
    );
  }

  // Return headers to be added to response
  return NextResponse.next({
    request: {
      headers: req.headers,
    },
  });
}

/**
 * Utility to add rate limit headers to existing response
 */
export async function addRateLimitHeaders(
  userId: string,
  endpoint: string
): Promise<Record<string, string>> {
  try {
    const plan = await getUserPlan(userId);
    const limit = getRateLimit(plan);

    if (limit === -1) {
      return {
        'X-RateLimit-Limit': '-1',
        'X-RateLimit-Remaining': '-1',
      };
    }

    const redis = await getRedisClient();
    const key = getRateLimitKey(userId, endpoint);
    const currentCount = await redis.get(key);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    const now = Date.now();
    const resetTime = Math.ceil(now / (WINDOW_SIZE * 1000)) * (WINDOW_SIZE * 1000);

    return {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': Math.max(0, limit - count).toString(),
      'X-RateLimit-Reset': new Date(resetTime).toISOString(),
    };
  } catch (error) {
    console.error('[RATE_LIMITER] Error adding headers:', error);
    return {};
  }
}

/**
 * Get rate limit status for user
 */
export async function getRateLimitStatus(
  userId: string,
  endpoint: string
): Promise<{
  plan: string;
  limit: number;
  used: number;
  remaining: number;
  resetTime: string;
}> {
  const plan = await getUserPlan(userId);
  const limit = getRateLimit(plan);

  if (limit === -1) {
    return {
      plan,
      limit: -1,
      used: 0,
      remaining: -1,
      resetTime: 'Never',
    };
  }

  const redis = await getRedisClient();
  const key = getRateLimitKey(userId, endpoint);
  const currentCount = await redis.get(key);
  const used = currentCount ? parseInt(currentCount, 10) : 0;

  const now = Date.now();
  const resetTime = Math.ceil(now / (WINDOW_SIZE * 1000)) * (WINDOW_SIZE * 1000);

  return {
    plan,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetTime: new Date(resetTime).toISOString(),
  };
}

// =====================================================
// CLEANUP
// =====================================================

/**
 * Graceful shutdown
 */
export async function closeRedisConnection() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('[RATE_LIMITER] Redis connection closed');
  }
}

// Handle process termination
process.on('SIGTERM', closeRedisConnection);
process.on('SIGINT', closeRedisConnection);
