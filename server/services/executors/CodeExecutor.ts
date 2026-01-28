/**
 * CodeExecutor
 *
 * Phase 3: Power Features - Code Node Executor
 *
 * Allows users to write custom JavaScript code that executes in a secure
 * sandbox (isolated-vm). The code can transform data, filter items, or
 * perform complex logic that isn't possible with standard nodes.
 *
 * Security:
 * - All code runs in isolated-vm sandbox
 * - No access to Node.js APIs (fs, process, network)
 * - Strict timeout and memory limits
 * - Input/output validation
 *
 * Usage in workflows:
 * {
 *   type: 'code',
 *   data: {
 *     code: 'return { ...input, processed: true };',
 *     mode: 'expression' | 'transform' | 'filter',
 *     language: 'javascript',
 *     timeout: 500,
 *   }
 * }
 */

import { createLogger } from '@/lib/logger';
import { getSandboxManager, SandboxContext, SandboxResult } from '../sandbox/SandboxManager';
import { INodeExecutor, NodeExecutorInput, NodeExecutorOutput } from '@/types/execution';
import { WorkflowItem, ItemHelper } from '@/lib/studio/item-helper';

const logger = createLogger('code-executor');

// ============================================================================
// TYPES
// ============================================================================

/**
 * Code execution mode
 */
export type CodeMode =
  | 'expression'   // Returns a single value or object
  | 'transform'    // Transforms each item
  | 'filter'       // Filters items (return true/false)
  | 'aggregate'    // Aggregates all items into one
  | 'runOnce';     // Runs once for all items, returns new items array

/**
 * Code node configuration
 */
export interface CodeNodeConfig {
  /** The JavaScript code to execute */
  code: string;

  /** Execution mode */
  mode: CodeMode;

  /** Language (only JavaScript supported) */
  language: 'javascript';

  /** Execution timeout in ms (max 5000) */
  timeout?: number;

  /** Memory limit in MB (max 256) */
  memoryLimit?: number;

  /** Continue on error per item */
  continueOnError?: boolean;

  /** Field to store result (for expression mode) */
  outputField?: string;
}

/**
 * Code execution result
 */
export interface CodeExecutionResult {
  items: WorkflowItem[];
  logs: string[];
  executionTimeMs: number;
  itemsProcessed: number;
  errors: Array<{ itemIndex: number; error: string }>;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: Partial<CodeNodeConfig> = {
  mode: 'transform',
  language: 'javascript',
  timeout: 500,
  memoryLimit: 128,
  continueOnError: false,
};

const MAX_TIMEOUT = 5000; // 5 seconds max
const MAX_MEMORY = 256;   // 256MB max

// ============================================================================
// CODE EXECUTOR
// ============================================================================

export class CodeExecutor implements INodeExecutor {
  private sandboxManager = getSandboxManager();

  /**
   * Execute the code node
   */
  async execute(input: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const { node, context, inputs } = input;
    const startTime = Date.now();

    // Extract configuration
    const config: CodeNodeConfig = {
      ...DEFAULT_CONFIG,
      code: node.data?.code || '',
      mode: node.data?.mode || 'transform',
      language: node.data?.language || 'javascript',
      timeout: Math.min(node.data?.timeout || 500, MAX_TIMEOUT),
      memoryLimit: Math.min(node.data?.memoryLimit || 128, MAX_MEMORY),
      continueOnError: node.data?.continueOnError || false,
      outputField: node.data?.outputField,
    };

    // Validate code
    if (!config.code || config.code.trim() === '') {
      return {
        data: null,
        success: false,
        error: 'No code provided',
        meta: { durationMs: Date.now() - startTime },
      };
    }

    // Validate language
    if (config.language !== 'javascript') {
      return {
        data: null,
        success: false,
        error: `Unsupported language: ${config.language}. Only JavaScript is supported.`,
        meta: { durationMs: Date.now() - startTime },
      };
    }

    // Get input items
    const inputItems = this.normalizeInputItems(inputs);

    if (inputItems.length === 0) {
      logger.debug('No input items for code execution', { nodeId: node.id });
      return {
        data: { items: [], logs: [] },
        success: true,
        meta: { durationMs: Date.now() - startTime, itemCount: 0 },
      };
    }

    try {
      // Execute based on mode
      let result: CodeExecutionResult;

      switch (config.mode) {
        case 'expression':
          result = await this.executeExpression(config, inputItems, context);
          break;

        case 'transform':
          result = await this.executeTransform(config, inputItems, context);
          break;

        case 'filter':
          result = await this.executeFilter(config, inputItems, context);
          break;

        case 'aggregate':
          result = await this.executeAggregate(config, inputItems, context);
          break;

        case 'runOnce':
          result = await this.executeRunOnce(config, inputItems, context);
          break;

        default:
          return {
            data: null,
            success: false,
            error: `Unknown code mode: ${config.mode}`,
            meta: { durationMs: Date.now() - startTime },
          };
      }

      // Check for errors
      if (result.errors.length > 0 && !config.continueOnError) {
        const firstError = result.errors[0];
        return {
          data: null,
          success: false,
          error: `Code execution failed at item ${firstError.itemIndex}: ${firstError.error}`,
          meta: {
            durationMs: Date.now() - startTime,
            logs: result.logs,
            errors: result.errors,
          },
        };
      }

      logger.debug('Code execution completed', {
        nodeId: node.id,
        mode: config.mode,
        itemsIn: inputItems.length,
        itemsOut: result.items.length,
        durationMs: result.executionTimeMs,
      });

      return {
        data: {
          items: result.items,
          logs: result.logs,
        },
        success: true,
        meta: {
          durationMs: Date.now() - startTime,
          itemCount: result.items.length,
          logs: result.logs,
          mode: config.mode,
        },
      };

    } catch (error: any) {
      logger.error('Code executor error', {
        nodeId: node.id,
        error: error.message,
      });

      return {
        data: null,
        success: false,
        error: error.message,
        meta: { durationMs: Date.now() - startTime },
      };
    }
  }

  /**
   * Execute in expression mode - evaluates code and adds result to items
   */
  private async executeExpression(
    config: CodeNodeConfig,
    items: WorkflowItem[],
    context: any
  ): Promise<CodeExecutionResult> {
    const logs: string[] = [];
    const errors: Array<{ itemIndex: number; error: string }> = [];
    const resultItems: WorkflowItem[] = [];
    const startTime = Date.now();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const sandboxContext = this.buildSandboxContext(item, items, i, context);

      // Wrap code to return the expression value
      const wrappedCode = `return (${config.code});`;

      const result = await this.sandboxManager.execute(wrappedCode, sandboxContext, {
        timeoutMs: config.timeout,
        memoryLimitMB: config.memoryLimit,
      });

      if (result.logs) {
        logs.push(...result.logs.map(l => `[Item ${i}] ${l}`));
      }

      if (!result.success) {
        errors.push({ itemIndex: i, error: result.error || 'Unknown error' });
        if (!config.continueOnError) break;
        resultItems.push(item); // Keep original item on error
        continue;
      }

      // Add result to item
      const outputField = config.outputField || 'result';
      const newJson = { ...item.json, [outputField]: result.data };
      resultItems.push({ json: newJson, pairedItem: { item: i } });
    }

    return {
      items: resultItems,
      logs,
      executionTimeMs: Date.now() - startTime,
      itemsProcessed: items.length,
      errors,
    };
  }

  /**
   * Execute in transform mode - replaces each item with transformed version
   */
  private async executeTransform(
    config: CodeNodeConfig,
    items: WorkflowItem[],
    context: any
  ): Promise<CodeExecutionResult> {
    const logs: string[] = [];
    const errors: Array<{ itemIndex: number; error: string }> = [];
    const resultItems: WorkflowItem[] = [];
    const startTime = Date.now();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const sandboxContext = this.buildSandboxContext(item, items, i, context);

      // User code should return the new item data
      const wrappedCode = `
        const input = $json;
        ${config.code}
      `;

      const result = await this.sandboxManager.execute(wrappedCode, sandboxContext, {
        timeoutMs: config.timeout,
        memoryLimitMB: config.memoryLimit,
      });

      if (result.logs) {
        logs.push(...result.logs.map(l => `[Item ${i}] ${l}`));
      }

      if (!result.success) {
        errors.push({ itemIndex: i, error: result.error || 'Unknown error' });
        if (!config.continueOnError) break;
        resultItems.push(item); // Keep original item on error
        continue;
      }

      // Handle different return types
      const transformedData = result.data;
      if (transformedData === null || transformedData === undefined) {
        // Skip item if null/undefined returned
        continue;
      }

      if (typeof transformedData === 'object' && !Array.isArray(transformedData)) {
        resultItems.push({ json: transformedData as Record<string, unknown>, pairedItem: { item: i } });
      } else if (Array.isArray(transformedData)) {
        // Allow returning multiple items
        for (const subItem of transformedData) {
          if (typeof subItem === 'object' && subItem !== null) {
            resultItems.push({ json: subItem as Record<string, unknown>, pairedItem: { item: i } });
          }
        }
      } else {
        // Wrap primitive in object
        resultItems.push({ json: { value: transformedData }, pairedItem: { item: i } });
      }
    }

    return {
      items: resultItems,
      logs,
      executionTimeMs: Date.now() - startTime,
      itemsProcessed: items.length,
      errors,
    };
  }

  /**
   * Execute in filter mode - keeps items where code returns true
   */
  private async executeFilter(
    config: CodeNodeConfig,
    items: WorkflowItem[],
    context: any
  ): Promise<CodeExecutionResult> {
    const logs: string[] = [];
    const errors: Array<{ itemIndex: number; error: string }> = [];
    const resultItems: WorkflowItem[] = [];
    const startTime = Date.now();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const sandboxContext = this.buildSandboxContext(item, items, i, context);

      // User code should return true/false
      const wrappedCode = `return Boolean(${config.code});`;

      const result = await this.sandboxManager.execute(wrappedCode, sandboxContext, {
        timeoutMs: config.timeout,
        memoryLimitMB: config.memoryLimit,
      });

      if (result.logs) {
        logs.push(...result.logs.map(l => `[Item ${i}] ${l}`));
      }

      if (!result.success) {
        errors.push({ itemIndex: i, error: result.error || 'Unknown error' });
        if (!config.continueOnError) break;
        // On error, include item (fail-safe)
        resultItems.push(item);
        continue;
      }

      // Keep item if result is truthy
      if (result.data) {
        resultItems.push({ ...item, pairedItem: { item: i } });
      }
    }

    return {
      items: resultItems,
      logs,
      executionTimeMs: Date.now() - startTime,
      itemsProcessed: items.length,
      errors,
    };
  }

  /**
   * Execute in aggregate mode - combines all items into one
   */
  private async executeAggregate(
    config: CodeNodeConfig,
    items: WorkflowItem[],
    context: any
  ): Promise<CodeExecutionResult> {
    const logs: string[] = [];
    const errors: Array<{ itemIndex: number; error: string }> = [];
    const startTime = Date.now();

    // Build context with all items
    const sandboxContext = this.buildSandboxContext(items[0], items, 0, context);

    // User code has access to $items and should return aggregated result
    const wrappedCode = `
      const items = $items.map(i => i.json);
      ${config.code}
    `;

    const result = await this.sandboxManager.execute(wrappedCode, sandboxContext, {
      timeoutMs: config.timeout,
      memoryLimitMB: config.memoryLimit,
    });

    if (result.logs) {
      logs.push(...result.logs);
    }

    if (!result.success) {
      errors.push({ itemIndex: 0, error: result.error || 'Unknown error' });
      return {
        items: [],
        logs,
        executionTimeMs: Date.now() - startTime,
        itemsProcessed: items.length,
        errors,
      };
    }

    // Normalize result
    let resultItems: WorkflowItem[] = [];
    if (result.data !== null && result.data !== undefined) {
      if (typeof result.data === 'object' && !Array.isArray(result.data)) {
        resultItems = [{ json: result.data as Record<string, unknown>, pairedItem: { item: 0 } }];
      } else if (Array.isArray(result.data)) {
        resultItems = result.data.map((item, idx) => ({
          json: typeof item === 'object' ? item : { value: item },
          pairedItem: { item: idx },
        }));
      } else {
        resultItems = [{ json: { value: result.data }, pairedItem: { item: 0 } }];
      }
    }

    return {
      items: resultItems,
      logs,
      executionTimeMs: Date.now() - startTime,
      itemsProcessed: items.length,
      errors,
    };
  }

  /**
   * Execute in runOnce mode - runs code once, expects items array returned
   */
  private async executeRunOnce(
    config: CodeNodeConfig,
    items: WorkflowItem[],
    context: any
  ): Promise<CodeExecutionResult> {
    const logs: string[] = [];
    const errors: Array<{ itemIndex: number; error: string }> = [];
    const startTime = Date.now();

    // Build context with all items
    const sandboxContext = this.buildSandboxContext(items[0], items, 0, context);

    // User code should return array of new items
    const wrappedCode = `
      const items = $items;
      ${config.code}
    `;

    const result = await this.sandboxManager.execute(wrappedCode, sandboxContext, {
      timeoutMs: config.timeout,
      memoryLimitMB: config.memoryLimit,
    });

    if (result.logs) {
      logs.push(...result.logs);
    }

    if (!result.success) {
      errors.push({ itemIndex: 0, error: result.error || 'Unknown error' });
      return {
        items: [],
        logs,
        executionTimeMs: Date.now() - startTime,
        itemsProcessed: items.length,
        errors,
      };
    }

    // Normalize result to items
    const resultItems = this.normalizeReturnedItems(result.data);

    return {
      items: resultItems,
      logs,
      executionTimeMs: Date.now() - startTime,
      itemsProcessed: items.length,
      errors,
    };
  }

  /**
   * Build sandbox context from item and execution context
   */
  private buildSandboxContext(
    currentItem: WorkflowItem,
    allItems: WorkflowItem[],
    itemIndex: number,
    executionContext: any
  ): SandboxContext {
    return {
      $json: currentItem.json,
      $items: allItems.map(i => ({ json: i.json })),
      $itemIndex: itemIndex,
      $itemCount: allItems.length,
      $node: this.extractNodeOutputs(executionContext),
      $vars: executionContext.state?.variables || {},
      $env: {}, // Safe env is handled by sandbox manager
      $execution: {
        id: executionContext.executionId || '',
        mode: executionContext.mode || 'manual',
      },
      $loop: executionContext._loopContext,
    };
  }

  /**
   * Extract node outputs from execution context
   */
  private extractNodeOutputs(context: any): Record<string, { json: Record<string, unknown>[] }> {
    const nodeOutputs: Record<string, { json: Record<string, unknown>[] }> = {};

    if (context.state?.nodes) {
      for (const [nodeId, nodeState] of Object.entries<any>(context.state.nodes)) {
        if (nodeState?.output) {
          const output = nodeState.output;
          if (Array.isArray(output)) {
            nodeOutputs[nodeId] = {
              json: output.map(item =>
                typeof item === 'object' && item !== null && 'json' in item
                  ? item.json
                  : item
              ),
            };
          } else if (typeof output === 'object') {
            nodeOutputs[nodeId] = { json: [output] };
          }
        }
      }
    }

    return nodeOutputs;
  }

  /**
   * Normalize input items from various formats
   */
  private normalizeInputItems(inputs: any): WorkflowItem[] {
    // Handle array input
    if (inputs.items) {
      return ItemHelper.wrapInArray(inputs.items);
    }

    // Handle previousOutput
    if (inputs.previousOutput) {
      return ItemHelper.wrapInArray(inputs.previousOutput);
    }

    // Handle data field
    if (inputs.data) {
      return ItemHelper.wrapInArray(inputs.data);
    }

    // Handle direct array
    if (Array.isArray(inputs)) {
      return ItemHelper.wrapInArray(inputs);
    }

    // Handle single object
    if (typeof inputs === 'object' && inputs !== null) {
      return ItemHelper.wrapInArray(inputs);
    }

    return [];
  }

  /**
   * Normalize returned data to WorkflowItem array
   */
  private normalizeReturnedItems(data: unknown): WorkflowItem[] {
    if (data === null || data === undefined) {
      return [];
    }

    if (Array.isArray(data)) {
      return data.map((item, idx) => {
        if (typeof item === 'object' && item !== null) {
          if ('json' in item) {
            return { json: (item as any).json, pairedItem: { item: idx } };
          }
          return { json: item as Record<string, unknown>, pairedItem: { item: idx } };
        }
        return { json: { value: item }, pairedItem: { item: idx } };
      });
    }

    if (typeof data === 'object') {
      if ('json' in data) {
        return [{ json: (data as any).json, pairedItem: { item: 0 } }];
      }
      return [{ json: data as Record<string, unknown>, pairedItem: { item: 0 } }];
    }

    return [{ json: { value: data }, pairedItem: { item: 0 } }];
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let codeExecutorInstance: CodeExecutor | null = null;

export function getCodeExecutor(): CodeExecutor {
  if (!codeExecutorInstance) {
    codeExecutorInstance = new CodeExecutor();
  }
  return codeExecutorInstance;
}

export default CodeExecutor;
