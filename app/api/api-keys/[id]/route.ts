/**
 * Individual API Key Management Endpoints
 *
 * GET    /api/api-keys/[id]        - Get API key details
 * PATCH  /api/api-keys/[id]        - Update API key
 * DELETE /api/api-keys/[id]        - Revoke API key
 * POST   /api/api-keys/[id]/rotate - Rotate API key (generate new secret)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getApiKeyById,
  updateApiKey,
  revokeApiKey,
  rotateApiKey,
} from '@/lib/auth/api-key-service';
import { API_SCOPES } from '@/lib/db/schema-api-keys';
import { getSessionUser } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Validation schema for updating API key
 */
const updateApiKeySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  scopes: z.array(z.string()).min(1).max(50).optional(),
  expiresInDays: z.number().min(1).max(365).optional(),
  rateLimit: z.number().min(1).max(10000).optional(),
  ipWhitelist: z.array(z.string().ip()).optional(),
});

/**
 * GET /api/api-keys/[id] - Get API key details
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in' },
        { status: 401 }
      );
    }

    const apiKey = await getApiKeyById(params.id, user.id);

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Not found', message: 'API key not found' },
        { status: 404 }
      );
    }

    // Return sanitized data (no secret)
    return NextResponse.json({
      success: true,
      data: {
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        environment: apiKey.environment,
        isActive: apiKey.isActive,
        expiresAt: apiKey.expiresAt,
        lastUsedAt: apiKey.lastUsedAt,
        usageCount: apiKey.usageCount,
        description: apiKey.description,
        rateLimit: apiKey.rateLimit,
        ipWhitelist: apiKey.ipWhitelist,
        createdAt: apiKey.createdAt,
        updatedAt: apiKey.updatedAt,
        revokedAt: apiKey.revokedAt,
        revokedBy: apiKey.revokedBy,
        revokedReason: apiKey.revokedReason,
      },
    });
  } catch (error) {
    console.error('[API_KEY_GET]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/api-keys/[id] - Update API key
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = updateApiKeySchema.parse(body);

    // Validate scopes if provided
    if (validatedData.scopes) {
      const validScopes = Object.values(API_SCOPES);
      const invalidScopes = validatedData.scopes.filter((scope) => !validScopes.includes(scope as any));

      if (invalidScopes.length > 0) {
        return NextResponse.json(
          {
            error: 'Invalid scopes',
            message: `Invalid scopes: ${invalidScopes.join(', ')}`,
            validScopes,
          },
          { status: 400 }
        );
      }
    }

    // Calculate expiration date if provided
    const expiresAt = validatedData.expiresInDays
      ? new Date(Date.now() + validatedData.expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    const updates = {
      name: validatedData.name,
      description: validatedData.description,
      scopes: validatedData.scopes as any,
      expiresAt,
      rateLimit: validatedData.rateLimit,
      ipWhitelist: validatedData.ipWhitelist,
    };

    const updatedKey = await updateApiKey(params.id, user.id, updates, user.id);

    if (!updatedKey) {
      return NextResponse.json(
        { error: 'Not found', message: 'API key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'API key updated successfully',
      data: {
        id: updatedKey.id,
        name: updatedKey.name,
        prefix: updatedKey.keyPrefix,
        scopes: updatedKey.scopes,
        environment: updatedKey.environment,
        isActive: updatedKey.isActive,
        expiresAt: updatedKey.expiresAt,
        updatedAt: updatedKey.updatedAt,
      },
    });
  } catch (error) {
    console.error('[API_KEY_PATCH]', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/api-keys/[id] - Revoke API key
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in' },
        { status: 401 }
      );
    }

    // Get reason from query params
    const reason = req.nextUrl.searchParams.get('reason') || undefined;

    const success = await revokeApiKey(params.id, user.id, user.id, reason);

    if (!success) {
      return NextResponse.json(
        { error: 'Not found', message: 'API key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    console.error('[API_KEY_DELETE]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
