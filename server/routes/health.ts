/**
 * =============================================================================
 * SINTRA.AI v3 - Health Check Routes
 * =============================================================================
 *
 * Comprehensive health monitoring endpoints:
 * - /api/health - Full system health check
 * - /api/health/live - Kubernetes liveness probe
 * - /api/health/ready - Kubernetes readiness probe
 * - /api/health/deep - Deep health check (all dependencies)
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

const router = Router();

// =============================================================================
// TYPES
// =============================================================================

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      responseTime?: number;
      message?: string;
      details?: Record<string, any>;
    };
  };
}

interface ServiceCheck {
  name: string;
  check: () => Promise<{ status: 'pass' | 'fail' | 'warn'; message?: string; details?: Record<string, any> }>;
}

// =============================================================================
// HEALTH CHECK UTILITIES
// =============================================================================

/**
 * Check PostgreSQL connection
 */
async function checkPostgres(): Promise<{ status: 'pass' | 'fail'; message?: string; details?: Record<string, any> }> {
  const startTime = Date.now();

  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
      max: 1,
    });

    const result = await pool.query('SELECT NOW() as time, current_database() as database');
    await pool.end();

    const responseTime = Date.now() - startTime;

    return {
      status: 'pass',
      message: 'PostgreSQL connection successful',
      details: {
        responseTime: `${responseTime}ms`,
        database: result.rows[0]?.database,
        serverTime: result.rows[0]?.time,
      },
    };
  } catch (error: any) {
    logger.error('[HEALTH] PostgreSQL check failed:', error.message);
    return {
      status: 'fail',
      message: `PostgreSQL connection failed: ${error.message}`,
    };
  }
}

/**
 * Check Redis connection
 */
async function checkRedis(): Promise<{ status: 'pass' | 'fail'; message?: string; details?: Record<string, any> }> {
  const startTime = Date.now();

  try {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      connectTimeout: 5000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });

    await redis.connect();
    const pong = await redis.ping();
    const info = await redis.info('memory');
    await redis.disconnect();

    const responseTime = Date.now() - startTime;

    // Parse memory usage from Redis INFO
    const usedMemoryMatch = info.match(/used_memory_human:(\S+)/);
    const usedMemory = usedMemoryMatch ? usedMemoryMatch[1] : 'unknown';

    return {
      status: 'pass',
      message: 'Redis connection successful',
      details: {
        responseTime: `${responseTime}ms`,
        pong,
        memoryUsage: usedMemory,
      },
    };
  } catch (error: any) {
    logger.error('[HEALTH] Redis check failed:', error.message);
    return {
      status: 'fail',
      message: `Redis connection failed: ${error.message}`,
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): { status: 'pass' | 'warn' | 'fail'; message: string; details: Record<string, any> } {
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
  const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);
  const heapPercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);

  // Warn at 85%, fail at 98% (adjusted for multi-agent system)
  let status: 'pass' | 'warn' | 'fail' = 'pass';
  let message = 'Memory usage normal';

  if (heapPercent >= 98) {
    status = 'fail';
    message = 'Critical memory usage';
  } else if (heapPercent >= 85) {
    status = 'warn';
    message = 'High memory usage';
  }

  return {
    status,
    message,
    details: {
      heapUsed: `${heapUsedMB}MB`,
      heapTotal: `${heapTotalMB}MB`,
      rss: `${rssMB}MB`,
      heapPercent: `${heapPercent}%`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
    },
  };
}

/**
 * Check disk space (if available)
 */
function checkDisk(): { status: 'pass' | 'warn'; message: string; details?: Record<string, any> } {
  // Note: Proper disk check requires additional packages
  // This is a placeholder that always passes
  return {
    status: 'pass',
    message: 'Disk check not implemented in container',
    details: {
      note: 'Use container orchestrator for disk monitoring',
    },
  };
}

// =============================================================================
// HEALTH CHECK ROUTES
// =============================================================================

/**
 * GET /api/health
 * Main health check endpoint
 */
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();

  const checks: HealthStatus['checks'] = {};

  // Memory check (sync)
  const memoryCheck = checkMemory();
  checks['memory'] = memoryCheck;

  // Database check
  const dbCheck = await checkPostgres();
  checks['database'] = {
    ...dbCheck,
    responseTime: Date.now() - startTime,
  };

  // Redis check
  const redisStart = Date.now();
  const redisCheck = await checkRedis();
  checks['redis'] = {
    ...redisCheck,
    responseTime: Date.now() - redisStart,
  };

  // Determine overall status
  const hasFailure = Object.values(checks).some((c) => c.status === 'fail');
  const hasWarning = Object.values(checks).some((c) => c.status === 'warn');

  const overallStatus: HealthStatus['status'] = hasFailure
    ? 'unhealthy'
    : hasWarning
    ? 'degraded'
    : 'healthy';

  const response: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || '3.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks,
  };

  // Set appropriate status code
  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  res.status(statusCode).json(response);
});

/**
 * GET /api/health/live
 * Kubernetes liveness probe - Is the process running?
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

/**
 * GET /api/health/ready
 * Kubernetes readiness probe - Is the service ready to accept traffic?
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Quick database check
    const dbCheck = await checkPostgres();

    if (dbCheck.status === 'fail') {
      return res.status(503).json({
        status: 'not_ready',
        reason: 'Database not available',
        timestamp: new Date().toISOString(),
      });
    }

    // Quick Redis check
    const redisCheck = await checkRedis();

    if (redisCheck.status === 'fail') {
      return res.status(503).json({
        status: 'not_ready',
        reason: 'Redis not available',
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[HEALTH] Readiness check failed:', error.message);
    res.status(503).json({
      status: 'not_ready',
      reason: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/health/deep
 * Deep health check - All dependencies with detailed info
 */
router.get('/deep', async (req: Request, res: Response) => {
  const startTime = Date.now();

  // Run all checks in parallel
  const [dbCheck, redisCheck] = await Promise.all([
    checkPostgres(),
    checkRedis(),
  ]);

  const memoryCheck = checkMemory();
  const diskCheck = checkDisk();

  const checks: HealthStatus['checks'] = {
    memory: memoryCheck,
    disk: diskCheck,
    database: dbCheck,
    redis: redisCheck,
    process: {
      status: 'pass',
      message: 'Process info',
      details: {
        pid: process.pid,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        uptime: `${Math.floor(process.uptime())}s`,
        cpuUsage: process.cpuUsage(),
      },
    },
    environment: {
      status: 'pass',
      message: 'Environment variables',
      details: {
        NODE_ENV: process.env.NODE_ENV,
        hasOpenAI: !!process.env.OPENAI_API_KEY,
        hasDatabase: !!process.env.DATABASE_URL,
        hasRedis: !!process.env.REDIS_URL,
        hasJWT: !!process.env.JWT_SECRET,
      },
    },
  };

  // Determine overall status
  const hasFailure = Object.values(checks).some((c) => c.status === 'fail');
  const hasWarning = Object.values(checks).some((c) => c.status === 'warn');

  const overallStatus: HealthStatus['status'] = hasFailure
    ? 'unhealthy'
    : hasWarning
    ? 'degraded'
    : 'healthy';

  const totalTime = Date.now() - startTime;

  const response: HealthStatus & { totalCheckTime: string } = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || '3.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks,
    totalCheckTime: `${totalTime}ms`,
  };

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  res.status(statusCode).json(response);
});

/**
 * GET /api/health/metrics
 * Prometheus-compatible metrics endpoint
 */
router.get('/metrics', (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  const metrics = [
    `# HELP nodejs_process_uptime_seconds Process uptime in seconds`,
    `# TYPE nodejs_process_uptime_seconds gauge`,
    `nodejs_process_uptime_seconds ${uptime}`,
    '',
    `# HELP nodejs_heap_size_total_bytes Total heap size in bytes`,
    `# TYPE nodejs_heap_size_total_bytes gauge`,
    `nodejs_heap_size_total_bytes ${memoryUsage.heapTotal}`,
    '',
    `# HELP nodejs_heap_size_used_bytes Used heap size in bytes`,
    `# TYPE nodejs_heap_size_used_bytes gauge`,
    `nodejs_heap_size_used_bytes ${memoryUsage.heapUsed}`,
    '',
    `# HELP nodejs_external_memory_bytes External memory usage in bytes`,
    `# TYPE nodejs_external_memory_bytes gauge`,
    `nodejs_external_memory_bytes ${memoryUsage.external}`,
    '',
    `# HELP nodejs_rss_bytes Resident Set Size in bytes`,
    `# TYPE nodejs_rss_bytes gauge`,
    `nodejs_rss_bytes ${memoryUsage.rss}`,
    '',
  ].join('\n');

  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(metrics);
});

export default router;
