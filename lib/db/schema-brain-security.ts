/**
 * Brain AI Security Schema
 * API Keys, Rate Limiting, RBAC
 */

import { pgTable, varchar, timestamp, boolean, integer, text, uuid, jsonb, index } from 'drizzle-orm/pg-core';

// ============================================
// API Keys Table
// ============================================

export const brainApiKeys = pgTable('brain_api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Key Details
  keyHash: varchar('key_hash', { length: 255 }).notNull().unique(), // bcrypt hash
  keyPrefix: varchar('key_prefix', { length: 20 }).notNull(), // First 8 chars for identification
  name: varchar('name', { length: 255 }).notNull(), // Human-readable name

  // Ownership
  workspaceId: varchar('workspace_id', { length: 255 }).notNull(),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  agentId: varchar('agent_id', { length: 255 }), // Optional: for agent-specific keys

  // Permissions & Scopes
  role: varchar('role', { length: 50 }).notNull().default('viewer'), // admin, editor, viewer
  scopes: jsonb('scopes').notNull().default('[]'), // Array of permission scopes

  // Rate Limits (per key)
  rateLimit: integer('rate_limit').notNull().default(100), // Requests per minute
  dailyLimit: integer('daily_limit').notNull().default(10000), // Requests per day

  // Usage Stats
  usageCount: integer('usage_count').notNull().default(0),
  lastUsedAt: timestamp('last_used_at'),

  // Expiration
  expiresAt: timestamp('expires_at'), // Optional expiration

  // Status
  isActive: boolean('is_active').notNull().default(true),
  isRevoked: boolean('is_revoked').notNull().default(false),
  revokedAt: timestamp('revoked_at'),
  revokedBy: varchar('revoked_by', { length: 255 }),
  revokedReason: text('revoked_reason'),

  // Metadata
  metadata: jsonb('metadata').default('{}'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  workspaceIdx: index('brain_api_keys_workspace_idx').on(table.workspaceId),
  createdByIdx: index('brain_api_keys_created_by_idx').on(table.createdBy),
  agentIdx: index('brain_api_keys_agent_idx').on(table.agentId),
  expiresAtIdx: index('brain_api_keys_expires_at_idx').on(table.expiresAt),
}));

export type BrainApiKey = typeof brainApiKeys.$inferSelect;
export type NewBrainApiKey = typeof brainApiKeys.$inferInsert;

// ============================================
// Rate Limit Logs Table
// ============================================

export const brainRateLimitLogs = pgTable('brain_rate_limit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Identification
  identifier: varchar('identifier', { length: 255 }).notNull(), // API Key / User ID / IP
  identifierType: varchar('identifier_type', { length: 50 }).notNull(), // 'api_key', 'user', 'ip'

  // Rate Limit Hit
  endpoint: varchar('endpoint', { length: 255 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(), // GET, POST, etc.
  limitType: varchar('limit_type', { length: 50 }).notNull(), // 'minute', 'hour', 'day'
  limitValue: integer('limit_value').notNull(),
  currentCount: integer('current_count').notNull(),

  // Request Details
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),

  // Status
  wasBlocked: boolean('was_blocked').notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  identifierIdx: index('brain_rate_limit_logs_identifier_idx').on(table.identifier),
  createdAtIdx: index('brain_rate_limit_logs_created_at_idx').on(table.createdAt),
  wasBlockedIdx: index('brain_rate_limit_logs_was_blocked_idx').on(table.wasBlocked),
}));

export type BrainRateLimitLog = typeof brainRateLimitLogs.$inferSelect;
export type NewBrainRateLimitLog = typeof brainRateLimitLogs.$inferInsert;

// ============================================
// Roles & Permissions Table
// ============================================

export const brainRoles = pgTable('brain_roles', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Role Details
  name: varchar('name', { length: 100 }).notNull().unique(), // 'admin', 'editor', 'viewer'
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),

  // Permissions (JSON array of permission strings)
  permissions: jsonb('permissions').notNull().default('[]'),

  // Hierarchy
  priority: integer('priority').notNull().default(0), // Higher = more permissions

  // Scope
  workspaceId: varchar('workspace_id', { length: 255 }), // NULL = global role

  // Status
  isActive: boolean('is_active').notNull().default(true),
  isSystemRole: boolean('is_system_role').notNull().default(false), // Cannot be deleted

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('brain_roles_name_idx').on(table.name),
  workspaceIdx: index('brain_roles_workspace_idx').on(table.workspaceId),
}));

export type BrainRole = typeof brainRoles.$inferSelect;
export type NewBrainRole = typeof brainRoles.$inferInsert;

// ============================================
// User Roles Assignment Table
// ============================================

export const brainUserRoles = pgTable('brain_user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Assignment
  userId: varchar('user_id', { length: 255 }).notNull(),
  roleId: uuid('role_id').notNull().references(() => brainRoles.id, { onDelete: 'cascade' }),
  workspaceId: varchar('workspace_id', { length: 255 }).notNull(),

  // Granted By
  grantedBy: varchar('granted_by', { length: 255 }).notNull(),
  grantedAt: timestamp('granted_at').defaultNow().notNull(),

  // Expiration (optional)
  expiresAt: timestamp('expires_at'),

  // Status
  isActive: boolean('is_active').notNull().default(true),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userWorkspaceIdx: index('brain_user_roles_user_workspace_idx').on(table.userId, table.workspaceId),
  roleIdx: index('brain_user_roles_role_idx').on(table.roleId),
}));

export type BrainUserRole = typeof brainUserRoles.$inferSelect;
export type NewBrainUserRole = typeof brainUserRoles.$inferInsert;

// ============================================
// Audit Logs Table
// ============================================

export const brainAuditLogs = pgTable('brain_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Actor
  userId: varchar('user_id', { length: 255 }),
  agentId: varchar('agent_id', { length: 255 }),
  apiKeyId: uuid('api_key_id'),
  ipAddress: varchar('ip_address', { length: 45 }),

  // Action
  action: varchar('action', { length: 100 }).notNull(), // 'query', 'ingest', 'delete', etc.
  resource: varchar('resource', { length: 100 }).notNull(), // 'document', 'api_key', 'role'
  resourceId: varchar('resource_id', { length: 255 }),

  // Details
  details: jsonb('details').default('{}'),

  // Context
  workspaceId: varchar('workspace_id', { length: 255 }),
  endpoint: varchar('endpoint', { length: 255 }),
  method: varchar('method', { length: 10 }),

  // Result
  success: boolean('success').notNull(),
  errorMessage: text('error_message'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('brain_audit_logs_user_idx').on(table.userId),
  agentIdx: index('brain_audit_logs_agent_idx').on(table.agentId),
  actionIdx: index('brain_audit_logs_action_idx').on(table.action),
  workspaceIdx: index('brain_audit_logs_workspace_idx').on(table.workspaceId),
  createdAtIdx: index('brain_audit_logs_created_at_idx').on(table.createdAt),
}));

export type BrainAuditLog = typeof brainAuditLogs.$inferSelect;
export type NewBrainAuditLog = typeof brainAuditLogs.$inferInsert;

// ============================================
// Permission Scopes (Enum-like constants)
// ============================================

export const BRAIN_PERMISSIONS = {
  // Knowledge Base
  KNOWLEDGE_READ: 'knowledge:read',
  KNOWLEDGE_WRITE: 'knowledge:write',
  KNOWLEDGE_DELETE: 'knowledge:delete',
  KNOWLEDGE_ADMIN: 'knowledge:admin',

  // Context
  CONTEXT_READ: 'context:read',
  CONTEXT_WRITE: 'context:write',
  CONTEXT_DELETE: 'context:delete',

  // API Keys
  APIKEY_READ: 'apikey:read',
  APIKEY_CREATE: 'apikey:create',
  APIKEY_REVOKE: 'apikey:revoke',
  APIKEY_ADMIN: 'apikey:admin',

  // Roles
  ROLE_READ: 'role:read',
  ROLE_ASSIGN: 'role:assign',
  ROLE_ADMIN: 'role:admin',

  // Analytics
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_EXPORT: 'analytics:export',

  // System
  SYSTEM_ADMIN: 'system:admin',
} as const;

export type BrainPermission = typeof BRAIN_PERMISSIONS[keyof typeof BRAIN_PERMISSIONS];

// ============================================
// Default Roles Configuration
// ============================================

export const DEFAULT_ROLES = [
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Full access to all Brain AI features',
    permissions: Object.values(BRAIN_PERMISSIONS),
    priority: 100,
    isSystemRole: true,
  },
  {
    name: 'editor',
    displayName: 'Editor',
    description: 'Can read, write, and manage knowledge',
    permissions: [
      BRAIN_PERMISSIONS.KNOWLEDGE_READ,
      BRAIN_PERMISSIONS.KNOWLEDGE_WRITE,
      BRAIN_PERMISSIONS.CONTEXT_READ,
      BRAIN_PERMISSIONS.CONTEXT_WRITE,
      BRAIN_PERMISSIONS.ANALYTICS_READ,
    ],
    priority: 50,
    isSystemRole: true,
  },
  {
    name: 'viewer',
    displayName: 'Viewer',
    description: 'Read-only access to knowledge',
    permissions: [
      BRAIN_PERMISSIONS.KNOWLEDGE_READ,
      BRAIN_PERMISSIONS.CONTEXT_READ,
    ],
    priority: 10,
    isSystemRole: true,
  },
] as const;
