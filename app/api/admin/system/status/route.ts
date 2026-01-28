import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/connection";
import { requireSession } from "@/lib/auth/session";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  latency: number;
  lastCheck: string;
  details?: string;
}

/**
 * Check database connectivity and response time
 */
async function checkDatabase(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const db = getDb();
    await db.execute(sql`SELECT 1 as health_check`);
    const latency = Date.now() - start;

    return {
      name: "database",
      status: latency < 100 ? "healthy" : latency < 500 ? "degraded" : "unhealthy",
      latency,
      lastCheck: new Date().toISOString(),
      details: `PostgreSQL response: ${latency}ms`,
    };
  } catch (error: any) {
    return {
      name: "database",
      status: "unhealthy",
      latency: Date.now() - start,
      lastCheck: new Date().toISOString(),
      details: `Error: ${error.message}`,
    };
  }
}

/**
 * Check Redis/cache connectivity
 * Note: Uses environment variable check only - no external package dependency
 */
async function checkCache(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    // Check if Redis is configured via environment variables
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl) {
      return {
        name: "cache",
        status: "degraded",
        latency: 0,
        lastCheck: new Date().toISOString(),
        details: "Redis not configured",
      };
    }

    // For Upstash Redis REST API, we can do a simple HTTP ping
    if (redisUrl.includes('upstash') && redisToken) {
      try {
        const response = await fetch(`${redisUrl}/ping`, {
          headers: {
            'Authorization': `Bearer ${redisToken}`,
          },
        });
        const latency = Date.now() - start;

        if (response.ok) {
          return {
            name: "cache",
            status: latency < 100 ? "healthy" : latency < 300 ? "degraded" : "unhealthy",
            latency,
            lastCheck: new Date().toISOString(),
            details: `Redis REST API response: ${latency}ms`,
          };
        } else {
          return {
            name: "cache",
            status: "degraded",
            latency,
            lastCheck: new Date().toISOString(),
            details: `Redis REST API error: ${response.status}`,
          };
        }
      } catch (fetchError: any) {
        return {
          name: "cache",
          status: "degraded",
          latency: Date.now() - start,
          lastCheck: new Date().toISOString(),
          details: `Redis connection failed: ${fetchError.message?.substring(0, 30)}`,
        };
      }
    }

    // For standard Redis URL, just report as configured
    return {
      name: "cache",
      status: "healthy",
      latency: 0,
      lastCheck: new Date().toISOString(),
      details: "Redis URL configured",
    };
  } catch (error: any) {
    return {
      name: "cache",
      status: "degraded",
      latency: Date.now() - start,
      lastCheck: new Date().toISOString(),
      details: `Redis check error: ${error.message?.substring(0, 50)}`,
    };
  }
}

/**
 * Check API health (self-check)
 */
async function checkAPI(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    // Simple self-check
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const heapPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

    const latency = Date.now() - start;

    return {
      name: "api",
      status: heapPercent < 80 ? "healthy" : heapPercent < 90 ? "degraded" : "unhealthy",
      latency,
      lastCheck: new Date().toISOString(),
      details: `Memory: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercent}%)`,
    };
  } catch (error: any) {
    return {
      name: "api",
      status: "unhealthy",
      latency: Date.now() - start,
      lastCheck: new Date().toISOString(),
      details: `Error: ${error.message}`,
    };
  }
}

/**
 * Check OpenAI API health
 */
async function checkOpenAI(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        name: "openai",
        status: "degraded",
        latency: 0,
        lastCheck: new Date().toISOString(),
        details: "API key not configured",
      };
    }

    // Don't make actual API call, just verify config
    const latency = Date.now() - start;
    return {
      name: "openai",
      status: "healthy",
      latency,
      lastCheck: new Date().toISOString(),
      details: "API key configured",
    };
  } catch (error: any) {
    return {
      name: "openai",
      status: "unhealthy",
      latency: Date.now() - start,
      lastCheck: new Date().toISOString(),
      details: `Error: ${error.message}`,
    };
  }
}

const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

/**
 * GET /api/admin/system/status
 * Real system health status for enterprise admin panel
 * Requires admin role
 */
export async function GET(request: Request) {
  try {
    // Require admin session
    await requireSession({ requireRoles: ['admin'] });

    const uptime = process.uptime();

    // Run all health checks in parallel
    const [apiHealth, dbHealth, cacheHealth, openaiHealth] = await Promise.all([
      checkAPI(),
      checkDatabase(),
      checkCache(),
      checkOpenAI(),
    ]);

    const services = [apiHealth, dbHealth, cacheHealth, openaiHealth];

    // Calculate overall status
    const unhealthyCount = services.filter(s => s.status === "unhealthy").length;
    const degradedCount = services.filter(s => s.status === "degraded").length;

    let overallStatus: "healthy" | "degraded" | "unhealthy";
    if (unhealthyCount > 0) {
      overallStatus = "unhealthy";
    } else if (degradedCount > 0) {
      overallStatus = "degraded";
    } else {
      overallStatus = "healthy";
    }

    // System info
    const memUsage = process.memoryUsage();
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
      },
      cpuUsage: process.cpuUsage(),
    };

    return NextResponse.json({
      status: overallStatus,
      uptime: Math.floor(uptime),
      uptimeFormatted: formatUptime(uptime),
      services,
      systemInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[SYSTEM_STATUS]", error);

    if (error.code === 'SESSION_INVALID' || error.code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch system status" },
      { status: 500 }
    );
  }
}
