/**
 * CIRCUIT BREAKER PATTERN
 *
 * Prevents cascading failures by temporarily disabling failing models
 * and automatically recovering when they become healthy again.
 */

export enum CircuitState {
  CLOSED = 'closed', // Normal operation
  OPEN = 'open', // Failing, requests blocked
  HALF_OPEN = 'half_open', // Testing if recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  successThreshold: number; // Number of successes needed to close circuit
  timeout: number; // Time before attempting recovery (ms)
  monitoringPeriod: number; // Time window for counting failures (ms)
}

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastStateChange: number;
  failureTimestamps: number[];
}

/**
 * Circuit Breaker for AI Models
 */
export class CircuitBreaker {
  private modelStates: Map<string, CircuitBreakerState> = new Map();
  private config: CircuitBreakerConfig;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      successThreshold: config?.successThreshold ?? 2,
      timeout: config?.timeout ?? 60000, // 1 minute
      monitoringPeriod: config?.monitoringPeriod ?? 300000, // 5 minutes
    };
  }

  /**
   * Get or create state for a model
   */
  private getState(modelKey: string): CircuitBreakerState {
    if (!this.modelStates.has(modelKey)) {
      this.modelStates.set(modelKey, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        lastFailureTime: null,
        lastStateChange: Date.now(),
        failureTimestamps: [],
      });
    }
    return this.modelStates.get(modelKey)!;
  }

  /**
   * Check if request is allowed for this model
   */
  canExecute(provider: string, model: string): boolean {
    const modelKey = `${provider}:${model}`;
    const state = this.getState(modelKey);

    // Clean up old failure timestamps
    const now = Date.now();
    state.failureTimestamps = state.failureTimestamps.filter(
      (timestamp) => now - timestamp < this.config.monitoringPeriod
    );

    switch (state.state) {
      case CircuitState.CLOSED:
        // Normal operation - allow all requests
        return true;

      case CircuitState.OPEN:
        // Circuit is open - check if timeout has elapsed
        if (
          state.lastFailureTime &&
          now - state.lastFailureTime >= this.config.timeout
        ) {
          // Timeout elapsed, try to recover
          console.log(`[CIRCUIT_BREAKER] ${modelKey}: OPEN → HALF_OPEN (testing recovery)`);
          state.state = CircuitState.HALF_OPEN;
          state.successes = 0;
          state.lastStateChange = now;
          return true;
        }
        // Circuit still open, reject request
        console.log(`[CIRCUIT_BREAKER] ${modelKey}: Request blocked (circuit OPEN)`);
        return false;

      case CircuitState.HALF_OPEN:
        // Testing recovery - allow limited requests
        return true;
    }
  }

  /**
   * Record successful execution
   */
  recordSuccess(provider: string, model: string): void {
    const modelKey = `${provider}:${model}`;
    const state = this.getState(modelKey);

    state.successes++;

    if (state.state === CircuitState.HALF_OPEN) {
      // In half-open state, check if we have enough successes to close circuit
      if (state.successes >= this.config.successThreshold) {
        console.log(
          `[CIRCUIT_BREAKER] ${modelKey}: HALF_OPEN → CLOSED (recovered after ${state.successes} successes)`
        );
        state.state = CircuitState.CLOSED;
        state.failures = 0;
        state.successes = 0;
        state.failureTimestamps = [];
        state.lastFailureTime = null;
        state.lastStateChange = Date.now();
      }
    } else if (state.state === CircuitState.CLOSED) {
      // In closed state, reset failure count on success
      if (state.failures > 0) {
        console.log(
          `[CIRCUIT_BREAKER] ${modelKey}: Success after ${state.failures} failures, resetting counter`
        );
        state.failures = 0;
        state.failureTimestamps = [];
      }
    }
  }

  /**
   * Record failed execution
   */
  recordFailure(provider: string, model: string, errorType?: string): void {
    const modelKey = `${provider}:${model}`;
    const state = this.getState(modelKey);
    const now = Date.now();

    state.failures++;
    state.lastFailureTime = now;
    state.failureTimestamps.push(now);

    console.log(
      `[CIRCUIT_BREAKER] ${modelKey}: Failure recorded (${state.failures}/${this.config.failureThreshold}) - ${errorType || 'unknown error'}`
    );

    if (state.state === CircuitState.HALF_OPEN) {
      // In half-open state, any failure reopens circuit
      console.log(
        `[CIRCUIT_BREAKER] ${modelKey}: HALF_OPEN → OPEN (failure during recovery)`
      );
      state.state = CircuitState.OPEN;
      state.successes = 0;
      state.lastStateChange = now;
    } else if (state.state === CircuitState.CLOSED) {
      // In closed state, check if we've exceeded failure threshold
      if (state.failureTimestamps.length >= this.config.failureThreshold) {
        console.log(
          `[CIRCUIT_BREAKER] ${modelKey}: CLOSED → OPEN (${state.failures} failures in ${this.config.monitoringPeriod / 1000}s window)`
        );
        state.state = CircuitState.OPEN;
        state.lastStateChange = now;
      }
    }
  }

  /**
   * Get current state for a model
   */
  getCircuitState(provider: string, model: string): CircuitState {
    const modelKey = `${provider}:${model}`;
    return this.getState(modelKey).state;
  }

  /**
   * Manually reset circuit for a model
   */
  reset(provider: string, model: string): void {
    const modelKey = `${provider}:${model}`;
    console.log(`[CIRCUIT_BREAKER] ${modelKey}: Manual reset`);

    this.modelStates.set(modelKey, {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      lastStateChange: Date.now(),
      failureTimestamps: [],
    });
  }

  /**
   * Get statistics for all models
   */
  getStats(): Array<{
    model: string;
    state: CircuitState;
    failures: number;
    lastFailure: number | null;
    uptime: number;
  }> {
    const stats: Array<{
      model: string;
      state: CircuitState;
      failures: number;
      lastFailure: number | null;
      uptime: number;
    }> = [];

    const now = Date.now();

    for (const [modelKey, state] of this.modelStates.entries()) {
      stats.push({
        model: modelKey,
        state: state.state,
        failures: state.failureTimestamps.length,
        lastFailure: state.lastFailureTime,
        uptime: state.state === CircuitState.CLOSED ? 100 : 0,
      });
    }

    return stats;
  }

  /**
   * Clear all circuit breaker state (for testing)
   */
  clearAll(): void {
    console.log('[CIRCUIT_BREAKER] Clearing all circuit breaker state');
    this.modelStates.clear();
  }
}

/**
 * Global circuit breaker instance
 */
export const globalCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000, // 1 minute
  monitoringPeriod: 300000, // 5 minutes
});
