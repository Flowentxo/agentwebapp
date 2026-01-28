/**
 * PERFORMANCE MONITORING SERVICE
 *
 * Track and analyze system performance:
 * - API response times
 * - Database query performance
 * - Agent execution metrics
 * - Memory and CPU usage
 * - Error rates
 */

import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

// ============================================
// TYPES
// ============================================

export interface PerformanceMetric {
  id: string;
  type: "api" | "database" | "agent" | "workflow" | "cache";
  name: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  status: "success" | "error";
  errorMessage?: string;
}

export interface AggregatedMetrics {
  type: string;
  name: string;
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50: number;
  p95: number;
  p99: number;
  errorRate: number;
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  activeConnections: number;
  errorRate: number;
  avgResponseTime: number;
  lastChecked: Date;
}

// ============================================
// IN-MEMORY METRICS BUFFER
// ============================================

const metricsBuffer: PerformanceMetric[] = [];
const BUFFER_SIZE = 1000;
const FLUSH_INTERVAL = 30000; // 30 seconds

// ============================================
// PERFORMANCE TRACKER
// ============================================

export class PerformanceTracker {
  private static instance: PerformanceTracker;
  private startTime: Date;
  private flushTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.startTime = new Date();
    this.startAutoFlush();
  }

  static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }

  /**
   * Track a performance metric
   */
  track(metric: Omit<PerformanceMetric, "id" | "timestamp">): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    metricsBuffer.push(fullMetric);

    // Keep buffer size manageable
    if (metricsBuffer.length > BUFFER_SIZE) {
      metricsBuffer.shift();
    }
  }

  /**
   * Track API call
   */
  trackAPI(
    endpoint: string,
    method: string,
    duration: number,
    status: "success" | "error",
    statusCode?: number,
    errorMessage?: string
  ): void {
    this.track({
      type: "api",
      name: `${method} ${endpoint}`,
      duration,
      status,
      errorMessage,
      metadata: { method, endpoint, statusCode },
    });
  }

  /**
   * Track database query
   */
  trackDatabase(
    query: string,
    duration: number,
    status: "success" | "error",
    rowCount?: number,
    errorMessage?: string
  ): void {
    // Sanitize query for tracking
    const sanitizedQuery = query.substring(0, 100);

    this.track({
      type: "database",
      name: sanitizedQuery,
      duration,
      status,
      errorMessage,
      metadata: { rowCount },
    });
  }

  /**
   * Track agent execution
   */
  trackAgent(
    agentId: string,
    duration: number,
    status: "success" | "error",
    tokensUsed?: number,
    errorMessage?: string
  ): void {
    this.track({
      type: "agent",
      name: agentId,
      duration,
      status,
      errorMessage,
      metadata: { tokensUsed },
    });
  }

  /**
   * Track workflow execution
   */
  trackWorkflow(
    workflowId: string,
    duration: number,
    status: "success" | "error",
    stepsCompleted?: number,
    errorMessage?: string
  ): void {
    this.track({
      type: "workflow",
      name: workflowId,
      duration,
      status,
      errorMessage,
      metadata: { stepsCompleted },
    });
  }

  /**
   * Track cache operation
   */
  trackCache(
    operation: "hit" | "miss" | "set" | "delete",
    key: string,
    duration: number
  ): void {
    this.track({
      type: "cache",
      name: `cache:${operation}`,
      duration,
      status: "success",
      metadata: { key: key.substring(0, 50) },
    });
  }

  /**
   * Create a timer for measuring durations
   */
  startTimer(): () => number {
    const start = performance.now();
    return () => Math.round(performance.now() - start);
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(
    type?: string,
    limit = 100
  ): PerformanceMetric[] {
    let metrics = [...metricsBuffer];

    if (type) {
      metrics = metrics.filter((m) => m.type === type);
    }

    return metrics.slice(-limit).reverse();
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(
    type?: string,
    periodMinutes = 60
  ): AggregatedMetrics[] {
    const cutoff = new Date(Date.now() - periodMinutes * 60 * 1000);
    let metrics = metricsBuffer.filter((m) => m.timestamp >= cutoff);

    if (type) {
      metrics = metrics.filter((m) => m.type === type);
    }

    // Group by type and name
    const groups = new Map<string, PerformanceMetric[]>();

    for (const metric of metrics) {
      const key = `${metric.type}:${metric.name}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(metric);
    }

    // Calculate aggregates
    const results: AggregatedMetrics[] = [];

    for (const [key, groupMetrics] of groups) {
      const [metricType, name] = key.split(":");
      const durations = groupMetrics.map((m) => m.duration).sort((a, b) => a - b);
      const errors = groupMetrics.filter((m) => m.status === "error").length;

      results.push({
        type: metricType,
        name,
        count: groupMetrics.length,
        avgDuration: Math.round(
          durations.reduce((a, b) => a + b, 0) / durations.length
        ),
        minDuration: durations[0],
        maxDuration: durations[durations.length - 1],
        p50: durations[Math.floor(durations.length * 0.5)],
        p95: durations[Math.floor(durations.length * 0.95)],
        p99: durations[Math.floor(durations.length * 0.99)],
        errorRate: errors / groupMetrics.length,
      });
    }

    return results.sort((a, b) => b.count - a.count);
  }

  /**
   * Get system health
   */
  getSystemHealth(): SystemHealth {
    const now = new Date();
    const recentMetrics = metricsBuffer.filter(
      (m) => m.timestamp >= new Date(now.getTime() - 5 * 60 * 1000) // Last 5 minutes
    );

    const errors = recentMetrics.filter((m) => m.status === "error").length;
    const avgDuration =
      recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
        : 0;

    const errorRate = recentMetrics.length > 0 ? errors / recentMetrics.length : 0;

    // Get memory usage (Node.js)
    const memUsage = process.memoryUsage();

    let status: SystemHealth["status"] = "healthy";
    if (errorRate > 0.1 || avgDuration > 5000) {
      status = "unhealthy";
    } else if (errorRate > 0.05 || avgDuration > 2000) {
      status = "degraded";
    }

    return {
      status,
      uptime: Math.floor((now.getTime() - this.startTime.getTime()) / 1000),
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      },
      activeConnections: recentMetrics.filter((m) => m.type === "database").length,
      errorRate: Math.round(errorRate * 100) / 100,
      avgResponseTime: Math.round(avgDuration),
      lastChecked: now,
    };
  }

  /**
   * Get slow queries/operations
   */
  getSlowOperations(thresholdMs = 1000, limit = 20): PerformanceMetric[] {
    return metricsBuffer
      .filter((m) => m.duration >= thresholdMs)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get error summary
   */
  getErrorSummary(periodMinutes = 60): {
    total: number;
    byType: Record<string, number>;
    recentErrors: PerformanceMetric[];
  } {
    const cutoff = new Date(Date.now() - periodMinutes * 60 * 1000);
    const errors = metricsBuffer.filter(
      (m) => m.status === "error" && m.timestamp >= cutoff
    );

    const byType: Record<string, number> = {};
    for (const error of errors) {
      byType[error.type] = (byType[error.type] || 0) + 1;
    }

    return {
      total: errors.length,
      byType,
      recentErrors: errors.slice(-10).reverse(),
    };
  }

  /**
   * Flush metrics to database
   */
  async flushToDatabase(): Promise<void> {
    if (metricsBuffer.length === 0) return;

    const db = getDb();
    const batch = metricsBuffer.splice(0, 100);

    try {
      for (const metric of batch) {
        await db.execute(sql`
          INSERT INTO performance_metrics (id, type, name, duration, status, error_message, metadata, created_at)
          VALUES (
            ${metric.id},
            ${metric.type},
            ${metric.name.substring(0, 255)},
            ${metric.duration},
            ${metric.status},
            ${metric.errorMessage || null},
            ${JSON.stringify(metric.metadata || {})},
            ${metric.timestamp.toISOString()}
          )
        `);
      }
    } catch (error) {
      // Re-add metrics to buffer if flush fails
      metricsBuffer.unshift(...batch);
      console.error("[PERF_TRACKER] Failed to flush metrics:", error);
    }
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushToDatabase().catch(console.error);
    }, FLUSH_INTERVAL);
  }

  /**
   * Stop tracking and cleanup
   */
  cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
  }
}

// Export singleton instance
export const performanceTracker = PerformanceTracker.getInstance();

// Export helper functions
export function trackAPI(
  endpoint: string,
  method: string,
  duration: number,
  status: "success" | "error",
  statusCode?: number
): void {
  performanceTracker.trackAPI(endpoint, method, duration, status, statusCode);
}

export function trackDatabase(
  query: string,
  duration: number,
  status: "success" | "error"
): void {
  performanceTracker.trackDatabase(query, duration, status);
}

export function trackAgent(
  agentId: string,
  duration: number,
  status: "success" | "error",
  tokensUsed?: number
): void {
  performanceTracker.trackAgent(agentId, duration, status, tokensUsed);
}

export function createTimer(): () => number {
  return performanceTracker.startTimer();
}
