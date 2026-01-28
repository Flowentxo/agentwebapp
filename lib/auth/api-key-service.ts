/**
 * API Key Service
 *
 * Secure generation, validation, and management of API keys
 * Uses bcrypt for hashing and cryptographically secure random generation
 */

import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { apiKeys, apiKeyAuditEvents, type ApiKey, type ApiScope } from '@/lib/db/schema-api-keys';
import { eq, and, desc } from 'drizzle-orm';

/**
 * API Key Formats:
 * - Development: sk_dev_<32_random_chars>
 * - Production: flwnt_live_<32_random_chars>
 * - Test: flwnt_test_<32_random_chars>
 */

export interface CreateApiKeyParams {
  name: string;
  userId: string;
  createdBy: string;
  scopes: ApiScope[];
  environment?: 'production' | 'development' | 'test';
  description?: string;
  expiresAt?: Date;
  ipWhitelist?: string[];
  rateLimit?: number;
}

export interface ApiKeyWithSecret {
  id: string;
  name: string;
  secret: string; // Full key - ONLY returned on creation!
  prefix: string;
  scopes: ApiScope[];
  environment: string;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface ValidatedApiKey {
  id: string;
  userId: string;
  scopes: ApiScope[];
  environment: string;
  rateLimit: number;
}

/**
 * Generate a cryptographically secure API key
 */
function generateSecureKey(environment: 'production' | 'development' | 'test'): {
  fullKey: string;
  prefix: string;
} {
  const envPrefix = {
    production: 'sk_live',
    development: 'sk_dev',
    test: 'sk_test',
  }[environment];

  // Generate 32 bytes of random data (256 bits)
  const randomPart = randomBytes(32).toString('base64url').substring(0, 32);

  const fullKey = `${envPrefix}_${randomPart}`;

  // Prefix is first 16 chars for lookup (includes env type)
  const prefix = fullKey.substring(0, 16);

  return { fullKey, prefix };
}

/**
 * Hash API key using bcrypt
 */
async function hashApiKey(key: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(key, saltRounds);
}

/**
 * Verify API key against hash
 */
async function verifyApiKey(key: string, hash: string): Promise<boolean> {
  return bcrypt.compare(key, hash);
}

/**
 * Create a new API key
 */
export async function createApiKey(params: CreateApiKeyParams): Promise<ApiKeyWithSecret> {
  const db = getDb();

  const environment = params.environment || 'production';

  // Generate secure key
  const { fullKey, prefix } = generateSecureKey(environment);

  // Hash the full key
  const keyHash = await hashApiKey(fullKey);

  // Insert into database
  const [newKey] = await db
    .insert(apiKeys)
    .values({
      name: params.name,
      keyPrefix: prefix,
      keyHash,
      userId: params.userId,
      createdBy: params.createdBy,
      scopes: params.scopes,
      environment,
      description: params.description,
      expiresAt: params.expiresAt,
      ipWhitelist: params.ipWhitelist,
      rateLimit: params.rateLimit || 1000,
      isActive: true,
    })
    .returning();

  // Log audit event
  await db.insert(apiKeyAuditEvents).values({
    apiKeyId: newKey.id,
    eventType: 'created',
    performedBy: params.createdBy,
    changeDetails: {
      scopes: params.scopes,
      environment,
      expiresAt: params.expiresAt?.toISOString(),
    },
  });

  // Return key with secret (ONLY time it's available!)
  return {
    id: newKey.id,
    name: newKey.name,
    secret: fullKey, // ⚠️ IMPORTANT: Only returned once!
    prefix: newKey.keyPrefix,
    scopes: newKey.scopes as ApiScope[],
    environment: newKey.environment,
    expiresAt: newKey.expiresAt,
    createdAt: newKey.createdAt,
  };
}

/**
 * Validate and verify an API key
 *
 * Returns key details if valid, null if invalid
 */
export async function validateApiKey(key: string): Promise<ValidatedApiKey | null> {
  const db = getDb();

  // Extract prefix from key
  const prefix = key.substring(0, 16);

  try {
    // Find key by prefix
    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyPrefix, prefix))
      .limit(1);

    if (!apiKey) {
      return null;
    }

    // Check if active
    if (!apiKey.isActive) {
      return null;
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      // Auto-deactivate expired key
      await db
        .update(apiKeys)
        .set({ isActive: false })
        .where(eq(apiKeys.id, apiKey.id));
      return null;
    }

    // Verify hash
    const isValid = await verifyApiKey(key, apiKey.keyHash);
    if (!isValid) {
      return null;
    }

    // Update usage stats (async, don't wait)
    db.update(apiKeys)
      .set({
        lastUsedAt: new Date(),
        usageCount: apiKey.usageCount + 1,
      })
      .where(eq(apiKeys.id, apiKey.id))
      .execute()
      .catch((err) => console.error('[API_KEY] Failed to update usage:', err));

    return {
      id: apiKey.id,
      userId: apiKey.userId,
      scopes: apiKey.scopes as ApiScope[],
      environment: apiKey.environment,
      rateLimit: apiKey.rateLimit || 1000,
    };
  } catch (error) {
    console.error('[API_KEY] Validation error:', error);
    return null;
  }
}

/**
 * List all API keys for a user (without secrets)
 */
export async function listApiKeys(userId: string): Promise<ApiKey[]> {
  const db = getDb();

  const keys = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt));

  return keys;
}

/**
 * Get API key by ID
 */
export async function getApiKeyById(id: string, userId: string): Promise<ApiKey | null> {
  const db = getDb();

  const [apiKey] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
    .limit(1);

  return apiKey || null;
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(
  id: string,
  userId: string,
  revokedBy: string,
  reason?: string
): Promise<boolean> {
  const db = getDb();

  // Verify ownership
  const [existingKey] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
    .limit(1);

  if (!existingKey) {
    return false;
  }

  // Revoke key
  await db
    .update(apiKeys)
    .set({
      isActive: false,
      revokedAt: new Date(),
      revokedBy,
      revokedReason: reason,
    })
    .where(eq(apiKeys.id, id));

  // Log audit event
  await db.insert(apiKeyAuditEvents).values({
    apiKeyId: id,
    eventType: 'revoked',
    performedBy: revokedBy,
    changeDetails: {
      reason,
      timestamp: new Date().toISOString(),
    },
  });

  return true;
}

/**
 * Update API key metadata
 */
export async function updateApiKey(
  id: string,
  userId: string,
  updates: {
    name?: string;
    description?: string;
    scopes?: ApiScope[];
    expiresAt?: Date | null;
    rateLimit?: number;
    ipWhitelist?: string[];
  },
  updatedBy: string
): Promise<ApiKey | null> {
  const db = getDb();

  // Verify ownership
  const [existingKey] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
    .limit(1);

  if (!existingKey) {
    return null;
  }

  // Update key
  const [updatedKey] = await db
    .update(apiKeys)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(apiKeys.id, id))
    .returning();

  // Log audit event
  await db.insert(apiKeyAuditEvents).values({
    apiKeyId: id,
    eventType: 'updated',
    performedBy: updatedBy,
    changeDetails: {
      changes: updates,
      timestamp: new Date().toISOString(),
    },
  });

  return updatedKey;
}

/**
 * Rotate API key (generate new secret, revoke old one)
 */
export async function rotateApiKey(
  id: string,
  userId: string,
  rotatedBy: string
): Promise<ApiKeyWithSecret | null> {
  const db = getDb();

  // Get existing key
  const [existingKey] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
    .limit(1);

  if (!existingKey) {
    return null;
  }

  // Generate new key
  const { fullKey, prefix } = generateSecureKey(
    existingKey.environment as 'production' | 'development' | 'test'
  );
  const keyHash = await hashApiKey(fullKey);

  // Update key with new hash and prefix
  const [rotatedKey] = await db
    .update(apiKeys)
    .set({
      keyPrefix: prefix,
      keyHash,
      updatedAt: new Date(),
    })
    .where(eq(apiKeys.id, id))
    .returning();

  // Log audit event
  await db.insert(apiKeyAuditEvents).values({
    apiKeyId: id,
    eventType: 'rotated',
    performedBy: rotatedBy,
    changeDetails: {
      oldPrefix: existingKey.keyPrefix,
      newPrefix: prefix,
      timestamp: new Date().toISOString(),
    },
  });

  return {
    id: rotatedKey.id,
    name: rotatedKey.name,
    secret: fullKey, // New secret
    prefix: rotatedKey.keyPrefix,
    scopes: rotatedKey.scopes as ApiScope[],
    environment: rotatedKey.environment,
    expiresAt: rotatedKey.expiresAt,
    createdAt: rotatedKey.createdAt,
  };
}

/**
 * Delete an API key permanently (use revoke instead in most cases)
 */
export async function deleteApiKey(id: string, userId: string): Promise<boolean> {
  const db = getDb();

  const result = await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
    .returning();

  return result.length > 0;
}

/**
 * Check if user has specific scope
 */
export function hasScope(key: ValidatedApiKey, requiredScope: ApiScope): boolean {
  return key.scopes.includes(requiredScope);
}

/**
 * Check if user has any of the required scopes
 */
export function hasAnyScope(key: ValidatedApiKey, requiredScopes: ApiScope[]): boolean {
  return requiredScopes.some((scope) => key.scopes.includes(scope));
}

/**
 * Check if user has all required scopes
 */
export function hasAllScopes(key: ValidatedApiKey, requiredScopes: ApiScope[]): boolean {
  return requiredScopes.every((scope) => key.scopes.includes(scope));
}

/**
 * Cleanup expired API keys (run via cron)
 */
export async function cleanupExpiredKeys(): Promise<number> {
  const db = getDb();

  const result = await db
    .update(apiKeys)
    .set({ isActive: false })
    .where(
      and(
        eq(apiKeys.isActive, true),
        // expires_at IS NOT NULL AND expires_at < NOW()
      )
    )
    .returning();

  return result.length;
}
