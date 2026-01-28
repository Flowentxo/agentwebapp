/**
 * CircuitBreakerService - Enterprise Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by detecting when a service is failing and
 * temporarily stopping requests until the service recovers.
 *
 * Features:
 * - Three states: CLOSED (normal), OPEN (failing), HALF_OPEN (testing)
 * - Configurable failure thresholds and timeouts
 * - Automatic recovery with gradual traffic restoration
 * - Per-service circuit breakers
 * - Health monitoring and metrics
 * - Fallback support
 * - Event-driven notifications
 * - Sliding window for failure tracking
 */

import { EventEmitter } from 'events';
import { logger, LoggerInstance } from './LoggingService';

// ============================================
// TYPES & INTERFACES
// ============================================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  // Failure thresholds
  failureThreshold: number; // Number of failures before opening
  failureRateThreshold: number; // Percentage of failures (0-100)

  // Timing
  resetTimeout: number; // Time to wait before trying again (ms)
  halfOpenMaxRequests: number; // Max requests in half-open state

  // Sliding window
  slidingWindowSize: number; // Number of requests to track
  slidingWindowType: 'count' | 'time';
  slidingWindowDuration: number; // Duration for time-based window (ms)

  // Timeouts
  requestTimeout: number; // Timeout for individual requests (ms)

  // Recovery
  successThreshold: number; // Successes needed to close from half-open

  // Fallback
  fallbackEnabled: boolean;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  failureRate: number;
  lastFailure: number | null;
  lastSuccess: number | null;
  lastStateChange: number;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  rejectedRequests: number;
  fallbackExecutions: number;
}

export interface CircuitBreakerMetrics {
  circuits: Record<string, CircuitBreakerStats>;
  totalCircuits: number;
  openCircuits: number;
  halfOpenCircuits: number;
  closedCircuits: number;
  globalFailureRate: number;
}

interface RequestRecord {
  timestamp: number;
  success: boolean;
  duration: number;
  error?: string;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  failureRateThreshold: 50,
  resetTimeout: 30000, // 30 seconds
  halfOpenMaxRequests: 3,
  slidingWindowSize: 20,
  slidingWindowType: 'count',
  slidingWindowDuration: 60000, // 1 minute
  requestTimeout: 30000, // 30 seconds
  successThreshold: 3,
  fallbackEnabled: true,
};

// ============================================
// CIRCUIT BREAKER IMPLEMENTATION
// ============================================

class CircuitBreaker extends EventEmitter {
  public readonly name: string;
  private config: CircuitBreakerConfig;
  private state: CircuitState = 'CLOSED';
  private requestHistory: RequestRecord[] = [];
  private halfOpenRequests: number = 0;
  private consecutiveSuccesses: number = 0;
  private consecutiveFailures: number = 0;
  private lastStateChange: number = Date.now();
  private lastFailure: number | null = null;
  private lastSuccess: number | null = null;
  private rejectedRequests: number = 0;
  private fallbackExecutions: number = 0;
  private resetTimer: NodeJS.Timeout | null = null;
  private log: LoggerInstance;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    super();
    this.name = name;
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
    this.log = logger.createLogger({
      service: 'circuit-breaker',
      component: name,
    });
  }

  // ============================================
  // CORE EXECUTION
  // ============================================

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    // Check if circuit allows the request
    if (!this.canExecute()) {
      this.rejectedRequests++;
      this.emit('rejected', { name: this.name, state: this.state });

      if (fallback && this.config.fallbackEnabled) {
        this.fallbackExecutions++;
        this.emit('fallback', { name: this.name });
        return fallback();
      }

      throw new CircuitBreakerOpenError(
        `Circuit breaker ${this.name} is ${this.state}`,
        this.name,
        this.getTimeUntilReset()
      );
    }

    // Track half-open requests
    if (this.state === 'HALF_OPEN') {
      this.halfOpenRequests++;
    }

    const startTime = Date.now();

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn);

      // Record success
      this.recordSuccess(Date.now() - startTime);

      return result;
    } catch (error) {
      // Record failure
      this.recordFailure(Date.now() - startTime, error);

      // Try fallback if available
      if (fallback && this.config.fallbackEnabled) {
        this.fallbackExecutions++;
        this.emit('fallback', { name: this.name, error });
        return fallback();
      }

      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Request timeout after ${this.config.requestTimeout}ms`));
      }, this.config.requestTimeout);

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

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  /**
   * Check if circuit allows execution
   */
  private canExecute(): boolean {
    this.cleanupOldRecords();

    switch (this.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        // Check if reset timeout has passed
        if (Date.now() - this.lastStateChange >= this.config.resetTimeout) {
          this.transitionTo('HALF_OPEN');
          return true;
        }
        return false;

      case 'HALF_OPEN':
        // Allow limited requests in half-open state
        return this.halfOpenRequests < this.config.halfOpenMaxRequests;

      default:
        return false;
    }
  }

  /**
   * Record a successful execution
   */
  private recordSuccess(duration: number): void {
    const record: RequestRecord = {
      timestamp: Date.now(),
      success: true,
      duration,
    };

    this.requestHistory.push(record);
    this.lastSuccess = Date.now();
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;

    this.emit('success', { name: this.name, duration });

    // Handle state transitions
    if (this.state === 'HALF_OPEN') {
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        this.transitionTo('CLOSED');
      }
    }
  }

  /**
   * Record a failed execution
   */
  private recordFailure(duration: number, error: unknown): void {
    const record: RequestRecord = {
      timestamp: Date.now(),
      success: false,
      duration,
      error: error instanceof Error ? error.message : String(error),
    };

    this.requestHistory.push(record);
    this.lastFailure = Date.now();
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;

    this.emit('failure', { name: this.name, duration, error });

    // Handle state transitions
    if (this.state === 'HALF_OPEN') {
      // Any failure in half-open goes back to open
      this.transitionTo('OPEN');
    } else if (this.state === 'CLOSED') {
      // Check if we need to open the circuit
      if (this.shouldOpen()) {
        this.transitionTo('OPEN');
      }
    }
  }

  /**
   * Check if circuit should open based on failure criteria
   */
  private shouldOpen(): boolean {
    // Check consecutive failures
    if (this.consecutiveFailures >= this.config.failureThreshold) {
      return true;
    }

    // Check failure rate
    const stats = this.calculateStats();
    if (stats.failureRate >= this.config.failureRateThreshold) {
      return true;
    }

    return false;
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    // Reset counters based on state
    if (newState === 'HALF_OPEN') {
      this.halfOpenRequests = 0;
      this.consecutiveSuccesses = 0;
    } else if (newState === 'CLOSED') {
      this.consecutiveFailures = 0;
    }

    // Clear any existing reset timer
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }

    // Set reset timer for OPEN state
    if (newState === 'OPEN') {
      this.resetTimer = setTimeout(() => {
        if (this.state === 'OPEN') {
          this.transitionTo('HALF_OPEN');
        }
      }, this.config.resetTimeout);
    }

    this.emit('stateChange', {
      name: this.name,
      from: oldState,
      to: newState,
    });

    this.log.info('Circuit state changed', {
      from: oldState,
      to: newState,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
    });
  }

  /**
   * Get time until circuit can be reset
   */
  private getTimeUntilReset(): number {
    if (this.state !== 'OPEN') {
      return 0;
    }
    const elapsed = Date.now() - this.lastStateChange;
    return Math.max(0, this.config.resetTimeout - elapsed);
  }

  /**
   * Clean up old records based on sliding window
   */
  private cleanupOldRecords(): void {
    const now = Date.now();

    if (this.config.slidingWindowType === 'time') {
      // Remove records older than the window duration
      const cutoff = now - this.config.slidingWindowDuration;
      this.requestHistory = this.requestHistory.filter(
        (r) => r.timestamp > cutoff
      );
    } else {
      // Keep only the last N records
      if (this.requestHistory.length > this.config.slidingWindowSize) {
        this.requestHistory = this.requestHistory.slice(
          -this.config.slidingWindowSize
        );
      }
    }
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Calculate current statistics
   */
  private calculateStats(): { failures: number; successes: number; failureRate: number } {
    this.cleanupOldRecords();

    const failures = this.requestHistory.filter((r) => !r.success).length;
    const successes = this.requestHistory.filter((r) => r.success).length;
    const total = this.requestHistory.length;
    const failureRate = total > 0 ? (failures / total) * 100 : 0;

    return { failures, successes, failureRate };
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    const { failures, successes, failureRate } = this.calculateStats();

    return {
      state: this.state,
      failures,
      successes,
      totalRequests: this.requestHistory.length,
      failureRate,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      lastStateChange: this.lastStateChange,
      consecutiveSuccesses: this.consecutiveSuccesses,
      consecutiveFailures: this.consecutiveFailures,
      rejectedRequests: this.rejectedRequests,
      fallbackExecutions: this.fallbackExecutions,
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Force circuit to specific state (admin operation)
   */
  forceState(state: CircuitState): void {
    this.transitionTo(state);
    this.log.warn('Circuit state forced', { forcedTo: state });
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = 'CLOSED';
    this.requestHistory = [];
    this.halfOpenRequests = 0;
    this.consecutiveSuccesses = 0;
    this.consecutiveFailures = 0;
    this.lastStateChange = Date.now();
    this.lastFailure = null;
    this.lastSuccess = null;
    this.rejectedRequests = 0;
    this.fallbackExecutions = 0;

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }

    this.emit('reset', { name: this.name });
  }
}

// ============================================
// CIRCUIT BREAKER SERVICE
// ============================================

export class CircuitBreakerService extends EventEmitter {
  private static instance: CircuitBreakerService;
  private circuits: Map<string, CircuitBreaker> = new Map();
  private defaultConfig: CircuitBreakerConfig;

  private constructor(config: Partial<CircuitBreakerConfig> = {}) {
    super();
    this.defaultConfig = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  }

  public static getInstance(config?: Partial<CircuitBreakerConfig>): CircuitBreakerService {
    if (!CircuitBreakerService.instance) {
      CircuitBreakerService.instance = new CircuitBreakerService(config);
    }
    return CircuitBreakerService.instance;
  }

  // ============================================
  // CIRCUIT MANAGEMENT
  // ============================================

  /**
   * Get or create a circuit breaker
   */
  getCircuit(
    name: string,
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    if (!this.circuits.has(name)) {
      const circuit = new CircuitBreaker(name, {
        ...this.defaultConfig,
        ...config,
      });

      // Forward events
      circuit.on('stateChange', (data) => this.emit('stateChange', data));
      circuit.on('failure', (data) => this.emit('failure', data));
      circuit.on('success', (data) => this.emit('success', data));
      circuit.on('rejected', (data) => this.emit('rejected', data));
      circuit.on('fallback', (data) => this.emit('fallback', data));
      circuit.on('reset', (data) => this.emit('reset', data));

      this.circuits.set(name, circuit);
    }

    return this.circuits.get(name)!;
  }

  /**
   * Execute with circuit breaker protection
   */
  async execute<T>(
    circuitName: string,
    fn: () => Promise<T>,
    options?: {
      config?: Partial<CircuitBreakerConfig>;
      fallback?: () => Promise<T>;
    }
  ): Promise<T> {
    const circuit = this.getCircuit(circuitName, options?.config);
    return circuit.execute(fn, options?.fallback);
  }

  /**
   * Create a protected function wrapper
   */
  protect<TArgs extends unknown[], TResult>(
    circuitName: string,
    fn: (...args: TArgs) => Promise<TResult>,
    options?: {
      config?: Partial<CircuitBreakerConfig>;
      fallback?: (...args: TArgs) => Promise<TResult>;
    }
  ): (...args: TArgs) => Promise<TResult> {
    return async (...args: TArgs): Promise<TResult> => {
      const circuit = this.getCircuit(circuitName, options?.config);
      return circuit.execute(
        () => fn(...args),
        options?.fallback ? () => options.fallback!(...args) : undefined
      );
    };
  }

  // ============================================
  // STATISTICS & MONITORING
  // ============================================

  /**
   * Get metrics for all circuits
   */
  getMetrics(): CircuitBreakerMetrics {
    const circuits: Record<string, CircuitBreakerStats> = {};
    let openCount = 0;
    let halfOpenCount = 0;
    let closedCount = 0;
    let totalFailures = 0;
    let totalRequests = 0;

    for (const [name, circuit] of this.circuits) {
      const stats = circuit.getStats();
      circuits[name] = stats;

      switch (stats.state) {
        case 'OPEN':
          openCount++;
          break;
        case 'HALF_OPEN':
          halfOpenCount++;
          break;
        case 'CLOSED':
          closedCount++;
          break;
      }

      totalFailures += stats.failures;
      totalRequests += stats.totalRequests;
    }

    return {
      circuits,
      totalCircuits: this.circuits.size,
      openCircuits: openCount,
      halfOpenCircuits: halfOpenCount,
      closedCircuits: closedCount,
      globalFailureRate: totalRequests > 0 ? (totalFailures / totalRequests) * 100 : 0,
    };
  }

  /**
   * Get stats for a specific circuit
   */
  getCircuitStats(name: string): CircuitBreakerStats | undefined {
    const circuit = this.circuits.get(name);
    return circuit?.getStats();
  }

  /**
   * Get all circuit states
   */
  getStates(): Record<string, CircuitState> {
    const states: Record<string, CircuitState> = {};
    for (const [name, circuit] of this.circuits) {
      states[name] = circuit.getState();
    }
    return states;
  }

  // ============================================
  // ADMIN OPERATIONS
  // ============================================

  /**
   * Reset a specific circuit
   */
  resetCircuit(name: string): boolean {
    const circuit = this.circuits.get(name);
    if (circuit) {
      circuit.reset();
      return true;
    }
    return false;
  }

  /**
   * Reset all circuits
   */
  resetAll(): void {
    for (const circuit of this.circuits.values()) {
      circuit.reset();
    }
  }

  /**
   * Force a circuit to specific state
   */
  forceCircuitState(name: string, state: CircuitState): boolean {
    const circuit = this.circuits.get(name);
    if (circuit) {
      circuit.forceState(state);
      return true;
    }
    return false;
  }

  /**
   * Remove a circuit
   */
  removeCircuit(name: string): boolean {
    const circuit = this.circuits.get(name);
    if (circuit) {
      circuit.reset();
      circuit.removeAllListeners();
      return this.circuits.delete(name);
    }
    return false;
  }

  /**
   * Configure default settings
   */
  configure(config: Partial<CircuitBreakerConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }
}

// ============================================
// ERROR CLASSES
// ============================================

export class CircuitBreakerOpenError extends Error {
  public readonly circuitName: string;
  public readonly retryAfter: number;
  public readonly isCircuitBreakerError = true;

  constructor(message: string, circuitName: string, retryAfter: number) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
    this.circuitName = circuitName;
    this.retryAfter = retryAfter;
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const circuitBreaker = CircuitBreakerService.getInstance();

export default CircuitBreakerService;
