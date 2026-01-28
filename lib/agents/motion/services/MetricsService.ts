/**
 * MetricsService - Enterprise Monitoring & Metrics System
 *
 * Provides comprehensive monitoring and metrics collection for the Motion AI system
 *
 * Features:
 * - Real-time metrics collection
 * - Counter, Gauge, Histogram metrics
 * - Prometheus-compatible output
 * - Health checks
 * - Performance monitoring
 * - Resource usage tracking
 * - Agent-level metrics
 * - Request/response metrics
 * - Custom metric support
 * - Alerting thresholds
 */

import { EventEmitter } from 'events';
import { logger, LoggerInstance } from './LoggingService';

// ============================================
// TYPES & INTERFACES
// ============================================

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export interface MetricLabels {
  [key: string]: string | number;
}

export interface MetricValue {
  value: number;
  timestamp: number;
  labels?: MetricLabels;
}

export interface Metric {
  name: string;
  type: MetricType;
  description: string;
  unit?: string;
  values: MetricValue[];
  labels?: MetricLabels;
}

export interface HistogramBucket {
  le: number; // less than or equal
  count: number;
}

export interface HistogramMetric extends Metric {
  type: 'histogram';
  buckets: number[];
  observations: number[];
  sum: number;
  count: number;
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  lastCheck: number;
  duration: number;
  details?: Record<string, unknown>;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: HealthCheck[];
  metrics: {
    requestsPerSecond: number;
    errorRate: number;
    averageLatency: number;
    activeConnections: number;
  };
}

export interface AlertThreshold {
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  severity: 'warning' | 'critical';
  message: string;
}

export interface Alert {
  id: string;
  metric: string;
  threshold: AlertThreshold;
  currentValue: number;
  triggeredAt: number;
  acknowledged: boolean;
}

export interface MetricsConfig {
  // Collection settings
  enableCollection: boolean;
  collectionInterval: number; // ms
  retentionPeriod: number; // ms

  // Histogram settings
  defaultBuckets: number[];

  // Health check settings
  healthCheckInterval: number; // ms

  // Alert settings
  enableAlerts: boolean;
  alertCooldown: number; // ms

  // Export settings
  enablePrometheusExport: boolean;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_METRICS_CONFIG: MetricsConfig = {
  enableCollection: true,
  collectionInterval: 10000, // 10 seconds
  retentionPeriod: 3600000, // 1 hour
  defaultBuckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  healthCheckInterval: 30000, // 30 seconds
  enableAlerts: true,
  alertCooldown: 300000, // 5 minutes
  enablePrometheusExport: true,
};

// ============================================
// METRICS SERVICE
// ============================================

export class MetricsService extends EventEmitter {
  private static instance: MetricsService;
  private config: MetricsConfig;
  private log: LoggerInstance;

  // Metrics storage
  private counters: Map<string, MetricValue[]> = new Map();
  private gauges: Map<string, MetricValue[]> = new Map();
  private histograms: Map<string, HistogramMetric> = new Map();

  // Health checks
  private healthChecks: Map<string, () => Promise<HealthCheck>> = new Map();
  private lastHealthResults: Map<string, HealthCheck> = new Map();

  // Alerts
  private thresholds: AlertThreshold[] = [];
  private activeAlerts: Map<string, Alert> = new Map();
  private alertCooldowns: Map<string, number> = new Map();

  // Timing
  private startTime: number = Date.now();
  private collectionTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  // Request tracking
  private requestCount: number = 0;
  private errorCount: number = 0;
  private latencies: number[] = [];

  private constructor(config: Partial<MetricsConfig> = {}) {
    super();
    this.config = { ...DEFAULT_METRICS_CONFIG, ...config };
    this.log = logger.createLogger({
      service: 'metrics',
      component: 'monitoring',
    });

    this.registerDefaultHealthChecks();
    this.startCollection();
    this.log.info('MetricsService initialized');
  }

  public static getInstance(config?: Partial<MetricsConfig>): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService(config);
    }
    return MetricsService.instance;
  }

  // ============================================
  // COUNTER METRICS
  // ============================================

  /**
   * Increment a counter
   */
  incrementCounter(name: string, value: number = 1, labels?: MetricLabels): void {
    const key = this.getMetricKey(name, labels);
    const values = this.counters.get(key) || [];

    values.push({
      value,
      timestamp: Date.now(),
      labels,
    });

    // Cleanup old values
    this.pruneValues(values);
    this.counters.set(key, values);

    this.checkThresholds(name, this.getCounterTotal(name, labels));
  }

  /**
   * Get counter total
   */
  getCounterTotal(name: string, labels?: MetricLabels): number {
    const key = this.getMetricKey(name, labels);
    const values = this.counters.get(key) || [];
    return values.reduce((sum, v) => sum + v.value, 0);
  }

  /**
   * Get counter rate (per second)
   */
  getCounterRate(name: string, labels?: MetricLabels, windowMs: number = 60000): number {
    const key = this.getMetricKey(name, labels);
    const values = this.counters.get(key) || [];
    const cutoff = Date.now() - windowMs;
    const recentValues = values.filter(v => v.timestamp > cutoff);
    const total = recentValues.reduce((sum, v) => sum + v.value, 0);
    return total / (windowMs / 1000);
  }

  // ============================================
  // GAUGE METRICS
  // ============================================

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, labels?: MetricLabels): void {
    const key = this.getMetricKey(name, labels);
    const values = this.gauges.get(key) || [];

    values.push({
      value,
      timestamp: Date.now(),
      labels,
    });

    this.pruneValues(values);
    this.gauges.set(key, values);

    this.checkThresholds(name, value);
  }

  /**
   * Increment a gauge
   */
  incrementGauge(name: string, value: number = 1, labels?: MetricLabels): void {
    const current = this.getGaugeValue(name, labels);
    this.setGauge(name, current + value, labels);
  }

  /**
   * Decrement a gauge
   */
  decrementGauge(name: string, value: number = 1, labels?: MetricLabels): void {
    const current = this.getGaugeValue(name, labels);
    this.setGauge(name, Math.max(0, current - value), labels);
  }

  /**
   * Get current gauge value
   */
  getGaugeValue(name: string, labels?: MetricLabels): number {
    const key = this.getMetricKey(name, labels);
    const values = this.gauges.get(key) || [];
    return values.length > 0 ? values[values.length - 1].value : 0;
  }

  // ============================================
  // HISTOGRAM METRICS
  // ============================================

  /**
   * Observe a histogram value
   */
  observeHistogram(name: string, value: number, labels?: MetricLabels): void {
    const key = this.getMetricKey(name, labels);
    let histogram = this.histograms.get(key);

    if (!histogram) {
      histogram = {
        name,
        type: 'histogram',
        description: `Histogram for ${name}`,
        values: [],
        buckets: [...this.config.defaultBuckets],
        observations: new Array(this.config.defaultBuckets.length).fill(0),
        sum: 0,
        count: 0,
        labels,
      };
      this.histograms.set(key, histogram);
    }

    // Update buckets
    for (let i = 0; i < histogram.buckets.length; i++) {
      if (value <= histogram.buckets[i]) {
        histogram.observations[i]++;
      }
    }

    histogram.sum += value;
    histogram.count++;

    // Store individual observation
    histogram.values.push({
      value,
      timestamp: Date.now(),
      labels,
    });

    this.pruneValues(histogram.values);
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats(name: string, labels?: MetricLabels): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p90: number;
    p99: number;
  } | null {
    const key = this.getMetricKey(name, labels);
    const histogram = this.histograms.get(key);

    if (!histogram || histogram.values.length === 0) {
      return null;
    }

    const sortedValues = [...histogram.values]
      .map(v => v.value)
      .sort((a, b) => a - b);

    return {
      count: histogram.count,
      sum: histogram.sum,
      avg: histogram.sum / histogram.count,
      min: sortedValues[0],
      max: sortedValues[sortedValues.length - 1],
      p50: this.percentile(sortedValues, 50),
      p90: this.percentile(sortedValues, 90),
      p99: this.percentile(sortedValues, 99),
    };
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  // ============================================
  // REQUEST TRACKING
  // ============================================

  /**
   * Track a request
   */
  trackRequest(options: {
    method?: string;
    path?: string;
    status?: number;
    duration?: number;
    agentId?: string;
    error?: boolean;
  }): void {
    this.requestCount++;

    if (options.error) {
      this.errorCount++;
    }

    if (options.duration !== undefined) {
      this.latencies.push(options.duration);
      if (this.latencies.length > 1000) {
        this.latencies.shift();
      }
      this.observeHistogram('http_request_duration_seconds', options.duration / 1000, {
        method: options.method || 'unknown',
        path: options.path || 'unknown',
        status: options.status?.toString() || 'unknown',
      });
    }

    this.incrementCounter('http_requests_total', 1, {
      method: options.method || 'unknown',
      status: options.status?.toString() || 'unknown',
      agentId: options.agentId || 'unknown',
    });

    if (options.error) {
      this.incrementCounter('http_requests_errors_total', 1);
    }
  }

  /**
   * Start request timer
   */
  startRequestTimer(): () => number {
    const start = process.hrtime.bigint();
    return () => {
      const end = process.hrtime.bigint();
      return Number(end - start) / 1000000; // Convert to ms
    };
  }

  // ============================================
  // HEALTH CHECKS
  // ============================================

  /**
   * Register a health check
   */
  registerHealthCheck(name: string, check: () => Promise<HealthCheck>): void {
    this.healthChecks.set(name, check);
  }

  /**
   * Register default health checks
   */
  private registerDefaultHealthChecks(): void {
    // Memory health check
    this.registerHealthCheck('memory', async () => {
      const used = process.memoryUsage();
      const heapUsedPercent = (used.heapUsed / used.heapTotal) * 100;

      return {
        name: 'memory',
        status: heapUsedPercent > 90 ? 'unhealthy' : heapUsedPercent > 70 ? 'degraded' : 'healthy',
        message: `Heap usage: ${heapUsedPercent.toFixed(1)}%`,
        lastCheck: Date.now(),
        duration: 0,
        details: {
          heapUsed: Math.round(used.heapUsed / 1024 / 1024),
          heapTotal: Math.round(used.heapTotal / 1024 / 1024),
          external: Math.round(used.external / 1024 / 1024),
          rss: Math.round(used.rss / 1024 / 1024),
        },
      };
    });

    // Error rate health check
    this.registerHealthCheck('error_rate', async () => {
      const errorRate = this.requestCount > 0
        ? (this.errorCount / this.requestCount) * 100
        : 0;

      return {
        name: 'error_rate',
        status: errorRate > 10 ? 'unhealthy' : errorRate > 5 ? 'degraded' : 'healthy',
        message: `Error rate: ${errorRate.toFixed(2)}%`,
        lastCheck: Date.now(),
        duration: 0,
        details: {
          totalRequests: this.requestCount,
          totalErrors: this.errorCount,
          errorRate,
        },
      };
    });

    // Latency health check
    this.registerHealthCheck('latency', async () => {
      const avgLatency = this.latencies.length > 0
        ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
        : 0;

      return {
        name: 'latency',
        status: avgLatency > 5000 ? 'unhealthy' : avgLatency > 2000 ? 'degraded' : 'healthy',
        message: `Avg latency: ${avgLatency.toFixed(2)}ms`,
        lastCheck: Date.now(),
        duration: 0,
        details: {
          average: avgLatency,
          samples: this.latencies.length,
        },
      };
    });
  }

  /**
   * Run all health checks
   */
  async runHealthChecks(): Promise<HealthCheck[]> {
    const results: HealthCheck[] = [];

    for (const [name, check] of this.healthChecks) {
      const start = Date.now();
      try {
        const result = await check();
        result.duration = Date.now() - start;
        results.push(result);
        this.lastHealthResults.set(name, result);
      } catch (error) {
        const result: HealthCheck = {
          name,
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Unknown error',
          lastCheck: Date.now(),
          duration: Date.now() - start,
        };
        results.push(result);
        this.lastHealthResults.set(name, result);
      }
    }

    return results;
  }

  /**
   * Get overall system health
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const checks = await this.runHealthChecks();

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (checks.some(c => c.status === 'unhealthy')) {
      status = 'unhealthy';
    } else if (checks.some(c => c.status === 'degraded')) {
      status = 'degraded';
    }

    // Calculate metrics
    const requestsPerSecond = this.getCounterRate('http_requests_total');
    const errorRate = this.requestCount > 0
      ? (this.errorCount / this.requestCount) * 100
      : 0;
    const avgLatency = this.latencies.length > 0
      ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
      : 0;

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: '2.3.0-enterprise',
      checks,
      metrics: {
        requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
        errorRate: Math.round(errorRate * 100) / 100,
        averageLatency: Math.round(avgLatency * 100) / 100,
        activeConnections: this.getGaugeValue('active_connections'),
      },
    };
  }

  // ============================================
  // ALERTS
  // ============================================

  /**
   * Add alert threshold
   */
  addThreshold(threshold: AlertThreshold): void {
    this.thresholds.push(threshold);
  }

  /**
   * Check thresholds and trigger alerts
   */
  private checkThresholds(metricName: string, value: number): void {
    if (!this.config.enableAlerts) return;

    const matchingThresholds = this.thresholds.filter(t => t.metric === metricName);

    for (const threshold of matchingThresholds) {
      const triggered = this.evaluateCondition(value, threshold.condition, threshold.value);

      if (triggered) {
        this.triggerAlert(metricName, threshold, value);
      } else {
        // Clear alert if condition no longer met
        const alertKey = `${metricName}:${threshold.condition}:${threshold.value}`;
        this.activeAlerts.delete(alertKey);
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private evaluateCondition(value: number, condition: AlertThreshold['condition'], threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      default: return false;
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(metric: string, threshold: AlertThreshold, currentValue: number): void {
    const alertKey = `${metric}:${threshold.condition}:${threshold.value}`;
    const now = Date.now();

    // Check cooldown
    const lastAlert = this.alertCooldowns.get(alertKey);
    if (lastAlert && now - lastAlert < this.config.alertCooldown) {
      return;
    }

    const alert: Alert = {
      id: `${alertKey}:${now}`,
      metric,
      threshold,
      currentValue,
      triggeredAt: now,
      acknowledged: false,
    };

    this.activeAlerts.set(alertKey, alert);
    this.alertCooldowns.set(alertKey, now);

    this.emit('alert', alert);
    this.log.warn('Alert triggered', {
      metric,
      threshold: threshold.value,
      condition: threshold.condition,
      currentValue,
      severity: threshold.severity,
    });
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    for (const alert of this.activeAlerts.values()) {
      if (alert.id === alertId) {
        alert.acknowledged = true;
        return true;
      }
    }
    return false;
  }

  // ============================================
  // PROMETHEUS EXPORT
  // ============================================

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    // Export counters
    for (const [key, values] of this.counters) {
      const total = values.reduce((sum, v) => sum + v.value, 0);
      const labels = values[0]?.labels;
      const labelsStr = labels ? this.formatLabels(labels) : '';
      lines.push(`# TYPE ${key.split(':')[0]} counter`);
      lines.push(`${key.split(':')[0]}${labelsStr} ${total}`);
    }

    // Export gauges
    for (const [key, values] of this.gauges) {
      if (values.length === 0) continue;
      const current = values[values.length - 1];
      const labels = current.labels;
      const labelsStr = labels ? this.formatLabels(labels) : '';
      lines.push(`# TYPE ${key.split(':')[0]} gauge`);
      lines.push(`${key.split(':')[0]}${labelsStr} ${current.value}`);
    }

    // Export histograms
    for (const [key, histogram] of this.histograms) {
      const name = key.split(':')[0];
      const labels = histogram.labels;
      const labelsStr = labels ? this.formatLabels(labels) : '';

      lines.push(`# TYPE ${name} histogram`);

      // Export buckets
      let cumulative = 0;
      for (let i = 0; i < histogram.buckets.length; i++) {
        cumulative += histogram.observations[i];
        lines.push(`${name}_bucket{le="${histogram.buckets[i]}"${labelsStr ? ',' + labelsStr.slice(1, -1) : ''}} ${cumulative}`);
      }
      lines.push(`${name}_bucket{le="+Inf"${labelsStr ? ',' + labelsStr.slice(1, -1) : ''}} ${histogram.count}`);
      lines.push(`${name}_sum${labelsStr} ${histogram.sum}`);
      lines.push(`${name}_count${labelsStr} ${histogram.count}`);
    }

    return lines.join('\n');
  }

  /**
   * Format labels for Prometheus
   */
  private formatLabels(labels: MetricLabels): string {
    const pairs = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `{${pairs}}`;
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Get metric key with labels
   */
  private getMetricKey(name: string, labels?: MetricLabels): string {
    if (!labels) return name;
    const labelParts = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}:${labelParts}`;
  }

  /**
   * Prune old values based on retention period
   */
  private pruneValues(values: MetricValue[]): void {
    const cutoff = Date.now() - this.config.retentionPeriod;
    while (values.length > 0 && values[0].timestamp < cutoff) {
      values.shift();
    }
  }

  /**
   * Start automatic collection
   */
  private startCollection(): void {
    if (this.config.enableCollection && this.config.collectionInterval > 0) {
      this.collectionTimer = setInterval(() => {
        this.collectSystemMetrics();
      }, this.config.collectionInterval);
    }

    if (this.config.healthCheckInterval > 0) {
      this.healthCheckTimer = setInterval(() => {
        this.runHealthChecks();
      }, this.config.healthCheckInterval);
    }
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    const memory = process.memoryUsage();

    this.setGauge('process_memory_heap_bytes', memory.heapUsed);
    this.setGauge('process_memory_rss_bytes', memory.rss);
    this.setGauge('process_uptime_seconds', (Date.now() - this.startTime) / 1000);
  }

  /**
   * Get all metrics summary
   */
  getMetricsSummary(): Record<string, unknown> {
    const summary: Record<string, unknown> = {
      counters: {},
      gauges: {},
      histograms: {},
    };

    for (const [key] of this.counters) {
      const name = key.split(':')[0];
      (summary.counters as Record<string, number>)[name] = this.getCounterTotal(name);
    }

    for (const [key] of this.gauges) {
      const name = key.split(':')[0];
      (summary.gauges as Record<string, number>)[name] = this.getGaugeValue(name);
    }

    for (const [key, histogram] of this.histograms) {
      (summary.histograms as Record<string, unknown>)[key] = {
        count: histogram.count,
        sum: histogram.sum,
        avg: histogram.count > 0 ? histogram.sum / histogram.count : 0,
      };
    }

    return summary;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.requestCount = 0;
    this.errorCount = 0;
    this.latencies = [];
    this.activeAlerts.clear();
    this.alertCooldowns.clear();
  }

  /**
   * Shutdown the service
   */
  shutdown(): void {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
    }
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const metrics = MetricsService.getInstance();

export default MetricsService;
