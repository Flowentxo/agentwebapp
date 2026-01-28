/**
 * Execution History Service
 *
 * Phase 6: Builder Experience Enhancement
 *
 * Provides structured execution logs grouped by loop/batch context.
 * Enables the frontend to display hierarchical execution views with
 * "Loop 1, Loop 2, Loop 3" selectors.
 *
 * Key Features:
 * - Hierarchical log aggregation by runIndex/batchIndex
 * - Fast retrieval with proper indexing
 * - Loop iteration summaries
 * - Node-level execution details
 */

import { getDb } from '@/lib/db';
import {
  workflowNodeLogs,
  WorkflowNodeLogRecord,
  NewWorkflowNodeLogRecord,
  LoopExecutionGroup,
  NodeExecutionLog,
} from '@/lib/db/schema-dx';
import { workflowExecutions } from '@/lib/db/schema-workflows';
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const logger = createLogger('execution-history-service');

// ============================================================================
// TYPES
// ============================================================================

export interface LogNodeExecutionOptions {
  executionId: string;
  workflowId: string;
  nodeId: string;
  nodeType?: string;
  nodeName?: string;
  status: 'running' | 'completed' | 'error' | 'skipped';
  runIndex?: number;
  batchIndex?: number;
  itemIndex?: number;
  loopId?: string;
  inputData?: unknown;
  outputData?: unknown;
  errorData?: {
    message: string;
    code?: string;
    stack?: string;
  };
  startedAt: Date;
  completedAt?: Date;
  metadata?: {
    retryCount?: number;
    usedPinnedData?: boolean;
    credentialsUsed?: string[];
    subWorkflowId?: string;
  };
}

export interface GetExecutionLogsOptions {
  executionId: string;
  nodeId?: string;
  runIndex?: number;
  batchIndex?: number;
  loopId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ExecutionSummary {
  executionId: string;
  workflowId: string;
  status: string;
  totalNodes: number;
  completedNodes: number;
  errorNodes: number;
  skippedNodes: number;
  totalDuration: number;
  loopIterations: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface LoopSummary {
  loopId: string;
  loopName: string;
  totalIterations: number;
  completedIterations: number;
  errorIterations: number;
  averageDuration: number;
  iterations: LoopExecutionGroup[];
}

// ============================================================================
// EXECUTION HISTORY SERVICE
// ============================================================================

export class ExecutionHistoryService {
  private db = getDb();

  // --------------------------------------------------------------------------
  // LOGGING
  // --------------------------------------------------------------------------

  /**
   * Log a node execution
   */
  async logNodeExecution(options: LogNodeExecutionOptions): Promise<WorkflowNodeLogRecord> {
    const durationMs = options.completedAt
      ? options.completedAt.getTime() - options.startedAt.getTime()
      : undefined;

    const [log] = await this.db
      .insert(workflowNodeLogs)
      .values({
        executionId: options.executionId,
        workflowId: options.workflowId,
        nodeId: options.nodeId,
        nodeType: options.nodeType,
        nodeName: options.nodeName,
        runIndex: options.runIndex ?? 0,
        batchIndex: options.batchIndex,
        itemIndex: options.itemIndex,
        loopId: options.loopId,
        status: options.status,
        inputData: options.inputData as any,
        outputData: options.outputData as any,
        errorData: options.errorData as any,
        startedAt: options.startedAt,
        completedAt: options.completedAt,
        durationMs,
        metadata: options.metadata as any,
      })
      .returning();

    logger.debug('Logged node execution', {
      executionId: options.executionId,
      nodeId: options.nodeId,
      status: options.status,
      runIndex: options.runIndex,
    });

    return log;
  }

  /**
   * Update an existing log entry
   */
  async updateNodeLog(
    logId: string,
    updates: Partial<{
      status: string;
      outputData: unknown;
      errorData: { message: string; code?: string; stack?: string };
      completedAt: Date;
      tokensUsed: number;
      costUsd: number;
      metadata: Record<string, unknown>;
    }>
  ): Promise<WorkflowNodeLogRecord | null> {
    // Calculate duration if completing
    let durationMs: number | undefined;
    if (updates.completedAt) {
      const [existing] = await this.db
        .select({ startedAt: workflowNodeLogs.startedAt })
        .from(workflowNodeLogs)
        .where(eq(workflowNodeLogs.id, logId))
        .limit(1);

      if (existing) {
        durationMs = updates.completedAt.getTime() - existing.startedAt.getTime();
      }
    }

    const [updated] = await this.db
      .update(workflowNodeLogs)
      .set({
        ...updates,
        outputData: updates.outputData as any,
        errorData: updates.errorData as any,
        metadata: updates.metadata as any,
        durationMs,
      })
      .where(eq(workflowNodeLogs.id, logId))
      .returning();

    return updated || null;
  }

  // --------------------------------------------------------------------------
  // RETRIEVAL
  // --------------------------------------------------------------------------

  /**
   * Get execution logs with optional filtering
   */
  async getExecutionLogs(options: GetExecutionLogsOptions): Promise<NodeExecutionLog[]> {
    const { executionId, nodeId, runIndex, batchIndex, loopId, status, limit = 100, offset = 0 } = options;

    let query = this.db
      .select()
      .from(workflowNodeLogs)
      .where(eq(workflowNodeLogs.executionId, executionId))
      .orderBy(asc(workflowNodeLogs.startedAt))
      .limit(limit)
      .offset(offset);

    // Build dynamic where conditions
    const conditions = [eq(workflowNodeLogs.executionId, executionId)];

    if (nodeId) {
      conditions.push(eq(workflowNodeLogs.nodeId, nodeId));
    }
    if (runIndex !== undefined) {
      conditions.push(eq(workflowNodeLogs.runIndex, runIndex));
    }
    if (batchIndex !== undefined) {
      conditions.push(eq(workflowNodeLogs.batchIndex, batchIndex));
    }
    if (loopId) {
      conditions.push(eq(workflowNodeLogs.loopId, loopId));
    }
    if (status) {
      conditions.push(eq(workflowNodeLogs.status, status));
    }

    const logs = await this.db
      .select()
      .from(workflowNodeLogs)
      .where(and(...conditions))
      .orderBy(asc(workflowNodeLogs.startedAt))
      .limit(limit)
      .offset(offset);

    return logs.map(log => this.mapToNodeExecutionLog(log));
  }

  /**
   * Get logs for a specific node across all runs
   */
  async getNodeExecutionHistory(
    workflowId: string,
    nodeId: string,
    limit: number = 10
  ): Promise<NodeExecutionLog[]> {
    const logs = await this.db
      .select()
      .from(workflowNodeLogs)
      .where(
        and(
          eq(workflowNodeLogs.workflowId, workflowId),
          eq(workflowNodeLogs.nodeId, nodeId)
        )
      )
      .orderBy(desc(workflowNodeLogs.startedAt))
      .limit(limit);

    return logs.map(log => this.mapToNodeExecutionLog(log));
  }

  // --------------------------------------------------------------------------
  // LOOP AGGREGATION
  // --------------------------------------------------------------------------

  /**
   * Get execution logs grouped by loop iterations
   * This is the main method for the Loop UI
   */
  async getLoopGroups(
    executionId: string,
    loopId?: string
  ): Promise<LoopExecutionGroup[]> {
    // Get all logs for this execution
    const conditions = [eq(workflowNodeLogs.executionId, executionId)];

    if (loopId) {
      conditions.push(eq(workflowNodeLogs.loopId, loopId));
    }

    const logs = await this.db
      .select()
      .from(workflowNodeLogs)
      .where(and(...conditions))
      .orderBy(asc(workflowNodeLogs.runIndex), asc(workflowNodeLogs.startedAt));

    // Group by runIndex
    const groups = new Map<number, WorkflowNodeLogRecord[]>();

    for (const log of logs) {
      const runIndex = log.runIndex;
      if (!groups.has(runIndex)) {
        groups.set(runIndex, []);
      }
      groups.get(runIndex)!.push(log);
    }

    // Convert to LoopExecutionGroup
    const result: LoopExecutionGroup[] = [];

    for (const [runIndex, groupLogs] of groups) {
      const firstLog = groupLogs[0];
      const lastLog = groupLogs[groupLogs.length - 1];

      // Determine overall status
      const hasError = groupLogs.some(l => l.status === 'error');
      const isRunning = groupLogs.some(l => l.status === 'running');
      const status = hasError ? 'error' : isRunning ? 'running' : 'completed';

      // Calculate duration
      const startTime = new Date(firstLog.startedAt).getTime();
      const endTime = lastLog.completedAt
        ? new Date(lastLog.completedAt).getTime()
        : Date.now();

      result.push({
        loopId: firstLog.loopId || 'main',
        loopName: firstLog.loopId ? `Loop ${firstLog.loopId}` : 'Main Execution',
        runIndex,
        batchIndex: firstLog.batchIndex || undefined,
        status,
        nodeCount: groupLogs.length,
        duration: endTime - startTime,
        startedAt: firstLog.startedAt,
        completedAt: lastLog.completedAt || undefined,
        nodes: groupLogs.map(log => this.mapToNodeExecutionLog(log)),
      });
    }

    return result;
  }

  /**
   * Get loop summary for an execution
   */
  async getLoopSummary(
    executionId: string,
    loopId: string
  ): Promise<LoopSummary | null> {
    const groups = await this.getLoopGroups(executionId, loopId);

    if (groups.length === 0) {
      return null;
    }

    const completedIterations = groups.filter(g => g.status === 'completed').length;
    const errorIterations = groups.filter(g => g.status === 'error').length;

    const totalDuration = groups.reduce((sum, g) => sum + g.duration, 0);
    const averageDuration = totalDuration / groups.length;

    return {
      loopId,
      loopName: groups[0].loopName,
      totalIterations: groups.length,
      completedIterations,
      errorIterations,
      averageDuration,
      iterations: groups,
    };
  }

  /**
   * Get all distinct loop IDs for an execution
   */
  async getLoopIds(executionId: string): Promise<string[]> {
    const result = await this.db
      .selectDistinct({ loopId: workflowNodeLogs.loopId })
      .from(workflowNodeLogs)
      .where(
        and(
          eq(workflowNodeLogs.executionId, executionId),
          sql`${workflowNodeLogs.loopId} IS NOT NULL`
        )
      );

    return result.map(r => r.loopId!).filter(Boolean);
  }

  // --------------------------------------------------------------------------
  // EXECUTION SUMMARY
  // --------------------------------------------------------------------------

  /**
   * Get execution summary
   */
  async getExecutionSummary(executionId: string): Promise<ExecutionSummary | null> {
    // Get execution record
    const [execution] = await this.db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId))
      .limit(1);

    if (!execution) {
      return null;
    }

    // Get aggregated stats from logs
    const stats = await this.db
      .select({
        totalNodes: sql<number>`count(*)`,
        completedNodes: sql<number>`count(*) filter (where status = 'completed')`,
        errorNodes: sql<number>`count(*) filter (where status = 'error')`,
        skippedNodes: sql<number>`count(*) filter (where status = 'skipped')`,
        maxRunIndex: sql<number>`max(run_index)`,
        minStarted: sql<Date>`min(started_at)`,
        maxCompleted: sql<Date>`max(completed_at)`,
      })
      .from(workflowNodeLogs)
      .where(eq(workflowNodeLogs.executionId, executionId));

    const stat = stats[0];

    const startedAt = stat.minStarted || execution.startedAt || new Date();
    const completedAt = stat.maxCompleted || execution.completedAt;
    const totalDuration = completedAt
      ? new Date(completedAt).getTime() - new Date(startedAt).getTime()
      : Date.now() - new Date(startedAt).getTime();

    return {
      executionId,
      workflowId: execution.workflowId,
      status: execution.status,
      totalNodes: Number(stat.totalNodes) || 0,
      completedNodes: Number(stat.completedNodes) || 0,
      errorNodes: Number(stat.errorNodes) || 0,
      skippedNodes: Number(stat.skippedNodes) || 0,
      totalDuration,
      loopIterations: (Number(stat.maxRunIndex) || 0) + 1,
      startedAt: new Date(startedAt),
      completedAt: completedAt ? new Date(completedAt) : undefined,
    };
  }

  /**
   * Get recent executions for a workflow
   */
  async getRecentExecutions(
    workflowId: string,
    limit: number = 10
  ): Promise<ExecutionSummary[]> {
    const executions = await this.db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.workflowId, workflowId))
      .orderBy(desc(workflowExecutions.startedAt))
      .limit(limit);

    const summaries: ExecutionSummary[] = [];

    for (const execution of executions) {
      const summary = await this.getExecutionSummary(execution.id);
      if (summary) {
        summaries.push(summary);
      }
    }

    return summaries;
  }

  // --------------------------------------------------------------------------
  // COMPARISON
  // --------------------------------------------------------------------------

  /**
   * Compare two executions (useful for debugging)
   */
  async compareExecutions(
    executionId1: string,
    executionId2: string
  ): Promise<{
    summary1: ExecutionSummary | null;
    summary2: ExecutionSummary | null;
    differences: Array<{
      nodeId: string;
      field: string;
      value1: unknown;
      value2: unknown;
    }>;
  }> {
    const [summary1, summary2] = await Promise.all([
      this.getExecutionSummary(executionId1),
      this.getExecutionSummary(executionId2),
    ]);

    const [logs1, logs2] = await Promise.all([
      this.getExecutionLogs({ executionId: executionId1 }),
      this.getExecutionLogs({ executionId: executionId2 }),
    ]);

    const differences: Array<{
      nodeId: string;
      field: string;
      value1: unknown;
      value2: unknown;
    }> = [];

    // Compare matching nodes
    const logs1Map = new Map(logs1.map(l => [l.nodeId, l]));
    const logs2Map = new Map(logs2.map(l => [l.nodeId, l]));

    for (const [nodeId, log1] of logs1Map) {
      const log2 = logs2Map.get(nodeId);

      if (!log2) {
        differences.push({
          nodeId,
          field: 'existence',
          value1: 'present',
          value2: 'missing',
        });
        continue;
      }

      // Compare status
      if (log1.status !== log2.status) {
        differences.push({
          nodeId,
          field: 'status',
          value1: log1.status,
          value2: log2.status,
        });
      }

      // Compare duration (significant difference)
      if (log1.duration && log2.duration) {
        const diff = Math.abs(log1.duration - log2.duration);
        if (diff > 1000) { // More than 1 second difference
          differences.push({
            nodeId,
            field: 'duration',
            value1: log1.duration,
            value2: log2.duration,
          });
        }
      }
    }

    // Check for nodes only in execution 2
    for (const [nodeId] of logs2Map) {
      if (!logs1Map.has(nodeId)) {
        differences.push({
          nodeId,
          field: 'existence',
          value1: 'missing',
          value2: 'present',
        });
      }
    }

    return { summary1, summary2, differences };
  }

  // --------------------------------------------------------------------------
  // CLEANUP
  // --------------------------------------------------------------------------

  /**
   * Delete old execution logs
   */
  async cleanupOldLogs(
    workflowId: string,
    keepDays: number = 30
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);

    // First, find old executions
    const oldExecutions = await this.db
      .select({ id: workflowExecutions.id })
      .from(workflowExecutions)
      .where(
        and(
          eq(workflowExecutions.workflowId, workflowId),
          sql`${workflowExecutions.startedAt} < ${cutoffDate}`
        )
      );

    if (oldExecutions.length === 0) {
      return 0;
    }

    const executionIds = oldExecutions.map(e => e.id);

    // Delete logs for those executions
    const result = await this.db
      .delete(workflowNodeLogs)
      .where(inArray(workflowNodeLogs.executionId, executionIds))
      .returning({ id: workflowNodeLogs.id });

    logger.info('Cleaned up old execution logs', {
      workflowId,
      executionsDeleted: executionIds.length,
      logsDeleted: result.length,
    });

    return result.length;
  }

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  /**
   * Map database record to NodeExecutionLog type
   */
  private mapToNodeExecutionLog(log: WorkflowNodeLogRecord): NodeExecutionLog {
    return {
      id: log.id,
      nodeId: log.nodeId,
      nodeName: log.nodeName || undefined,
      nodeType: log.nodeType || undefined,
      status: log.status,
      runIndex: log.runIndex,
      batchIndex: log.batchIndex || undefined,
      itemIndex: log.itemIndex || undefined,
      input: log.inputData,
      output: log.outputData,
      error: log.errorData as { message: string; code?: string } | undefined,
      duration: log.durationMs || undefined,
      startedAt: log.startedAt,
      completedAt: log.completedAt || undefined,
      metadata: log.metadata as { usedPinnedData?: boolean; retryCount?: number } | undefined,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let executionHistoryServiceInstance: ExecutionHistoryService | null = null;

export function getExecutionHistoryService(): ExecutionHistoryService {
  if (!executionHistoryServiceInstance) {
    executionHistoryServiceInstance = new ExecutionHistoryService();
  }
  return executionHistoryServiceInstance;
}

export default ExecutionHistoryService;
