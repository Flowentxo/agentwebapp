/**
 * Flow Control Schema
 *
 * Database schema for Phase 1: Advanced Flow Control
 * - Merge Node with wait-all/any/N strategies
 * - Wait/Sleep Node with hybrid suspension
 * - Webhook Wait with dynamic callback endpoints
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { workflows, workflowExecutions } from './schema-workflows';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Type of suspension for wait nodes
 */
export const suspensionTypeEnum = pgEnum('suspension_type', [
  'timer',      // Fixed duration wait
  'datetime',   // Wait until specific datetime
  'webhook',    // Wait for external webhook callback
  'manual',     // Wait for manual approval/trigger
  'condition',  // Wait until condition is met (polling)
]);

/**
 * Status of a suspended execution
 */
export const suspensionStatusEnum = pgEnum('suspension_status', [
  'pending',    // Waiting for trigger
  'resumed',    // Successfully resumed
  'expired',    // Timeout reached without trigger
  'cancelled',  // Manually cancelled
  'error',      // Error during resumption
]);

/**
 * Merge strategy for combining multiple branches
 */
export const mergeStrategyEnum = pgEnum('merge_strategy', [
  'wait_all',   // Wait for all incoming branches
  'wait_any',   // Continue when any branch completes
  'wait_n',     // Wait for N branches to complete
]);

/**
 * How merged data from multiple branches is combined
 */
export const mergeDataModeEnum = pgEnum('merge_data_mode', [
  'append',       // Concatenate all items: [...branch1, ...branch2]
  'join',         // Zip items by index: [{...item1, ...item2}]
  'pass_through', // Pass first completed branch only
  'deep_merge',   // Deep merge objects with conflict resolution
  'keyed_merge',  // Merge by matching key field
]);

/**
 * Storage tier for wait state
 */
export const storageRouteEnum = pgEnum('storage_route', [
  'memory',     // In-memory for < 5 seconds
  'redis',      // Redis for 5-60 seconds
  'postgres',   // PostgreSQL for > 60 seconds
]);

/**
 * Wait trigger type
 */
export const waitTriggerTypeEnum = pgEnum('wait_trigger_type', [
  'timer_elapsed',      // Timer duration completed
  'datetime_reached',   // Target datetime reached
  'webhook_received',   // Webhook callback received
  'manual_trigger',     // Manual resume triggered
  'condition_met',      // Polling condition satisfied
  'timeout',            // Maximum wait time exceeded
]);

// ============================================================================
// TABLES
// ============================================================================

/**
 * Execution Suspensions
 *
 * Stores full state snapshot when execution is suspended at a wait node.
 * Enables resumption from any point with complete context.
 */
export const executionSuspensions = pgTable('execution_suspensions', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign keys
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  executionId: uuid('execution_id').notNull().references(() => workflowExecutions.id, { onDelete: 'cascade' }),
  nodeId: varchar('node_id', { length: 100 }).notNull(),

  // Suspension details
  suspensionType: suspensionTypeEnum('suspension_type').notNull(),
  status: suspensionStatusEnum('status').notNull().default('pending'),
  storageRoute: storageRouteEnum('storage_route').notNull().default('postgres'),

  // Timing
  suspendedAt: timestamp('suspended_at').notNull().defaultNow(),
  resumeAt: timestamp('resume_at'),  // For timer/datetime waits
  expiresAt: timestamp('expires_at'), // Maximum wait time
  resumedAt: timestamp('resumed_at'),

  // State snapshot for resumption
  executionState: jsonb('execution_state').notNull().$type<ExecutionStateSnapshot>(),

  // Webhook-specific fields
  webhookCorrelationId: varchar('webhook_correlation_id', { length: 255 }),
  webhookCallbackUrl: text('webhook_callback_url'),

  // Resume payload
  resumePayload: jsonb('resume_payload').$type<Record<string, unknown>>(),
  triggerType: waitTriggerTypeEnum('trigger_type'),

  // Error handling
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').notNull().default(0),
  maxRetries: integer('max_retries').notNull().default(3),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Indexes for common queries
  executionIdx: index('idx_suspensions_execution').on(table.executionId),
  workflowIdx: index('idx_suspensions_workflow').on(table.workflowId),
  statusIdx: index('idx_suspensions_status').on(table.status),
  resumeAtIdx: index('idx_suspensions_resume_at').on(table.resumeAt),
  webhookCorrelationIdx: uniqueIndex('idx_suspensions_webhook_correlation')
    .on(table.webhookCorrelationId),
}));

/**
 * Merge Node States
 *
 * Tracks completion status of parent branches for merge nodes.
 * Enables wait-all/any/N merge strategies.
 */
export const mergeNodeStates = pgTable('merge_node_states', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign keys
  executionId: uuid('execution_id').notNull().references(() => workflowExecutions.id, { onDelete: 'cascade' }),
  mergeNodeId: varchar('merge_node_id', { length: 100 }).notNull(),

  // Merge configuration
  strategy: mergeStrategyEnum('strategy').notNull().default('wait_all'),
  dataMode: mergeDataModeEnum('data_mode').notNull().default('append'),
  waitCount: integer('wait_count'), // For wait_n strategy

  // Branch tracking
  expectedBranches: integer('expected_branches').notNull(),
  completedBranches: integer('completed_branches').notNull().default(0),
  branchData: jsonb('branch_data').notNull().$type<BranchDataMap>().default({}),
  branchOrder: jsonb('branch_order').notNull().$type<string[]>().default([]),

  // Status
  isComplete: boolean('is_complete').notNull().default(false),
  mergedOutput: jsonb('merged_output').$type<unknown[]>(),

  // Timing
  firstBranchAt: timestamp('first_branch_at'),
  completedAt: timestamp('completed_at'),

  // Configuration
  mergeConfig: jsonb('merge_config').$type<MergeNodeConfig>(),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Composite unique constraint
  executionMergeIdx: uniqueIndex('idx_merge_states_execution_node')
    .on(table.executionId, table.mergeNodeId),
  isCompleteIdx: index('idx_merge_states_complete').on(table.isComplete),
}));

/**
 * Webhook Wait Endpoints
 *
 * Dynamic webhook endpoints for wait nodes.
 * Allows external systems to trigger workflow resumption.
 */
export const webhookWaitEndpoints = pgTable('webhook_wait_endpoints', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign keys
  suspensionId: uuid('suspension_id').notNull().references(() => executionSuspensions.id, { onDelete: 'cascade' }),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  executionId: uuid('execution_id').notNull().references(() => workflowExecutions.id, { onDelete: 'cascade' }),

  // Endpoint configuration
  correlationId: varchar('correlation_id', { length: 255 }).notNull().unique(),
  path: varchar('path', { length: 500 }).notNull(),
  method: varchar('method', { length: 10 }).notNull().default('POST'),

  // Security
  secretToken: varchar('secret_token', { length: 255 }),
  allowedIps: jsonb('allowed_ips').$type<string[]>(),
  requireAuth: boolean('require_auth').notNull().default(false),

  // Response configuration
  responseBody: jsonb('response_body').$type<Record<string, unknown>>(),
  responseHeaders: jsonb('response_headers').$type<Record<string, string>>(),
  responseStatusCode: integer('response_status_code').notNull().default(200),

  // Status
  isActive: boolean('is_active').notNull().default(true),
  hitCount: integer('hit_count').notNull().default(0),
  lastHitAt: timestamp('last_hit_at'),

  // Timing
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  correlationIdx: uniqueIndex('idx_webhook_endpoints_correlation').on(table.correlationId),
  pathIdx: index('idx_webhook_endpoints_path').on(table.path),
  activeIdx: index('idx_webhook_endpoints_active').on(table.isActive),
  expiresIdx: index('idx_webhook_endpoints_expires').on(table.expiresAt),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const executionSuspensionsRelations = relations(executionSuspensions, ({ one }) => ({
  workflow: one(workflows, {
    fields: [executionSuspensions.workflowId],
    references: [workflows.id],
  }),
  execution: one(workflowExecutions, {
    fields: [executionSuspensions.executionId],
    references: [workflowExecutions.id],
  }),
}));

export const mergeNodeStatesRelations = relations(mergeNodeStates, ({ one }) => ({
  execution: one(workflowExecutions, {
    fields: [mergeNodeStates.executionId],
    references: [workflowExecutions.id],
  }),
}));

export const webhookWaitEndpointsRelations = relations(webhookWaitEndpoints, ({ one }) => ({
  suspension: one(executionSuspensions, {
    fields: [webhookWaitEndpoints.suspensionId],
    references: [executionSuspensions.id],
  }),
  workflow: one(workflows, {
    fields: [webhookWaitEndpoints.workflowId],
    references: [workflows.id],
  }),
  execution: one(workflowExecutions, {
    fields: [webhookWaitEndpoints.executionId],
    references: [workflowExecutions.id],
  }),
}));

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Complete execution state snapshot for resumption
 */
export interface ExecutionStateSnapshot {
  /** Current position in execution graph */
  currentNodeId: string;

  /** All node outputs up to suspension point */
  nodeOutputs: Record<string, unknown[]>;

  /** Original trigger data */
  triggerData: unknown;

  /** Global variables at suspension */
  globalVariables: Record<string, unknown>;

  /** Items being processed at wait node */
  currentItems: unknown[];

  /** Execution context metadata */
  context: {
    startedAt: string;
    userId?: string;
    workspaceId?: string;
    executionMode: 'manual' | 'trigger' | 'scheduled' | 'webhook';
    parentExecutionId?: string;
  };

  /** Pending nodes to execute after resumption */
  pendingNodes: string[];

  /** Branch states for parallel execution */
  branchStates?: Record<string, BranchState>;
}

/**
 * State of an individual execution branch
 */
export interface BranchState {
  branchId: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  nodeId: string;
  output?: unknown[];
  error?: string;
}

/**
 * Map of branch outputs for merge node
 */
export interface BranchDataMap {
  [branchId: string]: {
    nodeId: string;
    items: unknown[];
    completedAt: string;
    metadata?: Record<string, unknown>;
  };
}

/**
 * Merge node configuration
 */
export interface MergeNodeConfig {
  strategy: 'wait_all' | 'wait_any' | 'wait_n';
  dataMode: 'append' | 'join' | 'pass_through' | 'deep_merge' | 'keyed_merge';
  waitCount?: number;  // For wait_n strategy
  keyField?: string;   // For keyed_merge mode
  timeout?: number;    // Max wait time in ms
  conflictResolution?: 'first' | 'last' | 'merge';
}

/**
 * Wait node configuration
 */
export interface WaitNodeConfig {
  type: 'timer' | 'datetime' | 'webhook' | 'manual' | 'condition';

  // Timer configuration
  duration?: number;      // Duration in ms
  durationUnit?: 'ms' | 'seconds' | 'minutes' | 'hours' | 'days';

  // Datetime configuration
  targetDatetime?: string;  // ISO datetime
  timezone?: string;

  // Webhook configuration
  webhook?: {
    generatePath?: boolean;
    customPath?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
    responseBody?: Record<string, unknown>;
    secretToken?: string;
    allowedIps?: string[];
  };

  // Condition configuration (for polling)
  condition?: {
    expression: string;
    pollInterval: number;  // ms
    maxAttempts?: number;
  };

  // General
  timeout?: number;  // Max wait time in ms
  onTimeout?: 'error' | 'continue' | 'skip';
}

/**
 * Wait resume event data
 */
export interface WaitResumeEvent {
  suspensionId: string;
  triggerType: 'timer_elapsed' | 'datetime_reached' | 'webhook_received' | 'manual_trigger' | 'condition_met' | 'timeout';
  payload?: Record<string, unknown>;
  metadata?: {
    triggeredBy?: string;
    triggeredAt: string;
    webhookRequest?: {
      headers: Record<string, string>;
      body: unknown;
      query: Record<string, string>;
    };
  };
}

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type ExecutionSuspension = typeof executionSuspensions.$inferSelect;
export type NewExecutionSuspension = typeof executionSuspensions.$inferInsert;

export type MergeNodeState = typeof mergeNodeStates.$inferSelect;
export type NewMergeNodeState = typeof mergeNodeStates.$inferInsert;

export type WebhookWaitEndpoint = typeof webhookWaitEndpoints.$inferSelect;
export type NewWebhookWaitEndpoint = typeof webhookWaitEndpoints.$inferInsert;

export type SuspensionType = 'timer' | 'datetime' | 'webhook' | 'manual' | 'condition';
export type SuspensionStatus = 'pending' | 'resumed' | 'expired' | 'cancelled' | 'error';
export type MergeStrategy = 'wait_all' | 'wait_any' | 'wait_n';
export type MergeDataMode = 'append' | 'join' | 'pass_through' | 'deep_merge' | 'keyed_merge';
export type StorageRoute = 'memory' | 'redis' | 'postgres';
export type WaitTriggerType = 'timer_elapsed' | 'datetime_reached' | 'webhook_received' | 'manual_trigger' | 'condition_met' | 'timeout';

// ============================================================================
// PHASE 2: LOOPS & ITERATION
// ============================================================================

/**
 * Loop status enum
 */
export const loopStatusEnum = pgEnum('loop_status', [
  'initializing', // Loop just created, not started
  'running',      // Loop is actively iterating
  'paused',       // Loop paused (for manual intervention)
  'completed',    // Loop finished all iterations
  'error',        // Loop encountered an error
  'cancelled',    // Loop was manually cancelled
]);

/**
 * Loop Iteration States
 *
 * Tracks the state of SplitInBatches loops for persistence across
 * workflow suspensions and resumptions.
 */
export const loopIterationStates = pgTable('loop_iteration_states', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign keys
  executionId: uuid('execution_id').notNull().references(() => workflowExecutions.id, { onDelete: 'cascade' }),
  loopNodeId: varchar('loop_node_id', { length: 100 }).notNull(),

  // Loop configuration
  batchSize: integer('batch_size').notNull().default(10),
  totalItems: integer('total_items').notNull(),

  // Current state
  runIndex: integer('run_index').notNull().default(0),
  nextIndex: integer('next_index').notNull().default(0),
  status: loopStatusEnum('status').notNull().default('initializing'),

  // Items storage
  sourceItems: jsonb('source_items').notNull().$type<unknown[]>(),
  aggregatedResults: jsonb('aggregated_results').notNull().$type<unknown[]>().default([]),

  // Node scope (nodes that are reset each iteration)
  loopScopeNodeIds: jsonb('loop_scope_node_ids').notNull().$type<string[]>().default([]),
  feedbackNodeIds: jsonb('feedback_node_ids').notNull().$type<string[]>().default([]),
  exitNodeIds: jsonb('exit_node_ids').notNull().$type<string[]>().default([]),

  // Timing
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  lastIterationAt: timestamp('last_iteration_at'),

  // Error handling
  maxIterations: integer('max_iterations').notNull().default(1000),
  errorOnMaxIterations: boolean('error_on_max_iterations').notNull().default(true),
  continueOnError: boolean('continue_on_error').notNull().default(false),
  lastError: text('last_error'),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Composite unique constraint for execution + loop node
  executionLoopIdx: uniqueIndex('idx_loop_states_execution_node')
    .on(table.executionId, table.loopNodeId),
  statusIdx: index('idx_loop_states_status').on(table.status),
  executionIdx: index('idx_loop_states_execution').on(table.executionId),
}));

/**
 * Loop Iteration Logs
 *
 * Records each iteration of a loop for debugging and auditing.
 */
export const loopIterationLogs = pgTable('loop_iteration_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign keys
  loopStateId: uuid('loop_state_id').notNull().references(() => loopIterationStates.id, { onDelete: 'cascade' }),
  executionId: uuid('execution_id').notNull().references(() => workflowExecutions.id, { onDelete: 'cascade' }),

  // Iteration details
  iterationIndex: integer('iteration_index').notNull(),
  batchStartIndex: integer('batch_start_index').notNull(),
  batchEndIndex: integer('batch_end_index').notNull(),
  itemCount: integer('item_count').notNull(),

  // Status
  status: varchar('status', { length: 20 }).notNull(), // 'started' | 'completed' | 'error'

  // Data
  batchInput: jsonb('batch_input').$type<unknown[]>(),
  batchOutput: jsonb('batch_output').$type<unknown[]>(),

  // Error details
  errorMessage: text('error_message'),
  errorNodeId: varchar('error_node_id', { length: 100 }),

  // Timing
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  loopStateIdx: index('idx_iteration_logs_loop_state').on(table.loopStateId),
  executionIdx: index('idx_iteration_logs_execution').on(table.executionId),
  iterationIdx: index('idx_iteration_logs_iteration').on(table.loopStateId, table.iterationIndex),
}));

// ============================================================================
// PHASE 2 RELATIONS
// ============================================================================

export const loopIterationStatesRelations = relations(loopIterationStates, ({ one, many }) => ({
  execution: one(workflowExecutions, {
    fields: [loopIterationStates.executionId],
    references: [workflowExecutions.id],
  }),
  iterations: many(loopIterationLogs),
}));

export const loopIterationLogsRelations = relations(loopIterationLogs, ({ one }) => ({
  loopState: one(loopIterationStates, {
    fields: [loopIterationLogs.loopStateId],
    references: [loopIterationStates.id],
  }),
  execution: one(workflowExecutions, {
    fields: [loopIterationLogs.executionId],
    references: [workflowExecutions.id],
  }),
}));

// ============================================================================
// PHASE 2 TYPE DEFINITIONS
// ============================================================================

/**
 * Loop iteration state configuration
 */
export interface LoopStateConfig {
  batchSize: number;
  maxIterations: number;
  errorOnMaxIterations: boolean;
  continueOnError: boolean;
  aggregateResults: boolean;
}

/**
 * Loop iteration progress info
 */
export interface LoopProgress {
  runIndex: number;
  totalItems: number;
  processedItems: number;
  remainingItems: number;
  batchSize: number;
  estimatedRemainingIterations: number;
  percentComplete: number;
  isComplete: boolean;
}

// ============================================================================
// PHASE 2 INFERRED TYPES
// ============================================================================

export type LoopIterationState = typeof loopIterationStates.$inferSelect;
export type NewLoopIterationState = typeof loopIterationStates.$inferInsert;

export type LoopIterationLog = typeof loopIterationLogs.$inferSelect;
export type NewLoopIterationLog = typeof loopIterationLogs.$inferInsert;

export type LoopStatus = 'initializing' | 'running' | 'paused' | 'completed' | 'error' | 'cancelled';
