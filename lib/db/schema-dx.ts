/**
 * Developer Experience (DX) Schema
 *
 * Phase 6: Builder Experience Enhancement
 *
 * This schema supports:
 * - Data Pinning: Cache node outputs for faster development iterations
 * - Schema Discovery: Metadata for powering frontend autocomplete
 * - Execution History: Structured logs for loop/batch visualization
 *
 * Key Features:
 * - Pin any node's output to skip execution during development
 * - Auto-discover available variables for expression editor
 * - Hierarchical execution logs grouped by run/batch index
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users, workspaces } from './schema';
import { workflows, workflowExecutions } from './schema-workflows';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Pin mode - how the pinned data should be used
 */
export const pinModeEnum = pgEnum('pin_mode', [
  'always',        // Always use pinned data (skip execution)
  'on_error',      // Use pinned data only if execution fails
  'development',   // Use only in development/test mode
  'disabled',      // Pin exists but is disabled
]);

/**
 * Schema source - where the schema definition came from
 */
export const schemaSourceEnum = pgEnum('schema_source', [
  'execution',     // Derived from actual execution output
  'pinned',        // Derived from pinned data
  'inferred',      // AI-inferred based on node type
  'manual',        // Manually defined by user
  'template',      // From node type template
]);

// ============================================================================
// PINNED NODE DATA TABLE
// ============================================================================

/**
 * Pinned Node Data
 *
 * Stores cached output data for workflow nodes to speed up development.
 * When a node has pinned data, execution can be skipped and the pinned
 * data returned instead.
 */
export const pinnedNodeData = pgTable('pinned_node_data', {
  id: uuid('id').primaryKey().defaultRandom(),

  // References
  workflowId: uuid('workflow_id').notNull()
    .references(() => workflows.id, { onDelete: 'cascade' }),
  nodeId: varchar('node_id', { length: 100 }).notNull(),
  userId: varchar('user_id', { length: 36 }).notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Pin configuration
  mode: pinModeEnum('mode').notNull().default('development'),
  isEnabled: boolean('is_enabled').notNull().default(true),

  // Pinned data
  pinnedOutput: jsonb('pinned_output').notNull(),
  pinnedMeta: jsonb('pinned_meta').$type<{
    executionTime?: number;
    itemCount?: number;
    sourceExecutionId?: string;
    pinnedAt?: string;
    description?: string;
  }>(),

  // Schema info (for autocomplete)
  outputSchema: jsonb('output_schema').$type<JSONSchemaDefinition>(),
  schemaSource: schemaSourceEnum('schema_source').default('execution'),

  // Labels for organization
  label: varchar('label', { length: 255 }),
  description: text('description'),
  tags: jsonb('tags').$type<string[]>().default([]),

  // Stats
  usageCount: integer('usage_count').notNull().default(0),
  lastUsedAt: timestamp('last_used_at'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Unique pin per workflow+node+user
  workflowNodeUserIdx: uniqueIndex('idx_pinned_workflow_node_user')
    .on(table.workflowId, table.nodeId, table.userId),
  // Fast lookup by workflow
  workflowIdx: index('idx_pinned_workflow').on(table.workflowId),
  // Fast lookup by user
  userIdx: index('idx_pinned_user').on(table.userId),
  // Find enabled pins
  enabledIdx: index('idx_pinned_enabled')
    .on(table.workflowId, table.isEnabled)
    .where(sql`is_enabled = TRUE`),
}));

// ============================================================================
// NODE SCHEMA CACHE TABLE
// ============================================================================

/**
 * Node Schema Cache
 *
 * Caches discovered/inferred schemas for nodes to power autocomplete.
 * This avoids re-analyzing execution data on every keystroke.
 */
export const nodeSchemaCache = pgTable('node_schema_cache', {
  id: uuid('id').primaryKey().defaultRandom(),

  // References
  workflowId: uuid('workflow_id').notNull()
    .references(() => workflows.id, { onDelete: 'cascade' }),
  nodeId: varchar('node_id', { length: 100 }).notNull(),

  // Node info for context
  nodeType: varchar('node_type', { length: 100 }).notNull(),
  nodeName: varchar('node_name', { length: 255 }),

  // Schema data
  outputSchema: jsonb('output_schema').notNull().$type<JSONSchemaDefinition>(),
  schemaSource: schemaSourceEnum('schema_source').notNull(),
  confidence: integer('confidence').notNull().default(100), // 0-100

  // Sample data for preview
  sampleOutput: jsonb('sample_output'),
  samplePaths: jsonb('sample_paths').$type<VariablePath[]>(),

  // Source tracking
  sourceExecutionId: uuid('source_execution_id')
    .references(() => workflowExecutions.id, { onDelete: 'set null' }),
  sourceTimestamp: timestamp('source_timestamp'),

  // Validity
  isStale: boolean('is_stale').notNull().default(false),
  expiresAt: timestamp('expires_at'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Unique schema per workflow+node
  workflowNodeIdx: uniqueIndex('idx_schema_cache_workflow_node')
    .on(table.workflowId, table.nodeId),
  // Fast lookup by node type (for template matching)
  nodeTypeIdx: index('idx_schema_cache_node_type').on(table.nodeType),
  // Find non-stale caches
  freshIdx: index('idx_schema_cache_fresh')
    .on(table.workflowId, table.isStale)
    .where(sql`is_stale = FALSE`),
}));

// ============================================================================
// NODE TYPE SCHEMA TEMPLATES
// ============================================================================

/**
 * Node Type Schema Templates
 *
 * Pre-defined schemas for common node types. Used when no execution
 * data is available to provide initial autocomplete suggestions.
 */
export const nodeTypeSchemaTemplates = pgTable('node_type_schema_templates', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Node type identification
  nodeType: varchar('node_type', { length: 100 }).notNull(),
  provider: varchar('provider', { length: 100 }), // e.g., 'hubspot', 'openai'
  version: varchar('version', { length: 50 }).default('1.0.0'),

  // Schema template
  outputSchema: jsonb('output_schema').notNull().$type<JSONSchemaDefinition>(),
  commonPaths: jsonb('common_paths').$type<VariablePath[]>(),

  // Documentation
  description: text('description'),
  examples: jsonb('examples').$type<{
    input?: unknown;
    output?: unknown;
    description?: string;
  }[]>(),

  // AI-generated hint
  aiPromptHint: text('ai_prompt_hint'), // Hint for LLM to generate better schemas

  // Metadata
  isBuiltin: boolean('is_builtin').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Unique template per node type + provider
  nodeTypeProviderIdx: uniqueIndex('idx_template_node_type_provider')
    .on(table.nodeType, table.provider),
  // Find active templates
  activeIdx: index('idx_template_active')
    .on(table.nodeType, table.isActive)
    .where(sql`is_active = TRUE`),
}));

// ============================================================================
// EXECUTION HISTORY (ENHANCED FOR LOOPS)
// ============================================================================

/**
 * Workflow Node Execution Log (Enhanced)
 *
 * Structured logs with run_index and batch_index for hierarchical display.
 * Enables the frontend to show "Loop 1, Loop 2, Loop 3" selectors.
 */
export const workflowNodeLogs = pgTable('workflow_node_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // References
  executionId: uuid('execution_id').notNull()
    .references(() => workflowExecutions.id, { onDelete: 'cascade' }),
  workflowId: uuid('workflow_id').notNull()
    .references(() => workflows.id, { onDelete: 'cascade' }),
  nodeId: varchar('node_id', { length: 100 }).notNull(),

  // Node info
  nodeType: varchar('node_type', { length: 100 }),
  nodeName: varchar('node_name', { length: 255 }),

  // Loop context (for hierarchical display)
  runIndex: integer('run_index').notNull().default(0),
  batchIndex: integer('batch_index'),
  itemIndex: integer('item_index'),
  loopId: varchar('loop_id', { length: 100 }), // Parent loop node ID

  // Execution data
  status: varchar('status', { length: 20 }).notNull(), // 'running', 'completed', 'error', 'skipped'
  inputData: jsonb('input_data'),
  outputData: jsonb('output_data'),
  errorData: jsonb('error_data').$type<{
    message: string;
    code?: string;
    stack?: string;
  }>(),

  // Timing
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),

  // Resource usage
  tokensUsed: integer('tokens_used'),
  costUsd: integer('cost_usd'), // In microdollars (1/1000000)

  // Metadata
  metadata: jsonb('metadata').$type<{
    retryCount?: number;
    usedPinnedData?: boolean;
    credentialsUsed?: string[];
    subWorkflowId?: string;
  }>(),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  // Fast lookup by execution
  executionIdx: index('idx_node_logs_execution').on(table.executionId),
  // Fast lookup by workflow
  workflowIdx: index('idx_node_logs_workflow').on(table.workflowId),
  // Fast lookup by node within execution
  executionNodeIdx: index('idx_node_logs_execution_node')
    .on(table.executionId, table.nodeId),
  // CRITICAL: Fast lookup for loop grouping
  runIndexIdx: index('idx_node_logs_run_index')
    .on(table.executionId, table.runIndex),
  batchIndexIdx: index('idx_node_logs_batch_index')
    .on(table.executionId, table.batchIndex),
  // Combined loop context lookup
  loopContextIdx: index('idx_node_logs_loop_context')
    .on(table.executionId, table.loopId, table.runIndex, table.batchIndex),
  // Time-based queries
  startedAtIdx: index('idx_node_logs_started').on(table.startedAt),
}));

// ============================================================================
// EXPRESSION BOOKMARK TABLE
// ============================================================================

/**
 * Expression Bookmarks
 *
 * Saves commonly used expressions for quick access in the expression editor.
 */
export const expressionBookmarks = pgTable('expression_bookmarks', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Ownership
  userId: varchar('user_id', { length: 36 }).notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id')
    .references(() => workspaces.id, { onDelete: 'cascade' }),

  // Expression data
  expression: text('expression').notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  description: text('description'),

  // Categorization
  category: varchar('category', { length: 100 }),
  tags: jsonb('tags').$type<string[]>().default([]),

  // Usage
  usageCount: integer('usage_count').notNull().default(0),
  lastUsedAt: timestamp('last_used_at'),

  // Scope
  isGlobal: boolean('is_global').notNull().default(false), // Shared across workflows

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdx: index('idx_bookmarks_user').on(table.userId),
  workspaceIdx: index('idx_bookmarks_workspace').on(table.workspaceId),
  categoryIdx: index('idx_bookmarks_category').on(table.userId, table.category),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const pinnedNodeDataRelations = relations(pinnedNodeData, ({ one }) => ({
  workflow: one(workflows, {
    fields: [pinnedNodeData.workflowId],
    references: [workflows.id],
  }),
  user: one(users, {
    fields: [pinnedNodeData.userId],
    references: [users.id],
  }),
}));

export const nodeSchemaCacheRelations = relations(nodeSchemaCache, ({ one }) => ({
  workflow: one(workflows, {
    fields: [nodeSchemaCache.workflowId],
    references: [workflows.id],
  }),
  sourceExecution: one(workflowExecutions, {
    fields: [nodeSchemaCache.sourceExecutionId],
    references: [workflowExecutions.id],
  }),
}));

export const workflowNodeLogsRelations = relations(workflowNodeLogs, ({ one }) => ({
  execution: one(workflowExecutions, {
    fields: [workflowNodeLogs.executionId],
    references: [workflowExecutions.id],
  }),
  workflow: one(workflows, {
    fields: [workflowNodeLogs.workflowId],
    references: [workflows.id],
  }),
}));

export const expressionBookmarksRelations = relations(expressionBookmarks, ({ one }) => ({
  user: one(users, {
    fields: [expressionBookmarks.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [expressionBookmarks.workspaceId],
    references: [workspaces.id],
  }),
}));

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * JSON Schema Definition (subset for our use case)
 */
export interface JSONSchemaDefinition {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'integer';
  title?: string;
  description?: string;
  properties?: Record<string, JSONSchemaDefinition>;
  items?: JSONSchemaDefinition;
  required?: string[];
  additionalProperties?: boolean | JSONSchemaDefinition;
  enum?: unknown[];
  default?: unknown;
  examples?: unknown[];
  format?: string;
  // Extended for autocomplete
  $flowentMeta?: {
    path: string;
    label?: string;
    category?: string;
    priority?: number;
  };
}

/**
 * Variable path for autocomplete
 */
export interface VariablePath {
  path: string;           // e.g., "$node.hubspot.output.properties.email"
  type: string;           // e.g., "string", "number", "object"
  label: string;          // Human-readable label
  description?: string;   // Help text
  example?: unknown;      // Sample value
  category?: string;      // For grouping in UI
  priority?: number;      // For sorting (higher = more important)
  deprecated?: boolean;   // Mark as deprecated
}

/**
 * Schema discovery result
 */
export interface SchemaDiscoveryResult {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  schema: JSONSchemaDefinition;
  paths: VariablePath[];
  source: 'execution' | 'pinned' | 'inferred' | 'template';
  confidence: number;
  timestamp: Date;
}

/**
 * Pinned data with metadata
 */
export interface PinnedDataWithMeta {
  id: string;
  workflowId: string;
  nodeId: string;
  mode: 'always' | 'on_error' | 'development' | 'disabled';
  isEnabled: boolean;
  output: unknown;
  schema?: JSONSchemaDefinition;
  label?: string;
  description?: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Execution history grouped by loop
 */
export interface LoopExecutionGroup {
  loopId: string;
  loopName: string;
  runIndex: number;
  batchIndex?: number;
  status: 'completed' | 'running' | 'error';
  nodeCount: number;
  duration: number;
  startedAt: Date;
  completedAt?: Date;
  nodes: NodeExecutionLog[];
}

/**
 * Node execution log entry
 */
export interface NodeExecutionLog {
  id: string;
  nodeId: string;
  nodeName?: string;
  nodeType?: string;
  status: string;
  runIndex: number;
  batchIndex?: number;
  itemIndex?: number;
  input?: unknown;
  output?: unknown;
  error?: {
    message: string;
    code?: string;
  };
  duration?: number;
  startedAt: Date;
  completedAt?: Date;
  metadata?: {
    usedPinnedData?: boolean;
    retryCount?: number;
  };
}

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type PinnedNodeDataRecord = typeof pinnedNodeData.$inferSelect;
export type NewPinnedNodeDataRecord = typeof pinnedNodeData.$inferInsert;

export type NodeSchemaCacheRecord = typeof nodeSchemaCache.$inferSelect;
export type NewNodeSchemaCacheRecord = typeof nodeSchemaCache.$inferInsert;

export type NodeTypeSchemaTemplateRecord = typeof nodeTypeSchemaTemplates.$inferSelect;
export type NewNodeTypeSchemaTemplateRecord = typeof nodeTypeSchemaTemplates.$inferInsert;

export type WorkflowNodeLogRecord = typeof workflowNodeLogs.$inferSelect;
export type NewWorkflowNodeLogRecord = typeof workflowNodeLogs.$inferInsert;

export type ExpressionBookmarkRecord = typeof expressionBookmarks.$inferSelect;
export type NewExpressionBookmarkRecord = typeof expressionBookmarks.$inferInsert;

export type PinMode = 'always' | 'on_error' | 'development' | 'disabled';
export type SchemaSource = 'execution' | 'pinned' | 'inferred' | 'manual' | 'template';
