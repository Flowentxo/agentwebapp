/**
 * Pipeline Enterprise Schema
 *
 * Database schema for enterprise pipeline features:
 * - Webhooks
 * - Schedules
 * - Approval tracking
 *
 * Part of Phase 4: Enterprise Features
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  varchar,
  boolean,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { workflows } from './schema-workflows';

// =============================================================================
// PIPELINE WEBHOOKS
// =============================================================================

export const pipelineWebhooks = pgTable('pipeline_webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),

  // References
  pipelineId: uuid('pipeline_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull(),

  // Webhook config
  name: varchar('name', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),

  // Security
  secretHeader: varchar('secret_header', { length: 255 }),
  secretValue: varchar('secret_value', { length: 255 }),
  allowedIps: jsonb('allowed_ips').$type<string[]>(),
  rateLimit: integer('rate_limit'), // requests per minute

  // Statistics
  triggerCount: integer('trigger_count').notNull().default(0),
  lastTriggeredAt: timestamp('last_triggered_at'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  pipelineIdIdx: index('webhook_pipeline_id_idx').on(table.pipelineId),
  tokenIdx: index('webhook_token_idx').on(table.token),
  userIdIdx: index('webhook_user_id_idx').on(table.userId),
}));

// =============================================================================
// WEBHOOK TRIGGER LOGS
// =============================================================================

export const webhookTriggerLogs = pgTable('webhook_trigger_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  webhookId: uuid('webhook_id').notNull().references(() => pipelineWebhooks.id, { onDelete: 'cascade' }),
  executionId: uuid('execution_id'),

  // Request info
  payload: jsonb('payload').$type<Record<string, unknown>>(),
  sourceIp: varchar('source_ip', { length: 45 }),

  // Timestamps
  triggeredAt: timestamp('triggered_at').notNull().defaultNow(),
}, (table) => ({
  webhookIdIdx: index('webhook_log_webhook_id_idx').on(table.webhookId),
  triggeredAtIdx: index('webhook_log_triggered_at_idx').on(table.triggeredAt),
}));

// =============================================================================
// PIPELINE SCHEDULES
// =============================================================================

export const pipelineSchedules = pgTable('pipeline_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),

  // References
  pipelineId: uuid('pipeline_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull(),

  // Schedule config
  name: varchar('name', { length: 255 }).notNull(),
  cronExpression: varchar('cron_expression', { length: 100 }).notNull(),
  timezone: varchar('timezone', { length: 50 }).notNull().default('UTC'),
  isActive: boolean('is_active').notNull().default(true),

  // Inputs for scheduled runs
  inputs: jsonb('inputs').$type<Record<string, unknown>>().default({}),

  // Statistics
  runCount: integer('run_count').notNull().default(0),
  nextRunAt: timestamp('next_run_at'),
  lastRunAt: timestamp('last_run_at'),
  lastStatus: varchar('last_status', { length: 50 }),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  pipelineIdIdx: index('schedule_pipeline_id_idx').on(table.pipelineId),
  userIdIdx: index('schedule_user_id_idx').on(table.userId),
  isActiveIdx: index('schedule_is_active_idx').on(table.isActive),
  nextRunAtIdx: index('schedule_next_run_at_idx').on(table.nextRunAt),
}));

// =============================================================================
// APPROVAL REQUESTS
// =============================================================================

export const approvalRequests = pgTable('approval_requests', {
  id: uuid('id').primaryKey().defaultRandom(),

  // References
  executionId: uuid('execution_id').notNull(),
  pipelineId: uuid('pipeline_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  nodeId: varchar('node_id', { length: 255 }).notNull(),

  // Request details
  message: text('message'),
  context: jsonb('context').$type<Record<string, unknown>>(),

  // Status
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, approved, rejected, expired

  // Response
  respondedBy: varchar('responded_by', { length: 255 }),
  respondedAt: timestamp('responded_at'),
  responseComment: text('response_comment'),

  // Expiry
  expiresAt: timestamp('expires_at'),

  // Notification
  notifyEmail: varchar('notify_email', { length: 255 }),
  notifySlack: boolean('notify_slack').default(false),
  notifiedAt: timestamp('notified_at'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  executionIdIdx: index('pipeline_approval_execution_id_idx').on(table.executionId),
  pipelineIdIdx: index('pipeline_approval_pipeline_id_idx').on(table.pipelineId),
  statusIdx: index('pipeline_approval_status_idx').on(table.status),
  expiresAtIdx: index('pipeline_approval_expires_at_idx').on(table.expiresAt),
}));

// =============================================================================
// EXPORT TYPES
// =============================================================================

export type PipelineWebhook = typeof pipelineWebhooks.$inferSelect;
export type NewPipelineWebhook = typeof pipelineWebhooks.$inferInsert;

export type WebhookTriggerLog = typeof webhookTriggerLogs.$inferSelect;
export type NewWebhookTriggerLog = typeof webhookTriggerLogs.$inferInsert;

export type PipelineSchedule = typeof pipelineSchedules.$inferSelect;
export type NewPipelineSchedule = typeof pipelineSchedules.$inferInsert;

export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type NewApprovalRequest = typeof approvalRequests.$inferInsert;
