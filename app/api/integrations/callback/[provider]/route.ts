/**
 * OAuth Callback Endpoint
 * GET /api/integrations/callback/[provider]
 *
 * Handles OAuth callback, exchanges code for tokens, stores encrypted
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  exchangeCodeForTokens,
  fetchUserProfile,
  parseOAuthState,
  validateOAuthState,
} from '@/lib/integrations/providers/oauth-service';
import { integrationService } from '@/server/services/integrations/IntegrationService';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api:integrations:callback');

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const provider = params.provider;
  const searchParams = request.nextUrl.searchParams;

  // Get OAuth params
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Default redirect
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let returnUrl = '/settings/integrations';

  try {
    // Handle OAuth error
    if (error) {
      logger.error(`[${provider}] OAuth error: ${error} - ${errorDescription}`);
      return NextResponse.redirect(
        new URL(`${returnUrl}?error=${encodeURIComponent(errorDescription || error)}`, baseUrl)
      );
    }

    // Validate required params
    if (!code || !state) {
      logger.error(`[${provider}] Missing code or state`);
      return NextResponse.redirect(
        new URL(`${returnUrl}?error=Missing+authorization+code`, baseUrl)
      );
    }

    // Parse and validate state
    let stateData;
    try {
      stateData = parseOAuthState(state);
      if (!validateOAuthState(stateData)) {
        throw new Error('State expired');
      }
    } catch (stateError) {
      logger.error(`[${provider}] Invalid state:`, stateError);
      return NextResponse.redirect(
        new URL(`${returnUrl}?error=Invalid+or+expired+state`, baseUrl)
      );
    }

    // Get return URL from state
    if (stateData.returnUrl) {
      returnUrl = stateData.returnUrl;
    }

    // Get code verifier from cookie (for PKCE)
    const cookieStore = cookies();
    const codeVerifier = cookieStore.get(`oauth_verifier_${provider}`)?.value;
    const workspaceId = cookieStore.get('oauth_workspace')?.value || 'demo-workspace';

    logger.info(`[${provider}] Exchanging code for tokens...`);

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(provider, code, codeVerifier);

    logger.info(`[${provider}] Tokens received, fetching user profile...`);

    // Fetch user profile
    let userInfo = { id: '', email: '', name: '' };
    try {
      userInfo = await fetchUserProfile(provider, tokens.accessToken);
      logger.info(`[${provider}] User profile: ${userInfo.email || userInfo.name}`);
    } catch (profileError) {
      logger.warn(`[${provider}] Could not fetch user profile:`, profileError);
      // Continue without profile - we still have the tokens
    }

    // Parse scopes from token response
    const scopes = tokens.scope?.split(' ') || [];

    // Store connection with encrypted tokens
    const connectionId = await integrationService.createConnection(
      workspaceId,
      provider,
      tokens,
      userInfo,
      scopes
    );

    logger.info(`[${provider}] Connection created: ${connectionId}`);

    // Build success redirect
    const successUrl = new URL(returnUrl, baseUrl);
    successUrl.searchParams.set('success', 'true');
    successUrl.searchParams.set('provider', provider);
    if (userInfo.email) {
      successUrl.searchParams.set('account', userInfo.email);
    }

    // Clear OAuth cookies
    const response = NextResponse.redirect(successUrl);
    response.cookies.delete(`oauth_verifier_${provider}`);
    response.cookies.delete('oauth_workspace');

    return response;
  } catch (error) {
    logger.error(`[${provider}] Callback error:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Connection failed';
    return NextResponse.redirect(
      new URL(`${returnUrl}?error=${encodeURIComponent(errorMessage)}`, baseUrl)
    );
  }
}
