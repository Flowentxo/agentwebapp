/**
 * ADMIN AUDIT SERVICE
 * Enterprise-grade audit logging for admin actions
 * Includes graceful fallback when table doesn't exist
 */

import { getDb } from '@/lib/db/connection';
import {
  adminAuditLogs,
  AdminAuditLog,
  NewAdminAuditLog,
  ADMIN_ACTIONS,
  adminActionCategoryEnum
} from '@/lib/db/schema-admin-audit';
import { eq, desc, and, gte, lte, like, sql, inArray } from 'drizzle-orm';

export type AdminActionCategory = 'user' | 'deployment' | 'security' | 'system' | 'config' | 'data' | 'integration';

export interface AuditLogParams {
  userId: string;
  userEmail: string;
  action: string;
  category: AdminActionCategory;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  description?: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status?: 'success' | 'failed' | 'pending';
}

export interface AuditLogFilters {
  category?: AdminActionCategory | 'all';
  timeRange?: '1h' | '24h' | '7d' | '30d' | 'all';
  user?: string;
  action?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

/**
 * Check if error is due to missing table
 */
function isTableNotFoundError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  return (
    message.includes('relation') && message.includes('does not exist') ||
    message.includes('table') && message.includes('not found') ||
    message.includes('admin_audit_logs') && message.includes('does not exist') ||
    error?.code === '42P01' // PostgreSQL error code for undefined_table
  );
}

class AdminAuditService {
  private tableExists: boolean | null = null;

  /**
   * Check if table exists (cached)
   */
  private async checkTableExists(): Promise<boolean> {
    if (this.tableExists !== null) {
      return this.tableExists;
    }

    try {
      const db = getDb();
      await db.select({ id: adminAuditLogs.id }).from(adminAuditLogs).limit(1);
      this.tableExists = true;
      return true;
    } catch (error: any) {
      if (isTableNotFoundError(error)) {
        console.warn('[ADMIN_AUDIT] Table admin_audit_logs does not exist. Run migration to enable audit logging.');
        this.tableExists = false;
        return false;
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Create a new audit log entry
   */
  async log(params: AuditLogParams): Promise<AdminAuditLog | null> {
    try {
      // Check if table exists first
      if (!(await this.checkTableExists())) {
        console.info(`[ADMIN_AUDIT] (SKIPPED - table not found) ${params.action} by ${params.userEmail}`);
        return null;
      }

      const db = getDb();

      const [result] = await db
        .insert(adminAuditLogs)
        .values({
          userId: params.userId,
          userEmail: params.userEmail,
          action: params.action,
          category: params.category,
          targetType: params.targetType || null,
          targetId: params.targetId || null,
          targetName: params.targetName || null,
          description: params.description || null,
          previousValue: params.previousValue || null,
          newValue: params.newValue || null,
          metadata: params.metadata || {},
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
          status: params.status || 'success',
        })
        .returning();

      console.info(`[ADMIN_AUDIT] ${params.action} by ${params.userEmail} - ${params.status || 'success'}`);

      return result;
    } catch (error: any) {
      if (isTableNotFoundError(error)) {
        this.tableExists = false;
        console.warn(`[ADMIN_AUDIT] (SKIPPED - table not found) ${params.action} by ${params.userEmail}`);
        return null;
      }
      console.error('[ADMIN_AUDIT] Error logging action:', error);
      throw error;
    }
  }

  /**
   * Get audit logs with filters
   */
  async getLogs(filters: AuditLogFilters = {}): Promise<{ logs: AdminAuditLog[]; total: number }> {
    try {
      // Check if table exists first
      if (!(await this.checkTableExists())) {
        return { logs: [], total: 0 };
      }

      const db = getDb();

      const conditions = [];

      // Category filter
      if (filters.category && filters.category !== 'all') {
        conditions.push(eq(adminAuditLogs.category, filters.category));
      }

      // Time range filter
      if (filters.timeRange && filters.timeRange !== 'all') {
        const now = new Date();
        let startDate: Date;

        switch (filters.timeRange) {
          case '1h':
            startDate = new Date(now.getTime() - 60 * 60 * 1000);
            break;
          case '24h':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0);
        }

        conditions.push(gte(adminAuditLogs.createdAt, startDate));
      }

      // User filter
      if (filters.user && filters.user !== 'all') {
        conditions.push(eq(adminAuditLogs.userEmail, filters.user));
      }

      // Action filter
      if (filters.action) {
        conditions.push(like(adminAuditLogs.action, `%${filters.action}%`));
      }

      // Status filter
      if (filters.status) {
        conditions.push(eq(adminAuditLogs.status, filters.status));
      }

      // Build query
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const limit = filters.limit || 100;
      const offset = filters.offset || 0;

      // Get logs
      const logs = await db
        .select()
        .from(adminAuditLogs)
        .where(whereClause)
        .orderBy(desc(adminAuditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(adminAuditLogs)
        .where(whereClause);

      return { logs, total: Number(count) };
    } catch (error: any) {
      if (isTableNotFoundError(error)) {
        this.tableExists = false;
        return { logs: [], total: 0 };
      }
      throw error;
    }
  }

  /**
   * Get unique users who have audit logs
   */
  async getAuditUsers(): Promise<string[]> {
    try {
      // Check if table exists first
      if (!(await this.checkTableExists())) {
        return [];
      }

      const db = getDb();

      const result = await db
        .selectDistinct({ userEmail: adminAuditLogs.userEmail })
        .from(adminAuditLogs)
        .orderBy(adminAuditLogs.userEmail);

      return result.map(r => r.userEmail);
    } catch (error: any) {
      if (isTableNotFoundError(error)) {
        this.tableExists = false;
        return [];
      }
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getStats(timeRange: '24h' | '7d' | '30d' = '24h'): Promise<{
    totalActions: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
    topActions: Array<{ action: string; count: number }>;
    topUsers: Array<{ userEmail: string; count: number }>;
  }> {
    // Default empty stats
    const emptyStats = {
      totalActions: 0,
      byCategory: {},
      byStatus: {},
      topActions: [],
      topUsers: [],
    };

    try {
      // Check if table exists first
      if (!(await this.checkTableExists())) {
        return emptyStats;
      }

      const db = getDb();

      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const timeCondition = gte(adminAuditLogs.createdAt, startDate);

      // Total actions
      const [{ count: totalActions }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(adminAuditLogs)
        .where(timeCondition);

      // By category
      const categoryStats = await db
        .select({
          category: adminAuditLogs.category,
          count: sql<number>`count(*)`,
        })
        .from(adminAuditLogs)
        .where(timeCondition)
        .groupBy(adminAuditLogs.category);

      const byCategory: Record<string, number> = {};
      categoryStats.forEach(s => {
        byCategory[s.category] = Number(s.count);
      });

      // By status
      const statusStats = await db
        .select({
          status: adminAuditLogs.status,
          count: sql<number>`count(*)`,
        })
        .from(adminAuditLogs)
        .where(timeCondition)
        .groupBy(adminAuditLogs.status);

      const byStatus: Record<string, number> = {};
      statusStats.forEach(s => {
        byStatus[s.status] = Number(s.count);
      });

      // Top actions
      const topActionsResult = await db
        .select({
          action: adminAuditLogs.action,
          count: sql<number>`count(*)`,
        })
        .from(adminAuditLogs)
        .where(timeCondition)
        .groupBy(adminAuditLogs.action)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      const topActions = topActionsResult.map(r => ({
        action: r.action,
        count: Number(r.count),
      }));

      // Top users
      const topUsersResult = await db
        .select({
          userEmail: adminAuditLogs.userEmail,
          count: sql<number>`count(*)`,
        })
        .from(adminAuditLogs)
        .where(timeCondition)
        .groupBy(adminAuditLogs.userEmail)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      const topUsers = topUsersResult.map(r => ({
        userEmail: r.userEmail,
        count: Number(r.count),
      }));

      return {
        totalActions: Number(totalActions),
        byCategory,
        byStatus,
        topActions,
        topUsers,
      };
    } catch (error: any) {
      if (isTableNotFoundError(error)) {
        this.tableExists = false;
        return emptyStats;
      }
      throw error;
    }
  }

  /**
   * Log user management action
   */
  async logUserAction(
    params: Omit<AuditLogParams, 'category'> & { category?: AdminActionCategory }
  ): Promise<AdminAuditLog> {
    return this.log({
      ...params,
      category: params.category || 'user',
    });
  }

  /**
   * Log security action
   */
  async logSecurityAction(
    params: Omit<AuditLogParams, 'category'>
  ): Promise<AdminAuditLog> {
    return this.log({
      ...params,
      category: 'security',
    });
  }

  /**
   * Log system action
   */
  async logSystemAction(
    params: Omit<AuditLogParams, 'category'>
  ): Promise<AdminAuditLog> {
    return this.log({
      ...params,
      category: 'system',
    });
  }

  /**
   * Log deployment action
   */
  async logDeploymentAction(
    params: Omit<AuditLogParams, 'category'>
  ): Promise<AdminAuditLog> {
    return this.log({
      ...params,
      category: 'deployment',
    });
  }
}

// Singleton instance
export const adminAuditService = new AdminAuditService();

// Export action constants
export { ADMIN_ACTIONS };
