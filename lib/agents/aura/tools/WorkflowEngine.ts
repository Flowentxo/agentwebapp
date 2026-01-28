/**
 * PHASE 56-60: Workflow Execution Engine
 * Core workflow execution and management
 */

import { publishAgentEvent } from '@/lib/events/EventBus';

// ============================================
// TYPES
// ============================================

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  name: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
  inputs: WorkflowPort[];
  outputs: WorkflowPort[];
}

export type WorkflowNodeType =
  | 'trigger'
  | 'action'
  | 'condition'
  | 'loop'
  | 'parallel'
  | 'wait'
  | 'transform'
  | 'agent'
  | 'webhook'
  | 'email'
  | 'database'
  | 'http'
  | 'script';

export interface WorkflowPort {
  id: string;
  name: string;
  type: 'input' | 'output';
  dataType: 'any' | 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  default?: unknown;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
  condition?: string;
}

export interface WorkflowGraph {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: WorkflowVariableDefinition[];
  settings: WorkflowEngineSettings;
}

export interface WorkflowVariableDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'secret';
  defaultValue?: unknown;
  required: boolean;
  description?: string;
  validation?: string;
}

export interface WorkflowEngineSettings {
  maxExecutionTime: number;
  maxRetries: number;
  retryDelay: number;
  parallelLimit: number;
  errorHandling: 'fail-fast' | 'continue' | 'compensate';
  logging: 'minimal' | 'standard' | 'debug';
}

export interface ExecutionState {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  currentNodes: string[];
  completedNodes: string[];
  failedNodes: string[];
  variables: Record<string, unknown>;
  nodeOutputs: Record<string, unknown>;
  errors: ExecutionError[];
  logs: ExecutionLogEntry[];
  checkpoints: ExecutionCheckpoint[];
}

export interface ExecutionError {
  nodeId: string;
  message: string;
  stack?: string;
  timestamp: Date;
  retryCount: number;
}

export interface ExecutionLogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  nodeId?: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface ExecutionCheckpoint {
  id: string;
  nodeId: string;
  timestamp: Date;
  state: Record<string, unknown>;
}

export interface NodeExecutor {
  type: WorkflowNodeType;
  execute: (
    node: WorkflowNode,
    inputs: Record<string, unknown>,
    context: ExecutionContext
  ) => Promise<Record<string, unknown>>;
  validate?: (node: WorkflowNode) => { valid: boolean; errors: string[] };
}

export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  workspaceId: string;
  userId: string;
  variables: Record<string, unknown>;
  secrets: Record<string, string>;
  log: (level: string, message: string, data?: Record<string, unknown>) => void;
  emit: (event: string, data: unknown) => void;
}

// ============================================
// WORKFLOW ENGINE CLASS
// ============================================

export class WorkflowEngine {
  private executors: Map<WorkflowNodeType, NodeExecutor> = new Map();
  private executions: Map<string, ExecutionState> = new Map();
  private workflows: Map<string, WorkflowGraph> = new Map();

  constructor() {
    this.registerBuiltInExecutors();
  }

  // ============================================
  // WORKFLOW MANAGEMENT
  // ============================================

  /**
   * Register a workflow
   */
  public registerWorkflow(workflow: WorkflowGraph): void {
    const validation = this.validateWorkflow(workflow);
    if (!validation.valid) {
      throw new Error(`Invalid workflow: ${validation.errors.join(', ')}`);
    }
    this.workflows.set(workflow.id, workflow);
  }

  /**
   * Get workflow by ID
   */
  public getWorkflow(workflowId: string): WorkflowGraph | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * List all workflows
   */
  public listWorkflows(): WorkflowGraph[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Delete workflow
   */
  public deleteWorkflow(workflowId: string): boolean {
    return this.workflows.delete(workflowId);
  }

  /**
   * Validate workflow
   */
  public validateWorkflow(workflow: WorkflowGraph): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for trigger node
    const triggers = workflow.nodes.filter((n) => n.type === 'trigger');
    if (triggers.length === 0) {
      errors.push('Workflow must have at least one trigger node');
    }

    // Check for orphan nodes
    const connectedNodes = new Set<string>();
    for (const edge of workflow.edges) {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    }

    for (const node of workflow.nodes) {
      if (node.type !== 'trigger' && !connectedNodes.has(node.id)) {
        errors.push(`Node "${node.name}" is not connected`);
      }
    }

    // Validate individual nodes
    for (const node of workflow.nodes) {
      const executor = this.executors.get(node.type);
      if (executor?.validate) {
        const nodeValidation = executor.validate(node);
        if (!nodeValidation.valid) {
          errors.push(...nodeValidation.errors.map((e) => `${node.name}: ${e}`));
        }
      }
    }

    // Check for cycles in non-loop paths
    if (this.hasCycle(workflow)) {
      errors.push('Workflow contains cycles outside of loop nodes');
    }

    return { valid: errors.length === 0, errors };
  }

  // ============================================
  // EXECUTION MANAGEMENT
  // ============================================

  /**
   * Start workflow execution
   */
  public async execute(
    workflowId: string,
    inputs: Record<string, unknown>,
    options: {
      workspaceId: string;
      userId: string;
      async?: boolean;
    }
  ): Promise<ExecutionState> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Create execution state
    const executionId = `exec-${crypto.randomUUID().slice(0, 8)}`;
    const state: ExecutionState = {
      id: executionId,
      workflowId,
      status: 'pending',
      startedAt: new Date(),
      currentNodes: [],
      completedNodes: [],
      failedNodes: [],
      variables: { ...this.getDefaultVariables(workflow), ...inputs },
      nodeOutputs: {},
      errors: [],
      logs: [],
      checkpoints: [],
    };

    this.executions.set(executionId, state);

    // Log start
    this.log(state, 'info', 'Workflow execution started', { workflowId, inputs });

    // Emit event
    await publishAgentEvent(
      'workflow.started',
      { agentId: 'aura', workspaceId: options.workspaceId },
      { executionId, workflowId }
    );

    if (options.async) {
      // Run async
      this.runAsync(executionId, workflow, options);
      return state;
    }

    // Run sync
    await this.runExecution(executionId, workflow, options);
    return this.executions.get(executionId)!;
  }

  /**
   * Get execution status
   */
  public getExecution(executionId: string): ExecutionState | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Pause execution
   */
  public async pauseExecution(executionId: string): Promise<boolean> {
    const state = this.executions.get(executionId);
    if (!state || state.status !== 'running') {
      return false;
    }

    state.status = 'paused';
    this.log(state, 'info', 'Execution paused');

    // Create checkpoint
    this.createCheckpoint(state, 'pause');

    return true;
  }

  /**
   * Resume execution
   */
  public async resumeExecution(executionId: string): Promise<boolean> {
    const state = this.executions.get(executionId);
    if (!state || state.status !== 'paused') {
      return false;
    }

    state.status = 'running';
    this.log(state, 'info', 'Execution resumed');

    const workflow = this.workflows.get(state.workflowId);
    if (workflow) {
      this.runAsync(executionId, workflow, {
        workspaceId: 'default',
        userId: 'system',
      });
    }

    return true;
  }

  /**
   * Cancel execution
   */
  public async cancelExecution(executionId: string): Promise<boolean> {
    const state = this.executions.get(executionId);
    if (!state || !['running', 'paused', 'pending'].includes(state.status)) {
      return false;
    }

    state.status = 'cancelled';
    state.completedAt = new Date();
    this.log(state, 'info', 'Execution cancelled');

    return true;
  }

  // ============================================
  // NODE EXECUTORS
  // ============================================

  /**
   * Register custom node executor
   */
  public registerExecutor(executor: NodeExecutor): void {
    this.executors.set(executor.type, executor);
  }

  private registerBuiltInExecutors(): void {
    // Trigger executor
    this.registerExecutor({
      type: 'trigger',
      execute: async (node, inputs) => {
        return { triggered: true, timestamp: new Date().toISOString(), ...inputs };
      },
    });

    // Action executor
    this.registerExecutor({
      type: 'action',
      execute: async (node, inputs, context) => {
        const action = node.config.action as string;
        context.log('info', `Executing action: ${action}`);

        // Simulate action execution
        await this.delay(100);

        return { success: true, action, result: inputs };
      },
    });

    // Condition executor
    this.registerExecutor({
      type: 'condition',
      execute: async (node, inputs) => {
        const condition = node.config.condition as string;
        const result = this.evaluateCondition(condition, inputs);

        return { result, branch: result ? 'true' : 'false' };
      },
    });

    // Loop executor
    this.registerExecutor({
      type: 'loop',
      execute: async (node, inputs, context) => {
        const items = (inputs.items as unknown[]) || [];
        const results: unknown[] = [];

        for (let i = 0; i < items.length; i++) {
          context.log('debug', `Loop iteration ${i + 1}/${items.length}`);
          results.push({ index: i, item: items[i], processed: true });
        }

        return { results, count: items.length };
      },
    });

    // Parallel executor
    this.registerExecutor({
      type: 'parallel',
      execute: async (node, inputs) => {
        const branches = (node.config.branches as string[]) || [];

        // Simulate parallel execution
        const results = await Promise.all(
          branches.map(async (branch) => {
            await this.delay(50);
            return { branch, completed: true };
          })
        );

        return { results, completedBranches: branches.length };
      },
    });

    // Wait executor
    this.registerExecutor({
      type: 'wait',
      execute: async (node, inputs, context) => {
        const duration = (node.config.duration as number) || 1000;
        const waitType = (node.config.waitType as string) || 'delay';

        if (waitType === 'delay') {
          context.log('info', `Waiting for ${duration}ms`);
          await this.delay(Math.min(duration, 5000)); // Cap at 5 seconds
        }

        return { waited: true, duration };
      },
    });

    // Transform executor
    this.registerExecutor({
      type: 'transform',
      execute: async (node, inputs) => {
        const transformation = node.config.transformation as string;

        // Simple transformations
        switch (transformation) {
          case 'uppercase':
            return this.transformValues(inputs, (v) =>
              typeof v === 'string' ? v.toUpperCase() : v
            );
          case 'lowercase':
            return this.transformValues(inputs, (v) =>
              typeof v === 'string' ? v.toLowerCase() : v
            );
          case 'stringify':
            return { result: JSON.stringify(inputs) };
          case 'parse':
            return { result: typeof inputs.data === 'string' ? JSON.parse(inputs.data) : inputs.data };
          default:
            return inputs;
        }
      },
    });

    // Agent executor
    this.registerExecutor({
      type: 'agent',
      execute: async (node, inputs, context) => {
        const agentId = node.config.agentId as string;
        const task = node.config.task as string;

        context.log('info', `Delegating to agent: ${agentId}`);

        // Simulate agent execution
        await this.delay(200);

        return {
          agentId,
          task,
          result: 'Task completed by agent',
          timestamp: new Date().toISOString(),
        };
      },
    });

    // HTTP executor
    this.registerExecutor({
      type: 'http',
      execute: async (node, inputs, context) => {
        const url = node.config.url as string;
        const method = (node.config.method as string) || 'GET';

        context.log('info', `HTTP ${method}: ${url}`);

        // Simulate HTTP request
        await this.delay(150);

        return {
          status: 200,
          data: { message: 'Simulated response', url, method },
        };
      },
    });

    // Email executor
    this.registerExecutor({
      type: 'email',
      execute: async (node, inputs, context) => {
        const to = node.config.to as string;
        const subject = node.config.subject as string;

        context.log('info', `Sending email to: ${to}`);

        // Simulate email sending
        await this.delay(100);

        return {
          sent: true,
          to,
          subject,
          messageId: `msg-${crypto.randomUUID().slice(0, 8)}`,
        };
      },
    });

    // Database executor
    this.registerExecutor({
      type: 'database',
      execute: async (node, inputs, context) => {
        const operation = node.config.operation as string;
        const table = node.config.table as string;

        context.log('info', `Database ${operation} on ${table}`);

        // Simulate database operation
        await this.delay(50);

        return {
          operation,
          table,
          affected: Math.floor(Math.random() * 10) + 1,
          success: true,
        };
      },
    });

    // Script executor
    this.registerExecutor({
      type: 'script',
      execute: async (node, inputs, context) => {
        const code = node.config.code as string;
        const language = (node.config.language as string) || 'javascript';

        context.log('info', `Executing ${language} script`);

        // Note: In production, use a sandboxed execution environment
        // For now, just simulate
        await this.delay(100);

        return {
          executed: true,
          language,
          output: 'Script executed successfully',
        };
      },
    });

    // Webhook executor
    this.registerExecutor({
      type: 'webhook',
      execute: async (node, inputs) => {
        const webhookUrl = node.config.url as string;
        const payload = inputs;

        // Simulate webhook call
        await this.delay(100);

        return {
          sent: true,
          url: webhookUrl,
          payload,
          response: { status: 'ok' },
        };
      },
    });
  }

  // ============================================
  // EXECUTION LOGIC
  // ============================================

  private async runAsync(
    executionId: string,
    workflow: WorkflowGraph,
    options: { workspaceId: string; userId: string }
  ): Promise<void> {
    try {
      await this.runExecution(executionId, workflow, options);
    } catch (error) {
      const state = this.executions.get(executionId);
      if (state) {
        state.status = 'failed';
        state.completedAt = new Date();
        state.errors.push({
          nodeId: 'global',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
          retryCount: 0,
        });
      }
    }
  }

  private async runExecution(
    executionId: string,
    workflow: WorkflowGraph,
    options: { workspaceId: string; userId: string }
  ): Promise<void> {
    const state = this.executions.get(executionId);
    if (!state) return;

    state.status = 'running';

    // Create execution context
    const context: ExecutionContext = {
      executionId,
      workflowId: workflow.id,
      workspaceId: options.workspaceId,
      userId: options.userId,
      variables: state.variables,
      secrets: {},
      log: (level, message, data) => this.log(state, level as 'info', message, data),
      emit: async (event, data) => {
        await publishAgentEvent(
          `workflow.${event}` as 'workflow.started',
          { agentId: 'aura', workspaceId: options.workspaceId },
          data
        );
      },
    };

    // Find trigger nodes
    const triggers = workflow.nodes.filter((n) => n.type === 'trigger');

    // Execute from triggers
    for (const trigger of triggers) {
      await this.executeNode(trigger, workflow, state, context);
    }

    // Mark as completed if no errors
    if (state.status === 'running') {
      state.status = 'completed';
      state.completedAt = new Date();
      this.log(state, 'info', 'Workflow execution completed');

      await publishAgentEvent(
        'workflow.completed',
        { agentId: 'aura', workspaceId: options.workspaceId },
        { executionId, workflowId: workflow.id }
      );
    }
  }

  private async executeNode(
    node: WorkflowNode,
    workflow: WorkflowGraph,
    state: ExecutionState,
    context: ExecutionContext
  ): Promise<void> {
    if (state.status !== 'running') return;
    if (state.completedNodes.includes(node.id)) return;

    state.currentNodes.push(node.id);
    this.log(state, 'info', `Executing node: ${node.name}`, { nodeId: node.id });

    try {
      const executor = this.executors.get(node.type);
      if (!executor) {
        throw new Error(`No executor found for node type: ${node.type}`);
      }

      // Gather inputs from previous nodes
      const inputs = this.gatherNodeInputs(node, workflow, state);

      // Execute node
      const outputs = await executor.execute(node, inputs, context);

      // Store outputs
      state.nodeOutputs[node.id] = outputs;
      state.completedNodes.push(node.id);
      state.currentNodes = state.currentNodes.filter((id) => id !== node.id);

      this.log(state, 'debug', `Node completed: ${node.name}`, { outputs });

      // Find and execute next nodes
      const nextEdges = workflow.edges.filter((e) => e.source === node.id);

      for (const edge of nextEdges) {
        // Check edge condition if present
        if (edge.condition && !this.evaluateCondition(edge.condition, outputs)) {
          continue;
        }

        const nextNode = workflow.nodes.find((n) => n.id === edge.target);
        if (nextNode) {
          await this.executeNode(nextNode, workflow, state, context);
        }
      }
    } catch (error) {
      state.failedNodes.push(node.id);
      state.currentNodes = state.currentNodes.filter((id) => id !== node.id);

      const errorEntry: ExecutionError = {
        nodeId: node.id,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date(),
        retryCount: 0,
      };

      state.errors.push(errorEntry);
      this.log(state, 'error', `Node failed: ${node.name}`, { error: errorEntry });

      // Handle based on settings
      const settings = workflow.settings;
      if (settings.errorHandling === 'fail-fast') {
        state.status = 'failed';
        state.completedAt = new Date();
      }
    }
  }

  private gatherNodeInputs(
    node: WorkflowNode,
    workflow: WorkflowGraph,
    state: ExecutionState
  ): Record<string, unknown> {
    const inputs: Record<string, unknown> = { ...state.variables };

    // Find incoming edges
    const incomingEdges = workflow.edges.filter((e) => e.target === node.id);

    for (const edge of incomingEdges) {
      const sourceOutput = state.nodeOutputs[edge.source];
      if (sourceOutput) {
        if (edge.sourcePort) {
          inputs[edge.targetPort || 'input'] = (sourceOutput as Record<string, unknown>)[edge.sourcePort];
        } else {
          Object.assign(inputs, sourceOutput);
        }
      }
    }

    return inputs;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private getDefaultVariables(workflow: WorkflowGraph): Record<string, unknown> {
    const defaults: Record<string, unknown> = {};

    for (const variable of workflow.variables) {
      if (variable.defaultValue !== undefined) {
        defaults[variable.name] = variable.defaultValue;
      }
    }

    return defaults;
  }

  private evaluateCondition(condition: string, context: Record<string, unknown>): boolean {
    // Simple condition evaluation
    // In production, use a proper expression evaluator
    try {
      const parts = condition.split(/\s+(==|!=|>|<|>=|<=)\s+/);
      if (parts.length !== 3) {
        return Boolean(context[condition]);
      }

      const [left, operator, right] = parts;
      const leftValue = context[left] ?? left;
      const rightValue = context[right] ?? this.parseValue(right);

      switch (operator) {
        case '==':
          return leftValue == rightValue;
        case '!=':
          return leftValue != rightValue;
        case '>':
          return Number(leftValue) > Number(rightValue);
        case '<':
          return Number(leftValue) < Number(rightValue);
        case '>=':
          return Number(leftValue) >= Number(rightValue);
        case '<=':
          return Number(leftValue) <= Number(rightValue);
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  private parseValue(value: string): unknown {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (!isNaN(Number(value))) return Number(value);
    return value.replace(/^['"]|['"]$/g, '');
  }

  private transformValues(
    obj: Record<string, unknown>,
    transform: (value: unknown) => unknown
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      result[key] = transform(value);
    }

    return result;
  }

  private hasCycle(workflow: WorkflowGraph): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoing = workflow.edges.filter((e) => e.source === nodeId);

      for (const edge of outgoing) {
        if (!visited.has(edge.target)) {
          if (dfs(edge.target)) return true;
        } else if (recursionStack.has(edge.target)) {
          // Check if it's a loop node (allowed cycle)
          const targetNode = workflow.nodes.find((n) => n.id === edge.target);
          if (targetNode?.type !== 'loop') {
            return true;
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of workflow.nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true;
      }
    }

    return false;
  }

  private log(
    state: ExecutionState,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: Record<string, unknown>
  ): void {
    state.logs.push({
      timestamp: new Date(),
      level,
      message,
      data,
    });
  }

  private createCheckpoint(state: ExecutionState, reason: string): void {
    state.checkpoints.push({
      id: `cp-${crypto.randomUUID().slice(0, 8)}`,
      nodeId: state.currentNodes[0] || 'none',
      timestamp: new Date(),
      state: {
        variables: { ...state.variables },
        nodeOutputs: { ...state.nodeOutputs },
        completedNodes: [...state.completedNodes],
        reason,
      },
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton
export const workflowEngine = new WorkflowEngine();
