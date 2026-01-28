/**
 * SecureSandboxService
 *
 * Provides isolated JavaScript code execution using isolated-vm.
 * Prevents RCE, prototype pollution, and injection attacks.
 *
 * Security features:
 * - Isolated V8 context with no access to Node.js globals
 * - Configurable memory limits (default: 128MB)
 * - Execution timeout (default: 1000ms)
 * - Pre-execution code analysis for dangerous patterns
 * - Safe input/output marshalling
 * - Security audit logging
 */

// Dynamic import for isolated-vm (native module may not be available on all platforms)
let ivm: typeof import('isolated-vm') | null = null;
let ivmLoadError: string | null = null;

// Try to load isolated-vm, but gracefully handle if it's not available
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ivm = require('isolated-vm');
} catch (error) {
  ivmLoadError = error instanceof Error ? error.message : String(error);
  console.warn('[SecureSandbox] isolated-vm not available, sandbox execution will be disabled:', ivmLoadError);
}

import {
  SandboxConfig,
  SandboxExecutionResult,
  SecurityViolation,
  SecurityAuditLogEntry,
  DEFAULT_SANDBOX_CONFIG,
  DANGEROUS_PATTERNS,
} from './types';

export class SecureSandboxService {
  private config: SandboxConfig;
  private auditLog: SecurityAuditLogEntry[] = [];
  private static instance: SecureSandboxService | null = null;

  constructor(config: Partial<SandboxConfig> = {}) {
    this.config = { ...DEFAULT_SANDBOX_CONFIG, ...config };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<SandboxConfig>): SecureSandboxService {
    if (!SecureSandboxService.instance) {
      SecureSandboxService.instance = new SecureSandboxService(config);
    }
    return SecureSandboxService.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  public static resetInstance(): void {
    SecureSandboxService.instance = null;
  }

  /**
   * Analyze code for dangerous patterns before execution
   */
  public analyzeCode(code: string): SecurityViolation[] {
    const violations: SecurityViolation[] = [];

    for (const { pattern, type, description, severity } of DANGEROUS_PATTERNS) {
      const matches = code.match(pattern);
      if (matches) {
        violations.push({
          type,
          description,
          pattern: matches[0],
          severity,
          timestamp: new Date(),
        });
      }
    }

    return violations;
  }

  /**
   * Check if sandbox execution is available
   */
  public isAvailable(): boolean {
    return ivm !== null;
  }

  /**
   * Execute code in isolated sandbox
   */
  public async execute(
    code: string,
    context: Record<string, any> = {},
    executionConfig?: Partial<SandboxConfig>
  ): Promise<SandboxExecutionResult> {
    const startTime = Date.now();
    const config = { ...this.config, ...executionConfig };
    const violations: SecurityViolation[] = [];

    // Check if isolated-vm is available
    if (!ivm) {
      return {
        success: false,
        output: null,
        executionTimeMs: Date.now() - startTime,
        securityViolations: [{
          type: 'sandbox_unavailable',
          description: 'Isolated sandbox is not available on this platform',
          severity: 'critical',
          timestamp: new Date(),
        }],
        error: `Sandbox unavailable: ${ivmLoadError || 'isolated-vm module not loaded'}`,
      };
    }

    // Pre-execution code analysis
    const codeViolations = this.analyzeCode(code);
    if (codeViolations.length > 0) {
      const criticalViolations = codeViolations.filter(v => v.severity === 'critical');
      if (criticalViolations.length > 0) {
        const result: SandboxExecutionResult = {
          success: false,
          output: null,
          executionTimeMs: Date.now() - startTime,
          securityViolations: codeViolations,
          error: `Execution blocked: ${criticalViolations.length} critical security violation(s) detected`,
        };

        this.logSecurityEvent({
          timestamp: new Date(),
          eventType: 'code_analysis',
          userId: config.userId,
          workflowId: config.workflowId,
          nodeId: config.nodeId,
          code: this.sanitizeCodeForLogging(code),
          result: 'blocked',
          violations: codeViolations,
          executionTimeMs: result.executionTimeMs,
        });

        return result;
      }
      // Add non-critical violations to the list but continue execution
      violations.push(...codeViolations);
    }

    // At this point we know ivm is not null (checked above)
    const ivmModule = ivm!;
    let isolate: InstanceType<typeof ivmModule.Isolate> | null = null;

    try {
      // Create isolated V8 instance with memory limit
      isolate = new ivmModule.Isolate({ memoryLimit: config.memoryLimitMb });

      // Create new context with no global access
      const contextObj = await isolate.createContext();

      // Get reference to the context's global object
      const jail = contextObj.global;

      // Set up safe globals
      await this.setupSafeGlobals(jail, contextObj, ivmModule);

      // Safely marshal input context
      const safeContext = this.marshalInput(context);

      // Inject context as frozen object
      await jail.set('__context__', new ivmModule.ExternalCopy(safeContext).copyInto());

      // Wrap code to prevent access to dangerous globals
      const wrappedCode = this.wrapCode(code);

      // Compile the script
      const script = await isolate.compileScript(wrappedCode);

      // Execute with timeout
      const result = await script.run(contextObj, {
        timeout: config.timeoutMs,
        copy: true,
      });

      const executionTimeMs = Date.now() - startTime;

      // Marshal output safely
      const safeOutput = this.marshalOutput(result);

      const executionResult: SandboxExecutionResult = {
        success: true,
        output: safeOutput,
        executionTimeMs,
        securityViolations: violations,
      };

      if (config.enableSecurityLogging) {
        this.logSecurityEvent({
          timestamp: new Date(),
          eventType: 'sandbox_execution',
          userId: config.userId,
          workflowId: config.workflowId,
          nodeId: config.nodeId,
          code: this.sanitizeCodeForLogging(code),
          result: 'success',
          violations,
          executionTimeMs,
        });
      }

      return executionResult;
    } catch (error: any) {
      const executionTimeMs = Date.now() - startTime;
      let errorMessage = error.message || 'Unknown execution error';
      let sanitizedStack: string | undefined;

      // Handle specific error types
      if (errorMessage.includes('Script execution timed out')) {
        violations.push({
          type: 'timeout_exceeded',
          description: `Execution exceeded ${config.timeoutMs}ms timeout`,
          severity: 'high',
          timestamp: new Date(),
        });
        errorMessage = `Execution timeout: exceeded ${config.timeoutMs}ms limit`;
      } else if (errorMessage.includes('Isolate was disposed')) {
        violations.push({
          type: 'memory_exceeded',
          description: `Memory limit of ${config.memoryLimitMb}MB exceeded`,
          severity: 'high',
          timestamp: new Date(),
        });
        errorMessage = `Memory limit exceeded: ${config.memoryLimitMb}MB`;
      }

      // Sanitize stack trace
      if (error.stack) {
        sanitizedStack = this.sanitizeStackTrace(error.stack);
      }

      const executionResult: SandboxExecutionResult = {
        success: false,
        output: null,
        executionTimeMs,
        securityViolations: violations,
        error: errorMessage,
        sanitizedStack,
      };

      if (config.enableSecurityLogging) {
        this.logSecurityEvent({
          timestamp: new Date(),
          eventType: 'sandbox_execution',
          userId: config.userId,
          workflowId: config.workflowId,
          nodeId: config.nodeId,
          code: this.sanitizeCodeForLogging(code),
          result: 'failed',
          violations,
          executionTimeMs,
          metadata: { error: errorMessage },
        });
      }

      return executionResult;
    } finally {
      // Always dispose isolate to free resources
      if (isolate) {
        isolate.dispose();
      }
    }
  }

  /**
   * Set up safe globals in the sandbox context
   */
  private async setupSafeGlobals(
    jail: any, // ivm.Reference - using any to avoid type issues with optional module
    context: any, // ivm.Context
    ivmModule: typeof import('isolated-vm')
  ): Promise<void> {
    // JSON utilities
    await jail.set('JSON', new ivmModule.Reference({
      parse: (str: string) => JSON.parse(str),
      stringify: (obj: any, replacer?: any, space?: number) => JSON.stringify(obj, replacer, space),
    }));

    // Math object (read-only copy)
    await jail.set('Math', new ivmModule.ExternalCopy(Math).copyInto());

    // Safe console (limited to string output)
    const logs: string[] = [];
    await jail.set('console', new ivmModule.Reference({
      log: (...args: any[]) => {
        logs.push(args.map(a => String(a)).join(' '));
      },
      warn: (...args: any[]) => {
        logs.push('[WARN] ' + args.map(a => String(a)).join(' '));
      },
      error: (...args: any[]) => {
        logs.push('[ERROR] ' + args.map(a => String(a)).join(' '));
      },
    }));

    // Safe utility functions
    await jail.set('parseInt', new ivmModule.Reference(parseInt));
    await jail.set('parseFloat', new ivmModule.Reference(parseFloat));
    await jail.set('isNaN', new ivmModule.Reference(isNaN));
    await jail.set('isFinite', new ivmModule.Reference(isFinite));

    // URI encoding/decoding
    await jail.set('encodeURIComponent', new ivmModule.Reference(encodeURIComponent));
    await jail.set('decodeURIComponent', new ivmModule.Reference(decodeURIComponent));
    await jail.set('encodeURI', new ivmModule.Reference(encodeURI));
    await jail.set('decodeURI', new ivmModule.Reference(decodeURI));
  }

  /**
   * Wrap user code to prevent global access
   */
  private wrapCode(code: string): string {
    // Use strict mode and wrap in immediately-invoked function
    return `
      'use strict';
      (function() {
        // Shadow dangerous globals with undefined
        const process = undefined;
        const require = undefined;
        const module = undefined;
        const exports = undefined;
        const global = undefined;
        const globalThis = undefined;
        const Buffer = undefined;
        const __dirname = undefined;
        const __filename = undefined;
        const setTimeout = undefined;
        const setInterval = undefined;
        const setImmediate = undefined;
        const clearTimeout = undefined;
        const clearInterval = undefined;
        const clearImmediate = undefined;
        const eval = undefined;
        const Function = undefined;

        // Destructure context for easy access
        const { input, state, variables } = __context__;

        // Execute user code
        return (${code});
      })();
    `;
  }

  /**
   * Safely marshal input data for the sandbox
   */
  private marshalInput(data: any): any {
    try {
      // Deep clone to prevent prototype pollution
      const serialized = JSON.stringify(data, (key, value) => {
        // Skip functions and symbols
        if (typeof value === 'function' || typeof value === 'symbol') {
          return undefined;
        }
        // Skip prototype-related keys
        if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
          return undefined;
        }
        return value;
      });
      return JSON.parse(serialized);
    } catch {
      return {};
    }
  }

  /**
   * Safely marshal output data from the sandbox
   */
  private marshalOutput(data: any): any {
    if (data === undefined || data === null) {
      return data;
    }

    try {
      // Serialize and deserialize to strip functions and circular refs
      return JSON.parse(JSON.stringify(data));
    } catch {
      // If serialization fails, return string representation
      return String(data);
    }
  }

  /**
   * Sanitize stack trace for safe logging
   */
  private sanitizeStackTrace(stack: string): string {
    // Remove absolute file paths and sensitive information
    return stack
      .split('\n')
      .slice(0, 5) // Limit stack depth
      .map(line => line.replace(/\([^)]*\)/g, '(<sanitized>)'))
      .join('\n');
  }

  /**
   * Sanitize code for logging (truncate and remove sensitive data)
   */
  private sanitizeCodeForLogging(code: string): string {
    // Truncate long code
    const maxLength = 500;
    let sanitized = code.length > maxLength
      ? code.substring(0, maxLength) + '...[truncated]'
      : code;

    // Remove potential sensitive patterns (API keys, passwords, etc.)
    sanitized = sanitized
      .replace(/(['"])[a-zA-Z0-9_-]{20,}\1/g, '"[REDACTED]"')
      .replace(/(password|secret|key|token|auth)\s*[:=]\s*['"][^'"]+['"]/gi, '$1: "[REDACTED]"');

    return sanitized;
  }

  /**
   * Log security event for audit
   */
  private logSecurityEvent(entry: SecurityAuditLogEntry): void {
    this.auditLog.push(entry);

    // Keep only last 1000 entries in memory
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const logLevel = entry.result === 'blocked' ? 'warn' : 'info';
      console[logLevel](
        `[SANDBOX_SECURITY] ${entry.eventType}:`,
        {
          result: entry.result,
          violations: entry.violations.length,
          executionTimeMs: entry.executionTimeMs,
          workflowId: entry.workflowId,
          nodeId: entry.nodeId,
        }
      );
    }
  }

  /**
   * Get recent audit log entries
   */
  public getAuditLog(limit: number = 100): SecurityAuditLogEntry[] {
    return this.auditLog.slice(-limit);
  }

  /**
   * Clear audit log
   */
  public clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Get security statistics
   */
  public getSecurityStats(): {
    totalExecutions: number;
    blockedExecutions: number;
    failedExecutions: number;
    totalViolations: number;
    violationsByType: Record<string, number>;
  } {
    const stats = {
      totalExecutions: this.auditLog.length,
      blockedExecutions: 0,
      failedExecutions: 0,
      totalViolations: 0,
      violationsByType: {} as Record<string, number>,
    };

    for (const entry of this.auditLog) {
      if (entry.result === 'blocked') stats.blockedExecutions++;
      if (entry.result === 'failed') stats.failedExecutions++;

      for (const violation of entry.violations) {
        stats.totalViolations++;
        stats.violationsByType[violation.type] =
          (stats.violationsByType[violation.type] || 0) + 1;
      }
    }

    return stats;
  }
}

// Export singleton instance
export const secureSandbox = SecureSandboxService.getInstance();

// Export for testing
export default SecureSandboxService;
