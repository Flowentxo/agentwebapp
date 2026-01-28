/**
 * LoopController
 *
 * Manages loop execution in workflows, specifically handling:
 * - Loop scope detection (nodes within a loop boundary)
 * - Node state reset for re-execution in iterations
 * - Loop context tracking (runIndex, batchIndex, itemIndex)
 *
 * Works with SplitInBatches nodes to enable n8n-style iteration patterns.
 */

import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface LoopScope {
  /** ID of the SplitInBatches node that starts the loop */
  loopNodeId: string;

  /** All node IDs that are within the loop scope */
  nodeIds: Set<string>;

  /** Node IDs that feed back into the loop node */
  feedbackNodeIds: Set<string>;

  /** Node IDs that exit the loop (connected to 'done' output) */
  exitNodeIds: Set<string>;
}

export interface LoopContext {
  /** Current iteration number (0-indexed) */
  runIndex: number;

  /** Index of item within current batch (0-indexed) */
  batchIndex: number;

  /** Global index of item across all iterations */
  itemIndex: number;

  /** Total number of items being processed */
  totalItems: number;

  /** Size of each batch */
  batchSize: number;

  /** Whether this is the last batch */
  isLastBatch: boolean;

  /** Loop node ID for context */
  loopNodeId: string;
}

export interface LoopState {
  /** Current iteration index */
  runIndex: number;

  /** Next item index to process */
  nextIndex: number;

  /** Total items in the source array */
  totalItems: number;

  /** Configured batch size */
  batchSize: number;

  /** All items being iterated over */
  items: unknown[];

  /** Aggregated results from all iterations */
  aggregatedResults: unknown[];

  /** Whether loop has completed */
  isComplete: boolean;

  /** Timestamp when loop started */
  startedAt: string;

  /** Timestamp when loop completed */
  completedAt?: string;
}

export interface ExecutionState {
  /** Node outputs keyed by node ID */
  nodeOutputs: Record<string, unknown[]>;

  /** Node statuses keyed by node ID */
  nodeStatuses: Record<string, 'pending' | 'running' | 'completed' | 'error' | 'skipped'>;

  /** Node errors keyed by node ID */
  nodeErrors: Record<string, string>;

  /** Loop states keyed by loop node ID */
  loopStates: Record<string, LoopState>;

  /** Current loop context stack (for nested loops) */
  loopContextStack: LoopContext[];

  /** Global variables */
  globalVariables: Record<string, unknown>;
}

export interface WorkflowNode {
  id: string;
  type: string;
  data?: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  data?: {
    edgeType?: 'loop' | 'standard' | 'done';
  };
}

// ============================================================================
// LOOP CONTROLLER
// ============================================================================

export class LoopController {
  /**
   * Detect the scope of a loop starting from a SplitInBatches node.
   * The loop scope includes all nodes downstream that eventually feed back.
   */
  detectLoopScope(
    loopNodeId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): LoopScope {
    const nodeIds = new Set<string>();
    const feedbackNodeIds = new Set<string>();
    const exitNodeIds = new Set<string>();

    // Build adjacency maps
    const outgoingEdges = new Map<string, WorkflowEdge[]>();
    const incomingEdges = new Map<string, WorkflowEdge[]>();

    for (const edge of edges) {
      if (!outgoingEdges.has(edge.source)) {
        outgoingEdges.set(edge.source, []);
      }
      outgoingEdges.get(edge.source)!.push(edge);

      if (!incomingEdges.has(edge.target)) {
        incomingEdges.set(edge.target, []);
      }
      incomingEdges.get(edge.target)!.push(edge);
    }

    // Find edges from loop node
    const loopNodeEdges = outgoingEdges.get(loopNodeId) || [];

    // Separate 'loop' output from 'done' output
    const loopOutputEdges = loopNodeEdges.filter(
      e => e.sourceHandle === 'loop' || e.data?.edgeType === 'loop'
    );
    const doneOutputEdges = loopNodeEdges.filter(
      e => e.sourceHandle === 'done' || e.data?.edgeType === 'done'
    );

    // Mark exit nodes (connected to 'done' output)
    for (const edge of doneOutputEdges) {
      exitNodeIds.add(edge.target);
    }

    // BFS to find all nodes in loop scope (downstream of 'loop' output)
    const visited = new Set<string>();
    const queue: string[] = loopOutputEdges.map(e => e.target);

    while (queue.length > 0) {
      const nodeId = queue.shift()!;

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      // Skip the loop node itself (we've come full circle)
      if (nodeId === loopNodeId) continue;

      nodeIds.add(nodeId);

      // Check if this node feeds back to the loop node
      const nodeOutgoing = outgoingEdges.get(nodeId) || [];
      for (const edge of nodeOutgoing) {
        if (edge.target === loopNodeId) {
          feedbackNodeIds.add(nodeId);
        } else if (!visited.has(edge.target) && !exitNodeIds.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    logger.debug('[LOOP_CONTROLLER] Detected loop scope', {
      loopNodeId,
      scopeSize: nodeIds.size,
      feedbackNodes: Array.from(feedbackNodeIds),
      exitNodes: Array.from(exitNodeIds),
    });

    return {
      loopNodeId,
      nodeIds,
      feedbackNodeIds,
      exitNodeIds,
    };
  }

  /**
   * Reset nodes within a loop scope for the next iteration.
   * Clears status, output, and errors so nodes can run again.
   */
  resetNodesForIteration(
    state: ExecutionState,
    nodeIds: Set<string> | string[]
  ): ExecutionState {
    const nodeIdSet = nodeIds instanceof Set ? nodeIds : new Set(nodeIds);

    const updatedState = { ...state };
    updatedState.nodeOutputs = { ...state.nodeOutputs };
    updatedState.nodeStatuses = { ...state.nodeStatuses };
    updatedState.nodeErrors = { ...state.nodeErrors };

    for (const nodeId of nodeIdSet) {
      // Clear output
      delete updatedState.nodeOutputs[nodeId];

      // Reset status to pending
      updatedState.nodeStatuses[nodeId] = 'pending';

      // Clear any errors
      delete updatedState.nodeErrors[nodeId];
    }

    logger.debug('[LOOP_CONTROLLER] Reset nodes for iteration', {
      resetCount: nodeIdSet.size,
      nodeIds: Array.from(nodeIdSet),
    });

    return updatedState;
  }

  /**
   * Initialize loop state for a SplitInBatches node
   */
  initializeLoopState(
    loopNodeId: string,
    items: unknown[],
    batchSize: number,
    state: ExecutionState
  ): ExecutionState {
    const updatedState = { ...state };
    updatedState.loopStates = { ...state.loopStates };

    const loopState: LoopState = {
      runIndex: 0,
      nextIndex: 0,
      totalItems: items.length,
      batchSize,
      items,
      aggregatedResults: [],
      isComplete: false,
      startedAt: new Date().toISOString(),
    };

    updatedState.loopStates[loopNodeId] = loopState;

    logger.info('[LOOP_CONTROLLER] Initialized loop state', {
      loopNodeId,
      totalItems: items.length,
      batchSize,
      estimatedIterations: Math.ceil(items.length / batchSize),
    });

    return updatedState;
  }

  /**
   * Get the next batch of items for iteration
   */
  getNextBatch(
    loopNodeId: string,
    state: ExecutionState
  ): { items: unknown[]; context: LoopContext; isComplete: boolean } | null {
    const loopState = state.loopStates[loopNodeId];

    if (!loopState) {
      logger.error('[LOOP_CONTROLLER] Loop state not found', { loopNodeId });
      return null;
    }

    if (loopState.isComplete) {
      return null;
    }

    const { nextIndex, batchSize, items, totalItems, runIndex } = loopState;

    // Check if we've processed all items
    if (nextIndex >= totalItems) {
      return null;
    }

    // Get the next batch
    const batchItems = items.slice(nextIndex, nextIndex + batchSize);
    const isLastBatch = nextIndex + batchSize >= totalItems;

    const context: LoopContext = {
      runIndex,
      batchIndex: 0,
      itemIndex: nextIndex,
      totalItems,
      batchSize,
      isLastBatch,
      loopNodeId,
    };

    return {
      items: batchItems,
      context,
      isComplete: false,
    };
  }

  /**
   * Advance to the next iteration
   */
  advanceIteration(
    loopNodeId: string,
    state: ExecutionState,
    iterationResults?: unknown[]
  ): ExecutionState {
    const updatedState = { ...state };
    updatedState.loopStates = { ...state.loopStates };

    const loopState = { ...state.loopStates[loopNodeId] };

    // Aggregate results if provided
    if (iterationResults && iterationResults.length > 0) {
      loopState.aggregatedResults = [
        ...loopState.aggregatedResults,
        ...iterationResults,
      ];
    }

    // Advance cursor
    loopState.nextIndex += loopState.batchSize;
    loopState.runIndex += 1;

    // Check if complete
    if (loopState.nextIndex >= loopState.totalItems) {
      loopState.isComplete = true;
      loopState.completedAt = new Date().toISOString();

      logger.info('[LOOP_CONTROLLER] Loop completed', {
        loopNodeId,
        totalIterations: loopState.runIndex,
        totalResults: loopState.aggregatedResults.length,
      });
    }

    updatedState.loopStates[loopNodeId] = loopState;

    return updatedState;
  }

  /**
   * Complete the loop and return aggregated results
   */
  completeLoop(
    loopNodeId: string,
    state: ExecutionState
  ): { results: unknown[]; state: ExecutionState } {
    const updatedState = { ...state };
    updatedState.loopStates = { ...state.loopStates };

    const loopState = { ...state.loopStates[loopNodeId] };
    loopState.isComplete = true;
    loopState.completedAt = new Date().toISOString();

    updatedState.loopStates[loopNodeId] = loopState;

    // Update loop context stack
    updatedState.loopContextStack = state.loopContextStack.filter(
      ctx => ctx.loopNodeId !== loopNodeId
    );

    logger.info('[LOOP_CONTROLLER] Loop finalized', {
      loopNodeId,
      totalIterations: loopState.runIndex,
      aggregatedResultsCount: loopState.aggregatedResults.length,
    });

    return {
      results: loopState.aggregatedResults,
      state: updatedState,
    };
  }

  /**
   * Push a loop context onto the stack (for nested loops)
   */
  pushLoopContext(
    context: LoopContext,
    state: ExecutionState
  ): ExecutionState {
    return {
      ...state,
      loopContextStack: [...state.loopContextStack, context],
    };
  }

  /**
   * Pop the current loop context from the stack
   */
  popLoopContext(state: ExecutionState): ExecutionState {
    const newStack = [...state.loopContextStack];
    newStack.pop();

    return {
      ...state,
      loopContextStack: newStack,
    };
  }

  /**
   * Get the current loop context (innermost loop)
   */
  getCurrentLoopContext(state: ExecutionState): LoopContext | null {
    if (state.loopContextStack.length === 0) {
      return null;
    }
    return state.loopContextStack[state.loopContextStack.length - 1];
  }

  /**
   * Check if a node is inside any active loop
   */
  isNodeInActiveLoop(
    nodeId: string,
    loopScopes: Map<string, LoopScope>,
    state: ExecutionState
  ): boolean {
    for (const [loopNodeId, scope] of loopScopes) {
      const loopState = state.loopStates[loopNodeId];
      if (loopState && !loopState.isComplete && scope.nodeIds.has(nodeId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all active loop contexts for a node (handles nested loops)
   */
  getActiveLoopContextsForNode(
    nodeId: string,
    loopScopes: Map<string, LoopScope>,
    state: ExecutionState
  ): LoopContext[] {
    const contexts: LoopContext[] = [];

    for (const ctx of state.loopContextStack) {
      const scope = loopScopes.get(ctx.loopNodeId);
      if (scope && scope.nodeIds.has(nodeId)) {
        contexts.push(ctx);
      }
    }

    return contexts;
  }

  /**
   * Create initial execution state with loop support
   */
  createInitialState(): ExecutionState {
    return {
      nodeOutputs: {},
      nodeStatuses: {},
      nodeErrors: {},
      loopStates: {},
      loopContextStack: [],
      globalVariables: {},
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let loopControllerInstance: LoopController | null = null;

export function getLoopController(): LoopController {
  if (!loopControllerInstance) {
    loopControllerInstance = new LoopController();
  }
  return loopControllerInstance;
}

export default LoopController;
