/**
 * ANALYTICS SCHEMA
 * Track agent performance, usage, and costs
 *
 * Philosophy: "What gets measured gets improved"
 * - Track everything that matters
 * - Make data queryable and aggregatable
 * - Enable real-time insights
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  decimal,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Agent Usage Events
 * Track every interaction with an agent
 */
export const agentUsageEvents = pgTable(
  'agent_usage_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Agent & User
    agentId: varchar('agent_id', { length: 255 }).notNull(),
    userId: varchar('user_id', { length: 255 }).notNull(),
    sessionId: varchar('session_id', { length: 255 }).notNull(), // Group messages into sessions

    // Event Type
    eventType: varchar('event_type', { length: 50 }).notNull(), // 'message', 'session_start', 'session_end', 'error'

    // Message Details (for 'message' events)
    messageRole: varchar('message_role', { length: 20 }), // 'user' | 'assistant'
    messageContent: text('message_content'),
    messageTokens: integer('message_tokens'),

    // Performance Metrics
    responseTimeMs: integer('response_time_ms'), // How long did the agent take to respond?
    tokensPrompt: integer('tokens_prompt'),
    tokensCompletion: integer('tokens_completion'),
    tokensTotal: integer('tokens_total'),

    // Cost Tracking
    costUsd: decimal('cost_usd', { precision: 10, scale: 6 }), // Cost in USD

    // Model Info
    model: varchar('model', { length: 100 }),
    temperature: varchar('temperature', { length: 10 }),

    // Success/Error
    status: varchar('status', { length: 20 }).notNull().default('success'), // 'success' | 'error' | 'timeout'
    errorMessage: text('error_message'),

    // Metadata
    metadata: jsonb('metadata').$type<Record<string, any>>().default(sql`'{}'::jsonb`),

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    agentIdIdx: index('agent_usage_agent_id_idx').on(table.agentId),
    userIdIdx: index('agent_usage_user_id_idx').on(table.userId),
    sessionIdIdx: index('agent_usage_session_id_idx').on(table.sessionId),
    createdAtIdx: index('agent_usage_created_at_idx').on(table.createdAt),
    eventTypeIdx: index('agent_usage_event_type_idx').on(table.eventType),
  })
);

/**
 * Agent Session Summary
 * Pre-aggregated session-level metrics for faster queries
 */
export const agentSessionSummary = pgTable(
  'agent_session_summary',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Session Info
    sessionId: varchar('session_id', { length: 255 }).notNull().unique(),
    agentId: varchar('agent_id', { length: 255 }).notNull(),
    userId: varchar('user_id', { length: 255 }).notNull(),

    // Session Metrics
    messageCount: integer('message_count').notNull().default(0),
    userMessageCount: integer('user_message_count').notNull().default(0),
    assistantMessageCount: integer('assistant_message_count').notNull().default(0),

    // Token Usage
    totalTokens: integer('total_tokens').notNull().default(0),
    totalCostUsd: decimal('total_cost_usd', { precision: 10, scale: 6 }),

    // Performance
    avgResponseTimeMs: integer('avg_response_time_ms'),
    totalDurationMs: integer('total_duration_ms'), // Session end - session start

    // Quality Metrics
    errorCount: integer('error_count').notNull().default(0),
    successRate: decimal('success_rate', { precision: 5, scale: 2 }), // Percentage

    // Timestamps
    sessionStartedAt: timestamp('session_started_at').notNull(),
    sessionEndedAt: timestamp('session_ended_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    agentIdIdx: index('session_summary_agent_id_idx').on(table.agentId),
    userIdIdx: index('session_summary_user_id_idx').on(table.userId),
    sessionStartedAtIdx: index('session_summary_started_at_idx').on(table.sessionStartedAt),
  })
);

/**
 * Agent Daily Metrics
 * Pre-aggregated daily metrics for each agent
 */
export const agentDailyMetrics = pgTable(
  'agent_daily_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Agent & Date
    agentId: varchar('agent_id', { length: 255 }).notNull(),
    date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD

    // Usage Metrics
    totalSessions: integer('total_sessions').notNull().default(0),
    totalMessages: integer('total_messages').notNull().default(0),
    totalUsers: integer('total_users').notNull().default(0), // Unique users

    // Token & Cost
    totalTokens: integer('total_tokens').notNull().default(0),
    totalCostUsd: decimal('total_cost_usd', { precision: 10, scale: 6 }),

    // Performance
    avgResponseTimeMs: integer('avg_response_time_ms'),
    avgSessionDurationMs: integer('avg_session_duration_ms'),

    // Quality
    successRate: decimal('success_rate', { precision: 5, scale: 2 }),
    errorCount: integer('error_count').notNull().default(0),

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    agentDateIdx: index('daily_metrics_agent_date_idx').on(table.agentId, table.date),
    dateIdx: index('daily_metrics_date_idx').on(table.date),
  })
);

/**
 * Agent Performance Snapshots
 * Current state of each agent's performance (real-time)
 */
export const agentPerformanceSnapshot = pgTable(
  'agent_performance_snapshot',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Agent
    agentId: varchar('agent_id', { length: 255 }).notNull().unique(),

    // All-Time Metrics
    totalSessions: integer('total_sessions').notNull().default(0),
    totalMessages: integer('total_messages').notNull().default(0),
    totalUsers: integer('total_users').notNull().default(0),
    totalTokens: integer('total_tokens').notNull().default(0),
    totalCostUsd: decimal('total_cost_usd', { precision: 10, scale: 6 }),

    // Last 24h Metrics
    last24hSessions: integer('last_24h_sessions').notNull().default(0),
    last24hMessages: integer('last_24h_messages').notNull().default(0),
    last24hUsers: integer('last_24h_users').notNull().default(0),

    // Last 7d Metrics
    last7dSessions: integer('last_7d_sessions').notNull().default(0),
    last7dMessages: integer('last_7d_messages').notNull().default(0),
    last7dUsers: integer('last_7d_users').notNull().default(0),

    // Last 30d Metrics
    last30dSessions: integer('last_30d_sessions').notNull().default(0),
    last30dMessages: integer('last_30d_messages').notNull().default(0),
    last30dUsers: integer('last_30d_users').notNull().default(0),

    // Performance
    avgResponseTimeMs: integer('avg_response_time_ms'),
    avgSessionDurationMs: integer('avg_session_duration_ms'),
    successRate: decimal('success_rate', { precision: 5, scale: 2 }),

    // Timestamps
    firstUsedAt: timestamp('first_used_at'),
    lastUsedAt: timestamp('last_used_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    agentIdIdx: index('performance_snapshot_agent_id_idx').on(table.agentId),
  })
);

// Type exports
export type AgentUsageEvent = typeof agentUsageEvents.$inferSelect;
export type NewAgentUsageEvent = typeof agentUsageEvents.$inferInsert;

export type AgentSessionSummary = typeof agentSessionSummary.$inferSelect;
export type NewAgentSessionSummary = typeof agentSessionSummary.$inferInsert;

export type AgentDailyMetrics = typeof agentDailyMetrics.$inferSelect;
export type NewAgentDailyMetrics = typeof agentDailyMetrics.$inferInsert;

export type AgentPerformanceSnapshot = typeof agentPerformanceSnapshot.$inferSelect;
export type NewAgentPerformanceSnapshot = typeof agentPerformanceSnapshot.$inferInsert;
