/**
 * Universal OAuth Callback Endpoint
 * GET /api/oauth/[provider]/callback
 *
 * Handles OAuth callback for all providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  exchangeCodeForTokens,
  fetchUserProfile,
  parseOAuthState,
  validateOAuthState,
} from '@/lib/integrations/providers/oauth-service';
import { getProviderConfig } from '@/lib/integrations/providers/provider-config';
import { upsertIntegration } from '@/lib/integrations/providers/integration-repository';

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const provider = params.provider;
  const searchParams = request.nextUrl.searchParams;

  // Get authorization code and state
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error(`[OAUTH_CALLBACK] ${provider} error:`, error, errorDescription);
    return redirectWithError(provider, `OAuth error: ${error} - ${errorDescription || 'Unknown error'}`);
  }

  if (!code || !state) {
    return redirectWithError(provider, 'Missing authorization code or state');
  }

  try {
    // Get provider config
    const config = getProviderConfig(provider);
    if (!config) {
      return redirectWithError(provider, 'Unknown provider');
    }

    // Validate state
    const cookieStore = cookies();
    const storedState = cookieStore.get(`oauth_state_${provider}`)?.value;
    const codeVerifier = cookieStore.get(`oauth_verifier_${provider}`)?.value;

    if (!storedState || state !== storedState) {
      console.error(`[OAUTH_CALLBACK] State mismatch for ${provider}`);
      return redirectWithError(provider, 'Invalid state parameter (CSRF protection)');
    }

    // Parse state to get user info
    let stateData;
    try {
      stateData = parseOAuthState(state);
    } catch {
      return redirectWithError(provider, 'Invalid state format');
    }

    // Validate state age
    if (!validateOAuthState(stateData)) {
      return redirectWithError(provider, 'Authorization request expired');
    }

    // Exchange code for tokens
    console.log(`[OAUTH_CALLBACK] Exchanging code for ${provider}...`);
    const tokens = await exchangeCodeForTokens(provider, code, codeVerifier);
    console.log(`[OAUTH_CALLBACK] Got tokens for ${provider}`);

    // Fetch user profile if provider supports it
    let userInfo;
    if (config.userInfoUrl) {
      try {
        userInfo = await fetchUserProfile(provider, tokens.accessToken);
        console.log(`[OAUTH_CALLBACK] Got user info for ${provider}:`, userInfo.email);
      } catch (profileError) {
        console.warn(`[OAUTH_CALLBACK] Could not fetch user profile for ${provider}:`, profileError);
        // Continue without user info
      }
    }

    // Extract additional metadata from token response
    const metadata: Record<string, unknown> = {
      connectedAt: new Date().toISOString(),
    };

    // Provider-specific metadata extraction
    if (provider === 'hubspot' && tokens.rawResponse) {
      metadata.hubId = tokens.rawResponse.hub_id;
      metadata.hubDomain = tokens.rawResponse.hub_domain;
    }

    if (provider === 'salesforce' && tokens.rawResponse) {
      metadata.instanceUrl = tokens.rawResponse.instance_url;
      metadata.orgId = tokens.rawResponse.id;
    }

    if (provider === 'stripe' && tokens.rawResponse) {
      metadata.stripeUserId = tokens.rawResponse.stripe_user_id;
      metadata.livemode = tokens.rawResponse.livemode;
    }

    if (provider === 'quickbooks' && tokens.rawResponse) {
      metadata.realmId = tokens.rawResponse.realmId;
    }

    if (provider === 'strava' && tokens.rawResponse) {
      const athlete = tokens.rawResponse.athlete as Record<string, unknown>;
      if (athlete) {
        metadata.athleteId = athlete.id;
        userInfo = userInfo || {
          id: athlete.id?.toString() || '',
          email: '',
          name: `${athlete.firstname || ''} ${athlete.lastname || ''}`.trim(),
          picture: athlete.profile as string,
        };
      }
    }

    if (provider === 'notion' && tokens.rawResponse) {
      metadata.workspaceId = tokens.rawResponse.workspace_id;
      metadata.workspaceName = tokens.rawResponse.workspace_name;
      metadata.workspaceIcon = tokens.rawResponse.workspace_icon;
      metadata.botId = tokens.rawResponse.bot_id;
    }

    if (provider === 'slack' && tokens.rawResponse) {
      const team = tokens.rawResponse.team as Record<string, unknown>;
      if (team) {
        metadata.teamId = team.id;
        metadata.teamName = team.name;
      }
    }

    // Store integration
    const service = stateData.service || 'default';
    await upsertIntegration({
      userId: stateData.userId,
      provider,
      service,
      tokens,
      userInfo,
      metadata,
    });

    console.log(`[OAUTH_CALLBACK] Integration saved for ${provider}/${service}`);

    // Clear OAuth cookies
    cookieStore.delete(`oauth_state_${provider}`);
    cookieStore.delete(`oauth_verifier_${provider}`);

    // Redirect to success page
    const returnUrl = stateData.returnUrl || '/agents/integrations';
    const successUrl = new URL(returnUrl, request.nextUrl.origin);
    successUrl.searchParams.set('connected', provider);
    if (userInfo?.email) {
      successUrl.searchParams.set('email', userInfo.email);
    }

    return NextResponse.redirect(successUrl);
  } catch (error: any) {
    console.error(`[OAUTH_CALLBACK] ${provider} error:`, error);

    // Clear cookies on error
    const cookieStore = cookies();
    cookieStore.delete(`oauth_state_${provider}`);
    cookieStore.delete(`oauth_verifier_${provider}`);

    return redirectWithError(provider, error.message || 'Connection failed');
  }
}

function redirectWithError(provider: string, message: string): NextResponse {
  const errorUrl = new URL('/agents/integrations', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  errorUrl.searchParams.set('error', 'connection_failed');
  errorUrl.searchParams.set('provider', provider);
  errorUrl.searchParams.set('message', message);

  return NextResponse.redirect(errorUrl);
}
