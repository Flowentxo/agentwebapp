/**
 * POST /api/auth/logout
 * User logout endpoint - revokes current session
 */

import { NextResponse } from 'next/server';
import { AuthErrorCode, type ApiResponse } from '@/lib/auth/types';
import { revokeCurrentSession } from '@/lib/auth/session';
import { clearSessionCookie } from '@/lib/auth/cookies';

export async function POST(): Promise<NextResponse<ApiResponse<{ message: string }>>> {
  try {
    // Revoke current session
    await revokeCurrentSession();

    // Clear session cookie
    await clearSessionCookie();

    // Create response
    const response = NextResponse.json({
      ok: true,
      data: { message: 'Logged out successfully' },
    });

    // Clear email verification cookie as well
    response.cookies.set({
      name: 'sintra_email_verified',
      value: '',
      maxAge: 0, // Immediately expire
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Auth] Logout error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: AuthErrorCode.INTERNAL_ERROR,
          message: 'An error occurred during logout',
        },
      },
      { status: 500 }
    );
  }
}
