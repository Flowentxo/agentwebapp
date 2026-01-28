/**
 * Audit Service
 * Comprehensive audit logging for compliance and security monitoring
 */

import { getDb } from '@/lib/db';
import { brainAuditLogs, type NewBrainAuditLog, type BrainAuditLog } from '@/lib/db/schema-brain-security';
import { desc, and, eq, gte, lte } from 'drizzle-orm';

export interface AuditLogOptions {
  userId?: string;
  agentId?: string;
  apiKeyId?: string;
  ipAddress?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  workspaceId?: string;
  endpoint?: string;
  method?: string;
  success: boolean;
  errorMessage?: string;
}

export interface AuditQueryOptions {
  workspaceId?: string;
  userId?: string;
  agentId?: string;
  action?: string;
  resource?: string;
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  successRate: number;
  actionsByType: Record<string, number>;
  actionsByResource: Record<string, number>;
  topUsers: Array<{ userId: string; count: number }>;
  topAgents: Array<{ agentId: string; count: number }>;
  recentErrors: Array<{ action: string; error: string; timestamp: Date }>;
}

export class AuditService {
  private static instance: AuditService;
  private db = getDb();
  private logBuffer: NewBrainAuditLog[] = [];
  private bufferSize = 50; // Batch write after 50 logs
  private flushInterval = 5000; // Flush every 5 seconds
  private flushTimer?: NodeJS.Timeout;

  private constructor() {
    // Start auto-flush timer
    this.flushTimer = setInterval(() => {
      this.flushLogs().catch(err =>
        console.error('[AuditService] Auto-flush error:', err)
      );
    }, this.flushInterval);
  }

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Log an action (buffered for performance)
   */
  public async logAction(options: AuditLogOptions): Promise<void> {
    const logEntry: NewBrainAuditLog = {
      userId: options.userId,
      agentId: options.agentId,
      apiKeyId: options.apiKeyId,
      ipAddress: options.ipAddress,
      action: options.action,
      resource: options.resource,
      resourceId: options.resourceId,
      details: options.details as any,
      workspaceId: options.workspaceId,
      endpoint: options.endpoint,
      method: options.method,
      success: options.success,
      errorMessage: options.errorMessage,
    };

    // Add to buffer
    this.logBuffer.push(logEntry);

    // Flush if buffer is full
    if (this.logBuffer.length >= this.bufferSize) {
      await this.flushLogs();
    }
  }

  /**
   * Flush buffered logs to database
   */
  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logsToWrite = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await this.db.insert(brainAuditLogs).values(logsToWrite);
      console.log(`[AuditService] Flushed ${logsToWrite.length} audit logs`);
    } catch (error) {
      console.error('[AuditService] Flush error:', error);
      // Re-add to buffer if failed (limited to prevent infinite growth)
      if (this.logBuffer.length < this.bufferSize * 2) {
        this.logBuffer.unshift(...logsToWrite);
      }
    }
  }

  /**
   * Query audit logs
   */
  public async queryLogs(options: AuditQueryOptions = {}): Promise<BrainAuditLog[]> {
    const {
      workspaceId,
      userId,
      agentId,
      action,
      resource,
      success,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
    } = options;

    try {
      // Flush pending logs before query
      await this.flushLogs();

      // Build query conditions
      const conditions = [];

      if (workspaceId) conditions.push(eq(brainAuditLogs.workspaceId, workspaceId));
      if (userId) conditions.push(eq(brainAuditLogs.userId, userId));
      if (agentId) conditions.push(eq(brainAuditLogs.agentId, agentId));
      if (action) conditions.push(eq(brainAuditLogs.action, action));
      if (resource) conditions.push(eq(brainAuditLogs.resource, resource));
      if (success !== undefined) conditions.push(eq(brainAuditLogs.success, success));
      if (startDate) conditions.push(gte(brainAuditLogs.createdAt, startDate));
      if (endDate) conditions.push(lte(brainAuditLogs.createdAt, endDate));

      // Execute query
      const logs = await this.db
        .select()
        .from(brainAuditLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(brainAuditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      return logs;
    } catch (error) {
      console.error('[AuditService] Query error:', error);
      return [];
    }
  }

  /**
   * Get audit statistics
   */
  public async getStats(options: {
    workspaceId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<AuditStats> {
    try {
      await this.flushLogs();

      const conditions = [];
      if (options.workspaceId) conditions.push(eq(brainAuditLogs.workspaceId, options.workspaceId));
      if (options.startDate) conditions.push(gte(brainAuditLogs.createdAt, options.startDate));
      if (options.endDate) conditions.push(lte(brainAuditLogs.createdAt, options.endDate));

      const logs = await this.db
        .select()
        .from(brainAuditLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const totalActions = logs.length;
      const successfulActions = logs.filter(log => log.success).length;
      const failedActions = totalActions - successfulActions;
      const successRate = totalActions > 0 ? successfulActions / totalActions : 0;

      // Count by action type
      const actionsByType: Record<string, number> = {};
      logs.forEach(log => {
        actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
      });

      // Count by resource
      const actionsByResource: Record<string, number> = {};
      logs.forEach(log => {
        actionsByResource[log.resource] = (actionsByResource[log.resource] || 0) + 1;
      });

      // Top users
      const userCounts = new Map<string, number>();
      logs.forEach(log => {
        if (log.userId) {
          userCounts.set(log.userId, (userCounts.get(log.userId) || 0) + 1);
        }
      });
      const topUsers = Array.from(userCounts.entries())
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Top agents
      const agentCounts = new Map<string, number>();
      logs.forEach(log => {
        if (log.agentId) {
          agentCounts.set(log.agentId, (agentCounts.get(log.agentId) || 0) + 1);
        }
      });
      const topAgents = Array.from(agentCounts.entries())
        .map(([agentId, count]) => ({ agentId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Recent errors
      const recentErrors = logs
        .filter(log => !log.success && log.errorMessage)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .map(log => ({
          action: log.action,
          error: log.errorMessage || 'Unknown error',
          timestamp: new Date(log.createdAt),
        }));

      return {
        totalActions,
        successfulActions,
        failedActions,
        successRate,
        actionsByType,
        actionsByResource,
        topUsers,
        topAgents,
        recentErrors,
      };
    } catch (error) {
      console.error('[AuditService] Stats error:', error);
      return {
        totalActions: 0,
        successfulActions: 0,
        failedActions: 0,
        successRate: 0,
        actionsByType: {},
        actionsByResource: {},
        topUsers: [],
        topAgents: [],
        recentErrors: [],
      };
    }
  }

  /**
   * Export audit logs (for compliance)
   */
  public async exportLogs(options: AuditQueryOptions & {
    format?: 'json' | 'csv';
  }): Promise<string> {
    const logs = await this.queryLogs(options);
    const format = options.format || 'json';

    if (format === 'csv') {
      // CSV Export
      const headers = ['timestamp', 'user', 'agent', 'action', 'resource', 'success', 'error'];
      const rows = logs.map(log => [
        new Date(log.createdAt).toISOString(),
        log.userId || '',
        log.agentId || '',
        log.action,
        log.resource,
        log.success ? 'true' : 'false',
        log.errorMessage || '',
      ]);

      return [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');
    } else {
      // JSON Export
      return JSON.stringify(logs, null, 2);
    }
  }

  /**
   * Cleanup old audit logs (keep last N days)
   */
  public async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    try {
      await this.flushLogs();

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deleted = await this.db
        .delete(brainAuditLogs)
        .where(lte(brainAuditLogs.createdAt, cutoffDate));

      console.log(`[AuditService] Cleaned up ${deleted.rowCount || 0} old audit logs`);
      return deleted.rowCount || 0;
    } catch (error) {
      console.error('[AuditService] Cleanup error:', error);
      return 0;
    }
  }

  /**
   * Shutdown (flush remaining logs)
   */
  public async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flushLogs();
  }
}

export const auditService = AuditService.getInstance();

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    auditService.shutdown().catch(err =>
      console.error('[AuditService] Shutdown error:', err)
    );
  });

  process.on('SIGINT', () => {
    auditService.shutdown().catch(err =>
      console.error('[AuditService] Shutdown error:', err)
    );
  });
}
