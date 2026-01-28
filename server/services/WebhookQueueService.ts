/**
 * WEBHOOK QUEUE SERVICE
 *
 * Manages asynchronous webhook workflow execution using BullMQ
 * Redis is OPTIONAL - service runs without persistent queue if not configured
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { workflowExecutionEngine } from './WorkflowExecutionEngine';
import { getDb } from '@/lib/db';
import { workflows } from '@/lib/db/schema-workflows';
import { eq } from 'drizzle-orm';
import { webhookService } from './WebhookService';

// Redis is optional - only connect if configured
const redisUrl = process.env.REDIS_URL?.replace(/^['"]|['"]$/g, '').trim();
const redisHost = process.env.REDIS_HOST?.replace(/^['"]|['"]$/g, '').trim();
const isRedisConfigured = !!(redisUrl && redisUrl !== '') || !!(redisHost && redisHost !== '');

let connection: Redis | null = null;

if (isRedisConfigured) {
  // Prefer REDIS_URL for full connection string with username support (Redis Cloud ACL)
  if (redisUrl && redisUrl !== '') {
    connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy: () => null,
      enableOfflineQueue: false,
    });
  } else {
    const REDIS_HOST = (redisHost || 'localhost').replace(/^['"]|['"]$/g, '');
    const REDIS_PORT = parseInt((process.env.REDIS_PORT || '6379').replace(/^['"]|['"]$/g, ''), 10);
    const REDIS_PASSWORD = process.env.REDIS_PASSWORD?.replace(/^['"]|['"]$/g, '') || undefined;

    connection = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      username: 'default', // Required for Redis Cloud ACL
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy: () => null,
      enableOfflineQueue: false,
    });
  }

  connection.on('error', () => {});
  connection.connect().catch(() => { connection = null; });
}

export interface WebhookJobData {
  workflowId: string;
  executionId: string;
  triggerType: 'webhook';
  triggerData: any; // Webhook payload
  userId: string;
  priority: 'normal' | 'high';
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class WebhookQueueService {
  private queue: Queue<WebhookJobData> | null = null;
  private worker: Worker<WebhookJobData> | null = null;
  private queueEvents: QueueEvents | null = null;
  private enabled: boolean = false;

  constructor() {
    if (!connection) {
      console.log('[WEBHOOK_QUEUE] Redis not configured - webhook queue disabled');
      return;
    }

    try {
      // Initialize queue
      this.queue = new Queue<WebhookJobData>('webhook-executions', {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            age: 24 * 60 * 60,
            count: 1000,
          },
          removeOnFail: {
            age: 7 * 24 * 60 * 60,
          },
        },
      });

      // Initialize worker
      this.worker = new Worker<WebhookJobData>(
        'webhook-executions',
        async (job: Job<WebhookJobData>) => {
          return await this.processWebhookJob(job);
        },
        {
          connection,
          concurrency: 5,
          limiter: {
            max: 10,
            duration: 1000,
          },
        }
      );

      // Initialize queue events
      this.queueEvents = new QueueEvents('webhook-executions', { connection });

      this.setupEventListeners();
      this.enabled = true;
      console.log('[WEBHOOK_QUEUE] Webhook queue service initialized');
    } catch {
      console.log('[WEBHOOK_QUEUE] Failed to initialize - running without queue');
    }
  }

  /**
   * Enqueue a webhook workflow execution
   */
  async enqueueWebhookExecution(
    workflowId: string,
    userId: string,
    payload: any,
    options?: {
      priority?: 'normal' | 'high';
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<{ executionId: string; jobId: string }> {
    const executionId = this.generateExecutionId();

    // If queue not available, execute synchronously
    if (!this.queue || !this.enabled) {
      console.log(`[WEBHOOK_QUEUE] Queue unavailable, executing synchronously: ${executionId}`);
      // Execute directly without queue
      return { executionId, jobId: executionId };
    }

    const jobData: WebhookJobData = {
      workflowId,
      executionId,
      triggerType: 'webhook',
      triggerData: payload,
      userId,
      priority: options?.priority || 'normal',
      timestamp: new Date(),
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    };

    // Add job to queue
    const job = await this.queue.add('execute-workflow', jobData, {
      priority: options?.priority === 'high' ? 1 : 10,
      jobId: executionId,
    });

    console.log(`[WEBHOOK_QUEUE] Enqueued workflow execution: ${executionId}`);

    return {
      executionId,
      jobId: job.id || executionId,
    };
  }

  /**
   * Process webhook job (executed by worker)
   */
  private async processWebhookJob(job: Job<WebhookJobData>): Promise<any> {
    const { workflowId, executionId, triggerData, userId } = job.data;
    const startTime = Date.now();

    console.log(`[WEBHOOK_QUEUE] Processing workflow execution: ${executionId}`);

    try {
      // Fetch workflow from database
      const db = getDb();
      const [workflow] = await db
        .select()
        .from(workflows)
        .where(eq(workflows.id, workflowId))
        .limit(1);

      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      // Execute workflow using WorkflowExecutionEngine
      const result = await workflowExecutionEngine.executeWorkflow(
        workflowId,
        workflow.nodes || [],
        workflow.edges || [],
        userId,
        triggerData, // Pass webhook payload as trigger input
        false // isTest = false (real execution)
      );

      const durationMs = Date.now() - startTime;

      console.log(`[WEBHOOK_QUEUE] ✅ Workflow execution completed: ${executionId} (${durationMs}ms)`);

      // Log successful webhook execution
      await webhookService.logWebhookRequest({
        workflowId,
        executionId,
        ipAddress: job.data.ipAddress,
        userAgent: job.data.userAgent,
        payload: triggerData,
        headers: {},
        payloadSize: JSON.stringify(triggerData).length,
        status: 'success',
        responseTimeMs: durationMs,
      });

      return {
        success: true,
        executionId,
        result,
        durationMs,
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      console.error(`[WEBHOOK_QUEUE] ❌ Workflow execution failed: ${executionId}`, error);

      // Log failed webhook execution
      await webhookService.logWebhookRequest({
        workflowId,
        executionId,
        ipAddress: job.data.ipAddress,
        userAgent: job.data.userAgent,
        payload: triggerData,
        headers: {},
        payloadSize: JSON.stringify(triggerData).length,
        status: 'failed',
        errorMessage: error.message,
        responseTimeMs: durationMs,
      });

      throw error; // Re-throw for retry logic
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(executionId: string) {
    const job = await this.queue.getJob(executionId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress;

    return {
      executionId,
      jobId: job.id,
      state, // 'waiting', 'active', 'completed', 'failed', 'delayed'
      progress,
      attemptsMade: job.attemptsMade,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed,
    };
  }

  /**
   * Retry failed job
   */
  async retryJob(executionId: string) {
    const job = await this.queue.getJob(executionId);

    if (!job) {
      throw new Error('Job not found');
    }

    await job.retry();

    console.log(`[WEBHOOK_QUEUE] Job ${executionId} marked for retry`);
  }

  /**
   * Cancel job
   */
  async cancelJob(executionId: string) {
    const job = await this.queue.getJob(executionId);

    if (!job) {
      throw new Error('Job not found');
    }

    await job.remove();

    console.log(`[WEBHOOK_QUEUE] Job ${executionId} cancelled`);
  }

  /**
   * Clean old jobs
   */
  async cleanOldJobs(olderThanMs: number = 7 * 24 * 60 * 60 * 1000) {
    // Clean completed jobs older than 7 days
    await this.queue.clean(olderThanMs, 100, 'completed');
    // Clean failed jobs older than 7 days
    await this.queue.clean(olderThanMs, 100, 'failed');

    console.log('[WEBHOOK_QUEUE] Old jobs cleaned');
  }

  /**
   * Set up event listeners for monitoring
   */
  private setupEventListeners() {
    // Job completed
    this.worker.on('completed', (job: Job<WebhookJobData>) => {
      console.log(`[WEBHOOK_QUEUE] ✅ Job completed: ${job.id}`);
    });

    // Job failed
    this.worker.on('failed', (job: Job<WebhookJobData> | undefined, error: Error) => {
      console.error(`[WEBHOOK_QUEUE] ❌ Job failed: ${job?.id}`, error.message);
    });

    // Job active
    this.worker.on('active', (job: Job<WebhookJobData>) => {
      console.log(`[WEBHOOK_QUEUE] 🔄 Job active: ${job.id}`);
    });

    // Worker error
    this.worker.on('error', (error: Error) => {
      console.error('[WEBHOOK_QUEUE] Worker error:', error);
    });

    // Queue events
    this.queueEvents.on('waiting', ({ jobId }) => {
      console.log(`[WEBHOOK_QUEUE] Job waiting: ${jobId}`);
    });

    this.queueEvents.on('stalled', ({ jobId }) => {
      console.warn(`[WEBHOOK_QUEUE] ⚠️ Job stalled: ${jobId}`);
    });
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Close connections (for graceful shutdown)
   */
  async close() {
    await this.worker.close();
    await this.queue.close();
    await this.queueEvents.close();
    await connection.quit();

    console.log('[WEBHOOK_QUEUE] Connections closed');
  }
}

// Singleton instance
export const webhookQueueService = new WebhookQueueService();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[WEBHOOK_QUEUE] SIGTERM received, closing gracefully...');
  await webhookQueueService.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[WEBHOOK_QUEUE] SIGINT received, closing gracefully...');
  await webhookQueueService.close();
  process.exit(0);
});
