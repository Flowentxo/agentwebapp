/**
 * POST /api/auth/login/mfa-verify
 * Verify MFA code during login process
 */

import { NextResponse, type NextRequest } from 'next/server';
export const runtime = 'nodejs';

import { z } from 'zod';
import { errorMessage, type ApiResponse, type AuthErrorCode } from '@/lib/auth/errors';
import { findUserById, getUserRoles } from '@/lib/auth/user';
import { createSession } from '@/lib/auth/session';
import { clearFailures } from '@/lib/auth/rateLimitSimple';
import { newRequestId, logAuth } from '@/lib/auth/logger';
import { verifyTotpCode } from '@/lib/profile/service';

const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || 'sintra.sid';
const SESSION_TTL_DAYS = Number(process.env.AUTH_SESSION_TTL_DAYS || '7');

const BodySchema = z.object({
  mfaSessionToken: z.string().min(1),
  code: z.string().length(6),
  remember: z.boolean().optional(),
  next: z.string().optional(),
});

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return '0.0.0.0';
}

function validateNext(next?: string): string {
  if (!next || typeof next !== 'string') {
    return '/dashboard';
  }
  if (!next.startsWith('/')) {
    return '/dashboard';
  }
  if (next.startsWith('/login') || next.startsWith('/register')) {
    return '/dashboard';
  }
  return next;
}

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
  next: string;
};

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<LoginData>>> {
  const reqId = newRequestId();
  const ip = clientIp(req);

  try {
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      const res = NextResponse.json<ApiResponse<LoginData>>(
        {
          ok: false,
          error: {
            code: 'AUTH_INVALID_CREDENTIALS' as AuthErrorCode,
            message: 'Ungültiger Code oder Session',
          },
        } as ApiResponse<LoginData>,
        { status: 400 }
      );
      res.headers.set('x-request-id', reqId);
      res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
      return res;
    }

    const { mfaSessionToken, code, remember, next } = parsed.data;

    // Get MFA session from global store
    const mfaSessions = (global as any).__mfaSessions || {};
    const mfaSession = mfaSessions[mfaSessionToken];

    if (!mfaSession) {
      const res = NextResponse.json<ApiResponse<LoginData>>(
        {
          ok: false,
          error: {
            code: 'AUTH_INVALID_CREDENTIALS' as AuthErrorCode,
            message: 'MFA-Session abgelaufen. Bitte erneut anmelden.',
          },
        } as ApiResponse<LoginData>,
        { status: 401 }
      );
      res.headers.set('x-request-id', reqId);
      res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
      return res;
    }

    // Check if session expired
    if (Date.now() > mfaSession.expiresAt) {
      delete mfaSessions[mfaSessionToken];
      const res = NextResponse.json<ApiResponse<LoginData>>(
        {
          ok: false,
          error: {
            code: 'AUTH_INVALID_CREDENTIALS' as AuthErrorCode,
            message: 'MFA-Session abgelaufen. Bitte erneut anmelden.',
          },
        } as ApiResponse<LoginData>,
        { status: 401 }
      );
      res.headers.set('x-request-id', reqId);
      res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
      return res;
    }

    // Verify TOTP code
    const isValidCode = await verifyTotpCode(mfaSession.userId, code);

    if (!isValidCode) {
      const res = NextResponse.json<ApiResponse<LoginData>>(
        {
          ok: false,
          error: {
            code: 'AUTH_INVALID_CREDENTIALS' as AuthErrorCode,
            message: 'Ungültiger Authentifizierungscode',
          },
        } as ApiResponse<LoginData>,
        { status: 401 }
      );
      res.headers.set('x-request-id', reqId);
      res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
      return res;
    }

    // MFA verified! Clean up session and create real session
    delete mfaSessions[mfaSessionToken];

    // Get user from database
    const user = await findUserById(mfaSession.userId);
    if (!user) {
      const res = NextResponse.json<ApiResponse<LoginData>>(
        {
          ok: false,
          error: {
            code: 'AUTH_INVALID_CREDENTIALS' as AuthErrorCode,
            message: 'Benutzer nicht gefunden',
          },
        } as ApiResponse<LoginData>,
        { status: 401 }
      );
      res.headers.set('x-request-id', reqId);
      res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
      return res;
    }

    // Clear login failures
    await clearFailures({ email: user.email, ip });

    // Create session
    const ua = req.headers.get('user-agent') || 'unknown';
    const ttl = remember ? SESSION_TTL_DAYS * 2 : SESSION_TTL_DAYS;
    const { token, expiresAt } = await createSession({
      userId: user.id,
      userAgent: ua,
      ip,
    });

    const roles = await getUserRoles(user.id);
    const validNext = validateNext(next);

    const cookie = {
      name: AUTH_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'development',
      path: '/',
      maxAge: ttl * 24 * 60 * 60,
    };

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
        session: { id: token, expiresAt },
        next: validNext,
      },
    } satisfies ApiResponse<LoginData>);

    res.cookies.set(cookie);
    res.headers.set('x-request-id', reqId);
    res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
    logAuth('login_success_mfa', { reqId, userId: user.id, ip });

    console.log('[AUTH] MFA login successful for:', user.email);
    return res;
  } catch (err) {
    console.error('[AUTH:MFA_VERIFY] Error:', err);
    const res = NextResponse.json<ApiResponse<LoginData>>(
      {
        ok: false,
        error: {
          code: 'AUTH_INTERNAL' as AuthErrorCode,
          message: errorMessage('AUTH_INTERNAL'),
        },
      } as ApiResponse<LoginData>,
      { status: 500 }
    );
    res.headers.set('x-request-id', reqId);
    res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
    return res;
  }
}
