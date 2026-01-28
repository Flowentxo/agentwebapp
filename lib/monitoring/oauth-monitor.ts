/**
 * OAuth2 Monitoring & Logging
 *
 * Centralized monitoring for OAuth flows, token refresh, and errors
 */

interface OAuthEvent {
  type: 'initiate' | 'callback' | 'refresh' | 'disconnect' | 'error';
  provider: string;
  service: string;
  userId: string;
  success: boolean;
  duration?: number;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
  timestamp: Date;
}

interface OAuthMetrics {
  totalInitiations: number;
  successfulConnections: number;
  failedConnections: number;
  refreshAttempts: number;
  refreshSuccesses: number;
  refreshFailures: number;
  disconnections: number;
  errors: number;
  averageConnectionTime: number;
  providerMetrics: Record<string, {
    connections: number;
    errors: number;
    avgTime: number;
  }>;
}

class OAuthMonitor {
  private events: OAuthEvent[] = [];
  private metrics: OAuthMetrics = {
    totalInitiations: 0,
    successfulConnections: 0,
    failedConnections: 0,
    refreshAttempts: 0,
    refreshSuccesses: 0,
    refreshFailures: 0,
    disconnections: 0,
    errors: 0,
    averageConnectionTime: 0,
    providerMetrics: {},
  };

  // Max events to keep in memory (last 1000)
  private maxEvents = 1000;

  /**
   * Log an OAuth event
   */
  logEvent(event: Omit<OAuthEvent, 'timestamp'>) {
    const fullEvent: OAuthEvent = {
      ...event,
      timestamp: new Date(),
    };

    // Add to events array
    this.events.push(fullEvent);

    // Trim if too many
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Update metrics
    this.updateMetrics(fullEvent);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(fullEvent);
    }

    // Send to external monitoring (Sentry, DataDog, etc.)
    this.sendToExternalMonitoring(fullEvent);
  }

  /**
   * Log OAuth initiation
   */
  logInitiation(provider: string, service: string, userId: string) {
    this.logEvent({
      type: 'initiate',
      provider,
      service,
      userId,
      success: true,
    });
  }

  /**
   * Log OAuth callback (success or failure)
   */
  logCallback(
    provider: string,
    service: string,
    userId: string,
    success: boolean,
    duration: number,
    error?: { code: string; message: string }
  ) {
    this.logEvent({
      type: 'callback',
      provider,
      service,
      userId,
      success,
      duration,
      error,
    });
  }

  /**
   * Log token refresh attempt
   */
  logRefresh(
    provider: string,
    service: string,
    userId: string,
    success: boolean,
    duration: number,
    error?: { code: string; message: string }
  ) {
    this.logEvent({
      type: 'refresh',
      provider,
      service,
      userId,
      success,
      duration,
      error,
    });
  }

  /**
   * Log disconnection
   */
  logDisconnect(provider: string, service: string, userId: string) {
    this.logEvent({
      type: 'disconnect',
      provider,
      service,
      userId,
      success: true,
    });
  }

  /**
   * Log error
   */
  logError(
    provider: string,
    service: string,
    userId: string,
    error: { code: string; message: string; stack?: string },
    metadata?: Record<string, any>
  ) {
    this.logEvent({
      type: 'error',
      provider,
      service,
      userId,
      success: false,
      error,
      metadata,
    });
  }

  /**
   * Update internal metrics
   */
  private updateMetrics(event: OAuthEvent) {
    switch (event.type) {
      case 'initiate':
        this.metrics.totalInitiations++;
        break;

      case 'callback':
        if (event.success) {
          this.metrics.successfulConnections++;
          if (event.duration) {
            this.updateAverageConnectionTime(event.duration);
          }
        } else {
          this.metrics.failedConnections++;
        }
        break;

      case 'refresh':
        this.metrics.refreshAttempts++;
        if (event.success) {
          this.metrics.refreshSuccesses++;
        } else {
          this.metrics.refreshFailures++;
        }
        break;

      case 'disconnect':
        this.metrics.disconnections++;
        break;

      case 'error':
        this.metrics.errors++;
        break;
    }

    // Update provider-specific metrics
    if (!this.metrics.providerMetrics[event.provider]) {
      this.metrics.providerMetrics[event.provider] = {
        connections: 0,
        errors: 0,
        avgTime: 0,
      };
    }

    const providerMetrics = this.metrics.providerMetrics[event.provider];

    if (event.type === 'callback' && event.success) {
      providerMetrics.connections++;
      if (event.duration) {
        providerMetrics.avgTime =
          (providerMetrics.avgTime * (providerMetrics.connections - 1) + event.duration) /
          providerMetrics.connections;
      }
    }

    if (event.type === 'error' || !event.success) {
      providerMetrics.errors++;
    }
  }

  /**
   * Update average connection time
   */
  private updateAverageConnectionTime(newDuration: number) {
    const count = this.metrics.successfulConnections;
    this.metrics.averageConnectionTime =
      (this.metrics.averageConnectionTime * (count - 1) + newDuration) / count;
  }

  /**
   * Log to console with formatting
   */
  private logToConsole(event: OAuthEvent) {
    const emoji = event.success ? '✅' : '❌';
    const typeEmoji = {
      initiate: '🚀',
      callback: '🔄',
      refresh: '♻️',
      disconnect: '🔌',
      error: '⚠️',
    }[event.type];

    const duration = event.duration ? ` (${event.duration}ms)` : '';

    console.log(
      `${emoji} ${typeEmoji} [OAuth ${event.type.toUpperCase()}] ${event.provider}/${event.service}${duration}`,
      event.error ? event.error : ''
    );
  }

  /**
   * Send to external monitoring service
   */
  private sendToExternalMonitoring(event: OAuthEvent) {
    // Sentry integration
    if (typeof window !== 'undefined' && (window as any).Sentry && !event.success) {
      (window as any).Sentry.captureException(
        new Error(`OAuth ${event.type} failed: ${event.error?.message}`),
        {
          tags: {
            oauth_provider: event.provider,
            oauth_service: event.service,
            oauth_type: event.type,
          },
          extra: {
            userId: event.userId,
            error: event.error,
            metadata: event.metadata,
          },
        }
      );
    }

    // Custom analytics (PostHog, Mixpanel, etc.)
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track(`OAuth ${event.type}`, {
        provider: event.provider,
        service: event.service,
        success: event.success,
        duration: event.duration,
        error_code: event.error?.code,
      });
    }

    // Server-side logging (in API routes)
    if (typeof window === 'undefined') {
      // Use your server-side logger (winston, pino, etc.)
      const logLevel = event.success ? 'info' : 'error';
      const message = `OAuth ${event.type}: ${event.provider}/${event.service} - ${
        event.success ? 'Success' : 'Failed'
      }`;

      // Example: console.error for server-side
      if (logLevel === 'error') {
        console.error(message, {
          type: event.type,
          provider: event.provider,
          service: event.service,
          userId: event.userId,
          error: event.error,
          duration: event.duration,
        });
      }
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): OAuthMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 100): OAuthEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get events by filter
   */
  getEventsByFilter(filter: {
    type?: OAuthEvent['type'];
    provider?: string;
    userId?: string;
    success?: boolean;
    since?: Date;
  }): OAuthEvent[] {
    return this.events.filter((event) => {
      if (filter.type && event.type !== filter.type) return false;
      if (filter.provider && event.provider !== filter.provider) return false;
      if (filter.userId && event.userId !== filter.userId) return false;
      if (filter.success !== undefined && event.success !== filter.success) return false;
      if (filter.since && event.timestamp < filter.since) return false;
      return true;
    });
  }

  /**
   * Get error rate for a provider
   */
  getErrorRate(provider: string): number {
    const providerMetrics = this.metrics.providerMetrics[provider];
    if (!providerMetrics) return 0;

    const total = providerMetrics.connections + providerMetrics.errors;
    if (total === 0) return 0;

    return (providerMetrics.errors / total) * 100;
  }

  /**
   * Check if provider is unhealthy (high error rate)
   */
  isProviderUnhealthy(provider: string, threshold: number = 20): boolean {
    return this.getErrorRate(provider) > threshold;
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    healthy: boolean;
    issues: string[];
    metrics: OAuthMetrics;
  } {
    const issues: string[] = [];

    // Check overall error rate
    const totalAttempts = this.metrics.totalInitiations;
    const totalErrors = this.metrics.failedConnections + this.metrics.errors;
    const overallErrorRate = totalAttempts > 0 ? (totalErrors / totalAttempts) * 100 : 0;

    if (overallErrorRate > 10) {
      issues.push(`High overall error rate: ${overallErrorRate.toFixed(2)}%`);
    }

    // Check refresh success rate
    const refreshSuccessRate =
      this.metrics.refreshAttempts > 0
        ? (this.metrics.refreshSuccesses / this.metrics.refreshAttempts) * 100
        : 100;

    if (refreshSuccessRate < 90 && this.metrics.refreshAttempts > 10) {
      issues.push(`Low refresh success rate: ${refreshSuccessRate.toFixed(2)}%`);
    }

    // Check individual providers
    for (const [provider, metrics] of Object.entries(this.metrics.providerMetrics)) {
      if (this.isProviderUnhealthy(provider)) {
        issues.push(`Provider ${provider} has high error rate: ${this.getErrorRate(provider).toFixed(2)}%`);
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
      metrics: this.getMetrics(),
    };
  }

  /**
   * Reset metrics (for testing)
   */
  reset() {
    this.events = [];
    this.metrics = {
      totalInitiations: 0,
      successfulConnections: 0,
      failedConnections: 0,
      refreshAttempts: 0,
      refreshSuccesses: 0,
      refreshFailures: 0,
      disconnections: 0,
      errors: 0,
      averageConnectionTime: 0,
      providerMetrics: {},
    };
  }
}

// Export singleton instance
export const oauthMonitor = new OAuthMonitor();

// Export types
export type { OAuthEvent, OAuthMetrics };
