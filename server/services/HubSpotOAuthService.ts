/**
 * HUBSPOT OAUTH SERVICE
 *
 * Handles HubSpot OAuth flow, token management, and connection testing
 */

import axios from 'axios';
import { getDb } from '../../lib/db/connection';
import { oauthConnections, integrationUsage } from '../../lib/db/schema-integrations';
import { eq, and } from 'drizzle-orm';
import { encryptPassword, decryptPassword } from '../../lib/security/encryption';
import { getProviderConfig } from '../../lib/integrations/settings';

// HubSpot OAuth Configuration
const HUBSPOT_AUTH_URL = 'https://app.hubspot.com/oauth/authorize';
const HUBSPOT_TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token';
const HUBSPOT_API_BASE = 'https://api.hubapi.com';

const HUBSPOT_SCOPES = [
  'crm.objects.contacts.read',
  'crm.objects.contacts.write',
  'crm.objects.deals.read',
  'crm.objects.deals.write',
  'crm.objects.companies.read',
  'crm.objects.companies.write',
];


interface HubSpotTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface HubSpotAccountInfo {
  portalId: number;
  userId: number;
  hubDomain: string;
  user: string;
  userEmail: string;
}

export class HubSpotOAuthService {
  constructor() {
    // No static config loading
  }

  private async getConfig(userId: string) {
    const config = await getProviderConfig(userId, 'hubspot');
    
    // Fallback to global environment variables
    if (!config && process.env.HUBSPOT_CLIENT_ID && process.env.HUBSPOT_CLIENT_SECRET) {
      return {
        clientId: process.env.HUBSPOT_CLIENT_ID,
        clientSecret: process.env.HUBSPOT_CLIENT_SECRET,
        redirectUri: process.env.HUBSPOT_REDIRECT_URI || 'http://localhost:3000/api/integrations/hubspot/callback',
        provider: 'hubspot'
      };
    }

    if (!config) {
      throw new Error('HubSpot configuration not found for this user. Please configure Client ID and Secret in Settings.');
    }
    return config;
  }

  /**
   * Generate OAuth authorization URL
   *
   * @param userId - User ID to link the connection to
   * @param state - Optional state parameter for CSRF protection
   * @returns Authorization URL to redirect user to
   */
  async getAuthUrl(userId: string, state?: string): Promise<string> {
    const config = await this.getConfig(userId);
    const redirectUri = config.redirectUri || process.env.HUBSPOT_REDIRECT_URI || 'http://localhost:3000/api/oauth/callback';

    const stateParam = state || Buffer.from(JSON.stringify({ userId, provider: 'hubspot', timestamp: Date.now() })).toString('base64');

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      scope: HUBSPOT_SCOPES.join(' '),
      state: stateParam,
    });

    const url = `${HUBSPOT_AUTH_URL}?${params.toString()}`;
    console.log('[HUBSPOT_OAUTH] Generated Auth URL:', url);
    return url;
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   *
   * @param code - Authorization code from HubSpot
   * @param userId - User ID to link the connection to
   * @returns Success status and error message if failed
   */
  async handleCallback(code: string, userId: string): Promise<{ success: boolean; error?: string; accountInfo?: HubSpotAccountInfo }> {
    try {
      const config = await this.getConfig(userId);
      const redirectUri = config.redirectUri || process.env.HUBSPOT_REDIRECT_URI || 'http://localhost:3000/api/oauth/callback';

      // Step 1: Exchange code for tokens
      const tokenResponse = await axios.post<HubSpotTokens>(
        HUBSPOT_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: redirectUri,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const tokens = tokenResponse.data;

      if (!tokens.access_token) {
        return { success: false, error: 'No access token received' };
      }

      // Step 2: Get account info
      const accountInfo = await this.getAccountInfo(tokens.access_token);

      // Step 3: Encrypt tokens before storing
      const encryptedAccessToken = encryptPassword(tokens.access_token);
      const encryptedRefreshToken = encryptPassword(tokens.refresh_token);

      const db = getDb();

      // Step 4: Deactivate existing connections for this user
      await db
        .update(oauthConnections)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(oauthConnections.userId, userId),
            eq(oauthConnections.provider, 'hubspot')
          )
        );

      // Step 5: Store new connection with encrypted tokens
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      await db.insert(oauthConnections).values({
        userId,
        provider: 'hubspot',
        providerAccountId: accountInfo.portalId.toString(),
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenType: tokens.token_type,
        expiresAt,
        scope: HUBSPOT_SCOPES.join(' '),
        isActive: true,
        metadata: {
          portalId: accountInfo.portalId,
          userId: accountInfo.userId,
          hubDomain: accountInfo.hubDomain,
          user: accountInfo.user,
          userEmail: accountInfo.userEmail,
          connectedAt: new Date().toISOString(),
        },
      });

      console.log(`[HUBSPOT_OAUTH] Successfully connected for user: ${userId} (Portal: ${accountInfo.portalId})`);

      return { success: true, accountInfo };
    } catch (error: any) {
      console.error('[HUBSPOT_OAUTH] Callback error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Get active OAuth connection for user
   *
   * @param userId - User ID
   * @returns OAuth connection or undefined
   */
  async getConnection(userId: string) {
    const db = getDb();

    const [connection] = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.userId, userId),
          eq(oauthConnections.provider, 'hubspot'),
          eq(oauthConnections.isActive, true)
        )
      )
      .limit(1);

    return connection;
  }

  /**
   * Get decrypted access token for user
   * Automatically refreshes token if expired
   *
   * @param userId - User ID
   * @returns Decrypted access token
   */
  async getAccessToken(userId: string): Promise<string> {
    const connection = await this.getConnection(userId);

    if (!connection) {
      throw new Error('No active HubSpot connection found. Please connect your HubSpot account.');
    }

    // Check if token is expired or will expire in the next 5 minutes
    const expiresAt = connection.expiresAt ? new Date(connection.expiresAt) : new Date(0);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt < fiveMinutesFromNow) {
      console.log('[HUBSPOT_OAUTH] Token expired or expiring soon, refreshing...');
      await this.refreshAccessToken(connection);
      // Get updated connection
      const updatedConnection = await this.getConnection(userId);
      if (!updatedConnection) {
        throw new Error('Failed to get updated connection after refresh');
      }
      return decryptPassword(updatedConnection.accessToken);
    }

    // Decrypt and return access token
    return decryptPassword(connection.accessToken);
  }

  /**
   * Refresh access token using refresh token
   *
   * @param connection - Existing OAuth connection
   * @returns New access token
   */
  private async refreshAccessToken(connection: any): Promise<string> {
    if (!connection.refreshToken) {
      throw new Error('No refresh token available. Please reconnect your HubSpot account.');
    }

    try {
      // Get user config
      const config = await this.getConfig(connection.userId);
      
      // Decrypt refresh token
      const decryptedRefreshToken = decryptPassword(connection.refreshToken);

      // Request new access token
      const tokenResponse = await axios.post<HubSpotTokens>(
        HUBSPOT_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: decryptedRefreshToken,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const tokens = tokenResponse.data;

      if (!tokens.access_token) {
        throw new Error('Failed to refresh access token');
      }

      // Encrypt new tokens
      const encryptedAccessToken = encryptPassword(tokens.access_token);
      const encryptedRefreshToken = encryptPassword(tokens.refresh_token);

      // Update stored tokens
      const db = getDb();
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      await db
        .update(oauthConnections)
        .set({
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(oauthConnections.id, connection.id));

      console.log(`[HUBSPOT_OAUTH] Successfully refreshed token for connection: ${connection.id}`);

      return tokens.access_token;
    } catch (error: any) {
      console.error('[HUBSPOT_OAUTH] Token refresh error:', error.response?.data || error.message);

      // If refresh fails, mark connection as inactive
      const db = getDb();
      await db
        .update(oauthConnections)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(oauthConnections.id, connection.id));

      throw new Error('Failed to refresh access token. Please reconnect your HubSpot account.');
    }
  }

  /**
   * Get HubSpot account information
   *
   * @param accessToken - Access token
   * @returns Account information
   */
  private async getAccountInfo(accessToken: string): Promise<HubSpotAccountInfo> {
    try {
      const response = await axios.get(`${HUBSPOT_API_BASE}/oauth/v1/access-tokens/${accessToken}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return {
        portalId: response.data.hub_id,
        userId: response.data.user_id,
        hubDomain: response.data.hub_domain,
        user: response.data.user,
        userEmail: response.data.user_email || '',
      };
    } catch (error: any) {
      console.error('[HUBSPOT_OAUTH] Failed to get account info:', error.response?.data || error.message);
      throw new Error('Failed to get HubSpot account information');
    }
  }

  /**
   * Test connection by making a simple API call
   *
   * @param userId - User ID
   * @returns Connection status
   */
  async testConnection(userId: string): Promise<{ success: boolean; message: string; accountInfo?: any }> {
    try {
      const accessToken = await this.getAccessToken(userId);

      // Make a simple API call to test connection
      const response = await axios.get(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts`, {
        params: {
          limit: 1,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const connection = await this.getConnection(userId);

      return {
        success: true,
        message: 'Connection successful',
        accountInfo: connection?.metadata,
      };
    } catch (error: any) {
      console.error('[HUBSPOT_OAUTH] Connection test failed:', error.response?.data || error.message);
      return {
        success: false,
        message: error.message || 'Connection test failed',
      };
    }
  }

  /**
   * Disconnect HubSpot integration
   *
   * @param userId - User ID
   * @returns Success status
   */
  async disconnect(userId: string): Promise<{ success: boolean }> {
    try {
      const db = getDb();

      await db
        .update(oauthConnections)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(oauthConnections.userId, userId),
            eq(oauthConnections.provider, 'hubspot')
          )
        );

      console.log(`[HUBSPOT_OAUTH] Disconnected HubSpot for user: ${userId}`);

      return { success: true };
    } catch (error: any) {
      console.error('[HUBSPOT_OAUTH] Disconnect error:', error);
      return { success: false };
    }
  }

  /**
   * Log API usage for analytics and rate limiting
   *
   * @param userId - User ID
   * @param action - Action performed (e.g., 'create_contact', 'update_deal')
   * @param status - Status of the action ('success', 'error', 'rate_limited')
   * @param errorMessage - Optional error message
   */
  async logUsage(userId: string, action: string, status: 'success' | 'error' | 'rate_limited', errorMessage?: string) {
    try {
      const connection = await this.getConnection(userId);

      if (!connection) {
        return;
      }

      const db = getDb();

      await db.insert(integrationUsage).values({
        userId,
        connectionId: connection.id,
        provider: 'hubspot',
        action,
        status,
        errorMessage: errorMessage || null,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('[HUBSPOT_OAUTH] Failed to log usage:', error);
    }
  }
}

// Export singleton instance
export const hubspotOAuthService = new HubSpotOAuthService();
