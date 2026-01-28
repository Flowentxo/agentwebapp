/**
 * API Key Rotation Endpoint
 *
 * POST /api/api-keys/[id]/rotate - Rotate API key (generate new secret)
 */

import { NextRequest, NextResponse } from 'next/server';
import { rotateApiKey } from '@/lib/auth/api-key-service';
import { getSessionUser } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/api-keys/[id]/rotate - Rotate API key
 *
 * Generates a new secret while keeping the same key ID and metadata
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in' },
        { status: 401 }
      );
    }

    const rotatedKey = await rotateApiKey(params.id, user.id, user.id);

    if (!rotatedKey) {
      return NextResponse.json(
        { error: 'Not found', message: 'API key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: '⚠️ IMPORTANT: Save this new API key now. The old key has been invalidated!',
        data: {
          id: rotatedKey.id,
          name: rotatedKey.name,
          secret: rotatedKey.secret, // ⚠️ New secret - only shown once!
          prefix: rotatedKey.prefix,
          scopes: rotatedKey.scopes,
          environment: rotatedKey.environment,
          expiresAt: rotatedKey.expiresAt,
          createdAt: rotatedKey.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API_KEY_ROTATE]', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to rotate API key' },
      { status: 500 }
    );
  }
}
