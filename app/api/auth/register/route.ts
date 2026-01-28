/**
 * POST /api/auth/register
 * User registration with auto-login
 */

import { NextResponse, type NextRequest } from 'next/server';
export const runtime = 'nodejs';

import { registerSchema } from '@/lib/auth/registerSchema';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth/crypto';
import { createSession } from '@/lib/auth/session';
import { getUserRoles, addUserRole } from '@/lib/auth/user';
import { newRequestId, logAuth } from '@/lib/auth/logger';
import { errorMessage, type ApiResponse, type AuthErrorCode } from '@/lib/auth/errors';

const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || 'sintra.sid';
const SESSION_TTL_DAYS = Number(process.env.AUTH_SESSION_TTL_DAYS || '7');

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return '0.0.0.0';
}

type RegisterData = {
  user: {
    id: string;
    email: string;
    displayName: string;
    roles: string[];
  };
  session: {
    id: string;
    expiresAt: Date;
  };
};

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<RegisterData>>> {
  const reqId = newRequestId();

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const res = NextResponse.json<ApiResponse<RegisterData>>(
        {
          ok: false,
          error: {
            code: 'AUTH_INVALID_INPUT' as AuthErrorCode,
            message: 'Ungültige Eingabe. Bitte überprüfe deine Daten.',
            details: parsed.error.format(),
          },
        } as ApiResponse<RegisterData>,
        { status: 400 }
      );
      res.headers.set('x-request-id', reqId);
      res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
      return res;
    }

    const { email, password, displayName } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const db = getDb();
    const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

    if (existing.length > 0) {
      const res = NextResponse.json<ApiResponse<RegisterData>>(
        {
          ok: false,
          error: {
            code: 'AUTH_EMAIL_EXISTS' as AuthErrorCode,
            message: 'Diese E-Mail-Adresse wird bereits verwendet.',
          },
        } as ApiResponse<RegisterData>,
        { status: 409 }
      );
      res.headers.set('x-request-id', reqId);
      res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
      return res;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        email: normalizedEmail,
        passwordHash,
        displayName,
        isActive: true,
        emailVerifiedAt: null, // Can be set to new Date() to skip verification
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Add default 'user' role
    try {
      await addUserRole(user.id, 'user');
    } catch (roleErr) {
      // Swallow role error - not critical
      logAuth('register_role_error', { reqId, userId: user.id, error: String(roleErr) });
    }

    // Auto-login: Create session
    const ua = req.headers.get('user-agent') || 'unknown';
    const ip = clientIp(req);
    const { token, expiresAt } = await createSession({
      userId: user.id,
      userAgent: ua,
      ip,
    });

    const roles = await getUserRoles(user.id);

    const cookie = {
      name: AUTH_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    };

    const res = NextResponse.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName ?? '',
          roles,
        },
        session: { id: token, expiresAt },
      },
    } satisfies ApiResponse<RegisterData>);

    res.cookies.set(cookie);
    res.headers.set('x-request-id', reqId);
    res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
    logAuth('register_success', { reqId, userId: user.id, email: normalizedEmail });

    return res;
  } catch (err) {
    logAuth('register_error', { reqId, err: (err as Error)?.message ?? String(err) });

    const res = NextResponse.json<ApiResponse<RegisterData>>(
      {
        ok: false,
        error: {
          code: 'AUTH_INTERNAL' as AuthErrorCode,
          message: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.',
        },
      } as ApiResponse<RegisterData>,
      { status: 500 }
    );
    res.headers.set('x-request-id', reqId);
    return res;
  }
}
