/**
 * Pipeline Worker V2
 *
 * BullMQ worker for processing pipeline execution jobs
 * Uses WorkflowExecutionEngineV2 with Shared State pattern
 * Part of Phase 1: Async Execution Engine
 */

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { Node, Edge } from 'reactflow';
import { createLogger } from '@/lib/logger';

// Import V2 Engine
import { workflowExecutionEngineV2 } from '../services/WorkflowExecutionEngineV2';

// Import Socket emitters
import { emitWorkflowUpdate } from '@/server/socket';

// Import error types
import {
  isWorkflowError,
  wrapError,
} from '@/types/workflow-errors';

// Import queue types
import {
  PIPELINE_JOB_TYPES,
  PipelineJobData,
  PipelineJobProgress,
} from '../lib/pipeline-queue';

// Import execution types
import { ExecutionContext, ExecutionOptions } from '@/types/execution';

const logger = createLogger('pipeline-worker');

// =============================================================================
// REDIS CONNECTION
// =============================================================================

const redisHost = (process.env.REDIS_HOST || 'localhost').replace(/^['"]|['"]$/g, '');
const redisPort = parseInt((process.env.REDIS_PORT || '6379').replace(/^['"]|['"]$/g, ''));
const redisPassword = process.env.REDIS_PASSWORD?.replace(/^['"]|['"]$/g, '') || undefined;

const workerConnection = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  reconnectOnError: () => true,
});

workerConnection.on('error', (err) => {
  logger.error('Redis connection error', { error: err.message });
});

workerConnection.on('connect', () => {
  logger.info('Redis connected');
});

// =============================================================================
// WORKFLOW DEFINITION INTERFACE
// =============================================================================

interface WorkflowDefinition {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  user_id: string;
}

// =============================================================================
// JOB RESULT INTERFACE
// =============================================================================

interface PipelineJobResult {
  executionId: string;
  success: boolean;
  status: 'completed' | 'error' | 'cancelled';
  output?: Record<string, any>;
  logs: any[];
  error?: string;
  errorCode?: string;
  totalCost?: number;
  durationMs?: number;
}

// =============================================================================
// WORKER PROCESSOR
// =============================================================================

async function processJob(job: Job<PipelineJobData>): Promise<PipelineJobResult> {
  const { name, data } = job;

  logger.info('Processing job', { jobId: job.id, jobName: name, pipelineId: data.pipelineId });

  try {
    switch (name) {
      case PIPELINE_JOB_TYPES.EXECUTE:
      case PIPELINE_JOB_TYPES.WEBHOOK_TRIGGERED:
      case PIPELINE_JOB_TYPES.SCHEDULED:
        return await executeNewPipeline(job);

      case PIPELINE_JOB_TYPES.RESUME:
        return await resumePipeline(job);

      default:
        throw new Error(`Unknown job type: ${name}`);
    }
  } catch (error: unknown) {
    // Handle error with proper typing
    const workflowError = isWorkflowError(error)
      ? error
      : wrapError(error, {
          pipelineId: data.pipelineId,
          executionId: data.executionId,
          userId: data.userId,
        });

    logger.error('Job processing failed', {
      jobId: job.id,
      error: workflowError.message,
      errorCode: workflowError.code,
      recoverable: workflowError.recoverable,
      retryable: workflowError.retryable,
    });

    // If recoverable and retryable, throw to let BullMQ retry
    if (workflowError.recoverable && workflowError.retryable) {
      throw workflowError;
    }

    // Non-recoverable: Return failed result (don't throw - marks job as completed with failure)
    return {
      executionId: data.executionId,
      success: false,
      status: 'error',
      logs: [],
      error: workflowError.message,
      errorCode: workflowError.code,
    };
  }
}

// =============================================================================
// EXECUTE NEW PIPELINE (V2)
// =============================================================================

async function executeNewPipeline(job: Job<PipelineJobData>): Promise<PipelineJobResult> {
  const { pipelineId, userId, triggerType, inputs, webhookPayload, variables, skipBudgetCheck } = job.data;
  let { executionId } = job.data;

  const db = getDb();

  // For scheduled jobs, create a new execution ID
  if (!executionId || job.name === PIPELINE_JOB_TYPES.SCHEDULED) {
    executionId = uuidv4();

    // Create execution record
    await db.execute(sql`
      INSERT INTO workflow_executions (
        id,
        workflow_id,
        user_id,
        status,
        input,
        logs,
        started_at,
        is_test
      )
      VALUES (
        ${executionId},
        ${pipelineId},
        ${userId},
        'pending',
        ${JSON.stringify(inputs || webhookPayload || {})}::jsonb,
        '[]'::jsonb,
        NOW(),
        false
      )
    `);

    logger.info('Created execution record', { executionId, pipelineId });
  }

  // Fetch workflow definition
  const [workflow] = await db.execute(sql`
    SELECT id, name, nodes, edges, user_id
    FROM workflows
    WHERE id = ${pipelineId}
  `) as WorkflowDefinition[];

  if (!workflow) {
    throw new Error(`Pipeline ${pipelineId} not found`);
  }

  // Verify ownership
  if (workflow.user_id !== userId) {
    throw new Error('Unauthorized: Pipeline does not belong to user');
  }

  // Parse nodes and edges (they come as JSON from DB)
  const nodes: Node[] = typeof workflow.nodes === 'string'
    ? JSON.parse(workflow.nodes)
    : workflow.nodes;
  const edges: Edge[] = typeof workflow.edges === 'string'
    ? JSON.parse(workflow.edges)
    : workflow.edges;

  // Prepare trigger payload
  const triggerPayload = {
    ...inputs,
    ...webhookPayload,
    _trigger: {
      type: triggerType,
      timestamp: Date.now(),
      jobId: job.id,
    },
  };

  // Execution options - use values from job data or defaults
  const options: ExecutionOptions = {
    skipBudgetCheck: skipBudgetCheck ?? false,
    variables: { ...(inputs as Record<string, any>), ...(variables as Record<string, any>) },
  };

  // Update job progress: Starting
  await job.updateProgress({
    currentNodeId: null,
    currentNodeIndex: 0,
    totalNodes: nodes.length,
    status: 'running',
    logs: [],
  } as PipelineJobProgress);

  // Emit start event
  safeEmitWorkflowUpdate({
    workflowId: pipelineId,
    executionId,
    status: 'started',
    progress: 0,
    timestamp: new Date().toISOString(),
  });

  // Execute using V2 engine
  const context = await workflowExecutionEngineV2.executeWorkflow(
    pipelineId,
    nodes,
    edges,
    userId,
    triggerPayload,
    options
  );

  // Update workflow execution count
  await db.execute(sql`
    UPDATE workflows
    SET
      execution_count = COALESCE(execution_count, 0) + 1,
      last_executed_at = NOW()
    WHERE id = ${pipelineId}
  `);

  // Log final state summary
  logExecutionSummary(context);

  // Convert state.nodes to output format
  const output: Record<string, any> = {};
  for (const [nodeId, nodeState] of Object.entries(context.state.nodes)) {
    output[nodeId] = nodeState.output;
  }

  // Return result
  return {
    executionId,
    success: context.status === 'completed',
    status: context.status === 'completed' ? 'completed' : 'error',
    output,
    logs: context.logs,
    error: context.error,
    errorCode: context.errorCode,
    totalCost: context.budget.totalCostIncurred,
    durationMs: Date.now() - context.startTime,
  };
}

// =============================================================================
// RESUME PIPELINE (V2)
// =============================================================================

async function resumePipeline(job: Job<PipelineJobData>): Promise<PipelineJobResult> {
  const { executionId } = job.data;
  const jobData = job.data as unknown as {
    approvedBy: string;
    comment?: string;
    approved?: boolean;
  };
  const { approvedBy, comment, approved = true } = jobData;

  if (!executionId) {
    throw new Error('executionId is required for resume');
  }

  logger.info('Resuming pipeline execution', {
    executionId,
    approvedBy,
    approved,
  });

  // Use WorkflowExecutionEngineV2.resumeWorkflow for proper state restoration
  const approvalData = {
    approved,
    approvedBy,
    respondedAt: new Date().toISOString(),
    comment,
  };

  const context = await workflowExecutionEngineV2.resumeWorkflow(
    executionId,
    approvalData
  );

  // Log summary
  logExecutionSummary(context);

  // Convert state.nodes to output format
  const output: Record<string, any> = {};
  for (const [nodeId, nodeState] of Object.entries(context.state.nodes)) {
    output[nodeId] = nodeState.output;
  }

  return {
    executionId,
    success: context.status === 'completed',
    status: context.status === 'completed' ? 'completed' : 'error',
    output,
    logs: context.logs,
    error: context.error,
    errorCode: context.errorCode,
    totalCost: context.budget.totalCostIncurred,
    durationMs: Date.now() - context.startTime,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Log execution summary with Winston
 */
function logExecutionSummary(context: ExecutionContext): void {
  const durationMs = Date.now() - context.startTime;
  const completedNodes = Object.values(context.state.nodes).filter(
    n => n.meta.status === 'completed'
  ).length;
  const failedNodes = Object.values(context.state.nodes).filter(
    n => n.meta.status === 'error'
  ).length;

  logger.info('Execution summary', {
    executionId: context.executionId,
    workflowId: context.workflowId,
    status: context.status,
    durationMs,
    completedNodes,
    failedNodes,
    totalNodes: context.nodes.length,
    totalCost: context.budget.totalCostIncurred,
    variablesSet: Object.keys(context.state.variables).length,
    error: context.error,
  });
}

/**
 * Safe emit wrapper for workflow updates
 */
function safeEmitWorkflowUpdate(event: Parameters<typeof emitWorkflowUpdate>[0]): void {
  try {
    emitWorkflowUpdate(event);
  } catch (error: any) {
    logger.warn('Socket emit failed', { error: error.message });
  }
}

// =============================================================================
// WORKER INSTANCE
// =============================================================================

export const pipelineWorker = new Worker(
  'pipeline-execution',
  processJob,
  {
    connection: workerConnection,
    concurrency: parseInt(process.env.PIPELINE_WORKER_CONCURRENCY || '5'),
    lockDuration: 300000, // 5 minutes
    stalledInterval: 30000,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  }
);

// =============================================================================
// WORKER EVENT HANDLERS
// =============================================================================

pipelineWorker.on('completed', (job, result: PipelineJobResult) => {
  logger.info('Job completed', {
    jobId: job.id,
    executionId: result.executionId,
    success: result.success,
    durationMs: result.durationMs,
  });
});

pipelineWorker.on('failed', (job, err) => {
  logger.error('Job failed', {
    jobId: job?.id,
    error: err.message,
    pipelineId: job?.data?.pipelineId,
    executionId: job?.data?.executionId,
  });

  // Update execution status to failed
  if (job?.data?.executionId) {
    const db = getDb();
    db.execute(sql`
      UPDATE workflow_executions
      SET
        status = 'error',
        error = ${err.message},
        completed_at = NOW()
      WHERE id = ${job.data.executionId}
    `).catch((dbErr) => {
      logger.error('Failed to update execution status', { error: dbErr.message });
    });

    // Emit failure event
    safeEmitWorkflowUpdate({
      workflowId: job.data.pipelineId,
      executionId: job.data.executionId,
      status: 'failed',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

pipelineWorker.on('progress', (job, progress) => {
  logger.debug('Job progress', { jobId: job.id, progress });
});

pipelineWorker.on('stalled', (jobId) => {
  logger.warn('Job stalled', { jobId });
});

pipelineWorker.on('error', (err) => {
  logger.error('Worker error', { error: err.message });
});

// =============================================================================
// CANCEL EXECUTION
// =============================================================================

export function cancelExecution(executionId: string): boolean {
  return workflowExecutionEngineV2.cancelExecution(executionId);
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

export async function closePipelineWorker(): Promise<void> {
  logger.info('Shutting down worker...');

  await pipelineWorker.close();
  await workerConnection.quit();

  logger.info('Worker shut down complete');
}

// Handle process termination
process.on('SIGTERM', closePipelineWorker);
process.on('SIGINT', closePipelineWorker);

logger.info('Pipeline Worker V2 initialized and ready');
