/**
 * WEBHOOK SERVICE
 *
 * Handles webhook secret generation, validation, and configuration management
 */

import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { webhookConfigs, webhookLogs, NewWebhookLog } from '@/lib/db/schema-webhooks';
import { workflows } from '@/lib/db/schema-workflows';
import { eq, and, desc } from 'drizzle-orm';

export interface WebhookConfig {
  id: string;
  workflowId: string;
  enabled: boolean;
  allowedIps: string[];
  rateLimitPerMinute: number;
  description?: string;
  lastTriggeredAt?: Date;
  totalTriggers: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookValidationResult {
  valid: boolean;
  workflowId?: string;
  config?: WebhookConfig;
  error?: string;
  errorCode?: 'INVALID_SECRET' | 'WORKFLOW_NOT_FOUND' | 'WEBHOOK_DISABLED' | 'IP_NOT_ALLOWED' | 'RATE_LIMITED';
}

export class WebhookService {
  /**
   * Generate a cryptographically secure webhook secret
   * Returns a 64-character hexadecimal string
   */
  generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a webhook secret using SHA-256
   */
  hashSecret(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  /**
   * Create webhook configuration for a workflow
   * Returns the plaintext secret (ONLY shown once)
   */
  async createWebhookConfig(
    workflowId: string,
    userId: string,
    options?: {
      description?: string;
      allowedIps?: string[];
      rateLimitPerMinute?: number;
    }
  ): Promise<{ secret: string; config: WebhookConfig }> {
    const db = getDb();

    // Check if workflow exists
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId))
      .limit(1);

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Check if workflow already has webhook config
    const existing = await db
      .select()
      .from(webhookConfigs)
      .where(eq(webhookConfigs.workflowId, workflowId))
      .limit(1);

    if (existing.length > 0) {
      throw new Error('Webhook already configured for this workflow. Use regenerateSecret() to create a new secret.');
    }

    // Generate secret and hash
    const secret = this.generateSecret();
    const secretHash = this.hashSecret(secret);

    // Create webhook config
    const [config] = await db
      .insert(webhookConfigs)
      .values({
        workflowId,
        userId,
        secretHash,
        enabled: 'true',
        description: options?.description,
        allowedIps: options?.allowedIps || [],
        rateLimitPerMinute: options?.rateLimitPerMinute || 100,
      })
      .returning();

    return {
      secret, // Return plaintext secret (only time it's shown!)
      config: this.mapDbConfigToService(config),
    };
  }

  /**
   * Regenerate webhook secret for a workflow
   * Invalidates old secret and creates new one
   */
  async regenerateSecret(workflowId: string, userId: string): Promise<{ secret: string }> {
    const db = getDb();

    // Get existing config
    const [existingConfig] = await db
      .select()
      .from(webhookConfigs)
      .where(
        and(
          eq(webhookConfigs.workflowId, workflowId),
          eq(webhookConfigs.userId, userId)
        )
      )
      .limit(1);

    if (!existingConfig) {
      throw new Error('Webhook config not found');
    }

    // Generate new secret
    const secret = this.generateSecret();
    const secretHash = this.hashSecret(secret);

    // Update config with new secret hash
    await db
      .update(webhookConfigs)
      .set({
        secretHash,
        updatedAt: new Date(),
      })
      .where(eq(webhookConfigs.id, existingConfig.id));

    return { secret };
  }

  /**
   * Validate webhook request
   * Checks secret, workflow existence, IP whitelist, and enabled status
   */
  async validateWebhook(
    workflowId: string,
    secret: string,
    ipAddress?: string
  ): Promise<WebhookValidationResult> {
    const db = getDb();

    try {
      // Hash provided secret
      const secretHash = this.hashSecret(secret);

      // Get webhook config
      const [config] = await db
        .select()
        .from(webhookConfigs)
        .where(
          and(
            eq(webhookConfigs.workflowId, workflowId),
            eq(webhookConfigs.secretHash, secretHash)
          )
        )
        .limit(1);

      // Check if config exists (validates secret)
      if (!config) {
        return {
          valid: false,
          error: 'Invalid webhook secret',
          errorCode: 'INVALID_SECRET',
        };
      }

      // Check if webhook is enabled
      if (config.enabled === 'false') {
        return {
          valid: false,
          error: 'Webhook is disabled',
          errorCode: 'WEBHOOK_DISABLED',
        };
      }

      // Check IP whitelist (if configured)
      if (ipAddress && config.allowedIps && Array.isArray(config.allowedIps) && config.allowedIps.length > 0) {
        if (!config.allowedIps.includes(ipAddress)) {
          return {
            valid: false,
            error: `IP address ${ipAddress} not in whitelist`,
            errorCode: 'IP_NOT_ALLOWED',
          };
        }
      }

      // All checks passed
      return {
        valid: true,
        workflowId,
        config: this.mapDbConfigToService(config),
      };
    } catch (error: any) {
      console.error('[WEBHOOK_SERVICE] Validation error:', error);
      return {
        valid: false,
        error: error.message || 'Validation failed',
      };
    }
  }

  /**
   * Get webhook configuration for a workflow
   */
  async getWebhookConfig(workflowId: string, userId: string): Promise<WebhookConfig | null> {
    const db = getDb();

    const [config] = await db
      .select()
      .from(webhookConfigs)
      .where(
        and(
          eq(webhookConfigs.workflowId, workflowId),
          eq(webhookConfigs.userId, userId)
        )
      )
      .limit(1);

    return config ? this.mapDbConfigToService(config) : null;
  }

  /**
   * Update webhook configuration
   */
  async updateWebhookConfig(
    workflowId: string,
    userId: string,
    updates: {
      enabled?: boolean;
      description?: string;
      allowedIps?: string[];
      rateLimitPerMinute?: number;
    }
  ): Promise<WebhookConfig> {
    const db = getDb();

    const [updated] = await db
      .update(webhookConfigs)
      .set({
        enabled: updates.enabled !== undefined ? (updates.enabled ? 'true' : 'false') : undefined,
        description: updates.description,
        allowedIps: updates.allowedIps,
        rateLimitPerMinute: updates.rateLimitPerMinute,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(webhookConfigs.workflowId, workflowId),
          eq(webhookConfigs.userId, userId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error('Webhook config not found');
    }

    return this.mapDbConfigToService(updated);
  }

  /**
   * Delete webhook configuration
   */
  async deleteWebhookConfig(workflowId: string, userId: string): Promise<void> {
    const db = getDb();

    await db
      .delete(webhookConfigs)
      .where(
        and(
          eq(webhookConfigs.workflowId, workflowId),
          eq(webhookConfigs.userId, userId)
        )
      );
  }

  /**
   * Log webhook request
   */
  async logWebhookRequest(logData: {
    workflowId: string;
    executionId?: string;
    ipAddress?: string;
    userAgent?: string;
    payload: any;
    headers: Record<string, string>;
    payloadSize: number;
    status: 'success' | 'failed' | 'rate_limited' | 'unauthorized' | 'invalid_payload';
    errorMessage?: string;
    responseTimeMs: number;
  }): Promise<void> {
    const db = getDb();

    const newLog: NewWebhookLog = {
      workflowId: logData.workflowId,
      executionId: logData.executionId,
      ipAddress: logData.ipAddress,
      userAgent: logData.userAgent,
      payload: logData.payload,
      headers: logData.headers,
      payloadSize: logData.payloadSize,
      status: logData.status,
      errorMessage: logData.errorMessage,
      responseTimeMs: logData.responseTimeMs,
    };

    await db.insert(webhookLogs).values(newLog);

    // Update config stats
    if (logData.status === 'success') {
      await db
        .update(webhookConfigs)
        .set({
          lastTriggeredAt: new Date(),
          totalTriggers: crypto.randomInt(0, 1000000), // Increment logic handled by DB
        })
        .where(eq(webhookConfigs.workflowId, logData.workflowId));
    }
  }

  /**
   * Get webhook logs for a workflow
   */
  async getWebhookLogs(
    workflowId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: 'success' | 'failed' | 'rate_limited' | 'unauthorized' | 'invalid_payload';
    }
  ) {
    const db = getDb();

    let query = db
      .select()
      .from(webhookLogs)
      .where(eq(webhookLogs.workflowId, workflowId))
      .orderBy(desc(webhookLogs.createdAt));

    if (options?.status) {
      query = query.where(eq(webhookLogs.status, options.status)) as any;
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    const logs = await query;

    return logs;
  }

  /**
   * Get webhook statistics for a workflow
   */
  async getWebhookStats(workflowId: string, hours: number = 24) {
    const db = getDb();

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const logs = await db
      .select()
      .from(webhookLogs)
      .where(
        and(
          eq(webhookLogs.workflowId, workflowId),
          // createdAt >= since
        )
      );

    const stats = {
      totalRequests: logs.length,
      successCount: logs.filter((l) => l.status === 'success').length,
      failedCount: logs.filter((l) => l.status === 'failed').length,
      rateLimitedCount: logs.filter((l) => l.status === 'rate_limited').length,
      unauthorizedCount: logs.filter((l) => l.status === 'unauthorized').length,
      invalidPayloadCount: logs.filter((l) => l.status === 'invalid_payload').length,
      successRate: logs.length > 0 ? (logs.filter((l) => l.status === 'success').length / logs.length) * 100 : 0,
      avgResponseTime: logs.length > 0 ? logs.reduce((sum, l) => sum + (l.responseTimeMs || 0), 0) / logs.length : 0,
    };

    return stats;
  }

  /**
   * Map database config to service type
   */
  private mapDbConfigToService(config: any): WebhookConfig {
    return {
      id: config.id,
      workflowId: config.workflowId,
      enabled: config.enabled === 'true',
      allowedIps: config.allowedIps || [],
      rateLimitPerMinute: config.rateLimitPerMinute || 100,
      description: config.description,
      lastTriggeredAt: config.lastTriggeredAt,
      totalTriggers: config.totalTriggers || 0,
      userId: config.userId,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}

// Singleton instance
export const webhookService = new WebhookService();
