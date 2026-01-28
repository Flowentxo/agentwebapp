/**
 * Simplified Redis-based Rate Limiting for Login
 * Focused implementation for the new login flow
 */

import Redis from 'ioredis';

let client: Redis | null = null;
let redisDisabled = false;

function getClient(): Redis | null {
  // Check if Redis is configured
  const redisUrl = process.env.REDIS_URL?.replace(/^['"]|['"]$/g, '');
  const hasRedisConfig = redisUrl && redisUrl !== '' && redisUrl !== 'redis://localhost:6379';

  if (!hasRedisConfig || redisDisabled) {
    return null;
  }

  if (!client) {
    client = new Redis(redisUrl, {
      password: process.env.REDIS_PASSWORD?.replace(/^['"]|['"]$/g, ''),
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      reconnectOnError: () => false, // Don't reconnect on error
      lazyConnect: true, // Don't connect immediately
      connectTimeout: 1000, // 1 second timeout
    });
    client.on('error', (err) => {
      if (err.message?.includes('NOAUTH') || err.message?.includes('ECONNREFUSED')) {
        redisDisabled = true; // Disable further attempts
      }
      // Silently log only in development
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Redis] Rate limit cache unavailable');
      }
    });
  }
  return client;
}

export async function takeLoginRateLimit({
  email,
  ip,
  limit,
  windowSec,
}: {
  email: string;
  ip: string;
  limit: number;
  windowSec: number;
}): Promise<{ allowed: boolean; retryAfterSec: number }> {
  try {
    const redis = getClient();
    if (!redis) {
      // Redis not configured - allow all requests (fail open)
      return { allowed: true, retryAfterSec: 0 };
    }
    const key = `auth:rl:${email}:${ip}`;
    const tx = redis.multi();
    tx.incr(key);
    tx.expire(key, windowSec);
    const results = await tx.exec();

    if (!results || results.length === 0) {
      return { allowed: true, retryAfterSec: 0 };
    }

    const [incrResult] = results;
    const count = incrResult && incrResult[1] ? Number(incrResult[1]) : 0;
    const allowed = count <= limit;

    return { allowed, retryAfterSec: allowed ? 0 : windowSec };
  } catch {
    // Fail open on Redis errors
    return { allowed: true, retryAfterSec: 0 };
  }
}

const FAILS = 10;
const LOCK_WINDOW = 60 * 60; // 1h
const LOCK_DURATION = 15 * 60; // 15m

export async function registerFailedLogin({
  email,
  ip,
}: {
  email: string;
  ip: string;
}): Promise<void> {
  try {
    const redis = getClient();
    if (!redis) return; // Redis not configured
    const key = `auth:fail:${email}:${ip}`;
    const cnt = await redis.incr(key);
    await redis.expire(key, LOCK_WINDOW);
    if (cnt >= FAILS) {
      await redis.set(`auth:lock:${email}:${ip}`, '1', 'EX', LOCK_DURATION);
    }
  } catch {
    // Swallow errors
  }
}

export async function isLockedOut({
  email,
  ip,
}: {
  email: string;
  ip: string;
}): Promise<boolean> {
  try {
    const redis = getClient();
    if (!redis) return false; // Redis not configured - never locked
    const locked = await redis.get(`auth:lock:${email}:${ip}`);
    return Boolean(locked);
  } catch {
    return false;
  }
}

export async function clearFailures({
  email,
  ip,
}: {
  email: string;
  ip: string;
}): Promise<void> {
  try {
    const redis = getClient();
    if (!redis) return; // Redis not configured
    await redis.del(`auth:fail:${email}:${ip}`);
    await redis.del(`auth:lock:${email}:${ip}`);
  } catch {
    // Swallow errors
  }
}
