/**
 * CODE EXECUTOR SERVICE
 *
 * Sandboxed execution of custom JavaScript/TypeScript code with security controls
 */

import { Worker } from 'worker_threads';
import { VM } from 'vm2';
import { getDb } from '@/lib/db/connection';
import { codeSnippets } from '@/lib/db/schema-custom-tools';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs/promises';

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface CodeSnippet {
  id: string;
  workspaceId?: string;
  createdBy?: string;
  name: string;
  displayName: string;
  description?: string;
  language: 'javascript' | 'python' | 'typescript';
  code: string;
  timeout: number;
  memoryLimit: number;
  parameters: CodeParameter[];
  returnType: 'json' | 'string' | 'number' | 'boolean';
  dependencies: string[];
  isActive: boolean;
  executionCount: number;
  lastExecutedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CodeParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required: boolean;
  default?: any;
}

export interface CodeExecutionInput {
  snippetId: string;
  parameters: Record<string, any>;
}

export interface CodeExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  logs: string[];
  durationMs: number;
  memoryUsed?: number;
}

// ============================================================
// SANDBOX CONTEXT
// ============================================================

/**
 * Create a safe sandbox context with limited globals
 */
function createSandboxContext(params: Record<string, any>): any {
  const logs: string[] = [];

  return {
    // User parameters
    params,

    // Safe console
    console: {
      log: (...args: any[]) => logs.push(args.map(String).join(' ')),
      info: (...args: any[]) => logs.push('[INFO] ' + args.map(String).join(' ')),
      warn: (...args: any[]) => logs.push('[WARN] ' + args.map(String).join(' ')),
      error: (...args: any[]) => logs.push('[ERROR] ' + args.map(String).join(' ')),
    },

    // Safe utilities
    JSON,
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,

    // Async support
    Promise,
    setTimeout: undefined, // Disabled for security
    setInterval: undefined, // Disabled for security
    setImmediate: undefined, // Disabled for security

    // Get logs
    __getLogs: () => logs,
  };
}

// ============================================================
// CODE EXECUTOR SERVICE
// ============================================================

export class CodeExecutorService {
  private static readonly MAX_CODE_SIZE = 100000; // 100KB max code size
  private static readonly DEFAULT_TIMEOUT = 5000; // 5 seconds
  private static readonly DEFAULT_MEMORY_LIMIT = 128; // 128MB

  constructor() {
    console.log('[CODE_EXECUTOR] Initializing Code Executor Service...');
  }

  // ========================================================
  // SNIPPET MANAGEMENT
  // ========================================================

  /**
   * Register a code snippet
   */
  async registerSnippet(options: {
    workspaceId?: string;
    createdBy?: string;
    name: string;
    displayName: string;
    description?: string;
    language: 'javascript' | 'python' | 'typescript';
    code: string;
    timeout?: number;
    memoryLimit?: number;
    parameters?: CodeParameter[];
    returnType?: 'json' | 'string' | 'number' | 'boolean';
    dependencies?: string[];
  }): Promise<CodeSnippet> {
    const db = getDb();

    console.log(`[CODE_EXECUTOR] Registering snippet: ${options.name}`);

    // Validate code size
    if (options.code.length > CodeExecutorService.MAX_CODE_SIZE) {
      throw new Error('Code size exceeds maximum allowed size (100KB)');
    }

    // Validate language
    if (!['javascript', 'python', 'typescript'].includes(options.language)) {
      throw new Error(`Unsupported language: ${options.language}`);
    }

    // Security check - block dangerous patterns
    this.validateCodeSecurity(options.code);

    const [snippet] = await db
      .insert(codeSnippets)
      .values({
        workspaceId: options.workspaceId || null,
        createdBy: options.createdBy || null,
        name: options.name,
        displayName: options.displayName,
        description: options.description || null,
        language: options.language,
        code: options.code,
        timeout: options.timeout || CodeExecutorService.DEFAULT_TIMEOUT,
        memoryLimit: options.memoryLimit || CodeExecutorService.DEFAULT_MEMORY_LIMIT,
        parameters: (options.parameters || []) as any,
        returnType: options.returnType || 'json',
        dependencies: options.dependencies || [],
        isActive: true,
        executionCount: 0,
      })
      .returning();

    console.log(`[CODE_EXECUTOR] ✅ Snippet registered: ${snippet.id}`);

    return snippet as CodeSnippet;
  }

  /**
   * Get snippet by ID
   */
  async getSnippet(snippetId: string): Promise<CodeSnippet | null> {
    const db = getDb();

    const [snippet] = await db
      .select()
      .from(codeSnippets)
      .where(eq(codeSnippets.id, snippetId))
      .limit(1);

    return snippet ? (snippet as CodeSnippet) : null;
  }

  /**
   * List all snippets for workspace
   */
  async listSnippets(workspaceId?: string): Promise<CodeSnippet[]> {
    const db = getDb();

    let query = db.select().from(codeSnippets);

    if (workspaceId) {
      query = query.where(eq(codeSnippets.workspaceId, workspaceId)) as any;
    }

    const snippets = await query;
    return snippets as CodeSnippet[];
  }

  // ========================================================
  // CODE EXECUTION
  // ========================================================

  /**
   * Execute a code snippet
   */
  async executeSnippet(input: CodeExecutionInput): Promise<CodeExecutionResult> {
    const startTime = Date.now();

    try {
      // Get snippet
      const snippet = await this.getSnippet(input.snippetId);
      if (!snippet) {
        throw new Error(`Snippet not found: ${input.snippetId}`);
      }

      if (!snippet.isActive) {
        throw new Error(`Snippet is inactive: ${input.snippetId}`);
      }

      // Validate parameters
      this.validateParameters(input.parameters, snippet.parameters);

      // Execute based on language
      let result: CodeExecutionResult;

      switch (snippet.language) {
        case 'javascript':
        case 'typescript':
          result = await this.executeJavaScript(snippet, input.parameters);
          break;

        case 'python':
          result = await this.executePython(snippet, input.parameters);
          break;

        default:
          throw new Error(`Unsupported language: ${snippet.language}`);
      }

      // Update usage stats
      await this.updateSnippetUsage(snippet.id);

      const durationMs = Date.now() - startTime;

      return {
        ...result,
        durationMs,
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      return {
        success: false,
        error: error.message,
        logs: [error.stack || error.message],
        durationMs,
      };
    }
  }

  /**
   * Execute JavaScript code in sandbox
   */
  private async executeJavaScript(
    snippet: CodeSnippet,
    parameters: Record<string, any>
  ): Promise<CodeExecutionResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      try {
        // Create VM2 sandbox
        const vm = new VM({
          timeout: snippet.timeout,
          sandbox: createSandboxContext(parameters),
          eval: false,
          wasm: false,
        });

        // Wrap code to capture return value
        const wrappedCode = `
          (function() {
            ${snippet.code}
          })()
        `;

        // Execute
        const result = vm.run(wrappedCode);

        // Get logs from sandbox
        const logs = vm.run('__getLogs()') || [];

        const durationMs = Date.now() - startTime;

        resolve({
          success: true,
          result: this.formatResult(result, snippet.returnType),
          logs,
          durationMs,
        });
      } catch (error: any) {
        const durationMs = Date.now() - startTime;

        resolve({
          success: false,
          error: error.message,
          logs: [error.stack || error.message],
          durationMs,
        });
      }
    });
  }

  /**
   * Execute Python code (via child process)
   */
  private async executePython(
    snippet: CodeSnippet,
    parameters: Record<string, any>
  ): Promise<CodeExecutionResult> {
    // For Python execution, we would use a child process with Python runtime
    // This is a placeholder implementation

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      // TODO: Implement Python execution using child_process
      // For now, return error indicating Python is not yet supported

      const durationMs = Date.now() - startTime;

      resolve({
        success: false,
        error: 'Python execution not yet implemented. Use JavaScript instead.',
        logs: ['Python runtime support coming soon'],
        durationMs,
      });
    });
  }

  /**
   * Execute code in Worker thread (for isolation)
   */
  private async executeInWorker(
    code: string,
    parameters: Record<string, any>,
    timeout: number
  ): Promise<CodeExecutionResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      // Create temporary worker file
      const workerCode = `
        const { parentPort, workerData } = require('worker_threads');

        try {
          const params = workerData.params;
          const result = (function() {
            ${code}
          })();

          parentPort.postMessage({ success: true, result });
        } catch (error) {
          parentPort.postMessage({
            success: false,
            error: error.message,
            stack: error.stack
          });
        }
      `;

      const worker = new Worker(workerCode, {
        eval: true,
        workerData: { params: parameters },
      });

      // Timeout handler
      const timeoutId = setTimeout(() => {
        worker.terminate();
        resolve({
          success: false,
          error: 'Execution timeout exceeded',
          logs: [`Timeout after ${timeout}ms`],
          durationMs: Date.now() - startTime,
        });
      }, timeout);

      worker.on('message', (message) => {
        clearTimeout(timeoutId);
        worker.terminate();

        const durationMs = Date.now() - startTime;

        if (message.success) {
          resolve({
            success: true,
            result: message.result,
            logs: [],
            durationMs,
          });
        } else {
          resolve({
            success: false,
            error: message.error,
            logs: [message.stack || message.error],
            durationMs,
          });
        }
      });

      worker.on('error', (error) => {
        clearTimeout(timeoutId);
        worker.terminate();

        resolve({
          success: false,
          error: error.message,
          logs: [error.stack || error.message],
          durationMs: Date.now() - startTime,
        });
      });
    });
  }

  // ========================================================
  // VALIDATION & SECURITY
  // ========================================================

  /**
   * Validate code for security issues
   */
  private validateCodeSecurity(code: string): void {
    const dangerousPatterns = [
      /require\s*\(/i,
      /import\s+/i,
      /eval\s*\(/i,
      /Function\s*\(/i,
      /process\./i,
      /child_process/i,
      /fs\./i,
      /\.exec\(/i,
      /\.spawn\(/i,
      /\.fork\(/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error(`Security violation: Code contains dangerous pattern: ${pattern.source}`);
      }
    }
  }

  /**
   * Validate execution parameters
   */
  private validateParameters(
    provided: Record<string, any>,
    schema: CodeParameter[]
  ): void {
    for (const param of schema) {
      const value = provided[param.name];

      // Check required
      if (param.required && (value === undefined || value === null)) {
        throw new Error(`Missing required parameter: ${param.name}`);
      }

      // Type validation
      if (value !== undefined) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (param.type !== actualType) {
          throw new Error(
            `Parameter "${param.name}" must be of type ${param.type}, got ${actualType}`
          );
        }
      }
    }
  }

  /**
   * Format result based on return type
   */
  private formatResult(result: any, returnType: string): any {
    switch (returnType) {
      case 'json':
        return result;
      case 'string':
        return String(result);
      case 'number':
        return Number(result);
      case 'boolean':
        return Boolean(result);
      default:
        return result;
    }
  }

  // ========================================================
  // USAGE TRACKING
  // ========================================================

  /**
   * Update snippet usage statistics
   */
  private async updateSnippetUsage(snippetId: string): Promise<void> {
    const db = getDb();

    await db
      .update(codeSnippets)
      .set({
        executionCount: (codeSnippets.executionCount as any) + 1,
        lastExecutedAt: new Date(),
      })
      .where(eq(codeSnippets.id, snippetId));
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const codeExecutorService = new CodeExecutorService();
