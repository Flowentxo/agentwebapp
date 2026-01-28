/**
 * WORKFLOW EXECUTION ENGINE V3
 *
 * Enhanced version with Phase 1: Advanced Flow Control features:
 * - DAG-aware execution with TopologicalSorter
 * - Parallel wave execution for independent branches
 * - Merge Node support (wait-all/any/N)
 * - Wait Node support (timer, datetime, webhook)
 * - Suspension and resumption from any point
 *
 * Phase 2 Update: Loop & Iteration support:
 * - SplitInBatches node for iterating over large datasets
 * - Loop scope detection and node reset for re-execution
 * - Loop context variables ($runIndex, $batchIndex, $itemIndex)
 *
 * Phase 4 Update: Active Polling & Error Triggers:
 * - Error Workflow triggering on execution failures
 * - Integration with PollingService for active triggers
 * - Static data support for polling state persistence
 *
 * Extends V2 with:
 * - TopologicalSorter for execution order analysis
 * - MergeExecutorV2 for branch synchronization
 * - WaitExecutorV2 for execution suspension
 * - ResumptionWorker integration for scheduled resumption
 * - LoopController for iteration management
 * - SplitInBatchesExecutor for batch processing
 * - ErrorTriggerService for error workflow handling
 */

import { Node, Edge } from 'reactflow';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db';
import { workflowExecutions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

// Import V2 engine as base
import {
  WorkflowExecutionEngineV2,
  SocketNodeStartEvent,
  SocketNodeCompleteEvent,
  SocketWorkflowCompleteEvent,
  SocketStateUpdateEvent,
} from './WorkflowExecutionEngineV2';

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
import { wrapError, isWorkflowError } from '@/types/workflow-errors';

// Import new Phase 1 components
import { TopologicalSorter, analyzeWorkflowDAG, createTopologicalSorter, DAGAnalysis, ExecutionWave } from './execution/TopologicalSorter';
import { MergeExecutorV2, getMergeExecutor, MergeExecutorConfig, BranchOutput } from './executors/MergeExecutorV2';
import { WaitExecutorV2, getWaitExecutor, WaitContext, WaitResult } from './executors/WaitExecutorV2';
import { getResumptionWorker } from '../workers/resumption-worker';
import {
  ExecutionStateSnapshot,
  WaitNodeConfig,
  MergeNodeConfig,
} from '@/lib/db/schema-flow-control';

// Import Phase 2 loop components
import {
  LoopController,
  getLoopController,
  LoopScope,
  LoopContext,
  ExecutionState as LoopExecutionState,
} from './execution/LoopController';
import {
  SplitInBatchesExecutor,
  getSplitInBatchesExecutor,
  SplitInBatchesConfig,
  SplitInBatchesInput,
  SplitInBatchesOutput,
  shouldContinueLoop,
  isLoopComplete,
} from './executors/SplitInBatchesExecutor';

// Import existing services
import { VariableService, storeNodeOutput, createInitialState } from './VariableService';
import { budgetService } from './BudgetService';
import { workflowCostEstimator } from './WorkflowCostEstimator';
import { pipelineContextManager } from './PipelineContextManager';
import { flightRecorder } from './FlightRecorderIntegration';
import { io, emitWorkflowUpdate, emitPipelineUpdate } from '@/server/socket';

// Import Phase 4: Error Trigger Service
import {
  ErrorTriggerService,
  getErrorTriggerService,
  ErrorTriggerContext,
  ExecutionError,
} from './triggers/ErrorTriggerService';
import { workflows } from '@/lib/db/schema-workflows';

// Import Phase 5: Credentials & Sub-Workflow
import {
  CredentialService,
  getCredentialService,
  CredentialAccessContext,
} from './security/CredentialService';
import {
  ExecuteWorkflowExecutor,
  getExecuteWorkflowExecutor,
  SubWorkflowResult,
} from './executors/ExecuteWorkflowExecutor';
import { SubWorkflowContext } from '@/lib/db/schema-credentials';

// Import Phase 6: Developer Experience
import {
  DataPinningService,
  getDataPinningService,
  PinCheckResult,
} from './dx/DataPinningService';
import {
  ExecutionHistoryService,
  getExecutionHistoryService,
} from './dx/ExecutionHistoryService';
import {
  SchemaDiscoveryService,
  getSchemaDiscoveryService,
} from './dx/SchemaDiscoveryService';

const logger = createLogger('workflow-engine-v3');

// ============================================================================
// TYPES
// ============================================================================

export interface DAGExecutionOptions extends ExecutionOptions {
  /** Enable parallel execution of independent nodes */
  enableParallelExecution?: boolean;
  /** Maximum concurrent nodes per wave */
  maxConcurrentNodes?: number;
  /** Enable debug mode with detailed logging */
  debugMode?: boolean;
}

export interface BranchExecutionState {
  branchId: string;
  sourceNodeId: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'suspended';
  startedAt?: number;
  completedAt?: number;
  output?: unknown[];
  error?: string;
}

export interface ParallelExecutionResult {
  nodeId: string;
  success: boolean;
  output: unknown;
  error?: string;
  durationMs: number;
}

// ============================================================================
// MERGE NODE EXECUTOR
// ============================================================================

class MergeNodeExecutor implements INodeExecutor {
  private mergeExecutor = getMergeExecutor();

  async execute(input: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const { node, context, inputs } = input;
    const nodeId = node.id;

    // Get merge configuration from node data
    const config: MergeNodeConfig = {
      strategy: node.data?.strategy || 'wait_all',
      dataMode: node.data?.dataMode || 'append',
      waitCount: node.data?.waitCount,
      keyField: node.data?.keyField,
      timeout: node.data?.timeout,
      conflictResolution: node.data?.conflictResolution || 'last',
    };

    // Get expected branch count from incoming edges
    const incomingEdges = context.edges.filter(e => e.target === nodeId);
    const expectedBranches = incomingEdges.length;

    // Create executor config
    const executorConfig: MergeExecutorConfig = {
      executionId: context.executionId,
      mergeNodeId: nodeId,
      expectedBranches,
      config,
    };

    // Record this branch's completion
    // The branchId is derived from the source node that led here
    const branchId = inputs._branchId || `branch-${Date.now()}`;
    const sourceNodeId = inputs._sourceNodeId || 'unknown';

    const branchOutput: BranchOutput = {
      branchId,
      nodeId: sourceNodeId,
      items: Array.isArray(inputs.previousOutput) ? inputs.previousOutput : [inputs.previousOutput],
      metadata: { timestamp: new Date().toISOString() },
    };

    const result = await this.mergeExecutor.recordBranchCompletion(executorConfig, branchOutput);

    if (result.isComplete) {
      // All required branches have completed, continue with merged output
      return {
        data: {
          items: result.items,
          contributingBranches: result.contributingBranches,
          mergeStrategy: config.strategy,
          dataMode: config.dataMode,
        },
        success: true,
      };
    }

    // Not all branches complete yet - return special status to pause this path
    return {
      data: {
        status: 'WAITING_FOR_BRANCHES',
        pendingBranches: result.pendingBranches,
        completedBranches: result.contributingBranches,
        expectedBranches,
      },
      success: true,
      meta: {
        waitingForMerge: true,
      },
    };
  }
}

// ============================================================================
// WAIT NODE EXECUTOR
// ============================================================================

class WaitNodeExecutor implements INodeExecutor {
  private waitExecutor = getWaitExecutor();

  async execute(input: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const { node, context, inputs } = input;

    // Get wait configuration from node data
    const config: WaitNodeConfig = {
      type: node.data?.waitType || 'timer',
      duration: node.data?.duration,
      durationUnit: node.data?.durationUnit,
      targetDatetime: node.data?.targetDatetime,
      timezone: node.data?.timezone,
      webhook: node.data?.webhook,
      condition: node.data?.condition,
      timeout: (node.data?.timeout || 24) * 60 * 60 * 1000, // Convert hours to ms
      onTimeout: node.data?.onTimeout || 'error',
    };

    // Build execution state snapshot for resumption
    const executionState: ExecutionStateSnapshot = {
      currentNodeId: node.id,
      nodeOutputs: Object.fromEntries(
        Object.entries(context.state.nodes).map(([k, v]) => [k, v.output])
      ) as Record<string, unknown[]>,
      triggerData: context.state.trigger.payload,
      globalVariables: context.state.variables,
      currentItems: Array.isArray(inputs.previousOutput) ? inputs.previousOutput : [inputs.previousOutput],
      context: {
        startedAt: new Date(context.startTime).toISOString(),
        userId: context.userId,
        executionMode: 'manual',
      },
      pendingNodes: this.findPendingNodes(node.id, context),
    };

    // Create wait context
    const waitContext: WaitContext = {
      workflowId: context.workflowId,
      executionId: context.executionId,
      nodeId: node.id,
      userId: context.userId,
    };

    // Start the wait
    const result = await this.waitExecutor.startWait(waitContext, config, executionState);

    if (!result.success) {
      return {
        data: null,
        success: false,
        error: result.error,
      };
    }

    // Return suspension status
    return {
      data: {
        executionStatus: 'SUSPENDED',
        suspensionId: result.suspensionId,
        storageRoute: result.storageRoute,
        resumeAt: result.resumeAt?.toISOString(),
        webhookUrl: result.webhookUrl,
        correlationId: result.correlationId,
        reason: `Waiting: ${config.type}`,
        waitType: config.type,
      },
      success: true,
      meta: {
        suspended: true,
        suspensionId: result.suspensionId,
      },
    };
  }

  /**
   * Find nodes that are pending execution after this wait node
   */
  private findPendingNodes(waitNodeId: string, context: ExecutionContext): string[] {
    const pending: string[] = [];
    const visited = new Set<string>();

    const findDownstream = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const outgoing = context.edges.filter(e => e.source === nodeId);
      for (const edge of outgoing) {
        const targetState = context.state.nodes[edge.target];
        if (!targetState || targetState.meta.status === 'pending') {
          pending.push(edge.target);
        }
        findDownstream(edge.target);
      }
    };

    findDownstream(waitNodeId);
    return pending;
  }
}

// ============================================================================
// SPLIT IN BATCHES NODE EXECUTOR
// ============================================================================

class SplitInBatchesNodeExecutor implements INodeExecutor {
  private splitExecutor = getSplitInBatchesExecutor();
  private loopController = getLoopController();

  async execute(input: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const { node, context, inputs } = input;
    const nodeId = node.id;

    // Get configuration from node data
    const config: SplitInBatchesConfig = {
      batchSize: node.data?.batchSize || 10,
      resetOnNewInput: node.data?.resetOnNewInput !== false,
      aggregateResults: node.data?.aggregateResults !== false,
      maxIterations: node.data?.maxIterations || 1000,
      continueOnError: node.data?.continueOnError || false,
      batchKeyField: node.data?.batchKeyField,
    };

    // Prepare input
    const splitInput: SplitInBatchesInput = {
      items: Array.isArray(inputs.previousOutput)
        ? inputs.previousOutput
        : inputs.items || [],
      iterationResults: inputs._iterationResults,
      reset: inputs._reset,
    };

    // Get or create loop execution state
    let loopState: LoopExecutionState = (context as any)._loopState || this.loopController.createInitialState();

    // Execute
    const executorContext = {
      nodeId,
      executionId: context.executionId,
      state: loopState,
      config,
    };

    const { output, state: newLoopState } = await this.splitExecutor.execute(splitInput, executorContext);

    // Update context with new loop state
    (context as any)._loopState = newLoopState;

    if (output.outputPath === 'loop') {
      // Return batch for processing through loop path
      return {
        data: {
          items: output.items,
          outputPath: 'loop',
          context: output.context,
          meta: output.meta,
        },
        success: true,
        meta: {
          outputPath: 'loop',
          loopContext: output.context,
          continueLoop: true,
        },
      };
    } else {
      // Loop complete, return aggregated results through 'done' path
      return {
        data: {
          items: output.aggregatedResults || [],
          outputPath: 'done',
          meta: output.meta,
        },
        success: true,
        meta: {
          outputPath: 'done',
          continueLoop: false,
        },
      };
    }
  }
}

// ============================================================================
// WEBHOOK WAIT NODE EXECUTOR
// ============================================================================

class WebhookWaitNodeExecutor implements INodeExecutor {
  private waitExecutor = getWaitExecutor();

  async execute(input: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const { node, context, inputs } = input;

    // Build webhook wait configuration
    const config: WaitNodeConfig = {
      type: 'webhook',
      webhook: {
        generatePath: node.data?.generatePath !== false,
        customPath: node.data?.customPath,
        method: node.data?.method || 'POST',
        responseBody: node.data?.responseBody,
        secretToken: node.data?.secretToken,
        allowedIps: node.data?.allowedIps?.split(',').map((ip: string) => ip.trim()).filter(Boolean),
      },
      timeout: (node.data?.timeout || 24) * 60 * 60 * 1000,
      onTimeout: node.data?.onTimeout || 'error',
    };

    // Build execution state snapshot
    const executionState: ExecutionStateSnapshot = {
      currentNodeId: node.id,
      nodeOutputs: Object.fromEntries(
        Object.entries(context.state.nodes).map(([k, v]) => [k, v.output])
      ) as Record<string, unknown[]>,
      triggerData: context.state.trigger.payload,
      globalVariables: context.state.variables,
      currentItems: Array.isArray(inputs.previousOutput) ? inputs.previousOutput : [inputs.previousOutput],
      context: {
        startedAt: new Date(context.startTime).toISOString(),
        userId: context.userId,
        executionMode: 'manual',
      },
      pendingNodes: [],
    };

    const waitContext: WaitContext = {
      workflowId: context.workflowId,
      executionId: context.executionId,
      nodeId: node.id,
      userId: context.userId,
    };

    const result = await this.waitExecutor.startWait(waitContext, config, executionState);

    if (!result.success) {
      return {
        data: null,
        success: false,
        error: result.error,
      };
    }

    return {
      data: {
        executionStatus: 'SUSPENDED',
        suspensionId: result.suspensionId,
        webhookUrl: result.webhookUrl,
        correlationId: result.correlationId,
        method: config.webhook?.method,
        reason: 'Waiting for webhook callback',
      },
      success: true,
      meta: {
        suspended: true,
        suspensionId: result.suspensionId,
      },
    };
  }
}

// ============================================================================
// WORKFLOW EXECUTION ENGINE V3
// ============================================================================

export class WorkflowExecutionEngineV3 extends WorkflowExecutionEngineV2 {
  private dagAnalysisCache: Map<string, DAGAnalysis> = new Map();
  private loopController: LoopController;
  private loopScopesCache: Map<string, Map<string, LoopScope>> = new Map();
  private errorTriggerService: ErrorTriggerService;
  private credentialService: CredentialService;
  private executeWorkflowExecutor: ExecuteWorkflowExecutor;

  // Phase 6: Developer Experience services
  private dataPinningService: DataPinningService;
  private executionHistoryService: ExecutionHistoryService;
  private schemaDiscoveryService: SchemaDiscoveryService;

  constructor() {
    super();
    this.loopController = getLoopController();
    this.errorTriggerService = getErrorTriggerService();
    this.credentialService = getCredentialService();
    this.executeWorkflowExecutor = getExecuteWorkflowExecutor();

    // Phase 6: Initialize DX services
    this.dataPinningService = getDataPinningService();
    this.executionHistoryService = getExecutionHistoryService();
    this.schemaDiscoveryService = getSchemaDiscoveryService();

    this.registerFlowControlExecutors();
    this.initializeErrorTriggerService();
    this.initializeSubWorkflowSupport();
  }

  /**
   * Initialize the error trigger service with workflow trigger callback
   */
  private initializeErrorTriggerService(): void {
    this.errorTriggerService.setWorkflowTrigger(async (workflowId, triggerData, context) => {
      try {
        // Load the error workflow definition
        const db = getDb();
        const [workflow] = await db
          .select()
          .from(workflows)
          .where(eq(workflows.id, workflowId))
          .limit(1);

        if (!workflow || !workflow.nodes || !workflow.edges) {
          logger.error('Error workflow not found or invalid', { workflowId });
          return null;
        }

        // Execute the error workflow
        const errorContext = await this.executeWorkflowDAG(
          workflowId,
          workflow.nodes as Node[],
          workflow.edges as Edge[],
          context.errorContext.execution.id, // Use parent execution's userId
          {
            $execution: (triggerData as any).$execution,
            $error: context.errorContext.error,
            $workflow: context.errorContext.workflow,
          },
          {
            skipBudgetCheck: true, // Error workflows shouldn't be blocked by budget
            enableParallelExecution: true,
          }
        );

        return errorContext.executionId;
      } catch (error) {
        logger.error('Failed to trigger error workflow', {
          workflowId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return null;
      }
    });

    logger.info('Error trigger service initialized');
  }

  /**
   * Initialize sub-workflow execution support
   */
  private initializeSubWorkflowSupport(): void {
    // Set up the callback for executing child workflows
    this.executeWorkflowExecutor.setExecuteCallback(async (
      workflowId: string,
      input: unknown,
      subContext: SubWorkflowContext
    ) => {
      // Load the workflow definition
      const db = getDb();
      const [workflow] = await db
        .select()
        .from(workflows)
        .where(eq(workflows.id, workflowId))
        .limit(1);

      if (!workflow || !workflow.nodes || !workflow.edges) {
        throw new Error(`Workflow not found or invalid: ${workflowId}`);
      }

      // Execute the child workflow with inherited context
      const childContext = await this.executeWorkflowDAG(
        workflowId,
        workflow.nodes as Node[],
        workflow.edges as Edge[],
        subContext.parentExecutionId, // Use parent's userId context
        input as any,
        {
          skipBudgetCheck: false,
          enableParallelExecution: true,
          variables: subContext.inheritedVariables,
        }
      );

      return childContext.executionId;
    });

    // Register the executor
    this.registerExecutor('executeWorkflow', this.executeWorkflowExecutor);
    this.registerExecutor('execute-workflow', this.executeWorkflowExecutor);
    this.registerExecutor('subworkflow', this.executeWorkflowExecutor);

    logger.info('Sub-workflow support initialized');
  }

  /**
   * Register Phase 1 & 2 flow control executors
   */
  private registerFlowControlExecutors(): void {
    // Phase 1: Flow Control
    this.registerExecutor('merge', new MergeNodeExecutor());
    this.registerExecutor('wait', new WaitNodeExecutor());
    this.registerExecutor('sleep', new WaitNodeExecutor()); // Alias
    this.registerExecutor('webhook-wait', new WebhookWaitNodeExecutor());

    // Phase 2: Loops & Iteration
    this.registerExecutor('splitInBatches', new SplitInBatchesNodeExecutor());
    this.registerExecutor('split-in-batches', new SplitInBatchesNodeExecutor()); // Alias
    this.registerExecutor('SplitInBatches', new SplitInBatchesNodeExecutor()); // Alias
    this.registerExecutor('loop', new SplitInBatchesNodeExecutor()); // Alias
    this.registerExecutor('forEach', new SplitInBatchesNodeExecutor()); // Alias

    logger.info('Flow control executors registered (Phase 1 & 2)');
  }

  /**
   * Execute workflow with DAG-aware parallel execution
   */
  async executeWorkflowDAG(
    workflowId: string,
    nodes: Node[],
    edges: Edge[],
    userId: string,
    triggerPayload: any = {},
    options: DAGExecutionOptions = {}
  ): Promise<ExecutionContext> {
    const executionId = randomUUID();
    const startTime = Date.now();

    // Analyze the DAG structure (loop edges are automatically excluded)
    const sorter = createTopologicalSorter(nodes, edges);
    const dagAnalysis = sorter.analyze();

    if (!dagAnalysis.isValid) {
      throw new Error(`Invalid workflow graph: Cycle detected at ${dagAnalysis.cyclePath?.join(' -> ')}`);
    }

    // Cache the analysis for this execution
    this.dagAnalysisCache.set(executionId, dagAnalysis);

    // Detect loop scopes for any SplitInBatches nodes
    const loopScopes = new Map<string, LoopScope>();
    for (const loopNodeId of dagAnalysis.loopNodes) {
      const scope = this.loopController.detectLoopScope(loopNodeId, nodes as any, edges as any);
      loopScopes.set(loopNodeId, scope);
    }
    this.loopScopesCache.set(executionId, loopScopes);

    logger.info('DAG analysis complete', {
      executionId,
      workflowId,
      waves: dagAnalysis.waves.length,
      mergePoints: dagAnalysis.mergePoints.length,
      branchPoints: dagAnalysis.branchPoints.length,
      loopNodes: dagAnalysis.loopNodes.length,
      criticalPathLength: dagAnalysis.sortedNodes.length,
    });

    // Create initial state
    const state = createInitialState(userId, 'manual', triggerPayload, {
      isTest: options.skipBudgetCheck ?? true,
      variables: options.variables,
    });

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

    // Store active execution
    (this as any).activeExecutions.set(executionId, context);

    try {
      // Create execution record
      await this.createExecutionRecordV3(context);

      // Initialize pipeline context
      await pipelineContextManager.initializeContext(executionId, workflowId, state.variables);

      // Start Flight Recorder
      await flightRecorder.startRun(executionId, workflowId, userId, {
        triggerType: 'manual',
        triggerPayload,
        nodesTotal: nodes.length,
        wavesTotal: dagAnalysis.waves.length,
        executionMode: 'dag-parallel',
      });

      context.status = 'running';
      this.addLogV3(context, 'workflow', 'Workflow', 'info', 'DAG execution started', {
        waves: dagAnalysis.waves.length,
        parallelEnabled: options.enableParallelExecution !== false,
      });

      // Execute waves
      if (options.enableParallelExecution !== false) {
        await this.executeWavesParallel(context, dagAnalysis.waves, options);
      } else {
        await this.executeWavesSequential(context, dagAnalysis);
      }

      // Check final status
      if (context.status !== 'suspended') {
        context.status = 'completed';
        this.addLogV3(context, 'workflow', 'Workflow', 'success', 'DAG execution completed');
        await flightRecorder.endRun(executionId, 'completed', { finalOutput: context.state });
        this.emitWorkflowComplete(context);
      }

    } catch (error: unknown) {
      const workflowError = isWorkflowError(error) ? error : wrapError(error);
      context.status = 'error';
      context.error = workflowError.message;
      context.errorCode = workflowError.code;

      this.addLogV3(context, 'workflow', 'Workflow', 'error', `DAG execution failed: ${workflowError.message}`);
      await flightRecorder.endRun(executionId, 'failed', { error: workflowError.message });
      this.emitFatalError(context, workflowError);

      // Phase 4: Trigger error workflows
      await this.handleExecutionError(context, workflowError);

    } finally {
      await this.updateExecutionRecordV3(context);
      this.dagAnalysisCache.delete(executionId);
      this.loopScopesCache.delete(executionId);

      // Cleanup after 5 minutes
      setTimeout(() => {
        (this as any).activeExecutions.delete(executionId);
      }, 5 * 60 * 1000);
    }

    return context;
  }

  /**
   * Execute waves in parallel
   */
  private async executeWavesParallel(
    context: ExecutionContext,
    waves: ExecutionWave[],
    options: DAGExecutionOptions
  ): Promise<void> {
    const maxConcurrent = options.maxConcurrentNodes || 5;

    for (const wave of waves) {
      if (context.status === 'suspended' || context.status === 'error') {
        break;
      }

      logger.debug('Executing wave', {
        waveIndex: wave.waveIndex,
        nodeCount: wave.nodeIds.length,
      });

      // Execute all nodes in this wave in parallel (with concurrency limit)
      const results = await this.executeNodesParallel(
        context,
        wave.nodeIds,
        maxConcurrent
      );

      // Check for any suspensions, errors, or loop continuations
      for (const result of results) {
        if (!result.success) {
          // Check node error handling policy
          const node = context.nodes.find(n => n.id === result.nodeId);
          const onError = node?.data?.onError || 'stop';

          if (onError === 'stop') {
            context.status = 'error';
            context.error = result.error;
            return;
          }
        }

        // Check for suspension (wait nodes, merge nodes waiting for branches)
        const nodeState = context.state.nodes[result.nodeId];
        if (nodeState?.output?.executionStatus === 'SUSPENDED') {
          context.status = 'suspended';
          context.suspendedNodeId = result.nodeId;
          return;
        }

        // Check for loop continuation (SplitInBatches returning 'loop' path)
        if (nodeState?.meta?.continueLoop === true) {
          // Execute loop iteration
          await this.executeLoopIteration(context, result.nodeId, options);
        }
      }
    }
  }

  /**
   * Execute a loop iteration for SplitInBatches node
   */
  private async executeLoopIteration(
    context: ExecutionContext,
    loopNodeId: string,
    options: DAGExecutionOptions
  ): Promise<void> {
    const loopScopes = this.loopScopesCache.get(context.executionId);
    const scope = loopScopes?.get(loopNodeId);

    if (!scope) {
      logger.warn('Loop scope not found for iteration', { loopNodeId });
      return;
    }

    const loopState = (context as any)._loopState as LoopExecutionState | undefined;
    const maxIterations = 1000; // Safety limit
    let iterations = 0;

    while (iterations < maxIterations) {
      iterations++;

      // Get the current loop context
      const currentContext = loopState?.loopContextStack.find(c => c.loopNodeId === loopNodeId);
      if (!currentContext) break;

      logger.debug('Executing loop iteration', {
        loopNodeId,
        runIndex: currentContext.runIndex,
        itemIndex: currentContext.itemIndex,
      });

      // Reset nodes within the loop scope for re-execution
      const resetState = this.loopController.resetNodesForIteration(
        loopState!,
        scope.nodeIds
      );
      (context as any)._loopState = resetState;

      // Clear node states in context for nodes in loop scope
      for (const nodeId of scope.nodeIds) {
        delete context.state.nodes[nodeId];
      }

      // Execute loop scope nodes
      const scopeNodeIds = Array.from(scope.nodeIds);
      const results = await this.executeNodesParallel(
        context,
        scopeNodeIds,
        options.maxConcurrentNodes || 5
      );

      // Check for errors in loop iteration
      for (const result of results) {
        if (!result.success) {
          const node = context.nodes.find(n => n.id === result.nodeId);
          const continueOnError = node?.data?.continueOnError ?? false;

          if (!continueOnError) {
            context.status = 'error';
            context.error = `Loop iteration failed: ${result.error}`;
            return;
          }
        }
      }

      // Collect iteration results from feedback nodes
      const feedbackResults: unknown[] = [];
      for (const feedbackNodeId of scope.feedbackNodeIds) {
        const nodeOutput = context.state.nodes[feedbackNodeId]?.output;
        if (nodeOutput) {
          if (Array.isArray(nodeOutput)) {
            feedbackResults.push(...nodeOutput);
          } else {
            feedbackResults.push(nodeOutput);
          }
        }
      }

      // Re-execute the SplitInBatches node to get next batch
      const loopNode = context.nodes.find(n => n.id === loopNodeId);
      if (!loopNode) break;

      const loopNodeState = context.state.nodes[loopNodeId];
      const nextInput = {
        previousOutput: [],
        _iterationResults: feedbackResults,
      };

      // Execute loop node again
      await (this as any).executeNode(loopNode, context, nextInput);

      // Check if loop is complete
      const updatedLoopState = context.state.nodes[loopNodeId];
      if (updatedLoopState?.meta?.continueLoop === false) {
        logger.info('Loop completed', {
          loopNodeId,
          totalIterations: iterations,
        });
        break;
      }
    }

    if (iterations >= maxIterations) {
      logger.warn('Loop reached maximum iterations', { loopNodeId, maxIterations });
    }
  }

  /**
   * Execute multiple nodes in parallel with concurrency limit
   */
  private async executeNodesParallel(
    context: ExecutionContext,
    nodeIds: string[],
    maxConcurrent: number
  ): Promise<ParallelExecutionResult[]> {
    const results: ParallelExecutionResult[] = [];
    const executing: Promise<void>[] = [];

    for (const nodeId of nodeIds) {
      const node = context.nodes.find(n => n.id === nodeId);
      if (!node) continue;

      const promise = (async () => {
        const startTime = Date.now();
        try {
          // Get inputs from parent nodes
          const parentOutputs = this.collectParentOutputs(nodeId, context);

          // Execute the node using V2's executeNode method
          await (this as any).executeNode(node, context, parentOutputs);

          results.push({
            nodeId,
            success: true,
            output: context.state.nodes[nodeId]?.output,
            durationMs: Date.now() - startTime,
          });
        } catch (error: any) {
          results.push({
            nodeId,
            success: false,
            output: null,
            error: error.message,
            durationMs: Date.now() - startTime,
          });
        }
      })();

      executing.push(promise);

      // Limit concurrency
      if (executing.length >= maxConcurrent) {
        await Promise.race(executing);
        // Remove completed promises
        for (let i = executing.length - 1; i >= 0; i--) {
          try {
            await Promise.race([executing[i], Promise.resolve('pending')]);
            executing.splice(i, 1);
          } catch {
            // Promise not yet resolved
          }
        }
      }
    }

    // Wait for remaining
    await Promise.all(executing);

    return results;
  }

  /**
   * Execute waves sequentially (fallback/debug mode)
   */
  private async executeWavesSequential(
    context: ExecutionContext,
    dagAnalysis: DAGAnalysis
  ): Promise<void> {
    for (const nodeId of dagAnalysis.sortedNodes) {
      if (context.status === 'suspended' || context.status === 'error') {
        break;
      }

      const node = context.nodes.find(n => n.id === nodeId);
      if (!node) continue;

      const parentOutputs = this.collectParentOutputs(nodeId, context);
      await (this as any).executeNode(node, context, parentOutputs);
    }
  }

  /**
   * Collect outputs from parent nodes
   */
  private collectParentOutputs(nodeId: string, context: ExecutionContext): unknown {
    const parentEdges = context.edges.filter(e => e.target === nodeId);

    if (parentEdges.length === 0) {
      return context.state.trigger.payload;
    }

    if (parentEdges.length === 1) {
      const parentId = parentEdges[0].source;
      return context.state.nodes[parentId]?.output;
    }

    // Multiple parents - return map of parent outputs
    const outputs: Record<string, unknown> = {};
    for (const edge of parentEdges) {
      outputs[edge.source] = context.state.nodes[edge.source]?.output;
    }
    return outputs;
  }

  /**
   * Resume a suspended execution from wait node
   */
  async resumeFromWait(
    suspensionId: string,
    resumePayload?: Record<string, unknown>
  ): Promise<ExecutionContext> {
    const waitExecutor = getWaitExecutor();

    // Resume the suspension
    const resumeResult = await waitExecutor.resumeExecution({
      suspensionId,
      triggerType: 'manual_trigger',
      payload: resumePayload,
      metadata: { triggeredAt: new Date().toISOString() },
    });

    if (!resumeResult.success || !resumeResult.suspension) {
      throw new Error(resumeResult.error || 'Failed to resume execution');
    }

    const suspension = resumeResult.suspension;
    const executionState = resumeResult.executionState as ExecutionStateSnapshot;

    // Reconstruct execution context
    const db = getDb();
    const [execution] = await db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, suspension.executionId))
      .limit(1);

    if (!execution) {
      throw new Error('Execution record not found');
    }

    // Rebuild context from snapshot
    const context: ExecutionContext = {
      executionId: suspension.executionId,
      workflowId: suspension.workflowId,
      userId: executionState.context.userId || 'unknown',
      isTest: false,
      startTime: new Date(executionState.context.startedAt).getTime(),
      state: {
        global: executionState.globalVariables as any,
        nodes: this.rebuildNodeStates(executionState.nodeOutputs),
        variables: executionState.globalVariables,
        trigger: {
          type: executionState.context.executionMode,
          payload: executionState.triggerData,
        },
      },
      logs: execution.logs as any[] || [],
      status: 'running',
      currentNodeId: suspension.nodeId,
      nodes: [], // Will be loaded
      edges: [], // Will be loaded
      budget: {
        enabled: false,
        totalCostIncurred: 0,
        remainingBudget: 0,
      },
    };

    // TODO: Load nodes and edges from workflow definition
    // For now, we need to continue execution from the pending nodes

    logger.info('Execution resumed from wait', {
      executionId: suspension.executionId,
      suspensionId,
      resumedFromNode: suspension.nodeId,
    });

    return context;
  }

  /**
   * Rebuild node states from snapshot
   */
  private rebuildNodeStates(nodeOutputs: Record<string, unknown[]>): Record<string, any> {
    const states: Record<string, any> = {};

    for (const [nodeId, output] of Object.entries(nodeOutputs)) {
      states[nodeId] = {
        output,
        meta: {
          status: 'completed',
          startedAt: Date.now(),
          completedAt: Date.now(),
        },
      };
    }

    return states;
  }

  /**
   * Add log entry (V3 version)
   */
  private addLogV3(
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

    const logFn = level === 'error' ? logger.error : level === 'warn' ? logger.warn : logger.info;
    logFn.call(logger, `[${nodeId}] ${message}`, { nodeName, ...data });
  }

  /**
   * Create execution record (V3 version)
   */
  private async createExecutionRecordV3(context: ExecutionContext): Promise<void> {
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
  }

  /**
   * Update execution record (V3 version)
   */
  private async updateExecutionRecordV3(context: ExecutionContext): Promise<void> {
    const db = getDb();
    const durationMs = Date.now() - context.startTime;

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
  }

  /**
   * Get DAG analysis for debugging
   */
  getDAGAnalysis(executionId: string): DAGAnalysis | undefined {
    return this.dagAnalysisCache.get(executionId);
  }

  /**
   * Analyze workflow DAG without executing
   */
  analyzeWorkflow(nodes: Node[], edges: Edge[]): DAGAnalysis {
    return analyzeWorkflowDAG(nodes, edges);
  }

  // ============================================================================
  // PHASE 4: ERROR WORKFLOW HANDLING
  // ============================================================================

  /**
   * Handle execution error by triggering configured error workflows
   */
  private async handleExecutionError(
    context: ExecutionContext,
    error: any
  ): Promise<void> {
    try {
      // Get workflow name for error context
      const db = getDb();
      const [workflow] = await db
        .select({ name: workflows.name })
        .from(workflows)
        .where(eq(workflows.id, context.workflowId))
        .limit(1);

      const workflowName = workflow?.name || 'Unknown Workflow';

      // Find the node that caused the error
      const errorNodeId = context.currentNodeId || this.findErrorNode(context);
      const errorNode = errorNodeId
        ? context.nodes.find(n => n.id === errorNodeId)
        : undefined;

      // Build error context
      const executionError: ExecutionError = {
        message: error.message || String(error),
        nodeId: errorNodeId || undefined,
        nodeName: errorNode?.data?.name || errorNode?.data?.label,
        nodeType: errorNode?.type,
        stack: error.stack,
        code: error.code,
        severity: this.determineErrorSeverity(error),
        timestamp: new Date(),
      };

      const errorTriggerContext: ErrorTriggerContext = {
        workflowId: context.workflowId,
        workflowName,
        executionId: context.executionId,
        executionMode: context.isTest ? 'test' : 'production',
        executionStartedAt: new Date(context.startTime),
        executionFinishedAt: new Date(),
        error: executionError,
        lastSuccessfulOutput: this.getLastSuccessfulOutput(context),
        metadata: {
          userId: context.userId,
          budget: context.budget,
          logsCount: context.logs.length,
        },
      };

      // Trigger error workflows
      const results = await this.errorTriggerService.handleError(errorTriggerContext);

      // Log results
      for (const result of results) {
        if (result.triggered) {
          logger.info('Error workflow triggered', {
            executionId: context.executionId,
            errorWorkflowConfigId: result.errorWorkflowConfigId,
            errorExecutionId: result.errorExecutionId,
          });

          this.addLogV3(
            context,
            'workflow',
            'Workflow',
            'info',
            `Error workflow triggered: ${result.errorExecutionId}`
          );
        } else if (result.error) {
          logger.warn('Failed to trigger error workflow', {
            executionId: context.executionId,
            errorWorkflowConfigId: result.errorWorkflowConfigId,
            error: result.error,
          });
        }
      }
    } catch (triggerError) {
      // Don't let error workflow failures affect the main error handling
      logger.error('Failed to handle execution error', {
        executionId: context.executionId,
        error: triggerError instanceof Error ? triggerError.message : 'Unknown error',
      });
    }
  }

  /**
   * Find the node that caused the error
   */
  private findErrorNode(context: ExecutionContext): string | null {
    // Check node states for errors
    for (const [nodeId, nodeState] of Object.entries(context.state.nodes)) {
      if (nodeState?.meta?.status === 'error') {
        return nodeId;
      }
    }

    // Check logs for the last node that was executing
    const errorLogs = context.logs.filter(l => l.level === 'error');
    if (errorLogs.length > 0) {
      return errorLogs[errorLogs.length - 1].nodeId || null;
    }

    return null;
  }

  /**
   * Determine error severity based on error type
   */
  private determineErrorSeverity(error: any): 'warning' | 'error' | 'fatal' {
    // Check for known fatal error codes
    const fatalCodes = ['BUDGET_EXCEEDED', 'AUTH_FAILED', 'WORKFLOW_NOT_FOUND', 'RECURSION_LIMIT'];
    if (error.code && fatalCodes.includes(error.code)) {
      return 'fatal';
    }

    // Check for timeout errors
    if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
      return 'error';
    }

    // Check for validation errors (usually recoverable)
    if (error.code === 'VALIDATION_ERROR' || error.message?.includes('validation')) {
      return 'warning';
    }

    return 'error';
  }

  /**
   * Get the last successful output for debugging
   */
  private getLastSuccessfulOutput(context: ExecutionContext): unknown {
    const completedNodes = Object.entries(context.state.nodes)
      .filter(([_, state]) => state?.meta?.status === 'completed')
      .sort((a, b) => (b[1].meta?.completedAt || 0) - (a[1].meta?.completedAt || 0));

    if (completedNodes.length > 0) {
      return {
        nodeId: completedNodes[0][0],
        output: completedNodes[0][1].output,
      };
    }

    return null;
  }

  /**
   * Configure an error workflow for a source workflow
   */
  async configureErrorWorkflow(
    sourceWorkflowId: string,
    errorWorkflowId: string,
    options: {
      mode?: 'all_errors' | 'fatal_only' | 'node_specific' | 'custom_filter';
      filterConfig?: {
        nodeTypes?: string[];
        nodeIds?: string[];
        messagePatterns?: string[];
        errorCodes?: string[];
        minSeverity?: 'warning' | 'error' | 'fatal';
      };
    } = {}
  ): Promise<void> {
    await this.errorTriggerService.configureErrorWorkflow({
      sourceWorkflowId,
      errorWorkflowId,
      mode: options.mode,
      filterConfig: options.filterConfig,
    });

    logger.info('Error workflow configured', {
      sourceWorkflowId,
      errorWorkflowId,
      mode: options.mode,
    });
  }

  /**
   * Remove an error workflow configuration
   */
  async removeErrorWorkflow(
    sourceWorkflowId: string,
    errorWorkflowId: string
  ): Promise<boolean> {
    return this.errorTriggerService.removeErrorWorkflow(sourceWorkflowId, errorWorkflowId);
  }

  /**
   * List error workflows for a source workflow
   */
  async listErrorWorkflows(sourceWorkflowId: string) {
    return this.errorTriggerService.listErrorWorkflows(sourceWorkflowId);
  }

  // ============================================================================
  // PHASE 5: CREDENTIAL RESOLUTION
  // ============================================================================

  /**
   * Resolve credential references in node configuration
   * Called just before node execution
   */
  async resolveNodeCredentials(
    nodeConfig: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const accessContext: CredentialAccessContext = {
      userId: context.userId,
      workflowId: context.workflowId,
      executionId: context.executionId,
      requestSource: 'workflow',
    };

    // Deep clone to avoid mutating original
    const resolvedConfig = JSON.parse(JSON.stringify(nodeConfig));

    // Resolve any credential references in string values
    await this.resolveCredentialReferences(resolvedConfig, accessContext);

    return resolvedConfig;
  }

  /**
   * Recursively resolve credential references in an object
   */
  private async resolveCredentialReferences(
    obj: Record<string, unknown>,
    accessContext: CredentialAccessContext
  ): Promise<void> {
    for (const key of Object.keys(obj)) {
      const value = obj[key];

      if (typeof value === 'string') {
        // Check for credential reference pattern
        if (value.includes('{{$credentials.')) {
          obj[key] = await this.credentialService.resolveReferences(value, accessContext);
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        await this.resolveCredentialReferences(value as Record<string, unknown>, accessContext);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            await this.resolveCredentialReferences(item as Record<string, unknown>, accessContext);
          }
        }
      }
    }
  }

  /**
   * Clear resolved credentials from memory after execution
   */
  clearCredentialCache(): void {
    this.credentialService.clearCache();
  }

  // ============================================================================
  // PHASE 5: CHILD WORKFLOW COMPLETION HANDLING
  // ============================================================================

  /**
   * Handle child workflow completion
   * Called when a sub-workflow finishes execution
   */
  async handleChildWorkflowComplete(
    childExecutionId: string,
    success: boolean,
    output?: unknown,
    error?: string
  ): Promise<void> {
    // Get the parent info from the executor
    const parentInfo = await this.executeWorkflowExecutor.onChildComplete(
      childExecutionId,
      success,
      output,
      error
    );

    if (!parentInfo) {
      logger.warn('No parent info found for child execution', { childExecutionId });
      return;
    }

    const { parentExecutionId, parentNodeId, result } = parentInfo;

    logger.info('Child workflow completed', {
      childExecutionId,
      parentExecutionId,
      parentNodeId,
      success,
    });

    // Resume the parent execution from the suspended node
    try {
      await this.resumeFromSubworkflow(parentExecutionId, parentNodeId, result);
    } catch (resumeError) {
      logger.error('Failed to resume parent execution', {
        parentExecutionId,
        error: resumeError instanceof Error ? resumeError.message : 'Unknown error',
      });
    }
  }

  /**
   * Resume parent execution after sub-workflow completes
   */
  private async resumeFromSubworkflow(
    parentExecutionId: string,
    nodeId: string,
    result: SubWorkflowResult
  ): Promise<void> {
    // Get the active execution context
    const context = (this as any).activeExecutions.get(parentExecutionId);

    if (!context) {
      logger.warn('Parent execution context not found', { parentExecutionId });
      // The parent might have been suspended to database
      // In a full implementation, we would restore it from the suspension state
      return;
    }

    // Update the node's output with the sub-workflow result
    context.state.nodes[nodeId] = {
      output: result,
      meta: {
        status: result.success ? 'completed' : 'error',
        completedAt: Date.now(),
        subworkflowResult: true,
      },
    };

    // If the node succeeded, continue execution
    if (result.success) {
      context.status = 'running';
      this.addLogV3(
        context,
        nodeId,
        'ExecuteWorkflow',
        'success',
        `Sub-workflow completed: ${result.executionId}`
      );

      // Continue with downstream nodes
      // This would require resuming the DAG execution from this point
      // For now, emit a status update
      this.emitStateUpdate(context);
    } else {
      context.status = 'error';
      context.error = result.error;
      this.addLogV3(
        context,
        nodeId,
        'ExecuteWorkflow',
        'error',
        `Sub-workflow failed: ${result.error}`
      );

      // Trigger error workflows
      await this.handleExecutionError(context, { message: result.error || 'Sub-workflow failed' });
    }

    // Update execution record
    await this.updateExecutionRecordV3(context);
  }

  /**
   * Emit state update for WebSocket clients
   */
  private emitStateUpdate(context: ExecutionContext): void {
    const event: SocketStateUpdateEvent = {
      executionId: context.executionId,
      workflowId: context.workflowId,
      state: context.state,
      status: context.status,
    };

    emitWorkflowUpdate(context.executionId, 'execution:state', event);
  }

  // ============================================================================
  // PHASE 6: DATA PINNING & DEVELOPER EXPERIENCE
  // ============================================================================

  /**
   * Check for pinned data before node execution
   * Returns pinned data if available and should be used, otherwise null
   */
  async checkPinnedData(
    node: Node,
    context: ExecutionContext
  ): Promise<PinCheckResult> {
    const result = await this.dataPinningService.checkPinnedData({
      workflowId: context.workflowId,
      nodeId: node.id,
      userId: context.userId,
      isTestMode: context.isTest,
    });

    if (result.shouldUsePinned && result.pinnedMeta) {
      logger.info('Using pinned data for node', {
        executionId: context.executionId,
        nodeId: node.id,
        pinId: result.pinnedMeta.id,
        mode: result.pinnedMeta.mode,
      });

      // Record usage
      await this.dataPinningService.recordPinUsage(result.pinnedMeta.id);

      // Log to execution history
      await this.executionHistoryService.logNodeExecution({
        executionId: context.executionId,
        workflowId: context.workflowId,
        nodeId: node.id,
        nodeType: node.type,
        nodeName: node.data?.name || node.data?.label,
        status: 'completed',
        runIndex: this.getCurrentRunIndex(context),
        batchIndex: this.getCurrentBatchIndex(context),
        loopId: this.getCurrentLoopId(context),
        outputData: result.pinnedData,
        startedAt: new Date(),
        completedAt: new Date(),
        metadata: {
          usedPinnedData: true,
        },
      });
    }

    return result;
  }

  /**
   * Execute node with pinned data support
   * This wraps the standard node execution to check for pins first
   */
  async executeNodeWithPinSupport(
    node: Node,
    context: ExecutionContext,
    inputs: unknown
  ): Promise<void> {
    const nodeId = node.id;
    const nodeType = node.type || 'unknown';
    const nodeName = node.data?.name || node.data?.label || nodeId;
    const startTime = new Date();

    // Check for pinned data first
    const pinResult = await this.checkPinnedData(node, context);

    if (pinResult.shouldUsePinned && pinResult.pinnedData !== undefined) {
      // Use pinned data instead of executing
      context.state.nodes[nodeId] = {
        output: pinResult.pinnedData,
        meta: {
          status: 'completed',
          startedAt: startTime.getTime(),
          completedAt: Date.now(),
          usedPinnedData: true,
          pinId: pinResult.pinnedMeta?.id,
        },
      };

      this.addLogV3(
        context,
        nodeId,
        nodeName,
        'info',
        `Using pinned data (pin: ${pinResult.pinnedMeta?.label || pinResult.pinnedMeta?.id})`
      );

      // Emit node complete event
      const completeEvent: SocketNodeCompleteEvent = {
        executionId: context.executionId,
        workflowId: context.workflowId,
        nodeId,
        nodeName,
        success: true,
        output: pinResult.pinnedData,
        durationMs: 0,
        meta: { usedPinnedData: true },
      };
      emitWorkflowUpdate(context.executionId, 'node:complete', completeEvent);

      return;
    }

    // Standard execution - delegate to parent class
    try {
      // Log start
      const logId = await this.logNodeStart(context, node);

      // Execute node
      await (this as any).executeNode(node, context, inputs);

      // Log completion
      const nodeState = context.state.nodes[nodeId];
      await this.logNodeComplete(
        context,
        node,
        logId,
        nodeState?.output,
        nodeState?.meta?.status === 'error' ? nodeState.error : undefined
      );

      // Update schema cache with new output
      if (nodeState?.output) {
        await this.updateSchemaFromExecution(context, node, nodeState.output);
      }
    } catch (error) {
      // Check if we should fall back to pinned data on error
      if (pinResult.hasPinnedData && pinResult.pinnedMeta?.mode === 'on_error') {
        logger.info('Falling back to pinned data after error', {
          executionId: context.executionId,
          nodeId,
          error: error instanceof Error ? error.message : 'Unknown',
        });

        // Fetch the pinned data (we didn't load it before because mode was on_error)
        const pinnedData = await this.dataPinningService.getPinnedData(
          context.workflowId,
          nodeId,
          context.userId
        );

        if (pinnedData) {
          context.state.nodes[nodeId] = {
            output: pinnedData.output,
            meta: {
              status: 'completed',
              startedAt: startTime.getTime(),
              completedAt: Date.now(),
              usedPinnedData: true,
              fallbackFromError: true,
              originalError: error instanceof Error ? error.message : 'Unknown',
            },
          };

          await this.dataPinningService.recordPinUsage(pinnedData.id);

          this.addLogV3(
            context,
            nodeId,
            nodeName,
            'warn',
            `Execution failed, using fallback pinned data`
          );

          return;
        }
      }

      // Re-throw if no fallback available
      throw error;
    }
  }

  /**
   * Log node execution start
   */
  private async logNodeStart(
    context: ExecutionContext,
    node: Node
  ): Promise<string> {
    const log = await this.executionHistoryService.logNodeExecution({
      executionId: context.executionId,
      workflowId: context.workflowId,
      nodeId: node.id,
      nodeType: node.type,
      nodeName: node.data?.name || node.data?.label,
      status: 'running',
      runIndex: this.getCurrentRunIndex(context),
      batchIndex: this.getCurrentBatchIndex(context),
      itemIndex: this.getCurrentItemIndex(context),
      loopId: this.getCurrentLoopId(context),
      startedAt: new Date(),
    });

    return log.id;
  }

  /**
   * Log node execution completion
   */
  private async logNodeComplete(
    context: ExecutionContext,
    node: Node,
    logId: string,
    output?: unknown,
    error?: string
  ): Promise<void> {
    await this.executionHistoryService.updateNodeLog(logId, {
      status: error ? 'error' : 'completed',
      outputData: output,
      errorData: error ? { message: error } : undefined,
      completedAt: new Date(),
    });
  }

  /**
   * Update schema cache from execution output
   */
  private async updateSchemaFromExecution(
    context: ExecutionContext,
    node: Node,
    output: unknown
  ): Promise<void> {
    try {
      // Invalidate old cache for this node
      await this.schemaDiscoveryService.invalidateCache(context.workflowId, [node.id]);
    } catch (error) {
      // Non-critical, just log
      logger.debug('Failed to invalidate schema cache', {
        nodeId: node.id,
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  /**
   * Get current run index from loop context
   */
  private getCurrentRunIndex(context: ExecutionContext): number {
    const loopState = (context as any)._loopState;
    if (loopState?.loopContextStack?.length > 0) {
      return loopState.loopContextStack[loopState.loopContextStack.length - 1].runIndex || 0;
    }
    return 0;
  }

  /**
   * Get current batch index from loop context
   */
  private getCurrentBatchIndex(context: ExecutionContext): number | undefined {
    const loopState = (context as any)._loopState;
    if (loopState?.loopContextStack?.length > 0) {
      return loopState.loopContextStack[loopState.loopContextStack.length - 1].batchIndex;
    }
    return undefined;
  }

  /**
   * Get current item index from loop context
   */
  private getCurrentItemIndex(context: ExecutionContext): number | undefined {
    const loopState = (context as any)._loopState;
    if (loopState?.loopContextStack?.length > 0) {
      return loopState.loopContextStack[loopState.loopContextStack.length - 1].itemIndex;
    }
    return undefined;
  }

  /**
   * Get current loop ID
   */
  private getCurrentLoopId(context: ExecutionContext): string | undefined {
    const loopState = (context as any)._loopState;
    if (loopState?.loopContextStack?.length > 0) {
      return loopState.loopContextStack[loopState.loopContextStack.length - 1].loopNodeId;
    }
    return undefined;
  }

  /**
   * Pin a node's output for future executions
   */
  async pinNodeOutput(
    workflowId: string,
    nodeId: string,
    userId: string,
    output: unknown,
    options: {
      mode?: 'always' | 'on_error' | 'development' | 'disabled';
      label?: string;
      description?: string;
      sourceExecutionId?: string;
    } = {}
  ): Promise<void> {
    await this.dataPinningService.pinNodeData({
      workflowId,
      nodeId,
      userId,
      output,
      mode: options.mode || 'development',
      label: options.label,
      description: options.description,
      sourceExecutionId: options.sourceExecutionId,
    });

    logger.info('Pinned node output', {
      workflowId,
      nodeId,
      userId,
      mode: options.mode || 'development',
    });
  }

  /**
   * Get pinned data for a node
   */
  async getPinnedData(
    workflowId: string,
    nodeId: string,
    userId: string
  ) {
    return this.dataPinningService.getPinnedData(workflowId, nodeId, userId);
  }

  /**
   * List all pins for a workflow
   */
  async listWorkflowPins(workflowId: string, userId?: string) {
    return this.dataPinningService.listWorkflowPins(workflowId, userId);
  }

  /**
   * Delete a pin
   */
  async deletePin(pinId: string): Promise<boolean> {
    return this.dataPinningService.deletePin(pinId);
  }

  /**
   * Toggle pins for a workflow
   */
  async toggleWorkflowPins(
    workflowId: string,
    enabled: boolean,
    userId?: string
  ): Promise<number> {
    return this.dataPinningService.toggleWorkflowPins(workflowId, enabled, userId);
  }

  /**
   * Discover available variables for expression autocomplete
   */
  async discoverVariables(
    workflowId: string,
    currentNodeId: string,
    userId: string,
    nodes: Node[],
    edges: Edge[],
    options?: {
      useAIInference?: boolean;
      maxUpstreamNodes?: number;
      includeGlobals?: boolean;
      forceRefresh?: boolean;
    }
  ) {
    return this.schemaDiscoveryService.discoverVariables(
      {
        workflowId,
        currentNodeId,
        userId,
        nodes,
        edges,
      },
      options
    );
  }

  /**
   * Get execution logs grouped by loop iterations
   */
  async getLoopExecutionGroups(executionId: string, loopId?: string) {
    return this.executionHistoryService.getLoopGroups(executionId, loopId);
  }

  /**
   * Get execution summary
   */
  async getExecutionSummary(executionId: string) {
    return this.executionHistoryService.getExecutionSummary(executionId);
  }

  /**
   * Get loop summary for an execution
   */
  async getLoopSummary(executionId: string, loopId: string) {
    return this.executionHistoryService.getLoopSummary(executionId, loopId);
  }

  /**
   * Compare two executions
   */
  async compareExecutions(executionId1: string, executionId2: string) {
    return this.executionHistoryService.compareExecutions(executionId1, executionId2);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const workflowExecutionEngineV3 = new WorkflowExecutionEngineV3();
export default workflowExecutionEngineV3;
