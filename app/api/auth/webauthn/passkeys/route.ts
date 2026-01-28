/**
 * GET/DELETE/PATCH /api/auth/webauthn/passkeys
 * Manage user passkeys - list, rename, delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthErrorCode, type ApiResponse } from '@/lib/auth/types';
import { getSession } from '@/lib/auth/session';
import {
  getUserPasskeys,
  renamePasskey,
  deletePasskey,
  type PasskeyInfo,
} from '@/lib/auth/webauthn';
import { isSudoValid, createSudoRequiredError } from '@/lib/auth/sudo';

export const runtime = 'nodejs';

// Response type
export interface PasskeysListResponse {
  passkeys: PasskeyInfo[];
  count: number;
}

/**
 * GET /api/auth/webauthn/passkeys
 * List all passkeys for the current user
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<PasskeysListResponse>>> {
  try {
    // User must be authenticated
    const sessionData = await getSession();
    if (!sessionData) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.UNAUTHORIZED,
            message: 'You must be logged in to view passkeys',
          },
        },
        { status: 401 }
      );
    }

    // Get passkeys
    const passkeys = await getUserPasskeys(sessionData.user.id);

    return NextResponse.json({
      ok: true,
      data: {
        passkeys,
        count: passkeys.length,
      },
    });
  } catch (error) {
    console.error('[WebAuthn] Get passkeys error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: AuthErrorCode.INTERNAL_ERROR,
          message: 'Failed to retrieve passkeys',
        },
      },
      { status: 500 }
    );
  }
}

// Delete request schema
const deleteSchema = z.object({
  passkeyId: z.string().uuid('Invalid passkey ID'),
});

/**
 * DELETE /api/auth/webauthn/passkeys
 * Delete a passkey
 *
 * PROTECTED: Requires sudo mode (re-authentication)
 */
export async function DELETE(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ message: string; deletedId: string }>>> {
  try {
    // User must be authenticated
    const sessionData = await getSession();
    if (!sessionData) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.UNAUTHORIZED,
            message: 'You must be logged in to delete a passkey',
          },
        },
        { status: 401 }
      );
    }

    // Check sudo mode - deleting passkeys is a sensitive action
    const sudoValid = await isSudoValid(sessionData.sessionId);
    if (!sudoValid) {
      return NextResponse.json(createSudoRequiredError(), { status: 403 });
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const parseResult = deleteSchema.safeParse(body);

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

    const { passkeyId } = parseResult.data;

    // Get request context for audit
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim();
    const userAgent = request.headers.get('user-agent') || undefined;

    // Delete passkey
    const deleted = await deletePasskey(sessionData.user.id, passkeyId, { ip, userAgent });

    if (!deleted) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.NOT_FOUND,
            message: 'Passkey not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        message: 'Passkey deleted successfully',
        deletedId: passkeyId,
      },
    });
  } catch (error) {
    console.error('[WebAuthn] Delete passkey error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: AuthErrorCode.INTERNAL_ERROR,
          message: 'Failed to delete passkey',
        },
      },
      { status: 500 }
    );
  }
}

// Rename request schema
const renameSchema = z.object({
  passkeyId: z.string().uuid('Invalid passkey ID'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
});

/**
 * PATCH /api/auth/webauthn/passkeys
 * Rename a passkey
 */
export async function PATCH(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ message: string; passkeyId: string; newName: string }>>> {
  try {
    // User must be authenticated
    const sessionData = await getSession();
    if (!sessionData) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.UNAUTHORIZED,
            message: 'You must be logged in to rename a passkey',
          },
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const parseResult = renameSchema.safeParse(body);

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

    const { passkeyId, name } = parseResult.data;

    // Rename passkey
    const renamed = await renamePasskey(sessionData.user.id, passkeyId, name);

    if (!renamed) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.NOT_FOUND,
            message: 'Passkey not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        message: 'Passkey renamed successfully',
        passkeyId,
        newName: name,
      },
    });
  } catch (error) {
    console.error('[WebAuthn] Rename passkey error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: AuthErrorCode.INTERNAL_ERROR,
          message: 'Failed to rename passkey',
        },
      },
      { status: 500 }
    );
  }
}
