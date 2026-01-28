/**
 * PHASE 5: BullMQ Job Queue Service for Enterprise Agents
 * Handles scheduled tasks, workflow execution, and background jobs
 */

import { Queue, Worker, Job, QueueEvents, JobsOptions } from 'bullmq';
import Redis from 'ioredis';

export interface JobQueueConfig {
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
  defaultJobOptions?: JobsOptions;
}

export interface JobData {
  type: string;
  payload: Record<string, unknown>;
  metadata: {
    workspaceId: string;
    userId: string;
    agentId?: string;
    correlationId?: string;
    priority?: number;
    createdAt: string;
  };
}

export interface JobResult {
  success: boolean;
  data?: unknown;
  error?: string;
  executionTimeMs: number;
}

export type JobHandler = (job: Job<JobData>) => Promise<JobResult>;

const DEFAULT_CONFIG: Partial<JobQueueConfig> = {
  redisHost: process.env.REDIS_HOST || '127.0.0.1',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  redisPassword: process.env.REDIS_PASSWORD,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 60 * 60, // 24 hours
    },
    removeOnFail: {
      count: 5000,
      age: 7 * 24 * 60 * 60, // 7 days
    },
  },
};

/**
 * Job Queue Service
 * Manages BullMQ queues for Aura (workflows), Dexter (reports), and Cassie (ticket processing)
 */
export class JobQueueService {
  private static instance: JobQueueService;
  private connection: Redis | null = null;
  private queues: Map<string, Queue<JobData>> = new Map();
  private workers: Map<string, Worker<JobData, JobResult>> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  private config: JobQueueConfig;
  private isInitialized = false;
  private metrics = {
    jobsQueued: 0,
    jobsCompleted: 0,
    jobsFailed: 0,
    totalExecutionTimeMs: 0,
  };

  private constructor(config: Partial<JobQueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config } as JobQueueConfig;
  }

  public static getInstance(config?: Partial<JobQueueConfig>): JobQueueService {
    if (!JobQueueService.instance) {
      JobQueueService.instance = new JobQueueService(config);
    }
    return JobQueueService.instance;
  }

  /**
   * Initialize the Redis connection
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      this.connection = new Redis({
        host: this.config.redisHost,
        port: this.config.redisPort,
        password: this.config.redisPassword,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });

      await this.connection.ping();
      this.isInitialized = true;
      console.log('[JobQueueService] Redis connection established');
      return true;
    } catch (error) {
      console.error('[JobQueueService] Failed to connect to Redis:', error);
      this.connection = null;
      return false;
    }
  }

  /**
   * Create or get a queue
   */
  public getQueue(queueName: string): Queue<JobData> | null {
    if (!this.isInitialized || !this.connection) {
      console.warn('[JobQueueService] Not initialized');
      return null;
    }

    if (!this.queues.has(queueName)) {
      const queue = new Queue<JobData>(queueName, {
        connection: this.connection,
        defaultJobOptions: this.config.defaultJobOptions,
      });
      this.queues.set(queueName, queue);
      console.log(`[JobQueueService] Created queue: ${queueName}`);
    }

    return this.queues.get(queueName)!;
  }

  /**
   * Add a job to a queue
   */
  public async addJob(
    queueName: string,
    jobType: string,
    payload: Record<string, unknown>,
    metadata: Omit<JobData['metadata'], 'createdAt'>,
    options?: JobsOptions
  ): Promise<Job<JobData> | null> {
    const queue = this.getQueue(queueName);
    if (!queue) return null;

    const jobData: JobData = {
      type: jobType,
      payload,
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
      },
    };

    try {
      const job = await queue.add(jobType, jobData, {
        ...this.config.defaultJobOptions,
        ...options,
        priority: metadata.priority,
      });

      this.metrics.jobsQueued++;
      console.log(`[JobQueueService] Job ${job.id} added to queue ${queueName}`);
      return job;
    } catch (error) {
      console.error('[JobQueueService] Failed to add job:', error);
      return null;
    }
  }

  /**
   * Add a scheduled/repeating job
   */
  public async addScheduledJob(
    queueName: string,
    jobType: string,
    payload: Record<string, unknown>,
    metadata: Omit<JobData['metadata'], 'createdAt'>,
    schedule: {
      pattern?: string; // Cron pattern
      every?: number; // Milliseconds
      limit?: number; // Max repetitions
    }
  ): Promise<Job<JobData> | null> {
    const queue = this.getQueue(queueName);
    if (!queue) return null;

    const jobData: JobData = {
      type: jobType,
      payload,
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
      },
    };

    try {
      const job = await queue.add(jobType, jobData, {
        ...this.config.defaultJobOptions,
        repeat: {
          pattern: schedule.pattern,
          every: schedule.every,
          limit: schedule.limit,
        },
        jobId: `scheduled:${queueName}:${jobType}:${metadata.workspaceId}`,
      });

      this.metrics.jobsQueued++;
      console.log(`[JobQueueService] Scheduled job added to queue ${queueName}`);
      return job;
    } catch (error) {
      console.error('[JobQueueService] Failed to add scheduled job:', error);
      return null;
    }
  }

  /**
   * Register a job handler
   */
  public registerHandler(jobType: string, handler: JobHandler): void {
    this.handlers.set(jobType, handler);
    console.log(`[JobQueueService] Registered handler for job type: ${jobType}`);
  }

  /**
   * Start a worker for a queue
   */
  public startWorker(
    queueName: string,
    concurrency: number = 5,
    handlers?: Map<string, JobHandler>
  ): Worker<JobData, JobResult> | null {
    if (!this.isInitialized || !this.connection) {
      console.warn('[JobQueueService] Not initialized');
      return null;
    }

    // Use provided handlers or default handlers
    const jobHandlers = handlers || this.handlers;

    const worker = new Worker<JobData, JobResult>(
      queueName,
      async (job) => {
        const startTime = Date.now();
        const handler = jobHandlers.get(job.data.type);

        if (!handler) {
          console.error(`[JobQueueService] No handler for job type: ${job.data.type}`);
          return {
            success: false,
            error: `No handler for job type: ${job.data.type}`,
            executionTimeMs: Date.now() - startTime,
          };
        }

        try {
          console.log(`[JobQueueService] Processing job ${job.id} (${job.data.type})`);
          const result = await handler(job);
          const executionTime = Date.now() - startTime;

          this.metrics.jobsCompleted++;
          this.metrics.totalExecutionTimeMs += executionTime;

          console.log(`[JobQueueService] Job ${job.id} completed in ${executionTime}ms`);
          return { ...result, executionTimeMs: executionTime };
        } catch (error) {
          const executionTime = Date.now() - startTime;
          this.metrics.jobsFailed++;

          console.error(`[JobQueueService] Job ${job.id} failed:`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            executionTimeMs: executionTime,
          };
        }
      },
      {
        connection: this.connection,
        concurrency,
        limiter: {
          max: 10,
          duration: 1000,
        },
      }
    );

    // Set up event listeners
    worker.on('completed', (job, result) => {
      console.log(`[JobQueueService] Job ${job.id} completed:`, result.success);
    });

    worker.on('failed', (job, error) => {
      console.error(`[JobQueueService] Job ${job?.id} failed:`, error.message);
    });

    worker.on('error', (error) => {
      console.error('[JobQueueService] Worker error:', error);
    });

    this.workers.set(queueName, worker);
    console.log(`[JobQueueService] Started worker for queue: ${queueName} (concurrency: ${concurrency})`);
    return worker;
  }

  /**
   * Get queue events for monitoring
   */
  public getQueueEvents(queueName: string): QueueEvents | null {
    if (!this.isInitialized || !this.connection) return null;

    if (!this.queueEvents.has(queueName)) {
      const events = new QueueEvents(queueName, {
        connection: this.connection,
      });
      this.queueEvents.set(queueName, events);
    }

    return this.queueEvents.get(queueName)!;
  }

  /**
   * Get job status
   */
  public async getJobStatus(queueName: string, jobId: string): Promise<{
    status: string;
    progress: number;
    data?: JobData;
    result?: JobResult;
    failedReason?: string;
  } | null> {
    const queue = this.getQueue(queueName);
    if (!queue) return null;

    try {
      const job = await queue.getJob(jobId);
      if (!job) return null;

      const state = await job.getState();

      return {
        status: state,
        progress: job.progress as number,
        data: job.data,
        result: job.returnvalue as JobResult | undefined,
        failedReason: job.failedReason,
      };
    } catch (error) {
      console.error('[JobQueueService] Failed to get job status:', error);
      return null;
    }
  }

  /**
   * Cancel a job
   */
  public async cancelJob(queueName: string, jobId: string): Promise<boolean> {
    const queue = this.getQueue(queueName);
    if (!queue) return false;

    try {
      const job = await queue.getJob(jobId);
      if (!job) return false;

      await job.remove();
      console.log(`[JobQueueService] Job ${jobId} cancelled`);
      return true;
    } catch (error) {
      console.error('[JobQueueService] Failed to cancel job:', error);
      return false;
    }
  }

  /**
   * Remove scheduled job
   */
  public async removeScheduledJob(queueName: string, jobKey: string): Promise<boolean> {
    const queue = this.getQueue(queueName);
    if (!queue) return false;

    try {
      const removed = await queue.removeRepeatableByKey(jobKey);
      console.log(`[JobQueueService] Scheduled job ${jobKey} removed: ${removed}`);
      return removed;
    } catch (error) {
      console.error('[JobQueueService] Failed to remove scheduled job:', error);
      return false;
    }
  }

  /**
   * Get queue statistics
   */
  public async getQueueStats(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  } | null> {
    const queue = this.getQueue(queueName);
    if (!queue) return null;

    try {
      const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
        queue.getPausedCount(),
      ]);

      return { waiting, active, completed, failed, delayed, paused };
    } catch (error) {
      console.error('[JobQueueService] Failed to get queue stats:', error);
      return null;
    }
  }

  /**
   * Pause a queue
   */
  public async pauseQueue(queueName: string): Promise<boolean> {
    const queue = this.getQueue(queueName);
    if (!queue) return false;

    try {
      await queue.pause();
      console.log(`[JobQueueService] Queue ${queueName} paused`);
      return true;
    } catch (error) {
      console.error('[JobQueueService] Failed to pause queue:', error);
      return false;
    }
  }

  /**
   * Resume a queue
   */
  public async resumeQueue(queueName: string): Promise<boolean> {
    const queue = this.getQueue(queueName);
    if (!queue) return false;

    try {
      await queue.resume();
      console.log(`[JobQueueService] Queue ${queueName} resumed`);
      return true;
    } catch (error) {
      console.error('[JobQueueService] Failed to resume queue:', error);
      return false;
    }
  }

  /**
   * Get service metrics
   */
  public getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Shutdown the service
   */
  public async shutdown(): Promise<void> {
    console.log('[JobQueueService] Shutting down...');

    // Close workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      console.log(`[JobQueueService] Worker ${name} closed`);
    }

    // Close queue events
    for (const [name, events] of this.queueEvents) {
      await events.close();
      console.log(`[JobQueueService] QueueEvents ${name} closed`);
    }

    // Close queues
    for (const [name, queue] of this.queues) {
      await queue.close();
      console.log(`[JobQueueService] Queue ${name} closed`);
    }

    // Close Redis connection
    if (this.connection) {
      await this.connection.quit();
      console.log('[JobQueueService] Redis connection closed');
    }

    this.isInitialized = false;
    console.log('[JobQueueService] Shutdown complete');
  }
}

// Queue names for different agents
export const QUEUE_NAMES = {
  AURA_WORKFLOWS: 'aura:workflows',
  AURA_SCHEDULED: 'aura:scheduled',
  AURA_EVENTS: 'aura:events',
  DEXTER_REPORTS: 'dexter:reports',
  DEXTER_FORECASTS: 'dexter:forecasts',
  CASSIE_TICKETS: 'cassie:tickets',
  CASSIE_KNOWLEDGE: 'cassie:knowledge',
} as const;

// Export singleton instance
export const jobQueueService = JobQueueService.getInstance();
