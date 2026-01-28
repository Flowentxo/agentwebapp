/**
 * OAuth2 Utilities with PKCE Support
 * Secure implementation for Google, Microsoft, Slack OAuth flows
 */

import crypto from 'crypto';

// ============================================================================
// ENCRYPTION KEY VALIDATION - CRITICAL SECURITY FIX
// ============================================================================
// The ENCRYPTION_KEY is used to encrypt OAuth tokens stored in the database.
// If this key changes between server restarts, all stored tokens become invalid
// and users will need to re-authenticate with all OAuth providers.
//
// NEVER use a randomly generated key in production - it must be persistent!
// Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// ============================================================================

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  const errorMessage = `
╔══════════════════════════════════════════════════════════════════════════════╗
║  CRITICAL SECURITY ERROR: ENCRYPTION_KEY environment variable is missing!   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  The ENCRYPTION_KEY is required to encrypt/decrypt OAuth tokens.             ║
║  Without a persistent key, tokens become invalid on every server restart.    ║
║                                                                              ║
║  To generate a secure key, run:                                              ║
║    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  ║
║                                                                              ║
║  Then add it to your .env.local file:                                        ║
║    ENCRYPTION_KEY=<your-64-character-hex-key>                                ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
  console.error(errorMessage);
  throw new Error('ENCRYPTION_KEY environment variable is required. See console for details.');
}

// Validate key format (must be 64 hex characters = 32 bytes)
if (!/^[a-fA-F0-9]{64}$/.test(ENCRYPTION_KEY)) {
  throw new Error(
    'ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes). ' +
    'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

const ALGORITHM = 'aes-256-gcm';

/**
 * Generate a cryptographically secure random string
 */
export function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return base64URLEncode(Buffer.from(array));
}

/**
 * Base64URL encode (RFC 7636)
 */
export function base64URLEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate PKCE code verifier (128 random characters)
 */
export function generateCodeVerifier(): string {
  return generateRandomString(96);
}

/**
 * Generate PKCE code challenge from verifier
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64URLEncode(hash);
}

/**
 * Generate OAuth state parameter (CSRF protection)
 */
export function generateState(): string {
  return generateRandomString(32);
}

/**
 * Encrypt sensitive data (tokens)
 */
export function encrypt(text: string): string {
  if (!text) return '';

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'),
    iv
  );

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data (tokens)
 * @throws Error if decryption fails - caller must handle this
 */
export function decrypt(text: string): string {
  if (!text) return '';

  try {
    const parts = text.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format. Expected iv:authTag:encrypted');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;

    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new Error('Invalid encrypted data: missing components');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'),
      iv
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error: any) {
    // Log the error for debugging but throw to caller
    console.error('[DECRYPT_ERROR] Failed to decrypt token:', error.message);

    // Provide helpful error message to caller
    throw new Error(
      `Token decryption failed: ${error.message}. ` +
      'This may indicate the ENCRYPTION_KEY has changed since the token was encrypted. ' +
      'User may need to re-authenticate with the OAuth provider.'
    );
  }
}

/**
 * OAuth2 Provider Configuration
 */
export interface OAuth2Provider {
  name: string;
  authUrl: string;
  tokenUrl: string;
  revokeUrl?: string;
  userInfoUrl?: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  redirectUri: string;
}

/**
 * Get OAuth2 provider configuration
 */
export function getOAuthConfig(provider: 'google' | 'microsoft' | 'slack'): OAuth2Provider {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const configs: Record<string, OAuth2Provider> = {
    google: {
      name: 'Google',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      revokeUrl: 'https://oauth2.googleapis.com/revoke',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      scopes: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      redirectUri: `${baseUrl}/api/oauth/google/callback`,
    },
    microsoft: {
      name: 'Microsoft',
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      scopes: ['User.Read', 'Mail.Read', 'Calendars.Read'],
      redirectUri: `${baseUrl}/api/oauth/microsoft/callback`,
    },
    slack: {
      name: 'Slack',
      authUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      revokeUrl: 'https://slack.com/api/auth.revoke',
      userInfoUrl: 'https://slack.com/api/users.identity',
      clientId: process.env.SLACK_CLIENT_ID || '',
      clientSecret: process.env.SLACK_CLIENT_SECRET || '',
      scopes: ['channels:read', 'chat:write', 'users:read'],
      redirectUri: `${baseUrl}/api/oauth/slack/callback`,
    },
  };

  return configs[provider];
}

/**
 * Build OAuth2 authorization URL with PKCE
 */
export interface BuildAuthUrlParams {
  provider: 'google' | 'microsoft' | 'slack';
  service?: string; // e.g., 'gmail', 'calendar', 'drive'
  codeChallenge: string;
  state: string;
  additionalScopes?: string[];
}

export function buildAuthorizationUrl({
  provider,
  service,
  codeChallenge,
  state,
  additionalScopes = [],
}: BuildAuthUrlParams): string {
  const config = getOAuthConfig(provider);

  // Merge base scopes with service-specific scopes
  let scopes = [...config.scopes];

  if (provider === 'google' && service) {
    const googleScopes: Record<string, string[]> = {
      gmail: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
      ],
      calendar: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      drive: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file',
      ],
      contacts: [
        'https://www.googleapis.com/auth/contacts.readonly',
      ],
      tasks: [
        'https://www.googleapis.com/auth/tasks.readonly',
        'https://www.googleapis.com/auth/tasks',
      ],
      sheets: [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/spreadsheets',
      ],
      // Unified 'all' option - includes everything
      all: [
        // Gmail
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
        // Calendar
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
        // Drive
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file',
        // Contacts
        'https://www.googleapis.com/auth/contacts.readonly',
        // Tasks
        'https://www.googleapis.com/auth/tasks.readonly',
        'https://www.googleapis.com/auth/tasks',
        // Sheets
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    };

    scopes = [...scopes, ...(googleScopes[service] || [])];
  }

  scopes = [...scopes, ...additionalScopes];

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline', // Request refresh token
    prompt: 'consent', // Force consent screen (needed for refresh token)
  });

  return `${config.authUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export interface TokenExchangeParams {
  provider: 'google' | 'microsoft' | 'slack';
  code: string;
  codeVerifier: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export async function exchangeCodeForTokens({
  provider,
  code,
  codeVerifier,
}: TokenExchangeParams): Promise<TokenResponse> {
  const config = getOAuthConfig(provider);

  const body = new URLSearchParams({
    code,
    code_verifier: codeVerifier,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Refresh access token using refresh token
 */
export interface RefreshTokenParams {
  provider: 'google' | 'microsoft' | 'slack';
  refreshToken: string;
}

export async function refreshAccessToken({
  provider,
  refreshToken,
}: RefreshTokenParams): Promise<TokenResponse> {
  const config = getOAuthConfig(provider);

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json();
}

/**
 * Revoke OAuth2 token
 */
export interface RevokeTokenParams {
  provider: 'google' | 'microsoft' | 'slack';
  token: string;
}

export async function revokeToken({ provider, token }: RevokeTokenParams): Promise<void> {
  const config = getOAuthConfig(provider);

  if (!config.revokeUrl) {
    console.warn(`[OAUTH] No revoke URL for ${provider}`);
    return;
  }

  const body = new URLSearchParams({ token });

  const response = await fetch(config.revokeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token revocation failed: ${error}`);
  }
}

/**
 * Fetch user profile from OAuth provider
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export async function fetchUserProfile(
  provider: 'google' | 'microsoft' | 'slack',
  accessToken: string
): Promise<UserProfile> {
  const config = getOAuthConfig(provider);

  if (!config.userInfoUrl) {
    throw new Error(`No user info URL for ${provider}`);
  }

  const response = await fetch(config.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: ${response.statusText}`);
  }

  const data = await response.json();

  // Normalize response across providers
  if (provider === 'google') {
    return {
      id: data.sub,
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  }

  if (provider === 'microsoft') {
    return {
      id: data.id,
      email: data.userPrincipalName || data.mail,
      name: data.displayName,
      picture: undefined, // Microsoft Graph doesn't return photo URL directly
    };
  }

  if (provider === 'slack') {
    return {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      picture: data.user.image_192,
    };
  }

  throw new Error(`Unknown provider: ${provider}`);
}

/**
 * Validate OAuth state parameter (CSRF protection)
 */
export function validateState(receivedState: string, storedState: string): boolean {
  return receivedState === storedState;
}

/**
 * Check if token is expiring soon (within 5 minutes)
 */
export function isTokenExpiringSoon(expiresAt: Date, bufferSeconds: number = 5 * 60): boolean {
  const bufferFromNow = new Date(Date.now() + bufferSeconds * 1000);
  return expiresAt < bufferFromNow;
}
