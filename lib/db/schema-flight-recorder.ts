/**
 * FLIGHT RECORDER SCHEMA
 *
 * Phase 13: Enterprise Flight Recorder for Time-Travel Debugging
 *
 * Captures granular state of every workflow execution:
 * - workflow_runs: Global execution runs with metadata
 * - execution_steps: Per-node execution with resolved inputs/outputs
 *
 * Enables:
 * - Complete execution replay
 * - Time-travel debugging
 * - Audit trails
 * - Performance analysis
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  varchar,
  pgEnum,
  boolean,
  index,
  integer,
  numeric,
} from 'drizzle-orm/pg-core';
import { workflows } from './schema-workflows';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Run status for workflow executions
 */
export const runStatusEnum = pgEnum('run_status', [
  'pending',    // Run created but not started
  'running',    // Currently executing
  'completed',  // Finished successfully
  'failed',     // Finished with error
  'cancelled',  // Cancelled by user
  'suspended',  // Waiting for human approval
  'timeout',    // Exceeded max execution time
]);

/**
 * Trigger types for workflow runs
 */
export const triggerTypeEnum = pgEnum('trigger_type', [
  'manual',     // User clicked "Run" in UI
  'webhook',    // External HTTP webhook
  'schedule',   // Cron/scheduled execution
  'api',        // API call
  'event',      // System event trigger
  'resume',     // Resumed from suspension
  'retry',      // Manual retry of failed run
]);

/**
 * Step status for individual node executions
 */
export const stepStatusEnum = pgEnum('step_status', [
  'pending',    // Step created but not started
  'running',    // Currently executing
  'success',    // Completed successfully
  'failure',    // Failed with error
  'skipped',    // Skipped (e.g., condition branch not taken)
  'waiting',    // Waiting for external action (approval, etc.)
  'retrying',   // Currently retrying after failure
  'timeout',    // Exceeded node timeout
]);

// ============================================================================
// WORKFLOW RUNS TABLE
// ============================================================================

/**
 * Represents a complete execution of a workflow/pipeline.
 * This is the "parent" record for all execution_steps.
 */
export const workflowRuns = pgTable('workflow_runs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Key to workflow
  workflowId: uuid('workflow_id')
    .notNull()
    .references(() => workflows.id, { onDelete: 'cascade' }),

  // Run Identification
  runNumber: integer('run_number').notNull(), // Sequential number per workflow (e.g., Run #42)
  traceId: varchar('trace_id', { length: 64 }), // Distributed tracing ID

  // Trigger Information
  triggerType: triggerTypeEnum('trigger_type').notNull().default('manual'),
  triggerSource: varchar('trigger_source', { length: 255 }), // Source identifier (webhook ID, schedule name, etc.)
  triggerPayload: jsonb('trigger_payload').$type<Record<string, unknown>>(), // Original trigger data

  // Execution Status
  status: runStatusEnum('status').notNull().default('pending'),
  errorCode: varchar('error_code', { length: 50 }), // Structured error code (e.g., 'BUDGET_EXCEEDED')
  errorMessage: text('error_message'), // Human-readable error message
  errorStack: text('error_stack'), // Stack trace for debugging

  // Timing
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  totalDurationMs: integer('total_duration_ms'),

  // Cost Tracking
  totalTokensUsed: integer('total_tokens_used').default(0),
  totalCostUsd: numeric('total_cost_usd', { precision: 12, scale: 6 }).default('0'),

  // Execution Metrics
  nodesTotal: integer('nodes_total').default(0), // Total nodes in workflow
  nodesExecuted: integer('nodes_executed').default(0), // Nodes actually executed
  nodesSucceeded: integer('nodes_succeeded').default(0),
  nodesFailed: integer('nodes_failed').default(0),
  nodesSkipped: integer('nodes_skipped').default(0),

  // Final Output (if workflow completed successfully)
  finalOutput: jsonb('final_output').$type<unknown>(),

  // Context & Metadata
  userId: varchar('user_id', { length: 255 }).notNull(),
  workspaceId: varchar('workspace_id', { length: 255 }),
  isTest: boolean('is_test').notNull().default(false),
  versionId: uuid('version_id'), // Reference to specific workflow version used

  // Metadata for filtering/searching
  metadata: jsonb('metadata').$type<{
    environment?: 'production' | 'staging' | 'development';
    tags?: string[];
    labels?: Record<string, string>;
    parentRunId?: string; // For nested/child runs
    correlationId?: string; // For related runs
    [key: string]: unknown;
  }>(),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),

}, (table) => ({
  // Primary access patterns
  workflowIdIdx: index('run_workflow_id_idx').on(table.workflowId),
  statusIdx: index('run_status_idx').on(table.status),
  userIdIdx: index('run_user_id_idx').on(table.userId),
  workspaceIdIdx: index('run_workspace_id_idx').on(table.workspaceId),

  // Time-based queries
  createdAtIdx: index('run_created_at_idx').on(table.createdAt),
  startedAtIdx: index('run_started_at_idx').on(table.startedAt),

  // Filtering
  triggerTypeIdx: index('run_trigger_type_idx').on(table.triggerType),
  isTestIdx: index('run_is_test_idx').on(table.isTest),
  traceIdIdx: index('run_trace_id_idx').on(table.traceId),

  // Composite indexes for common queries
  workflowStatusIdx: index('run_workflow_status_idx').on(table.workflowId, table.status),
  workflowCreatedIdx: index('run_workflow_created_idx').on(table.workflowId, table.createdAt),
}));

// ============================================================================
// EXECUTION STEPS TABLE
// ============================================================================

/**
 * Represents the execution of a single node within a workflow run.
 * Captures resolved inputs, outputs, and errors for time-travel debugging.
 */
export const executionSteps = pgTable('execution_steps', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Keys
  runId: uuid('run_id')
    .notNull()
    .references(() => workflowRuns.id, { onDelete: 'cascade' }),
  workflowId: uuid('workflow_id')
    .notNull()
    .references(() => workflows.id, { onDelete: 'cascade' }),

  // Node Identification
  nodeId: varchar('node_id', { length: 100 }).notNull(), // React Flow node ID
  nodeType: varchar('node_type', { length: 50 }).notNull(), // trigger, condition, llm-agent, etc.
  nodeName: varchar('node_name', { length: 255 }), // Human-readable label from node.data.label

  // Execution Order
  stepNumber: integer('step_number').notNull(), // Sequential order within run
  depth: integer('depth').default(0), // Nesting depth (for loops/branches)
  parentStepId: uuid('parent_step_id'), // Parent step for nested executions

  // Status
  status: stepStatusEnum('status').notNull().default('pending'),

  // Data Capture (The Core of Flight Recorder!)
  // These are the RESOLVED values - all variables have been substituted
  inputsRaw: jsonb('inputs_raw').$type<Record<string, unknown>>(), // Original node config (before resolution)
  inputsResolved: jsonb('inputs_resolved').$type<Record<string, unknown>>(), // Resolved inputs (after variable substitution)
  output: jsonb('output').$type<unknown>(), // Actual output from node execution

  // Error Capture
  errorCode: varchar('error_code', { length: 50 }),
  errorMessage: text('error_message'),
  errorStack: text('error_stack'),
  errorDetails: jsonb('error_details').$type<{
    type: string;
    recoverable: boolean;
    retryable: boolean;
    context?: Record<string, unknown>;
  }>(),

  // Retry Information
  retryAttempt: integer('retry_attempt').default(0), // 0 = first attempt
  maxRetries: integer('max_retries').default(0),
  retryDelayMs: integer('retry_delay_ms'),
  previousErrors: jsonb('previous_errors').$type<string[]>(),

  // Timing
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),
  waitingDurationMs: integer('waiting_duration_ms'), // Time spent waiting (e.g., for approval)

  // Cost Tracking (for AI nodes)
  tokensPrompt: integer('tokens_prompt'),
  tokensCompletion: integer('tokens_completion'),
  tokensTotal: integer('tokens_total'),
  costUsd: numeric('cost_usd', { precision: 10, scale: 6 }),
  model: varchar('model', { length: 100 }), // AI model used (e.g., 'gpt-4o')

  // Branch/Condition Information
  branchPath: varchar('branch_path', { length: 255 }), // e.g., 'condition-1:true' or 'loop-1:iteration-3'
  conditionResult: boolean('condition_result'), // For condition nodes

  // External References
  externalCallId: varchar('external_call_id', { length: 255 }), // ID from external API call
  approvalId: uuid('approval_id'), // Reference to approval request if applicable

  // Metadata
  metadata: jsonb('metadata').$type<{
    variables?: Record<string, unknown>; // Variables available at this step
    missingVariables?: string[]; // Variables that couldn't be resolved
    warnings?: string[];
    debugInfo?: Record<string, unknown>;
    [key: string]: unknown;
  }>(),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),

}, (table) => ({
  // Primary access patterns
  runIdIdx: index('step_run_id_idx').on(table.runId),
  workflowIdIdx: index('step_workflow_id_idx').on(table.workflowId),
  nodeIdIdx: index('step_node_id_idx').on(table.nodeId),

  // Status filtering
  statusIdx: index('step_status_idx').on(table.status),

  // Time-based queries
  startedAtIdx: index('step_started_at_idx').on(table.startedAt),
  createdAtIdx: index('step_created_at_idx').on(table.createdAt),

  // Composite indexes for efficient queries
  runNodeIdx: index('step_run_node_idx').on(table.runId, table.nodeId),
  runStepOrderIdx: index('step_run_order_idx').on(table.runId, table.stepNumber),
  runStatusIdx: index('step_run_status_idx').on(table.runId, table.status),

  // For finding failed steps
  workflowStatusIdx: index('step_workflow_status_idx').on(table.workflowId, table.status),

  // For nested execution queries
  parentStepIdx: index('step_parent_idx').on(table.parentStepId),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type WorkflowRun = typeof workflowRuns.$inferSelect;
export type NewWorkflowRun = typeof workflowRuns.$inferInsert;
export type ExecutionStep = typeof executionSteps.$inferSelect;
export type NewExecutionStep = typeof executionSteps.$inferInsert;

// Status type exports
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'suspended' | 'timeout';
export type TriggerType = 'manual' | 'webhook' | 'schedule' | 'api' | 'event' | 'resume' | 'retry';
export type StepStatus = 'pending' | 'running' | 'success' | 'failure' | 'skipped' | 'waiting' | 'retrying' | 'timeout';
