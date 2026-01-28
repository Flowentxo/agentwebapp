/**
 * POST /api/auth/reset-password
 * Reset password with token
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  resetPasswordRequestSchema,
  AuthErrorCode,
  type ApiResponse,
} from '@/lib/auth/types';
import { useVerificationToken } from '@/lib/auth/tokens';
import { updateUserPassword } from '@/lib/auth/user';
import { revokeAllUserSessions } from '@/lib/auth/session';
import { checkRateLimit, incrementRateLimit, RATE_LIMITS } from '@/lib/auth/rateLimit';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ message: string }>>> {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

    // Parse and validate request
    const body = await request.json();
    const parseResult = resetPasswordRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.VALIDATION_ERROR,
            message: 'Invalid request data',
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { token, newPassword } = parseResult.data;

    // Rate limit (5 attempts per hour per IP)
    const rateLimitKey = `reset-confirm:${ip}`;
    const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMITS.PASSWORD_RESET_CONFIRM);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.RATE_LIMITED,
            message: 'Too many password reset attempts',
            details: { retryAfter: rateLimit.retryAfter },
          },
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfter || 60) },
        }
      );
    }

    await incrementRateLimit(rateLimitKey, RATE_LIMITS.PASSWORD_RESET_CONFIRM);

    // Use token (validates and marks as used)
    const userId = await useVerificationToken(token, 'password_reset');

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.TOKEN_INVALID,
            message: 'Invalid or expired reset token',
          },
        },
        { status: 400 }
      );
    }

    // Update password
    await updateUserPassword(userId, newPassword);

    // Revoke all existing sessions for security
    await revokeAllUserSessions(userId);

    return NextResponse.json({
      ok: true,
      data: { message: 'Password reset successfully. Please log in with your new password.' },
    });
  } catch (error) {
    console.error('[Auth] Password reset error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: AuthErrorCode.INTERNAL_ERROR,
          message: 'An error occurred while resetting your password',
        },
      },
      { status: 500 }
    );
  }
}
