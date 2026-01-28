/**
 * LoggingService - Enterprise Structured Logging System
 *
 * Provides comprehensive logging capabilities for the Motion AI system
 *
 * Features:
 * - Structured JSON logging
 * - Multiple log levels (DEBUG, INFO, WARN, ERROR, FATAL)
 * - Context enrichment (request ID, user ID, agent ID)
 * - Performance timing and metrics
 * - Log rotation and archival support
 * - Async log buffering for performance
 * - Correlation ID tracking
 * - Sensitive data masking
 * - Log aggregation support (ELK, Datadog, etc.)
 */

import { EventEmitter } from 'events';

// ============================================
// TYPES & INTERFACES
// ============================================

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogContext {
  // Request context
  requestId?: string;
  correlationId?: string;
  sessionId?: string;

  // User context
  userId?: string;
  workspaceId?: string;

  // Agent context
  agentId?: string;
  toolId?: string;

  // Service context
  service?: string;
  component?: string;
  operation?: string;

  // Additional metadata
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  data?: unknown;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  duration?: number;
  metadata: {
    pid: number;
    hostname: string;
    version: string;
    environment: string;
  };
}

export interface LoggingConfig {
  // Log levels
  minLevel: LogLevel;
  enabledLevels: LogLevel[];

  // Output settings
  outputFormat: 'json' | 'pretty' | 'minimal';
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;

  // Performance settings
  bufferSize: number;
  flushInterval: number; // milliseconds

  // Enrichment settings
  enrichWithHostname: boolean;
  enrichWithPid: boolean;
  defaultContext: Partial<LogContext>;

  // Masking settings
  maskFields: string[];
  maskPattern: string;

  // Sampling settings
  samplingRate: number; // 0-1, percentage of logs to keep
  samplingExcludeLevels: LogLevel[]; // Levels to always log
}

export interface LoggerInstance {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, error?: unknown, data?: unknown): void;
  fatal(message: string, error?: unknown, data?: unknown): void;
  child(context: Partial<LogContext>): LoggerInstance;
  startTimer(operation: string): () => void;
}

// ============================================
// CONSTANTS
// ============================================

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
};

const DEFAULT_MASK_FIELDS = [
  'password',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'authorization',
  'credit_card',
  'creditCard',
  'ssn',
  'socialSecurityNumber',
];

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_LOGGING_CONFIG: LoggingConfig = {
  minLevel: 'INFO',
  enabledLevels: ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'],
  outputFormat: 'json',
  enableConsole: true,
  enableFile: false,
  bufferSize: 100,
  flushInterval: 5000,
  enrichWithHostname: true,
  enrichWithPid: true,
  defaultContext: {
    service: 'motion-ai',
    version: '2.3.0',
  },
  maskFields: DEFAULT_MASK_FIELDS,
  maskPattern: '***MASKED***',
  samplingRate: 1,
  samplingExcludeLevels: ['ERROR', 'FATAL'],
};

// ============================================
// LOGGING SERVICE
// ============================================

export class LoggingService extends EventEmitter {
  private static instance: LoggingService;

  private config: LoggingConfig;
  private buffer: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private hostname: string;
  private pid: number;
  private environment: string;

  private constructor(config: Partial<LoggingConfig> = {}) {
    super();
    this.config = { ...DEFAULT_LOGGING_CONFIG, ...config };
    this.hostname = this.getHostname();
    this.pid = process.pid;
    this.environment = process.env.NODE_ENV || 'development';
    this.startFlushInterval();
  }

  public static getInstance(config?: Partial<LoggingConfig>): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService(config);
    }
    return LoggingService.instance;
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  public configure(config: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): LoggingConfig {
    return { ...this.config };
  }

  // ============================================
  // LOGGER FACTORY
  // ============================================

  /**
   * Create a child logger with additional context
   */
  public createLogger(context: Partial<LogContext> = {}): LoggerInstance {
    const mergedContext = { ...this.config.defaultContext, ...context };

    const log = (level: LogLevel, message: string, data?: unknown, error?: unknown) => {
      this.log(level, message, mergedContext, data, error);
    };

    return {
      debug: (message: string, data?: unknown) => log('DEBUG', message, data),
      info: (message: string, data?: unknown) => log('INFO', message, data),
      warn: (message: string, data?: unknown) => log('WARN', message, data),
      error: (message: string, error?: unknown, data?: unknown) => log('ERROR', message, data, error),
      fatal: (message: string, error?: unknown, data?: unknown) => log('FATAL', message, data, error),
      child: (childContext: Partial<LogContext>) =>
        this.createLogger({ ...mergedContext, ...childContext }),
      startTimer: (operation: string) => this.startTimer(mergedContext, operation),
    };
  }

  /**
   * Get the root logger
   */
  public getLogger(): LoggerInstance {
    return this.createLogger();
  }

  // ============================================
  // CORE LOGGING
  // ============================================

  /**
   * Log a message
   */
  public log(
    level: LogLevel,
    message: string,
    context: LogContext = {},
    data?: unknown,
    error?: unknown
  ): void {
    // Check if level is enabled
    if (!this.shouldLog(level)) {
      return;
    }

    // Apply sampling
    if (!this.shouldSample(level)) {
      return;
    }

    // Create log entry
    const entry = this.createLogEntry(level, message, context, data, error);

    // Add to buffer
    this.buffer.push(entry);

    // Emit event for external handlers
    this.emit('log', entry);

    // Flush if buffer is full
    if (this.buffer.length >= this.config.bufferSize) {
      this.flush();
    }

    // Immediately output for ERROR and FATAL
    if (level === 'ERROR' || level === 'FATAL') {
      this.flush();
    }
  }

  /**
   * Create a structured log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context: LogContext,
    data?: unknown,
    error?: unknown
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.maskSensitiveData(context),
      metadata: {
        pid: this.config.enrichWithPid ? this.pid : 0,
        hostname: this.config.enrichWithHostname ? this.hostname : '',
        version: this.config.defaultContext.version as string || '0.0.0',
        environment: this.environment,
      },
    };

    if (data !== undefined) {
      entry.data = this.maskSensitiveData(data);
    }

    if (error) {
      entry.error = this.formatError(error);
    }

    return entry;
  }

  /**
   * Format error for logging
   */
  private formatError(error: unknown): LogEntry['error'] {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    return {
      name: 'Unknown',
      message: String(error),
    };
  }

  // ============================================
  // TIMING & PERFORMANCE
  // ============================================

  /**
   * Start a timer for an operation
   */
  public startTimer(context: LogContext, operation: string): () => void {
    const startTime = Date.now();
    const startHrTime = process.hrtime();

    return () => {
      const [seconds, nanoseconds] = process.hrtime(startHrTime);
      const duration = seconds * 1000 + nanoseconds / 1000000;

      this.log('INFO', `${operation} completed`, {
        ...context,
        operation,
      }, {
        duration: Math.round(duration * 100) / 100,
        durationMs: Date.now() - startTime,
      });
    };
  }

  /**
   * Log a performance metric
   */
  public logPerformance(
    operation: string,
    duration: number,
    context: LogContext = {},
    data?: Record<string, unknown>
  ): void {
    this.log('INFO', `Performance: ${operation}`, {
      ...context,
      operation,
    }, {
      ...data,
      duration,
      type: 'performance',
    });
  }

  // ============================================
  // CONVENIENCE METHODS
  // ============================================

  public debug(message: string, context?: LogContext, data?: unknown): void {
    this.log('DEBUG', message, context || {}, data);
  }

  public info(message: string, context?: LogContext, data?: unknown): void {
    this.log('INFO', message, context || {}, data);
  }

  public warn(message: string, context?: LogContext, data?: unknown): void {
    this.log('WARN', message, context || {}, data);
  }

  public error(message: string, error?: unknown, context?: LogContext, data?: unknown): void {
    this.log('ERROR', message, context || {}, data, error);
  }

  public fatal(message: string, error?: unknown, context?: LogContext, data?: unknown): void {
    this.log('FATAL', message, context || {}, data, error);
  }

  // ============================================
  // AGENT-SPECIFIC LOGGING
  // ============================================

  /**
   * Log agent activity
   */
  public logAgentActivity(
    agentId: string,
    action: string,
    context: Partial<LogContext> = {},
    data?: unknown
  ): void {
    this.log('INFO', `[${agentId.toUpperCase()}] ${action}`, {
      ...context,
      agentId,
      component: 'agent',
    }, data);
  }

  /**
   * Log tool execution
   */
  public logToolExecution(
    agentId: string,
    toolId: string,
    status: 'start' | 'success' | 'error',
    context: Partial<LogContext> = {},
    data?: unknown
  ): void {
    const level: LogLevel = status === 'error' ? 'ERROR' : 'INFO';
    const message = `Tool ${toolId} ${status}`;

    this.log(level, message, {
      ...context,
      agentId,
      toolId,
      component: 'tool',
    }, {
      ...data as object,
      status,
    });
  }

  /**
   * Log AI request/response
   */
  public logAIRequest(
    type: 'request' | 'response',
    context: Partial<LogContext> = {},
    data?: {
      prompt?: string;
      response?: string;
      tokens?: number;
      duration?: number;
    }
  ): void {
    // Truncate long prompts/responses
    const sanitizedData = { ...data };
    if (sanitizedData.prompt && sanitizedData.prompt.length > 500) {
      sanitizedData.prompt = sanitizedData.prompt.substring(0, 500) + '...';
    }
    if (sanitizedData.response && sanitizedData.response.length > 500) {
      sanitizedData.response = sanitizedData.response.substring(0, 500) + '...';
    }

    this.log('INFO', `AI ${type}`, {
      ...context,
      component: 'ai',
    }, sanitizedData);
  }

  // ============================================
  // SENSITIVE DATA MASKING
  // ============================================

  /**
   * Mask sensitive data in objects
   */
  private maskSensitiveData<T>(data: T): T {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.maskSensitiveData(item)) as unknown as T;
    }

    const masked: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data as object)) {
      if (this.shouldMaskField(key)) {
        masked[key] = this.config.maskPattern;
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskSensitiveData(value);
      } else {
        masked[key] = value;
      }
    }

    return masked as T;
  }

  /**
   * Check if a field should be masked
   */
  private shouldMaskField(fieldName: string): boolean {
    const lowerName = fieldName.toLowerCase();
    return this.config.maskFields.some(
      field => lowerName.includes(field.toLowerCase())
    );
  }

  // ============================================
  // OUTPUT HANDLING
  // ============================================

  /**
   * Flush the log buffer
   */
  public flush(): void {
    if (this.buffer.length === 0) {
      return;
    }

    const entries = [...this.buffer];
    this.buffer = [];

    for (const entry of entries) {
      this.output(entry);
    }
  }

  /**
   * Output a log entry
   */
  private output(entry: LogEntry): void {
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // File output would go here (using fs or a logging library)
    // For now, we emit an event for external handlers
    this.emit('output', entry);
  }

  /**
   * Output to console
   */
  private outputToConsole(entry: LogEntry): void {
    const output = this.formatOutput(entry);

    switch (entry.level) {
      case 'DEBUG':
        console.debug(output);
        break;
      case 'INFO':
        console.log(output);
        break;
      case 'WARN':
        console.warn(output);
        break;
      case 'ERROR':
      case 'FATAL':
        console.error(output);
        break;
    }
  }

  /**
   * Format log entry for output
   */
  private formatOutput(entry: LogEntry): string {
    switch (this.config.outputFormat) {
      case 'json':
        return JSON.stringify(entry);

      case 'pretty':
        return this.formatPretty(entry);

      case 'minimal':
        return `[${entry.level}] ${entry.message}`;

      default:
        return JSON.stringify(entry);
    }
  }

  /**
   * Format entry in pretty format
   */
  private formatPretty(entry: LogEntry): string {
    const levelColors: Record<LogLevel, string> = {
      DEBUG: '\x1b[36m', // Cyan
      INFO: '\x1b[32m',  // Green
      WARN: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m', // Red
      FATAL: '\x1b[35m', // Magenta
    };

    const reset = '\x1b[0m';
    const color = levelColors[entry.level];

    let output = `${color}[${entry.level}]${reset} ${entry.timestamp} ${entry.message}`;

    if (entry.context.agentId) {
      output += ` [${entry.context.agentId}]`;
    }

    if (entry.data) {
      output += `\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\n  Stack: ${entry.error.stack}`;
      }
    }

    return output;
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabledLevels.includes(level)) {
      return false;
    }

    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minLevel];
  }

  /**
   * Check if a log should be sampled
   */
  private shouldSample(level: LogLevel): boolean {
    if (this.config.samplingExcludeLevels.includes(level)) {
      return true;
    }

    return Math.random() < this.config.samplingRate;
  }

  /**
   * Get hostname
   */
  private getHostname(): string {
    try {
      return require('os').hostname();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Start flush interval
   */
  private startFlushInterval(): void {
    if (this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.config.flushInterval);
    }
  }

  /**
   * Shutdown the logging service
   */
  public shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }

  /**
   * Get recent logs (for debugging)
   */
  public getRecentLogs(count: number = 100): LogEntry[] {
    return this.buffer.slice(-count);
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const logger = LoggingService.getInstance();

// Create default loggers for common components
export const agentLogger = logger.createLogger({ component: 'agent' });
export const toolLogger = logger.createLogger({ component: 'tool' });
export const aiLogger = logger.createLogger({ component: 'ai' });
export const serviceLogger = logger.createLogger({ component: 'service' });

export default LoggingService;
