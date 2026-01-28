/**
 * Execute Workflow Executor
 *
 * Phase 5: Credential Vault & Sub-Workflow Orchestration
 *
 * Executes another workflow as a sub-workflow, waits for completion,
 * and returns the result. Uses the Suspension Architecture from Phase 1.
 *
 * Key Features:
 * - Trigger child workflows with input data
 * - Wait for child completion using suspension
 * - Pass child output back to parent
 * - Recursion depth limiting (max 3 levels)
 * - Context inheritance (credentials, variables)
 * - Isolated execution state per child
 */

import { randomUUID } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { workflows } from '@/lib/db/schema-workflows';
import {
  workflowExecutionLineage,
  SubWorkflowContext,
  WorkflowExecutionLineageRecord,
} from '@/lib/db/schema-credentials';
import {
  INodeExecutor,
  NodeExecutorInput,
  NodeExecutorOutput,
} from '@/types/execution';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MAX_RECURSION_DEPTH = 3;
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// INTERFACES
// ============================================================================

export interface ExecuteWorkflowConfig {
  /** ID of the workflow to execute */
  workflowId: string;

  /** Input data to pass to the child workflow */
  inputData?: Record<string, unknown>;

  /** Whether to wait for completion */
  waitForCompletion?: boolean;

  /** Timeout in milliseconds */
  timeoutMs?: number;

  /** Credential IDs to pass to child */
  inheritCredentials?: string[];

  /** Variables to pass to child */
  inheritVariables?: boolean;

  /** Custom mode for the child execution */
  executionMode?: 'test' | 'production';
}

export interface SubWorkflowResult {
  success: boolean;
  executionId: string;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  output?: unknown;
  error?: string;
  durationMs?: number;
}

// ============================================================================
// EXECUTE WORKFLOW EXECUTOR
// ============================================================================

export class ExecuteWorkflowExecutor implements INodeExecutor {
  private db = getDb();

  // Callback to trigger workflow execution (set by engine)
  private onExecuteWorkflow?: (
    workflowId: string,
    input: unknown,
    context: SubWorkflowContext
  ) => Promise<string>;

  // Callback to suspend parent execution
  private onSuspendExecution?: (
    executionId: string,
    nodeId: string,
    suspensionData: {
      type: 'subworkflow';
      childExecutionId: string;
      timeoutMs: number;
    }
  ) => Promise<string>;

  /**
   * Set the workflow execution callback
   */
  setExecuteCallback(
    callback: (
      workflowId: string,
      input: unknown,
      context: SubWorkflowContext
    ) => Promise<string>
  ): void {
    this.onExecuteWorkflow = callback;
  }

  /**
   * Set the suspension callback
   */
  setSuspendCallback(
    callback: (
      executionId: string,
      nodeId: string,
      suspensionData: {
        type: 'subworkflow';
        childExecutionId: string;
        timeoutMs: number;
      }
    ) => Promise<string>
  ): void {
    this.onSuspendExecution = callback;
  }

  /**
   * Execute the node
   */
  async execute(input: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const { node, context, inputs } = input;
    const nodeId = node.id;

    // Get configuration from node data
    const config: ExecuteWorkflowConfig = {
      workflowId: node.data?.workflowId,
      inputData: node.data?.inputData,
      waitForCompletion: node.data?.waitForCompletion !== false,
      timeoutMs: node.data?.timeoutMs || DEFAULT_TIMEOUT_MS,
      inheritCredentials: node.data?.inheritCredentials,
      inheritVariables: node.data?.inheritVariables !== false,
      executionMode: node.data?.executionMode || (context.isTest ? 'test' : 'production'),
    };

    // Validate workflow ID
    if (!config.workflowId) {
      return {
        data: null,
        success: false,
        error: 'Workflow ID is required',
      };
    }

    // Verify the target workflow exists
    const [targetWorkflow] = await this.db
      .select()
      .from(workflows)
      .where(eq(workflows.id, config.workflowId))
      .limit(1);

    if (!targetWorkflow) {
      return {
        data: null,
        success: false,
        error: `Workflow not found: ${config.workflowId}`,
      };
    }

    // Check for recursion depth
    const currentDepth = await this.getExecutionDepth(context.executionId);
    if (currentDepth >= MAX_RECURSION_DEPTH) {
      return {
        data: null,
        success: false,
        error: `Maximum recursion depth (${MAX_RECURSION_DEPTH}) exceeded. Check for circular workflow references.`,
      };
    }

    // Check for circular references
    const isCircular = await this.checkCircularReference(
      context.executionId,
      config.workflowId
    );
    if (isCircular) {
      return {
        data: null,
        success: false,
        error: `Circular workflow reference detected: ${config.workflowId}`,
      };
    }

    // Prepare input data
    const childInput = this.prepareChildInput(config, inputs, context);

    // Build sub-workflow context
    const subContext: SubWorkflowContext = {
      parentExecutionId: context.executionId,
      parentWorkflowId: context.workflowId,
      parentNodeId: nodeId,
      depth: currentDepth + 1,
      maxDepth: MAX_RECURSION_DEPTH,
      inheritedCredentials: config.inheritCredentials,
      inheritedVariables: config.inheritVariables ? context.state.variables : undefined,
    };

    // Execute the child workflow
    if (!this.onExecuteWorkflow) {
      return {
        data: null,
        success: false,
        error: 'Workflow execution callback not configured',
      };
    }

    try {
      const childExecutionId = await this.onExecuteWorkflow(
        config.workflowId,
        childInput,
        subContext
      );

      // Record the lineage
      await this.recordLineage({
        parentExecutionId: context.executionId,
        parentWorkflowId: context.workflowId,
        parentNodeId: nodeId,
        childExecutionId,
        childWorkflowId: config.workflowId,
        depth: currentDepth + 1,
        inputData: childInput,
      });

      if (config.waitForCompletion) {
        // Suspend parent and wait for child completion
        if (this.onSuspendExecution) {
          const suspensionId = await this.onSuspendExecution(
            context.executionId,
            nodeId,
            {
              type: 'subworkflow',
              childExecutionId,
              timeoutMs: config.timeoutMs!,
            }
          );

          return {
            data: {
              executionStatus: 'SUSPENDED',
              suspensionType: 'subworkflow',
              suspensionId,
              childExecutionId,
              childWorkflowId: config.workflowId,
              childWorkflowName: targetWorkflow.name,
              reason: `Waiting for sub-workflow: ${targetWorkflow.name}`,
            },
            success: true,
            meta: {
              suspended: true,
              suspensionType: 'subworkflow',
              childExecutionId,
            },
          };
        }

        // If no suspension callback, poll for completion (fallback)
        const result = await this.waitForCompletion(
          childExecutionId,
          config.timeoutMs!
        );

        return {
          data: result,
          success: result.success,
          error: result.error,
        };
      } else {
        // Fire and forget mode
        return {
          data: {
            executionId: childExecutionId,
            workflowId: config.workflowId,
            workflowName: targetWorkflow.name,
            status: 'running',
            mode: 'async',
          },
          success: true,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        data: null,
        success: false,
        error: `Failed to execute sub-workflow: ${errorMessage}`,
      };
    }
  }

  // --------------------------------------------------------------------------
  // DEPTH & RECURSION CHECKING
  // --------------------------------------------------------------------------

  /**
   * Get the current execution depth
   */
  private async getExecutionDepth(executionId: string): Promise<number> {
    // Look up the lineage to find the depth
    const [lineage] = await this.db
      .select({ depth: workflowExecutionLineage.depth })
      .from(workflowExecutionLineage)
      .where(eq(workflowExecutionLineage.childExecutionId, executionId))
      .limit(1);

    return lineage?.depth ?? 0;
  }

  /**
   * Check for circular workflow references
   */
  private async checkCircularReference(
    executionId: string,
    targetWorkflowId: string
  ): Promise<boolean> {
    // Traverse up the lineage chain to check if we'd create a cycle
    let currentExecutionId = executionId;
    const visited = new Set<string>();

    while (currentExecutionId) {
      if (visited.has(currentExecutionId)) {
        // Already visited, cycle detected
        return true;
      }
      visited.add(currentExecutionId);

      const [lineage] = await this.db
        .select({
          parentWorkflowId: workflowExecutionLineage.parentWorkflowId,
          parentExecutionId: workflowExecutionLineage.parentExecutionId,
        })
        .from(workflowExecutionLineage)
        .where(eq(workflowExecutionLineage.childExecutionId, currentExecutionId))
        .limit(1);

      if (!lineage) {
        break;
      }

      // Check if we're about to call a workflow that's already in our chain
      if (lineage.parentWorkflowId === targetWorkflowId) {
        return true;
      }

      currentExecutionId = lineage.parentExecutionId;
    }

    return false;
  }

  // --------------------------------------------------------------------------
  // INPUT PREPARATION
  // --------------------------------------------------------------------------

  /**
   * Prepare input data for child workflow
   */
  private prepareChildInput(
    config: ExecuteWorkflowConfig,
    inputs: Record<string, unknown>,
    context: any
  ): Record<string, unknown> {
    const childInput: Record<string, unknown> = {};

    // Use explicit input data if provided
    if (config.inputData) {
      Object.assign(childInput, config.inputData);
    }

    // Add previous node output
    if (inputs.previousOutput !== undefined) {
      childInput.$input = inputs.previousOutput;
    }

    // Add parent context metadata
    childInput.$parent = {
      executionId: context.executionId,
      workflowId: context.workflowId,
      userId: context.userId,
    };

    // Inherit variables if configured
    if (config.inheritVariables) {
      childInput.$parentVariables = context.state.variables;
    }

    return childInput;
  }

  // --------------------------------------------------------------------------
  // LINEAGE TRACKING
  // --------------------------------------------------------------------------

  /**
   * Record parent-child execution relationship
   */
  private async recordLineage(params: {
    parentExecutionId: string;
    parentWorkflowId: string;
    parentNodeId: string;
    childExecutionId: string;
    childWorkflowId: string;
    depth: number;
    inputData: unknown;
  }): Promise<void> {
    await this.db.insert(workflowExecutionLineage).values({
      parentExecutionId: params.parentExecutionId,
      parentWorkflowId: params.parentWorkflowId,
      parentNodeId: params.parentNodeId,
      childExecutionId: params.childExecutionId,
      childWorkflowId: params.childWorkflowId,
      depth: params.depth,
      inputData: params.inputData,
      status: 'running',
    });
  }

  /**
   * Update lineage status when child completes
   */
  async updateLineageStatus(
    childExecutionId: string,
    status: 'completed' | 'failed' | 'timeout',
    outputData?: unknown
  ): Promise<void> {
    const [lineage] = await this.db
      .select()
      .from(workflowExecutionLineage)
      .where(eq(workflowExecutionLineage.childExecutionId, childExecutionId))
      .limit(1);

    if (!lineage) {
      return;
    }

    const durationMs = lineage.startedAt
      ? Date.now() - new Date(lineage.startedAt).getTime()
      : undefined;

    await this.db
      .update(workflowExecutionLineage)
      .set({
        status,
        outputData,
        completedAt: new Date(),
        durationMs,
      })
      .where(eq(workflowExecutionLineage.childExecutionId, childExecutionId));
  }

  /**
   * Get lineage record for a child execution
   */
  async getLineage(
    childExecutionId: string
  ): Promise<WorkflowExecutionLineageRecord | null> {
    const [lineage] = await this.db
      .select()
      .from(workflowExecutionLineage)
      .where(eq(workflowExecutionLineage.childExecutionId, childExecutionId))
      .limit(1);

    return lineage ?? null;
  }

  // --------------------------------------------------------------------------
  // COMPLETION HANDLING
  // --------------------------------------------------------------------------

  /**
   * Wait for child workflow completion (fallback polling mode)
   */
  private async waitForCompletion(
    executionId: string,
    timeoutMs: number
  ): Promise<SubWorkflowResult> {
    const startTime = Date.now();
    const pollIntervalMs = 1000;

    while (Date.now() - startTime < timeoutMs) {
      const lineage = await this.getLineage(executionId);

      if (!lineage) {
        return {
          success: false,
          executionId,
          status: 'failed',
          error: 'Lineage record not found',
        };
      }

      if (lineage.status === 'completed') {
        return {
          success: true,
          executionId,
          status: 'completed',
          output: lineage.outputData,
          durationMs: lineage.durationMs ?? undefined,
        };
      }

      if (lineage.status === 'failed') {
        return {
          success: false,
          executionId,
          status: 'failed',
          error: 'Sub-workflow execution failed',
          durationMs: lineage.durationMs ?? undefined,
        };
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    // Timeout
    await this.updateLineageStatus(executionId, 'timeout');

    return {
      success: false,
      executionId,
      status: 'timeout',
      error: `Sub-workflow timed out after ${timeoutMs}ms`,
      durationMs: timeoutMs,
    };
  }

  /**
   * Handle child workflow completion (called by engine)
   */
  async onChildComplete(
    childExecutionId: string,
    success: boolean,
    output?: unknown,
    error?: string
  ): Promise<{
    parentExecutionId: string;
    parentNodeId: string;
    result: SubWorkflowResult;
  } | null> {
    const lineage = await this.getLineage(childExecutionId);
    if (!lineage) {
      return null;
    }

    const status = success ? 'completed' : 'failed';
    await this.updateLineageStatus(childExecutionId, status, output);

    const durationMs = lineage.startedAt
      ? Date.now() - new Date(lineage.startedAt).getTime()
      : undefined;

    return {
      parentExecutionId: lineage.parentExecutionId,
      parentNodeId: lineage.parentNodeId,
      result: {
        success,
        executionId: childExecutionId,
        status,
        output,
        error,
        durationMs,
      },
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let executeWorkflowExecutorInstance: ExecuteWorkflowExecutor | null = null;

export function getExecuteWorkflowExecutor(): ExecuteWorkflowExecutor {
  if (!executeWorkflowExecutorInstance) {
    executeWorkflowExecutorInstance = new ExecuteWorkflowExecutor();
  }
  return executeWorkflowExecutorInstance;
}

export default ExecuteWorkflowExecutor;
