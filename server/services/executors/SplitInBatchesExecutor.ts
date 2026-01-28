/**
 * SplitInBatchesExecutor
 *
 * Executor for the SplitInBatches node that enables iteration over large datasets.
 * Similar to n8n's SplitInBatches node, it processes items in configurable batch sizes.
 *
 * Features:
 * - Configurable batch size
 * - Two output paths: 'loop' (more items) and 'done' (completed)
 * - Automatic aggregation of results across iterations
 * - Support for nested loops
 * - Reset capability for re-iteration
 */

import { logger } from '@/lib/logger';
import {
  LoopController,
  LoopContext,
  LoopState,
  ExecutionState,
  getLoopController,
} from '../execution/LoopController';

// ============================================================================
// TYPES
// ============================================================================

export interface SplitInBatchesConfig {
  /** Number of items per batch (default: 10) */
  batchSize: number;

  /** Whether to reset state on new input */
  resetOnNewInput: boolean;

  /** Optional field to use as batch key for grouping */
  batchKeyField?: string;

  /** Whether to aggregate results from all iterations */
  aggregateResults: boolean;

  /** Maximum iterations allowed (safety limit, 0 = unlimited) */
  maxIterations: number;

  /** Whether to continue on error in batch processing */
  continueOnError: boolean;
}

export interface SplitInBatchesInput {
  /** Items to iterate over */
  items: unknown[];

  /** Optional: Results from previous iteration to aggregate */
  iterationResults?: unknown[];

  /** Optional: Force reset of loop state */
  reset?: boolean;
}

export interface SplitInBatchesOutput {
  /** Output path: 'loop' or 'done' */
  outputPath: 'loop' | 'done';

  /** Current batch items (only for 'loop' path) */
  items: unknown[];

  /** Loop context for variable resolution */
  context: LoopContext | null;

  /** Aggregated results (only for 'done' path) */
  aggregatedResults?: unknown[];

  /** Metadata about the current state */
  meta: {
    runIndex: number;
    batchSize: number;
    totalItems: number;
    processedItems: number;
    remainingItems: number;
    isComplete: boolean;
  };
}

export interface ExecutorContext {
  /** Node ID being executed */
  nodeId: string;

  /** Execution ID */
  executionId: string;

  /** Current execution state */
  state: ExecutionState;

  /** Node configuration */
  config: SplitInBatchesConfig;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_SPLIT_IN_BATCHES_CONFIG: SplitInBatchesConfig = {
  batchSize: 10,
  resetOnNewInput: true,
  aggregateResults: true,
  maxIterations: 1000,
  continueOnError: false,
};

// ============================================================================
// EXECUTOR
// ============================================================================

export class SplitInBatchesExecutor {
  private loopController: LoopController;

  constructor() {
    this.loopController = getLoopController();
  }

  /**
   * Execute the SplitInBatches node
   */
  async execute(
    input: SplitInBatchesInput,
    context: ExecutorContext
  ): Promise<{ output: SplitInBatchesOutput; state: ExecutionState }> {
    const { nodeId, state, config } = context;
    const mergedConfig = { ...DEFAULT_SPLIT_IN_BATCHES_CONFIG, ...config };

    logger.info('[SPLIT_IN_BATCHES] Executing', {
      nodeId,
      inputItemCount: input.items?.length,
      hasIterationResults: !!input.iterationResults,
      reset: input.reset,
    });

    // Check if we need to initialize or continue
    let currentState = state;
    let loopState = state.loopStates[nodeId];

    // Initialize if new items provided or reset requested
    if (!loopState || input.reset || (mergedConfig.resetOnNewInput && input.items?.length > 0)) {
      if (!input.items || input.items.length === 0) {
        // No items to process, go directly to 'done'
        return this.createDoneOutput(nodeId, currentState, [], mergedConfig);
      }

      currentState = this.loopController.initializeLoopState(
        nodeId,
        input.items,
        mergedConfig.batchSize,
        currentState
      );
      loopState = currentState.loopStates[nodeId];
    } else {
      // Continuing existing loop - aggregate previous iteration results
      if (input.iterationResults && input.iterationResults.length > 0) {
        currentState = this.loopController.advanceIteration(
          nodeId,
          currentState,
          input.iterationResults
        );
        loopState = currentState.loopStates[nodeId];
      }
    }

    // Check for max iterations
    if (mergedConfig.maxIterations > 0 && loopState.runIndex >= mergedConfig.maxIterations) {
      logger.warn('[SPLIT_IN_BATCHES] Max iterations reached', {
        nodeId,
        maxIterations: mergedConfig.maxIterations,
      });
      return this.createDoneOutput(
        nodeId,
        currentState,
        loopState.aggregatedResults,
        mergedConfig
      );
    }

    // Get next batch
    const nextBatch = this.loopController.getNextBatch(nodeId, currentState);

    if (!nextBatch || nextBatch.items.length === 0) {
      // No more items, complete the loop
      return this.createDoneOutput(
        nodeId,
        currentState,
        loopState.aggregatedResults,
        mergedConfig
      );
    }

    // Push loop context onto stack
    currentState = this.loopController.pushLoopContext(nextBatch.context, currentState);

    // Return 'loop' output with current batch
    const output: SplitInBatchesOutput = {
      outputPath: 'loop',
      items: nextBatch.items,
      context: nextBatch.context,
      meta: {
        runIndex: loopState.runIndex,
        batchSize: mergedConfig.batchSize,
        totalItems: loopState.totalItems,
        processedItems: loopState.nextIndex,
        remainingItems: loopState.totalItems - loopState.nextIndex - nextBatch.items.length,
        isComplete: false,
      },
    };

    logger.debug('[SPLIT_IN_BATCHES] Returning loop batch', {
      nodeId,
      batchSize: nextBatch.items.length,
      runIndex: loopState.runIndex,
      progress: `${loopState.nextIndex}/${loopState.totalItems}`,
    });

    return { output, state: currentState };
  }

  /**
   * Create 'done' output when loop is complete
   */
  private createDoneOutput(
    nodeId: string,
    state: ExecutionState,
    aggregatedResults: unknown[],
    config: SplitInBatchesConfig
  ): { output: SplitInBatchesOutput; state: ExecutionState } {
    const loopState = state.loopStates[nodeId];
    const { results, state: finalState } = this.loopController.completeLoop(nodeId, state);

    const output: SplitInBatchesOutput = {
      outputPath: 'done',
      items: [],
      context: null,
      aggregatedResults: config.aggregateResults ? results : undefined,
      meta: {
        runIndex: loopState?.runIndex || 0,
        batchSize: config.batchSize,
        totalItems: loopState?.totalItems || 0,
        processedItems: loopState?.totalItems || 0,
        remainingItems: 0,
        isComplete: true,
      },
    };

    logger.info('[SPLIT_IN_BATCHES] Loop completed', {
      nodeId,
      totalIterations: loopState?.runIndex || 0,
      aggregatedResultsCount: results.length,
    });

    return { output, state: finalState };
  }

  /**
   * Reset the loop state for this node
   */
  resetLoop(nodeId: string, state: ExecutionState): ExecutionState {
    const updatedState = { ...state };
    updatedState.loopStates = { ...state.loopStates };
    delete updatedState.loopStates[nodeId];

    // Remove from context stack
    updatedState.loopContextStack = state.loopContextStack.filter(
      ctx => ctx.loopNodeId !== nodeId
    );

    logger.debug('[SPLIT_IN_BATCHES] Loop reset', { nodeId });

    return updatedState;
  }

  /**
   * Get current loop progress
   */
  getProgress(nodeId: string, state: ExecutionState): {
    current: number;
    total: number;
    percentage: number;
    isComplete: boolean;
  } | null {
    const loopState = state.loopStates[nodeId];

    if (!loopState) {
      return null;
    }

    const current = loopState.nextIndex;
    const total = loopState.totalItems;
    const percentage = total > 0 ? Math.round((current / total) * 100) : 100;

    return {
      current,
      total,
      percentage,
      isComplete: loopState.isComplete,
    };
  }

  /**
   * Collect results from the current iteration
   * Called by the workflow engine when a loop iteration completes
   */
  collectIterationResults(
    nodeId: string,
    feedbackNodeId: string,
    feedbackOutput: unknown[],
    state: ExecutionState
  ): ExecutionState {
    const loopState = state.loopStates[nodeId];

    if (!loopState) {
      logger.warn('[SPLIT_IN_BATCHES] No loop state found for result collection', {
        nodeId,
        feedbackNodeId,
      });
      return state;
    }

    // Advance with the collected results
    return this.loopController.advanceIteration(nodeId, state, feedbackOutput);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if output indicates loop should continue
 */
export function shouldContinueLoop(output: SplitInBatchesOutput): boolean {
  return output.outputPath === 'loop';
}

/**
 * Check if output indicates loop is complete
 */
export function isLoopComplete(output: SplitInBatchesOutput): boolean {
  return output.outputPath === 'done';
}

/**
 * Extract items from output for processing
 */
export function getOutputItems(output: SplitInBatchesOutput): unknown[] {
  if (output.outputPath === 'loop') {
    return output.items;
  }
  return output.aggregatedResults || [];
}

// ============================================================================
// SINGLETON
// ============================================================================

let executorInstance: SplitInBatchesExecutor | null = null;

export function getSplitInBatchesExecutor(): SplitInBatchesExecutor {
  if (!executorInstance) {
    executorInstance = new SplitInBatchesExecutor();
  }
  return executorInstance;
}

export default SplitInBatchesExecutor;
