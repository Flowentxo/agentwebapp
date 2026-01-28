/**
 * EXECUTION TYPES
 *
 * Core type definitions for the Flowent Pipeline Studio Execution Engine.
 * Implements Shared State pattern for data flow between workflow nodes.
 */

import { Node, Edge } from 'reactflow';

// ============================================================================
// NODE OUTPUT TYPES
// ============================================================================

/**
 * Result of a single node execution
 */
export interface NodeOutput {
  /** Raw output data from the node */
  data: any;
  /** Timestamp when execution started */
  startedAt: number;
  /** Timestamp when execution completed */
  completedAt: number;
  /** Execution duration in milliseconds */
  durationMs: number;
  /** Whether the node executed successfully */
  success: boolean;
  /** Error message if execution failed */
  error?: string;
  /** Token usage for AI nodes */
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Cost incurred by this node */
  cost?: number;
}

/**
 * Status of a node during execution
 */
export type NodeExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'error'
  | 'skipped'
  | 'waiting_approval'
  | 'cancelled';

/**
 * Live status update for a node
 */
export interface NodeStatusUpdate {
  nodeId: string;
  status: NodeExecutionStatus;
  output?: any;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  progress?: number;
}

// ============================================================================
// EXECUTION STATE (SHARED STATE PATTERN)
// ============================================================================

/**
 * Global state accessible throughout the workflow execution
 */
export interface GlobalState {
  /** Current user ID */
  userId: string;
  /** User's email address */
  userEmail?: string;
  /** User's display name */
  userName?: string;
  /** Current workspace ID */
  workspaceId?: string;
  /** Environment variables (non-sensitive) */
  env: Record<string, string>;
  /** Current timestamp */
  timestamp: number;
  /** Execution mode */
  isTest: boolean;
  /** Custom global data */
  [key: string]: any;
}

/**
 * Node outputs storage - keyed by nodeId
 */
export interface NodesState {
  [nodeId: string]: {
    /** The resolved output from this node */
    output: any;
    /** Execution metadata */
    meta: {
      status: NodeExecutionStatus;
      startedAt?: number;
      completedAt?: number;
      durationMs?: number;
      error?: string;
      retryCount?: number;
    };
  };
}

/**
 * Custom variables that can be set during execution
 */
export interface VariablesState {
  [variableName: string]: any;
}

/**
 * The complete shared state for workflow execution
 */
export interface ExecutionState {
  /** Global context (user, env, timestamps) */
  global: GlobalState;
  /** Node outputs (keyed by nodeId) */
  nodes: NodesState;
  /** Custom variables set during execution */
  variables: VariablesState;
  /** Trigger data (initial input) */
  trigger: {
    type: 'manual' | 'webhook' | 'scheduled' | 'api';
    payload: any;
    timestamp: number;
  };
}

// ============================================================================
// EXECUTION CONTEXT
// ============================================================================

/**
 * Execution log entry
 */
export interface ExecutionLogEntry {
  timestamp: number;
  nodeId: string;
  nodeName: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'success';
  message: string;
  data?: any;
}

/**
 * Full execution context passed to nodes and services
 */
export interface ExecutionContext {
  /** Unique execution ID (UUID) */
  executionId: string;
  /** Workflow/Pipeline ID */
  workflowId: string;
  /** User who triggered the execution */
  userId: string;
  /** Workspace context */
  workspaceId?: string;
  /** Whether this is a test run */
  isTest: boolean;
  /** Timestamp when execution started */
  startTime: number;
  /** The shared state object */
  state: ExecutionState;
  /** Execution logs */
  logs: ExecutionLogEntry[];
  /** Current execution status */
  status: 'pending' | 'running' | 'completed' | 'error' | 'cancelled' | 'suspended';
  /** Currently executing node ID */
  currentNodeId: string | null;
  /** Error message if execution failed */
  error?: string;
  /** Error code for categorization */
  errorCode?: string;
  /** All nodes in the workflow (for reference) */
  nodes: Node[];
  /** All edges in the workflow (for graph traversal) */
  edges: Edge[];
  /** Budget tracking */
  budget: {
    enabled: boolean;
    totalCostIncurred: number;
    remainingBudget: number;
  };
  /** Node ID where execution is suspended (for HITL) */
  suspendedNodeId?: string;
  /** Approval request data when suspended */
  approvalRequest?: {
    approvalId: string;
    executionId: string;
    workflowId: string;
    nodeId: string;
    requestedBy: string;
    requestedAt: string;
    expiresAt: string;
    title: string;
    description: string;
    contextData: Record<string, unknown>;
    status: 'pending' | 'approved' | 'rejected' | 'expired';
  };
}

// ============================================================================
// VARIABLE RESOLUTION TYPES
// ============================================================================

/**
 * Pattern for variable references: {{path.to.value}}
 */
export const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

/**
 * Single variable match result
 */
export interface VariableMatch {
  /** Full match including braces: {{nodeId.output.key}} */
  fullMatch: string;
  /** Path without braces: nodeId.output.key */
  path: string;
  /** Start index in the string */
  startIndex: number;
  /** End index in the string */
  endIndex: number;
}

/**
 * Result of variable resolution
 */
export interface ResolvedVariable {
  /** Original path */
  path: string;
  /** Resolved value (can be any type) */
  value: any;
  /** Whether resolution was successful */
  found: boolean;
  /** Error if resolution failed */
  error?: string;
}

// ============================================================================
// NODE EXECUTOR TYPES
// ============================================================================

/**
 * Input passed to a node executor
 */
export interface NodeExecutorInput {
  /** The node being executed */
  node: Node;
  /** Full execution context */
  context: ExecutionContext;
  /** Resolved inputs (after variable substitution) */
  inputs: any;
  /** Raw inputs before resolution (for debugging) */
  rawInputs: any;
}

/**
 * Output from a node executor
 */
export interface NodeExecutorOutput {
  /** The output data */
  data: any;
  /** Whether execution was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Additional metadata */
  meta?: {
    tokenUsage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    cost?: number;
    duration?: number;
  };
}

/**
 * Node executor interface
 */
export interface INodeExecutor {
  execute(input: NodeExecutorInput): Promise<NodeExecutorOutput>;
}

// ============================================================================
// WORKFLOW DEFINITION TYPES
// ============================================================================

/**
 * Workflow definition stored in database
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  status: 'draft' | 'active' | 'archived';
  version: string;
  userId: string;
  workspaceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Options for starting a workflow execution
 */
export interface ExecutionOptions {
  /** Skip budget checks */
  skipBudgetCheck?: boolean;
  /** Custom variables to inject */
  variables?: Record<string, any>;
  /** Execution priority (for queue) */
  priority?: number;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Webhook callback URL for status updates */
  callbackUrl?: string;
}

// ============================================================================
// HELPER TYPE GUARDS
// ============================================================================

/**
 * Check if a value is a variable reference string
 */
export function isVariableReference(value: unknown): value is string {
  return typeof value === 'string' && VARIABLE_PATTERN.test(value);
}

/**
 * Check if a string is ONLY a variable reference (no other text)
 */
export function isPureVariableReference(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  const match = trimmed.match(/^\{\{([^}]+)\}\}$/);
  return match !== null && match[0] === trimmed;
}

/**
 * Extract variable path from a pure reference
 */
export function extractVariablePath(value: string): string | null {
  const match = value.trim().match(/^\{\{([^}]+)\}\}$/);
  return match ? match[1].trim() : null;
}
