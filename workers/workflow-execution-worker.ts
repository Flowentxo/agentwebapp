/**
 * WORKFLOW EXECUTION WORKER
 *
 * BullMQ worker that processes workflow execution jobs from the queue.
 * Handles: trigger_workflow, resume_workflow, scheduled_workflow jobs
 */

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { getDb } from '@/lib/db/connection';
import { workflows, workflowExecutions, workflowNodeLogs } from '@/lib/db/schema-workflows';
import { eq } from 'drizzle-orm';
import { workflowExecutionEngine } from '@/server/services/WorkflowExecutionEngine';
import { randomUUID } from 'crypto';
import { createLogger } from '@/lib/logger';

// Create namespaced logger
const logger = createLogger('workflow-worker');

// =============================================================================
// REDIS CONNECTION
// =============================================================================

const redisHost = (process.env.REDIS_HOST || 'localhost').replace(/^['"]|['"]$/g, '');
const redisPort = parseInt((process.env.REDIS_PORT || '6379').replace(/^['"]|['"]$/g, ''));
const redisPassword = process.env.REDIS_PASSWORD?.replace(/^['"]|['"]$/g, '') || undefined;

const workerRedisConnection = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  reconnectOnError: () => true,
  lazyConnect: true,
});

workerRedisConnection.on('error', (err) => {
  logger.error('Redis connection error', { error: err.message });
});

workerRedisConnection.on('connect', () => {
  logger.info('Redis connected for workflow worker');
});

// =============================================================================
// JOB TYPES
// =============================================================================

export const WORKFLOW_JOB_TYPES = {
  TRIGGER: 'trigger_workflow',
  RESUME: 'resume_workflow',
  SCHEDULED: 'scheduled_workflow',
  WEBHOOK: 'webhook_triggered_workflow',
} as const;

export type WorkflowJobType = typeof WORKFLOW_JOB_TYPES[keyof typeof WORKFLOW_JOB_TYPES];

// =============================================================================
// JOB DATA INTERFACES
// =============================================================================

export interface WorkflowJobData {
  workflowId: string;
  userId: string;
  triggerType: 'manual' | 'webhook' | 'scheduled' | 'api';
  triggerData?: Record<string, unknown>;
  executionId?: string; // Pre-generated execution ID (optional)
  variables?: Record<string, unknown>;
  skipBudgetCheck?: boolean;
  isTest?: boolean;
}

export interface WorkflowJobResult {
  executionId: string;
  status: 'success' | 'error';
  output?: any;
  error?: string;
  durationMs: number;
  nodesExecuted: number;
  totalCost?: number;
}

// =============================================================================
// NODE LOG SERVICE
// =============================================================================

class NodeLogService {
  private db = getDb();

  /**
   * Create a log entry when a node starts execution
   */
  async logNodeStart(params: {
    executionId: string;
    workflowId: string;
    nodeId: string;
    nodeType: string;
    nodeName?: string;
    input?: any;
  }): Promise<string> {
    try {
      const [log] = await this.db
        .insert(workflowNodeLogs)
        .values({
          executionId: params.executionId,
          workflowId: params.workflowId,
          nodeId: params.nodeId,
          nodeType: params.nodeType,
          nodeName: params.nodeName,
          status: 'started',
          input: params.input,
          startedAt: new Date(),
        })
        .returning({ id: workflowNodeLogs.id });

      return log.id;
    } catch (error: any) {
      logger.error('Failed to log node start', { error: error.message, params });
      throw error;
    }
  }

  /**
   * Update log entry when a node completes successfully
   */
  async logNodeSuccess(params: {
    logId: string;
    output?: any;
    durationMs: number;
    tokensUsed?: number;
    costUsd?: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.db
        .update(workflowNodeLogs)
        .set({
          status: 'success',
          output: params.output,
          completedAt: new Date(),
          durationMs: params.durationMs,
          tokensUsed: params.tokensUsed,
          costUsd: params.costUsd?.toString(),
          metadata: params.metadata,
        })
        .where(eq(workflowNodeLogs.id, params.logId));
    } catch (error: any) {
      logger.error('Failed to log node success', { error: error.message, logId: params.logId });
    }
  }

  /**
   * Update log entry when a node fails
   */
  async logNodeError(params: {
    logId: string;
    error: string;
    durationMs: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.db
        .update(workflowNodeLogs)
        .set({
          status: 'error',
          error: params.error,
          completedAt: new Date(),
          durationMs: params.durationMs,
          metadata: params.metadata,
        })
        .where(eq(workflowNodeLogs.id, params.logId));
    } catch (error: any) {
      logger.error('Failed to log node error', { error: error.message, logId: params.logId });
    }
  }

  /**
   * Get all logs for an execution
   */
  async getExecutionLogs(executionId: string) {
    return this.db
      .select()
      .from(workflowNodeLogs)
      .where(eq(workflowNodeLogs.executionId, executionId))
      .orderBy(workflowNodeLogs.startedAt);
  }
}

export const nodeLogService = new NodeLogService();

// =============================================================================
// WORKER PROCESSOR
// =============================================================================

async function processWorkflowJob(job: Job<WorkflowJobData>): Promise<WorkflowJobResult> {
  const startTime = Date.now();
  const { workflowId, userId, triggerData, variables, skipBudgetCheck, isTest } = job.data;
  const executionId = job.data.executionId || randomUUID();

  logger.info('Processing workflow job', {
    jobId: job.id,
    workflowId,
    userId,
    triggerType: job.data.triggerType,
    executionId,
  });

  try {
    // 1. Load workflow from database
    const db = getDb();
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId))
      .limit(1);

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (workflow.status === 'archived') {
      throw new Error(`Workflow is archived and cannot be executed: ${workflowId}`);
    }

    const nodes = workflow.nodes as any[];
    const edges = workflow.edges as any[];

    if (!nodes || nodes.length === 0) {
      throw new Error('Workflow has no nodes to execute');
    }

    logger.info('Loaded workflow', {
      workflowId,
      name: workflow.name,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    });

    // 2. Update job progress
    await job.updateProgress({
      status: 'running',
      currentNodeId: null,
      currentNodeIndex: 0,
      totalNodes: nodes.length,
    });

    // 3. Execute workflow using the existing engine
    const mergedInput = {
      ...triggerData,
      ...variables,
      _trigger: {
        type: job.data.triggerType,
        timestamp: new Date().toISOString(),
        jobId: job.id,
      },
    };

    const executionContext = await workflowExecutionEngine.executeWorkflow(
      workflowId,
      nodes,
      edges,
      userId,
      mergedInput,
      isTest ?? false,
      { skipBudgetCheck }
    );

    // 4. Calculate result
    const durationMs = Date.now() - startTime;
    const nodesExecuted = executionContext.logs.filter(
      (log) => log.level === 'success'
    ).length;

    // 5. Update job progress to completed
    await job.updateProgress({
      status: executionContext.status === 'success' ? 'completed' : 'failed',
      currentNodeId: null,
      currentNodeIndex: nodesExecuted,
      totalNodes: nodes.length,
    });

    logger.info('Workflow execution completed', {
      executionId: executionContext.executionId,
      status: executionContext.status,
      durationMs,
      nodesExecuted,
      totalCost: executionContext.totalCostIncurred,
    });

    return {
      executionId: executionContext.executionId,
      status: executionContext.status === 'success' ? 'success' : 'error',
      output: Object.fromEntries(executionContext.nodeOutputs),
      error: executionContext.error,
      durationMs,
      nodesExecuted,
      totalCost: executionContext.totalCostIncurred,
    };

  } catch (error: any) {
    const durationMs = Date.now() - startTime;

    logger.error('Workflow execution failed', {
      executionId,
      workflowId,
      error: error.message,
      durationMs,
    });

    // Update job progress to failed
    await job.updateProgress({
      status: 'failed',
      error: error.message,
    });

    return {
      executionId,
      status: 'error',
      error: error.message,
      durationMs,
      nodesExecuted: 0,
    };
  }
}

// =============================================================================
// WORKER INSTANCE
// =============================================================================

const QUEUE_NAME = 'workflow-execution';

export const workflowExecutionWorker = new Worker<WorkflowJobData, WorkflowJobResult>(
  QUEUE_NAME,
  processWorkflowJob,
  {
    connection: workerRedisConnection,
    concurrency: 5, // Process up to 5 workflows concurrently
    limiter: {
      max: 100, // Max 100 jobs per minute
      duration: 60000,
    },
    settings: {
      backoffStrategy: (attemptsMade: number) => {
        // Exponential backoff: 2s, 4s, 8s, 16s, 32s
        return Math.min(Math.pow(2, attemptsMade) * 1000, 32000);
      },
    },
  }
);

// =============================================================================
// WORKER EVENT HANDLERS
// =============================================================================

workflowExecutionWorker.on('completed', (job, result) => {
  logger.info('Job completed', {
    jobId: job.id,
    executionId: result.executionId,
    status: result.status,
    durationMs: result.durationMs,
  });
});

workflowExecutionWorker.on('failed', (job, error) => {
  logger.error('Job failed', {
    jobId: job?.id,
    error: error.message,
    attemptsMade: job?.attemptsMade,
  });
});

workflowExecutionWorker.on('progress', (job, progress) => {
  logger.debug('Job progress', {
    jobId: job.id,
    progress,
  });
});

workflowExecutionWorker.on('error', (error) => {
  logger.error('Worker error', { error: error.message });
});

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

export async function closeWorkflowWorker(): Promise<void> {
  logger.info('Closing workflow execution worker...');

  await workflowExecutionWorker.close();
  await workerRedisConnection.quit();

  logger.info('Workflow execution worker closed');
}

process.on('SIGTERM', closeWorkflowWorker);
process.on('SIGINT', closeWorkflowWorker);

// =============================================================================
// QUEUE HELPER FUNCTIONS
// =============================================================================

import { Queue } from 'bullmq';

// Create queue instance for enqueuing jobs
export const workflowExecutionQueue = new Queue<WorkflowJobData>(QUEUE_NAME, {
  connection: workerRedisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600 * 24, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 3600 * 24 * 7, // Keep failed jobs for 7 days
    },
  },
});

/**
 * Enqueue a workflow for execution
 */
export async function enqueueWorkflowExecution(
  data: WorkflowJobData,
  options?: {
    priority?: number;
    delay?: number;
  }
): Promise<string> {
  const executionId = data.executionId || randomUUID();
  const jobData = { ...data, executionId };

  const job = await workflowExecutionQueue.add(
    WORKFLOW_JOB_TYPES.TRIGGER,
    jobData,
    {
      priority: options?.priority ?? 0,
      delay: options?.delay ?? 0,
      jobId: `workflow-${executionId}`,
    }
  );

  logger.info('Enqueued workflow execution', {
    jobId: job.id,
    workflowId: data.workflowId,
    executionId,
  });

  return executionId;
}

/**
 * Get queue statistics
 */
export async function getWorkflowQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    workflowExecutionQueue.getWaitingCount(),
    workflowExecutionQueue.getActiveCount(),
    workflowExecutionQueue.getCompletedCount(),
    workflowExecutionQueue.getFailedCount(),
    workflowExecutionQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Get job by execution ID
 */
export async function getWorkflowJob(executionId: string) {
  return workflowExecutionQueue.getJob(`workflow-${executionId}`);
}

/**
 * Cancel a workflow execution
 */
export async function cancelWorkflowExecution(executionId: string): Promise<boolean> {
  const job = await getWorkflowJob(executionId);
  if (!job) return false;

  const state = await job.getState();

  if (state === 'active') {
    // Signal worker to cancel
    await job.updateProgress({ cancelled: true });
    return true;
  }

  if (state === 'waiting' || state === 'delayed') {
    await job.remove();
    return true;
  }

  return false;
}
