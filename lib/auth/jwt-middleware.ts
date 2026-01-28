/**
 * JWT Authentication Middleware
 * Comprehensive authentication and authorization system for Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from './session';
import { SessionData } from './types';
import { principalFromRequest, type Principal, type Scope } from './store';
import { AuthErrorCode } from './types';

// =====================================================
// Authentication Middleware Options
// =====================================================

export interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  requireEmailVerified?: boolean;
  requiredRoles?: string[];
  requiredScopes?: Scope[];
  allowAnonymous?: boolean;
  logAuthAttempts?: boolean;
}

// =====================================================
// Authentication Middleware
// =====================================================

/**
 * Main authentication middleware for Next.js API routes
 * @param req - NextRequest object
 * @param options - Authentication options
 * @returns Authenticated principal and session data
 */
export async function authenticateRequest(
  req: NextRequest,
  options: AuthMiddlewareOptions = {}
): Promise<{ principal: Principal; session: SessionData | null; userId: string }> {
  const {
    requireAuth = true,
    requireEmailVerified = false,
    requiredRoles = [],
    requiredScopes = [],
    allowAnonymous = false,
    logAuthAttempts = true,
  } = options;

  // Get principal from request (cookie, bearer token, or anonymous)
  const principal = principalFromRequest(req);

  // Log authentication attempt
  if (logAuthAttempts) {
    console.log(`[AUTH] ${req.method} ${req.nextUrl.pathname} - Principal: ${principal.type}`, {
      userId: principal.id,
      scopes: principal.scopes,
      hasUser: !!principal.user,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle anonymous access
  if (principal.type === 'anonymous') {
    if (allowAnonymous) {
      return {
        principal,
        session: null,
        userId: 'anonymous',
      };
    }

    if (requireAuth) {
      throw createAuthError('Authentication required', AuthErrorCode.UNAUTHORIZED, 401);
    }
    return {
      principal,
      session: null,
      userId: 'anonymous',
    };
  }

  // For authenticated users, validate session
  let session: SessionData | null = null;
  try {
    session = await requireSession({
      requireEmailVerified,
    });
  } catch (error: any) {
    console.error('[AUTH] Session validation failed:', error);
    throw createAuthError('Session validation failed', AuthErrorCode.SESSION_INVALID, 401);
  }

  const userId = session.user.id;

  // Validate roles
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => 
      session!.user.roles.includes(role as any)
    );
    
    if (!hasRequiredRole) {
      throw createAuthError(
        `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`,
        AuthErrorCode.FORBIDDEN,
        403
      );
    }
  }

  // Validate scopes
  if (requiredScopes.length > 0) {
    const hasRequiredScope = requiredScopes.some(scope => {
      if (principal.scopes.includes('admin:*')) return true;
      return principal.scopes.includes(scope);
    });

    if (!hasRequiredScope) {
      throw createAuthError(
        `Insufficient scope. Required scopes: ${requiredScopes.join(', ')}`,
        AuthErrorCode.FORBIDDEN,
        403
      );
    }
  }

  // Update principal with session data if it was validated from DB
  // (this handles the case where cookie exists but wasn't in in-memory store)
  if (principal.type === 'user' && !principal.user && session?.user) {
    principal.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.displayName || session.user.email,
      roles: session.user.roles as any[],
    };
    principal.id = session.user.id;
  }

  // Additional security checks
  if (principal.type === 'user' && !principal.user) {
    throw createAuthError('Invalid user principal', AuthErrorCode.UNAUTHORIZED, 401);
  }

  return {
    principal,
    session,
    userId,
  };
}

/**
 * Route context type for Next.js App Router
 */
export interface RouteContext {
  params: Record<string, string>;
}

/**
 * Auth context passed to handlers
 */
export interface AuthContext {
  principal: Principal;
  session: SessionData | null;
  userId: string;
}

/**
 * Wrapper function for Next.js API route handlers with automatic authentication
 * Supports both simple handlers and handlers with route params
 */
export function withAuth<T extends RouteContext = RouteContext>(
  handler: (req: NextRequest, context: T, auth: AuthContext) => Promise<NextResponse | Response>,
  options: AuthMiddlewareOptions = {}
) {
  return async (req: NextRequest, context: T): Promise<NextResponse | Response> => {
    try {
      const auth = await authenticateRequest(req, options);
      return await handler(req, context, auth);
    } catch (error: any) {
      const status = error.status || 401;
      const code = error.code || AuthErrorCode.UNAUTHORIZED;
      const message = error.message || 'Authentication failed';

      console.error(`[AUTH ERROR] ${req.method} ${req.nextUrl.pathname}:`, {
        error: message,
        code,
        status,
        userAgent: req.headers.get('user-agent'),
        ip: getClientIP(req),
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          ok: false,
          error: {
            code,
            message,
            timestamp: new Date().toISOString(),
          },
        },
        { status }
      );
    }
  };
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Create standardized authentication error
 */
function createAuthError(message: string, code: AuthErrorCode, status: number): Error {
  const error = new Error(message) as Error & { code: AuthErrorCode; status: number };
  error.code = code;
  error.status = status;
  return error;
}

/**
 * Extract client IP from request
 */
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  return req.ip || 'unknown';
}

// Default workspace UUID (matches the one created in the database)
const DEFAULT_WORKSPACE_UUID = '00000000-0000-0000-0000-000000000001';

/**
 * Extract workspace ID from request headers
 */
export function getWorkspaceId(req: NextRequest): string | null {
  const workspaceId = req.headers.get('x-workspace-id');
  // Convert "default" to actual UUID
  if (workspaceId === 'default' || workspaceId === 'default-workspace') {
    return DEFAULT_WORKSPACE_UUID;
  }
  return workspaceId;
}

/**
 * Require workspace ID from request
 * Returns the default workspace UUID if no workspace ID is provided
 */
export function requireWorkspaceId(req: NextRequest): string {
  const workspaceId = getWorkspaceId(req);
  // If no workspace ID is provided, use the default workspace
  if (!workspaceId) {
    return DEFAULT_WORKSPACE_UUID;
  }
  return workspaceId;
}

// =====================================================
// Predefined Authentication Configurations
// =====================================================

export const AuthConfigs = {
  // Public endpoints (no authentication required)
  public: {
    requireAuth: false,
    allowAnonymous: true,
  } as AuthMiddlewareOptions,

  // User authentication required
  user: {
    requireAuth: true,
  } as AuthMiddlewareOptions,

  // Email verified user required
  verified: {
    requireAuth: true,
    requireEmailVerified: true,
  } as AuthMiddlewareOptions,

  // Admin role required
  admin: {
    requireAuth: true,
    requiredRoles: ['admin'],
  } as AuthMiddlewareOptions,

  // Agent access (user must be authenticated)
  agent: {
    requireAuth: true,
    requiredScopes: ['agents:run'],
  } as AuthMiddlewareOptions,

  // Brain AI access
  brain: {
    requireAuth: true,
    requiredScopes: ['knowledge:read'],
  } as AuthMiddlewareOptions,

  // Learning system access
  learning: {
    requireAuth: true,
  } as AuthMiddlewareOptions,

  // Collaboration access
  collaboration: {
    requireAuth: true,
    requiredScopes: ['integrations:invoke'],
  } as AuthMiddlewareOptions,
};