/**
 * RBAC & PERMISSIONS DATABASE SCHEMA
 *
 * Role-Based Access Control with fine-grained permissions
 */

import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';

// ============================================================
// ROLES TABLE
// ============================================================

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull().default('custom'), // system, custom, workspace
  workspaceId: uuid('workspace_id'), // null for system roles
  permissions: jsonb('permissions').notNull().default([]), // Array of permission strings
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  nameIdx: index('roles_name_idx').on(table.name),
  workspaceIdx: index('roles_workspace_idx').on(table.workspaceId),
}));

// ============================================================
// USER ROLES TABLE (Many-to-Many)
// ============================================================

export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id'), // Scoped to workspace
  grantedBy: uuid('granted_by'), // User who granted this role
  grantedAt: timestamp('granted_at').defaultNow(),
  expiresAt: timestamp('expires_at'), // Optional expiration
}, (table) => ({
  userIdx: index('rbac_user_roles_user_idx').on(table.userId),
  roleIdx: index('rbac_user_roles_role_idx').on(table.roleId),
  workspaceIdx: index('rbac_user_roles_workspace_idx').on(table.workspaceId),
}));

// ============================================================
// PERMISSIONS TABLE (Granular Permissions)
// ============================================================

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(), // e.g., "workflows.create", "agents.delete"
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  resource: varchar('resource', { length: 100 }).notNull(), // workflows, agents, users, etc.
  action: varchar('action', { length: 100 }).notNull(), // create, read, update, delete, execute
  scope: varchar('scope', { length: 50 }).notNull().default('workspace'), // global, workspace, own
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  nameIdx: index('permissions_name_idx').on(table.name),
  resourceIdx: index('permissions_resource_idx').on(table.resource),
}));

// ============================================================
// POLICIES TABLE (Content Filtering & Guardrails)
// ============================================================

export const policies = pgTable('policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // content_filter, rate_limit, data_retention, guardrail
  workspaceId: uuid('workspace_id'), // null for global policies
  enabled: boolean('enabled').notNull().default(true),

  // Policy Configuration
  config: jsonb('config').notNull().default({}), // Policy-specific configuration
  /*
    Content Filter Example:
    {
      "blockedKeywords": ["password", "secret"],
      "blockedPatterns": ["\\b\\d{16}\\b"], // Credit card numbers
      "allowedDomains": ["example.com"],
      "maxLength": 10000
    }

    Rate Limit Example:
    {
      "maxRequests": 100,
      "windowSeconds": 60,
      "scope": "user" // user, workspace, global
    }

    Guardrail Example:
    {
      "maxTokens": 4000,
      "allowedModels": ["gpt-4", "gpt-3.5-turbo"],
      "requireApproval": true,
      "approvers": ["admin-role-id"]
    }
  */

  // Actions
  actions: jsonb('actions').notNull().default([]), // ["block", "warn", "log", "notify"]

  // Audit
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  typeIdx: index('policies_type_idx').on(table.type),
  workspaceIdx: index('policies_workspace_idx').on(table.workspaceId),
  enabledIdx: index('policies_enabled_idx').on(table.enabled),
}));

// ============================================================
// POLICY VIOLATIONS TABLE (Audit Trail)
// ============================================================

export const policyViolations = pgTable('policy_violations', {
  id: uuid('id').primaryKey().defaultRandom(),
  policyId: uuid('policy_id').notNull().references(() => policies.id),
  userId: uuid('user_id'),
  workspaceId: uuid('workspace_id'),

  // Violation Details
  resource: varchar('resource', { length: 100 }), // workflow, agent, message
  resourceId: uuid('resource_id'),
  violationType: varchar('violation_type', { length: 100 }).notNull(),
  severity: varchar('severity', { length: 50 }).notNull(), // low, medium, high, critical

  // Context
  context: jsonb('context').default({}), // Full violation context
  blockedContent: text('blocked_content'),

  // Actions Taken
  actionTaken: varchar('action_taken', { length: 100 }), // blocked, warned, logged

  // Timestamps
  detectedAt: timestamp('detected_at').defaultNow(),
}, (table) => ({
  policyIdx: index('policy_violations_policy_idx').on(table.policyId),
  userIdx: index('policy_violations_user_idx').on(table.userId),
  severityIdx: index('policy_violations_severity_idx').on(table.severity),
  detectedIdx: index('policy_violations_detected_idx').on(table.detectedAt),
}));

// ============================================================
// AUDIT LOGS TABLE (Security & Compliance)
// ============================================================

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  workspaceId: uuid('workspace_id'),

  // Action Details
  action: varchar('action', { length: 255 }).notNull(), // user.login, workflow.execute, role.grant
  resource: varchar('resource', { length: 100 }), // users, workflows, agents, roles
  resourceId: uuid('resource_id'),

  // Result
  status: varchar('status', { length: 50 }).notNull(), // success, failure, denied

  // Context
  metadata: jsonb('metadata').default({}),
  ipAddress: varchar('ip_address', { length: 45 }), // IPv4 or IPv6
  userAgent: text('user_agent'),

  // Changes (for update operations)
  changes: jsonb('changes'), // { "before": {...}, "after": {...} }

  // Timestamp
  timestamp: timestamp('timestamp').defaultNow(),
}, (table) => ({
  userIdx: index('rbac_audit_logs_user_idx').on(table.userId),
  actionIdx: index('rbac_audit_logs_action_idx').on(table.action),
  resourceIdx: index('rbac_audit_logs_resource_idx').on(table.resource),
  timestampIdx: index('rbac_audit_logs_timestamp_idx').on(table.timestamp),
}));

// ============================================================
// WORKSPACE PERMISSIONS TABLE
// ============================================================

export const workspacePermissions = pgTable('workspace_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),
  userId: uuid('user_id').notNull(),
  role: varchar('role', { length: 100 }).notNull(), // owner, admin, member, viewer
  permissions: jsonb('permissions').notNull().default([]),
  grantedBy: uuid('granted_by'),
  grantedAt: timestamp('granted_at').defaultNow(),
}, (table) => ({
  workspaceIdx: index('workspace_permissions_workspace_idx').on(table.workspaceId),
  userIdx: index('workspace_permissions_user_idx').on(table.userId),
}));

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;

export type Policy = typeof policies.$inferSelect;
export type NewPolicy = typeof policies.$inferInsert;

export type PolicyViolation = typeof policyViolations.$inferSelect;
export type NewPolicyViolation = typeof policyViolations.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type WorkspacePermission = typeof workspacePermissions.$inferSelect;
export type NewWorkspacePermission = typeof workspacePermissions.$inferInsert;
