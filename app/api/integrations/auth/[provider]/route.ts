/**
 * OAuth Authorization Endpoint
 * GET /api/integrations/auth/[provider]
 *
 * Redirects user to provider's OAuth consent screen
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { buildAuthorizationUrl } from '@/lib/integrations/providers/oauth-service';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api:integrations:auth');

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const provider = params.provider;
    const searchParams = request.nextUrl.searchParams;

    // Get user from session/cookie
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('session');

    // For demo, use a default workspace/user
    const userId = 'demo-user';
    const workspaceId = 'demo-workspace';

    // Optional parameters
    const returnUrl = searchParams.get('returnUrl') || '/settings/integrations';
    const additionalScopes = searchParams.get('scopes')?.split(',').filter(Boolean);

    logger.info(`[${provider}] Starting OAuth flow for user ${userId}`);

    // Build authorization URL
    const { url, state, codeVerifier } = await buildAuthorizationUrl(provider, userId, {
      returnUrl,
      additionalScopes,
    });

    // Store code verifier in cookie for PKCE (if used)
    if (codeVerifier) {
      const response = NextResponse.redirect(url);
      response.cookies.set(`oauth_verifier_${provider}`, codeVerifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
        path: '/',
      });

      // Also store workspace ID for callback
      response.cookies.set('oauth_workspace', workspaceId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600,
        path: '/',
      });

      logger.info(`[${provider}] Redirecting to OAuth consent screen (with PKCE)`);
      return response;
    }

    // Without PKCE, just set workspace cookie and redirect
    const response = NextResponse.redirect(url);
    response.cookies.set('oauth_workspace', workspaceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });

    logger.info(`[${provider}] Redirecting to OAuth consent screen`);
    return response;
  } catch (error) {
    logger.error('OAuth authorization error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const returnUrl = request.nextUrl.searchParams.get('returnUrl') || '/settings/integrations';

    return NextResponse.redirect(
      new URL(`${returnUrl}?error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
