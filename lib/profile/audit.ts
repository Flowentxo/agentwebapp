/**
 * SINTRA Profile System - Audit Trail
 * Records all user profile and security changes
 */

import { getDb } from '../db/connection';
import { userAudit } from '../db/schema';
import { eq, and, gte, lte, desc, SQL, count, sql } from 'drizzle-orm';
import type { NextRequest } from 'next/server';

// =====================================================
// Audit Action Types
// =====================================================

export const AuditAction = {
  PROFILE_UPDATE: 'profile_update',
  AVATAR_UPDATED: 'avatar_updated',
  EMAIL_CHANGE_REQUESTED: 'email_change_requested',
  EMAIL_CHANGED: 'email_changed',
  PASSWORD_CHANGED: 'password_changed',
  MFA_ENABLED: 'mfa_enabled',
  MFA_DISABLED: 'mfa_disabled',
  MFA_SETUP: 'mfa_setup',
  MFA_RECOVERY_USED: 'mfa_recovery_used',
  SESSION_REVOKED: 'session_revoked',
  PRIVACY_UPDATED: 'privacy_updated',
  NOTIFICATIONS_UPDATED: 'notifications_updated',
  ACCOUNT_DEACTIVATED: 'account_deactivated',
  ACCOUNT_REACTIVATED: 'account_reactivated',
  DATA_EXPORT_REQUESTED: 'data_export_requested',
  ACCOUNT_DELETION_REQUESTED: 'account_deletion_requested',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

// =====================================================
// Audit Record Interface
// =====================================================

export interface AuditRecord {
  userId: string;
  action: AuditAction | string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

// =====================================================
// Audit Recording
// =====================================================

/**
 * Record a user audit event
 * @param record - Audit record to create
 * @returns Created audit entry ID
 */
export async function recordUserEvent(record: AuditRecord): Promise<string> {
  const db = getDb();

  try {
    // Redact sensitive information from details
    const sanitizedDetails = redactSensitiveData(record.details || {});

    const result = await db.insert(userAudit).values({
      userId: record.userId,
      action: record.action,
      ip: record.ip || null,
      userAgent: record.userAgent || null,
      details: sanitizedDetails,
    }).returning({ id: userAudit.id });

    return result[0].id;
  } catch (error) {
    console.error('[Audit] Failed to record event:', error);
    // Don't throw - audit failure shouldn't break the main operation
    return '';
  }
}

/**
 * Record audit event from Next.js request
 * @param userId - User ID
 * @param action - Action type
 * @param request - Next.js request object
 * @param details - Additional details
 */
export async function recordUserEventFromRequest(
  userId: string,
  action: AuditAction | string,
  request: NextRequest,
  details?: Record<string, any>
): Promise<string> {
  const ip = extractIpFromRequest(request);
  const userAgent = request.headers.get('user-agent') || undefined;

  return recordUserEvent({
    userId,
    action,
    ip,
    userAgent,
    details,
  });
}

/**
 * Record audit event with minimal data (for server-side use)
 * @param userId - User ID
 * @param action - Action type
 * @param details - Additional details
 */
export async function recordUserEventSimple(
  userId: string,
  action: AuditAction | string,
  details?: Record<string, any>
): Promise<string> {
  return recordUserEvent({
    userId,
    action,
    details,
  });
}

// =====================================================
// Audit Retrieval
// =====================================================

export interface GetAuditEntriesOptions {
  userId: string;
  limit?: number;
  offset?: number;
  action?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Get audit entries for a user
 * @param options - Query options
 * @returns Array of audit entries
 */
export async function getAuditEntries(options: GetAuditEntriesOptions) {
  const db = getDb();

  const {
    userId,
    limit = 50,
    offset = 0,
    action,
    startDate,
    endDate,
  } = options;

  try {
    const conditions: SQL[] = [eq(userAudit.userId, userId)];

    if (action) {
      conditions.push(eq(userAudit.action, action));
    }

    if (startDate) {
      conditions.push(gte(userAudit.createdAt, startDate));
    }

    if (endDate) {
      conditions.push(lte(userAudit.createdAt, endDate));
    }

    const result = await db
      .select()
      .from(userAudit)
      .where(and(...conditions))
      .orderBy(desc(userAudit.createdAt))
      .limit(limit)
      .offset(offset);

    return result.map((row) => ({
      id: row.id,
      action: row.action,
      ip: row.ip || undefined,
      userAgent: row.userAgent || undefined,
      details: row.details,
      createdAt: row.createdAt,
    }));
  } catch (error) {
    console.error('[Audit] Failed to retrieve entries:', error);
    return [];
  }
}

/**
 * Get audit entry count for a user
 * @param userId - User ID
 * @param action - Optional action filter
 * @returns Number of audit entries
 */
export async function getAuditEntryCount(
  userId: string,
  action?: string
): Promise<number> {
  const db = getDb();

  try {
    const conditions: SQL[] = [eq(userAudit.userId, userId)];

    if (action) {
      conditions.push(eq(userAudit.action, action));
    }

    const result = await db
      .select({ count: count() })
      .from(userAudit)
      .where(and(...conditions));

    return Number(result[0].count);
  } catch (error) {
    console.error('[Audit] Failed to get count:', error);
    return 0;
  }
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Extract IP address from Next.js request
 * @param request - Next.js request object
 * @returns IP address or undefined
 */
function extractIpFromRequest(request: NextRequest): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return undefined;
}

/**
 * Redact sensitive information from audit details
 * @param details - Original details object
 * @returns Sanitized details
 */
function redactSensitiveData(details: Record<string, any>): Record<string, any> {
  const sensitiveKeys = [
    'password',
    'currentPassword',
    'newPassword',
    'token',
    'secret',
    'mfaSecret',
    'recoveryCodes',
    'apiKey',
    'accessToken',
    'refreshToken',
  ];

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(details)) {
    const lowerKey = key.toLowerCase();

    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = redactSensitiveData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Cleanup old audit entries (for periodic maintenance)
 * @param olderThanDays - Delete entries older than this many days
 * @returns Number of deleted entries
 */
export async function cleanupOldAuditEntries(olderThanDays: number = 365): Promise<number> {
  const db = getDb();

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await db
      .delete(userAudit)
      .where(lte(userAudit.createdAt, cutoffDate))
      .returning({ id: userAudit.id });

    return result.length;
  } catch (error) {
    console.error('[Audit] Cleanup failed:', error);
    return 0;
  }
}

// =====================================================
// Exports
// =====================================================

export const audit = {
  record: recordUserEvent,
  recordFromRequest: recordUserEventFromRequest,
  recordSimple: recordUserEventSimple,
  getEntries: getAuditEntries,
  getCount: getAuditEntryCount,
  cleanup: cleanupOldAuditEntries,
};
