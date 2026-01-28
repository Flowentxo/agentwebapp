/**
 * Monitoring Services Index
 *
 * Phase 7: Operational Intelligence Layer
 *
 * Exports all monitoring services for easy import.
 */

// Services
export {
  ExecutionSearchService,
  getExecutionSearchService,
  type SearchQuery,
  type SearchOptions,
  type SearchResult,
  type ExecutionSearchResult,
  type JsonPathFilter,
} from './ExecutionSearchService';

export {
  MetricsService,
  getMetricsService,
  type DashboardMetrics,
  type WorkflowMetrics,
  type TimeSeriesDataPoint,
  type MetricsTimeRange,
  type MetricGranularity,
  type CostBreakdown,
} from './MetricsService';

export {
  AlertingService,
  getAlertingService,
  type AlertEvaluationResult,
  type CreateAlertRuleInput,
  type AlertNotificationResult,
  type IncidentContext,
} from './AlertingService';

export {
  QueueMonitor,
  getQueueMonitor,
  type QueueHealth,
  type QueueMetrics,
  type QueueMonitorConfig,
} from './QueueMonitor';

// Re-export types from schema
export type {
  AlertRule,
  AlertIncident,
  AlertSeverity,
  AlertStatus,
  AlertConditionType,
  AlertAction,
  FailureCountCondition,
  FailureRateCondition,
  DurationThresholdCondition,
  QueueBacklogCondition,
  ErrorPatternCondition,
  CostThresholdCondition,
} from '@/lib/db/schema-monitoring';

/**
 * Initialize all monitoring services.
 * Call this during server startup.
 */
export function initializeMonitoring(options?: {
  enableAlerting?: boolean;
  enableQueueMonitor?: boolean;
  alertingIntervalMs?: number;
}): {
  metricsService: ReturnType<typeof getMetricsService>;
  searchService: ReturnType<typeof getExecutionSearchService>;
  alertingService: ReturnType<typeof getAlertingService>;
  queueMonitor: ReturnType<typeof getQueueMonitor>;
} {
  const metricsService = getMetricsService();
  const searchService = getExecutionSearchService();
  const alertingService = getAlertingService();
  const queueMonitor = getQueueMonitor();

  // Start background services
  if (options?.enableAlerting !== false) {
    alertingService.start(options?.alertingIntervalMs || 30000);
    console.log('[Monitoring] Alerting service started');
  }

  if (options?.enableQueueMonitor !== false) {
    queueMonitor.start();
    console.log('[Monitoring] Queue monitor started');
  }

  // Schedule periodic tasks
  // Refresh materialized views every 5 minutes
  setInterval(
    () => {
      metricsService.refreshMaterializedViews().catch(console.error);
    },
    5 * 60 * 1000
  );

  // Aggregate daily costs at midnight
  const now = new Date();
  const msUntilMidnight =
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() -
    now.getTime();

  setTimeout(() => {
    // Run immediately at midnight
    metricsService.aggregateDailyCosts().catch(console.error);

    // Then every 24 hours
    setInterval(
      () => {
        metricsService.aggregateDailyCosts().catch(console.error);
      },
      24 * 60 * 60 * 1000
    );
  }, msUntilMidnight);

  console.log('[Monitoring] All services initialized');

  return {
    metricsService,
    searchService,
    alertingService,
    queueMonitor,
  };
}

/**
 * Shutdown monitoring services gracefully.
 */
export function shutdownMonitoring(): void {
  const alertingService = getAlertingService();
  const queueMonitor = getQueueMonitor();

  alertingService.stop();
  queueMonitor.stop();

  console.log('[Monitoring] Services stopped');
}
