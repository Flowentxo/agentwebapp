/**
 * Integration Repository
 * Database operations for storing and managing OAuth connections
 */

import { getDb } from '@/lib/db/connection';
import { integrations, integrationEvents } from '@/lib/db/schema';
import { encrypt, decrypt } from '@/lib/auth/oauth';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { TokenData, UserInfo } from './oauth-service';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'token_expired';

export interface IntegrationRecord {
  id: string;
  userId: string;
  provider: string;
  service: string;
  status: IntegrationStatus;
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: Date | null;
  scopes: string[];
  connectedEmail?: string;
  connectedName?: string;
  connectedAvatar?: string;
  metadata: Record<string, unknown>;
  connectedAt: Date;
  updatedAt: Date;
}

export interface CreateIntegrationInput {
  userId: string;
  provider: string;
  service: string;
  tokens: TokenData;
  userInfo?: UserInfo;
  metadata?: Record<string, unknown>;
}

export interface UpdateIntegrationInput {
  status?: IntegrationStatus;
  tokens?: TokenData;
  userInfo?: UserInfo;
  metadata?: Record<string, unknown>;
}

/**
 * Get integration by user, provider, and service
 */
export async function getIntegration(
  userId: string,
  provider: string,
  service: string = 'default'
): Promise<IntegrationRecord | null> {
  const db = getDb();

  const results = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, userId),
        eq(integrations.provider, provider),
        eq(integrations.service, service)
      )
    )
    .limit(1);

  if (results.length === 0) return null;

  const record = results[0];

  // Decrypt tokens
  return {
    ...record,
    accessToken: decrypt(record.accessToken),
    refreshToken: record.refreshToken ? decrypt(record.refreshToken) : undefined,
    scopes: (record.scopes as string[]) || [],
    metadata: (record.metadata as Record<string, unknown>) || {},
  } as IntegrationRecord;
}

/**
 * Get all integrations for a user
 */
export async function getUserIntegrations(userId: string): Promise<IntegrationRecord[]> {
  const db = getDb();

  const results = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, userId))
    .orderBy(desc(integrations.connectedAt));

  return results.map(record => ({
    ...record,
    accessToken: decrypt(record.accessToken),
    refreshToken: record.refreshToken ? decrypt(record.refreshToken) : undefined,
    scopes: (record.scopes as string[]) || [],
    metadata: (record.metadata as Record<string, unknown>) || {},
  })) as IntegrationRecord[];
}

/**
 * Get all integrations by provider
 */
export async function getIntegrationsByProvider(
  provider: string
): Promise<IntegrationRecord[]> {
  const db = getDb();

  const results = await db
    .select()
    .from(integrations)
    .where(eq(integrations.provider, provider))
    .orderBy(desc(integrations.connectedAt));

  return results.map(record => ({
    ...record,
    accessToken: decrypt(record.accessToken),
    refreshToken: record.refreshToken ? decrypt(record.refreshToken) : undefined,
    scopes: (record.scopes as string[]) || [],
    metadata: (record.metadata as Record<string, unknown>) || {},
  })) as IntegrationRecord[];
}

/**
 * Create or update integration
 */
export async function upsertIntegration(input: CreateIntegrationInput): Promise<IntegrationRecord> {
  const db = getDb();

  // Encrypt tokens
  const encryptedAccessToken = encrypt(input.tokens.accessToken);
  const encryptedRefreshToken = input.tokens.refreshToken
    ? encrypt(input.tokens.refreshToken)
    : null;

  // Prepare values
  const values = {
    userId: input.userId,
    provider: input.provider,
    service: input.service,
    status: 'connected' as const,
    accessToken: encryptedAccessToken,
    refreshToken: encryptedRefreshToken,
    tokenType: input.tokens.tokenType || 'Bearer',
    expiresAt: input.tokens.expiresAt,
    scopes: input.tokens.scope?.split(' ') || [],
    connectedEmail: input.userInfo?.email,
    connectedName: input.userInfo?.name,
    connectedAvatar: input.userInfo?.picture,
    metadata: input.metadata || {},
    updatedAt: new Date(),
  };

  // Check if exists
  const existing = await getIntegration(input.userId, input.provider, input.service);

  if (existing) {
    // Update existing
    await db
      .update(integrations)
      .set(values)
      .where(
        and(
          eq(integrations.userId, input.userId),
          eq(integrations.provider, input.provider),
          eq(integrations.service, input.service)
        )
      );

    // Log event
    await logIntegrationEvent(existing.id, 'reconnected', {
      previousStatus: existing.status,
    });

    return { ...existing, ...values, accessToken: input.tokens.accessToken, refreshToken: input.tokens.refreshToken };
  } else {
    // Insert new
    const [created] = await db
      .insert(integrations)
      .values({
        ...values,
        connectedAt: new Date(),
      })
      .returning();

    // Log event
    await logIntegrationEvent(created.id, 'connected', {
      provider: input.provider,
      service: input.service,
    });

    return {
      ...created,
      accessToken: input.tokens.accessToken,
      refreshToken: input.tokens.refreshToken,
      scopes: values.scopes as string[],
      metadata: values.metadata as Record<string, unknown>,
    } as IntegrationRecord;
  }
}

/**
 * Update integration tokens
 */
export async function updateIntegrationTokens(
  integrationId: string,
  tokens: TokenData
): Promise<void> {
  const db = getDb();

  const encryptedAccessToken = encrypt(tokens.accessToken);
  const encryptedRefreshToken = tokens.refreshToken
    ? encrypt(tokens.refreshToken)
    : undefined;

  await db
    .update(integrations)
    .set({
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken || sql`refresh_token`, // Keep existing if not provided
      expiresAt: tokens.expiresAt,
      status: 'connected',
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, integrationId));

  await logIntegrationEvent(integrationId, 'token_refreshed', {
    newExpiresAt: tokens.expiresAt,
  });
}

/**
 * Update integration status
 */
export async function updateIntegrationStatus(
  integrationId: string,
  status: IntegrationStatus,
  errorMessage?: string
): Promise<void> {
  const db = getDb();

  const metadata: Record<string, unknown> = {};
  if (errorMessage) {
    metadata.lastError = errorMessage;
    metadata.errorAt = new Date().toISOString();
  }

  await db
    .update(integrations)
    .set({
      status,
      metadata: sql`metadata || ${JSON.stringify(metadata)}::jsonb`,
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, integrationId));

  await logIntegrationEvent(integrationId, status === 'error' ? 'error' : 'status_changed', {
    newStatus: status,
    errorMessage,
  });
}

/**
 * Disconnect integration
 */
export async function disconnectIntegration(
  userId: string,
  provider: string,
  service: string = 'default'
): Promise<boolean> {
  const db = getDb();

  const result = await db
    .update(integrations)
    .set({
      status: 'disconnected',
      accessToken: '',
      refreshToken: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(integrations.userId, userId),
        eq(integrations.provider, provider),
        eq(integrations.service, service)
      )
    )
    .returning({ id: integrations.id });

  if (result.length > 0) {
    await logIntegrationEvent(result[0].id, 'disconnected', {});
    return true;
  }

  return false;
}

/**
 * Delete integration completely
 */
export async function deleteIntegration(
  userId: string,
  provider: string,
  service: string = 'default'
): Promise<boolean> {
  const db = getDb();

  const result = await db
    .delete(integrations)
    .where(
      and(
        eq(integrations.userId, userId),
        eq(integrations.provider, provider),
        eq(integrations.service, service)
      )
    )
    .returning({ id: integrations.id });

  return result.length > 0;
}

/**
 * Get integration with valid access token (refresh if needed)
 */
export async function getValidAccessToken(
  userId: string,
  provider: string,
  service: string = 'default'
): Promise<{ accessToken: string; integration: IntegrationRecord } | null> {
  const integration = await getIntegration(userId, provider, service);

  if (!integration || integration.status === 'disconnected') {
    return null;
  }

  // Check if token is expired
  if (integration.expiresAt && new Date() >= integration.expiresAt) {
    // Need to refresh
    if (!integration.refreshToken) {
      await updateIntegrationStatus(integration.id, 'token_expired');
      return null;
    }

    // Import refresh function dynamically to avoid circular dependency
    const { refreshAccessToken } = await import('./oauth-service');

    try {
      const newTokens = await refreshAccessToken(provider, integration.refreshToken);
      await updateIntegrationTokens(integration.id, newTokens);

      return {
        accessToken: newTokens.accessToken,
        integration: {
          ...integration,
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          expiresAt: newTokens.expiresAt,
        },
      };
    } catch (error) {
      console.error(`[INTEGRATION] Failed to refresh token for ${provider}:`, error);
      await updateIntegrationStatus(integration.id, 'error', 'Token refresh failed');
      return null;
    }
  }

  return { accessToken: integration.accessToken, integration };
}

/**
 * Log integration event
 */
export async function logIntegrationEvent(
  integrationId: string,
  eventType: string,
  details: Record<string, unknown>
): Promise<void> {
  const db = getDb();

  try {
    await db.insert(integrationEvents).values({
      integrationId,
      eventType,
      details,
    });
  } catch (error) {
    console.error('[INTEGRATION_EVENT_LOG_ERROR]', error);
  }
}

/**
 * Get integration events
 */
export async function getIntegrationEvents(
  integrationId: string,
  limit: number = 50
): Promise<Array<{
  id: string;
  eventType: string;
  details: Record<string, unknown>;
  createdAt: Date;
}>> {
  const db = getDb();

  const results = await db
    .select()
    .from(integrationEvents)
    .where(eq(integrationEvents.integrationId, integrationId))
    .orderBy(desc(integrationEvents.createdAt))
    .limit(limit);

  return results.map(r => ({
    ...r,
    details: r.details as Record<string, unknown>,
  }));
}

/**
 * Get integration statistics
 */
export async function getIntegrationStats(userId: string): Promise<{
  total: number;
  connected: number;
  error: number;
  byProvider: Record<string, number>;
}> {
  const db = getDb();

  const results = await db
    .select({
      provider: integrations.provider,
      status: integrations.status,
    })
    .from(integrations)
    .where(eq(integrations.userId, userId));

  const stats = {
    total: results.length,
    connected: 0,
    error: 0,
    byProvider: {} as Record<string, number>,
  };

  for (const row of results) {
    if (row.status === 'connected') stats.connected++;
    if (row.status === 'error') stats.error++;

    stats.byProvider[row.provider] = (stats.byProvider[row.provider] || 0) + 1;
  }

  return stats;
}

/**
 * Bulk update integration metadata
 */
export async function updateIntegrationMetadata(
  integrationId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const db = getDb();

  await db
    .update(integrations)
    .set({
      metadata: sql`metadata || ${JSON.stringify(metadata)}::jsonb`,
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, integrationId));
}
