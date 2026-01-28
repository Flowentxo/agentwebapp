/**
 * POST /api/auth/request-password-reset
 * Request password reset email
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  requestPasswordResetSchema,
  AuthErrorCode,
  type ApiResponse,
} from '@/lib/auth/types';
import { findUserByEmail } from '@/lib/auth/user';
import { createVerificationToken } from '@/lib/auth/tokens';
import { sendResetEmail } from '@/lib/auth/mailer';
import { checkRateLimit, incrementRateLimit, RATE_LIMITS } from '@/lib/auth/rateLimit';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ message: string }>>> {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

    // Parse and validate request
    const body = await request.json();
    const parseResult = requestPasswordResetSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.VALIDATION_ERROR,
            message: 'Invalid email address',
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { email } = parseResult.data;

    // Rate limit (3 requests per hour per IP)
    const rateLimitKey = `reset-request:${ip}`;
    const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMITS.PASSWORD_RESET_REQUEST);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.RATE_LIMITED,
            message: 'Too many password reset requests',
            details: { retryAfter: rateLimit.retryAfter },
          },
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfter || 60) },
        }
      );
    }

    await incrementRateLimit(rateLimitKey, RATE_LIMITS.PASSWORD_RESET_REQUEST);

    // Find user (fail silently to prevent email enumeration)
    const user = await findUserByEmail(email);

    if (user && user.isActive) {
      // Generate reset token (expires in 1 hour)
      const { token } = await createVerificationToken(
        user.id,
        'password_reset',
        60 * 60 * 1000
      );

      // Send reset email
      await sendResetEmail(user.email, token);
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      ok: true,
      data: {
        message: 'If an account with that email exists, a password reset link has been sent.',
      },
    });
  } catch (error) {
    console.error('[Auth] Password reset request error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: AuthErrorCode.INTERNAL_ERROR,
          message: 'An error occurred while processing your request',
        },
      },
      { status: 500 }
    );
  }
}
