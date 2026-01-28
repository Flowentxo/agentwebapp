/**
 * Security Module
 *
 * Centralized security utilities for the Flowent Pipeline System.
 *
 * Components:
 * - SecureSandboxService: Isolated JavaScript execution using isolated-vm
 * - SafePathResolver: Prototype pollution prevention for variable resolution
 * - Security Types: Type definitions and constants for security features
 */

// Core security service
export {
  SecureSandboxService,
  secureSandbox,
} from './SecureSandboxService';

// Safe path resolution
export {
  SafePathResolver,
  safeGetValueByPath,
  safeSetValueByPath,
  isForbiddenSegment,
  validatePath,
  createImmutableCopy,
  sanitizeObject,
} from './SafePathResolver';
export type { SafePathResult } from './SafePathResolver';

// Security types and constants
export {
  DEFAULT_SANDBOX_CONFIG,
  DANGEROUS_PATTERNS,
  FORBIDDEN_PATH_SEGMENTS,
} from './types';

export type {
  SandboxConfig,
  SandboxExecutionResult,
  SecurityViolation,
  SecurityViolationType,
  SecurityAuditLogEntry,
} from './types';
