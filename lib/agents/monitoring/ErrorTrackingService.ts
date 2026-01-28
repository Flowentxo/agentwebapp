/**
 * PHASE 7: Error Tracking Service
 * Centralized error tracking and alerting for all agents
 */

import { Redis } from 'ioredis';
import { getMetricsService } from './MetricsService';

// ============================================
// ERROR TYPES
// ============================================

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory =
  | 'agent_error'
  | 'llm_error'
  | 'database_error'
  | 'network_error'
  | 'validation_error'
  | 'auth_error'
  | 'workflow_error'
  | 'tool_error'
  | 'system_error';

export interface TrackedError {
  id: string;
  timestamp: Date;
  agentId?: string;
  workspaceId?: string;
  userId?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  fingerprint: string;
  resolved: boolean;
  occurrenceCount: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
}

export interface ErrorAlert {
  id: string;
  errorId: string;
  timestamp: Date;
  alertType: 'email' | 'slack' | 'webhook' | 'log';
  recipient?: string;
  sent: boolean;
  message: string;
}

export interface ErrorSummary {
  totalErrors: number;
  byCategory: Record<ErrorCategory, number>;
  bySeverity: Record<ErrorSeverity, number>;
  byAgent: Record<string, number>;
  recentErrors: TrackedError[];
  topErrors: Array<{ fingerprint: string; count: number; message: string }>;
}

export interface AlertConfig {
  enabled: boolean;
  severity: ErrorSeverity[];
  categories?: ErrorCategory[];
  alertType: 'email' | 'slack' | 'webhook' | 'log';
  recipient?: string;
  webhookUrl?: string;
  cooldownMinutes: number; // Prevent alert spam
}

// ============================================
// ERROR TRACKING SERVICE
// ============================================

export class ErrorTrackingService {
  private redis: Redis | null = null;
  private errors: Map<string, TrackedError> = new Map();
  private alerts: ErrorAlert[] = [];
  private alertConfigs: AlertConfig[] = [];
  private lastAlertTime: Map<string, number> = new Map();

  private readonly ERROR_PREFIX = 'agent:errors:';
  private readonly MAX_ERRORS = 10000;
  private readonly ERROR_TTL = 604800; // 7 days

  constructor() {
    // Default alert config
    this.alertConfigs.push({
      enabled: true,
      severity: ['critical', 'high'],
      alertType: 'log',
      cooldownMinutes: 5,
    });
  }

  /**
   * Initialize with Redis for persistence
   */
  public async initialize(redisUrl?: string): Promise<void> {
    try {
      this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
      console.log('[ERROR_TRACKING] Connected to Redis');

      // Load existing errors
      await this.loadErrorsFromRedis();
    } catch (error) {
      console.warn('[ERROR_TRACKING] Redis not available, using in-memory only:', error);
      this.redis = null;
    }
  }

  /**
   * Generate error fingerprint for deduplication
   */
  private generateFingerprint(
    category: ErrorCategory,
    message: string,
    agentId?: string
  ): string {
    // Normalize message by removing dynamic parts
    const normalizedMessage = message
      .replace(/\d+/g, 'N') // Replace numbers
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID') // Replace UUIDs
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, 'EMAIL') // Replace emails
      .substring(0, 200);

    const parts = [category, normalizedMessage];
    if (agentId) parts.push(agentId);

    // Simple hash function
    let hash = 0;
    const str = parts.join('|');
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `err_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Track an error
   */
  public async trackError(
    category: ErrorCategory,
    message: string,
    options: {
      error?: Error;
      agentId?: string;
      workspaceId?: string;
      userId?: string;
      severity?: ErrorSeverity;
      context?: Record<string, unknown>;
    } = {}
  ): Promise<TrackedError> {
    const {
      error,
      agentId,
      workspaceId,
      userId,
      severity = this.determineSeverity(category, message),
      context,
    } = options;

    const fingerprint = this.generateFingerprint(category, message, agentId);
    const now = new Date();

    // Check if we've seen this error before
    let trackedError = this.errors.get(fingerprint);

    if (trackedError) {
      // Update existing error
      trackedError.occurrenceCount++;
      trackedError.lastOccurrence = now;
      if (context) {
        trackedError.context = { ...trackedError.context, ...context };
      }
    } else {
      // Create new error
      trackedError = {
        id: `err_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        timestamp: now,
        agentId,
        workspaceId,
        userId,
        category,
        severity,
        message,
        stack: error?.stack,
        context,
        fingerprint,
        resolved: false,
        occurrenceCount: 1,
        firstOccurrence: now,
        lastOccurrence: now,
      };

      this.errors.set(fingerprint, trackedError);

      // Limit stored errors
      if (this.errors.size > this.MAX_ERRORS) {
        const oldestKey = this.errors.keys().next().value;
        if (oldestKey) {
          this.errors.delete(oldestKey);
        }
      }
    }

    // Persist to Redis
    if (this.redis) {
      await this.redis.hset(
        `${this.ERROR_PREFIX}errors`,
        fingerprint,
        JSON.stringify(trackedError)
      );
      await this.redis.expire(`${this.ERROR_PREFIX}errors`, this.ERROR_TTL);
    }

    // Update metrics
    const metrics = getMetricsService();
    await metrics.inc('agent_errors_total', {
      agent_id: agentId || 'unknown',
      error_type: category,
      workspace_id: workspaceId || 'unknown',
    });

    // Process alerts
    await this.processAlerts(trackedError);

    // Log critical errors
    if (severity === 'critical' || severity === 'high') {
      console.error(`[ERROR_TRACKING] ${severity.toUpperCase()}: ${category} - ${message}`, {
        fingerprint,
        agentId,
        context,
      });
    }

    return trackedError;
  }

  /**
   * Determine error severity based on category and message
   */
  private determineSeverity(category: ErrorCategory, message: string): ErrorSeverity {
    const lowerMessage = message.toLowerCase();

    // Critical patterns
    if (
      category === 'database_error' && lowerMessage.includes('connection') ||
      category === 'auth_error' ||
      lowerMessage.includes('fatal') ||
      lowerMessage.includes('critical')
    ) {
      return 'critical';
    }

    // High severity patterns
    if (
      category === 'llm_error' ||
      category === 'workflow_error' ||
      lowerMessage.includes('failed') ||
      lowerMessage.includes('timeout')
    ) {
      return 'high';
    }

    // Medium severity patterns
    if (
      category === 'network_error' ||
      category === 'tool_error' ||
      lowerMessage.includes('retry') ||
      lowerMessage.includes('warning')
    ) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Process alerts for an error
   */
  private async processAlerts(error: TrackedError): Promise<void> {
    for (const config of this.alertConfigs) {
      if (!config.enabled) continue;
      if (!config.severity.includes(error.severity)) continue;
      if (config.categories && !config.categories.includes(error.category)) continue;

      // Check cooldown
      const lastAlert = this.lastAlertTime.get(error.fingerprint);
      const cooldownMs = config.cooldownMinutes * 60 * 1000;
      if (lastAlert && Date.now() - lastAlert < cooldownMs) {
        continue;
      }

      // Send alert
      await this.sendAlert(error, config);
      this.lastAlertTime.set(error.fingerprint, Date.now());
    }
  }

  /**
   * Send an alert
   */
  private async sendAlert(error: TrackedError, config: AlertConfig): Promise<void> {
    const alertMessage = `[${error.severity.toUpperCase()}] ${error.category}: ${error.message}`;

    const alert: ErrorAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      errorId: error.id,
      timestamp: new Date(),
      alertType: config.alertType,
      recipient: config.recipient,
      sent: false,
      message: alertMessage,
    };

    try {
      switch (config.alertType) {
        case 'log':
          console.warn(`[ALERT] ${alertMessage}`);
          alert.sent = true;
          break;

        case 'webhook':
          if (config.webhookUrl) {
            try {
              await fetch(config.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text: alertMessage,
                  error: {
                    id: error.id,
                    category: error.category,
                    severity: error.severity,
                    message: error.message,
                    agentId: error.agentId,
                    occurrenceCount: error.occurrenceCount,
                    context: error.context,
                  },
                }),
              });
              alert.sent = true;
            } catch (e) {
              console.error('[ERROR_TRACKING] Failed to send webhook alert:', e);
            }
          }
          break;

        case 'slack':
          // Slack integration would go here
          console.log(`[ALERT:SLACK] Would send to ${config.recipient}: ${alertMessage}`);
          alert.sent = true;
          break;

        case 'email':
          // Email integration would go here
          console.log(`[ALERT:EMAIL] Would send to ${config.recipient}: ${alertMessage}`);
          alert.sent = true;
          break;
      }
    } catch (e) {
      console.error('[ERROR_TRACKING] Failed to send alert:', e);
    }

    this.alerts.push(alert);

    // Keep alerts list bounded
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-500);
    }
  }

  /**
   * Add an alert configuration
   */
  public addAlertConfig(config: AlertConfig): void {
    this.alertConfigs.push(config);
  }

  /**
   * Remove alert configuration
   */
  public removeAlertConfig(index: number): void {
    this.alertConfigs.splice(index, 1);
  }

  /**
   * Get all alert configurations
   */
  public getAlertConfigs(): AlertConfig[] {
    return [...this.alertConfigs];
  }

  /**
   * Mark an error as resolved
   */
  public async resolveError(fingerprint: string): Promise<boolean> {
    const error = this.errors.get(fingerprint);
    if (!error) return false;

    error.resolved = true;

    if (this.redis) {
      await this.redis.hset(
        `${this.ERROR_PREFIX}errors`,
        fingerprint,
        JSON.stringify(error)
      );
    }

    return true;
  }

  /**
   * Get error summary
   */
  public getErrorSummary(options: {
    agentId?: string;
    workspaceId?: string;
    since?: Date;
    limit?: number;
  } = {}): ErrorSummary {
    const { agentId, workspaceId, since, limit = 100 } = options;

    let errors = Array.from(this.errors.values());

    // Filter by options
    if (agentId) {
      errors = errors.filter(e => e.agentId === agentId);
    }
    if (workspaceId) {
      errors = errors.filter(e => e.workspaceId === workspaceId);
    }
    if (since) {
      errors = errors.filter(e => e.lastOccurrence >= since);
    }

    // Sort by last occurrence
    errors.sort((a, b) => b.lastOccurrence.getTime() - a.lastOccurrence.getTime());

    // Calculate summary
    const summary: ErrorSummary = {
      totalErrors: errors.length,
      byCategory: {} as Record<ErrorCategory, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      byAgent: {},
      recentErrors: errors.slice(0, limit),
      topErrors: [],
    };

    // Count by category
    for (const error of errors) {
      summary.byCategory[error.category] = (summary.byCategory[error.category] || 0) + error.occurrenceCount;
      summary.bySeverity[error.severity] = (summary.bySeverity[error.severity] || 0) + error.occurrenceCount;
      if (error.agentId) {
        summary.byAgent[error.agentId] = (summary.byAgent[error.agentId] || 0) + error.occurrenceCount;
      }
    }

    // Top errors by occurrence count
    summary.topErrors = errors
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
      .slice(0, 10)
      .map(e => ({
        fingerprint: e.fingerprint,
        count: e.occurrenceCount,
        message: e.message,
      }));

    return summary;
  }

  /**
   * Get errors for an agent
   */
  public getAgentErrors(agentId: string, options: {
    since?: Date;
    limit?: number;
    unresolved?: boolean;
  } = {}): TrackedError[] {
    const { since, limit = 50, unresolved = false } = options;

    let errors = Array.from(this.errors.values())
      .filter(e => e.agentId === agentId);

    if (since) {
      errors = errors.filter(e => e.lastOccurrence >= since);
    }
    if (unresolved) {
      errors = errors.filter(e => !e.resolved);
    }

    return errors
      .sort((a, b) => b.lastOccurrence.getTime() - a.lastOccurrence.getTime())
      .slice(0, limit);
  }

  /**
   * Load errors from Redis
   */
  private async loadErrorsFromRedis(): Promise<void> {
    if (!this.redis) return;

    try {
      const data = await this.redis.hgetall(`${this.ERROR_PREFIX}errors`);
      for (const [fingerprint, errorJson] of Object.entries(data)) {
        const error = JSON.parse(errorJson) as TrackedError;
        // Convert date strings back to Date objects
        error.timestamp = new Date(error.timestamp);
        error.firstOccurrence = new Date(error.firstOccurrence);
        error.lastOccurrence = new Date(error.lastOccurrence);
        this.errors.set(fingerprint, error);
      }
      console.log(`[ERROR_TRACKING] Loaded ${this.errors.size} errors from Redis`);
    } catch (e) {
      console.error('[ERROR_TRACKING] Failed to load errors from Redis:', e);
    }
  }

  /**
   * Clear all errors
   */
  public async clearErrors(): Promise<void> {
    this.errors.clear();
    this.alerts = [];

    if (this.redis) {
      await this.redis.del(`${this.ERROR_PREFIX}errors`);
    }
  }

  /**
   * Get recent alerts
   */
  public getRecentAlerts(limit: number = 50): ErrorAlert[] {
    return this.alerts.slice(-limit).reverse();
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let errorTrackingInstance: ErrorTrackingService | null = null;

export function getErrorTrackingService(): ErrorTrackingService {
  if (!errorTrackingInstance) {
    errorTrackingInstance = new ErrorTrackingService();
  }
  return errorTrackingInstance;
}

export async function initializeErrorTracking(redisUrl?: string): Promise<ErrorTrackingService> {
  const service = getErrorTrackingService();
  await service.initialize(redisUrl);
  return service;
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export async function trackAgentError(
  agentId: string,
  category: ErrorCategory,
  message: string,
  options: {
    error?: Error;
    workspaceId?: string;
    userId?: string;
    context?: Record<string, unknown>;
  } = {}
): Promise<TrackedError> {
  return getErrorTrackingService().trackError(category, message, {
    ...options,
    agentId,
  });
}

export async function trackLLMError(
  agentId: string,
  message: string,
  options: {
    error?: Error;
    model?: string;
    context?: Record<string, unknown>;
  } = {}
): Promise<TrackedError> {
  return getErrorTrackingService().trackError('llm_error', message, {
    ...options,
    agentId,
    severity: 'high',
    context: {
      ...options.context,
      model: options.model,
    },
  });
}

export async function trackWorkflowError(
  workflowId: string,
  message: string,
  options: {
    error?: Error;
    nodeId?: string;
    workspaceId?: string;
    context?: Record<string, unknown>;
  } = {}
): Promise<TrackedError> {
  return getErrorTrackingService().trackError('workflow_error', message, {
    ...options,
    agentId: 'aura',
    context: {
      ...options.context,
      workflowId,
      nodeId: options.nodeId,
    },
  });
}
