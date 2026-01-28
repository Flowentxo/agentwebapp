/**
 * QueueMonitor.ts
 *
 * Phase 7: Operational Intelligence Layer
 *
 * Monitors BullMQ queue health and captures metrics snapshots.
 * Provides real-time visibility into job processing status.
 *
 * Metrics Captured:
 * - Waiting jobs count (backlog)
 * - Active jobs count
 * - Completed/Failed job counts
 * - Delayed jobs count
 * - Worker count
 * - Jobs per second (throughput)
 * - Average processing time
 * - Oldest waiting job age
 *
 * Health Checks:
 * - Backlog threshold exceeded
 * - Processing slowdown detected
 * - Worker count drop
 * - Stale jobs detection
 */

import { Queue, QueueEvents, Worker } from 'bullmq';
import { getDb } from '@/lib/db';
import { queueHealthSnapshots } from '@/lib/db/schema-monitoring';
import { sql, desc, eq } from 'drizzle-orm';
import { LRUCache } from 'lru-cache';

// ============================================================================
// TYPES
// ============================================================================

export interface QueueHealth {
  queueName: string;
  waitingCount: number;
  activeCount: number;
  completedCount: number;
  failedCount: number;
  delayedCount: number;
  pausedCount: number;
  workerCount: number;
  jobsPerSecond: number;
  avgProcessingTimeMs: number;
  oldestWaitingJobAge: number; // seconds
  isHealthy: boolean;
  healthIssues: string[];
  lastUpdated: Date;
}

export interface QueueMetrics {
  /** Total jobs processed in the time window */
  totalProcessed: number;

  /** Success rate (0-1) */
  successRate: number;

  /** Average wait time in queue (ms) */
  avgWaitTimeMs: number;

  /** Average processing time (ms) */
  avgProcessingTimeMs: number;

  /** Peak jobs per second */
  peakJobsPerSecond: number;

  /** Current throughput */
  currentThroughput: number;
}

export interface QueueMonitorConfig {
  /** Health check interval in ms */
  healthCheckIntervalMs: number;

  /** Snapshot capture interval in ms */
  snapshotIntervalMs: number;

  /** Backlog threshold for health warning */
  backlogThreshold: number;

  /** Processing time threshold for slow warning (ms) */
  processingTimeThresholdMs: number;

  /** Minimum workers expected */
  minWorkers: number;

  /** Maximum wait time before job is considered stale (seconds) */
  staleJobThresholdSeconds: number;
}

interface QueueRegistration {
  queue: Queue;
  events?: QueueEvents;
  workers: Set<string>;
  lastMetrics: {
    completedCount: number;
    failedCount: number;
    timestamp: number;
  };
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: QueueMonitorConfig = {
  healthCheckIntervalMs: 10000, // 10 seconds
  snapshotIntervalMs: 60000, // 1 minute
  backlogThreshold: 100,
  processingTimeThresholdMs: 30000, // 30 seconds
  minWorkers: 1,
  staleJobThresholdSeconds: 300, // 5 minutes
};

// ============================================================================
// QUEUE MONITOR
// ============================================================================

export class QueueMonitor {
  private db = getDb();
  private config: QueueMonitorConfig;
  private queues: Map<string, QueueRegistration> = new Map();
  private healthCache: LRUCache<string, QueueHealth>;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private snapshotInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(config: Partial<QueueMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.healthCache = new LRUCache({
      max: 50,
      ttl: this.config.healthCheckIntervalMs,
    });
  }

  // --------------------------------------------------------------------------
  // QUEUE REGISTRATION
  // --------------------------------------------------------------------------

  /**
   * Register a BullMQ queue for monitoring.
   */
  registerQueue(queue: Queue): void {
    const name = queue.name;

    if (this.queues.has(name)) {
      console.log(`[QueueMonitor] Queue ${name} already registered`);
      return;
    }

    // Create queue events listener
    const events = new QueueEvents(name, {
      connection: (queue as any).opts?.connection,
    });

    const registration: QueueRegistration = {
      queue,
      events,
      workers: new Set(),
      lastMetrics: {
        completedCount: 0,
        failedCount: 0,
        timestamp: Date.now(),
      },
    };

    this.queues.set(name, registration);
    console.log(`[QueueMonitor] Registered queue: ${name}`);

    // Set up event listeners
    this.setupEventListeners(name, events);
  }

  /**
   * Unregister a queue from monitoring.
   */
  async unregisterQueue(queueName: string): Promise<void> {
    const registration = this.queues.get(queueName);

    if (!registration) return;

    await registration.events?.close();
    this.queues.delete(queueName);
    this.healthCache.delete(queueName);

    console.log(`[QueueMonitor] Unregistered queue: ${queueName}`);
  }

  /**
   * Register a worker for a queue.
   */
  registerWorker(queueName: string, workerId: string): void {
    const registration = this.queues.get(queueName);
    if (registration) {
      registration.workers.add(workerId);
    }
  }

  /**
   * Unregister a worker.
   */
  unregisterWorker(queueName: string, workerId: string): void {
    const registration = this.queues.get(queueName);
    if (registration) {
      registration.workers.delete(workerId);
    }
  }

  // --------------------------------------------------------------------------
  // EVENT LISTENERS
  // --------------------------------------------------------------------------

  private setupEventListeners(queueName: string, events: QueueEvents): void {
    events.on('completed', ({ jobId }) => {
      // Increment completed count for throughput calculation
      const reg = this.queues.get(queueName);
      if (reg) {
        reg.lastMetrics.completedCount++;
      }
    });

    events.on('failed', ({ jobId, failedReason }) => {
      const reg = this.queues.get(queueName);
      if (reg) {
        reg.lastMetrics.failedCount++;
      }
    });

    events.on('error', (error) => {
      console.error(`[QueueMonitor] Queue ${queueName} error:`, error);
    });
  }

  // --------------------------------------------------------------------------
  // HEALTH CHECKS
  // --------------------------------------------------------------------------

  /**
   * Get current health status for a queue.
   */
  async getQueueHealth(queueName: string): Promise<QueueHealth | null> {
    // Check cache first
    const cached = this.healthCache.get(queueName);
    if (cached) return cached;

    const registration = this.queues.get(queueName);
    if (!registration) return null;

    const { queue } = registration;

    try {
      // Get job counts
      const [
        waitingCount,
        activeCount,
        completedCount,
        failedCount,
        delayedCount,
      ] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      // Get paused status
      const isPaused = await queue.isPaused();
      const pausedCount = isPaused ? waitingCount : 0;

      // Calculate throughput (jobs per second)
      const now = Date.now();
      const elapsed = (now - registration.lastMetrics.timestamp) / 1000;
      const processedSinceLastCheck =
        registration.lastMetrics.completedCount +
        registration.lastMetrics.failedCount;
      const jobsPerSecond =
        elapsed > 0 ? processedSinceLastCheck / elapsed : 0;

      // Reset metrics for next interval
      registration.lastMetrics = {
        completedCount: 0,
        failedCount: 0,
        timestamp: now,
      };

      // Get oldest waiting job age
      let oldestWaitingJobAge = 0;
      const waiting = await queue.getWaiting(0, 0);
      if (waiting.length > 0 && waiting[0].timestamp) {
        oldestWaitingJobAge = Math.floor(
          (now - waiting[0].timestamp) / 1000
        );
      }

      // Calculate average processing time from recent jobs
      let avgProcessingTimeMs = 0;
      const completed = await queue.getCompleted(0, 9);
      if (completed.length > 0) {
        const processingTimes = completed
          .filter((job) => job.finishedOn && job.processedOn)
          .map((job) => (job.finishedOn! - job.processedOn!));

        if (processingTimes.length > 0) {
          avgProcessingTimeMs =
            processingTimes.reduce((a, b) => a + b, 0) /
            processingTimes.length;
        }
      }

      // Determine health issues
      const healthIssues: string[] = [];

      if (waitingCount > this.config.backlogThreshold) {
        healthIssues.push(
          `Backlog exceeds threshold (${waitingCount} > ${this.config.backlogThreshold})`
        );
      }

      if (avgProcessingTimeMs > this.config.processingTimeThresholdMs) {
        healthIssues.push(
          `Slow processing (${Math.round(avgProcessingTimeMs)}ms > ${this.config.processingTimeThresholdMs}ms)`
        );
      }

      if (registration.workers.size < this.config.minWorkers) {
        healthIssues.push(
          `Low worker count (${registration.workers.size} < ${this.config.minWorkers})`
        );
      }

      if (
        oldestWaitingJobAge > this.config.staleJobThresholdSeconds
      ) {
        healthIssues.push(
          `Stale jobs detected (oldest: ${oldestWaitingJobAge}s)`
        );
      }

      if (isPaused) {
        healthIssues.push('Queue is paused');
      }

      const health: QueueHealth = {
        queueName,
        waitingCount,
        activeCount,
        completedCount,
        failedCount,
        delayedCount,
        pausedCount,
        workerCount: registration.workers.size,
        jobsPerSecond: Math.round(jobsPerSecond * 100) / 100,
        avgProcessingTimeMs: Math.round(avgProcessingTimeMs),
        oldestWaitingJobAge,
        isHealthy: healthIssues.length === 0,
        healthIssues,
        lastUpdated: new Date(),
      };

      this.healthCache.set(queueName, health);
      return health;
    } catch (error) {
      console.error(
        `[QueueMonitor] Error getting health for ${queueName}:`,
        error
      );
      return null;
    }
  }

  /**
   * Get health status for all registered queues.
   */
  async getAllQueuesHealth(): Promise<QueueHealth[]> {
    const results: QueueHealth[] = [];

    for (const queueName of this.queues.keys()) {
      const health = await this.getQueueHealth(queueName);
      if (health) {
        results.push(health);
      }
    }

    return results;
  }

  /**
   * Check if all queues are healthy.
   */
  async isSystemHealthy(): Promise<{
    healthy: boolean;
    issues: string[];
  }> {
    const allHealth = await this.getAllQueuesHealth();
    const issues: string[] = [];

    for (const health of allHealth) {
      if (!health.isHealthy) {
        issues.push(
          `${health.queueName}: ${health.healthIssues.join(', ')}`
        );
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }

  // --------------------------------------------------------------------------
  // METRICS
  // --------------------------------------------------------------------------

  /**
   * Get detailed metrics for a queue over a time window.
   */
  async getQueueMetrics(
    queueName: string,
    windowMinutes: number = 60
  ): Promise<QueueMetrics | null> {
    const windowStart = new Date(
      Date.now() - windowMinutes * 60 * 1000
    );

    // Get from snapshots
    const snapshots = await this.db
      .select()
      .from(queueHealthSnapshots)
      .where(
        sql`queue_name = ${queueName} AND captured_at > ${windowStart}`
      )
      .orderBy(desc(queueHealthSnapshots.capturedAt));

    if (snapshots.length === 0) {
      return null;
    }

    // Calculate aggregates
    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalWaitTime = 0;
    let totalProcessingTime = 0;
    let peakJps = 0;

    for (const snapshot of snapshots) {
      const completed = snapshot.completedCount || 0;
      const failed = snapshot.failedCount || 0;
      const jps = parseFloat(String(snapshot.jobsPerSecond || 0));

      totalProcessed += completed + failed;
      totalSuccessful += completed;
      totalProcessingTime += (snapshot.avgProcessingTimeMs || 0) * completed;
      peakJps = Math.max(peakJps, jps);
    }

    const avgProcessingTimeMs =
      totalSuccessful > 0 ? totalProcessingTime / totalSuccessful : 0;

    // Get current throughput from latest snapshot
    const latest = snapshots[0];
    const currentThroughput = parseFloat(
      String(latest.jobsPerSecond || 0)
    );

    return {
      totalProcessed,
      successRate:
        totalProcessed > 0 ? totalSuccessful / totalProcessed : 1,
      avgWaitTimeMs: (latest.oldestWaitingJobAge || 0) * 1000, // Convert to ms
      avgProcessingTimeMs,
      peakJobsPerSecond: peakJps,
      currentThroughput,
    };
  }

  // --------------------------------------------------------------------------
  // SNAPSHOT CAPTURE
  // --------------------------------------------------------------------------

  /**
   * Capture health snapshots for all queues.
   */
  async captureSnapshots(): Promise<void> {
    const allHealth = await this.getAllQueuesHealth();

    for (const health of allHealth) {
      try {
        await this.db.insert(queueHealthSnapshots).values({
          queueName: health.queueName,
          waitingCount: health.waitingCount,
          activeCount: health.activeCount,
          completedCount: health.completedCount,
          failedCount: health.failedCount,
          delayedCount: health.delayedCount,
          pausedCount: health.pausedCount,
          workerCount: health.workerCount,
          jobsPerSecond: health.jobsPerSecond.toString(),
          avgProcessingTimeMs: health.avgProcessingTimeMs,
          oldestWaitingJobAge: health.oldestWaitingJobAge,
          isHealthy: health.isHealthy,
          healthIssues: health.healthIssues,
        });
      } catch (error) {
        console.error(
          `[QueueMonitor] Error saving snapshot for ${health.queueName}:`,
          error
        );
      }
    }
  }

  /**
   * Get historical snapshots for a queue.
   */
  async getSnapshots(
    queueName: string,
    limit: number = 60
  ): Promise<any[]> {
    return await this.db
      .select()
      .from(queueHealthSnapshots)
      .where(eq(queueHealthSnapshots.queueName, queueName))
      .orderBy(desc(queueHealthSnapshots.capturedAt))
      .limit(limit);
  }

  // --------------------------------------------------------------------------
  // BACKGROUND MONITORING
  // --------------------------------------------------------------------------

  /**
   * Start the background monitoring loop.
   */
  start(): void {
    if (this.isRunning) {
      console.log('[QueueMonitor] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[QueueMonitor] Starting monitoring');

    // Health check interval
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.isSystemHealthy();
        if (!health.healthy) {
          console.warn(
            `[QueueMonitor] System unhealthy: ${health.issues.join('; ')}`
          );
        }
      } catch (error) {
        console.error('[QueueMonitor] Health check error:', error);
      }
    }, this.config.healthCheckIntervalMs);

    // Snapshot interval
    this.snapshotInterval = setInterval(async () => {
      try {
        await this.captureSnapshots();
      } catch (error) {
        console.error('[QueueMonitor] Snapshot error:', error);
      }
    }, this.config.snapshotIntervalMs);

    // Capture initial snapshot
    this.captureSnapshots().catch(console.error);
  }

  /**
   * Stop the background monitoring.
   */
  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }

    this.isRunning = false;
    console.log('[QueueMonitor] Stopped');
  }

  /**
   * Check if monitor is running.
   */
  isActive(): boolean {
    return this.isRunning;
  }

  // --------------------------------------------------------------------------
  // QUEUE ACTIONS
  // --------------------------------------------------------------------------

  /**
   * Pause a queue.
   */
  async pauseQueue(queueName: string): Promise<boolean> {
    const registration = this.queues.get(queueName);
    if (!registration) return false;

    await registration.queue.pause();
    return true;
  }

  /**
   * Resume a queue.
   */
  async resumeQueue(queueName: string): Promise<boolean> {
    const registration = this.queues.get(queueName);
    if (!registration) return false;

    await registration.queue.resume();
    return true;
  }

  /**
   * Clean old jobs from a queue.
   */
  async cleanQueue(
    queueName: string,
    options: {
      completed?: { maxAge: number }; // ms
      failed?: { maxAge: number }; // ms
    } = {}
  ): Promise<{ completed: number; failed: number }> {
    const registration = this.queues.get(queueName);
    if (!registration) return { completed: 0, failed: 0 };

    let completedCleaned = 0;
    let failedCleaned = 0;

    if (options.completed) {
      const cleaned = await registration.queue.clean(
        options.completed.maxAge,
        100,
        'completed'
      );
      completedCleaned = cleaned.length;
    }

    if (options.failed) {
      const cleaned = await registration.queue.clean(
        options.failed.maxAge,
        100,
        'failed'
      );
      failedCleaned = cleaned.length;
    }

    return { completed: completedCleaned, failed: failedCleaned };
  }

  /**
   * Retry all failed jobs in a queue.
   */
  async retryFailedJobs(
    queueName: string,
    limit: number = 100
  ): Promise<number> {
    const registration = this.queues.get(queueName);
    if (!registration) return 0;

    const failed = await registration.queue.getFailed(0, limit - 1);
    let retried = 0;

    for (const job of failed) {
      try {
        await job.retry();
        retried++;
      } catch {
        // Job may have been removed or already retried
      }
    }

    return retried;
  }

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  /**
   * Get list of registered queue names.
   */
  getRegisteredQueues(): string[] {
    return Array.from(this.queues.keys());
  }

  /**
   * Clear health cache.
   */
  clearCache(): void {
    this.healthCache.clear();
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: QueueMonitor | null = null;

export function getQueueMonitor(
  config?: Partial<QueueMonitorConfig>
): QueueMonitor {
  if (!instance) {
    instance = new QueueMonitor(config);
  }
  return instance;
}

export default QueueMonitor;
