/**
 * API Key Authentication Middleware
 *
 * Validates API keys, checks permissions, and logs usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, hasScope, hasAnyScope, type ValidatedApiKey } from './api-key-service';
import { getDb } from '@/lib/db';
import { apiKeyUsageLogs } from '@/lib/db/schema-api-keys';
import type { ApiScope } from '@/lib/db/schema-api-keys';

/**
 * Extract API key from request headers
 * Supports:
 * - Authorization: Bearer flwnt_live_...
 * - X-API-Key: flwnt_live_...
 */
function extractApiKey(req: NextRequest): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check X-API-Key header
  const apiKeyHeader = req.headers.get('x-api-key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  return null;
}

/**
 * Get client IP address
 */
function getClientIp(req: NextRequest): string | null {
  // Check various headers for IP
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback (may not work in all environments)
  return req.ip || null;
}

/**
 * Check IP whitelist
 */
function isIpAllowed(clientIp: string | null, whitelist: string[] | null): boolean {
  if (!whitelist || whitelist.length === 0) {
    return true; // No whitelist = allow all
  }

  if (!clientIp) {
    return false; // Whitelist exists but no IP = deny
  }

  return whitelist.includes(clientIp);
}

/**
 * Log API key usage
 */
async function logUsage(
  apiKeyId: string,
  keyPrefix: string,
  req: NextRequest,
  statusCode: number,
  responseTime: number,
  errorMessage?: string
): Promise<void> {
  const db = getDb();

  try {
    await db.insert(apiKeyUsageLogs).values({
      apiKeyId,
      keyPrefix,
      method: req.method,
      endpoint: req.nextUrl.pathname,
      statusCode,
      ipAddress: getClientIp(req),
      userAgent: req.headers.get('user-agent'),
      responseTime,
      errorMessage,
    });
  } catch (error) {
    console.error('[API_KEY_MIDDLEWARE] Failed to log usage:', error);
  }
}

/**
 * API Key Middleware Options
 */
export interface ApiKeyMiddlewareOptions {
  requiredScopes?: ApiScope[]; // Must have at least one
  requireAllScopes?: boolean; // If true, must have ALL scopes
  allowExpired?: boolean; // For testing
}

/**
 * Extended NextRequest with validated API key
 */
export interface AuthenticatedRequest extends NextRequest {
  apiKey: ValidatedApiKey;
}

/**
 * Main middleware function for API key authentication
 */
export async function withApiKey(
  req: NextRequest,
  options: ApiKeyMiddlewareOptions = {}
): Promise<{ authorized: true; apiKey: ValidatedApiKey } | { authorized: false; error: NextResponse }> {
  const startTime = Date.now();

  // Extract API key
  const apiKeySecret = extractApiKey(req);

  if (!apiKeySecret) {
    const response = NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'API key is required. Provide it via Authorization header (Bearer token) or X-API-Key header.',
      },
      { status: 401 }
    );
    return { authorized: false, error: response };
  }

  // Validate API key
  const validatedKey = await validateApiKey(apiKeySecret);

  if (!validatedKey) {
    const responseTime = Date.now() - startTime;

    // Log failed attempt (use prefix from key if available)
    const prefix = apiKeySecret.substring(0, 16);
    await logUsage('00000000-0000-0000-0000-000000000000', prefix, req, 401, responseTime, 'Invalid API key');

    const response = NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Invalid or expired API key.',
      },
      { status: 401 }
    );
    return { authorized: false, error: response };
  }

  // Check IP whitelist (if configured)
  const clientIp = getClientIp(req);
  // Note: IP whitelist check would require fetching full key details
  // For performance, we skip this in the middleware and handle it in the service
  // if (!isIpAllowed(clientIp, validatedKey.ipWhitelist)) {
  //   const responseTime = Date.now() - startTime;
  //   await logUsage(validatedKey.id, validatedKey.prefix, req, 403, responseTime, 'IP not whitelisted');
  //   return NextResponse.json({ error: 'Forbidden', message: 'IP address not allowed' }, { status: 403 });
  // }

  // Check required scopes
  if (options.requiredScopes && options.requiredScopes.length > 0) {
    const hasRequiredScopes = options.requireAllScopes
      ? options.requiredScopes.every((scope) => validatedKey.scopes.includes(scope))
      : options.requiredScopes.some((scope) => validatedKey.scopes.includes(scope));

    if (!hasRequiredScopes) {
      const responseTime = Date.now() - startTime;
      await logUsage(
        validatedKey.id,
        apiKeySecret.substring(0, 16),
        req,
        403,
        responseTime,
        `Missing required scopes: ${options.requiredScopes.join(', ')}`
      );

      const response = NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Insufficient permissions. Required scopes: ' + options.requiredScopes.join(', '),
        },
        { status: 403 }
      );
      return { authorized: false, error: response };
    }
  }

  // Success - log usage (async, don't wait)
  const responseTime = Date.now() - startTime;
  logUsage(validatedKey.id, apiKeySecret.substring(0, 16), req, 200, responseTime).catch((err) =>
    console.error('[API_KEY_MIDDLEWARE] Failed to log success:', err)
  );

  return { authorized: true, apiKey: validatedKey };
}

/**
 * Higher-order function to protect route handlers
 */
export function requireApiKey(
  handler: (req: AuthenticatedRequest, context?: any) => Promise<Response>,
  options: ApiKeyMiddlewareOptions = {}
) {
  return async (req: NextRequest, context?: any) => {
    const result = await withApiKey(req, options);

    if (!result.authorized) {
      return result.error;
    }

    // Attach API key to request
    (req as AuthenticatedRequest).apiKey = result.apiKey;

    return handler(req as AuthenticatedRequest, context);
  };
}

/**
 * Helper to check scope in route handler
 */
export function requireScope(apiKey: ValidatedApiKey, scope: ApiScope): boolean {
  return hasScope(apiKey, scope);
}

/**
 * Helper to check any scope in route handler
 */
export function requireAnyScope(apiKey: ValidatedApiKey, scopes: ApiScope[]): boolean {
  return hasAnyScope(apiKey, scopes);
}

/**
 * Rate limiting check (simple in-memory implementation)
 * For production, use Redis or similar
 */
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(apiKeyId: string, limit: number): { allowed: boolean; resetAt: number } {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour

  const cached = rateLimitCache.get(apiKeyId);

  if (!cached || cached.resetAt < now) {
    // New window
    rateLimitCache.set(apiKeyId, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, resetAt: now + windowMs };
  }

  if (cached.count >= limit) {
    return { allowed: false, resetAt: cached.resetAt };
  }

  cached.count++;
  return { allowed: true, resetAt: cached.resetAt };
}

/**
 * Middleware with rate limiting
 */
export async function withApiKeyAndRateLimit(
  req: NextRequest,
  options: ApiKeyMiddlewareOptions = {}
): Promise<{ authorized: true; apiKey: ValidatedApiKey } | { authorized: false; error: NextResponse }> {
  const result = await withApiKey(req, options);

  if (!result.authorized) {
    return result;
  }

  // Check rate limit
  const rateLimit = checkRateLimit(result.apiKey.id, result.apiKey.rateLimit);

  if (!rateLimit.allowed) {
    const resetDate = new Date(rateLimit.resetAt);

    const response = NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Try again later.',
        resetAt: resetDate.toISOString(),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': result.apiKey.rateLimit.toString(),
          'X-RateLimit-Reset': resetDate.toISOString(),
        },
      }
    );

    // Log rate limit hit
    await logUsage(
      result.apiKey.id,
      req.headers.get('authorization')?.substring(7, 23) || '',
      req,
      429,
      0,
      'Rate limit exceeded'
    );

    return { authorized: false, error: response };
  }

  return result;
}

/**
 * Cleanup rate limit cache (call periodically)
 */
export function cleanupRateLimitCache(): void {
  const now = Date.now();
  for (const [key, value] of Array.from(rateLimitCache.entries())) {
    if (value.resetAt < now) {
      rateLimitCache.delete(key);
    }
  }
}

// Cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitCache, 10 * 60 * 1000);
}
