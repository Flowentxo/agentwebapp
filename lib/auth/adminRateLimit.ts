/**
 * ADMIN RATE LIMITING
 *
 * Rate limiting specifically for admin API routes.
 * Prevents abuse while allowing higher limits for legitimate admin use.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, incrementRateLimit, type RateLimitResult } from './rateLimit';

// =====================================================
// Admin Rate Limit Configurations
// =====================================================

export const ADMIN_RATE_LIMITS = {
  // Standard admin API calls
  ADMIN_API: {
    maxAttempts: 100,      // 100 requests
    windowMs: 60 * 1000,   // per minute
  },

  // Sensitive operations (user management, force logout, etc.)
  ADMIN_SENSITIVE: {
    maxAttempts: 20,       // 20 requests
    windowMs: 60 * 1000,   // per minute
  },

  // Analytics queries (can be expensive)
  ADMIN_ANALYTICS: {
    maxAttempts: 30,       // 30 requests
    windowMs: 60 * 1000,   // per minute
  },

  // Bulk operations
  ADMIN_BULK: {
    maxAttempts: 10,       // 10 requests
    windowMs: 60 * 1000,   // per minute
  },

  // Export operations
  ADMIN_EXPORT: {
    maxAttempts: 5,        // 5 requests
    windowMs: 5 * 60 * 1000, // per 5 minutes
  },
} as const;

export type AdminRateLimitType = keyof typeof ADMIN_RATE_LIMITS;

// =====================================================
// Rate Limit Middleware
// =====================================================

export interface AdminRateLimitOptions {
  type?: AdminRateLimitType;
  keyPrefix?: string;
  skipInDevelopment?: boolean;
}

/**
 * Check admin rate limit and return appropriate response if exceeded
 */
export async function checkAdminRateLimit(
  req: NextRequest,
  options: AdminRateLimitOptions = {}
): Promise<{ allowed: boolean; response?: NextResponse; result: RateLimitResult }> {
  const {
    type = 'ADMIN_API',
    keyPrefix = 'admin',
    skipInDevelopment = false,
  } = options;

  // Skip in development if configured
  if (skipInDevelopment && process.env.NODE_ENV === 'development') {
    return {
      allowed: true,
      result: {
        allowed: true,
        remaining: 999,
        resetAt: new Date(Date.now() + 60000),
      },
    };
  }

  // Get identifier (prefer user ID, fall back to IP)
  const userId = req.headers.get('x-user-id') || 'anonymous';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';

  const identifier = userId !== 'anonymous' ? userId : ip;
  const config = ADMIN_RATE_LIMITS[type];
  const key = `${keyPrefix}:${type.toLowerCase()}:${identifier}`;

  const result = await checkRateLimit(key, config);

  if (!result.allowed) {
    const response = NextResponse.json(
      {
        success: false,
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: result.retryAfter,
        resetAt: result.resetAt.toISOString(),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.maxAttempts.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetAt.toISOString(),
          'Retry-After': (result.retryAfter || 60).toString(),
        },
      }
    );

    return { allowed: false, response, result };
  }

  return { allowed: true, result };
}

/**
 * Record an admin API request (increment counter)
 */
export async function recordAdminRequest(
  req: NextRequest,
  options: AdminRateLimitOptions = {}
): Promise<void> {
  const {
    type = 'ADMIN_API',
    keyPrefix = 'admin',
    skipInDevelopment = false,
  } = options;

  if (skipInDevelopment && process.env.NODE_ENV === 'development') {
    return;
  }

  const userId = req.headers.get('x-user-id') || 'anonymous';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';

  const identifier = userId !== 'anonymous' ? userId : ip;
  const config = ADMIN_RATE_LIMITS[type];
  const key = `${keyPrefix}:${type.toLowerCase()}:${identifier}`;

  await incrementRateLimit(key, config);
}

/**
 * Higher-order function to wrap admin API handlers with rate limiting
 */
export function withAdminRateLimit<T extends (...args: unknown[]) => Promise<NextResponse>>(
  handler: T,
  options: AdminRateLimitOptions = {}
): T {
  return (async (...args: unknown[]) => {
    const req = args[0] as NextRequest;

    // Check rate limit
    const { allowed, response, result } = await checkAdminRateLimit(req, options);

    if (!allowed && response) {
      return response;
    }

    // Record the request
    await recordAdminRequest(req, options);

    // Call the original handler
    const handlerResponse = await handler(...args);

    // Add rate limit headers to response
    const config = ADMIN_RATE_LIMITS[options.type || 'ADMIN_API'];

    // Clone the response to add headers
    const headers = new Headers(handlerResponse.headers);
    headers.set('X-RateLimit-Limit', config.maxAttempts.toString());
    headers.set('X-RateLimit-Remaining', Math.max(0, result.remaining).toString());
    headers.set('X-RateLimit-Reset', result.resetAt.toISOString());

    return new NextResponse(handlerResponse.body, {
      status: handlerResponse.status,
      statusText: handlerResponse.statusText,
      headers,
    });
  }) as T;
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
  type: AdminRateLimitType = 'ADMIN_API'
): NextResponse {
  const config = ADMIN_RATE_LIMITS[type];

  response.headers.set('X-RateLimit-Limit', config.maxAttempts.toString());
  response.headers.set('X-RateLimit-Remaining', Math.max(0, result.remaining).toString());
  response.headers.set('X-RateLimit-Reset', result.resetAt.toISOString());

  return response;
}

/**
 * Create a rate limit exceeded response
 */
export function rateLimitExceededResponse(
  result: RateLimitResult,
  type: AdminRateLimitType = 'ADMIN_API'
): NextResponse {
  const config = ADMIN_RATE_LIMITS[type];

  return NextResponse.json(
    {
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: result.retryAfter,
      resetAt: result.resetAt.toISOString(),
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': config.maxAttempts.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetAt.toISOString(),
        'Retry-After': (result.retryAfter || 60).toString(),
      },
    }
  );
}
