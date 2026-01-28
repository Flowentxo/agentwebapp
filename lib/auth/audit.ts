/**
 * SINTRA Auth System - Audit Logging
 * Phase 3, Punkt 1: Comprehensive Activity Tracking
 *
 * Provides lückenlose Historie aller sicherheitskritischen Aktionen
 * for compliance, debugging, and security monitoring.
 */

import { getDb } from '../db/connection';
import {
  auditLogs,
  type AuditAction,
  type AuditEntityType,
  type AuditMetadata,
} from '../db/schema';
import { desc, eq, and, gte, lte, sql } from 'drizzle-orm';

// =====================================================
// Types
// =====================================================

export interface LogActivityParams {
  /** User who performed the action (null for system actions or failed logins) */
  userId?: string | null;

  /** The action being logged */
  action: AuditAction;

  /** Optional: Type of entity affected */
  entityType?: AuditEntityType;

  /** Optional: ID of the entity affected */
  entityId?: string;

  /** Optional: Additional metadata */
  metadata?: AuditMetadata;

  /** Optional: IP address (will be stored separately) */
  ip?: string;

  /** Optional: User-Agent string (will be stored separately) */
  userAgent?: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: AuditMetadata;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface GetAuditLogsParams {
  /** Filter by user ID */
  userId?: string;

  /** Filter by action type */
  action?: AuditAction;

  /** Filter by entity type */
  entityType?: AuditEntityType;

  /** Filter by entity ID */
  entityId?: string;

  /** Filter by date range (start) */
  fromDate?: Date;

  /** Filter by date range (end) */
  toDate?: Date;

  /** Pagination: limit */
  limit?: number;

  /** Pagination: offset */
  offset?: number;
}

// =====================================================
// Audit Logging
// =====================================================

/**
 * Log a security-critical activity to the audit log.
 *
 * This function is designed to be non-blocking and fail-safe:
 * - Errors are caught and logged to console
 * - Never throws exceptions that could disrupt the main flow
 *
 * @param params - Activity details to log
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const db = getDb();

    await db.insert(auditLogs).values({
      userId: params.userId || null,
      action: params.action,
      entityType: params.entityType || null,
      entityId: params.entityId || null,
      metadata: params.metadata || {},
      ip: params.ip || null,
      userAgent: params.userAgent || null,
    });

    // DEV: Log to console for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[AUDIT] ${params.action}`,
        params.userId ? `user=${params.userId.substring(0, 8)}...` : 'no-user',
        params.entityType ? `${params.entityType}:${params.entityId?.substring(0, 8)}...` : ''
      );
    }
  } catch (error) {
    // CRITICAL: Never fail the main operation due to audit logging
    console.error('[AUDIT] Failed to log activity:', error);
    console.error('[AUDIT] Activity that failed to log:', {
      action: params.action,
      userId: params.userId,
      entityType: params.entityType,
    });
  }
}

/**
 * Fire-and-forget version of logActivity.
 * Returns immediately without waiting for the log to be written.
 *
 * Use this in performance-critical paths like login where
 * audit logging should not add latency.
 *
 * @param params - Activity details to log
 */
export function logActivityAsync(params: LogActivityParams): void {
  // Fire-and-forget: don't await
  logActivity(params).catch((err) => {
    console.error('[AUDIT] Async log failed:', err);
  });
}

// =====================================================
// Audit Log Retrieval
// =====================================================

/**
 * Get audit logs with flexible filtering.
 *
 * @param params - Filter and pagination options
 * @returns Array of audit log entries
 */
export async function getAuditLogs(
  params: GetAuditLogsParams = {}
): Promise<AuditLogEntry[]> {
  const db = getDb();

  const limit = Math.min(params.limit || 50, 100); // Max 100 per request
  const offset = params.offset || 0;

  // Build conditions
  const conditions = [];

  if (params.userId) {
    conditions.push(eq(auditLogs.userId, params.userId));
  }

  if (params.action) {
    conditions.push(eq(auditLogs.action, params.action));
  }

  if (params.entityType) {
    conditions.push(eq(auditLogs.entityType, params.entityType));
  }

  if (params.entityId) {
    conditions.push(eq(auditLogs.entityId, params.entityId));
  }

  if (params.fromDate) {
    conditions.push(gte(auditLogs.createdAt, params.fromDate));
  }

  if (params.toDate) {
    conditions.push(lte(auditLogs.createdAt, params.toDate));
  }

  const query = db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }

  return query;
}

/**
 * Get recent audit logs for a specific user.
 * Commonly used for the user's activity history in settings.
 *
 * @param userId - User ID
 * @param limit - Max number of entries (default 20)
 * @returns Array of recent audit log entries
 */
export async function getUserRecentActivity(
  userId: string,
  limit: number = 20
): Promise<AuditLogEntry[]> {
  return getAuditLogs({
    userId,
    limit: Math.min(limit, 50),
  });
}

/**
 * Get security-related events for a user (logins, password changes, MFA).
 * Used for the security audit tab.
 *
 * @param userId - User ID
 * @param limit - Max number of entries (default 30)
 * @returns Array of security event entries
 */
export async function getUserSecurityEvents(
  userId: string,
  limit: number = 30
): Promise<AuditLogEntry[]> {
  const db = getDb();

  const securityActions: AuditAction[] = [
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'LOGOUT',
    'PASSWORD_CHANGE',
    'PASSWORD_RESET_REQUEST',
    'PASSWORD_RESET_COMPLETE',
    'MFA_ENABLED',
    'MFA_DISABLED',
    'MFA_RECOVERY_USED',
    'SESSION_REVOKED',
    'ALL_SESSIONS_REVOKED',
    'NEW_DEVICE_DETECTED',
    'DEVICE_TRUST_REVOKED',
    'DEVICE_REMOVED',
  ];

  return db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.userId, userId),
        sql`${auditLogs.action} = ANY(${securityActions})`
      )
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(Math.min(limit, 100));
}

/**
 * Count audit logs matching filters.
 * Useful for pagination.
 *
 * @param params - Filter options
 * @returns Total count
 */
export async function countAuditLogs(
  params: Omit<GetAuditLogsParams, 'limit' | 'offset'> = {}
): Promise<number> {
  const db = getDb();

  const conditions = [];

  if (params.userId) {
    conditions.push(eq(auditLogs.userId, params.userId));
  }

  if (params.action) {
    conditions.push(eq(auditLogs.action, params.action));
  }

  if (params.entityType) {
    conditions.push(eq(auditLogs.entityType, params.entityType));
  }

  if (params.entityId) {
    conditions.push(eq(auditLogs.entityId, params.entityId));
  }

  if (params.fromDate) {
    conditions.push(gte(auditLogs.createdAt, params.fromDate));
  }

  if (params.toDate) {
    conditions.push(lte(auditLogs.createdAt, params.toDate));
  }

  const query = db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs);

  let result;
  if (conditions.length > 0) {
    result = await query.where(and(...conditions));
  } else {
    result = await query;
  }

  return result[0]?.count || 0;
}

// =====================================================
// Cleanup (for data retention policies)
// =====================================================

/**
 * Delete audit logs older than the specified date.
 * Used for data retention policies.
 *
 * @param olderThan - Delete logs older than this date
 * @returns Number of deleted entries
 */
export async function purgeOldAuditLogs(olderThan: Date): Promise<number> {
  const db = getDb();

  const result = await db
    .delete(auditLogs)
    .where(lte(auditLogs.createdAt, olderThan))
    .returning({ id: auditLogs.id });

  console.log(`[AUDIT] Purged ${result.length} audit logs older than ${olderThan.toISOString()}`);

  return result.length;
}

// =====================================================
// Helper: Action Descriptions (for UI)
// =====================================================

const ACTION_DESCRIPTIONS: Record<AuditAction, { de: string; en: string }> = {
  LOGIN_SUCCESS: { de: 'Erfolgreiche Anmeldung', en: 'Successful login' },
  LOGIN_FAILED: { de: 'Fehlgeschlagener Anmeldeversuch', en: 'Failed login attempt' },
  LOGOUT: { de: 'Abmeldung', en: 'Logout' },
  REGISTER: { de: 'Konto erstellt', en: 'Account created' },
  PASSWORD_CHANGE: { de: 'Passwort geändert', en: 'Password changed' },
  PASSWORD_RESET_REQUEST: { de: 'Passwort-Reset angefordert', en: 'Password reset requested' },
  PASSWORD_RESET_COMPLETE: { de: 'Passwort zurückgesetzt', en: 'Password reset completed' },
  MFA_ENABLED: { de: '2FA aktiviert', en: '2FA enabled' },
  MFA_DISABLED: { de: '2FA deaktiviert', en: '2FA disabled' },
  MFA_RECOVERY_USED: { de: 'Recovery-Code verwendet', en: 'Recovery code used' },
  SESSION_REVOKED: { de: 'Sitzung beendet', en: 'Session revoked' },
  ALL_SESSIONS_REVOKED: { de: 'Alle Sitzungen beendet', en: 'All sessions revoked' },
  NEW_DEVICE_DETECTED: { de: 'Neues Gerät erkannt', en: 'New device detected' },
  DEVICE_TRUST_REVOKED: { de: 'Gerätevertrauen widerrufen', en: 'Device trust revoked' },
  DEVICE_REMOVED: { de: 'Gerät entfernt', en: 'Device removed' },
  PROFILE_UPDATED: { de: 'Profil aktualisiert', en: 'Profile updated' },
  EMAIL_CHANGED: { de: 'E-Mail geändert', en: 'Email changed' },
  EMAIL_VERIFIED: { de: 'E-Mail verifiziert', en: 'Email verified' },
  USER_ROLE_CHANGED: { de: 'Benutzerrolle geändert', en: 'User role changed' },
  USER_DEACTIVATED: { de: 'Benutzer deaktiviert', en: 'User deactivated' },
  USER_REACTIVATED: { de: 'Benutzer reaktiviert', en: 'User reactivated' },
  // Passkeys
  PASSKEY_REGISTERED: { de: 'Passkey registriert', en: 'Passkey registered' },
  PASSKEY_REMOVED: { de: 'Passkey entfernt', en: 'Passkey removed' },
  PASSKEY_LOGIN_SUCCESS: { de: 'Anmeldung mit Passkey', en: 'Passkey login' },
  PASSKEY_LOGIN_FAILED: { de: 'Passkey-Anmeldung fehlgeschlagen', en: 'Passkey login failed' },
  // Sudo Mode
  SUDO_VERIFICATION_SUCCESS: { de: 'Identität bestätigt', en: 'Identity verified' },
  SUDO_VERIFICATION_FAILED: { de: 'Identitätsbestätigung fehlgeschlagen', en: 'Identity verification failed' },
  SUDO_TIMEOUT_CHANGED: { de: 'Sicherheits-Timeout geändert', en: 'Security timeout changed' },
};

/**
 * Get human-readable description for an action.
 *
 * @param action - The audit action
 * @param locale - Locale ('de' or 'en')
 * @returns Human-readable description
 */
export function getActionDescription(
  action: AuditAction,
  locale: 'de' | 'en' = 'de'
): string {
  return ACTION_DESCRIPTIONS[action]?.[locale] || action;
}

/**
 * Get icon/emoji for an action (for UI).
 *
 * @param action - The audit action
 * @returns Emoji icon
 */
export function getActionIcon(action: AuditAction): string {
  const icons: Partial<Record<AuditAction, string>> = {
    LOGIN_SUCCESS: '✅',
    LOGIN_FAILED: '❌',
    LOGOUT: '🚪',
    REGISTER: '🎉',
    PASSWORD_CHANGE: '🔐',
    PASSWORD_RESET_REQUEST: '📧',
    PASSWORD_RESET_COMPLETE: '🔑',
    MFA_ENABLED: '🛡️',
    MFA_DISABLED: '⚠️',
    MFA_RECOVERY_USED: '🆘',
    SESSION_REVOKED: '🚫',
    ALL_SESSIONS_REVOKED: '🔒',
    NEW_DEVICE_DETECTED: '📱',
    DEVICE_TRUST_REVOKED: '🚷',
    DEVICE_REMOVED: '🗑️',
    PROFILE_UPDATED: '✏️',
    EMAIL_CHANGED: '📬',
    EMAIL_VERIFIED: '✉️',
    USER_ROLE_CHANGED: '👤',
    USER_DEACTIVATED: '⛔',
    USER_REACTIVATED: '✨',
    // Passkeys
    PASSKEY_REGISTERED: '🔑',
    PASSKEY_REMOVED: '🗑️',
    PASSKEY_LOGIN_SUCCESS: '🔓',
    PASSKEY_LOGIN_FAILED: '🔒',
    // Sudo Mode
    SUDO_VERIFICATION_SUCCESS: '✅',
    SUDO_VERIFICATION_FAILED: '❌',
    SUDO_TIMEOUT_CHANGED: '⏱️',
  };

  return icons[action] || '📝';
}
