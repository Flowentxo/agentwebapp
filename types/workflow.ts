/**
 * WORKFLOW TYPES
 *
 * Type definitions for workflow configuration, including retry policies
 * and error handling strategies for the Flowent Pipeline Studio.
 *
 * Part of Phase 7: Resilience & Reliability
 */

// ============================================================================
// RETRY POLICY
// ============================================================================

/**
 * Retry policy configuration for a node
 */
export interface RetryPolicy {
  /** Maximum number of retry attempts (1 = no retries, 5 = max) */
  maxAttempts: number;
  /** Base delay in milliseconds before first retry */
  backoffMs: number;
  /** Whether exponential backoff is enabled (2^attempt multiplier) */
  exponentialBackoff?: boolean;
}

/**
 * Default retry policy (no retries)
 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 1,
  backoffMs: 1000,
  exponentialBackoff: true,
};

// ============================================================================
// ERROR HANDLING STRATEGY
// ============================================================================

/**
 * Action to take when a node fails after all retries are exhausted
 */
export type OnErrorAction = 'stop' | 'continue';

/**
 * Default error handling action
 */
export const DEFAULT_ON_ERROR: OnErrorAction = 'stop';

// ============================================================================
// NODE SETTINGS
// ============================================================================

/**
 * Node-level settings for execution behavior
 * These are persisted in the node.data.settings field
 */
export interface NodeSettings {
  /** Retry configuration */
  retryPolicy: RetryPolicy;
  /** Action when all retries fail */
  onError: OnErrorAction;
  /** Timeout in milliseconds (optional, overrides default) */
  timeoutMs?: number;
  /** Whether the node is critical (prevents workflow from continuing on failure even with 'continue' policy) */
  isCritical?: boolean;
}

/**
 * Default node settings
 */
export const DEFAULT_NODE_SETTINGS: NodeSettings = {
  retryPolicy: DEFAULT_RETRY_POLICY,
  onError: DEFAULT_ON_ERROR,
};

/**
 * Get node settings with defaults applied
 */
export function getNodeSettings(nodeData: Record<string, any>): NodeSettings {
  const settings = nodeData?.settings || {};

  return {
    retryPolicy: {
      maxAttempts: settings?.retryPolicy?.maxAttempts ?? DEFAULT_RETRY_POLICY.maxAttempts,
      backoffMs: settings?.retryPolicy?.backoffMs ?? DEFAULT_RETRY_POLICY.backoffMs,
      exponentialBackoff: settings?.retryPolicy?.exponentialBackoff ?? DEFAULT_RETRY_POLICY.exponentialBackoff,
    },
    onError: settings?.onError ?? DEFAULT_ON_ERROR,
    timeoutMs: settings?.timeoutMs,
    isCritical: settings?.isCritical,
  };
}

// ============================================================================
// NODE DATA EXTENSION
// ============================================================================

/**
 * Extended node data interface with settings
 * This extends the base PipelineNodeData to include resilience settings
 */
export interface NodeDataWithSettings {
  label: string;
  type: 'trigger' | 'action' | 'agent' | 'condition' | 'output';
  icon?: string;
  color?: string;
  description?: string;
  config?: Record<string, unknown>;
  /** Node-level execution settings */
  settings?: Partial<NodeSettings>;
  [key: string]: unknown;
}

// ============================================================================
// RETRY STATE (for tracking during execution)
// ============================================================================

/**
 * State tracked during retry attempts
 */
export interface RetryState {
  /** Current attempt number (1-indexed) */
  currentAttempt: number;
  /** Maximum attempts allowed */
  maxAttempts: number;
  /** Delay before next retry (calculated with backoff) */
  nextRetryDelayMs: number;
  /** Timestamp when next retry will occur */
  nextRetryAt?: string;
  /** List of errors from previous attempts */
  previousErrors: string[];
}

/**
 * Indicates a node completed with warnings (continued after error)
 */
export interface ContinuedOnError {
  /** Whether this node continued despite an error */
  continuedOnError: true;
  /** The error that was ignored */
  originalError: string;
  /** Number of retry attempts made */
  retryAttempts: number;
}

// ============================================================================
// SOCKET EVENT TYPES FOR RETRY
// ============================================================================

/**
 * Socket event payload for node retry
 */
export interface SocketNodeRetryingEvent {
  type: 'node-retrying';
  executionId: string;
  workflowId: string;
  nodeId: string;
  nodeName: string;
  currentAttempt: number;
  maxAttempts: number;
  nextRetryAt: string;
  delayMs: number;
  lastError: string;
  timestamp: string;
}

/**
 * Socket event payload for node continued on error
 */
export interface SocketNodeContinuedEvent {
  type: 'node-continued';
  executionId: string;
  workflowId: string;
  nodeId: string;
  nodeName: string;
  originalError: string;
  retryAttempts: number;
  timestamp: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate the delay for a specific retry attempt using exponential backoff
 */
export function calculateBackoffDelay(
  baseDelayMs: number,
  attempt: number,
  useExponential: boolean = true
): number {
  if (!useExponential) {
    return baseDelayMs;
  }
  // Exponential backoff: delay * 2^(attempt-1)
  // attempt 1: delay * 1
  // attempt 2: delay * 2
  // attempt 3: delay * 4
  return baseDelayMs * Math.pow(2, attempt - 1);
}

/**
 * Check if an error should trigger a retry based on error type
 */
export function isRetryableError(error: Error | unknown): boolean {
  // Import these dynamically to avoid circular deps
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  // Network/transient errors that are typically retryable
  const retryablePatterns = [
    'timeout',
    'timed out',
    'econnreset',
    'econnrefused',
    'network',
    'socket hang up',
    'rate limit',
    '429',
    '503',
    '502',
    '504',
    'temporarily unavailable',
    'service unavailable',
    'gateway',
    'internal server error',
    '500',
  ];

  return retryablePatterns.some(pattern => errorMessage.includes(pattern));
}
