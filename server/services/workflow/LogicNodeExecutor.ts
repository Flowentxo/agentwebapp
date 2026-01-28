/**
 * LogicNodeExecutor
 *
 * Executes logic nodes (condition, switch, loop, merge)
 * Part of Phase 3: Context & Logic
 */

import { ContextManager } from './ContextManager';

// =============================================================================
// TYPES
// =============================================================================

export interface LogicNodeData {
  label?: string;
  condition?: string;
  expression?: string;
  switchValue?: string;
  cases?: Array<{ value: string; targetNodeId: string }>;
  loopItems?: string; // Expression that returns an array
  maxIterations?: number;
  mergeMode?: 'all' | 'first' | 'last' | 'array';
}

export interface LogicResult {
  type: 'condition' | 'switch' | 'loop' | 'merge';
  success: boolean;
  output: unknown;
  nextNodeId?: string; // For condition/switch - which path to take
  branch?: string; // 'true' or 'false' for conditions
  loopData?: LoopData;
}

export interface LoopData {
  currentIndex: number;
  totalItems: number;
  currentItem: unknown;
  isComplete: boolean;
  results: unknown[];
}

export interface ConditionResult extends LogicResult {
  type: 'condition';
  condition: string;
  evaluatedTo: boolean;
  branch: 'true' | 'false';
}

export interface SwitchResult extends LogicResult {
  type: 'switch';
  switchValue: unknown;
  matchedCase: string | 'default';
}

export interface LoopResult extends LogicResult {
  type: 'loop';
  loopData: LoopData;
}

export interface MergeResult extends LogicResult {
  type: 'merge';
  mergedInputs: Record<string, unknown>;
  mergeMode: string;
}

// =============================================================================
// LOGIC NODE EXECUTOR CLASS
// =============================================================================

export class LogicNodeExecutor {
  private contextManager: ContextManager;

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
  }

  // ===========================================================================
  // CONDITION NODE
  // ===========================================================================

  /**
   * Execute a condition node
   * Returns which branch to take (true/false)
   */
  executeCondition(data: LogicNodeData): ConditionResult {
    const condition = data.condition || 'true';

    try {
      const evaluatedTo = this.contextManager.evaluateCondition(condition);

      return {
        type: 'condition',
        success: true,
        output: { result: evaluatedTo },
        condition,
        evaluatedTo,
        branch: evaluatedTo ? 'true' : 'false',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        type: 'condition',
        success: false,
        output: { error: errorMessage },
        condition,
        evaluatedTo: false,
        branch: 'false',
      };
    }
  }

  // ===========================================================================
  // SWITCH NODE
  // ===========================================================================

  /**
   * Execute a switch node
   * Returns which case matched
   */
  executeSwitch(data: LogicNodeData): SwitchResult {
    const expression = data.switchValue || data.expression || '';
    const cases = data.cases || [];

    try {
      // Evaluate the switch expression
      const switchValue = this.contextManager.evaluateExpression(expression);
      const stringValue = String(switchValue);

      // Find matching case
      let matchedCase = 'default';
      let targetNodeId: string | undefined;

      for (const caseItem of cases) {
        if (caseItem.value === stringValue) {
          matchedCase = caseItem.value;
          targetNodeId = caseItem.targetNodeId;
          break;
        }
      }

      return {
        type: 'switch',
        success: true,
        output: { switchValue, matchedCase },
        switchValue,
        matchedCase,
        nextNodeId: targetNodeId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        type: 'switch',
        success: false,
        output: { error: errorMessage },
        switchValue: null,
        matchedCase: 'default',
      };
    }
  }

  // ===========================================================================
  // LOOP NODE
  // ===========================================================================

  /**
   * Initialize a loop
   * Returns the first iteration data
   */
  initializeLoop(data: LogicNodeData): LoopResult {
    const loopItemsExpression = data.loopItems || '[]';
    const maxIterations = data.maxIterations || 100;

    try {
      // Evaluate the items expression
      let items = this.contextManager.evaluateExpression(loopItemsExpression);

      if (!Array.isArray(items)) {
        // Try to convert to array
        if (typeof items === 'object' && items !== null) {
          items = Object.entries(items);
        } else if (typeof items === 'string') {
          items = items.split('');
        } else {
          items = [items];
        }
      }

      // Limit iterations
      if (items.length > maxIterations) {
        console.warn(`[LogicNodeExecutor] Loop capped at ${maxIterations} iterations`);
        items = items.slice(0, maxIterations);
      }

      const loopData: LoopData = {
        currentIndex: 0,
        totalItems: items.length,
        currentItem: items[0],
        isComplete: items.length === 0,
        results: [],
      };

      // Store loop data in context
      this.contextManager.setVariable('_loop', loopData);
      this.contextManager.setVariable('_loopItems', items);

      return {
        type: 'loop',
        success: true,
        output: loopData,
        loopData,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        type: 'loop',
        success: false,
        output: { error: errorMessage },
        loopData: {
          currentIndex: 0,
          totalItems: 0,
          currentItem: null,
          isComplete: true,
          results: [],
        },
      };
    }
  }

  /**
   * Advance to the next loop iteration
   */
  nextLoopIteration(iterationResult: unknown): LoopResult {
    const loopData = this.contextManager.getVariable('_loop') as LoopData;
    const items = this.contextManager.getVariable('_loopItems') as unknown[];

    if (!loopData || !items) {
      throw new Error('No active loop found');
    }

    // Store iteration result
    loopData.results.push(iterationResult);
    loopData.currentIndex++;

    // Check if complete
    if (loopData.currentIndex >= loopData.totalItems) {
      loopData.isComplete = true;
      loopData.currentItem = null;
    } else {
      loopData.currentItem = items[loopData.currentIndex];
    }

    // Update context
    this.contextManager.setVariable('_loop', loopData);

    return {
      type: 'loop',
      success: true,
      output: loopData,
      loopData,
    };
  }

  /**
   * Get current loop state
   */
  getLoopState(): LoopData | null {
    return this.contextManager.getVariable('_loop') as LoopData | null;
  }

  // ===========================================================================
  // MERGE NODE
  // ===========================================================================

  /**
   * Execute a merge node
   * Combines outputs from multiple incoming edges
   */
  executeMerge(
    data: LogicNodeData,
    incomingResults: Record<string, unknown>
  ): MergeResult {
    const mergeMode = data.mergeMode || 'all';

    try {
      let output: unknown;

      switch (mergeMode) {
        case 'first':
          // Take the first available result
          output = Object.values(incomingResults)[0];
          break;

        case 'last':
          // Take the last available result
          const values = Object.values(incomingResults);
          output = values[values.length - 1];
          break;

        case 'array':
          // Combine all results into an array
          output = Object.values(incomingResults);
          break;

        case 'all':
        default:
          // Return all as an object
          output = incomingResults;
          break;
      }

      return {
        type: 'merge',
        success: true,
        output,
        mergedInputs: incomingResults,
        mergeMode,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        type: 'merge',
        success: false,
        output: { error: errorMessage },
        mergedInputs: incomingResults,
        mergeMode,
      };
    }
  }

  // ===========================================================================
  // FILTER NODE
  // ===========================================================================

  /**
   * Filter an array based on a condition
   */
  executeFilter(data: LogicNodeData, inputArray: unknown[]): {
    success: boolean;
    output: unknown[];
    filtered: number;
    total: number;
  } {
    const condition = data.condition || 'true';

    try {
      const results: unknown[] = [];

      for (let i = 0; i < inputArray.length; i++) {
        // Set current item in context
        this.contextManager.setVariable('_item', inputArray[i]);
        this.contextManager.setVariable('_index', i);

        // Evaluate condition for this item
        const keep = this.contextManager.evaluateCondition(condition);

        if (keep) {
          results.push(inputArray[i]);
        }
      }

      // Clean up
      this.contextManager.setVariable('_item', undefined);
      this.contextManager.setVariable('_index', undefined);

      return {
        success: true,
        output: results,
        filtered: inputArray.length - results.length,
        total: inputArray.length,
      };
    } catch (error) {
      return {
        success: false,
        output: inputArray,
        filtered: 0,
        total: inputArray.length,
      };
    }
  }

  // ===========================================================================
  // MAP NODE
  // ===========================================================================

  /**
   * Transform each item in an array
   */
  executeMap(data: LogicNodeData, inputArray: unknown[]): {
    success: boolean;
    output: unknown[];
    total: number;
  } {
    const transform = data.expression || '_item';

    try {
      const results: unknown[] = [];

      for (let i = 0; i < inputArray.length; i++) {
        // Set current item in context
        this.contextManager.setVariable('_item', inputArray[i]);
        this.contextManager.setVariable('_index', i);

        // Transform this item
        const transformed = this.contextManager.evaluateExpression(transform);
        results.push(transformed);
      }

      // Clean up
      this.contextManager.setVariable('_item', undefined);
      this.contextManager.setVariable('_index', undefined);

      return {
        success: true,
        output: results,
        total: inputArray.length,
      };
    } catch (error) {
      return {
        success: false,
        output: inputArray,
        total: inputArray.length,
      };
    }
  }

  // ===========================================================================
  // REDUCE NODE
  // ===========================================================================

  /**
   * Reduce an array to a single value
   */
  executeReduce(
    data: LogicNodeData,
    inputArray: unknown[],
    initialValue: unknown = null
  ): {
    success: boolean;
    output: unknown;
    total: number;
  } {
    const reducer = data.expression || '_accumulator';

    try {
      let accumulator = initialValue;

      for (let i = 0; i < inputArray.length; i++) {
        // Set current state in context
        this.contextManager.setVariable('_accumulator', accumulator);
        this.contextManager.setVariable('_item', inputArray[i]);
        this.contextManager.setVariable('_index', i);

        // Reduce this item
        accumulator = this.contextManager.evaluateExpression(reducer);
      }

      // Clean up
      this.contextManager.setVariable('_accumulator', undefined);
      this.contextManager.setVariable('_item', undefined);
      this.contextManager.setVariable('_index', undefined);

      return {
        success: true,
        output: accumulator,
        total: inputArray.length,
      };
    } catch (error) {
      return {
        success: false,
        output: initialValue,
        total: inputArray.length,
      };
    }
  }
}

// =============================================================================
// STANDALONE HELPER FUNCTIONS
// =============================================================================

/**
 * Quick condition evaluation
 */
export function evaluateNodeCondition(
  condition: string,
  stepResults: Record<string, unknown>,
  inputs: Record<string, unknown> = {}
): boolean {
  const contextManager = new ContextManager({
    steps: stepResults,
    inputs,
  });

  const executor = new LogicNodeExecutor(contextManager);
  const result = executor.executeCondition({ condition });

  return result.evaluatedTo;
}

/**
 * Quick switch evaluation
 */
export function evaluateNodeSwitch(
  expression: string,
  cases: Array<{ value: string; targetNodeId: string }>,
  stepResults: Record<string, unknown>,
  inputs: Record<string, unknown> = {}
): { matchedCase: string; targetNodeId?: string } {
  const contextManager = new ContextManager({
    steps: stepResults,
    inputs,
  });

  const executor = new LogicNodeExecutor(contextManager);
  const result = executor.executeSwitch({ switchValue: expression, cases });

  return {
    matchedCase: result.matchedCase,
    targetNodeId: result.nextNodeId,
  };
}
