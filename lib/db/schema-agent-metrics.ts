/**
 * AGENT METRICS SCHEMA
 *
 * Tracks agent performance, usage statistics, ratings, and real-time status
 */

import { pgTable, uuid, varchar, integer, timestamp, text, numeric, index } from 'drizzle-orm/pg-core';

/**
 * Agent Performance Metrics
 * Tracks request counts, success rates, and response times per agent
 */
export const agentMetrics = pgTable('agent_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: varchar('agent_id', { length: 50 }).notNull(),
  userId: varchar('user_id', { length: 255 }), // Optional: per-user metrics

  // Request Statistics
  requestCount: integer('request_count').default(0).notNull(),
  successCount: integer('success_count').default(0).notNull(),
  failedCount: integer('failed_count').default(0).notNull(),

  // Performance
  avgResponseTimeMs: integer('avg_response_time_ms'), // Average response time in milliseconds
  totalTokensUsed: integer('total_tokens_used').default(0),

  // Time Period
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),

  // Metadata
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  agentIdIdx: index('idx_agent_metrics_agent_id').on(table.agentId),
  userIdIdx: index('idx_agent_metrics_user_id').on(table.userId),
  periodIdx: index('idx_agent_metrics_period').on(table.periodStart, table.periodEnd)
}));

/**
 * Agent Ratings & Feedback
 * User ratings and feedback for each agent
 */
export const agentRatings = pgTable('agent_ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: varchar('agent_id', { length: 50 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),

  // Rating (1-5 stars)
  rating: integer('rating').notNull(), // CHECK constraint in migration

  // Optional feedback text
  feedback: text('feedback'),

  // Context (which chat/interaction)
  chatSessionId: varchar('chat_session_id', { length: 255 }),

  // Metadata
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  agentIdIdx: index('idx_agent_ratings_agent_id').on(table.agentId),
  userIdIdx: index('idx_agent_ratings_user_id').on(table.userId),
  ratingIdx: index('idx_agent_ratings_rating').on(table.rating)
}));

/**
 * Agent Real-Time Status
 * Current operational status of each agent
 */
export const agentLiveStatus = pgTable('agent_live_status', {
  agentId: varchar('agent_id', { length: 50 }).primaryKey(),

  // Status: online, offline, busy, maintenance
  status: varchar('status', { length: 20 }).default('offline').notNull(),

  // Queue Information
  currentQueueSize: integer('current_queue_size').default(0).notNull(),
  avgWaitTimeSec: integer('avg_wait_time_sec'),

  // Health Check
  lastHeartbeat: timestamp('last_heartbeat'),

  // Metadata
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  statusIdx: index('idx_agent_live_status_status').on(table.status)
}));

/**
 * Agent Request Log
 * Detailed log of every agent request for analytics
 */
export const agentRequestLog = pgTable('agent_request_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: varchar('agent_id', { length: 50 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),

  // Request Details
  chatSessionId: varchar('chat_session_id', { length: 255 }),
  messageContent: text('message_content'),

  // Response Details
  success: integer('success').default(1).notNull(), // 1 = success, 0 = failed
  responseTimeMs: integer('response_time_ms'),
  tokensUsed: integer('tokens_used'),

  // Error Info (if failed)
  errorMessage: text('error_message'),

  // Metadata
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  agentIdIdx: index('idx_agent_request_log_agent_id').on(table.agentId),
  userIdIdx: index('idx_agent_request_log_user_id').on(table.userId),
  sessionIdx: index('idx_agent_request_log_session').on(table.chatSessionId),
  createdAtIdx: index('idx_agent_request_log_created').on(table.createdAt)
}));

/**
 * Agent Usage Summary (Aggregated)
 * Pre-aggregated hourly/daily statistics for fast queries
 */
export const agentUsageSummary = pgTable('agent_usage_summary', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: varchar('agent_id', { length: 50 }).notNull(),

  // Time Period
  period: varchar('period', { length: 20 }).notNull(), // 'hourly', 'daily', 'weekly', 'monthly'
  periodKey: varchar('period_key', { length: 50 }).notNull(), // e.g., '2025-11-14', '2025-11-14-15'

  // Aggregated Stats
  totalRequests: integer('total_requests').default(0).notNull(),
  successfulRequests: integer('successful_requests').default(0).notNull(),
  failedRequests: integer('failed_requests').default(0).notNull(),
  avgResponseTimeMs: integer('avg_response_time_ms'),
  totalTokensUsed: integer('total_tokens_used').default(0),
  uniqueUsers: integer('unique_users').default(0),

  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  agentIdIdx: index('idx_agent_usage_summary_agent_id').on(table.agentId),
  periodIdx: index('idx_agent_usage_summary_period').on(table.period, table.periodKey)
}));

/**
 * Type exports for TypeScript
 */
export type AgentMetrics = typeof agentMetrics.$inferSelect;
export type NewAgentMetrics = typeof agentMetrics.$inferInsert;

export type AgentRating = typeof agentRatings.$inferSelect;
export type NewAgentRating = typeof agentRatings.$inferInsert;

export type AgentLiveStatus = typeof agentLiveStatus.$inferSelect;
export type NewAgentLiveStatus = typeof agentLiveStatus.$inferInsert;

export type AgentRequestLog = typeof agentRequestLog.$inferSelect;
export type NewAgentRequestLog = typeof agentRequestLog.$inferInsert;

export type AgentUsageSummary = typeof agentUsageSummary.$inferSelect;
export type NewAgentUsageSummary = typeof agentUsageSummary.$inferInsert;
