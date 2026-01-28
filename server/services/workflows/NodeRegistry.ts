/**
 * Node Registry
 *
 * Maps node types to their executor functions.
 * This registry allows for modular addition of new node types.
 */

import { NodeExecutor, WorkflowNode, ExecutionContext, NodeOutput } from './types';
import {
  executeWebhookTrigger,
  executeAgentNode,
  executeActionNode,
  executeConditionNode,
  executeOutputNode,
} from './executors';

// Registry mapping node data types to executors
const NODE_TYPE_EXECUTORS: Record<string, NodeExecutor> = {
  // Trigger nodes
  trigger: executeWebhookTrigger,
  webhook: executeWebhookTrigger,
  'webhook-trigger': executeWebhookTrigger,
  schedule: executeWebhookTrigger, // Placeholder - would have its own executor

  // Agent nodes
  agent: executeAgentNode,
  ai: executeAgentNode,
  'ai-agent': executeAgentNode,

  // Action nodes
  action: executeActionNode,
  'http-request': executeActionNode,
  'send-email': executeActionNode,
  'slack-notify': executeActionNode,
  database: executeActionNode,
  transform: executeActionNode,

  // Condition nodes
  condition: executeConditionNode,
  'if-else': executeConditionNode,
  branch: executeConditionNode,
  filter: executeConditionNode,

  // Output nodes
  output: executeOutputNode,
  terminal: executeOutputNode,
  end: executeOutputNode,
};

// Default executor for unknown node types
const DEFAULT_EXECUTOR: NodeExecutor = async (
  node: WorkflowNode,
  context: ExecutionContext,
  inputs: Record<string, unknown>
): Promise<NodeOutput> => {
  const startTime = Date.now();

  console.log(`[DefaultExecutor] Unknown node type: ${node.data.type}`);
  console.log(`[DefaultExecutor] Node ID: ${node.id}, Label: ${node.data.label}`);
  console.log(`[DefaultExecutor] Passing through inputs:`, inputs);

  return {
    success: true,
    data: {
      passthrough: true,
      nodeType: node.data.type,
      inputs,
    },
    duration: Date.now() - startTime,
    timestamp: new Date(),
  };
};

/**
 * NodeRegistry class
 *
 * Provides executor lookup and registration functionality
 */
export class NodeRegistry {
  private executors: Map<string, NodeExecutor>;

  constructor() {
    this.executors = new Map(Object.entries(NODE_TYPE_EXECUTORS));
  }

  /**
   * Get the executor for a node type
   */
  getExecutor(nodeType: string): NodeExecutor {
    const normalizedType = nodeType.toLowerCase().trim();
    return this.executors.get(normalizedType) || DEFAULT_EXECUTOR;
  }

  /**
   * Register a new executor for a node type
   */
  registerExecutor(nodeType: string, executor: NodeExecutor): void {
    const normalizedType = nodeType.toLowerCase().trim();
    this.executors.set(normalizedType, executor);
    console.log(`[NodeRegistry] Registered executor for type: ${normalizedType}`);
  }

  /**
   * Check if an executor exists for a node type
   */
  hasExecutor(nodeType: string): boolean {
    const normalizedType = nodeType.toLowerCase().trim();
    return this.executors.has(normalizedType);
  }

  /**
   * Get all registered node types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.executors.keys());
  }

  /**
   * Get executor for a workflow node (uses node.data.type)
   */
  getExecutorForNode(node: WorkflowNode): NodeExecutor {
    return this.getExecutor(node.data.type);
  }
}

// Singleton instance
export const nodeRegistry = new NodeRegistry();
