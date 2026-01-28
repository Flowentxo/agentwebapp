import { NextResponse, type NextRequest } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { updatePrivacySchema, ProfileErrorCode } from '@/lib/profile/schemas';
import { getPrivacy, updatePrivacy } from '@/lib/profile/service';
import { checkRateLimit, incrementRateLimit } from '@/lib/auth/rateLimit';
import { validateCsrfToken } from '@/lib/auth/csrf';

/**
 * GET /api/profile/privacy
 * Get privacy settings
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();

    const privacy = await getPrivacy(session.user.id);

    return NextResponse.json({
      ok: true,
      data: privacy,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code || ProfileErrorCode.INTERNAL_ERROR,
          message: error.message || 'Failed to load privacy settings',
        },
      },
      { status: error.code === 'AUTH_UNAUTHORIZED' ? 401 : 500 }
    );
  }
}

/**
 * PUT /api/profile/privacy
 * Update privacy settings
 */
export async function PUT(request: NextRequest) {
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
    const rateLimitKey = `profile:privacy:${session.user.id}:${ip}`;

    const rateLimit = await checkRateLimit(rateLimitKey, { maxAttempts: 10, windowMs: 60000 });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: ProfileErrorCode.RATE_LIMITED,
            message: 'Too many requests',
          },
        },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter || 60) } }
      );
    }

    await incrementRateLimit(rateLimitKey, { maxAttempts: 10, windowMs: 60000 });

    // Validate input
    const body = await request.json();
    const parseResult = updatePrivacySchema.safeParse(body);

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

    const privacy = await updatePrivacy(session.user.id, parseResult.data);

    return NextResponse.json({
      ok: true,
      data: privacy,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code || ProfileErrorCode.INTERNAL_ERROR,
          message: error.message || 'Failed to update privacy settings',
        },
      },
      { status: 500 }
    );
  }
}
