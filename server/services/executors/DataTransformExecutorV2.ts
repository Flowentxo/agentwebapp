/**
 * DataTransformExecutorV2 - Hardened Version
 *
 * Secure executor for custom JavaScript transformations in workflows.
 * Uses isolated-vm sandbox to prevent RCE and injection attacks.
 *
 * Security features:
 * - Isolated V8 context (no access to Node.js globals)
 * - Pre-execution code analysis for dangerous patterns
 * - 1000ms execution timeout
 * - 128MB memory limit
 * - Safe input/output marshalling
 * - Security audit logging
 *
 * @security CRITICAL - This executor runs user-provided code
 */

import { SecureSandboxService } from '../security/SecureSandboxService';
import {
  SandboxConfig,
  SandboxExecutionResult,
  SecurityViolation,
} from '../security/types';

/**
 * Input interface for node executor
 */
export interface NodeExecutorInput {
  node: {
    id: string;
    type: string;
    data: {
      transformCode?: string;
      expression?: string;
      label?: string;
      [key: string]: any;
    };
  };
  inputs: Record<string, any>;
  context: {
    state: {
      variables: Record<string, any>;
      nodeOutputs: Record<string, any>;
      [key: string]: any;
    };
    workflowId: string;
    executionId: string;
    userId: string;
    [key: string]: any;
  };
}

/**
 * Output interface for node executor
 */
export interface NodeExecutorOutput {
  data: any;
  success: boolean;
  error?: string;
  metadata?: {
    executionTimeMs?: number;
    securityViolations?: SecurityViolation[];
    sandboxResult?: Partial<SandboxExecutionResult>;
  };
}

/**
 * Interface for node executors
 */
export interface INodeExecutor {
  execute(input: NodeExecutorInput): Promise<NodeExecutorOutput>;
}

/**
 * Hardened DataTransformExecutor using isolated-vm sandbox
 */
export class DataTransformExecutorV2 implements INodeExecutor {
  private sandbox: SecureSandboxService;
  private defaultConfig: Partial<SandboxConfig>;

  constructor(config?: Partial<SandboxConfig>) {
    this.sandbox = SecureSandboxService.getInstance();
    this.defaultConfig = {
      timeoutMs: 1000,
      memoryLimitMb: 128,
      enableSecurityLogging: true,
      ...config,
    };
  }

  /**
   * Execute transformation code in secure sandbox
   */
  async execute(input: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const { transformCode, expression, label } = input.node.data;
    const code = transformCode || expression;

    // Validate code exists
    if (!code || typeof code !== 'string' || code.trim() === '') {
      return {
        data: input.inputs,
        success: true,
        metadata: {
          executionTimeMs: 0,
        },
      };
    }

    // Prepare context for sandbox
    const sandboxContext = {
      input: this.sanitizeForSandbox(input.inputs),
      state: this.sanitizeForSandbox(input.context.state),
      variables: this.sanitizeForSandbox(input.context.state.variables || {}),
    };

    // Execute in sandbox with context
    const result = await this.sandbox.execute(code, sandboxContext, {
      ...this.defaultConfig,
      userId: input.context.userId,
      workflowId: input.context.workflowId,
      nodeId: input.node.id,
    });

    // Handle execution result
    if (!result.success) {
      console.error(
        `[DataTransformExecutorV2] Execution failed for node ${input.node.id}:`,
        {
          nodeLabel: label || input.node.id,
          error: result.error,
          violations: result.securityViolations.length,
          executionTimeMs: result.executionTimeMs,
        }
      );

      return {
        data: null,
        success: false,
        error: this.formatSecurityError(result),
        metadata: {
          executionTimeMs: result.executionTimeMs,
          securityViolations: result.securityViolations,
          sandboxResult: {
            success: result.success,
            error: result.error,
            executionTimeMs: result.executionTimeMs,
          },
        },
      };
    }

    // Log warnings for non-critical violations
    if (result.securityViolations.length > 0) {
      console.warn(
        `[DataTransformExecutorV2] Security warnings for node ${input.node.id}:`,
        {
          nodeLabel: label || input.node.id,
          violations: result.securityViolations.map(v => ({
            type: v.type,
            description: v.description,
            severity: v.severity,
          })),
        }
      );
    }

    return {
      data: result.output,
      success: true,
      metadata: {
        executionTimeMs: result.executionTimeMs,
        securityViolations: result.securityViolations,
      },
    };
  }

  /**
   * Sanitize data for safe passage into sandbox
   * Removes functions, circular references, and prototype pollution vectors
   */
  private sanitizeForSandbox(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    try {
      // Use JSON serialization to deep clone and strip functions
      return JSON.parse(
        JSON.stringify(data, (key, value) => {
          // Skip dangerous keys
          if (
            key === '__proto__' ||
            key === 'prototype' ||
            key === 'constructor'
          ) {
            return undefined;
          }

          // Skip functions and symbols
          if (typeof value === 'function' || typeof value === 'symbol') {
            return undefined;
          }

          // Skip extremely large values to prevent memory issues
          if (typeof value === 'string' && value.length > 1000000) {
            return '[TRUNCATED: value too large]';
          }

          return value;
        })
      );
    } catch (error) {
      console.warn('[DataTransformExecutorV2] Failed to sanitize data:', error);
      return {};
    }
  }

  /**
   * Format security error for user-friendly display
   */
  private formatSecurityError(result: SandboxExecutionResult): string {
    const criticalViolations = result.securityViolations.filter(
      v => v.severity === 'critical'
    );

    if (criticalViolations.length > 0) {
      const violationTypes = [...new Set(criticalViolations.map(v => v.type))];
      return `Security violation: ${violationTypes.join(', ')}. Code execution blocked for security reasons.`;
    }

    if (result.error?.includes('timeout')) {
      return `Execution timeout: Code took too long to execute (limit: 1000ms)`;
    }

    if (result.error?.includes('memory')) {
      return `Memory limit exceeded: Code used too much memory (limit: 128MB)`;
    }

    return result.error || 'Transform execution failed';
  }

  /**
   * Validate code without executing (for UI feedback)
   */
  validateCode(code: string): {
    valid: boolean;
    violations: SecurityViolation[];
    canExecute: boolean;
  } {
    if (!code || typeof code !== 'string') {
      return { valid: false, violations: [], canExecute: false };
    }

    const violations = this.sandbox.analyzeCode(code);
    const criticalViolations = violations.filter(v => v.severity === 'critical');

    return {
      valid: violations.length === 0,
      violations,
      canExecute: criticalViolations.length === 0,
    };
  }

  /**
   * Get security statistics for monitoring
   */
  getSecurityStats() {
    return this.sandbox.getSecurityStats();
  }

  /**
   * Get recent security audit log
   */
  getAuditLog(limit?: number) {
    return this.sandbox.getAuditLog(limit);
  }
}

// Export singleton instance for use in workflow engine
let executorInstance: DataTransformExecutorV2 | null = null;

export function getDataTransformExecutor(): DataTransformExecutorV2 {
  if (!executorInstance) {
    executorInstance = new DataTransformExecutorV2();
  }
  return executorInstance;
}

export default DataTransformExecutorV2;
