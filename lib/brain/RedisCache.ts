/**
 * Redis Cache Service for Brain AI
 * Uses ioredis with camelCase helpers to match existing call sites.
 * Updated to support Redis Cloud TLS connections.
 */

import Redis from 'ioredis';
import { getRedisOptions, isRedisConfigured } from '@/lib/redis/connection';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export interface SessionCacheData {
  sessionId: string;
  userId: string;
  agentId?: string;
  data: any;
  updatedAt: string;
}

type RedisLike = Redis & {
  setEx: (key: string, ttl: number, value: string) => Promise<any>;
  zAdd: (key: string, entry: { score: number; value: string } | Array<{ score: number; value: string }>) => Promise<any>;
  zRemRangeByRank: (key: string, start: number, stop: number) => Promise<any>;
  zRemRangeByScore: (key: string, min: number, max: number) => Promise<any>;
  zRangeWithScores: (key: string, start: number, stop: number) => Promise<Array<{ value: string; score: number }>>;
  xAdd: (key: string, id: string, fields: Record<string, string>) => Promise<any>;
  xRange: (key: string, start: string, end: string, options?: { COUNT?: number }) => Promise<any>;
  xLen: (key: string) => Promise<number>;
  xDel: (key: string, ...ids: string[]) => Promise<number>;
  xGroupCreate: (key: string, group: string, id: string, options?: { MKSTREAM?: boolean }) => Promise<any>;
};

export class RedisCache {
  private static instance: RedisCache;
  private client: RedisLike | null = null;
  private isConnected = false;
  private errorLogged = false; // Prevent Redis error spam
  private readonly defaultTTL = 3600; // 1 hour
  private readonly embeddingCacheTTL = 86400; // 24 hours
  private readonly sessionCacheTTL = 7200; // 2 hours

  private constructor() {
    this.initialize();
  }

  public static getInstance(): RedisCache {
    if (!RedisCache.instance) {
      RedisCache.instance = new RedisCache();
    }
    return RedisCache.instance;
  }

  public getClient(): RedisLike | null {
    return this.client;
  }

  /**
   * Initialize Redis connection using ioredis.
   * Provides camelCase helpers to keep existing call sites intact.
   * Now supports TLS for Redis Cloud connections.
   */
  private async initialize(): Promise<void> {
    // Skip Redis initialization if not configured
    if (!isRedisConfigured()) {
      console.log('[RedisCache] No Redis configuration found. Running without cache.');
      this.client = null;
      this.isConnected = false;
      return;
    }

    try {
      // Use the unified Redis options with TLS support
      const options = getRedisOptions({
        lazyConnect: false,
        retryStrategy: () => null, // Don't retry - fail fast
      });

      console.log('[RedisCache] Connecting with TLS support...');
      const client = new Redis(options);

      const typedClient = client as unknown as RedisLike;

      // CamelCase adapters
      typedClient.setEx = (key: string, ttl: number, value: string) => client.setex(key, ttl, value);
      typedClient.zAdd = (key: string, entry: { score: number; value: string } | Array<{ score: number; value: string }>) => {
        const entries = Array.isArray(entry) ? entry : [entry];
        const args = entries.flatMap((e) => [e.score, e.value]);
        return client.zadd(key, ...args);
      };
      typedClient.zRemRangeByRank = (key: string, start: number, stop: number) => client.zremrangebyrank(key, start, stop);
      typedClient.zRemRangeByScore = (key: string, min: number, max: number) => client.zremrangebyscore(key, min, max);
      typedClient.zRangeWithScores = async (key: string, start: number, stop: number) => {
        const res = await client.zrange(key, start, stop, 'WITHSCORES');
        const out: Array<{ value: string; score: number }> = [];
        for (let i = 0; i < res.length; i += 2) {
          out.push({ value: res[i], score: Number(res[i + 1]) });
        }
        return out;
      };
      typedClient.xAdd = (key: string, id: string, fields: Record<string, string>) => {
        const args = Object.entries(fields).flat();
        return client.xadd(key, id, ...args);
      };
      typedClient.xRange = (key: string, start: string, end: string, options?: { COUNT?: number }) => {
        const args: any[] = [key, start, end];
        if (options?.COUNT) args.push('COUNT', options.COUNT);
        return client.xrange(...args);
      };
      typedClient.xLen = (key: string) => client.xlen(key);
      typedClient.xDel = (key: string, ...ids: string[]) => client.xdel(key, ...ids);
      typedClient.xGroupCreate = (key: string, group: string, id: string, options?: { MKSTREAM?: boolean }) => {
        const args: any[] = ['CREATE', key, group, id];
        if (options?.MKSTREAM) args.push('MKSTREAM');
        return client.xgroup(...args);
      };

      this.client = typedClient;

      this.client.on('error', (err) => {
        if (!this.errorLogged) {
          console.warn('[RedisCache] Redis error:', err?.message || err);
          this.errorLogged = true;
        }
        this.isConnected = false;
      });

      this.client.on('ready', () => {
        console.log('[RedisCache] Connected to Redis');
        this.isConnected = true;
        this.errorLogged = false; // Reset error flag on successful connection
      });

      this.client.on('end', () => {
        console.log('[RedisCache] Disconnected from Redis');
        this.isConnected = false;
      });

      await this.client.ping();
      console.log('[RedisCache] ƒo. Redis operational');
    } catch (error: any) {
      if (error.message && error.message.includes('NOAUTH')) {
        console.warn('[RedisCache] ƒsÿ‹÷?  Redis requires authentication. Running without cache. Set REDIS_PASSWORD in .env to enable Redis.');
      } else if (error.message && (error.message.includes('ECONNREFUSED') || error.message.includes('connect ECONNREFUSED') || error.message.includes('Connection timeout'))) {
        console.warn('[RedisCache] ƒsÿ‹÷?  Redis server not available. Running without cache.');
      } else {
        console.warn('[RedisCache] Failed to initialize Redis:', error.message);
      }
      if (this.client) {
        try {
          await this.client.quit();
        } catch {
          // ignore
        }
      }
      this.client = null;
      this.isConnected = false;
    }
  }

  public isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  public async cacheEmbedding(text: string, embedding: number[], tokens: number): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const key = `brain:embedding:${this.hashString(text)}`;
      const value = JSON.stringify({ embedding, tokens, text: text.slice(0, 100) });
      await this.client!.setEx(key, this.embeddingCacheTTL, value);
      return true;
    } catch (error) {
      console.error('[RedisCache] Failed to cache embedding:', error);
      return false;
    }
  }

  public async getCachedEmbedding(text: string): Promise<{ embedding: number[]; tokens: number } | null> {
    if (!this.isAvailable()) return null;
    try {
      const key = `brain:embedding:${this.hashString(text)}`;
      const cached = await this.client!.get(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        return { embedding: parsed.embedding, tokens: parsed.tokens };
      }
      return null;
    } catch (error) {
      console.error('[RedisCache] Failed to get cached embedding:', error);
      return null;
    }
  }

  public async cacheSession(sessionData: SessionCacheData): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const key = `brain:session:${sessionData.sessionId}`;
      const value = JSON.stringify(sessionData);
      await this.client!.setEx(key, this.sessionCacheTTL, value);
      const userKey = `brain:user:${sessionData.userId}:sessions`;
      await this.client!.sAdd(userKey, sessionData.sessionId);
      await this.client!.expire(userKey, this.sessionCacheTTL);
      return true;
    } catch (error) {
      console.error('[RedisCache] Failed to cache session:', error);
      return false;
    }
  }

  public async getCachedSession(sessionId: string): Promise<SessionCacheData | null> {
    if (!this.isAvailable()) return null;
    try {
      const key = `brain:session:${sessionId}`;
      const cached = await this.client!.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('[RedisCache] Failed to get cached session:', error);
      return null;
    }
  }

  public async getUserSessions(userId: string): Promise<string[]> {
    if (!this.isAvailable()) return [];
    try {
      const userKey = `brain:user:${userId}:sessions`;
      return await this.client!.sMembers(userKey);
    } catch (error) {
      console.error('[RedisCache] Failed to get user sessions:', error);
      return [];
    }
  }

  public async cacheQueryResult(queryHash: string, result: any, ttl?: number): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const key = `brain:query:${queryHash}`;
      const value = JSON.stringify(result);
      await this.client!.setEx(key, ttl || this.defaultTTL, value);
      return true;
    } catch (error) {
      console.error('[RedisCache] Failed to cache query result:', error);
      return false;
    }
  }

  public async getCachedQueryResult(queryHash: string): Promise<any | null> {
    if (!this.isAvailable()) return null;
    try {
      const key = `brain:query:${queryHash}`;
      const cached = await this.client!.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('[RedisCache] Failed to get cached query result:', error);
      return null;
    }
  }

  public async publishUpdate(channel: string, message: any): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      await this.client!.publish(channel, JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('[RedisCache] Failed to publish update:', error);
      return false;
    }
  }

  public async subscribe(channel: string, callback: (message: any) => void): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const subscriber = this.client!.duplicate() as RedisLike;
      await subscriber.connect();
      await subscriber.subscribe(channel, (message) => {
        try {
          callback(JSON.parse(message));
        } catch (error) {
          console.error('[RedisCache] Failed to parse subscription message:', error);
        }
      });
      return true;
    } catch (error) {
      console.error('[RedisCache] Failed to subscribe:', error);
      return false;
    }
  }

  public async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const prefixedKey = options.prefix ? `${options.prefix}:${key}` : `brain:${key}`;
      const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
      const ttl = options.ttl || this.defaultTTL;
      await this.client!.setEx(prefixedKey, ttl, valueStr);
      return true;
    } catch (error) {
      console.error('[RedisCache] Failed to set value:', error);
      return false;
    }
  }

  public async get(key: string, options: CacheOptions = {}): Promise<any | null> {
    if (!this.isAvailable()) return null;
    try {
      const prefixedKey = options.prefix ? `${options.prefix}:${key}` : `brain:${key}`;
      const cached = await this.client!.get(prefixedKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          return cached;
        }
      }
      return null;
    } catch (error) {
      console.error('[RedisCache] Failed to get value:', error);
      return null;
    }
  }

  public async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const prefixedKey = options.prefix ? `${options.prefix}:${key}` : `brain:${key}`;
      await this.client!.del(prefixedKey);
      return true;
    } catch (error) {
      console.error('[RedisCache] Failed to delete value:', error);
      return false;
    }
  }

  public async clearAll(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const keys = await this.client!.keys('brain:*');
      if (keys.length > 0) {
        await this.client!.del(keys);
      }
      return true;
    } catch (error) {
      console.error('[RedisCache] Failed to clear cache:', error);
      return false;
    }
  }

  public async getStats(): Promise<{ connected: boolean; keys: number; memory: string }> {
    if (!this.isAvailable()) return { connected: false, keys: 0, memory: '0' };
    try {
      const keys = await this.client!.keys('brain:*');
      const info = await this.client!.info('memory');
      const memoryMatch = info.match(/used_memory_human:(\S+)/);
      const memory = memoryMatch ? memoryMatch[1] : '0';
      return { connected: true, keys: keys.length, memory };
    } catch (error) {
      console.error('[RedisCache] Failed to get stats:', error);
      return { connected: false, keys: 0, memory: '0' };
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

export const redisCache = RedisCache.getInstance();
