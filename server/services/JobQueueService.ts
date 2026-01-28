/**
 * JOB QUEUE SERVICE (BullMQ Integration)
 *
 * Handles background job processing with retries, scheduling, and monitoring
 * Redis is OPTIONAL - if not configured, job queue runs in-memory only
 */

import { Queue, Worker, Job, QueueEvents } from "bullmq";
import Redis from "ioredis";

// Redis connection - optional, only initialized if REDIS_URL is configured
let redisConnection: Redis | null = null;

// Check if Redis is actually configured (allow localhost for local Docker Redis)
const redisUrl = process.env.REDIS_URL?.replace(/^['"]|['"]$/g, '').trim();
const redisHost = process.env.REDIS_HOST?.replace(/^['"]|['"]$/g, '').trim();
const isRedisConfigured = !!(redisUrl && redisUrl !== '') || !!(redisHost && redisHost !== '');

if (isRedisConfigured) {
  try {
    // Prefer REDIS_URL for full connection string with username support (Redis Cloud ACL)
    if (redisUrl && redisUrl !== '') {
      console.log("[JOB_QUEUE] Connecting via REDIS_URL");
      redisConnection = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
        retryStrategy: () => null,
        enableOfflineQueue: false,
        enableReadyCheck: false,
        connectTimeout: 5000,
      });
    } else {
      // Fallback to individual params
      const redisPassword = process.env.REDIS_PASSWORD?.replace(/^['"]|['"]$/g, '');
      const host = (redisHost || "localhost").replace(/^['"]|['"]$/g, '');
      const redisPort = parseInt((process.env.REDIS_PORT || "6379").replace(/^['"]|['"]$/g, ''));

      const redisConfig: any = {
        host,
        port: redisPort,
        username: 'default', // Required for Redis Cloud ACL
        maxRetriesPerRequest: null,
        lazyConnect: true,
        retryStrategy: () => null,
        enableOfflineQueue: false,
        enableReadyCheck: false,
        connectTimeout: 5000,
      };

      if (redisPassword) {
        redisConfig.password = redisPassword;
      }

      redisConnection = new Redis(redisConfig);
    }

    redisConnection.on("error", () => {
      // Silently ignore Redis errors - we run without it
    });

    redisConnection.on("connect", () => {
      console.log("[JOB_QUEUE] ✅ Connected to Redis");
    });

    redisConnection.connect().catch(() => {
      redisConnection = null;
    });
  } catch {
    redisConnection = null;
  }
} else {
  console.log("[JOB_QUEUE] Redis not configured - running without persistent job queue");
}

// ============================================================
// JOB TYPES & INTERFACES
// ============================================================

export type JobType =
  | "workflow_execution"
  | "scheduled_workflow"
  | "agent_task"
  | "document_processing"
  | "email_send"
  | "data_export";

export interface WorkflowJobData {
  workflowId: string;
  userId: string;
  inputs: Record<string, any>;
  scheduled?: boolean;
  cronExpression?: string;
}

export interface AgentTaskJobData {
  agentId: string;
  taskName: string;
  taskData: any;
  userId: string;
}

export interface DocumentProcessingJobData {
  fileId: string;
  userId: string;
  workspaceId?: string;
  action: "parse" | "embed" | "index";
}

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  agentId?: string;
}

export type JobData =
  | WorkflowJobData
  | AgentTaskJobData
  | DocumentProcessingJobData
  | EmailJobData;

export interface JobOptions {
  priority?: number; // 1 (highest) to 10 (lowest)
  delay?: number; // Delay in milliseconds
  attempts?: number; // Max retry attempts
  backoff?: {
    type: "exponential" | "fixed";
    delay: number;
  };
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
  repeat?: {
    pattern: string; // Cron expression
    limit?: number; // Max repetitions
  };
}

// ============================================================
// JOB QUEUE MANAGER
// ============================================================

export class JobQueueService {
  private queues: Map<JobType, Queue> = new Map();
  private workers: Map<JobType, Worker> = new Map();
  private queueEvents: Map<JobType, QueueEvents> = new Map();

  constructor() {
    console.log("[JOB_QUEUE] Initializing Job Queue Service...");
  }

  /**
   * Initialize a queue for a specific job type
   */
  initializeQueue(
    jobType: JobType,
    processor: (job: Job<JobData>) => Promise<any>
  ): void {
    console.log(`[JOB_QUEUE] Initializing queue: ${jobType}`);

    if (!redisConnection) {
      console.warn(`[JOB_QUEUE] Cannot initialize queue ${jobType}: Redis not connected`);
      return;
    }

    // Create queue
    const queue = new Queue(jobType, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 200, // Keep last 200 failed jobs
      },
    });

    // Create worker
    const worker = new Worker(jobType, processor, {
      connection: redisConnection.duplicate(),
      concurrency: 5, // Process 5 jobs concurrently
    });

    // Create queue events
    const queueEvents = new QueueEvents(jobType, {
      connection: redisConnection.duplicate(),
    });

    // Event listeners for monitoring
    worker.on("completed", (job) => {
      console.log(`[JOB_QUEUE] ✅ Job completed: ${job.id} (${jobType})`);
    });

    worker.on("failed", (job, err) => {
      console.error(`[JOB_QUEUE] ❌ Job failed: ${job?.id} (${jobType})`, err);
    });

    worker.on("progress", (job, progress) => {
      console.log(`[JOB_QUEUE] 📊 Job progress: ${job.id} - ${progress}%`);
    });

    // Store references
    this.queues.set(jobType, queue);
    this.workers.set(jobType, worker);
    this.queueEvents.set(jobType, queueEvents);
  }

  /**
   * Add a job to the queue
   */
  async addJob(
    jobType: JobType,
    jobName: string,
    data: JobData,
    options?: JobOptions
  ): Promise<Job<JobData>> {
    const queue = this.queues.get(jobType);

    if (!queue) {
      throw new Error(`Queue not initialized for job type: ${jobType}`);
    }

    console.log(`[JOB_QUEUE] Adding job: ${jobName} (${jobType})`);

    const job = await queue.add(jobName, data, options);

    return job;
  }

  /**
   * Get job status
   */
  async getJob(jobType: JobType, jobId: string): Promise<Job | undefined> {
    const queue = this.queues.get(jobType);
    if (!queue) return undefined;

    return await queue.getJob(jobId);
  }

  /**
   * Get all jobs by state
   */
  async getJobs(
    jobType: JobType,
    state: "completed" | "failed" | "delayed" | "active" | "waiting"
  ): Promise<Job[]> {
    const queue = this.queues.get(jobType);
    if (!queue) return [];

    return await queue.getJobs([state]);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(jobType: JobType): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.queues.get(jobType);
    if (!queue) {
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Remove a job
   */
  async removeJob(jobType: JobType, jobId: string): Promise<void> {
    const job = await this.getJob(jobType, jobId);
    if (job) {
      await job.remove();
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobType: JobType, jobId: string): Promise<void> {
    const job = await this.getJob(jobType, jobId);
    if (job) {
      await job.retry();
    }
  }

  /**
   * Clean old jobs
   */
  async cleanQueue(
    jobType: JobType,
    grace: number = 3600000, // 1 hour
    limit: number = 1000
  ): Promise<void> {
    const queue = this.queues.get(jobType);
    if (!queue) return;

    await queue.clean(grace, limit, "completed");
    await queue.clean(grace, limit, "failed");
  }

  /**
   * Pause queue processing
   */
  async pauseQueue(jobType: JobType): Promise<void> {
    const queue = this.queues.get(jobType);
    if (queue) {
      await queue.pause();
      console.log(`[JOB_QUEUE] Queue paused: ${jobType}`);
    }
  }

  /**
   * Resume queue processing
   */
  async resumeQueue(jobType: JobType): Promise<void> {
    const queue = this.queues.get(jobType);
    if (queue) {
      await queue.resume();
      console.log(`[JOB_QUEUE] Queue resumed: ${jobType}`);
    }
  }

  /**
   * Shutdown all queues and workers
   */
  async shutdown(): Promise<void> {
    console.log("[JOB_QUEUE] Shutting down...");

    for (const [jobType, worker] of this.workers.entries()) {
      await worker.close();
      console.log(`[JOB_QUEUE] Worker closed: ${jobType}`);
    }

    for (const [jobType, queue] of this.queues.entries()) {
      await queue.close();
      console.log(`[JOB_QUEUE] Queue closed: ${jobType}`);
    }

    if (redisConnection) {
      await redisConnection.quit();
    }
    console.log("[JOB_QUEUE] Shutdown complete");
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const jobQueueService = new JobQueueService();
