/**
 * POST /api/auth/webauthn/login/start
 * Start passkey authentication - returns options for navigator.credentials.get()
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { type ApiResponse } from '@/lib/auth/types';
import { startAuthentication, type AuthenticationStartResult } from '@/lib/auth/webauthn';

export const runtime = 'nodejs';

// Optional: email for user-specific passkey authentication
const bodySchema = z.object({
  email: z.string().email().optional(),
}).optional();

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<AuthenticationStartResult>>> {
  try {
    // Parse optional body (may contain email for user-specific flow)
    const body = await request.json().catch(() => ({}));
    const parseResult = bodySchema.safeParse(body);

    // For now, we'll use discoverable credentials (no user ID needed)
    // This allows "Sign in with passkey" without entering email first

    // Start authentication (no userId = discoverable credentials mode)
    const result = await startAuthentication();

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    console.error('[WebAuthn] Authentication start error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'WEBAUTHN_ERROR',
          message: error instanceof Error ? error.message : 'Failed to start passkey authentication',
        },
      },
      { status: 500 }
    );
  }
}
