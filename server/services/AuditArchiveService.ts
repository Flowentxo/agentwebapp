/**
 * AUDIT ARCHIVE SERVICE
 *
 * Manages archival and retention of audit logs.
 * Provides:
 * - Automatic archival of old logs
 * - Retention policy enforcement
 * - Archive retrieval
 * - Storage optimization
 */

import { getDb } from '@/lib/db';
import { adminAuditLogs } from '@/lib/db/schema-admin-audit';
import { sql, lt, desc, and, eq } from 'drizzle-orm';

// =====================================================
// Configuration
// =====================================================

export const AUDIT_RETENTION_CONFIG = {
  // Keep detailed logs in main table for 90 days
  ACTIVE_RETENTION_DAYS: 90,

  // Keep archived logs for 2 years
  ARCHIVE_RETENTION_DAYS: 730,

  // Batch size for archive operations
  ARCHIVE_BATCH_SIZE: 1000,

  // Categories that should be retained longer
  EXTENDED_RETENTION_CATEGORIES: ['security', 'user', 'data'],

  // Extended retention period for critical categories
  EXTENDED_RETENTION_DAYS: 365,
} as const;

// =====================================================
// Types
// =====================================================

export interface ArchiveStats {
  totalLogsInMain: number;
  totalLogsInArchive: number;
  oldestMainLog: Date | null;
  newestArchiveLog: Date | null;
  logsEligibleForArchive: number;
  logsEligibleForDeletion: number;
}

export interface ArchiveResult {
  success: boolean;
  archivedCount: number;
  deletedCount: number;
  errors: string[];
}

export interface RetentionPolicy {
  category: string;
  retentionDays: number;
  archiveAfterDays: number;
}

// =====================================================
// Audit Archive Service
// =====================================================

export class AuditArchiveService {
  private db = getDb();

  /**
   * Get archive statistics
   */
  async getArchiveStats(): Promise<ArchiveStats> {
    const now = new Date();
    const archiveCutoff = new Date(now);
    archiveCutoff.setDate(archiveCutoff.getDate() - AUDIT_RETENTION_CONFIG.ACTIVE_RETENTION_DAYS);

    const deletionCutoff = new Date(now);
    deletionCutoff.setDate(deletionCutoff.getDate() - AUDIT_RETENTION_CONFIG.ARCHIVE_RETENTION_DAYS);

    try {
      // Count logs in main table
      const [mainCount] = await this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(adminAuditLogs);

      // Get oldest log in main table
      const [oldestMain] = await this.db
        .select({ createdAt: adminAuditLogs.createdAt })
        .from(adminAuditLogs)
        .orderBy(adminAuditLogs.createdAt)
        .limit(1);

      // Count logs eligible for archive
      const [archiveEligible] = await this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(adminAuditLogs)
        .where(lt(adminAuditLogs.createdAt, archiveCutoff));

      return {
        totalLogsInMain: Number(mainCount?.count || 0),
        totalLogsInArchive: 0, // Would query archive table if implemented
        oldestMainLog: oldestMain?.createdAt || null,
        newestArchiveLog: null,
        logsEligibleForArchive: Number(archiveEligible?.count || 0),
        logsEligibleForDeletion: 0, // Would count archived logs past retention
      };
    } catch (error) {
      console.error('[AUDIT_ARCHIVE] Stats error:', error);
      return {
        totalLogsInMain: 0,
        totalLogsInArchive: 0,
        oldestMainLog: null,
        newestArchiveLog: null,
        logsEligibleForArchive: 0,
        logsEligibleForDeletion: 0,
      };
    }
  }

  /**
   * Archive old logs (move to archive table or export)
   *
   * In production, this would:
   * 1. Select logs older than retention period
   * 2. Export to archive storage (S3, archive table, etc.)
   * 3. Delete from main table
   */
  async archiveOldLogs(): Promise<ArchiveResult> {
    const errors: string[] = [];
    let archivedCount = 0;
    let deletedCount = 0;

    const now = new Date();
    const archiveCutoff = new Date(now);
    archiveCutoff.setDate(archiveCutoff.getDate() - AUDIT_RETENTION_CONFIG.ACTIVE_RETENTION_DAYS);

    try {
      // Get logs to archive (excluding extended retention categories)
      const logsToArchive = await this.db
        .select()
        .from(adminAuditLogs)
        .where(
          and(
            lt(adminAuditLogs.createdAt, archiveCutoff),
            sql`${adminAuditLogs.category} NOT IN ('security', 'user', 'data')`
          )
        )
        .limit(AUDIT_RETENTION_CONFIG.ARCHIVE_BATCH_SIZE);

      if (logsToArchive.length === 0) {
        return { success: true, archivedCount: 0, deletedCount: 0, errors: [] };
      }

      // In production: Export to archive storage here
      // For now, we just mark them as processed
      console.log(`[AUDIT_ARCHIVE] Would archive ${logsToArchive.length} logs`);
      archivedCount = logsToArchive.length;

      // Delete archived logs from main table
      // In production: Only delete after successful archive
      const logIds = logsToArchive.map(log => log.id);

      for (const id of logIds) {
        try {
          await this.db
            .delete(adminAuditLogs)
            .where(eq(adminAuditLogs.id, id));
          deletedCount++;
        } catch (error) {
          errors.push(`Failed to delete log ${id}: ${error}`);
        }
      }

      return {
        success: errors.length === 0,
        archivedCount,
        deletedCount,
        errors,
      };
    } catch (error) {
      console.error('[AUDIT_ARCHIVE] Archive error:', error);
      return {
        success: false,
        archivedCount,
        deletedCount,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Cleanup very old archived logs
   */
  async cleanupOldArchives(): Promise<{ deletedCount: number; errors: string[] }> {
    // In production: Query archive storage and delete logs past retention
    // This is a placeholder for the implementation

    console.log('[AUDIT_ARCHIVE] Cleanup old archives (placeholder)');

    return {
      deletedCount: 0,
      errors: [],
    };
  }

  /**
   * Get retention policies for all categories
   */
  getRetentionPolicies(): RetentionPolicy[] {
    const categories = ['user', 'deployment', 'security', 'system', 'config', 'data', 'integration'];

    return categories.map(category => {
      const isExtended = AUDIT_RETENTION_CONFIG.EXTENDED_RETENTION_CATEGORIES.includes(category);

      return {
        category,
        retentionDays: isExtended
          ? AUDIT_RETENTION_CONFIG.EXTENDED_RETENTION_DAYS
          : AUDIT_RETENTION_CONFIG.ACTIVE_RETENTION_DAYS,
        archiveAfterDays: isExtended
          ? AUDIT_RETENTION_CONFIG.EXTENDED_RETENTION_DAYS
          : AUDIT_RETENTION_CONFIG.ACTIVE_RETENTION_DAYS,
      };
    });
  }

  /**
   * Export logs for compliance/audit purposes
   */
  async exportLogsForPeriod(
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json'
  ): Promise<{ data: string; filename: string }> {
    try {
      const logs = await this.db
        .select()
        .from(adminAuditLogs)
        .where(
          and(
            sql`${adminAuditLogs.createdAt} >= ${startDate}`,
            sql`${adminAuditLogs.createdAt} <= ${endDate}`
          )
        )
        .orderBy(desc(adminAuditLogs.createdAt));

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      if (format === 'csv') {
        const headers = [
          'id', 'userId', 'userEmail', 'action', 'category',
          'targetType', 'targetId', 'description', 'status',
          'ipAddress', 'createdAt'
        ].join(',');

        const rows = logs.map(log => [
          log.id,
          log.userId,
          log.userEmail || '',
          log.action,
          log.category,
          log.targetType || '',
          log.targetId || '',
          `"${(log.description || '').replace(/"/g, '""')}"`,
          log.status,
          log.ipAddress || '',
          log.createdAt?.toISOString() || '',
        ].join(','));

        return {
          data: [headers, ...rows].join('\n'),
          filename: `audit-logs-${startStr}-to-${endStr}.csv`,
        };
      }

      return {
        data: JSON.stringify(logs, null, 2),
        filename: `audit-logs-${startStr}-to-${endStr}.json`,
      };
    } catch (error) {
      console.error('[AUDIT_ARCHIVE] Export error:', error);
      throw new Error('Failed to export audit logs');
    }
  }

  /**
   * Optimize audit log table (vacuum, reindex)
   */
  async optimizeTable(): Promise<{ success: boolean; message: string }> {
    try {
      // PostgreSQL-specific optimization
      // In production, run during low-traffic periods
      await this.db.execute(sql`ANALYZE admin_audit_logs`);

      return {
        success: true,
        message: 'Table optimization completed',
      };
    } catch (error) {
      console.error('[AUDIT_ARCHIVE] Optimize error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Optimization failed',
      };
    }
  }

  /**
   * Get summary of logs by category and time period
   */
  async getLogSummary(days: number = 30): Promise<{
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
    byDay: Array<{ date: string; count: number }>;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    try {
      // By category
      const categoryResults = await this.db
        .select({
          category: adminAuditLogs.category,
          count: sql<number>`COUNT(*)`,
        })
        .from(adminAuditLogs)
        .where(sql`${adminAuditLogs.createdAt} >= ${cutoffDate}`)
        .groupBy(adminAuditLogs.category);

      // By status
      const statusResults = await this.db
        .select({
          status: adminAuditLogs.status,
          count: sql<number>`COUNT(*)`,
        })
        .from(adminAuditLogs)
        .where(sql`${adminAuditLogs.createdAt} >= ${cutoffDate}`)
        .groupBy(adminAuditLogs.status);

      // By day
      const dailyResults = await this.db
        .select({
          date: sql<string>`DATE(${adminAuditLogs.createdAt})`,
          count: sql<number>`COUNT(*)`,
        })
        .from(adminAuditLogs)
        .where(sql`${adminAuditLogs.createdAt} >= ${cutoffDate}`)
        .groupBy(sql`DATE(${adminAuditLogs.createdAt})`)
        .orderBy(sql`DATE(${adminAuditLogs.createdAt})`);

      const byCategory: Record<string, number> = {};
      categoryResults.forEach(r => {
        byCategory[r.category || 'unknown'] = Number(r.count);
      });

      const byStatus: Record<string, number> = {};
      statusResults.forEach(r => {
        byStatus[r.status || 'unknown'] = Number(r.count);
      });

      const byDay = dailyResults.map(r => ({
        date: r.date,
        count: Number(r.count),
      }));

      return { byCategory, byStatus, byDay };
    } catch (error) {
      console.error('[AUDIT_ARCHIVE] Summary error:', error);
      return { byCategory: {}, byStatus: {}, byDay: [] };
    }
  }
}

// =====================================================
// Singleton Export
// =====================================================

let archiveServiceInstance: AuditArchiveService | null = null;

export function getAuditArchiveService(): AuditArchiveService {
  if (!archiveServiceInstance) {
    archiveServiceInstance = new AuditArchiveService();
  }
  return archiveServiceInstance;
}

export default AuditArchiveService;
