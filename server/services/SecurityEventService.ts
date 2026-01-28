/**
 * Security Event Tracking Service
 *
 * Centralized service for tracking and querying security events.
 * Events are persisted to PostgreSQL for durability across server restarts.
 *
 * Migration from in-memory to database persistence.
 */

import { logger } from '../utils/logger';
import { getDb } from '@/lib/db';
import {
  securityEvents,
  type NewSecurityEvent,
  type SecurityEvent as DbSecurityEvent,
  SECURITY_EVENT_TYPES,
} from '@/lib/db/schema-observability';
import { eq, desc, sql, and, gte, lte, count, inArray } from 'drizzle-orm';

// Legacy enum - kept for backward compatibility
export enum SecurityEventType {
  PROMPT_INJECTION = 'prompt_injection',
  XSS_ATTEMPT = 'xss_attempt',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  AUTH_FAILURE = 'auth_failure',
  ADMIN_ACCESS = 'admin_access',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SQL_INJECTION = 'sql_injection',
  BRUTE_FORCE = 'brute_force',
  IP_BLOCKED = 'ip_blocked',
  TOKEN_EXPIRED = 'token_expired'
}

// Legacy enum - kept for backward compatibility but mapped to DB enum
export enum SecuritySeverity {
  LOW = 'info',      // Mapped to 'info' in DB
  MEDIUM = 'warning', // Mapped to 'warning' in DB
  HIGH = 'error',     // Mapped to 'error' in DB
  CRITICAL = 'critical'
}

// Legacy interface - kept for backward compatibility
export interface SecurityEvent {
  id: string;
  type: SecurityEventType | string;
  severity: SecuritySeverity | string;
  timestamp: Date;
  userId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  details: any;
  blocked: boolean;
}

/**
 * Map legacy severity to database enum
 */
function mapSeverityToDb(severity: SecuritySeverity | string): 'info' | 'warning' | 'error' | 'critical' {
  const mapping: Record<string, 'info' | 'warning' | 'error' | 'critical'> = {
    'low': 'info',
    'info': 'info',
    'medium': 'warning',
    'warning': 'warning',
    'high': 'error',
    'error': 'error',
    'critical': 'critical',
  };
  return mapping[severity.toLowerCase()] || 'info';
}

/**
 * Map legacy event type to category
 */
function mapTypeToCategory(type: string): 'authentication' | 'authorization' | 'rate_limiting' | 'token_management' | 'oauth' | 'mfa' | 'api_security' | 'suspicious_activity' | 'data_access' | 'system' {
  const categoryMapping: Record<string, 'authentication' | 'authorization' | 'rate_limiting' | 'token_management' | 'oauth' | 'mfa' | 'api_security' | 'suspicious_activity' | 'data_access' | 'system'> = {
    'prompt_injection': 'suspicious_activity',
    'xss_attempt': 'suspicious_activity',
    'rate_limit_exceeded': 'rate_limiting',
    'auth_failure': 'authentication',
    'admin_access': 'authorization',
    'suspicious_activity': 'suspicious_activity',
    'sql_injection': 'suspicious_activity',
    'brute_force': 'suspicious_activity',
    'ip_blocked': 'rate_limiting',
    'token_expired': 'token_management',
  };
  return categoryMapping[type.toLowerCase()] || 'system';
}

/**
 * Convert database record to legacy format
 */
function dbToLegacyEvent(dbEvent: DbSecurityEvent): SecurityEvent {
  return {
    id: dbEvent.id,
    type: dbEvent.eventType,
    severity: dbEvent.severity,
    timestamp: dbEvent.createdAt,
    userId: dbEvent.userId ?? undefined,
    ip: dbEvent.ipAddress ?? undefined,
    userAgent: dbEvent.userAgent ?? undefined,
    path: dbEvent.requestPath ?? undefined,
    method: dbEvent.requestMethod ?? undefined,
    details: dbEvent.details ?? {},
    blocked: !dbEvent.success,
  };
}

export class SecurityEventService {
  private db = getDb();

  /**
   * Log a security event to the database
   */
  async logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<SecurityEvent> {
    const dbEvent: NewSecurityEvent = {
      eventType: event.type,
      category: mapTypeToCategory(event.type),
      severity: mapSeverityToDb(event.severity),
      userId: event.userId ?? null,
      ipAddress: event.ip ?? null,
      userAgent: event.userAgent ?? null,
      requestPath: event.path ?? null,
      requestMethod: event.method ?? null,
      message: `${event.type} - ${event.severity}`,
      details: event.details ?? {},
      success: !event.blocked,
    };

    try {
      const [inserted] = await this.db
        .insert(securityEvents)
        .values(dbEvent)
        .returning();

      // Log to Winston based on severity
      const logMessage = `[SECURITY_EVENT] ${event.type} - ${event.severity}`;
      const logMeta = {
        eventId: inserted.id,
        type: event.type,
        severity: event.severity,
        userId: event.userId,
        ip: event.ip,
        path: event.path,
        blocked: event.blocked,
        details: event.details
      };

      switch (mapSeverityToDb(event.severity)) {
        case 'critical':
          logger.error(logMessage, logMeta);
          break;
        case 'error':
          logger.warn(logMessage, logMeta);
          break;
        case 'warning':
          logger.info(logMessage, logMeta);
          break;
        case 'info':
          logger.debug(logMessage, logMeta);
          break;
      }

      return dbToLegacyEvent(inserted);
    } catch (error) {
      logger.error('[SECURITY_EVENT] Failed to persist security event', { error, event });
      // Return a fallback event so the service doesn't break
      return {
        id: `fallback_${Date.now()}`,
        type: event.type,
        severity: event.severity,
        timestamp: new Date(),
        userId: event.userId,
        ip: event.ip,
        userAgent: event.userAgent,
        path: event.path,
        method: event.method,
        details: event.details,
        blocked: event.blocked,
      };
    }
  }

  /**
   * Get recent security events from database
   */
  async getRecentEvents(limit: number = 100): Promise<SecurityEvent[]> {
    try {
      const events = await this.db
        .select()
        .from(securityEvents)
        .orderBy(desc(securityEvents.createdAt))
        .limit(limit);

      return events.map(dbToLegacyEvent);
    } catch (error) {
      logger.error('[SECURITY_EVENT] Failed to fetch recent events', { error });
      return [];
    }
  }

  /**
   * Get events by type
   */
  async getEventsByType(type: SecurityEventType | string, limit: number = 100): Promise<SecurityEvent[]> {
    try {
      const events = await this.db
        .select()
        .from(securityEvents)
        .where(eq(securityEvents.eventType, type))
        .orderBy(desc(securityEvents.createdAt))
        .limit(limit);

      return events.map(dbToLegacyEvent);
    } catch (error) {
      logger.error('[SECURITY_EVENT] Failed to fetch events by type', { error, type });
      return [];
    }
  }

  /**
   * Get events by severity
   */
  async getEventsBySeverity(severity: SecuritySeverity | string, limit: number = 100): Promise<SecurityEvent[]> {
    try {
      const dbSeverity = mapSeverityToDb(severity);
      const events = await this.db
        .select()
        .from(securityEvents)
        .where(eq(securityEvents.severity, dbSeverity))
        .orderBy(desc(securityEvents.createdAt))
        .limit(limit);

      return events.map(dbToLegacyEvent);
    } catch (error) {
      logger.error('[SECURITY_EVENT] Failed to fetch events by severity', { error, severity });
      return [];
    }
  }

  /**
   * Get events by user
   */
  async getEventsByUser(userId: string, limit: number = 100): Promise<SecurityEvent[]> {
    try {
      const events = await this.db
        .select()
        .from(securityEvents)
        .where(eq(securityEvents.userId, userId))
        .orderBy(desc(securityEvents.createdAt))
        .limit(limit);

      return events.map(dbToLegacyEvent);
    } catch (error) {
      logger.error('[SECURITY_EVENT] Failed to fetch events by user', { error, userId });
      return [];
    }
  }

  /**
   * Get events by IP
   */
  async getEventsByIP(ip: string, limit: number = 100): Promise<SecurityEvent[]> {
    try {
      const events = await this.db
        .select()
        .from(securityEvents)
        .where(eq(securityEvents.ipAddress, ip))
        .orderBy(desc(securityEvents.createdAt))
        .limit(limit);

      return events.map(dbToLegacyEvent);
    } catch (error) {
      logger.error('[SECURITY_EVENT] Failed to fetch events by IP', { error, ip });
      return [];
    }
  }

  /**
   * Get events in time range
   */
  async getEventsByTimeRange(startDate: Date, endDate: Date): Promise<SecurityEvent[]> {
    try {
      const events = await this.db
        .select()
        .from(securityEvents)
        .where(
          and(
            gte(securityEvents.createdAt, startDate),
            lte(securityEvents.createdAt, endDate)
          )
        )
        .orderBy(desc(securityEvents.createdAt));

      return events.map(dbToLegacyEvent);
    } catch (error) {
      logger.error('[SECURITY_EVENT] Failed to fetch events by time range', { error, startDate, endDate });
      return [];
    }
  }

  /**
   * Get security statistics
   */
  async getStatistics(hours: number = 24): Promise<{
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    blocked: number;
    uniqueIPs: number;
    topIPs: Array<{ ip: string; count: number }>;
    recentTrend: Array<{ hour: string; count: number }>;
  }> {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      // Total count
      const [totalResult] = await this.db
        .select({ count: count() })
        .from(securityEvents)
        .where(gte(securityEvents.createdAt, cutoffTime));

      const total = totalResult?.count ?? 0;

      // Blocked count
      const [blockedResult] = await this.db
        .select({ count: count() })
        .from(securityEvents)
        .where(
          and(
            gte(securityEvents.createdAt, cutoffTime),
            eq(securityEvents.success, false)
          )
        );

      const blocked = blockedResult?.count ?? 0;

      // By severity
      const severityResults = await this.db
        .select({
          severity: securityEvents.severity,
          count: count(),
        })
        .from(securityEvents)
        .where(gte(securityEvents.createdAt, cutoffTime))
        .groupBy(securityEvents.severity);

      const bySeverity: Record<string, number> = {
        info: 0,
        warning: 0,
        error: 0,
        critical: 0,
      };
      severityResults.forEach(r => {
        bySeverity[r.severity] = Number(r.count);
      });

      // By type
      const typeResults = await this.db
        .select({
          eventType: securityEvents.eventType,
          count: count(),
        })
        .from(securityEvents)
        .where(gte(securityEvents.createdAt, cutoffTime))
        .groupBy(securityEvents.eventType);

      const byType: Record<string, number> = {};
      typeResults.forEach(r => {
        byType[r.eventType] = Number(r.count);
      });

      // Unique IPs and top IPs
      const ipResults = await this.db
        .select({
          ipAddress: securityEvents.ipAddress,
          count: count(),
        })
        .from(securityEvents)
        .where(
          and(
            gte(securityEvents.createdAt, cutoffTime),
            sql`${securityEvents.ipAddress} IS NOT NULL`
          )
        )
        .groupBy(securityEvents.ipAddress)
        .orderBy(desc(count()))
        .limit(10);

      const topIPs = ipResults
        .filter(r => r.ipAddress)
        .map(r => ({ ip: r.ipAddress!, count: Number(r.count) }));

      const uniqueIPs = topIPs.length; // This is approximate, full count would need another query

      // Hourly trend (simplified)
      const hourlyResults = await this.db
        .select({
          hour: sql<string>`to_char(${securityEvents.createdAt}, 'YYYY-MM-DD"T"HH24')`,
          count: count(),
        })
        .from(securityEvents)
        .where(gte(securityEvents.createdAt, cutoffTime))
        .groupBy(sql`to_char(${securityEvents.createdAt}, 'YYYY-MM-DD"T"HH24')`)
        .orderBy(sql`to_char(${securityEvents.createdAt}, 'YYYY-MM-DD"T"HH24')`);

      const recentTrend = hourlyResults.map(r => ({
        hour: r.hour,
        count: Number(r.count),
      }));

      return {
        total,
        bySeverity,
        byType,
        blocked,
        uniqueIPs,
        topIPs,
        recentTrend,
      };
    } catch (error) {
      logger.error('[SECURITY_EVENT] Failed to get statistics', { error });
      return {
        total: 0,
        bySeverity: { info: 0, warning: 0, error: 0, critical: 0 },
        byType: {},
        blocked: 0,
        uniqueIPs: 0,
        topIPs: [],
        recentTrend: [],
      };
    }
  }

  /**
   * Clear old events (retention policy)
   */
  async clearOldEvents(olderThanDays: number = 90): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

      const result = await this.db
        .delete(securityEvents)
        .where(lte(securityEvents.createdAt, cutoffTime))
        .returning({ id: securityEvents.id });

      logger.info(`[SECURITY_EVENT] Cleared ${result.length} old events (older than ${olderThanDays} days)`);
      return result.length;
    } catch (error) {
      logger.error('[SECURITY_EVENT] Failed to clear old events', { error });
      return 0;
    }
  }

  /**
   * Check if IP is suspicious (many events in short time)
   */
  async isSuspiciousIP(ip: string, threshold: number = 10): Promise<boolean> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const [result] = await this.db
        .select({ count: count() })
        .from(securityEvents)
        .where(
          and(
            eq(securityEvents.ipAddress, ip),
            gte(securityEvents.createdAt, fiveMinutesAgo)
          )
        );

      return (result?.count ?? 0) >= threshold;
    } catch (error) {
      logger.error('[SECURITY_EVENT] Failed to check suspicious IP', { error, ip });
      return false;
    }
  }

  /**
   * Check if user is suspicious (many events in short time)
   */
  async isSuspiciousUser(userId: string, threshold: number = 5): Promise<boolean> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const [result] = await this.db
        .select({ count: count() })
        .from(securityEvents)
        .where(
          and(
            eq(securityEvents.userId, userId),
            gte(securityEvents.createdAt, fiveMinutesAgo)
          )
        );

      return (result?.count ?? 0) >= threshold;
    } catch (error) {
      logger.error('[SECURITY_EVENT] Failed to check suspicious user', { error, userId });
      return false;
    }
  }
}

// Singleton instance
let instance: SecurityEventService | null = null;

export function getSecurityEventService(): SecurityEventService {
  if (!instance) {
    instance = new SecurityEventService();
    logger.info('🔒 SecurityEventService initialized (PostgreSQL persistence)');
  }
  return instance;
}
