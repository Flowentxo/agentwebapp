/**
 * POST /api/auth/login
 * Stabilized login with precise error codes and robust handling
 */

import { NextResponse, type NextRequest } from 'next/server';
export const runtime = 'nodejs';

import { z } from 'zod';
import { errorMessage, type ApiResponse, type AuthErrorCode } from '@/lib/auth/errors';
import { findUserByEmail, getUserRoles, updateUserPasswordHash } from '@/lib/auth/user';
import { verifyPassword, needsRehash, hashPassword, getBcryptRounds, generateCsrfToken } from '@/lib/auth/crypto';
import { createSession } from '@/lib/auth/session';
import { parseUserAgent, extractClientIp } from '@/lib/auth/device';
import {
  takeLoginRateLimit,
  registerFailedLogin,
  isLockedOut,
  clearFailures,
  RATE_LIMIT_CONFIG,
} from '@/lib/auth/rateLimitHybrid';
import { newRequestId, logAuth } from '@/lib/auth/logger';
import { checkAndNotifyNewDevice } from '@/lib/auth/security';
import { logActivityAsync } from '@/lib/auth/audit';
import { storeMfaPendingWithDebug, type MfaStoreDebugInfo } from '@/lib/auth/mfa-pending';
import { issueCsrfToken } from '@/lib/auth/csrf';

const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || 'sintra.sid';
const SESSION_TTL_DAYS = Number(process.env.AUTH_SESSION_TTL_DAYS || '7');

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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
  // Only allow internal paths starting with /
  if (!next.startsWith('/')) {
    return '/dashboard';
  }
  // Don't allow redirect back to auth pages
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

type MfaRequiredResponse = {
  mfaRequired: true;
  pendingToken: string;
  next: string;
  // Debug info for troubleshooting MFA token storage
  debug?: MfaStoreDebugInfo;
};

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<LoginData>>> {
  const reqId = newRequestId();

  try {
    // ... existing code ...
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      const res = NextResponse.json<ApiResponse<LoginData>>(
        {
          ok: false,
          error: {
            code: 'AUTH_INVALID_CREDENTIALS' as AuthErrorCode,
            message: errorMessage('AUTH_INVALID_CREDENTIALS'),
          },
        } as ApiResponse<LoginData>,
        { status: 400 }
      );
      res.headers.set('x-request-id', reqId);
      res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
      return res;
    }

    const email = parsed.data.email.trim().toLowerCase();
    const password = parsed.data.password;
    const ip = clientIp(req);

    // =========================================================================
    // RATE LIMITING (Hybrid: Redis with In-Memory Fallback)
    // Protects against brute-force attacks with automatic failover
    // =========================================================================

    // Check for account lockout first (after too many failures)
    const lockoutCheck = await isLockedOut({ email, ip });
    if (lockoutCheck.locked) {
      logAuth('login_locked_out', { reqId, email, ip, remainingSec: lockoutCheck.remainingSec, backend: lockoutCheck.backend });
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

    // Check rate limit (attempts per minute)
    const rl = await takeLoginRateLimit({ email, ip });
    if (!rl.allowed) {
      logAuth('login_rate_limited', { reqId, email, ip, retryAfterSec: rl.retryAfterSec, backend: rl.backend });
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

    const user = await findUserByEmail(email);
    const ua = req.headers.get('user-agent') || 'unknown';

    if (!user?.passwordHash) {
      await registerFailedLogin({ email, ip });

      // Audit: Failed login (user not found)
      logActivityAsync({
        action: 'LOGIN_FAILED',
        ip,
        userAgent: ua,
        metadata: { email, reason: 'user_not_found' },
      });

      const res = NextResponse.json<ApiResponse<LoginData>>(
        {
          ok: false,
          error: {
            code: 'AUTH_INVALID_CREDENTIALS' as AuthErrorCode,
            message: errorMessage('AUTH_INVALID_CREDENTIALS'),
          },
        } as ApiResponse<LoginData>,
        { status: 401 }
      );
      res.headers.set('x-request-id', reqId);
      res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
      return res;
    }

    if (user.isActive === false) {
      const res = NextResponse.json<ApiResponse<LoginData>>(
        {
          ok: false,
          error: {
            code: 'AUTH_USER_INACTIVE' as AuthErrorCode,
            message: errorMessage('AUTH_USER_INACTIVE'),
          },
        } as ApiResponse<LoginData>,
        { status: 403 }
      );
      res.headers.set('x-request-id', reqId);
      res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
      return res;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await registerFailedLogin({ email, ip });

      // Audit: Failed login (wrong password)
      logActivityAsync({
        userId: user.id,
        action: 'LOGIN_FAILED',
        ip,
        userAgent: ua,
        metadata: { reason: 'invalid_password' },
      });

      const res = NextResponse.json<ApiResponse<LoginData>>(
        {
          ok: false,
          error: {
            code: 'AUTH_INVALID_CREDENTIALS' as AuthErrorCode,
            message: errorMessage('AUTH_INVALID_CREDENTIALS'),
          },
        } as ApiResponse<LoginData>,
        { status: 401 }
      );
      res.headers.set('x-request-id', reqId);
      res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
      return res;
    }

    // =========================================================================
    // BCRYPT REHASH-ON-LOGIN (Security Upgrade)
    // If the user's password hash uses a weak cost factor, rehash it now.
    // This is done AFTER successful verification to transparently upgrade
    // existing users to the new, stronger cost factor.
    // =========================================================================
    if (needsRehash(user.passwordHash)) {
      const oldRounds = getBcryptRounds(user.passwordHash);
      logAuth('bcrypt_rehash_started', { reqId, userId: user.id, oldRounds });

      try {
        // Hash with the new, stronger cost factor
        const newHash = await hashPassword(password);

        // Update the user's password hash in the database
        const updated = await updateUserPasswordHash(user.id, newHash);

        if (updated) {
          const newRounds = getBcryptRounds(newHash);
          logAuth('bcrypt_rehash_success', { reqId, userId: user.id, oldRounds, newRounds });
          console.log(`[AUTH] Bcrypt rehash complete for user ${user.id}: ${oldRounds} → ${newRounds} rounds`);
        } else {
          // Non-critical: Log but don't fail login
          logAuth('bcrypt_rehash_failed', { reqId, userId: user.id, reason: 'db_update_failed' });
          console.warn(`[AUTH] Bcrypt rehash failed for user ${user.id}, will retry on next login`);
        }
      } catch (rehashError) {
        // Non-critical: Log but don't fail login
        const errMsg = rehashError instanceof Error ? rehashError.message : String(rehashError);
        logAuth('bcrypt_rehash_error', { reqId, userId: user.id, error: errMsg });
        console.error(`[AUTH] Bcrypt rehash error for user ${user.id}:`, errMsg);
      }
    }

    // Optional: Email verification requirement
    // DISABLED for DEV - uncomment in production when email verification flow is ready
    // if (!user.emailVerifiedAt) {
    //   const res = NextResponse.json(
    //     {
    //       ok: false,
    //       error: {
    //         code: 'AUTH_UNVERIFIED_EMAIL' as AuthErrorCode,
    //         message: errorMessage('AUTH_UNVERIFIED_EMAIL'),
    //       },
    //     },
    //     { status: 403 }
    //   );
    //   res.headers.set('x-request-id', reqId);
    //   return res;
    // }

    // MFA Hook (if mfa_enabled, create pending token and redirect to 2FA page)
    if (user.mfaEnabled) {
      // Validate and sanitize next parameter early for MFA flow
      const validNext = validateNext(parsed.data.next);

      // Create a pending MFA token (not a full session yet) WITH DEBUG INFO
      // This can throw if Redis is not available - we handle this gracefully
      try {
        const { token: pendingToken, debug: mfaStoreDebug } = await storeMfaPendingWithDebug({
          userId: user.id,
          email: user.email,
          displayName: user.displayName ?? '',
          remember: parsed.data.remember ?? false,
          next: validNext,
          ip,
          userAgent: ua,
          createdAt: Date.now(),
        });

        logAuth('mfa_required', { reqId, userId: user.id, ip, storeDebug: mfaStoreDebug });

        // Audit: MFA challenge initiated
        logActivityAsync({
          userId: user.id,
          action: 'MFA_CHALLENGE_INITIATED',
          ip,
          userAgent: ua,
          metadata: { reason: '2fa_enabled', storageBackend: mfaStoreDebug.storageBackend },
        });

        // Return success with mfaRequired flag
        const res = NextResponse.json<ApiResponse<MfaRequiredResponse>>(
          {
            ok: true,
            data: {
              mfaRequired: true,
              pendingToken,
              next: validNext,
            },
          },
          { status: 200 }
        );
        res.headers.set('x-request-id', reqId);
        res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
        return res as unknown as NextResponse<ApiResponse<LoginData>>;
      } catch (mfaError) {
        // Redis is not available - return 503 Service Unavailable
        const errMsg = mfaError instanceof Error ? mfaError.message : String(mfaError);
        console.error('[AUTH:LOGIN] MFA storage failed:', errMsg);
        logAuth('mfa_storage_failed', { reqId, userId: user.id, ip, error: errMsg });

        const res = NextResponse.json<ApiResponse<LoginData>>(
          {
            ok: false,
            error: {
              code: 'AUTH_INTERNAL' as AuthErrorCode,
              message: 'Authentifizierungsdienst vorübergehend nicht verfügbar. Bitte versuche es in wenigen Sekunden erneut.',
            },
          } as ApiResponse<LoginData>,
          { status: 503 }
        );
        res.headers.set('x-request-id', reqId);
        res.headers.set('Retry-After', '5');
        res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
        return res;
      }
    }

    // Success → Clear failures
    await clearFailures({ email, ip });

    // Create session with device intelligence (ua already defined above)
    const deviceInfo = parseUserAgent(ua);
    const ttl = parsed.data.remember ? SESSION_TTL_DAYS * 2 : SESSION_TTL_DAYS;

    const { token, expiresAt, sessionId } = await createSession({
      userId: user.id,
      userAgent: ua,
      ip,
      deviceInfo,
    });

    // Log device info for security monitoring
    logAuth('session_created', {
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

    // =========================================================================
    // NEW DEVICE DETECTION & SECURITY ALERT (Fire-and-Forget)
    // Check if this is a new device and send security email if so.
    // This is done AFTER session creation to not block the login flow.
    // =========================================================================
    checkAndNotifyNewDevice({
      userId: user.id,
      userEmail: user.email,
      userAgent: ua,
      ipAddress: ip,
      deviceInfo,
    }).catch((err) => {
      // Non-blocking: Log error but don't fail login
      console.error('[SECURITY] Device check failed:', err);
      logAuth('device_check_failed', { reqId, userId: user.id, error: err instanceof Error ? err.message : String(err) });
    });

    // =========================================================================
    // AUDIT LOG: Successful Login
    // =========================================================================
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
      },
    });

    const roles = await getUserRoles(user.id);

    // Validate and sanitize next parameter
    const validNext = validateNext(parsed.data.next);

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

    // Email verification status cookie (for middleware to check without DB access)
    // This is NOT httpOnly so the frontend can also read it if needed
    const emailVerifiedCookie = {
      name: 'sintra_email_verified',
      value: user.emailVerifiedAt ? 'true' : 'false',
      httpOnly: false, // Allow frontend to read
      sameSite: 'lax' as const,
      secure: isSecure,
      path: '/',
      maxAge: cookieMaxAge,
    };

    // CSRF token cookie for double-submit pattern
    // Must NOT be httpOnly so JavaScript can read and send it in headers
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
      route: '/api/auth/login',
      tokenPresent: !!token,
      tokenLength: token?.length ?? 0,
      tokenPrefix: token?.substring(0, 15) ?? 'NULL',
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    const res = NextResponse.json({
      ok: true,
      // Include accessToken in response for localStorage storage (cross-origin fallback)
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
        next: validNext,
      },
    } satisfies ApiResponse<LoginData>);

    res.cookies.set(sessionCookie);
    res.cookies.set(emailVerifiedCookie);
    res.cookies.set(csrfCookie);
    res.headers.set('x-request-id', reqId);
    res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
    logAuth('login_success', { reqId, userId: user.id, ip });
    return res;
  } catch (err) {
    const errMsg = (err as Error)?.message ?? String(err);
    console.error('[AUTH:LOGIN] Unhandled error:', errMsg);
    logAuth('login_error', { reqId, err: errMsg });

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
