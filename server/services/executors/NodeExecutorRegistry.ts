/**
 * FLOWENT AI STUDIO - NODE EXECUTOR REGISTRY
 *
 * Central registry that routes node execution to the appropriate executor.
 * Uses GenericProviderExecutor for most nodes, with specialized executors
 * for complex nodes that require custom logic (AI Agents, Loops, Sub-workflows).
 *
 * @version 1.0.0
 */

import {
  GenericProviderExecutor,
  getGenericProviderExecutor,
  ExecutionContext,
  NodeConfig,
  ExecutionResult,
} from './GenericProviderExecutor';
import { getNodeById, NodeDefinition } from '@/lib/studio/node-definitions';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Interface for specialized node executors
 */
export interface INodeExecutor {
  /** Unique executor ID */
  id: string;
  /** Node types this executor handles */
  nodeTypes: string[];
  /** Execute the node */
  execute(
    nodeConfig: NodeConfig,
    context: ExecutionContext
  ): Promise<ExecutionResult>;
  /** Optional: Validate node configuration */
  validate?(nodeConfig: NodeConfig): { valid: boolean; errors?: string[] };
  /** Optional: Cleanup after execution */
  cleanup?(): Promise<void>;
}

/**
 * Registry configuration
 */
export interface RegistryConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Default timeout for all nodes */
  defaultTimeoutMs?: number;
  /** Max parallel executions per workflow */
  maxParallelExecutions?: number;
}

// ============================================================================
// SPECIALIZED EXECUTOR STUBS
// ============================================================================

/**
 * AI Agent Executor - Handles OpenAI, Anthropic, and custom AI agents
 * Complex orchestration with streaming, token tracking, and conversation management
 */
export class AIAgentExecutor implements INodeExecutor {
  id = 'ai-agent';
  nodeTypes = [
    'ai_openai_chat',
    'ai_anthropic_chat',
    'ai_custom_agent',
    'ai_langchain',
    'ai_rag_query',
  ];

  async execute(
    nodeConfig: NodeConfig,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Delegate to generic executor for now
    // TODO: Implement streaming, token tracking, conversation management
    const executor = getGenericProviderExecutor();
    return executor.execute(nodeConfig, context);
  }
}

/**
 * Loop Executor - Handles iterative execution with context propagation
 */
export class LoopExecutor implements INodeExecutor {
  id = 'loop';
  nodeTypes = ['loop', 'for_each', 'while'];

  async execute(
    nodeConfig: NodeConfig,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const values = nodeConfig.values;

    // Extract loop configuration
    const items = values.items as unknown[] || [];
    const maxIterations = (values.maxIterations as number) || 1000;
    const batchSize = (values.batchSize as number) || 10;

    // Limit items
    const limitedItems = items.slice(0, maxIterations);

    // For now, return items for downstream processing
    // The execution engine will handle the actual iteration
    return {
      success: true,
      data: {
        items: limitedItems,
        total: items.length,
        batchSize,
        iterations: Math.ceil(limitedItems.length / batchSize),
      },
      meta: {
        durationMs: Date.now() - startTime,
      },
    };
  }
}

/**
 * Sub-Workflow Executor - Handles nested workflow execution
 */
export class SubWorkflowExecutor implements INodeExecutor {
  id = 'sub-workflow';
  nodeTypes = ['sub_workflow', 'call_workflow'];

  async execute(
    nodeConfig: NodeConfig,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const values = nodeConfig.values;

    const workflowId = values.workflowId as string;
    if (!workflowId) {
      return {
        success: false,
        error: { message: 'Workflow ID is required' },
        meta: { durationMs: Date.now() - startTime },
      };
    }

    // Sub-workflow execution is handled by the main execution engine
    // We return a marker that triggers sub-workflow execution
    return {
      success: true,
      data: {
        type: 'sub_workflow_trigger',
        workflowId,
        inputData: values.input || {},
        inheritCredentials: values.inheritCredentials ?? true,
        waitForCompletion: values.waitForCompletion ?? true,
      },
      meta: {
        durationMs: Date.now() - startTime,
      },
    };
  }
}

/**
 * Webhook Trigger Executor - Handles incoming webhooks
 */
export class WebhookTriggerExecutor implements INodeExecutor {
  id = 'webhook-trigger';
  nodeTypes = ['webhook_trigger', 'http_trigger'];

  async execute(
    nodeConfig: NodeConfig,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Webhook triggers are handled by the trigger system
    // This executor just passes through the received data
    return {
      success: true,
      data: context.variables['$trigger'] || {},
      meta: {
        durationMs: Date.now() - startTime,
      },
    };
  }
}

/**
 * Schedule Trigger Executor - Handles cron-based triggers
 */
export class ScheduleTriggerExecutor implements INodeExecutor {
  id = 'schedule-trigger';
  nodeTypes = ['schedule_trigger', 'cron_trigger'];

  async execute(
    nodeConfig: NodeConfig,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Schedule triggers provide timing information
    return {
      success: true,
      data: {
        triggeredAt: new Date().toISOString(),
        scheduledTime: context.variables['$scheduledTime'],
        cronExpression: nodeConfig.values.cron,
      },
      meta: {
        durationMs: Date.now() - startTime,
      },
    };
  }
}

/**
 * Error Handler Executor - Manages error handling nodes
 */
export class ErrorHandlerExecutor implements INodeExecutor {
  id = 'error-handler';
  nodeTypes = ['try_catch', 'error_handler', 'on_error'];

  async execute(
    nodeConfig: NodeConfig,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Error handling is managed by the execution engine
    // This executor just marks the error handling point
    return {
      success: true,
      data: {
        type: 'error_handler',
        fallbackBranch: nodeConfig.values.fallbackBranch,
        retryCount: nodeConfig.values.retryCount || 0,
      },
      meta: {
        durationMs: Date.now() - startTime,
      },
    };
  }
}

// ============================================================================
// NODE EXECUTOR REGISTRY
// ============================================================================

export class NodeExecutorRegistry {
  private executors: Map<string, INodeExecutor> = new Map();
  private nodeTypeToExecutor: Map<string, string> = new Map();
  private genericExecutor: GenericProviderExecutor;
  private config: RegistryConfig;

  constructor(config: RegistryConfig = {}) {
    this.config = {
      debug: false,
      defaultTimeoutMs: 30000,
      maxParallelExecutions: 10,
      ...config,
    };

    this.genericExecutor = getGenericProviderExecutor();
    this.registerBuiltInExecutors();
  }

  /**
   * Register built-in specialized executors
   */
  private registerBuiltInExecutors(): void {
    const builtIn: INodeExecutor[] = [
      new AIAgentExecutor(),
      new LoopExecutor(),
      new SubWorkflowExecutor(),
      new WebhookTriggerExecutor(),
      new ScheduleTriggerExecutor(),
      new ErrorHandlerExecutor(),
    ];

    for (const executor of builtIn) {
      this.register(executor);
    }

    if (this.config.debug) {
      console.log(
        `[ExecutorRegistry] Registered ${builtIn.length} built-in executors`
      );
    }
  }

  /**
   * Register a custom executor
   */
  register(executor: INodeExecutor): void {
    this.executors.set(executor.id, executor);

    for (const nodeType of executor.nodeTypes) {
      this.nodeTypeToExecutor.set(nodeType, executor.id);
    }

    if (this.config.debug) {
      console.log(
        `[ExecutorRegistry] Registered executor: ${executor.id} for ${executor.nodeTypes.join(', ')}`
      );
    }
  }

  /**
   * Unregister an executor
   */
  unregister(executorId: string): void {
    const executor = this.executors.get(executorId);
    if (executor) {
      for (const nodeType of executor.nodeTypes) {
        this.nodeTypeToExecutor.delete(nodeType);
      }
      this.executors.delete(executorId);
    }
  }

  /**
   * Get executor for a node type
   */
  getExecutor(nodeType: string): INodeExecutor | GenericProviderExecutor {
    const executorId = this.nodeTypeToExecutor.get(nodeType);
    if (executorId) {
      return this.executors.get(executorId)!;
    }
    return this.genericExecutor;
  }

  /**
   * Check if a node type has a specialized executor
   */
  hasSpecializedExecutor(nodeType: string): boolean {
    return this.nodeTypeToExecutor.has(nodeType);
  }

  /**
   * Execute a node
   */
  async execute(
    nodeConfig: NodeConfig,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Get node definition for validation
    const nodeDef = getNodeById(nodeConfig.type);

    // Validate configuration
    const validationResult = this.validateNodeConfig(nodeConfig, nodeDef);
    if (!validationResult.valid) {
      return {
        success: false,
        error: {
          message: 'Invalid node configuration',
          details: validationResult.errors,
        },
        meta: {
          durationMs: Date.now() - startTime,
        },
      };
    }

    // Apply default timeout
    if (!nodeConfig.timeout) {
      nodeConfig.timeout = this.config.defaultTimeoutMs;
    }

    // Get appropriate executor
    const executor = this.getExecutor(nodeConfig.type);

    if (this.config.debug) {
      const isSpecialized = executor !== this.genericExecutor;
      console.log(
        `[ExecutorRegistry] Executing ${nodeConfig.type} with ${
          isSpecialized ? (executor as INodeExecutor).id : 'generic'
        } executor`
      );
    }

    // Execute
    try {
      if ('id' in executor) {
        // Specialized executor
        return await (executor as INodeExecutor).execute(nodeConfig, context);
      } else {
        // Generic executor
        return await executor.execute(nodeConfig, context);
      }
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Execution failed',
          details: error instanceof Error ? error.stack : error,
        },
        meta: {
          durationMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Validate node configuration
   */
  private validateNodeConfig(
    nodeConfig: NodeConfig,
    nodeDef?: NodeDefinition
  ): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Check for node type
    if (!nodeConfig.type) {
      errors.push('Node type is required');
    }

    // Check required fields from node definition
    if (nodeDef) {
      for (const field of nodeDef.fields || []) {
        if (field.required && nodeConfig.values[field.id] === undefined) {
          errors.push(`Required field missing: ${field.label || field.id}`);
        }
      }
    }

    // Check for specialized executor validation
    const executorId = this.nodeTypeToExecutor.get(nodeConfig.type);
    if (executorId) {
      const executor = this.executors.get(executorId);
      if (executor?.validate) {
        const result = executor.validate(nodeConfig);
        if (!result.valid && result.errors) {
          errors.push(...result.errors);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Execute multiple nodes in parallel
   */
  async executeParallel(
    nodes: Array<{ config: NodeConfig; context: ExecutionContext }>,
    maxConcurrent?: number
  ): Promise<Map<string, ExecutionResult>> {
    const max = maxConcurrent || this.config.maxParallelExecutions || 10;
    const results = new Map<string, ExecutionResult>();

    // Process in batches
    for (let i = 0; i < nodes.length; i += max) {
      const batch = nodes.slice(i, i + max);
      const batchResults = await Promise.all(
        batch.map(async ({ config, context }) => {
          const result = await this.execute(config, context);
          return { nodeId: context.nodeId, result };
        })
      );

      for (const { nodeId, result } of batchResults) {
        results.set(nodeId, result);
      }
    }

    return results;
  }

  /**
   * Get list of all registered executors
   */
  listExecutors(): Array<{ id: string; nodeTypes: string[] }> {
    return Array.from(this.executors.values()).map((e) => ({
      id: e.id,
      nodeTypes: e.nodeTypes,
    }));
  }

  /**
   * Check if a node type is supported
   */
  isSupported(nodeType: string): boolean {
    // Specialized executor exists
    if (this.nodeTypeToExecutor.has(nodeType)) {
      return true;
    }

    // Check if node definition exists (generic executor can handle it)
    const nodeDef = getNodeById(nodeType);
    return !!nodeDef;
  }

  /**
   * Cleanup all executors
   */
  async cleanup(): Promise<void> {
    const cleanupPromises: Promise<void>[] = [];

    for (const executor of this.executors.values()) {
      if (executor.cleanup) {
        cleanupPromises.push(executor.cleanup());
      }
    }

    await Promise.all(cleanupPromises);
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let registryInstance: NodeExecutorRegistry | null = null;

export function getNodeExecutorRegistry(
  config?: RegistryConfig
): NodeExecutorRegistry {
  if (!registryInstance) {
    registryInstance = new NodeExecutorRegistry(config);
  }
  return registryInstance;
}

/**
 * Reset registry (useful for testing)
 */
export function resetNodeExecutorRegistry(): void {
  registryInstance = null;
}

export default NodeExecutorRegistry;
