/**
 * Integration Service
 * Phase 11: Secure Credential Management & Token Lifecycle
 *
 * Handles:
 * - Encrypted token storage and retrieval
 * - Automatic token refresh when expired
 * - Connection lifecycle management
 * - Provider-agnostic OAuth handling
 */

import { getDb } from '@/lib/db';
import { integrationConnections } from '@/lib/db/schema-integrations-v2';
import {
  encrypt,
  decrypt,
  encryptPassword,
  decryptPassword,
  isEncryptionConfigured
} from '@/lib/security/encryption';
import {
  refreshAccessToken,
  revokeToken,
  isTokenExpired,
  TokenData,
} from '@/lib/integrations/providers/oauth-service';
import { getProviderConfig } from '@/lib/integrations/providers/provider-config';
import { eq, and, desc } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';
import crypto from 'crypto';

const logger = createLogger('IntegrationService');

// ============================================
// TYPES
// ============================================

export interface IntegrationConnection {
  id: string;
  provider: string;
  status: 'active' | 'expired' | 'error' | 'pending';
  accountEmail?: string;
  accountName?: string;
  scopes: string[];
  expiresAt?: Date;
  lastSyncAt?: Date;
  createdAt: Date;
}

export interface ConnectionWithToken extends IntegrationConnection {
  accessToken: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  category: 'communication' | 'crm' | 'finance' | 'storage' | 'social' | 'productivity';
  icon: string;
  description: string;
  isConnected: boolean;
  connection?: IntegrationConnection;
}

// ============================================
// INTEGRATION SERVICE CLASS
// ============================================

export class IntegrationService {
  private static instance: IntegrationService;

  private constructor() {}

  static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }

  // ==========================================
  // TOKEN MANAGEMENT
  // ==========================================

  /**
   * Get a valid access token for a connection
   * Automatically refreshes if expired
   */
  async getValidToken(connectionId: string): Promise<string> {
    const db = getDb();

    // Fetch connection
    const [connection] = await db
      .select()
      .from(integrationConnections)
      .where(eq(integrationConnections.id, connectionId))
      .limit(1);

    if (!connection) {
      throw new Error('Connection not found');
    }

    if (connection.status === 'error') {
      throw new Error('Connection is in error state. Please reconnect.');
    }

    // Check if token is expired
    const expiresAt = connection.tokenExpiresAt;
    const needsRefresh = expiresAt ? isTokenExpired(expiresAt, 300) : false;

    if (needsRefresh) {
      logger.info(`[${connection.provider}] Token expired, refreshing...`);

      // Decrypt refresh token
      const refreshToken = connection.refreshToken
        ? decryptPassword(connection.refreshToken)
        : null;

      if (!refreshToken) {
        // No refresh token - mark as expired
        await this.updateConnectionStatus(connectionId, 'expired');
        throw new Error('Token expired and no refresh token available. Please reconnect.');
      }

      try {
        // Refresh the token
        const newTokens = await refreshAccessToken(connection.provider, refreshToken);

        // Encrypt and save new tokens
        await this.saveTokens(connectionId, newTokens);

        logger.info(`[${connection.provider}] Token refreshed successfully`);
        return newTokens.accessToken;
      } catch (error) {
        logger.error(`[${connection.provider}] Token refresh failed:`, error);
        await this.updateConnectionStatus(connectionId, 'error');
        throw new Error('Failed to refresh token. Please reconnect.');
      }
    }

    // Decrypt and return current token
    if (!connection.accessToken) {
      throw new Error('No access token available');
    }

    return decryptPassword(connection.accessToken);
  }

  /**
   * Save encrypted tokens to database
   */
  async saveTokens(connectionId: string, tokens: TokenData): Promise<void> {
    const db = getDb();

    const encryptedAccessToken = encryptPassword(tokens.accessToken);
    const encryptedRefreshToken = tokens.refreshToken
      ? encryptPassword(tokens.refreshToken)
      : null;

    await db
      .update(integrationConnections)
      .set({
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, connectionId));

    logger.info(`Tokens saved for connection ${connectionId}`);
  }

  /**
   * Create a new integration connection
   */
  async createConnection(
    workspaceId: string,
    provider: string,
    tokens: TokenData,
    userInfo: { email?: string; name?: string; id?: string },
    scopes: string[] = []
  ): Promise<string> {
    const db = getDb();

    // Check for existing connection
    const [existing] = await db
      .select()
      .from(integrationConnections)
      .where(
        and(
          eq(integrationConnections.workspaceId, workspaceId),
          eq(integrationConnections.provider, provider)
        )
      )
      .limit(1);

    const encryptedAccessToken = encryptPassword(tokens.accessToken);
    const encryptedRefreshToken = tokens.refreshToken
      ? encryptPassword(tokens.refreshToken)
      : null;

    if (existing) {
      // Update existing connection
      await db
        .update(integrationConnections)
        .set({
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: tokens.expiresAt,
          accountId: userInfo.id,
          accountName: userInfo.name || userInfo.email,
          scopes: scopes,
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(integrationConnections.id, existing.id));

      logger.info(`Updated existing connection for ${provider}`);
      return existing.id;
    }

    // Create new connection
    const [newConnection] = await db
      .insert(integrationConnections)
      .values({
        workspaceId,
        provider,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        accountId: userInfo.id,
        accountName: userInfo.name || userInfo.email,
        scopes: scopes,
        status: 'active',
        metadata: { email: userInfo.email },
      })
      .returning();

    logger.info(`Created new connection for ${provider}: ${newConnection.id}`);
    return newConnection.id;
  }

  // ==========================================
  // CONNECTION MANAGEMENT
  // ==========================================

  /**
   * Get all connections for a workspace
   */
  async getConnections(workspaceId: string): Promise<IntegrationConnection[]> {
    const db = getDb();

    const connections = await db
      .select({
        id: integrationConnections.id,
        provider: integrationConnections.provider,
        status: integrationConnections.status,
        accountName: integrationConnections.accountName,
        scopes: integrationConnections.scopes,
        tokenExpiresAt: integrationConnections.tokenExpiresAt,
        lastSyncAt: integrationConnections.lastSyncAt,
        createdAt: integrationConnections.createdAt,
        metadata: integrationConnections.metadata,
      })
      .from(integrationConnections)
      .where(eq(integrationConnections.workspaceId, workspaceId))
      .orderBy(desc(integrationConnections.createdAt));

    return connections.map((conn) => ({
      id: conn.id,
      provider: conn.provider,
      status: conn.status as 'active' | 'expired' | 'error' | 'pending',
      accountEmail: (conn.metadata as Record<string, string>)?.email,
      accountName: conn.accountName || undefined,
      scopes: (conn.scopes as string[]) || [],
      expiresAt: conn.tokenExpiresAt || undefined,
      lastSyncAt: conn.lastSyncAt || undefined,
      createdAt: conn.createdAt!,
    }));
  }

  /**
   * Get a specific connection
   */
  async getConnection(connectionId: string): Promise<IntegrationConnection | null> {
    const db = getDb();

    const [connection] = await db
      .select()
      .from(integrationConnections)
      .where(eq(integrationConnections.id, connectionId))
      .limit(1);

    if (!connection) return null;

    return {
      id: connection.id,
      provider: connection.provider,
      status: connection.status as 'active' | 'expired' | 'error' | 'pending',
      accountEmail: (connection.metadata as Record<string, string>)?.email,
      accountName: connection.accountName || undefined,
      scopes: (connection.scopes as string[]) || [],
      expiresAt: connection.tokenExpiresAt || undefined,
      lastSyncAt: connection.lastSyncAt || undefined,
      createdAt: connection.createdAt!,
    };
  }

  /**
   * Get connection by provider
   */
  async getConnectionByProvider(
    workspaceId: string,
    provider: string
  ): Promise<IntegrationConnection | null> {
    const db = getDb();

    const [connection] = await db
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

    return {
      id: connection.id,
      provider: connection.provider,
      status: connection.status as 'active' | 'expired' | 'error' | 'pending',
      accountEmail: (connection.metadata as Record<string, string>)?.email,
      accountName: connection.accountName || undefined,
      scopes: (connection.scopes as string[]) || [],
      expiresAt: connection.tokenExpiresAt || undefined,
      lastSyncAt: connection.lastSyncAt || undefined,
      createdAt: connection.createdAt!,
    };
  }

  /**
   * Disconnect an integration
   */
  async disconnect(connectionId: string): Promise<void> {
    const db = getDb();

    const [connection] = await db
      .select()
      .from(integrationConnections)
      .where(eq(integrationConnections.id, connectionId))
      .limit(1);

    if (!connection) {
      throw new Error('Connection not found');
    }

    // Try to revoke token at provider
    if (connection.accessToken) {
      try {
        const decryptedToken = decryptPassword(connection.accessToken);
        await revokeToken(connection.provider, decryptedToken);
        logger.info(`Token revoked at ${connection.provider}`);
      } catch (error) {
        logger.warn(`Failed to revoke token at ${connection.provider}:`, error);
        // Continue with deletion even if revocation fails
      }
    }

    // Delete connection from database
    await db
      .delete(integrationConnections)
      .where(eq(integrationConnections.id, connectionId));

    logger.info(`Disconnected integration: ${connection.provider}`);
  }

  /**
   * Update connection status
   */
  async updateConnectionStatus(
    connectionId: string,
    status: 'active' | 'expired' | 'error' | 'pending'
  ): Promise<void> {
    const db = getDb();

    await db
      .update(integrationConnections)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, connectionId));
  }

  /**
   * Update last sync timestamp
   */
  async updateLastSync(connectionId: string, status?: string): Promise<void> {
    const db = getDb();

    await db
      .update(integrationConnections)
      .set({
        lastSyncAt: new Date(),
        lastSyncStatus: status || 'success',
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, connectionId));
  }

  // ==========================================
  // PROVIDER CATALOG
  // ==========================================

  /**
   * Get available providers with connection status
   */
  async getProvidersWithStatus(workspaceId: string): Promise<ProviderInfo[]> {
    const connections = await this.getConnections(workspaceId);
    const connectionMap = new Map(connections.map((c) => [c.provider, c]));

    return AVAILABLE_PROVIDERS.map((provider) => ({
      ...provider,
      isConnected: connectionMap.has(provider.id),
      connection: connectionMap.get(provider.id),
    }));
  }
}

// ============================================
// PROVIDER CATALOG
// ============================================

export const AVAILABLE_PROVIDERS: Omit<ProviderInfo, 'isConnected' | 'connection'>[] = [
  // Communication
  {
    id: 'gmail',
    name: 'Gmail',
    category: 'communication',
    icon: 'Mail',
    description: 'Read and send emails, manage labels',
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'communication',
    icon: 'MessageSquare',
    description: 'Send messages, manage channels',
  },
  {
    id: 'outlook',
    name: 'Outlook',
    category: 'communication',
    icon: 'Mail',
    description: 'Microsoft email and calendar',
  },

  // CRM
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'crm',
    icon: 'Users',
    description: 'Sync contacts, deals, and tickets',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'crm',
    icon: 'Cloud',
    description: 'Enterprise CRM integration',
  },

  // Finance
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'finance',
    icon: 'CreditCard',
    description: 'Payment processing and subscriptions',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    category: 'finance',
    icon: 'Calculator',
    description: 'Accounting and invoicing',
  },

  // Storage
  {
    id: 'google-drive',
    name: 'Google Drive',
    category: 'storage',
    icon: 'HardDrive',
    description: 'File storage and documents',
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    category: 'storage',
    icon: 'Box',
    description: 'Cloud file storage',
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'productivity',
    icon: 'FileText',
    description: 'Workspace and documentation',
  },

  // Social
  {
    id: 'linkedin',
    name: 'LinkedIn',
    category: 'social',
    icon: 'Linkedin',
    description: 'Professional networking',
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    category: 'social',
    icon: 'Twitter',
    description: 'Social media management',
  },
];

// ============================================
// MOCK OAUTH FLOW (for testing without real credentials)
// ============================================

export interface MockOAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * Simulate OAuth exchange for testing purposes
 * Returns mock tokens that can be used to test encryption/decryption
 */
export function simulateOAuthExchange(provider: string): {
  tokens: MockOAuthTokens;
  userInfo: { email: string; name: string; id: string };
} {
  const mockTokenPrefix = `mock_${provider}_`;

  return {
    tokens: {
      accessToken: `${mockTokenPrefix}access_${crypto.randomBytes(32).toString('hex')}`,
      refreshToken: `${mockTokenPrefix}refresh_${crypto.randomBytes(32).toString('hex')}`,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
    },
    userInfo: {
      email: `test.user@${provider === 'google' ? 'gmail.com' : `${provider}.com`}`,
      name: `Test User (${provider})`,
      id: `${provider}_user_${crypto.randomBytes(8).toString('hex')}`,
    },
  };
}

/**
 * Save connection with new AES-256-GCM encryption (returns IV and Tag separately)
 */
export async function saveConnectionSecure(
  userId: string,
  provider: string,
  category: string,
  tokens: { accessToken: string; refreshToken?: string; expiresAt?: Date },
  metadata: Record<string, unknown>
): Promise<string> {
  const db = getDb();

  // Encrypt access token with new method
  const encryptedAccess = encrypt(tokens.accessToken);

  // Encrypt refresh token if present
  let encryptedRefresh = null;
  if (tokens.refreshToken) {
    encryptedRefresh = encrypt(tokens.refreshToken);
  }

  // Check for existing connection
  const [existing] = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.userId, userId),
        eq(integrationConnections.provider, provider)
      )
    )
    .limit(1);

  if (existing) {
    // Update existing
    await db
      .update(integrationConnections)
      .set({
        accessToken: encryptedAccess.encryptedData,
        refreshToken: encryptedRefresh?.encryptedData || null,
        iv: encryptedAccess.iv,
        tag: encryptedAccess.tag,
        tokenExpiresAt: tokens.expiresAt,
        metadata,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, existing.id));

    logger.info(`Updated connection for ${provider} (user: ${userId})`);
    return existing.id;
  }

  // Create new connection
  const [newConn] = await db
    .insert(integrationConnections)
    .values({
      userId,
      provider,
      category,
      accessToken: encryptedAccess.encryptedData,
      refreshToken: encryptedRefresh?.encryptedData,
      iv: encryptedAccess.iv,
      tag: encryptedAccess.tag,
      tokenExpiresAt: tokens.expiresAt,
      metadata,
      status: 'active',
    })
    .returning();

  logger.info(`Created new connection for ${provider} (user: ${userId})`);
  return newConn.id;
}

/**
 * Get decrypted connection tokens
 */
export async function getConnectionWithDecryptedTokens(
  connectionId: string
): Promise<{ accessToken: string; refreshToken?: string } | null> {
  const db = getDb();

  const [conn] = await db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.id, connectionId))
    .limit(1);

  if (!conn || !conn.iv || !conn.tag) {
    return null;
  }

  try {
    const accessToken = decrypt(conn.accessToken, conn.iv, conn.tag);
    let refreshToken: string | undefined;

    if (conn.refreshToken) {
      refreshToken = decrypt(conn.refreshToken, conn.iv, conn.tag);
    }

    return { accessToken, refreshToken };
  } catch (error) {
    logger.error(`Failed to decrypt tokens for connection ${connectionId}:`, error);
    return null;
  }
}

/**
 * Delete connection by userId and provider
 */
export async function disconnectByProvider(
  userId: string,
  provider: string
): Promise<boolean> {
  const db = getDb();

  const result = await db
    .delete(integrationConnections)
    .where(
      and(
        eq(integrationConnections.userId, userId),
        eq(integrationConnections.provider, provider)
      )
    );

  logger.info(`Disconnected ${provider} for user ${userId}`);
  return true;
}

/**
 * Get all connections for a user (without tokens)
 */
export async function getUserConnections(userId: string): Promise<Array<{
  id: string;
  provider: string;
  category: string;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}>> {
  const db = getDb();

  const connections = await db
    .select({
      id: integrationConnections.id,
      provider: integrationConnections.provider,
      category: integrationConnections.category,
      status: integrationConnections.status,
      metadata: integrationConnections.metadata,
      createdAt: integrationConnections.createdAt,
    })
    .from(integrationConnections)
    .where(eq(integrationConnections.userId, userId))
    .orderBy(desc(integrationConnections.createdAt));

  return connections.map((c) => ({
    id: c.id,
    provider: c.provider,
    category: c.category || 'other',
    status: c.status,
    metadata: (c.metadata as Record<string, unknown>) || {},
    createdAt: c.createdAt!,
  }));
}

// Export singleton instance
export const integrationService = IntegrationService.getInstance();
