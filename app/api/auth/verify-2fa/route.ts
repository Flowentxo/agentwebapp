/**
 * POST /api/auth/verify-2fa
 * Verifies the TOTP code and completes the login flow for users with 2FA enabled
 */

import { NextResponse, type NextRequest } from 'next/server';
export const runtime = 'nodejs';

import { z } from 'zod';
import { errorMessage, type ApiResponse, type AuthErrorCode } from '@/lib/auth/errors';
import { findUserByEmail, getUserRoles } from '@/lib/auth/user';
import { createSession } from '@/lib/auth/session';
import { parseUserAgent } from '@/lib/auth/device';
import { newRequestId, logAuth } from '@/lib/auth/logger';
import { checkAndNotifyNewDevice } from '@/lib/auth/security';
import { logActivityAsync } from '@/lib/auth/audit';
import { consumeMfaPendingWithDebug } from '@/lib/auth/mfa-pending';
import { verifyTotpCode } from '@/lib/profile/service';
import { generateCsrfToken } from '@/lib/auth/crypto';
import {
  takeLoginRateLimit,
  registerFailedLogin,
  isLockedOut,
  clearFailures,
  RATE_LIMIT_CONFIG,
} from '@/lib/auth/rateLimitHybrid';

const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || 'sintra.sid';
const SESSION_TTL_DAYS = Number(process.env.AUTH_SESSION_TTL_DAYS || '7');

const BodySchema = z.object({
  pendingToken: z.string().min(1),
  code: z.string().min(6).max(8), // TOTP or backup code
});

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return '0.0.0.0';
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

  try {
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      const res = NextResponse.json<ApiResponse<LoginData>>(
        {
          ok: false,
          error: {
            code: 'AUTH_INVALID_CREDENTIALS' as AuthErrorCode,
            message: 'Invalid request body',
          },
        } as ApiResponse<LoginData>,
        { status: 400 }
      );
      res.headers.set('x-request-id', reqId);
      res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
      return res;
    }

    const { pendingToken, code } = parsed.data;
    const ip = clientIp(req);
    const ua = req.headers.get('user-agent') || 'unknown';

    // Retrieve pending MFA data
    const { data: pendingData, debug: mfaDebug } = await consumeMfaPendingWithDebug(pendingToken);

    if (!pendingData) {
      logAuth('mfa_verify_invalid_token', { reqId, ip });
      const res = NextResponse.json<ApiResponse<LoginData>>(
        {
          ok: false,
          error: {
            code: 'AUTH_INVALID_CREDENTIALS' as AuthErrorCode,
            message: 'Session expired. Please log in again.',
          },
        } as ApiResponse<LoginData>,
        { status: 401 }
      );
      res.headers.set('x-request-id', reqId);
      res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
      return res;
    }

    // Rate limiting for 2FA verification
    const lockoutCheck = await isLockedOut({ email: pendingData.email, ip });
    if (lockoutCheck.locked) {
      logAuth('mfa_verify_locked_out', { reqId, email: pendingData.email, ip, remainingSec: lockoutCheck.remainingSec });
      const res = NextResponse.json<ApiResponse<LoginData>>(
        {
          ok: false,
          error: {
            code: 'AUTH_LOCKED' as AuthErrorCode,
            message: errorMessage('AUTH_LOCKED'),
          },
        } as ApiResponse<LoginData>,
        { status: 423 }
      );
      res.headers.set('Retry-After', String(lockoutCheck.remainingSec ?? RATE_LIMIT_CONFIG.LOCKOUT_DURATION_SECONDS));
      res.headers.set('x-request-id', reqId);
      res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
      return res;
    }

    const rl = await takeLoginRateLimit({ email: pendingData.email, ip });
    if (!rl.allowed) {
      logAuth('mfa_verify_rate_limited', { reqId, email: pendingData.email, ip, retryAfterSec: rl.retryAfterSec });
      const res = NextResponse.json<ApiResponse<LoginData>>(
        {
          ok: false,
          error: {
            code: 'AUTH_RATE_LIMITED' as AuthErrorCode,
            message: errorMessage('AUTH_RATE_LIMITED'),
          },
        } as ApiResponse<LoginData>,
        { status: 429 }
      );
      res.headers.set('Retry-After', String(rl.retryAfterSec ?? RATE_LIMIT_CONFIG.LOGIN_WINDOW_SECONDS));
      res.headers.set('x-request-id', reqId);
      res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
      return res;
    }

    // Verify the TOTP code using the profile service (uses encrypted secrets from users table)
    let isValid = false;
    try {
      isValid = await verifyTotpCode(pendingData.userId, code);
      logAuth('mfa_verify_result', { reqId, userId: pendingData.userId, isValid });
    } catch (verifyError: unknown) {
      const errMsg = verifyError instanceof Error ? verifyError.message : String(verifyError);
      console.error('[AUTH:VERIFY_2FA] TOTP verification error:', errMsg);
      logAuth('mfa_verify_error_inner', { reqId, userId: pendingData.userId, error: errMsg });

      const res = NextResponse.json<ApiResponse<LoginData>>(
        {
          ok: false,
          error: {
            code: 'AUTH_INTERNAL' as AuthErrorCode,
            message: 'Verification error. Please try again.',
            ...(process.env.NODE_ENV === 'development' && { details: errMsg }),
          },
        } as ApiResponse<LoginData>,
        { status: 500 }
      );
      res.headers.set('x-request-id', reqId);
      res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
      return res;
    }

    if (!isValid) {
      await registerFailedLogin({ email: pendingData.email, ip });

      logAuth('mfa_verify_failed', { reqId, userId: pendingData.userId, ip });

      // Audit: Failed MFA verification
      logActivityAsync({
        userId: pendingData.userId,
        action: 'MFA_VERIFY_FAILED',
        ip,
        userAgent: ua,
        metadata: { reason: 'invalid_code' },
      });

      const res = NextResponse.json<ApiResponse<LoginData>>(
        {
          ok: false,
          error: {
            code: 'AUTH_INVALID_CREDENTIALS' as AuthErrorCode,
            message: 'Invalid verification code. Please try again.',
          },
        } as ApiResponse<LoginData>,
        { status: 401 }
      );
      res.headers.set('x-request-id', reqId);
      res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
      return res;
    }

    // 2FA verification successful!
    await clearFailures({ email: pendingData.email, ip });

    // Fetch fresh user data
    const user = await findUserByEmail(pendingData.email);
    if (!user) {
      logAuth('mfa_verify_user_not_found', { reqId, email: pendingData.email, ip });
      const res = NextResponse.json<ApiResponse<LoginData>>(
        {
          ok: false,
          error: {
            code: 'AUTH_INTERNAL' as AuthErrorCode,
            message: 'An unexpected error occurred.',
          },
        } as ApiResponse<LoginData>,
        { status: 500 }
      );
      res.headers.set('x-request-id', reqId);
      res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
      return res;
    }

    // Create session with device intelligence
    const deviceInfo = parseUserAgent(ua);
    const ttl = pendingData.remember ? SESSION_TTL_DAYS * 2 : SESSION_TTL_DAYS;

    const { token, expiresAt, sessionId } = await createSession({
      userId: user.id,
      userAgent: ua,
      ip,
      deviceInfo,
    });

    logAuth('mfa_verify_success', {
      reqId,
      userId: user.id,
      ip,
      device: {
        browser: deviceInfo.browser?.name,
        os: deviceInfo.os?.name,
        type: deviceInfo.device?.type,
        isBot: deviceInfo.isBot,
      },
    });

    // New device detection (fire-and-forget)
    checkAndNotifyNewDevice({
      userId: user.id,
      userEmail: user.email,
      userAgent: ua,
      ipAddress: ip,
      deviceInfo,
    }).catch((err) => {
      console.error('[SECURITY] Device check failed:', err);
      logAuth('device_check_failed', { reqId, userId: user.id, error: err instanceof Error ? err.message : String(err) });
    });

    // Audit: Successful login with 2FA
    logActivityAsync({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'SESSION',
      entityId: sessionId,
      ip,
      userAgent: ua,
      metadata: {
        browser: deviceInfo.browser?.name,
        os: deviceInfo.os?.name,
        deviceType: deviceInfo.device?.type,
        mfaUsed: true,
      },
    });

    const roles = await getUserRoles(user.id);

    const isSecure = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'development';
    const cookieMaxAge = ttl * 24 * 60 * 60;

    // Session cookie
    const sessionCookie = {
      name: AUTH_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: isSecure,
      path: '/',
      maxAge: cookieMaxAge,
    };

    // Email verification status cookie
    const emailVerifiedCookie = {
      name: 'sintra_email_verified',
      value: user.emailVerifiedAt ? 'true' : 'false',
      httpOnly: false,
      sameSite: 'lax' as const,
      secure: isSecure,
      path: '/',
      maxAge: cookieMaxAge,
    };

    // CSRF token cookie for double-submit pattern
    const csrfToken = generateCsrfToken();
    const csrfCookie = {
      name: 'sintra.csrf',
      value: csrfToken,
      httpOnly: false, // Must be readable by JavaScript for double-submit
      sameSite: 'lax' as const,
      secure: isSecure,
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    };

    // >>> SERVER SENDING TOKEN: Final verification before response
    console.log('>>> SERVER SENDING TOKEN:', {
      route: '/api/auth/verify-2fa',
      tokenPresent: !!token,
      tokenLength: token?.length ?? 0,
      tokenPrefix: token?.substring(0, 15) ?? 'NULL',
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    const res = NextResponse.json({
      ok: true,
      // Include accessToken in response for localStorage storage (CRITICAL for frontend)
      accessToken: token,
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName ?? '',
          roles,
          emailVerified: Boolean(user.emailVerifiedAt),
        },
        session: { id: token, expiresAt },
        accessToken: token, // Also in data for consistency
        next: pendingData.next,
      },
    } satisfies ApiResponse<LoginData>);

    res.cookies.set(sessionCookie);
    res.cookies.set(emailVerifiedCookie);
    res.cookies.set(csrfCookie);
    res.headers.set('x-request-id', reqId);
    res.headers.set('Cache-Control', 'no-store, private, must-revalidate');

    logAuth('login_success_with_mfa', { reqId, userId: user.id, ip });
    return res;
  } catch (err) {
    const errMsg = (err as Error)?.message ?? String(err);
    console.error('[AUTH:VERIFY_2FA] Unhandled error:', errMsg);
    logAuth('mfa_verify_error', { reqId, err: errMsg });

    const res = NextResponse.json<ApiResponse<LoginData>>(
      {
        ok: false,
        error: {
          code: 'AUTH_INTERNAL' as AuthErrorCode,
          message: errorMessage('AUTH_INTERNAL'),
          ...(process.env.NODE_ENV === 'development' && { details: errMsg }),
        },
      } as ApiResponse<LoginData>,
      { status: 500 }
    );
    res.headers.set('x-request-id', reqId);
    res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
    return res;
  }
}
