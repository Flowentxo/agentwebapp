/**
 * Polling Service
 *
 * Phase 4: Active Polling & Error Triggers
 *
 * A lightweight scheduler using BullMQ that manages polling triggers.
 * Runs every X minutes and triggers workflow executions when new data is found.
 *
 * Key Features:
 * - BullMQ repeatable jobs for scheduling
 * - Concurrency control (prevents overlapping polls)
 * - Automatic backoff on errors
 * - Rate limiting support
 * - Metrics and monitoring
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { eq, and, lt, lte, isNull, or, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db';
import {
  pollingTriggers,
  workflowStaticData,
  PollingTriggerRecord,
  PollingTriggerConfig,
  StaticDataContent,
} from '@/lib/db/schema-static-data';
import { workflows } from '@/lib/db/schema-workflows';
import { getStaticDataService } from '../data/WorkflowStaticDataService';

// ============================================================================
// INTERFACES
// ============================================================================

export interface PollingJobData {
  triggerId: string;
  workflowId: string;
  nodeId: string;
  nodeType: string;
  attempt: number;
}

export interface PollingResult {
  success: boolean;
  itemsFound: number;
  executionId?: string;
  error?: string;
  duration: number;
}

export interface PollingServiceConfig {
  /** Redis connection string */
  redisUrl?: string;
  /** Maximum concurrent polls */
  concurrency?: number;
  /** Default poll interval in ms */
  defaultIntervalMs?: number;
  /** Maximum backoff time in minutes */
  maxBackoffMinutes?: number;
  /** Lock timeout for polling operations in ms */
  lockTimeoutMs?: number;
  /** Whether to enable the scheduler */
  enabled?: boolean;
}

export interface PollingMetrics {
  activeTriggers: number;
  totalPolls: number;
  successfulPolls: number;
  failedPolls: number;
  itemsFound: number;
  averageDurationMs: number;
}

// ============================================================================
// POLLING SERVICE CLASS
// ============================================================================

export class PollingService {
  private db = getDb();
  private staticDataService = getStaticDataService();
  private queue: Queue<PollingJobData> | null = null;
  private worker: Worker<PollingJobData, PollingResult> | null = null;
  private queueEvents: QueueEvents | null = null;
  private config: Required<PollingServiceConfig>;
  private isRunning = false;

  // Callback for triggering workflow executions
  private onTriggerWorkflow?: (
    workflowId: string,
    items: unknown[],
    context: {
      triggerId: string;
      nodeId: string;
      triggerType: 'polling';
    }
  ) => Promise<string | null>;

  // Callback for polling specific node types
  private nodePollers: Map<string, (
    config: PollingTriggerConfig,
    staticData: StaticDataContent
  ) => Promise<{ items: unknown[]; newStaticData: StaticDataContent }>> = new Map();

  constructor(config: PollingServiceConfig = {}) {
    this.config = {
      redisUrl: config.redisUrl ?? process.env.REDIS_URL ?? 'redis://localhost:6379',
      concurrency: config.concurrency ?? 5,
      defaultIntervalMs: config.defaultIntervalMs ?? 300000, // 5 minutes
      maxBackoffMinutes: config.maxBackoffMinutes ?? 60,
      lockTimeoutMs: config.lockTimeoutMs ?? 60000, // 1 minute
      enabled: config.enabled ?? true,
    };
  }

  // --------------------------------------------------------------------------
  // LIFECYCLE
  // --------------------------------------------------------------------------

  /**
   * Initialize the polling service
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      console.log('[PollingService] Disabled by configuration');
      return;
    }

    const connection = {
      url: this.config.redisUrl,
    };

    // Create the queue
    this.queue = new Queue<PollingJobData>('polling-triggers', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    // Create the worker
    this.worker = new Worker<PollingJobData, PollingResult>(
      'polling-triggers',
      async (job) => this.processPollingJob(job),
      {
        connection,
        concurrency: this.config.concurrency,
        limiter: {
          max: 100,
          duration: 60000, // 100 jobs per minute max
        },
      }
    );

    // Create queue events for monitoring
    this.queueEvents = new QueueEvents('polling-triggers', { connection });

    // Set up event handlers
    this.setupEventHandlers();

    this.isRunning = true;
    console.log('[PollingService] Initialized successfully');
  }

  /**
   * Set up event handlers for the worker
   */
  private setupEventHandlers(): void {
    if (!this.worker) return;

    this.worker.on('completed', (job, result) => {
      console.log(`[PollingService] Job ${job.id} completed:`, {
        triggerId: job.data.triggerId,
        itemsFound: result.itemsFound,
        duration: result.duration,
      });
    });

    this.worker.on('failed', (job, error) => {
      console.error(`[PollingService] Job ${job?.id} failed:`, error.message);
    });

    this.worker.on('error', (error) => {
      console.error('[PollingService] Worker error:', error);
    });
  }

  /**
   * Shutdown the polling service
   */
  async shutdown(): Promise<void> {
    this.isRunning = false;

    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }

    if (this.queueEvents) {
      await this.queueEvents.close();
      this.queueEvents = null;
    }

    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }

    console.log('[PollingService] Shutdown complete');
  }

  // --------------------------------------------------------------------------
  // TRIGGER REGISTRATION
  // --------------------------------------------------------------------------

  /**
   * Register a workflow callback for triggering executions
   */
  setWorkflowTrigger(
    callback: (
      workflowId: string,
      items: unknown[],
      context: { triggerId: string; nodeId: string; triggerType: 'polling' }
    ) => Promise<string | null>
  ): void {
    this.onTriggerWorkflow = callback;
  }

  /**
   * Register a poller for a specific node type
   */
  registerNodePoller(
    nodeType: string,
    poller: (
      config: PollingTriggerConfig,
      staticData: StaticDataContent
    ) => Promise<{ items: unknown[]; newStaticData: StaticDataContent }>
  ): void {
    this.nodePollers.set(nodeType, poller);
  }

  /**
   * Register a new polling trigger
   */
  async registerTrigger(params: {
    workflowId: string;
    nodeId: string;
    nodeType: string;
    nodeName?: string;
    userId?: string;
    intervalMs?: number;
    config?: PollingTriggerConfig;
  }): Promise<PollingTriggerRecord> {
    const { workflowId, nodeId, nodeType, nodeName, userId, intervalMs, config } = params;
    const interval = intervalMs ?? this.config.defaultIntervalMs;

    // Calculate next poll time
    const nextPollAt = new Date(Date.now() + interval);

    // Insert or update the trigger
    const [trigger] = await this.db
      .insert(pollingTriggers)
      .values({
        workflowId,
        nodeId,
        nodeType,
        nodeName,
        userId,
        intervalMs: interval,
        nextPollAt,
        config: config ?? {},
      })
      .onConflictDoUpdate({
        target: [pollingTriggers.workflowId, pollingTriggers.nodeId],
        set: {
          nodeType,
          nodeName,
          intervalMs: interval,
          config: config ?? {},
          status: 'active',
          updatedAt: new Date(),
        },
      })
      .returning();

    // Schedule the repeatable job
    await this.scheduleRepeatingJob(trigger);

    console.log(`[PollingService] Registered trigger:`, {
      triggerId: trigger.id,
      workflowId,
      nodeId,
      interval,
    });

    return trigger;
  }

  /**
   * Unregister a polling trigger
   */
  async unregisterTrigger(workflowId: string, nodeId: string): Promise<boolean> {
    const [trigger] = await this.db
      .select()
      .from(pollingTriggers)
      .where(
        and(
          eq(pollingTriggers.workflowId, workflowId),
          eq(pollingTriggers.nodeId, nodeId)
        )
      )
      .limit(1);

    if (!trigger) return false;

    // Remove the repeatable job
    await this.removeRepeatingJob(trigger.id);

    // Delete the trigger
    await this.db
      .delete(pollingTriggers)
      .where(eq(pollingTriggers.id, trigger.id));

    console.log(`[PollingService] Unregistered trigger: ${trigger.id}`);
    return true;
  }

  /**
   * Pause a polling trigger
   */
  async pauseTrigger(triggerId: string): Promise<boolean> {
    const result = await this.db
      .update(pollingTriggers)
      .set({
        status: 'paused',
        updatedAt: new Date(),
      })
      .where(eq(pollingTriggers.id, triggerId))
      .returning();

    if (result.length > 0) {
      await this.removeRepeatingJob(triggerId);
      return true;
    }
    return false;
  }

  /**
   * Resume a paused polling trigger
   */
  async resumeTrigger(triggerId: string): Promise<boolean> {
    const [trigger] = await this.db
      .select()
      .from(pollingTriggers)
      .where(eq(pollingTriggers.id, triggerId))
      .limit(1);

    if (!trigger) return false;

    await this.db
      .update(pollingTriggers)
      .set({
        status: 'active',
        nextPollAt: new Date(Date.now() + trigger.intervalMs),
        consecutiveErrors: 0,
        backoffUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(pollingTriggers.id, triggerId));

    await this.scheduleRepeatingJob(trigger);
    return true;
  }

  // --------------------------------------------------------------------------
  // JOB SCHEDULING
  // --------------------------------------------------------------------------

  /**
   * Schedule a repeating job for a trigger
   */
  private async scheduleRepeatingJob(trigger: PollingTriggerRecord): Promise<void> {
    if (!this.queue) return;

    const jobId = `polling-${trigger.id}`;

    // Remove any existing job first
    await this.removeRepeatingJob(trigger.id);

    // Add the repeatable job
    await this.queue.add(
      'poll',
      {
        triggerId: trigger.id,
        workflowId: trigger.workflowId,
        nodeId: trigger.nodeId,
        nodeType: trigger.nodeType,
        attempt: 0,
      },
      {
        repeat: {
          every: trigger.intervalMs,
        },
        jobId,
      }
    );
  }

  /**
   * Remove a repeating job
   */
  private async removeRepeatingJob(triggerId: string): Promise<void> {
    if (!this.queue) return;

    const repeatableJobs = await this.queue.getRepeatableJobs();
    const job = repeatableJobs.find(j => j.id === `polling-${triggerId}`);

    if (job) {
      await this.queue.removeRepeatableByKey(job.key);
    }
  }

  // --------------------------------------------------------------------------
  // JOB PROCESSING
  // --------------------------------------------------------------------------

  /**
   * Process a polling job
   */
  private async processPollingJob(job: Job<PollingJobData>): Promise<PollingResult> {
    const startTime = Date.now();
    const { triggerId, workflowId, nodeId, nodeType } = job.data;

    console.log(`[PollingService] Processing poll:`, { triggerId, workflowId, nodeId });

    try {
      // Acquire lock to prevent concurrent polling
      const lockAcquired = await this.acquirePollingLock(triggerId);
      if (!lockAcquired) {
        console.log(`[PollingService] Poll skipped (already running): ${triggerId}`);
        return {
          success: true,
          itemsFound: 0,
          duration: Date.now() - startTime,
        };
      }

      // Get trigger and verify it's still active
      const [trigger] = await this.db
        .select()
        .from(pollingTriggers)
        .where(eq(pollingTriggers.id, triggerId))
        .limit(1);

      if (!trigger || trigger.status !== 'active') {
        await this.releasePollingLock(triggerId);
        return {
          success: true,
          itemsFound: 0,
          duration: Date.now() - startTime,
        };
      }

      // Check backoff
      if (trigger.backoffUntil && new Date(trigger.backoffUntil) > new Date()) {
        await this.releasePollingLock(triggerId);
        return {
          success: true,
          itemsFound: 0,
          duration: Date.now() - startTime,
        };
      }

      // Get static data for this node
      const staticData = await this.staticDataService.get(workflowId, nodeId) ?? {};

      // Get the poller for this node type
      const poller = this.nodePollers.get(nodeType);
      if (!poller) {
        throw new Error(`No poller registered for node type: ${nodeType}`);
      }

      // Execute the poll
      const pollResult = await poller(trigger.config ?? {}, staticData);

      // Update static data
      if (pollResult.newStaticData) {
        await this.staticDataService.set(workflowId, nodeId, pollResult.newStaticData, {
          nodeType,
          updatedBy: 'polling',
        });
      }

      // If items found, trigger workflow execution
      let executionId: string | undefined;
      if (pollResult.items.length > 0 && this.onTriggerWorkflow) {
        executionId = await this.onTriggerWorkflow(workflowId, pollResult.items, {
          triggerId,
          nodeId,
          triggerType: 'polling',
        }) ?? undefined;
      }

      // Update trigger stats
      await this.updateTriggerSuccess(triggerId, pollResult.items.length);

      // Release lock
      await this.releasePollingLock(triggerId);

      const duration = Date.now() - startTime;
      console.log(`[PollingService] Poll completed:`, {
        triggerId,
        itemsFound: pollResult.items.length,
        executionId,
        duration,
      });

      return {
        success: true,
        itemsFound: pollResult.items.length,
        executionId,
        duration,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update trigger error stats
      await this.updateTriggerError(triggerId, errorMessage);

      // Release lock
      await this.releasePollingLock(triggerId);

      console.error(`[PollingService] Poll failed:`, { triggerId, error: errorMessage });

      return {
        success: false,
        itemsFound: 0,
        error: errorMessage,
        duration: Date.now() - startTime,
      };
    }
  }

  // --------------------------------------------------------------------------
  // CONCURRENCY CONTROL
  // --------------------------------------------------------------------------

  /**
   * Acquire a polling lock for a trigger
   */
  private async acquirePollingLock(triggerId: string): Promise<boolean> {
    const lockId = randomUUID();
    const expiresAt = new Date(Date.now() + this.config.lockTimeoutMs);

    // Try to acquire lock atomically
    const result = await this.db
      .update(pollingTriggers)
      .set({
        isPolling: true,
        pollingLockId: lockId,
        pollingLockExpiresAt: expiresAt,
      })
      .where(
        and(
          eq(pollingTriggers.id, triggerId),
          or(
            eq(pollingTriggers.isPolling, false),
            lt(pollingTriggers.pollingLockExpiresAt, new Date())
          )
        )
      )
      .returning();

    return result.length > 0;
  }

  /**
   * Release a polling lock
   */
  private async releasePollingLock(triggerId: string): Promise<void> {
    await this.db
      .update(pollingTriggers)
      .set({
        isPolling: false,
        pollingLockId: null,
        pollingLockExpiresAt: null,
      })
      .where(eq(pollingTriggers.id, triggerId));
  }

  // --------------------------------------------------------------------------
  // STATS UPDATES
  // --------------------------------------------------------------------------

  /**
   * Update trigger stats after successful poll
   */
  private async updateTriggerSuccess(triggerId: string, itemsFound: number): Promise<void> {
    await this.db
      .update(pollingTriggers)
      .set({
        lastPollAt: new Date(),
        lastSuccessAt: new Date(),
        nextPollAt: sql`NOW() + interval_ms * interval '1 millisecond'`,
        totalPolls: sql`total_polls + 1`,
        successfulPolls: sql`successful_polls + 1`,
        itemsFound: sql`items_found + ${itemsFound}`,
        consecutiveErrors: 0,
        backoffUntil: null,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(pollingTriggers.id, triggerId));
  }

  /**
   * Update trigger stats after failed poll
   */
  private async updateTriggerError(triggerId: string, error: string): Promise<void> {
    // Get current trigger to calculate backoff
    const [trigger] = await this.db
      .select()
      .from(pollingTriggers)
      .where(eq(pollingTriggers.id, triggerId))
      .limit(1);

    if (!trigger) return;

    const consecutiveErrors = (trigger.consecutiveErrors ?? 0) + 1;

    // Calculate exponential backoff
    const backoffMinutes = Math.min(
      Math.pow(2, consecutiveErrors - 1),
      this.config.maxBackoffMinutes
    );
    const backoffUntil = new Date(Date.now() + backoffMinutes * 60 * 1000);

    // Update status to error if too many consecutive failures
    const newStatus = consecutiveErrors >= 5 ? 'error' : trigger.status;

    await this.db
      .update(pollingTriggers)
      .set({
        lastPollAt: new Date(),
        lastErrorAt: new Date(),
        lastError: error,
        totalPolls: sql`total_polls + 1`,
        failedPolls: sql`failed_polls + 1`,
        consecutiveErrors,
        backoffUntil,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(pollingTriggers.id, triggerId));
  }

  // --------------------------------------------------------------------------
  // METRICS & MONITORING
  // --------------------------------------------------------------------------

  /**
   * Get polling metrics
   */
  async getMetrics(): Promise<PollingMetrics> {
    const triggers = await this.db
      .select({
        status: pollingTriggers.status,
        totalPolls: pollingTriggers.totalPolls,
        successfulPolls: pollingTriggers.successfulPolls,
        failedPolls: pollingTriggers.failedPolls,
        itemsFound: pollingTriggers.itemsFound,
      })
      .from(pollingTriggers);

    const activeTriggers = triggers.filter(t => t.status === 'active').length;
    const totalPolls = triggers.reduce((sum, t) => sum + (t.totalPolls ?? 0), 0);
    const successfulPolls = triggers.reduce((sum, t) => sum + (t.successfulPolls ?? 0), 0);
    const failedPolls = triggers.reduce((sum, t) => sum + (t.failedPolls ?? 0), 0);
    const itemsFound = triggers.reduce((sum, t) => sum + (t.itemsFound ?? 0), 0);

    return {
      activeTriggers,
      totalPolls,
      successfulPolls,
      failedPolls,
      itemsFound,
      averageDurationMs: 0, // Would need to track this separately
    };
  }

  /**
   * List all triggers for a workflow
   */
  async listTriggersForWorkflow(workflowId: string): Promise<PollingTriggerRecord[]> {
    return this.db
      .select()
      .from(pollingTriggers)
      .where(eq(pollingTriggers.workflowId, workflowId));
  }

  /**
   * List all active triggers
   */
  async listActiveTriggers(): Promise<PollingTriggerRecord[]> {
    return this.db
      .select()
      .from(pollingTriggers)
      .where(eq(pollingTriggers.status, 'active'));
  }

  /**
   * Check if the service is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let pollingServiceInstance: PollingService | null = null;

export function getPollingService(config?: PollingServiceConfig): PollingService {
  if (!pollingServiceInstance) {
    pollingServiceInstance = new PollingService(config);
  }
  return pollingServiceInstance;
}

export default PollingService;
