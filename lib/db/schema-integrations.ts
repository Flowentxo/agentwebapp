/**
 * DATABASE SCHEMA - INTEGRATIONS
 *
 * OAuth connections and integration settings
 */

import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

/**
 * Integration Category Enum
 */
export const integrationCategoryEnum = ['email', 'crm', 'chat', 'calendar', 'storage', 'analytics'] as const;
export type IntegrationCategory = typeof integrationCategoryEnum[number];

/**
 * Integration Status Enum
 */
export const integrationStatusEnum = ['active', 'expired', 'error', 'pending'] as const;
export type IntegrationStatus = typeof integrationStatusEnum[number];

/**
 * OAuth Connections
 * Stores user's connected integrations (Gmail, Slack, Calendar)
 * Tokens are encrypted using AES-256-GCM
 */
export const oauthConnections = pgTable('oauth_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  workspaceId: varchar('workspace_id', { length: 255 }),

  // Integration details
  provider: varchar('provider', { length: 50 }).notNull(), // 'google', 'hubspot', 'slack'
  providerAccountId: varchar('provider_account_id', { length: 255 }),
  category: varchar('category', { length: 50 }).notNull().default('email'), // email, crm, chat, calendar

  // OAuth tokens (ENCRYPTED with AES-256-GCM)
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  tokenType: varchar('token_type', { length: 50 }),
  expiresAt: timestamp('expires_at'),

  // Encryption metadata (for AES-256-GCM)
  iv: text('iv'), // Initialization Vector (hex)
  tag: text('tag'), // Authentication Tag (hex)

  // Scopes and permissions
  scope: text('scope'),

  // Connection metadata (email, profile_url, scopes, etc.)
  metadata: jsonb('metadata').default({}),

  // Status: active, expired, error, pending
  status: varchar('status', { length: 20 }).notNull().default('active'),
  isActive: boolean('is_active').default(true),
  lastError: text('last_error'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Integration Connections (Alias for cleaner API)
 * Unified table for all external service connections
 */
export const integrationConnections = pgTable('integration_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),

  // Provider info
  provider: varchar('provider', { length: 50 }).notNull(), // 'google', 'hubspot', 'slack', 'notion'
  category: varchar('category', { length: 50 }).notNull(), // 'email', 'crm', 'chat', 'calendar'

  // Encrypted tokens (AES-256-GCM)
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  iv: text('iv').notNull(), // Initialization Vector
  tag: text('tag').notNull(), // Auth Tag

  // Token expiry
  expiresAt: timestamp('expires_at'),

  // Connection metadata
  metadata: jsonb('metadata').default({}), // { email, profileUrl, scopes, etc. }

  // Status
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, expired, error

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Integration Settings
 * User preferences for each integration
 */
export const integrationSettings = pgTable('integration_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  workspaceId: varchar('workspace_id', { length: 255 }),

  // Integration
  provider: varchar('provider', { length: 50 }).notNull(),

  // Settings (provider-specific)
  settings: jsonb('settings').default({}),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Integration Usage Logs
 * Track API usage for rate limiting and analytics
 */
export const integrationUsage = pgTable('integration_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  connectionId: uuid('connection_id').references(() => oauthConnections.id),

  // Usage details
  provider: varchar('provider', { length: 50 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(), // 'send_email', 'send_message', etc.

  // Status
  status: varchar('status', { length: 50 }).notNull(), // 'success', 'error', 'rate_limited'
  errorMessage: text('error_message'),

  // Metadata
  metadata: jsonb('metadata').default({}),

  // Timestamp
  createdAt: timestamp('created_at').defaultNow(),
});

export type OAuthConnection = typeof oauthConnections.$inferSelect;
export type NewOAuthConnection = typeof oauthConnections.$inferInsert;
export type IntegrationSettings = typeof integrationSettings.$inferSelect;
export type IntegrationUsage = typeof integrationUsage.$inferSelect;
export type IntegrationConnection = typeof integrationConnections.$inferSelect;
export type NewIntegrationConnection = typeof integrationConnections.$inferInsert;
