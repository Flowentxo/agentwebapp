/**
 * LOG RETENTION WORKER
 *
 * Background worker that manages log data retention policy.
 * Runs daily via BullMQ CRON schedule.
 *
 * Retention Policy:
 * 1. Age > 7 days: PRUNE - Set input/output to null, keep metadata
 * 2. Age > 30 days (errors): PRUNE - Same as above, extended for error logs
 * 3. Age > 90 days: DELETE - Hard delete rows and blob storage data
 *
 * Features:
 * - Batch processing to avoid overwhelming the database
 * - Blob storage cleanup for offloaded data
 * - Metrics and audit logging
 * - Graceful shutdown support
 */

import { getDb } from '@/lib/db';
import { workflowNodeLogs } from '@/lib/db/schema-workflows';
import { eq, lt, and, or, ne, sql, inArray } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';
import {
  RetentionPolicyConfig,
  DEFAULT_RETENTION_POLICY,
  RetentionRunResult,
  isStoragePointer,
} from '@/lib/storage/types';
import { logStorageService } from '../services/storage/LogStorageService';

const logger = createLogger('log-retention-worker');

// ============================================================================
// TYPES
// ============================================================================

export interface RetentionMetrics {
  lastRunAt: Date | null;
  totalPruned: number;
  totalDeleted: number;
  totalBlobsDeleted: number;
  totalErrors: number;
  runCount: number;
  averageDurationMs: number;
}

interface LogRecordForRetention {
  id: string;
  status: string;
  input: unknown;
  output: unknown;
  createdAt: Date;
}

// ============================================================================
// LOG RETENTION WORKER
// ============================================================================

export class LogRetentionWorker {
  private static instance: LogRetentionWorker | null = null;
  private config: RetentionPolicyConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private metrics: RetentionMetrics = {
    lastRunAt: null,
    totalPruned: 0,
    totalDeleted: 0,
    totalBlobsDeleted: 0,
    totalErrors: 0,
    runCount: 0,
    averageDurationMs: 0,
  };

  private constructor(config?: Partial<RetentionPolicyConfig>) {
    this.config = { ...DEFAULT_RETENTION_POLICY, ...config };
  }

  static getInstance(config?: Partial<RetentionPolicyConfig>): LogRetentionWorker {
    if (!LogRetentionWorker.instance) {
      LogRetentionWorker.instance = new LogRetentionWorker(config);
    }
    return LogRetentionWorker.instance;
  }

  /**
   * Start the retention worker with daily schedule
   */
  start(intervalMs: number = 24 * 60 * 60 * 1000): void {
    if (this.intervalId) {
      logger.warn('Retention worker already running');
      return;
    }

    logger.info('Starting log retention worker', {
      pruneAfterDays: this.config.pruneAfterDays,
      deleteAfterDays: this.config.deleteAfterDays,
      errorRetentionDays: this.config.errorRetentionDays,
      intervalHours: intervalMs / (60 * 60 * 1000),
    });

    // Run immediately on start (optional - can be disabled for production)
    if (process.env.RUN_RETENTION_ON_START === 'true') {
      this.runRetention().catch((error) => {
        logger.error('Initial retention run failed', { error: error.message });
      });
    }

    // Schedule daily runs
    this.intervalId = setInterval(() => {
      this.runRetention().catch((error) => {
        logger.error('Scheduled retention run failed', { error: error.message });
      });
    }, intervalMs);
  }

  /**
   * Stop the retention worker
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Log retention worker stopped');
    }
  }

  /**
   * Run a single retention cycle
   */
  async runRetention(): Promise<RetentionRunResult> {
    if (this.isRunning) {
      logger.debug('Retention already in progress, skipping');
      return {
        success: false,
        prunedCount: 0,
        deletedCount: 0,
        blobsDeleted: 0,
        errors: ['Retention already in progress'],
        durationMs: 0,
      };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const errors: string[] = [];
    let prunedCount = 0;
    let deletedCount = 0;
    let blobsDeleted = 0;

    try {
      logger.info('Starting log retention cycle');

      // Step 1: Prune old logs (keep metadata, clear data)
      const pruneResult = await this.pruneLogs();
      prunedCount = pruneResult.count;
      errors.push(...pruneResult.errors);

      // Step 2: Hard delete very old logs
      const deleteResult = await this.deleteLogs();
      deletedCount = deleteResult.count;
      blobsDeleted = deleteResult.blobsDeleted;
      errors.push(...deleteResult.errors);

      const durationMs = Date.now() - startTime;

      // Update metrics
      this.metrics.lastRunAt = new Date();
      this.metrics.runCount++;
      this.metrics.totalPruned += prunedCount;
      this.metrics.totalDeleted += deletedCount;
      this.metrics.totalBlobsDeleted += blobsDeleted;
      this.metrics.totalErrors += errors.length;
      this.metrics.averageDurationMs =
        (this.metrics.averageDurationMs * (this.metrics.runCount - 1) + durationMs) /
        this.metrics.runCount;

      logger.info('Log retention cycle completed', {
        prunedCount,
        deletedCount,
        blobsDeleted,
        errors: errors.length,
        durationMs,
      });

      return {
        success: errors.length === 0,
        prunedCount,
        deletedCount,
        blobsDeleted,
        errors,
        durationMs,
      };
    } catch (error: any) {
      logger.error('Retention cycle failed', { error: error.message });
      return {
        success: false,
        prunedCount,
        deletedCount,
        blobsDeleted,
        errors: [...errors, error.message],
        durationMs: Date.now() - startTime,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Prune logs older than threshold
   *
   * - Regular logs: > 7 days
   * - Error logs: > 30 days
   *
   * Pruning sets input/output to a summary object but keeps metadata.
   */
  private async pruneLogs(): Promise<{ count: number; errors: string[] }> {
    const db = getDb();
    const errors: string[] = [];
    let totalPruned = 0;

    try {
      const regularPruneDate = new Date(
        Date.now() - this.config.pruneAfterDays * 24 * 60 * 60 * 1000
      );
      const errorPruneDate = new Date(
        Date.now() - this.config.errorRetentionDays * 24 * 60 * 60 * 1000
      );

      // Process in batches
      let hasMore = true;
      while (hasMore) {
        // Find logs to prune (non-error logs older than 7 days)
        const logsToCheck = await db
          .select({
            id: workflowNodeLogs.id,
            status: workflowNodeLogs.status,
            input: workflowNodeLogs.input,
            output: workflowNodeLogs.output,
            createdAt: workflowNodeLogs.createdAt,
          })
          .from(workflowNodeLogs)
          .where(
            and(
              // Has non-null input or output (not already pruned)
              or(
                sql`${workflowNodeLogs.input} IS NOT NULL`,
                sql`${workflowNodeLogs.output} IS NOT NULL`
              ),
              // Not a pruned marker
              sql`${workflowNodeLogs.input}::text != '{"pruned":true}'`,
              // Either: non-error older than 7 days, OR error older than 30 days
              or(
                and(
                  ne(workflowNodeLogs.status, 'error'),
                  lt(workflowNodeLogs.createdAt, regularPruneDate)
                ),
                and(
                  eq(workflowNodeLogs.status, 'error'),
                  lt(workflowNodeLogs.createdAt, errorPruneDate)
                )
              )
            )
          )
          .limit(this.config.batchSize);

        if (logsToCheck.length === 0) {
          hasMore = false;
          break;
        }

        // Delete blob storage data for offloaded logs
        for (const log of logsToCheck) {
          try {
            // Check if input is offloaded
            if (isStoragePointer(log.input)) {
              await logStorageService.getStorageProvider().delete(log.input.key);
            }
            // Check if output is offloaded
            if (isStoragePointer(log.output)) {
              await logStorageService.getStorageProvider().delete(log.output.key);
            }
          } catch (error: any) {
            errors.push(`Failed to delete blob for log ${log.id}: ${error.message}`);
          }
        }

        // Prune the logs (set input/output to pruned marker)
        const logIds = logsToCheck.map((l) => l.id);

        await db
          .update(workflowNodeLogs)
          .set({
            input: { pruned: true, prunedAt: new Date().toISOString() } as any,
            output: null,
          })
          .where(inArray(workflowNodeLogs.id, logIds));

        totalPruned += logsToCheck.length;

        logger.debug('Pruned batch of logs', {
          count: logsToCheck.length,
          totalPruned,
        });

        // Check if we got a full batch (more might exist)
        hasMore = logsToCheck.length === this.config.batchSize;
      }
    } catch (error: any) {
      errors.push(`Prune operation failed: ${error.message}`);
      logger.error('Prune operation failed', { error: error.message });
    }

    return { count: totalPruned, errors };
  }

  /**
   * Hard delete logs older than delete threshold (90 days)
   *
   * Also deletes associated blob storage data.
   */
  private async deleteLogs(): Promise<{ count: number; blobsDeleted: number; errors: string[] }> {
    const db = getDb();
    const errors: string[] = [];
    let totalDeleted = 0;
    let blobsDeleted = 0;

    try {
      const deleteDate = new Date(
        Date.now() - this.config.deleteAfterDays * 24 * 60 * 60 * 1000
      );

      // Process in batches
      let hasMore = true;
      while (hasMore) {
        // Find logs to delete
        const logsToDelete = await db
          .select({
            id: workflowNodeLogs.id,
            input: workflowNodeLogs.input,
            output: workflowNodeLogs.output,
          })
          .from(workflowNodeLogs)
          .where(lt(workflowNodeLogs.createdAt, deleteDate))
          .limit(this.config.batchSize);

        if (logsToDelete.length === 0) {
          hasMore = false;
          break;
        }

        // Delete blob storage data if configured
        if (this.config.deleteBlobs) {
          const keysToDelete: string[] = [];

          for (const log of logsToDelete) {
            if (isStoragePointer(log.input)) {
              keysToDelete.push(log.input.key);
            }
            if (isStoragePointer(log.output)) {
              keysToDelete.push(log.output.key);
            }
          }

          if (keysToDelete.length > 0) {
            const deleteResults = await logStorageService
              .getStorageProvider()
              .deleteMany(keysToDelete);

            blobsDeleted += deleteResults.filter((r) => r.success).length;

            const failedDeletes = deleteResults.filter((r) => !r.success);
            for (const failed of failedDeletes) {
              errors.push(`Failed to delete blob ${failed.key}: ${failed.error}`);
            }
          }
        }

        // Delete the log records
        const logIds = logsToDelete.map((l) => l.id);

        await db.delete(workflowNodeLogs).where(inArray(workflowNodeLogs.id, logIds));

        totalDeleted += logsToDelete.length;

        logger.debug('Deleted batch of logs', {
          count: logsToDelete.length,
          totalDeleted,
          blobsDeleted,
        });

        // Check if we got a full batch
        hasMore = logsToDelete.length === this.config.batchSize;
      }
    } catch (error: any) {
      errors.push(`Delete operation failed: ${error.message}`);
      logger.error('Delete operation failed', { error: error.message });
    }

    return { count: totalDeleted, blobsDeleted, errors };
  }

  /**
   * Get current metrics
   */
  getMetrics(): RetentionMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      lastRunAt: null,
      totalPruned: 0,
      totalDeleted: 0,
      totalBlobsDeleted: 0,
      totalErrors: 0,
      runCount: 0,
      averageDurationMs: 0,
    };
  }

  /**
   * Force run retention (for testing/manual trigger)
   */
  async forceRun(): Promise<RetentionRunResult> {
    return this.runRetention();
  }

  /**
   * Check if worker is currently running
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

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RetentionPolicyConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Retention config updated', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): RetentionPolicyConfig {
    return { ...this.config };
  }
}

// ============================================================================
// SINGLETON EXPORTS
// ============================================================================

export function getLogRetentionWorker(
  config?: Partial<RetentionPolicyConfig>
): LogRetentionWorker {
  return LogRetentionWorker.getInstance(config);
}

export function startLogRetentionWorker(
  config?: Partial<RetentionPolicyConfig>,
  intervalMs?: number
): LogRetentionWorker {
  const worker = getLogRetentionWorker(config);
  worker.start(intervalMs);
  return worker;
}

export function stopLogRetentionWorker(): void {
  const worker = LogRetentionWorker.getInstance();
  worker.stop();
}

export default LogRetentionWorker;
