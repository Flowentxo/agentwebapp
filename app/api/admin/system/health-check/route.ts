import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/connection";
import { requireSession } from "@/lib/auth/session";
import { sql } from "drizzle-orm";
import { adminAuditService } from "@/server/services/AdminAuditService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HealthCheckResult {
  service: string;
  status: "healthy" | "degraded" | "unhealthy";
  latency: number;
  message: string;
}

/**
 * POST /api/admin/system/health-check
 * Trigger a comprehensive health check of all services
 * Requires admin role
 */
export async function POST(request: Request) {
  try {
    // Require admin session
    const session = await requireSession({ requireRoles: ['admin'] });

    const results: HealthCheckResult[] = [];
    const startTime = Date.now();

    // 1. Database Health Check
    const dbStart = Date.now();
    try {
      const db = getDb();
      await db.execute(sql`SELECT 1 as health_check`);
      const dbLatency = Date.now() - dbStart;
      results.push({
        service: "database",
        status: dbLatency < 100 ? "healthy" : dbLatency < 500 ? "degraded" : "unhealthy",
        latency: dbLatency,
        message: `PostgreSQL responded in ${dbLatency}ms`,
      });
    } catch (error: any) {
      results.push({
        service: "database",
        status: "unhealthy",
        latency: Date.now() - dbStart,
        message: `Database error: ${error.message}`,
      });
    }

    // 2. Redis/Cache Health Check (using HTTP for Upstash REST API)
    const cacheStart = Date.now();
    try {
      const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

      if (!redisUrl) {
        results.push({
          service: "cache",
          status: "degraded",
          latency: 0,
          message: "Redis not configured",
        });
      } else if (redisUrl.includes('upstash') && redisToken) {
        // Use HTTP ping for Upstash REST API
        try {
          const response = await fetch(`${redisUrl}/ping`, {
            headers: {
              'Authorization': `Bearer ${redisToken}`,
            },
          });
          const cacheLatency = Date.now() - cacheStart;

          if (response.ok) {
            results.push({
              service: "cache",
              status: cacheLatency < 100 ? "healthy" : cacheLatency < 300 ? "degraded" : "unhealthy",
              latency: cacheLatency,
              message: `Redis REST API responded in ${cacheLatency}ms`,
            });
          } else {
            results.push({
              service: "cache",
              status: "degraded",
              latency: cacheLatency,
              message: `Redis REST API error: ${response.status}`,
            });
          }
        } catch (fetchError: any) {
          results.push({
            service: "cache",
            status: "degraded",
            latency: Date.now() - cacheStart,
            message: `Redis connection failed: ${fetchError.message?.substring(0, 30)}`,
          });
        }
      } else {
        // Standard Redis URL configured
        results.push({
          service: "cache",
          status: "healthy",
          latency: 0,
          message: "Redis URL configured",
        });
      }
    } catch (error: any) {
      results.push({
        service: "cache",
        status: "degraded",
        latency: Date.now() - cacheStart,
        message: `Redis error: ${error.message?.substring(0, 50)}`,
      });
    }

    // 3. OpenAI API Check
    const aiStart = Date.now();
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        results.push({
          service: "openai",
          status: "degraded",
          latency: 0,
          message: "OpenAI API key not configured",
        });
      } else {
        // Verify API key format (don't make actual call to save costs)
        const isValidFormat = apiKey.startsWith('sk-') && apiKey.length > 20;
        results.push({
          service: "openai",
          status: isValidFormat ? "healthy" : "degraded",
          latency: Date.now() - aiStart,
          message: isValidFormat ? "API key configured and valid format" : "API key format may be invalid",
        });
      }
    } catch (error: any) {
      results.push({
        service: "openai",
        status: "unhealthy",
        latency: Date.now() - aiStart,
        message: `OpenAI check error: ${error.message}`,
      });
    }

    // 4. Memory/API Check
    const memUsage = process.memoryUsage();
    const heapPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
    results.push({
      service: "api",
      status: heapPercent < 80 ? "healthy" : heapPercent < 90 ? "degraded" : "unhealthy",
      latency: 0,
      message: `Memory usage: ${heapPercent}% (${Math.round(memUsage.heapUsed / 1024 / 1024)}MB)`,
    });

    const totalDuration = Date.now() - startTime;

    // Calculate overall status
    const unhealthyCount = results.filter(r => r.status === "unhealthy").length;
    const degradedCount = results.filter(r => r.status === "degraded").length;

    let overallStatus: "healthy" | "degraded" | "unhealthy";
    if (unhealthyCount > 0) {
      overallStatus = "unhealthy";
    } else if (degradedCount > 0) {
      overallStatus = "degraded";
    } else {
      overallStatus = "healthy";
    }

    // Log the health check
    await adminAuditService.logSystemAction({
      userId: session.userId,
      userEmail: session.user.email,
      action: 'health_check_triggered',
      description: `Manual health check: ${overallStatus} (${results.length} services checked)`,
      metadata: {
        results,
        duration: totalDuration,
        overallStatus,
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      overallStatus,
      results,
      duration: totalDuration,
      timestamp: new Date().toISOString(),
      checkedBy: session.user.email,
    });
  } catch (error: any) {
    console.error("[HEALTH_CHECK]", error);

    if (error.code === 'SESSION_INVALID' || error.code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to perform health check" },
      { status: 500 }
    );
  }
}
