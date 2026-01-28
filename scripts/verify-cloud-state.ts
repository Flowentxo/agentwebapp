#!/usr/bin/env npx tsx
/**
 * Cloud State Verification Script
 *
 * Verifies that data has been successfully migrated to cloud infrastructure.
 * Checks both PostgreSQL (DATABASE_URL) and Redis (REDIS_URL) connections.
 *
 * Usage: npx tsx scripts/verify-cloud-state.ts
 */

import { Pool } from 'pg';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

// ============================================================================
// Configuration
// ============================================================================

const EXPECTED_BRAIN_MEMORIES_MIN = 50; // Warn if less than this
const CONNECTION_TIMEOUT = 10000; // 10 seconds

// ============================================================================
// Styling helpers
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string): void {
  console.log(message);
}

function logSuccess(message: string): void {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logWarning(message: string): void {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function logError(message: string): void {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logInfo(message: string): void {
  console.log(`${colors.cyan}ℹ️  ${message}${colors.reset}`);
}

function logHeader(message: string): void {
  console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}   ${message}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}\n`);
}

function logLoudWarning(message: string): void {
  console.log(`\n${colors.bright}${colors.red}!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!${colors.reset}`);
  console.log(`${colors.bright}${colors.red}   ⚠️  WARNING: ${message}${colors.reset}`);
  console.log(`${colors.bright}${colors.red}!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!${colors.reset}\n`);
}

function logLoudSuccess(message: string): void {
  console.log(`\n${colors.bright}${colors.green}************************************************************${colors.reset}`);
  console.log(`${colors.bright}${colors.green}   ✅ ${message}${colors.reset}`);
  console.log(`${colors.bright}${colors.green}************************************************************${colors.reset}\n`);
}

// ============================================================================
// Redis URL Parser
// ============================================================================

function parseRedisUrl(url: string): { host: string; port: number; password?: string; useTls: boolean; username?: string } {
  try {
    const cleanUrl = url.replace(/^['"]|['"]$/g, '');
    const useTls = cleanUrl.startsWith('rediss://');
    const urlObj = new URL(cleanUrl);

    return {
      host: urlObj.hostname || 'localhost',
      port: parseInt(urlObj.port) || 6379,
      password: urlObj.password || undefined,
      username: urlObj.username || 'default',
      useTls,
    };
  } catch {
    return { host: 'localhost', port: 6379, useTls: false };
  }
}

// ============================================================================
// Database Checks
// ============================================================================

interface DbCheckResult {
  success: boolean;
  agentCount: number;
  brainMemoriesCount: number;
  customAgentCount: number;
  dexterExists: boolean;
  latencyMs: number;
  error?: string;
}

async function checkDatabase(): Promise<DbCheckResult> {
  const startTime = Date.now();
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return {
      success: false,
      agentCount: 0,
      brainMemoriesCount: 0,
      customAgentCount: 0,
      dexterExists: false,
      latencyMs: 0,
      error: 'DATABASE_URL is not set',
    };
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: CONNECTION_TIMEOUT,
    max: 1,
  });

  try {
    const client = await pool.connect();

    // Check brain_memories count
    let brainMemoriesCount = 0;
    try {
      const result = await client.query('SELECT COUNT(*) as count FROM brain_memories');
      brainMemoriesCount = parseInt(result.rows[0]?.count || '0', 10);
    } catch (e: any) {
      if (!e.message?.includes('does not exist')) {
        throw e;
      }
    }

    // Check agent_conversations count (as proxy for agent activity)
    let agentCount = 0;
    try {
      const result = await client.query('SELECT COUNT(DISTINCT agent_id) as count FROM agent_conversations');
      agentCount = parseInt(result.rows[0]?.count || '0', 10);
    } catch (e: any) {
      if (!e.message?.includes('does not exist')) {
        throw e;
      }
    }

    // Check custom_agents count
    let customAgentCount = 0;
    try {
      const result = await client.query('SELECT COUNT(*) as count FROM custom_agents');
      customAgentCount = parseInt(result.rows[0]?.count || '0', 10);
    } catch (e: any) {
      if (!e.message?.includes('does not exist')) {
        throw e;
      }
    }

    // Check if Dexter exists in brain_memories or custom_agents
    let dexterExists = false;
    try {
      // Check in brain_memories
      const brainResult = await client.query(
        "SELECT COUNT(*) as count FROM brain_memories WHERE agent_id ILIKE '%dexter%'"
      );
      if (parseInt(brainResult.rows[0]?.count || '0', 10) > 0) {
        dexterExists = true;
      }
    } catch {
      // Table might not exist
    }

    if (!dexterExists) {
      try {
        // Check in custom_agents
        const agentResult = await client.query(
          "SELECT COUNT(*) as count FROM custom_agents WHERE name ILIKE '%dexter%'"
        );
        if (parseInt(agentResult.rows[0]?.count || '0', 10) > 0) {
          dexterExists = true;
        }
      } catch {
        // Table might not exist
      }
    }

    client.release();
    await pool.end();

    return {
      success: true,
      agentCount,
      brainMemoriesCount,
      customAgentCount,
      dexterExists,
      latencyMs: Date.now() - startTime,
    };
  } catch (error: any) {
    try {
      await pool.end();
    } catch {}

    return {
      success: false,
      agentCount: 0,
      brainMemoriesCount: 0,
      customAgentCount: 0,
      dexterExists: false,
      latencyMs: Date.now() - startTime,
      error: error.message,
    };
  }
}

// ============================================================================
// Redis Checks
// ============================================================================

interface RedisCheckResult {
  success: boolean;
  pingResult: string;
  keyCount: number;
  brainKeyCount: number;
  latencyMs: number;
  useTls: boolean;
  error?: string;
}

async function tryRedisConnection(parsed: ReturnType<typeof parseRedisUrl>, useTls: boolean): Promise<RedisCheckResult> {
  const startTime = Date.now();

  const client = new Redis({
    host: parsed.host,
    port: parsed.port,
    password: parsed.password,
    username: parsed.username,
    ...(useTls ? {
      tls: {
        rejectUnauthorized: false,
      },
    } : {}),
    connectTimeout: CONNECTION_TIMEOUT,
    commandTimeout: 5000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // Don't retry
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  try {
    // Manually connect first
    await client.connect();

    // Test ping with timeout
    const pingPromise = client.ping();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Ping timeout')), 5000)
    );
    const pingResult = await Promise.race([pingPromise, timeoutPromise]) as string;

    // Count keys (with limit)
    let keyCount = 0;
    let brainKeyCount = 0;

    try {
      const keys = await client.keys('*');
      keyCount = keys.length;
    } catch {
      // KEYS might be disabled on some Redis Cloud instances
    }

    try {
      const brainKeys = await client.keys('brain:*');
      brainKeyCount = brainKeys.length;
    } catch {
      // KEYS might be disabled
    }

    await client.quit();

    return {
      success: true,
      pingResult,
      keyCount,
      brainKeyCount,
      latencyMs: Date.now() - startTime,
      useTls,
    };
  } catch (error: any) {
    try {
      await client.quit();
    } catch {}

    return {
      success: false,
      pingResult: '',
      keyCount: 0,
      brainKeyCount: 0,
      latencyMs: Date.now() - startTime,
      useTls,
      error: error.message,
    };
  }
}

async function checkRedis(): Promise<RedisCheckResult> {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    return {
      success: false,
      pingResult: '',
      keyCount: 0,
      brainKeyCount: 0,
      latencyMs: 0,
      useTls: false,
      error: 'REDIS_URL is not set',
    };
  }

  const parsed = parseRedisUrl(redisUrl);

  // Detect if this is a cloud provider that typically requires TLS
  const isCloudProvider = parsed.host.includes('redislabs.com') ||
    parsed.host.includes('redis.cloud') ||
    parsed.host.includes('upstash') ||
    parsed.host.includes('redis-cloud');

  // Try with TLS first if URL specifies rediss:// or it's a cloud provider
  if (parsed.useTls) {
    return tryRedisConnection(parsed, true);
  }

  if (isCloudProvider) {
    // Cloud provider but no rediss:// - try TLS first, then non-TLS
    logInfo('Detected Redis Cloud provider, trying TLS connection first...');
    const tlsResult = await tryRedisConnection(parsed, true);
    if (tlsResult.success) {
      logInfo('TLS connection successful! Consider updating REDIS_URL to use rediss://');
      return tlsResult;
    }

    // TLS failed, try without
    logInfo('TLS failed, trying non-TLS connection...');
    return tryRedisConnection(parsed, false);
  }

  // Not a cloud provider, try without TLS
  return tryRedisConnection(parsed, false);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  logHeader('CLOUD STATE VERIFICATION');

  log('Checking environment configuration...\n');

  const databaseUrl = process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL;

  // Environment check
  log('📋 Environment Variables:');
  if (databaseUrl) {
    // Mask the password
    const maskedDbUrl = databaseUrl.replace(/:([^@]+)@/, ':***@');
    logInfo(`DATABASE_URL: ${maskedDbUrl}`);
  } else {
    logError('DATABASE_URL: NOT SET');
  }

  if (redisUrl) {
    const maskedRedisUrl = redisUrl.replace(/:([^@]+)@/, ':***@');
    logInfo(`REDIS_URL: ${maskedRedisUrl}`);
  } else {
    logError('REDIS_URL: NOT SET');
  }

  console.log('');

  // Track overall status
  let hasErrors = false;
  let hasWarnings = false;

  // ================================
  // Database Check
  // ================================
  logHeader('DATABASE CHECK');

  if (!databaseUrl) {
    logError('Cannot check database - DATABASE_URL not configured');
    hasErrors = true;
  } else {
    log('Connecting to PostgreSQL...');
    const dbResult = await checkDatabase();

    if (dbResult.success) {
      logSuccess(`Connected to database (${dbResult.latencyMs}ms)`);
      console.log('');

      log('📊 Database Statistics:');
      log(`   • Brain Memories: ${dbResult.brainMemoriesCount}`);
      log(`   • Custom Agents: ${dbResult.customAgentCount}`);
      log(`   • Active Agent Conversations: ${dbResult.agentCount}`);
      log(`   • Dexter Agent Found: ${dbResult.dexterExists ? 'YES' : 'NO'}`);
      console.log('');

      // Validate data
      if (dbResult.brainMemoriesCount === 0) {
        logLoudWarning('DATABASE IS EMPTY! No brain memories found.');
        logError('The database appears to have no data migrated.');
        hasErrors = true;
      } else if (dbResult.brainMemoriesCount < EXPECTED_BRAIN_MEMORIES_MIN) {
        logWarning(`Brain memories count (${dbResult.brainMemoriesCount}) is below expected (${EXPECTED_BRAIN_MEMORIES_MIN})`);
        hasWarnings = true;
      } else {
        logSuccess(`Brain memories: ${dbResult.brainMemoriesCount} records`);
      }

      if (!dbResult.dexterExists) {
        logWarning('Dexter agent not found in database');
        hasWarnings = true;
      } else {
        logSuccess('Dexter agent exists');
      }
    } else {
      logError(`Database connection failed: ${dbResult.error}`);
      hasErrors = true;
    }
  }

  // ================================
  // Redis Check
  // ================================
  logHeader('REDIS CHECK');

  if (!redisUrl) {
    logWarning('REDIS_URL not configured - Redis cache disabled');
    logInfo('The system will work without Redis but with reduced performance');
    hasWarnings = true;
  } else {
    log('Connecting to Redis...');
    const redisResult = await checkRedis();

    if (redisResult.success) {
      logSuccess(`Connected to Redis (${redisResult.latencyMs}ms)`);
      log(`   • TLS Enabled: ${redisResult.useTls ? 'YES' : 'NO'}`);
      log(`   • Ping Result: ${redisResult.pingResult}`);

      if (redisResult.keyCount > 0) {
        log(`   • Total Keys: ${redisResult.keyCount}`);
        log(`   • Brain Keys: ${redisResult.brainKeyCount}`);
      } else {
        logInfo('Key count unavailable (KEYS command may be restricted)');
      }
      console.log('');
      logSuccess('Redis is operational');
    } else {
      logError(`Redis connection failed: ${redisResult.error}`);

      if (redisResult.error?.includes('NOAUTH') || redisResult.error?.includes('authentication')) {
        logInfo('Hint: Check REDIS_URL password is correct');
      } else if (redisResult.error?.includes('certificate') || redisResult.error?.includes('TLS')) {
        logInfo('Hint: For Redis Cloud, use rediss:// (with double s) for TLS');
      } else if (redisResult.error?.includes('timeout')) {
        logInfo('Hint: Check network connectivity to Redis Cloud');
      }
      hasErrors = true;
    }
  }

  // ================================
  // Final Summary
  // ================================
  logHeader('VERIFICATION SUMMARY');

  if (hasErrors) {
    logLoudWarning('CLOUD STATE VERIFICATION FAILED');
    log('\nAction Required:');
    log('1. Check that DATABASE_URL points to your cloud PostgreSQL instance');
    log('2. Verify data has been migrated from local Docker to cloud');
    log('3. Ensure REDIS_URL is correctly configured for Redis Cloud');
    log('4. Run migrations if tables are missing: npx drizzle-kit push');
    process.exit(1);
  } else if (hasWarnings) {
    logWarning('CLOUD STATE VERIFICATION PASSED WITH WARNINGS');
    log('\nThe system is operational but some data may be missing.');
    log('Review the warnings above and take action if needed.');
    process.exit(0);
  } else {
    logLoudSuccess('SYSTEM READY FOR CLOUD OPERATION');
    log('All checks passed. Your brain has been successfully transplanted to the cloud! 🧠☁️\n');
    process.exit(0);
  }
}

// Run the verification
main().catch((error) => {
  logError(`Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
