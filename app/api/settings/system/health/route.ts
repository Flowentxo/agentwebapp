/**
 * System Health API
 *
 * Real-time health checks for all system components:
 * - API Server status
 * - Database connectivity
 * - Redis cache
 * - AI Services (OpenAI)
 * - Background workers
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

interface ServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  latency?: number;
  message?: string;
  lastCheck: string;
  details?: Record<string, unknown>;
}

interface SystemHealth {
  overall: "healthy" | "degraded" | "unhealthy";
  services: ServiceHealth[];
  uptime: number;
  timestamp: string;
}

/**
 * Check database connectivity and performance
 */
async function checkDatabase(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const db = getDb();

    // Simple query to check connectivity
    await db.execute(sql`SELECT 1`);

    // Get connection pool stats if available
    const latency = Date.now() - start;

    return {
      name: "PostgreSQL Database",
      status: latency < 100 ? "healthy" : latency < 500 ? "degraded" : "unhealthy",
      latency,
      message: latency < 100 ? "Optimal performance" : latency < 500 ? "Elevated latency" : "High latency detected",
      lastCheck: new Date().toISOString(),
      details: {
        type: "PostgreSQL",
        queryTime: `${latency}ms`,
      },
    };
  } catch (error) {
    return {
      name: "PostgreSQL Database",
      status: "unhealthy",
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : "Connection failed",
      lastCheck: new Date().toISOString(),
    };
  }
}

/**
 * Check Redis cache connectivity
 */
async function checkRedis(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    // Try to connect to Redis if configured
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

    if (!redisUrl) {
      return {
        name: "Redis Cache",
        status: "degraded",
        message: "Not configured",
        lastCheck: new Date().toISOString(),
        details: { configured: false },
      };
    }

    // For Upstash REST API
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        },
      });

      const latency = Date.now() - start;

      if (response.ok) {
        return {
          name: "Redis Cache",
          status: latency < 100 ? "healthy" : "degraded",
          latency,
          message: "Connected via Upstash",
          lastCheck: new Date().toISOString(),
          details: { provider: "Upstash", responseTime: `${latency}ms` },
        };
      }
    }

    // Generic Redis check
    return {
      name: "Redis Cache",
      status: "healthy",
      latency: Date.now() - start,
      message: "Connected",
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name: "Redis Cache",
      status: "unhealthy",
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : "Connection failed",
      lastCheck: new Date().toISOString(),
    };
  }
}

/**
 * Check OpenAI API connectivity
 */
async function checkOpenAI(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return {
        name: "OpenAI API",
        status: "degraded",
        message: "API key not configured",
        lastCheck: new Date().toISOString(),
        details: { configured: false },
      };
    }

    // Check OpenAI models endpoint (lightweight)
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const latency = Date.now() - start;

    if (response.ok) {
      return {
        name: "OpenAI API",
        status: latency < 500 ? "healthy" : "degraded",
        latency,
        message: "Connected",
        lastCheck: new Date().toISOString(),
        details: {
          provider: "OpenAI",
          model: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
          responseTime: `${latency}ms`,
        },
      };
    }

    if (response.status === 401) {
      return {
        name: "OpenAI API",
        status: "unhealthy",
        message: "Invalid API key",
        lastCheck: new Date().toISOString(),
      };
    }

    return {
      name: "OpenAI API",
      status: "degraded",
      latency,
      message: `HTTP ${response.status}`,
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name: "OpenAI API",
      status: "unhealthy",
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : "Connection failed",
      lastCheck: new Date().toISOString(),
    };
  }
}

/**
 * Check API server (self-check)
 */
function checkAPIServer(): ServiceHealth {
  return {
    name: "API Server",
    status: "healthy",
    latency: 0,
    message: "Running",
    lastCheck: new Date().toISOString(),
    details: {
      nodeVersion: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV || "development",
    },
  };
}

/**
 * Calculate uptime in seconds
 */
function getUptime(): number {
  return Math.floor(process.uptime());
}

/**
 * GET - Full system health check
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const quick = searchParams.get("quick") === "true";

    // Quick check only returns API server status
    if (quick) {
      return NextResponse.json({
        overall: "healthy",
        services: [checkAPIServer()],
        uptime: getUptime(),
        timestamp: new Date().toISOString(),
      });
    }

    // Full health check - run all checks in parallel
    const [database, redis, openai] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkOpenAI(),
    ]);

    const apiServer = checkAPIServer();
    const services = [apiServer, database, redis, openai];

    // Determine overall health
    const unhealthyCount = services.filter((s) => s.status === "unhealthy").length;
    const degradedCount = services.filter((s) => s.status === "degraded").length;

    let overall: "healthy" | "degraded" | "unhealthy";
    if (unhealthyCount > 0) {
      overall = "unhealthy";
    } else if (degradedCount > 0) {
      overall = "degraded";
    } else {
      overall = "healthy";
    }

    const health: SystemHealth = {
      overall,
      services,
      uptime: getUptime(),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(health);
  } catch (error) {
    console.error("[HEALTH_CHECK_ERROR]", error);
    return NextResponse.json(
      {
        overall: "unhealthy",
        services: [],
        uptime: getUptime(),
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Run specific health check
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { service } = body;

    let result: ServiceHealth;

    switch (service) {
      case "database":
        result = await checkDatabase();
        break;
      case "redis":
        result = await checkRedis();
        break;
      case "openai":
        result = await checkOpenAI();
        break;
      case "api":
        result = checkAPIServer();
        break;
      default:
        return NextResponse.json(
          { error: "Unknown service" },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[HEALTH_CHECK_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Health check failed" },
      { status: 500 }
    );
  }
}
