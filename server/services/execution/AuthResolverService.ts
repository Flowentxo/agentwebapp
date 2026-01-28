/**
 * FLOWENT AI STUDIO - AUTH RESOLVER SERVICE
 *
 * Just-In-Time authentication injection service that bridges the Credential Vault
 * to the workflow execution engine. Handles token refresh, header injection,
 * and provider-specific authentication requirements.
 *
 * @version 1.0.0
 */

import {
  getProviderConfig,
  ProviderConfig,
  AuthType,
} from '@/lib/studio/provider-configs';
import {
  getCredentialService,
  CredentialService,
  CredentialAccessContext,
} from '@/server/services/security/CredentialService';
import {
  ResolvedCredential,
  CredentialSchemas,
} from '@/lib/db/schema-credentials';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthHeaders {
  [key: string]: string;
}

export interface AuthQueryParams {
  [key: string]: string;
}

export interface ResolvedAuth {
  headers: AuthHeaders;
  queryParams: AuthQueryParams;
  /** For providers with instance-specific URLs (e.g., Salesforce, Mailchimp) */
  baseUrlParams?: Record<string, string>;
  /** Raw token for custom usage */
  token?: string;
  /** Expiry time if applicable */
  expiresAt?: Date;
  /** Indicates if token was refreshed */
  wasRefreshed?: boolean;
}

export interface AuthResolutionRequest {
  /** Provider ID from node definition (e.g., 'hubspot', 'slack') */
  providerId: string;
  /** Credential ID from node configuration */
  credentialId: string;
  /** Execution context for access control */
  context: CredentialAccessContext;
  /** Additional parameters for URL templates (e.g., instance domain) */
  urlParams?: Record<string, string>;
}

export interface OAuth2TokenData {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: string;
  scopes?: string[];
}

// ============================================================================
// AUTH RESOLVER SERVICE
// ============================================================================

export class AuthResolverService {
  private credentialService: CredentialService;

  constructor() {
    this.credentialService = getCredentialService();
  }

  // --------------------------------------------------------------------------
  // MAIN RESOLUTION METHOD
  // --------------------------------------------------------------------------

  /**
   * Resolve authentication for a provider request
   * Returns headers and query params to inject into the HTTP request
   */
  async resolveAuth(request: AuthResolutionRequest): Promise<ResolvedAuth> {
    const { providerId, credentialId, context, urlParams } = request;

    // Get provider configuration
    const providerConfig = getProviderConfig(providerId);
    if (!providerConfig) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    // Resolve the credential
    const credential = await this.credentialService.resolve(credentialId, context);
    if (!credential) {
      throw new Error(`Credential not found: ${credentialId}`);
    }

    // Route to appropriate auth handler based on type
    const authResult = await this.resolveByAuthType(
      providerConfig,
      credential,
      context,
      urlParams
    );

    console.log(`[AuthResolver] Resolved auth for ${providerId} using ${providerConfig.auth.type}`);

    return authResult;
  }

  /**
   * Route to appropriate auth handler
   */
  private async resolveByAuthType(
    provider: ProviderConfig,
    credential: ResolvedCredential,
    context: CredentialAccessContext,
    urlParams?: Record<string, string>
  ): Promise<ResolvedAuth> {
    const authConfig = provider.auth;

    switch (authConfig.type) {
      case 'bearer':
        return this.resolveBearerAuth(credential);

      case 'api_key_header':
        return this.resolveApiKeyHeader(credential, authConfig.headerName);

      case 'api_key_query':
        return this.resolveApiKeyQuery(credential, authConfig.queryParamName);

      case 'basic':
        return this.resolveBasicAuth(credential);

      case 'oauth2':
        return this.resolveOAuth2(provider, credential, context);

      case 'custom':
        return this.resolveCustomAuth(provider, credential, urlParams);

      case 'none':
        return { headers: {}, queryParams: {} };

      default:
        throw new Error(`Unsupported auth type: ${authConfig.type}`);
    }
  }

  // --------------------------------------------------------------------------
  // AUTH TYPE HANDLERS
  // --------------------------------------------------------------------------

  /**
   * Bearer token authentication
   * Authorization: Bearer <token>
   */
  private resolveBearerAuth(credential: ResolvedCredential): ResolvedAuth {
    const data = credential.data as {
      token?: string;
      accessToken?: string;
      apiKey?: string;
    };

    const token = data.token || data.accessToken || data.apiKey;
    if (!token) {
      throw new Error('Bearer token not found in credential');
    }

    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      queryParams: {},
      token,
    };
  }

  /**
   * API Key in header
   * X-Api-Key: <key> or custom header
   */
  private resolveApiKeyHeader(
    credential: ResolvedCredential,
    headerName?: string
  ): ResolvedAuth {
    const data = credential.data as { apiKey?: string; key?: string };
    const apiKey = data.apiKey || data.key;

    if (!apiKey) {
      throw new Error('API key not found in credential');
    }

    const header = headerName || 'X-Api-Key';

    return {
      headers: {
        [header]: apiKey,
      },
      queryParams: {},
      token: apiKey,
    };
  }

  /**
   * API Key as query parameter
   * ?api_key=<key>
   */
  private resolveApiKeyQuery(
    credential: ResolvedCredential,
    queryParamName?: string
  ): ResolvedAuth {
    const data = credential.data as { apiKey?: string; key?: string; token?: string };
    const apiKey = data.apiKey || data.key || data.token;

    if (!apiKey) {
      throw new Error('API key not found in credential');
    }

    const paramName = queryParamName || 'api_key';

    return {
      headers: {},
      queryParams: {
        [paramName]: apiKey,
      },
      token: apiKey,
    };
  }

  /**
   * Basic authentication
   * Authorization: Basic base64(username:password)
   */
  private resolveBasicAuth(credential: ResolvedCredential): ResolvedAuth {
    const data = credential.data as {
      username?: string;
      password?: string;
      accountSid?: string;  // Twilio uses this
      authToken?: string;   // Twilio uses this
    };

    const username = data.username || data.accountSid;
    const password = data.password || data.authToken;

    if (!username || !password) {
      throw new Error('Username and password required for basic auth');
    }

    const encoded = Buffer.from(`${username}:${password}`).toString('base64');

    return {
      headers: {
        Authorization: `Basic ${encoded}`,
      },
      queryParams: {},
    };
  }

  /**
   * OAuth2 authentication with automatic token refresh
   */
  private async resolveOAuth2(
    provider: ProviderConfig,
    credential: ResolvedCredential,
    context: CredentialAccessContext
  ): Promise<ResolvedAuth> {
    const data = credential.data as OAuth2TokenData;

    if (!data.accessToken) {
      throw new Error('OAuth2 access token not found in credential');
    }

    // Check if token is expired or about to expire (5 minute buffer)
    let wasRefreshed = false;
    let accessToken = data.accessToken;

    if (data.expiresAt) {
      const expiresAt = new Date(data.expiresAt);
      const bufferMs = 5 * 60 * 1000; // 5 minutes
      const isExpiringSoon = expiresAt.getTime() - Date.now() < bufferMs;

      if (isExpiringSoon && data.refreshToken && provider.auth.tokenUrl) {
        try {
          const refreshed = await this.refreshOAuth2Token(
            provider,
            data.refreshToken,
            credential.id,
            context
          );
          accessToken = refreshed.accessToken;
          wasRefreshed = true;
        } catch (error) {
          console.error('[AuthResolver] Token refresh failed:', error);
          // Use existing token and hope it still works
        }
      }
    }

    const tokenType = data.tokenType || 'Bearer';

    return {
      headers: {
        Authorization: `${tokenType} ${accessToken}`,
      },
      queryParams: {},
      token: accessToken,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      wasRefreshed,
    };
  }

  /**
   * Refresh OAuth2 access token using refresh token
   */
  private async refreshOAuth2Token(
    provider: ProviderConfig,
    refreshToken: string,
    credentialId: string,
    context: CredentialAccessContext
  ): Promise<{ accessToken: string; expiresAt?: Date }> {
    const tokenUrl = provider.auth.tokenUrl;
    if (!tokenUrl) {
      throw new Error('Token URL not configured for OAuth2 refresh');
    }

    // Get client credentials from the same credential
    const credential = await this.credentialService.resolve(credentialId, context);
    if (!credential) {
      throw new Error('Credential not found for refresh');
    }

    const data = credential.data as {
      clientId?: string;
      clientSecret?: string;
      refreshToken?: string;
    };

    if (!data.clientId || !data.clientSecret) {
      throw new Error('Client credentials required for token refresh');
    }

    // Make refresh request
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: data.clientId,
        client_secret: data.clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const tokenResponse = await response.json();

    // Update the credential with new tokens
    const updateData: OAuth2TokenData = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token || refreshToken,
      tokenType: tokenResponse.token_type || 'Bearer',
      expiresAt: tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
        : undefined,
    };

    // Update credential in vault
    await this.credentialService.update(
      credentialId,
      { data: { ...credential.data, ...updateData } as Record<string, unknown> },
      context
    );

    console.log(`[AuthResolver] Refreshed OAuth2 token for ${credentialId}`);

    return {
      accessToken: tokenResponse.access_token,
      expiresAt: updateData.expiresAt ? new Date(updateData.expiresAt) : undefined,
    };
  }

  /**
   * Custom authentication (e.g., AWS Signature V4)
   */
  private async resolveCustomAuth(
    provider: ProviderConfig,
    credential: ResolvedCredential,
    urlParams?: Record<string, string>
  ): Promise<ResolvedAuth> {
    const customHandler = provider.auth.customHandler;

    switch (customHandler) {
      case 'awsSignatureV4':
        return this.resolveAwsAuth(credential, urlParams);

      default:
        throw new Error(`Unknown custom auth handler: ${customHandler}`);
    }
  }

  /**
   * AWS Signature V4 authentication
   */
  private async resolveAwsAuth(
    credential: ResolvedCredential,
    urlParams?: Record<string, string>
  ): Promise<ResolvedAuth> {
    const data = credential.data as {
      accessKeyId?: string;
      secretAccessKey?: string;
      region?: string;
      sessionToken?: string;
    };

    if (!data.accessKeyId || !data.secretAccessKey) {
      throw new Error('AWS credentials not found');
    }

    const region = data.region || urlParams?.region || 'us-east-1';

    // For AWS, we return the credentials and let the executor handle signing
    // as signing requires knowledge of the request details
    return {
      headers: {},
      queryParams: {},
      baseUrlParams: {
        region,
        bucket: urlParams?.bucket || '',
      },
      token: data.accessKeyId, // For identification purposes
    };
  }

  // --------------------------------------------------------------------------
  // HELPER METHODS
  // --------------------------------------------------------------------------

  /**
   * Get required credential fields for a provider
   */
  getRequiredFields(providerId: string): string[] {
    const provider = getProviderConfig(providerId);
    if (!provider) {
      return [];
    }

    switch (provider.auth.type) {
      case 'bearer':
        return ['token'];
      case 'api_key_header':
      case 'api_key_query':
        return ['apiKey'];
      case 'basic':
        return ['username', 'password'];
      case 'oauth2':
        return ['clientId', 'clientSecret', 'accessToken'];
      case 'custom':
        if (provider.auth.customHandler === 'awsSignatureV4') {
          return ['accessKeyId', 'secretAccessKey'];
        }
        return [];
      default:
        return [];
    }
  }

  /**
   * Build full URL with base URL params replaced
   */
  buildProviderUrl(
    providerId: string,
    endpoint: string,
    resolvedAuth: ResolvedAuth,
    additionalParams?: Record<string, string>
  ): string {
    const provider = getProviderConfig(providerId);
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    let baseUrl = provider.baseUrl;
    const params = { ...resolvedAuth.baseUrlParams, ...additionalParams };

    // Replace template variables in baseUrl
    for (const [key, value] of Object.entries(params)) {
      baseUrl = baseUrl.replace(`{${key}}`, value);
    }

    // Add API version if configured
    const version = provider.apiVersion || '';
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    let fullUrl = `${baseUrl}${version}${cleanEndpoint}`;

    // Add query params
    if (Object.keys(resolvedAuth.queryParams).length > 0) {
      const separator = fullUrl.includes('?') ? '&' : '?';
      const queryString = new URLSearchParams(resolvedAuth.queryParams).toString();
      fullUrl = `${fullUrl}${separator}${queryString}`;
    }

    return fullUrl;
  }

  /**
   * Merge resolved auth headers with request headers
   */
  mergeHeaders(
    resolvedAuth: ResolvedAuth,
    requestHeaders: Record<string, string>,
    providerDefaults?: Record<string, string>
  ): Record<string, string> {
    return {
      ...providerDefaults,
      ...resolvedAuth.headers,
      ...requestHeaders,
    };
  }

  /**
   * Clear credential cache (call after execution completes)
   */
  clearCache(): void {
    this.credentialService.clearCache();
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let authResolverInstance: AuthResolverService | null = null;

export function getAuthResolverService(): AuthResolverService {
  if (!authResolverInstance) {
    authResolverInstance = new AuthResolverService();
  }
  return authResolverInstance;
}

export default AuthResolverService;
