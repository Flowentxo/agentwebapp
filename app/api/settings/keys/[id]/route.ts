/**
 * API Key Management Routes - Individual Key Operations
 *
 * DELETE /api/settings/keys/:id - Revoke a key
 * GET    /api/settings/keys/:id - Get key details
 * PATCH  /api/settings/keys/:id - Update key metadata
 *
 * Security: Requires authenticated user session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { apiKeyService } from '@/lib/services/ApiKeyService';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const updateKeySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// GET - Get key details
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: keyId } = await params;

    // Verify authentication
    const session = await getSession(request);
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Get key details
    const keyInfo = await apiKeyService.getKey(keyId, session.userId);

    if (!keyInfo) {
      return NextResponse.json(
        { error: 'API key not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      key: keyInfo,
    });
  } catch (error) {
    console.error('[API_KEYS_GET_ONE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get API key', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Revoke an API key
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: keyId } = await params;

    // Verify authentication
    const session = await getSession(request);
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Parse optional reason from body
    let reason: string | undefined;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch {
      // No body provided, that's fine
    }

    // Revoke the key
    const success = await apiKeyService.revokeKey(
      keyId,
      session.userId,
      session.userId,
      reason
    );

    if (!success) {
      return NextResponse.json(
        { error: 'API key not found or already revoked', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    console.error('[API_KEYS_DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke API key', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Update key metadata
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: keyId } = await params;

    // Verify authentication
    const session = await getSession(request);
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = updateKeySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Update the key
    const updatedKey = await apiKeyService.updateKey(
      keyId,
      session.userId,
      parsed.data
    );

    if (!updatedKey) {
      return NextResponse.json(
        { error: 'API key not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      key: updatedKey,
    });
  } catch (error) {
    console.error('[API_KEYS_PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update API key', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
