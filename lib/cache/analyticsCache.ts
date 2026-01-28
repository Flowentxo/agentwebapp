/**
 * ANALYTICS CACHE SERVICE
 *
 * Redis-based caching for expensive analytics queries.
 * Reduces database load and improves response times.
 */

import Redis from 'ioredis';

// =====================================================
// Redis Client (Singleton)
// =====================================================

let redis: Redis | null = null;
let redisDisabled = false;

function getRedisClient(): Redis | null {
  const redisUrl = process.env.REDIS_URL?.replace(/^['"]|['"]$/g, '');
  const hasRedisConfig = redisUrl && redisUrl !== '' && redisUrl !== 'redis://localhost:6379';

  if (!hasRedisConfig || redisDisabled) {
    return null;
  }

  if (!redis) {
    redis = new Redis(redisUrl, {
      password: process.env.REDIS_PASSWORD?.replace(/^['"]|['"]$/g, ''),
      maxRetriesPerRequest: 2,
      retryStrategy(times) {
        if (times > 2) {
          redisDisabled = true;
          return null;
        }
        return Math.min(times * 50, 2000);
      },
    });

    redis.on('error', (error) => {
      if (error.message?.includes('NOAUTH') || error.message?.includes('ECONNREFUSED')) {
        redisDisabled = true;
      }
    });
  }

  return redis;
}

// =====================================================
// Cache Configuration
// =====================================================

export const CACHE_TTL = {
  // Short-lived (real-time data)
  REAL_TIME: 30,              // 30 seconds

  // Medium-lived (dashboards)
  DASHBOARD: 2 * 60,          // 2 minutes
  METRICS: 5 * 60,            // 5 minutes

  // Long-lived (analytics)
  ANALYTICS: 15 * 60,         // 15 minutes
  TRENDS: 30 * 60,            // 30 minutes
  REPORTS: 60 * 60,           // 1 hour

  // Very long-lived (aggregates)
  DAILY_AGGREGATES: 6 * 60 * 60,   // 6 hours
  MONTHLY_AGGREGATES: 24 * 60 * 60, // 24 hours
} as const;

export const CACHE_KEYS = {
  // System Overview
  systemOverview: () => 'analytics:system:overview',

  // Model Stats
  modelStats: (days: number) => `analytics:models:stats:${days}d`,
  modelDistribution: (days: number) => `analytics:models:distribution:${days}d`,

  // Agent Stats
  agentStats: (days: number) => `analytics:agents:stats:${days}d`,
  agentUsage: (agentId: string, days: number) => `analytics:agents:${agentId}:usage:${days}d`,

  // Cost Analytics
  costTrends: (days: number) => `analytics:cost:trends:${days}d`,
  costByModel: (days: number) => `analytics:cost:by-model:${days}d`,
  dailyCost: (date: string) => `analytics:cost:daily:${date}`,

  // User Stats
  userActivity: (days: number) => `analytics:users:activity:${days}d`,
  activeUsers: (hours: number) => `analytics:users:active:${hours}h`,

  // Prompt Analytics
  promptAnalytics: () => 'analytics:prompts:overview',
  promptUsage: (promptSlug: string, days: number) => `analytics:prompts:${promptSlug}:usage:${days}d`,

  // Quality Metrics
  qualityMetrics: (days: number) => `analytics:quality:metrics:${days}d`,
  qualityByModel: (days: number) => `analytics:quality:by-model:${days}d`,
  qualityByPrompt: (days: number) => `analytics:quality:by-prompt:${days}d`,
  feedbackTrend: (days: number) => `analytics:quality:feedback-trend:${days}d`,

  // Trace Stats
  traceStats: (hours: number) => `analytics:traces:stats:${hours}h`,
} as const;

// =====================================================
// Cache Operations
// =====================================================

/**
 * Get cached value
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const cached = await client.get(key);
    if (!cached) return null;

    return JSON.parse(cached) as T;
  } catch (error) {
    console.error('[ANALYTICS_CACHE] Get error:', error);
    return null;
  }
}

/**
 * Set cached value
 */
export async function setInCache<T>(
  key: string,
  value: T,
  ttlSeconds: number = CACHE_TTL.METRICS
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('[ANALYTICS_CACHE] Set error:', error);
  }
}

/**
 * Delete cached value
 */
export async function deleteFromCache(key: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.del(key);
  } catch (error) {
    console.error('[ANALYTICS_CACHE] Delete error:', error);
  }
}

/**
 * Delete multiple keys by pattern
 */
export async function deleteByPattern(pattern: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (error) {
    console.error('[ANALYTICS_CACHE] Delete pattern error:', error);
  }
}

/**
 * Invalidate all analytics cache
 */
export async function invalidateAnalyticsCache(): Promise<void> {
  await deleteByPattern('analytics:*');
}

/**
 * Invalidate specific analytics sections
 */
export async function invalidateCacheSection(section: 'models' | 'agents' | 'cost' | 'users' | 'prompts' | 'quality' | 'traces'): Promise<void> {
  await deleteByPattern(`analytics:${section}:*`);
}

// =====================================================
// Cache-Through Pattern
// =====================================================

export interface CacheOptions {
  ttl?: number;
  forceRefresh?: boolean;
}

/**
 * Get value from cache or compute and cache
 *
 * Usage:
 * ```ts
 * const data = await cachedQuery(
 *   CACHE_KEYS.modelStats(30),
 *   () => computeModelStats(30),
 *   { ttl: CACHE_TTL.ANALYTICS }
 * );
 * ```
 */
export async function cachedQuery<T>(
  key: string,
  compute: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = CACHE_TTL.METRICS, forceRefresh = false } = options;

  // Try cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = await getFromCache<T>(key);
    if (cached !== null) {
      return cached;
    }
  }

  // Compute value
  const value = await compute();

  // Cache the result
  await setInCache(key, value, ttl);

  return value;
}

/**
 * Batch get multiple cached values
 */
export async function batchGetFromCache<T>(keys: string[]): Promise<Map<string, T | null>> {
  const client = getRedisClient();
  const results = new Map<string, T | null>();

  if (!client || keys.length === 0) {
    keys.forEach(key => results.set(key, null));
    return results;
  }

  try {
    const values = await client.mget(...keys);

    keys.forEach((key, index) => {
      const value = values[index];
      results.set(key, value ? JSON.parse(value) as T : null);
    });
  } catch (error) {
    console.error('[ANALYTICS_CACHE] Batch get error:', error);
    keys.forEach(key => results.set(key, null));
  }

  return results;
}

// =====================================================
// Cache Stats (for monitoring)
// =====================================================

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  keyCount: number;
  memoryUsage: string;
}

let cacheHits = 0;
let cacheMisses = 0;

export function recordCacheHit(): void {
  cacheHits++;
}

export function recordCacheMiss(): void {
  cacheMisses++;
}

export async function getCacheStats(): Promise<CacheStats | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const info = await client.info('memory');
    const memoryMatch = info.match(/used_memory_human:(\S+)/);
    const memoryUsage = memoryMatch ? memoryMatch[1] : 'unknown';

    const keys = await client.keys('analytics:*');
    const keyCount = keys.length;

    const total = cacheHits + cacheMisses;
    const hitRate = total > 0 ? (cacheHits / total) * 100 : 0;

    return {
      hits: cacheHits,
      misses: cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100,
      keyCount,
      memoryUsage,
    };
  } catch (error) {
    console.error('[ANALYTICS_CACHE] Stats error:', error);
    return null;
  }
}

// =====================================================
// Cleanup
// =====================================================

export async function closeAnalyticsCacheClient(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
