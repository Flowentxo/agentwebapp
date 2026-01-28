/**
 * WEBHOOK SCHEMA
 *
 * Database schema for webhook triggers, secrets, and logging
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  varchar,
  pgEnum,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { workflows } from './schema-workflows';

// Define webhook enabled enum
export const webhookEnabledEnum = pgEnum('webhook_enabled', ['true', 'false']);

/**
 * WEBHOOK CONFIGURATIONS
 *
 * Stores webhook secrets and configuration for workflows
 * Each workflow can have a unique webhook endpoint
 */
export const webhookConfigs = pgTable('webhook_configs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Workflow Reference
  workflowId: uuid('workflow_id')
    .notNull()
    .references(() => workflows.id, { onDelete: 'cascade' }),

  // Webhook Secret (SHA-256 hashed)
  // Original secret is shown once to user and not stored
  secretHash: varchar('secret_hash', { length: 64 }).notNull(), // SHA-256 produces 64 hex chars

  // Configuration
  enabled: webhookEnabledEnum('enabled')
    .notNull()
    .default('true'),

  // Optional: IP Whitelist
  allowedIps: jsonb('allowed_ips').$type<string[]>().default('[]'),

  // Rate Limiting Config (overrides default)
  rateLimitPerMinute: integer('rate_limit_per_minute').default(100),

  // Metadata
  description: text('description'), // User-defined description
  lastTriggeredAt: timestamp('last_triggered_at'),
  totalTriggers: integer('total_triggers').notNull().default(0),

  // Ownership
  userId: varchar('user_id', { length: 255 }).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  workflowIdIdx: index('webhook_config_workflow_id_idx').on(table.workflowId),
  userIdIdx: index('webhook_config_user_id_idx').on(table.userId),
  secretHashIdx: index('webhook_config_secret_hash_idx').on(table.secretHash),
}));

/**
 * WEBHOOK LOGS
 *
 * Logs all webhook requests for debugging and auditing
 */
export const webhookStatusEnum = pgEnum('webhook_status', [
  'success',
  'failed',
  'rate_limited',
  'unauthorized',
  'invalid_payload',
]);

export const webhookLogs = pgTable('webhook_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Workflow Reference
  workflowId: uuid('workflow_id')
    .notNull()
    .references(() => workflows.id, { onDelete: 'cascade' }),

  // Execution Reference (if workflow was triggered)
  executionId: uuid('execution_id'), // Can be null if request failed before execution

  // Request Details
  ipAddress: varchar('ip_address', { length: 45 }), // IPv6 max length
  userAgent: text('user_agent'),

  // Payload
  payload: jsonb('payload').$type<any>(), // Webhook request body
  headers: jsonb('headers').$type<Record<string, string>>(), // Request headers
  payloadSize: integer('payload_size'), // Bytes

  // Status
  status: webhookStatusEnum('status').notNull(),
  errorMessage: text('error_message'), // Error details if failed

  // Performance
  responseTimeMs: integer('response_time_ms'), // Time to process request

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  workflowIdIdx: index('webhook_log_workflow_id_idx').on(table.workflowId),
  executionIdIdx: index('webhook_log_execution_id_idx').on(table.executionId),
  statusIdx: index('webhook_log_status_idx').on(table.status),
  createdAtIdx: index('webhook_log_created_at_idx').on(table.createdAt),
  ipAddressIdx: index('webhook_log_ip_address_idx').on(table.ipAddress),
}));

/**
 * WEBHOOK RATE LIMITS (Redis Cache Alternative)
 *
 * Stores rate limit counters for workflows
 * Can be replaced with Redis in production for better performance
 */
export const webhookRateLimits = pgTable('webhook_rate_limits', {
  id: uuid('id').primaryKey().defaultRandom(),

  workflowId: uuid('workflow_id')
    .notNull()
    .references(() => workflows.id, { onDelete: 'cascade' }),

  // Rate Limit Window
  windowStart: timestamp('window_start').notNull(), // Start of 1-minute window
  requestCount: integer('request_count').notNull().default(0),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  workflowIdWindowIdx: index('webhook_rate_limit_workflow_window_idx').on(
    table.workflowId,
    table.windowStart
  ),
}));

// Export types
export type WebhookConfig = typeof webhookConfigs.$inferSelect;
export type NewWebhookConfig = typeof webhookConfigs.$inferInsert;
export type WebhookLog = typeof webhookLogs.$inferSelect;
export type NewWebhookLog = typeof webhookLogs.$inferInsert;
export type WebhookRateLimit = typeof webhookRateLimits.$inferSelect;
export type NewWebhookRateLimit = typeof webhookRateLimits.$inferInsert;
