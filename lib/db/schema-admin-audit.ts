/**
 * ADMIN AUDIT LOG SCHEMA
 * Enterprise-grade audit logging for admin actions
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

// Admin action category enum
export const adminActionCategoryEnum = pgEnum('admin_action_category', [
  'user',
  'deployment',
  'security',
  'system',
  'config',
  'data',
  'integration',
]);

// Admin Audit Logs table
export const adminAuditLogs = pgTable('admin_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Who performed the action
  userId: varchar('user_id', { length: 255 }).notNull(),
  userEmail: varchar('user_email', { length: 255 }).notNull(),

  // What action was performed
  action: varchar('action', { length: 255 }).notNull(),
  category: adminActionCategoryEnum('category').notNull(),

  // Target of the action
  targetType: varchar('target_type', { length: 100 }), // user, agent, deployment, config, etc.
  targetId: varchar('target_id', { length: 255 }),
  targetName: varchar('target_name', { length: 255 }),

  // Details
  description: text('description'),
  previousValue: jsonb('previous_value').$type<Record<string, unknown>>(),
  newValue: jsonb('new_value').$type<Record<string, unknown>>(),
  metadata: jsonb('metadata').$type<{
    browser?: string;
    os?: string;
    device?: string;
    location?: string;
    requestId?: string;
    duration?: number;
    success?: boolean;
    errorMessage?: string;
  }>().notNull().default({}),

  // Request info
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),

  // Status
  status: varchar('status', { length: 50 }).notNull().default('success'), // success, failed, pending

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('admin_audit_user_id_idx').on(table.userId),
  categoryIdx: index('admin_audit_category_idx').on(table.category),
  actionIdx: index('admin_audit_action_idx').on(table.action),
  targetTypeIdx: index('admin_audit_target_type_idx').on(table.targetType),
  createdAtIdx: index('admin_audit_created_at_idx').on(table.createdAt),
  userCategoryIdx: index('admin_audit_user_category_idx').on(table.userId, table.category),
  statusIdx: index('admin_audit_status_idx').on(table.status),
}));

// Type exports
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLogs.$inferInsert;

// Action constants for consistency
export const ADMIN_ACTIONS = {
  // User management
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_ROLE_CHANGE: 'user.role_change',
  USER_SUSPEND: 'user.suspend',
  USER_ACTIVATE: 'user.activate',
  USER_PASSWORD_RESET: 'user.password_reset',

  // Deployment
  DEPLOY_START: 'deployment.start',
  DEPLOY_COMPLETE: 'deployment.complete',
  DEPLOY_ROLLBACK: 'deployment.rollback',
  DEPLOY_FAILED: 'deployment.failed',

  // Security
  SECURITY_LOGIN_ADMIN: 'security.login_admin',
  SECURITY_LOGOUT: 'security.logout',
  SECURITY_API_KEY_CREATE: 'security.api_key_create',
  SECURITY_API_KEY_REVOKE: 'security.api_key_revoke',
  SECURITY_MFA_ENABLE: 'security.mfa_enable',
  SECURITY_MFA_DISABLE: 'security.mfa_disable',
  SECURITY_SESSION_REVOKE: 'security.session_revoke',

  // System
  SYSTEM_CONFIG_CHANGE: 'system.config_change',
  SYSTEM_MAINTENANCE_START: 'system.maintenance_start',
  SYSTEM_MAINTENANCE_END: 'system.maintenance_end',
  SYSTEM_RESTART: 'system.restart',

  // Data
  DATA_EXPORT: 'data.export',
  DATA_IMPORT: 'data.import',
  DATA_DELETE: 'data.delete',
  DATA_BACKUP: 'data.backup',

  // Integration
  INTEGRATION_CONNECT: 'integration.connect',
  INTEGRATION_DISCONNECT: 'integration.disconnect',
  INTEGRATION_CONFIG: 'integration.config',
} as const;
