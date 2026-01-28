/**
 * MetricsService.ts
 *
 * Phase 7: Operational Intelligence Layer
 *
 * Provides aggregated metrics for the Ops Dashboard.
 * Uses materialized views and efficient SQL aggregations.
 *
 * Metrics Provided:
 * - Executions per Minute (RPM)
 * - Average Execution Duration (p50, p95, p99)
 * - Failure Rate % (Global & Per Workflow)
 * - Credit/Token Consumption (Cost Tracking)
 * - Queue Health Metrics
 *
 * Performance Strategy:
 * - Materialized views for hourly/daily aggregates
 * - In-memory caching for frequently accessed metrics
 * - Efficient window functions for percentiles
 * - Background refresh of materialized views
 */

import { getDb } from '@/lib/db';
import { sql, eq, gte, lte, and, desc, asc } from 'drizzle-orm';
import {
  metricsSnapshots,
  dailyCostAggregates,
  queueHealthSnapshots,
  MetricsSnapshot,
  DailyCostAggregate,
} from '@/lib/db/schema-monitoring';
import { LRUCache } from 'lru-cache';

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardMetrics {
  /** Current executions per minute */
  rpm: number;

  /** Executions in last hour */
  lastHourExecutions: number;

  /** Executions today */
  todayExecutions: number;

  /** Overall failure rate (last hour) */
  failureRate: number;

  /** Active (running) executions */
  activeExecutions: number;

  /** Duration percentiles (last hour) */
  duration: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
  };

  /** Cost metrics (today) */
  cost: {
    totalTokens: number;
    totalCredits: number;
    estimatedCostUsd: number;
  };

  /** Queue health summary */
  queues: {
    totalWaiting: number;
    totalActive: number;
    isHealthy: boolean;
  };

  /** Comparison with previous period */
  trends: {
    executionsChange: number; // % change
    failureRateChange: number;
    durationChange: number;
    costChange: number;
  };
}

export interface WorkflowMetrics {
  workflowId: string;
  workflowName: string;

  // Counts
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  failureRate: number;

  // Duration
  avgDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  maxDurationMs: number;

  // Cost
  totalTokens: number;
  totalCredits: number;

  // Trends (vs previous period)
  executionsTrend: number;
  failureRateTrend: number;
}

export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface MetricsTimeRange {
  from: Date;
  to: Date;
}

export type MetricGranularity = '1m' | '5m' | '15m' | '1h' | '1d';

export interface CostBreakdown {
  date: Date;
  totalTokens: number;
  totalCredits: number;
  totalCostUsd: number;
  byModel: Record<string, { tokens: number; cost: number }>;
  byWorkflow: Record<string, { tokens: number; cost: number }>;
}

// ============================================================================
// CACHE
// ============================================================================

const metricsCache = new LRUCache<string, any>({
  max: 50,
  ttl: 1000 * 30, // 30 seconds
});

function getCacheKey(method: string, ...args: any[]): string {
  return `${method}:${JSON.stringify(args)}`;
}

// ============================================================================
// METRICS SERVICE
// ============================================================================

export class MetricsService {
  private db = getDb();

  // --------------------------------------------------------------------------
  // DASHBOARD METRICS
  // --------------------------------------------------------------------------

  /**
   * Get all metrics for the ops dashboard.
   */
  async getDashboardMetrics(
    workspaceId?: string
  ): Promise<DashboardMetrics> {
    const cacheKey = getCacheKey('dashboard', workspaceId);
    const cached = metricsCache.get(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const workspaceFilter = workspaceId
      ? sql`AND workspace_id = ${workspaceId}`
      : sql``;

    // Execute all queries in parallel
    const [
      rpmResult,
      hourlyResult,
      todayResult,
      durationResult,
      costResult,
      queueResult,
      trendsResult,
    ] = await Promise.all([
      // RPM (last minute)
      this.db.execute(sql`
        SELECT COUNT(*) as cnt
        FROM execution_search_index
        WHERE started_at > NOW() - INTERVAL '1 minute'
        ${workspaceFilter}
      `),

      // Last hour executions + failure rate + active
      this.db.execute(sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          COUNT(*) FILTER (WHERE status = 'running') as active,
          ROUND(
            COUNT(*) FILTER (WHERE status = 'failed')::numeric /
            NULLIF(COUNT(*), 0) * 100, 2
          ) as failure_rate
        FROM execution_search_index
        WHERE started_at > ${oneHourAgo}
        ${workspaceFilter}
      `),

      // Today executions
      this.db.execute(sql`
        SELECT COUNT(*) as cnt
        FROM execution_search_index
        WHERE started_at >= ${startOfToday}
        ${workspaceFilter}
      `),

      // Duration percentiles (last hour)
      this.db.execute(sql`
        SELECT
          AVG(duration_ms) as avg,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as p50,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99
        FROM execution_search_index
        WHERE started_at > ${oneHourAgo}
          AND duration_ms IS NOT NULL
        ${workspaceFilter}
      `),

      // Cost metrics (today)
      this.db.execute(sql`
        SELECT
          COALESCE(SUM(token_count), 0) as total_tokens,
          COALESCE(SUM(credit_cost::numeric), 0) as total_credits
        FROM execution_search_index
        WHERE started_at >= ${startOfToday}
        ${workspaceFilter}
      `),

      // Queue health (latest snapshot)
      this.db.execute(sql`
        SELECT
          SUM(waiting_count) as total_waiting,
          SUM(active_count) as total_active,
          BOOL_AND(is_healthy) as all_healthy
        FROM (
          SELECT DISTINCT ON (queue_name)
            waiting_count, active_count, is_healthy
          FROM queue_health_snapshots
          ORDER BY queue_name, captured_at DESC
        ) latest
      `),

      // Trends (compare with previous hour)
      this.calculateTrends(workspaceId),
    ]);

    const hourlyRow = hourlyResult.rows[0] as any;
    const durationRow = durationResult.rows[0] as any;
    const costRow = costResult.rows[0] as any;
    const queueRow = queueResult.rows[0] as any;

    const result: DashboardMetrics = {
      rpm: Number((rpmResult.rows[0] as any).cnt || 0),
      lastHourExecutions: Number(hourlyRow.total || 0),
      todayExecutions: Number((todayResult.rows[0] as any).cnt || 0),
      failureRate: parseFloat(hourlyRow.failure_rate || '0'),
      activeExecutions: Number(hourlyRow.active || 0),
      duration: {
        p50: parseFloat(durationRow.p50 || '0'),
        p95: parseFloat(durationRow.p95 || '0'),
        p99: parseFloat(durationRow.p99 || '0'),
        avg: parseFloat(durationRow.avg || '0'),
      },
      cost: {
        totalTokens: Number(costRow.total_tokens || 0),
        totalCredits: parseFloat(costRow.total_credits || '0'),
        estimatedCostUsd: this.estimateCostUsd(
          Number(costRow.total_tokens || 0)
        ),
      },
      queues: {
        totalWaiting: Number(queueRow?.total_waiting || 0),
        totalActive: Number(queueRow?.total_active || 0),
        isHealthy: queueRow?.all_healthy ?? true,
      },
      trends: trendsResult,
    };

    metricsCache.set(cacheKey, result);
    return result;
  }

  // --------------------------------------------------------------------------
  // WORKFLOW METRICS
  // --------------------------------------------------------------------------

  /**
   * Get metrics for a specific workflow.
   */
  async getWorkflowMetrics(
    workflowId: string,
    timeRange?: MetricsTimeRange
  ): Promise<WorkflowMetrics> {
    const cacheKey = getCacheKey('workflow', workflowId, timeRange);
    const cached = metricsCache.get(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const from = timeRange?.from || new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const to = timeRange?.to || now;

    const result = await this.db.execute(sql`
      SELECT
        esi.workflow_id,
        esi.workflow_name,
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE status = 'completed') as success_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failure_count,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'failed')::numeric /
          NULLIF(COUNT(*), 0) * 100, 2
        ) as failure_rate,
        AVG(duration_ms) as avg_duration_ms,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as p50_duration_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms,
        MAX(duration_ms) as max_duration_ms,
        COALESCE(SUM(token_count), 0) as total_tokens,
        COALESCE(SUM(credit_cost::numeric), 0) as total_credits
      FROM execution_search_index esi
      WHERE esi.workflow_id = ${workflowId}
        AND esi.started_at BETWEEN ${from} AND ${to}
      GROUP BY esi.workflow_id, esi.workflow_name
    `);

    const row = result.rows[0] as any;

    if (!row) {
      return {
        workflowId,
        workflowName: 'Unknown',
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        failureRate: 0,
        avgDurationMs: 0,
        p50DurationMs: 0,
        p95DurationMs: 0,
        maxDurationMs: 0,
        totalTokens: 0,
        totalCredits: 0,
        executionsTrend: 0,
        failureRateTrend: 0,
      };
    }

    // Calculate trends
    const trends = await this.calculateWorkflowTrends(workflowId, from, to);

    const metrics: WorkflowMetrics = {
      workflowId: row.workflow_id,
      workflowName: row.workflow_name || 'Unknown',
      totalExecutions: Number(row.total_executions || 0),
      successCount: Number(row.success_count || 0),
      failureCount: Number(row.failure_count || 0),
      failureRate: parseFloat(row.failure_rate || '0'),
      avgDurationMs: parseFloat(row.avg_duration_ms || '0'),
      p50DurationMs: parseFloat(row.p50_duration_ms || '0'),
      p95DurationMs: parseFloat(row.p95_duration_ms || '0'),
      maxDurationMs: parseFloat(row.max_duration_ms || '0'),
      totalTokens: Number(row.total_tokens || 0),
      totalCredits: parseFloat(row.total_credits || '0'),
      executionsTrend: trends.executionsTrend,
      failureRateTrend: trends.failureRateTrend,
    };

    metricsCache.set(cacheKey, metrics);
    return metrics;
  }

  /**
   * Get top workflows by execution count.
   */
  async getTopWorkflows(
    limit: number = 10,
    timeRange?: MetricsTimeRange,
    workspaceId?: string
  ): Promise<WorkflowMetrics[]> {
    const now = new Date();
    const from = timeRange?.from || new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const to = timeRange?.to || now;

    const workspaceFilter = workspaceId
      ? sql`AND workspace_id = ${workspaceId}`
      : sql``;

    const result = await this.db.execute(sql`
      SELECT
        workflow_id,
        workflow_name,
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE status = 'completed') as success_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failure_count,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'failed')::numeric /
          NULLIF(COUNT(*), 0) * 100, 2
        ) as failure_rate,
        AVG(duration_ms) as avg_duration_ms,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as p50_duration_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms,
        MAX(duration_ms) as max_duration_ms,
        COALESCE(SUM(token_count), 0) as total_tokens,
        COALESCE(SUM(credit_cost::numeric), 0) as total_credits
      FROM execution_search_index
      WHERE started_at BETWEEN ${from} AND ${to}
        ${workspaceFilter}
      GROUP BY workflow_id, workflow_name
      ORDER BY total_executions DESC
      LIMIT ${limit}
    `);

    return (result.rows as any[]).map((row) => ({
      workflowId: row.workflow_id,
      workflowName: row.workflow_name || 'Unknown',
      totalExecutions: Number(row.total_executions || 0),
      successCount: Number(row.success_count || 0),
      failureCount: Number(row.failure_count || 0),
      failureRate: parseFloat(row.failure_rate || '0'),
      avgDurationMs: parseFloat(row.avg_duration_ms || '0'),
      p50DurationMs: parseFloat(row.p50_duration_ms || '0'),
      p95DurationMs: parseFloat(row.p95_duration_ms || '0'),
      maxDurationMs: parseFloat(row.max_duration_ms || '0'),
      totalTokens: Number(row.total_tokens || 0),
      totalCredits: parseFloat(row.total_credits || '0'),
      executionsTrend: 0,
      failureRateTrend: 0,
    }));
  }

  // --------------------------------------------------------------------------
  // TIME SERIES DATA
  // --------------------------------------------------------------------------

  /**
   * Get execution count time series.
   */
  async getExecutionTimeSeries(
    granularity: MetricGranularity,
    timeRange: MetricsTimeRange,
    workflowId?: string,
    workspaceId?: string
  ): Promise<TimeSeriesDataPoint[]> {
    const interval = this.granularityToInterval(granularity);
    const filters: any[] = [];

    if (workflowId) {
      filters.push(sql`workflow_id = ${workflowId}`);
    }
    if (workspaceId) {
      filters.push(sql`workspace_id = ${workspaceId}`);
    }

    const whereClause =
      filters.length > 0
        ? sql`AND ${sql.join(filters, sql` AND `)}`
        : sql``;

    const result = await this.db.execute(sql`
      SELECT
        date_trunc(${interval}, started_at) as bucket,
        COUNT(*) as value
      FROM execution_search_index
      WHERE started_at BETWEEN ${timeRange.from} AND ${timeRange.to}
        ${whereClause}
      GROUP BY bucket
      ORDER BY bucket ASC
    `);

    return (result.rows as any[]).map((row) => ({
      timestamp: new Date(row.bucket),
      value: Number(row.value),
    }));
  }

  /**
   * Get failure rate time series.
   */
  async getFailureRateTimeSeries(
    granularity: MetricGranularity,
    timeRange: MetricsTimeRange,
    workflowId?: string
  ): Promise<TimeSeriesDataPoint[]> {
    const interval = this.granularityToInterval(granularity);
    const workflowFilter = workflowId
      ? sql`AND workflow_id = ${workflowId}`
      : sql``;

    const result = await this.db.execute(sql`
      SELECT
        date_trunc(${interval}, started_at) as bucket,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'failed')::numeric /
          NULLIF(COUNT(*), 0) * 100, 2
        ) as value
      FROM execution_search_index
      WHERE started_at BETWEEN ${timeRange.from} AND ${timeRange.to}
        ${workflowFilter}
      GROUP BY bucket
      ORDER BY bucket ASC
    `);

    return (result.rows as any[]).map((row) => ({
      timestamp: new Date(row.bucket),
      value: parseFloat(row.value || '0'),
    }));
  }

  /**
   * Get duration percentile time series.
   */
  async getDurationTimeSeries(
    granularity: MetricGranularity,
    timeRange: MetricsTimeRange,
    percentile: number = 0.95,
    workflowId?: string
  ): Promise<TimeSeriesDataPoint[]> {
    const interval = this.granularityToInterval(granularity);
    const workflowFilter = workflowId
      ? sql`AND workflow_id = ${workflowId}`
      : sql``;

    const result = await this.db.execute(sql`
      SELECT
        date_trunc(${interval}, started_at) as bucket,
        PERCENTILE_CONT(${percentile}) WITHIN GROUP (ORDER BY duration_ms) as value
      FROM execution_search_index
      WHERE started_at BETWEEN ${timeRange.from} AND ${timeRange.to}
        AND duration_ms IS NOT NULL
        ${workflowFilter}
      GROUP BY bucket
      ORDER BY bucket ASC
    `);

    return (result.rows as any[]).map((row) => ({
      timestamp: new Date(row.bucket),
      value: parseFloat(row.value || '0'),
    }));
  }

  // --------------------------------------------------------------------------
  // COST TRACKING
  // --------------------------------------------------------------------------

  /**
   * Get cost breakdown for a date range.
   */
  async getCostBreakdown(
    timeRange: MetricsTimeRange,
    workspaceId?: string
  ): Promise<CostBreakdown[]> {
    const workspaceFilter = workspaceId
      ? sql`AND workspace_id = ${workspaceId}`
      : sql``;

    const result = await this.db.execute(sql`
      SELECT
        date_trunc('day', started_at) as date,
        SUM(token_count) as total_tokens,
        SUM(credit_cost::numeric) as total_credits,
        workflow_id,
        workflow_name
      FROM execution_search_index
      WHERE started_at BETWEEN ${timeRange.from} AND ${timeRange.to}
        ${workspaceFilter}
      GROUP BY date_trunc('day', started_at), workflow_id, workflow_name
      ORDER BY date ASC
    `);

    // Aggregate by date
    const byDate = new Map<string, CostBreakdown>();

    for (const row of result.rows as any[]) {
      const dateKey = new Date(row.date).toISOString().split('T')[0];

      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, {
          date: new Date(row.date),
          totalTokens: 0,
          totalCredits: 0,
          totalCostUsd: 0,
          byModel: {},
          byWorkflow: {},
        });
      }

      const entry = byDate.get(dateKey)!;
      const tokens = Number(row.total_tokens || 0);
      const credits = parseFloat(row.total_credits || '0');

      entry.totalTokens += tokens;
      entry.totalCredits += credits;
      entry.totalCostUsd = this.estimateCostUsd(entry.totalTokens);

      if (row.workflow_id) {
        entry.byWorkflow[row.workflow_name || row.workflow_id] = {
          tokens,
          cost: this.estimateCostUsd(tokens),
        };
      }
    }

    return Array.from(byDate.values());
  }

  /**
   * Get daily cost aggregates (from pre-computed table).
   */
  async getDailyCostAggregates(
    days: number = 30,
    workspaceId?: string
  ): Promise<DailyCostAggregate[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const conditions: any[] = [gte(dailyCostAggregates.date, startDate)];

    if (workspaceId) {
      conditions.push(eq(dailyCostAggregates.workspaceId, workspaceId));
    }

    return await this.db
      .select()
      .from(dailyCostAggregates)
      .where(and(...conditions))
      .orderBy(desc(dailyCostAggregates.date));
  }

  // --------------------------------------------------------------------------
  // SNAPSHOT STORAGE
  // --------------------------------------------------------------------------

  /**
   * Store a metrics snapshot for historical tracking.
   */
  async storeSnapshot(
    metricName: string,
    value: number,
    options: {
      workflowId?: string;
      workspaceId?: string;
      bucketSizeMinutes?: number;
      metricType?: 'counter' | 'gauge' | 'histogram';
      percentiles?: { p50?: number; p90?: number; p95?: number; p99?: number };
      labels?: Record<string, string>;
    } = {}
  ): Promise<void> {
    const now = new Date();
    const bucketSize = options.bucketSizeMinutes || 5;
    const bucketStart = new Date(
      Math.floor(now.getTime() / (bucketSize * 60 * 1000)) *
        bucketSize *
        60 *
        1000
    );
    const bucketEnd = new Date(bucketStart.getTime() + bucketSize * 60 * 1000);

    await this.db.insert(metricsSnapshots).values({
      workflowId: options.workflowId,
      workspaceId: options.workspaceId,
      metricName,
      metricType: options.metricType || 'gauge',
      bucketStart,
      bucketEnd,
      bucketSizeMinutes: bucketSize,
      value: value.toString(),
      p50: options.percentiles?.p50?.toString(),
      p90: options.percentiles?.p90?.toString(),
      p95: options.percentiles?.p95?.toString(),
      p99: options.percentiles?.p99?.toString(),
      labels: options.labels || {},
    });
  }

  /**
   * Get historical snapshots for a metric.
   */
  async getSnapshots(
    metricName: string,
    timeRange: MetricsTimeRange,
    options: {
      workflowId?: string;
      bucketSizeMinutes?: number;
    } = {}
  ): Promise<MetricsSnapshot[]> {
    const conditions: any[] = [
      eq(metricsSnapshots.metricName, metricName),
      gte(metricsSnapshots.bucketStart, timeRange.from),
      lte(metricsSnapshots.bucketEnd, timeRange.to),
    ];

    if (options.workflowId) {
      conditions.push(eq(metricsSnapshots.workflowId, options.workflowId));
    }

    if (options.bucketSizeMinutes) {
      conditions.push(
        eq(metricsSnapshots.bucketSizeMinutes, options.bucketSizeMinutes)
      );
    }

    return await this.db
      .select()
      .from(metricsSnapshots)
      .where(and(...conditions))
      .orderBy(asc(metricsSnapshots.bucketStart));
  }

  // --------------------------------------------------------------------------
  // MATERIALIZED VIEW REFRESH
  // --------------------------------------------------------------------------

  /**
   * Refresh materialized views for metrics.
   * Should be called periodically (e.g., every 5 minutes).
   */
  async refreshMaterializedViews(): Promise<void> {
    try {
      await this.db.execute(sql`SELECT refresh_monitoring_views()`);
      console.log('[MetricsService] Materialized views refreshed');
    } catch (error) {
      console.error('[MetricsService] Failed to refresh views:', error);
      // Views might not exist yet, try individual refreshes
      try {
        await this.db.execute(
          sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_hourly_execution_stats`
        );
      } catch {
        // Ignore if view doesn't exist
      }
      try {
        await this.db.execute(
          sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_execution_stats`
        );
      } catch {
        // Ignore if view doesn't exist
      }
    }
  }

  /**
   * Aggregate daily costs (run once per day).
   */
  async aggregateDailyCosts(date?: Date): Promise<void> {
    const targetDate = date || new Date();
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    await this.db.execute(sql`
      INSERT INTO daily_cost_aggregates (
        workspace_id, workflow_id, date,
        total_tokens, total_credits, total_cost_usd,
        execution_count, success_count, failure_count
      )
      SELECT
        workspace_id,
        workflow_id,
        ${targetDate} as date,
        COALESCE(SUM(token_count), 0) as total_tokens,
        COALESCE(SUM(credit_cost::numeric), 0) as total_credits,
        COALESCE(SUM(credit_cost::numeric) * 0.01, 0) as total_cost_usd,
        COUNT(*) as execution_count,
        COUNT(*) FILTER (WHERE status = 'completed') as success_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failure_count
      FROM execution_search_index
      WHERE started_at >= ${targetDate}
        AND started_at < ${nextDay}
      GROUP BY workspace_id, workflow_id
      ON CONFLICT (workspace_id, workflow_id, date) DO UPDATE SET
        total_tokens = EXCLUDED.total_tokens,
        total_credits = EXCLUDED.total_credits,
        total_cost_usd = EXCLUDED.total_cost_usd,
        execution_count = EXCLUDED.execution_count,
        success_count = EXCLUDED.success_count,
        failure_count = EXCLUDED.failure_count,
        updated_at = NOW()
    `);
  }

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  private async calculateTrends(
    workspaceId?: string
  ): Promise<DashboardMetrics['trends']> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const workspaceFilter = workspaceId
      ? sql`AND workspace_id = ${workspaceId}`
      : sql``;

    const result = await this.db.execute(sql`
      WITH current_period AS (
        SELECT
          COUNT(*) as executions,
          ROUND(
            COUNT(*) FILTER (WHERE status = 'failed')::numeric /
            NULLIF(COUNT(*), 0) * 100, 2
          ) as failure_rate,
          AVG(duration_ms) as avg_duration,
          COALESCE(SUM(credit_cost::numeric), 0) as total_cost
        FROM execution_search_index
        WHERE started_at > ${oneHourAgo}
        ${workspaceFilter}
      ),
      previous_period AS (
        SELECT
          COUNT(*) as executions,
          ROUND(
            COUNT(*) FILTER (WHERE status = 'failed')::numeric /
            NULLIF(COUNT(*), 0) * 100, 2
          ) as failure_rate,
          AVG(duration_ms) as avg_duration,
          COALESCE(SUM(credit_cost::numeric), 0) as total_cost
        FROM execution_search_index
        WHERE started_at BETWEEN ${twoHoursAgo} AND ${oneHourAgo}
        ${workspaceFilter}
      )
      SELECT
        CASE WHEN p.executions > 0
          THEN ROUND((c.executions - p.executions)::numeric / p.executions * 100, 1)
          ELSE 0
        END as executions_change,
        c.failure_rate - COALESCE(p.failure_rate, 0) as failure_rate_change,
        CASE WHEN p.avg_duration > 0
          THEN ROUND((c.avg_duration - p.avg_duration) / p.avg_duration * 100, 1)
          ELSE 0
        END as duration_change,
        CASE WHEN p.total_cost > 0
          THEN ROUND((c.total_cost - p.total_cost) / p.total_cost * 100, 1)
          ELSE 0
        END as cost_change
      FROM current_period c, previous_period p
    `);

    const row = result.rows[0] as any;

    return {
      executionsChange: parseFloat(row?.executions_change || '0'),
      failureRateChange: parseFloat(row?.failure_rate_change || '0'),
      durationChange: parseFloat(row?.duration_change || '0'),
      costChange: parseFloat(row?.cost_change || '0'),
    };
  }

  private async calculateWorkflowTrends(
    workflowId: string,
    from: Date,
    to: Date
  ): Promise<{ executionsTrend: number; failureRateTrend: number }> {
    const periodLength = to.getTime() - from.getTime();
    const previousFrom = new Date(from.getTime() - periodLength);
    const previousTo = from;

    const result = await this.db.execute(sql`
      WITH current_period AS (
        SELECT
          COUNT(*) as executions,
          ROUND(
            COUNT(*) FILTER (WHERE status = 'failed')::numeric /
            NULLIF(COUNT(*), 0) * 100, 2
          ) as failure_rate
        FROM execution_search_index
        WHERE workflow_id = ${workflowId}
          AND started_at BETWEEN ${from} AND ${to}
      ),
      previous_period AS (
        SELECT
          COUNT(*) as executions,
          ROUND(
            COUNT(*) FILTER (WHERE status = 'failed')::numeric /
            NULLIF(COUNT(*), 0) * 100, 2
          ) as failure_rate
        FROM execution_search_index
        WHERE workflow_id = ${workflowId}
          AND started_at BETWEEN ${previousFrom} AND ${previousTo}
      )
      SELECT
        CASE WHEN p.executions > 0
          THEN ROUND((c.executions - p.executions)::numeric / p.executions * 100, 1)
          ELSE 0
        END as executions_trend,
        c.failure_rate - COALESCE(p.failure_rate, 0) as failure_rate_trend
      FROM current_period c, previous_period p
    `);

    const row = result.rows[0] as any;

    return {
      executionsTrend: parseFloat(row?.executions_trend || '0'),
      failureRateTrend: parseFloat(row?.failure_rate_trend || '0'),
    };
  }

  private granularityToInterval(granularity: MetricGranularity): string {
    switch (granularity) {
      case '1m':
        return 'minute';
      case '5m':
        return '5 minutes';
      case '15m':
        return '15 minutes';
      case '1h':
        return 'hour';
      case '1d':
        return 'day';
      default:
        return 'hour';
    }
  }

  private estimateCostUsd(tokens: number): number {
    // Rough estimate: $0.01 per 1000 tokens (adjust based on model mix)
    return Math.round((tokens / 1000) * 0.01 * 100) / 100;
  }

  /**
   * Clear metrics cache.
   */
  clearCache(): void {
    metricsCache.clear();
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: MetricsService | null = null;

export function getMetricsService(): MetricsService {
  if (!instance) {
    instance = new MetricsService();
  }
  return instance;
}

export default MetricsService;
