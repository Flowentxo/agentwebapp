/**
 * Unified Redis Connection Configuration
 *
 * This module provides a centralized Redis connection factory that:
 * - Supports Redis Cloud TLS connections (rediss://)
 * - Provides fail-fast timeout handling
 * - Gracefully degrades when Redis is unavailable
 */

import Redis, { RedisOptions } from 'ioredis';

// ============================================================================
// Configuration - Fast-Fail for Local Dev, Robust for Cloud
// ============================================================================

// Use fast timeout for local development, longer for cloud
const IS_LOCAL = !process.env.REDIS_URL || process.env.REDIS_URL.includes('localhost') || process.env.REDIS_URL.includes('127.0.0.1');
const REDIS_CONNECT_TIMEOUT = IS_LOCAL ? 2000 : 10000; // 2s local, 10s cloud
const REDIS_COMMAND_TIMEOUT = IS_LOCAL ? 1000 : 5000; // 1s local, 5s cloud
const REDIS_KEEP_ALIVE = 10000; // Send keepalive every 10 seconds

/**
 * Parse Redis URL and extract TLS requirement
 */
function parseRedisUrl(url: string): { host: string; port: number; password?: string; useTls: boolean; username?: string } {
  try {
    // Clean up the URL (remove quotes if any)
    const cleanUrl = url.replace(/^['"]|['"]$/g, '');

    // Check if TLS is required (rediss:// protocol)
    const useTls = cleanUrl.startsWith('rediss://');

    // Parse the URL
    const urlObj = new URL(cleanUrl);

    return {
      host: urlObj.hostname || 'localhost',
      port: parseInt(urlObj.port) || 6379,
      password: urlObj.password || undefined,
      username: urlObj.username || 'default',
      useTls,
    };
  } catch (error) {
    console.warn('[REDIS] Failed to parse REDIS_URL, using defaults:', error);
    return {
      host: 'localhost',
      port: 6379,
      useTls: false,
    };
  }
}

/**
 * Get Redis connection options with TLS support
 */
export function getRedisOptions(overrides?: Partial<RedisOptions>): RedisOptions {
  const redisUrl = process.env.REDIS_URL;

  // If REDIS_URL is provided, parse it
  if (redisUrl && redisUrl.trim() !== '') {
    const parsed = parseRedisUrl(redisUrl);

    const options: RedisOptions = {
      host: parsed.host,
      port: parsed.port,
      password: parsed.password,
      username: parsed.username,

      // Force IPv4 to avoid DNS resolution issues
      family: 4,

      // TLS configuration for Redis Cloud (rediss://)
      ...(parsed.useTls ? {
        tls: {
          rejectUnauthorized: false, // Required for some Redis Cloud instances
        },
      } : {}),

      // Connection settings - optimized for high-latency cloud connections
      connectTimeout: REDIS_CONNECT_TIMEOUT,
      commandTimeout: REDIS_COMMAND_TIMEOUT,
      keepAlive: REDIS_KEEP_ALIVE, // Keep connection alive for cloud instances
      maxRetriesPerRequest: 3,
      lazyConnect: false, // Connect immediately for early error detection

      // Robust retry strategy for cloud Redis
      retryStrategy: (times: number) => {
        // Capped exponential backoff: 50ms, 100ms, 150ms, ... up to 2000ms
        const delay = Math.min(times * 50, 2000);
        console.warn(`[REDIS] Retry attempt ${times} in ${delay}ms...`);
        return delay;
      },

      // Reconnect on specific errors
      reconnectOnError: (err: Error) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Reconnect when Redis is in READONLY mode (failover)
          return true;
        }
        // For other errors: close connection and reconnect
        return 1;
      },

      // Connection reliability
      enableReadyCheck: true, // Wait for ready before accepting commands
      enableOfflineQueue: true, // Buffer commands during brief disconnections

      // Apply any overrides
      ...overrides,
    };

    console.log('[REDIS] Configured with URL:', {
      host: parsed.host,
      port: parsed.port,
      useTls: parsed.useTls,
      hasPassword: !!parsed.password,
    });

    return options;
  }

  // Fallback to individual environment variables
  const host = (process.env.REDIS_HOST || 'localhost').replace(/^['"]|['"]$/g, '');
  const port = parseInt((process.env.REDIS_PORT || '6379').replace(/^['"]|['"]$/g, ''), 10);
  const password = process.env.REDIS_PASSWORD?.replace(/^['"]|['"]$/g, '') || undefined;

  return {
    host: host === 'localhost' ? '127.0.0.1' : host,
    port,
    password,
    username: 'default',

    // Force IPv4 to avoid DNS resolution issues
    family: 4,

    // Connection settings - optimized for high-latency cloud connections
    connectTimeout: REDIS_CONNECT_TIMEOUT,
    commandTimeout: REDIS_COMMAND_TIMEOUT,
    keepAlive: REDIS_KEEP_ALIVE, // Keep connection alive for cloud instances
    maxRetriesPerRequest: 3,
    lazyConnect: false, // Connect immediately for early error detection

    // Robust retry strategy for cloud Redis
    retryStrategy: (times: number) => {
      // Capped exponential backoff: 50ms, 100ms, 150ms, ... up to 2000ms
      const delay = Math.min(times * 50, 2000);
      console.warn(`[REDIS] Retry attempt ${times} in ${delay}ms...`);
      return delay;
    },

    // Reconnect on specific errors
    reconnectOnError: (err: Error) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        // Reconnect when Redis is in READONLY mode (failover)
        return true;
      }
      // For other errors: close connection and reconnect
      return 1;
    },

    // Connection reliability
    enableReadyCheck: true, // Wait for ready before accepting commands
    enableOfflineQueue: true, // Buffer commands during brief disconnections

    // Apply any overrides
    ...overrides,
  };
}

/**
 * Get Redis options specifically for BullMQ
 * BullMQ requires maxRetriesPerRequest: null
 */
export function getBullMQRedisOptions(): RedisOptions {
  return getRedisOptions({
    maxRetriesPerRequest: null, // Required for BullMQ
    enableOfflineQueue: false,
  });
}

/**
 * Create a new Redis connection with proper error handling
 */
export function createRedisConnection(overrides?: Partial<RedisOptions>): Redis {
  const options = getRedisOptions(overrides);
  const client = new Redis(options);

  // Add event listeners
  client.on('connect', () => {
    console.log('[REDIS] Connected successfully');
  });

  client.on('ready', () => {
    console.log('[REDIS] Ready to accept commands');
  });

  client.on('error', (err) => {
    console.warn('[REDIS] Connection error:', err?.message || 'Unknown error');
  });

  client.on('close', () => {
    console.log('[REDIS] Connection closed');
  });

  return client;
}

/**
 * Create a Redis connection for BullMQ
 */
export function createBullMQConnection(): Redis {
  const options = getBullMQRedisOptions();
  return new Redis(options);
}

/**
 * Test Redis connection with timeout
 * Returns true if connected, false otherwise
 */
export async function testRedisConnection(timeoutMs: number = 3000): Promise<boolean> {
  let client: Redis | null = null;

  try {
    client = createRedisConnection();

    // Race between ping and timeout
    const pingPromise = client.ping();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Connection timeout')), timeoutMs)
    );

    const result = await Promise.race([pingPromise, timeoutPromise]);

    if (result === 'PONG') {
      console.log('[REDIS] Connection test passed');
      return true;
    }

    return false;
  } catch (error: any) {
    console.warn('[REDIS] Connection test failed:', error?.message || 'Unknown error');
    return false;
  } finally {
    if (client) {
      try {
        await client.quit();
      } catch {
        // Ignore quit errors
      }
    }
  }
}

/**
 * Check if Redis is configured
 */
export function isRedisConfigured(): boolean {
  const hasUrl = process.env.REDIS_URL && process.env.REDIS_URL.trim() !== '';
  const hasHost = process.env.REDIS_HOST && process.env.REDIS_HOST.trim() !== '';
  return hasUrl || hasHost;
}
