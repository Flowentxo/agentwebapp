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

/**
 * WORKFLOW SCHEMA
 *
 * Database schema for Agent Studio workflows, templates, and versions
 */

// Enums
export const workflowStatusEnum = pgEnum('workflow_status', [
  'draft',
  'active',
  'archived'
]);

export const workflowVisibilityEnum = pgEnum('workflow_visibility', [
  'private',
  'team',
  'public'
]);

export const templateCategoryEnum = pgEnum('template_category', [
  'customer-support',
  'data-analysis',
  'content-generation',
  'automation',
  'research',
  'sales',
  'marketing',
  'other'
]);

export const templateComplexityEnum = pgEnum('template_complexity', [
  'beginner',
  'intermediate',
  'advanced'
]);

export const executionStatusEnum = pgEnum('execution_status', [
  'pending',
  'running',
  'success',
  'error',
  'suspended' // Workflow is waiting for human approval
]);

// Workflows Table
export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Basic Info
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  // Workflow Data (nodes & edges from React Flow)
  nodes: jsonb('nodes').$type<any[]>().notNull().default([]),
  edges: jsonb('edges').$type<any[]>().notNull().default([]),
  viewport: jsonb('viewport').$type<{ x: number; y: number; zoom: number }>().default({ x: 0, y: 0, zoom: 1 }),

  // Metadata
  status: workflowStatusEnum('status').notNull().default('draft'),
  visibility: workflowVisibilityEnum('visibility').notNull().default('private'),
  isTemplate: boolean('is_template').notNull().default(false),
  templateCategory: templateCategoryEnum('template_category'),

  // Tags & Search
  tags: jsonb('tags').$type<string[]>().notNull().default([]),

  // ============================================
  // ENTERPRISE TEMPLATE FIELDS
  // ============================================

  // Business Value Proposition
  roiBadge: varchar('roi_badge', { length: 100 }), // e.g., "⏱️ Spart 2h/Woche"
  businessBenefit: text('business_benefit'), // German business benefit description

  // Template Complexity & Setup
  complexity: templateComplexityEnum('complexity').default('beginner'),
  estimatedSetupMinutes: integer('estimated_setup_minutes').default(5),

  // Social Proof & Discovery
  isFeatured: boolean('is_featured').default(false),
  downloadCount: integer('download_count').default(0),
  rating: numeric('rating', { precision: 2, scale: 1 }).default('0.0'),
  ratingCount: integer('rating_count').default(0),

  // Visual Customization
  iconName: varchar('icon_name', { length: 50 }).default('Zap'), // Lucide icon name
  colorAccent: varchar('color_accent', { length: 20 }).default('#8B5CF6'), // Hex color

  // Use Case Targeting
  targetAudience: jsonb('target_audience').$type<string[]>().default([]), // ['sales-team', 'solopreneurs']
  useCases: jsonb('use_cases').$type<string[]>().default([]), // ['lead-generation', 'customer-onboarding']

  // ============================================
  // END ENTERPRISE TEMPLATE FIELDS
  // ============================================

  // Ownership
  userId: varchar('user_id', { length: 255 }).notNull(),
  workspaceId: varchar('workspace_id', { length: 255 }),

  // Version Control
  version: varchar('version', { length: 50 }).notNull().default('1.0.0'),
  parentWorkflowId: uuid('parent_workflow_id'), // For templates/clones

  // ============================================
  // DEPLOYMENT / PRODUCTION FIELDS
  // ============================================
  isPublished: boolean('is_published').notNull().default(false),
  webhookSecret: varchar('webhook_secret', { length: 64 }), // Unique token for webhook auth
  publishedVersion: integer('published_version').default(0),
  publishedNodes: jsonb('published_nodes').$type<any[]>(), // Snapshot of nodes when published
  publishedEdges: jsonb('published_edges').$type<any[]>(), // Snapshot of edges when published
  requireAuth: boolean('require_auth').notNull().default(true), // Require secret in header
  webhookUrl: varchar('webhook_url', { length: 500 }), // Cached full webhook URL

  // Phase 8: Enhanced Version Control
  // Reference to the currently published version in pipeline_versions table
  publishedVersionId: uuid('published_version_id'), // FK to pipeline_versions (nullable)
  // Live status for production control: 'active', 'inactive', 'archived'
  liveStatus: varchar('live_status', { length: 20 }).default('inactive'),
  // ============================================
  // END DEPLOYMENT FIELDS
  // ============================================

  // Statistics
  executionCount: integer('execution_count').notNull().default(0),
  lastExecutedAt: timestamp('last_executed_at'),
  productionExecutionCount: integer('production_execution_count').default(0), // Non-test executions

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  publishedAt: timestamp('published_at'),
}, (table) => ({
  userIdIdx: index('workflow_user_id_idx').on(table.userId),
  workspaceIdIdx: index('workflow_workspace_id_idx').on(table.workspaceId),
  statusIdx: index('workflow_status_idx').on(table.status),
  isTemplateIdx: index('workflow_is_template_idx').on(table.isTemplate),
  templateCategoryIdx: index('workflow_template_category_idx').on(table.templateCategory),
  tagsIdx: index('workflow_tags_idx').using('gin', table.tags),
  updatedAtIdx: index('workflow_updated_at_idx').on(table.updatedAt),
  // Enterprise template indexes
  isFeaturedIdx: index('workflow_is_featured_idx').on(table.isFeatured),
  complexityIdx: index('workflow_complexity_idx').on(table.complexity),
  downloadCountIdx: index('workflow_download_count_idx').on(table.downloadCount),
  ratingIdx: index('workflow_rating_idx').on(table.rating),
  // Deployment indexes
  isPublishedIdx: index('workflow_is_published_idx').on(table.isPublished),
  webhookSecretIdx: index('workflow_webhook_secret_idx').on(table.webhookSecret),
  // Phase 8: Version control indexes
  liveStatusIdx: index('workflow_live_status_idx').on(table.liveStatus),
  publishedVersionIdIdx: index('workflow_published_version_id_idx').on(table.publishedVersionId),
}));

// Workflow Versions Table (for version history)
export const workflowVersions = pgTable('workflow_versions', {
  id: uuid('id').primaryKey().defaultRandom(),

  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),

  // Snapshot Data
  version: varchar('version', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  nodes: jsonb('nodes').$type<any[]>().notNull(),
  edges: jsonb('edges').$type<any[]>().notNull(),

  // Change Info
  changeDescription: text('change_description'),
  createdBy: varchar('created_by', { length: 255 }).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  workflowIdIdx: index('workflow_version_workflow_id_idx').on(table.workflowId),
  versionIdx: index('workflow_version_version_idx').on(table.workflowId, table.version),
  createdAtIdx: index('workflow_version_created_at_idx').on(table.createdAt),
}));

// Workflow Executions Table (for tracking test runs and live executions)
export const workflowExecutions = pgTable('workflow_executions', {
  id: uuid('id').primaryKey().defaultRandom(),

  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),

  // Execution Data
  input: jsonb('input').$type<any>(),
  output: jsonb('output').$type<any>(),
  logs: jsonb('logs').$type<any[]>().notNull().default([]),

  // Status
  status: executionStatusEnum('status').notNull().default('pending'),
  error: text('error'),

  // Performance Metrics
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  durationMs: jsonb('duration_ms').$type<number>(),

  // Context
  userId: varchar('user_id', { length: 255 }).notNull(),
  isTest: boolean('is_test').notNull().default(false),

  // =============================================================================
  // SUSPENSION ENHANCEMENT FIELDS
  // =============================================================================
  // Complete serialized execution state for server-restart safe resumption
  suspendedState: jsonb('suspended_state').$type<any>(),
  // Last activity timestamp for zombie detection (updated every 30s during execution)
  lastHeartbeat: timestamp('last_heartbeat'),
  // Timestamp when execution was suspended for human approval
  suspendedAt: timestamp('suspended_at'),
  // Secure token required to resume execution (prevents unauthorized resumption)
  resumeToken: varchar('resume_token', { length: 64 }),
  // =============================================================================

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  workflowIdIdx: index('workflow_execution_workflow_id_idx').on(table.workflowId),
  userIdIdx: index('workflow_execution_user_id_idx').on(table.userId),
  statusIdx: index('workflow_execution_status_idx').on(table.status),
  createdAtIdx: index('workflow_execution_created_at_idx').on(table.createdAt),
}));

// Workflow Shares Table (for sharing workflows with teams/users)
export const workflowShares = pgTable('workflow_shares', {
  id: uuid('id').primaryKey().defaultRandom(),

  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),

  // Share Target
  sharedWithUserId: varchar('shared_with_user_id', { length: 255 }),
  sharedWithTeamId: varchar('shared_with_team_id', { length: 255 }),

  // Permissions
  canEdit: boolean('can_edit').notNull().default(false),
  canExecute: boolean('can_execute').notNull().default(true),
  canShare: boolean('can_share').notNull().default(false),

  // Context
  sharedBy: varchar('shared_by', { length: 255 }).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  workflowIdIdx: index('workflow_share_workflow_id_idx').on(table.workflowId),
  sharedWithUserIdx: index('workflow_share_user_idx').on(table.sharedWithUserId),
  sharedWithTeamIdx: index('workflow_share_team_idx').on(table.sharedWithTeamId),
}));

// =============================================================================
// WORKFLOW NODE LOGS TABLE
// =============================================================================
// Detailed per-node execution logs for live debugging and analytics

export const nodeLogStatusEnum = pgEnum('node_log_status', [
  'started',
  'running',
  'success',
  'error',
  'skipped',
  'waiting', // For human approval nodes
]);

export const workflowNodeLogs = pgTable('workflow_node_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Keys
  executionId: uuid('execution_id').notNull().references(() => workflowExecutions.id, { onDelete: 'cascade' }),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),

  // Node Identification
  nodeId: varchar('node_id', { length: 100 }).notNull(), // React Flow node ID
  nodeType: varchar('node_type', { length: 50 }).notNull(), // trigger, condition, llm-agent, etc.
  nodeName: varchar('node_name', { length: 255 }), // Human-readable node label

  // Execution Data
  status: nodeLogStatusEnum('status').notNull().default('started'),
  input: jsonb('input').$type<any>(), // Input data passed to node
  output: jsonb('output').$type<any>(), // Output data from node
  error: text('error'), // Error message if failed

  // Performance Metrics
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),

  // Cost Tracking (for AI nodes)
  tokensUsed: integer('tokens_used'),
  costUsd: numeric('cost_usd', { precision: 10, scale: 6 }),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(), // Extra context data
  retryCount: integer('retry_count').default(0),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  executionIdIdx: index('workflow_node_log_execution_id_idx').on(table.executionId),
  workflowIdIdx: index('workflow_node_log_workflow_id_idx').on(table.workflowId),
  nodeIdIdx: index('workflow_node_log_node_id_idx').on(table.nodeId),
  statusIdx: index('workflow_node_log_status_idx').on(table.status),
  startedAtIdx: index('workflow_node_log_started_at_idx').on(table.startedAt),
  // Composite index for efficient queries
  executionNodeIdx: index('workflow_node_log_execution_node_idx').on(table.executionId, table.nodeId),
}));

// =============================================================================
// WORKFLOW APPROVAL REQUESTS TABLE
// =============================================================================
// Human-in-the-loop approval system for workflows

export const approvalStatusEnum = pgEnum('approval_status', [
  'pending',
  'approved',
  'rejected',
  'expired'
]);

export const workflowApprovalRequests = pgTable('workflow_approval_requests', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Keys
  executionId: uuid('execution_id').notNull().references(() => workflowExecutions.id, { onDelete: 'cascade' }),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  nodeId: varchar('node_id', { length: 100 }).notNull(), // The approval node ID

  // Request Data
  status: approvalStatusEnum('status').notNull().default('pending'),
  title: varchar('title', { length: 255 }).notNull(), // "Workflow #123 requires approval"
  message: text('message'), // Custom approval message from node config

  // Context Data (what's being approved)
  contextData: jsonb('context_data').$type<Record<string, any>>(), // Previous node outputs, etc.
  previewData: jsonb('preview_data').$type<{
    type: string; // 'email', 'api_call', 'database', etc.
    summary: string;
    details: Record<string, any>;
  }>(),

  // Suspended State (for resuming)
  suspendedState: jsonb('suspended_state').$type<{
    variables: Record<string, any>;
    nodeOutputs: Record<string, any>;
    currentNodeId: string;
  }>(),

  // Assignment
  assignedUserId: varchar('assigned_user_id', { length: 255 }), // Specific user or null = owner

  // Resolution
  resolvedBy: varchar('resolved_by', { length: 255 }),
  resolvedAt: timestamp('resolved_at'),
  rejectionReason: text('rejection_reason'),

  // Expiration
  expiresAt: timestamp('expires_at'), // Optional timeout

  // Inbox Integration
  inboxThreadId: varchar('inbox_thread_id', { length: 255 }), // Link to inbox thread
  inboxMessageId: varchar('inbox_message_id', { length: 255 }), // Link to specific message

  // =============================================================================
  // SMART CLEANUP ENHANCEMENT FIELDS
  // =============================================================================
  // Action to take on timeout: 'none', 'approve', or 'reject' (default)
  autoAction: varchar('auto_action', { length: 20 }).default('reject'),
  // Whether the initial notification was sent successfully
  notificationSent: boolean('notification_sent').default(false),
  // Number of reminder notifications sent
  reminderCount: integer('reminder_count').default(0),
  // Timestamp of last reminder notification
  lastReminderAt: timestamp('last_reminder_at'),
  // =============================================================================

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  executionIdIdx: index('approval_execution_id_idx').on(table.executionId),
  workflowIdIdx: index('approval_workflow_id_idx').on(table.workflowId),
  statusIdx: index('approval_status_idx').on(table.status),
  assignedUserIdx: index('approval_assigned_user_idx').on(table.assignedUserId),
  createdAtIdx: index('approval_created_at_idx').on(table.createdAt),
  // Find pending approvals for a user
  pendingForUserIdx: index('approval_pending_for_user_idx').on(table.assignedUserId, table.status),
}));

// Export types
export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;
export type WorkflowVersion = typeof workflowVersions.$inferSelect;
export type NewWorkflowVersion = typeof workflowVersions.$inferInsert;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type NewWorkflowExecution = typeof workflowExecutions.$inferInsert;
export type WorkflowShare = typeof workflowShares.$inferSelect;
export type NewWorkflowShare = typeof workflowShares.$inferInsert;
export type WorkflowNodeLog = typeof workflowNodeLogs.$inferSelect;
export type NewWorkflowNodeLog = typeof workflowNodeLogs.$inferInsert;
export type WorkflowApprovalRequest = typeof workflowApprovalRequests.$inferSelect;
export type NewWorkflowApprovalRequest = typeof workflowApprovalRequests.$inferInsert;
