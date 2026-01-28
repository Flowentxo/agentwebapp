/**
 * POST /api/auth/resend-verification
 * Resend email verification link for logged-in users
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthErrorCode, type ApiResponse } from '@/lib/auth/types';
import { getSession } from '@/lib/auth/session';
import { findUserById } from '@/lib/auth/user';
import { createVerificationToken } from '@/lib/auth/tokens';
import { sendVerificationEmail } from '@/lib/auth/mailer';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ message: string }>>> {
  try {
    // Get current session
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.UNAUTHORIZED,
            message: 'You must be logged in to resend verification email',
          },
        },
        { status: 401 }
      );
    }

    // Get user from session
    const user = await findUserById(session.user.id);

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.USER_NOT_FOUND,
            message: 'User not found',
          },
        },
        { status: 404 }
      );
    }

    // Check if already verified
    if (user.emailVerifiedAt) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.VALIDATION_ERROR,
            message: 'Email is already verified',
          },
        },
        { status: 400 }
      );
    }

    // Create new verification token
    const { token } = await createVerificationToken(user.id, 'email_verify');

    // Send verification email
    const emailSent = await sendVerificationEmail(user.email, token);

    if (!emailSent) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.INTERNAL_ERROR,
            message: 'Failed to send verification email. Please try again later.',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: { message: 'Verification email sent successfully' },
    });
  } catch (error) {
    console.error('[Auth] Resend verification error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: AuthErrorCode.INTERNAL_ERROR,
          message: 'An error occurred while sending verification email',
        },
      },
      { status: 500 }
    );
  }
}
