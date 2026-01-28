/**
 * Security Types for Sandbox Execution
 *
 * Type definitions for secure code execution in workflow pipelines.
 */

/**
 * Result of sandbox code execution
 */
export interface SandboxExecutionResult {
  /** Whether the execution completed successfully */
  success: boolean;

  /** The output/return value from the executed code */
  output: any;

  /** Execution time in milliseconds */
  executionTimeMs: number;

  /** Any security violations detected during execution */
  securityViolations: SecurityViolation[];

  /** Error message if execution failed */
  error?: string;

  /** Stack trace for debugging (sanitized) */
  sanitizedStack?: string;
}

/**
 * Security violation detected during execution
 */
export interface SecurityViolation {
  /** Type of violation */
  type: SecurityViolationType;

  /** Human-readable description */
  description: string;

  /** The problematic code or pattern detected */
  pattern?: string;

  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** Timestamp when violation was detected */
  timestamp: Date;
}

/**
 * Types of security violations
 */
export type SecurityViolationType =
  | 'prototype_pollution'
  | 'global_access'
  | 'process_access'
  | 'require_access'
  | 'fs_access'
  | 'eval_usage'
  | 'function_constructor'
  | 'timeout_exceeded'
  | 'memory_exceeded'
  | 'dangerous_pattern'
  | 'injection_attempt';

/**
 * Configuration for sandbox execution
 */
export interface SandboxConfig {
  /** Maximum execution time in milliseconds (default: 1000) */
  timeoutMs: number;

  /** Maximum memory in MB (default: 128) */
  memoryLimitMb: number;

  /** Whether to log security events */
  enableSecurityLogging: boolean;

  /** Allowed global variables in sandbox */
  allowedGlobals: string[];

  /** User ID for audit logging */
  userId?: string;

  /** Workflow ID for audit logging */
  workflowId?: string;

  /** Node ID for audit logging */
  nodeId?: string;
}

/**
 * Default sandbox configuration
 */
export const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  timeoutMs: 1000,
  memoryLimitMb: 128,
  enableSecurityLogging: true,
  allowedGlobals: [
    'JSON',
    'Math',
    'Date',
    'String',
    'Number',
    'Boolean',
    'Array',
    'Object',
    'parseInt',
    'parseFloat',
    'isNaN',
    'isFinite',
    'encodeURIComponent',
    'decodeURIComponent',
    'encodeURI',
    'decodeURI',
  ],
};

/**
 * Dangerous patterns to detect in code before execution
 */
export const DANGEROUS_PATTERNS: Array<{
  pattern: RegExp;
  type: SecurityViolationType;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}> = [
  {
    pattern: /\bprocess\b/gi,
    type: 'process_access',
    description: 'Attempted access to process object',
    severity: 'critical',
  },
  {
    pattern: /\brequire\s*\(/gi,
    type: 'require_access',
    description: 'Attempted use of require()',
    severity: 'critical',
  },
  {
    pattern: /\bimport\s*\(/gi,
    type: 'require_access',
    description: 'Attempted use of dynamic import()',
    severity: 'critical',
  },
  {
    pattern: /\b__dirname\b|\b__filename\b/gi,
    type: 'fs_access',
    description: 'Attempted access to file system paths',
    severity: 'high',
  },
  {
    pattern: /\beval\s*\(/gi,
    type: 'eval_usage',
    description: 'Attempted use of eval()',
    severity: 'critical',
  },
  {
    pattern: /\bFunction\s*\(/gi,
    type: 'function_constructor',
    description: 'Attempted use of Function constructor',
    severity: 'critical',
  },
  {
    pattern: /constructor\s*\.\s*constructor/gi,
    type: 'prototype_pollution',
    description: 'Prototype pollution attempt via constructor chain',
    severity: 'critical',
  },
  {
    pattern: /__proto__/gi,
    type: 'prototype_pollution',
    description: 'Attempted access to __proto__',
    severity: 'critical',
  },
  {
    pattern: /\bprototype\b/gi,
    type: 'prototype_pollution',
    description: 'Attempted access to prototype',
    severity: 'high',
  },
  {
    pattern: /\bglobal\b|\bglobalThis\b/gi,
    type: 'global_access',
    description: 'Attempted access to global object',
    severity: 'critical',
  },
  {
    pattern: /\bwindow\b/gi,
    type: 'global_access',
    description: 'Attempted access to window object',
    severity: 'high',
  },
  {
    pattern: /\bchild_process\b/gi,
    type: 'process_access',
    description: 'Attempted access to child_process',
    severity: 'critical',
  },
  {
    pattern: /\bexec\s*\(|\bspawn\s*\(/gi,
    type: 'process_access',
    description: 'Attempted shell command execution',
    severity: 'critical',
  },
  {
    pattern: /\bfs\b\s*\.\s*(read|write|unlink|rmdir|mkdir)/gi,
    type: 'fs_access',
    description: 'Attempted file system operation',
    severity: 'critical',
  },
  {
    pattern: /\bBuffer\b/gi,
    type: 'global_access',
    description: 'Attempted access to Buffer',
    severity: 'medium',
  },
  {
    pattern: /\bsetTimeout\b|\bsetInterval\b|\bsetImmediate\b/gi,
    type: 'dangerous_pattern',
    description: 'Timer functions detected (potential async escape)',
    severity: 'medium',
  },
];

/**
 * Safe variable path segments that cannot be used for prototype pollution
 */
export const FORBIDDEN_PATH_SEGMENTS = [
  '__proto__',
  'prototype',
  'constructor',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'toString',
  'valueOf',
];

/**
 * Security audit log entry
 */
export interface SecurityAuditLogEntry {
  timestamp: Date;
  eventType: 'sandbox_execution' | 'security_violation' | 'code_analysis';
  userId?: string;
  workflowId?: string;
  nodeId?: string;
  code?: string;
  result: 'success' | 'blocked' | 'failed';
  violations: SecurityViolation[];
  executionTimeMs?: number;
  metadata?: Record<string, any>;
}
