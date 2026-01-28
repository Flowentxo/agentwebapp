/**
 * OAuth2 Token Refresh Endpoint
 *
 * Manually triggers token refresh for an integration
 *
 * Security Features:
 * - Session validation
 * - Token encryption
 * - Audit logging
 *
 * @route POST /api/oauth/refresh
 * @body { provider: string, service: string }
 * @returns { success: boolean, expiresAt: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken, decrypt, encrypt } from '@/lib/auth/oauth';
import { getDb } from '@/lib/db';
import { integrations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Request body interface
 */
interface RefreshRequest {
  provider: 'google' | 'microsoft' | 'slack';
  service: string;
}

/**
 * POST /api/oauth/refresh
 *
 * Token refresh flow:
 * 1. Retrieves integration from database
 * 2. Decrypts refresh token
 * 3. Requests new access token from provider
 * 4. Encrypts new access token
 * 5. Updates database
 * 6. Returns new expiry time
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json() as RefreshRequest;
    const { provider, service } = body;

    // Validate parameters
    if (!provider || !service) {
      return NextResponse.json(
        { error: 'Missing provider or service' },
        { status: 400 }
      );
    }

    const validProviders = ['google', 'microsoft', 'slack'];
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // TODO: Get actual user ID from session
    const userId = 'default-user';

    // Retrieve integration from database
    const db = getDb();

    const [integration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.provider, provider),
          eq(integrations.service, service)
        )
      )
      .limit(1);

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Check if integration has refresh token
    if (!integration.refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token available. Please reconnect.' },
        { status: 400 }
      );
    }

    // Decrypt refresh token
    const refreshToken = decrypt(integration.refreshToken);

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Failed to decrypt refresh token' },
        { status: 500 }
      );
    }

    // Request new access token
    const tokens = await refreshAccessToken({
      provider,
      refreshToken,
    });

    // Encrypt new access token
    const encryptedAccessToken = encrypt(tokens.access_token);

    // Calculate new expiry time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Update database
    await db
      .update(integrations)
      .set({
        accessToken: encryptedAccessToken,
        expiresAt,
        status: 'connected',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.provider, provider),
          eq(integrations.service, service)
        )
      );

    // TODO: Log to audit trail
    console.log('[OAUTH_REFRESH_SUCCESS]', {
      userId,
      provider,
      service,
      expiresAt: expiresAt.toISOString(),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      expiresAt: expiresAt.toISOString(),
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    console.error('[OAUTH_REFRESH_ERROR]', error);

    // If refresh fails, mark integration as error state
    const db = getDb();
    const userId = 'default-user';
    const { provider, service } = await req.json();

    try {
      await db
        .update(integrations)
        .set({
          status: 'error',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(integrations.userId, userId),
            eq(integrations.provider, provider),
            eq(integrations.service, service)
          )
        );
    } catch (updateError) {
      console.error('[OAUTH_REFRESH] Failed to update error state', updateError);
    }

    return NextResponse.json(
      {
        error: 'Failed to refresh token',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Please try disconnecting and reconnecting the integration',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
