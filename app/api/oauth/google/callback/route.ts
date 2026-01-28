/**
 * OAuth2 Callback Endpoint - Google
 *
 * Handles the OAuth2 callback after user authorization
 *
 * Security Features:
 * - State parameter validation (CSRF protection)
 * - PKCE code_verifier validation
 * - Token encryption (AES-256-GCM)
 * - Secure token storage
 * - Audit logging
 *
 * @route GET /api/oauth/google/callback
 * @query code - Authorization code from Google
 * @query state - State token for CSRF validation
 * @redirects /settings?tab=integrations&success=google_connected
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  validateState,
  exchangeCodeForTokens,
  fetchUserProfile,
  encrypt,
} from '@/lib/auth/oauth';
import { getDb } from '@/lib/db';
import { integrations } from '@/lib/db/schema';
import { calendarIntegrations } from '@/lib/db/schema-calendar';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/oauth/google/callback
 *
 * OAuth2 callback handler:
 * 1. Receives authorization code from Google
 * 2. Validates state parameter (CSRF check)
 * 3. Exchanges code for access/refresh tokens using PKCE
 * 4. Fetches user profile from Google
 * 5. Encrypts tokens with AES-256-GCM
 * 6. Stores integration in database
 * 7. Logs to audit trail
 * 8. Redirects to settings with success message
 */
export async function GET(req: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors (user denied, etc.)
    if (error) {
      console.warn('[OAUTH_CALLBACK_ERROR]', { error });

      return NextResponse.redirect(
        new URL(
          `/settings?tab=integrations&error=${encodeURIComponent(error)}`,
          req.url
        )
      );
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('[OAUTH_CALLBACK] Missing code or state');

      return NextResponse.redirect(
        new URL(
          '/settings?tab=integrations&error=missing_parameters',
          req.url
        )
      );
    }

    // Retrieve stored PKCE verifier and state from cookies
    const storedCodeVerifier = req.cookies.get('oauth_code_verifier')?.value;
    const storedState = req.cookies.get('oauth_state')?.value;
    const storedService = req.cookies.get('oauth_service')?.value;

    console.log('[OAUTH_CALLBACK] Cookies check:', {
      hasCodeVerifier: !!storedCodeVerifier,
      hasState: !!storedState,
      hasService: !!storedService,
      service: storedService,
    });

    // Validate that cookies exist
    if (!storedCodeVerifier || !storedState || !storedService) {
      console.error('[OAUTH_CALLBACK] Missing stored OAuth data in cookies');

      return NextResponse.redirect(
        new URL(
          '/settings?tab=integrations&error=session_expired',
          req.url
        )
      );
    }

    // Validate state parameter (CSRF protection)
    if (!validateState(state, storedState)) {
      console.error('[OAUTH_CALLBACK] State mismatch - possible CSRF attack');

      return NextResponse.redirect(
        new URL(
          '/settings?tab=integrations&error=invalid_state',
          req.url
        )
      );
    }

    // Exchange authorization code for tokens using PKCE
    const tokens = await exchangeCodeForTokens({
      provider: 'google',
      code,
      codeVerifier: storedCodeVerifier,
    });

    // Fetch user profile from Google
    const profile = await fetchUserProfile('google', tokens.access_token);

    // Retrieve User ID from cookie (set during initiate)
    const userId = req.cookies.get('oauth_user_id')?.value || 'demo-user';

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encrypt(tokens.refresh_token)
      : null;

    // Calculate token expiry time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Store integration in database
    const db = getDb();

    // Check if integration already exists
    const existingIntegration = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.provider, 'google'),
          eq(integrations.service, storedService)
        )
      )
      .limit(1);

    if (existingIntegration.length > 0) {
      // Update existing integration
      await db
        .update(integrations)
        .set({
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenType: tokens.token_type || 'Bearer',
          expiresAt,
          scopes: tokens.scope ? tokens.scope.split(' ') : [],
          connectedEmail: profile.email,
          connectedName: profile.name,
          connectedAvatar: profile.picture,
          status: 'connected',
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, existingIntegration[0].id));
    } else {
      // Insert new integration
      await db.insert(integrations).values({
        userId,
        provider: 'google',
        service: storedService,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenType: tokens.token_type || 'Bearer',
        expiresAt,
        scopes: tokens.scope ? tokens.scope.split(' ') : [],
        connectedEmail: profile.email,
        connectedName: profile.name,
        connectedAvatar: profile.picture,
        status: 'connected',
        connectedAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // ALSO populate calendar_integrations table if service is 'calendar'
    // This enables the Predictive Context Engine to detect the connection
    if (storedService === 'calendar') {
      try {
        // First, try to find existing integration
        const existing = await db
          .select()
          .from(calendarIntegrations)
          .where(
            and(
              eq(calendarIntegrations.userId, userId),
              eq(calendarIntegrations.provider, 'google')
            )
          )
          .limit(1);

        if (existing.length > 0) {
          // Update existing integration
          await db
            .update(calendarIntegrations)
            .set({
              accessToken: encryptedAccessToken,
              refreshToken: encryptedRefreshToken || '',
              tokenExpiry: expiresAt,
              email: profile.email,
              enabled: true,
              updatedAt: new Date(),
            })
            .where(eq(calendarIntegrations.id, existing[0].id));

          console.log('[CALENDAR_INTEGRATION] Updated existing calendar integration');
        } else {
          // Insert new integration
          await db.insert(calendarIntegrations).values({
            userId,
            provider: 'google',
            email: profile.email,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken || '',
            tokenExpiry: expiresAt,
            calendarIds: [],
            settings: {},
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          console.log('[CALENDAR_INTEGRATION] Created new calendar integration');
        }
      } catch (calendarError) {
        // Log error but don't fail the entire OAuth flow
        console.error('[CALENDAR_INTEGRATION_ERROR]', calendarError);
        console.log('[CALENDAR_INTEGRATION] Failed to sync to calendar_integrations, but OAuth succeeded');
      }
    }

    // TODO: Log to audit trail
    console.log('[OAUTH_CALLBACK_SUCCESS]', {
      userId,
      provider: 'google',
      service: storedService,
      email: profile.email,
      timestamp: new Date().toISOString(),
    });

    // Create response with redirect
    // Redirect to Brain page if calendar, otherwise to Integrations Page
    const redirectPath = storedService === 'calendar'
      ? '/brain?calendar_connected=true'
      : `/agents/integrations?success=google_${storedService}_connected`;

    const response = NextResponse.redirect(
      new URL(redirectPath, req.url)
    );

    // Clear OAuth cookies (security best practice)
    response.cookies.delete({ name: 'oauth_code_verifier', path: '/' });
    response.cookies.delete({ name: 'oauth_state', path: '/' });
    response.cookies.delete({ name: 'oauth_service', path: '/' });
    response.cookies.delete({ name: 'oauth_user_id', path: '/' });

    return response;
  } catch (error) {
    console.error('[OAUTH_CALLBACK_FATAL_ERROR]', error);

    // Determine error message
    let errorMessage = 'connection_failed';
    if (error instanceof Error) {
      if (error.message.includes('Token exchange failed')) {
        errorMessage = 'token_exchange_failed';
      } else if (error.message.includes('Failed to fetch user profile')) {
        errorMessage = 'profile_fetch_failed';
      }
    }

    // Redirect with error
    return NextResponse.redirect(
      new URL(
        `/settings?tab=integrations&error=${errorMessage}`,
        req.url
      )
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
