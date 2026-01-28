/**
 * TOOL LOGGING SERVICE
 * Enterprise-grade logging for all agent tool executions
 * Tracks tool usage, performance metrics, and errors for analytics
 */

import { getDb } from '@/lib/db/connection';
import {
  toolExecutionLogs,
  toolUsageStats,
  ToolExecutionLog,
  NewToolExecutionLog,
  ToolUsageStat,
  NewToolUsageStat,
} from '@/lib/db/schema-tool-logs';
import { eq, desc, and, gte, lte, sql, between } from 'drizzle-orm';

export interface LogToolExecutionParams {
  userId: string;
  agentId: string;
  toolName: string;
  toolCallId?: string;
  arguments: Record<string, any>;
  workspaceId?: string;
  sessionId?: string;
  conversationId?: string;
  messageId?: string;
  traceId?: string;
  metadata?: Record<string, any>;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  summary: string;
}

export interface ToolLogFilters {
  userId?: string;
  agentId?: string;
  toolName?: string;
  status?: 'success' | 'error' | 'timeout' | 'cancelled';
  sessionId?: string;
  timeRange?: '1h' | '24h' | '7d' | '30d' | 'all';
  limit?: number;
  offset?: number;
}

export interface ToolStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgExecutionTimeMs: number;
  byTool: Record<string, {
    calls: number;
    successRate: number;
    avgTimeMs: number;
  }>;
  byAgent: Record<string, {
    calls: number;
    tools: string[];
  }>;
  recentErrors: Array<{
    toolName: string;
    errorMessage: string;
    timestamp: Date;
  }>;
}

/**
 * Check if error is due to missing table
 */
function isTableNotFoundError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  return (
    (message.includes('relation') && message.includes('does not exist')) ||
    (message.includes('table') && message.includes('not found')) ||
    (message.includes('tool_execution_logs') && message.includes('does not exist')) ||
    error?.code === '42P01' // PostgreSQL error code for undefined_table
  );
}

class ToolLoggingService {
  private tableExists: boolean | null = null;
  private pendingLogs: Map<string, { startTime: number; params: LogToolExecutionParams }> = new Map();

  /**
   * Check if table exists (cached)
   */
  private async checkTableExists(): Promise<boolean> {
    if (this.tableExists !== null) {
      return this.tableExists;
    }

    try {
      const db = getDb();
      await db.select({ id: toolExecutionLogs.id }).from(toolExecutionLogs).limit(1);
      this.tableExists = true;
      return true;
    } catch (error: any) {
      if (isTableNotFoundError(error)) {
        console.warn('[TOOL_LOGGING] Table tool_execution_logs does not exist. Run migration to enable tool logging.');
        this.tableExists = false;
        return false;
      }
      throw error;
    }
  }

  /**
   * Start logging a tool execution (call this when tool starts)
   */
  startExecution(executionId: string, params: LogToolExecutionParams): void {
    this.pendingLogs.set(executionId, {
      startTime: Date.now(),
      params,
    });
  }

  /**
   * Complete a tool execution log (call this when tool finishes)
   */
  async completeExecution(
    executionId: string,
    result: ToolExecutionResult,
    status: 'success' | 'error' | 'timeout' | 'cancelled' = 'success'
  ): Promise<ToolExecutionLog | null> {
    const pending = this.pendingLogs.get(executionId);
    if (!pending) {
      console.warn(`[TOOL_LOGGING] No pending execution found for ID: ${executionId}`);
      return null;
    }

    this.pendingLogs.delete(executionId);

    const executionTimeMs = Date.now() - pending.startTime;
    const { params } = pending;

    return this.log({
      ...params,
      status,
      success: result.success,
      result,
      errorMessage: result.error,
      executionTimeMs,
      startedAt: new Date(pending.startTime),
      completedAt: new Date(),
    });
  }

  /**
   * Log a complete tool execution in one call
   */
  async log(params: {
    userId: string;
    agentId: string;
    toolName: string;
    toolCallId?: string;
    arguments: Record<string, any>;
    status: 'success' | 'error' | 'timeout' | 'cancelled';
    success: boolean;
    result?: ToolExecutionResult;
    errorMessage?: string;
    errorType?: string;
    executionTimeMs?: number;
    startedAt?: Date;
    completedAt?: Date;
    workspaceId?: string;
    sessionId?: string;
    conversationId?: string;
    messageId?: string;
    traceId?: string;
    metadata?: Record<string, any>;
  }): Promise<ToolExecutionLog | null> {
    try {
      if (!(await this.checkTableExists())) {
        console.info(`[TOOL_LOGGING] (SKIPPED - table not found) ${params.toolName} by ${params.userId}`);
        return null;
      }

      const db = getDb();

      const [logEntry] = await db
        .insert(toolExecutionLogs)
        .values({
          userId: params.userId,
          workspaceId: params.workspaceId || null,
          sessionId: params.sessionId || null,
          agentId: params.agentId,
          toolName: params.toolName,
          toolCallId: params.toolCallId || null,
          arguments: params.arguments,
          status: params.status,
          success: params.success,
          result: params.result || null,
          errorMessage: params.errorMessage || null,
          errorType: params.errorType || null,
          startedAt: params.startedAt || new Date(),
          completedAt: params.completedAt || new Date(),
          executionTimeMs: params.executionTimeMs || null,
          conversationId: params.conversationId || null,
          messageId: params.messageId || null,
          traceId: params.traceId || null,
          metadata: params.metadata || {},
        })
        .returning();

      console.info(
        `[TOOL_LOGGING] ${params.toolName} ${params.status} ` +
        `(${params.executionTimeMs}ms) by ${params.userId}`
      );

      return logEntry;
    } catch (error: any) {
      if (isTableNotFoundError(error)) {
        this.tableExists = false;
        console.warn(`[TOOL_LOGGING] (SKIPPED - table not found) ${params.toolName}`);
        return null;
      }
      console.error('[TOOL_LOGGING] Error logging tool execution:', error);
      // Don't throw - logging should never break the main flow
      return null;
    }
  }

  /**
   * Quick log for simple cases
   */
  async quickLog(
    userId: string,
    agentId: string,
    toolName: string,
    args: Record<string, any>,
    result: ToolExecutionResult,
    executionTimeMs: number,
    sessionId?: string
  ): Promise<ToolExecutionLog | null> {
    return this.log({
      userId,
      agentId,
      toolName,
      arguments: args,
      status: result.success ? 'success' : 'error',
      success: result.success,
      result,
      errorMessage: result.error,
      executionTimeMs,
      sessionId,
    });
  }

  /**
   * Get tool execution logs with filters
   */
  async getLogs(filters: ToolLogFilters = {}): Promise<{
    logs: ToolExecutionLog[];
    total: number;
  }> {
    try {
      if (!(await this.checkTableExists())) {
        return { logs: [], total: 0 };
      }

      const db = getDb();
      const conditions = [];

      if (filters.userId) {
        conditions.push(eq(toolExecutionLogs.userId, filters.userId));
      }

      if (filters.agentId) {
        conditions.push(eq(toolExecutionLogs.agentId, filters.agentId));
      }

      if (filters.toolName) {
        conditions.push(eq(toolExecutionLogs.toolName, filters.toolName));
      }

      if (filters.status) {
        conditions.push(eq(toolExecutionLogs.status, filters.status));
      }

      if (filters.sessionId) {
        conditions.push(eq(toolExecutionLogs.sessionId, filters.sessionId));
      }

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

        conditions.push(gte(toolExecutionLogs.createdAt, startDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const limit = filters.limit || 100;
      const offset = filters.offset || 0;

      const logs = await db
        .select()
        .from(toolExecutionLogs)
        .where(whereClause)
        .orderBy(desc(toolExecutionLogs.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(toolExecutionLogs)
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
   * Get tool usage statistics
   */
  async getStats(
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h',
    userId?: string,
    agentId?: string
  ): Promise<ToolStats> {
    const emptyStats: ToolStats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      avgExecutionTimeMs: 0,
      byTool: {},
      byAgent: {},
      recentErrors: [],
    };

    try {
      if (!(await this.checkTableExists())) {
        return emptyStats;
      }

      const db = getDb();
      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
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
      }

      const conditions = [gte(toolExecutionLogs.createdAt, startDate)];

      if (userId) {
        conditions.push(eq(toolExecutionLogs.userId, userId));
      }

      if (agentId) {
        conditions.push(eq(toolExecutionLogs.agentId, agentId));
      }

      const whereClause = and(...conditions);

      // Total calls
      const [totals] = await db
        .select({
          total: sql<number>`count(*)`,
          successful: sql<number>`sum(case when success = true then 1 else 0 end)`,
          failed: sql<number>`sum(case when success = false then 1 else 0 end)`,
          avgTime: sql<number>`avg(execution_time_ms)`,
        })
        .from(toolExecutionLogs)
        .where(whereClause);

      // By tool
      const toolStats = await db
        .select({
          toolName: toolExecutionLogs.toolName,
          calls: sql<number>`count(*)`,
          successful: sql<number>`sum(case when success = true then 1 else 0 end)`,
          avgTime: sql<number>`avg(execution_time_ms)`,
        })
        .from(toolExecutionLogs)
        .where(whereClause)
        .groupBy(toolExecutionLogs.toolName);

      const byTool: Record<string, { calls: number; successRate: number; avgTimeMs: number }> = {};
      toolStats.forEach((stat) => {
        const calls = Number(stat.calls);
        const successful = Number(stat.successful);
        byTool[stat.toolName] = {
          calls,
          successRate: calls > 0 ? (successful / calls) * 100 : 0,
          avgTimeMs: Number(stat.avgTime) || 0,
        };
      });

      // By agent
      const agentStats = await db
        .select({
          agentId: toolExecutionLogs.agentId,
          calls: sql<number>`count(*)`,
          tools: sql<string>`array_agg(distinct tool_name)`,
        })
        .from(toolExecutionLogs)
        .where(whereClause)
        .groupBy(toolExecutionLogs.agentId);

      const byAgent: Record<string, { calls: number; tools: string[] }> = {};
      agentStats.forEach((stat) => {
        byAgent[stat.agentId] = {
          calls: Number(stat.calls),
          tools: Array.isArray(stat.tools) ? stat.tools : [],
        };
      });

      // Recent errors
      const errors = await db
        .select({
          toolName: toolExecutionLogs.toolName,
          errorMessage: toolExecutionLogs.errorMessage,
          timestamp: toolExecutionLogs.createdAt,
        })
        .from(toolExecutionLogs)
        .where(and(whereClause, eq(toolExecutionLogs.success, false)))
        .orderBy(desc(toolExecutionLogs.createdAt))
        .limit(10);

      return {
        totalCalls: Number(totals?.total) || 0,
        successfulCalls: Number(totals?.successful) || 0,
        failedCalls: Number(totals?.failed) || 0,
        avgExecutionTimeMs: Number(totals?.avgTime) || 0,
        byTool,
        byAgent,
        recentErrors: errors.map((e) => ({
          toolName: e.toolName,
          errorMessage: e.errorMessage || 'Unknown error',
          timestamp: e.timestamp,
        })),
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
   * Get logs for a specific session (for debugging)
   */
  async getSessionLogs(sessionId: string): Promise<ToolExecutionLog[]> {
    try {
      if (!(await this.checkTableExists())) {
        return [];
      }

      const db = getDb();

      return await db
        .select()
        .from(toolExecutionLogs)
        .where(eq(toolExecutionLogs.sessionId, sessionId))
        .orderBy(desc(toolExecutionLogs.createdAt));
    } catch (error: any) {
      if (isTableNotFoundError(error)) {
        this.tableExists = false;
        return [];
      }
      throw error;
    }
  }

  /**
   * Get logs for a specific conversation (for context)
   */
  async getConversationLogs(conversationId: string): Promise<ToolExecutionLog[]> {
    try {
      if (!(await this.checkTableExists())) {
        return [];
      }

      const db = getDb();

      return await db
        .select()
        .from(toolExecutionLogs)
        .where(eq(toolExecutionLogs.conversationId, conversationId))
        .orderBy(desc(toolExecutionLogs.createdAt));
    } catch (error: any) {
      if (isTableNotFoundError(error)) {
        this.tableExists = false;
        return [];
      }
      throw error;
    }
  }

  /**
   * Clean up old logs (for maintenance)
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    try {
      if (!(await this.checkTableExists())) {
        return 0;
      }

      const db = getDb();
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const result = await db
        .delete(toolExecutionLogs)
        .where(lte(toolExecutionLogs.createdAt, cutoffDate))
        .returning({ id: toolExecutionLogs.id });

      console.info(`[TOOL_LOGGING] Cleaned up ${result.length} old log entries`);
      return result.length;
    } catch (error: any) {
      if (isTableNotFoundError(error)) {
        this.tableExists = false;
        return 0;
      }
      throw error;
    }
  }
}

// Singleton instance
export const toolLoggingService = new ToolLoggingService();
