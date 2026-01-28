/**
 * WaitExecutorV2
 *
 * Handles wait/sleep node execution with smart storage routing:
 * - In-memory: < 5 seconds (no persistence)
 * - Redis: 5-60 seconds (fast persistence)
 * - PostgreSQL: > 60 seconds (durable persistence)
 *
 * Supports multiple wait types:
 * - timer: Fixed duration wait
 * - datetime: Wait until specific datetime
 * - webhook: Wait for external callback
 * - manual: Wait for manual trigger
 * - condition: Polling-based condition wait
 */

import { eq, and, lt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import {
  executionSuspensions,
  webhookWaitEndpoints,
  ExecutionSuspension,
  NewExecutionSuspension,
  NewWebhookWaitEndpoint,
  ExecutionStateSnapshot,
  WaitNodeConfig,
  WaitResumeEvent,
  SuspensionType,
  StorageRoute,
} from '@/lib/db/schema-flow-control';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface WaitContext {
  workflowId: string;
  executionId: string;
  nodeId: string;
  userId?: string;
  workspaceId?: string;
}

export interface WaitResult {
  /** Whether the wait was started successfully */
  success: boolean;
  /** Suspension ID for tracking */
  suspensionId: string;
  /** Storage tier used */
  storageRoute: StorageRoute;
  /** When the wait should resume (for timer/datetime) */
  resumeAt?: Date;
  /** Webhook URL for webhook waits */
  webhookUrl?: string;
  /** Correlation ID for webhook callbacks */
  correlationId?: string;
  /** Error message if failed */
  error?: string;
}

export interface ResumeResult {
  /** Whether resumption was successful */
  success: boolean;
  /** The resumed suspension data */
  suspension?: ExecutionSuspension;
  /** Execution state to continue from */
  executionState?: ExecutionStateSnapshot;
  /** Resume payload from trigger */
  resumePayload?: Record<string, unknown>;
  /** Error message if failed */
  error?: string;
}

// Storage thresholds in milliseconds
const MEMORY_THRESHOLD = 5000;      // < 5 seconds
const REDIS_THRESHOLD = 60000;      // 5-60 seconds
const DEFAULT_TIMEOUT = 86400000;   // 24 hours

// ============================================================================
// WAIT EXECUTOR
// ============================================================================

export class WaitExecutorV2 {
  private db = getDb();
  private redisClient: any; // Would be injected Redis client
  private inMemoryWaits: Map<string, NodeJS.Timeout> = new Map();

  constructor(redisClient?: any) {
    this.redisClient = redisClient;
  }

  /**
   * Start a wait operation based on configuration
   */
  async startWait(
    context: WaitContext,
    config: WaitNodeConfig,
    executionState: ExecutionStateSnapshot
  ): Promise<WaitResult> {
    const suspensionId = uuidv4();

    logger.info('[WAIT_EXECUTOR] Starting wait', {
      suspensionId,
      type: config.type,
      nodeId: context.nodeId,
    });

    switch (config.type) {
      case 'timer':
        return this.startTimerWait(suspensionId, context, config, executionState);

      case 'datetime':
        return this.startDatetimeWait(suspensionId, context, config, executionState);

      case 'webhook':
        return this.startWebhookWait(suspensionId, context, config, executionState);

      case 'manual':
        return this.startManualWait(suspensionId, context, config, executionState);

      case 'condition':
        return this.startConditionWait(suspensionId, context, config, executionState);

      default:
        return {
          success: false,
          suspensionId,
          storageRoute: 'postgres',
          error: `Unknown wait type: ${config.type}`,
        };
    }
  }

  /**
   * Start a timer-based wait
   */
  private async startTimerWait(
    suspensionId: string,
    context: WaitContext,
    config: WaitNodeConfig,
    executionState: ExecutionStateSnapshot
  ): Promise<WaitResult> {
    const durationMs = this.calculateDurationMs(config);
    const storageRoute = this.determineStorageRoute(durationMs);
    const resumeAt = new Date(Date.now() + durationMs);
    const expiresAt = config.timeout
      ? new Date(Date.now() + durationMs + config.timeout)
      : new Date(Date.now() + durationMs + DEFAULT_TIMEOUT);

    // Create suspension record
    const suspension = await this.createSuspension({
      id: suspensionId,
      workflowId: context.workflowId,
      executionId: context.executionId,
      nodeId: context.nodeId,
      suspensionType: 'timer',
      status: 'pending',
      storageRoute,
      resumeAt,
      expiresAt,
      executionState,
    });

    // Route to appropriate storage
    if (storageRoute === 'memory') {
      await this.scheduleInMemoryResume(suspensionId, durationMs);
    } else if (storageRoute === 'redis' && this.redisClient) {
      await this.scheduleRedisResume(suspensionId, durationMs);
    }
    // PostgreSQL waits are handled by ResumptionWorker polling

    return {
      success: true,
      suspensionId,
      storageRoute,
      resumeAt,
    };
  }

  /**
   * Start a datetime-based wait
   */
  private async startDatetimeWait(
    suspensionId: string,
    context: WaitContext,
    config: WaitNodeConfig,
    executionState: ExecutionStateSnapshot
  ): Promise<WaitResult> {
    if (!config.targetDatetime) {
      return {
        success: false,
        suspensionId,
        storageRoute: 'postgres',
        error: 'Target datetime is required for datetime wait',
      };
    }

    const resumeAt = new Date(config.targetDatetime);
    const now = Date.now();
    const durationMs = resumeAt.getTime() - now;

    if (durationMs <= 0) {
      // Target datetime is in the past, continue immediately
      return {
        success: true,
        suspensionId,
        storageRoute: 'memory',
        resumeAt: new Date(),
      };
    }

    const storageRoute = this.determineStorageRoute(durationMs);
    const expiresAt = config.timeout
      ? new Date(resumeAt.getTime() + config.timeout)
      : new Date(resumeAt.getTime() + DEFAULT_TIMEOUT);

    await this.createSuspension({
      id: suspensionId,
      workflowId: context.workflowId,
      executionId: context.executionId,
      nodeId: context.nodeId,
      suspensionType: 'datetime',
      status: 'pending',
      storageRoute,
      resumeAt,
      expiresAt,
      executionState,
    });

    if (storageRoute === 'memory') {
      await this.scheduleInMemoryResume(suspensionId, durationMs);
    } else if (storageRoute === 'redis' && this.redisClient) {
      await this.scheduleRedisResume(suspensionId, durationMs);
    }

    return {
      success: true,
      suspensionId,
      storageRoute,
      resumeAt,
    };
  }

  /**
   * Start a webhook-based wait
   */
  private async startWebhookWait(
    suspensionId: string,
    context: WaitContext,
    config: WaitNodeConfig,
    executionState: ExecutionStateSnapshot
  ): Promise<WaitResult> {
    const correlationId = uuidv4();
    const webhookConfig = config.webhook || {};

    // Generate webhook path
    const path = webhookConfig.customPath || `/webhook/wait/${correlationId}`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const webhookUrl = `${baseUrl}/api${path}`;

    const expiresAt = config.timeout
      ? new Date(Date.now() + config.timeout)
      : new Date(Date.now() + DEFAULT_TIMEOUT);

    // Create suspension with webhook details
    await this.createSuspension({
      id: suspensionId,
      workflowId: context.workflowId,
      executionId: context.executionId,
      nodeId: context.nodeId,
      suspensionType: 'webhook',
      status: 'pending',
      storageRoute: 'postgres', // Webhooks always use PostgreSQL
      expiresAt,
      webhookCorrelationId: correlationId,
      webhookCallbackUrl: webhookUrl,
      executionState,
    });

    // Create webhook endpoint record
    await this.createWebhookEndpoint({
      suspensionId,
      workflowId: context.workflowId,
      executionId: context.executionId,
      correlationId,
      path,
      method: webhookConfig.method || 'POST',
      secretToken: webhookConfig.secretToken,
      allowedIps: webhookConfig.allowedIps,
      responseBody: webhookConfig.responseBody,
      expiresAt,
    });

    return {
      success: true,
      suspensionId,
      storageRoute: 'postgres',
      webhookUrl,
      correlationId,
    };
  }

  /**
   * Start a manual wait (requires explicit trigger)
   */
  private async startManualWait(
    suspensionId: string,
    context: WaitContext,
    config: WaitNodeConfig,
    executionState: ExecutionStateSnapshot
  ): Promise<WaitResult> {
    const expiresAt = config.timeout
      ? new Date(Date.now() + config.timeout)
      : new Date(Date.now() + DEFAULT_TIMEOUT);

    await this.createSuspension({
      id: suspensionId,
      workflowId: context.workflowId,
      executionId: context.executionId,
      nodeId: context.nodeId,
      suspensionType: 'manual',
      status: 'pending',
      storageRoute: 'postgres',
      expiresAt,
      executionState,
    });

    return {
      success: true,
      suspensionId,
      storageRoute: 'postgres',
    };
  }

  /**
   * Start a condition-based wait (polling)
   */
  private async startConditionWait(
    suspensionId: string,
    context: WaitContext,
    config: WaitNodeConfig,
    executionState: ExecutionStateSnapshot
  ): Promise<WaitResult> {
    const conditionConfig = config.condition;
    if (!conditionConfig) {
      return {
        success: false,
        suspensionId,
        storageRoute: 'postgres',
        error: 'Condition configuration is required',
      };
    }

    const expiresAt = config.timeout
      ? new Date(Date.now() + config.timeout)
      : new Date(Date.now() + DEFAULT_TIMEOUT);

    await this.createSuspension({
      id: suspensionId,
      workflowId: context.workflowId,
      executionId: context.executionId,
      nodeId: context.nodeId,
      suspensionType: 'condition',
      status: 'pending',
      storageRoute: 'postgres',
      expiresAt,
      executionState,
    });

    // Condition polling is handled by a separate worker
    return {
      success: true,
      suspensionId,
      storageRoute: 'postgres',
    };
  }

  /**
   * Resume a suspended execution
   */
  async resumeExecution(event: WaitResumeEvent): Promise<ResumeResult> {
    const { suspensionId, triggerType, payload, metadata } = event;

    logger.info('[WAIT_EXECUTOR] Resuming execution', { suspensionId, triggerType });

    const [suspension] = await this.db
      .select()
      .from(executionSuspensions)
      .where(eq(executionSuspensions.id, suspensionId))
      .limit(1);

    if (!suspension) {
      return {
        success: false,
        error: `Suspension not found: ${suspensionId}`,
      };
    }

    if (suspension.status !== 'pending') {
      return {
        success: false,
        error: `Suspension is not pending: ${suspension.status}`,
      };
    }

    // Update suspension status
    const [updated] = await this.db
      .update(executionSuspensions)
      .set({
        status: 'resumed',
        resumedAt: new Date(),
        triggerType,
        resumePayload: payload,
        updatedAt: new Date(),
      })
      .where(eq(executionSuspensions.id, suspensionId))
      .returning();

    // Clean up in-memory timer if exists
    this.cancelInMemoryWait(suspensionId);

    // Deactivate webhook endpoint if exists
    if (suspension.webhookCorrelationId) {
      await this.deactivateWebhookEndpoint(suspension.webhookCorrelationId);
    }

    return {
      success: true,
      suspension: updated,
      executionState: updated.executionState as ExecutionStateSnapshot,
      resumePayload: payload,
    };
  }

  /**
   * Resume execution by webhook correlation ID
   */
  async resumeByWebhook(
    correlationId: string,
    payload: Record<string, unknown>,
    metadata?: WaitResumeEvent['metadata']
  ): Promise<ResumeResult> {
    // Find suspension by correlation ID
    const [suspension] = await this.db
      .select()
      .from(executionSuspensions)
      .where(eq(executionSuspensions.webhookCorrelationId, correlationId))
      .limit(1);

    if (!suspension) {
      return {
        success: false,
        error: `No suspension found for correlation ID: ${correlationId}`,
      };
    }

    return this.resumeExecution({
      suspensionId: suspension.id,
      triggerType: 'webhook_received',
      payload,
      metadata,
    });
  }

  /**
   * Create suspension record in database
   */
  private async createSuspension(
    data: Partial<NewExecutionSuspension> & {
      id: string;
      workflowId: string;
      executionId: string;
      nodeId: string;
      suspensionType: SuspensionType;
      executionState: ExecutionStateSnapshot;
    }
  ): Promise<ExecutionSuspension> {
    const [suspension] = await this.db
      .insert(executionSuspensions)
      .values({
        id: data.id,
        workflowId: data.workflowId,
        executionId: data.executionId,
        nodeId: data.nodeId,
        suspensionType: data.suspensionType,
        status: data.status || 'pending',
        storageRoute: data.storageRoute || 'postgres',
        suspendedAt: new Date(),
        resumeAt: data.resumeAt,
        expiresAt: data.expiresAt,
        executionState: data.executionState,
        webhookCorrelationId: data.webhookCorrelationId,
        webhookCallbackUrl: data.webhookCallbackUrl,
      })
      .returning();

    return suspension;
  }

  /**
   * Create webhook endpoint record
   */
  private async createWebhookEndpoint(
    data: Omit<NewWebhookWaitEndpoint, 'id'>
  ): Promise<void> {
    await this.db.insert(webhookWaitEndpoints).values(data);
  }

  /**
   * Deactivate a webhook endpoint
   */
  private async deactivateWebhookEndpoint(correlationId: string): Promise<void> {
    await this.db
      .update(webhookWaitEndpoints)
      .set({ isActive: false })
      .where(eq(webhookWaitEndpoints.correlationId, correlationId));
  }

  /**
   * Calculate duration in milliseconds from config
   */
  private calculateDurationMs(config: WaitNodeConfig): number {
    if (!config.duration) return 0;

    const multipliers: Record<string, number> = {
      ms: 1,
      seconds: 1000,
      minutes: 60000,
      hours: 3600000,
      days: 86400000,
    };

    const unit = config.durationUnit || 'ms';
    return config.duration * (multipliers[unit] || 1);
  }

  /**
   * Determine storage route based on duration
   */
  private determineStorageRoute(durationMs: number): StorageRoute {
    if (durationMs < MEMORY_THRESHOLD) {
      return 'memory';
    } else if (durationMs < REDIS_THRESHOLD && this.redisClient) {
      return 'redis';
    }
    return 'postgres';
  }

  /**
   * Schedule in-memory resume
   */
  private async scheduleInMemoryResume(suspensionId: string, durationMs: number): Promise<void> {
    const timeout = setTimeout(async () => {
      this.inMemoryWaits.delete(suspensionId);
      await this.resumeExecution({
        suspensionId,
        triggerType: 'timer_elapsed',
        metadata: { triggeredAt: new Date().toISOString() },
      });
    }, durationMs);

    this.inMemoryWaits.set(suspensionId, timeout);
    logger.debug('[WAIT_EXECUTOR] Scheduled in-memory resume', { suspensionId, durationMs });
  }

  /**
   * Schedule Redis-based resume
   */
  private async scheduleRedisResume(suspensionId: string, durationMs: number): Promise<void> {
    if (!this.redisClient) {
      logger.warn('[WAIT_EXECUTOR] Redis not available, falling back to PostgreSQL');
      return;
    }

    // Use Redis EXPIRE and a key that the ResumptionWorker will poll
    const key = `wait:${suspensionId}`;
    await this.redisClient.set(key, JSON.stringify({
      suspensionId,
      resumeAt: Date.now() + durationMs,
    }), 'PX', durationMs + 5000); // Add 5s buffer

    logger.debug('[WAIT_EXECUTOR] Scheduled Redis resume', { suspensionId, durationMs });
  }

  /**
   * Cancel an in-memory wait
   */
  private cancelInMemoryWait(suspensionId: string): void {
    const timeout = this.inMemoryWaits.get(suspensionId);
    if (timeout) {
      clearTimeout(timeout);
      this.inMemoryWaits.delete(suspensionId);
    }
  }

  /**
   * Cancel a wait operation
   */
  async cancelWait(suspensionId: string, reason?: string): Promise<boolean> {
    const [updated] = await this.db
      .update(executionSuspensions)
      .set({
        status: 'cancelled',
        errorMessage: reason || 'Cancelled by user',
        updatedAt: new Date(),
      })
      .where(eq(executionSuspensions.id, suspensionId))
      .returning();

    if (!updated) return false;

    this.cancelInMemoryWait(suspensionId);

    if (updated.webhookCorrelationId) {
      await this.deactivateWebhookEndpoint(updated.webhookCorrelationId);
    }

    logger.info('[WAIT_EXECUTOR] Wait cancelled', { suspensionId, reason });
    return true;
  }

  /**
   * Get pending suspensions that are ready to resume
   */
  async getReadyToResume(): Promise<ExecutionSuspension[]> {
    const now = new Date();

    return this.db
      .select()
      .from(executionSuspensions)
      .where(
        and(
          eq(executionSuspensions.status, 'pending'),
          lt(executionSuspensions.resumeAt, now)
        )
      );
  }

  /**
   * Get expired suspensions
   */
  async getExpiredSuspensions(): Promise<ExecutionSuspension[]> {
    const now = new Date();

    return this.db
      .select()
      .from(executionSuspensions)
      .where(
        and(
          eq(executionSuspensions.status, 'pending'),
          lt(executionSuspensions.expiresAt, now)
        )
      );
  }

  /**
   * Mark suspensions as expired
   */
  async markExpired(suspensionIds: string[]): Promise<void> {
    for (const id of suspensionIds) {
      await this.db
        .update(executionSuspensions)
        .set({
          status: 'expired',
          updatedAt: new Date(),
        })
        .where(eq(executionSuspensions.id, id));
    }
  }

  /**
   * Get suspension by ID
   */
  async getSuspension(suspensionId: string): Promise<ExecutionSuspension | null> {
    const [suspension] = await this.db
      .select()
      .from(executionSuspensions)
      .where(eq(executionSuspensions.id, suspensionId))
      .limit(1);

    return suspension || null;
  }

  /**
   * Get all suspensions for an execution
   */
  async getExecutionSuspensions(executionId: string): Promise<ExecutionSuspension[]> {
    return this.db
      .select()
      .from(executionSuspensions)
      .where(eq(executionSuspensions.executionId, executionId));
  }

  /**
   * Clean up completed in-memory waits
   */
  cleanup(): void {
    for (const [id, timeout] of this.inMemoryWaits) {
      clearTimeout(timeout);
    }
    this.inMemoryWaits.clear();
    logger.info('[WAIT_EXECUTOR] Cleaned up in-memory waits');
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let waitExecutorInstance: WaitExecutorV2 | null = null;

export function getWaitExecutor(redisClient?: any): WaitExecutorV2 {
  if (!waitExecutorInstance) {
    waitExecutorInstance = new WaitExecutorV2(redisClient);
  }
  return waitExecutorInstance;
}

export default WaitExecutorV2;
