/**
 * Rate Limiting Service
 * Redis-based Sliding Window Rate Limiter
 * Supports per API Key, User, Agent, and IP rate limiting
 */

import { redisCache } from '@/lib/brain/RedisCache';
import { getDb } from '@/lib/db';
import { brainRateLimitLogs, type NewBrainRateLimitLog } from '@/lib/db/schema-brain-security';
import { lt, gte, lte, and } from 'drizzle-orm';

export interface RateLimitConfig {
  identifier: string; // API Key / User ID / IP Address
  identifierType: 'api_key' | 'user' | 'agent' | 'ip';
  limit: number; // Max requests
  window: number; // Window in seconds (60 = 1 minute, 3600 = 1 hour)
  endpoint?: string;
  method?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // Seconds until next allowed request
}

export interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  blockRate: number;
  topBlockedIdentifiers: Array<{ identifier: string; count: number }>;
}

export class RateLimitService {
  private static instance: RateLimitService;
  private db = getDb();

  // Default limits
  private defaultLimits = {
    api_key: { limit: 100, window: 60 }, // 100 req/min
    user: { limit: 200, window: 60 }, // 200 req/min
    agent: { limit: 500, window: 60 }, // 500 req/min
    ip: { limit: 1000, window: 60 }, // 1000 req/min
  };

  private constructor() {}

  public static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  /**
   * Check rate limit using Sliding Window algorithm
   * Algorithm: https://en.wikipedia.org/wiki/Rate_limiting#Sliding_window
   */
  public async checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
    const { identifier, identifierType, limit, window, endpoint, method } = config;

    // Redis key
    const key = this.getRedisKey(identifier, identifierType, endpoint);

    try {
      // Get current timestamp (seconds)
      const now = Math.floor(Date.now() / 1000);
      const windowStart = now - window;

      // Sliding window: Remove old entries, count current, add new
      const pipeline = await redisCache.getClient();
      if (!pipeline) {
        // Redis unavailable, allow by default (fail open)
        console.warn('[RateLimitService] Redis unavailable, allowing request');
        return {
          allowed: true,
          limit,
          remaining: limit - 1,
          resetAt: new Date((now + window) * 1000),
        };
      }

      // Execute sliding window commands
      // 1. Remove entries older than window
      await pipeline.zRemRangeByScore(key, 0, windowStart);

      // 2. Count current entries in window
      const count = await pipeline.zCard(key);

      // 3. Check if under limit
      if (count >= limit) {
        // Rate limit exceeded
        const oldestEntry = await pipeline.zRangeWithScores(key, 0, 0);
        const resetAt = oldestEntry && oldestEntry.length > 0
          ? new Date((oldestEntry[0].score + window) * 1000)
          : new Date((now + window) * 1000);

        const retryAfter = Math.ceil((resetAt.getTime() - Date.now()) / 1000);

        // Log block
        this.logRateLimitHit(config, count, true).catch(err =>
          console.error('[RateLimitService] Log error:', err)
        );

        return {
          allowed: false,
          limit,
          remaining: 0,
          resetAt,
          retryAfter,
        };
      }

      // 4. Add current request to window
      const requestId = `${now}:${Math.random().toString(36).substring(7)}`;
      await pipeline.zAdd(key, { score: now, value: requestId });

      // 5. Set expiration on key (window + 10s buffer)
      await pipeline.expire(key, window + 10);

      // Calculate remaining
      const remaining = Math.max(0, limit - (count + 1));
      const resetAt = new Date((now + window) * 1000);

      // Log successful request
      this.logRateLimitHit(config, count + 1, false).catch(err =>
        console.error('[RateLimitService] Log error:', err)
      );

      return {
        allowed: true,
        limit,
        remaining,
        resetAt,
      };
    } catch (error) {
      console.error('[RateLimitService] Check error:', error);
      // Fail open: allow request if rate limiter fails
      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        resetAt: new Date((Math.floor(Date.now() / 1000) + window) * 1000),
      };
    }
  }

  /**
   * Check multiple rate limits (e.g., per API key + per IP)
   * Returns most restrictive result
   */
  public async checkMultipleRateLimits(configs: RateLimitConfig[]): Promise<RateLimitResult> {
    const results = await Promise.all(configs.map(config => this.checkRateLimit(config)));

    // Find most restrictive (first blocked or least remaining)
    const blocked = results.find(r => !r.allowed);
    if (blocked) return blocked;

    // All allowed, return most restrictive
    return results.reduce((prev, current) =>
      current.remaining < prev.remaining ? current : prev
    );
  }

  /**
   * Get default rate limit for identifier type
   */
  public getDefaultLimit(identifierType: RateLimitConfig['identifierType']): { limit: number; window: number } {
    return this.defaultLimits[identifierType] || this.defaultLimits.ip;
  }

  /**
   * Reset rate limit for identifier (admin function)
   */
  public async resetRateLimit(
    identifier: string,
    identifierType: RateLimitConfig['identifierType'],
    endpoint?: string
  ): Promise<boolean> {
    const key = this.getRedisKey(identifier, identifierType, endpoint);

    try {
      const client = await redisCache.getClient();
      if (!client) return false;

      await client.del(key);
      console.log(`[RateLimitService] Reset rate limit for ${identifier}`);
      return true;
    } catch (error) {
      console.error('[RateLimitService] Reset error:', error);
      return false;
    }
  }

  /**
   * Get current rate limit status (for debugging)
   */
  public async getRateLimitStatus(
    identifier: string,
    identifierType: RateLimitConfig['identifierType'],
    endpoint?: string
  ): Promise<{ count: number; oldestRequest?: Date }> {
    const key = this.getRedisKey(identifier, identifierType, endpoint);

    try {
      const client = await redisCache.getClient();
      if (!client) return { count: 0 };

      const count = await client.zCard(key);
      const oldest = await client.zRangeWithScores(key, 0, 0);

      return {
        count,
        oldestRequest: oldest && oldest.length > 0
          ? new Date(oldest[0].score * 1000)
          : undefined,
      };
    } catch (error) {
      console.error('[RateLimitService] Status error:', error);
      return { count: 0 };
    }
  }

  /**
   * Get rate limit statistics
   */
  public async getStats(timeRange: { start: Date; end: Date }): Promise<RateLimitStats> {
    try {
      // Query rate limit logs
      const logs = await this.db
        .select()
        .from(brainRateLimitLogs)
        .where(
          and(
            gte(brainRateLimitLogs.createdAt, timeRange.start),
            lte(brainRateLimitLogs.createdAt, timeRange.end)
          )
        );

      const totalRequests = logs.length;
      const blockedRequests = logs.filter(log => log.wasBlocked).length;
      const blockRate = totalRequests > 0 ? blockedRequests / totalRequests : 0;

      // Top blocked identifiers
      const blockedCounts = new Map<string, number>();
      logs.filter(log => log.wasBlocked).forEach(log => {
        const count = blockedCounts.get(log.identifier) || 0;
        blockedCounts.set(log.identifier, count + 1);
      });

      const topBlockedIdentifiers = Array.from(blockedCounts.entries())
        .map(([identifier, count]) => ({ identifier, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalRequests,
        blockedRequests,
        blockRate,
        topBlockedIdentifiers,
      };
    } catch (error) {
      console.error('[RateLimitService] Stats error:', error);
      return {
        totalRequests: 0,
        blockedRequests: 0,
        blockRate: 0,
        topBlockedIdentifiers: [],
      };
    }
  }

  /**
   * Cleanup old rate limit logs (keep last 30 days)
   */
  public async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deleted = await this.db
        .delete(brainRateLimitLogs)
        .where(lt(brainRateLimitLogs.createdAt, cutoffDate));

      console.log(`[RateLimitService] Cleaned up ${deleted.rowCount || 0} old rate limit logs`);
      return deleted.rowCount || 0;
    } catch (error) {
      console.error('[RateLimitService] Cleanup error:', error);
      return 0;
    }
  }

  /**
   * Generate Redis key for rate limit
   */
  private getRedisKey(
    identifier: string,
    identifierType: string,
    endpoint?: string
  ): string {
    const base = `brain:ratelimit:${identifierType}:${identifier}`;
    return endpoint ? `${base}:${endpoint}` : base;
  }

  /**
   * Log rate limit hit (async, non-blocking)
   */
  private async logRateLimitHit(
    config: RateLimitConfig,
    currentCount: number,
    wasBlocked: boolean
  ): Promise<void> {
    try {
      const logEntry: NewBrainRateLimitLog = {
        identifier: config.identifier,
        identifierType: config.identifierType,
        endpoint: config.endpoint || 'unknown',
        method: config.method || 'unknown',
        limitType: config.window === 60 ? 'minute' : config.window === 3600 ? 'hour' : 'day',
        limitValue: config.limit,
        currentCount,
        wasBlocked,
      };

      await this.db.insert(brainRateLimitLogs).values(logEntry);
    } catch (error) {
      // Non-critical, don't throw
      console.error('[RateLimitService] Log error:', error);
    }
  }
}

export const rateLimitService = RateLimitService.getInstance();
