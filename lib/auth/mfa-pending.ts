/**
 * MFA Pending Token Management
 *
 * Manages temporary tokens for the 2FA login flow:
 * 1. User enters correct email/password
 * 2. If MFA is enabled, we create a pending token (not a full session)
 * 3. User is redirected to 2FA verification page
 * 4. Upon successful TOTP verification, the pending token is exchanged for a real session
 *
 * IMPORTANT: This module requires Redis. There is NO in-memory fallback.
 * If Redis is not available, operations will throw an error.
 */

import crypto from 'crypto';
import { createRedisConnection, isRedisConfigured } from '@/lib/redis/connection';
import type Redis from 'ioredis';

// ============================================================================
// Types
// ============================================================================

export interface MfaPendingData {
  userId: string;
  email: string;
  displayName: string;
  remember: boolean;
  next: string;
  ip: string;
  userAgent: string;
  createdAt: number;
}

// ============================================================================
// Configuration
// ============================================================================

const PENDING_TOKEN_PREFIX = 'mfa_pending:';
const PENDING_TOKEN_TTL = 300; // 5 minutes (enough time to enter TOTP)

// Singleton Redis client for MFA pending tokens
let redisClient: Redis | null = null;

/**
 * Get or create the Redis client
 * Throws an error if Redis is not configured or connection fails
 */
function getRedisClient(): Redis {
  if (!isRedisConfigured()) {
    throw new Error('REDIS_NOT_CONFIGURED: MFA requires Redis to be configured. Set REDIS_URL or REDIS_HOST in environment.');
  }

  if (!redisClient) {
    try {
      redisClient = createRedisConnection();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`REDIS_CONNECTION_FAILED: Failed to create Redis connection: ${message}`);
    }
  }

  return redisClient;
}

// ============================================================================
// Token Generation
// ============================================================================

/**
 * Generate a cryptographically secure pending token
 */
function generatePendingToken(): string {
  // Format: mfa_<random>
  const randomBytes = crypto.randomBytes(32);
  return `mfa_${randomBytes.toString('base64url')}`;
}

// ============================================================================
// Store Operations
// ============================================================================

/**
 * Debug info returned when storing a token
 */
export interface MfaStoreDebugInfo {
  generatedToken: string;
  tokenLength: number;
  storedKey: string;
  redisConfigured: boolean;
  redisAvailable: boolean;
  redisConnected: boolean;
  redisWriteResult: 'OK' | 'FAILED' | 'NOT_ATTEMPTED';
  redisError?: string;
  ttlSeconds: number;
  storedAt: string;
  expiresAt: string;
  storageBackend: 'redis';
}

/**
 * Store a pending MFA token with debug info
 * Returns both the token and debug info for troubleshooting
 *
 * @throws Error if Redis is not configured or write fails
 */
export async function storeMfaPendingWithDebug(data: MfaPendingData): Promise<{
  token: string;
  debug: MfaStoreDebugInfo;
}> {
  const token = generatePendingToken();
  const redisKey = `${PENDING_TOKEN_PREFIX}${token}`;
  const now = Date.now();
  const expiresAt = now + PENDING_TOKEN_TTL * 1000;

  // Initialize debug info
  const debug: MfaStoreDebugInfo = {
    generatedToken: token.substring(0, 25) + '...',
    tokenLength: token.length,
    storedKey: redisKey.substring(0, 40) + '...',
    redisConfigured: isRedisConfigured(),
    redisAvailable: false,
    redisConnected: false,
    redisWriteResult: 'NOT_ATTEMPTED',
    ttlSeconds: PENDING_TOKEN_TTL,
    storedAt: new Date(now).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    storageBackend: 'redis',
  };

  // Get Redis client (throws if not configured)
  const redis = getRedisClient();
  debug.redisAvailable = true;

  const dataToStore = {
    ...data,
    createdAt: now,
  };

  try {
    // First check if Redis is actually connected
    const pingResult = await redis.ping();
    debug.redisConnected = pingResult === 'PONG';

    if (pingResult !== 'PONG') {
      throw new Error(`Redis ping failed: ${pingResult}`);
    }

    const writeResult = await redis.setex(
      redisKey,
      PENDING_TOKEN_TTL,
      JSON.stringify(dataToStore)
    );

    if (writeResult !== 'OK') {
      debug.redisWriteResult = 'FAILED';
      debug.redisError = `Unexpected response: ${writeResult}`;
      throw new Error(`REDIS_WRITE_FAILED: Unexpected response from SETEX: ${writeResult}`);
    }

    debug.redisWriteResult = 'OK';

    // Verify the token was stored
    const verifyRead = await redis.get(redisKey);
    if (!verifyRead) {
      throw new Error('REDIS_VERIFY_FAILED: Token was NOT stored in Redis despite OK response!');
    }

  } catch (error) {
    debug.redisWriteResult = 'FAILED';
    debug.redisError = error instanceof Error ? error.message : String(error);
    throw error;
  }

  return { token, debug };
}

/**
 * Store a pending MFA token
 * Returns the token to be sent to the client
 *
 * @throws Error if Redis is not configured or write fails
 */
export async function storeMfaPending(data: MfaPendingData): Promise<string> {
  const { token } = await storeMfaPendingWithDebug(data);
  return token;
}

/**
 * Retrieve and validate a pending MFA token
 * Returns the data if valid, null if expired or not found
 *
 * @throws Error if Redis is not configured
 */
export async function getMfaPending(token: string): Promise<MfaPendingData | null> {
  const redis = getRedisClient();
  const redisKey = `${PENDING_TOKEN_PREFIX}${token}`;

  const data = await redis.get(redisKey);
  if (data) {
    return JSON.parse(data) as MfaPendingData;
  }
  return null;
}

/**
 * Debug metadata returned when consuming a token
 */
export interface MfaConsumeDebugInfo {
  tokenReceived: string;
  tokenLength: number;
  tokenType: string;
  redisConfigured: boolean;
  redisAvailable: boolean;
  redisConnected: boolean;
  attemptedKey: string;
  redisLookupResult: 'FOUND' | 'NOT_FOUND' | 'ERROR';
  redisError?: string;
  currentTime: string;
  finalResult: 'FOUND' | 'NOT_FOUND';
}

/**
 * Consume (delete) a pending MFA token after successful verification
 * Returns both the data and debug info for troubleshooting
 *
 * @throws Error if Redis is not configured
 */
export async function consumeMfaPendingWithDebug(token: string): Promise<{
  data: MfaPendingData | null;
  debug: MfaConsumeDebugInfo;
}> {
  const redisKey = `${PENDING_TOKEN_PREFIX}${token}`;
  const now = Date.now();

  // Initialize debug info
  const debug: MfaConsumeDebugInfo = {
    tokenReceived: token ? `${token.substring(0, 25)}...` : '(empty)',
    tokenLength: token?.length || 0,
    tokenType: typeof token,
    redisConfigured: isRedisConfigured(),
    redisAvailable: false,
    redisConnected: false,
    attemptedKey: redisKey.substring(0, 40) + '...',
    redisLookupResult: 'NOT_FOUND',
    currentTime: new Date(now).toISOString(),
    finalResult: 'NOT_FOUND',
  };

  // Get Redis client (throws if not configured)
  const redis = getRedisClient();
  debug.redisAvailable = true;

  let data: MfaPendingData | null = null;

  try {
    // Check if Redis is actually connected
    const pingResult = await redis.ping();
    debug.redisConnected = pingResult === 'PONG';

    const rawData = await redis.get(redisKey);
    if (rawData) {
      debug.redisLookupResult = 'FOUND';
      debug.finalResult = 'FOUND';
      data = JSON.parse(rawData) as MfaPendingData;

      // Delete the token after successful retrieval
      await redis.del(redisKey);
    } else {
      debug.redisLookupResult = 'NOT_FOUND';
    }
  } catch (error) {
    debug.redisLookupResult = 'ERROR';
    debug.redisError = error instanceof Error ? error.message : String(error);
  }

  return { data, debug };
}

/**
 * Consume (delete) a pending MFA token after successful verification
 *
 * @throws Error if Redis is not configured
 */
export async function consumeMfaPending(token: string): Promise<MfaPendingData | null> {
  const { data } = await consumeMfaPendingWithDebug(token);
  return data;
}
