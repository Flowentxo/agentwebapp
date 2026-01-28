import { NextResponse, type NextRequest } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { mfaDisableSchema, ProfileErrorCode } from '@/lib/profile/schemas';
import { mfaDisable } from '@/lib/profile/service';
import { checkRateLimit, incrementRateLimit } from '@/lib/auth/rateLimit';
import { validateCsrfToken } from '@/lib/auth/csrf';

/**
 * POST /api/profile/mfa/disable
 * Disable MFA (requires password)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();

    // CSRF validation
    const csrfToken = request.headers.get('x-csrf-token');
    const csrfValid = await validateCsrfToken(csrfToken);

    if (!csrfValid) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'CSRF_INVALID',
            message: 'Invalid CSRF token',
          },
        },
        { status: 403 }
      );
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimitKey = `profile:mfa-disable:${session.user.id}:${ip}`;

    const rateLimit = await checkRateLimit(rateLimitKey, { maxAttempts: 3, windowMs: 300000 });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: ProfileErrorCode.RATE_LIMITED,
            message: 'Too many MFA disable attempts',
          },
        },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter || 300) } }
      );
    }

    await incrementRateLimit(rateLimitKey, { maxAttempts: 3, windowMs: 300000 });

    // Validate input
    const body = await request.json();
    const parseResult = mfaDisableSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: ProfileErrorCode.INVALID,
            message: 'Invalid input',
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const result = await mfaDisable(session.user.id, parseResult.data.currentPassword);

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code || ProfileErrorCode.INTERNAL_ERROR,
          message: error.message || 'Failed to disable MFA',
        },
      },
      { status: error.message === 'Invalid password' ? 401 : 500 }
    );
  }
}
