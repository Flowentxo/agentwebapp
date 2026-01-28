import { NextResponse, type NextRequest } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { ProfileErrorCode } from '@/lib/profile/schemas';
import { mfaSetup } from '@/lib/profile/service';
import { checkRateLimit, incrementRateLimit } from '@/lib/auth/rateLimit';

/**
 * POST /api/profile/mfa/setup
 * Initialize MFA setup (generate secret and QR code)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimitKey = `profile:mfa-setup:${session.user.id}:${ip}`;

    const rateLimit = await checkRateLimit(rateLimitKey, { maxAttempts: 5, windowMs: 60000 });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: ProfileErrorCode.RATE_LIMITED,
            message: 'Too many MFA setup requests',
          },
        },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter || 60) } }
      );
    }

    await incrementRateLimit(rateLimitKey, { maxAttempts: 5, windowMs: 60000 });

    const result = await mfaSetup(session.user.id);

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
          message: error.message || 'Failed to setup MFA',
        },
      },
      { status: 500 }
    );
  }
}
