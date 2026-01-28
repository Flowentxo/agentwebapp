/**
 * API Key Management Service
 *
 * Enterprise-grade API key generation, validation, and revocation.
 * Uses SHA256 for fast validation (not bcrypt) since API keys are
 * cryptographically random and don't need password-style protection.
 *
 * Key Format: flwnt_live_<32_random_bytes_base64url>
 * Example: flwnt_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 */

import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { apiKeys, apiKeyUsageLogs, apiKeyAuditEvents, type ApiKey, type ApiScope, API_SCOPES } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateApiKeyOptions {
  /** User-friendly name for the key (e.g., "Zapier Integration") */
  name: string;
  /** Workspace ID this key belongs to */
  workspaceId: string;
  /** User ID of the key owner */
  userId: string;
  /** Who created this key (may differ from userId for org admins) */
  createdBy: string;
  /** Scopes/permissions for this key */
  scopes?: ApiScope[];
  /** Environment: 'production' | 'development' | 'test' */
  environment?: 'production' | 'development' | 'test';
  /** Optional description */
  description?: string;
  /** Optional expiration date (null = no expiration) */
  expiresAt?: Date | null;
  /** Optional IP whitelist */
  ipWhitelist?: string[];
  /** Rate limit (requests per hour, default 1000) */
  rateLimit?: number;
}

export interface ValidateApiKeyResult {
  valid: boolean;
  key?: ApiKey;
  workspaceId?: string;
  userId?: string;
  scopes?: string[];
  error?: string;
  errorCode?: 'INVALID_FORMAT' | 'NOT_FOUND' | 'EXPIRED' | 'REVOKED' | 'INACTIVE';
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  environment: string;
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  usageCount: number;
}

// ============================================================================
// API KEY SERVICE
// ============================================================================

export class ApiKeyService {
  private static instance: ApiKeyService;

  private constructor() {}

  public static getInstance(): ApiKeyService {
    if (!ApiKeyService.instance) {
      ApiKeyService.instance = new ApiKeyService();
    }
    return ApiKeyService.instance;
  }

  // --------------------------------------------------------------------------
  // KEY GENERATION
  // --------------------------------------------------------------------------

  /**
   * Generate a new API key
   *
   * Creates a cryptographically secure API key with the format:
   * flwnt_live_<32_random_bytes_base64url>
   *
   * IMPORTANT: The raw key is returned ONLY ONCE. Store it securely.
   */
  public async generateKey(options: CreateApiKeyOptions): Promise<{
    rawKey: string;
    keyInfo: ApiKeyInfo;
  }> {
    const db = getDb();

    // Generate cryptographically secure random bytes
    const randomBytes = crypto.randomBytes(32);
    const base64Key = randomBytes.toString('base64url');

    // Determine prefix based on environment
    const envPrefix = options.environment === 'production' ? 'live' : options.environment || 'live';
    const rawKey = `sk_${envPrefix}_${base64Key}`;

    // Create prefix for identification (visible to user)
    const keyPrefix = rawKey.substring(0, 16); // "flwnt_live_XXXXXXXX"

    // Hash the key using SHA256 for storage
    const keyHash = this.hashKey(rawKey);

    // Insert into database
    const [created] = await db
      .insert(apiKeys)
      .values({
        name: options.name,
        keyPrefix,
        keyHash,
        userId: options.userId,
        createdBy: options.createdBy,
        scopes: options.scopes || [API_SCOPES.WORKFLOWS_EXECUTE],
        environment: options.environment || 'production',
        description: options.description,
        expiresAt: options.expiresAt,
        ipWhitelist: options.ipWhitelist,
        rateLimit: options.rateLimit || 1000,
        isActive: true,
      })
      .returning();

    // Log the creation event
    await this.logAuditEvent(created.id, 'created', options.createdBy);

    console.log(`[ApiKeyService] Generated new API key: ${keyPrefix}... for user ${options.userId}`);

    return {
      rawKey,
      keyInfo: this.toKeyInfo(created),
    };
  }

  // --------------------------------------------------------------------------
  // KEY VALIDATION
  // --------------------------------------------------------------------------

  /**
   * Validate an API key
   *
   * Hashes the incoming key and looks it up in the database.
   * Updates last_used_at timestamp on successful validation.
   */
  public async validateKey(rawKey: string): Promise<ValidateApiKeyResult> {
    const db = getDb();

    // Check format
    if (!rawKey || !rawKey.startsWith('sk_')) {
      return {
        valid: false,
        error: 'Invalid API key format',
        errorCode: 'INVALID_FORMAT',
      };
    }

    try {
      // Hash the incoming key
      const keyHash = this.hashKey(rawKey);

      // Look up by hash
      const [keyRecord] = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.keyHash, keyHash))
        .limit(1);

      if (!keyRecord) {
        return {
          valid: false,
          error: 'API key not found',
          errorCode: 'NOT_FOUND',
        };
      }

      // Check if key is active
      if (!keyRecord.isActive) {
        return {
          valid: false,
          error: 'API key is inactive',
          errorCode: 'INACTIVE',
        };
      }

      // Check if key is revoked
      if (keyRecord.revokedAt) {
        return {
          valid: false,
          error: 'API key has been revoked',
          errorCode: 'REVOKED',
        };
      }

      // Check if key is expired
      if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
        return {
          valid: false,
          error: 'API key has expired',
          errorCode: 'EXPIRED',
        };
      }

      // Update last used timestamp and increment usage count
      await db
        .update(apiKeys)
        .set({
          lastUsedAt: new Date(),
          usageCount: sql`${apiKeys.usageCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(apiKeys.id, keyRecord.id));

      return {
        valid: true,
        key: keyRecord,
        workspaceId: keyRecord.userId, // For workspace-scoped operations
        userId: keyRecord.userId,
        scopes: keyRecord.scopes as string[],
      };
    } catch (error) {
      console.error('[ApiKeyService] Validation error:', error);
      return {
        valid: false,
        error: 'Failed to validate API key',
      };
    }
  }

  // --------------------------------------------------------------------------
  // KEY MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * List all API keys for a user (masked, no hashes)
   */
  public async listKeys(userId: string, includeRevoked = false): Promise<ApiKeyInfo[]> {
    const db = getDb();

    const conditions = includeRevoked
      ? [eq(apiKeys.userId, userId)]
      : [eq(apiKeys.userId, userId), sql`${apiKeys.revokedAt} IS NULL`];

    const keys = await db
      .select()
      .from(apiKeys)
      .where(and(...conditions))
      .orderBy(desc(apiKeys.createdAt));

    return keys.map(this.toKeyInfo);
  }

  /**
   * Get a single API key by ID
   */
  public async getKey(keyId: string, userId: string): Promise<ApiKeyInfo | null> {
    const db = getDb();

    const [keyRecord] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
      .limit(1);

    return keyRecord ? this.toKeyInfo(keyRecord) : null;
  }

  /**
   * Revoke an API key
   */
  public async revokeKey(
    keyId: string,
    userId: string,
    revokedBy: string,
    reason?: string
  ): Promise<boolean> {
    const db = getDb();

    try {
      const [updated] = await db
        .update(apiKeys)
        .set({
          revokedAt: new Date(),
          revokedBy,
          revokedReason: reason || 'Manual revocation',
          isActive: false,
          updatedAt: new Date(),
        })
        .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
        .returning();

      if (updated) {
        await this.logAuditEvent(keyId, 'revoked', revokedBy, { reason });
        console.log(`[ApiKeyService] Revoked API key: ${updated.keyPrefix}...`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[ApiKeyService] Revoke error:', error);
      return false;
    }
  }

  /**
   * Delete an API key permanently
   */
  public async deleteKey(keyId: string, userId: string): Promise<boolean> {
    const db = getDb();

    try {
      const result = await db
        .delete(apiKeys)
        .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)));

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('[ApiKeyService] Delete error:', error);
      return false;
    }
  }

  /**
   * Update API key metadata (name, description, scopes)
   */
  public async updateKey(
    keyId: string,
    userId: string,
    updates: {
      name?: string;
      description?: string;
      scopes?: string[];
      isActive?: boolean;
      expiresAt?: Date | null;
    }
  ): Promise<ApiKeyInfo | null> {
    const db = getDb();

    try {
      const [updated] = await db
        .update(apiKeys)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
        .returning();

      if (updated) {
        await this.logAuditEvent(keyId, 'updated', userId, { updates });
        return this.toKeyInfo(updated);
      }

      return null;
    } catch (error) {
      console.error('[ApiKeyService] Update error:', error);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // SCOPE CHECKING
  // --------------------------------------------------------------------------

  /**
   * Check if an API key has a required scope
   */
  public hasScope(key: ApiKey, requiredScope: ApiScope): boolean {
    const scopes = (key.scopes as string[]) || [];
    return scopes.includes(requiredScope) || scopes.includes('*');
  }

  /**
   * Check if an API key has any of the required scopes
   */
  public hasAnyScope(key: ApiKey, requiredScopes: ApiScope[]): boolean {
    const scopes = (key.scopes as string[]) || [];
    if (scopes.includes('*')) return true;
    return requiredScopes.some((scope) => scopes.includes(scope));
  }

  /**
   * Check if an API key has all required scopes
   */
  public hasAllScopes(key: ApiKey, requiredScopes: ApiScope[]): boolean {
    const scopes = (key.scopes as string[]) || [];
    if (scopes.includes('*')) return true;
    return requiredScopes.every((scope) => scopes.includes(scope));
  }

  // --------------------------------------------------------------------------
  // USAGE LOGGING
  // --------------------------------------------------------------------------

  /**
   * Log API key usage for a request
   */
  public async logUsage(
    keyId: string,
    keyPrefix: string,
    request: {
      method: string;
      endpoint: string;
      statusCode: number;
      ipAddress?: string;
      userAgent?: string;
      responseTime?: number;
      tokensUsed?: number;
      errorMessage?: string;
    }
  ): Promise<void> {
    const db = getDb();

    try {
      await db.insert(apiKeyUsageLogs).values({
        apiKeyId: keyId,
        keyPrefix,
        method: request.method,
        endpoint: request.endpoint,
        statusCode: request.statusCode,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        responseTime: request.responseTime,
        tokensUsed: request.tokensUsed,
        errorMessage: request.errorMessage,
      });
    } catch (error) {
      // Non-critical, don't throw
      console.error('[ApiKeyService] Usage logging error:', error);
    }
  }

  // --------------------------------------------------------------------------
  // PRIVATE HELPERS
  // --------------------------------------------------------------------------

  /**
   * Hash an API key using SHA256
   * Fast and secure for random keys (no need for bcrypt's slow hashing)
   */
  private hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  /**
   * Convert a database record to safe ApiKeyInfo (without hash)
   */
  private toKeyInfo(record: ApiKey): ApiKeyInfo {
    return {
      id: record.id,
      name: record.name,
      keyPrefix: record.keyPrefix,
      scopes: record.scopes as string[],
      environment: record.environment,
      isActive: record.isActive,
      lastUsedAt: record.lastUsedAt,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
      usageCount: record.usageCount,
    };
  }

  /**
   * Log an audit event for the API key
   */
  private async logAuditEvent(
    keyId: string,
    eventType: 'created' | 'revoked' | 'updated' | 'rotated',
    performedBy: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    const db = getDb();

    try {
      await db.insert(apiKeyAuditEvents).values({
        apiKeyId: keyId,
        eventType,
        performedBy,
        changeDetails: details || {},
      });
    } catch (error) {
      // Non-critical, don't throw
      console.error('[ApiKeyService] Audit logging error:', error);
    }
  }
}

// Export singleton instance
export const apiKeyService = ApiKeyService.getInstance();

// Re-export scopes for convenience
export { API_SCOPES, SCOPE_GROUPS } from '@/lib/db/schema';
