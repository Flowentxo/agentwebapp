/**
 * WORKFLOW EXECUTION ENGINE
 *
 * Executes visual agent workflows node-by-node with data flow management
 * Includes Budget Guard for cost-controlled execution
 * Includes detailed per-node logging to workflow_node_logs table
 */

import { Node, Edge } from 'reactflow';
import { getDb } from '@/lib/db';
import { workflowExecutions, workflowNodeLogs, workflowApprovalRequests, workflows } from '@/lib/db/schema-workflows';
import { eq } from 'drizzle-orm';
import { DatabaseQueryNodeExecutor, WebhookNodeExecutor } from './WorkflowExecutors';
import {
  HubSpotCreateContactExecutor,
  HubSpotUpdateDealExecutor,
  HubSpotAddNoteExecutor,
  HubSpotSearchContactsExecutor,
} from './HubSpotWorkflowNodes';
import { OpenAILLMExecutor } from './OpenAILLMExecutor';
import { ContextAwareLLMExecutor } from './executors/ContextAwareLLMExecutor';
import { pipelineContextManager } from './PipelineContextManager';
import { randomUUID } from 'crypto';
import { budgetService, type UsageContext } from './BudgetService';
import { workflowCostEstimator, type NodeCostEstimate } from './WorkflowCostEstimator';
import { createLogger } from '@/lib/logger';
import { actionEmailHandler } from './workflow/handlers/ActionEmailHandler';

const logger = createLogger('workflow-engine');

// =====================================================
// NODE LOG SERVICE - Per-node database logging
// =====================================================

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
  }): Promise<string | null> {
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
      return null; // Don't fail execution if logging fails
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
    if (!params.logId) return;

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
    if (!params.logId) return;

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

// Singleton instance - exported for external use
export const nodeLogService = new NodeLogService();

// =====================================================
// BUDGET ERROR CLASS
// =====================================================

export class BudgetExceededError extends Error {
  public readonly errorCode = 'BUDGET_EXCEEDED';
  public readonly nodeId: string;
  public readonly estimatedCost: number;
  public readonly remainingBudget: number;

  constructor(nodeId: string, estimatedCost: number, remainingBudget: number) {
    super(`Budget exceeded: Node "${nodeId}" requires ~$${estimatedCost.toFixed(4)} but only $${remainingBudget.toFixed(4)} remaining`);
    this.name = 'BudgetExceededError';
    this.nodeId = nodeId;
    this.estimatedCost = estimatedCost;
    this.remainingBudget = remainingBudget;
  }
}

// =====================================================
// WORKFLOW SUSPENSION ERROR (for Human Approval)
// =====================================================

export class WorkflowSuspendedError extends Error {
  public readonly errorCode = 'WORKFLOW_SUSPENDED';
  public readonly nodeId: string;
  public readonly approvalRequestId: string;

  constructor(nodeId: string, approvalRequestId: string, message?: string) {
    super(message || `Workflow suspended at node "${nodeId}" awaiting human approval`);
    this.name = 'WorkflowSuspendedError';
    this.nodeId = nodeId;
    this.approvalRequestId = approvalRequestId;
  }
}

export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  userId: string;
  isTest: boolean;
  startTime: number;
  variables: Record<string, any>;
  nodeOutputs: Map<string, any>;
  logs: ExecutionLog[];
  status: 'pending' | 'running' | 'success' | 'error' | 'suspended';
  currentNodeId: string | null;
  error?: string;
  errorCode?: string; // ← Add error code for budget errors
  nodes?: Node[]; // ← Add nodes for variable resolution
  edges?: Edge[]; // ← Add edges for resume capability
  // Budget tracking
  totalCostIncurred: number;
  budgetCheckEnabled: boolean;
  // Approval/Suspension tracking
  suspendedAtNodeId?: string; // Node where execution was suspended
  approvalRequestId?: string; // Link to approval request
}

export interface ExecutionLog {
  timestamp: number;
  nodeId: string;
  nodeName: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  data?: any;
}

export interface NodeExecutor {
  execute(node: Node, context: ExecutionContext, inputs: any): Promise<any>;
}

export class WorkflowExecutionEngine {
  private executors: Map<string, NodeExecutor> = new Map();
  private activeExecutions: Map<string, ExecutionContext> = new Map();

  constructor() {
    this.registerDefaultExecutors();
  }

  /**
   * Register default node executors
   */
  private registerDefaultExecutors() {
    // Import and register all node executors
    this.registerExecutor('trigger', new TriggerExecutor());
    // Use Context-Aware LLM Executor for shared context between agents
    this.registerExecutor('llm-agent', new ContextAwareLLMExecutor()); // ✅ Context-aware OpenAI integration
    this.registerExecutor('ai-agent', new ContextAwareLLMExecutor()); // Alias for ai-agent nodes
    this.registerExecutor('data-transform', new DataTransformExecutor());
    this.registerExecutor('condition', new ConditionExecutor());
    this.registerExecutor('api-call', new APICallExecutor());
    this.registerExecutor('web-search', new WebSearchExecutor());
    this.registerExecutor('output', new OutputExecutor());
    this.registerExecutor('custom', new CustomToolExecutor()); // Register custom tool executor
    this.registerExecutor('database-query', new DatabaseQueryNodeExecutor()); // Register database query executor
    this.registerExecutor('webhook', new WebhookNodeExecutor()); // Register webhook executor

    // Register HubSpot integration executors
    this.registerExecutor('hubspot-create-contact', new HubSpotCreateContactExecutor());
    this.registerExecutor('hubspot-update-deal', new HubSpotUpdateDealExecutor());
    this.registerExecutor('hubspot-add-note', new HubSpotAddNoteExecutor());
    this.registerExecutor('hubspot-search-contacts', new HubSpotSearchContactsExecutor());

    // Register Action Handlers
    this.registerExecutor('action-email', actionEmailHandler);
    this.registerExecutor('email', actionEmailHandler);
    this.registerExecutor('send-email', actionEmailHandler);

    // Human-in-the-Loop Approval Handler
    this.registerExecutor('human-approval', new HumanApprovalExecutor());
    this.registerExecutor('approval', new HumanApprovalExecutor()); // Alias
  }

  /**
   * Register a custom node executor
   */
  registerExecutor(nodeType: string, executor: NodeExecutor) {
    this.executors.set(nodeType, executor);
    console.log(`[ExecutionEngine] Registered executor: ${nodeType}`);
  }

  /**
   * Get an active execution by ID
   */
  getExecution(executionId: string): ExecutionContext | undefined {
    return this.activeExecutions.get(executionId);
  }

  /**
   * Get all active executions
   */
  getAllActiveExecutions(): ExecutionContext[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Cancel a running execution
   */
  cancelExecution(executionId: string): boolean {
    const execution = this.activeExecutions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return false;
    }

    execution.status = 'error';
    execution.error = 'Execution cancelled by user';
    this.log(execution, 'workflow', 'Workflow', 'warn', 'Execution cancelled by user');

    // Update database
    this.updateExecutionRecord(execution).catch(err =>
      console.error('[CANCEL_EXECUTION] Failed to update DB:', err)
    );

    return true;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    nodes: Node[],
    edges: Edge[],
    userId: string,
    input?: any,
    isTest: boolean = true,
    options?: { skipBudgetCheck?: boolean }
  ): Promise<ExecutionContext> {
    const executionId = this.generateExecutionId();

    const context: ExecutionContext = {
      executionId,
      workflowId,
      userId,
      isTest,
      startTime: Date.now(),
      variables: { input: input || {} },
      nodeOutputs: new Map(),
      logs: [],
      status: 'pending',
      currentNodeId: null,
      nodes, // ← Add nodes for variable resolution
      edges, // ← Add edges for resume capability
      // Budget tracking
      totalCostIncurred: 0,
      budgetCheckEnabled: !options?.skipBudgetCheck && !isTest, // Skip budget check for tests
    };

    this.activeExecutions.set(executionId, context);

    // Pre-flight budget check: Estimate total workflow cost
    if (context.budgetCheckEnabled) {
      const estimate = workflowCostEstimator.estimateWorkflowCost(nodes);
      const budgetCheck = await budgetService.checkBudget(userId, estimate.estimatedTokens);

      if (!budgetCheck.allowed) {
        context.status = 'error';
        context.error = budgetCheck.reason || 'Budget check failed';
        context.errorCode = 'BUDGET_EXCEEDED';
        this.log(context, 'workflow', 'Workflow', 'error', `Pre-flight budget check failed: ${budgetCheck.reason}`);
        await this.updateExecutionRecord(context);
        return context;
      }

      // Log estimated cost
      this.log(
        context,
        'workflow',
        'Budget Check',
        'info',
        `Workflow cost estimate: $${estimate.minCost.toFixed(4)} - $${estimate.maxCost.toFixed(4)}`,
        { estimate }
      );
    }

    try {
      // Save execution record to DB
      await this.createExecutionRecord(context);

      // Initialize shared context for this execution (Pipeline Context System)
      await pipelineContextManager.initializeContext(
        executionId,
        workflowId,
        context.variables
      );
      this.log(context, 'workflow', 'Context', 'info', 'Pipeline context initialized for agent collaboration');

      // Start execution
      context.status = 'running';
      this.log(context, 'workflow', 'Workflow', 'info', 'Workflow execution started');

      // Find entry point (trigger nodes)
      const entryNodes = this.findEntryNodes(nodes, edges);

      if (entryNodes.length === 0) {
        throw new Error('No trigger node found. Workflow must have at least one trigger.');
      }

      // Execute from each entry point
      for (const entryNode of entryNodes) {
        await this.executeNode(entryNode, nodes, edges, context, context.variables.input);
      }

      // Mark as complete
      context.status = 'success';
      this.log(context, 'workflow', 'Workflow', 'success', 'Workflow execution completed successfully');

    } catch (error: any) {
      // Handle workflow suspension (human approval required)
      if (error instanceof WorkflowSuspendedError) {
        context.status = 'suspended';
        context.suspendedAtNodeId = error.nodeId;
        context.approvalRequestId = error.approvalRequestId;
        this.log(context, 'workflow', 'Workflow', 'warn', `Workflow suspended: Awaiting approval (${error.approvalRequestId})`);
      } else {
        context.status = 'error';
        context.error = error.message;
        this.log(context, 'workflow', 'Workflow', 'error', `Workflow execution failed: ${error.message}`);
      }
    } finally {
      // Update execution record
      await this.updateExecutionRecord(context);

      // Keep in memory for 5 minutes for status polling
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
    allNodes: Node[],
    allEdges: Edge[],
    context: ExecutionContext,
    inputs: any
  ): Promise<any> {
    context.currentNodeId = node.id;
    const nodeStartTime = Date.now();

    // Start database logging for this node
    const nodeLogId = await nodeLogService.logNodeStart({
      executionId: context.executionId,
      workflowId: context.workflowId,
      nodeId: node.id,
      nodeType: node.type || 'unknown',
      nodeName: node.data?.label || node.data?.name,
      input: inputs,
    });

    // =====================================================
    // BUDGET GUARD: Pre-execution cost check
    // =====================================================
    const nodeEstimate = workflowCostEstimator.estimateNodeCost(node);
    const isCostlyNode = nodeEstimate.estimatedCost > 0;

    if (context.budgetCheckEnabled && isCostlyNode) {
      // Only check budget for costly operations (skip free nodes like conditions)
      const budgetCheck = await budgetService.checkBudget(context.userId, 0); // Check current state

      if (!budgetCheck.allowed) {
        const error = new BudgetExceededError(
          node.id,
          nodeEstimate.estimatedCost,
          budgetCheck.limits.monthlyCostUsd - budgetCheck.currentUsage.monthlyCostUsd
        );
        context.errorCode = error.errorCode;
        throw error;
      }

      // Check if this specific node would exceed remaining budget
      const remainingBudget = budgetCheck.limits.monthlyCostUsd - budgetCheck.currentUsage.monthlyCostUsd;
      if (nodeEstimate.estimatedCost > remainingBudget) {
        const error = new BudgetExceededError(
          node.id,
          nodeEstimate.estimatedCost,
          remainingBudget
        );
        context.errorCode = error.errorCode;
        throw error;
      }

      this.log(
        context,
        node.id,
        node.data.label || 'Unnamed Node',
        'info',
        `Budget check passed. Estimated cost: $${nodeEstimate.estimatedCost.toFixed(4)}`,
        { nodeEstimate, remainingBudget }
      );
    }

    this.log(
      context,
      node.id,
      node.data.label || 'Unnamed Node',
      'info',
      `Executing node...`,
      {
        nodeType: node.type,
        inputs,
        startTime: nodeStartTime,
        status: 'running',
        estimatedCost: nodeEstimate.estimatedCost,
      }
    );

    try {
      // Get executor for this node type
      const executor = this.executors.get(node.type || 'custom');

      if (!executor) {
        throw new Error(`No executor found for node type: ${node.type}`);
      }

      // Execute the node
      const output = await executor.execute(node, context, inputs);

      // Store output
      context.nodeOutputs.set(node.id, output);

      const nodeEndTime = Date.now();
      const nodeDuration = nodeEndTime - nodeStartTime;

      // =====================================================
      // POST-TRACKING: Track actual cost after execution
      // =====================================================
      if (context.budgetCheckEnabled && isCostlyNode) {
        // Get actual cost from output if available (LLM nodes include token usage)
        let actualCost = nodeEstimate.estimatedCost;
        let actualTokens = 0;

        // Check if output contains actual usage info (from OpenAI responses)
        if (output?.usage) {
          actualTokens = (output.usage.prompt_tokens || 0) + (output.usage.completion_tokens || 0);
          // Calculate actual cost based on tokens
          const model = node.data?.model || node.data?.selectedModel || 'gpt-4o-mini';
          actualCost = workflowCostEstimator.estimateLLMCost(
            model,
            output.usage.prompt_tokens || 0,
            output.usage.completion_tokens || 0
          );
        } else if (output?.tokensUsed) {
          actualTokens = output.tokensUsed;
        }

        // Track cumulative cost
        context.totalCostIncurred += actualCost;

        // Track usage in BudgetService with workflow context
        const usageContext: UsageContext = {
          model: node.data?.model || node.data?.selectedModel,
          agentId: node.data?.agentId,
          responseTimeMs: nodeDuration,
          isError: false,
          tags: ['workflow', context.workflowId, node.type || 'unknown'],
        };

        await budgetService.trackUsage(
          context.userId,
          actualTokens,
          actualCost,
          usageContext
        );

        this.log(
          context,
          node.id,
          node.data.label || 'Unnamed Node',
          'info',
          `Cost tracked: $${actualCost.toFixed(4)} (${actualTokens} tokens)`,
          { actualCost, actualTokens, totalCostIncurred: context.totalCostIncurred }
        );
      }

      this.log(
        context,
        node.id,
        node.data.label || 'Unnamed Node',
        'success',
        'Node executed successfully',
        {
          output,
          startTime: nodeStartTime,
          endTime: nodeEndTime,
          duration: nodeDuration,
          status: 'success',
          costIncurred: isCostlyNode ? nodeEstimate.estimatedCost : 0,
        }
      );

      // Log success to database
      if (nodeLogId) {
        await nodeLogService.logNodeSuccess({
          logId: nodeLogId,
          output,
          durationMs: nodeDuration,
          tokensUsed: output?.usage?.total_tokens || output?.tokensUsed,
          costUsd: isCostlyNode ? nodeEstimate.estimatedCost : undefined,
          metadata: {
            model: node.data?.model || node.data?.selectedModel,
            nodeType: node.type,
          },
        });
      }

      // Find and execute connected nodes
      const connectedNodes = this.findConnectedNodes(node.id, allNodes, allEdges);

      for (const connectedNode of connectedNodes) {
        await this.executeNode(connectedNode, allNodes, allEdges, context, output);
      }

      return output;

    } catch (error: any) {
      const nodeEndTime = Date.now();
      const nodeDuration = nodeEndTime - nodeStartTime;

      // Special handling for WorkflowSuspendedError (Human Approval)
      if (error instanceof WorkflowSuspendedError) {
        this.log(
          context,
          node.id,
          node.data.label || 'Approval',
          'warn',
          `Workflow suspended: Awaiting human approval`,
          {
            approvalRequestId: error.approvalRequestId,
            startTime: nodeStartTime,
            endTime: nodeEndTime,
            duration: nodeDuration,
            status: 'suspended'
          }
        );

        // Log suspension to database
        if (nodeLogId) {
          await nodeLogService.logNodeSuccess({
            logId: nodeLogId,
            output: { status: 'suspended', approvalRequestId: error.approvalRequestId },
            durationMs: nodeDuration,
            metadata: {
              nodeType: node.type,
              suspended: true,
              approvalRequestId: error.approvalRequestId,
            },
          });
        }

        // Re-throw to stop execution gracefully
        throw error;
      }

      this.log(
        context,
        node.id,
        node.data.label || 'Unnamed Node',
        'error',
        `Node execution failed: ${error.message}`,
        {
          error: error.message,
          startTime: nodeStartTime,
          endTime: nodeEndTime,
          duration: nodeDuration,
          status: 'error'
        }
      );

      // Log error to database
      if (nodeLogId) {
        await nodeLogService.logNodeError({
          logId: nodeLogId,
          error: error.message,
          durationMs: nodeDuration,
          metadata: {
            errorCode: error.errorCode,
            errorStack: error.stack,
            nodeType: node.type,
          },
        });
      }

      throw error;
    }
  }

  /**
   * Find entry nodes (nodes with no incoming edges or trigger nodes)
   */
  private findEntryNodes(nodes: Node[], edges: Edge[]): Node[] {
    return nodes.filter(node => {
      // Trigger nodes are always entry points
      if (node.type === 'trigger') return true;

      // Nodes with no incoming edges are entry points
      const hasIncomingEdges = edges.some(edge => edge.target === node.id);
      return !hasIncomingEdges;
    });
  }

  /**
   * Find nodes connected to a given node
   */
  private findConnectedNodes(nodeId: string, allNodes: Node[], allEdges: Edge[]): Node[] {
    const outgoingEdges = allEdges.filter(edge => edge.source === nodeId);
    return outgoingEdges
      .map(edge => allNodes.find(node => node.id === edge.target))
      .filter(Boolean) as Node[];
  }

  /**
   * Log execution event
   */
  private log(
    context: ExecutionContext,
    nodeId: string,
    nodeName: string,
    level: 'info' | 'warn' | 'error' | 'success',
    message: string,
    data?: any
  ) {
    const log: ExecutionLog = {
      timestamp: Date.now(),
      nodeId,
      nodeName,
      level,
      message,
      data,
    };

    context.logs.push(log);
    console.log(`[Execution:${context.executionId}] [${level.toUpperCase()}] ${nodeName}: ${message}`);
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): ExecutionContext | null {
    return this.activeExecutions.get(executionId) || null;
  }

  /**
   * Create execution record in DB
   */
  private async createExecutionRecord(context: ExecutionContext) {
    try {
      const db = getDb();
      console.log(`[ExecutionEngine] Creating execution record: ${context.executionId}`);

      await db.insert(workflowExecutions).values({
        id: context.executionId,
        workflowId: context.workflowId,
        userId: context.userId,
        status: 'pending',
        isTest: context.isTest,
        input: context.variables.input,
        logs: [],
      });

      console.log(`[ExecutionEngine] ✅ Execution record created successfully: ${context.executionId}`);
    } catch (error: any) {
      console.error('[ExecutionEngine] ❌ Failed to create execution record:', error.message);
      console.error('[ExecutionEngine] Error details:', {
        executionId: context.executionId,
        workflowId: context.workflowId,
        userId: context.userId,
        errorCode: error.code,
        errorDetail: error.detail,
      });
      // Re-throw to prevent silent failures
      throw new Error(`Failed to persist execution record: ${error.message}`);
    }
  }

  /**
   * Update execution record in DB
   */
  private async updateExecutionRecord(context: ExecutionContext) {
    try {
      const db = getDb();
      const durationMs = Date.now() - context.startTime;

      console.log(`[ExecutionEngine] Updating execution record: ${context.executionId} (status: ${context.status})`);

      await db
        .update(workflowExecutions)
        .set({
          status: context.status,
          output: Array.from(context.nodeOutputs.entries()).reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {} as Record<string, any>),
          logs: context.logs,
          error: context.error,
          startedAt: new Date(context.startTime),
          completedAt: new Date(),
          durationMs,
        })
        .where(eq(workflowExecutions.id, context.executionId));

      console.log(`[ExecutionEngine] ✅ Execution record updated successfully: ${context.executionId}`);
    } catch (error: any) {
      console.error('[ExecutionEngine] ❌ Failed to update execution record:', error.message);
      console.error('[ExecutionEngine] Error details:', {
        executionId: context.executionId,
        status: context.status,
        errorCode: error.code,
        errorDetail: error.detail,
      });
      // Log error but don't throw - execution already completed/failed
      // We don't want to lose execution results due to DB update failure
    }
  }

  /**
   * Generate unique execution ID (UUID format)
   */
  private generateExecutionId(): string {
    return randomUUID();
  }

  /**
   * Resume a suspended workflow after approval
   */
  async resumeWorkflow(
    executionId: string,
    approvalResult: 'approved' | 'rejected',
    resolvedBy: string,
    rejectionReason?: string
  ): Promise<ExecutionContext | null> {
    const db = getDb();

    // Get the approval request
    const [approvalRequest] = await db
      .select()
      .from(workflowApprovalRequests)
      .where(eq(workflowApprovalRequests.executionId, executionId))
      .limit(1);

    if (!approvalRequest || approvalRequest.status !== 'pending') {
      logger.warn('Cannot resume: Approval request not found or already resolved', { executionId });
      return null;
    }

    // Update approval request status
    await db
      .update(workflowApprovalRequests)
      .set({
        status: approvalResult,
        resolvedBy,
        resolvedAt: new Date(),
        rejectionReason: approvalResult === 'rejected' ? rejectionReason : null,
        updatedAt: new Date(),
      })
      .where(eq(workflowApprovalRequests.id, approvalRequest.id));

    // Get the execution record
    const [execution] = await db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId))
      .limit(1);

    if (!execution) {
      logger.error('Execution not found for resume', { executionId });
      return null;
    }

    // Handle rejection - mark workflow as cancelled
    if (approvalResult === 'rejected') {
      await db
        .update(workflowExecutions)
        .set({
          status: 'error',
          error: `Rejected by ${resolvedBy}: ${rejectionReason || 'No reason provided'}`,
          completedAt: new Date(),
        })
        .where(eq(workflowExecutions.id, executionId));

      logger.info('Workflow rejected', { executionId, resolvedBy, rejectionReason });

      return {
        executionId,
        workflowId: execution.workflowId,
        userId: execution.userId,
        isTest: execution.isTest,
        startTime: new Date(execution.startedAt || Date.now()).getTime(),
        variables: {},
        nodeOutputs: new Map(),
        logs: execution.logs as ExecutionLog[] || [],
        status: 'error',
        currentNodeId: null,
        error: `Rejected by ${resolvedBy}`,
        totalCostIncurred: 0,
        budgetCheckEnabled: false,
      };
    }

    // Handle approval - resume workflow execution
    logger.info('Resuming workflow after approval', { executionId, resolvedBy });

    // Get the workflow to access nodes and edges
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, execution.workflowId))
      .limit(1);

    if (!workflow) {
      logger.error('Workflow not found for resume', { workflowId: execution.workflowId });
      return null;
    }

    // Restore execution context
    const suspendedState = approvalRequest.suspendedState as {
      variables: Record<string, any>;
      nodeOutputs: Record<string, any>;
      currentNodeId: string;
    } | null;

    const restoredNodeOutputs = new Map<string, any>(
      Object.entries(suspendedState?.nodeOutputs || {})
    );

    const nodes = workflow.nodes as Node[];
    const edges = workflow.edges as Edge[];

    // Find the approval node and its next connected nodes
    const approvalNodeId = approvalRequest.nodeId;
    const approvalNode = nodes.find(n => n.id === approvalNodeId);

    if (!approvalNode) {
      logger.error('Approval node not found', { approvalNodeId });
      return null;
    }

    // Create new context for continued execution
    const context: ExecutionContext = {
      executionId,
      workflowId: execution.workflowId,
      userId: execution.userId,
      isTest: execution.isTest,
      startTime: new Date(execution.startedAt || Date.now()).getTime(),
      variables: suspendedState?.variables || {},
      nodeOutputs: restoredNodeOutputs,
      logs: execution.logs as ExecutionLog[] || [],
      status: 'running',
      currentNodeId: approvalNodeId,
      nodes,
      edges,
      totalCostIncurred: 0,
      budgetCheckEnabled: !execution.isTest,
    };

    this.activeExecutions.set(executionId, context);

    try {
      // Update execution status to running
      await db
        .update(workflowExecutions)
        .set({ status: 'running' })
        .where(eq(workflowExecutions.id, executionId));

      // Log the approval
      this.log(context, approvalNodeId, approvalNode.data?.label || 'Approval', 'success',
        `Approved by ${resolvedBy} - Resuming workflow`);

      // Get the input that was sent to the approval node (from previous node output)
      const previousNodeOutput = this.getPreviousNodeOutput(approvalNode, nodes, edges, context);

      // Find and execute connected nodes (nodes after approval)
      const connectedNodes = this.findConnectedNodes(approvalNodeId, nodes, edges);

      for (const connectedNode of connectedNodes) {
        await this.executeNode(connectedNode, nodes, edges, context, previousNodeOutput);
      }

      // Mark as complete
      context.status = 'success';
      this.log(context, 'workflow', 'Workflow', 'success', 'Workflow resumed and completed successfully');

    } catch (error: any) {
      if (error instanceof WorkflowSuspendedError) {
        context.status = 'suspended';
        context.suspendedAtNodeId = error.nodeId;
        context.approvalRequestId = error.approvalRequestId;
        this.log(context, 'workflow', 'Workflow', 'warn', `Workflow suspended again: Awaiting approval`);
      } else {
        context.status = 'error';
        context.error = error.message;
        this.log(context, 'workflow', 'Workflow', 'error', `Resumed workflow failed: ${error.message}`);
      }
    } finally {
      await this.updateExecutionRecord(context);

      // Keep in memory for 5 minutes
      setTimeout(() => {
        this.activeExecutions.delete(executionId);
      }, 5 * 60 * 1000);
    }

    return context;
  }

  /**
   * Get output from the previous node in the workflow
   */
  private getPreviousNodeOutput(
    currentNode: Node,
    allNodes: Node[],
    allEdges: Edge[],
    context: ExecutionContext
  ): any {
    // Find edges that target this node
    const incomingEdges = allEdges.filter(e => e.target === currentNode.id);

    if (incomingEdges.length === 0) {
      return context.variables.input || {};
    }

    // Get output from the source node of the first incoming edge
    const sourceNodeId = incomingEdges[0].source;
    return context.nodeOutputs.get(sourceNodeId) || context.variables.input || {};
  }
}

// ============================================================================
// NODE EXECUTORS
// ============================================================================

/**
 * Trigger Executor - Entry point for workflows
 */
class TriggerExecutor implements NodeExecutor {
  async execute(node: Node, context: ExecutionContext, inputs: any): Promise<any> {
    // Trigger nodes just pass through the input
    return inputs;
  }
}

/**
 * LLM Agent Executor - Calls AI agents
 */
class LLMAgentExecutor implements NodeExecutor {
  async execute(node: Node, context: ExecutionContext, inputs: any): Promise<any> {
    const { agentId, prompt, temperature = 0.7 } = node.data;

    // TODO: Integrate with actual agent service
    // For now, return mock response

    const finalPrompt = this.interpolateVariables(prompt, inputs, context);

    return {
      response: `[AI Response from ${agentId}] Processed: ${JSON.stringify(inputs)}`,
      prompt: finalPrompt,
      agentId,
    };
  }

  private interpolateVariables(template: string, inputs: any, context: ExecutionContext): string {
    if (!template) return '';

    let result = template;

    // Replace {{input}} with actual input
    result = result.replace(/\{\{input\}\}/g, JSON.stringify(inputs));

    // Replace {{variable.path}} with context variables
    const variableRegex = /\{\{([a-zA-Z0-9_.]+)\}\}/g;
    result = result.replace(variableRegex, (match, path) => {
      const value = this.getNestedValue(context.variables, path);
      return value !== undefined ? String(value) : match;
    });

    return result;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

/**
 * Data Transform Executor - Transforms data using JavaScript
 */
class DataTransformExecutor implements NodeExecutor {
  async execute(node: Node, context: ExecutionContext, inputs: any): Promise<any> {
    const { transformCode } = node.data;

    if (!transformCode) {
      return inputs;
    }

    try {
      // Create safe execution context
      const transformFn = new Function('input', 'context', transformCode);
      const result = transformFn(inputs, context.variables);
      return result;
    } catch (error: any) {
      throw new Error(`Transform error: ${error.message}`);
    }
  }
}

/**
 * Condition Executor - Conditional branching
 */
class ConditionExecutor implements NodeExecutor {
  async execute(node: Node, context: ExecutionContext, inputs: any): Promise<any> {
    const { condition } = node.data;

    try {
      // Handle structured condition (new format)
      if (condition && typeof condition === 'object' && 'left' in condition) {
        const { left, right, operator } = condition;

        // Interpolate variables in left and right operands
        const leftValue = this.resolveValue(left, context, inputs);
        const rightValue = this.resolveValue(right, context, inputs);

        // Evaluate condition based on operator
        const result = this.evaluateOperator(leftValue, rightValue, operator);

        return result;
      }

      // Fallback: Legacy JavaScript condition evaluation
      const conditionFn = new Function('input', 'context', `return ${condition}`);
      const result = conditionFn(inputs, context.variables);

      return result;
    } catch (error: any) {
      throw new Error(`Condition evaluation error: ${error.message}`);
    }
  }

  /**
   * Resolve a value (handle variables like {{llm-agent.score}})
   */
  private resolveValue(value: any, context: ExecutionContext, inputs: any): any {
    if (typeof value !== 'string') return value;

    // Check if it's a variable reference
    const variableMatch = value.match(/^\{\{(.+)\}\}$/);
    if (!variableMatch) {
      // Try to parse as number
      const num = Number(value);
      return isNaN(num) ? value : num;
    }

    const path = variableMatch[1]; // e.g., "llm-agent.score" or "trigger.payload.budget"

    // Split path: first part is node ID or special key
    const parts = path.split('.');
    const firstPart = parts[0];

    // Handle special cases
    if (firstPart === 'input') {
      return this.getNestedValue(inputs, parts.slice(1).join('.'));
    }

    if (firstPart === 'trigger') {
      return this.getNestedValue(context.variables, path);
    }

    // Try to find node output by node ID
    // Node IDs are numeric strings like "2" (for llm-agent node)
    // First, try to find by exact ID
    for (const [nodeId, output] of context.nodeOutputs.entries()) {
      if (nodeId === firstPart) {
        return this.getNestedValue(output, parts.slice(1).join('.'));
      }
    }

    // Try to find node by node type (e.g., "llm-agent")
    // This allows {{llm-agent.score}} syntax
    if (context.nodes) {
      const matchingNode = context.nodes.find(node => node.type === firstPart);
      if (matchingNode && context.nodeOutputs.has(matchingNode.id)) {
        const output = context.nodeOutputs.get(matchingNode.id);
        return this.getNestedValue(output, parts.slice(1).join('.'));
      }
    }

    // Fallback: try context.variables
    return this.getNestedValue(context.variables, path);
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    if (!path) return obj;
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Evaluate operator
   */
  private evaluateOperator(left: any, right: any, operator: string): boolean {
    switch (operator) {
      case 'equals':
      case 'equal':
      case '==':
        return left == right;

      case 'not_equals':
      case 'not_equal':
      case '!=':
        return left != right;

      case 'greater_than':
      case '>':
        return Number(left) > Number(right);

      case 'greater_than_or_equal':
      case '>=':
        return Number(left) >= Number(right);

      case 'less_than':
      case '<':
        return Number(left) < Number(right);

      case 'less_than_or_equal':
      case '<=':
        return Number(left) <= Number(right);

      case 'contains':
        return String(left).includes(String(right));

      case 'starts_with':
        return String(left).startsWith(String(right));

      case 'ends_with':
        return String(left).endsWith(String(right));

      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }
}

/**
 * API Call Executor - Makes HTTP requests
 */
class APICallExecutor implements NodeExecutor {
  async execute(node: Node, context: ExecutionContext, inputs: any): Promise<any> {
    const { url, method = 'GET', headers = {}, body } = node.data;

    if (!url) {
      throw new Error('API URL is required');
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      throw new Error(`API call error: ${error.message}`);
    }
  }
}

/**
 * Output Executor - Final output node
 */
class OutputExecutor implements NodeExecutor {
  async execute(node: Node, context: ExecutionContext, inputs: any): Promise<any> {
    // Output nodes just return the input
    return inputs;
  }
}

/**
 * Web Search Executor - Search the web using multiple providers
 */
class WebSearchExecutor implements NodeExecutor {
  async execute(node: Node, context: ExecutionContext, inputs: any): Promise<any> {
    const nodeData = node.data;
    const startTime = Date.now();

    // Resolve variables in query
    const query = this.resolveVariables(nodeData.query || '', context);

    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    const provider = nodeData.provider || 'duckduckgo'; // Default to DuckDuckGo (free)
    const numResults = nodeData.numResults || 10;

    let results: any[] = [];

    try {
      switch (provider) {
        case 'brave':
          results = await this.searchBrave(query, numResults);
          break;
        case 'duckduckgo':
          results = await this.searchDuckDuckGo(query, numResults);
          break;
        case 'google':
          results = await this.searchGoogle(query, numResults);
          break;
        default:
          results = await this.searchDuckDuckGo(query, numResults);
      }

      // Store results in output variable
      if (nodeData.outputVariable && results.length > 0) {
        context.variables[nodeData.outputVariable] = results;
      }

      const searchTime = Date.now() - startTime;
      console.log(`[WebSearch] Found ${results.length} results in ${searchTime}ms (provider: ${provider})`);

      return {
        success: true,
        query,
        results,
        totalResults: results.length,
        provider,
        searchTime,
      };
    } catch (error: any) {
      console.error(`[WebSearch] Search failed:`, error.message);
      throw new Error(`Web search failed: ${error.message}`);
    }
  }

  private async searchDuckDuckGo(query: string, numResults: number): Promise<any[]> {
    const axios = require('axios');

    const params = new URLSearchParams({
      q: query,
      format: 'json',
      no_redirect: '1',
      no_html: '1',
    });

    const response = await axios.get('https://api.duckduckgo.com/', {
      params,
      headers: {
        'User-Agent': 'FlowentAgentStudio/1.0',
      },
      timeout: 10000,
    });

    const data = response.data;
    const results: any[] = [];

    // DuckDuckGo Instant Answer API results
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, numResults)) {
        if (topic.FirstURL) {
          results.push({
            title: topic.Text?.split(' - ')[0] || 'Untitled',
            url: topic.FirstURL,
            description: topic.Text || '',
          });
        }
      }
    }

    // Abstract (featured snippet)
    if (data.Abstract && results.length === 0) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || '',
        description: data.Abstract,
        snippet: data.AbstractText,
      });
    }

    return results;
  }

  private async searchBrave(query: string, numResults: number): Promise<any[]> {
    const axios = require('axios');
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;

    if (!apiKey) {
      throw new Error('BRAVE_SEARCH_API_KEY not configured in .env.local');
    }

    const params = new URLSearchParams({
      q: query,
      count: String(numResults),
      search_lang: 'en',
      safesearch: 'off',
    });

    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      params,
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey,
      },
      timeout: 10000,
    });

    const data = response.data;
    const results: any[] = [];

    if (data.web?.results) {
      results.push(
        ...data.web.results.map((result: any) => ({
          title: result.title,
          url: result.url,
          description: result.description,
          snippet: result.extra_snippets?.[0],
        }))
      );
    }

    return results.slice(0, numResults);
  }

  private async searchGoogle(query: string, numResults: number): Promise<any[]> {
    const axios = require('axios');
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
      throw new Error('GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID required in .env.local');
    }

    const params = new URLSearchParams({
      key: apiKey,
      cx: searchEngineId,
      q: query,
      num: String(Math.min(numResults, 10)),
    });

    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params,
      timeout: 10000,
    });

    const data = response.data;
    const results: any[] = [];

    if (data.items) {
      results.push(
        ...data.items.map((item: any) => ({
          title: item.title,
          url: item.link,
          description: item.snippet,
        }))
      );
    }

    return results;
  }

  private resolveVariables(query: string, context: ExecutionContext): string {
    return query.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      const value = context.variables[varName];
      return value !== undefined ? String(value) : match;
    });
  }
}

/**
 * Custom Tool Executor - Executes user-defined JavaScript tools
 */
class CustomToolExecutor implements NodeExecutor {
  async execute(node: Node, context: ExecutionContext, inputs: any): Promise<any> {
    const {
      toolId,
      toolName,
      toolCode,
      toolParameters,
      toolTimeout
    } = node.data;

    if (!toolCode) {
      throw new Error('Custom tool code is required');
    }

    try {
      // Prepare parameters from inputs
      const params: Record<string, any> = {};

      // Extract parameters from inputs or use node data
      if (toolParameters && Array.isArray(toolParameters)) {
        for (const param of toolParameters) {
          // Try to get value from inputs
          if (inputs && inputs[param.name] !== undefined) {
            params[param.name] = inputs[param.name];
          }
          // Try to get from node data
          else if (node.data[param.name] !== undefined) {
            params[param.name] = node.data[param.name];
          }
          // Use default value
          else if (param.default !== undefined) {
            params[param.name] = param.default;
          }
          // Required parameter missing
          else if (param.required) {
            throw new Error(`Missing required parameter: ${param.name}`);
          }
        }
      }

      // Execute custom tool code with timeout
      const result = await this.executeWithTimeout(
        toolCode,
        params,
        toolTimeout || 5000,
        context
      );

      return {
        success: true,
        toolId,
        toolName,
        result,
        executedAt: Date.now()
      };

    } catch (error: any) {
      throw new Error(`Custom tool execution failed: ${error.message}`);
    }
  }

  private async executeWithTimeout(
    code: string,
    params: Record<string, any>,
    timeout: number,
    context: ExecutionContext
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Execution timeout after ${timeout}ms`));
      }, timeout);

      try {
        // Create sandboxed execution context
        const logs: string[] = [];
        const sandbox = {
          console: {
            log: (...args: any[]) => {
              const message = args.map(arg => String(arg)).join(' ');
              logs.push(message);
              context.logs.push({
                timestamp: Date.now(),
                nodeId: context.currentNodeId || 'unknown',
                nodeName: 'Custom Tool',
                level: 'info',
                message
              });
            },
            error: (...args: any[]) => {
              const message = args.map(arg => String(arg)).join(' ');
              logs.push(`[ERROR] ${message}`);
              context.logs.push({
                timestamp: Date.now(),
                nodeId: context.currentNodeId || 'unknown',
                nodeName: 'Custom Tool',
                level: 'error',
                message
              });
            }
          }
        };

        // Execute user code
        const wrappedCode = `
          ${code}
          return execute(params);
        `;

        const func = new Function('params', 'console', wrappedCode);
        const result = func(params, sandbox.console);

        clearTimeout(timeoutId);
        resolve(result);
      } catch (error: any) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }
}

// ============================================================================
// HUMAN APPROVAL EXECUTOR
// ============================================================================

/**
 * Human Approval Executor - Pauses workflow for human approval
 *
 * This executor:
 * 1. Creates an approval request in the database
 * 2. Sends a notification to the inbox
 * 3. Throws WorkflowSuspendedError to pause execution
 * 4. Stores the current state for later resumption
 */
class HumanApprovalExecutor implements NodeExecutor {
  async execute(node: Node, context: ExecutionContext, inputs: any): Promise<any> {
    const db = getDb();

    // Get node configuration
    const {
      approvalMessage = 'This workflow requires your approval to continue.',
      assignee, // Optional: specific user ID to assign
      timeout, // Optional: timeout in hours
      previewType = 'generic', // 'email', 'api_call', 'database', 'generic'
    } = node.data || {};

    // Build preview data from inputs
    const previewData = this.buildPreviewData(previewType, inputs, node);

    // Generate approval request title
    const workflowName = context.nodes?.find(n => n.type === 'trigger')?.data?.label || 'Workflow';
    const title = `${workflowName} requires approval: ${node.data?.label || 'Review Required'}`;

    // Capture current state for resumption
    const suspendedState = {
      variables: context.variables,
      nodeOutputs: Object.fromEntries(context.nodeOutputs),
      currentNodeId: node.id,
    };

    // Create approval request
    const [approvalRequest] = await db
      .insert(workflowApprovalRequests)
      .values({
        executionId: context.executionId,
        workflowId: context.workflowId,
        nodeId: node.id,
        status: 'pending',
        title,
        message: approvalMessage,
        contextData: inputs,
        previewData,
        suspendedState,
        assignedUserId: assignee || context.userId, // Default to workflow owner
        expiresAt: timeout ? new Date(Date.now() + timeout * 60 * 60 * 1000) : undefined,
      })
      .returning();

    logger.info('Approval request created', {
      approvalRequestId: approvalRequest.id,
      executionId: context.executionId,
      nodeId: node.id,
      assignedTo: assignee || context.userId,
    });

    // Create inbox notification (system message)
    await this.createInboxNotification(approvalRequest, context, node);

    // Throw suspension error to stop workflow
    throw new WorkflowSuspendedError(
      node.id,
      approvalRequest.id,
      `Awaiting approval: ${title}`
    );
  }

  /**
   * Build preview data based on the type of action being approved
   */
  private buildPreviewData(
    previewType: string,
    inputs: any,
    node: Node
  ): { type: string; summary: string; details: Record<string, any> } {
    switch (previewType) {
      case 'email':
        return {
          type: 'email',
          summary: `Email to: ${inputs?.to || inputs?.recipient || 'Unknown'}`,
          details: {
            to: inputs?.to || inputs?.recipient,
            subject: inputs?.subject,
            bodyPreview: inputs?.body?.substring(0, 200) || inputs?.content?.substring(0, 200),
          },
        };

      case 'api_call':
        return {
          type: 'api_call',
          summary: `API Call: ${inputs?.method || 'POST'} ${inputs?.url || 'Unknown'}`,
          details: {
            method: inputs?.method,
            url: inputs?.url,
            headers: inputs?.headers,
            bodyPreview: JSON.stringify(inputs?.body || inputs?.data)?.substring(0, 200),
          },
        };

      case 'database':
        return {
          type: 'database',
          summary: `Database: ${inputs?.operation || 'query'}`,
          details: {
            operation: inputs?.operation,
            table: inputs?.table,
            queryPreview: inputs?.query?.substring(0, 200),
          },
        };

      default:
        return {
          type: 'generic',
          summary: node.data?.label || 'Action requires approval',
          details: {
            inputKeys: Object.keys(inputs || {}),
            inputPreview: JSON.stringify(inputs)?.substring(0, 500),
          },
        };
    }
  }

  /**
   * Create an inbox notification for the approval request
   */
  private async createInboxNotification(
    approvalRequest: any,
    context: ExecutionContext,
    node: Node
  ): Promise<void> {
    // This would integrate with your inbox system
    // For now, we log it - in production, you'd create an inbox message

    logger.info('Inbox notification created', {
      approvalRequestId: approvalRequest.id,
      userId: approvalRequest.assignedUserId,
      title: approvalRequest.title,
    });

    // TODO: Integrate with actual inbox system
    // Example:
    // await inboxService.createSystemMessage({
    //   userId: approvalRequest.assignedUserId,
    //   type: 'approval_request',
    //   title: approvalRequest.title,
    //   message: approvalRequest.message,
    //   metadata: {
    //     approvalRequestId: approvalRequest.id,
    //     executionId: context.executionId,
    //     workflowId: context.workflowId,
    //     previewData: approvalRequest.previewData,
    //   },
    //   actionUrl: `/inbox?approval=${approvalRequest.id}`,
    // });
  }
}

// Singleton instance
export const workflowExecutionEngine = new WorkflowExecutionEngine();

