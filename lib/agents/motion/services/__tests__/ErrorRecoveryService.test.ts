/**
 * ErrorRecoveryService Unit Tests
 *
 * Tests for the enterprise error recovery and resilience system
 */

import {
  ErrorRecoveryService,
  errorRecovery,
  ErrorInfo,
  ErrorCategory,
  RecoveryStrategy,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_ERROR_RECOVERY_CONFIG,
} from '../ErrorRecoveryService';

describe('ErrorRecoveryService', () => {
  describe('Error Classification', () => {
    it('should classify network errors correctly', () => {
      const error = new Error('ECONNREFUSED: Connection refused');
      const info = errorRecovery.classifyError(error);

      expect(info.category).toBe('network');
      expect(info.code).toBe('NETWORK_CONNECTION_REFUSED');
      expect(info.retryable).toBe(true);
    });

    it('should classify timeout errors correctly', () => {
      const error = new Error('Request timed out after 30s');
      const info = errorRecovery.classifyError(error);

      expect(info.category).toBe('timeout');
      expect(info.retryable).toBe(true);
    });

    it('should classify rate limit errors correctly', () => {
      const error = new Error('429 Too Many Requests');
      const info = errorRecovery.classifyError(error);

      expect(info.category).toBe('rate_limit');
      expect(info.code).toBe('HTTP_429_TOO_MANY_REQUESTS');
      expect(info.retryable).toBe(true);
    });

    it('should classify authentication errors correctly', () => {
      const error = new Error('401 Unauthorized');
      const info = errorRecovery.classifyError(error);

      expect(info.category).toBe('authentication');
      expect(info.retryable).toBe(false);
    });

    it('should classify authorization errors correctly', () => {
      const error = new Error('403 Forbidden');
      const info = errorRecovery.classifyError(error);

      expect(info.category).toBe('authorization');
      expect(info.retryable).toBe(false);
    });

    it('should classify not found errors correctly', () => {
      const error = new Error('404 Not Found');
      const info = errorRecovery.classifyError(error);

      expect(info.category).toBe('not_found');
      expect(info.retryable).toBe(false);
    });

    it('should classify validation errors correctly', () => {
      const error = new Error('Validation failed: email is invalid');
      const info = errorRecovery.classifyError(error);

      expect(info.category).toBe('validation');
      expect(info.retryable).toBe(false);
      expect(info.recoverable).toBe(false);
    });

    it('should classify unknown errors correctly', () => {
      const error = new Error('Some random error');
      const info = errorRecovery.classifyError(error);

      expect(info.category).toBe('unknown');
    });

    it('should include context in error info', () => {
      const error = new Error('Test error');
      const context = { userId: 'user-123', agentId: 'alfred' };
      const info = errorRecovery.classifyError(error, context);

      expect(info.context).toEqual(context);
    });

    it('should include original error reference', () => {
      const originalError = new Error('Original error');
      const info = errorRecovery.classifyError(originalError);

      expect(info.originalError).toBe(originalError);
    });
  });

  describe('Retry Logic', () => {
    it('should successfully execute on first try', async () => {
      let attempts = 0;
      const result = await errorRecovery.withRetry(async () => {
        attempts++;
        return 'success';
      });

      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    it('should retry on transient error and succeed', async () => {
      let attempts = 0;
      const result = await errorRecovery.withRetry(
        async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('ECONNRESET');
          }
          return 'success';
        },
        { maxRetries: 3, initialDelay: 10 }
      );

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should not retry on non-retryable error', async () => {
      let attempts = 0;

      await expect(
        errorRecovery.withRetry(
          async () => {
            attempts++;
            throw new Error('401 Unauthorized');
          },
          { maxRetries: 3, initialDelay: 10 }
        )
      ).rejects.toThrow();

      expect(attempts).toBe(1);
    });

    it('should exhaust retries and throw', async () => {
      let attempts = 0;

      await expect(
        errorRecovery.withRetry(
          async () => {
            attempts++;
            throw new Error('ECONNREFUSED');
          },
          { maxRetries: 2, initialDelay: 10 }
        )
      ).rejects.toThrow();

      expect(attempts).toBe(3); // Initial + 2 retries
    });

    it('should respect timeout', async () => {
      await expect(
        errorRecovery.withRetry(
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 200));
            return 'success';
          },
          { timeout: 50, maxRetries: 0 }
        )
      ).rejects.toThrow('timed out');
    });
  });

  describe('Fallback Execution', () => {
    it('should use primary function when successful', async () => {
      const result = await errorRecovery.withFallback(
        async () => 'primary',
        async () => 'fallback',
        { maxRetries: 0 }
      );

      expect(result).toBe('primary');
    });

    it('should use fallback when primary fails', async () => {
      const result = await errorRecovery.withFallback(
        async () => {
          throw new Error('Primary failed');
        },
        async () => 'fallback',
        { maxRetries: 0, initialDelay: 10 }
      );

      expect(result).toBe('fallback');
    });

    it('should work with sync fallback function', async () => {
      const result = await errorRecovery.withFallback(
        async () => {
          throw new Error('Primary failed');
        },
        () => 'sync-fallback',
        { maxRetries: 0, initialDelay: 10 }
      );

      expect(result).toBe('sync-fallback');
    });
  });

  describe('Graceful Degradation', () => {
    it('should try levels in order and return first success', async () => {
      const attempts: string[] = [];

      const result = await errorRecovery.withGracefulDegradation([
        {
          name: 'premium',
          fn: async () => {
            attempts.push('premium');
            return 'premium-result';
          },
        },
        {
          name: 'standard',
          fn: async () => {
            attempts.push('standard');
            return 'standard-result';
          },
        },
      ]);

      expect(result).toBe('premium-result');
      expect(attempts).toEqual(['premium']);
    });

    it('should fall back to next level on failure', async () => {
      const attempts: string[] = [];

      const result = await errorRecovery.withGracefulDegradation([
        {
          name: 'premium',
          fn: async () => {
            attempts.push('premium');
            throw new Error('Premium unavailable');
          },
        },
        {
          name: 'standard',
          fn: async () => {
            attempts.push('standard');
            return 'standard-result';
          },
        },
      ]);

      expect(result).toBe('standard-result');
      expect(attempts).toEqual(['premium', 'standard']);
    });

    it('should throw when all levels fail', async () => {
      await expect(
        errorRecovery.withGracefulDegradation([
          {
            name: 'level1',
            fn: async () => {
              throw new Error('Level 1 failed');
            },
          },
          {
            name: 'level2',
            fn: async () => {
              throw new Error('Level 2 failed');
            },
          },
        ])
      ).rejects.toThrow('Level 2 failed');
    });
  });

  describe('Dead Letter Queue', () => {
    beforeEach(() => {
      errorRecovery.reset();
    });

    it('should add failed operations to DLQ', () => {
      const error = errorRecovery.classifyError(new Error('Test error'));
      const id = errorRecovery.addToDeadLetterQueue('test-operation', error, { data: 'test' });

      expect(id).toBeTruthy();
      expect(id.startsWith('dlq-')).toBe(true);

      const dlq = errorRecovery.getDeadLetterQueue();
      expect(dlq.length).toBe(1);
      expect(dlq[0].operation).toBe('test-operation');
    });

    it('should retrieve DLQ entries', () => {
      const error = errorRecovery.classifyError(new Error('Test error'));
      errorRecovery.addToDeadLetterQueue('op1', error);
      errorRecovery.addToDeadLetterQueue('op2', error);

      const dlq = errorRecovery.getDeadLetterQueue();
      expect(dlq.length).toBe(2);
    });

    it('should remove entries from DLQ', () => {
      const error = errorRecovery.classifyError(new Error('Test error'));
      const id = errorRecovery.addToDeadLetterQueue('test-operation', error);

      const removed = errorRecovery.removeFromDeadLetterQueue(id);
      expect(removed).toBe(true);

      const dlq = errorRecovery.getDeadLetterQueue();
      expect(dlq.length).toBe(0);
    });

    it('should return false when removing non-existent entry', () => {
      const removed = errorRecovery.removeFromDeadLetterQueue('non-existent-id');
      expect(removed).toBe(false);
    });

    it('should retry DLQ entries', async () => {
      const error = errorRecovery.classifyError(new Error('Test error'));
      const id = errorRecovery.addToDeadLetterQueue('test-operation', error);

      const success = await errorRecovery.retryDeadLetterEntry(id);
      expect(success).toBe(true);

      const dlq = errorRecovery.getDeadLetterQueue();
      const entry = dlq.find((e) => e.id === id);
      expect(entry?.attempts).toBe(2);
    });
  });

  describe('Recovery Strategies', () => {
    it('should register custom recovery strategy', () => {
      const customStrategy: RecoveryStrategy = {
        name: 'custom-strategy',
        category: 'transient',
        priority: 50,
        handler: async () => ({
          recovered: true,
          action: 'retry',
          delay: 100,
        }),
      };

      // This should not throw
      errorRecovery.registerStrategy(customStrategy);
    });

    it('should apply recovery strategy', async () => {
      const error: ErrorInfo = {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
        category: 'rate_limit',
        retryable: true,
        recoverable: true,
        timestamp: Date.now(),
      };

      const result = await errorRecovery.applyRecovery(error, 1);

      expect(result.action).toBe('retry');
      expect(result.delay).toBeDefined();
    });

    it('should abort on validation errors', async () => {
      const error: ErrorInfo = {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        category: 'validation',
        retryable: false,
        recoverable: false,
        timestamp: Date.now(),
      };

      const result = await errorRecovery.applyRecovery(error, 1);

      expect(result.action).toBe('abort');
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      errorRecovery.reset();
    });

    it('should track error statistics', () => {
      errorRecovery.classifyError(new Error('ECONNREFUSED'));
      errorRecovery.classifyError(new Error('ECONNREFUSED'));
      errorRecovery.classifyError(new Error('timeout'));

      const stats = errorRecovery.getStats();

      expect(stats.totalErrors).toBe(3);
      expect(stats.aggregatedErrors.length).toBeGreaterThan(0);
      expect(stats.errorsByCategory.network).toBe(2);
      expect(stats.errorsByCategory.timeout).toBe(1);
    });

    it('should track DLQ size', () => {
      const error = errorRecovery.classifyError(new Error('Test'));
      errorRecovery.addToDeadLetterQueue('op1', error);
      errorRecovery.addToDeadLetterQueue('op2', error);

      const stats = errorRecovery.getStats();
      expect(stats.deadLetterQueueSize).toBe(2);
    });

    it('should reset statistics', () => {
      errorRecovery.classifyError(new Error('Test'));
      const error = errorRecovery.classifyError(new Error('Test'));
      errorRecovery.addToDeadLetterQueue('op1', error);

      errorRecovery.reset();

      const stats = errorRecovery.getStats();
      expect(stats.totalErrors).toBe(0);
      expect(stats.deadLetterQueueSize).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should have default retry config', () => {
      expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
      expect(DEFAULT_RETRY_CONFIG.initialDelay).toBe(1000);
      expect(DEFAULT_RETRY_CONFIG.jitter).toBe(true);
    });

    it('should have default recovery config', () => {
      expect(DEFAULT_ERROR_RECOVERY_CONFIG.enableDeadLetterQueue).toBe(true);
      expect(DEFAULT_ERROR_RECOVERY_CONFIG.enableAutoRecovery).toBe(true);
      expect(DEFAULT_ERROR_RECOVERY_CONFIG.maxQueueSize).toBe(1000);
    });
  });
});

describe('ErrorRecoveryService Singleton', () => {
  it('should return the same instance', () => {
    const instance1 = ErrorRecoveryService.getInstance();
    const instance2 = ErrorRecoveryService.getInstance();
    expect(instance1).toBe(instance2);
  });
});
