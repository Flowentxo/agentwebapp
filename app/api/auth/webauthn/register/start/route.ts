/**
 * POST /api/auth/webauthn/register/start
 * Start passkey registration - returns options for navigator.credentials.create()
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthErrorCode, type ApiResponse } from '@/lib/auth/types';
import { getSession } from '@/lib/auth/session';
import { startRegistration, type RegistrationStartResult } from '@/lib/auth/webauthn';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<RegistrationStartResult>>> {
  try {
    // User must be authenticated to register a passkey
    const sessionData = await getSession();
    if (!sessionData) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.UNAUTHORIZED,
            message: 'You must be logged in to register a passkey',
          },
        },
        { status: 401 }
      );
    }

    // Start registration
    const result = await startRegistration(sessionData.user.id);

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    console.error('[WebAuthn] Registration start error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: AuthErrorCode.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'Failed to start passkey registration',
        },
      },
      { status: 500 }
    );
  }
}
