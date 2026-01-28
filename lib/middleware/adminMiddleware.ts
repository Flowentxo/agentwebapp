/**
 * ADMIN MIDDLEWARE
 *
 * Combined middleware for admin API routes providing:
 * - Authentication verification
 * - Role-based access control
 * - Rate limiting
 * - Request logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/session';
import {
  checkAdminRateLimit,
  recordAdminRequest,
  type AdminRateLimitType,
  type AdminRateLimitOptions,
} from '@/lib/auth/adminRateLimit';

// =====================================================
// Types
// =====================================================

export interface AdminMiddlewareOptions {
  // Rate limiting
  rateLimit?: AdminRateLimitType | false;
  rateLimitOptions?: AdminRateLimitOptions;

  // Authentication
  requireAuth?: boolean;
  requiredRoles?: string[];

  // Logging
  logRequest?: boolean;
  operationName?: string;
}

export interface AdminContext {
  userId: string;
  userEmail?: string;
  userRole?: string;
  ip: string;
  userAgent: string;
}

export interface AdminMiddlewareResult {
  success: boolean;
  context?: AdminContext;
  response?: NextResponse;
  error?: string;
}

// =====================================================
// Main Middleware Function
// =====================================================

/**
 * Validate an admin API request
 *
 * Performs:
 * 1. Rate limit check
 * 2. Session validation
 * 3. Role verification
 *
 * @returns Context if successful, or error response
 */
export async function validateAdminRequest(
  req: NextRequest,
  options: AdminMiddlewareOptions = {}
): Promise<AdminMiddlewareResult> {
  const {
    rateLimit = 'ADMIN_API',
    rateLimitOptions = {},
    requireAuth = true,
    requiredRoles = ['admin'],
  } = options;

  // Extract request metadata
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  // 1. Check rate limit (if enabled)
  if (rateLimit !== false) {
    const { allowed, response } = await checkAdminRateLimit(req, {
      type: rateLimit,
      ...rateLimitOptions,
    });

    if (!allowed && response) {
      return {
        success: false,
        response,
        error: 'Rate limit exceeded',
      };
    }

    // Record the request
    await recordAdminRequest(req, {
      type: rateLimit,
      ...rateLimitOptions,
    });
  }

  // 2. Verify authentication (if required)
  if (requireAuth) {
    try {
      const cookieStore = await cookies();
      const sessionToken = cookieStore.get('session')?.value;

      if (!sessionToken) {
        return {
          success: false,
          response: NextResponse.json(
            { success: false, error: 'Authentication required' },
            { status: 401 }
          ),
          error: 'No session token',
        };
      }

      const session = await verifySession(sessionToken);

      if (!session) {
        return {
          success: false,
          response: NextResponse.json(
            { success: false, error: 'Invalid or expired session' },
            { status: 401 }
          ),
          error: 'Invalid session',
        };
      }

      // 3. Verify role (if required)
      if (requiredRoles.length > 0) {
        const userRole = session.role || 'user';

        if (!requiredRoles.includes(userRole)) {
          return {
            success: false,
            response: NextResponse.json(
              { success: false, error: 'Insufficient permissions' },
              { status: 403 }
            ),
            error: 'Insufficient permissions',
          };
        }
      }

      // Build context
      const context: AdminContext = {
        userId: session.userId,
        userEmail: session.email,
        userRole: session.role,
        ip,
        userAgent,
      };

      return { success: true, context };

    } catch (error) {
      console.error('[ADMIN_MIDDLEWARE] Auth error:', error);
      return {
        success: false,
        response: NextResponse.json(
          { success: false, error: 'Authentication failed' },
          { status: 401 }
        ),
        error: 'Auth error',
      };
    }
  }

  // No auth required, return minimal context
  return {
    success: true,
    context: {
      userId: 'anonymous',
      ip,
      userAgent,
    },
  };
}

// =====================================================
// Higher-Order Function Wrapper
// =====================================================

type AdminHandler<T = unknown> = (
  req: NextRequest,
  context: AdminContext,
  ...args: unknown[]
) => Promise<NextResponse<T>>;

/**
 * Wrap an admin API handler with middleware
 */
export function withAdminMiddleware<T = unknown>(
  handler: AdminHandler<T>,
  options: AdminMiddlewareOptions = {}
): (req: NextRequest, ...args: unknown[]) => Promise<NextResponse> {
  return async (req: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    const result = await validateAdminRequest(req, options);

    if (!result.success) {
      return result.response || NextResponse.json(
        { success: false, error: result.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    try {
      return await handler(req, result.context!, ...args);
    } catch (error) {
      console.error('[ADMIN_HANDLER] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        },
        { status: 500 }
      );
    }
  };
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Quick check if request has valid admin session
 */
export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  const result = await validateAdminRequest(req, {
    rateLimit: false,
    requireAuth: true,
    requiredRoles: ['admin'],
  });
  return result.success;
}

/**
 * Get admin context from request (or null if not authenticated)
 */
export async function getAdminContext(req: NextRequest): Promise<AdminContext | null> {
  const result = await validateAdminRequest(req, {
    rateLimit: false,
    requireAuth: true,
    requiredRoles: ['admin'],
  });

  return result.success ? result.context! : null;
}

/**
 * Create standardized error responses
 */
export const AdminErrors = {
  unauthorized: () => NextResponse.json(
    { success: false, error: 'Authentication required' },
    { status: 401 }
  ),

  forbidden: () => NextResponse.json(
    { success: false, error: 'Insufficient permissions' },
    { status: 403 }
  ),

  notFound: (resource = 'Resource') => NextResponse.json(
    { success: false, error: `${resource} not found` },
    { status: 404 }
  ),

  badRequest: (message = 'Invalid request') => NextResponse.json(
    { success: false, error: message },
    { status: 400 }
  ),

  internal: (message = 'Internal server error') => NextResponse.json(
    { success: false, error: message },
    { status: 500 }
  ),

  rateLimited: (retryAfter = 60) => NextResponse.json(
    {
      success: false,
      error: 'Too many requests',
      retryAfter,
    },
    {
      status: 429,
      headers: { 'Retry-After': retryAfter.toString() },
    }
  ),
};
