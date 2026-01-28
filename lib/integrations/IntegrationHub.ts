/**
 * PHASE 6: Integration Hub Service
 * Zentraler Hub für alle externen Service-Integrationen
 */

import { getDb } from '@/lib/db';
import { integrationConnections, integrationSyncLogs } from '@/lib/db/schema-integrations-v2';
import { eq, and } from 'drizzle-orm';
import { IntegrationProvider, IntegrationStatus } from '../agents/shared/types';

// ============================================
// INTEGRATION CONFIG
// ============================================

interface IntegrationConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
  apiBaseUrl: string;
}

type IntegrationProviderKey =
  | 'salesforce'
  | 'hubspot'
  | 'zendesk'
  | 'stripe'
  | 'slack'
  | 'gmail'
  | 'outlook'
  | 'intercom';

const getIntegrationConfigs = (): Record<IntegrationProviderKey, IntegrationConfig> => ({
  salesforce: {
    clientId: process.env.SALESFORCE_CLIENT_ID || '',
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET || '',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/salesforce/callback`,
    scopes: ['api', 'refresh_token', 'offline_access'],
    authUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    apiBaseUrl: '', // Set from instance_url after auth
  },
  hubspot: {
    clientId: process.env.HUBSPOT_CLIENT_ID || '',
    clientSecret: process.env.HUBSPOT_CLIENT_SECRET || '',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/hubspot/callback`,
    scopes: [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'crm.objects.deals.read',
      'crm.objects.deals.write',
      'tickets',
      'crm.objects.companies.read',
    ],
    authUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    apiBaseUrl: 'https://api.hubapi.com',
  },
  zendesk: {
    clientId: process.env.ZENDESK_CLIENT_ID || '',
    clientSecret: process.env.ZENDESK_CLIENT_SECRET || '',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/zendesk/callback`,
    scopes: ['read', 'write', 'tickets:read', 'tickets:write', 'users:read'],
    authUrl: '', // Dynamic: https://{subdomain}.zendesk.com/oauth/authorizations/new
    tokenUrl: '', // Dynamic: https://{subdomain}.zendesk.com/oauth/tokens
    apiBaseUrl: '', // Dynamic: https://{subdomain}.zendesk.com/api/v2
  },
  stripe: {
    clientId: process.env.STRIPE_CLIENT_ID || '',
    clientSecret: process.env.STRIPE_SECRET_KEY || '',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/stripe/callback`,
    scopes: ['read_only'],
    authUrl: 'https://connect.stripe.com/oauth/authorize',
    tokenUrl: 'https://connect.stripe.com/oauth/token',
    apiBaseUrl: 'https://api.stripe.com/v1',
  },
  slack: {
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/slack/callback`,
    scopes: ['chat:write', 'channels:read', 'users:read', 'channels:join'],
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    apiBaseUrl: 'https://slack.com/api',
  },
  gmail: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/gmail/callback`,
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
    ],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    apiBaseUrl: 'https://gmail.googleapis.com/gmail/v1',
  },
  outlook: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/outlook/callback`,
    scopes: ['Mail.Read', 'Mail.Send', 'Mail.ReadWrite', 'offline_access'],
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    apiBaseUrl: 'https://graph.microsoft.com/v1.0',
  },
  intercom: {
    clientId: process.env.INTERCOM_CLIENT_ID || '',
    clientSecret: process.env.INTERCOM_CLIENT_SECRET || '',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/intercom/callback`,
    scopes: [],
    authUrl: 'https://app.intercom.com/oauth',
    tokenUrl: 'https://api.intercom.io/auth/eagle/token',
    apiBaseUrl: 'https://api.intercom.io',
  },
});

// ============================================
// INTEGRATION HUB CLASS
// ============================================

export class IntegrationHub {
  private db = getDb();
  private configs = getIntegrationConfigs();

  // ============================================
  // OAUTH FLOW
  // ============================================

  /**
   * Generate OAuth authorization URL
   */
  async getAuthorizationUrl(
    provider: IntegrationProviderKey,
    workspaceId: string,
    options?: {
      state?: string;
      subdomain?: string; // For Zendesk
    }
  ): Promise<string> {
    const config = this.configs[provider];
    if (!config) {
      throw new Error(`Unknown integration provider: ${provider}`);
    }

    // Handle dynamic URLs (Zendesk)
    let authUrl = config.authUrl;
    if (provider === 'zendesk' && options?.subdomain) {
      authUrl = `https://${options.subdomain}.zendesk.com/oauth/authorizations/new`;
    }

    const state = options?.state || `${workspaceId}:${provider}`;

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      state,
    });

    // Add scopes
    if (config.scopes.length > 0) {
      if (provider === 'slack') {
        params.set('scope', config.scopes.join(','));
      } else {
        params.set('scope', config.scopes.join(' '));
      }
    }

    // Provider-specific params
    if (provider === 'gmail' || provider === 'outlook') {
      params.set('access_type', 'offline');
      params.set('prompt', 'consent');
    }

    return `${authUrl}?${params.toString()}`;
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleOAuthCallback(
    provider: IntegrationProviderKey,
    workspaceId: string,
    code: string,
    options?: {
      subdomain?: string;
    }
  ): Promise<{ success: boolean; connectionId?: string; error?: string }> {
    try {
      const config = this.configs[provider];
      if (!config) {
        throw new Error(`Unknown integration provider: ${provider}`);
      }

      // Handle dynamic token URL
      let tokenUrl = config.tokenUrl;
      if (provider === 'zendesk' && options?.subdomain) {
        tokenUrl = `https://${options.subdomain}.zendesk.com/oauth/tokens`;
      }

      // Exchange code for tokens
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
          code,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const tokens = await tokenResponse.json();

      // Calculate token expiry
      const tokenExpiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : undefined;

      // Get account info if available
      const accountInfo = await this.getAccountInfo(provider, tokens.access_token, options);

      // Upsert connection
      const [connection] = await this.db
        .insert(integrationConnections)
        .values({
          workspaceId,
          provider,
          status: 'active' as IntegrationStatus,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt,
          scopes: config.scopes,
          instanceUrl: accountInfo?.instanceUrl,
          accountId: accountInfo?.accountId,
          accountName: accountInfo?.accountName,
          metadata: {
            subdomain: options?.subdomain,
            ...accountInfo?.metadata,
          },
        })
        .onConflictDoUpdate({
          target: [integrationConnections.workspaceId, integrationConnections.provider],
          set: {
            status: 'active',
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || undefined,
            tokenExpiresAt,
            accountId: accountInfo?.accountId,
            accountName: accountInfo?.accountName,
            metadata: {
              subdomain: options?.subdomain,
              ...accountInfo?.metadata,
            },
            updatedAt: new Date(),
          },
        })
        .returning();

      return { success: true, connectionId: connection.id };
    } catch (error) {
      console.error('[INTEGRATION_HUB] OAuth callback error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get account info after OAuth
   */
  private async getAccountInfo(
    provider: IntegrationProviderKey,
    accessToken: string,
    options?: { subdomain?: string }
  ): Promise<{
    instanceUrl?: string;
    accountId?: string;
    accountName?: string;
    metadata?: Record<string, unknown>;
  } | null> {
    try {
      switch (provider) {
        case 'hubspot': {
          const response = await fetch('https://api.hubapi.com/account-info/v3/details', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (response.ok) {
            const data = await response.json();
            return {
              accountId: String(data.portalId),
              accountName: data.companyName,
              metadata: { uiDomain: data.uiDomain },
            };
          }
          break;
        }
        case 'salesforce': {
          const response = await fetch('https://login.salesforce.com/services/oauth2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (response.ok) {
            const data = await response.json();
            return {
              instanceUrl: data.urls?.custom_domain || data.profile?.split('/')[0],
              accountId: data.organization_id,
              accountName: data.name,
            };
          }
          break;
        }
        case 'slack': {
          const response = await fetch('https://slack.com/api/team.info', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (response.ok) {
            const data = await response.json();
            if (data.ok) {
              return {
                accountId: data.team?.id,
                accountName: data.team?.name,
              };
            }
          }
          break;
        }
        case 'zendesk': {
          if (options?.subdomain) {
            const response = await fetch(
              `https://${options.subdomain}.zendesk.com/api/v2/account`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (response.ok) {
              const data = await response.json();
              return {
                instanceUrl: `https://${options.subdomain}.zendesk.com`,
                accountId: String(data.account?.id),
                accountName: data.account?.name,
              };
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error('[INTEGRATION_HUB] Get account info error:', error);
    }
    return null;
  }

  // ============================================
  // CONNECTION MANAGEMENT
  // ============================================

  /**
   * Get connection for provider
   */
  async getConnection(
    provider: IntegrationProviderKey,
    workspaceId: string
  ): Promise<typeof integrationConnections.$inferSelect | null> {
    const [connection] = await this.db
      .select()
      .from(integrationConnections)
      .where(
        and(
          eq(integrationConnections.workspaceId, workspaceId),
          eq(integrationConnections.provider, provider)
        )
      )
      .limit(1);

    if (!connection) return null;

    // Check if token needs refresh
    if (
      connection.tokenExpiresAt &&
      connection.refreshToken &&
      connection.tokenExpiresAt < new Date(Date.now() + 5 * 60 * 1000) // 5 min buffer
    ) {
      const refreshed = await this.refreshToken(provider, workspaceId);
      if (refreshed) {
        return this.getConnection(provider, workspaceId);
      }
    }

    return connection;
  }

  /**
   * Get all connections for workspace
   */
  async getWorkspaceConnections(
    workspaceId: string
  ): Promise<Array<typeof integrationConnections.$inferSelect>> {
    return this.db
      .select()
      .from(integrationConnections)
      .where(eq(integrationConnections.workspaceId, workspaceId));
  }

  /**
   * Refresh OAuth token
   */
  async refreshToken(
    provider: IntegrationProviderKey,
    workspaceId: string
  ): Promise<boolean> {
    try {
      const [connection] = await this.db
        .select()
        .from(integrationConnections)
        .where(
          and(
            eq(integrationConnections.workspaceId, workspaceId),
            eq(integrationConnections.provider, provider)
          )
        )
        .limit(1);

      if (!connection?.refreshToken) {
        return false;
      }

      const config = this.configs[provider];
      if (!config) return false;

      // Handle dynamic token URL
      let tokenUrl = config.tokenUrl;
      if (provider === 'zendesk' && connection.metadata) {
        const subdomain = (connection.metadata as Record<string, unknown>).subdomain as string;
        if (subdomain) {
          tokenUrl = `https://${subdomain}.zendesk.com/oauth/tokens`;
        }
      }

      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: connection.refreshToken,
        }),
      });

      if (!tokenResponse.ok) {
        // Mark connection as expired
        await this.db
          .update(integrationConnections)
          .set({
            status: 'expired',
            syncError: 'Token refresh failed',
            updatedAt: new Date(),
          })
          .where(eq(integrationConnections.id, connection.id));
        return false;
      }

      const tokens = await tokenResponse.json();

      const tokenExpiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : undefined;

      await this.db
        .update(integrationConnections)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || connection.refreshToken,
          tokenExpiresAt,
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(integrationConnections.id, connection.id));

      return true;
    } catch (error) {
      console.error('[INTEGRATION_HUB] Token refresh error:', error);
      return false;
    }
  }

  /**
   * Disconnect integration
   */
  async disconnect(
    provider: IntegrationProviderKey,
    workspaceId: string
  ): Promise<boolean> {
    try {
      await this.db
        .update(integrationConnections)
        .set({
          status: 'disconnected',
          accessToken: null,
          refreshToken: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(integrationConnections.workspaceId, workspaceId),
            eq(integrationConnections.provider, provider)
          )
        );
      return true;
    } catch (error) {
      console.error('[INTEGRATION_HUB] Disconnect error:', error);
      return false;
    }
  }

  /**
   * Check connection health
   */
  async checkConnectionHealth(
    provider: IntegrationProviderKey,
    workspaceId: string
  ): Promise<{ healthy: boolean; error?: string }> {
    try {
      const connection = await this.getConnection(provider, workspaceId);
      if (!connection) {
        return { healthy: false, error: 'Connection not found' };
      }

      if (connection.status !== 'active') {
        return { healthy: false, error: `Connection status: ${connection.status}` };
      }

      if (!connection.accessToken) {
        return { healthy: false, error: 'No access token' };
      }

      // Provider-specific health check
      const healthEndpoints: Record<IntegrationProviderKey, string> = {
        hubspot: 'https://api.hubapi.com/crm/v3/objects/contacts?limit=1',
        salesforce: '', // Dynamic
        zendesk: '', // Dynamic
        stripe: 'https://api.stripe.com/v1/balance',
        slack: 'https://slack.com/api/auth.test',
        gmail: 'https://gmail.googleapis.com/gmail/v1/users/me/profile',
        outlook: 'https://graph.microsoft.com/v1.0/me',
        intercom: 'https://api.intercom.io/me',
      };

      let healthUrl = healthEndpoints[provider];

      if (provider === 'zendesk' && connection.instanceUrl) {
        healthUrl = `${connection.instanceUrl}/api/v2/users/me.json`;
      }
      if (provider === 'salesforce' && connection.instanceUrl) {
        healthUrl = `${connection.instanceUrl}/services/data/v58.0/limits`;
      }

      if (!healthUrl) {
        return { healthy: true }; // Skip health check if no endpoint
      }

      const response = await fetch(healthUrl, {
        headers: { Authorization: `Bearer ${connection.accessToken}` },
      });

      if (!response.ok) {
        return { healthy: false, error: `API returned ${response.status}` };
      }

      return { healthy: true };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================
  // SYNC LOGGING
  // ============================================

  /**
   * Start sync log
   */
  async startSyncLog(
    connectionId: string,
    syncType: string,
    entityType?: string
  ): Promise<string> {
    const [log] = await this.db
      .insert(integrationSyncLogs)
      .values({
        connectionId,
        syncType,
        entityType,
        status: 'running',
        startedAt: new Date(),
      })
      .returning();

    return log.id;
  }

  /**
   * Complete sync log
   */
  async completeSyncLog(
    logId: string,
    results: {
      status: 'completed' | 'failed';
      recordsProcessed?: number;
      recordsCreated?: number;
      recordsUpdated?: number;
      recordsFailed?: number;
      errorDetails?: unknown;
      syncCursor?: string;
    }
  ): Promise<void> {
    const startedLog = await this.db
      .select()
      .from(integrationSyncLogs)
      .where(eq(integrationSyncLogs.id, logId))
      .limit(1);

    const duration = startedLog[0]?.startedAt
      ? Date.now() - startedLog[0].startedAt.getTime()
      : undefined;

    await this.db
      .update(integrationSyncLogs)
      .set({
        ...results,
        duration,
        completedAt: new Date(),
      })
      .where(eq(integrationSyncLogs.id, logId));

    // Update connection last sync
    if (startedLog[0]) {
      await this.db
        .update(integrationConnections)
        .set({
          lastSyncAt: new Date(),
          lastSyncStatus: results.status,
          syncError: results.status === 'failed'
            ? JSON.stringify(results.errorDetails)
            : null,
        })
        .where(eq(integrationConnections.id, startedLog[0].connectionId));
    }
  }
}

// Export singleton instance
export const integrationHub = new IntegrationHub();

// Export types
export type { IntegrationProviderKey };
