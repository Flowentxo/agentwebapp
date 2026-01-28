/**
 * POST /api/auth/sudo/verify
 * Verify user identity for sudo mode (sensitive action protection)
 *
 * Accepts password OR WebAuthn response for re-authentication.
 * On success, refreshes the session's lastAuthenticatedAt timestamp.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { verifySudoWithPassword, verifySudoWithPasskey, checkSudoMode } from '@/lib/auth/sudo';
import { finishAuthentication } from '@/lib/auth/webauthn';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';

export const runtime = 'nodejs';

// Request body schema - either password OR webauthn response
const passwordSchema = z.object({
  method: z.literal('password'),
  password: z.string().min(1, 'Password is required'),
});

const webauthnSchema = z.object({
  method: z.literal('passkey'),
  challengeId: z.string().uuid('Invalid challenge ID'),
  response: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      clientDataJSON: z.string(),
      authenticatorData: z.string(),
      signature: z.string(),
      userHandle: z.string().optional(),
    }),
    authenticatorAttachment: z.string().optional(),
    clientExtensionResults: z.record(z.unknown()),
    type: z.literal('public-key'),
  }),
});

const bodySchema = z.union([passwordSchema, webauthnSchema]);

interface SudoVerifyResponse {
  ok: boolean;
  data?: {
    success: boolean;
    expiresAt: string;
    remainingMinutes: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<SudoVerifyResponse>> {
  try {
    // User must be authenticated
    const sessionData = await getSession();
    if (!sessionData) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be logged in',
          },
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const parseResult = bodySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
          },
        },
        { status: 400 }
      );
    }

    const { userId, sessionId } = sessionData;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim();
    const userAgent = request.headers.get('user-agent') || undefined;
    const context = { ip, userAgent };

    let result;

    if (parseResult.data.method === 'password') {
      // Password verification
      result = await verifySudoWithPassword(
        userId,
        sessionId,
        parseResult.data.password,
        context
      );
    } else {
      // Passkey verification
      const { challengeId, response } = parseResult.data;

      // First, verify the WebAuthn response
      try {
        const authResult = await finishAuthentication(
          challengeId,
          response as AuthenticationResponseJSON,
          context
        );

        // Verify the passkey belongs to this user
        if (authResult.userId !== userId) {
          return NextResponse.json(
            {
              ok: false,
              error: {
                code: 'SUDO_VERIFY_FAILED',
                message: 'Passkey does not belong to this user',
              },
            },
            { status: 403 }
          );
        }

        // Update sudo mode
        result = await verifySudoWithPasskey(
          userId,
          sessionId,
          authResult.passkeyId,
          context
        );
      } catch (error) {
        console.error('[SUDO] Passkey verification failed:', error);
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: 'SUDO_VERIFY_FAILED',
              message: error instanceof Error ? error.message : 'Passkey verification failed',
            },
          },
          { status: 401 }
        );
      }
    }

    if (!result.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'SUDO_VERIFY_FAILED',
            message: result.error || 'Verification failed',
          },
        },
        { status: 401 }
      );
    }

    // Get updated sudo status
    const sudoStatus = await checkSudoMode(sessionId);

    return NextResponse.json({
      ok: true,
      data: {
        success: true,
        expiresAt: result.expiresAt?.toISOString() || new Date().toISOString(),
        remainingMinutes: sudoStatus.remainingMinutes,
      },
    });
  } catch (error) {
    console.error('[SUDO] Verification error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to verify identity',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/sudo/verify
 * Check current sudo mode status
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const sessionData = await getSession();
    if (!sessionData) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be logged in',
          },
        },
        { status: 401 }
      );
    }

    const status = await checkSudoMode(sessionData.sessionId);

    return NextResponse.json({
      ok: true,
      data: {
        isValid: status.isValid,
        remainingMinutes: status.remainingMinutes,
        expiresAt: status.expiresAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('[SUDO] Status check error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check sudo status',
        },
      },
      { status: 500 }
    );
  }
}
