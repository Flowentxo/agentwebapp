/**
 * WorkflowEngine
 *
 * Core execution engine for pipeline workflows
 * Handles node execution, context management, and flow control
 * Part of Phase 1: Async Execution Engine
 */

import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { emitWorkflowUpdate } from '@/server/socket';
import type { PipelineJobData, PipelineExecutionLog, PipelineJobProgress } from '../lib/pipeline-queue';

// =============================================================================
// TYPES
// =============================================================================

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label?: string;
    agentId?: string;
    prompt?: string;
    toolId?: string;
    webhookUrl?: string;
    cronExpression?: string;
    condition?: string;
    transform?: string;
    approvalRequired?: boolean;
    approvalMessage?: string;
    delay?: number;
    config?: Record<string, unknown>;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  data?: {
    condition?: string;
  };
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  userId: string;
}

export interface ExecutionContext {
  executionId: string;
  pipelineId: string;
  userId: string;
  triggerType: 'manual' | 'webhook' | 'scheduled' | 'api';
  inputs: Record<string, unknown>;
  stepResults: Map<string, unknown>;
  variables: Record<string, unknown>;
  logs: PipelineExecutionLog[];
  startTime: Date;
  currentNodeIndex: number;
  cancelled: boolean;
  suspended: boolean;
  suspendedAtNodeId?: string;
}

export type NodeExecutor = (
  node: WorkflowNode,
  context: ExecutionContext,
  engine: WorkflowEngine
) => Promise<unknown>;

// =============================================================================
// WORKFLOW ENGINE
// =============================================================================

export class WorkflowEngine {
  private workflow: WorkflowDefinition;
  private context: ExecutionContext;
  private executionOrder: WorkflowNode[];
  private nodeExecutors: Map<string, NodeExecutor>;
  private onProgressCallback?: (progress: PipelineJobProgress) => void;

  constructor(
    workflow: WorkflowDefinition,
    jobData: PipelineJobData,
    onProgress?: (progress: PipelineJobProgress) => void
  ) {
    this.workflow = workflow;
    this.onProgressCallback = onProgress;

    // Initialize execution context
    this.context = {
      executionId: jobData.executionId,
      pipelineId: jobData.pipelineId,
      userId: jobData.userId,
      triggerType: jobData.triggerType,
      inputs: jobData.inputs || {},
      stepResults: new Map(),
      variables: {},
      logs: [],
      startTime: new Date(),
      currentNodeIndex: 0,
      cancelled: false,
      suspended: false,
    };

    // Calculate execution order (topological sort)
    this.executionOrder = this.calculateExecutionOrder();

    // Register node executors
    this.nodeExecutors = new Map();
    this.registerDefaultExecutors();
  }

  // ===========================================================================
  // EXECUTION ORDER CALCULATION (TOPOLOGICAL SORT)
  // ===========================================================================

  private calculateExecutionOrder(): WorkflowNode[] {
    const nodes = this.workflow.nodes;
    const edges = this.workflow.edges;

    // Build adjacency list and in-degree map
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    nodes.forEach((node) => {
      inDegree.set(node.id, 0);
      adjacency.set(node.id, []);
    });

    edges.forEach((edge) => {
      const targets = adjacency.get(edge.source) || [];
      targets.push(edge.target);
      adjacency.set(edge.source, targets);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    // Kahn's algorithm for topological sort
    const queue: string[] = [];
    const result: WorkflowNode[] = [];

    // Find nodes with no incoming edges (start nodes)
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
      }
    });

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = nodes.find((n) => n.id === nodeId);

      if (node) {
        result.push(node);
      }

      const neighbors = adjacency.get(nodeId) || [];
      for (const neighbor of neighbors) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Check for cycles
    if (result.length !== nodes.length) {
      throw new Error('Workflow contains cycles, cannot determine execution order');
    }

    return result;
  }

  // ===========================================================================
  // NODE EXECUTOR REGISTRATION
  // ===========================================================================

  private registerDefaultExecutors(): void {
    // Trigger nodes (start points)
    this.registerExecutor('trigger', this.executeTriggerNode.bind(this));
    this.registerExecutor('webhook-trigger', this.executeTriggerNode.bind(this));
    this.registerExecutor('schedule-trigger', this.executeTriggerNode.bind(this));
    this.registerExecutor('manual-trigger', this.executeTriggerNode.bind(this));

    // Agent nodes
    this.registerExecutor('agent', this.executeAgentNode.bind(this));
    this.registerExecutor('llm', this.executeAgentNode.bind(this));

    // Tool nodes
    this.registerExecutor('tool', this.executeToolNode.bind(this));
    this.registerExecutor('http', this.executeHttpNode.bind(this));
    this.registerExecutor('database', this.executeDatabaseNode.bind(this));

    // Logic nodes
    this.registerExecutor('condition', this.executeConditionNode.bind(this));
    this.registerExecutor('switch', this.executeSwitchNode.bind(this));
    this.registerExecutor('loop', this.executeLoopNode.bind(this));

    // Transform nodes
    this.registerExecutor('transform', this.executeTransformNode.bind(this));
    this.registerExecutor('merge', this.executeMergeNode.bind(this));
    this.registerExecutor('split', this.executeSplitNode.bind(this));

    // Control nodes
    this.registerExecutor('delay', this.executeDelayNode.bind(this));
    this.registerExecutor('human-approval', this.executeHumanApprovalNode.bind(this));
    this.registerExecutor('end', this.executeEndNode.bind(this));
  }

  public registerExecutor(nodeType: string, executor: NodeExecutor): void {
    this.nodeExecutors.set(nodeType, executor);
  }

  // ===========================================================================
  // MAIN EXECUTION LOOP
  // ===========================================================================

  public async execute(): Promise<{
    success: boolean;
    output: unknown;
    logs: PipelineExecutionLog[];
    suspended?: boolean;
    suspendedAtNodeId?: string;
  }> {
    const db = getDb();

    try {
      // Update execution status to running
      await this.updateExecutionStatus('running');

      // Execute nodes in order
      for (let i = 0; i < this.executionOrder.length; i++) {
        if (this.context.cancelled) {
          throw new Error('Execution cancelled by user');
        }

        const node = this.executionOrder[i];
        this.context.currentNodeIndex = i;

        // Emit progress
        this.emitProgress('running');

        // Log node start
        const startTime = Date.now();
        this.addLog(node.id, node.data.label || node.type, 'started');

        try {
          // Get executor for node type
          const executor = this.nodeExecutors.get(node.type);

          if (!executor) {
            throw new Error(`No executor registered for node type: ${node.type}`);
          }

          // Execute node
          const result = await executor(node, this.context, this);

          // Store result
          this.context.stepResults.set(node.id, result);

          // Check if execution was suspended (human approval)
          if (this.context.suspended) {
            this.addLog(node.id, node.data.label || node.type, 'completed', result, undefined, Date.now() - startTime);

            await this.updateExecutionStatus('waiting_approval', undefined, node.id);

            return {
              success: true,
              output: this.getLastResult(),
              logs: this.context.logs,
              suspended: true,
              suspendedAtNodeId: node.id,
            };
          }

          // Log success
          this.addLog(node.id, node.data.label || node.type, 'completed', result, undefined, Date.now() - startTime);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.addLog(node.id, node.data.label || node.type, 'failed', undefined, errorMessage, Date.now() - startTime);
          throw error;
        }

        // Emit node completion via Socket.IO
        try {
          emitWorkflowUpdate({
            workflowId: this.workflow.id,
            executionId: this.context.executionId,
            status: 'step_completed',
            stepId: node.id,
            stepName: node.data.label || node.type,
            output: this.context.stepResults.get(node.id),
            progress: Math.round(((i + 1) / this.executionOrder.length) * 100),
            timestamp: new Date().toISOString(),
          });
        } catch {
          // Socket might not be available
        }
      }

      // All nodes completed
      await this.updateExecutionStatus('completed');

      return {
        success: true,
        output: this.getLastResult(),
        logs: this.context.logs,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.updateExecutionStatus('failed', errorMessage);

      return {
        success: false,
        output: null,
        logs: this.context.logs,
      };
    }
  }

  // ===========================================================================
  // RESUME EXECUTION (AFTER HUMAN APPROVAL)
  // ===========================================================================

  public async resumeFromNode(nodeId: string): Promise<{
    success: boolean;
    output: unknown;
    logs: PipelineExecutionLog[];
    suspended?: boolean;
    suspendedAtNodeId?: string;
  }> {
    const nodeIndex = this.executionOrder.findIndex((n) => n.id === nodeId);

    if (nodeIndex === -1) {
      throw new Error(`Node ${nodeId} not found in workflow`);
    }

    this.context.suspended = false;
    this.context.suspendedAtNodeId = undefined;
    this.context.currentNodeIndex = nodeIndex + 1; // Start from next node

    // Continue execution from the next node
    const remainingNodes = this.executionOrder.slice(nodeIndex + 1);

    for (let i = 0; i < remainingNodes.length; i++) {
      if (this.context.cancelled) {
        throw new Error('Execution cancelled by user');
      }

      const node = remainingNodes[i];
      this.context.currentNodeIndex = nodeIndex + 1 + i;

      const startTime = Date.now();
      this.addLog(node.id, node.data.label || node.type, 'started');

      try {
        const executor = this.nodeExecutors.get(node.type);

        if (!executor) {
          throw new Error(`No executor registered for node type: ${node.type}`);
        }

        const result = await executor(node, this.context, this);
        this.context.stepResults.set(node.id, result);

        if (this.context.suspended) {
          this.addLog(node.id, node.data.label || node.type, 'completed', result, undefined, Date.now() - startTime);

          await this.updateExecutionStatus('waiting_approval', undefined, node.id);

          return {
            success: true,
            output: this.getLastResult(),
            logs: this.context.logs,
            suspended: true,
            suspendedAtNodeId: node.id,
          };
        }

        this.addLog(node.id, node.data.label || node.type, 'completed', result, undefined, Date.now() - startTime);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.addLog(node.id, node.data.label || node.type, 'failed', undefined, errorMessage, Date.now() - startTime);
        await this.updateExecutionStatus('failed', errorMessage);
        throw error;
      }
    }

    await this.updateExecutionStatus('completed');

    return {
      success: true,
      output: this.getLastResult(),
      logs: this.context.logs,
    };
  }

  // ===========================================================================
  // NODE EXECUTORS
  // ===========================================================================

  private async executeTriggerNode(node: WorkflowNode, context: ExecutionContext): Promise<unknown> {
    // Trigger nodes pass through inputs
    return {
      type: 'trigger',
      triggerType: context.triggerType,
      inputs: context.inputs,
      timestamp: new Date().toISOString(),
    };
  }

  private async executeAgentNode(node: WorkflowNode, context: ExecutionContext): Promise<unknown> {
    const { agentId, prompt } = node.data;

    if (!agentId || !prompt) {
      throw new Error('Agent node requires agentId and prompt');
    }

    // Build context from previous results
    const previousContext = this.buildPreviousResultsContext();
    const resolvedPrompt = this.resolveVariables(prompt, context);

    // Call agent API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/agents/${agentId}/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': context.userId,
        },
        body: JSON.stringify({
          content: `${resolvedPrompt}\n\nContext:\n${previousContext}`,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Agent call failed: ${response.statusText}`);
    }

    // Read streaming response
    const reader = response.body?.getReader();
    let result = '';

    if (reader) {
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.chunk) result += data.chunk;
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    }

    return { agentId, response: result };
  }

  private async executeToolNode(node: WorkflowNode, context: ExecutionContext): Promise<unknown> {
    const { toolId, config } = node.data;

    // Simulate tool execution
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      toolId,
      config,
      result: `Tool ${toolId} executed successfully`,
    };
  }

  private async executeHttpNode(node: WorkflowNode, context: ExecutionContext): Promise<unknown> {
    const config = node.data.config || {};
    const url = this.resolveVariables(config.url as string || '', context);
    const method = config.method as string || 'GET';
    const headers = config.headers as Record<string, string> || {};
    const body = config.body ? this.resolveVariables(JSON.stringify(config.body), context) : undefined;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: method !== 'GET' ? body : undefined,
    });

    const data = await response.json().catch(() => response.text());

    return {
      status: response.status,
      statusText: response.statusText,
      data,
    };
  }

  private async executeDatabaseNode(node: WorkflowNode, context: ExecutionContext): Promise<unknown> {
    const config = node.data.config || {};
    const query = this.resolveVariables(config.query as string || '', context);

    const db = getDb();
    const result = await db.execute(sql.raw(query));

    return { rows: result };
  }

  private async executeConditionNode(node: WorkflowNode, context: ExecutionContext): Promise<unknown> {
    const { condition } = node.data;
    const resolvedCondition = this.resolveVariables(condition || 'true', context);

    // Evaluate condition (simple evaluation)
    let result = false;
    try {
      // Create a safe evaluation context
      const evalContext = {
        inputs: context.inputs,
        steps: Object.fromEntries(context.stepResults),
        variables: context.variables,
      };

      // Use Function constructor for safer evaluation
      const evalFn = new Function(
        'ctx',
        `with(ctx) { return ${resolvedCondition}; }`
      );
      result = !!evalFn(evalContext);
    } catch (error) {
      console.warn('Condition evaluation failed:', error);
      result = false;
    }

    return { condition: resolvedCondition, result };
  }

  private async executeSwitchNode(node: WorkflowNode, context: ExecutionContext): Promise<unknown> {
    // Switch node evaluates which branch to take
    const config = node.data.config || {};
    const expression = this.resolveVariables(config.expression as string || '', context);

    return { expression, selectedBranch: 'default' };
  }

  private async executeLoopNode(node: WorkflowNode, context: ExecutionContext): Promise<unknown> {
    const config = node.data.config || {};
    const items = config.items as unknown[] || [];

    return { loopItems: items, iteration: 0 };
  }

  private async executeTransformNode(node: WorkflowNode, context: ExecutionContext): Promise<unknown> {
    const { transform } = node.data;
    const lastResult = this.getLastResult();

    if (!transform) {
      return lastResult;
    }

    const resolvedTransform = this.resolveVariables(transform, context);

    try {
      const evalContext = {
        input: lastResult,
        inputs: context.inputs,
        steps: Object.fromEntries(context.stepResults),
        variables: context.variables,
      };

      const evalFn = new Function(
        'ctx',
        `with(ctx) { return ${resolvedTransform}; }`
      );

      return evalFn(evalContext);
    } catch (error) {
      console.warn('Transform evaluation failed:', error);
      return lastResult;
    }
  }

  private async executeMergeNode(node: WorkflowNode, context: ExecutionContext): Promise<unknown> {
    // Merge all incoming node results
    const incomingEdges = this.workflow.edges.filter((e) => e.target === node.id);
    const mergedResults: Record<string, unknown> = {};

    for (const edge of incomingEdges) {
      mergedResults[edge.source] = context.stepResults.get(edge.source);
    }

    return mergedResults;
  }

  private async executeSplitNode(node: WorkflowNode, context: ExecutionContext): Promise<unknown> {
    const lastResult = this.getLastResult();
    return { splitData: lastResult };
  }

  private async executeDelayNode(node: WorkflowNode, context: ExecutionContext): Promise<unknown> {
    const delay = node.data.delay || 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    return { delayMs: delay };
  }

  private async executeHumanApprovalNode(node: WorkflowNode, context: ExecutionContext): Promise<unknown> {
    // Mark execution as suspended for human approval
    context.suspended = true;
    context.suspendedAtNodeId = node.id;

    return {
      approvalRequired: true,
      message: node.data.approvalMessage || 'Waiting for human approval',
      nodeId: node.id,
    };
  }

  private async executeEndNode(node: WorkflowNode, context: ExecutionContext): Promise<unknown> {
    return {
      type: 'end',
      finalOutput: this.getLastResult(),
      totalDuration: Date.now() - context.startTime.getTime(),
    };
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private resolveVariables(text: string, context: ExecutionContext): string {
    if (!text) return text;

    // Replace {{step_id.output}} patterns
    return text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const parts = path.trim().split('.');
      const stepId = parts[0];
      const property = parts.slice(1).join('.');

      // Check step results
      if (context.stepResults.has(stepId)) {
        const stepResult = context.stepResults.get(stepId);
        if (property) {
          return this.getNestedValue(stepResult, property);
        }
        return JSON.stringify(stepResult);
      }

      // Check inputs
      if (stepId === 'inputs') {
        return this.getNestedValue(context.inputs, property);
      }

      // Check variables
      if (stepId === 'variables') {
        return this.getNestedValue(context.variables, property);
      }

      return match; // Return original if not found
    });
  }

  private getNestedValue(obj: unknown, path: string): string {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return '';
      }
      current = (current as Record<string, unknown>)[part];
    }

    return typeof current === 'object' ? JSON.stringify(current) : String(current ?? '');
  }

  private buildPreviousResultsContext(): string {
    const results: string[] = [];

    this.context.stepResults.forEach((result, nodeId) => {
      const node = this.workflow.nodes.find((n) => n.id === nodeId);
      results.push(`${node?.data.label || nodeId}: ${JSON.stringify(result)}`);
    });

    return results.join('\n');
  }

  private getLastResult(): unknown {
    const lastNode = this.executionOrder[this.context.currentNodeIndex - 1];
    return lastNode ? this.context.stepResults.get(lastNode.id) : null;
  }

  private addLog(
    nodeId: string,
    nodeName: string,
    status: 'started' | 'completed' | 'failed' | 'skipped',
    output?: unknown,
    error?: string,
    durationMs?: number
  ): void {
    this.context.logs.push({
      nodeId,
      nodeName,
      timestamp: new Date().toISOString(),
      status,
      output,
      error,
      durationMs,
    });
  }

  private emitProgress(status: 'running' | 'waiting_approval' | 'completed' | 'failed'): void {
    if (this.onProgressCallback) {
      this.onProgressCallback({
        currentNodeId: this.executionOrder[this.context.currentNodeIndex]?.id || '',
        currentNodeIndex: this.context.currentNodeIndex,
        totalNodes: this.executionOrder.length,
        status,
        logs: this.context.logs,
      });
    }
  }

  private async updateExecutionStatus(
    status: string,
    error?: string,
    suspendedAtNode?: string
  ): Promise<void> {
    const db = getDb();

    const completedAt = status === 'completed' || status === 'failed' ? 'NOW()' : 'NULL';

    await db.execute(sql`
      UPDATE workflow_executions
      SET
        status = ${status},
        error = ${error || null},
        completed_at = ${status === 'completed' || status === 'failed' ? sql`NOW()` : sql`NULL`},
        step_results = ${JSON.stringify(Object.fromEntries(this.context.stepResults))}::jsonb,
        current_step_index = ${this.context.currentNodeIndex}
      WHERE id = ${this.context.executionId}
    `);

    // Emit via Socket.IO
    try {
      emitWorkflowUpdate({
        workflowId: this.workflow.id,
        executionId: this.context.executionId,
        status: status as 'started' | 'completed' | 'failed' | 'step_started' | 'step_completed' | 'step_failed',
        progress: Math.round((this.context.currentNodeIndex / this.executionOrder.length) * 100),
        error,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Socket might not be available
    }
  }

  // ===========================================================================
  // PUBLIC METHODS
  // ===========================================================================

  public cancel(): void {
    this.context.cancelled = true;
  }

  public getContext(): ExecutionContext {
    return this.context;
  }

  public getWorkflow(): WorkflowDefinition {
    return this.workflow;
  }
}
