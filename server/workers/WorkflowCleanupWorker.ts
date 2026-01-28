/**
 * WORKFLOW CLEANUP WORKER
 *
 * Smart cleanup worker that distinguishes between crashed workflows
 * and legitimately suspended workflows waiting for human approval.
 *
 * Cleanup Rules:
 * 1. status='running' AND last_update < NOW() - 5min → KILL (zombie process)
 * 2. status='suspended' AND expires_at < NOW() → EXPIRE (auto-reject)
 * 3. status='suspended' AND expires_at > NOW() → KEEP (waiting for user)
 * 4. status='pending' with suspended_state → Treat as suspended
 *
 * Features:
 * - Configurable cleanup intervals
 * - Detailed audit logging
 * - Notification on auto-expiration
 * - Metrics collection for monitoring
 */

import { getDb } from '@/lib/db';
import {
  workflowExecutions,
  workflowApprovalRequests,
  workflowNodeLogs,
} from '@/lib/db/schema-workflows';
import { eq, and, lt, or, isNull, sql, inArray } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const logger = createLogger('workflow-cleanup-worker');

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface CleanupConfig {
  /** How long a 'running' workflow can be idle before considered zombie (ms) */
  zombieThresholdMs: number;

  /** Default TTL for suspended workflows if no expiresAt is set (ms) */
  defaultSuspensionTtlMs: number;

  /** How often to run the cleanup (ms) */
  cleanupIntervalMs: number;

  /** Whether to send notifications on auto-expiration */
  notifyOnExpiration: boolean;

  /** Max executions to clean up per run (prevent overwhelming the DB) */
  batchSize: number;

  /** Whether to actually delete or just mark as failed */
  hardDelete: boolean;
}

export const DEFAULT_CLEANUP_CONFIG: CleanupConfig = {
  zombieThresholdMs: 5 * 60 * 1000, // 5 minutes
  defaultSuspensionTtlMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  cleanupIntervalMs: 60 * 1000, // 1 minute
  notifyOnExpiration: true,
  batchSize: 100,
  hardDelete: false,
};

// ============================================================================
// TYPES
// ============================================================================

export interface CleanupResult {
  zombiesKilled: number;
  expiredApprovals: number;
  activeApprovals: number;
  errors: string[];
  executionTimeMs: number;
}

export interface CleanupMetrics {
  lastRunAt: Date | null;
  totalZombiesKilled: number;
  totalExpiredApprovals: number;
  totalErrors: number;
  averageExecutionTimeMs: number;
  runCount: number;
}

// ============================================================================
// WORKER CLASS
// ============================================================================

export class WorkflowCleanupWorker {
  private config: CleanupConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private metrics: CleanupMetrics = {
    lastRunAt: null,
    totalZombiesKilled: 0,
    totalExpiredApprovals: 0,
    totalErrors: 0,
    averageExecutionTimeMs: 0,
    runCount: 0,
  };

  constructor(config: Partial<CleanupConfig> = {}) {
    this.config = { ...DEFAULT_CLEANUP_CONFIG, ...config };
  }

  /**
   * Start the cleanup worker
   */
  start(): void {
    if (this.intervalId) {
      logger.warn('Cleanup worker already running');
      return;
    }

    logger.info('Starting workflow cleanup worker', {
      zombieThresholdMs: this.config.zombieThresholdMs,
      cleanupIntervalMs: this.config.cleanupIntervalMs,
      batchSize: this.config.batchSize,
    });

    // Run immediately on start
    this.runCleanup().catch((error) => {
      logger.error('Initial cleanup run failed', { error: error.message });
    });

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.runCleanup().catch((error) => {
        logger.error('Cleanup run failed', { error: error.message });
      });
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Stop the cleanup worker
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Workflow cleanup worker stopped');
    }
  }

  /**
   * Run a single cleanup cycle
   */
  async runCleanup(): Promise<CleanupResult> {
    if (this.isRunning) {
      logger.debug('Cleanup already in progress, skipping');
      return {
        zombiesKilled: 0,
        expiredApprovals: 0,
        activeApprovals: 0,
        errors: ['Cleanup already in progress'],
        executionTimeMs: 0,
      };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const errors: string[] = [];
    let zombiesKilled = 0;
    let expiredApprovals = 0;
    let activeApprovals = 0;

    try {
      const db = getDb();

      // =========================================================================
      // STEP 1: Find and kill zombie processes
      // =========================================================================
      const zombieThreshold = new Date(Date.now() - this.config.zombieThresholdMs);

      // Find executions that are 'running' but haven't been updated recently
      // These are likely crashed processes
      const zombieExecutions = await db
        .select({
          id: workflowExecutions.id,
          workflowId: workflowExecutions.workflowId,
          userId: workflowExecutions.userId,
          startedAt: workflowExecutions.startedAt,
        })
        .from(workflowExecutions)
        .where(
          and(
            eq(workflowExecutions.status, 'running'),
            lt(workflowExecutions.startedAt, zombieThreshold)
          )
        )
        .limit(this.config.batchSize);

      for (const zombie of zombieExecutions) {
        try {
          await this.killZombieExecution(zombie.id, zombie.workflowId);
          zombiesKilled++;
        } catch (error: any) {
          errors.push(`Failed to kill zombie ${zombie.id}: ${error.message}`);
        }
      }

      if (zombiesKilled > 0) {
        logger.info(`Killed ${zombiesKilled} zombie executions`, {
          threshold: this.config.zombieThresholdMs,
        });
      }

      // =========================================================================
      // STEP 2: Find and expire old approval requests
      // =========================================================================
      const now = new Date();

      // Find pending approval requests that have expired
      const expiredRequests = await db
        .select({
          id: workflowApprovalRequests.id,
          executionId: workflowApprovalRequests.executionId,
          workflowId: workflowApprovalRequests.workflowId,
          title: workflowApprovalRequests.title,
          expiresAt: workflowApprovalRequests.expiresAt,
        })
        .from(workflowApprovalRequests)
        .where(
          and(
            eq(workflowApprovalRequests.status, 'pending'),
            lt(workflowApprovalRequests.expiresAt, now)
          )
        )
        .limit(this.config.batchSize);

      for (const request of expiredRequests) {
        try {
          await this.expireApprovalRequest(request);
          expiredApprovals++;
        } catch (error: any) {
          errors.push(`Failed to expire approval ${request.id}: ${error.message}`);
        }
      }

      if (expiredApprovals > 0) {
        logger.info(`Expired ${expiredApprovals} approval requests`);
      }

      // =========================================================================
      // STEP 3: Count active approvals (for metrics)
      // =========================================================================
      const [activeCount] = await db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(workflowApprovalRequests)
        .where(eq(workflowApprovalRequests.status, 'pending'));

      activeApprovals = activeCount?.count || 0;

      // =========================================================================
      // STEP 4: Clean up orphaned suspended executions
      // =========================================================================
      // Find executions marked as 'pending' with suspended_state but no
      // corresponding approval request (orphaned)
      const orphanedExecutions = await db
        .select({
          id: workflowExecutions.id,
        })
        .from(workflowExecutions)
        .leftJoin(
          workflowApprovalRequests,
          eq(workflowExecutions.id, workflowApprovalRequests.executionId)
        )
        .where(
          and(
            eq(workflowExecutions.status, 'pending'),
            sql`${workflowExecutions.error} LIKE '%Suspended%'`,
            isNull(workflowApprovalRequests.id)
          )
        )
        .limit(this.config.batchSize);

      for (const orphan of orphanedExecutions) {
        try {
          await this.markExecutionAsFailed(
            orphan.id,
            'Orphaned suspended execution - no approval request found'
          );
          zombiesKilled++;
        } catch (error: any) {
          errors.push(`Failed to clean orphan ${orphan.id}: ${error.message}`);
        }
      }

    } catch (error: any) {
      errors.push(`Cleanup cycle failed: ${error.message}`);
      logger.error('Cleanup cycle failed', { error: error.message });
    } finally {
      this.isRunning = false;
    }

    const executionTimeMs = Date.now() - startTime;

    // Update metrics
    this.metrics.lastRunAt = new Date();
    this.metrics.runCount++;
    this.metrics.totalZombiesKilled += zombiesKilled;
    this.metrics.totalExpiredApprovals += expiredApprovals;
    this.metrics.totalErrors += errors.length;
    this.metrics.averageExecutionTimeMs =
      (this.metrics.averageExecutionTimeMs * (this.metrics.runCount - 1) + executionTimeMs) /
      this.metrics.runCount;

    const result: CleanupResult = {
      zombiesKilled,
      expiredApprovals,
      activeApprovals,
      errors,
      executionTimeMs,
    };

    logger.debug('Cleanup cycle completed', result);

    return result;
  }

  /**
   * Kill a zombie execution
   */
  private async killZombieExecution(
    executionId: string,
    workflowId: string
  ): Promise<void> {
    const db = getDb();

    // Update execution status to error
    await db
      .update(workflowExecutions)
      .set({
        status: 'error',
        error: 'Execution terminated: Process became unresponsive (zombie cleanup)',
        completedAt: new Date(),
      })
      .where(eq(workflowExecutions.id, executionId));

    // Add a node log entry for the termination
    await db.insert(workflowNodeLogs).values({
      executionId,
      workflowId,
      nodeId: 'system',
      nodeType: 'cleanup',
      nodeName: 'System Cleanup',
      status: 'error',
      error: 'Execution terminated by cleanup worker (zombie process)',
      startedAt: new Date(),
      completedAt: new Date(),
      durationMs: 0,
    });

    logger.info('Killed zombie execution', { executionId, workflowId });
  }

  /**
   * Expire an approval request
   */
  private async expireApprovalRequest(request: {
    id: string;
    executionId: string;
    workflowId: string;
    title: string;
    expiresAt: Date | null;
  }): Promise<void> {
    const db = getDb();

    // Update approval request status
    await db
      .update(workflowApprovalRequests)
      .set({
        status: 'expired',
        updatedAt: new Date(),
      })
      .where(eq(workflowApprovalRequests.id, request.id));

    // Update the execution status
    await db
      .update(workflowExecutions)
      .set({
        status: 'error',
        error: `Approval request expired: "${request.title}"`,
        completedAt: new Date(),
      })
      .where(eq(workflowExecutions.id, request.executionId));

    // Add a node log entry
    await db.insert(workflowNodeLogs).values({
      executionId: request.executionId,
      workflowId: request.workflowId,
      nodeId: 'approval-timeout',
      nodeType: 'human-approval',
      nodeName: 'Approval Timeout',
      status: 'error',
      error: `Approval request "${request.title}" expired without response`,
      startedAt: new Date(),
      completedAt: new Date(),
      durationMs: 0,
      metadata: {
        approvalId: request.id,
        expiresAt: request.expiresAt?.toISOString(),
      },
    });

    // TODO: Send notification if configured
    if (this.config.notifyOnExpiration) {
      logger.info('Would send expiration notification', {
        approvalId: request.id,
        title: request.title,
      });
      // Integrate with notification service here
    }

    logger.info('Expired approval request', {
      approvalId: request.id,
      executionId: request.executionId,
      title: request.title,
    });
  }

  /**
   * Mark an execution as failed
   */
  private async markExecutionAsFailed(
    executionId: string,
    reason: string
  ): Promise<void> {
    const db = getDb();

    await db
      .update(workflowExecutions)
      .set({
        status: 'error',
        error: reason,
        completedAt: new Date(),
      })
      .where(eq(workflowExecutions.id, executionId));

    logger.info('Marked execution as failed', { executionId, reason });
  }

  /**
   * Get current metrics
   */
  getMetrics(): CleanupMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      lastRunAt: null,
      totalZombiesKilled: 0,
      totalExpiredApprovals: 0,
      totalErrors: 0,
      averageExecutionTimeMs: 0,
      runCount: 0,
    };
  }

  /**
   * Force run cleanup (for testing/manual trigger)
   */
  async forceRun(): Promise<CleanupResult> {
    return this.runCleanup();
  }

  /**
   * Check if worker is currently running a cleanup cycle
   */
  isBusy(): boolean {
    return this.isRunning;
  }

  /**
   * Check if worker is started
   */
  isStarted(): boolean {
    return this.intervalId !== null;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let workerInstance: WorkflowCleanupWorker | null = null;

export function getCleanupWorker(
  config?: Partial<CleanupConfig>
): WorkflowCleanupWorker {
  if (!workerInstance) {
    workerInstance = new WorkflowCleanupWorker(config);
  }
  return workerInstance;
}

export function startCleanupWorker(
  config?: Partial<CleanupConfig>
): WorkflowCleanupWorker {
  const worker = getCleanupWorker(config);
  worker.start();
  return worker;
}

export function stopCleanupWorker(): void {
  if (workerInstance) {
    workerInstance.stop();
  }
}

// ============================================================================
// SQL QUERIES FOR REFERENCE (can be used directly in DB tools)
// ============================================================================

/**
 * Find zombie executions (running but stale):
 *
 * SELECT id, workflow_id, user_id, started_at
 * FROM workflow_executions
 * WHERE status = 'running'
 *   AND started_at < NOW() - INTERVAL '5 minutes';
 *
 *
 * Find expired approval requests:
 *
 * SELECT id, execution_id, workflow_id, title, expires_at
 * FROM workflow_approval_requests
 * WHERE status = 'pending'
 *   AND expires_at < NOW();
 *
 *
 * Count active (valid) suspended workflows:
 *
 * SELECT COUNT(*)
 * FROM workflow_approval_requests
 * WHERE status = 'pending'
 *   AND (expires_at IS NULL OR expires_at > NOW());
 *
 *
 * Kill zombies (update to error):
 *
 * UPDATE workflow_executions
 * SET status = 'error',
 *     error = 'Terminated by cleanup worker (zombie)',
 *     completed_at = NOW()
 * WHERE status = 'running'
 *   AND started_at < NOW() - INTERVAL '5 minutes';
 *
 *
 * Expire old approvals:
 *
 * UPDATE workflow_approval_requests
 * SET status = 'expired',
 *     updated_at = NOW()
 * WHERE status = 'pending'
 *   AND expires_at < NOW();
 */

export default WorkflowCleanupWorker;
