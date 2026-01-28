/**
 * Brain AI Security Middleware
 * Handles authentication, authorization, rate limiting, and audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiKeyService } from './ApiKeyService';
import { rateLimitService } from './RateLimitService';
import { auditService } from './AuditService';
import type { BrainApiKey } from '@/lib/db/schema-brain-security';

export interface SecurityContext {
  apiKey?: BrainApiKey;
  userId?: string;
  agentId?: string;
  ipAddress?: string;
  userAgent?: string;
  authenticated: boolean;
  role?: 'admin' | 'editor' | 'viewer';
  workspaceId?: string;
}

export interface SecurityMiddlewareOptions {
  requireAuth?: boolean;
  requireRole?: 'admin' | 'editor' | 'viewer';
  requireScopes?: string[];
  rateLimitKey?: 'api_key' | 'user' | 'agent' | 'ip';
  customRateLimit?: { limit: number; window: number };
  skipRateLimit?: boolean;
  skipAudit?: boolean;
}

export class SecurityMiddleware {
  private static instance: SecurityMiddleware;

  private constructor() {}

  public static getInstance(): SecurityMiddleware {
    if (!SecurityMiddleware.instance) {
      SecurityMiddleware.instance = new SecurityMiddleware();
    }
    return SecurityMiddleware.instance;
  }

  /**
   * Main middleware function
   * Wraps API route handlers with security checks
   */
  public async withSecurity(
    req: NextRequest,
    options: SecurityMiddlewareOptions = {}
  ): Promise<{ context: SecurityContext; error?: NextResponse }> {
    const {
      requireAuth = true,
      requireRole,
      requireScopes,
      rateLimitKey = 'api_key',
      customRateLimit,
      skipRateLimit = false,
      skipAudit = false,
    } = options;

    // Extract request info
    const ipAddress = this.getIpAddress(req);
    const userAgent = req.headers.get('user-agent') || undefined;
    const endpoint = req.nextUrl.pathname;
    const method = req.method;

    // Initialize context
    const context: SecurityContext = {
      ipAddress,
      userAgent,
      authenticated: false,
    };

    // 1. Authentication
    if (requireAuth) {
      const authResult = await this.authenticate(req);

      if (!authResult.success) {
        return {
          context,
          error: NextResponse.json(
            {
              error: 'Authentication required',
              message: authResult.error,
              code: 'AUTH_REQUIRED',
            },
            { status: 401 }
          ),
        };
      }

      context.apiKey = authResult.apiKey;
      context.userId = authResult.apiKey?.createdBy;
      context.agentId = authResult.apiKey?.agentId || undefined;
      context.role = authResult.apiKey?.role as 'admin' | 'editor' | 'viewer';
      context.workspaceId = authResult.apiKey?.workspaceId;
      context.authenticated = true;
    }

    // 2. Authorization (Role Check)
    if (requireRole && context.apiKey) {
      if (!apiKeyService.hasRoleLevel(context.apiKey, requireRole)) {
        return {
          context,
          error: NextResponse.json(
            {
              error: 'Insufficient permissions',
              message: `This endpoint requires ${requireRole} role or higher`,
              code: 'INSUFFICIENT_ROLE',
              requiredRole: requireRole,
              userRole: context.role,
            },
            { status: 403 }
          ),
        };
      }
    }

    // 3. Scope Check
    if (requireScopes && requireScopes.length > 0 && context.apiKey) {
      const hasAllScopes = requireScopes.every(scope =>
        apiKeyService.hasScope(context.apiKey!, scope)
      );

      if (!hasAllScopes) {
        return {
          context,
          error: NextResponse.json(
            {
              error: 'Insufficient permissions',
              message: 'Missing required scopes',
              code: 'INSUFFICIENT_SCOPES',
              requiredScopes: requireScopes,
              userScopes: context.apiKey.scopes,
            },
            { status: 403 }
          ),
        };
      }
    }

    // 4. Rate Limiting
    if (!skipRateLimit) {
      const rateLimitResult = await this.checkRateLimit(
        context,
        rateLimitKey,
        endpoint,
        method,
        customRateLimit
      );

      if (!rateLimitResult.allowed) {
        // Log blocked request
        if (!skipAudit) {
          await auditService.logAction({
            action: 'rate_limit_exceeded',
            resource: 'api',
            resourceId: endpoint,
            success: false,
            errorMessage: 'Rate limit exceeded',
            endpoint,
            method,
            ...this.getAuditContext(context),
          });
        }

        return {
          context,
          error: NextResponse.json(
            {
              error: 'Rate limit exceeded',
              message: `Too many requests. Please try again in ${rateLimitResult.retryAfter} seconds`,
              code: 'RATE_LIMIT_EXCEEDED',
              limit: rateLimitResult.limit,
              remaining: rateLimitResult.remaining,
              resetAt: rateLimitResult.resetAt,
              retryAfter: rateLimitResult.retryAfter,
            },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': rateLimitResult.limit.toString(),
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
                'Retry-After': (rateLimitResult.retryAfter || 60).toString(),
              },
            }
          ),
        };
      }

      // Add rate limit headers to response (will be added by caller)
      context.rateLimitHeaders = {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
      };
    }

    // Success
    return { context };
  }

  /**
   * Authenticate request
   */
  private async authenticate(req: NextRequest): Promise<{
    success: boolean;
    apiKey?: BrainApiKey;
    error?: string;
  }> {
    // Extract API key from Authorization header
    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
      return {
        success: false,
        error: 'Missing Authorization header',
      };
    }

    // Support both "Bearer <key>" and "ApiKey <key>" formats
    const keyMatch = authHeader.match(/^(?:Bearer|ApiKey)\s+(.+)$/i);

    if (!keyMatch) {
      return {
        success: false,
        error: 'Invalid Authorization header format. Use: Bearer <key> or ApiKey <key>',
      };
    }

    const apiKey = keyMatch[1];

    // Validate API key
    const validation = await apiKeyService.validateApiKey(apiKey);

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || 'Invalid API key',
      };
    }

    return {
      success: true,
      apiKey: validation.key,
    };
  }

  /**
   * Check rate limit
   */
  private async checkRateLimit(
    context: SecurityContext,
    rateLimitKey: 'api_key' | 'user' | 'agent' | 'ip',
    endpoint: string,
    method: string,
    customLimit?: { limit: number; window: number }
  ) {
    // Determine identifier
    let identifier: string;
    let identifierType: 'api_key' | 'user' | 'agent' | 'ip';

    switch (rateLimitKey) {
      case 'api_key':
        identifier = context.apiKey?.id || context.ipAddress || 'unknown';
        identifierType = context.apiKey ? 'api_key' : 'ip';
        break;
      case 'user':
        identifier = context.userId || context.ipAddress || 'unknown';
        identifierType = context.userId ? 'user' : 'ip';
        break;
      case 'agent':
        identifier = context.agentId || context.ipAddress || 'unknown';
        identifierType = context.agentId ? 'agent' : 'ip';
        break;
      case 'ip':
      default:
        identifier = context.ipAddress || 'unknown';
        identifierType = 'ip';
        break;
    }

    // Get rate limit config
    const defaultLimit = rateLimitService.getDefaultLimit(identifierType);
    const limit = customLimit?.limit || context.apiKey?.rateLimit || defaultLimit.limit;
    const window = customLimit?.window || defaultLimit.window;

    // Check rate limit
    return await rateLimitService.checkRateLimit({
      identifier,
      identifierType,
      limit,
      window,
      endpoint,
      method,
    });
  }

  /**
   * Get IP address from request
   */
  private getIpAddress(req: NextRequest): string {
    // Try various headers (for proxies/load balancers)
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    const realIp = req.headers.get('x-real-ip');
    if (realIp) {
      return realIp;
    }

    // Fallback (not reliable in production)
    return 'unknown';
  }

  /**
   * Get audit context from security context
   */
  private getAuditContext(context: SecurityContext) {
    return {
      userId: context.userId,
      agentId: context.agentId,
      apiKeyId: context.apiKey?.id,
      ipAddress: context.ipAddress,
      workspaceId: context.workspaceId,
    };
  }

  /**
   * Add rate limit headers to response
   */
  public addRateLimitHeaders(
    response: NextResponse,
    context: SecurityContext
  ): NextResponse {
    if (context.rateLimitHeaders) {
      Object.entries(context.rateLimitHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
    }
    return response;
  }
}

// Export singleton instance
export const securityMiddleware = SecurityMiddleware.getInstance();

/**
 * Helper function to wrap API route handlers
 */
export function withBrainSecurity(
  handler: (req: NextRequest, context: SecurityContext) => Promise<NextResponse>,
  options: SecurityMiddlewareOptions = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Run security middleware
    const { context, error } = await securityMiddleware.withSecurity(req, options);

    // Return error if security check failed
    if (error) {
      return error;
    }

    try {
      // Call handler with security context
      let response = await handler(req, context);

      // Add rate limit headers
      response = securityMiddleware.addRateLimitHeaders(response, context);

      // Log successful request (if not skipped)
      if (!options.skipAudit) {
        await auditService.logAction({
          action: `${req.method.toLowerCase()}_${req.nextUrl.pathname.split('/').pop()}`,
          resource: 'api',
          resourceId: req.nextUrl.pathname,
          success: true,
          endpoint: req.nextUrl.pathname,
          method: req.method,
          userId: context.userId,
          agentId: context.agentId,
          apiKeyId: context.apiKey?.id,
          ipAddress: context.ipAddress,
          workspaceId: context.workspaceId,
        });
      }

      return response;
    } catch (error) {
      // Log error
      if (!options.skipAudit) {
        await auditService.logAction({
          action: `${req.method.toLowerCase()}_${req.nextUrl.pathname.split('/').pop()}`,
          resource: 'api',
          resourceId: req.nextUrl.pathname,
          success: false,
          errorMessage: (error as Error).message,
          endpoint: req.nextUrl.pathname,
          method: req.method,
          userId: context.userId,
          agentId: context.agentId,
          apiKeyId: context.apiKey?.id,
          ipAddress: context.ipAddress,
          workspaceId: context.workspaceId,
        });
      }

      throw error;
    }
  };
}

// Type augmentation for SecurityContext in handlers
declare global {
  interface SecurityContext {
    rateLimitHeaders?: Record<string, string>;
  }
}
