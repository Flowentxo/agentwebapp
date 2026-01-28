/**
 * SINTRA Auth System - Hybrid Rate Limiting
 *
 * A resilient rate-limiting solution that:
 * 1. Tries Redis first (distributed, persistent)
 * 2. Falls back to in-memory store if Redis is unavailable
 * 3. Provides consistent interface regardless of backend
 *
 * Security: "Fail closed" - if both backends fail, deny the request
 */

import { Redis } from 'ioredis';

// =====================================================
// Configuration
// =====================================================

const CONFIG = {
  // Login rate limit: max attempts per window
  LOGIN_MAX_ATTEMPTS: 5,
  LOGIN_WINDOW_SECONDS: 60,

  // Account lockout after too many failures
  LOCKOUT_THRESHOLD: 5,
  LOCKOUT_DURATION_SECONDS: 15 * 60, // 15 minutes

  // Redis connection timeout
  REDIS_CONNECT_TIMEOUT: 2000,

  // Memory cleanup interval (for stale entries)
  MEMORY_CLEANUP_INTERVAL: 60 * 1000, // 1 minute
};

// =====================================================
// Types
// =====================================================

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec?: number;
  backend: 'redis' | 'memory';
}

export interface LockoutResult {
  locked: boolean;
  remainingSec?: number;
  backend: 'redis' | 'memory';
}

interface MemoryEntry {
  count: number;
  expiresAt: number;
}

interface LockoutEntry {
  lockedUntil: number;
}

// =====================================================
// In-Memory Store (Fallback)
// =====================================================

class InMemoryRateLimiter {
  private attempts: Map<string, MemoryEntry> = new Map();
  private failures: Map<string, MemoryEntry> = new Map();
  private lockouts: Map<string, LockoutEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic cleanup to prevent memory leaks
    this.startCleanup();
  }

  private startCleanup(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();

      // Clean expired attempts
      this.attempts.forEach((entry, key) => {
        if (entry.expiresAt < now) {
          this.attempts.delete(key);
        }
      });

      // Clean expired failures
      this.failures.forEach((entry, key) => {
        if (entry.expiresAt < now) {
          this.failures.delete(key);
        }
      });

      // Clean expired lockouts
      this.lockouts.forEach((entry, key) => {
        if (entry.lockedUntil < now) {
          this.lockouts.delete(key);
        }
      });
    }, CONFIG.MEMORY_CLEANUP_INTERVAL);

    // Don't prevent process exit
    this.cleanupInterval.unref();
  }

  /**
   * Check and consume a rate limit attempt
   */
  takeAttempt(key: string): RateLimitResult {
    const now = Date.now();
    const windowMs = CONFIG.LOGIN_WINDOW_SECONDS * 1000;

    let entry = this.attempts.get(key);

    // If entry doesn't exist or has expired, create new one
    if (!entry || entry.expiresAt < now) {
      entry = {
        count: 1,
        expiresAt: now + windowMs,
      };
      this.attempts.set(key, entry);

      return {
        allowed: true,
        remaining: CONFIG.LOGIN_MAX_ATTEMPTS - 1,
        backend: 'memory',
      };
    }

    // Increment count
    entry.count++;

    if (entry.count > CONFIG.LOGIN_MAX_ATTEMPTS) {
      const retryAfterSec = Math.ceil((entry.expiresAt - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec,
        backend: 'memory',
      };
    }

    return {
      allowed: true,
      remaining: CONFIG.LOGIN_MAX_ATTEMPTS - entry.count,
      backend: 'memory',
    };
  }

  /**
   * Register a failed login attempt
   */
  registerFailure(key: string): void {
    const now = Date.now();
    const windowMs = CONFIG.LOCKOUT_DURATION_SECONDS * 1000;

    let entry = this.failures.get(key);

    if (!entry || entry.expiresAt < now) {
      entry = {
        count: 1,
        expiresAt: now + windowMs,
      };
    } else {
      entry.count++;
    }

    this.failures.set(key, entry);

    // Check if we should lock out
    if (entry.count >= CONFIG.LOCKOUT_THRESHOLD) {
      this.lockouts.set(key, {
        lockedUntil: now + windowMs,
      });
    }
  }

  /**
   * Check if account is locked out
   */
  isLockedOut(key: string): LockoutResult {
    const now = Date.now();
    const lockout = this.lockouts.get(key);

    if (!lockout || lockout.lockedUntil < now) {
      return { locked: false, backend: 'memory' };
    }

    return {
      locked: true,
      remainingSec: Math.ceil((lockout.lockedUntil - now) / 1000),
      backend: 'memory',
    };
  }

  /**
   * Clear failures and lockout on successful login
   */
  clearFailures(key: string): void {
    this.failures.delete(key);
    this.lockouts.delete(key);
  }

  /**
   * Get current failure count (for logging/monitoring)
   */
  getFailureCount(key: string): number {
    const now = Date.now();
    const entry = this.failures.get(key);

    if (!entry || entry.expiresAt < now) {
      return 0;
    }

    return entry.count;
  }
}

// =====================================================
// Redis Rate Limiter
// =====================================================

class RedisRateLimiter {
  private client: Redis | null = null;
  private isConnected: boolean = false;
  private connectionPromise: Promise<boolean> | null = null;

  private getClient(): Redis {
    if (!this.client) {
      const redisUrl = process.env.REDIS_URL;

      if (!redisUrl) {
        throw new Error('REDIS_URL not configured');
      }

      this.client = new Redis(redisUrl, {
        connectTimeout: CONFIG.REDIS_CONNECT_TIMEOUT,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          // Only retry once, then fail fast
          if (times > 1) return null;
          return 100;
        },
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        console.log('[RATE_LIMIT] Redis connected');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        console.warn('[RATE_LIMIT] Redis error:', err.message);
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });
    }

    return this.client;
  }

  async ensureConnected(): Promise<boolean> {
    if (this.isConnected) return true;

    // Prevent multiple simultaneous connection attempts
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      try {
        const client = this.getClient();
        await client.connect();
        this.isConnected = true;
        return true;
      } catch (error) {
        console.warn('[RATE_LIMIT] Redis connection failed:', (error as Error).message);
        this.isConnected = false;
        return false;
      } finally {
        this.connectionPromise = null;
      }
    })();

    return this.connectionPromise;
  }

  /**
   * Check and consume a rate limit attempt
   */
  async takeAttempt(key: string): Promise<RateLimitResult> {
    const client = this.getClient();
    const redisKey = `rl:attempt:${key}`;

    const multi = client.multi();
    multi.incr(redisKey);
    multi.ttl(redisKey);

    const results = await multi.exec();

    if (!results) {
      throw new Error('Redis multi exec failed');
    }

    const count = results[0][1] as number;
    let ttl = results[1][1] as number;

    // Set expiry if this is the first attempt
    if (ttl === -1) {
      await client.expire(redisKey, CONFIG.LOGIN_WINDOW_SECONDS);
      ttl = CONFIG.LOGIN_WINDOW_SECONDS;
    }

    if (count > CONFIG.LOGIN_MAX_ATTEMPTS) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec: ttl > 0 ? ttl : CONFIG.LOGIN_WINDOW_SECONDS,
        backend: 'redis',
      };
    }

    return {
      allowed: true,
      remaining: CONFIG.LOGIN_MAX_ATTEMPTS - count,
      backend: 'redis',
    };
  }

  /**
   * Register a failed login attempt
   */
  async registerFailure(key: string): Promise<void> {
    const client = this.getClient();
    const failKey = `rl:fail:${key}`;
    const lockKey = `rl:lock:${key}`;

    const count = await client.incr(failKey);
    await client.expire(failKey, CONFIG.LOCKOUT_DURATION_SECONDS);

    // Lock out if threshold reached
    if (count >= CONFIG.LOCKOUT_THRESHOLD) {
      await client.setex(lockKey, CONFIG.LOCKOUT_DURATION_SECONDS, '1');
    }
  }

  /**
   * Check if account is locked out
   */
  async isLockedOut(key: string): Promise<LockoutResult> {
    const client = this.getClient();
    const lockKey = `rl:lock:${key}`;

    const ttl = await client.ttl(lockKey);

    if (ttl > 0) {
      return {
        locked: true,
        remainingSec: ttl,
        backend: 'redis',
      };
    }

    return { locked: false, backend: 'redis' };
  }

  /**
   * Clear failures and lockout on successful login
   */
  async clearFailures(key: string): Promise<void> {
    const client = this.getClient();
    const failKey = `rl:fail:${key}`;
    const lockKey = `rl:lock:${key}`;

    await client.del(failKey, lockKey);
  }
}

// =====================================================
// Hybrid Rate Limiter (Main Export)
// =====================================================

class HybridRateLimiter {
  private redis: RedisRateLimiter;
  private memory: InMemoryRateLimiter;
  private useRedis: boolean = true;
  private lastRedisCheck: number = 0;
  private redisCheckInterval: number = 30000; // Re-check Redis every 30 seconds

  constructor() {
    this.redis = new RedisRateLimiter();
    this.memory = new InMemoryRateLimiter();
  }

  /**
   * Generate a composite key from email and IP
   */
  private makeKey(email: string, ip: string): string {
    // Use both email and IP to prevent:
    // 1. Single IP attacking multiple accounts
    // 2. Distributed attack on single account
    return `${email.toLowerCase()}:${ip}`;
  }

  /**
   * Check if Redis should be used (with periodic re-check)
   */
  private async shouldUseRedis(): Promise<boolean> {
    const now = Date.now();

    // If Redis was working, assume it still is
    if (this.useRedis && (now - this.lastRedisCheck) < this.redisCheckInterval) {
      return true;
    }

    // Check Redis connection
    try {
      const connected = await this.redis.ensureConnected();
      this.useRedis = connected;
      this.lastRedisCheck = now;
      return connected;
    } catch {
      this.useRedis = false;
      this.lastRedisCheck = now;
      return false;
    }
  }

  /**
   * Check and consume a rate limit attempt
   */
  async takeLoginAttempt(params: { email: string; ip: string }): Promise<RateLimitResult> {
    const key = this.makeKey(params.email, params.ip);

    try {
      if (await this.shouldUseRedis()) {
        return await this.redis.takeAttempt(key);
      }
    } catch (error) {
      console.warn('[RATE_LIMIT] Redis takeAttempt failed, using memory:', (error as Error).message);
      this.useRedis = false;
    }

    // Fallback to memory
    return this.memory.takeAttempt(key);
  }

  /**
   * Register a failed login attempt
   */
  async registerFailedLogin(params: { email: string; ip: string }): Promise<void> {
    const key = this.makeKey(params.email, params.ip);

    try {
      if (await this.shouldUseRedis()) {
        await this.redis.registerFailure(key);
        return;
      }
    } catch (error) {
      console.warn('[RATE_LIMIT] Redis registerFailure failed, using memory:', (error as Error).message);
      this.useRedis = false;
    }

    // Fallback to memory
    this.memory.registerFailure(key);
  }

  /**
   * Check if account is locked out
   */
  async isLockedOut(params: { email: string; ip: string }): Promise<LockoutResult> {
    const key = this.makeKey(params.email, params.ip);

    try {
      if (await this.shouldUseRedis()) {
        return await this.redis.isLockedOut(key);
      }
    } catch (error) {
      console.warn('[RATE_LIMIT] Redis isLockedOut failed, using memory:', (error as Error).message);
      this.useRedis = false;
    }

    // Fallback to memory
    return this.memory.isLockedOut(key);
  }

  /**
   * Clear failures and lockout on successful login
   */
  async clearFailures(params: { email: string; ip: string }): Promise<void> {
    const key = this.makeKey(params.email, params.ip);

    try {
      if (await this.shouldUseRedis()) {
        await this.redis.clearFailures(key);
        return;
      }
    } catch (error) {
      console.warn('[RATE_LIMIT] Redis clearFailures failed, using memory:', (error as Error).message);
      this.useRedis = false;
    }

    // Fallback to memory
    this.memory.clearFailures(key);
  }

  /**
   * Get current backend status (for monitoring/debugging)
   */
  getStatus(): { backend: 'redis' | 'memory'; redisAvailable: boolean } {
    return {
      backend: this.useRedis ? 'redis' : 'memory',
      redisAvailable: this.useRedis,
    };
  }
}

// =====================================================
// Singleton Instance
// =====================================================

let rateLimiterInstance: HybridRateLimiter | null = null;

function getRateLimiter(): HybridRateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new HybridRateLimiter();
  }
  return rateLimiterInstance;
}

// =====================================================
// Public API (Simple Functions)
// =====================================================

/**
 * Check and consume a login rate limit attempt
 * @returns RateLimitResult with allowed status and remaining attempts
 */
export async function takeLoginRateLimit(params: {
  email: string;
  ip: string;
}): Promise<RateLimitResult> {
  return getRateLimiter().takeLoginAttempt(params);
}

/**
 * Register a failed login attempt (for lockout tracking)
 */
export async function registerFailedLogin(params: {
  email: string;
  ip: string;
}): Promise<void> {
  return getRateLimiter().registerFailedLogin(params);
}

/**
 * Check if account is locked out due to too many failures
 */
export async function isLockedOut(params: {
  email: string;
  ip: string;
}): Promise<LockoutResult> {
  return getRateLimiter().isLockedOut(params);
}

/**
 * Clear failures on successful login
 */
export async function clearFailures(params: {
  email: string;
  ip: string;
}): Promise<void> {
  return getRateLimiter().clearFailures(params);
}

/**
 * Get rate limiter status (for monitoring)
 */
export function getRateLimiterStatus(): { backend: 'redis' | 'memory'; redisAvailable: boolean } {
  return getRateLimiter().getStatus();
}

// =====================================================
// Configuration Export (for reference)
// =====================================================

export const RATE_LIMIT_CONFIG = {
  LOGIN_MAX_ATTEMPTS: CONFIG.LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_SECONDS: CONFIG.LOGIN_WINDOW_SECONDS,
  LOCKOUT_THRESHOLD: CONFIG.LOCKOUT_THRESHOLD,
  LOCKOUT_DURATION_SECONDS: CONFIG.LOCKOUT_DURATION_SECONDS,
} as const;
