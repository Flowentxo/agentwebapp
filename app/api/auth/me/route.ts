/**
 * GET /api/auth/me
 * Get current authenticated user
 */

import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { AuthErrorCode, type ApiResponse } from '@/lib/auth/types';
import { requireSession } from '@/lib/auth/session';

type UserData = {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    roles: any[];
    emailVerified: boolean;
  };
};

export async function GET(): Promise<NextResponse<ApiResponse<UserData>>> {
  try {
    // Require valid session
    const sessionData = await requireSession();

    const res = NextResponse.json({
      ok: true,
      data: {
        user: sessionData.user,
      },
    });

    res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
    return res;
  } catch (error: any) {
    const code = error.code || AuthErrorCode.UNAUTHORIZED;
    const message = error.message || 'Unauthorized';

    const res = NextResponse.json(
      {
        ok: false,
        error: {
          code,
          message,
        },
      },
      { status: code === AuthErrorCode.FORBIDDEN ? 403 : 401 }
    );

    res.headers.set('Cache-Control', 'no-store, private, must-revalidate');
    return res;
  }
}
