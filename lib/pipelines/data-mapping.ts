/**
 * Pipeline Data Mapping Utilities
 *
 * Converts between DB format and React Flow format
 * Part of Phase 2: Frontend Pipeline Studio
 */

import { Node, Edge } from 'reactflow';

// =============================================================================
// TYPES
// =============================================================================

export interface DBWorkflow {
  id: string;
  name: string;
  description?: string;
  nodes: DBNode[];
  edges: DBEdge[];
  status: 'draft' | 'active' | 'archived';
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface DBEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  data?: Record<string, unknown>;
}

export interface ReactFlowWorkflow {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
}

// =============================================================================
// DB TO REACT FLOW CONVERSION
// =============================================================================

/**
 * Convert DB workflow to React Flow format
 */
export function dbToReactFlow(workflow: DBWorkflow): ReactFlowWorkflow {
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    nodes: workflow.nodes.map(dbNodeToReactFlow),
    edges: workflow.edges.map(dbEdgeToReactFlow),
  };
}

/**
 * Convert single DB node to React Flow node
 */
export function dbNodeToReactFlow(node: DBNode): Node {
  return {
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      ...node.data,
      // Ensure required fields have defaults
      label: node.data.label || node.type,
    },
    // Add styling based on node type
    style: getNodeStyle(node.type),
  };
}

/**
 * Convert single DB edge to React Flow edge
 */
export function dbEdgeToReactFlow(edge: DBEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    label: edge.label,
    data: edge.data,
    type: 'smoothstep',
    animated: true,
    style: {
      strokeWidth: 2,
      stroke: '#4B5563',
    },
  };
}

// =============================================================================
// REACT FLOW TO DB CONVERSION
// =============================================================================

/**
 * Convert React Flow format to DB workflow
 */
export function reactFlowToDb(
  workflow: ReactFlowWorkflow,
  userId: string,
  status: 'draft' | 'active' | 'archived' = 'draft'
): Omit<DBWorkflow, 'createdAt' | 'updatedAt'> {
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    nodes: workflow.nodes.map(reactFlowNodeToDb),
    edges: workflow.edges.map(reactFlowEdgeToDb),
    status,
    userId,
  };
}

/**
 * Convert single React Flow node to DB node
 */
export function reactFlowNodeToDb(node: Node): DBNode {
  return {
    id: node.id,
    type: node.type || 'default',
    position: node.position,
    data: cleanNodeData(node.data),
  };
}

/**
 * Convert single React Flow edge to DB edge
 */
export function reactFlowEdgeToDb(edge: Edge): DBEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || undefined,
    targetHandle: edge.targetHandle || undefined,
    label: typeof edge.label === 'string' ? edge.label : undefined,
    data: edge.data as Record<string, unknown> | undefined,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get default node styling based on type
 */
function getNodeStyle(nodeType: string): React.CSSProperties {
  const styles: Record<string, React.CSSProperties> = {
    trigger: {
      background: 'transparent',
      border: 'none',
      padding: 0,
    },
    agent: {
      background: 'transparent',
      border: 'none',
      padding: 0,
    },
    action: {
      background: 'transparent',
      border: 'none',
      padding: 0,
    },
    condition: {
      background: 'transparent',
      border: 'none',
      padding: 0,
    },
    transform: {
      background: 'transparent',
      border: 'none',
      padding: 0,
    },
    delay: {
      background: 'transparent',
      border: 'none',
      padding: 0,
    },
    'human-approval': {
      background: 'transparent',
      border: 'none',
      padding: 0,
    },
  };

  return styles[nodeType] || {};
}

/**
 * Clean node data for DB storage
 * Removes undefined values and internal React Flow properties
 */
function cleanNodeData(data: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip internal React Flow properties
    if (key.startsWith('_') || key === 'selected' || key === 'dragging') {
      continue;
    }

    // Skip undefined values
    if (value === undefined) {
      continue;
    }

    cleaned[key] = value;
  }

  return cleaned;
}

// =============================================================================
// WORKFLOW VALIDATION
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a workflow before execution
 */
export function validateWorkflow(workflow: ReactFlowWorkflow): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for required fields
  if (!workflow.name?.trim()) {
    errors.push('Workflow name is required');
  }

  // Check for at least one node
  if (workflow.nodes.length === 0) {
    errors.push('Workflow must have at least one node');
  }

  // Check for trigger node
  const triggerNodes = workflow.nodes.filter((n) => n.type === 'trigger');
  if (triggerNodes.length === 0) {
    warnings.push('Workflow has no trigger node - it can only be started manually');
  }
  if (triggerNodes.length > 1) {
    warnings.push('Workflow has multiple trigger nodes');
  }

  // Check for disconnected nodes
  const connectedNodeIds = new Set<string>();
  workflow.edges.forEach((edge) => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  const disconnectedNodes = workflow.nodes.filter(
    (node) => !connectedNodeIds.has(node.id) && workflow.nodes.length > 1
  );

  if (disconnectedNodes.length > 0) {
    warnings.push(
      `${disconnectedNodes.length} node(s) are not connected to the workflow`
    );
  }

  // Check for required node configurations
  workflow.nodes.forEach((node) => {
    if (node.type === 'agent') {
      if (!node.data.agentId) {
        errors.push(`Agent node "${node.data.label}" is missing an agent selection`);
      }
      if (!node.data.prompt) {
        warnings.push(`Agent node "${node.data.label}" has no prompt configured`);
      }
    }

    if (node.type === 'condition') {
      if (!node.data.condition) {
        warnings.push(`Condition node "${node.data.label}" has no condition expression`);
      }
    }
  });

  // Check for cycles (would cause infinite loops)
  if (hasCycles(workflow.nodes, workflow.edges)) {
    errors.push('Workflow contains cycles which could cause infinite loops');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if workflow has cycles
 */
function hasCycles(nodes: Node[], edges: Edge[]): boolean {
  const adjacency = new Map<string, string[]>();
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  // Build adjacency list
  nodes.forEach((node) => adjacency.set(node.id, []));
  edges.forEach((edge) => {
    const sources = adjacency.get(edge.source) || [];
    sources.push(edge.target);
    adjacency.set(edge.source, sources);
  });

  // DFS for cycle detection
  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true;
    }
  }

  return false;
}

// =============================================================================
// WORKFLOW TEMPLATES
// =============================================================================

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: Node[];
  edges: Edge[];
}

/**
 * Get a simple starter template
 */
export function getStarterTemplate(): WorkflowTemplate {
  return {
    id: 'starter',
    name: 'Simple Workflow',
    description: 'A basic workflow with trigger, agent, and end nodes',
    category: 'Getting Started',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 100, y: 200 },
        data: { label: 'Start', subType: 'manual' },
      },
      {
        id: 'agent-1',
        type: 'agent',
        position: { x: 350, y: 200 },
        data: {
          label: 'AI Agent',
          agentId: 'dexter',
          prompt: 'Analyze the input and provide insights.',
        },
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 600, y: 200 },
        data: { label: 'End', subType: 'end' },
      },
    ],
    edges: [
      {
        id: 'e1-2',
        source: 'trigger-1',
        target: 'agent-1',
        type: 'smoothstep',
        animated: true,
      },
      {
        id: 'e2-3',
        source: 'agent-1',
        target: 'action-1',
        type: 'smoothstep',
        animated: true,
      },
    ],
  };
}

/**
 * Get conditional workflow template
 */
export function getConditionalTemplate(): WorkflowTemplate {
  return {
    id: 'conditional',
    name: 'Conditional Workflow',
    description: 'A workflow with branching logic',
    category: 'Logic',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 100, y: 200 },
        data: { label: 'Start', subType: 'manual' },
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 350, y: 200 },
        data: {
          label: 'Check Condition',
          condition: 'inputs.approved === true',
        },
      },
      {
        id: 'agent-1',
        type: 'agent',
        position: { x: 600, y: 100 },
        data: {
          label: 'Success Path',
          agentId: 'dexter',
          prompt: 'Process approved request.',
        },
      },
      {
        id: 'agent-2',
        type: 'agent',
        position: { x: 600, y: 300 },
        data: {
          label: 'Failure Path',
          agentId: 'cassie',
          prompt: 'Handle rejected request.',
        },
      },
    ],
    edges: [
      {
        id: 'e1-2',
        source: 'trigger-1',
        target: 'condition-1',
        type: 'smoothstep',
        animated: true,
      },
      {
        id: 'e2-3',
        source: 'condition-1',
        sourceHandle: 'true',
        target: 'agent-1',
        type: 'smoothstep',
        animated: true,
      },
      {
        id: 'e2-4',
        source: 'condition-1',
        sourceHandle: 'false',
        target: 'agent-2',
        type: 'smoothstep',
        animated: true,
      },
    ],
  };
}
