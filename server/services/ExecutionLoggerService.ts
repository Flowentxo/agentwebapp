/**
 * EXECUTION LOGGER SERVICE
 *
 * Phase 13: Flight Recorder Service for Time-Travel Debugging
 *
 * Provides a clean API for logging workflow executions:
 * - createRun(): Start a new workflow run
 * - logStepStart(): Record when a node begins execution
 * - logStepCompletion(): Record successful node completion
 * - logStepFailure(): Record node failure with error details
 * - finalizeRun(): Mark run as complete/failed
 *
 * Features:
 * - Safe JSON serialization (handles circular refs)
 * - Automatic run numbering per workflow
 * - High-precision timing
 * - Cost aggregation
 */

import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db';
import {
  workflowRuns,
  executionSteps,
  type WorkflowRun,
  type ExecutionStep,
  type NewWorkflowRun,
  type NewExecutionStep,
  type RunStatus,
  type TriggerType,
  type StepStatus,
} from '@/lib/db/schema-flight-recorder';
import { eq, desc, sql, and, count } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const logger = createLogger('execution-logger-service');

// ============================================================================
// TYPES
// ============================================================================

export interface CreateRunParams {
  workflowId: string;
  userId: string;
  triggerType: TriggerType;
  triggerPayload?: Record<string, unknown>;
  triggerSource?: string;
  workspaceId?: string;
  isTest?: boolean;
  traceId?: string;
  versionId?: string;
  nodesTotal?: number;
  metadata?: Record<string, unknown>;
}

export interface LogStepStartParams {
  runId: string;
  workflowId: string;
  nodeId: string;
  nodeType: string;
  nodeName?: string;
  stepNumber: number;
  inputsRaw?: Record<string, unknown>;
  inputsResolved?: Record<string, unknown>;
  depth?: number;
  parentStepId?: string;
  branchPath?: string;
  metadata?: Record<string, unknown>;
}

export interface LogStepCompletionParams {
  stepId: string;
  output?: unknown;
  durationMs?: number;
  tokensPrompt?: number;
  tokensCompletion?: number;
  tokensTotal?: number;
  costUsd?: number;
  model?: string;
  conditionResult?: boolean;
  externalCallId?: string;
  metadata?: Record<string, unknown>;
}

export interface LogStepFailureParams {
  stepId: string;
  errorCode?: string;
  errorMessage: string;
  errorStack?: string;
  errorDetails?: {
    type: string;
    recoverable: boolean;
    retryable: boolean;
    context?: Record<string, unknown>;
  };
  durationMs?: number;
  retryAttempt?: number;
  maxRetries?: number;
  previousErrors?: string[];
}

export interface FinalizeRunParams {
  runId: string;
  status: RunStatus;
  finalOutput?: unknown;
  errorCode?: string;
  errorMessage?: string;
  errorStack?: string;
}

export interface RunWithSteps {
  run: WorkflowRun;
  steps: ExecutionStep[];
}

export interface PaginatedRuns {
  runs: WorkflowRun[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// SAFE JSON SERIALIZATION
// ============================================================================

/**
 * Safely serialize any value to JSON, handling circular references
 * and non-serializable types (functions, symbols, etc.)
 */
function safeSerialize(value: unknown, maxDepth = 10): unknown {
  const seen = new WeakSet();

  function serialize(obj: unknown, depth: number): unknown {
    // Handle primitives
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'boolean' || typeof obj === 'number' || typeof obj === 'string') {
      return obj;
    }

    // Handle non-serializable types
    if (typeof obj === 'function') return '[Function]';
    if (typeof obj === 'symbol') return obj.toString();
    if (typeof obj === 'bigint') return obj.toString();

    // Handle Date
    if (obj instanceof Date) return obj.toISOString();

    // Handle Error
    if (obj instanceof Error) {
      return {
        name: obj.name,
        message: obj.message,
        stack: obj.stack,
      };
    }

    // Handle Buffer
    if (Buffer.isBuffer(obj)) {
      return `[Buffer: ${obj.length} bytes]`;
    }

    // Check depth limit
    if (depth >= maxDepth) {
      return '[Max Depth Reached]';
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      // Check for circular reference
      if (seen.has(obj)) return '[Circular]';
      seen.add(obj);
      return obj.map((item) => serialize(item, depth + 1));
    }

    // Handle objects
    if (typeof obj === 'object') {
      // Check for circular reference
      if (seen.has(obj)) return '[Circular]';
      seen.add(obj);

      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(obj)) {
        try {
          result[key] = serialize(val, depth + 1);
        } catch {
          result[key] = '[Serialization Error]';
        }
      }
      return result;
    }

    return String(obj);
  }

  try {
    return serialize(value, 0);
  } catch (error) {
    logger.warn('Failed to serialize value', { error });
    return '[Serialization Failed]';
  }
}

// ============================================================================
// EXECUTION LOGGER SERVICE
// ============================================================================

export class ExecutionLoggerService {
  private static instance: ExecutionLoggerService | null = null;
  private db = getDb();
  private stepCounters: Map<string, number> = new Map(); // runId -> stepNumber

  private constructor() {
    logger.info('ExecutionLoggerService initialized');
  }

  static getInstance(): ExecutionLoggerService {
    if (!ExecutionLoggerService.instance) {
      ExecutionLoggerService.instance = new ExecutionLoggerService();
    }
    return ExecutionLoggerService.instance;
  }

  // ==========================================================================
  // CREATE RUN
  // ==========================================================================

  /**
   * Create a new workflow run record
   *
   * @returns The run ID (UUID)
   */
  async createRun(params: CreateRunParams): Promise<string> {
    const runId = randomUUID();
    const startTime = new Date();

    try {
      // Get the next run number for this workflow
      const runNumber = await this.getNextRunNumber(params.workflowId);

      // Generate trace ID if not provided
      const traceId = params.traceId || `trace-${Date.now()}-${randomUUID().slice(0, 8)}`;

      const runData: NewWorkflowRun = {
        id: runId,
        workflowId: params.workflowId,
        runNumber,
        traceId,
        triggerType: params.triggerType,
        triggerSource: params.triggerSource,
        triggerPayload: safeSerialize(params.triggerPayload) as Record<string, unknown>,
        status: 'running',
        startedAt: startTime,
        userId: params.userId,
        workspaceId: params.workspaceId,
        isTest: params.isTest ?? false,
        versionId: params.versionId,
        nodesTotal: params.nodesTotal ?? 0,
        metadata: safeSerialize(params.metadata) as Record<string, unknown>,
      };

      await this.db.insert(workflowRuns).values(runData);

      // Initialize step counter for this run
      this.stepCounters.set(runId, 0);

      logger.info('Workflow run created', {
        runId,
        workflowId: params.workflowId,
        runNumber,
        triggerType: params.triggerType,
        traceId,
      });

      return runId;
    } catch (error: any) {
      logger.error('Failed to create workflow run', {
        error: error.message,
        workflowId: params.workflowId,
      });
      throw error;
    }
  }

  // ==========================================================================
  // LOG STEP START
  // ==========================================================================

  /**
   * Log the start of a node execution
   *
   * @returns The step ID (UUID)
   */
  async logStepStart(params: LogStepStartParams): Promise<string> {
    const stepId = randomUUID();
    const startTime = new Date();

    try {
      // Get and increment step number
      const stepNumber = params.stepNumber ?? this.getNextStepNumber(params.runId);

      const stepData: NewExecutionStep = {
        id: stepId,
        runId: params.runId,
        workflowId: params.workflowId,
        nodeId: params.nodeId,
        nodeType: params.nodeType,
        nodeName: params.nodeName,
        stepNumber,
        depth: params.depth ?? 0,
        parentStepId: params.parentStepId,
        status: 'running',
        inputsRaw: safeSerialize(params.inputsRaw) as Record<string, unknown>,
        inputsResolved: safeSerialize(params.inputsResolved) as Record<string, unknown>,
        branchPath: params.branchPath,
        startedAt: startTime,
        metadata: safeSerialize(params.metadata) as Record<string, unknown>,
      };

      await this.db.insert(executionSteps).values(stepData);

      logger.debug('Step execution started', {
        stepId,
        runId: params.runId,
        nodeId: params.nodeId,
        nodeType: params.nodeType,
        stepNumber,
      });

      return stepId;
    } catch (error: any) {
      logger.error('Failed to log step start', {
        error: error.message,
        runId: params.runId,
        nodeId: params.nodeId,
      });
      throw error;
    }
  }

  // ==========================================================================
  // LOG STEP COMPLETION
  // ==========================================================================

  /**
   * Log successful completion of a node execution
   */
  async logStepCompletion(params: LogStepCompletionParams): Promise<void> {
    const completedAt = new Date();

    try {
      // Get the step to calculate duration if not provided
      let durationMs = params.durationMs;
      if (durationMs === undefined) {
        const [step] = await this.db
          .select({ startedAt: executionSteps.startedAt })
          .from(executionSteps)
          .where(eq(executionSteps.id, params.stepId))
          .limit(1);

        if (step?.startedAt) {
          durationMs = completedAt.getTime() - step.startedAt.getTime();
        }
      }

      await this.db
        .update(executionSteps)
        .set({
          status: 'success',
          output: safeSerialize(params.output),
          completedAt,
          durationMs,
          tokensPrompt: params.tokensPrompt,
          tokensCompletion: params.tokensCompletion,
          tokensTotal: params.tokensTotal,
          costUsd: params.costUsd?.toString(),
          model: params.model,
          conditionResult: params.conditionResult,
          externalCallId: params.externalCallId,
          metadata: safeSerialize(params.metadata) as Record<string, unknown>,
        })
        .where(eq(executionSteps.id, params.stepId));

      // Update run metrics
      const [step] = await this.db
        .select({ runId: executionSteps.runId })
        .from(executionSteps)
        .where(eq(executionSteps.id, params.stepId))
        .limit(1);

      if (step) {
        await this.db
          .update(workflowRuns)
          .set({
            nodesExecuted: sql`${workflowRuns.nodesExecuted} + 1`,
            nodesSucceeded: sql`${workflowRuns.nodesSucceeded} + 1`,
            totalTokensUsed: sql`COALESCE(${workflowRuns.totalTokensUsed}, 0) + ${params.tokensTotal ?? 0}`,
            totalCostUsd: sql`COALESCE(${workflowRuns.totalCostUsd}, 0) + ${params.costUsd ?? 0}`,
            updatedAt: new Date(),
          })
          .where(eq(workflowRuns.id, step.runId));
      }

      logger.debug('Step execution completed', {
        stepId: params.stepId,
        durationMs,
        tokensTotal: params.tokensTotal,
      });
    } catch (error: any) {
      logger.error('Failed to log step completion', {
        error: error.message,
        stepId: params.stepId,
      });
      // Don't throw - logging failure shouldn't break execution
    }
  }

  // ==========================================================================
  // LOG STEP FAILURE
  // ==========================================================================

  /**
   * Log failure of a node execution
   */
  async logStepFailure(params: LogStepFailureParams): Promise<void> {
    const completedAt = new Date();

    try {
      // Get the step to calculate duration if not provided
      let durationMs = params.durationMs;
      if (durationMs === undefined) {
        const [step] = await this.db
          .select({ startedAt: executionSteps.startedAt })
          .from(executionSteps)
          .where(eq(executionSteps.id, params.stepId))
          .limit(1);

        if (step?.startedAt) {
          durationMs = completedAt.getTime() - step.startedAt.getTime();
        }
      }

      await this.db
        .update(executionSteps)
        .set({
          status: 'failure',
          completedAt,
          durationMs,
          errorCode: params.errorCode,
          errorMessage: params.errorMessage,
          errorStack: params.errorStack,
          errorDetails: safeSerialize(params.errorDetails) as any,
          retryAttempt: params.retryAttempt,
          maxRetries: params.maxRetries,
          previousErrors: params.previousErrors,
        })
        .where(eq(executionSteps.id, params.stepId));

      // Update run metrics
      const [step] = await this.db
        .select({ runId: executionSteps.runId })
        .from(executionSteps)
        .where(eq(executionSteps.id, params.stepId))
        .limit(1);

      if (step) {
        await this.db
          .update(workflowRuns)
          .set({
            nodesExecuted: sql`${workflowRuns.nodesExecuted} + 1`,
            nodesFailed: sql`${workflowRuns.nodesFailed} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(workflowRuns.id, step.runId));
      }

      logger.debug('Step execution failed', {
        stepId: params.stepId,
        errorCode: params.errorCode,
        errorMessage: params.errorMessage,
        durationMs,
      });
    } catch (error: any) {
      logger.error('Failed to log step failure', {
        error: error.message,
        stepId: params.stepId,
      });
      // Don't throw - logging failure shouldn't break execution
    }
  }

  // ==========================================================================
  // LOG STEP SKIPPED
  // ==========================================================================

  /**
   * Log when a node is skipped (e.g., condition branch not taken)
   */
  async logStepSkipped(
    runId: string,
    workflowId: string,
    nodeId: string,
    nodeType: string,
    nodeName?: string,
    reason?: string
  ): Promise<string> {
    const stepId = randomUUID();
    const now = new Date();
    const stepNumber = this.getNextStepNumber(runId);

    try {
      const stepData: NewExecutionStep = {
        id: stepId,
        runId,
        workflowId,
        nodeId,
        nodeType,
        nodeName,
        stepNumber,
        status: 'skipped',
        startedAt: now,
        completedAt: now,
        durationMs: 0,
        metadata: { skipReason: reason },
      };

      await this.db.insert(executionSteps).values(stepData);

      // Update run metrics
      await this.db
        .update(workflowRuns)
        .set({
          nodesSkipped: sql`${workflowRuns.nodesSkipped} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(workflowRuns.id, runId));

      logger.debug('Step skipped', { stepId, runId, nodeId, reason });

      return stepId;
    } catch (error: any) {
      logger.error('Failed to log step skipped', { error: error.message, runId, nodeId });
      throw error;
    }
  }

  // ==========================================================================
  // LOG STEP RETRYING
  // ==========================================================================

  /**
   * Update step status to retrying
   */
  async logStepRetrying(
    stepId: string,
    retryAttempt: number,
    retryDelayMs: number,
    errorMessage: string
  ): Promise<void> {
    try {
      // Get current previous errors
      const [step] = await this.db
        .select({ previousErrors: executionSteps.previousErrors })
        .from(executionSteps)
        .where(eq(executionSteps.id, stepId))
        .limit(1);

      const previousErrors = (step?.previousErrors as string[]) || [];
      previousErrors.push(errorMessage);

      await this.db
        .update(executionSteps)
        .set({
          status: 'retrying',
          retryAttempt,
          retryDelayMs,
          previousErrors,
        })
        .where(eq(executionSteps.id, stepId));

      logger.debug('Step retrying', { stepId, retryAttempt, retryDelayMs });
    } catch (error: any) {
      logger.error('Failed to log step retrying', { error: error.message, stepId });
    }
  }

  // ==========================================================================
  // FINALIZE RUN
  // ==========================================================================

  /**
   * Mark a workflow run as complete or failed
   */
  async finalizeRun(params: FinalizeRunParams): Promise<void> {
    const completedAt = new Date();

    try {
      // Get the run to calculate duration
      const [run] = await this.db
        .select({ startedAt: workflowRuns.startedAt })
        .from(workflowRuns)
        .where(eq(workflowRuns.id, params.runId))
        .limit(1);

      let totalDurationMs: number | undefined;
      if (run?.startedAt) {
        totalDurationMs = completedAt.getTime() - run.startedAt.getTime();
      }

      await this.db
        .update(workflowRuns)
        .set({
          status: params.status,
          completedAt,
          totalDurationMs,
          finalOutput: safeSerialize(params.finalOutput),
          errorCode: params.errorCode,
          errorMessage: params.errorMessage,
          errorStack: params.errorStack,
          updatedAt: new Date(),
        })
        .where(eq(workflowRuns.id, params.runId));

      // Cleanup step counter
      this.stepCounters.delete(params.runId);

      logger.info('Workflow run finalized', {
        runId: params.runId,
        status: params.status,
        totalDurationMs,
        hasError: !!params.errorMessage,
      });
    } catch (error: any) {
      logger.error('Failed to finalize run', {
        error: error.message,
        runId: params.runId,
      });
      throw error;
    }
  }

  // ==========================================================================
  // QUERY METHODS
  // ==========================================================================

  /**
   * Get paginated runs for a workflow
   */
  async getRuns(
    workflowId: string,
    options: {
      page?: number;
      pageSize?: number;
      status?: RunStatus;
      isTest?: boolean;
    } = {}
  ): Promise<PaginatedRuns> {
    const { page = 1, pageSize = 20, status, isTest } = options;
    const offset = (page - 1) * pageSize;

    try {
      // Build where conditions
      const conditions = [eq(workflowRuns.workflowId, workflowId)];
      if (status) conditions.push(eq(workflowRuns.status, status));
      if (isTest !== undefined) conditions.push(eq(workflowRuns.isTest, isTest));

      const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

      // Get total count
      const [countResult] = await this.db
        .select({ count: count() })
        .from(workflowRuns)
        .where(whereClause);

      const total = countResult?.count ?? 0;

      // Get paginated runs
      const runs = await this.db
        .select()
        .from(workflowRuns)
        .where(whereClause)
        .orderBy(desc(workflowRuns.createdAt))
        .limit(pageSize)
        .offset(offset);

      return {
        runs,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error: any) {
      logger.error('Failed to get runs', { error: error.message, workflowId });
      throw error;
    }
  }

  /**
   * Get a run with all its execution steps
   */
  async getRunDetails(runId: string): Promise<RunWithSteps | null> {
    try {
      // Get run
      const [run] = await this.db
        .select()
        .from(workflowRuns)
        .where(eq(workflowRuns.id, runId))
        .limit(1);

      if (!run) return null;

      // Get steps ordered by step number
      const steps = await this.db
        .select()
        .from(executionSteps)
        .where(eq(executionSteps.runId, runId))
        .orderBy(executionSteps.stepNumber);

      return { run, steps };
    } catch (error: any) {
      logger.error('Failed to get run details', { error: error.message, runId });
      throw error;
    }
  }

  /**
   * Get a specific step by ID
   */
  async getStep(stepId: string): Promise<ExecutionStep | null> {
    try {
      const [step] = await this.db
        .select()
        .from(executionSteps)
        .where(eq(executionSteps.id, stepId))
        .limit(1);

      return step || null;
    } catch (error: any) {
      logger.error('Failed to get step', { error: error.message, stepId });
      throw error;
    }
  }

  /**
   * Get failed steps for a run
   */
  async getFailedSteps(runId: string): Promise<ExecutionStep[]> {
    try {
      return await this.db
        .select()
        .from(executionSteps)
        .where(
          and(
            eq(executionSteps.runId, runId),
            eq(executionSteps.status, 'failure')
          )
        )
        .orderBy(executionSteps.stepNumber);
    } catch (error: any) {
      logger.error('Failed to get failed steps', { error: error.message, runId });
      throw error;
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Get the next run number for a workflow
   */
  private async getNextRunNumber(workflowId: string): Promise<number> {
    try {
      const [result] = await this.db
        .select({ maxRunNumber: sql<number>`COALESCE(MAX(${workflowRuns.runNumber}), 0)` })
        .from(workflowRuns)
        .where(eq(workflowRuns.workflowId, workflowId));

      return (result?.maxRunNumber ?? 0) + 1;
    } catch {
      return 1;
    }
  }

  /**
   * Get the next step number for a run
   */
  private getNextStepNumber(runId: string): number {
    const current = this.stepCounters.get(runId) ?? 0;
    const next = current + 1;
    this.stepCounters.set(runId, next);
    return next;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const executionLogger = ExecutionLoggerService.getInstance();
export default executionLogger;
