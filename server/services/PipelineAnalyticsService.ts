/**
 * PipelineAnalyticsService
 *
 * Aggregates analytics data from workflow executions and BullMQ
 * for the Pipeline Analytics Dashboard
 */

import { getDb } from '@/lib/db';
import { workflowExecutions, workflows } from '@/lib/db/schema-workflows';
import { eq, desc, sql, and, gte, lte, count } from 'drizzle-orm';

// =====================================================
// TYPES
// =====================================================

export interface PipelineMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  totalCost: number;
  avgCostPerRun: number;
  avgDuration: number;
  totalDuration: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  count: number;
  cost: number;
  successCount: number;
  failureCount: number;
  avgDuration: number;
}

export interface ExecutionRecord {
  id: string;
  pipelineId: string;
  pipelineName: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  cost: number;
  nodeCount: number;
  errorMessage?: string;
}

export interface NodeErrorStats {
  nodeId: string;
  nodeType: string;
  nodeName: string;
  errorCount: number;
  errorRate: number;
  lastError: string;
  lastErrorAt: string;
}

export interface PipelineAnalytics {
  metrics: PipelineMetrics;
  timeSeries: TimeSeriesDataPoint[];
  recentExecutions: ExecutionRecord[];
  nodeErrors: NodeErrorStats[];
  topPipelines: Array<{
    id: string;
    name: string;
    runCount: number;
    totalCost: number;
    successRate: number;
  }>;
}

export interface AnalyticsFilters {
  userId?: string;
  pipelineId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: 'success' | 'error' | 'running' | 'pending';
  limit?: number;
}

// =====================================================
// SERVICE CLASS
// =====================================================

export class PipelineAnalyticsService {
  private db = getDb();

  /**
   * Get comprehensive analytics for pipelines
   */
  async getAnalytics(filters: AnalyticsFilters = {}): Promise<PipelineAnalytics> {
    const [metrics, timeSeries, recentExecutions, nodeErrors, topPipelines] =
      await Promise.all([
        this.getMetrics(filters),
        this.getTimeSeries(filters),
        this.getRecentExecutions(filters),
        this.getNodeErrors(filters),
        this.getTopPipelines(filters),
      ]);

    return {
      metrics,
      timeSeries,
      recentExecutions,
      nodeErrors,
      topPipelines,
    };
  }

  /**
   * Get aggregate metrics
   */
  async getMetrics(filters: AnalyticsFilters = {}): Promise<PipelineMetrics> {
    const whereConditions = this.buildWhereConditions(filters);

    const result = await this.db
      .select({
        totalRuns: count(),
        successfulRuns: sql<number>`COUNT(CASE WHEN status = 'success' THEN 1 END)`,
        failedRuns: sql<number>`COUNT(CASE WHEN status = 'error' THEN 1 END)`,
        totalCost: sql<number>`COALESCE(SUM((output->>'cost')::numeric), 0)`,
        avgDuration: sql<number>`COALESCE(AVG(duration_ms), 0)`,
        totalDuration: sql<number>`COALESCE(SUM(duration_ms), 0)`,
      })
      .from(workflowExecutions)
      .where(and(...whereConditions));

    const row = result[0] || {};
    const totalRuns = Number(row.totalRuns) || 0;
    const successfulRuns = Number(row.successfulRuns) || 0;
    const failedRuns = Number(row.failedRuns) || 0;
    const totalCost = Number(row.totalCost) || 0;

    return {
      totalRuns,
      successfulRuns,
      failedRuns,
      successRate: totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0,
      totalCost,
      avgCostPerRun: totalRuns > 0 ? totalCost / totalRuns : 0,
      avgDuration: Number(row.avgDuration) || 0,
      totalDuration: Number(row.totalDuration) || 0,
    };
  }

  /**
   * Get time series data for charts
   */
  async getTimeSeries(
    filters: AnalyticsFilters = {},
    granularity: 'hour' | 'day' | 'week' = 'day'
  ): Promise<TimeSeriesDataPoint[]> {
    const whereConditions = this.buildWhereConditions(filters);

    const dateFormat =
      granularity === 'hour'
        ? 'YYYY-MM-DD HH24:00'
        : granularity === 'week'
          ? 'IYYY-IW'
          : 'YYYY-MM-DD';

    const result = await this.db
      .select({
        date: sql<string>`TO_CHAR(created_at, '${sql.raw(dateFormat)}')`,
        count: count(),
        cost: sql<number>`COALESCE(SUM((output->>'cost')::numeric), 0)`,
        successCount: sql<number>`COUNT(CASE WHEN status = 'success' THEN 1 END)`,
        failureCount: sql<number>`COUNT(CASE WHEN status = 'error' THEN 1 END)`,
        avgDuration: sql<number>`COALESCE(AVG(duration_ms), 0)`,
      })
      .from(workflowExecutions)
      .where(and(...whereConditions))
      .groupBy(sql`TO_CHAR(created_at, '${sql.raw(dateFormat)}')`)
      .orderBy(sql`TO_CHAR(created_at, '${sql.raw(dateFormat)}')`);

    return result.map((row) => ({
      date: row.date,
      count: Number(row.count),
      cost: Number(row.cost),
      successCount: Number(row.successCount),
      failureCount: Number(row.failureCount),
      avgDuration: Number(row.avgDuration),
    }));
  }

  /**
   * Get recent execution history
   */
  async getRecentExecutions(
    filters: AnalyticsFilters = {}
  ): Promise<ExecutionRecord[]> {
    const whereConditions = this.buildWhereConditions(filters);
    const limit = filters.limit || 50;

    const result = await this.db
      .select({
        id: workflowExecutions.id,
        pipelineId: workflowExecutions.workflowId,
        status: workflowExecutions.status,
        startedAt: workflowExecutions.startedAt,
        completedAt: workflowExecutions.completedAt,
        durationMs: workflowExecutions.durationMs,
        output: workflowExecutions.output,
        logs: workflowExecutions.logs,
      })
      .from(workflowExecutions)
      .where(and(...whereConditions))
      .orderBy(desc(workflowExecutions.createdAt))
      .limit(limit);

    // Get pipeline names
    const pipelineIds = [...new Set(result.map((r) => r.pipelineId))];
    const pipelinesResult = await this.db
      .select({ id: workflows.id, name: workflows.name })
      .from(workflows)
      .where(sql`id = ANY(${pipelineIds})`);

    const pipelineMap = new Map(pipelinesResult.map((p) => [p.id, p.name]));

    return result.map((row) => {
      const output = row.output as Record<string, unknown> | null;
      const logs = row.logs as Array<{ level?: string; message?: string }> | null;

      // Extract error from logs
      const errorLog = logs?.find((l) => l.level === 'error');

      return {
        id: row.id,
        pipelineId: row.pipelineId,
        pipelineName: pipelineMap.get(row.pipelineId) || 'Unknown',
        status: row.status,
        startedAt: row.startedAt?.toISOString() || '',
        completedAt: row.completedAt?.toISOString() || null,
        durationMs: row.durationMs,
        cost: Number(output?.cost) || 0,
        nodeCount: Number(output?.nodeCount) || 0,
        errorMessage: errorLog?.message,
      };
    });
  }

  /**
   * Get node error statistics
   */
  async getNodeErrors(filters: AnalyticsFilters = {}): Promise<NodeErrorStats[]> {
    const whereConditions = this.buildWhereConditions(filters);

    // Get executions with errors
    const executions = await this.db
      .select({
        logs: workflowExecutions.logs,
        createdAt: workflowExecutions.createdAt,
      })
      .from(workflowExecutions)
      .where(and(...whereConditions, eq(workflowExecutions.status, 'error')))
      .orderBy(desc(workflowExecutions.createdAt))
      .limit(100);

    // Aggregate errors by node
    const nodeErrorMap = new Map<
      string,
      {
        nodeId: string;
        nodeType: string;
        nodeName: string;
        errors: string[];
        lastError: string;
        lastErrorAt: Date;
      }
    >();

    for (const exec of executions) {
      const logs = exec.logs as Array<{
        nodeId?: string;
        nodeName?: string;
        level?: string;
        message?: string;
        data?: { nodeType?: string };
      }> | null;

      if (!logs) continue;

      for (const log of logs) {
        if (log.level === 'error' && log.nodeId) {
          const existing = nodeErrorMap.get(log.nodeId);
          if (existing) {
            existing.errors.push(log.message || 'Unknown error');
          } else {
            nodeErrorMap.set(log.nodeId, {
              nodeId: log.nodeId,
              nodeType: log.data?.nodeType || 'unknown',
              nodeName: log.nodeName || log.nodeId,
              errors: [log.message || 'Unknown error'],
              lastError: log.message || 'Unknown error',
              lastErrorAt: exec.createdAt || new Date(),
            });
          }
        }
      }
    }

    // Calculate total executions for error rate
    const totalExecs = executions.length || 1;

    return Array.from(nodeErrorMap.values())
      .map((node) => ({
        nodeId: node.nodeId,
        nodeType: node.nodeType,
        nodeName: node.nodeName,
        errorCount: node.errors.length,
        errorRate: (node.errors.length / totalExecs) * 100,
        lastError: node.lastError,
        lastErrorAt: node.lastErrorAt.toISOString(),
      }))
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 10);
  }

  /**
   * Get top pipelines by usage
   */
  async getTopPipelines(
    filters: AnalyticsFilters = {}
  ): Promise<
    Array<{
      id: string;
      name: string;
      runCount: number;
      totalCost: number;
      successRate: number;
    }>
  > {
    const whereConditions = this.buildWhereConditions(filters);

    const result = await this.db
      .select({
        pipelineId: workflowExecutions.workflowId,
        runCount: count(),
        totalCost: sql<number>`COALESCE(SUM((output->>'cost')::numeric), 0)`,
        successCount: sql<number>`COUNT(CASE WHEN status = 'success' THEN 1 END)`,
      })
      .from(workflowExecutions)
      .where(and(...whereConditions))
      .groupBy(workflowExecutions.workflowId)
      .orderBy(desc(count()))
      .limit(10);

    // Get pipeline names
    const pipelineIds = result.map((r) => r.pipelineId);
    const pipelinesResult = await this.db
      .select({ id: workflows.id, name: workflows.name })
      .from(workflows)
      .where(sql`id = ANY(${pipelineIds})`);

    const pipelineMap = new Map(pipelinesResult.map((p) => [p.id, p.name]));

    return result.map((row) => {
      const runCount = Number(row.runCount);
      const successCount = Number(row.successCount);

      return {
        id: row.pipelineId,
        name: pipelineMap.get(row.pipelineId) || 'Unknown',
        runCount,
        totalCost: Number(row.totalCost),
        successRate: runCount > 0 ? (successCount / runCount) * 100 : 0,
      };
    });
  }

  /**
   * Get cost breakdown by model/operation
   */
  async getCostBreakdown(
    filters: AnalyticsFilters = {}
  ): Promise<
    Array<{
      category: string;
      cost: number;
      percentage: number;
      count: number;
    }>
  > {
    const whereConditions = this.buildWhereConditions(filters);

    // Get executions with cost data
    const executions = await this.db
      .select({
        output: workflowExecutions.output,
      })
      .from(workflowExecutions)
      .where(and(...whereConditions))
      .limit(1000);

    // Aggregate by model/operation
    const breakdown = new Map<string, { cost: number; count: number }>();

    for (const exec of executions) {
      const output = exec.output as Record<string, unknown> | null;
      const costBreakdown = output?.costBreakdown as Record<
        string,
        { cost: number }
      > | null;

      if (costBreakdown) {
        for (const [category, data] of Object.entries(costBreakdown)) {
          const existing = breakdown.get(category) || { cost: 0, count: 0 };
          existing.cost += data.cost;
          existing.count += 1;
          breakdown.set(category, existing);
        }
      }
    }

    const totalCost = Array.from(breakdown.values()).reduce(
      (sum, v) => sum + v.cost,
      0
    );

    return Array.from(breakdown.entries())
      .map(([category, data]) => ({
        category,
        cost: data.cost,
        percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0,
        count: data.count,
      }))
      .sort((a, b) => b.cost - a.cost);
  }

  /**
   * Get execution duration percentiles
   */
  async getDurationPercentiles(filters: AnalyticsFilters = {}): Promise<{
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
    avg: number;
  }> {
    const whereConditions = this.buildWhereConditions(filters);

    const result = await this.db
      .select({
        p50: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms)`,
        p75: sql<number>`PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY duration_ms)`,
        p90: sql<number>`PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY duration_ms)`,
        p95: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)`,
        p99: sql<number>`PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms)`,
        min: sql<number>`MIN(duration_ms)`,
        max: sql<number>`MAX(duration_ms)`,
        avg: sql<number>`AVG(duration_ms)`,
      })
      .from(workflowExecutions)
      .where(and(...whereConditions));

    const row = result[0] || {};

    return {
      p50: Number(row.p50) || 0,
      p75: Number(row.p75) || 0,
      p90: Number(row.p90) || 0,
      p95: Number(row.p95) || 0,
      p99: Number(row.p99) || 0,
      min: Number(row.min) || 0,
      max: Number(row.max) || 0,
      avg: Number(row.avg) || 0,
    };
  }

  /**
   * Build where conditions from filters
   */
  private buildWhereConditions(filters: AnalyticsFilters) {
    const conditions = [];

    if (filters.userId) {
      conditions.push(eq(workflowExecutions.userId, filters.userId));
    }

    if (filters.pipelineId) {
      conditions.push(eq(workflowExecutions.workflowId, filters.pipelineId));
    }

    if (filters.status) {
      conditions.push(eq(workflowExecutions.status, filters.status));
    }

    if (filters.startDate) {
      conditions.push(gte(workflowExecutions.createdAt, filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(lte(workflowExecutions.createdAt, filters.endDate));
    }

    // Default: return true condition if no filters
    if (conditions.length === 0) {
      conditions.push(sql`1=1`);
    }

    return conditions;
  }
}

// Singleton instance
export const pipelineAnalyticsService = new PipelineAnalyticsService();
