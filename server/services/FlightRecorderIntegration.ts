/**
 * FLIGHT RECORDER INTEGRATION
 *
 * Phase 13: Integration layer for Flight Recorder with Workflow Engine
 *
 * This module provides hooks and utilities for instrumenting the
 * WorkflowExecutionEngineV2 with the Flight Recorder logging system.
 *
 * Usage:
 * 1. Import this module in WorkflowExecutionEngineV2
 * 2. Call flightRecorder.startRun() at the beginning of executeWorkflow()
 * 3. Call flightRecorder.recordStep() before/after each node execution
 * 4. Call flightRecorder.endRun() when the workflow completes/fails
 */

import { Node } from 'reactflow';
import { randomUUID } from 'crypto';
import {
  executionLogger,
  CreateRunParams,
  LogStepStartParams,
  LogStepCompletionParams,
  LogStepFailureParams,
} from './ExecutionLoggerService';
import { ExecutionContext, ExecutionState } from '@/types/execution';
import { TriggerType, StepStatus } from '@/lib/db/schema-flight-recorder';
import { createLogger } from '@/lib/logger';

const logger = createLogger('flight-recorder');

// ============================================================================
// TYPES
// ============================================================================

export interface FlightRecorderRunContext {
  runId: string;
  workflowId: string;
  stepCounter: number;
  stepIdMap: Map<string, string>; // nodeId -> stepId
  enabled: boolean;
}

export interface RecordStepParams {
  node: Node;
  context: ExecutionContext;
  inputsRaw?: Record<string, unknown>;
  inputsResolved?: Record<string, unknown>;
  depth?: number;
  parentStepId?: string;
  branchPath?: string;
}

export interface CompleteStepParams {
  nodeId: string;
  output?: unknown;
  tokensPrompt?: number;
  tokensCompletion?: number;
  tokensTotal?: number;
  costUsd?: number;
  model?: string;
  conditionResult?: boolean;
  externalCallId?: string;
}

export interface FailStepParams {
  nodeId: string;
  errorCode?: string;
  errorMessage: string;
  errorStack?: string;
  errorDetails?: {
    type: string;
    recoverable: boolean;
    retryable: boolean;
    context?: Record<string, unknown>;
  };
  retryAttempt?: number;
  maxRetries?: number;
  previousErrors?: string[];
}

// ============================================================================
// FLIGHT RECORDER CLASS
// ============================================================================

/**
 * Flight Recorder for workflow execution tracing
 *
 * Provides a high-level API for recording workflow executions
 * that can be easily integrated into the WorkflowExecutionEngineV2.
 */
export class FlightRecorder {
  private runContexts: Map<string, FlightRecorderRunContext> = new Map();

  /**
   * Start recording a new workflow run
   *
   * Call this at the beginning of executeWorkflow()
   */
  async startRun(
    executionId: string,
    workflowId: string,
    userId: string,
    options: {
      triggerType?: TriggerType;
      triggerPayload?: Record<string, unknown>;
      triggerSource?: string;
      workspaceId?: string;
      isTest?: boolean;
      nodesTotal?: number;
      versionId?: string;
      metadata?: Record<string, unknown>;
      enabled?: boolean;
    } = {}
  ): Promise<string | null> {
    // Check if recording is disabled
    if (options.enabled === false) {
      this.runContexts.set(executionId, {
        runId: '',
        workflowId,
        stepCounter: 0,
        stepIdMap: new Map(),
        enabled: false,
      });
      return null;
    }

    try {
      const params: CreateRunParams = {
        workflowId,
        userId,
        triggerType: options.triggerType || 'manual',
        triggerPayload: options.triggerPayload,
        triggerSource: options.triggerSource,
        workspaceId: options.workspaceId,
        isTest: options.isTest ?? true,
        nodesTotal: options.nodesTotal,
        versionId: options.versionId,
        traceId: `trace-${executionId.slice(0, 8)}`,
        metadata: {
          executionId,
          ...options.metadata,
        },
      };

      const runId = await executionLogger.createRun(params);

      // Store context for this execution
      this.runContexts.set(executionId, {
        runId,
        workflowId,
        stepCounter: 0,
        stepIdMap: new Map(),
        enabled: true,
      });

      logger.info('Flight recorder started', {
        executionId,
        runId,
        workflowId,
      });

      return runId;
    } catch (error: any) {
      logger.error('Failed to start flight recorder', {
        error: error.message,
        executionId,
        workflowId,
      });
      // Don't fail the workflow if recording fails
      this.runContexts.set(executionId, {
        runId: '',
        workflowId,
        stepCounter: 0,
        stepIdMap: new Map(),
        enabled: false,
      });
      return null;
    }
  }

  /**
   * Record the start of a node execution
   *
   * Call this before executing each node
   */
  async recordStepStart(
    executionId: string,
    params: RecordStepParams
  ): Promise<string | null> {
    const runContext = this.runContexts.get(executionId);
    if (!runContext?.enabled) return null;

    try {
      runContext.stepCounter++;
      const stepNumber = runContext.stepCounter;

      const stepParams: LogStepStartParams = {
        runId: runContext.runId,
        workflowId: runContext.workflowId,
        nodeId: params.node.id,
        nodeType: params.node.type || 'unknown',
        nodeName: params.node.data?.label || params.node.type,
        stepNumber,
        inputsRaw: params.inputsRaw,
        inputsResolved: params.inputsResolved,
        depth: params.depth,
        parentStepId: params.parentStepId,
        branchPath: params.branchPath,
        metadata: {
          nodeData: params.node.data,
          contextVars: Object.keys(params.context.state.variables || {}),
        },
      };

      const stepId = await executionLogger.logStepStart(stepParams);

      if (stepId) {
        runContext.stepIdMap.set(params.node.id, stepId);
      }

      return stepId;
    } catch (error: any) {
      logger.error('Failed to record step start', {
        error: error.message,
        nodeId: params.node.id,
      });
      return null;
    }
  }

  /**
   * Record successful completion of a node execution
   *
   * Call this after a node executes successfully
   */
  async recordStepSuccess(
    executionId: string,
    params: CompleteStepParams
  ): Promise<void> {
    const runContext = this.runContexts.get(executionId);
    if (!runContext?.enabled) return;

    const stepId = runContext.stepIdMap.get(params.nodeId);
    if (!stepId) {
      logger.warn('No step ID found for node', { nodeId: params.nodeId });
      return;
    }

    try {
      const completionParams: LogStepCompletionParams = {
        stepId,
        output: params.output,
        tokensPrompt: params.tokensPrompt,
        tokensCompletion: params.tokensCompletion,
        tokensTotal: params.tokensTotal,
        costUsd: params.costUsd,
        model: params.model,
        conditionResult: params.conditionResult,
        externalCallId: params.externalCallId,
      };

      await executionLogger.logStepCompletion(completionParams);
    } catch (error: any) {
      logger.error('Failed to record step success', {
        error: error.message,
        nodeId: params.nodeId,
      });
    }
  }

  /**
   * Record failure of a node execution
   *
   * Call this when a node fails
   */
  async recordStepFailure(
    executionId: string,
    params: FailStepParams
  ): Promise<void> {
    const runContext = this.runContexts.get(executionId);
    if (!runContext?.enabled) return;

    const stepId = runContext.stepIdMap.get(params.nodeId);
    if (!stepId) {
      logger.warn('No step ID found for node', { nodeId: params.nodeId });
      return;
    }

    try {
      const failureParams: LogStepFailureParams = {
        stepId,
        errorCode: params.errorCode,
        errorMessage: params.errorMessage,
        errorStack: params.errorStack,
        errorDetails: params.errorDetails,
        retryAttempt: params.retryAttempt,
        maxRetries: params.maxRetries,
        previousErrors: params.previousErrors,
      };

      await executionLogger.logStepFailure(failureParams);
    } catch (error: any) {
      logger.error('Failed to record step failure', {
        error: error.message,
        nodeId: params.nodeId,
      });
    }
  }

  /**
   * Record a skipped node
   *
   * Call this when a node is skipped (e.g., condition branch not taken)
   */
  async recordStepSkipped(
    executionId: string,
    node: Node,
    reason?: string
  ): Promise<void> {
    const runContext = this.runContexts.get(executionId);
    if (!runContext?.enabled) return;

    try {
      await executionLogger.logStepSkipped(
        runContext.runId,
        runContext.workflowId,
        node.id,
        node.type || 'unknown',
        node.data?.label || node.type,
        reason
      );
    } catch (error: any) {
      logger.error('Failed to record step skipped', {
        error: error.message,
        nodeId: node.id,
      });
    }
  }

  /**
   * Record a retry attempt
   *
   * Call this when a node is about to retry
   */
  async recordStepRetrying(
    executionId: string,
    nodeId: string,
    retryAttempt: number,
    retryDelayMs: number,
    errorMessage: string
  ): Promise<void> {
    const runContext = this.runContexts.get(executionId);
    if (!runContext?.enabled) return;

    const stepId = runContext.stepIdMap.get(nodeId);
    if (!stepId) return;

    try {
      await executionLogger.logStepRetrying(
        stepId,
        retryAttempt,
        retryDelayMs,
        errorMessage
      );
    } catch (error: any) {
      logger.error('Failed to record step retrying', {
        error: error.message,
        nodeId,
      });
    }
  }

  /**
   * End recording for a workflow run
   *
   * Call this when the workflow completes or fails
   */
  async endRun(
    executionId: string,
    status: 'completed' | 'failed' | 'cancelled' | 'suspended' | 'timeout',
    options: {
      finalOutput?: unknown;
      errorCode?: string;
      errorMessage?: string;
      errorStack?: string;
    } = {}
  ): Promise<void> {
    const runContext = this.runContexts.get(executionId);
    if (!runContext?.enabled) {
      this.runContexts.delete(executionId);
      return;
    }

    try {
      await executionLogger.finalizeRun({
        runId: runContext.runId,
        status,
        finalOutput: options.finalOutput,
        errorCode: options.errorCode,
        errorMessage: options.errorMessage,
        errorStack: options.errorStack,
      });

      logger.info('Flight recorder ended', {
        executionId,
        runId: runContext.runId,
        status,
        stepsRecorded: runContext.stepCounter,
      });
    } catch (error: any) {
      logger.error('Failed to end flight recorder', {
        error: error.message,
        executionId,
      });
    } finally {
      // Cleanup
      this.runContexts.delete(executionId);
    }
  }

  /**
   * Get the run ID for an execution
   */
  getRunId(executionId: string): string | null {
    const runContext = this.runContexts.get(executionId);
    return runContext?.enabled ? runContext.runId : null;
  }

  /**
   * Check if recording is enabled for an execution
   */
  isEnabled(executionId: string): boolean {
    return this.runContexts.get(executionId)?.enabled ?? false;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const flightRecorder = new FlightRecorder();
export default flightRecorder;

// ============================================================================
// INTEGRATION EXAMPLE
// ============================================================================

/**
 * Example of how to integrate with WorkflowExecutionEngineV2:
 *
 * ```typescript
 * import { flightRecorder } from './FlightRecorderIntegration';
 *
 * async executeWorkflow(...) {
 *   const executionId = randomUUID();
 *
 *   // Start recording
 *   await flightRecorder.startRun(executionId, workflowId, userId, {
 *     triggerType: 'manual',
 *     triggerPayload: payload,
 *     nodesTotal: nodes.length,
 *     isTest: options.isTest,
 *   });
 *
 *   try {
 *     // ... execute workflow ...
 *
 *     for (const node of nodes) {
 *       // Record step start
 *       await flightRecorder.recordStepStart(executionId, {
 *         node,
 *         context,
 *         inputsRaw: node.data,
 *         inputsResolved: resolvedInputs,
 *       });
 *
 *       try {
 *         const result = await executeNode(node);
 *
 *         // Record step success
 *         await flightRecorder.recordStepSuccess(executionId, {
 *           nodeId: node.id,
 *           output: result.data,
 *           tokensTotal: result.meta?.tokenUsage?.totalTokens,
 *           costUsd: result.meta?.cost,
 *           model: node.data?.model,
 *         });
 *       } catch (error) {
 *         // Record step failure
 *         await flightRecorder.recordStepFailure(executionId, {
 *           nodeId: node.id,
 *           errorMessage: error.message,
 *           errorStack: error.stack,
 *         });
 *         throw error;
 *       }
 *     }
 *
 *     // End run successfully
 *     await flightRecorder.endRun(executionId, 'completed', {
 *       finalOutput: context.state.output,
 *     });
 *   } catch (error) {
 *     // End run with failure
 *     await flightRecorder.endRun(executionId, 'failed', {
 *       errorMessage: error.message,
 *       errorStack: error.stack,
 *     });
 *     throw error;
 *   }
 * }
 * ```
 */
