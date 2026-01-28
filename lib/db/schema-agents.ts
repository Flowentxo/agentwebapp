/**
 * PHASE 2: Database Schema - Agent Tables
 * Drizzle ORM Schema für Agent-Daten
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  numeric,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ============================================
// AGENT EXECUTIONS
// Tracks all agent tool executions
// ============================================

export const agentExecutions = pgTable(
  'agent_executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: varchar('agent_id', { length: 50 }).notNull(),
    userId: uuid('user_id').notNull(),
    workspaceId: uuid('workspace_id').notNull(),
    toolName: varchar('tool_name', { length: 100 }),
    input: jsonb('input').notNull(),
    output: jsonb('output'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    errorMessage: text('error_message'),
    executionTimeMs: integer('execution_time_ms'),
    tokensUsed: integer('tokens_used'),
    cost: numeric('cost', { precision: 10, scale: 6 }),
    retryCount: integer('retry_count').default(0),
    parentExecutionId: uuid('parent_execution_id'),
    correlationId: varchar('correlation_id', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow(),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
  },
  (table) => ({
    agentIdIdx: index('idx_agent_exec_agent').on(table.agentId),
    userIdIdx: index('idx_agent_exec_user').on(table.userId),
    workspaceIdIdx: index('idx_agent_exec_workspace').on(table.workspaceId),
    statusIdx: index('idx_agent_exec_status').on(table.status),
    createdAtIdx: index('idx_agent_exec_created').on(table.createdAt),
    correlationIdx: index('idx_agent_exec_correlation').on(table.correlationId),
  })
);

// ============================================
// AGENT CONVERSATIONS
// Stores chat history with agents
// ============================================

export const agentConversations = pgTable(
  'agent_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: varchar('agent_id', { length: 50 }).notNull(),
    userId: uuid('user_id').notNull(),
    workspaceId: uuid('workspace_id').notNull(),
    sessionId: varchar('session_id', { length: 100 }).notNull(),
    messages: jsonb('messages').notNull().default([]),
    context: jsonb('context'),
    summary: text('summary'),
    isActive: boolean('is_active').default(true),
    messageCount: integer('message_count').default(0),
    totalTokens: integer('total_tokens').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    lastMessageAt: timestamp('last_message_at'),
  },
  (table) => ({
    sessionIdIdx: index('idx_agent_conv_session').on(table.sessionId),
    userIdIdx: index('idx_agent_conv_user').on(table.userId),
    workspaceIdIdx: index('idx_agent_conv_workspace').on(table.workspaceId),
    agentUserIdx: index('idx_agent_conv_agent_user').on(table.agentId, table.userId),
    activeIdx: index('idx_agent_conv_active').on(table.isActive),
  })
);

// ============================================
// AGENT TOOLS REGISTRY
// Registered tools for each agent
// ============================================

export const agentTools = pgTable(
  'agent_tools',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: varchar('agent_id', { length: 50 }).notNull(),
    toolName: varchar('tool_name', { length: 100 }).notNull(),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 50 }),
    inputSchema: jsonb('input_schema').notNull(),
    outputSchema: jsonb('output_schema'),
    isEnabled: boolean('is_enabled').default(true),
    requiresAuth: boolean('requires_auth').default(false),
    requiredIntegrations: jsonb('required_integrations').default([]),
    rateLimitPerMinute: integer('rate_limit_per_minute'),
    timeout: integer('timeout'), // ms
    version: varchar('version', { length: 20 }).default('1.0.0'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    agentToolUnique: uniqueIndex('idx_agent_tools_unique').on(table.agentId, table.toolName),
    categoryIdx: index('idx_agent_tools_category').on(table.category),
    enabledIdx: index('idx_agent_tools_enabled').on(table.isEnabled),
  })
);

// ============================================
// AGENT PERMISSIONS
// Role-based access control for agents and tools
// ============================================

export const agentPermissions = pgTable(
  'agent_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: varchar('agent_id', { length: 50 }).notNull(),
    roleId: varchar('role_id', { length: 50 }).notNull(),
    toolName: varchar('tool_name', { length: 100 }), // null = all tools
    canExecute: boolean('can_execute').default(true),
    canViewHistory: boolean('can_view_history').default(true),
    canConfigure: boolean('can_configure').default(false),
    dataScope: varchar('data_scope', { length: 50 }).default('own'), // own, team, workspace, all
    maxExecutionsPerDay: integer('max_executions_per_day'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    permissionUnique: uniqueIndex('idx_agent_perm_unique').on(
      table.agentId,
      table.roleId,
      table.toolName
    ),
    roleIdx: index('idx_agent_perm_role').on(table.roleId),
  })
);

// ============================================
// AGENT AUDIT LOGS
// Detailed audit trail for compliance
// ============================================

export const agentAuditLogs = pgTable(
  'agent_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: varchar('agent_id', { length: 50 }).notNull(),
    userId: uuid('user_id').notNull(),
    workspaceId: uuid('workspace_id').notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    toolName: varchar('tool_name', { length: 100 }),
    input: jsonb('input'),
    output: jsonb('output'),
    success: boolean('success').notNull(),
    errorCode: varchar('error_code', { length: 50 }),
    errorMessage: text('error_message'),
    executionTimeMs: integer('execution_time_ms'),
    tokensUsed: integer('tokens_used'),
    cost: numeric('cost', { precision: 10, scale: 6 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    correlationId: varchar('correlation_id', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    agentIdIdx: index('idx_audit_agent').on(table.agentId),
    userIdIdx: index('idx_audit_user').on(table.userId),
    workspaceIdIdx: index('idx_audit_workspace').on(table.workspaceId),
    actionIdx: index('idx_audit_action').on(table.action),
    createdAtIdx: index('idx_audit_created').on(table.createdAt),
    successIdx: index('idx_audit_success').on(table.success),
  })
);

// ============================================
// AGENT CONFIGURATIONS
// Per-workspace agent configurations
// ============================================

export const agentConfigurations = pgTable(
  'agent_configurations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: varchar('agent_id', { length: 50 }).notNull(),
    workspaceId: uuid('workspace_id').notNull(),
    isEnabled: boolean('is_enabled').default(true),
    customPrompt: text('custom_prompt'),
    temperature: numeric('temperature', { precision: 3, scale: 2 }).default('0.7'),
    maxTokens: integer('max_tokens').default(2000),
    preferredModel: varchar('preferred_model', { length: 100 }),
    rateLimitOverride: integer('rate_limit_override'),
    enabledTools: jsonb('enabled_tools'), // null = all tools
    disabledTools: jsonb('disabled_tools').default([]),
    customSettings: jsonb('custom_settings').default({}),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    configUnique: uniqueIndex('idx_agent_config_unique').on(table.agentId, table.workspaceId),
    enabledIdx: index('idx_agent_config_enabled').on(table.isEnabled),
  })
);

// ============================================
// AGENT USAGE METRICS
// Aggregated usage statistics
// ============================================

export const agentUsageMetrics = pgTable(
  'agent_usage_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: varchar('agent_id', { length: 50 }).notNull(),
    workspaceId: uuid('workspace_id').notNull(),
    date: timestamp('date').notNull(),
    totalExecutions: integer('total_executions').default(0),
    successfulExecutions: integer('successful_executions').default(0),
    failedExecutions: integer('failed_executions').default(0),
    totalTokens: integer('total_tokens').default(0),
    totalCost: numeric('total_cost', { precision: 12, scale: 6 }).default('0'),
    avgExecutionTimeMs: integer('avg_execution_time_ms'),
    uniqueUsers: integer('unique_users').default(0),
    topTools: jsonb('top_tools').default([]),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    metricsUnique: uniqueIndex('idx_agent_metrics_unique').on(
      table.agentId,
      table.workspaceId,
      table.date
    ),
    dateIdx: index('idx_agent_metrics_date').on(table.date),
  })
);

// ============================================
// SCHEDULED AGENT TASKS
// For recurring agent executions
// ============================================

export const agentScheduledTasks = pgTable(
  'agent_scheduled_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: varchar('agent_id', { length: 50 }).notNull(),
    workspaceId: uuid('workspace_id').notNull(),
    userId: uuid('user_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    toolName: varchar('tool_name', { length: 100 }).notNull(),
    input: jsonb('input').notNull(),
    cronExpression: varchar('cron_expression', { length: 100 }).notNull(),
    timezone: varchar('timezone', { length: 50 }).default('Europe/Berlin'),
    isActive: boolean('is_active').default(true),
    lastRunAt: timestamp('last_run_at'),
    nextRunAt: timestamp('next_run_at'),
    lastRunStatus: varchar('last_run_status', { length: 20 }),
    lastRunError: text('last_run_error'),
    runCount: integer('run_count').default(0),
    failCount: integer('fail_count').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    activeIdx: index('idx_scheduled_active').on(table.isActive),
    nextRunIdx: index('idx_scheduled_next_run').on(table.nextRunAt),
    workspaceIdx: index('idx_scheduled_workspace').on(table.workspaceId),
  })
);

// Type exports for use in application code
export type AgentExecution = typeof agentExecutions.$inferSelect;
export type NewAgentExecution = typeof agentExecutions.$inferInsert;

export type AgentConversation = typeof agentConversations.$inferSelect;
export type NewAgentConversation = typeof agentConversations.$inferInsert;

export type AgentTool = typeof agentTools.$inferSelect;
export type NewAgentTool = typeof agentTools.$inferInsert;

export type AgentPermission = typeof agentPermissions.$inferSelect;
export type NewAgentPermission = typeof agentPermissions.$inferInsert;

export type AgentAuditLog = typeof agentAuditLogs.$inferSelect;
export type NewAgentAuditLog = typeof agentAuditLogs.$inferInsert;

export type AgentConfiguration = typeof agentConfigurations.$inferSelect;
export type NewAgentConfiguration = typeof agentConfigurations.$inferInsert;

export type AgentUsageMetric = typeof agentUsageMetrics.$inferSelect;
export type NewAgentUsageMetric = typeof agentUsageMetrics.$inferInsert;

export type AgentScheduledTask = typeof agentScheduledTasks.$inferSelect;
export type NewAgentScheduledTask = typeof agentScheduledTasks.$inferInsert;
