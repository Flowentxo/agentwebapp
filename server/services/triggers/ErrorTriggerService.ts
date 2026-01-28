/**
 * Error Trigger Service
 *
 * Phase 4: Active Polling & Error Triggers
 *
 * Observer pattern service that handles error workflows.
 * When a workflow execution encounters a fatal error, this service
 * checks for configured error handlers and triggers them.
 *
 * Key Features:
 * - Configurable error handling workflows
 * - Error filtering (by node type, severity, patterns)
 * - Error context injection
 * - Audit trail for error handling
 */

import { eq, and, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db';
import {
  errorWorkflows,
  errorExecutionLog,
  ErrorWorkflowRecord,
  ErrorFilterConfig,
  ErrorExecutionContext,
  ErrorTriggerMode,
} from '@/lib/db/schema-static-data';
import { workflows } from '@/lib/db/schema-workflows';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ExecutionError {
  message: string;
  nodeId?: string;
  nodeName?: string;
  nodeType?: string;
  stack?: string;
  code?: string;
  severity?: 'warning' | 'error' | 'fatal';
  timestamp: Date;
}

export interface ErrorTriggerContext {
  /** ID of the workflow that errored */
  workflowId: string;
  /** Name of the workflow */
  workflowName: string;
  /** ID of the failed execution */
  executionId: string;
  /** Mode of the failed execution */
  executionMode: string;
  /** When the execution started */
  executionStartedAt: Date;
  /** When the execution finished */
  executionFinishedAt: Date;
  /** The error details */
  error: ExecutionError;
  /** Last successful output (for debugging) */
  lastSuccessfulOutput?: unknown;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface ErrorHandlerResult {
  /** Whether an error handler was triggered */
  triggered: boolean;
  /** ID of the error workflow config */
  errorWorkflowConfigId?: string;
  /** ID of the error execution */
  errorExecutionId?: string;
  /** Error if handler failed to trigger */
  error?: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class ErrorTriggerService {
  private db = getDb();

  // Callback for triggering workflow executions
  private onTriggerWorkflow?: (
    workflowId: string,
    triggerData: unknown,
    context: {
      mode: 'error';
      parentExecutionId: string;
      errorContext: ErrorExecutionContext;
    }
  ) => Promise<string | null>;

  // --------------------------------------------------------------------------
  // CONFIGURATION
  // --------------------------------------------------------------------------

  /**
   * Set the workflow trigger callback
   */
  setWorkflowTrigger(
    callback: (
      workflowId: string,
      triggerData: unknown,
      context: {
        mode: 'error';
        parentExecutionId: string;
        errorContext: ErrorExecutionContext;
      }
    ) => Promise<string | null>
  ): void {
    this.onTriggerWorkflow = callback;
  }

  /**
   * Configure an error workflow for a source workflow
   */
  async configureErrorWorkflow(params: {
    sourceWorkflowId: string;
    errorWorkflowId: string;
    mode?: ErrorTriggerMode;
    filterConfig?: ErrorFilterConfig;
    errorTriggerNodeId?: string;
  }): Promise<ErrorWorkflowRecord> {
    const {
      sourceWorkflowId,
      errorWorkflowId,
      mode = 'all_errors',
      filterConfig = {},
      errorTriggerNodeId,
    } = params;

    const [record] = await this.db
      .insert(errorWorkflows)
      .values({
        sourceWorkflowId,
        errorWorkflowId,
        mode,
        filterConfig,
        errorTriggerNodeId,
        enabled: true,
      })
      .onConflictDoUpdate({
        target: [errorWorkflows.sourceWorkflowId, errorWorkflows.errorWorkflowId],
        set: {
          mode,
          filterConfig,
          errorTriggerNodeId,
          enabled: true,
          updatedAt: new Date(),
        },
      })
      .returning();

    console.log(`[ErrorTriggerService] Configured error workflow:`, {
      sourceWorkflowId,
      errorWorkflowId,
      mode,
    });

    return record;
  }

  /**
   * Disable an error workflow configuration
   */
  async disableErrorWorkflow(
    sourceWorkflowId: string,
    errorWorkflowId: string
  ): Promise<boolean> {
    const result = await this.db
      .update(errorWorkflows)
      .set({ enabled: false, updatedAt: new Date() })
      .where(
        and(
          eq(errorWorkflows.sourceWorkflowId, sourceWorkflowId),
          eq(errorWorkflows.errorWorkflowId, errorWorkflowId)
        )
      )
      .returning();

    return result.length > 0;
  }

  /**
   * Remove an error workflow configuration
   */
  async removeErrorWorkflow(
    sourceWorkflowId: string,
    errorWorkflowId: string
  ): Promise<boolean> {
    const result = await this.db
      .delete(errorWorkflows)
      .where(
        and(
          eq(errorWorkflows.sourceWorkflowId, sourceWorkflowId),
          eq(errorWorkflows.errorWorkflowId, errorWorkflowId)
        )
      )
      .returning();

    return result.length > 0;
  }

  // --------------------------------------------------------------------------
  // ERROR HANDLING
  // --------------------------------------------------------------------------

  /**
   * Handle an execution error
   * Called by the WorkflowExecutionEngine when an error occurs
   */
  async handleError(context: ErrorTriggerContext): Promise<ErrorHandlerResult[]> {
    const results: ErrorHandlerResult[] = [];

    console.log(`[ErrorTriggerService] Handling error:`, {
      workflowId: context.workflowId,
      executionId: context.executionId,
      errorMessage: context.error.message,
      errorNodeId: context.error.nodeId,
    });

    // Find all enabled error handlers for this workflow
    const handlers = await this.db
      .select()
      .from(errorWorkflows)
      .where(
        and(
          eq(errorWorkflows.sourceWorkflowId, context.workflowId),
          eq(errorWorkflows.enabled, true)
        )
      );

    if (handlers.length === 0) {
      console.log(`[ErrorTriggerService] No error handlers configured for workflow: ${context.workflowId}`);
      return results;
    }

    // Process each handler
    for (const handler of handlers) {
      try {
        const result = await this.processErrorHandler(handler, context);
        results.push(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[ErrorTriggerService] Failed to process error handler:`, {
          handlerId: handler.id,
          error: errorMessage,
        });
        results.push({
          triggered: false,
          errorWorkflowConfigId: handler.id,
          error: errorMessage,
        });
      }
    }

    return results;
  }

  /**
   * Process a single error handler
   */
  private async processErrorHandler(
    handler: ErrorWorkflowRecord,
    context: ErrorTriggerContext
  ): Promise<ErrorHandlerResult> {
    // Check if the error matches the handler's filters
    if (!this.shouldTrigger(handler, context.error)) {
      console.log(`[ErrorTriggerService] Error filtered out by handler config:`, {
        handlerId: handler.id,
        mode: handler.mode,
      });
      return {
        triggered: false,
        errorWorkflowConfigId: handler.id,
      };
    }

    // Create the error execution log entry
    const [logEntry] = await this.db
      .insert(errorExecutionLog)
      .values({
        errorWorkflowConfigId: handler.id,
        sourceExecutionId: context.executionId,
        errorMessage: context.error.message,
        errorNodeId: context.error.nodeId,
        errorNodeType: context.error.nodeType,
        errorStack: context.error.stack,
        executionContext: this.buildErrorContext(context),
        status: 'pending',
        errorOccurredAt: context.error.timestamp,
      })
      .returning();

    // Trigger the error workflow
    if (!this.onTriggerWorkflow) {
      await this.updateLogStatus(logEntry.id, 'failed', 'No workflow trigger configured');
      return {
        triggered: false,
        errorWorkflowConfigId: handler.id,
        error: 'No workflow trigger configured',
      };
    }

    try {
      const errorContext = this.buildErrorContext(context);

      const executionId = await this.onTriggerWorkflow(
        handler.errorWorkflowId,
        {
          $execution: {
            error: errorContext.error,
            workflow: errorContext.workflow,
            execution: errorContext.execution,
          },
        },
        {
          mode: 'error',
          parentExecutionId: context.executionId,
          errorContext,
        }
      );

      if (executionId) {
        await this.updateLogStatus(logEntry.id, 'triggered', undefined, executionId);
        await this.updateHandlerStats(handler.id, executionId);

        console.log(`[ErrorTriggerService] Triggered error workflow:`, {
          handlerId: handler.id,
          errorWorkflowId: handler.errorWorkflowId,
          executionId,
        });

        return {
          triggered: true,
          errorWorkflowConfigId: handler.id,
          errorExecutionId: executionId,
        };
      } else {
        await this.updateLogStatus(logEntry.id, 'failed', 'Workflow trigger returned null');
        return {
          triggered: false,
          errorWorkflowConfigId: handler.id,
          error: 'Workflow trigger returned null',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateLogStatus(logEntry.id, 'failed', errorMessage);
      return {
        triggered: false,
        errorWorkflowConfigId: handler.id,
        error: errorMessage,
      };
    }
  }

  // --------------------------------------------------------------------------
  // FILTERING LOGIC
  // --------------------------------------------------------------------------

  /**
   * Check if an error should trigger the handler
   */
  private shouldTrigger(
    handler: ErrorWorkflowRecord,
    error: ExecutionError
  ): boolean {
    const mode = handler.mode;
    const filterConfig = handler.filterConfig ?? {};

    switch (mode) {
      case 'all_errors':
        return true;

      case 'fatal_only':
        return error.severity === 'fatal';

      case 'node_specific':
        return this.matchesNodeFilter(error, filterConfig);

      case 'custom_filter':
        return this.matchesCustomFilter(error, filterConfig);

      default:
        return true;
    }
  }

  /**
   * Check if error matches node-specific filter
   */
  private matchesNodeFilter(
    error: ExecutionError,
    filterConfig: ErrorFilterConfig
  ): boolean {
    // Match by node type
    if (filterConfig.nodeTypes && filterConfig.nodeTypes.length > 0) {
      if (!error.nodeType || !filterConfig.nodeTypes.includes(error.nodeType)) {
        return false;
      }
    }

    // Match by node ID
    if (filterConfig.nodeIds && filterConfig.nodeIds.length > 0) {
      if (!error.nodeId || !filterConfig.nodeIds.includes(error.nodeId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if error matches custom filter
   */
  private matchesCustomFilter(
    error: ExecutionError,
    filterConfig: ErrorFilterConfig
  ): boolean {
    // Match by message patterns
    if (filterConfig.messagePatterns && filterConfig.messagePatterns.length > 0) {
      const matchesPattern = filterConfig.messagePatterns.some(pattern => {
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(error.message);
        } catch {
          return error.message.includes(pattern);
        }
      });

      if (!matchesPattern) {
        return false;
      }
    }

    // Match by error codes
    if (filterConfig.errorCodes && filterConfig.errorCodes.length > 0) {
      if (!error.code || !filterConfig.errorCodes.includes(error.code)) {
        return false;
      }
    }

    // Match by minimum severity
    if (filterConfig.minSeverity) {
      const severityLevels = { warning: 1, error: 2, fatal: 3 };
      const errorSeverity = severityLevels[error.severity ?? 'error'];
      const minSeverity = severityLevels[filterConfig.minSeverity];

      if (errorSeverity < minSeverity) {
        return false;
      }
    }

    // Custom expression (if implemented)
    if (filterConfig.customExpression) {
      // This could be a more complex expression evaluator
      // For now, we just check if it's a simple key=value match
      try {
        // Simple implementation - could be extended
        return true;
      } catch {
        return false;
      }
    }

    return true;
  }

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  /**
   * Build the error execution context
   */
  private buildErrorContext(context: ErrorTriggerContext): ErrorExecutionContext {
    return {
      workflow: {
        id: context.workflowId,
        name: context.workflowName,
      },
      execution: {
        id: context.executionId,
        mode: context.executionMode,
        startedAt: context.executionStartedAt.toISOString(),
        finishedAt: context.executionFinishedAt.toISOString(),
      },
      error: {
        message: context.error.message,
        nodeId: context.error.nodeId,
        nodeName: context.error.nodeName,
        nodeType: context.error.nodeType,
        stack: context.error.stack,
        code: context.error.code,
      },
      lastSuccessfulOutput: context.lastSuccessfulOutput,
      metadata: context.metadata,
    };
  }

  /**
   * Update log entry status
   */
  private async updateLogStatus(
    logId: string,
    status: 'triggered' | 'completed' | 'failed',
    error?: string,
    executionId?: string
  ): Promise<void> {
    await this.db
      .update(errorExecutionLog)
      .set({
        status,
        errorExecutionId: executionId,
        triggeredAt: status === 'triggered' ? new Date() : undefined,
        completedAt: status === 'completed' ? new Date() : undefined,
      })
      .where(eq(errorExecutionLog.id, logId));
  }

  /**
   * Update handler statistics
   */
  private async updateHandlerStats(
    handlerId: string,
    executionId: string
  ): Promise<void> {
    await this.db
      .update(errorWorkflows)
      .set({
        timesTriggered: sql`times_triggered + 1`,
        lastTriggeredAt: new Date(),
        lastExecutionId: executionId,
        updatedAt: new Date(),
      })
      .where(eq(errorWorkflows.id, handlerId));
  }

  // --------------------------------------------------------------------------
  // QUERY METHODS
  // --------------------------------------------------------------------------

  /**
   * List all error workflow configurations for a workflow
   */
  async listErrorWorkflows(sourceWorkflowId: string): Promise<ErrorWorkflowRecord[]> {
    return this.db
      .select()
      .from(errorWorkflows)
      .where(eq(errorWorkflows.sourceWorkflowId, sourceWorkflowId));
  }

  /**
   * Get error execution logs for an execution
   */
  async getErrorLogs(sourceExecutionId: string): Promise<typeof errorExecutionLog.$inferSelect[]> {
    return this.db
      .select()
      .from(errorExecutionLog)
      .where(eq(errorExecutionLog.sourceExecutionId, sourceExecutionId));
  }

  /**
   * Get error handler stats
   */
  async getHandlerStats(handlerId: string): Promise<{
    timesTriggered: number;
    lastTriggeredAt: Date | null;
    lastExecutionId: string | null;
  } | null> {
    const [handler] = await this.db
      .select({
        timesTriggered: errorWorkflows.timesTriggered,
        lastTriggeredAt: errorWorkflows.lastTriggeredAt,
        lastExecutionId: errorWorkflows.lastExecutionId,
      })
      .from(errorWorkflows)
      .where(eq(errorWorkflows.id, handlerId))
      .limit(1);

    return handler ?? null;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let errorTriggerServiceInstance: ErrorTriggerService | null = null;

export function getErrorTriggerService(): ErrorTriggerService {
  if (!errorTriggerServiceInstance) {
    errorTriggerServiceInstance = new ErrorTriggerService();
  }
  return errorTriggerServiceInstance;
}

export default ErrorTriggerService;
