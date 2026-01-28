/**
 * Tool Execution Logs Schema
 *
 * Tracks all tool executions by agents for analytics, debugging, and auditing.
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  integer,
  index,
  varchar,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';

// Tool execution status enum
export const toolExecutionStatusEnum = pgEnum('tool_execution_status', [
  'success',
  'error',
  'timeout',
  'cancelled',
]);

/**
 * Tool Execution Logs Table
 *
 * Records every tool execution by an agent, including:
 * - Which tool was called
 * - Arguments passed
 * - Result returned
 * - Timing information
 * - Error details if failed
 */
export const toolExecutionLogs = pgTable('tool_execution_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Who triggered the tool
  userId: varchar('user_id', { length: 255 }).notNull(),
  workspaceId: varchar('workspace_id', { length: 255 }),
  sessionId: varchar('session_id', { length: 255 }),

  // Which agent and tool
  agentId: varchar('agent_id', { length: 100 }).notNull(),
  toolName: varchar('tool_name', { length: 100 }).notNull(),

  // Tool call details
  toolCallId: varchar('tool_call_id', { length: 255 }),
  arguments: jsonb('arguments').$type<Record<string, any>>().notNull().default({}),

  // Execution result
  status: toolExecutionStatusEnum('status').notNull().default('success'),
  success: boolean('success').notNull().default(true),
  result: jsonb('result').$type<{
    success: boolean;
    data?: any;
    error?: string;
    summary: string;
  }>(),
  errorMessage: text('error_message'),
  errorType: varchar('error_type', { length: 100 }),

  // Timing
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  executionTimeMs: integer('execution_time_ms'),

  // Context
  conversationId: varchar('conversation_id', { length: 255 }),
  messageId: varchar('message_id', { length: 255 }),
  traceId: varchar('trace_id', { length: 255 }),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),

  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('tool_log_user_id_idx').on(table.userId),
  agentIdIdx: index('tool_log_agent_id_idx').on(table.agentId),
  toolNameIdx: index('tool_log_tool_name_idx').on(table.toolName),
  statusIdx: index('tool_log_status_idx').on(table.status),
  createdAtIdx: index('tool_log_created_at_idx').on(table.createdAt),
  sessionIdx: index('tool_log_session_idx').on(table.sessionId),
  traceIdx: index('tool_log_trace_idx').on(table.traceId),
}));

/**
 * Tool Usage Statistics Table
 *
 * Aggregated statistics for tool usage analytics.
 * Updated periodically from tool_execution_logs.
 */
export const toolUsageStats = pgTable('tool_usage_stats', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Aggregation period
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  periodType: varchar('period_type', { length: 20 }).notNull(), // 'hourly', 'daily', 'weekly', 'monthly'

  // Dimensions
  agentId: varchar('agent_id', { length: 100 }).notNull(),
  toolName: varchar('tool_name', { length: 100 }).notNull(),
  userId: varchar('user_id', { length: 255 }),

  // Metrics
  totalCalls: integer('total_calls').notNull().default(0),
  successfulCalls: integer('successful_calls').notNull().default(0),
  failedCalls: integer('failed_calls').notNull().default(0),
  timeoutCalls: integer('timeout_calls').notNull().default(0),

  // Timing stats (in milliseconds)
  avgExecutionTimeMs: integer('avg_execution_time_ms'),
  minExecutionTimeMs: integer('min_execution_time_ms'),
  maxExecutionTimeMs: integer('max_execution_time_ms'),
  p50ExecutionTimeMs: integer('p50_execution_time_ms'),
  p95ExecutionTimeMs: integer('p95_execution_time_ms'),
  p99ExecutionTimeMs: integer('p99_execution_time_ms'),

  // Error distribution
  errorCounts: jsonb('error_counts').$type<Record<string, number>>().default({}),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  periodIdx: index('tool_stats_period_idx').on(table.periodStart, table.periodEnd),
  agentToolIdx: index('tool_stats_agent_tool_idx').on(table.agentId, table.toolName),
  periodTypeIdx: index('tool_stats_period_type_idx').on(table.periodType),
}));

// Export types
export type ToolExecutionLog = typeof toolExecutionLogs.$inferSelect;
export type NewToolExecutionLog = typeof toolExecutionLogs.$inferInsert;
export type ToolUsageStat = typeof toolUsageStats.$inferSelect;
export type NewToolUsageStat = typeof toolUsageStats.$inferInsert;
