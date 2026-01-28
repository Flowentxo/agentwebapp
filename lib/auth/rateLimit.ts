/**
 * SINTRA Auth System - Rate Limiting
 * Redis-based token bucket rate limiting
 */

import Redis from 'ioredis';
import type { RateLimitConfig, LockoutInfo } from './types';
import { AuthErrorCode } from './types';

// =====================================================
// Redis Client
// =====================================================

let redis: Redis | null = null;
let redisDisabled = false;

function getRedisClient(): Redis | null {
  // Check if Redis is configured
  const redisUrl = process.env.REDIS_URL?.replace(/^['"]|['"]$/g, '');
  const hasRedisConfig = redisUrl && redisUrl !== '' && redisUrl !== 'redis://localhost:6379';

  if (!hasRedisConfig || redisDisabled) {
    return null;
  }

  if (!redis) {
    redis = new Redis(redisUrl, {
      password: process.env.REDIS_PASSWORD?.replace(/^['"]|['"]$/g, ''),
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 2) {
          redisDisabled = true;
          return null; // Stop retrying
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redis.on('error', (error) => {
      if (error.message?.includes('NOAUTH') || error.message?.includes('ECONNREFUSED')) {
        redisDisabled = true;
      }
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.debug('[RateLimit] Redis unavailable');
      }
    });
  }

  return redis;
}

// =====================================================
// Rate Limit Configurations
// =====================================================

export const RATE_LIMITS = {
  LOGIN: {
    maxAttempts: 5,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 15 * 60 * 1000, // 15 minutes after 10 failed attempts
  },
  REGISTER: {
    maxAttempts: 3,
    windowMs: 10 * 60 * 1000, // 10 minutes
  },
  PASSWORD_RESET_REQUEST: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  PASSWORD_RESET_CONFIRM: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  EMAIL_VERIFY: {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
} as const;

// =====================================================
// Token Bucket Rate Limiter
// =====================================================

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds
}

/**
 * Check rate limit using token bucket algorithm
 * @param key - Unique identifier (e.g., "login:user@example.com:192.168.1.1")
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const client = getRedisClient();
  const now = Date.now();
  const resetAt = new Date(now + config.windowMs);

  // Fail open - allow request if Redis is not configured
  if (!client) {
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetAt,
    };
  }

  const redisKey = `ratelimit:${key}`;

  try {
    // Get current count
    const countStr = await client.get(redisKey);
    const count = countStr ? parseInt(countStr, 10) : 0;

    if (count >= config.maxAttempts) {
      const ttl = await client.ttl(redisKey);
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: ttl > 0 ? ttl : Math.ceil(config.windowMs / 1000),
      };
    }

    return {
      allowed: true,
      remaining: config.maxAttempts - count - 1,
      resetAt,
    };
  } catch (error) {
    // Fail open - allow request if Redis is down
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetAt: new Date(now + config.windowMs),
    };
  }
}

/**
 * Increment rate limit counter
 * @param key - Unique identifier
 * @param config - Rate limit configuration
 */
export async function incrementRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<void> {
  const client = getRedisClient();
  if (!client) return; // Redis not configured

  const redisKey = `ratelimit:${key}`;
  const ttlSeconds = Math.ceil(config.windowMs / 1000);

  try {
    const multi = client.multi();
    multi.incr(redisKey);
    multi.expire(redisKey, ttlSeconds);
    await multi.exec();
  } catch (error) {
    // Silently fail
  }
}

/**
 * Reset rate limit counter
 * @param key - Unique identifier
 */
export async function resetRateLimit(key: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return; // Redis not configured

  const redisKey = `ratelimit:${key}`;

  try {
    await client.del(redisKey);
  } catch (error) {
    // Silently fail
  }
}

// =====================================================
// Login Lockout (after repeated failed attempts)
// =====================================================

const LOCKOUT_THRESHOLD = 10; // Failed attempts before lockout
const LOCKOUT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minute lockout

/**
 * Track failed login attempt
 * @param identifier - Email or IP address
 */
export async function trackFailedLogin(identifier: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return; // Redis not configured

  const key = `login:failed:${identifier}`;
  const lockoutKey = `login:lockout:${identifier}`;

  try {
    // Increment failed attempts
    const count = await client.incr(key);
    await client.expire(key, Math.ceil(LOCKOUT_WINDOW_MS / 1000));

    // Check if lockout threshold reached
    if (count >= LOCKOUT_THRESHOLD) {
      await client.set(lockoutKey, '1', 'EX', Math.ceil(LOCKOUT_DURATION_MS / 1000));
      console.warn(`[RateLimit] Account locked out: ${identifier}`);
    }
  } catch (error) {
    // Silently fail
  }
}

/**
 * Reset failed login attempts (on successful login)
 * @param identifier - Email or IP address
 */
export async function resetFailedLogins(identifier: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return; // Redis not configured

  const key = `login:failed:${identifier}`;

  try {
    await client.del(key);
  } catch (error) {
    // Silently fail
  }
}

/**
 * Check if account/IP is locked out
 * @param identifier - Email or IP address
 * @returns Lockout information
 */
export async function checkLockout(identifier: string): Promise<LockoutInfo> {
  const client = getRedisClient();

  // If Redis not configured, never locked
  if (!client) {
    return {
      isLocked: false,
      attemptsRemaining: LOCKOUT_THRESHOLD,
    };
  }

  const lockoutKey = `login:lockout:${identifier}`;
  const failedKey = `login:failed:${identifier}`;

  try {
    const isLocked = await client.exists(lockoutKey);

    if (isLocked) {
      const ttl = await client.ttl(lockoutKey);
      return {
        isLocked: true,
        unlocksAt: new Date(Date.now() + ttl * 1000),
      };
    }

    // Check attempts remaining
    const failedCountStr = await client.get(failedKey);
    const failedCount = failedCountStr ? parseInt(failedCountStr, 10) : 0;
    const attemptsRemaining = Math.max(0, LOCKOUT_THRESHOLD - failedCount);

    return {
      isLocked: false,
      attemptsRemaining,
    };
  } catch (error) {
    return {
      isLocked: false,
    };
  }
}

// =====================================================
// Combined Rate Limit + Lockout Check
// =====================================================

export interface LoginRateLimitResult {
  allowed: boolean;
  reason?: 'rate_limit' | 'lockout';
  retryAfter?: number; // seconds
  remaining?: number;
  lockoutInfo?: LockoutInfo;
}

/**
 * Check both rate limit and lockout for login attempts
 * @param email - User email
 * @param ip - IP address
 * @returns Combined result
 */
export async function checkLoginRateLimit(
  email: string,
  ip: string
): Promise<LoginRateLimitResult> {
  // Check lockout first (by email and IP)
  const emailLockout = await checkLockout(`email:${email}`);
  const ipLockout = await checkLockout(`ip:${ip}`);

  if (emailLockout.isLocked) {
    const retryAfter = emailLockout.unlocksAt
      ? Math.ceil((emailLockout.unlocksAt.getTime() - Date.now()) / 1000)
      : 900; // 15 minutes

    return {
      allowed: false,
      reason: 'lockout',
      retryAfter,
      lockoutInfo: emailLockout,
    };
  }

  if (ipLockout.isLocked) {
    const retryAfter = ipLockout.unlocksAt
      ? Math.ceil((ipLockout.unlocksAt.getTime() - Date.now()) / 1000)
      : 900;

    return {
      allowed: false,
      reason: 'lockout',
      retryAfter,
      lockoutInfo: ipLockout,
    };
  }

  // Check rate limit (combined email + IP)
  const rateLimitKey = `login:${email}:${ip}`;
  const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMITS.LOGIN);

  if (!rateLimit.allowed) {
    return {
      allowed: false,
      reason: 'rate_limit',
      retryAfter: rateLimit.retryAfter,
      remaining: rateLimit.remaining,
    };
  }

  return {
    allowed: true,
    remaining: rateLimit.remaining,
  };
}

/**
 * Record login attempt (increment rate limit)
 * @param email - User email
 * @param ip - IP address
 * @param success - Whether login was successful
 */
export async function recordLoginAttempt(
  email: string,
  ip: string,
  success: boolean
): Promise<void> {
  const rateLimitKey = `login:${email}:${ip}`;

  // Always increment rate limit
  await incrementRateLimit(rateLimitKey, RATE_LIMITS.LOGIN);

  if (!success) {
    // Track failed attempts for lockout
    await trackFailedLogin(`email:${email}`);
    await trackFailedLogin(`ip:${ip}`);
  } else {
    // Reset failed attempts on successful login
    await resetFailedLogins(`email:${email}`);
    await resetFailedLogins(`ip:${ip}`);
  }
}

// =====================================================
// Cleanup
// =====================================================

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRateLimitClient(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
