export const runtime = "nodejs";
import { withBrainSecurity } from '@/lib/brain/security/SecurityMiddleware';

/**
 * GET /api/health
 * Enhanced health check with real connectivity tests and system metrics
 * SECURITY: Protected endpoint with optional detailed health checks
 */
async function healthHandler(request: any) {
  const securityContext = request.context;
  console.log(`[HEALTH] Request from user: ${securityContext?.userId || 'anonymous'}`);
  
  // Basic health check - allow anonymous access for simple status
  // Detailed health checks require authentication
  const isDetailedCheck = request.headers.get('x-detailed-health') === 'true';
  
  if (isDetailedCheck && !securityContext?.authenticated) {
    return new Response(
      JSON.stringify({
        error: 'Unauthorized',
        message: 'Detailed health checks require authentication. Use X-Detailed-Health: false for basic status.',
        code: 'AUTH_REQUIRED'
      }, null, 2),
      {
        status: 401,
        headers: { "content-type": "application/json; charset=utf-8" },
      }
    );
  }

  const startTime = Date.now();
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();

  const health = {
    ok: true,
    ts: Date.now(),
    responseTime: 0,
    authenticated: securityContext?.authenticated || false,
    userId: securityContext?.userId || null,
    system: {
      status: "operational",
      uptime: Math.floor(uptime),
      uptimeFormatted: formatUptime(uptime),
      cpu: {
        usage: process.cpuUsage(),
        cores: process.env.NUMBER_OF_PROCESSORS || 4,
      },
      memory: {
        used: Math.floor(memUsage.heapUsed / 1024 / 1024),
        total: Math.floor(memUsage.heapTotal / 1024 / 1024),
        percentage: Math.floor((memUsage.heapUsed / memUsage.heapTotal) * 100),
      },
    },
    services: {
      api: { status: "healthy", latency: 0 },
      database: { status: "unknown", latency: 0, details: {} },
      redis: { status: "unknown", latency: 0, details: {} },
      openai: { status: "unknown", latency: 0, details: {} },
      storage: { status: "unknown", latency: 0, details: {} },
    },
    overall: {
      status: "healthy",
      healthyServices: 0,
      totalServices: 0,
      criticalIssues: [],
    },
  };

  // Only perform detailed checks if authenticated or explicitly requested
  if (securityContext?.authenticated || isDetailedCheck) {
    // Test database connectivity
    try {
      const dbStart = Date.now();
      const { getDb } = await import('@/lib/db');
      const { sql } = await import('drizzle-orm');
      
      const db = getDb();
      const result = await db.execute(sql`SELECT NOW() as current_time`);
      const dbLatency = Date.now() - dbStart;
      
      health.services.database = {
        status: "healthy",
        latency: dbLatency,
        details: {
          connected: true,
          currentTime: result.rows[0]?.current_time,
          version: "PostgreSQL with pgvector"
        }
      };
    } catch (error: any) {
      health.services.database = {
        status: "unhealthy",
        latency: 0,
        details: {
          error: error.message,
          connected: false
        }
      };
      health.ok = false;
      health.overall.criticalIssues.push(`Database connection failed: ${error.message}`);
    }

    // Test Redis connectivity
    try {
      const redisStart = Date.now();
      const { createClient } = await import('redis');
      
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const redis = createClient({ url: redisUrl });
      await redis.connect();
      
      const redisLatency = Date.now() - redisStart;
      const pingResult = await redis.ping();
      const info = await redis.info('server');
      
      await redis.disconnect();
      
      health.services.redis = {
        status: pingResult === 'PONG' ? "healthy" : "degraded",
        latency: redisLatency,
        details: {
          connected: true,
          ping: pingResult,
          version: info.match(/redis_version:(.+)/)?.[1] || 'unknown'
        }
      };
    } catch (error: any) {
      health.services.redis = {
        status: "unhealthy",
        latency: 0,
        details: {
          error: error.message,
          connected: false
        }
      };
      health.ok = false;
      health.overall.criticalIssues.push(`Redis connection failed: ${error.message}`);
    }

    // Test OpenAI API connectivity
    try {
      const openaiStart = Date.now();
      const OpenAI = await import('openai');
      
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        health.services.openai = {
          status: "not-configured",
          latency: 0,
          details: {
            configured: false,
            message: "OpenAI API key not configured"
          }
        };
      } else {
        const openai = new OpenAI.default({ apiKey });
        const models = await openai.models.list();
        const openaiLatency = Date.now() - openaiStart;
        
        health.services.openai = {
          status: models.data && models.data.length > 0 ? "healthy" : "degraded",
          latency: openaiLatency,
          details: {
            configured: true,
            modelsCount: models.data.length,
            sampleModels: models.data.slice(0, 3).map(m => m.id)
          }
        };
      }
    } catch (error: any) {
      health.services.openai = {
        status: "unhealthy",
        latency: 0,
        details: {
          configured: !!process.env.OPENAI_API_KEY,
          error: error.message
        }
      };
      health.ok = false;
      health.overall.criticalIssues.push(`OpenAI API test failed: ${error.message}`);
    }
  } else {
    // Basic health check - minimal information
    health.services = {
      api: { status: "healthy", latency: 0, basic: true },
      database: { status: "unknown", basic: true },
      redis: { status: "unknown", basic: true },
      openai: { status: "unknown", basic: true },
      storage: { status: "unknown", basic: true },
    };
  }

  // Calculate overall status
  const serviceStatuses = Object.values(health.services).map(s => s.status);
  const healthyCount = serviceStatuses.filter(s => s === 'healthy').length;
  const totalServices = serviceStatuses.length;
  
  health.overall.healthyServices = healthyCount;
  health.overall.totalServices = totalServices;
  
  if (serviceStatuses.includes('unhealthy') || serviceStatuses.includes('not-configured')) {
    health.overall.status = 'degraded';
    if (serviceStatuses.includes('unhealthy')) {
      health.ok = false;
    }
  }

  health.services.api.latency = Date.now() - startTime;
  health.responseTime = Date.now() - startTime;

  const statusCode = health.ok ? 200 : (health.overall.status === 'degraded' ? 200 : 503);

  return new Response(
    JSON.stringify(health, null, 2),
    {
      status: statusCode,
      headers: { "content-type": "application/json; charset=utf-8" },
    }
  );
}

// Wrap with security middleware - allow basic health checks without auth
const securedHandler = withBrainSecurity(healthHandler, {
  requireAuth: false, // Allow basic health checks
  skipRateLimit: true, // Don't rate limit health checks
  skipAudit: true // Don't audit health checks
});

export { securedHandler as GET };

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
