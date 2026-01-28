/**
 * API Key Management Schema
 *
 * Secure storage for API keys with hashing, scopes, and audit trail
 */

import { pgTable, uuid, varchar, timestamp, text, boolean, jsonb, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * API Keys Table
 *
 * Stores hashed API keys with metadata and access control
 * Keys are stored in hashed form using bcrypt
 * Only the prefix (first 8 chars) is stored in plaintext for lookup
 */
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Key identification
  name: varchar('name', { length: 255 }).notNull(), // User-friendly name
  keyPrefix: varchar('key_prefix', { length: 16 }).notNull().unique(), // e.g., "flwnt_live_12345678"
  keyHash: text('key_hash').notNull(), // bcrypt hash of full key

  // Ownership
  userId: varchar('user_id', { length: 255 }).notNull(), // Owner of the key
  createdBy: varchar('created_by', { length: 255 }).notNull(), // Who created it (may differ from userId for org keys)

  // Access control
  scopes: jsonb('scopes').notNull().$type<string[]>().default([]), // Permissions: ['agents:read', 'knowledge:write', etc.]
  environment: varchar('environment', { length: 50 }).notNull().default('production'), // 'production' | 'development' | 'test'

  // Status and validity
  isActive: boolean('is_active').notNull().default(true),
  expiresAt: timestamp('expires_at'), // null = no expiration
  lastUsedAt: timestamp('last_used_at'),
  usageCount: integer('usage_count').notNull().default(0),

  // Metadata
  description: text('description'),
  ipWhitelist: jsonb('ip_whitelist').$type<string[]>(), // Optional IP restrictions
  rateLimit: integer('rate_limit').default(1000), // Requests per hour

  // Audit timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  revokedAt: timestamp('revoked_at'),
  revokedBy: varchar('revoked_by', { length: 255 }),
  revokedReason: text('revoked_reason'),
});

/**
 * API Key Usage Logs
 *
 * Audit trail for all API key usage
 */
export const apiKeyUsageLogs = pgTable('api_key_usage_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Key reference
  apiKeyId: uuid('api_key_id').notNull().references(() => apiKeys.id, { onDelete: 'cascade' }),
  keyPrefix: varchar('key_prefix', { length: 16 }).notNull(), // Denormalized for quick lookup

  // Request details
  method: varchar('method', { length: 10 }).notNull(), // GET, POST, etc.
  endpoint: varchar('endpoint', { length: 500 }).notNull(),
  statusCode: integer('status_code').notNull(),

  // Request context
  ipAddress: varchar('ip_address', { length: 45 }), // IPv4 or IPv6
  userAgent: text('user_agent'),
  requestId: uuid('request_id'),

  // Performance metrics
  responseTime: integer('response_time'), // milliseconds
  tokensUsed: integer('tokens_used'), // For AI endpoints

  // Error tracking
  errorMessage: text('error_message'),

  // Timestamp
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * API Key Audit Events
 *
 * Track all administrative actions on API keys
 */
export const apiKeyAuditEvents = pgTable('api_key_audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Key reference
  apiKeyId: uuid('api_key_id').notNull().references(() => apiKeys.id, { onDelete: 'cascade' }),

  // Event details
  eventType: varchar('event_type', { length: 50 }).notNull(), // 'created', 'revoked', 'updated', 'rotated'
  performedBy: varchar('performed_by', { length: 255 }).notNull(),

  // Context
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),

  // Changes
  changeDetails: jsonb('change_details').$type<Record<string, any>>(),

  // Timestamp
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Relations
 */
export const apiKeysRelations = relations(apiKeys, ({ many }) => ({
  usageLogs: many(apiKeyUsageLogs),
  auditEvents: many(apiKeyAuditEvents),
}));

export const apiKeyUsageLogsRelations = relations(apiKeyUsageLogs, ({ one }) => ({
  apiKey: one(apiKeys, {
    fields: [apiKeyUsageLogs.apiKeyId],
    references: [apiKeys.id],
  }),
}));

export const apiKeyAuditEventsRelations = relations(apiKeyAuditEvents, ({ one }) => ({
  apiKey: one(apiKeys, {
    fields: [apiKeyAuditEvents.apiKeyId],
    references: [apiKeys.id],
  }),
}));

/**
 * Types
 */
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type ApiKeyUsageLog = typeof apiKeyUsageLogs.$inferSelect;
export type ApiKeyAuditEvent = typeof apiKeyAuditEvents.$inferSelect;

/**
 * Available API Scopes
 */
export const API_SCOPES = {
  // Agent operations
  AGENTS_READ: 'agents:read',
  AGENTS_WRITE: 'agents:write',
  AGENTS_EXECUTE: 'agents:execute',

  // Knowledge base
  KNOWLEDGE_READ: 'knowledge:read',
  KNOWLEDGE_WRITE: 'knowledge:write',
  KNOWLEDGE_DELETE: 'knowledge:delete',

  // Workflows
  WORKFLOWS_READ: 'workflows:read',
  WORKFLOWS_WRITE: 'workflows:write',
  WORKFLOWS_EXECUTE: 'workflows:execute',

  // Analytics
  ANALYTICS_READ: 'analytics:read',

  // Admin
  ADMIN_USERS: 'admin:users',
  ADMIN_SETTINGS: 'admin:settings',
  ADMIN_API_KEYS: 'admin:api_keys',

  // Webhooks
  WEBHOOKS_READ: 'webhooks:read',
  WEBHOOKS_WRITE: 'webhooks:write',
} as const;

export type ApiScope = typeof API_SCOPES[keyof typeof API_SCOPES];

/**
 * Scope Groups for easy assignment
 */
export const SCOPE_GROUPS = {
  READ_ONLY: [
    API_SCOPES.AGENTS_READ,
    API_SCOPES.KNOWLEDGE_READ,
    API_SCOPES.WORKFLOWS_READ,
    API_SCOPES.ANALYTICS_READ,
  ],

  FULL_ACCESS: Object.values(API_SCOPES),

  AGENT_ADMIN: [
    API_SCOPES.AGENTS_READ,
    API_SCOPES.AGENTS_WRITE,
    API_SCOPES.AGENTS_EXECUTE,
  ],

  KNOWLEDGE_ADMIN: [
    API_SCOPES.KNOWLEDGE_READ,
    API_SCOPES.KNOWLEDGE_WRITE,
    API_SCOPES.KNOWLEDGE_DELETE,
  ],
} as const;
