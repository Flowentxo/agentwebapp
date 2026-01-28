/**
 * Pipeline Queue Infrastructure
 *
 * BullMQ-based queue for async pipeline execution with Redis
 * Part of Phase 1: Async Execution Engine
 */

import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { validateQueueName } from '@/workers/queues';

// =============================================================================
// REDIS CONNECTION
// =============================================================================

const redisHost = (process.env.REDIS_HOST || 'localhost').replace(/^['"]|['"]$/g, '');
const redisPort = parseInt((process.env.REDIS_PORT || '6379').replace(/^['"]|['"]$/g, ''));
const redisPassword = process.env.REDIS_PASSWORD?.replace(/^['"]|['"]$/g, '') || undefined;

export const pipelineRedisConnection = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  reconnectOnError: () => true,
  enableOfflineQueue: false,
  lazyConnect: true,
});

// Error handling for Redis connection
pipelineRedisConnection.on('error', (err) => {
  console.error('[PIPELINE_QUEUE] Redis connection error:', err.message);
});

pipelineRedisConnection.on('connect', () => {
  console.log('[PIPELINE_QUEUE] Redis connected');
});

// =============================================================================
// QUEUE CONFIGURATION
// =============================================================================

const PIPELINE_QUEUE_NAME = 'pipeline-execution';
validateQueueName(PIPELINE_QUEUE_NAME);

export const pipelineQueue = new Queue(PIPELINE_QUEUE_NAME, {
  connection: pipelineRedisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600 * 24, // Keep completed jobs for 24 hours
      count: 1000,    // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 3600 * 24 * 7, // Keep failed jobs for 7 days
    },
  },
});

// Queue events for monitoring
export const pipelineQueueEvents = new QueueEvents(PIPELINE_QUEUE_NAME, {
  connection: pipelineRedisConnection,
});

// =============================================================================
// JOB TYPES
// =============================================================================

export const PIPELINE_JOB_TYPES = {
  EXECUTE: 'execute-pipeline',
  RESUME: 'resume-pipeline',
  SCHEDULED: 'scheduled-pipeline',
  WEBHOOK_TRIGGERED: 'webhook-triggered',
} as const;

// Validate all job type names
Object.values(PIPELINE_JOB_TYPES).forEach(validateQueueName);

export type PipelineJobType = typeof PIPELINE_JOB_TYPES[keyof typeof PIPELINE_JOB_TYPES];

// =============================================================================
// JOB DATA INTERFACES
// =============================================================================

export interface PipelineJobData {
  pipelineId: string;
  executionId: string;
  userId: string;
  triggerType: 'manual' | 'webhook' | 'scheduled' | 'api';
  inputs?: Record<string, unknown>;
  webhookPayload?: unknown;
  resumeFromNodeId?: string; // For human-approval resume
  /** Custom variables to inject into state.variables */
  variables?: Record<string, unknown>;
  /** Skip budget check (for testing) */
  skipBudgetCheck?: boolean;
}

export interface PipelineJobProgress {
  currentNodeId: string;
  currentNodeIndex: number;
  totalNodes: number;
  status: 'running' | 'waiting_approval' | 'completed' | 'failed';
  logs: PipelineExecutionLog[];
}

export interface PipelineExecutionLog {
  nodeId: string;
  nodeName: string;
  timestamp: string;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  output?: unknown;
  error?: string;
  durationMs?: number;
}

// =============================================================================
// QUEUE OPERATIONS
// =============================================================================

/**
 * Enqueue a pipeline for execution
 */
export async function enqueuePipelineExecution(
  data: PipelineJobData,
  options?: {
    priority?: number;
    delay?: number;
  }
): Promise<string> {
  const job = await pipelineQueue.add(
    PIPELINE_JOB_TYPES.EXECUTE,
    data,
    {
      priority: options?.priority ?? 0,
      delay: options?.delay ?? 0,
      jobId: `pipeline-${data.executionId}`, // Unique job ID
    }
  );

  console.log(`[PIPELINE_QUEUE] Enqueued job ${job.id} for pipeline ${data.pipelineId}`);
  return job.id!;
}

/**
 * Resume a paused pipeline (after human approval)
 */
export async function resumePipelineExecution(
  executionId: string,
  approvedBy: string,
  fromNodeId: string,
  options?: {
    approved?: boolean;
    comment?: string;
  }
): Promise<string> {
  const job = await pipelineQueue.add(
    PIPELINE_JOB_TYPES.RESUME,
    {
      executionId,
      resumeFromNodeId: fromNodeId,
      approvedBy,
      approved: options?.approved ?? true,
      comment: options?.comment,
    } as unknown as PipelineJobData,
    {
      priority: 1, // Higher priority for resumed jobs
      jobId: `resume-${executionId}-${Date.now()}`,
    }
  );

  console.log(`[PIPELINE_QUEUE] Resume job ${job.id} for execution ${executionId}`);
  return job.id!;
}

/**
 * Schedule a repeating pipeline (cron)
 */
export async function schedulePipeline(
  pipelineId: string,
  userId: string,
  cronExpression: string,
  inputs?: Record<string, unknown>
): Promise<string> {
  const job = await pipelineQueue.add(
    PIPELINE_JOB_TYPES.SCHEDULED,
    {
      pipelineId,
      executionId: '', // Will be generated by worker
      userId,
      triggerType: 'scheduled',
      inputs,
    },
    {
      repeat: {
        pattern: cronExpression,
      },
      jobId: `scheduled-${pipelineId}`,
    }
  );

  console.log(`[PIPELINE_QUEUE] Scheduled pipeline ${pipelineId} with cron: ${cronExpression}`);
  return job.id!;
}

/**
 * Remove a scheduled pipeline
 */
export async function unschedulePipeline(pipelineId: string): Promise<boolean> {
  const removed = await pipelineQueue.removeRepeatableByKey(`scheduled-${pipelineId}`);
  console.log(`[PIPELINE_QUEUE] Unscheduled pipeline ${pipelineId}: ${removed}`);
  return removed;
}

/**
 * Get queue statistics
 */
export async function getPipelineQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    pipelineQueue.getWaitingCount(),
    pipelineQueue.getActiveCount(),
    pipelineQueue.getCompletedCount(),
    pipelineQueue.getFailedCount(),
    pipelineQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Get job by execution ID
 */
export async function getPipelineJob(executionId: string) {
  return pipelineQueue.getJob(`pipeline-${executionId}`);
}

/**
 * Cancel a pipeline execution
 */
export async function cancelPipelineExecution(executionId: string): Promise<boolean> {
  const job = await getPipelineJob(executionId);
  if (!job) return false;

  const state = await job.getState();

  if (state === 'active') {
    // Can't cancel active jobs directly, need to signal worker
    await job.updateProgress({ cancelled: true });
    return true;
  }

  if (state === 'waiting' || state === 'delayed') {
    await job.remove();
    return true;
  }

  return false;
}

// =============================================================================
// QUEUE EVENT HANDLERS
// =============================================================================

pipelineQueueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`[PIPELINE_QUEUE] Job ${jobId} completed:`, returnvalue);
});

pipelineQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`[PIPELINE_QUEUE] Job ${jobId} failed:`, failedReason);
});

pipelineQueueEvents.on('progress', ({ jobId, data }) => {
  console.log(`[PIPELINE_QUEUE] Job ${jobId} progress:`, data);
});

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

export async function closePipelineQueue(): Promise<void> {
  console.log('[PIPELINE_QUEUE] Closing queue connections...');

  await pipelineQueueEvents.close();
  await pipelineQueue.close();
  await pipelineRedisConnection.quit();

  console.log('[PIPELINE_QUEUE] Queue connections closed');
}

// Handle process termination
process.on('SIGTERM', closePipelineQueue);
process.on('SIGINT', closePipelineQueue);
