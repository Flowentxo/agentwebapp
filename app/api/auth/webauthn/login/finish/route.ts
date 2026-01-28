/**
 * POST /api/auth/webauthn/login/finish
 * Complete passkey authentication - verifies response and creates session
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { type ApiResponse } from '@/lib/auth/types';
import { finishAuthentication } from '@/lib/auth/webauthn';
import { createSession } from '@/lib/auth/session';
import { getUserRoles } from '@/lib/auth/user';
import { getDb } from '@/lib/db/connection';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { parseUserAgent } from '@/lib/auth/device';
import { checkAndNotifyNewDevice } from '@/lib/auth/security';
import { logAuth } from '@/lib/auth/logger';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';

export const runtime = 'nodejs';

const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || 'sintra.sid';
const SESSION_TTL_DAYS = Number(process.env.AUTH_SESSION_TTL_DAYS || '7');

// Request body schema
const bodySchema = z.object({
  challengeId: z.string().uuid('Invalid challenge ID'),
  response: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      clientDataJSON: z.string(),
      authenticatorData: z.string(),
      signature: z.string(),
      userHandle: z.string().optional(),
    }),
    authenticatorAttachment: z.string().optional(),
    clientExtensionResults: z.record(z.unknown()),
    type: z.literal('public-key'),
  }),
});

type LoginData = {
  user: {
    id: string;
    email: string;
    displayName: string;
    roles: string[];
    emailVerified: boolean;
  };
  session: {
    id: string;
    expiresAt: Date;
  };
};

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<LoginData>>> {
  try {
    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const parseResult = bodySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { challengeId, response } = parseResult.data;

    // Get request context
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '0.0.0.0';
    const ua = request.headers.get('user-agent') || 'unknown';

    // Verify authentication
    const authResult = await finishAuthentication(
      challengeId,
      response as AuthenticationResponseJSON,
      { ip, userAgent: ua }
    );

    // Get user details
    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, authResult.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'AUTH_INTERNAL',
            message: 'User not found',
          },
        },
        { status: 500 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'AUTH_USER_INACTIVE',
            message: 'Your account is deactivated. Please contact support.',
          },
        },
        { status: 403 }
      );
    }

    // Create session
    const deviceInfo = parseUserAgent(ua);
    const { token, expiresAt, sessionId } = await createSession({
      userId: user.id,
      userAgent: ua,
      ip,
      deviceInfo,
    });

    // Log session creation
    logAuth('session_created', {
      userId: user.id,
      ip,
      authMethod: 'passkey',
      passkeyId: authResult.passkeyId,
      device: {
        browser: deviceInfo.browser?.name,
        os: deviceInfo.os?.name,
        type: deviceInfo.device?.type,
      },
    });

    // Check for new device (fire-and-forget)
    checkAndNotifyNewDevice({
      userId: user.id,
      userEmail: user.email,
      userAgent: ua,
      ipAddress: ip,
      deviceInfo,
    }).catch((err) => {
      console.error('[SECURITY] Device check failed:', err);
    });

    // Get user roles
    const roles = await getUserRoles(user.id);

    // Create response with session cookie
    const isSecure = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'development';
    const cookieMaxAge = SESSION_TTL_DAYS * 24 * 60 * 60;

    const res = NextResponse.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName ?? '',
          roles,
          emailVerified: Boolean(user.emailVerifiedAt),
        },
        session: {
          id: sessionId,
          expiresAt,
        },
      },
    } satisfies ApiResponse<LoginData>);

    // Set session cookie
    res.cookies.set({
      name: AUTH_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecure,
      path: '/',
      maxAge: cookieMaxAge,
    });

    // Set email verification cookie
    res.cookies.set({
      name: 'sintra_email_verified',
      value: user.emailVerifiedAt ? 'true' : 'false',
      httpOnly: false,
      sameSite: 'lax',
      secure: isSecure,
      path: '/',
      maxAge: cookieMaxAge,
    });

    res.headers.set('Cache-Control', 'no-store, private, must-revalidate');

    return res;
  } catch (error) {
    console.error('[WebAuthn] Authentication finish error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'AUTH_PASSKEY_FAILED',
          message: error instanceof Error ? error.message : 'Passkey authentication failed',
        },
      },
      { status: 401 }
    );
  }
}
