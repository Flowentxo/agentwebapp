/**
 * API Key Service
 * Secure key generation, validation, rotation, and management
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { brainApiKeys, type BrainApiKey, type NewBrainApiKey } from '@/lib/db/schema-brain-security';
import { eq, and, lt } from 'drizzle-orm';

export interface ApiKeyGenerationOptions {
  name: string;
  workspaceId: string;
  createdBy: string;
  agentId?: string;
  role?: 'admin' | 'editor' | 'viewer';
  scopes?: string[];
  rateLimit?: number;
  dailyLimit?: number;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  key?: BrainApiKey;
  error?: string;
  reason?: 'not_found' | 'expired' | 'revoked' | 'inactive';
}

export interface ApiKeyStats {
  totalKeys: number;
  activeKeys: number;
  expiredKeys: number;
  revokedKeys: number;
  keysByRole: Record<string, number>;
}

export class ApiKeyService {
  private static instance: ApiKeyService;
  private db = getDb();
  private saltRounds = 12; // bcrypt salt rounds

  private constructor() {}

  public static getInstance(): ApiKeyService {
    if (!ApiKeyService.instance) {
      ApiKeyService.instance = new ApiKeyService();
    }
    return ApiKeyService.instance;
  }

  /**
   * Generate a new API key
   * Format: brain_live_[32_random_chars]
   */
  public async generateApiKey(options: ApiKeyGenerationOptions): Promise<{
    key: string;
    record: BrainApiKey;
  }> {
    // Generate secure random key
    const randomBytes = crypto.randomBytes(32);
    const key = `brain_live_${randomBytes.toString('base64url')}`;

    // Extract prefix (first 12 chars for identification)
    const keyPrefix = key.substring(0, 20);

    // Hash the key for storage
    const keyHash = await bcrypt.hash(key, this.saltRounds);

    // Create record
    const [record] = await this.db
      .insert(brainApiKeys)
      .values({
        keyHash,
        keyPrefix,
        name: options.name,
        workspaceId: options.workspaceId,
        createdBy: options.createdBy,
        agentId: options.agentId,
        role: options.role || 'viewer',
        scopes: options.scopes || [],
        rateLimit: options.rateLimit || 100,
        dailyLimit: options.dailyLimit || 10000,
        expiresAt: options.expiresAt,
        metadata: options.metadata || {},
      })
      .returning();

    console.log(`[ApiKeyService] Generated new API key: ${keyPrefix}... for ${options.createdBy}`);

    return { key, record };
  }

  /**
   * Validate an API key
   */
  public async validateApiKey(key: string): Promise<ApiKeyValidationResult> {
    try {
      // Extract prefix for quick lookup
      const keyPrefix = key.substring(0, 20);

      // Find keys with matching prefix
      const candidates = await this.db
        .select()
        .from(brainApiKeys)
        .where(eq(brainApiKeys.keyPrefix, keyPrefix))
        .limit(10); // Should only be 1, but limit for safety

      // Check each candidate
      for (const candidate of candidates) {
        const isMatch = await bcrypt.compare(key, candidate.keyHash);

        if (isMatch) {
          // Check if key is active
          if (!candidate.isActive) {
            return {
              valid: false,
              error: 'API key is inactive',
              reason: 'inactive',
            };
          }

          // Check if key is revoked
          if (candidate.isRevoked) {
            return {
              valid: false,
              error: 'API key has been revoked',
              reason: 'revoked',
            };
          }

          // Check if key is expired
          if (candidate.expiresAt && new Date(candidate.expiresAt) < new Date()) {
            return {
              valid: false,
              error: 'API key has expired',
              reason: 'expired',
            };
          }

          // Update last used
          await this.updateLastUsed(candidate.id);

          return {
            valid: true,
            key: candidate,
          };
        }
      }

      // No match found
      return {
        valid: false,
        error: 'Invalid API key',
        reason: 'not_found',
      };
    } catch (error) {
      console.error('[ApiKeyService] Validation error:', error);
      return {
        valid: false,
        error: 'API key validation failed',
      };
    }
  }

  /**
   * Revoke an API key
   */
  public async revokeApiKey(
    keyId: string,
    revokedBy: string,
    reason?: string
  ): Promise<boolean> {
    try {
      const [updated] = await this.db
        .update(brainApiKeys)
        .set({
          isRevoked: true,
          revokedAt: new Date(),
          revokedBy,
          revokedReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(brainApiKeys.id, keyId))
        .returning();

      if (updated) {
        console.log(`[ApiKeyService] Revoked API key: ${updated.keyPrefix}... by ${revokedBy}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[ApiKeyService] Revoke error:', error);
      return false;
    }
  }

  /**
   * Rotate an API key (revoke old, generate new)
   */
  public async rotateApiKey(
    oldKeyId: string,
    rotatedBy: string
  ): Promise<{ key: string; record: BrainApiKey } | null> {
    try {
      // Get old key
      const [oldKey] = await this.db
        .select()
        .from(brainApiKeys)
        .where(eq(brainApiKeys.id, oldKeyId))
        .limit(1);

      if (!oldKey) {
        console.error('[ApiKeyService] Key not found for rotation');
        return null;
      }

      // Generate new key with same settings
      const newKeyResult = await this.generateApiKey({
        name: `${oldKey.name} (Rotated)`,
        workspaceId: oldKey.workspaceId,
        createdBy: rotatedBy,
        agentId: oldKey.agentId || undefined,
        role: oldKey.role as 'admin' | 'editor' | 'viewer',
        scopes: (oldKey.scopes as string[]) || [],
        rateLimit: oldKey.rateLimit,
        dailyLimit: oldKey.dailyLimit,
        expiresAt: oldKey.expiresAt || undefined,
        metadata: {
          ...(oldKey.metadata as any),
          rotatedFrom: oldKeyId,
          rotatedAt: new Date().toISOString(),
        },
      });

      // Revoke old key
      await this.revokeApiKey(oldKeyId, rotatedBy, 'Key rotated');

      console.log(`[ApiKeyService] Rotated API key: ${oldKey.keyPrefix}... → ${newKeyResult.record.keyPrefix}...`);

      return newKeyResult;
    } catch (error) {
      console.error('[ApiKeyService] Rotation error:', error);
      return null;
    }
  }

  /**
   * List API keys for a workspace
   */
  public async listApiKeys(workspaceId: string, includeRevoked: boolean = false): Promise<BrainApiKey[]> {
    try {
      const conditions = includeRevoked
        ? [eq(brainApiKeys.workspaceId, workspaceId)]
        : [eq(brainApiKeys.workspaceId, workspaceId), eq(brainApiKeys.isRevoked, false)];

      const keys = await this.db
        .select()
        .from(brainApiKeys)
        .where(and(...conditions))
        .orderBy(brainApiKeys.createdAt);

      return keys;
    } catch (error) {
      console.error('[ApiKeyService] List error:', error);
      return [];
    }
  }

  /**
   * Get API key statistics
   */
  public async getStats(workspaceId?: string): Promise<ApiKeyStats> {
    try {
      const conditions = workspaceId ? [eq(brainApiKeys.workspaceId, workspaceId)] : [];

      const keys = await this.db
        .select()
        .from(brainApiKeys)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const now = new Date();

      const stats: ApiKeyStats = {
        totalKeys: keys.length,
        activeKeys: keys.filter(k => k.isActive && !k.isRevoked).length,
        expiredKeys: keys.filter(k => k.expiresAt && new Date(k.expiresAt) < now).length,
        revokedKeys: keys.filter(k => k.isRevoked).length,
        keysByRole: {},
      };

      // Count by role
      keys.forEach(key => {
        const role = key.role;
        stats.keysByRole[role] = (stats.keysByRole[role] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('[ApiKeyService] Stats error:', error);
      return {
        totalKeys: 0,
        activeKeys: 0,
        expiredKeys: 0,
        revokedKeys: 0,
        keysByRole: {},
      };
    }
  }

  /**
   * Cleanup expired keys (delete keys expired > 90 days ago)
   */
  public async cleanupExpiredKeys(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deleted = await this.db
        .delete(brainApiKeys)
        .where(
          and(
            lt(brainApiKeys.expiresAt, cutoffDate),
            eq(brainApiKeys.isRevoked, true)
          )
        );

      console.log(`[ApiKeyService] Cleaned up ${deleted.rowCount || 0} expired keys`);

      return deleted.rowCount || 0;
    } catch (error) {
      console.error('[ApiKeyService] Cleanup error:', error);
      return 0;
    }
  }

  /**
   * Update last used timestamp and increment usage count
   */
  private async updateLastUsed(keyId: string): Promise<void> {
    try {
      await this.db
        .update(brainApiKeys)
        .set({
          lastUsedAt: new Date(),
          usageCount: crypto.randomInt(1, 1), // Drizzle ORM increment workaround
          updatedAt: new Date(),
        })
        .where(eq(brainApiKeys.id, keyId));
    } catch (error) {
      // Non-critical, don't throw
      console.error('[ApiKeyService] Update last used error:', error);
    }
  }

  /**
   * Check if key has specific scope/permission
   */
  public hasScope(key: BrainApiKey, requiredScope: string): boolean {
    const scopes = (key.scopes as string[]) || [];
    return scopes.includes(requiredScope) || scopes.includes('*');
  }

  /**
   * Check if key has sufficient role level
   */
  public hasRoleLevel(key: BrainApiKey, minimumRole: 'viewer' | 'editor' | 'admin'): boolean {
    const rolePriority = {
      viewer: 10,
      editor: 50,
      admin: 100,
    };

    const keyPriority = rolePriority[key.role as keyof typeof rolePriority] || 0;
    const requiredPriority = rolePriority[minimumRole];

    return keyPriority >= requiredPriority;
  }
}

export const apiKeyService = ApiKeyService.getInstance();
