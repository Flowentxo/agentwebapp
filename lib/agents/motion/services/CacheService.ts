/**
 * CacheService - Enterprise Caching System for Motion Agents
 *
 * Features:
 * - Multi-tier caching (Memory -> Redis -> Database)
 * - LRU eviction strategy
 * - TTL-based expiration
 * - Cache invalidation patterns
 * - Distributed cache support (Redis)
 * - Cache warming and preloading
 * - Statistics and monitoring
 * - Compression for large values
 * - Tag-based invalidation
 * - Cache-aside pattern implementation
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface CacheConfig {
  // Memory cache settings
  maxMemoryItems: number;
  maxMemorySize: number; // in bytes

  // TTL settings (in milliseconds)
  defaultTTL: number;
  maxTTL: number;

  // Compression settings
  compressionThreshold: number; // Compress values larger than this (bytes)
  enableCompression: boolean;

  // Distributed cache settings
  redisUrl?: string;
  redisPrefix: string;

  // Eviction settings
  evictionPolicy: 'lru' | 'lfu' | 'fifo';
  evictionBatchSize: number;
}

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  accessedAt: number;
  accessCount: number;
  size: number;
  compressed: boolean;
  tags: string[];
  metadata?: Record<string, unknown>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  itemCount: number;
  memoryUsed: number;
  evictions: number;
  compressions: number;
  avgAccessTime: number;
  oldestEntry: number;
  newestEntry: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  tags?: string[]; // Tags for group invalidation
  compress?: boolean; // Force compression
  skipMemory?: boolean; // Skip memory cache, go directly to Redis
  metadata?: Record<string, unknown>;
}

export interface CacheResult<T> {
  value: T;
  cached: boolean;
  tier: 'memory' | 'redis' | 'source';
  age: number; // Age in milliseconds
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxMemoryItems: 10000,
  maxMemorySize: 100 * 1024 * 1024, // 100MB
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxTTL: 24 * 60 * 60 * 1000, // 24 hours
  compressionThreshold: 1024, // 1KB
  enableCompression: true,
  redisPrefix: 'motion:cache:',
  evictionPolicy: 'lru',
  evictionBatchSize: 100,
};

// ============================================
// LRU CACHE IMPLEMENTATION
// ============================================

class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): CacheEntry<T> | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, entry);
      entry.accessedAt = Date.now();
      entry.accessCount++;
    }
    return entry;
  }

  set(key: string, entry: CacheEntry<T>): void {
    // If key exists, delete it first
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict if at capacity
    while (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, entry);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  keys(): IterableIterator<string> {
    return this.cache.keys();
  }

  values(): IterableIterator<CacheEntry<T>> {
    return this.cache.values();
  }

  entries(): IterableIterator<[string, CacheEntry<T>]> {
    return this.cache.entries();
  }
}

// ============================================
// CACHE SERVICE
// ============================================

export class CacheService extends EventEmitter {
  private static instance: CacheService;

  private config: CacheConfig;
  private memoryCache: LRUCache<unknown>;
  private redisClient: any = null;
  private useRedis: boolean = false;

  // Statistics
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    itemCount: 0,
    memoryUsed: 0,
    evictions: 0,
    compressions: 0,
    avgAccessTime: 0,
    oldestEntry: 0,
    newestEntry: 0,
  };

  // Access time tracking
  private accessTimes: number[] = [];

  // Cleanup interval
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor(config: Partial<CacheConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.memoryCache = new LRUCache(this.config.maxMemoryItems);
    this.startCleanupInterval();
  }

  public static getInstance(config?: Partial<CacheConfig>): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService(config);
    }
    return CacheService.instance;
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Connect to Redis for distributed caching
   */
  public async connectRedis(redisUrl: string): Promise<void> {
    try {
      const { createClient } = await import('redis');
      this.redisClient = createClient({ url: redisUrl });
      await this.redisClient.connect();
      this.useRedis = true;
      console.log('[CACHE] Connected to Redis for distributed caching');
    } catch (error) {
      console.warn('[CACHE] Redis not available, using memory-only caching:', error);
      this.useRedis = false;
    }
  }

  /**
   * Update configuration
   */
  public configure(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // ============================================
  // CORE CACHE OPERATIONS
  // ============================================

  /**
   * Get a value from cache
   */
  public async get<T>(key: string): Promise<T | undefined> {
    const startTime = Date.now();

    try {
      // Try memory cache first
      const memoryEntry = this.memoryCache.get(key) as CacheEntry<T> | undefined;

      if (memoryEntry) {
        if (this.isExpired(memoryEntry)) {
          this.memoryCache.delete(key);
          this.stats.misses++;
          return undefined;
        }

        this.stats.hits++;
        this.trackAccessTime(Date.now() - startTime);
        this.emit('cache:hit', { key, tier: 'memory' });

        return this.decompress(memoryEntry.value, memoryEntry.compressed) as T;
      }

      // Try Redis if available
      if (this.useRedis && this.redisClient) {
        const redisKey = this.config.redisPrefix + key;
        const redisData = await this.redisClient.get(redisKey);

        if (redisData) {
          const entry = JSON.parse(redisData) as CacheEntry<T>;

          if (this.isExpired(entry)) {
            await this.redisClient.del(redisKey);
            this.stats.misses++;
            return undefined;
          }

          // Promote to memory cache
          this.memoryCache.set(key, entry);

          this.stats.hits++;
          this.trackAccessTime(Date.now() - startTime);
          this.emit('cache:hit', { key, tier: 'redis' });

          return this.decompress(entry.value, entry.compressed) as T;
        }
      }

      this.stats.misses++;
      this.trackAccessTime(Date.now() - startTime);
      this.emit('cache:miss', { key });

      return undefined;
    } catch (error) {
      console.error('[CACHE] Get error:', error);
      this.stats.misses++;
      return undefined;
    }
  }

  /**
   * Set a value in cache
   */
  public async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const {
      ttl = this.config.defaultTTL,
      tags = [],
      compress = this.config.enableCompression,
      skipMemory = false,
      metadata,
    } = options;

    const now = Date.now();
    const serialized = JSON.stringify(value);
    const size = Buffer.byteLength(serialized, 'utf8');

    // Determine if compression is needed
    const shouldCompress = compress && size > this.config.compressionThreshold;
    const storedValue = shouldCompress ? this.compress(value) : value;

    if (shouldCompress) {
      this.stats.compressions++;
    }

    const entry: CacheEntry<T> = {
      key,
      value: storedValue as T,
      createdAt: now,
      expiresAt: now + Math.min(ttl, this.config.maxTTL),
      accessedAt: now,
      accessCount: 0,
      size,
      compressed: shouldCompress,
      tags,
      metadata,
    };

    try {
      // Store in memory cache (unless skipped)
      if (!skipMemory) {
        this.memoryCache.set(key, entry);
      }

      // Store in Redis if available
      if (this.useRedis && this.redisClient) {
        const redisKey = this.config.redisPrefix + key;
        const redisTTL = Math.ceil(ttl / 1000); // Redis TTL in seconds

        await this.redisClient.setEx(
          redisKey,
          redisTTL,
          JSON.stringify(entry)
        );
      }

      this.updateStats();
      this.emit('cache:set', { key, size, ttl, tags });
    } catch (error) {
      console.error('[CACHE] Set error:', error);
    }
  }

  /**
   * Delete a value from cache
   */
  public async delete(key: string): Promise<boolean> {
    let deleted = false;

    // Delete from memory
    if (this.memoryCache.delete(key)) {
      deleted = true;
    }

    // Delete from Redis
    if (this.useRedis && this.redisClient) {
      const redisKey = this.config.redisPrefix + key;
      const result = await this.redisClient.del(redisKey);
      if (result > 0) {
        deleted = true;
      }
    }

    if (deleted) {
      this.emit('cache:delete', { key });
    }

    return deleted;
  }

  /**
   * Check if a key exists in cache
   */
  public async has(key: string): Promise<boolean> {
    // Check memory first
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key);
      if (entry && !this.isExpired(entry)) {
        return true;
      }
    }

    // Check Redis
    if (this.useRedis && this.redisClient) {
      const redisKey = this.config.redisPrefix + key;
      const exists = await this.redisClient.exists(redisKey);
      return exists > 0;
    }

    return false;
  }

  /**
   * Clear all cache entries
   */
  public async clear(): Promise<void> {
    this.memoryCache.clear();

    if (this.useRedis && this.redisClient) {
      // Delete all keys with our prefix
      const keys = await this.redisClient.keys(this.config.redisPrefix + '*');
      if (keys.length > 0) {
        await this.redisClient.del(keys);
      }
    }

    this.resetStats();
    this.emit('cache:clear', {});
  }

  // ============================================
  // CACHE-ASIDE PATTERN
  // ============================================

  /**
   * Get or compute a value (cache-aside pattern)
   */
  public async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<CacheResult<T>> {
    // Try to get from cache first
    const cached = await this.get<T>(key);

    if (cached !== undefined) {
      const entry = this.memoryCache.get(key);
      return {
        value: cached,
        cached: true,
        tier: 'memory',
        age: entry ? Date.now() - entry.createdAt : 0,
      };
    }

    // Compute the value
    const value = await factory();

    // Store in cache
    await this.set(key, value, options);

    return {
      value,
      cached: false,
      tier: 'source',
      age: 0,
    };
  }

  /**
   * Memoize an async function
   */
  public memoize<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
    keyGenerator: (...args: TArgs) => string,
    options: CacheOptions = {}
  ): (...args: TArgs) => Promise<CacheResult<TResult>> {
    return async (...args: TArgs): Promise<CacheResult<TResult>> => {
      const key = keyGenerator(...args);
      return this.getOrSet(key, () => fn(...args), options);
    };
  }

  // ============================================
  // TAG-BASED INVALIDATION
  // ============================================

  /**
   * Invalidate all entries with a specific tag
   */
  public async invalidateByTag(tag: string): Promise<number> {
    let count = 0;

    // Invalidate from memory
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.tags.includes(tag)) {
        this.memoryCache.delete(key);
        count++;
      }
    }

    // Note: Redis tag invalidation would require maintaining a tag index
    // For now, we rely on TTL for Redis entries

    this.emit('cache:invalidate:tag', { tag, count });
    return count;
  }

  /**
   * Invalidate entries matching a pattern
   */
  public async invalidateByPattern(pattern: string): Promise<number> {
    let count = 0;
    const regex = new RegExp(pattern);

    // Invalidate from memory
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
        count++;
      }
    }

    // Invalidate from Redis
    if (this.useRedis && this.redisClient) {
      const redisPattern = this.config.redisPrefix + pattern.replace(/\.\*/g, '*');
      const keys = await this.redisClient.keys(redisPattern);
      if (keys.length > 0) {
        await this.redisClient.del(keys);
        count += keys.length;
      }
    }

    this.emit('cache:invalidate:pattern', { pattern, count });
    return count;
  }

  // ============================================
  // CACHE KEY GENERATION
  // ============================================

  /**
   * Generate a cache key from parameters
   */
  public generateKey(prefix: string, ...params: unknown[]): string {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(params))
      .digest('hex')
      .substring(0, 16);

    return `${prefix}:${hash}`;
  }

  /**
   * Generate a cache key for AI responses
   */
  public generateAIKey(
    agentId: string,
    prompt: string,
    options?: Record<string, unknown>
  ): string {
    return this.generateKey('ai', agentId, prompt, options);
  }

  /**
   * Generate a cache key for tool results
   */
  public generateToolKey(
    agentId: string,
    toolId: string,
    input: unknown
  ): string {
    return this.generateKey('tool', agentId, toolId, input);
  }

  // ============================================
  // CACHE WARMING
  // ============================================

  /**
   * Warm the cache with multiple entries
   */
  public async warm<T>(
    entries: Array<{ key: string; factory: () => Promise<T>; options?: CacheOptions }>
  ): Promise<void> {
    const results = await Promise.allSettled(
      entries.map(async ({ key, factory, options }) => {
        const value = await factory();
        await this.set(key, value, options);
        return key;
      })
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    console.log(`[CACHE] Warmed ${succeeded}/${entries.length} entries`);

    this.emit('cache:warm', { total: entries.length, succeeded });
  }

  // ============================================
  // COMPRESSION
  // ============================================

  private compress<T>(value: T): string {
    // Simple JSON + base64 "compression" for now
    // In production, use zlib or similar
    const json = JSON.stringify(value);
    return Buffer.from(json).toString('base64');
  }

  private decompress<T>(value: unknown, isCompressed: boolean): T {
    if (!isCompressed) {
      return value as T;
    }

    const json = Buffer.from(value as string, 'base64').toString('utf8');
    return JSON.parse(json) as T;
  }

  // ============================================
  // STATISTICS & MONITORING
  // ============================================

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  private updateStats(): void {
    this.stats.itemCount = this.memoryCache.size;

    // Calculate hit rate
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    // Calculate memory usage (approximate)
    let memoryUsed = 0;
    let oldest = Date.now();
    let newest = 0;

    for (const entry of this.memoryCache.values()) {
      memoryUsed += entry.size;
      if (entry.createdAt < oldest) oldest = entry.createdAt;
      if (entry.createdAt > newest) newest = entry.createdAt;
    }

    this.stats.memoryUsed = memoryUsed;
    this.stats.oldestEntry = this.memoryCache.size > 0 ? oldest : 0;
    this.stats.newestEntry = newest;

    // Calculate average access time
    if (this.accessTimes.length > 0) {
      this.stats.avgAccessTime =
        this.accessTimes.reduce((a, b) => a + b, 0) / this.accessTimes.length;
    }
  }

  private trackAccessTime(ms: number): void {
    this.accessTimes.push(ms);
    if (this.accessTimes.length > 1000) {
      this.accessTimes.shift();
    }
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      itemCount: 0,
      memoryUsed: 0,
      evictions: 0,
      compressions: 0,
      avgAccessTime: 0,
      oldestEntry: 0,
      newestEntry: 0,
    };
    this.accessTimes = [];
  }

  // ============================================
  // CLEANUP
  // ============================================

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() > entry.expiresAt;
  }

  private startCleanupInterval(): void {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup(): void {
    let evicted = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
        evicted++;
      }
    }

    if (evicted > 0) {
      this.stats.evictions += evicted;
      console.log(`[CACHE] Cleaned up ${evicted} expired entries`);
    }
  }

  /**
   * Shutdown the service
   */
  public async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.redisClient) {
      await this.redisClient.quit();
    }

    console.log('[CACHE] Service shutdown');
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const cacheService = CacheService.getInstance();

export default CacheService;
