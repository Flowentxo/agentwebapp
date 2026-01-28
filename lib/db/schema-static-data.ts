/**
 * Static Data Schema
 *
 * Phase 4: Active Polling & Error Triggers
 *
 * This schema provides persistent storage for:
 * - Workflow static data (polling cursors, deduplication state)
 * - Polling trigger configurations
 * - Error workflow configurations
 *
 * Static data survives across executions and is used by polling nodes
 * to remember "where they stopped" (e.g., lastId, lastTimestamp).
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { workflows } from './schema-workflows';
import { users } from './schema';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Polling trigger status
 */
export const pollingStatusEnum = pgEnum('polling_status', [
  'active',       // Polling is enabled and running
  'paused',       // Temporarily paused by user
  'disabled',     // Disabled (workflow inactive)
  'error',        // Polling encountered errors
  'rate_limited', // Temporarily rate limited
]);

/**
 * Polling interval presets
 */
export const pollingIntervalEnum = pgEnum('polling_interval', [
  'every_minute',     // */1 * * * *
  'every_5_minutes',  // */5 * * * *
  'every_15_minutes', // */15 * * * *
  'every_30_minutes', // */30 * * * *
  'every_hour',       // 0 * * * *
  'every_6_hours',    // 0 */6 * * *
  'every_12_hours',   // 0 */12 * * *
  'daily',            // 0 0 * * *
  'custom',           // Custom cron expression
]);

/**
 * Error trigger mode
 */
export const errorTriggerModeEnum = pgEnum('error_trigger_mode', [
  'all_errors',     // Trigger on any error
  'fatal_only',     // Only on fatal/unrecoverable errors
  'node_specific',  // Only for specific node types
  'custom_filter',  // Custom error filter expression
]);

// ============================================================================
// WORKFLOW STATIC DATA
// ============================================================================

/**
 * Workflow Static Data
 *
 * Persists small JSON blobs for polling nodes to track state across executions.
 * Each (workflowId, nodeId) pair has its own isolated static data.
 */
export const workflowStaticData = pgTable('workflow_static_data', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Ownership
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  nodeId: varchar('node_id', { length: 100 }).notNull(),

  // Static data storage (small JSON blob)
  data: jsonb('data').notNull().$type<StaticDataContent>().default({}),

  // Metadata
  nodeType: varchar('node_type', { length: 100 }), // For querying all polling nodes
  nodeName: varchar('node_name', { length: 255 }),

  // Version for optimistic locking
  version: integer('version').notNull().default(1),

  // Last update tracking
  lastUpdatedBy: varchar('last_updated_by', { length: 50 }), // 'execution' | 'manual' | 'polling'
  lastExecutionId: uuid('last_execution_id'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Unique constraint for workflow + node combination
  workflowNodeIdx: uniqueIndex('idx_static_data_workflow_node')
    .on(table.workflowId, table.nodeId),
  // Index for finding all polling nodes
  nodeTypeIdx: index('idx_static_data_node_type').on(table.nodeType),
  // Index for workflow lookup
  workflowIdx: index('idx_static_data_workflow').on(table.workflowId),
}));

// ============================================================================
// POLLING TRIGGERS
// ============================================================================

/**
 * Polling Trigger Configuration
 *
 * Stores configuration for polling-based triggers in workflows.
 */
export const pollingTriggers = pgTable('polling_triggers', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Ownership
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  nodeId: varchar('node_id', { length: 100 }).notNull(),
  userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),

  // Trigger configuration
  nodeType: varchar('node_type', { length: 100 }).notNull(),
  nodeName: varchar('node_name', { length: 255 }),

  // Polling schedule
  intervalType: pollingIntervalEnum('interval_type').notNull().default('every_5_minutes'),
  customCron: varchar('custom_cron', { length: 100 }), // For custom intervals
  intervalMs: integer('interval_ms').notNull().default(300000), // 5 minutes in ms

  // Status
  status: pollingStatusEnum('status').notNull().default('active'),

  // Execution tracking
  lastPollAt: timestamp('last_poll_at'),
  nextPollAt: timestamp('next_poll_at'),
  lastSuccessAt: timestamp('last_success_at'),
  lastErrorAt: timestamp('last_error_at'),
  lastError: text('last_error'),

  // Concurrency control
  isPolling: boolean('is_polling').notNull().default(false),
  pollingLockId: uuid('polling_lock_id'),
  pollingLockExpiresAt: timestamp('polling_lock_expires_at'),

  // Statistics
  totalPolls: integer('total_polls').notNull().default(0),
  successfulPolls: integer('successful_polls').notNull().default(0),
  failedPolls: integer('failed_polls').notNull().default(0),
  itemsFound: integer('items_found').notNull().default(0),

  // Rate limiting
  consecutiveErrors: integer('consecutive_errors').notNull().default(0),
  backoffUntil: timestamp('backoff_until'),
  maxBackoffMinutes: integer('max_backoff_minutes').notNull().default(60),

  // Configuration
  config: jsonb('config').$type<PollingTriggerConfig>().default({}),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Unique constraint for workflow + node
  workflowNodeIdx: uniqueIndex('idx_polling_triggers_workflow_node')
    .on(table.workflowId, table.nodeId),
  // Index for finding active polling triggers
  statusIdx: index('idx_polling_triggers_status').on(table.status),
  // Index for scheduler queries
  nextPollIdx: index('idx_polling_triggers_next_poll')
    .on(table.status, table.nextPollAt)
    .where(sql`status = 'active'`),
  // Index for node type queries
  nodeTypeIdx: index('idx_polling_triggers_node_type').on(table.nodeType),
  // Index for user queries
  userIdx: index('idx_polling_triggers_user').on(table.userId),
}));

// Need to import sql for the where clause
import { sql } from 'drizzle-orm';

// ============================================================================
// ERROR WORKFLOWS
// ============================================================================

/**
 * Error Workflow Configuration
 *
 * Configures error handling workflows that are triggered when executions fail.
 */
export const errorWorkflows = pgTable('error_workflows', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Source workflow (the one that can error)
  sourceWorkflowId: uuid('source_workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),

  // Error handler workflow (the one that handles errors)
  errorWorkflowId: uuid('error_workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),

  // Configuration
  mode: errorTriggerModeEnum('mode').notNull().default('all_errors'),
  enabled: boolean('enabled').notNull().default(true),

  // Filter configuration (for node_specific or custom_filter modes)
  filterConfig: jsonb('filter_config').$type<ErrorFilterConfig>().default({}),

  // Error trigger node in the error workflow
  errorTriggerNodeId: varchar('error_trigger_node_id', { length: 100 }),

  // Statistics
  timesTriggered: integer('times_triggered').notNull().default(0),
  lastTriggeredAt: timestamp('last_triggered_at'),
  lastExecutionId: uuid('last_execution_id'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Unique constraint for source + error workflow pair
  sourceErrorIdx: uniqueIndex('idx_error_workflows_source_error')
    .on(table.sourceWorkflowId, table.errorWorkflowId),
  // Index for finding error handlers for a workflow
  sourceIdx: index('idx_error_workflows_source').on(table.sourceWorkflowId),
  // Index for enabled error workflows
  enabledIdx: index('idx_error_workflows_enabled')
    .on(table.sourceWorkflowId, table.enabled)
    .where(sql`enabled = true`),
}));

/**
 * Error Execution Log
 *
 * Tracks error workflow executions for auditing.
 */
export const errorExecutionLog = pgTable('error_execution_log', {
  id: uuid('id').primaryKey().defaultRandom(),

  // References
  errorWorkflowConfigId: uuid('error_workflow_config_id').notNull()
    .references(() => errorWorkflows.id, { onDelete: 'cascade' }),
  sourceExecutionId: uuid('source_execution_id').notNull(),
  errorExecutionId: uuid('error_execution_id'),

  // Error details
  errorMessage: text('error_message').notNull(),
  errorNodeId: varchar('error_node_id', { length: 100 }),
  errorNodeType: varchar('error_node_type', { length: 100 }),
  errorStack: text('error_stack'),

  // Execution context snapshot
  executionContext: jsonb('execution_context').$type<ErrorExecutionContext>(),

  // Status
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, triggered, completed, failed

  // Timing
  errorOccurredAt: timestamp('error_occurred_at').notNull(),
  triggeredAt: timestamp('triggered_at'),
  completedAt: timestamp('completed_at'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  configIdx: index('idx_error_log_config').on(table.errorWorkflowConfigId),
  sourceExecutionIdx: index('idx_error_log_source_execution').on(table.sourceExecutionId),
  statusIdx: index('idx_error_log_status').on(table.status),
  createdIdx: index('idx_error_log_created').on(table.createdAt),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const workflowStaticDataRelations = relations(workflowStaticData, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowStaticData.workflowId],
    references: [workflows.id],
  }),
}));

export const pollingTriggersRelations = relations(pollingTriggers, ({ one }) => ({
  workflow: one(workflows, {
    fields: [pollingTriggers.workflowId],
    references: [workflows.id],
  }),
  user: one(users, {
    fields: [pollingTriggers.userId],
    references: [users.id],
  }),
}));

export const errorWorkflowsRelations = relations(errorWorkflows, ({ one }) => ({
  sourceWorkflow: one(workflows, {
    fields: [errorWorkflows.sourceWorkflowId],
    references: [workflows.id],
    relationName: 'sourceWorkflow',
  }),
  errorWorkflow: one(workflows, {
    fields: [errorWorkflows.errorWorkflowId],
    references: [workflows.id],
    relationName: 'errorWorkflow',
  }),
}));

export const errorExecutionLogRelations = relations(errorExecutionLog, ({ one }) => ({
  errorWorkflowConfig: one(errorWorkflows, {
    fields: [errorExecutionLog.errorWorkflowConfigId],
    references: [errorWorkflows.id],
  }),
}));

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Static data content stored by polling nodes
 */
export interface StaticDataContent {
  /** Last processed ID for incremental polling */
  lastId?: string | number;

  /** Last processed timestamp */
  lastTimestamp?: string;

  /** Last processed cursor (for cursor-based pagination) */
  cursor?: string;

  /** Set of seen IDs for deduplication */
  seenIds?: string[];

  /** Maximum size for seenIds array */
  maxSeenIds?: number;

  /** Custom data stored by specific nodes */
  custom?: Record<string, unknown>;

  /** Metadata about last poll */
  lastPoll?: {
    timestamp: string;
    itemCount: number;
    executionId?: string;
  };
}

/**
 * Polling trigger configuration
 */
export interface PollingTriggerConfig {
  /** Maximum items to fetch per poll */
  maxItems?: number;

  /** Timeout for poll operation in ms */
  timeoutMs?: number;

  /** Whether to process items in batches */
  batchMode?: boolean;

  /** Batch size if batchMode is true */
  batchSize?: number;

  /** Deduplication strategy */
  deduplicationStrategy?: 'id' | 'timestamp' | 'cursor' | 'hash' | 'none';

  /** Field to use for deduplication */
  deduplicationField?: string;

  /** Whether to emit empty polls */
  emitEmptyPolls?: boolean;

  /** Custom headers or auth for the poll request */
  requestConfig?: Record<string, unknown>;
}

/**
 * Error filter configuration
 */
export interface ErrorFilterConfig {
  /** Node types to filter (for node_specific mode) */
  nodeTypes?: string[];

  /** Node IDs to filter */
  nodeIds?: string[];

  /** Error message patterns to match */
  messagePatterns?: string[];

  /** Error codes to match */
  errorCodes?: string[];

  /** Custom filter expression */
  customExpression?: string;

  /** Minimum severity level */
  minSeverity?: 'warning' | 'error' | 'fatal';
}

/**
 * Error execution context passed to error workflows
 */
export interface ErrorExecutionContext {
  /** Original workflow info */
  workflow: {
    id: string;
    name: string;
  };

  /** Original execution info */
  execution: {
    id: string;
    mode: string;
    startedAt: string;
    finishedAt: string;
  };

  /** Error details */
  error: {
    message: string;
    nodeId?: string;
    nodeName?: string;
    nodeType?: string;
    stack?: string;
    code?: string;
  };

  /** Last successful node output (for debugging) */
  lastSuccessfulOutput?: unknown;

  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Polling lock for concurrency control
 */
export interface PollingLock {
  lockId: string;
  triggerId: string;
  workflowId: string;
  acquiredAt: Date;
  expiresAt: Date;
}

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type WorkflowStaticDataRecord = typeof workflowStaticData.$inferSelect;
export type NewWorkflowStaticDataRecord = typeof workflowStaticData.$inferInsert;

export type PollingTriggerRecord = typeof pollingTriggers.$inferSelect;
export type NewPollingTriggerRecord = typeof pollingTriggers.$inferInsert;

export type ErrorWorkflowRecord = typeof errorWorkflows.$inferSelect;
export type NewErrorWorkflowRecord = typeof errorWorkflows.$inferInsert;

export type ErrorExecutionLogRecord = typeof errorExecutionLog.$inferSelect;
export type NewErrorExecutionLogRecord = typeof errorExecutionLog.$inferInsert;

export type PollingStatus = 'active' | 'paused' | 'disabled' | 'error' | 'rate_limited';
export type PollingInterval = 'every_minute' | 'every_5_minutes' | 'every_15_minutes' | 'every_30_minutes' | 'every_hour' | 'every_6_hours' | 'every_12_hours' | 'daily' | 'custom';
export type ErrorTriggerMode = 'all_errors' | 'fatal_only' | 'node_specific' | 'custom_filter';
