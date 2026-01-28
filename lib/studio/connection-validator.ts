/**
 * CONNECTION VALIDATOR
 *
 * Phase 22: Node Connectivity System
 *
 * Validates connections between nodes to prevent illegal workflows:
 * - Cycle prevention (DFS-based)
 * - Self-connection prevention
 * - Type validation (trigger, action, condition, output)
 * - Handle-level validation
 *
 * @version 1.0.0
 */

import { Node, Edge, Connection } from '@xyflow/react';

// ============================================================================
// TYPES
// ============================================================================

export type NodeType = 'trigger' | 'action' | 'agent' | 'condition' | 'output' | 'logic' | 'integration';

export interface ConnectionValidationResult {
  isValid: boolean;
  reason?: string;
  warningLevel?: 'error' | 'warning' | 'info';
}

export interface HandleConfig {
  type: 'source' | 'target';
  id: string;
  label?: string;
  maxConnections?: number;
  acceptedTypes?: NodeType[];
}

// ============================================================================
// HANDLE CONFIGURATION BY NODE TYPE
// ============================================================================

/**
 * Define handle configurations for each node type
 * This mirrors the n8n approach where different nodes have different port configurations
 */
export const NODE_HANDLE_CONFIG: Record<NodeType, {
  inputs: HandleConfig[];
  outputs: HandleConfig[];
  maxInputConnections: number;
  maxOutputConnections: number;
}> = {
  trigger: {
    // Triggers only have output - they START workflows
    inputs: [],
    outputs: [
      { type: 'source', id: 'output', label: 'Output', maxConnections: Infinity }
    ],
    maxInputConnections: 0,
    maxOutputConnections: Infinity,
  },

  action: {
    inputs: [
      { type: 'target', id: 'input', label: 'Input', maxConnections: 1 }
    ],
    outputs: [
      { type: 'source', id: 'output', label: 'Output', maxConnections: Infinity }
    ],
    maxInputConnections: 1,
    maxOutputConnections: Infinity,
  },

  agent: {
    inputs: [
      { type: 'target', id: 'input', label: 'Input', maxConnections: 1 }
    ],
    outputs: [
      { type: 'source', id: 'output', label: 'Output', maxConnections: Infinity }
    ],
    maxInputConnections: 1,
    maxOutputConnections: Infinity,
  },

  condition: {
    // Condition nodes (If/Else) have one input and TWO outputs
    inputs: [
      { type: 'target', id: 'input', label: 'Input', maxConnections: 1 }
    ],
    outputs: [
      { type: 'source', id: 'true', label: 'True', maxConnections: Infinity },
      { type: 'source', id: 'false', label: 'False', maxConnections: Infinity }
    ],
    maxInputConnections: 1,
    maxOutputConnections: Infinity,
  },

  logic: {
    // Logic nodes (loops, delays, etc.)
    inputs: [
      { type: 'target', id: 'input', label: 'Input', maxConnections: 1 }
    ],
    outputs: [
      { type: 'source', id: 'output', label: 'Output', maxConnections: Infinity }
    ],
    maxInputConnections: 1,
    maxOutputConnections: Infinity,
  },

  integration: {
    inputs: [
      { type: 'target', id: 'input', label: 'Input', maxConnections: 1 }
    ],
    outputs: [
      { type: 'source', id: 'output', label: 'Output', maxConnections: Infinity }
    ],
    maxInputConnections: 1,
    maxOutputConnections: Infinity,
  },

  output: {
    // Output nodes END workflows - no output handle
    inputs: [
      { type: 'target', id: 'input', label: 'Input', maxConnections: Infinity }
    ],
    outputs: [],
    maxInputConnections: Infinity, // Can aggregate multiple inputs
    maxOutputConnections: 0,
  },
};

// ============================================================================
// CORE VALIDATION FUNCTIONS
// ============================================================================

/**
 * Get node type from node data
 */
export function getNodeType(node: Node): NodeType {
  const type = node.data?.type;
  if (type && Object.keys(NODE_HANDLE_CONFIG).includes(type)) {
    return type as NodeType;
  }
  // Default to action for backwards compatibility
  return 'action';
}

/**
 * Check if connecting to self
 */
export function isSelfConnection(connection: Connection): boolean {
  return connection.source === connection.target;
}

/**
 * Check if connection would create a cycle using DFS
 *
 * @param nodes - All nodes in the graph
 * @param edges - All existing edges
 * @param newConnection - The proposed new connection
 * @returns true if adding this connection would create a cycle
 */
export function wouldCreateCycle(
  nodes: Node[],
  edges: Edge[],
  newConnection: Connection
): boolean {
  const { source, target } = newConnection;
  if (!source || !target) return false;

  // Build adjacency list from existing edges + proposed connection
  const adjacencyList = new Map<string, string[]>();

  // Initialize all nodes
  nodes.forEach(node => {
    adjacencyList.set(node.id, []);
  });

  // Add existing edges
  edges.forEach(edge => {
    const neighbors = adjacencyList.get(edge.source) || [];
    neighbors.push(edge.target);
    adjacencyList.set(edge.source, neighbors);
  });

  // Add proposed connection
  const sourceNeighbors = adjacencyList.get(source) || [];
  sourceNeighbors.push(target);
  adjacencyList.set(source, sourceNeighbors);

  // DFS to detect cycle starting from target
  // If we can reach source from target, there's a cycle
  const visited = new Set<string>();
  const stack: string[] = [target];

  while (stack.length > 0) {
    const current = stack.pop()!;

    if (current === source) {
      return true; // Found a cycle!
    }

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    const neighbors = adjacencyList.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        stack.push(neighbor);
      }
    }
  }

  return false;
}

/**
 * Count existing connections to a specific handle
 */
export function countConnectionsToHandle(
  edges: Edge[],
  nodeId: string,
  handleId: string | null,
  handleType: 'source' | 'target'
): number {
  return edges.filter(edge => {
    if (handleType === 'target') {
      // Count incoming connections to this node's target handle
      return edge.target === nodeId &&
             (handleId ? edge.targetHandle === handleId : true);
    } else {
      // Count outgoing connections from this node's source handle
      return edge.source === nodeId &&
             (handleId ? edge.sourceHandle === handleId : true);
    }
  }).length;
}

/**
 * Check if a target handle can accept another connection
 */
export function canAcceptConnection(
  targetNode: Node,
  edges: Edge[],
  targetHandleId: string | null
): boolean {
  const nodeType = getNodeType(targetNode);
  const config = NODE_HANDLE_CONFIG[nodeType];

  // Count existing connections to this handle
  const existingConnections = countConnectionsToHandle(
    edges,
    targetNode.id,
    targetHandleId,
    'target'
  );

  // Check against max allowed
  return existingConnections < config.maxInputConnections;
}

/**
 * Check if connection already exists
 */
export function connectionExists(
  edges: Edge[],
  connection: Connection
): boolean {
  return edges.some(edge =>
    edge.source === connection.source &&
    edge.target === connection.target &&
    edge.sourceHandle === connection.sourceHandle &&
    edge.targetHandle === connection.targetHandle
  );
}

/**
 * Validate that workflow has at least one trigger node
 */
export function hasTriggerNode(nodes: Node[]): boolean {
  return nodes.some(node => getNodeType(node) === 'trigger');
}

/**
 * Get all trigger nodes in the workflow
 */
export function getTriggerNodes(nodes: Node[]): Node[] {
  return nodes.filter(node => getNodeType(node) === 'trigger');
}

/**
 * Check if a node has any incoming connections
 */
export function hasIncomingConnections(nodeId: string, edges: Edge[]): boolean {
  return edges.some(edge => edge.target === nodeId);
}

/**
 * Check if a node has any outgoing connections
 */
export function hasOutgoingConnections(nodeId: string, edges: Edge[]): boolean {
  return edges.some(edge => edge.source === nodeId);
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Validate a proposed connection
 *
 * This is the main entry point for connection validation.
 * It checks all rules and returns a detailed result.
 *
 * @param connection - The proposed connection
 * @param nodes - All nodes in the workflow
 * @param edges - All existing edges
 * @returns Validation result with reason if invalid
 */
export function validateConnection(
  connection: Connection,
  nodes: Node[],
  edges: Edge[]
): ConnectionValidationResult {
  const { source, target, sourceHandle, targetHandle } = connection;

  // 1. Basic validation - source and target must exist
  if (!source || !target) {
    return {
      isValid: false,
      reason: 'Missing source or target node',
      warningLevel: 'error'
    };
  }

  // 2. Self-connection check
  if (isSelfConnection(connection)) {
    return {
      isValid: false,
      reason: 'Cannot connect a node to itself',
      warningLevel: 'error'
    };
  }

  // 3. Find nodes
  const sourceNode = nodes.find(n => n.id === source);
  const targetNode = nodes.find(n => n.id === target);

  if (!sourceNode || !targetNode) {
    return {
      isValid: false,
      reason: 'Source or target node not found',
      warningLevel: 'error'
    };
  }

  // 4. Get node types
  const sourceType = getNodeType(sourceNode);
  const targetType = getNodeType(targetNode);

  // 5. Trigger nodes cannot receive connections
  if (targetType === 'trigger') {
    return {
      isValid: false,
      reason: 'Trigger nodes cannot receive incoming connections',
      warningLevel: 'error'
    };
  }

  // 6. Output nodes cannot have outgoing connections
  if (sourceType === 'output') {
    return {
      isValid: false,
      reason: 'Output nodes cannot have outgoing connections',
      warningLevel: 'error'
    };
  }

  // 7. Check if connection already exists
  if (connectionExists(edges, connection)) {
    return {
      isValid: false,
      reason: 'Connection already exists',
      warningLevel: 'warning'
    };
  }

  // 8. Check if target can accept another connection
  if (!canAcceptConnection(targetNode, edges, targetHandle || null)) {
    return {
      isValid: false,
      reason: 'This node already has the maximum number of input connections',
      warningLevel: 'error'
    };
  }

  // 9. Cycle detection (most expensive check - do last)
  if (wouldCreateCycle(nodes, edges, connection)) {
    return {
      isValid: false,
      reason: 'This connection would create a circular dependency',
      warningLevel: 'error'
    };
  }

  // All checks passed
  return { isValid: true };
}

/**
 * React Flow compatible isValidConnection callback
 *
 * This function is designed to be used directly with React Flow's
 * isValidConnection prop for real-time validation during drag.
 */
export function createConnectionValidator(
  nodes: Node[],
  edges: Edge[]
): (connection: Connection) => boolean {
  return (connection: Connection) => {
    const result = validateConnection(connection, nodes, edges);
    return result.isValid;
  };
}

// ============================================================================
// WORKFLOW VALIDATION
// ============================================================================

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate the entire workflow structure
 *
 * Checks for:
 * - At least one trigger node
 * - All non-trigger nodes are reachable from a trigger
 * - No disconnected subgraphs
 */
export function validateWorkflow(
  nodes: Node[],
  edges: Edge[]
): WorkflowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check for trigger node
  const triggerNodes = getTriggerNodes(nodes);
  if (triggerNodes.length === 0) {
    errors.push('Workflow must have at least one Trigger node');
  }

  // 2. Check for disconnected nodes (excluding triggers)
  const nonTriggerNodes = nodes.filter(n => getNodeType(n) !== 'trigger');
  for (const node of nonTriggerNodes) {
    if (!hasIncomingConnections(node.id, edges)) {
      warnings.push(`Node "${node.data?.label || node.id}" has no incoming connections`);
    }
  }

  // 3. Check for dead ends (nodes with no outgoing connections, excluding output nodes)
  const nonOutputNodes = nodes.filter(n => getNodeType(n) !== 'output');
  for (const node of nonOutputNodes) {
    if (!hasOutgoingConnections(node.id, edges)) {
      const nodeType = getNodeType(node);
      if (nodeType !== 'trigger' || nodes.length > 1) {
        warnings.push(`Node "${node.data?.label || node.id}" has no outgoing connections`);
      }
    }
  }

  // 4. Check reachability from triggers (BFS)
  if (triggerNodes.length > 0) {
    const reachable = new Set<string>();
    const queue: string[] = triggerNodes.map(n => n.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);

      // Find all nodes this one connects to
      edges
        .filter(e => e.source === current)
        .forEach(e => {
          if (!reachable.has(e.target)) {
            queue.push(e.target);
          }
        });
    }

    // Find unreachable nodes
    const unreachable = nodes.filter(n => !reachable.has(n.id));
    if (unreachable.length > 0) {
      errors.push(
        `${unreachable.length} node(s) are not reachable from any trigger: ` +
        unreachable.map(n => n.data?.label || n.id).join(', ')
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  validateConnection,
  validateWorkflow,
  createConnectionValidator,
  getNodeType,
  isSelfConnection,
  wouldCreateCycle,
  canAcceptConnection,
  connectionExists,
  hasTriggerNode,
  getTriggerNodes,
  NODE_HANDLE_CONFIG,
};
