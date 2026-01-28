/**
 * SandboxManager
 *
 * Phase 3: Power Features - Secure JavaScript Execution
 *
 * Uses isolated-vm (IVM) to run untrusted user code in a secure, isolated
 * V8 context. This prevents access to Node.js APIs (fs, process, network)
 * and enforces strict resource limits (CPU timeout, memory).
 *
 * Security Features:
 * - Complete isolation from Node.js runtime
 * - No access to process, fs, require, network, etc.
 * - Configurable memory limits (default 128MB)
 * - Strict execution timeout (default 500ms)
 * - Safe marshalling of data in/out of sandbox
 * - Automatic cleanup of isolates
 */

import ivm from 'isolated-vm';
import { createLogger } from '@/lib/logger';

const logger = createLogger('sandbox-manager');

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration for sandbox execution
 */
export interface SandboxConfig {
  /** Maximum memory in MB (default: 128) */
  memoryLimitMB: number;

  /** Execution timeout in ms (default: 500) */
  timeoutMs: number;

  /** Maximum array/object size to transfer (default: 10MB) */
  maxTransferSizeBytes: number;

  /** Enable console logging in sandbox (default: false in production) */
  enableConsole: boolean;

  /** Allowed global functions to inject */
  allowedGlobals?: string[];
}

/**
 * Input context for sandbox execution
 */
export interface SandboxContext {
  /** Current item data ($json equivalent) */
  $json: Record<string, unknown>;

  /** All input items */
  $items: Array<{ json: Record<string, unknown> }>;

  /** Current item index */
  $itemIndex: number;

  /** Total item count */
  $itemCount: number;

  /** Node outputs from previous nodes */
  $node: Record<string, { json: Record<string, unknown>[] }>;

  /** Global variables */
  $vars: Record<string, unknown>;

  /** Environment variables (filtered, safe subset) */
  $env: Record<string, string>;

  /** Execution metadata */
  $execution: {
    id: string;
    mode: 'manual' | 'trigger' | 'scheduled';
  };

  /** Loop context if inside a loop */
  $loop?: {
    runIndex: number;
    batchIndex: number;
    totalItems: number;
    batchSize: number;
    isLastBatch: boolean;
  };
}

/**
 * Result from sandbox execution
 */
export interface SandboxResult {
  /** Whether execution succeeded */
  success: boolean;

  /** Returned data from user code */
  data?: unknown;

  /** Error message if failed */
  error?: string;

  /** Error stack trace (sanitized) */
  stack?: string;

  /** Execution time in ms */
  durationMs: number;

  /** Memory used in bytes */
  memoryUsedBytes?: number;

  /** Console logs captured */
  logs?: string[];
}

/**
 * Execution metrics for monitoring
 */
export interface SandboxMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  timeoutErrors: number;
  memoryErrors: number;
  averageDurationMs: number;
  peakMemoryBytes: number;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: SandboxConfig = {
  memoryLimitMB: 128,
  timeoutMs: 500,
  maxTransferSizeBytes: 10 * 1024 * 1024, // 10MB
  enableConsole: process.env.NODE_ENV !== 'production',
};

// ============================================================================
// SANDBOX MANAGER
// ============================================================================

export class SandboxManager {
  private config: SandboxConfig;
  private isolatePool: ivm.Isolate[] = [];
  private maxPoolSize: number = 5;
  private metrics: SandboxMetrics = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    timeoutErrors: 0,
    memoryErrors: 0,
    averageDurationMs: 0,
    peakMemoryBytes: 0,
  };

  constructor(config: Partial<SandboxConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info('SandboxManager initialized', {
      memoryLimitMB: this.config.memoryLimitMB,
      timeoutMs: this.config.timeoutMs,
    });
  }

  /**
   * Execute user code in a secure sandbox
   *
   * @param code - The JavaScript code to execute
   * @param context - Execution context ($json, $items, etc.)
   * @param configOverride - Optional config overrides for this execution
   * @returns Execution result
   */
  async execute(
    code: string,
    context: SandboxContext,
    configOverride: Partial<SandboxConfig> = {}
  ): Promise<SandboxResult> {
    const startTime = Date.now();
    const config = { ...this.config, ...configOverride };
    const logs: string[] = [];

    this.metrics.totalExecutions++;

    // Validate code size
    if (code.length > 100 * 1024) {
      return {
        success: false,
        error: 'Code exceeds maximum size limit (100KB)',
        durationMs: Date.now() - startTime,
        logs,
      };
    }

    // Validate context size
    const contextJson = JSON.stringify(context);
    if (contextJson.length > config.maxTransferSizeBytes) {
      return {
        success: false,
        error: `Context exceeds maximum size limit (${config.maxTransferSizeBytes / 1024 / 1024}MB)`,
        durationMs: Date.now() - startTime,
        logs,
      };
    }

    let isolate: ivm.Isolate | null = null;

    try {
      // Create or get isolate from pool
      isolate = this.getOrCreateIsolate(config.memoryLimitMB);

      // Create a new context in the isolate
      const ivmContext = await isolate.createContext();

      // Get the global object
      const jail = ivmContext.global;

      // Set up the jail (global object in sandbox)
      await jail.set('global', jail.derefInto());

      // Inject safe console if enabled
      if (config.enableConsole) {
        await this.injectConsole(jail, logs);
      }

      // Inject safe utility functions
      await this.injectUtilities(jail);

      // Inject the context data
      await this.injectContext(jail, context);

      // Wrap user code in an async function to support await
      const wrappedCode = this.wrapUserCode(code);

      // Compile the script
      const script = await isolate.compileScript(wrappedCode, {
        filename: 'user-code.js',
      });

      // Execute with timeout
      const result = await script.run(ivmContext, {
        timeout: config.timeoutMs,
        copy: true,
      });

      // Track memory
      const heapStats = isolate.getHeapStatisticsSync();
      if (heapStats.total_heap_size > this.metrics.peakMemoryBytes) {
        this.metrics.peakMemoryBytes = heapStats.total_heap_size;
      }

      const durationMs = Date.now() - startTime;
      this.updateAverageDuration(durationMs);
      this.metrics.successfulExecutions++;

      logger.debug('Sandbox execution completed', {
        durationMs,
        heapSize: heapStats.total_heap_size,
        logsCount: logs.length,
      });

      return {
        success: true,
        data: result,
        durationMs,
        memoryUsedBytes: heapStats.total_heap_size,
        logs,
      };

    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      this.metrics.failedExecutions++;

      // Classify the error
      let errorType = 'execution';
      let errorMessage = error.message || 'Unknown error';

      if (errorMessage.includes('Script execution timed out')) {
        this.metrics.timeoutErrors++;
        errorType = 'timeout';
        errorMessage = `Code execution exceeded time limit (${config.timeoutMs}ms). Check for infinite loops.`;
      } else if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
        this.metrics.memoryErrors++;
        errorType = 'memory';
        errorMessage = `Code exceeded memory limit (${config.memoryLimitMB}MB)`;
      }

      logger.warn('Sandbox execution failed', {
        errorType,
        errorMessage,
        durationMs,
        codeLength: code.length,
      });

      return {
        success: false,
        error: errorMessage,
        stack: this.sanitizeStack(error.stack),
        durationMs,
        logs,
      };

    } finally {
      // Return isolate to pool or dispose
      if (isolate) {
        this.returnOrDisposeIsolate(isolate);
      }
    }
  }

  /**
   * Execute code that returns multiple items (for transformations)
   */
  async executeForItems(
    code: string,
    items: Array<{ json: Record<string, unknown> }>,
    nodeOutputs: Record<string, { json: Record<string, unknown>[] }>,
    variables: Record<string, unknown>,
    executionMeta: { id: string; mode: 'manual' | 'trigger' | 'scheduled' },
    configOverride: Partial<SandboxConfig> = {}
  ): Promise<SandboxResult & { items?: Array<{ json: Record<string, unknown> }> }> {
    // If single-item processing, run for each item
    // Otherwise, process all items at once

    const context: SandboxContext = {
      $json: items[0]?.json || {},
      $items: items,
      $itemIndex: 0,
      $itemCount: items.length,
      $node: nodeOutputs,
      $vars: variables,
      $env: this.getSafeEnv(),
      $execution: executionMeta,
    };

    const result = await this.execute(code, context, configOverride);

    if (!result.success) {
      return result;
    }

    // Normalize result to items array
    const normalizedItems = this.normalizeToItems(result.data);

    return {
      ...result,
      items: normalizedItems,
    };
  }

  /**
   * Get safe environment variables (only explicitly allowed ones)
   */
  private getSafeEnv(): Record<string, string> {
    const allowedEnvVars = [
      'NODE_ENV',
      'TZ',
      'LANG',
    ];

    const safeEnv: Record<string, string> = {};
    for (const key of allowedEnvVars) {
      if (process.env[key]) {
        safeEnv[key] = process.env[key]!;
      }
    }
    return safeEnv;
  }

  /**
   * Create or get an isolate from the pool
   */
  private getOrCreateIsolate(memoryLimitMB: number): ivm.Isolate {
    // For now, always create a new isolate to ensure clean state
    // Pool optimization can be added later
    const isolate = new ivm.Isolate({
      memoryLimit: memoryLimitMB,
    });

    return isolate;
  }

  /**
   * Return isolate to pool or dispose it
   */
  private returnOrDisposeIsolate(isolate: ivm.Isolate): void {
    try {
      isolate.dispose();
    } catch (e) {
      // Isolate already disposed, ignore
    }
  }

  /**
   * Inject console methods that capture logs
   */
  private async injectConsole(
    jail: ivm.Reference<Record<string, unknown>>,
    logs: string[]
  ): Promise<void> {
    const logCallback = new ivm.Callback((...args: unknown[]) => {
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');

      if (logs.length < 100) { // Limit log capture
        logs.push(`[LOG] ${message}`);
      }
    });

    const warnCallback = new ivm.Callback((...args: unknown[]) => {
      const message = args.map(String).join(' ');
      if (logs.length < 100) {
        logs.push(`[WARN] ${message}`);
      }
    });

    const errorCallback = new ivm.Callback((...args: unknown[]) => {
      const message = args.map(String).join(' ');
      if (logs.length < 100) {
        logs.push(`[ERROR] ${message}`);
      }
    });

    await jail.set('console', {
      log: logCallback,
      warn: warnCallback,
      error: errorCallback,
      info: logCallback,
      debug: logCallback,
    }, { copy: true });
  }

  /**
   * Inject safe utility functions
   */
  private async injectUtilities(jail: ivm.Reference<Record<string, unknown>>): Promise<void> {
    // JSON utilities are built-in to V8

    // Add safe Date utilities
    // Note: Date is already available in V8

    // Add Math utilities (already available in V8)

    // Add String/Number/Array methods (already available in V8)

    // Add Object utilities
    await jail.set('Object', Object, { copy: true });
    await jail.set('Array', Array, { copy: true });
    await jail.set('JSON', JSON, { copy: true });
    await jail.set('Math', Math, { copy: true });
    await jail.set('Date', Date, { copy: true });
    await jail.set('String', String, { copy: true });
    await jail.set('Number', Number, { copy: true });
    await jail.set('Boolean', Boolean, { copy: true });
    await jail.set('RegExp', RegExp, { copy: true });

    // Add helper functions
    const helpers = `
      // Deep clone helper
      function $clone(obj) {
        return JSON.parse(JSON.stringify(obj));
      }

      // Safe get with dot notation
      function $get(obj, path, defaultValue) {
        const keys = path.split('.');
        let result = obj;
        for (const key of keys) {
          if (result === null || result === undefined) {
            return defaultValue;
          }
          result = result[key];
        }
        return result !== undefined ? result : defaultValue;
      }

      // Safe set with dot notation
      function $set(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let current = obj;
        for (const key of keys) {
          if (current[key] === undefined || current[key] === null) {
            current[key] = {};
          }
          current = current[key];
        }
        current[lastKey] = value;
        return obj;
      }

      // Check if value is empty
      function $isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
      }

      // Pick specific keys from object
      function $pick(obj, keys) {
        const result = {};
        for (const key of keys) {
          if (obj.hasOwnProperty(key)) {
            result[key] = obj[key];
          }
        }
        return result;
      }

      // Omit specific keys from object
      function $omit(obj, keys) {
        const result = { ...obj };
        for (const key of keys) {
          delete result[key];
        }
        return result;
      }
    `;

    const helperScript = await jail.isolate!.compileScript(helpers, {
      filename: 'helpers.js',
    });
    await helperScript.run(await jail.isolate!.createContext());
  }

  /**
   * Inject execution context into sandbox
   */
  private async injectContext(
    jail: ivm.Reference<Record<string, unknown>>,
    context: SandboxContext
  ): Promise<void> {
    // Transfer context as plain objects (deep copy)
    await jail.set('$json', context.$json, { copy: true });
    await jail.set('$items', context.$items, { copy: true });
    await jail.set('$itemIndex', context.$itemIndex);
    await jail.set('$itemCount', context.$itemCount);
    await jail.set('$node', context.$node, { copy: true });
    await jail.set('$vars', context.$vars, { copy: true });
    await jail.set('$env', context.$env, { copy: true });
    await jail.set('$execution', context.$execution, { copy: true });

    if (context.$loop) {
      await jail.set('$loop', context.$loop, { copy: true });
    }

    // Add convenience aliases
    await jail.set('$input', context.$json, { copy: true });
  }

  /**
   * Wrap user code in an IIFE that returns the result
   */
  private wrapUserCode(code: string): string {
    // Wrap in an immediately invoked function expression
    // This allows users to use return statements
    return `
      (function() {
        'use strict';

        // User code
        ${code}

      })();
    `;
  }

  /**
   * Normalize result to array of items
   */
  private normalizeToItems(
    data: unknown
  ): Array<{ json: Record<string, unknown> }> {
    if (data === null || data === undefined) {
      return [];
    }

    // Already in correct format
    if (Array.isArray(data)) {
      return data.map(item => {
        if (typeof item === 'object' && item !== null && 'json' in item) {
          return item as { json: Record<string, unknown> };
        }
        return { json: item as Record<string, unknown> };
      });
    }

    // Single object
    if (typeof data === 'object') {
      if ('json' in data) {
        return [data as { json: Record<string, unknown> }];
      }
      return [{ json: data as Record<string, unknown> }];
    }

    // Primitive value
    return [{ json: { value: data } }];
  }

  /**
   * Sanitize error stack trace to remove internal details
   */
  private sanitizeStack(stack?: string): string | undefined {
    if (!stack) return undefined;

    // Remove paths and internal frames
    return stack
      .split('\n')
      .filter(line => !line.includes('node_modules'))
      .filter(line => !line.includes('isolated-vm'))
      .slice(0, 5)
      .join('\n');
  }

  /**
   * Update average duration metric
   */
  private updateAverageDuration(durationMs: number): void {
    const { averageDurationMs, totalExecutions } = this.metrics;
    this.metrics.averageDurationMs =
      (averageDurationMs * (totalExecutions - 1) + durationMs) / totalExecutions;
  }

  /**
   * Get current metrics
   */
  getMetrics(): SandboxMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      timeoutErrors: 0,
      memoryErrors: 0,
      averageDurationMs: 0,
      peakMemoryBytes: 0,
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    for (const isolate of this.isolatePool) {
      try {
        isolate.dispose();
      } catch {
        // Ignore disposal errors
      }
    }
    this.isolatePool = [];
    logger.info('SandboxManager disposed');
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let sandboxManagerInstance: SandboxManager | null = null;

export function getSandboxManager(config?: Partial<SandboxConfig>): SandboxManager {
  if (!sandboxManagerInstance) {
    sandboxManagerInstance = new SandboxManager(config);
  }
  return sandboxManagerInstance;
}

export function disposeSandboxManager(): void {
  if (sandboxManagerInstance) {
    sandboxManagerInstance.dispose();
    sandboxManagerInstance = null;
  }
}

export default SandboxManager;
