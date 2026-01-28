/**
 * PHASE 4: Aura Workflow Engine Service - Production-Ready
 * Implements persistent workflow execution with BullMQ
 */

import { getDb } from '@/lib/db';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import {
  auraWorkflows,
  auraWorkflowExecutions,
  auraAutomationRules,
  auraScheduledTasks,
  auraEventLog,
  AuraWorkflow,
  AuraWorkflowExecution,
} from '@/lib/db/schema-aura';
import { jobQueueService, QUEUE_NAMES, JobData, JobResult } from '@/lib/agents/shared/JobQueueService';
import { eventBus, EVENT_TYPES } from '@/lib/agents/shared/EventBusService';
import { redisCache } from '@/lib/brain/RedisCache';

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label?: string;
    config?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  condition?: {
    field: string;
    operator: string;
    value: unknown;
  };
}

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  workspaceId: string;
  userId: string;
  input: Record<string, unknown>;
  variables: Record<string, unknown>;
  nodeOutputs: Map<string, unknown>;
  currentNodeId?: string;
  status: 'running' | 'waiting' | 'completed' | 'failed';
}

export interface NodeExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  nextNodes?: string[];
  shouldWait?: boolean;
}

/**
 * Workflow Engine Service
 * Handles workflow execution with persistence and job queue
 */
export class WorkflowEngineService {
  private static instance: WorkflowEngineService;
  private db = getDb();
  private nodeHandlers: Map<string, (node: WorkflowNode, context: ExecutionContext) => Promise<NodeExecutionResult>> = new Map();
  private isInitialized = false;

  private constructor() {
    this.registerDefaultNodeHandlers();
  }

  public static getInstance(): WorkflowEngineService {
    if (!WorkflowEngineService.instance) {
      WorkflowEngineService.instance = new WorkflowEngineService();
    }
    return WorkflowEngineService.instance;
  }

  /**
   * Initialize the workflow engine
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Initialize job queue
      const queueReady = await jobQueueService.initialize();
      if (!queueReady) {
        console.warn('[WorkflowEngine] Job queue not available, using in-process execution');
      }

      // Register job handlers
      jobQueueService.registerHandler('workflow:execute', this.handleWorkflowJob.bind(this));
      jobQueueService.registerHandler('workflow:node', this.handleNodeJob.bind(this));

      // Start workers
      if (queueReady) {
        jobQueueService.startWorker(QUEUE_NAMES.AURA_WORKFLOWS, 5);
        jobQueueService.startWorker(QUEUE_NAMES.AURA_SCHEDULED, 3);
      }

      this.isInitialized = true;
      console.log('[WorkflowEngine] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[WorkflowEngine] Initialization failed:', error);
      return false;
    }
  }

  // ============================================
  // WORKFLOW MANAGEMENT
  // ============================================

  /**
   * Create a new workflow
   */
  public async createWorkflow(
    workspaceId: string,
    userId: string,
    data: {
      name: string;
      description?: string;
      nodes: WorkflowNode[];
      edges: WorkflowEdge[];
      triggerType?: 'manual' | 'schedule' | 'webhook' | 'event';
      triggerConfig?: Record<string, unknown>;
      variables?: Array<{ name: string; type: string; defaultValue?: unknown }>;
    }
  ): Promise<AuraWorkflow> {
    const [workflow] = await this.db
      .insert(auraWorkflows)
      .values({
        workspaceId,
        name: data.name,
        description: data.description,
        nodes: data.nodes,
        edges: data.edges,
        triggerType: data.triggerType || 'manual',
        triggerConfig: data.triggerConfig || {},
        variables: data.variables || [],
        status: 'draft',
        createdBy: userId,
      })
      .returning();

    // Emit event
    await eventBus.publish({
      type: EVENT_TYPES.AURA_WORKFLOW_STARTED,
      source: { agentId: 'aura', agentName: 'Aura' },
      payload: { workflowId: workflow.id, name: workflow.name },
      metadata: { workspaceId, userId },
    });

    return workflow;
  }

  /**
   * Get workflow by ID
   */
  public async getWorkflow(workflowId: string): Promise<AuraWorkflow | null> {
    const [workflow] = await this.db
      .select()
      .from(auraWorkflows)
      .where(eq(auraWorkflows.id, workflowId))
      .limit(1);

    return workflow || null;
  }

  /**
   * Update workflow
   */
  public async updateWorkflow(
    workflowId: string,
    userId: string,
    updates: Partial<{
      name: string;
      description: string;
      nodes: WorkflowNode[];
      edges: WorkflowEdge[];
      triggerConfig: Record<string, unknown>;
      status: 'draft' | 'active' | 'paused' | 'archived';
    }>
  ): Promise<AuraWorkflow | null> {
    const [workflow] = await this.db
      .update(auraWorkflows)
      .set({
        ...updates,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(auraWorkflows.id, workflowId))
      .returning();

    return workflow || null;
  }

  /**
   * List workflows for a workspace
   */
  public async listWorkflows(
    workspaceId: string,
    options: {
      status?: string;
      category?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ workflows: AuraWorkflow[]; total: number }> {
    const conditions = [eq(auraWorkflows.workspaceId, workspaceId)];

    if (options.status) {
      conditions.push(eq(auraWorkflows.status, options.status as any));
    }
    if (options.category) {
      conditions.push(eq(auraWorkflows.category, options.category));
    }

    const workflows = await this.db
      .select()
      .from(auraWorkflows)
      .where(and(...conditions))
      .orderBy(desc(auraWorkflows.updatedAt))
      .limit(options.limit || 20)
      .offset(options.offset || 0);

    const [countResult] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(auraWorkflows)
      .where(and(...conditions));

    return {
      workflows,
      total: Number(countResult?.count || 0),
    };
  }

  // ============================================
  // WORKFLOW EXECUTION
  // ============================================

  /**
   * Execute a workflow
   */
  public async executeWorkflow(
    workflowId: string,
    triggeredBy: string,
    input: Record<string, unknown> = {},
    options: {
      async?: boolean;
      priority?: number;
    } = {}
  ): Promise<{
    executionId: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    result?: unknown;
  }> {
    // Get workflow
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.status !== 'active' && workflow.status !== 'draft') {
      throw new Error(`Workflow is ${workflow.status}, cannot execute`);
    }

    // Create execution record
    const [execution] = await this.db
      .insert(auraWorkflowExecutions)
      .values({
        workflowId,
        workspaceId: workflow.workspaceId,
        triggeredBy,
        triggerType: 'manual',
        input,
        status: 'pending',
        nodeStates: [],
        logs: [],
      })
      .returning();

    // Queue or execute immediately
    if (options.async !== false) {
      // Queue the execution
      const job = await jobQueueService.addJob(
        QUEUE_NAMES.AURA_WORKFLOWS,
        'workflow:execute',
        {
          workflowId,
          executionId: execution.id,
          input,
        },
        {
          workspaceId: workflow.workspaceId,
          userId: triggeredBy,
          agentId: 'aura',
          priority: options.priority,
        }
      );

      if (job) {
        // Update execution with job ID
        await this.db
          .update(auraWorkflowExecutions)
          .set({
            jobId: job.id,
            queueName: QUEUE_NAMES.AURA_WORKFLOWS,
            status: 'queued',
          })
          .where(eq(auraWorkflowExecutions.id, execution.id));

        return {
          executionId: execution.id,
          status: 'queued',
        };
      }
    }

    // Execute synchronously
    const result = await this.runWorkflow(workflow, execution.id, input, triggeredBy);

    return {
      executionId: execution.id,
      status: result.success ? 'completed' : 'failed',
      result: result.output,
    };
  }

  /**
   * Run workflow execution
   */
  private async runWorkflow(
    workflow: AuraWorkflow,
    executionId: string,
    input: Record<string, unknown>,
    triggeredBy: string
  ): Promise<{ success: boolean; output?: unknown; error?: string }> {
    const startTime = Date.now();

    // Update execution status
    await this.db
      .update(auraWorkflowExecutions)
      .set({
        status: 'running',
        startedAt: new Date(),
      })
      .where(eq(auraWorkflowExecutions.id, executionId));

    // Initialize context
    const context: ExecutionContext = {
      workflowId: workflow.id,
      executionId,
      workspaceId: workflow.workspaceId,
      userId: triggeredBy,
      input,
      variables: this.initializeVariables(workflow.variables as any[], input),
      nodeOutputs: new Map(),
      status: 'running',
    };

    const nodes = workflow.nodes as WorkflowNode[];
    const edges = workflow.edges as WorkflowEdge[];
    const logs: Array<{ timestamp: string; level: string; nodeId?: string; message: string }> = [];

    try {
      // Find start node (trigger node or first node without incoming edges)
      const startNodeId = this.findStartNode(nodes, edges);
      if (!startNodeId) {
        throw new Error('No start node found in workflow');
      }

      // Execute nodes in order
      const result = await this.executeNode(startNodeId, nodes, edges, context, logs);

      // Calculate duration
      const durationMs = Date.now() - startTime;

      // Update execution record
      await this.db
        .update(auraWorkflowExecutions)
        .set({
          status: result.success ? 'completed' : 'failed',
          output: result.output as any,
          error: result.error,
          completedAt: new Date(),
          durationMs,
          logs,
          nodeStates: Array.from(context.nodeOutputs.entries()).map(([nodeId, output]) => ({
            nodeId,
            status: 'completed',
            output,
          })),
        })
        .where(eq(auraWorkflowExecutions.id, executionId));

      // Update workflow metrics
      await this.db
        .update(auraWorkflows)
        .set({
          executionCount: sql`execution_count + 1`,
          successCount: result.success ? sql`success_count + 1` : sql`success_count`,
          failureCount: result.success ? sql`failure_count` : sql`failure_count + 1`,
          lastExecutedAt: new Date(),
          avgDurationMs: sql`COALESCE((avg_duration_ms * execution_count + ${durationMs}) / (execution_count + 1), ${durationMs})`,
        })
        .where(eq(auraWorkflows.id, workflow.id));

      // Emit completion event
      await eventBus.publish({
        type: result.success ? EVENT_TYPES.AURA_WORKFLOW_COMPLETED : EVENT_TYPES.AURA_WORKFLOW_FAILED,
        source: { agentId: 'aura', agentName: 'Aura' },
        payload: {
          workflowId: workflow.id,
          executionId,
          success: result.success,
          durationMs,
        },
        metadata: {
          workspaceId: workflow.workspaceId,
          userId: triggeredBy,
        },
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logs.push({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: errorMessage,
      });

      await this.db
        .update(auraWorkflowExecutions)
        .set({
          status: 'failed',
          error: errorMessage,
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
          logs,
        })
        .where(eq(auraWorkflowExecutions.id, executionId));

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Execute a single node and its successors
   */
  private async executeNode(
    nodeId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    context: ExecutionContext,
    logs: any[]
  ): Promise<{ success: boolean; output?: unknown; error?: string }> {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      return { success: false, error: `Node ${nodeId} not found` };
    }

    context.currentNodeId = nodeId;

    logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      nodeId,
      message: `Executing node: ${node.data.label || node.type}`,
    });

    // Get node handler
    const handler = this.nodeHandlers.get(node.type);
    if (!handler) {
      return { success: false, error: `No handler for node type: ${node.type}` };
    }

    try {
      // Execute node
      const result = await handler(node, context);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Store output
      context.nodeOutputs.set(nodeId, result.output);

      // Find and execute next nodes
      const outgoingEdges = edges.filter(e => e.source === nodeId);

      if (outgoingEdges.length === 0) {
        // End of workflow
        return { success: true, output: result.output };
      }

      // Execute next nodes
      for (const edge of outgoingEdges) {
        // Check edge condition if exists
        if (edge.condition) {
          if (!this.evaluateCondition(edge.condition, context)) {
            continue;
          }
        }

        const nextResult = await this.executeNode(edge.target, nodes, edges, context, logs);
        if (!nextResult.success) {
          return nextResult;
        }
      }

      return { success: true, output: context.nodeOutputs.get(nodeId) };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Node execution failed';
      logs.push({
        timestamp: new Date().toISOString(),
        level: 'error',
        nodeId,
        message: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  }

  // ============================================
  // NODE HANDLERS
  // ============================================

  /**
   * Register default node handlers
   */
  private registerDefaultNodeHandlers(): void {
    // Trigger node
    this.nodeHandlers.set('trigger', async (node, context) => {
      return { success: true, output: context.input };
    });

    // HTTP Request node
    this.nodeHandlers.set('http_request', async (node, context) => {
      const config = node.data.config as {
        url: string;
        method: string;
        headers?: Record<string, string>;
        body?: unknown;
      };

      try {
        const response = await fetch(this.interpolateVariables(config.url, context), {
          method: config.method || 'GET',
          headers: config.headers,
          body: config.body ? JSON.stringify(this.interpolateVariables(config.body, context)) : undefined,
        });

        const data = await response.json().catch(() => response.text());

        return {
          success: response.ok,
          output: {
            status: response.status,
            data,
          },
          error: response.ok ? undefined : `HTTP ${response.status}`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'HTTP request failed',
        };
      }
    });

    // Transform node
    this.nodeHandlers.set('transform', async (node, context) => {
      const config = node.data.config as {
        expression?: string;
        mapping?: Record<string, string>;
      };

      try {
        let output: unknown;

        if (config.mapping) {
          output = {};
          for (const [key, value] of Object.entries(config.mapping)) {
            (output as any)[key] = this.interpolateVariables(value, context);
          }
        } else if (config.expression) {
          // Simple expression evaluation (in production, use a proper expression engine)
          const expr = this.interpolateVariables(config.expression, context);
          output = eval(expr); // Note: Use a proper expression evaluator in production
        }

        return { success: true, output };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Transform failed',
        };
      }
    });

    // Condition node
    this.nodeHandlers.set('condition', async (node, context) => {
      const config = node.data.config as {
        field: string;
        operator: string;
        value: unknown;
      };

      const result = this.evaluateCondition(config, context);
      return {
        success: true,
        output: { result },
        nextNodes: result ? ['true'] : ['false'],
      };
    });

    // Delay node
    this.nodeHandlers.set('delay', async (node, context) => {
      const config = node.data.config as { seconds?: number; minutes?: number };
      const ms = ((config.seconds || 0) + (config.minutes || 0) * 60) * 1000;

      await new Promise(resolve => setTimeout(resolve, Math.min(ms, 300000))); // Max 5 min delay

      return { success: true, output: { delayed: ms } };
    });

    // Set Variable node
    this.nodeHandlers.set('set_variable', async (node, context) => {
      const config = node.data.config as { name: string; value: unknown };
      context.variables[config.name] = this.interpolateVariables(config.value, context);
      return { success: true, output: context.variables };
    });

    // Log node
    this.nodeHandlers.set('log', async (node, context) => {
      const config = node.data.config as { message: string };
      const message = this.interpolateVariables(config.message, context);
      console.log(`[Workflow ${context.workflowId}]`, message);
      return { success: true, output: { logged: message } };
    });

    // End node
    this.nodeHandlers.set('end', async (node, context) => {
      const lastOutput = Array.from(context.nodeOutputs.values()).pop();
      return { success: true, output: lastOutput };
    });
  }

  /**
   * Register a custom node handler
   */
  public registerNodeHandler(
    nodeType: string,
    handler: (node: WorkflowNode, context: ExecutionContext) => Promise<NodeExecutionResult>
  ): void {
    this.nodeHandlers.set(nodeType, handler);
    console.log(`[WorkflowEngine] Registered handler for node type: ${nodeType}`);
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private findStartNode(nodes: WorkflowNode[], edges: WorkflowEdge[]): string | null {
    // Find trigger node
    const triggerNode = nodes.find(n => n.type === 'trigger');
    if (triggerNode) return triggerNode.id;

    // Find node without incoming edges
    const targetIds = new Set(edges.map(e => e.target));
    const startNode = nodes.find(n => !targetIds.has(n.id));
    return startNode?.id || null;
  }

  private initializeVariables(
    varDefs: Array<{ name: string; type: string; defaultValue?: unknown }>,
    input: Record<string, unknown>
  ): Record<string, unknown> {
    const vars: Record<string, unknown> = { ...input };

    for (const varDef of varDefs || []) {
      if (!(varDef.name in vars) && varDef.defaultValue !== undefined) {
        vars[varDef.name] = varDef.defaultValue;
      }
    }

    return vars;
  }

  private interpolateVariables(value: any, context: ExecutionContext): any {
    if (typeof value === 'string') {
      return value.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
        const parts = path.split('.');
        let current: any = { ...context.variables, input: context.input };

        for (const part of parts) {
          if (current && typeof current === 'object' && part in current) {
            current = current[part];
          } else {
            return match;
          }
        }

        return String(current);
      });
    }

    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map(v => this.interpolateVariables(v, context));
      }

      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.interpolateVariables(val, context);
      }
      return result;
    }

    return value;
  }

  private evaluateCondition(
    condition: { field: string; operator: string; value: unknown },
    context: ExecutionContext
  ): boolean {
    const fieldValue = this.interpolateVariables(`{{${condition.field}}}`, context);
    const compareValue = condition.value;

    switch (condition.operator) {
      case 'equals':
      case '==':
        return fieldValue == compareValue;
      case 'not_equals':
      case '!=':
        return fieldValue != compareValue;
      case 'contains':
        return String(fieldValue).includes(String(compareValue));
      case 'gt':
      case '>':
        return Number(fieldValue) > Number(compareValue);
      case 'gte':
      case '>=':
        return Number(fieldValue) >= Number(compareValue);
      case 'lt':
      case '<':
        return Number(fieldValue) < Number(compareValue);
      case 'lte':
      case '<=':
        return Number(fieldValue) <= Number(compareValue);
      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(fieldValue);
      default:
        return false;
    }
  }

  // ============================================
  // JOB HANDLERS
  // ============================================

  private async handleWorkflowJob(job: any): Promise<JobResult> {
    const { workflowId, executionId, input } = job.data.payload;

    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      return {
        success: false,
        error: `Workflow ${workflowId} not found`,
        executionTimeMs: 0,
      };
    }

    const result = await this.runWorkflow(
      workflow,
      executionId,
      input,
      job.data.metadata.userId
    );

    return {
      success: result.success,
      data: result.output,
      error: result.error,
      executionTimeMs: 0,
    };
  }

  private async handleNodeJob(job: any): Promise<JobResult> {
    // Handle individual node execution (for long-running nodes)
    const { nodeId, workflowId, executionId, context } = job.data.payload;

    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      return { success: false, error: 'Workflow not found', executionTimeMs: 0 };
    }

    const nodes = workflow.nodes as WorkflowNode[];
    const node = nodes.find(n => n.id === nodeId);

    if (!node) {
      return { success: false, error: 'Node not found', executionTimeMs: 0 };
    }

    const handler = this.nodeHandlers.get(node.type);
    if (!handler) {
      return { success: false, error: 'No handler for node type', executionTimeMs: 0 };
    }

    const result = await handler(node, context);

    return {
      success: result.success,
      data: result.output,
      error: result.error,
      executionTimeMs: 0,
    };
  }

  // ============================================
  // EXECUTION QUERIES
  // ============================================

  /**
   * Get execution status
   */
  public async getExecution(executionId: string): Promise<AuraWorkflowExecution | null> {
    const [execution] = await this.db
      .select()
      .from(auraWorkflowExecutions)
      .where(eq(auraWorkflowExecutions.id, executionId))
      .limit(1);

    return execution || null;
  }

  /**
   * List executions for a workflow
   */
  public async listExecutions(
    workflowId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<AuraWorkflowExecution[]> {
    return this.db
      .select()
      .from(auraWorkflowExecutions)
      .where(eq(auraWorkflowExecutions.workflowId, workflowId))
      .orderBy(desc(auraWorkflowExecutions.createdAt))
      .limit(options.limit || 20)
      .offset(options.offset || 0);
  }

  /**
   * Cancel an execution
   */
  public async cancelExecution(executionId: string): Promise<boolean> {
    const execution = await this.getExecution(executionId);
    if (!execution) return false;

    if (execution.jobId) {
      await jobQueueService.cancelJob(QUEUE_NAMES.AURA_WORKFLOWS, execution.jobId);
    }

    await this.db
      .update(auraWorkflowExecutions)
      .set({
        status: 'cancelled',
        completedAt: new Date(),
      })
      .where(eq(auraWorkflowExecutions.id, executionId));

    return true;
  }
}

// Export singleton instance
export const workflowEngineService = WorkflowEngineService.getInstance();
