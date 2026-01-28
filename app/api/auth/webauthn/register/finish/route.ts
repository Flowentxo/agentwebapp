/**
 * POST /api/auth/webauthn/register/finish
 * Complete passkey registration - verifies response and stores credential
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthErrorCode, type ApiResponse } from '@/lib/auth/types';
import { getSession } from '@/lib/auth/session';
import { finishRegistration, type PasskeyInfo } from '@/lib/auth/webauthn';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';

export const runtime = 'nodejs';

// Request body schema
const bodySchema = z.object({
  challengeId: z.string().uuid('Invalid challenge ID'),
  response: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      clientDataJSON: z.string(),
      attestationObject: z.string(),
      transports: z.array(z.string()).optional(),
      publicKeyAlgorithm: z.number().optional(),
      publicKey: z.string().optional(),
      authenticatorData: z.string().optional(),
    }),
    authenticatorAttachment: z.string().optional(),
    clientExtensionResults: z.record(z.unknown()),
    type: z.literal('public-key'),
  }),
  name: z.string().min(1).max(100).optional().default('Passkey'),
});

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<PasskeyInfo>>> {
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

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const parseResult = bodySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.VALIDATION_ERROR,
            message: 'Invalid request body',
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { challengeId, response, name } = parseResult.data;

    // Get request context for audit
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim();
    const userAgent = request.headers.get('user-agent') || undefined;

    // Finish registration
    const passkey = await finishRegistration(
      challengeId,
      response as RegistrationResponseJSON,
      name,
      { ip, userAgent }
    );

    // Return passkey info (without sensitive data)
    const passkeyInfo: PasskeyInfo = {
      id: passkey.id,
      name: passkey.name,
      credentialDeviceType: passkey.credentialDeviceType,
      credentialBackedUp: passkey.credentialBackedUp,
      createdAt: passkey.createdAt,
      lastUsedAt: passkey.lastUsedAt,
    };

    return NextResponse.json({
      ok: true,
      data: passkeyInfo,
    });
  } catch (error) {
    console.error('[WebAuthn] Registration finish error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: AuthErrorCode.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'Failed to complete passkey registration',
        },
      },
      { status: 500 }
    );
  }
}
