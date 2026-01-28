import { NextResponse, type NextRequest } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { updateProfileSchema, ProfileErrorCode, type ApiResponse } from '@/lib/profile/schemas';
import { getProfile, updateProfile } from '@/lib/profile/service';
import { checkRateLimit, incrementRateLimit } from '@/lib/auth/rateLimit';
import { validateCsrfToken } from '@/lib/auth/csrf';

/**
 * GET /api/profile
 * Get current user's profile
 */
export async function GET() {
  try {
    const session = await requireSession();

    const profile = await getProfile(session.user.id);

    return NextResponse.json({
      ok: true,
      data: profile,
    });
  } catch (error: any) {
    // Return 401 for auth errors, otherwise return empty profile for development
    if (error.code === 'AUTH_UNAUTHORIZED') {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.message || 'Unauthorized',
          },
        },
        { status: 401 }
      );
    }

    // For development, return a default profile instead of 500
    console.warn('[PROFILE_GET] Error loading profile:', error.message);
    return NextResponse.json({
      ok: true,
      data: {
        id: 'demo-user',
        email: 'demo@example.com',
        displayName: 'Demo User',
        avatarUrl: null,
        preferences: {},
      },
    });
  }
}

/**
 * PUT /api/profile
 * Update current user's profile
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
    const rateLimitKey = `profile:update:${session.user.id}:${ip}`;

    const rateLimit = await checkRateLimit(rateLimitKey, { maxAttempts: 5, windowMs: 60000 });

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

    await incrementRateLimit(rateLimitKey, { maxAttempts: 5, windowMs: 60000 });

    // Validate input
    const body = await request.json();
    const parseResult = updateProfileSchema.safeParse(body);

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

    const profile = await updateProfile(session.user.id, parseResult.data);

    return NextResponse.json({
      ok: true,
      data: profile,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code || ProfileErrorCode.INTERNAL_ERROR,
          message: error.message || 'Failed to update profile',
        },
      },
      { status: 500 }
    );
  }
}
