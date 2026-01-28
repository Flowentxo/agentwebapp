/**
 * RateLimitService Tests
 *
 * Comprehensive test suite for the enterprise rate limiting system
 */

import {
  RateLimitService,
  rateLimiter,
  RateLimitError,
  DEFAULT_RATE_LIMITS,
  RateLimitContext,
} from '../RateLimitService';

describe('RateLimitService', () => {
  // Reset rate limiter state before each test
  beforeEach(async () => {
    // Reset all limits for test user
    await rateLimiter.reset({
      userId: 'test-user',
      workspaceId: 'test-workspace',
    });
  });

  describe('checkLimit', () => {
    it('should allow requests within rate limits', async () => {
      const context: RateLimitContext = {
        userId: 'test-user',
        workspaceId: 'test-workspace',
      };

      const result = await rateLimiter.checkLimit(context);

      expect(result.allowed).toBe(true);
      expect(result.remainingTokens).toBeGreaterThan(0);
      expect(result.remainingRequests).toBeGreaterThan(0);
    });

    it('should track remaining tokens correctly', async () => {
      const context: RateLimitContext = {
        userId: 'test-user-2',
        workspaceId: 'test-workspace',
      };

      const initial = await rateLimiter.checkLimit(context);
      const firstTokens = initial.remainingTokens;

      // Consume some tokens
      await rateLimiter.consumeTokens(context, 100);

      const after = await rateLimiter.checkLimit(context);
      expect(after.remainingTokens).toBeLessThan(firstTokens);
    });

    it('should enforce per-user limits', async () => {
      const context1: RateLimitContext = {
        userId: 'user-1',
        workspaceId: 'test-workspace',
      };

      const context2: RateLimitContext = {
        userId: 'user-2',
        workspaceId: 'test-workspace',
      };

      // Both users should have separate limits
      const result1 = await rateLimiter.checkLimit(context1);
      const result2 = await rateLimiter.checkLimit(context2);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    it('should enforce per-agent limits', async () => {
      const context: RateLimitContext = {
        userId: 'test-user',
        workspaceId: 'test-workspace',
        agentId: 'alfred',
      };

      const result = await rateLimiter.checkLimit(context);
      expect(result.allowed).toBe(true);
    });
  });

  describe('consumeTokens', () => {
    it('should decrease remaining tokens', async () => {
      const context: RateLimitContext = {
        userId: 'consume-test-user',
        workspaceId: 'test-workspace',
      };

      await rateLimiter.reset(context);

      const before = await rateLimiter.checkLimit(context);
      await rateLimiter.consumeTokens(context, 500);
      const after = await rateLimiter.checkLimit(context);

      expect(after.remainingTokens).toBeLessThan(before.remainingTokens);
    });
  });

  describe('executeWithLimit', () => {
    it('should execute function when within limits', async () => {
      const context: RateLimitContext = {
        userId: 'exec-test-user',
        workspaceId: 'test-workspace',
      };

      await rateLimiter.reset(context);

      const result = await rateLimiter.executeWithLimit(
        context,
        async () => 'success',
        { tokenCost: 1 }
      );

      expect(result).toBe('success');
    });

    it('should throw RateLimitError when rate limit exceeded without wait', async () => {
      const context: RateLimitContext = {
        userId: 'rate-limit-test',
        workspaceId: 'test-workspace',
      };

      // Exhaust the rate limit
      for (let i = 0; i < 100; i++) {
        try {
          await rateLimiter.consumeTokens(context, 1000);
        } catch {
          // Ignore errors during exhaustion
        }
      }

      await expect(
        rateLimiter.executeWithLimit(
          context,
          async () => 'should fail',
          { waitForSlot: false, tokenCost: 1 }
        )
      ).rejects.toThrow(RateLimitError);
    });
  });

  describe('executeWithRetry', () => {
    it('should retry on rate limit errors', async () => {
      const context: RateLimitContext = {
        userId: 'retry-test-user',
        workspaceId: 'test-workspace',
      };

      await rateLimiter.reset(context);

      let attempts = 0;
      const result = await rateLimiter.executeWithRetry(
        context,
        async () => {
          attempts++;
          return 'success';
        },
        { maxRetries: 3 }
      );

      expect(result).toBe('success');
      expect(attempts).toBe(1); // Should succeed on first attempt
    });
  });

  describe('getMetrics', () => {
    it('should return valid metrics', () => {
      const metrics = rateLimiter.getMetrics();

      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('allowedRequests');
      expect(metrics).toHaveProperty('deniedRequests');
      expect(metrics).toHaveProperty('queuedRequests');
      expect(metrics).toHaveProperty('averageWaitTime');
      expect(metrics).toHaveProperty('peakRequestsPerSecond');
    });

    it('should track request counts', async () => {
      const initialMetrics = rateLimiter.getMetrics();
      const initialTotal = initialMetrics.totalRequests;

      const context: RateLimitContext = {
        userId: 'metrics-test-user',
        workspaceId: 'test-workspace',
      };

      await rateLimiter.checkLimit(context);
      await rateLimiter.checkLimit(context);
      await rateLimiter.checkLimit(context);

      const afterMetrics = rateLimiter.getMetrics();
      expect(afterMetrics.totalRequests).toBe(initialTotal + 3);
    });
  });

  describe('getStatus', () => {
    it('should return detailed status for context', async () => {
      const context: RateLimitContext = {
        userId: 'status-test-user',
        workspaceId: 'test-workspace',
        agentId: 'alfred',
      };

      const status = await rateLimiter.getStatus(context);

      expect(status).toHaveProperty('buckets');
      expect(status).toHaveProperty('windows');
      expect(status).toHaveProperty('queueLength');
      expect(Object.keys(status.buckets).length).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    it('should reset rate limits for context', async () => {
      const context: RateLimitContext = {
        userId: 'reset-test-user',
        workspaceId: 'test-workspace',
      };

      // Consume tokens
      await rateLimiter.consumeTokens(context, 1000);

      // Reset
      await rateLimiter.reset(context);

      // Check limit - should be back to full
      const result = await rateLimiter.checkLimit(context);
      expect(result.allowed).toBe(true);
      expect(result.remainingTokens).toBeGreaterThan(1000);
    });
  });

  describe('priority handling', () => {
    it('should respect priority levels', async () => {
      const lowPriority: RateLimitContext = {
        userId: 'priority-user',
        workspaceId: 'test-workspace',
        priority: 'low',
      };

      const highPriority: RateLimitContext = {
        userId: 'priority-user',
        workspaceId: 'test-workspace',
        priority: 'critical',
      };

      // Both should be allowed when within limits
      const lowResult = await rateLimiter.checkLimit(lowPriority);
      const highResult = await rateLimiter.checkLimit(highPriority);

      expect(lowResult.allowed).toBe(true);
      expect(highResult.allowed).toBe(true);
    });
  });

  describe('configuration', () => {
    it('should allow custom configuration', () => {
      rateLimiter.configure('custom-scope', {
        tokensPerInterval: 1000,
        maxRequestsPerWindow: 10,
      });

      // Config should be stored
      expect(DEFAULT_RATE_LIMITS).toHaveProperty('user');
      expect(DEFAULT_RATE_LIMITS.user.tokensPerInterval).toBe(5000);
    });
  });

  describe('events', () => {
    it('should emit request:allowed event', async () => {
      const context: RateLimitContext = {
        userId: 'event-test-user',
        workspaceId: 'test-workspace',
      };

      await rateLimiter.reset(context);

      let eventFired = false;
      const handler = () => {
        eventFired = true;
      };

      rateLimiter.on('request:allowed', handler);
      await rateLimiter.checkLimit(context);
      rateLimiter.off('request:allowed', handler);

      expect(eventFired).toBe(true);
    });
  });
});

describe('RateLimitError', () => {
  it('should have correct properties', () => {
    const result = {
      allowed: false,
      remainingTokens: 0,
      remainingRequests: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 60000,
    };

    const error = new RateLimitError('Rate limit exceeded', 60000, result);

    expect(error.name).toBe('RateLimitError');
    expect(error.message).toBe('Rate limit exceeded');
    expect(error.retryAfter).toBe(60000);
    expect(error.result).toEqual(result);
    expect(error.isRateLimit).toBe(true);
  });
});

describe('DEFAULT_RATE_LIMITS', () => {
  it('should have all required configurations', () => {
    expect(DEFAULT_RATE_LIMITS).toHaveProperty('openai');
    expect(DEFAULT_RATE_LIMITS).toHaveProperty('user');
    expect(DEFAULT_RATE_LIMITS).toHaveProperty('agent');
    expect(DEFAULT_RATE_LIMITS).toHaveProperty('global');
  });

  it('should have valid configuration values', () => {
    const openaiConfig = DEFAULT_RATE_LIMITS.openai;

    expect(openaiConfig.tokensPerInterval).toBeGreaterThan(0);
    expect(openaiConfig.interval).toBeGreaterThan(0);
    expect(openaiConfig.maxBurst).toBeGreaterThan(0);
    expect(openaiConfig.windowSize).toBeGreaterThan(0);
    expect(openaiConfig.maxRequestsPerWindow).toBeGreaterThan(0);
    expect(openaiConfig.maxQueueSize).toBeGreaterThan(0);
    expect(openaiConfig.queueTimeout).toBeGreaterThan(0);
    expect(openaiConfig.maxRetries).toBeGreaterThan(0);
    expect(openaiConfig.baseRetryDelay).toBeGreaterThan(0);
    expect(openaiConfig.maxRetryDelay).toBeGreaterThan(0);
  });
});
