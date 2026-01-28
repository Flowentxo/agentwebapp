/**
 * COMPREHENSIVE LOGGING UTILITY
 * 
 * Enhanced logging system with structured logging, performance tracking,
 * and integration with the error handling system.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  duration?: number;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  metadata?: Record<string, any>;
  stack?: string;
  performance?: {
    startTime: number;
    endTime?: number;
    duration?: number;
  };
}

/**
 * Performance tracking utility
 */
export class PerformanceTracker {
  private static instances = new Map<string, PerformanceTracker>();
  private startTime: number;
  private logs: LogEntry[] = [];

  constructor(private name: string) {
    this.startTime = performance.now();
  }

  static start(name: string): PerformanceTracker {
    if (!PerformanceTracker.instances.has(name)) {
      PerformanceTracker.instances.set(name, new PerformanceTracker(name));
    }
    return PerformanceTracker.instances.get(name)!;
  }

  static get(name: string): PerformanceTracker | undefined {
    return PerformanceTracker.instances.get(name);
  }

  end(context?: LogContext): number {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    
    logger.info(`Performance: ${this.name}`, {
      ...context,
      duration,
      component: this.name
    });

    PerformanceTracker.instances.delete(this.name);
    return duration;
  }

  log(level: LogLevel, message: string, metadata?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        component: this.name,
        ...metadata
      },
      performance: {
        startTime: this.startTime,
        endTime: performance.now()
      }
    };

    this.logs.push(entry);
  }
}

/**
 * Comprehensive Logger Class
 */
export class ComprehensiveLogger {
  private context: LogContext = {};
  private performanceTrackers = new Map<string, PerformanceTracker>();

  constructor(private source: string) {}

  /**
   * Set global context for all subsequent logs
   */
  setContext(context: Partial<LogContext>): this {
    this.context = { ...this.context, ...context };
    return this;
  }

  /**
   * Add context for next log only
   */
  withContext(context: Partial<LogContext>): ComprehensiveLogger {
    const logger = new ComprehensiveLogger(this.source);
    logger.context = { ...this.context, ...context };
    return logger;
  }

  /**
   * Performance tracking
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  startPerformance(operation: string, context?: LogContext): PerformanceTracker {
    const tracker = PerformanceTracker.start(`${this.source}:${operation}`);
    this.performanceTrackers.set(operation, tracker);
    return tracker;
  }

  endPerformance(operation: string, context?: LogContext): number | undefined {
    const tracker = this.performanceTrackers.get(operation);
    if (tracker) {
      const duration = tracker.end({ ...this.context, ...context });
      this.performanceTrackers.delete(operation);
      return duration;
    }
    return undefined;
  }

  /**
   * Debug level logging
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata);
  }

  /**
   * Info level logging
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata);
  }

  /**
   * Warning level logging
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log('error', message, {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }

  /**
   * Fatal level logging
   */
  fatal(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log('fatal', message, {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }

  /**
   * User action logging
   */
  userAction(action: string, metadata?: Record<string, any>): void {
    this.info(`User Action: ${action}`, {
      ...metadata,
      action,
      type: 'user_action'
    });
  }

  /**
   * API request logging
   */
  apiRequest(method: string, url: string, statusCode?: number, duration?: number, metadata?: Record<string, any>): void {
    const level = statusCode && statusCode >= 400 ? 'warn' : 'info';
    this.log(level, `API ${method} ${url}`, {
      ...metadata,
      method,
      url,
      statusCode,
      duration,
      type: 'api_request'
    });
  }

  /**
   * Database operation logging
   */
  databaseOperation(operation: string, table: string, duration?: number, metadata?: Record<string, any>): void {
    this.info(`Database ${operation} on ${table}`, {
      ...metadata,
      operation,
      table,
      duration,
      type: 'database_operation'
    });
  }

  /**
   * Security event logging
   */
  securityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: Record<string, any>): void {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    this.log(level, `Security Event: ${event}`, {
      ...metadata,
      event,
      severity,
      type: 'security_event'
    });
  }

  /**
   * Feature usage logging
   */
  featureUsage(feature: string, metadata?: Record<string, any>): void {
    this.info(`Feature Used: ${feature}`, {
      ...metadata,
      feature,
      type: 'feature_usage'
    });
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context },
      metadata
    };

    // In development, also log to console
    if (process.env.NODE_ENV === 'development') {
      this.consoleLog(entry);
    }

    // Send to external logging service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(entry);
    }

    // Store locally for debugging
    this.storeLocally(entry);
  }

  private consoleLog(entry: LogEntry): void {
    const { timestamp, level, message, context, metadata } = entry;
    
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.source}]`;
    
    switch (level) {
      case 'error':
      case 'fatal':
        console.error(prefix, message, context, metadata);
        break;
      case 'warn':
        console.warn(prefix, message, context, metadata);
        break;
      case 'info':
        console.info(prefix, message, context, metadata);
        break;
      case 'debug':
      default:
        console.debug(prefix, message, context, metadata);
        break;
    }
  }

  private sendToExternalService(entry: LogEntry): void {
    // In production, send to logging service
    // This could be Winston, Datadog, CloudWatch, etc.
    try {
      // Example: Send to external service
      fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry)
      }).catch(() => {
        // Silently fail if logging service is unavailable
      });
    } catch {
      // Silently fail if fetch is not available
    }
  }

  private storeLocally(entry: LogEntry): void {
    // Store in memory for debugging
    if (typeof window !== 'undefined') {
      const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
      logs.push(entry);
      
      // Keep only last 100 entries
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('app_logs', JSON.stringify(logs));
    }
  }

  /**
   * Get stored logs for debugging
   */
  getStoredLogs(): LogEntry[] {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('app_logs') || '[]');
    }
    return [];
  }

  /**
   * Clear stored logs
   */
  clearStoredLogs(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('app_logs');
    }
  }
}

/**
 * Create logger instance
 */
export function createLogger(source: string, context?: LogContext): ComprehensiveLogger {
  const logger = new ComprehensiveLogger(source);
  if (context) {
    logger.setContext(context);
  }
  return logger;
}

/**
 * Pre-configured loggers for common sources
 */
export const logger = createLogger('app');

export const apiLogger = createLogger('api');
export const dbLogger = createLogger('database');
export const authLogger = createLogger('auth');
export const securityLogger = createLogger('security');
export const performanceLogger = createLogger('performance');

/**
 * React hook for logging in components
 */
export function useLogger(componentName: string) {
  return React.useMemo(() => createLogger(componentName), [componentName]);
}

// Import React for the hook
import React from 'react';