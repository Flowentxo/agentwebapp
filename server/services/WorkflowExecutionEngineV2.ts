/**
 * WORKFLOW EXECUTION ENGINE V2
 *
 * Enhanced version with proper Shared State pattern and Variable Resolution.
 * Extends the original engine with:
 * - ExecutionState (global, nodes, variables, trigger)
 * - Recursive Variable Resolution ({{path.to.value}} syntax)
 * - Smart Typing (preserves Object/Array types)
 * - Improved logging via Winston
 */

import { Node, Edge } from 'reactflow';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db';
import { workflowExecutions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

// Import types
import {
  ExecutionContext,
  ExecutionState,
  ExecutionLogEntry,
  NodeExecutorInput,
  NodeExecutorOutput,
  INodeExecutor,
  ExecutionOptions,
} from '@/types/execution';

// Import error types
import {
  WorkflowError,
  NodeExecutionError,
  VariableResolutionError as VariableResolutionErrorType,
  BudgetExceededError as BudgetExceededErrorType,
  TimeoutError,
  ValidationError,
  wrapError,
  isWorkflowError,
} from '@/types/workflow-errors';

// Import workflow types for retry policies
import {
  NodeSettings,
  RetryState,
  SocketNodeRetryingEvent,
  SocketNodeContinuedEvent,
  getNodeSettings,
  calculateBackoffDelay,
  isRetryableError,
} from '@/types/workflow';

// Import services
import {
  VariableService,
  resolveVariables,
  resolveVariablesWithItemContext,
  storeNodeOutput,
  createInitialState,
  findMissingVariables,
} from './VariableService';

// Import item helper for multi-item processing (n8n-style)
import {
  ItemHelper,
  WorkflowItem,
  ItemContext,
  createItemContext,
  wrapInArray,
  flattenResults,
} from '@/lib/studio/item-helper';
import type { ItemExecutionLog } from './storage/HybridNodeLogService';
import { budgetService, type UsageContext } from './BudgetService';
import { workflowCostEstimator } from './WorkflowCostEstimator';
import { pipelineContextManager } from './PipelineContextManager';
import { suspensionService, SuspendedStateSnapshot } from './workflow/SuspensionService';
import { hybridNodeLogService } from './storage/HybridNodeLogService';

// Import Flight Recorder for time-travel debugging
import { flightRecorder } from './FlightRecorderIntegration';

// Import executors
import { DatabaseQueryNodeExecutor, WebhookNodeExecutor } from './WorkflowExecutors';
import {
  HubSpotCreateContactExecutor,
  HubSpotUpdateDealExecutor,
  HubSpotAddNoteExecutor,
  HubSpotSearchContactsExecutor,
} from './HubSpotWorkflowNodes';
import { ContextAwareLLMExecutor } from './executors/ContextAwareLLMExecutor';
import { ConditionExecutorV2 } from './executors/ConditionExecutorV2';
import { HumanApprovalExecutorV2, ApprovalResponse, ApprovalRequest } from './executors/HumanApprovalExecutorV2';
import { LoopExecutorV2 } from './executors/LoopExecutorV2';
import { EmailExecutorV2 } from './executors/EmailExecutorV2';

// Import Socket emitters
import { io, emitWorkflowUpdate, emitPipelineUpdate } from '@/server/socket';

const logger = createLogger('workflow-engine-v2');

// ============================================================================
// SOCKET EVENT TYPES (for frontend compatibility)
// ============================================================================

export interface SocketNodeStartEvent {
  type: 'node-start';
  nodeId: string;
  nodeName: string;
  timestamp: string;
}

export interface SocketNodeCompleteEvent {
  type: 'node-complete';
  nodeId: string;
  nodeName: string;
  output: any;
  durationMs: number;
  timestamp: string;
}

export interface SocketNodeErrorEvent {
  type: 'error';
  nodeId: string;
  nodeName: string;
  message: string;
  errorCode?: string;
  isRecoverable: boolean;
  timestamp: string;
}

export interface SocketWorkflowCompleteEvent {
  type: 'workflow-complete';
  executionId: string;
  workflowId: string;
  state: ExecutionState;
  totalDurationMs: number;
  totalCost: number;
  timestamp: string;
}

export interface SocketStateUpdateEvent {
  type: 'state-update';
  executionId: string;
  state: ExecutionState;
  currentNodeId: string | null;
  progress: number;
  timestamp: string;
}

export interface SocketFatalErrorEvent {
  type: 'fatal-error';
  executionId: string;
  workflowId: string;
  message: string;
  errorCode: string;
  timestamp: string;
}

export interface SocketNodeSuspendedEvent {
  type: 'node-suspended';
  executionId: string;
  workflowId: string;
  nodeId: string;
  nodeName: string;
  approvalId: string;
  reason: string;
  expiresAt: string;
  timestamp: string;
}

export interface SocketWorkflowResumedEvent {
  type: 'workflow-resumed';
  executionId: string;
  workflowId: string;
  resumedFromNodeId: string;
  approvalData: ApprovalResponse;
  timestamp: string;
}

// Re-export error types for backward compatibility
export { BudgetExceededErrorType as BudgetExceededError };
export { VariableResolutionErrorType as VariableResolutionError };

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_NODE_TIMEOUT_MS = 60000; // 60 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ============================================================================
// NODE EXECUTORS (V2 Wrappers)
// ============================================================================

/**
 * Wrapper to adapt old-style executors to new INodeExecutor interface
 */
class ExecutorAdapter implements INodeExecutor {
  constructor(
    private legacyExecutor: {
      execute(node: Node, context: any, inputs: any): Promise<any>;
    }
  ) {}

  async execute(input: NodeExecutorInput): Promise<NodeExecutorOutput> {
    try {
      // Create legacy context format
      const legacyContext = {
        executionId: input.context.executionId,
        workflowId: input.context.workflowId,
        userId: input.context.userId,
        isTest: input.context.isTest,
        startTime: input.context.startTime,
        variables: input.context.state.variables,
        nodeOutputs: new Map(
          Object.entries(input.context.state.nodes).map(([k, v]) => [k, v.output])
        ),
        logs: input.context.logs,
        status: input.context.status,
        currentNodeId: input.context.currentNodeId,
        nodes: input.context.nodes,
        totalCostIncurred: input.context.budget.totalCostIncurred,
        budgetCheckEnabled: input.context.budget.enabled,
      };

      const result = await this.legacyExecutor.execute(
        input.node,
        legacyContext,
        input.inputs
      );

      return {
        data: result,
        success: true,
        meta: {
          tokenUsage: result?.usage
            ? {
                promptTokens: result.usage.prompt_tokens || 0,
                completionTokens: result.usage.completion_tokens || 0,
                totalTokens: result.usage.total_tokens || 0,
              }
            : undefined,
          cost: result?.cost,
        },
      };
    } catch (error: any) {
      return {
        data: null,
        success: false,
        error: error.message,
      };
    }
  }
}

/**
 * Trigger Executor - Entry point for workflows
 */
class TriggerExecutorV2 implements INodeExecutor {
  async execute(input: NodeExecutorInput): Promise<NodeExecutorOutput> {
    // Trigger nodes pass through the trigger payload
    return {
      data: input.context.state.trigger.payload,
      success: true,
    };
  }
}

/**
 * Data Transform Executor - SECURE JavaScript-based transformation
 *
 * @security This executor uses SecureSandboxService with isolated-vm
 * to prevent RCE and injection attacks. The vulnerable `new Function()`
 * approach has been replaced with sandbox isolation.
 *
 * Security features:
 * - Isolated V8 context (no access to Node.js globals)
 * - 1000ms execution timeout
 * - 128MB memory limit
 * - Pre-execution code analysis for dangerous patterns
 * - Safe input/output marshalling
 */
import { getDataTransformExecutor } from './executors/DataTransformExecutorV2';

// Re-export the secure executor as the default
const SecureDataTransformExecutorV2 = getDataTransformExecutor();

// Note: ConditionExecutorV2 is now imported from ./executors/ConditionExecutorV2

/**
 * Output Executor - Final output node
 */
class OutputExecutorV2 implements INodeExecutor {
  async execute(input: NodeExecutorInput): Promise<NodeExecutorOutput> {
    return { data: input.inputs, success: true };
  }
}

/**
 * Set Variable Executor - Sets a variable in state
 */
class SetVariableExecutorV2 implements INodeExecutor {
  async execute(input: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const { variableName, value } = input.node.data;

    if (!variableName) {
      return { data: null, success: false, error: 'Variable name is required' };
    }

    // The value should already be resolved
    VariableService.setVariable(input.context.state, variableName, value);

    return {
      data: { variableName, value },
      success: true,
    };
  }
}

// ============================================================================
// WORKFLOW EXECUTION ENGINE V2
// ============================================================================

export class WorkflowExecutionEngineV2 {
  private executors: Map<string, INodeExecutor> = new Map();
  private activeExecutions: Map<string, ExecutionContext> = new Map();

  constructor() {
    this.registerDefaultExecutors();
  }

  /**
   * Register default node executors
   */
  private registerDefaultExecutors(): void {
    // V2 Native Executors
    this.registerExecutor('trigger', new TriggerExecutorV2());
    // SECURITY: Use hardened executor with isolated-vm sandbox
    this.registerExecutor('data-transform', SecureDataTransformExecutorV2);
    this.registerExecutor('transform', SecureDataTransformExecutorV2);
    this.registerExecutor('condition', new ConditionExecutorV2()); // Smart condition with AI support
    this.registerExecutor('logic-condition', new ConditionExecutorV2()); // Alias for visual builder
    this.registerExecutor('output', new OutputExecutorV2());
    this.registerExecutor('set-variable', new SetVariableExecutorV2());
    this.registerExecutor('human-approval', new HumanApprovalExecutorV2()); // HITL approval node
    this.registerExecutor('approval', new HumanApprovalExecutorV2()); // Alias
    this.registerExecutor('loop-controller', new LoopExecutorV2()); // Array iteration with state
    this.registerExecutor('loop', new LoopExecutorV2()); // Alias for loop
    this.registerExecutor('foreach', new LoopExecutorV2()); // Alias for foreach loops
    this.registerExecutor('email', new EmailExecutorV2()); // Email sender via nodemailer
    this.registerExecutor('send-email', new EmailExecutorV2()); // Alias for email

    // Adapted Legacy Executors
    this.registerExecutor(
      'llm-agent',
      new ExecutorAdapter(new ContextAwareLLMExecutor())
    );
    this.registerExecutor(
      'ai-agent',
      new ExecutorAdapter(new ContextAwareLLMExecutor())
    );
    this.registerExecutor(
      'agent',
      new ExecutorAdapter(new ContextAwareLLMExecutor())
    );
    this.registerExecutor(
      'database-query',
      new ExecutorAdapter(new DatabaseQueryNodeExecutor())
    );
    this.registerExecutor(
      'webhook',
      new ExecutorAdapter(new WebhookNodeExecutor())
    );
    this.registerExecutor(
      'hubspot-create-contact',
      new ExecutorAdapter(new HubSpotCreateContactExecutor())
    );
    this.registerExecutor(
      'hubspot-update-deal',
      new ExecutorAdapter(new HubSpotUpdateDealExecutor())
    );
    this.registerExecutor(
      'hubspot-add-note',
      new ExecutorAdapter(new HubSpotAddNoteExecutor())
    );
    this.registerExecutor(
      'hubspot-search-contacts',
      new ExecutorAdapter(new HubSpotSearchContactsExecutor())
    );

    logger.info('Default executors registered', {
      count: this.executors.size,
      types: Array.from(this.executors.keys()),
    });
  }

  /**
   * Register a custom node executor
   */
  registerExecutor(nodeType: string, executor: INodeExecutor): void {
    this.executors.set(nodeType, executor);
    logger.debug('Executor registered', { nodeType });
  }

  /**
   * Get an active execution by ID
   */
  getExecution(executionId: string): ExecutionContext | undefined {
    return this.activeExecutions.get(executionId);
  }

  /**
   * Cancel a running execution
   */
  cancelExecution(executionId: string): boolean {
    const execution = this.activeExecutions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return false;
    }

    execution.status = 'cancelled';
    execution.error = 'Execution cancelled by user';
    this.addLog(execution, 'workflow', 'Workflow', 'warn', 'Cancelled by user');

    this.updateExecutionRecord(execution).catch((err) =>
      logger.error('Failed to update cancelled execution', { error: err.message })
    );

    return true;
  }

  /**
   * Execute a workflow with the new state-based engine
   */
  async executeWorkflow(
    workflowId: string,
    nodes: Node[],
    edges: Edge[],
    userId: string,
    triggerPayload: any = {},
    options: ExecutionOptions = {}
  ): Promise<ExecutionContext> {
    const executionId = randomUUID();
    const startTime = Date.now();

    // Create initial execution state
    const state = createInitialState(
      userId,
      'manual',
      triggerPayload,
      {
        isTest: options.skipBudgetCheck ?? true,
        variables: options.variables,
      }
    );

    // Create execution context
    const context: ExecutionContext = {
      executionId,
      workflowId,
      userId,
      isTest: options.skipBudgetCheck ?? true,
      startTime,
      state,
      logs: [],
      status: 'pending',
      currentNodeId: null,
      nodes,
      edges,
      budget: {
        enabled: !options.skipBudgetCheck,
        totalCostIncurred: 0,
        remainingBudget: 0,
      },
    };

    this.activeExecutions.set(executionId, context);

    logger.info('Workflow execution started', {
      executionId,
      workflowId,
      userId,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    });

    // =========================================================================
    // FLIGHT RECORDER: Start run tracking for time-travel debugging
    // =========================================================================
    await flightRecorder.startRun(executionId, workflowId, userId, {
      triggerType: 'manual',
      triggerPayload: triggerPayload,
      triggerSource: 'api',
      isTest: context.isTest,
      nodesTotal: nodes.length,
      metadata: {
        variables: options.variables,
        budgetEnabled: context.budget.enabled,
      },
    });

    // Pre-flight budget check
    if (context.budget.enabled) {
      const estimate = workflowCostEstimator.estimateWorkflowCost(nodes);
      const budgetCheck = await budgetService.checkBudget(
        userId,
        estimate.estimatedTokens
      );

      if (!budgetCheck.allowed) {
        context.status = 'error';
        context.error = budgetCheck.reason || 'Budget check failed';
        context.errorCode = 'BUDGET_EXCEEDED';

        this.addLog(
          context,
          'workflow',
          'Budget Check',
          'error',
          `Pre-flight budget check failed: ${budgetCheck.reason}`
        );

        await this.updateExecutionRecord(context);
        return context;
      }

      context.budget.remainingBudget =
        budgetCheck.limits.monthlyCostUsd - budgetCheck.currentUsage.monthlyCostUsd;

      this.addLog(
        context,
        'workflow',
        'Budget Check',
        'info',
        `Budget OK. Estimated: $${estimate.minCost.toFixed(4)}-$${estimate.maxCost.toFixed(4)}`,
        { estimate, remaining: context.budget.remainingBudget }
      );
    }

    try {
      // Save initial execution record
      await this.createExecutionRecord(context);

      // Initialize pipeline context for agent collaboration
      await pipelineContextManager.initializeContext(
        executionId,
        workflowId,
        state.variables
      );

      // Start execution
      context.status = 'running';
      this.addLog(context, 'workflow', 'Workflow', 'info', 'Execution started');

      // Find entry nodes (triggers or nodes without incoming edges)
      const entryNodes = this.findEntryNodes(nodes, edges);

      if (entryNodes.length === 0) {
        throw new Error('No trigger node found. Workflow must have at least one entry point.');
      }

      // Execute from each entry point
      for (const entryNode of entryNodes) {
        await this.executeNode(entryNode, context);
      }

      // Mark as complete
      context.status = 'completed';
      this.addLog(
        context,
        'workflow',
        'Workflow',
        'success',
        'Execution completed successfully',
        { totalCost: context.budget.totalCostIncurred }
      );

      // =========================================================================
      // FLIGHT RECORDER: End run successfully
      // =========================================================================
      await flightRecorder.endRun(executionId, 'completed', {
        finalOutput: context.state,
      });

      // Emit workflow complete event
      this.emitWorkflowComplete(context);

    } catch (error: unknown) {
      // Wrap in WorkflowError if not already
      const workflowError = isWorkflowError(error)
        ? error
        : wrapError(error, {
            workflowId,
            executionId,
            userId,
          });

      context.status = 'error';
      context.error = workflowError.message;
      context.errorCode = workflowError.code;

      this.addLog(
        context,
        'workflow',
        'Workflow',
        'error',
        `Execution failed: ${workflowError.userMessage}`,
        {
          errorCode: workflowError.code,
          recoverable: workflowError.recoverable,
          retryable: workflowError.retryable,
        }
      );

      logger.error('Workflow execution failed', {
        executionId,
        error: workflowError.message,
        errorCode: workflowError.code,
        context: workflowError.context,
        recoverable: workflowError.recoverable,
        retryable: workflowError.retryable,
        stack: workflowError.stack,
      });

      // =========================================================================
      // FLIGHT RECORDER: End run with failure
      // =========================================================================
      await flightRecorder.endRun(executionId, 'failed', {
        errorCode: workflowError.code,
        errorMessage: workflowError.message,
        errorStack: workflowError.stack,
      });

      // Emit fatal error if not recoverable
      if (!workflowError.recoverable) {
        this.emitFatalError(context, workflowError);
      }
    } finally {
      await this.updateExecutionRecord(context);

      // Cleanup after 5 minutes
      setTimeout(() => {
        this.activeExecutions.delete(executionId);
      }, 5 * 60 * 1000);
    }

    return context;
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    node: Node,
    context: ExecutionContext,
    previousOutput: any = null
  ): Promise<any> {
    const nodeId = node.id;
    const nodeName = node.data?.label || node.type || 'Unknown';
    const nodeStartTime = Date.now();

    context.currentNodeId = nodeId;

    logger.debug('Executing node', { nodeId, nodeName, nodeType: node.type });

    // =========================================================================
    // HYBRID NODE LOGGING: Start
    // Uses LogStorageService for automatic blob offloading of large payloads
    // =========================================================================
    let nodeLogId: string | null = null;
    try {
      nodeLogId = await hybridNodeLogService.logNodeStart({
        executionId: context.executionId,
        workflowId: context.workflowId,
        nodeId,
        nodeType: node.type || 'unknown',
        nodeName,
        input: previousOutput, // Log the input to this node
        workspaceId: context.state.global?.workspaceId,
      });
    } catch (logError: any) {
      // Don't fail execution if logging fails, just warn
      logger.warn('Failed to log node start', { nodeId, error: logError.message });
    }

    // =========================================================================
    // STEP 1: RESOLVE VARIABLES IN NODE CONFIGURATION
    // =========================================================================

    const rawInputs = {
      ...node.data,
      previousOutput,
      trigger: context.state.trigger.payload,
    };

    // Check for missing variables (optional - for validation)
    const missingVars = findMissingVariables(rawInputs, context.state);
    if (missingVars.length > 0) {
      logger.warn('Missing variables in node config', {
        nodeId,
        missing: missingVars,
      });
      // Note: We don't fail here, just warn. Unresolved vars become undefined.
    }

    // Resolve all variables recursively
    const resolvedInputs = resolveVariables(rawInputs, context.state);

    this.addLog(
      context,
      nodeId,
      nodeName,
      'info',
      'Executing node...',
      {
        nodeType: node.type,
        hasResolvedVars: missingVars.length === 0,
      }
    );

    // Emit node-start event
    this.emitNodeStart(context, nodeId, nodeName);

    // =========================================================================
    // FLIGHT RECORDER: Record step start with raw and resolved inputs
    // =========================================================================
    await flightRecorder.recordStepStart(context.executionId, {
      node,
      context,
      inputsRaw: rawInputs,
      inputsResolved: resolvedInputs,
    });

    // =========================================================================
    // STEP 2: BUDGET CHECK (for costly nodes)
    // =========================================================================

    const nodeEstimate = workflowCostEstimator.estimateNodeCost(node);
    const isCostlyNode = nodeEstimate.estimatedCost > 0;

    if (context.budget.enabled && isCostlyNode) {
      if (nodeEstimate.estimatedCost > context.budget.remainingBudget) {
        throw new BudgetExceededErrorType(
          nodeId,
          nodeEstimate.estimatedCost,
          context.budget.remainingBudget,
          {
            workflowId: context.workflowId,
            executionId: context.executionId,
            nodeId,
            nodeName,
          }
        );
      }

      this.addLog(
        context,
        nodeId,
        nodeName,
        'debug',
        `Budget check passed. Estimated: $${nodeEstimate.estimatedCost.toFixed(4)}`
      );
    }

    // =========================================================================
    // STEP 3: EXECUTE NODE (with retry loop)
    // =========================================================================

    const executor = this.executors.get(node.type || 'custom');

    if (!executor) {
      throw new ValidationError(
        `No executor found for node type: ${node.type}`,
        [`Unknown node type: ${node.type}`],
        {
          workflowId: context.workflowId,
          executionId: context.executionId,
          nodeId,
          nodeName,
          nodeType: node.type,
        }
      );
    }

    const executorInput: NodeExecutorInput = {
      node,
      context,
      inputs: resolvedInputs,
      rawInputs,
    };

    // Get node settings (retry policy, error handling)
    const nodeSettings = getNodeSettings(node.data || {});
    const { retryPolicy, onError } = nodeSettings;

    // Get timeout from node config or use default
    const timeoutMs = nodeSettings.timeoutMs || node.data?.timeoutMs || DEFAULT_NODE_TIMEOUT_MS;

    // Retry state tracking
    const retryState: RetryState = {
      currentAttempt: 1,
      maxAttempts: retryPolicy.maxAttempts,
      nextRetryDelayMs: retryPolicy.backoffMs,
      previousErrors: [],
    };

    let result: NodeExecutorOutput | null = null;
    let lastError: Error | null = null;
    let continuedOnError = false;

    // =========================================================================
    // RETRY LOOP
    // =========================================================================
    while (retryState.currentAttempt <= retryState.maxAttempts) {
      try {
        // Execute with timeout protection
        result = await this.withTimeout(
          () => executor.execute(executorInput),
          timeoutMs,
          nodeId,
          nodeName
        );

        // If execution succeeded or returned a proper result, break the loop
        if (result.success) {
          break;
        }

        // Executor returned failure (but didn't throw)
        lastError = new Error(result.error || 'Unknown execution error');

        // Check if we should retry
        if (retryState.currentAttempt < retryState.maxAttempts && isRetryableError(lastError)) {
          retryState.previousErrors.push(result.error || 'Unknown error');
          retryState.nextRetryDelayMs = calculateBackoffDelay(
            retryPolicy.backoffMs,
            retryState.currentAttempt,
            retryPolicy.exponentialBackoff
          );
          retryState.nextRetryAt = new Date(Date.now() + retryState.nextRetryDelayMs).toISOString();

          // Log and emit retry event
          this.addLog(
            context,
            nodeId,
            nodeName,
            'warn',
            `Attempt ${retryState.currentAttempt} failed. Retrying in ${retryState.nextRetryDelayMs}ms...`,
            { error: result.error, attempt: retryState.currentAttempt, maxAttempts: retryState.maxAttempts }
          );

          // =========================================================================
          // FLIGHT RECORDER: Record retry attempt
          // =========================================================================
          await flightRecorder.recordStepRetrying(
            context.executionId,
            nodeId,
            retryState.currentAttempt,
            retryState.nextRetryDelayMs,
            result.error || 'Unknown error'
          );

          // Emit node:retrying socket event
          this.emitNodeRetrying(context, nodeId, nodeName, retryState, result.error || 'Unknown error');

          // Wait before retry
          await this.sleep(retryState.nextRetryDelayMs);
          retryState.currentAttempt++;
          continue;
        }

        // No more retries - handle based on onError policy
        break;

      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const workflowError = isWorkflowError(error) ? error : wrapError(error);

        // Check if error is retryable and we have retries left
        if (
          retryState.currentAttempt < retryState.maxAttempts &&
          (workflowError.retryable || isRetryableError(error))
        ) {
          retryState.previousErrors.push(lastError.message);
          retryState.nextRetryDelayMs = calculateBackoffDelay(
            retryPolicy.backoffMs,
            retryState.currentAttempt,
            retryPolicy.exponentialBackoff
          );
          retryState.nextRetryAt = new Date(Date.now() + retryState.nextRetryDelayMs).toISOString();

          // Log retry
          this.addLog(
            context,
            nodeId,
            nodeName,
            'warn',
            `Attempt ${retryState.currentAttempt} failed. Retrying in ${retryState.nextRetryDelayMs}ms...`,
            { error: lastError.message, attempt: retryState.currentAttempt, maxAttempts: retryState.maxAttempts }
          );

          // =========================================================================
          // FLIGHT RECORDER: Record retry attempt (from catch block)
          // =========================================================================
          await flightRecorder.recordStepRetrying(
            context.executionId,
            nodeId,
            retryState.currentAttempt,
            retryState.nextRetryDelayMs,
            lastError.message
          );

          // Emit node:retrying socket event
          this.emitNodeRetrying(context, nodeId, nodeName, retryState, lastError.message);

          // Wait before retry
          await this.sleep(retryState.nextRetryDelayMs);
          retryState.currentAttempt++;
          continue;
        }

        // Non-retryable error or retries exhausted
        result = {
          data: null,
          success: false,
          error: lastError.message,
        };
        break;
      }
    }

    const nodeEndTime = Date.now();
    const nodeDuration = nodeEndTime - nodeStartTime;

    // =========================================================================
    // HANDLE FINAL FAILURE (after all retries exhausted)
    // =========================================================================
    if (result && !result.success && lastError) {
      // Check onError policy
      if (onError === 'continue') {
        // Log that we're continuing despite error
        this.addLog(
          context,
          nodeId,
          nodeName,
          'warn',
          `Node failed after ${retryState.currentAttempt} attempt(s), but continuing execution (onError: continue)`,
          {
            originalError: lastError.message,
            retryAttempts: retryState.currentAttempt,
            previousErrors: retryState.previousErrors,
          }
        );

        // Emit node:continued socket event
        this.emitNodeContinued(context, nodeId, nodeName, lastError.message, retryState.currentAttempt);

        // Mark as "continued with warning" - treat as partial success
        continuedOnError = true;
        result = {
          data: {
            continuedOnError: true,
            originalError: lastError.message,
            retryAttempts: retryState.currentAttempt,
          },
          success: true, // Mark as success so workflow continues
          error: undefined,
        };
      }
      // If onError === 'stop', we'll throw the error below
    }

    // =========================================================================
    // STEP 4: STORE NODE OUTPUT IN STATE
    // =========================================================================

    // Ensure result is not null (should never happen, but TypeScript safety)
    if (!result) {
      result = {
        data: null,
        success: false,
        error: 'No result from execution',
      };
    }

    // Determine the status based on result and continuedOnError flag
    let nodeStatus: 'completed' | 'error' | 'continued' = result.success ? 'completed' : 'error';
    if (continuedOnError) {
      nodeStatus = 'continued'; // Special status for UI to show warning indicator
    }

    storeNodeOutput(
      context.state,
      nodeId,
      result.data,
      {
        status: nodeStatus === 'continued' ? 'completed' : nodeStatus, // Store as completed for workflow continuation
        startedAt: nodeStartTime,
        completedAt: nodeEndTime,
        error: result.error,
        retryCount: retryState.currentAttempt > 1 ? retryState.currentAttempt : undefined,
      }
    );

    // =========================================================================
    // STEP 5: TRACK COST
    // =========================================================================

    if (context.budget.enabled && isCostlyNode && result.success) {
      let actualCost = nodeEstimate.estimatedCost;
      let actualTokens = 0;

      if (result.meta?.tokenUsage) {
        actualTokens = result.meta.tokenUsage.totalTokens;
        const model = node.data?.model || 'gpt-4o-mini';
        actualCost = workflowCostEstimator.estimateLLMCost(
          model,
          result.meta.tokenUsage.promptTokens,
          result.meta.tokenUsage.completionTokens
        );
      }

      context.budget.totalCostIncurred += actualCost;
      context.budget.remainingBudget -= actualCost;

      const usageContext: UsageContext = {
        model: node.data?.model,
        agentId: node.data?.agentId,
        responseTimeMs: nodeDuration,
        isError: false,
        tags: ['workflow-v2', context.workflowId, node.type || 'unknown'],
      };

      await budgetService.trackUsage(context.userId, actualTokens, actualCost, usageContext);

      this.addLog(
        context,
        nodeId,
        nodeName,
        'debug',
        `Cost tracked: $${actualCost.toFixed(4)}`,
        { actualCost, actualTokens }
      );
    }

    // =========================================================================
    // FLIGHT RECORDER: Record step completion (success or failure)
    // =========================================================================
    if (result.success) {
      await flightRecorder.recordStepSuccess(context.executionId, {
        nodeId,
        output: result.data,
        tokensPrompt: result.meta?.tokenUsage?.promptTokens,
        tokensCompletion: result.meta?.tokenUsage?.completionTokens,
        tokensTotal: result.meta?.tokenUsage?.totalTokens,
        costUsd: result.meta?.cost,
        model: node.data?.model,
      });
    }

    // =========================================================================
    // STEP 6: LOG RESULT & EMIT EVENTS
    // =========================================================================

    if (result.success) {
      this.addLog(
        context,
        nodeId,
        nodeName,
        'success',
        'Node executed successfully',
        { durationMs: nodeDuration }
      );

      // =========================================================================
      // HYBRID NODE LOGGING: Success
      // =========================================================================
      if (nodeLogId) {
        try {
          await hybridNodeLogService.logNodeSuccess({
            logId: nodeLogId,
            output: result.data,
            durationMs: nodeDuration,
            tokensUsed: result.meta?.tokenUsage?.totalTokens,
            costUsd: result.meta?.cost,
            metadata: {
              nodeType: node.type,
              model: node.data?.model,
              hasTokenUsage: !!result.meta?.tokenUsage,
            },
            workspaceId: context.state.global?.workspaceId,
          });
        } catch (logError: any) {
          logger.warn('Failed to log node success', { nodeId, error: logError.message });
        }
      }

      // Emit node-complete event
      this.emitNodeComplete(context, nodeId, nodeName, result.data, nodeDuration);

      // Emit state update after each node completion
      this.emitStateUpdate(context);

      // =========================================================================
      // STEP 6.5: CHECK FOR SUSPENSION (Human Approval)
      // =========================================================================
      if (result.data?.executionStatus === 'SUSPENDED') {
        const approvalRequest = result.data.approvalRequest as ApprovalRequest;

        this.addLog(
          context,
          nodeId,
          nodeName,
          'warn',
          `Workflow suspended: ${result.data.reason}`,
          {
            approvalId: approvalRequest.approvalId,
            expiresAt: approvalRequest.expiresAt,
          }
        );

        // Update node state to 'waiting'
        storeNodeOutput(
          context.state,
          nodeId,
          result.data,
          {
            status: 'waiting',
            startedAt: nodeStartTime,
            completedAt: undefined, // Not completed yet
          }
        );

        // Mark context as suspended
        context.status = 'suspended';
        context.suspendedNodeId = nodeId;
        context.approvalRequest = approvalRequest;

        // Persist the entire execution state to database
        await this.persistSuspendedState(context);

        // =========================================================================
        // FLIGHT RECORDER: End run as suspended (waiting for approval)
        // =========================================================================
        await flightRecorder.endRun(context.executionId, 'suspended', {
          finalOutput: {
            suspendedAt: nodeId,
            approvalId: approvalRequest.approvalId,
            reason: result.data.reason,
          },
        });

        // Emit suspension event
        this.emitNodeSuspended(context, nodeId, nodeName, approvalRequest);

        // Return without executing connected nodes - workflow is paused
        return result.data;
      }
    } else {
      this.addLog(
        context,
        nodeId,
        nodeName,
        'error',
        `Node failed: ${result.error}`,
        { durationMs: nodeDuration }
      );

      // =========================================================================
      // HYBRID NODE LOGGING: Error
      // =========================================================================
      if (nodeLogId) {
        try {
          await hybridNodeLogService.logNodeError({
            logId: nodeLogId,
            error: result.error || 'Unknown error',
            durationMs: nodeDuration,
            metadata: {
              nodeType: node.type,
              model: node.data?.model,
            },
          });
        } catch (logError: any) {
          logger.warn('Failed to log node error', { nodeId, error: logError.message });
        }
      }

      // Create the error
      const nodeError = new NodeExecutionError(
        nodeId,
        nodeName,
        node.type || 'unknown',
        result.error || 'Unknown error',
        {
          workflowId: context.workflowId,
          executionId: context.executionId,
        }
      );

      // =========================================================================
      // FLIGHT RECORDER: Record step failure with error details
      // =========================================================================
      await flightRecorder.recordStepFailure(context.executionId, {
        nodeId,
        errorCode: 'NODE_EXECUTION_ERROR',
        errorMessage: result.error || 'Unknown error',
        errorDetails: {
          type: 'execution_failure',
          recoverable: false,
          retryable: false,
          context: { nodeType: node.type, nodeName },
        },
        retryAttempt: retryState.currentAttempt,
        maxRetries: retryState.maxAttempts,
        previousErrors: retryState.previousErrors,
      });

      // Emit node-error event
      this.emitNodeError(context, nodeId, nodeName, nodeError);

      throw nodeError;
    }

    // =========================================================================
    // STEP 7: EXECUTE CONNECTED NODES (with smart condition/loop routing)
    // =========================================================================

    // Determine if this is a condition node and extract the branch result
    const isConditionNode = node.type === 'condition' || node.type === 'logic-condition';
    const isLoopNode = node.type === 'loop-controller' || node.type === 'loop' || node.type === 'foreach';
    let branchResult: string | undefined;

    if (isConditionNode && result.data) {
      // ConditionExecutorV2 returns { result: boolean, branch: 'true' | 'false', ... }
      branchResult = result.data.result ? 'true' : 'false';

      // Log the branch decision for debugging
      this.addLog(
        context,
        nodeId,
        nodeName,
        'debug',
        `Condition evaluated: taking "${result.data.branch}" branch`,
        {
          result: result.data.result,
          reason: result.data.reason,
          usedAI: result.data.usedAI || false,
        }
      );

      // =========================================================================
      // FLIGHT RECORDER: Record condition result for the step
      // =========================================================================
      await flightRecorder.recordStepSuccess(context.executionId, {
        nodeId,
        output: result.data,
        conditionResult: result.data.result,
      });

      // Record skipped branches
      const allOutgoingEdges = context.edges.filter(e => e.source === nodeId);
      const skippedBranch = branchResult === 'true' ? 'false' : 'true';
      const skippedEdges = allOutgoingEdges.filter(e => {
        const handle = e.sourceHandle;
        if (!handle) return false;
        const skippedHandles = branchResult === 'true'
          ? ['false', 'no', 'failure', 'fail']
          : ['true', 'yes', 'success', 'pass'];
        return skippedHandles.includes(handle.toLowerCase());
      });

      // Record skipped nodes
      for (const skippedEdge of skippedEdges) {
        const skippedNode = context.nodes.find(n => n.id === skippedEdge.target);
        if (skippedNode) {
          await flightRecorder.recordStepSkipped(
            context.executionId,
            skippedNode,
            `Condition ${nodeId} evaluated to ${branchResult}, skipping ${skippedBranch} branch`
          );
        }
      }
    } else if (isLoopNode && result.data) {
      // LoopExecutorV2 returns { branch: 'body' | 'done', ... }
      branchResult = result.data.branch; // 'body' or 'done'

      // Log the loop iteration for debugging
      this.addLog(
        context,
        nodeId,
        nodeName,
        'debug',
        `Loop iteration ${result.data.index + 1}/${result.data.total}: taking "${result.data.branch}" branch`,
        {
          index: result.data.index,
          total: result.data.total,
          hasMore: result.data.hasMore,
          progress: result.data.progress,
        }
      );
    }

    const connectedNodes = this.findConnectedNodes(
      nodeId,
      context.nodes,
      context.edges,
      branchResult
    );

    // Log which nodes will be executed next
    if (connectedNodes.length > 0) {
      logger.debug('Routing to connected nodes', {
        fromNodeId: nodeId,
        toNodes: connectedNodes.map(n => ({ id: n.id, type: n.type, label: n.data?.label })),
        branchResult,
      });
    }

    for (const connectedNode of connectedNodes) {
      await this.executeNode(connectedNode, context, result.data);
    }

    return result.data;
  }

  // ===========================================================================
  // MULTI-ITEM PROCESSING (n8n-style)
  // ===========================================================================

  /**
   * Execute a node with multi-item processing support (n8n-style).
   *
   * This method wraps the input in WorkflowItems, iterates over each item,
   * executes the node for each item with item-scoped variable resolution,
   * and returns an array of results.
   *
   * Key features:
   * - Automatic iteration over input arrays
   * - Per-item variable resolution ($json, $itemIndex, etc.)
   * - Per-item logging and error tracking
   * - Backward compatible with single-item processing
   *
   * @param node - The node to execute
   * @param context - Execution context
   * @param previousOutput - Output from previous node (can be single item or array)
   * @returns Array of WorkflowItems (always an array)
   */
  private async executeNodeWithItems(
    node: Node,
    context: ExecutionContext,
    previousOutput: any = null
  ): Promise<WorkflowItem[]> {
    const nodeId = node.id;
    const nodeName = node.data?.label || node.type || 'Unknown';
    const nodeStartTime = Date.now();

    // Wrap input in WorkflowItems array
    const inputItems = wrapInArray(previousOutput);

    // If no items, return empty array
    if (inputItems.length === 0) {
      logger.debug('No items to process', { nodeId, nodeName });
      return [];
    }

    logger.debug('Executing node with multi-item processing', {
      nodeId,
      nodeName,
      itemCount: inputItems.length,
    });

    // Build node outputs map for $node["nodeName"].json resolution
    const nodeOutputsMap: Record<string, WorkflowItem[]> = {};
    for (const [nodeKey, nodeState] of Object.entries(context.state.nodes)) {
      if (nodeState.output) {
        nodeOutputsMap[nodeKey] = wrapInArray(nodeState.output);
      }
    }

    // Track per-item execution logs
    const itemExecutionLogs: ItemExecutionLog[] = [];
    const resultItems: WorkflowItem[] = [];

    // Log node start with item count
    let nodeLogId: string | null = null;
    try {
      nodeLogId = await hybridNodeLogService.logNodeStart({
        executionId: context.executionId,
        workflowId: context.workflowId,
        nodeId,
        nodeType: node.type || 'unknown',
        nodeName,
        input: inputItems.length > 1 ? ItemHelper.extractJson(inputItems) : inputItems[0]?.json,
        workspaceId: context.state.global?.workspaceId,
        itemCount: inputItems.length,
      });
    } catch (logError: any) {
      logger.warn('Failed to log node start', { nodeId, error: logError.message });
    }

    // Emit node-start event
    this.emitNodeStart(context, nodeId, nodeName);

    // Process each item
    for (let i = 0; i < inputItems.length; i++) {
      const item = inputItems[i];
      const itemStartTime = Date.now();

      // Create item context for n8n-style variable resolution
      const itemContext = createItemContext(inputItems, i, nodeOutputsMap);

      // Prepare raw inputs with item data
      const rawInputs = {
        ...node.data,
        $json: item.json,
        $itemIndex: i,
        $itemCount: inputItems.length,
        previousOutput: item.json,
        trigger: context.state.trigger.payload,
      };

      try {
        // Resolve variables with item context (supports $json, $node, etc.)
        const resolvedInputs = resolveVariablesWithItemContext(rawInputs, context.state, itemContext);

        // Get the executor
        const executor = this.executors.get(node.type || 'custom');
        if (!executor) {
          throw new ValidationError(
            `No executor found for node type: ${node.type}`,
            [`Unknown node type: ${node.type}`],
            {
              workflowId: context.workflowId,
              executionId: context.executionId,
              nodeId,
              nodeName,
              nodeType: node.type,
            }
          );
        }

        // Execute for this item
        const executorInput: NodeExecutorInput = {
          node,
          context,
          inputs: resolvedInputs,
          rawInputs,
        };

        const result = await executor.execute(executorInput);
        const itemEndTime = Date.now();

        if (result.success) {
          // Wrap result in WorkflowItem(s)
          const resultData = wrapInArray(result.data);
          resultItems.push(...resultData);

          // Log item success
          itemExecutionLogs.push({
            itemIndex: i,
            input: item.json,
            output: result.data,
            status: 'success',
            durationMs: itemEndTime - itemStartTime,
            startedAt: itemStartTime,
            completedAt: itemEndTime,
          });
        } else {
          // Log item error
          itemExecutionLogs.push({
            itemIndex: i,
            input: item.json,
            output: null,
            status: 'error',
            durationMs: itemEndTime - itemStartTime,
            error: result.error || 'Unknown error',
            startedAt: itemStartTime,
            completedAt: itemEndTime,
          });

          // Depending on error policy, we might continue or stop
          const nodeSettings = getNodeSettings(node.data || {});
          if (nodeSettings.onError === 'stop') {
            throw new NodeExecutionError(
              nodeId,
              nodeName,
              node.type || 'unknown',
              `Item ${i} failed: ${result.error}`,
              { workflowId: context.workflowId, executionId: context.executionId }
            );
          }
          // onError === 'continue': keep processing other items
        }
      } catch (error: any) {
        const itemEndTime = Date.now();

        // Log item error
        itemExecutionLogs.push({
          itemIndex: i,
          input: item.json,
          output: null,
          status: 'error',
          durationMs: itemEndTime - itemStartTime,
          error: error.message || 'Unknown error',
          startedAt: itemStartTime,
          completedAt: itemEndTime,
        });

        // Check error policy
        const nodeSettings = getNodeSettings(node.data || {});
        if (nodeSettings.onError === 'stop') {
          // Log node error with item execution logs
          if (nodeLogId) {
            await hybridNodeLogService.logNodeError({
              logId: nodeLogId,
              error: error.message || 'Unknown error',
              durationMs: Date.now() - nodeStartTime,
              itemExecutions: itemExecutionLogs,
            });
          }
          throw error;
        }
        // onError === 'continue': keep processing other items
      }
    }

    const nodeEndTime = Date.now();
    const nodeDuration = nodeEndTime - nodeStartTime;

    // Store output in state (as array for multi-item compatibility)
    const outputData = resultItems.length === 1
      ? resultItems[0].json
      : ItemHelper.extractJson(resultItems);

    storeNodeOutput(
      context.state,
      nodeId,
      outputData,
      {
        status: 'completed',
        startedAt: nodeStartTime,
        completedAt: nodeEndTime,
      }
    );

    // Log node success with item execution logs
    if (nodeLogId) {
      try {
        await hybridNodeLogService.logNodeSuccess({
          logId: nodeLogId,
          output: outputData,
          durationMs: nodeDuration,
          metadata: {
            nodeType: node.type,
            itemCount: inputItems.length,
            successCount: itemExecutionLogs.filter(l => l.status === 'success').length,
            errorCount: itemExecutionLogs.filter(l => l.status === 'error').length,
          },
          workspaceId: context.state.global?.workspaceId,
          itemExecutions: itemExecutionLogs,
        });
      } catch (logError: any) {
        logger.warn('Failed to log node success', { nodeId, error: logError.message });
      }
    }

    // Emit node-complete event
    this.emitNodeComplete(context, nodeId, nodeName, outputData, nodeDuration);
    this.emitStateUpdate(context);

    // Log completion
    this.addLog(
      context,
      nodeId,
      nodeName,
      'success',
      `Node processed ${inputItems.length} item(s)`,
      {
        durationMs: nodeDuration,
        itemCount: inputItems.length,
        successCount: itemExecutionLogs.filter(l => l.status === 'success').length,
      }
    );

    return resultItems;
  }

  /**
   * Execute a function with timeout
   */
  private async withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    nodeId: string,
    nodeName: string
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new TimeoutError(nodeId, nodeName, timeoutMs));
        }, timeoutMs);
      }),
    ]);
  }

  /**
   * Execute a function with retry logic
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = MAX_RETRIES,
    delayMs: number = RETRY_DELAY_MS,
    context?: { nodeId: string; nodeName: string }
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: unknown) {
        const workflowError = isWorkflowError(error) ? error : wrapError(error);
        lastError = workflowError;

        // Don't retry non-retryable errors
        if (!workflowError.retryable) {
          throw workflowError;
        }

        if (attempt < maxRetries - 1) {
          const backoffDelay = delayMs * Math.pow(2, attempt);
          logger.warn('Retrying after error', {
            attempt: attempt + 1,
            maxRetries,
            delayMs: backoffDelay,
            error: workflowError.message,
            nodeId: context?.nodeId,
          });
          await this.sleep(backoffDelay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Find entry nodes (triggers or nodes without incoming edges)
   */
  private findEntryNodes(nodes: Node[], edges: Edge[]): Node[] {
    return nodes.filter((node) => {
      if (node.type === 'trigger') return true;
      const hasIncoming = edges.some((edge) => edge.target === node.id);
      return !hasIncoming;
    });
  }

  /**
   * Find nodes connected to a given node.
   *
   * For condition/loop nodes, filters edges based on the sourceHandle:
   * - Condition: 'true'/'yes'/'success' vs 'false'/'no'/'failure'
   * - Loop: 'body'/'iterate' vs 'done'/'complete'
   * - null/undefined -> always taken (for regular nodes or default path)
   */
  private findConnectedNodes(
    nodeId: string,
    allNodes: Node[],
    allEdges: Edge[],
    branchResult?: string
  ): Node[] {
    let outgoingEdges = allEdges.filter((edge) => edge.source === nodeId);

    // For branching nodes, filter by sourceHandle based on result
    if (branchResult !== undefined) {
      // Define handle mappings for different branch types
      const handleMappings: Record<string, string[]> = {
        // Condition true branches
        'true': ['true', 'yes', 'success', 'pass', 'True', 'YES', 'SUCCESS'],
        // Condition false branches
        'false': ['false', 'no', 'failure', 'fail', 'False', 'NO', 'FAILURE'],
        // Loop body branches (continue iteration)
        'body': ['body', 'iterate', 'loop', 'next', 'Body', 'BODY'],
        // Loop done branches (exit loop)
        'done': ['done', 'complete', 'exit', 'finished', 'Done', 'DONE'],
      };

      // Get the valid handles for this branch result
      const validHandles = handleMappings[branchResult] || [branchResult];

      outgoingEdges = outgoingEdges.filter((edge) => {
        const handle = edge.sourceHandle;

        // If no handle specified, this is the default output (follow it)
        if (!handle) {
          return true;
        }

        // Check if handle matches the expected branch
        return validHandles.includes(handle);
      });

      logger.debug('Filtered outgoing edges for branching node', {
        nodeId,
        branchResult,
        validHandles,
        totalEdges: allEdges.filter((e) => e.source === nodeId).length,
        filteredEdges: outgoingEdges.length,
        handles: outgoingEdges.map((e) => e.sourceHandle),
      });
    }

    return outgoingEdges
      .map((edge) => allNodes.find((node) => node.id === edge.target))
      .filter(Boolean) as Node[];
  }

  /**
   * Add a log entry
   */
  private addLog(
    context: ExecutionContext,
    nodeId: string,
    nodeName: string,
    level: ExecutionLogEntry['level'],
    message: string,
    data?: any
  ): void {
    const entry: ExecutionLogEntry = {
      timestamp: Date.now(),
      nodeId,
      nodeName,
      level,
      message,
      data,
    };

    context.logs.push(entry);

    // Also log to Winston
    const logFn = level === 'error' ? logger.error : level === 'warn' ? logger.warn : logger.info;
    logFn.call(logger, `[${nodeId}] ${message}`, { nodeName, ...data });
  }

  /**
   * Create execution record in database
   */
  private async createExecutionRecord(context: ExecutionContext): Promise<void> {
    try {
      const db = getDb();

      await db.insert(workflowExecutions).values({
        id: context.executionId,
        workflowId: context.workflowId,
        userId: context.userId,
        status: 'pending',
        isTest: context.isTest,
        input: context.state.trigger.payload,
        logs: [],
      });

      logger.debug('Execution record created', { executionId: context.executionId });
    } catch (error: any) {
      logger.error('Failed to create execution record', { error: error.message });
      throw new Error(`Failed to persist execution: ${error.message}`);
    }
  }

  /**
   * Update execution record in database
   */
  private async updateExecutionRecord(context: ExecutionContext): Promise<void> {
    try {
      const db = getDb();
      const durationMs = Date.now() - context.startTime;

      // Convert state.nodes to output format
      const output: Record<string, any> = {};
      for (const [nodeId, nodeState] of Object.entries(context.state.nodes)) {
        output[nodeId] = nodeState.output;
      }

      await db
        .update(workflowExecutions)
        .set({
          status: context.status === 'completed' ? 'success' : context.status,
          output,
          logs: context.logs,
          error: context.error,
          startedAt: new Date(context.startTime),
          completedAt: new Date(),
          durationMs,
        })
        .where(eq(workflowExecutions.id, context.executionId));

      logger.debug('Execution record updated', {
        executionId: context.executionId,
        status: context.status,
        durationMs,
      });
    } catch (error: any) {
      logger.error('Failed to update execution record', { error: error.message });
    }
  }

  // ===========================================================================
  // SOCKET EMISSION METHODS
  // ===========================================================================

  /**
   * Emit node-start event
   */
  private emitNodeStart(context: ExecutionContext, nodeId: string, nodeName: string): void {
    this.safeEmit(context, () => {
      const event: SocketNodeStartEvent = {
        type: 'node-start',
        nodeId,
        nodeName,
        timestamp: new Date().toISOString(),
      };

      // Emit via /pipelines namespace
      this.emitToPipelineRoom(context.executionId, 'step:started', {
        stepId: nodeId,
        stepName: nodeName,
        timestamp: event.timestamp,
      });

      // Also emit workflow update for broader compatibility
      emitWorkflowUpdate({
        workflowId: context.workflowId,
        executionId: context.executionId,
        status: 'step_started',
        stepId: nodeId,
        stepName: nodeName,
        timestamp: event.timestamp,
      });

      logger.debug('Emitted node-start', { nodeId, nodeName });
    });
  }

  /**
   * Emit node-complete event
   */
  private emitNodeComplete(
    context: ExecutionContext,
    nodeId: string,
    nodeName: string,
    output: any,
    durationMs: number
  ): void {
    this.safeEmit(context, () => {
      const event: SocketNodeCompleteEvent = {
        type: 'node-complete',
        nodeId,
        nodeName,
        output,
        durationMs,
        timestamp: new Date().toISOString(),
      };

      // Emit via /pipelines namespace
      this.emitToPipelineRoom(context.executionId, 'step:completed', {
        stepId: nodeId,
        stepName: nodeName,
        output,
        durationMs,
        timestamp: event.timestamp,
      });

      // Also emit workflow update
      emitWorkflowUpdate({
        workflowId: context.workflowId,
        executionId: context.executionId,
        status: 'step_completed',
        stepId: nodeId,
        stepName: nodeName,
        output,
        timestamp: event.timestamp,
      });

      logger.debug('Emitted node-complete', { nodeId, nodeName, durationMs });
    });
  }

  /**
   * Emit node error event
   */
  private emitNodeError(
    context: ExecutionContext,
    nodeId: string,
    nodeName: string,
    error: WorkflowError | Error
  ): void {
    this.safeEmit(context, () => {
      const isWorkflow = isWorkflowError(error);
      const event: SocketNodeErrorEvent = {
        type: 'error',
        nodeId,
        nodeName,
        message: error.message,
        errorCode: isWorkflow ? error.code : undefined,
        isRecoverable: isWorkflow ? error.recoverable : false,
        timestamp: new Date().toISOString(),
      };

      // Emit via /pipelines namespace
      this.emitToPipelineRoom(context.executionId, 'step:failed', {
        stepId: nodeId,
        stepName: nodeName,
        error: error.message,
        isRecoverable: event.isRecoverable,
        timestamp: event.timestamp,
      });

      // Also emit workflow update
      emitWorkflowUpdate({
        workflowId: context.workflowId,
        executionId: context.executionId,
        status: 'step_failed',
        stepId: nodeId,
        stepName: nodeName,
        error: error.message,
        timestamp: event.timestamp,
      });

      logger.debug('Emitted node-error', { nodeId, nodeName, error: error.message });
    });
  }

  /**
   * Emit node-retrying event (for retry UI updates)
   */
  private emitNodeRetrying(
    context: ExecutionContext,
    nodeId: string,
    nodeName: string,
    retryState: RetryState,
    lastError: string
  ): void {
    this.safeEmit(context, () => {
      const event: SocketNodeRetryingEvent = {
        type: 'node-retrying',
        executionId: context.executionId,
        workflowId: context.workflowId,
        nodeId,
        nodeName,
        currentAttempt: retryState.currentAttempt,
        maxAttempts: retryState.maxAttempts,
        nextRetryAt: retryState.nextRetryAt || new Date(Date.now() + retryState.nextRetryDelayMs).toISOString(),
        delayMs: retryState.nextRetryDelayMs,
        lastError,
        timestamp: new Date().toISOString(),
      };

      // Emit via /pipelines namespace
      this.emitToPipelineRoom(context.executionId, 'node:retrying', event);

      // Also emit workflow update
      emitWorkflowUpdate({
        workflowId: context.workflowId,
        executionId: context.executionId,
        status: 'step_retrying',
        stepId: nodeId,
        stepName: nodeName,
        currentAttempt: retryState.currentAttempt,
        maxAttempts: retryState.maxAttempts,
        nextRetryAt: event.nextRetryAt,
        timestamp: event.timestamp,
      });

      logger.debug('Emitted node-retrying', {
        nodeId,
        nodeName,
        attempt: retryState.currentAttempt,
        maxAttempts: retryState.maxAttempts,
        delayMs: retryState.nextRetryDelayMs,
      });
    });
  }

  /**
   * Emit node-continued event (when node failed but workflow continues)
   */
  private emitNodeContinued(
    context: ExecutionContext,
    nodeId: string,
    nodeName: string,
    originalError: string,
    retryAttempts: number
  ): void {
    this.safeEmit(context, () => {
      const event: SocketNodeContinuedEvent = {
        type: 'node-continued',
        executionId: context.executionId,
        workflowId: context.workflowId,
        nodeId,
        nodeName,
        originalError,
        retryAttempts,
        timestamp: new Date().toISOString(),
      };

      // Emit via /pipelines namespace
      this.emitToPipelineRoom(context.executionId, 'node:continued', event);

      // Also emit workflow update
      emitWorkflowUpdate({
        workflowId: context.workflowId,
        executionId: context.executionId,
        status: 'step_continued_on_error',
        stepId: nodeId,
        stepName: nodeName,
        originalError,
        retryAttempts,
        timestamp: event.timestamp,
      });

      logger.debug('Emitted node-continued', {
        nodeId,
        nodeName,
        originalError,
        retryAttempts,
      });
    });
  }

  /**
   * Emit workflow complete event
   */
  emitWorkflowComplete(context: ExecutionContext): void {
    this.safeEmit(context, () => {
      const durationMs = Date.now() - context.startTime;
      const event: SocketWorkflowCompleteEvent = {
        type: 'workflow-complete',
        executionId: context.executionId,
        workflowId: context.workflowId,
        state: context.state,
        totalDurationMs: durationMs,
        totalCost: context.budget.totalCostIncurred,
        timestamp: new Date().toISOString(),
      };

      // Emit to pipeline room
      this.emitToPipelineRoom(context.executionId, 'workflow:complete', event);

      // Emit workflow update
      emitWorkflowUpdate({
        workflowId: context.workflowId,
        executionId: context.executionId,
        status: 'completed',
        progress: 100,
        timestamp: event.timestamp,
      });

      // Also update via emitPipelineUpdate
      emitPipelineUpdate(context.executionId, {
        status: 'completed',
        output: context.state,
      });

      logger.info('Workflow completed', {
        executionId: context.executionId,
        durationMs,
        totalCost: context.budget.totalCostIncurred,
      });
    });
  }

  /**
   * Emit state update after each node (for Data Context Panel)
   */
  emitStateUpdate(context: ExecutionContext): void {
    this.safeEmit(context, () => {
      // Calculate progress
      const completedNodes = Object.values(context.state.nodes).filter(
        n => n.meta.status === 'completed' || n.meta.status === 'error'
      ).length;
      const totalNodes = context.nodes.length;
      const progress = totalNodes > 0
        ? Math.round((completedNodes / totalNodes) * 100)
        : 0;

      const event: SocketStateUpdateEvent = {
        type: 'state-update',
        executionId: context.executionId,
        state: context.state,
        currentNodeId: context.currentNodeId,
        progress,
        timestamp: new Date().toISOString(),
      };

      // Emit to pipeline room
      this.emitToPipelineRoom(context.executionId, 'state:update', event);

      // Also emit progress update
      emitPipelineUpdate(context.executionId, {
        status: 'running',
        currentStep: completedNodes,
        totalSteps: totalNodes,
      });
    });
  }

  /**
   * Emit fatal error event (non-recoverable)
   */
  emitFatalError(context: ExecutionContext, error: WorkflowError): void {
    this.safeEmit(context, () => {
      const event: SocketFatalErrorEvent = {
        type: 'fatal-error',
        executionId: context.executionId,
        workflowId: context.workflowId,
        message: error.userMessage || error.message,
        errorCode: error.code,
        timestamp: new Date().toISOString(),
      };

      // Emit to pipeline room
      this.emitToPipelineRoom(context.executionId, 'fatal:error', event);

      // Emit workflow update
      emitWorkflowUpdate({
        workflowId: context.workflowId,
        executionId: context.executionId,
        status: 'failed',
        error: error.message,
        timestamp: event.timestamp,
      });

      // Update pipeline status
      emitPipelineUpdate(context.executionId, {
        status: 'failed',
        error: error.message,
      });

      logger.error('Fatal workflow error', {
        executionId: context.executionId,
        error: error.message,
        errorCode: error.code,
      });
    });
  }

  /**
   * Safely emit to pipeline room
   */
  private emitToPipelineRoom(executionId: string, event: string, data: any): void {
    if (!io) {
      logger.debug('Socket.IO not initialized, skipping emit', { event });
      return;
    }

    try {
      const pipelinesNamespace = io.of('/pipelines');
      pipelinesNamespace.to(`execution:${executionId}`).emit(event, data);
    } catch (error: any) {
      logger.warn('Failed to emit to pipeline room', {
        event,
        executionId,
        error: error.message
      });
    }
  }

  /**
   * Safe emit wrapper - catches any socket errors
   */
  private safeEmit(context: ExecutionContext, emitFn: () => void): void {
    try {
      emitFn();
    } catch (error: any) {
      logger.warn('Socket emit failed', {
        executionId: context.executionId,
        error: error.message,
      });
    }
  }

  // ===========================================================================
  // HUMAN-IN-THE-LOOP (HITL) METHODS
  // ===========================================================================

  /**
   * Persist the suspended execution state to database
   * Uses SuspensionService for complete state serialization (server-restart safe)
   */
  private async persistSuspendedState(context: ExecutionContext): Promise<void> {
    try {
      if (!context.approvalRequest) {
        throw new Error('Cannot suspend without approval request');
      }

      // Use the new SuspensionService for robust state persistence
      const result = await suspensionService.suspendExecution(context, context.approvalRequest);

      if (!result.success) {
        throw new Error(result.error || 'Failed to suspend execution');
      }

      logger.info('Suspended state persisted via SuspensionService', {
        executionId: context.executionId,
        suspendedNodeId: context.suspendedNodeId,
        approvalId: result.approvalId,
        resumeToken: result.resumeToken ? 'generated' : 'none',
      });
    } catch (error: any) {
      logger.error('Failed to persist suspended state', {
        executionId: context.executionId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Emit node-suspended event via Socket.IO
   */
  private emitNodeSuspended(
    context: ExecutionContext,
    nodeId: string,
    nodeName: string,
    approvalRequest: ApprovalRequest
  ): void {
    this.safeEmit(context, () => {
      const event: SocketNodeSuspendedEvent = {
        type: 'node-suspended',
        executionId: context.executionId,
        workflowId: context.workflowId,
        nodeId,
        nodeName,
        approvalId: approvalRequest.approvalId,
        reason: `Waiting for approval: ${approvalRequest.title}`,
        expiresAt: approvalRequest.expiresAt,
        timestamp: new Date().toISOString(),
      };

      // Emit to pipeline room
      this.emitToPipelineRoom(context.executionId, 'node:suspended', event);

      // Also emit workflow update
      emitWorkflowUpdate({
        workflowId: context.workflowId,
        executionId: context.executionId,
        status: 'waiting_approval',
        stepId: nodeId,
        stepName: nodeName,
        approvalId: approvalRequest.approvalId,
        timestamp: event.timestamp,
      });

      // Update pipeline status
      emitPipelineUpdate(context.executionId, {
        status: 'waiting_approval',
        currentStep: nodeId,
        approvalRequired: true,
      });

      logger.info('Emitted node-suspended event', {
        nodeId,
        nodeName,
        approvalId: approvalRequest.approvalId,
      });
    });
  }

  /**
   * Resume a suspended workflow execution after approval
   * Uses SuspensionService for robust state hydration (server-restart safe)
   */
  async resumeWorkflow(
    executionId: string,
    approvalData: ApprovalResponse,
    resumeToken?: string
  ): Promise<ExecutionContext> {
    logger.info('Resuming workflow execution', {
      executionId,
      approved: approvalData.approved,
      approvedBy: approvalData.approvedBy,
      hasResumeToken: !!resumeToken,
    });

    try {
      // 1. Use SuspensionService for robust state hydration
      const resumeResult = await suspensionService.resumeExecution(
        executionId,
        approvalData,
        resumeToken
      );

      if (!resumeResult.success || !resumeResult.context) {
        throw new Error(resumeResult.error || 'Failed to resume execution');
      }

      const context = resumeResult.context;
      const suspendedNodeId = context.currentNodeId;

      // 2. Register in active executions
      this.activeExecutions.set(executionId, context);

      // 3. Emit workflow resumed event
      if (suspendedNodeId) {
        this.emitWorkflowResumed(context, suspendedNodeId, approvalData);
      }

      // 4. If approved, continue to connected nodes
      if (approvalData.approved && suspendedNodeId) {
        const connectedNodes = this.findConnectedNodes(
          suspendedNodeId,
          context.nodes,
          context.edges,
          true // Treat approval as 'true' branch
        );

        for (const connectedNode of connectedNodes) {
          await this.executeNode(connectedNode, context, {
            approved: true,
            approvalResponse: approvalData,
          });
        }

        // Check if workflow completed (no pending nodes)
        const hasRunningNodes = Object.values(context.state.nodes).some(
          (n) => n.meta.status === 'running' || n.meta.status === 'pending'
        );

        if (!hasRunningNodes && context.status !== 'error') {
          context.status = 'completed';
          this.addLog(
            context,
            'workflow',
            'Workflow',
            'success',
            'Execution completed successfully after approval',
            { totalCost: context.budget.totalCostIncurred }
          );
          this.emitWorkflowComplete(context);
        }
      } else {
        // Rejected - mark workflow as completed (not error, just stopped)
        context.status = 'completed';
        context.error = `Workflow stopped: Approval rejected by ${approvalData.approvedBy || 'unknown'}`;

        this.addLog(
          context,
          'workflow',
          'Workflow',
          'warn',
          'Workflow stopped due to rejection',
          { approvalData }
        );

        this.emitWorkflowComplete(context);
      }

      // 5. Update execution record
      await this.updateExecutionRecord(context);

      // 6. Cleanup after 5 minutes
      setTimeout(() => {
        this.activeExecutions.delete(executionId);
      }, 5 * 60 * 1000);

      return context;
    } catch (error: unknown) {
      const wrappedError = wrapError(error, { executionId });

      logger.error('Failed to resume workflow', {
        executionId,
        error: wrappedError.message,
      });

      throw wrappedError;
    }
  }

  /**
   * Emit workflow-resumed event
   */
  private emitWorkflowResumed(
    context: ExecutionContext,
    resumedFromNodeId: string,
    approvalData: ApprovalResponse
  ): void {
    this.safeEmit(context, () => {
      const event: SocketWorkflowResumedEvent = {
        type: 'workflow-resumed',
        executionId: context.executionId,
        workflowId: context.workflowId,
        resumedFromNodeId,
        approvalData,
        timestamp: new Date().toISOString(),
      };

      // Emit to pipeline room
      this.emitToPipelineRoom(context.executionId, 'workflow:resumed', event);

      // Also emit workflow update
      emitWorkflowUpdate({
        workflowId: context.workflowId,
        executionId: context.executionId,
        status: 'running',
        timestamp: event.timestamp,
      });

      // Update pipeline status
      emitPipelineUpdate(context.executionId, {
        status: 'running',
        approvalRequired: false,
      });

      logger.info('Emitted workflow-resumed event', {
        executionId: context.executionId,
        resumedFromNodeId,
        approved: approvalData.approved,
      });
    });
  }

  /**
   * Get pending approval for an execution
   */
  async getPendingApproval(executionId: string): Promise<ApprovalRequest | null> {
    try {
      const db = getDb();

      const [execution] = await db
        .select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.id, executionId))
        .limit(1);

      if (!execution) {
        return null;
      }

      const snapshot = execution.output as { approvalRequest?: ApprovalRequest };
      return snapshot?.approvalRequest || null;
    } catch (error: any) {
      logger.error('Failed to get pending approval', {
        executionId,
        error: error.message,
      });
      return null;
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const workflowExecutionEngineV2 = new WorkflowExecutionEngineV2();
export default workflowExecutionEngineV2;
