/**
 * POST /api/auth/verify-email
 * Verify user email with token
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyEmailRequestSchema,
  AuthErrorCode,
  type ApiResponse,
} from '@/lib/auth/types';
import { useVerificationToken } from '@/lib/auth/tokens';
import { markEmailVerified } from '@/lib/auth/user';
import { checkRateLimit, incrementRateLimit, RATE_LIMITS } from '@/lib/auth/rateLimit';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ message: string }>>> {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

    // Parse and validate request
    const body = await request.json();
    const parseResult = verifyEmailRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.VALIDATION_ERROR,
            message: 'Invalid verification token',
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { token } = parseResult.data;

    // Rate limit (10 attempts per hour per IP)
    const rateLimitKey = `verify:${ip}`;
    const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMITS.EMAIL_VERIFY);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.RATE_LIMITED,
            message: 'Too many verification attempts',
            details: { retryAfter: rateLimit.retryAfter },
          },
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfter || 60) },
        }
      );
    }

    await incrementRateLimit(rateLimitKey, RATE_LIMITS.EMAIL_VERIFY);

    // Use token (validates and marks as used)
    const userId = await useVerificationToken(token, 'email_verify');

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.TOKEN_INVALID,
            message: 'Invalid or expired verification token',
          },
        },
        { status: 400 }
      );
    }

    // Mark email as verified
    await markEmailVerified(userId);

    // Create response with success message
    const response = NextResponse.json({
      ok: true,
      data: { message: 'Email verified successfully' },
    });

    // Update the email verification cookie so middleware allows access
    const isSecure = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'development';
    response.cookies.set({
      name: 'sintra_email_verified',
      value: 'true',
      httpOnly: false, // Allow frontend to read
      sameSite: 'lax',
      secure: isSecure,
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days (matches session)
    });

    return response;
  } catch (error) {
    console.error('[Auth] Email verification error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: AuthErrorCode.INTERNAL_ERROR,
          message: 'An error occurred during email verification',
        },
      },
      { status: 500 }
    );
  }
}
