/**
 * Rate Limiting Service
 *
 * Implements sliding window rate limiting for AI requests using Redis
 * Falls back to in-memory storage if Redis is unavailable
 */

import Redis from 'ioredis';

// Redis is optional - only initialize if configured
let redis: Redis | null = null;
let useMemoryFallback = true;

const redisUrl = process.env.REDIS_URL?.replace(/^['"]|['"]$/g, '').trim();
const redisHost = process.env.REDIS_HOST?.replace(/^['"]|['"]$/g, '').trim();
const isRedisConfigured = !!(redisUrl && redisUrl !== '') || !!(redisHost && redisHost !== '');

if (isRedisConfigured) {
  try {
    // Prefer REDIS_URL for full connection string with username support (Redis Cloud ACL)
    if (redisUrl && redisUrl !== '') {
      redis = new Redis(redisUrl, {
        retryStrategy: () => null,
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
        enableOfflineQueue: false,
        enableReadyCheck: false,
        lazyConnect: true,
      });
    } else {
      // Fallback to individual params
      const redisPassword = process.env.REDIS_PASSWORD?.replace(/^['"]|['"]$/g, '');
      const host = (redisHost || 'localhost').replace(/^['"]|['"]$/g, '');
      const redisPort = parseInt((process.env.REDIS_PORT || '6379').replace(/^['"]|['"]$/g, ''));

      redis = new Redis({
        host,
        port: redisPort,
        password: redisPassword,
        username: 'default', // Required for Redis Cloud ACL
        retryStrategy: () => null,
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
        enableOfflineQueue: false,
        enableReadyCheck: false,
        lazyConnect: true,
      });
    }

    redis.on('error', () => {
      useMemoryFallback = true;
    });

    redis.on('connect', () => {
      useMemoryFallback = false;
    });

    redis.connect().catch(() => {
      redis = null;
      useMemoryFallback = true;
    });
  } catch {
    useMemoryFallback = true;
  }
}

// In-memory fallback storage
const memoryStore: Map<string, Array<{ timestamp: number; id: string }>> = new Map();

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
  window: 'minute' | 'hour' | 'day';
  retryAfter?: number; // seconds
}

export class RateLimitService {
  private static instance: RateLimitService;

  private constructor() { }

  static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  /**
   * Check if user can make a request (sliding window algorithm)
   */
  async checkRateLimit(
    userId: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();

    // Check minute limit (most restrictive, check first)
    const minuteResult = await this.checkWindow(
      userId,
      'minute',
      60,
      config.maxRequestsPerMinute,
      now
    );
    if (!minuteResult.allowed) return minuteResult;

    // Check hour limit
    const hourResult = await this.checkWindow(
      userId,
      'hour',
      3600,
      config.maxRequestsPerHour,
      now
    );
    if (!hourResult.allowed) return hourResult;

    // Check day limit
    const dayResult = await this.checkWindow(
      userId,
      'day',
      86400,
      config.maxRequestsPerDay,
      now
    );
    if (!dayResult.allowed) return dayResult;

    // All checks passed - record the request
    await this.recordRequest(userId, now);

    return minuteResult; // Return the most restrictive limit
  }

  /**
   * Check a specific time window using sliding window algorithm
   */
  private async checkWindow(
    userId: string,
    window: 'minute' | 'hour' | 'day',
    windowSeconds: number,
    maxRequests: number,
    now: number
  ): Promise<RateLimitResult> {
    const key = `ratelimit:${userId}:${window}`;
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    try {
      // Use memory fallback if Redis is unavailable
      if (useMemoryFallback || !redis) {
        return this.checkWindowMemory(key, windowStart, now, windowMs, maxRequests, window);
      }

      // Remove old entries outside the window
      await redis.zremrangebyscore(key, '-inf', windowStart);

      // Count requests in current window
      const count = await redis.zcard(key);

      const remaining = Math.max(0, maxRequests - count);
      const resetAt = new Date(now + windowMs);

      if (count >= maxRequests) {
        // Get oldest request in window to calculate retry time
        const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
        const oldestTimestamp = oldest.length > 1 ? parseInt(oldest[1]) : now;
        const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);

        return {
          allowed: false,
          remaining: 0,
          resetAt,
          limit: maxRequests,
          window,
          retryAfter: Math.max(1, retryAfter),
        };
      }

      return {
        allowed: true,
        remaining,
        resetAt,
        limit: maxRequests,
        window,
      };
    } catch (error) {
      console.error('[RATE_LIMIT_CHECK] Redis error, falling back to memory:', error);
      // Fallback to memory on Redis errors
      return this.checkWindowMemory(key, windowStart, now, windowMs, maxRequests, window);
    }
  }

  /**
   * Memory-based fallback for checkWindow
   */
  private checkWindowMemory(
    key: string,
    windowStart: number,
    now: number,
    windowMs: number,
    maxRequests: number,
    window: 'minute' | 'hour' | 'day'
  ): RateLimitResult {
    // Get or create entry list
    let entries = memoryStore.get(key) || [];

    // Remove old entries
    entries = entries.filter(e => e.timestamp > windowStart);
    memoryStore.set(key, entries);

    const count = entries.length;
    const remaining = Math.max(0, maxRequests - count);
    const resetAt = new Date(now + windowMs);

    if (count >= maxRequests) {
      const oldestTimestamp = entries[0]?.timestamp || now;
      const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        limit: maxRequests,
        window,
        retryAfter: Math.max(1, retryAfter),
      };
    }

    return {
      allowed: true,
      remaining,
      resetAt,
      limit: maxRequests,
      window,
    };
  }

  /**
   * Record a request in all time windows
   */
  private async recordRequest(userId: string, timestamp: number): Promise<void> {
    const windows = ['minute', 'hour', 'day'] as const;
    const ttls = { minute: 120, hour: 7200, day: 172800 }; // 2x window for safety

    try {
      // Use memory fallback if Redis is unavailable
      if (useMemoryFallback || !redis) {
        for (const window of windows) {
          const key = `ratelimit:${userId}:${window}`;
          const entries = memoryStore.get(key) || [];
          entries.push({ timestamp, id: `${timestamp}-${Math.random()}` });
          memoryStore.set(key, entries);
        }
        return;
      }

      const pipeline = redis.pipeline();

      for (const window of windows) {
        const key = `ratelimit:${userId}:${window}`;
        const score = timestamp;
        const member = `${timestamp}-${Math.random()}`; // Unique member

        pipeline.zadd(key, score, member);
        pipeline.expire(key, ttls[window]);
      }

      await pipeline.exec();
    } catch (error) {
      console.error('[RATE_LIMIT_RECORD]', error);
      // Continue even if recording fails
    }
  }

  /**
   * Get current rate limit status for a user
   */
  async getRateLimitStatus(
    userId: string,
    config: RateLimitConfig
  ): Promise<{
    minute: RateLimitResult;
    hour: RateLimitResult;
    day: RateLimitResult;
  }> {
    const now = Date.now();

    const [minute, hour, day] = await Promise.all([
      this.checkWindow(userId, 'minute', 60, config.maxRequestsPerMinute, now),
      this.checkWindow(userId, 'hour', 3600, config.maxRequestsPerHour, now),
      this.checkWindow(userId, 'day', 86400, config.maxRequestsPerDay, now),
    ]);

    return { minute, hour, day };
  }

  /**
   * Reset rate limits for a user (admin function)
   */
  async resetRateLimits(userId: string): Promise<void> {
    try {
      const keys = [
        `ratelimit:${userId}:minute`,
        `ratelimit:${userId}:hour`,
        `ratelimit:${userId}:day`,
      ];

      await redis.del(...keys);
      console.log(`[RATE_LIMIT] Reset limits for user: ${userId}`);
    } catch (error) {
      console.error('[RATE_LIMIT_RESET]', error);
      throw new Error('Failed to reset rate limits');
    }
  }

  /**
   * Get default rate limit config based on user tier
   */
  getDefaultConfig(tier: 'free' | 'pro' | 'enterprise' = 'free'): RateLimitConfig {
    const configs: Record<string, RateLimitConfig> = {
      free: {
        maxRequestsPerMinute: 5,
        maxRequestsPerHour: 50,
        maxRequestsPerDay: 200,
      },
      pro: {
        maxRequestsPerMinute: 20,
        maxRequestsPerHour: 200,
        maxRequestsPerDay: 1000,
      },
      enterprise: {
        maxRequestsPerMinute: 100,
        maxRequestsPerHour: 1000,
        maxRequestsPerDay: 10000,
      },
    };

    return configs[tier] || configs.free;
  }
}

export const rateLimitService = RateLimitService.getInstance();
