/**
 * PHASE 7: Monitoring & Observability
 * Central exports for all monitoring services
 */

// Metrics Service
export {
  MetricsService,
  getMetricsService,
  initializeMetrics,
  AGENT_METRICS,
  type MetricType,
  type MetricLabel,
  type MetricValue,
  type HistogramValue,
  type MetricDefinition,
} from './MetricsService';

// Error Tracking Service
export {
  ErrorTrackingService,
  getErrorTrackingService,
  initializeErrorTracking,
  trackAgentError,
  trackLLMError,
  trackWorkflowError,
  type ErrorSeverity,
  type ErrorCategory,
  type TrackedError,
  type ErrorAlert,
  type ErrorSummary,
  type AlertConfig,
} from './ErrorTrackingService';

// Dashboard Service
export {
  AgentDashboardService,
  getDashboardService,
  type HealthStatus,
  type AgentHealth,
  type SystemHealth,
  type AgentStats,
  type DashboardData,
  type ActivityItem,
  type TopMetrics,
  type TimeSeriesDataPoint,
  type AgentTimeSeriesData,
} from './AgentDashboardService';

// ============================================
// INITIALIZATION HELPER
// ============================================

import { initializeMetrics } from './MetricsService';
import { initializeErrorTracking } from './ErrorTrackingService';
import { getDashboardService } from './AgentDashboardService';

let initialized = false;

/**
 * Initialize all monitoring services
 */
export async function initializeMonitoring(redisUrl?: string): Promise<void> {
  if (initialized) {
    console.log('[MONITORING] Already initialized');
    return;
  }

  console.log('[MONITORING] Initializing monitoring services...');

  try {
    // Initialize metrics
    await initializeMetrics(redisUrl);
    console.log('[MONITORING] Metrics service initialized');

    // Initialize error tracking
    await initializeErrorTracking(redisUrl);
    console.log('[MONITORING] Error tracking initialized');

    // Initialize dashboard (no async init needed)
    getDashboardService();
    console.log('[MONITORING] Dashboard service initialized');

    initialized = true;
    console.log('[MONITORING] All monitoring services initialized successfully');
  } catch (error) {
    console.error('[MONITORING] Failed to initialize monitoring services:', error);
    throw error;
  }
}

/**
 * Check if monitoring is initialized
 */
export function isMonitoringInitialized(): boolean {
  return initialized;
}
