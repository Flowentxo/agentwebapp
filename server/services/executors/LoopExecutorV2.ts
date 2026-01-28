/**
 * LOOP EXECUTOR V2
 *
 * Handles array iteration for WorkflowExecutionEngineV2.
 * Implements a loop controller node that:
 * - Iterates over an array with state persistence
 * - Outputs current item and index
 * - Routes to 'body' handle during iteration
 * - Routes to 'done' handle when complete
 *
 * State Management:
 * - Persists loop index in state.nodes[nodeId].loopIndex
 * - Supports re-entry for loop continuation
 * - Handles empty arrays gracefully
 *
 * Phase 2: Essential Logic Nodes
 */

import { createLogger } from '@/lib/logger';
import {
  INodeExecutor,
  NodeExecutorInput,
  NodeExecutorOutput,
  ExecutionState,
} from '@/types/execution';
import { resolveVariablePath } from '../VariableService';

const logger = createLogger('loop-executor-v2');

// ============================================================================
// TYPES
// ============================================================================

export interface LoopNodeData {
  /** Label for the node */
  label?: string;
  /** Source array - can be a variable reference like {{nodeId.output.items}} */
  arraySource?: string;
  /** Direct array value (if not using variable reference) */
  array?: any[];
  /** Variable name to store current item (default: 'item') */
  itemVariableName?: string;
  /** Variable name to store current index (default: 'index') */
  indexVariableName?: string;
  /** Maximum iterations (safety limit, default: 1000) */
  maxIterations?: number;
}

export interface LoopExecutionResult {
  /** Whether there are more items to process */
  hasMore: boolean;
  /** Current iteration index */
  index: number;
  /** Current item being processed */
  item: any;
  /** Total number of items in the array */
  total: number;
  /** Which output handle to route to: 'body' or 'done' */
  branch: 'body' | 'done';
  /** Whether the loop just started */
  isFirstIteration: boolean;
  /** Whether this is the last iteration */
  isLastIteration: boolean;
  /** Progress percentage (0-100) */
  progress: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Resolve the source array from node data or execution state.
 */
function resolveArray(
  nodeData: LoopNodeData,
  state: ExecutionState,
  inputs: any
): any[] {
  // Direct array in node data
  if (Array.isArray(nodeData.array)) {
    return nodeData.array;
  }

  // Variable reference (e.g., {{nodeId.output.items}})
  if (nodeData.arraySource) {
    let source = nodeData.arraySource;

    // Handle {{variable}} format
    if (source.startsWith('{{') && source.endsWith('}}')) {
      source = source.slice(2, -2).trim();
    }

    const resolved = resolveVariablePath(source, state);
    if (resolved.found && Array.isArray(resolved.value)) {
      return resolved.value;
    }

    // Check if it's a path in inputs
    if (inputs && typeof inputs === 'object') {
      const fromInputs = getNestedValue(inputs, source);
      if (Array.isArray(fromInputs)) {
        return fromInputs;
      }
    }

    logger.warn('Array source not found or not an array', {
      source: nodeData.arraySource,
      resolvedValue: resolved.value,
      found: resolved.found,
    });
  }

  // Check inputs directly
  if (Array.isArray(inputs)) {
    return inputs;
  }

  if (inputs?.array && Array.isArray(inputs.array)) {
    return inputs.array;
  }

  if (inputs?.items && Array.isArray(inputs.items)) {
    return inputs.items;
  }

  // Default to empty array
  return [];
}

/**
 * Get a nested value from an object using dot notation.
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return obj;
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Get the current loop index from node state.
 */
function getCurrentLoopIndex(
  nodeId: string,
  state: ExecutionState
): number {
  const nodeState = state.nodes[nodeId];
  if (!nodeState) return -1; // Will be incremented to 0 on first run

  // Check for loopIndex in output (where we persist it)
  if (typeof nodeState.output?.loopIndex === 'number') {
    return nodeState.output.loopIndex;
  }

  return -1;
}

// ============================================================================
// MAIN EXECUTOR
// ============================================================================

export class LoopExecutorV2 implements INodeExecutor {
  /**
   * Execute a loop controller node.
   *
   * Behavior:
   * - First run: Initialize at index 0, output item[0], route to 'body'
   * - Re-entry: Increment index, if index < length route to 'body', else 'done'
   */
  async execute(input: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const { node, context, inputs } = input;
    const nodeData = (node.data || {}) as LoopNodeData;

    logger.debug('Executing loop controller', {
      nodeId: node.id,
      nodeName: nodeData.label,
    });

    try {
      // Resolve the source array
      const array = resolveArray(nodeData, context.state, inputs);

      // Safety check for max iterations
      const maxIterations = nodeData.maxIterations || 1000;
      if (array.length > maxIterations) {
        logger.warn('Array exceeds max iterations, truncating', {
          arrayLength: array.length,
          maxIterations,
        });
        array.length = maxIterations;
      }

      // Get current loop index from state
      const currentIndex = getCurrentLoopIndex(node.id, context.state);

      // Calculate next index
      const nextIndex = currentIndex + 1;

      // Check if we have more items
      const hasMore = nextIndex < array.length;

      // Determine the branch
      const branch: 'body' | 'done' = hasMore ? 'body' : 'done';

      // Get current item (or null if done)
      const item = hasMore ? array[nextIndex] : null;

      // Build result
      const result: LoopExecutionResult = {
        hasMore,
        index: hasMore ? nextIndex : array.length,
        item,
        total: array.length,
        branch,
        isFirstIteration: nextIndex === 0,
        isLastIteration: nextIndex === array.length - 1,
        progress: array.length > 0 ? Math.round(((nextIndex + 1) / array.length) * 100) : 100,
      };

      // Set variables for downstream nodes
      const itemVarName = nodeData.itemVariableName || 'item';
      const indexVarName = nodeData.indexVariableName || 'index';

      // The output includes:
      // - Loop state info (loopIndex for persistence)
      // - Current item/index for downstream access
      // - Branch info for routing
      const output = {
        // Persist the loop index for re-entry
        loopIndex: hasMore ? nextIndex : -1,
        // Current iteration data
        [itemVarName]: item,
        [indexVarName]: nextIndex,
        // Full result object
        ...result,
        // Convenience aliases
        currentItem: item,
        currentIndex: nextIndex,
        // Array reference (for nested loops or debugging)
        _array: array,
        _arrayLength: array.length,
      };

      logger.info('Loop iteration', {
        nodeId: node.id,
        index: nextIndex,
        total: array.length,
        hasMore,
        branch,
        itemPreview: typeof item === 'object' ? JSON.stringify(item).substring(0, 100) : item,
      });

      // Handle empty array case
      if (array.length === 0) {
        logger.info('Loop: empty array, routing to done', { nodeId: node.id });
        return {
          data: {
            loopIndex: -1,
            hasMore: false,
            index: 0,
            item: null,
            total: 0,
            branch: 'done',
            isFirstIteration: true,
            isLastIteration: true,
            progress: 100,
          },
          success: true,
        };
      }

      return {
        data: output,
        success: true,
      };
    } catch (error: any) {
      logger.error('Loop execution failed', {
        nodeId: node.id,
        error: error.message,
        stack: error.stack,
      });

      return {
        data: null,
        success: false,
        error: `Loop execution failed: ${error.message}`,
      };
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const loopExecutorV2 = new LoopExecutorV2();
export default loopExecutorV2;
