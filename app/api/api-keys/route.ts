/**
 * API Keys Management Endpoints
 *
 * POST   /api/api-keys          - Create new API key
 * GET    /api/api-keys          - List all API keys for user
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createApiKey,
  listApiKeys,
  type CreateApiKeyParams,
} from '@/lib/auth/api-key-service';
import { API_SCOPES, SCOPE_GROUPS } from '@/lib/db/schema-api-keys';
import { getSessionUser } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Validation schema for creating API key
 */
const createApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  scopes: z.array(z.string()).min(1).max(50),
  environment: z.enum(['production', 'development', 'test']).default('production'),
  description: z.string().max(1000).optional(),
  expiresInDays: z.number().min(1).max(365).optional(),
  ipWhitelist: z.array(z.string().ip()).optional(),
  rateLimit: z.number().min(1).max(10000).default(1000),
});

/**
 * POST /api/api-keys - Create new API key
 */
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user from session
    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to create API keys' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = createApiKeySchema.parse(body);

    // Validate scopes
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

    // Calculate expiration date if provided
    const expiresAt = validatedData.expiresInDays
      ? new Date(Date.now() + validatedData.expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    // Create API key
    const params: CreateApiKeyParams = {
      name: validatedData.name,
      userId: user.id,
      createdBy: user.id,
      scopes: validatedData.scopes as any,
      environment: validatedData.environment,
      description: validatedData.description,
      expiresAt,
      ipWhitelist: validatedData.ipWhitelist,
      rateLimit: validatedData.rateLimit,
    };

    const apiKey = await createApiKey(params);

    return NextResponse.json(
      {
        success: true,
        message: '⚠️ IMPORTANT: Save this API key now. You won\'t be able to see it again!',
        data: {
          id: apiKey.id,
          name: apiKey.name,
          secret: apiKey.secret, // ⚠️ Only shown once!
          prefix: apiKey.prefix,
          scopes: apiKey.scopes,
          environment: apiKey.environment,
          expiresAt: apiKey.expiresAt,
          createdAt: apiKey.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API_KEYS_POST]', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create API key' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/api-keys - List all API keys for user
 */
export async function GET(req: NextRequest) {
  try {
    // Get authenticated user from session
    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to view API keys' },
        { status: 401 }
      );
    }

    // List API keys (secrets are never returned)
    const keys = await listApiKeys(user.id);

    // Remove sensitive data
    const sanitizedKeys = keys.map((key) => ({
      id: key.id,
      name: key.name,
      prefix: key.keyPrefix,
      scopes: key.scopes,
      environment: key.environment,
      isActive: key.isActive,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      usageCount: key.usageCount,
      description: key.description,
      rateLimit: key.rateLimit,
      createdAt: key.createdAt,
      revokedAt: key.revokedAt,
      revokedReason: key.revokedReason,
    }));

    return NextResponse.json({
      success: true,
      data: sanitizedKeys,
      meta: {
        total: sanitizedKeys.length,
        active: sanitizedKeys.filter((k) => k.isActive).length,
      },
    });
  } catch (error) {
    console.error('[API_KEYS_GET]', error);

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
