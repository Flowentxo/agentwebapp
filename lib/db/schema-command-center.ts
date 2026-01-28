/**
 * COMMAND CENTER - User Analytics & Personalization Schema
 *
 * Tracks user behavior, preferences, and enables AI-powered suggestions
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
  pgEnum,
  boolean,
  real,
} from 'drizzle-orm/pg-core';
import { users } from './schema';

// =====================================================
// COMMAND HISTORY - Track every command execution
// =====================================================

export const commandIntentEnum = pgEnum('command_intent', [
  'analyze',
  'create',
  'send',
  'review',
  'monitor',
  'research',
  'visualize',
  'calculate',
  'write',
  'code',
  'legal',
  'support',
  'collaborate',
  'unknown',
]);

export const commandHistory = pgTable('command_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Command details
  originalText: text('original_text').notNull(),
  intent: commandIntentEnum('intent').notNull(),
  confidence: real('confidence').notNull(), // 0.0 to 1.0

  // Execution
  agentIds: jsonb('agent_ids').$type<string[]>().notNull().default([]),
  parameters: jsonb('parameters').$type<Record<string, any>>().notNull().default({}),

  // Results
  executedSuccessfully: boolean('executed_successfully').notNull().default(true),
  executionTimeMs: integer('execution_time_ms'),
  errorMessage: text('error_message'),

  // Context
  source: varchar('source', { length: 50 }).notNull().default('command-center'), // 'command-center', 'voice', 'quick-action'
  deviceType: varchar('device_type', { length: 20 }), // 'desktop', 'mobile', 'tablet'

  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('cmd_history_user_id_idx').on(table.userId),
  intentIdx: index('cmd_history_intent_idx').on(table.intent),
  createdAtIdx: index('cmd_history_created_at_idx').on(table.createdAt),
  userIntentIdx: index('cmd_history_user_intent_idx').on(table.userId, table.intent),
}));

// =====================================================
// USER PREFERENCES - Command Center specific settings
// =====================================================

export const userCommandPreferences = pgTable('user_command_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 36 }).notNull().unique().references(() => users.id, { onDelete: 'cascade' }),

  // UI Preferences
  defaultView: varchar('default_view', { length: 20 }).notNull().default('command-center'), // 'command-center', 'dashboard', 'agents'
  showSuggestions: boolean('show_suggestions').notNull().default(true),
  enableVoiceCommands: boolean('enable_voice_commands').notNull().default(false),
  compactMode: boolean('compact_mode').notNull().default(false),

  // Pinned Items
  pinnedCommands: jsonb('pinned_commands').$type<string[]>().notNull().default([]),
  pinnedAgents: jsonb('pinned_agents').$type<string[]>().notNull().default([]),

  // Personalization
  favoriteIntents: jsonb('favorite_intents').$type<string[]>().notNull().default([]),
  recentAgents: jsonb('recent_agents').$type<string[]>().notNull().default([]),

  // Advanced
  autoExecuteConfidence: real('auto_execute_confidence').notNull().default(0.95), // Auto-execute if confidence >= this
  enableContextAwareness: boolean('enable_context_awareness').notNull().default(true),

  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('user_cmd_prefs_user_id_idx').on(table.userId),
}));

// =====================================================
// USER ACTIVITY - Daily/Hourly usage patterns
// =====================================================

export const userActivityLog = pgTable('user_activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Activity details
  activityType: varchar('activity_type', { length: 50 }).notNull(), // 'command_executed', 'agent_opened', 'page_viewed'
  entityId: varchar('entity_id', { length: 100 }), // Agent ID, Page URL, etc.
  entityType: varchar('entity_type', { length: 50 }), // 'agent', 'command', 'page'

  // Session tracking
  sessionId: varchar('session_id', { length: 36 }),
  durationMs: integer('duration_ms'),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>().notNull().default({}),

  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('user_activity_user_id_idx').on(table.userId),
  activityTypeIdx: index('user_activity_type_idx').on(table.activityType),
  createdAtIdx: index('user_activity_created_at_idx').on(table.createdAt),
  userActivityIdx: index('user_activity_user_activity_idx').on(table.userId, table.activityType),
}));

// =====================================================
// SMART SUGGESTIONS - AI-generated recommendations
// =====================================================

export const smartSuggestions = pgTable('smart_suggestions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Suggestion details
  suggestionType: varchar('suggestion_type', { length: 50 }).notNull(), // 'command', 'workflow', 'agent', 'action'
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),

  // Content
  commandText: text('command_text'), // For 'command' type
  agentId: varchar('agent_id', { length: 50 }), // For 'agent' type
  actionPayload: jsonb('action_payload').$type<Record<string, any>>(), // For 'action' type

  // Scoring
  relevanceScore: real('relevance_score').notNull(), // 0.0 to 1.0
  confidenceScore: real('confidence_score').notNull(), // 0.0 to 1.0

  // Context
  contextFactors: jsonb('context_factors').$type<{
    timeOfDay?: string;
    dayOfWeek?: string;
    recentActivity?: string[];
    frequencyBased?: boolean;
  }>().notNull().default({}),

  // Status
  shown: boolean('shown').notNull().default(false),
  shownAt: timestamp('shown_at'),
  accepted: boolean('accepted').notNull().default(false),
  acceptedAt: timestamp('accepted_at'),
  dismissed: boolean('dismissed').notNull().default(false),
  dismissedAt: timestamp('dismissed_at'),

  // Lifecycle
  expiresAt: timestamp('expires_at').notNull(), // Suggestions expire after X hours
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('smart_suggestions_user_id_idx').on(table.userId),
  typeIdx: index('smart_suggestions_type_idx').on(table.suggestionType),
  relevanceIdx: index('smart_suggestions_relevance_idx').on(table.relevanceScore),
  shownIdx: index('smart_suggestions_shown_idx').on(table.shown),
  expiresIdx: index('smart_suggestions_expires_idx').on(table.expiresAt),
}));

// =====================================================
// DASHBOARD WIDGETS - Personalized dashboard layout
// =====================================================

export const dashboardWidgets = pgTable('dashboard_widgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Widget details
  widgetType: varchar('widget_type', { length: 50 }).notNull(), // 'quick-commands', 'recent-activity', 'agents', 'metrics'
  title: varchar('title', { length: 255 }).notNull(),

  // Layout
  position: integer('position').notNull().default(0),
  gridArea: varchar('grid_area', { length: 50 }), // CSS grid area: 'a1', 'b2', etc.
  size: varchar('size', { length: 20 }).notNull().default('medium'), // 'small', 'medium', 'large'

  // Configuration
  config: jsonb('config').$type<Record<string, any>>().notNull().default({}),

  // Status
  visible: boolean('visible').notNull().default(true),
  pinned: boolean('pinned').notNull().default(false),

  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('dashboard_widgets_user_id_idx').on(table.userId),
  visibleIdx: index('dashboard_widgets_visible_idx').on(table.visible),
  positionIdx: index('dashboard_widgets_position_idx').on(table.position),
}));

// =====================================================
// USAGE STATISTICS - Aggregated metrics for analytics
// =====================================================

export const usageStatistics = pgTable('usage_statistics', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Time period
  periodType: varchar('period_type', { length: 20 }).notNull(), // 'hourly', 'daily', 'weekly', 'monthly'
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),

  // Aggregated metrics
  totalCommands: integer('total_commands').notNull().default(0),
  totalAgentInteractions: integer('total_agent_interactions').notNull().default(0),
  totalTimeSpentMs: integer('total_time_spent_ms').notNull().default(0),

  // Top items
  topIntents: jsonb('top_intents').$type<Array<{ intent: string; count: number }>>().notNull().default([]),
  topAgents: jsonb('top_agents').$type<Array<{ agentId: string; count: number }>>().notNull().default([]),
  topCommands: jsonb('top_commands').$type<Array<{ command: string; count: number }>>().notNull().default([]),

  // Performance
  avgCommandConfidence: real('avg_command_confidence'),
  avgExecutionTimeMs: integer('avg_execution_time_ms'),
  successRate: real('success_rate'), // 0.0 to 1.0

  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('usage_stats_user_id_idx').on(table.userId),
  periodTypeIdx: index('usage_stats_period_type_idx').on(table.periodType),
  periodStartIdx: index('usage_stats_period_start_idx').on(table.periodStart),
  userPeriodIdx: index('usage_stats_user_period_idx').on(table.userId, table.periodType, table.periodStart),
}));

// =====================================================
// TypeScript types
// =====================================================

export type CommandHistory = typeof commandHistory.$inferSelect;
export type NewCommandHistory = typeof commandHistory.$inferInsert;

export type UserCommandPreferences = typeof userCommandPreferences.$inferSelect;
export type NewUserCommandPreferences = typeof userCommandPreferences.$inferInsert;

export type UserActivityLog = typeof userActivityLog.$inferSelect;
export type NewUserActivityLog = typeof userActivityLog.$inferInsert;

export type SmartSuggestion = typeof smartSuggestions.$inferSelect;
export type NewSmartSuggestion = typeof smartSuggestions.$inferInsert;

export type DashboardWidget = typeof dashboardWidgets.$inferSelect;
export type NewDashboardWidget = typeof dashboardWidgets.$inferInsert;

export type UsageStatistics = typeof usageStatistics.$inferSelect;
export type NewUsageStatistics = typeof usageStatistics.$inferInsert;
