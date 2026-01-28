/**
 * ErrorRecoveryService - Enterprise Error Recovery & Resilience System
 *
 * Provides comprehensive error handling and recovery for the Motion AI system
 *
 * Features:
 * - Automatic retry with configurable strategies
 * - Exponential backoff with jitter
 * - Error categorization and classification
 * - Recovery strategies per error type
 * - Fallback execution
 * - Error aggregation and deduplication
 * - Dead letter queue for failed operations
 * - Recovery metrics and reporting
 * - Custom recovery handlers
 * - Graceful degradation
 */

import { EventEmitter } from 'events';
import { logger, LoggerInstance } from './LoggingService';
import { metrics } from './MetricsService';

// ============================================
// TYPES & INTERFACES
// ============================================

export type ErrorCategory =
  | 'transient'     // Temporary errors, safe to retry
  | 'rate_limit'    // Rate limiting, retry with delay
  | 'validation'    // Input validation, no retry
  | 'authentication'// Auth errors, no retry
  | 'authorization' // Permission errors, no retry
  | 'not_found'     // Resource not found, no retry
  | 'conflict'      // State conflict, maybe retry
  | 'timeout'       // Timeout, safe to retry
  | 'network'       // Network issues, safe to retry
  | 'internal'      // Internal errors, maybe retry
  | 'external'      // External service errors, safe to retry
  | 'unknown';      // Unknown, cautious retry

export interface ErrorInfo {
  code: string;
  message: string;
  category: ErrorCategory;
  retryable: boolean;
  recoverable: boolean;
  details?: Record<string, unknown>;
  originalError?: Error;
  timestamp: number;
  context?: Record<string, unknown>;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // ms
  maxDelay: number; // ms
  multiplier: number;
  jitter: boolean;
  retryableCategories: ErrorCategory[];
  timeout: number; // ms
}

export interface RecoveryStrategy {
  name: string;
  category: ErrorCategory | ErrorCategory[];
  handler: (error: ErrorInfo, attempt: number) => Promise<RecoveryResult>;
  priority: number;
}

export interface RecoveryResult {
  recovered: boolean;
  action: 'retry' | 'fallback' | 'skip' | 'abort' | 'queue';
  message?: string;
  delay?: number;
  fallbackValue?: unknown;
}

export interface FailedOperation {
  id: string;
  operation: string;
  error: ErrorInfo;
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  context?: Record<string, unknown>;
  payload?: unknown;
}

export interface ErrorRecoveryConfig {
  // Retry settings
  defaultRetryConfig: RetryConfig;

  // Queue settings
  enableDeadLetterQueue: boolean;
  maxQueueSize: number;
  queueRetentionMs: number;

  // Aggregation settings
  enableAggregation: boolean;
  aggregationWindowMs: number;
  maxAggregatedErrors: number;

  // Recovery settings
  enableAutoRecovery: boolean;
  recoveryAttemptInterval: number; // ms
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  multiplier: 2,
  jitter: true,
  retryableCategories: ['transient', 'timeout', 'network', 'external', 'rate_limit'],
  timeout: 30000,
};

export const DEFAULT_ERROR_RECOVERY_CONFIG: ErrorRecoveryConfig = {
  defaultRetryConfig: DEFAULT_RETRY_CONFIG,
  enableDeadLetterQueue: true,
  maxQueueSize: 1000,
  queueRetentionMs: 86400000, // 24 hours
  enableAggregation: true,
  aggregationWindowMs: 60000, // 1 minute
  maxAggregatedErrors: 100,
  enableAutoRecovery: true,
  recoveryAttemptInterval: 60000, // 1 minute
};

// ============================================
// ERROR CLASSIFICATION
// ============================================

const ERROR_PATTERNS: Array<{
  pattern: RegExp | string;
  category: ErrorCategory;
  code: string;
}> = [
  // Network errors
  { pattern: /ECONNREFUSED/i, category: 'network', code: 'NETWORK_CONNECTION_REFUSED' },
  { pattern: /ECONNRESET/i, category: 'network', code: 'NETWORK_CONNECTION_RESET' },
  { pattern: /ETIMEDOUT/i, category: 'timeout', code: 'NETWORK_TIMEOUT' },
  { pattern: /ENOTFOUND/i, category: 'network', code: 'NETWORK_HOST_NOT_FOUND' },
  { pattern: /network/i, category: 'network', code: 'NETWORK_ERROR' },

  // Rate limiting
  { pattern: /rate limit/i, category: 'rate_limit', code: 'RATE_LIMIT_EXCEEDED' },
  { pattern: /429/i, category: 'rate_limit', code: 'HTTP_429_TOO_MANY_REQUESTS' },
  { pattern: /too many requests/i, category: 'rate_limit', code: 'RATE_LIMIT_EXCEEDED' },

  // Authentication/Authorization
  { pattern: /401/i, category: 'authentication', code: 'HTTP_401_UNAUTHORIZED' },
  { pattern: /unauthorized/i, category: 'authentication', code: 'UNAUTHORIZED' },
  { pattern: /403/i, category: 'authorization', code: 'HTTP_403_FORBIDDEN' },
  { pattern: /forbidden/i, category: 'authorization', code: 'FORBIDDEN' },

  // Not found
  { pattern: /404/i, category: 'not_found', code: 'HTTP_404_NOT_FOUND' },
  { pattern: /not found/i, category: 'not_found', code: 'RESOURCE_NOT_FOUND' },

  // Validation
  { pattern: /validation/i, category: 'validation', code: 'VALIDATION_ERROR' },
  { pattern: /invalid/i, category: 'validation', code: 'INVALID_INPUT' },
  { pattern: /400/i, category: 'validation', code: 'HTTP_400_BAD_REQUEST' },

  // Conflict
  { pattern: /409/i, category: 'conflict', code: 'HTTP_409_CONFLICT' },
  { pattern: /conflict/i, category: 'conflict', code: 'CONFLICT' },
  { pattern: /already exists/i, category: 'conflict', code: 'ALREADY_EXISTS' },

  // Timeout
  { pattern: /timeout/i, category: 'timeout', code: 'TIMEOUT' },
  { pattern: /timed out/i, category: 'timeout', code: 'TIMEOUT' },

  // Internal
  { pattern: /500/i, category: 'internal', code: 'HTTP_500_INTERNAL_ERROR' },
  { pattern: /502/i, category: 'external', code: 'HTTP_502_BAD_GATEWAY' },
  { pattern: /503/i, category: 'external', code: 'HTTP_503_SERVICE_UNAVAILABLE' },
  { pattern: /504/i, category: 'timeout', code: 'HTTP_504_GATEWAY_TIMEOUT' },
];

// ============================================
// ERROR RECOVERY SERVICE
// ============================================

export class ErrorRecoveryService extends EventEmitter {
  private static instance: ErrorRecoveryService;
  private config: ErrorRecoveryConfig;
  private log: LoggerInstance;

  // Dead letter queue
  private deadLetterQueue: Map<string, FailedOperation> = new Map();

  // Error aggregation
  private errorAggregation: Map<string, { count: number; first: number; last: number; sample: ErrorInfo }> = new Map();

  // Recovery strategies
  private strategies: RecoveryStrategy[] = [];

  // Recovery timer
  private recoveryTimer: NodeJS.Timeout | null = null;

  private constructor(config: Partial<ErrorRecoveryConfig> = {}) {
    super();
    this.config = { ...DEFAULT_ERROR_RECOVERY_CONFIG, ...config };
    this.log = logger.createLogger({
      service: 'error-recovery',
      component: 'resilience',
    });

    this.registerDefaultStrategies();
    this.startRecoveryProcess();
    this.log.info('ErrorRecoveryService initialized');
  }

  public static getInstance(config?: Partial<ErrorRecoveryConfig>): ErrorRecoveryService {
    if (!ErrorRecoveryService.instance) {
      ErrorRecoveryService.instance = new ErrorRecoveryService(config);
    }
    return ErrorRecoveryService.instance;
  }

  // ============================================
  // ERROR CLASSIFICATION
  // ============================================

  /**
   * Classify an error into a category
   */
  classifyError(error: Error | unknown, context?: Record<string, unknown>): ErrorInfo {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'Error';

    // Find matching pattern
    let category: ErrorCategory = 'unknown';
    let code = 'UNKNOWN_ERROR';

    for (const { pattern, category: cat, code: c } of ERROR_PATTERNS) {
      const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
      if (regex.test(errorMessage) || regex.test(errorName)) {
        category = cat;
        code = c;
        break;
      }
    }

    const retryable = this.config.defaultRetryConfig.retryableCategories.includes(category);
    const recoverable = category !== 'validation' && category !== 'authentication' && category !== 'authorization';

    const info: ErrorInfo = {
      code,
      message: errorMessage,
      category,
      retryable,
      recoverable,
      originalError: error instanceof Error ? error : undefined,
      timestamp: Date.now(),
      context,
    };

    // Aggregate error
    if (this.config.enableAggregation) {
      this.aggregateError(info);
    }

    // Track metric
    metrics.incrementCounter('errors_total', 1, { category, code });

    return info;
  }

  /**
   * Aggregate similar errors
   */
  private aggregateError(error: ErrorInfo): void {
    const key = `${error.code}:${error.category}`;
    const now = Date.now();

    // Clean old aggregations
    for (const [k, agg] of this.errorAggregation) {
      if (now - agg.last > this.config.aggregationWindowMs) {
        this.errorAggregation.delete(k);
      }
    }

    const existing = this.errorAggregation.get(key);
    if (existing) {
      existing.count++;
      existing.last = now;
    } else {
      if (this.errorAggregation.size >= this.config.maxAggregatedErrors) {
        // Remove oldest
        let oldestKey: string | null = null;
        let oldestTime = Infinity;
        for (const [k, agg] of this.errorAggregation) {
          if (agg.last < oldestTime) {
            oldestTime = agg.last;
            oldestKey = k;
          }
        }
        if (oldestKey) {
          this.errorAggregation.delete(oldestKey);
        }
      }

      this.errorAggregation.set(key, {
        count: 1,
        first: now,
        last: now,
        sample: error,
      });
    }
  }

  // ============================================
  // RETRY LOGIC
  // ============================================

  /**
   * Execute a function with automatic retry
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    options: Partial<RetryConfig> = {},
    context?: Record<string, unknown>
  ): Promise<T> {
    const config = { ...this.config.defaultRetryConfig, ...options };
    let lastError: ErrorInfo | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        // Execute with timeout
        const result = await this.executeWithTimeout(fn, config.timeout);
        return result;
      } catch (error) {
        lastError = this.classifyError(error, context);

        // Log attempt
        this.log.warn(`Attempt ${attempt + 1}/${config.maxRetries + 1} failed`, {
          code: lastError.code,
          category: lastError.category,
          retryable: lastError.retryable,
          attempt: attempt + 1,
        });

        // Check if we should retry
        if (!lastError.retryable || attempt >= config.maxRetries) {
          break;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt, config);

        // Wait before retry
        await this.delay(delay);
      }
    }

    // All retries exhausted
    metrics.incrementCounter('retry_exhausted_total', 1, {
      code: lastError?.code || 'unknown',
    });

    throw lastError?.originalError || new Error(lastError?.message || 'Unknown error after retries');
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);

      fn()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.initialDelay * Math.pow(config.multiplier, attempt);
    delay = Math.min(delay, config.maxDelay);

    if (config.jitter) {
      // Add random jitter of ±25%
      const jitterFactor = 0.75 + Math.random() * 0.5;
      delay = Math.floor(delay * jitterFactor);
    }

    return delay;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================
  // RECOVERY STRATEGIES
  // ============================================

  /**
   * Register a recovery strategy
   */
  registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => b.priority - a.priority);
    this.log.info('Recovery strategy registered', { name: strategy.name, priority: strategy.priority });
  }

  /**
   * Register default recovery strategies
   */
  private registerDefaultStrategies(): void {
    // Rate limit strategy
    this.registerStrategy({
      name: 'rate_limit_backoff',
      category: 'rate_limit',
      priority: 100,
      handler: async (error, attempt) => {
        const delay = Math.min(1000 * Math.pow(2, attempt), 60000);
        return {
          recovered: false,
          action: 'retry',
          message: `Rate limited, waiting ${delay}ms`,
          delay,
        };
      },
    });

    // Timeout strategy
    this.registerStrategy({
      name: 'timeout_retry',
      category: 'timeout',
      priority: 90,
      handler: async (error, attempt) => {
        if (attempt >= 3) {
          return {
            recovered: false,
            action: 'abort',
            message: 'Too many timeouts, aborting',
          };
        }
        return {
          recovered: false,
          action: 'retry',
          delay: 2000,
        };
      },
    });

    // Network error strategy
    this.registerStrategy({
      name: 'network_retry',
      category: 'network',
      priority: 80,
      handler: async (error, attempt) => {
        if (attempt >= 5) {
          return {
            recovered: false,
            action: 'queue',
            message: 'Network unavailable, queueing for later',
          };
        }
        return {
          recovered: false,
          action: 'retry',
          delay: 1000 * attempt,
        };
      },
    });

    // Validation error strategy (no retry)
    this.registerStrategy({
      name: 'validation_abort',
      category: 'validation',
      priority: 70,
      handler: async () => ({
        recovered: false,
        action: 'abort',
        message: 'Validation error, cannot retry',
      }),
    });
  }

  /**
   * Apply recovery strategy
   */
  async applyRecovery(error: ErrorInfo, attempt: number = 1): Promise<RecoveryResult> {
    // Find matching strategy
    const strategy = this.strategies.find(s => {
      const categories = Array.isArray(s.category) ? s.category : [s.category];
      return categories.includes(error.category);
    });

    if (strategy) {
      try {
        const result = await strategy.handler(error, attempt);
        this.log.debug('Recovery strategy applied', {
          strategy: strategy.name,
          result: result.action,
        });
        return result;
      } catch (strategyError) {
        this.log.error('Recovery strategy failed', strategyError, {
          strategy: strategy.name,
        });
      }
    }

    // Default: retry transient errors
    if (error.retryable && attempt < this.config.defaultRetryConfig.maxRetries) {
      return {
        recovered: false,
        action: 'retry',
        delay: this.calculateDelay(attempt, this.config.defaultRetryConfig),
      };
    }

    return {
      recovered: false,
      action: 'abort',
      message: 'No recovery strategy matched',
    };
  }

  // ============================================
  // DEAD LETTER QUEUE
  // ============================================

  /**
   * Add operation to dead letter queue
   */
  addToDeadLetterQueue(
    operation: string,
    error: ErrorInfo,
    payload?: unknown,
    context?: Record<string, unknown>
  ): string {
    if (!this.config.enableDeadLetterQueue) {
      return '';
    }

    // Check queue size
    if (this.deadLetterQueue.size >= this.config.maxQueueSize) {
      // Remove oldest
      let oldestId: string | null = null;
      let oldestTime = Infinity;
      for (const [id, op] of this.deadLetterQueue) {
        if (op.firstAttempt < oldestTime) {
          oldestTime = op.firstAttempt;
          oldestId = id;
        }
      }
      if (oldestId) {
        this.deadLetterQueue.delete(oldestId);
      }
    }

    const id = `dlq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const failedOp: FailedOperation = {
      id,
      operation,
      error,
      attempts: 1,
      firstAttempt: now,
      lastAttempt: now,
      context,
      payload,
    };

    this.deadLetterQueue.set(id, failedOp);

    this.emit('dlq:added', failedOp);
    this.log.warn('Operation added to dead letter queue', {
      id,
      operation,
      errorCode: error.code,
    });

    metrics.incrementCounter('dlq_operations_total', 1, { operation });

    return id;
  }

  /**
   * Get dead letter queue entries
   */
  getDeadLetterQueue(): FailedOperation[] {
    return Array.from(this.deadLetterQueue.values());
  }

  /**
   * Retry a dead letter queue entry
   */
  async retryDeadLetterEntry(id: string): Promise<boolean> {
    const entry = this.deadLetterQueue.get(id);
    if (!entry) {
      return false;
    }

    entry.attempts++;
    entry.lastAttempt = Date.now();

    this.emit('dlq:retry', entry);
    return true;
  }

  /**
   * Remove from dead letter queue
   */
  removeFromDeadLetterQueue(id: string): boolean {
    const removed = this.deadLetterQueue.delete(id);
    if (removed) {
      this.emit('dlq:removed', { id });
    }
    return removed;
  }

  /**
   * Clean expired entries from dead letter queue
   */
  private cleanDeadLetterQueue(): void {
    const now = Date.now();
    for (const [id, entry] of this.deadLetterQueue) {
      if (now - entry.firstAttempt > this.config.queueRetentionMs) {
        this.deadLetterQueue.delete(id);
        this.emit('dlq:expired', entry);
      }
    }
  }

  // ============================================
  // AUTO RECOVERY
  // ============================================

  /**
   * Start automatic recovery process
   */
  private startRecoveryProcess(): void {
    if (!this.config.enableAutoRecovery) return;

    this.recoveryTimer = setInterval(() => {
      this.runRecoveryAttempts();
      this.cleanDeadLetterQueue();
    }, this.config.recoveryAttemptInterval);
  }

  /**
   * Run recovery attempts on queued items
   */
  private async runRecoveryAttempts(): Promise<void> {
    for (const [id, entry] of this.deadLetterQueue) {
      // Skip entries that have been retried recently
      if (Date.now() - entry.lastAttempt < this.config.recoveryAttemptInterval) {
        continue;
      }

      // Apply recovery strategy
      const result = await this.applyRecovery(entry.error, entry.attempts);

      if (result.action === 'retry') {
        entry.attempts++;
        entry.lastAttempt = Date.now();
        this.emit('dlq:auto_retry', entry);
        this.log.info('Auto-retrying DLQ entry', { id, attempts: entry.attempts });
      } else if (result.action === 'abort') {
        // Keep in queue but mark as exhausted
        this.log.warn('DLQ entry exhausted', { id, attempts: entry.attempts });
      }
    }
  }

  // ============================================
  // FALLBACK EXECUTION
  // ============================================

  /**
   * Execute with fallback
   */
  async withFallback<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T> | T,
    options?: Partial<RetryConfig>
  ): Promise<T> {
    try {
      return await this.withRetry(primary, options);
    } catch (error) {
      this.log.info('Executing fallback', {
        error: error instanceof Error ? error.message : String(error),
      });
      metrics.incrementCounter('fallback_executions_total', 1);
      return await fallback();
    }
  }

  /**
   * Execute with graceful degradation
   */
  async withGracefulDegradation<T>(
    levels: Array<{
      name: string;
      fn: () => Promise<T>;
      timeout?: number;
    }>,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (const level of levels) {
      try {
        this.log.debug(`Trying degradation level: ${level.name}`);
        const result = await this.executeWithTimeout(
          level.fn,
          level.timeout || this.config.defaultRetryConfig.timeout
        );
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.log.warn(`Degradation level failed: ${level.name}`, { error: lastError.message });
        metrics.incrementCounter('degradation_level_failures', 1, { level: level.name });
      }
    }

    throw lastError || new Error('All degradation levels failed');
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get error statistics
   */
  getStats(): {
    totalErrors: number;
    aggregatedErrors: Array<{
      code: string;
      category: ErrorCategory;
      count: number;
      firstSeen: number;
      lastSeen: number;
    }>;
    deadLetterQueueSize: number;
    errorsByCategory: Record<ErrorCategory, number>;
  } {
    const errorsByCategory: Record<ErrorCategory, number> = {} as Record<ErrorCategory, number>;
    let totalErrors = 0;

    const aggregatedErrors = [];
    for (const [key, agg] of this.errorAggregation) {
      const [code, category] = key.split(':') as [string, ErrorCategory];
      aggregatedErrors.push({
        code,
        category,
        count: agg.count,
        firstSeen: agg.first,
        lastSeen: agg.last,
      });
      totalErrors += agg.count;
      errorsByCategory[category] = (errorsByCategory[category] || 0) + agg.count;
    }

    return {
      totalErrors,
      aggregatedErrors,
      deadLetterQueueSize: this.deadLetterQueue.size,
      errorsByCategory,
    };
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.errorAggregation.clear();
    this.deadLetterQueue.clear();
  }

  /**
   * Shutdown the service
   */
  shutdown(): void {
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
    }
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const errorRecovery = ErrorRecoveryService.getInstance();

export default ErrorRecoveryService;
