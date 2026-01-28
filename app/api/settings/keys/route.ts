/**
 * API Key Management Routes
 *
 * POST /api/settings/keys - Create a new API key
 * GET  /api/settings/keys - List all API keys (masked)
 *
 * Security: Requires authenticated user session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { apiKeyService, API_SCOPES } from '@/lib/services/ApiKeyService';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createKeySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  scopes: z.array(z.string()).optional(),
  environment: z.enum(['production', 'development', 'test']).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  rateLimit: z.number().min(1).max(100000).optional(),
});

// ============================================================================
// POST - Create a new API key
// ============================================================================

export async function POST(request: NextRequest) {
  try {
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
    const parsed = createKeySchema.safeParse(body);

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

    const { name, description, scopes, environment, expiresAt, rateLimit } = parsed.data;

    // Validate scopes
    const validScopes = Object.values(API_SCOPES);
    const requestedScopes = scopes || [API_SCOPES.WORKFLOWS_EXECUTE];
    const invalidScopes = requestedScopes.filter((s) => !validScopes.includes(s as any));

    if (invalidScopes.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid scopes: ${invalidScopes.join(', ')}`,
          code: 'INVALID_SCOPES',
          validScopes,
        },
        { status: 400 }
      );
    }

    // Generate the key
    const result = await apiKeyService.generateKey({
      name,
      description,
      scopes: requestedScopes as any[],
      environment: environment || 'production',
      userId: session.userId,
      workspaceId: session.userId, // Using userId as workspace for now
      createdBy: session.userId,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      rateLimit,
    });

    // Return the raw key (ONLY TIME it's visible)
    return NextResponse.json(
      {
        success: true,
        message: 'API key created successfully. Store it securely - you will not see it again.',
        key: result.rawKey, // Only time this is returned
        keyInfo: result.keyInfo,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API_KEYS_POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create API key', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - List all API keys (masked)
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getSession(request);
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const includeRevoked = searchParams.get('includeRevoked') === 'true';

    // List keys
    const keys = await apiKeyService.listKeys(session.userId, includeRevoked);

    return NextResponse.json({
      success: true,
      keys,
      total: keys.length,
    });
  } catch (error) {
    console.error('[API_KEYS_GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to list API keys', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
