/**
 * HUBSPOT OAUTH - CALLBACK
 *
 * GET /api/oauth/hubspot/callback?code=xxx&state=userId
 *
 * Exchanges authorization code for access token and stores in database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { oauthConnections, revolutionIntegrations } from '@/lib/db/schema-revolution';
import { eq, and } from 'drizzle-orm';
import { registerDefaultWebhooks } from '@/lib/services/hubspot-webhook-service';

export const dynamic = 'force-dynamic';

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;
const HUBSPOT_REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI || 'http://localhost:3000/api/oauth/hubspot/callback';

interface HubSpotTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface HubSpotUserInfo {
  user_id: string;
  user: string;
  hub_id: string;
  hub_domain: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // userId
    const error = searchParams.get('error');

    // Check for authorization errors
    if (error) {
      console.error(`[HUBSPOT_OAUTH] Authorization denied: ${error}`);
      return NextResponse.redirect(
        `http://localhost:3000/revolution?error=hubspot_oauth_denied&message=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        {
          error: 'Invalid callback',
          message: 'Missing code or state parameter',
        },
        { status: 400 }
      );
    }

    const userId = state;

    if (!HUBSPOT_CLIENT_ID || !HUBSPOT_CLIENT_SECRET) {
      console.error('[HUBSPOT_OAUTH] Missing client credentials');
      return NextResponse.json(
        {
          error: 'OAuth not configured',
          message: 'HubSpot OAuth credentials are not configured',
        },
        { status: 500 }
      );
    }

    console.log(`[HUBSPOT_OAUTH] Processing callback for user: ${userId}`);

    // Exchange code for tokens
    const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: HUBSPOT_CLIENT_ID,
        client_secret: HUBSPOT_CLIENT_SECRET,
        redirect_uri: HUBSPOT_REDIRECT_URI,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('[HUBSPOT_OAUTH] Token exchange failed:', errorData);
      return NextResponse.json(
        {
          error: 'Token exchange failed',
          message: errorData.message || 'Failed to exchange authorization code',
        },
        { status: 400 }
      );
    }

    const tokenData: HubSpotTokenResponse = await tokenResponse.json();

    console.log('[HUBSPOT_OAUTH] Token exchange successful');

    // Get user info from HubSpot
    const userInfoResponse = await fetch('https://api.hubapi.com/oauth/v1/access-tokens/' + tokenData.access_token);

    let userInfo: HubSpotUserInfo | null = null;

    if (userInfoResponse.ok) {
      userInfo = await userInfoResponse.json();
      console.log(`[HUBSPOT_OAUTH] Connected to HubSpot portal: ${userInfo.hub_id}`);
    }

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Get HubSpot integration ID
    const db = getDb();
    const [hubspotIntegration] = await db
      .select()
      .from(revolutionIntegrations)
      .where(eq(revolutionIntegrations.slug, 'hubspot'))
      .limit(1);

    // Check if connection already exists
    const existingConnection = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.userId, userId),
          eq(oauthConnections.provider, 'hubspot'),
          eq(oauthConnections.providerAccountId, userInfo?.hub_id || 'unknown')
        )
      )
      .limit(1);

    if (existingConnection.length > 0) {
      // Update existing connection
      await db
        .update(oauthConnections)
        .set({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenType: tokenData.token_type,
          expiresAt,
          scope: searchParams.get('scope') || '',
          providerData: userInfo || {},
          isActive: true,
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(oauthConnections.id, existingConnection[0].id));

      console.log(`[HUBSPOT_OAUTH] Updated existing connection for user: ${userId}`);
    } else {
      // Create new connection
      await db.insert(oauthConnections).values({
        userId,
        integrationId: hubspotIntegration?.id || null,
        provider: 'hubspot',
        providerAccountId: userInfo?.hub_id || 'unknown',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type,
        expiresAt,
        scope: searchParams.get('scope') || '',
        providerData: userInfo || {},
        isActive: true,
      });

      console.log(`[HUBSPOT_OAUTH] Created new connection for user: ${userId}`);
    }

    // Register default webhooks
    if (userInfo?.hub_id) {
      try {
        console.log(`[HUBSPOT_OAUTH] Registering default webhooks for portal: ${userInfo.hub_id}`);
        await registerDefaultWebhooks(userId, userInfo.hub_id, tokenData.access_token);
        console.log(`[HUBSPOT_OAUTH] ✅ Webhooks registered successfully`);
      } catch (webhookError: any) {
        console.error('[HUBSPOT_OAUTH] Failed to register webhooks:', webhookError);
        // Don't fail the OAuth flow if webhook registration fails
      }
    }

    // Redirect to success page
    return NextResponse.redirect(
      `http://localhost:3000/revolution?hubspot=connected&portal=${userInfo?.hub_id || 'unknown'}`
    );
  } catch (error: any) {
    console.error('[HUBSPOT_OAUTH] Callback error:', error);
    return NextResponse.redirect(
      `http://localhost:3000/revolution?error=hubspot_oauth_failed&message=${encodeURIComponent(error.message)}`
    );
  }
}
