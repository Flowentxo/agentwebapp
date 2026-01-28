/**
 * PHASE 7: Agent Dashboard Service
 * Aggregates metrics, errors, and health data for dashboard display
 */

import { getMetricsService, MetricsService } from './MetricsService';
import { getErrorTrackingService, ErrorTrackingService, ErrorSummary } from './ErrorTrackingService';

// ============================================
// DASHBOARD TYPES
// ============================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface AgentHealth {
  agentId: string;
  status: HealthStatus;
  lastActivity: Date | null;
  uptime: number; // seconds
  errorRate: number; // percentage
  avgResponseTime: number; // seconds
  activeWorkflows?: number;
  pendingTasks?: number;
}

export interface SystemHealth {
  overall: HealthStatus;
  agents: AgentHealth[];
  database: { status: HealthStatus; latency: number };
  redis: { status: HealthStatus; latency: number };
  llm: { status: HealthStatus; latency: number };
  timestamp: Date;
}

export interface AgentStats {
  agentId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  avgResponseTime: number;
  tokensUsed: number;
  toolExecutions: number;
  errors: number;
  lastHour: {
    requests: number;
    errors: number;
  };
}

export interface DashboardData {
  systemHealth: SystemHealth;
  agentStats: AgentStats[];
  errorSummary: ErrorSummary;
  recentActivity: ActivityItem[];
  topMetrics: TopMetrics;
  timestamp: Date;
}

export interface ActivityItem {
  id: string;
  timestamp: Date;
  agentId: string;
  type: 'request' | 'error' | 'workflow' | 'tool' | 'alert';
  message: string;
  severity?: 'info' | 'warning' | 'error';
  metadata?: Record<string, unknown>;
}

export interface TopMetrics {
  totalRequests24h: number;
  totalTokens24h: number;
  avgResponseTime24h: number;
  errorRate24h: number;
  activeWorkflows: number;
  ticketsResolved24h: number;
  reportsGenerated24h: number;
}

export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
}

export interface AgentTimeSeriesData {
  agentId: string;
  requests: TimeSeriesDataPoint[];
  errors: TimeSeriesDataPoint[];
  responseTime: TimeSeriesDataPoint[];
}

// ============================================
// DASHBOARD SERVICE
// ============================================

export class AgentDashboardService {
  private metrics: MetricsService;
  private errorTracking: ErrorTrackingService;
  private activityLog: ActivityItem[] = [];
  private agentStartTimes: Map<string, Date> = new Map();
  private readonly MAX_ACTIVITY_ITEMS = 1000;

  // Supported agent IDs
  private readonly AGENT_IDS = ['dexter', 'cassie', 'aura'];

  constructor() {
    this.metrics = getMetricsService();
    this.errorTracking = getErrorTrackingService();

    // Initialize agent start times
    const now = new Date();
    for (const agentId of this.AGENT_IDS) {
      this.agentStartTimes.set(agentId, now);
    }
  }

  /**
   * Get complete dashboard data
   */
  public async getDashboardData(): Promise<DashboardData> {
    const [systemHealth, agentStats, errorSummary] = await Promise.all([
      this.getSystemHealth(),
      this.getAgentStats(),
      Promise.resolve(this.errorTracking.getErrorSummary({ since: this.get24HoursAgo() })),
    ]);

    return {
      systemHealth,
      agentStats,
      errorSummary,
      recentActivity: this.getRecentActivity(50),
      topMetrics: this.getTopMetrics(),
      timestamp: new Date(),
    };
  }

  /**
   * Get system health status
   */
  public async getSystemHealth(): Promise<SystemHealth> {
    const agents = await Promise.all(
      this.AGENT_IDS.map(id => this.getAgentHealth(id))
    );

    // Determine overall status
    let overall: HealthStatus = 'healthy';
    if (agents.some(a => a.status === 'unhealthy')) {
      overall = 'unhealthy';
    } else if (agents.some(a => a.status === 'degraded')) {
      overall = 'degraded';
    }

    // Check infrastructure (simplified - in production would do actual health checks)
    const dbHealth = await this.checkDatabaseHealth();
    const redisHealth = await this.checkRedisHealth();
    const llmHealth = await this.checkLLMHealth();

    if (dbHealth.status === 'unhealthy' || redisHealth.status === 'unhealthy') {
      overall = 'unhealthy';
    } else if (dbHealth.status === 'degraded' || redisHealth.status === 'degraded' || llmHealth.status === 'degraded') {
      overall = overall === 'healthy' ? 'degraded' : overall;
    }

    return {
      overall,
      agents,
      database: dbHealth,
      redis: redisHealth,
      llm: llmHealth,
      timestamp: new Date(),
    };
  }

  /**
   * Get health status for a specific agent
   */
  public async getAgentHealth(agentId: string): Promise<AgentHealth> {
    const startTime = this.agentStartTimes.get(agentId) || new Date();
    const uptime = (Date.now() - startTime.getTime()) / 1000;

    // Get metrics
    const totalRequests = this.metrics.getCounter('agent_requests_total', { agent_id: agentId, status: 'success' }) +
                          this.metrics.getCounter('agent_requests_total', { agent_id: agentId, status: 'error' });
    const errorRequests = this.metrics.getCounter('agent_requests_total', { agent_id: agentId, status: 'error' });
    const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;

    // Get average response time from histogram
    const histogram = this.metrics.getHistogram('agent_request_duration_seconds', { agent_id: agentId, tool: 'chat' });
    const avgResponseTime = histogram && histogram.count > 0 ? histogram.sum / histogram.count : 0;

    // Get active workflows for Aura
    let activeWorkflows: number | undefined;
    if (agentId === 'aura') {
      activeWorkflows = this.metrics.getGauge('aura_active_workflows', {});
    }

    // Determine status
    let status: HealthStatus = 'healthy';
    if (errorRate > 25) {
      status = 'unhealthy';
    } else if (errorRate > 10 || avgResponseTime > 10) {
      status = 'degraded';
    }

    // Get last activity
    const recentActivity = this.activityLog.filter(a => a.agentId === agentId);
    const lastActivity = recentActivity.length > 0 ? recentActivity[0].timestamp : null;

    return {
      agentId,
      status,
      lastActivity,
      uptime,
      errorRate,
      avgResponseTime,
      activeWorkflows,
    };
  }

  /**
   * Get statistics for all agents
   */
  public async getAgentStats(): Promise<AgentStats[]> {
    return Promise.all(this.AGENT_IDS.map(id => this.getAgentStatistics(id)));
  }

  /**
   * Get detailed statistics for an agent
   */
  public async getAgentStatistics(agentId: string): Promise<AgentStats> {
    const successfulRequests = this.metrics.getCounter('agent_requests_total', { agent_id: agentId, status: 'success' });
    const failedRequests = this.metrics.getCounter('agent_requests_total', { agent_id: agentId, status: 'error' });
    const totalRequests = successfulRequests + failedRequests;

    // Get histogram for response time
    const histogram = this.metrics.getHistogram('agent_request_duration_seconds', { agent_id: agentId, tool: 'chat' });
    const avgResponseTime = histogram && histogram.count > 0 ? histogram.sum / histogram.count : 0;

    // Get token usage
    const promptTokens = this.metrics.getCounter('llm_tokens_total', { agent_id: agentId, model: 'gpt-4-turbo-preview', token_type: 'prompt' });
    const completionTokens = this.metrics.getCounter('llm_tokens_total', { agent_id: agentId, model: 'gpt-4-turbo-preview', token_type: 'completion' });

    // Get tool executions
    const toolSuccess = this.metrics.getCounter('agent_tool_executions_total', { agent_id: agentId, status: 'success' });
    const toolError = this.metrics.getCounter('agent_tool_executions_total', { agent_id: agentId, status: 'error' });

    // Get error count from error tracking
    const agentErrors = this.errorTracking.getAgentErrors(agentId, { unresolved: true });

    // Estimate last hour (simplified - in production would use time-windowed metrics)
    const lastHourRequests = Math.floor(totalRequests * 0.1); // Simplified estimate
    const lastHourErrors = Math.floor(failedRequests * 0.1);

    return {
      agentId,
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100,
      avgResponseTime,
      tokensUsed: promptTokens + completionTokens,
      toolExecutions: toolSuccess + toolError,
      errors: agentErrors.length,
      lastHour: {
        requests: lastHourRequests,
        errors: lastHourErrors,
      },
    };
  }

  /**
   * Get top metrics for the dashboard header
   */
  public getTopMetrics(): TopMetrics {
    let totalRequests = 0;
    let totalTokens = 0;
    let totalResponseTime = 0;
    let totalErrors = 0;
    let requestCount = 0;

    for (const agentId of this.AGENT_IDS) {
      const success = this.metrics.getCounter('agent_requests_total', { agent_id: agentId, status: 'success' });
      const error = this.metrics.getCounter('agent_requests_total', { agent_id: agentId, status: 'error' });
      totalRequests += success + error;
      totalErrors += error;

      const promptTokens = this.metrics.getCounter('llm_tokens_total', { agent_id: agentId, model: 'gpt-4-turbo-preview', token_type: 'prompt' });
      const completionTokens = this.metrics.getCounter('llm_tokens_total', { agent_id: agentId, model: 'gpt-4-turbo-preview', token_type: 'completion' });
      totalTokens += promptTokens + completionTokens;

      const histogram = this.metrics.getHistogram('agent_request_duration_seconds', { agent_id: agentId, tool: 'chat' });
      if (histogram && histogram.count > 0) {
        totalResponseTime += histogram.sum;
        requestCount += histogram.count;
      }
    }

    // Agent-specific metrics
    const activeWorkflows = this.metrics.getGauge('aura_active_workflows', {});
    const ticketsResolved = this.metrics.getCounter('cassie_tickets_handled_total', { resolution_type: 'auto_resolved' }) +
                            this.metrics.getCounter('cassie_tickets_handled_total', { resolution_type: 'human_resolved' });
    const reportsGenerated = this.metrics.getCounter('dexter_reports_generated_total', {});

    return {
      totalRequests24h: totalRequests,
      totalTokens24h: totalTokens,
      avgResponseTime24h: requestCount > 0 ? totalResponseTime / requestCount : 0,
      errorRate24h: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      activeWorkflows,
      ticketsResolved24h: ticketsResolved,
      reportsGenerated24h: reportsGenerated,
    };
  }

  /**
   * Log an activity
   */
  public logActivity(
    agentId: string,
    type: ActivityItem['type'],
    message: string,
    options: {
      severity?: ActivityItem['severity'];
      metadata?: Record<string, unknown>;
    } = {}
  ): void {
    const activity: ActivityItem = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: new Date(),
      agentId,
      type,
      message,
      severity: options.severity || 'info',
      metadata: options.metadata,
    };

    this.activityLog.unshift(activity);

    // Keep bounded
    if (this.activityLog.length > this.MAX_ACTIVITY_ITEMS) {
      this.activityLog = this.activityLog.slice(0, this.MAX_ACTIVITY_ITEMS);
    }
  }

  /**
   * Get recent activity
   */
  public getRecentActivity(limit: number = 50): ActivityItem[] {
    return this.activityLog.slice(0, limit);
  }

  /**
   * Get activity for a specific agent
   */
  public getAgentActivity(agentId: string, limit: number = 50): ActivityItem[] {
    return this.activityLog
      .filter(a => a.agentId === agentId)
      .slice(0, limit);
  }

  /**
   * Get time series data for charts
   */
  public async getTimeSeriesData(
    agentId: string,
    metric: 'requests' | 'errors' | 'responseTime',
    hours: number = 24
  ): Promise<TimeSeriesDataPoint[]> {
    // In a real implementation, this would query time-bucketed data from Redis/DB
    // For now, return simulated data
    const points: TimeSeriesDataPoint[] = [];
    const now = Date.now();
    const interval = 3600000; // 1 hour in ms

    for (let i = hours; i > 0; i--) {
      const timestamp = new Date(now - (i * interval));
      let value = 0;

      switch (metric) {
        case 'requests':
          value = Math.floor(Math.random() * 100) + 20;
          break;
        case 'errors':
          value = Math.floor(Math.random() * 10);
          break;
        case 'responseTime':
          value = Math.random() * 2 + 0.5;
          break;
      }

      points.push({ timestamp, value });
    }

    return points;
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<{ status: HealthStatus; latency: number }> {
    // In production, would actually ping the database
    const latency = Math.random() * 50 + 5; // Simulated 5-55ms
    return {
      status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'unhealthy',
      latency,
    };
  }

  /**
   * Check Redis health
   */
  private async checkRedisHealth(): Promise<{ status: HealthStatus; latency: number }> {
    const latency = Math.random() * 10 + 1; // Simulated 1-11ms
    return {
      status: latency < 50 ? 'healthy' : latency < 200 ? 'degraded' : 'unhealthy',
      latency,
    };
  }

  /**
   * Check LLM API health
   */
  private async checkLLMHealth(): Promise<{ status: HealthStatus; latency: number }> {
    const latency = Math.random() * 500 + 100; // Simulated 100-600ms
    return {
      status: latency < 1000 ? 'healthy' : latency < 3000 ? 'degraded' : 'unhealthy',
      latency,
    };
  }

  /**
   * Get date 24 hours ago
   */
  private get24HoursAgo(): Date {
    return new Date(Date.now() - 24 * 60 * 60 * 1000);
  }

  /**
   * Reset agent uptime (e.g., after restart)
   */
  public resetAgentUptime(agentId: string): void {
    this.agentStartTimes.set(agentId, new Date());
  }

  /**
   * Clear activity log
   */
  public clearActivityLog(): void {
    this.activityLog = [];
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let dashboardInstance: AgentDashboardService | null = null;

export function getDashboardService(): AgentDashboardService {
  if (!dashboardInstance) {
    dashboardInstance = new AgentDashboardService();
  }
  return dashboardInstance;
}
