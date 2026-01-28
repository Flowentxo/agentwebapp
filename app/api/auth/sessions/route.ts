/**
 * GET/DELETE /api/auth/sessions
 * Manage user sessions - list all active sessions and revoke specific ones
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthErrorCode, type ApiResponse } from '@/lib/auth/types';
import { getSession, getUserActiveSessions, revokeSession } from '@/lib/auth/session';
import { getSessionToken } from '@/lib/auth/cookies';
import { hashToken } from '@/lib/auth/crypto';
import { getDeviceDescription, getDeviceIcon } from '@/lib/auth/device';
import type { SessionDeviceInfo } from '@/lib/db/schema';
import { logActivityAsync } from '@/lib/auth/audit';

export const runtime = 'nodejs';

// Response type for session list
export interface SessionListItem {
  id: string;
  deviceDescription: string;
  deviceIcon: string;
  deviceType: string;
  browser: string | null;
  os: string | null;
  ip: string | null;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
  isBot: boolean;
}

export interface SessionsResponse {
  sessions: SessionListItem[];
  currentSessionId: string | null;
}

/**
 * GET /api/auth/sessions
 * Get all active sessions for the current user
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<SessionsResponse>>> {
  try {
    // Verify user is authenticated
    const sessionData = await getSession();
    if (!sessionData) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.UNAUTHORIZED,
            message: 'You must be logged in to view sessions',
          },
        },
        { status: 401 }
      );
    }

    // Get current session token to identify which session is "this device"
    const currentToken = await getSessionToken();
    const currentTokenHash = currentToken ? hashToken(currentToken) : null;

    // Get all active sessions for user
    const activeSessions = await getUserActiveSessions(sessionData.user.id);

    // Transform sessions for client (remove sensitive data)
    const sessions: SessionListItem[] = activeSessions.map((session) => {
      const deviceInfo = (session.deviceInfo as SessionDeviceInfo) || {};
      const isCurrent = session.tokenHash === currentTokenHash;

      return {
        id: session.id,
        deviceDescription: getDeviceDescription(deviceInfo),
        deviceIcon: getDeviceIcon(deviceInfo),
        deviceType: deviceInfo.device?.type || 'desktop',
        browser: deviceInfo.browser?.name || null,
        os: deviceInfo.os?.name || null,
        ip: session.ip,
        createdAt: session.createdAt.toISOString(),
        lastActiveAt: session.lastActiveAt.toISOString(),
        isCurrent,
        isBot: deviceInfo.isBot || false,
      };
    });

    // Sort: current session first, then by lastActiveAt descending
    sessions.sort((a, b) => {
      if (a.isCurrent) return -1;
      if (b.isCurrent) return 1;
      return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
    });

    // Find current session ID
    const currentSession = sessions.find((s) => s.isCurrent);

    return NextResponse.json({
      ok: true,
      data: {
        sessions,
        currentSessionId: currentSession?.id || null,
      },
    });
  } catch (error) {
    console.error('[Auth] Get sessions error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: AuthErrorCode.INTERNAL_ERROR,
          message: 'Failed to retrieve sessions',
        },
      },
      { status: 500 }
    );
  }
}

// Schema for DELETE request
const deleteSessionSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
});

/**
 * DELETE /api/auth/sessions
 * Revoke a specific session
 */
export async function DELETE(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ message: string; revokedSessionId: string }>>> {
  try {
    // Verify user is authenticated
    const sessionData = await getSession();
    if (!sessionData) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.UNAUTHORIZED,
            message: 'You must be logged in to revoke sessions',
          },
        },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const parseResult = deleteSessionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.VALIDATION_ERROR,
            message: 'Invalid session ID',
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { sessionId } = parseResult.data;

    // Verify the session belongs to the current user
    const userSessions = await getUserActiveSessions(sessionData.user.id);
    const targetSession = userSessions.find((s) => s.id === sessionId);

    if (!targetSession) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.SESSION_INVALID,
            message: 'Session not found or already revoked',
          },
        },
        { status: 404 }
      );
    }

    // Check if trying to revoke current session
    const currentToken = await getSessionToken();
    const currentTokenHash = currentToken ? hashToken(currentToken) : null;
    const isCurrentSession = targetSession.tokenHash === currentTokenHash;

    // Revoke the session
    await revokeSession(sessionId);

    // Audit: Session revoked
    const deviceInfo = targetSession.deviceInfo as SessionDeviceInfo;
    logActivityAsync({
      userId: sessionData.user.id,
      action: 'SESSION_REVOKED',
      entityType: 'SESSION',
      entityId: sessionId,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      metadata: {
        revokedSessionIp: targetSession.ip,
        revokedSessionDevice: deviceInfo?.device?.type,
        revokedSessionBrowser: deviceInfo?.browser?.name,
        wasCurrentSession: isCurrentSession,
      },
    });

    // If revoking current session, clear the cookie
    if (isCurrentSession) {
      const response = NextResponse.json({
        ok: true,
        data: {
          message: 'Current session revoked. You have been logged out.',
          revokedSessionId: sessionId,
        },
      });

      // Clear session cookie
      response.cookies.set({
        name: process.env.AUTH_COOKIE_NAME || 'sintra.sid',
        value: '',
        maxAge: 0,
        path: '/',
      });

      // Clear email verification cookie
      response.cookies.set({
        name: 'sintra_email_verified',
        value: '',
        maxAge: 0,
        path: '/',
      });

      return response;
    }

    return NextResponse.json({
      ok: true,
      data: {
        message: 'Session revoked successfully',
        revokedSessionId: sessionId,
      },
    });
  } catch (error) {
    console.error('[Auth] Revoke session error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: AuthErrorCode.INTERNAL_ERROR,
          message: 'Failed to revoke session',
        },
      },
      { status: 500 }
    );
  }
}
