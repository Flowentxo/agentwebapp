/**
 * Agent Authentication & Authorization System
 * Manages API keys for agent-to-brain communication
 */

import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

// ============================================
// Types
// ============================================

export interface AgentApiKey {
  id: string;
  agentId: string;
  keyHash: string;
  keyPrefix: string; // First 8 chars for identification
  name: string;
  permissions: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export interface AgentPermissions {
  canQueryKnowledge: boolean;
  canStoreContext: boolean;
  canIndexDocuments: boolean;
  canSendMetrics: boolean;
  canAccessAllWorkspaces: boolean;
}

// ============================================
// Agent Authentication Service
// ============================================

export class AgentAuth {
  private static instance: AgentAuth;

  private constructor() {}

  public static getInstance(): AgentAuth {
    if (!AgentAuth.instance) {
      AgentAuth.instance = new AgentAuth();
    }
    return AgentAuth.instance;
  }

  /**
   * Generate a new API key for an agent
   * Returns: { apiKey: string, keyId: string }
   */
  public async generateApiKey(
    agentId: string,
    name: string,
    permissions: string[] = ['query', 'context', 'metrics'],
    expiresInDays?: number
  ): Promise<{ apiKey: string; keyId: string }> {
    // Generate random API key (32 bytes = 64 hex chars)
    const apiKey = `brain_${crypto.randomBytes(32).toString('hex')}`;
    const keyPrefix = apiKey.substring(0, 13); // "brain_" + 7 chars

    // Hash the API key for storage (never store plaintext)
    const keyHash = this.hashApiKey(apiKey);

    // Calculate expiration
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Store in database
    const db = getDb();
    const result = await db.execute(sql`
      INSERT INTO agent_api_keys (
        agent_id,
        key_hash,
        key_prefix,
        name,
        permissions,
        expires_at,
        is_active
      ) VALUES (
        ${agentId},
        ${keyHash},
        ${keyPrefix},
        ${name},
        ${JSON.stringify(permissions)},
        ${expiresAt},
        true
      )
      RETURNING id
    `);

    const keyId = (result.rows[0] as any).id;

    return { apiKey, keyId };
  }

  /**
   * Validate API key and return agent info
   */
  public async validateApiKey(apiKey: string): Promise<{
    valid: boolean;
    agentId?: string;
    permissions?: string[];
    error?: string;
  }> {
    try {
      const keyHash = this.hashApiKey(apiKey);
      const db = getDb();

      const result = await db.execute(sql`
        SELECT
          id,
          agent_id,
          permissions,
          expires_at,
          is_active
        FROM agent_api_keys
        WHERE key_hash = ${keyHash}
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return { valid: false, error: 'Invalid API key' };
      }

      const key = result.rows[0] as any;

      // Check if active
      if (!key.is_active) {
        return { valid: false, error: 'API key is inactive' };
      }

      // Check if expired
      if (key.expires_at && new Date(key.expires_at) < new Date()) {
        return { valid: false, error: 'API key has expired' };
      }

      // Update last used timestamp
      await db.execute(sql`
        UPDATE agent_api_keys
        SET last_used_at = NOW()
        WHERE id = ${key.id}
      `);

      return {
        valid: true,
        agentId: key.agent_id,
        permissions: JSON.parse(key.permissions),
      };
    } catch (error) {
      console.error('[AgentAuth] validateApiKey failed:', error);
      return { valid: false, error: 'Validation error' };
    }
  }

  /**
   * Check if agent has specific permission
   */
  public hasPermission(
    permissions: string[],
    required: string
  ): boolean {
    return permissions.includes(required) || permissions.includes('*');
  }

  /**
   * Revoke an API key
   */
  public async revokeApiKey(keyId: string): Promise<boolean> {
    try {
      const db = getDb();
      await db.execute(sql`
        UPDATE agent_api_keys
        SET is_active = false
        WHERE id = ${keyId}
      `);
      return true;
    } catch (error) {
      console.error('[AgentAuth] revokeApiKey failed:', error);
      return false;
    }
  }

  /**
   * List all API keys for an agent
   */
  public async listApiKeys(agentId: string): Promise<AgentApiKey[]> {
    try {
      const db = getDb();
      const result = await db.execute(sql`
        SELECT
          id,
          agent_id,
          key_hash,
          key_prefix,
          name,
          permissions,
          expires_at,
          last_used_at,
          is_active,
          created_at
        FROM agent_api_keys
        WHERE agent_id = ${agentId}
        ORDER BY created_at DESC
      `);

      return result.rows.map((row: any) => ({
        id: row.id,
        agentId: row.agent_id,
        keyHash: row.key_hash,
        keyPrefix: row.key_prefix,
        name: row.name,
        permissions: JSON.parse(row.permissions),
        expiresAt: row.expires_at ? new Date(row.expires_at) : null,
        lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
        isActive: row.is_active,
        createdAt: new Date(row.created_at),
      }));
    } catch (error) {
      console.error('[AgentAuth] listApiKeys failed:', error);
      return [];
    }
  }

  /**
   * Hash API key using SHA-256
   */
  private hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Cleanup expired keys (run periodically)
   */
  public async cleanupExpiredKeys(): Promise<number> {
    try {
      const db = getDb();
      const result = await db.execute(sql`
        UPDATE agent_api_keys
        SET is_active = false
        WHERE expires_at < NOW()
          AND is_active = true
        RETURNING id
      `);

      return result.rows.length;
    } catch (error) {
      console.error('[AgentAuth] cleanupExpiredKeys failed:', error);
      return 0;
    }
  }
}

// Singleton export
export const agentAuth = AgentAuth.getInstance();
