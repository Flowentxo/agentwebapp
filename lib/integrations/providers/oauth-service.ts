/**
 * Universal OAuth Service
 * Handles OAuth2 flows for all providers
 */

import crypto from 'crypto';
import { getProviderConfig, ProviderConfig, getRedirectUri, buildGoogleScopes } from './provider-config';
import { encrypt, decrypt, generateCodeVerifier, generateCodeChallenge, generateState } from '@/lib/auth/oauth';

export interface OAuthState {
  provider: string;
  userId: string;
  service?: string;
  returnUrl?: string;
  timestamp: number;
}

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: string;
  scope?: string;
  rawResponse?: Record<string, unknown>;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  rawData?: Record<string, unknown>;
}

/**
 * Build OAuth2 authorization URL for any provider
 */
export async function buildAuthorizationUrl(
  providerId: string,
  userId: string,
  options: {
    service?: string;
    additionalScopes?: string[];
    returnUrl?: string;
  } = {}
): Promise<{ url: string; state: string; codeVerifier?: string }> {
  const config = getProviderConfig(providerId);
  if (!config) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  if (config.authType !== 'oauth2') {
    throw new Error(`Provider ${providerId} does not support OAuth2`);
  }

  const clientId = process.env[config.clientIdEnv];
  if (!clientId) {
    throw new Error(`Missing ${config.clientIdEnv} environment variable`);
  }

  // Generate state with provider info
  const stateData: OAuthState = {
    provider: providerId,
    userId,
    service: options.service,
    returnUrl: options.returnUrl,
    timestamp: Date.now(),
  };
  const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

  // Build scopes
  let scopes = [...config.defaultScopes];
  if (options.additionalScopes) {
    scopes = [...scopes, ...options.additionalScopes];
  }

  // Handle Google-specific scope prefixing
  if (providerId.startsWith('google') || ['gmail', 'youtube'].includes(providerId)) {
    scopes = scopes.map(scope => {
      if (scope.startsWith('https://') || scope === 'openid' || scope === 'profile' || scope === 'email') {
        return scope;
      }
      return `https://www.googleapis.com/auth/${scope}`;
    });
  }

  // Build URL params
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(providerId),
    response_type: 'code',
    scope: scopes.join(' '),
    state,
  });

  // Add PKCE if supported
  let codeVerifier: string | undefined;
  if (config.supportsPKCE) {
    codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    params.set('code_challenge', codeChallenge);
    params.set('code_challenge_method', 'S256');
  }

  // Add provider-specific params
  if (config.additionalAuthParams) {
    Object.entries(config.additionalAuthParams).forEach(([key, value]) => {
      params.set(key, value);
    });
  }

  // Special handling for specific providers
  if (providerId === 'twitter') {
    // Twitter requires additional params
    params.set('code_challenge_method', 'S256');
  }

  if (providerId === 'linkedin') {
    // LinkedIn uses response_type differently
    params.set('response_type', 'code');
  }

  const url = `${config.authUrl}?${params.toString()}`;

  return { url, state, codeVerifier };
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  providerId: string,
  code: string,
  codeVerifier?: string
): Promise<TokenData> {
  const config = getProviderConfig(providerId);
  if (!config || !config.tokenUrl) {
    throw new Error(`Invalid provider or missing token URL: ${providerId}`);
  }

  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];

  if (!clientId) {
    throw new Error(`Missing ${config.clientIdEnv}`);
  }

  // Build token request body
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(providerId),
    client_id: clientId,
  });

  // Add client secret if required
  if (clientSecret && config.tokenExchangeMethod !== 'basic_auth') {
    body.set('client_secret', clientSecret);
  }

  // Add PKCE verifier if provided
  if (codeVerifier) {
    body.set('code_verifier', codeVerifier);
  }

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  };

  // Use Basic Auth if required
  if (config.tokenExchangeMethod === 'basic_auth' && clientSecret) {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }

  // Special handling for Notion
  if (providerId === 'notion') {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
    headers['Notion-Version'] = '2022-06-28';
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[OAUTH_TOKEN_ERROR] ${providerId}:`, errorText);
    throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Parse response (different providers have different formats)
  const expiresIn = data.expires_in || data.expires || 3600;
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
    tokenType: data.token_type || 'Bearer',
    scope: data.scope,
    rawResponse: data,
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  providerId: string,
  refreshToken: string
): Promise<TokenData> {
  const config = getProviderConfig(providerId);
  if (!config || !config.tokenUrl) {
    throw new Error(`Invalid provider: ${providerId}`);
  }

  if (!config.supportsRefreshToken) {
    throw new Error(`Provider ${providerId} does not support refresh tokens`);
  }

  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];

  if (!clientId) {
    throw new Error(`Missing ${config.clientIdEnv}`);
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  });

  if (clientSecret && config.tokenExchangeMethod !== 'basic_auth') {
    body.set('client_secret', clientSecret);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  };

  if (config.tokenExchangeMethod === 'basic_auth' && clientSecret) {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[OAUTH_REFRESH_ERROR] ${providerId}:`, errorText);
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data = await response.json();
  const expiresIn = data.expires_in || 3600;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken, // Some providers don't return new refresh token
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    tokenType: data.token_type || 'Bearer',
    scope: data.scope,
    rawResponse: data,
  };
}

/**
 * Revoke OAuth token
 */
export async function revokeToken(
  providerId: string,
  token: string
): Promise<void> {
  const config = getProviderConfig(providerId);
  if (!config || !config.revokeUrl) {
    console.warn(`[OAUTH] No revoke URL for ${providerId}`);
    return;
  }

  const body = new URLSearchParams({ token });

  try {
    const response = await fetch(config.revokeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      console.warn(`[OAUTH] Revoke warning for ${providerId}: ${response.status}`);
    }
  } catch (error) {
    console.error(`[OAUTH_REVOKE_ERROR] ${providerId}:`, error);
  }
}

/**
 * Fetch user profile from provider
 */
export async function fetchUserProfile(
  providerId: string,
  accessToken: string
): Promise<UserInfo> {
  const config = getProviderConfig(providerId);
  if (!config || !config.userInfoUrl) {
    throw new Error(`No user info URL for ${providerId}`);
  }

  let url = config.userInfoUrl;
  let headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  };

  // Provider-specific handling
  if (providerId === 'facebook') {
    url = `${config.userInfoUrl}?fields=id,name,email,picture&access_token=${accessToken}`;
    delete headers['Authorization'];
  }

  if (providerId === 'notion') {
    headers['Notion-Version'] = '2022-06-28';
  }

  if (providerId === 'slack') {
    // Slack uses a different format
    url = `${config.userInfoUrl}?token=${accessToken}`;
    delete headers['Authorization'];
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: ${response.status}`);
  }

  const data = await response.json();

  // Normalize response based on provider
  return normalizeUserProfile(providerId, data);
}

/**
 * Normalize user profile across different provider formats
 */
function normalizeUserProfile(providerId: string, data: Record<string, unknown>): UserInfo {
  // Google (includes Gmail, Calendar, Drive, Analytics, YouTube)
  if (providerId.startsWith('google') || ['gmail', 'youtube'].includes(providerId)) {
    return {
      id: data.sub as string || data.id as string,
      email: data.email as string,
      name: data.name as string,
      picture: data.picture as string,
      rawData: data,
    };
  }

  // Microsoft (Outlook, Calendar)
  if (providerId.startsWith('outlook') || providerId === 'outlook') {
    return {
      id: data.id as string,
      email: (data.userPrincipalName || data.mail) as string,
      name: data.displayName as string,
      picture: undefined,
      rawData: data,
    };
  }

  // LinkedIn
  if (providerId === 'linkedin') {
    return {
      id: data.sub as string,
      email: data.email as string,
      name: data.name as string,
      picture: data.picture as string,
      rawData: data,
    };
  }

  // Facebook
  if (providerId === 'facebook') {
    const picture = data.picture as Record<string, { url: string }>;
    return {
      id: data.id as string,
      email: data.email as string,
      name: data.name as string,
      picture: picture?.data?.url,
      rawData: data,
    };
  }

  // Instagram
  if (providerId === 'instagram') {
    return {
      id: data.id as string,
      email: '', // Instagram doesn't provide email
      name: data.username as string,
      picture: undefined,
      rawData: data,
    };
  }

  // Twitter
  if (providerId === 'twitter') {
    const twitterData = data.data as Record<string, unknown>;
    return {
      id: twitterData?.id as string || data.id as string,
      email: '', // Twitter may not provide email
      name: twitterData?.name as string || data.name as string,
      picture: twitterData?.profile_image_url as string,
      rawData: data,
    };
  }

  // TikTok
  if (providerId === 'tiktok') {
    const tiktokData = data.data as Record<string, { user: Record<string, unknown> }>;
    const user = tiktokData?.user;
    return {
      id: user?.open_id as string,
      email: '', // TikTok doesn't provide email by default
      name: user?.display_name as string,
      picture: user?.avatar_url as string,
      rawData: data,
    };
  }

  // Slack
  if (providerId === 'slack') {
    const user = data.user as Record<string, unknown>;
    return {
      id: user?.id as string,
      email: user?.email as string,
      name: user?.name as string,
      picture: user?.image_192 as string,
      rawData: data,
    };
  }

  // HubSpot
  if (providerId === 'hubspot') {
    return {
      id: data.hub_id as string || data.user_id as string,
      email: data.user as string,
      name: data.hub_domain as string,
      rawData: data,
    };
  }

  // Salesforce
  if (providerId === 'salesforce') {
    return {
      id: data.user_id as string,
      email: data.email as string,
      name: data.name as string,
      picture: data.photos?.picture as string,
      rawData: data,
    };
  }

  // Stripe (Connect)
  if (providerId === 'stripe') {
    return {
      id: data.stripe_user_id as string,
      email: '', // Stripe Connect doesn't return email in token response
      name: data.stripe_user_id as string,
      rawData: data,
    };
  }

  // QuickBooks
  if (providerId === 'quickbooks') {
    return {
      id: data.sub as string,
      email: data.email as string,
      name: `${data.givenName || ''} ${data.familyName || ''}`.trim(),
      picture: undefined,
      rawData: data,
    };
  }

  // Strava
  if (providerId === 'strava') {
    const athlete = data.athlete as Record<string, unknown>;
    return {
      id: athlete?.id?.toString() || data.id as string,
      email: athlete?.email as string || '',
      name: `${athlete?.firstname || ''} ${athlete?.lastname || ''}`.trim(),
      picture: athlete?.profile as string,
      rawData: data,
    };
  }

  // Fitbit
  if (providerId === 'fitbit') {
    const user = data.user as Record<string, unknown>;
    return {
      id: user?.encodedId as string,
      email: '', // Fitbit doesn't provide email in profile
      name: user?.displayName as string || user?.fullName as string,
      picture: user?.avatar as string,
      rawData: data,
    };
  }

  // Notion
  if (providerId === 'notion') {
    return {
      id: data.bot_id as string || data.owner?.user?.id as string,
      email: data.owner?.user?.person?.email as string || '',
      name: data.owner?.user?.name as string || 'Notion Workspace',
      picture: data.owner?.user?.avatar_url as string,
      rawData: data,
    };
  }

  // Dropbox
  if (providerId === 'dropbox') {
    return {
      id: data.account_id as string,
      email: data.email as string,
      name: data.name?.display_name as string,
      picture: data.profile_photo_url as string,
      rawData: data,
    };
  }

  // Default fallback
  return {
    id: data.id as string || data.sub as string || 'unknown',
    email: data.email as string || '',
    name: data.name as string || data.displayName as string || 'Unknown',
    picture: data.picture as string || data.avatar as string,
    rawData: data,
  };
}

/**
 * Parse OAuth state parameter
 */
export function parseOAuthState(state: string): OAuthState {
  try {
    const decoded = Buffer.from(state, 'base64url').toString();
    return JSON.parse(decoded);
  } catch {
    throw new Error('Invalid OAuth state');
  }
}

/**
 * Validate OAuth state (check timestamp, etc.)
 */
export function validateOAuthState(state: OAuthState, maxAgeMs: number = 10 * 60 * 1000): boolean {
  const age = Date.now() - state.timestamp;
  return age < maxAgeMs;
}

/**
 * Check if token is expired or expiring soon
 */
export function isTokenExpired(expiresAt: Date, bufferSeconds: number = 300): boolean {
  const now = new Date();
  const buffer = new Date(expiresAt.getTime() - bufferSeconds * 1000);
  return now >= buffer;
}
