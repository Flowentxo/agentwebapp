/**
 * ResumptionWorker
 *
 * BullMQ-based worker for handling workflow resumption from suspended states.
 * Polls for ready-to-resume suspensions and triggers execution continuation.
 *
 * Features:
 * - Polling for timer/datetime suspensions
 * - Expiration handling
 * - Retry logic with exponential backoff
 * - Graceful shutdown
 */

import { Worker, Queue, Job, QueueEvents } from 'bullmq';
import { eq, and, lt, isNotNull } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import {
  executionSuspensions,
  ExecutionSuspension,
  ExecutionStateSnapshot,
} from '@/lib/db/schema-flow-control';
import { getWaitExecutor, WaitExecutorV2 } from '../services/executors/WaitExecutorV2';
import { logger } from '@/lib/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const QUEUE_NAME = 'workflow-resumption';
const POLL_INTERVAL = 5000; // 5 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay

// Redis connection options
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// ============================================================================
// TYPES
// ============================================================================

export interface ResumptionJobData {
  type: 'poll' | 'resume' | 'expire' | 'check-redis';
  suspensionId?: string;
  executionId?: string;
  payload?: Record<string, unknown>;
}

export interface ResumptionResult {
  success: boolean;
  suspensionId?: string;
  action: string;
  error?: string;
}

// ============================================================================
// RESUMPTION WORKER
// ============================================================================

export class ResumptionWorker {
  private queue: Queue<ResumptionJobData>;
  private worker: Worker<ResumptionJobData, ResumptionResult>;
  private queueEvents: QueueEvents;
  private db = getDb();
  private waitExecutor: WaitExecutorV2;
  private pollInterval: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor() {
    this.waitExecutor = getWaitExecutor();

    // Initialize BullMQ queue
    this.queue = new Queue<ResumptionJobData>(QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: MAX_RETRIES,
        backoff: {
          type: 'exponential',
          delay: RETRY_DELAY,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50,      // Keep last 50 failed jobs
      },
    });

    // Initialize worker
    this.worker = new Worker<ResumptionJobData, ResumptionResult>(
      QUEUE_NAME,
      async (job) => this.processJob(job),
      {
        connection: redisConnection,
        concurrency: 5,
        limiter: {
          max: 10,
          duration: 1000, // 10 jobs per second max
        },
      }
    );

    // Initialize queue events for monitoring
    this.queueEvents = new QueueEvents(QUEUE_NAME, {
      connection: redisConnection,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for logging and monitoring
   */
  private setupEventHandlers(): void {
    this.worker.on('completed', (job, result) => {
      logger.info('[RESUMPTION_WORKER] Job completed', {
        jobId: job.id,
        type: job.data.type,
        result,
      });
    });

    this.worker.on('failed', (job, error) => {
      logger.error('[RESUMPTION_WORKER] Job failed', {
        jobId: job?.id,
        type: job?.data.type,
        error: error.message,
      });
    });

    this.worker.on('error', (error) => {
      logger.error('[RESUMPTION_WORKER] Worker error', { error: error.message });
    });

    this.queueEvents.on('waiting', ({ jobId }) => {
      logger.debug('[RESUMPTION_WORKER] Job waiting', { jobId });
    });
  }

  /**
   * Process a resumption job
   */
  private async processJob(job: Job<ResumptionJobData>): Promise<ResumptionResult> {
    const { type, suspensionId, executionId, payload } = job.data;

    logger.info('[RESUMPTION_WORKER] Processing job', {
      jobId: job.id,
      type,
      suspensionId,
    });

    switch (type) {
      case 'poll':
        return this.handlePoll();

      case 'resume':
        if (!suspensionId) {
          return { success: false, action: 'resume', error: 'Missing suspensionId' };
        }
        return this.handleResume(suspensionId, payload);

      case 'expire':
        return this.handleExpireCheck();

      case 'check-redis':
        return this.handleRedisCheck();

      default:
        return { success: false, action: type, error: `Unknown job type: ${type}` };
    }
  }

  /**
   * Poll for ready-to-resume suspensions
   */
  private async handlePoll(): Promise<ResumptionResult> {
    try {
      const now = new Date();

      // Find suspensions ready to resume
      const readySuspensions = await this.db
        .select()
        .from(executionSuspensions)
        .where(
          and(
            eq(executionSuspensions.status, 'pending'),
            lt(executionSuspensions.resumeAt, now),
            isNotNull(executionSuspensions.resumeAt)
          )
        )
        .limit(50); // Process in batches

      if (readySuspensions.length === 0) {
        return { success: true, action: 'poll', error: 'No suspensions ready' };
      }

      logger.info('[RESUMPTION_WORKER] Found ready suspensions', {
        count: readySuspensions.length,
      });

      // Queue individual resume jobs
      for (const suspension of readySuspensions) {
        await this.queue.add(
          `resume-${suspension.id}`,
          {
            type: 'resume',
            suspensionId: suspension.id,
            executionId: suspension.executionId,
          },
          {
            priority: this.getPriority(suspension),
            jobId: `resume-${suspension.id}`, // Prevent duplicates
          }
        );
      }

      return {
        success: true,
        action: 'poll',
      };
    } catch (error) {
      logger.error('[RESUMPTION_WORKER] Poll error', { error });
      throw error;
    }
  }

  /**
   * Handle resumption of a specific suspension
   */
  private async handleResume(
    suspensionId: string,
    payload?: Record<string, unknown>
  ): Promise<ResumptionResult> {
    try {
      const suspension = await this.waitExecutor.getSuspension(suspensionId);

      if (!suspension) {
        return {
          success: false,
          suspensionId,
          action: 'resume',
          error: 'Suspension not found',
        };
      }

      if (suspension.status !== 'pending') {
        return {
          success: true,
          suspensionId,
          action: 'resume',
          error: `Already processed: ${suspension.status}`,
        };
      }

      // Determine trigger type based on suspension type
      const triggerType = this.getTriggerType(suspension);

      // Resume the execution
      const result = await this.waitExecutor.resumeExecution({
        suspensionId,
        triggerType,
        payload: payload || {},
        metadata: {
          triggeredAt: new Date().toISOString(),
          triggeredBy: 'resumption-worker',
        },
      });

      if (result.success && result.executionState) {
        // Trigger workflow engine to continue execution
        await this.triggerExecutionContinuation(
          suspension.workflowId,
          suspension.executionId,
          suspension.nodeId,
          result.executionState,
          result.resumePayload
        );
      }

      return {
        success: result.success,
        suspensionId,
        action: 'resume',
        error: result.error,
      };
    } catch (error) {
      logger.error('[RESUMPTION_WORKER] Resume error', { suspensionId, error });
      throw error;
    }
  }

  /**
   * Check and handle expired suspensions
   */
  private async handleExpireCheck(): Promise<ResumptionResult> {
    try {
      const expired = await this.waitExecutor.getExpiredSuspensions();

      if (expired.length === 0) {
        return { success: true, action: 'expire' };
      }

      logger.info('[RESUMPTION_WORKER] Found expired suspensions', {
        count: expired.length,
      });

      const expiredIds = expired.map(s => s.id);
      await this.waitExecutor.markExpired(expiredIds);

      // Handle timeout actions for each expired suspension
      for (const suspension of expired) {
        const config = (suspension.executionState as ExecutionStateSnapshot);
        // Could trigger timeout handler here if configured
      }

      return { success: true, action: 'expire' };
    } catch (error) {
      logger.error('[RESUMPTION_WORKER] Expire check error', { error });
      throw error;
    }
  }

  /**
   * Check Redis for short-term waits that are ready
   */
  private async handleRedisCheck(): Promise<ResumptionResult> {
    // This would scan Redis for ready-to-resume short-term waits
    // Implementation depends on Redis client availability
    return { success: true, action: 'check-redis' };
  }

  /**
   * Trigger the workflow engine to continue execution
   */
  private async triggerExecutionContinuation(
    workflowId: string,
    executionId: string,
    nodeId: string,
    executionState: ExecutionStateSnapshot,
    resumePayload?: Record<string, unknown>
  ): Promise<void> {
    // This would call the WorkflowExecutionEngine to continue
    // For now, we'll emit an event that the engine can listen to

    logger.info('[RESUMPTION_WORKER] Triggering execution continuation', {
      workflowId,
      executionId,
      nodeId,
    });

    // Option 1: Add to execution queue
    // await this.executionQueue.add('continue-execution', { ... });

    // Option 2: Direct API call
    // await fetch(`/api/workflow/${workflowId}/executions/${executionId}/continue`, { ... });

    // Option 3: Event emission (for now)
    // This will be integrated with WorkflowExecutionEngineV3
  }

  /**
   * Get job priority based on suspension properties
   */
  private getPriority(suspension: ExecutionSuspension): number {
    // Lower number = higher priority
    if (suspension.suspensionType === 'webhook') return 1;
    if (suspension.suspensionType === 'timer') return 2;
    if (suspension.suspensionType === 'datetime') return 3;
    return 5;
  }

  /**
   * Get trigger type based on suspension type
   */
  private getTriggerType(suspension: ExecutionSuspension): string {
    const triggerMap: Record<string, string> = {
      timer: 'timer_elapsed',
      datetime: 'datetime_reached',
      webhook: 'webhook_received',
      manual: 'manual_trigger',
      condition: 'condition_met',
    };
    return triggerMap[suspension.suspensionType] || 'timer_elapsed';
  }

  /**
   * Start the polling loop
   */
  start(): void {
    if (this.pollInterval) {
      logger.warn('[RESUMPTION_WORKER] Already running');
      return;
    }

    logger.info('[RESUMPTION_WORKER] Starting worker');

    // Initial poll
    this.schedulePoll();

    // Setup recurring polls
    this.pollInterval = setInterval(() => {
      if (!this.isShuttingDown) {
        this.schedulePoll();
        this.scheduleExpireCheck();
      }
    }, POLL_INTERVAL);
  }

  /**
   * Schedule a poll job
   */
  private async schedulePoll(): Promise<void> {
    try {
      await this.queue.add(
        'poll',
        { type: 'poll' },
        {
          jobId: `poll-${Date.now()}`,
          priority: 10, // Lower priority than resumes
        }
      );
    } catch (error) {
      logger.error('[RESUMPTION_WORKER] Failed to schedule poll', { error });
    }
  }

  /**
   * Schedule an expiration check job
   */
  private async scheduleExpireCheck(): Promise<void> {
    try {
      await this.queue.add(
        'expire-check',
        { type: 'expire' },
        {
          jobId: `expire-${Date.now()}`,
          priority: 15,
        }
      );
    } catch (error) {
      logger.error('[RESUMPTION_WORKER] Failed to schedule expire check', { error });
    }
  }

  /**
   * Manually queue a resume job (for webhook triggers)
   */
  async queueResume(
    suspensionId: string,
    payload?: Record<string, unknown>
  ): Promise<string> {
    const job = await this.queue.add(
      `resume-${suspensionId}`,
      {
        type: 'resume',
        suspensionId,
        payload,
      },
      {
        priority: 1, // High priority for manual/webhook triggers
        jobId: `resume-${suspensionId}-${Date.now()}`,
      }
    );

    return job.id || '';
  }

  /**
   * Stop the worker gracefully
   */
  async stop(): Promise<void> {
    this.isShuttingDown = true;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    logger.info('[RESUMPTION_WORKER] Stopping worker...');

    await this.worker.close();
    await this.queueEvents.close();
    await this.queue.close();

    logger.info('[RESUMPTION_WORKER] Worker stopped');
  }

  /**
   * Get queue metrics
   */
  async getMetrics(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Clean old jobs from the queue
   */
  async cleanOldJobs(gracePeriod: number = 24 * 60 * 60 * 1000): Promise<void> {
    await this.queue.clean(gracePeriod, 1000, 'completed');
    await this.queue.clean(gracePeriod, 1000, 'failed');
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let workerInstance: ResumptionWorker | null = null;

export function getResumptionWorker(): ResumptionWorker {
  if (!workerInstance) {
    workerInstance = new ResumptionWorker();
  }
  return workerInstance;
}

export function startResumptionWorker(): ResumptionWorker {
  const worker = getResumptionWorker();
  worker.start();
  return worker;
}

export async function stopResumptionWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.stop();
    workerInstance = null;
  }
}

export default ResumptionWorker;
