/**
 * SINTRA Auth System - Session Management
 * Secure session creation, validation, and revocation
 *
 * IMPORTANT: This module generates JWT tokens (not random tokens)
 * to ensure compatibility with the Express backend middleware.
 */

import { eq, and, lt, gt, isNull } from 'drizzle-orm';
import { getDb } from '../db/connection';
import { sessions, type SessionDeviceInfo } from '../db/schema';
import { hashToken, randomToken } from './crypto';
import { getUserWithRoles } from './user';
import { getSessionToken } from './cookies';
import { parseUserAgent, extractClientIp } from './device';
import type { SessionData } from './types';
import { AuthErrorCode } from './types';
import jwt from 'jsonwebtoken';

// =====================================================
// Configuration
// =====================================================

const SESSION_TTL_DAYS = parseInt(process.env.AUTH_SESSION_TTL_DAYS || '7', 10);
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

// CRITICAL: Must match the secret in server/middleware/auth.ts and server/utils/jwt.ts
const JWT_SECRET = process.env.JWT_SECRET || '3pPhKpcuAuPPWU1YoUDrRfYt42DyLzApfQgvbawOcdHChrTUn87EYyZLcBFyltp0sVkAuk39vWar0TN2lSxlHw';

/**
 * Generate a JWT token for session authentication
 * This replaces random token generation to ensure backend compatibility
 */
function generateSessionJWT(
  userId: string,
  sessionId: string,
  email: string,
  role: string,
  expiresAt: Date
): string {
  const payload = {
    userId,
    id: userId, // Alias for backward compatibility
    sub: userId, // Standard JWT subject claim
    sessionId,
    email,
    role: role || 'user',
    type: 'access',
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  });

  // DEBUG: Verify token structure
  const isValidJWT = token.split('.').length === 3;
  console.log('>>> JWT GENERATION:', {
    userId,
    sessionId,
    tokenLength: token.length,
    isValidJWT,
    tokenPrefix: token.substring(0, 30),
    expiresAt: expiresAt.toISOString(),
  });

  if (!isValidJWT) {
    console.error('>>> CRITICAL: Generated token is NOT a valid JWT!');
  }

  return token;
}

// =====================================================
// Session Creation
// =====================================================

export interface CreateSessionParams {
  userId: string;
  userAgent?: string;
  ip?: string;
  /** Pre-parsed device info (if available, skips parsing) */
  deviceInfo?: SessionDeviceInfo;
}

export interface CreateSessionResult {
  sessionId: string;
  token: string;
  expiresAt: Date;
}

/**
 * Create a new session for a user
 * @param params - Session creation parameters
 * @returns Session ID, JWT token, and expiry
 */
export async function createSession(params: CreateSessionParams): Promise<CreateSessionResult> {
  const db = getDb();

  // Calculate expiry
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  // Parse device info from User-Agent if not provided
  const deviceInfo = params.deviceInfo || parseUserAgent(params.userAgent);

  // Get user info for JWT payload (email and role)
  const user = await getUserWithRoles(params.userId);
  const email = user?.email || '';
  const role = user?.roles?.[0] || 'user';

  // Generate a random session ID for DB storage
  const sessionIdForDb = randomToken(16);
  const sessionIdHash = hashToken(sessionIdForDb);

  // Insert session with device intelligence
  const result = await db
    .insert(sessions)
    .values({
      userId: params.userId,
      tokenHash: sessionIdHash, // Store hash of session ID for lookup
      userAgent: params.userAgent || null,
      ip: params.ip || null,
      deviceInfo,
      lastActiveAt: new Date(),
      expiresAt,
    })
    .returning();

  const sessionId = result[0].id;

  // Generate JWT token with user info embedded
  // This is the token sent to the client and stored in localStorage
  const token = generateSessionJWT(params.userId, sessionId, email, role, expiresAt);

  return {
    sessionId,
    token,
    expiresAt,
  };
}

// =====================================================
// Session Validation
// =====================================================

/**
 * Get session by token (supports both JWT and legacy random tokens)
 * @param token - JWT token or legacy session token
 * @returns Session record or null if not found/expired/revoked
 */
export async function getSessionByToken(token: string) {
  const db = getDb();
  const now = new Date();

  // Check if token is a JWT (has 3 parts separated by dots)
  const isJWT = token.split('.').length === 3;

  if (isJWT) {
    try {
      // Verify and decode the JWT
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        sessionId: string;
        email?: string;
        role?: string;
      };

      // Look up session by session ID from JWT
      const result = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.id, decoded.sessionId),
            isNull(sessions.revokedAt),
            gt(sessions.expiresAt, now)
          )
        )
        .limit(1);

      return result[0] || null;
    } catch (jwtError) {
      console.warn('[SESSION] JWT verification failed:', (jwtError as Error).message);
      return null;
    }
  }

  // Legacy: hash-based lookup for non-JWT tokens
  const tokenHash = hashToken(token);

  const result = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now)
      )
    )
    .limit(1);

  return result[0] || null;
}

/**
 * Get current session from cookies
 * @returns Session record or null
 */
export async function getCurrentSession() {
  const token = await getSessionToken();
  if (!token) return null;

  return getSessionByToken(token);
}

/**
 * Validate session and get user data
 * @param token - Plain session token
 * @returns Session data with user info or null if invalid
 */
export async function validateSession(token: string): Promise<SessionData | null> {
  const session = await getSessionByToken(token);
  if (!session) return null;

  const user = await getUserWithRoles(session.userId);
  if (!user || !user.isActive) return null;

  return {
    sessionId: session.id,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles,
      emailVerified: user.emailVerified,
    },
  };
}

/**
 * Get current session data from cookies
 * @returns Session data or null if invalid
 */
export async function getSession(): Promise<SessionData | null> {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }

  return validateSession(token);
}

// =====================================================
// Session Revocation
// =====================================================

/**
 * Revoke a session by ID
 * @param sessionId - Session ID to revoke
 */
export async function revokeSession(sessionId: string): Promise<void> {
  const db = getDb();

  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}

/**
 * Revoke a session by token (supports both JWT and legacy tokens)
 * @param token - JWT token or legacy session token
 */
export async function revokeSessionByToken(token: string): Promise<void> {
  const db = getDb();

  // Check if token is a JWT
  const isJWT = token.split('.').length === 3;

  if (isJWT) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { sessionId: string };
      await db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(eq(sessions.id, decoded.sessionId));
      return;
    } catch {
      // If JWT verification fails, try legacy method
    }
  }

  // Legacy: hash-based lookup
  const tokenHash = hashToken(token);
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.tokenHash, tokenHash));
}

/**
 * Revoke all sessions for a user
 * @param userId - User ID
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  const db = getDb();

  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.userId, userId));
}

/**
 * Revoke current session from cookies
 */
export async function revokeCurrentSession(): Promise<void> {
  const token = await getSessionToken();
  if (token) {
    await revokeSessionByToken(token);
  }
}

// =====================================================
// Session Activity Tracking
// =====================================================

/**
 * Update session's last active timestamp
 * Call this on protected route access to track activity
 * @param sessionId - Session ID to update
 */
export async function updateSessionLastActive(sessionId: string): Promise<void> {
  const db = getDb();

  await db
    .update(sessions)
    .set({ lastActiveAt: new Date() })
    .where(eq(sessions.id, sessionId));
}

/**
 * Update session's last active timestamp by token (supports both JWT and legacy tokens)
 * @param token - JWT token or legacy session token
 */
export async function updateSessionLastActiveByToken(token: string): Promise<void> {
  const db = getDb();

  // Check if token is a JWT
  const isJWT = token.split('.').length === 3;

  if (isJWT) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { sessionId: string };
      await db
        .update(sessions)
        .set({ lastActiveAt: new Date() })
        .where(eq(sessions.id, decoded.sessionId));
      return;
    } catch {
      // If JWT verification fails, try legacy method
    }
  }

  // Legacy: hash-based lookup
  const tokenHash = hashToken(token);
  await db
    .update(sessions)
    .set({ lastActiveAt: new Date() })
    .where(eq(sessions.tokenHash, tokenHash));
}

// =====================================================
// Session Rotation
// =====================================================

/**
 * Rotate session token (re-issue new token, revoke old one)
 * Used for security-sensitive operations
 * @param oldToken - Current session token
 * @param params - Session metadata
 * @returns New session token and expiry
 */
export async function rotateSession(
  oldToken: string,
  params?: { userAgent?: string; ip?: string; deviceInfo?: SessionDeviceInfo }
): Promise<CreateSessionResult | null> {
  const session = await getSessionByToken(oldToken);
  if (!session) return null;

  // Revoke old session
  await revokeSession(session.id);

  // Create new session with preserved or updated device info
  return createSession({
    userId: session.userId,
    userAgent: params?.userAgent || session.userAgent || undefined,
    ip: params?.ip || session.ip || undefined,
    deviceInfo: params?.deviceInfo || (session.deviceInfo as SessionDeviceInfo) || undefined,
  });
}

// =====================================================
// Session Cleanup
// =====================================================

/**
 * Delete expired sessions (for periodic cleanup)
 * @returns Number of sessions deleted
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const db = getDb();

  const result = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .returning();

  return result.length;
}

/**
 * Delete old revoked sessions (older than 7 days)
 * @returns Number of sessions deleted
 */
export async function cleanupRevokedSessions(): Promise<number> {
  const db = getDb();

  const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const result = await db
    .delete(sessions)
    .where(and(lt(sessions.revokedAt, cutoffDate), eq(sessions.revokedAt, sessions.revokedAt)))
    .returning();

  return result.length;
}

// =====================================================
// Session Requirement Middleware
// =====================================================

export interface RequireSessionOptions {
  requireEmailVerified?: boolean;
  requireRoles?: string[];
}

/**
 * Require valid session (for use in API routes)
 * @param options - Validation options
 * @returns Session data
 * @throws Error with auth error code if session invalid
 */
export async function requireSession(
  options: RequireSessionOptions = {}
): Promise<SessionData> {
  const sessionData = await getSession();

  if (!sessionData) {
    const error = new Error('Unauthorized: Session invalid or expired');
    (error as any).code = AuthErrorCode.SESSION_INVALID;
    throw error;
  }

  if (options.requireEmailVerified && !sessionData.user.emailVerified) {
    const error = new Error('Email verification required');
    (error as any).code = AuthErrorCode.UNVERIFIED_EMAIL;
    throw error;
  }

  if (options.requireRoles && options.requireRoles.length > 0) {
    const hasRole = options.requireRoles.some((role) =>
      sessionData.user.roles.includes(role as any)
    );
    if (!hasRole) {
      const error = new Error('Forbidden: Insufficient permissions');
      (error as any).code = AuthErrorCode.FORBIDDEN;
      throw error;
    }
  }

  return sessionData;
}

// =====================================================
// Session Info Queries
// =====================================================

/**
 * Get all active sessions for a user
 * @param userId - User ID
 * @returns Array of session records
 */
export async function getUserActiveSessions(userId: string) {
  const db = getDb();

  const now = new Date();

  return db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now)
      )
    )
    .orderBy(sessions.createdAt);
}

/**
 * Get session count for a user
 * @param userId - User ID
 * @returns Number of active sessions
 */
export async function getUserActiveSessionCount(userId: string): Promise<number> {
  const sessions = await getUserActiveSessions(userId);
  return sessions.length;
}

// =====================================================
// Helper for API Routes (Next.js)
// =====================================================

/**
 * Get session user from NextRequest
 * Convenience wrapper for API routes
 * @param req - NextRequest object
 * @returns User data or null
 */
export async function getSessionUser(req: Request) {
  const sessionData = await getSession();
  return sessionData ? sessionData.user : null;
}

/**
 * Get session from a request object
 * Returns { userId, email, ... } for convenience
 */
export async function getSessionFromRequest(_req: Request) {
  const sessionData = await getSession();
  if (!sessionData) return null;
  return {
    userId: sessionData.user.id,
    email: sessionData.user.email,
    displayName: sessionData.user.displayName,
    sessionId: sessionData.sessionId,
  };
}
