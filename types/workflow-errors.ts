/**
 * WORKFLOW ERROR TYPES
 *
 * Comprehensive error hierarchy for the Flowent Pipeline Studio.
 * Provides structured error codes, categorization, and recovery hints.
 */

// ============================================================================
// ERROR CODES
// ============================================================================

export const WorkflowErrorCodes = {
  // Execution Errors (1xxx)
  EXECUTION_FAILED: 'WF_1001',
  NODE_EXECUTION_FAILED: 'WF_1002',
  TIMEOUT: 'WF_1003',
  CANCELLED: 'WF_1004',

  // Validation Errors (2xxx)
  INVALID_WORKFLOW: 'WF_2001',
  MISSING_ENTRY_NODE: 'WF_2002',
  CIRCULAR_DEPENDENCY: 'WF_2003',
  INVALID_NODE_CONFIG: 'WF_2004',

  // Variable Resolution Errors (3xxx)
  VARIABLE_NOT_FOUND: 'WF_3001',
  VARIABLE_TYPE_MISMATCH: 'WF_3002',
  INVALID_VARIABLE_PATH: 'WF_3003',
  NODE_OUTPUT_NOT_AVAILABLE: 'WF_3004',

  // Budget Errors (4xxx)
  BUDGET_EXCEEDED: 'WF_4001',
  BUDGET_CHECK_FAILED: 'WF_4002',
  COST_ESTIMATION_FAILED: 'WF_4003',

  // External Service Errors (5xxx)
  API_ERROR: 'WF_5001',
  DATABASE_ERROR: 'WF_5002',
  WEBHOOK_ERROR: 'WF_5003',
  LLM_ERROR: 'WF_5004',
  HUBSPOT_ERROR: 'WF_5005',

  // Permission Errors (6xxx)
  UNAUTHORIZED: 'WF_6001',
  FORBIDDEN: 'WF_6002',
  RATE_LIMITED: 'WF_6003',
} as const;

export type WorkflowErrorCode = typeof WorkflowErrorCodes[keyof typeof WorkflowErrorCodes];

// ============================================================================
// BASE ERROR CLASS
// ============================================================================

export interface WorkflowErrorContext {
  workflowId?: string;
  executionId?: string;
  nodeId?: string;
  nodeName?: string;
  nodeType?: string;
  userId?: string;
  timestamp?: number;
  [key: string]: any;
}

/**
 * Base error class for all workflow-related errors
 */
export class WorkflowError extends Error {
  public readonly code: WorkflowErrorCode;
  public readonly context: WorkflowErrorContext;
  public readonly recoverable: boolean;
  public readonly retryable: boolean;
  public readonly userMessage: string;
  public readonly timestamp: number;
  public readonly cause?: Error;

  constructor(
    message: string,
    code: WorkflowErrorCode,
    options: {
      context?: WorkflowErrorContext;
      recoverable?: boolean;
      retryable?: boolean;
      userMessage?: string;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'WorkflowError';
    this.code = code;
    this.context = options.context || {};
    this.recoverable = options.recoverable ?? false;
    this.retryable = options.retryable ?? false;
    this.userMessage = options.userMessage || message;
    this.timestamp = Date.now();
    this.cause = options.cause;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WorkflowError);
    }
  }

  /**
   * Create a JSON-serializable representation
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      recoverable: this.recoverable,
      retryable: this.retryable,
      userMessage: this.userMessage,
      timestamp: this.timestamp,
      stack: this.stack,
      cause: this.cause?.message,
    };
  }
}

// ============================================================================
// SPECIFIC ERROR CLASSES
// ============================================================================

/**
 * Node execution error
 */
export class NodeExecutionError extends WorkflowError {
  constructor(
    nodeId: string,
    nodeName: string,
    nodeType: string,
    originalError: Error | string,
    context: WorkflowErrorContext = {}
  ) {
    const errorMessage = typeof originalError === 'string'
      ? originalError
      : originalError.message;

    super(
      `Node "${nodeName}" (${nodeType}) execution failed: ${errorMessage}`,
      WorkflowErrorCodes.NODE_EXECUTION_FAILED,
      {
        context: { ...context, nodeId, nodeName, nodeType },
        recoverable: false,
        retryable: true,
        userMessage: `The "${nodeName}" step failed. Please check the node configuration.`,
        cause: typeof originalError === 'object' ? originalError : undefined,
      }
    );
    this.name = 'NodeExecutionError';
  }
}

/**
 * Variable resolution error
 */
export class VariableResolutionError extends WorkflowError {
  public readonly variablePath: string;
  public readonly missingPaths: string[];

  constructor(
    variablePath: string,
    nodeId: string,
    context: WorkflowErrorContext = {},
    missingPaths: string[] = []
  ) {
    super(
      `Variable "${variablePath}" could not be resolved for node "${nodeId}"`,
      WorkflowErrorCodes.VARIABLE_NOT_FOUND,
      {
        context: { ...context, nodeId, variablePath },
        recoverable: false,
        retryable: false,
        userMessage: `The variable reference "{{${variablePath}}}" could not be resolved. Make sure the source node has been executed.`,
      }
    );
    this.name = 'VariableResolutionError';
    this.variablePath = variablePath;
    this.missingPaths = missingPaths.length > 0 ? missingPaths : [variablePath];
  }
}

/**
 * Budget exceeded error
 */
export class BudgetExceededError extends WorkflowError {
  public readonly estimatedCost: number;
  public readonly remainingBudget: number;

  constructor(
    nodeId: string,
    estimatedCost: number,
    remainingBudget: number,
    context: WorkflowErrorContext = {}
  ) {
    super(
      `Budget exceeded: Node "${nodeId}" requires ~$${estimatedCost.toFixed(4)} but only $${remainingBudget.toFixed(4)} remaining`,
      WorkflowErrorCodes.BUDGET_EXCEEDED,
      {
        context: { ...context, nodeId, estimatedCost, remainingBudget },
        recoverable: true,
        retryable: false,
        userMessage: 'Your budget limit has been reached. Please increase your budget or wait for the next billing cycle.',
      }
    );
    this.name = 'BudgetExceededError';
    this.estimatedCost = estimatedCost;
    this.remainingBudget = remainingBudget;
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends WorkflowError {
  public readonly timeoutMs: number;

  constructor(
    nodeId: string,
    nodeName: string,
    timeoutMs: number,
    context: WorkflowErrorContext = {}
  ) {
    super(
      `Node "${nodeName}" timed out after ${timeoutMs}ms`,
      WorkflowErrorCodes.TIMEOUT,
      {
        context: { ...context, nodeId, nodeName, timeoutMs },
        recoverable: false,
        retryable: true,
        userMessage: `The "${nodeName}" step took too long to respond. Please try again.`,
      }
    );
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * External API error
 */
export class ExternalApiError extends WorkflowError {
  public readonly statusCode?: number;
  public readonly service: string;

  constructor(
    service: string,
    message: string,
    statusCode?: number,
    context: WorkflowErrorContext = {}
  ) {
    const code = service.toLowerCase().includes('hubspot')
      ? WorkflowErrorCodes.HUBSPOT_ERROR
      : service.toLowerCase().includes('database')
      ? WorkflowErrorCodes.DATABASE_ERROR
      : service.toLowerCase().includes('webhook')
      ? WorkflowErrorCodes.WEBHOOK_ERROR
      : service.toLowerCase().includes('llm') || service.toLowerCase().includes('openai')
      ? WorkflowErrorCodes.LLM_ERROR
      : WorkflowErrorCodes.API_ERROR;

    super(
      `${service} error: ${message}`,
      code,
      {
        context: { ...context, service, statusCode },
        recoverable: statusCode ? statusCode >= 500 : false,
        retryable: statusCode ? statusCode >= 500 || statusCode === 429 : true,
        userMessage: `There was an issue communicating with ${service}. Please try again later.`,
      }
    );
    this.name = 'ExternalApiError';
    this.statusCode = statusCode;
    this.service = service;
  }
}

/**
 * Validation error
 */
export class ValidationError extends WorkflowError {
  public readonly validationErrors: string[];

  constructor(
    message: string,
    validationErrors: string[] = [],
    context: WorkflowErrorContext = {}
  ) {
    super(
      message,
      WorkflowErrorCodes.INVALID_NODE_CONFIG,
      {
        context: { ...context, validationErrors },
        recoverable: true,
        retryable: false,
        userMessage: 'Please check the workflow configuration and fix any validation errors.',
      }
    );
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
  }
}

// ============================================================================
// ERROR UTILITIES
// ============================================================================

/**
 * Check if an error is a workflow error
 */
export function isWorkflowError(error: unknown): error is WorkflowError {
  return error instanceof WorkflowError;
}

/**
 * Wrap any error in a WorkflowError
 */
export function wrapError(
  error: unknown,
  context: WorkflowErrorContext = {}
): WorkflowError {
  if (isWorkflowError(error)) {
    // Merge additional context
    return new WorkflowError(error.message, error.code, {
      context: { ...error.context, ...context },
      recoverable: error.recoverable,
      retryable: error.retryable,
      userMessage: error.userMessage,
      cause: error.cause,
    });
  }

  const message = error instanceof Error ? error.message : String(error);

  return new WorkflowError(
    message,
    WorkflowErrorCodes.EXECUTION_FAILED,
    {
      context,
      recoverable: false,
      retryable: true,
      userMessage: 'An unexpected error occurred during workflow execution.',
      cause: error instanceof Error ? error : undefined,
    }
  );
}

/**
 * Create a user-friendly error summary
 */
export function getErrorSummary(error: WorkflowError): string {
  const parts = [error.userMessage];

  if (error.recoverable) {
    parts.push('This error may be recoverable by adjusting the configuration.');
  }

  if (error.retryable) {
    parts.push('You can try running the workflow again.');
  }

  return parts.join(' ');
}
