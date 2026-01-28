/**
 * Performance Monitoring API
 *
 * Endpoints:
 * GET - Get performance metrics and system health
 */

import { NextRequest, NextResponse } from "next/server";
import { performanceTracker } from "@/lib/monitoring/performance-tracker";

/**
 * GET - Get performance data
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "overview";
    const type = searchParams.get("type") || undefined;
    const period = parseInt(searchParams.get("period") || "60");

    switch (view) {
      case "overview": {
        const health = performanceTracker.getSystemHealth();
        const aggregated = performanceTracker.getAggregatedMetrics(undefined, period);
        const errors = performanceTracker.getErrorSummary(period);
        const slowOps = performanceTracker.getSlowOperations(1000, 10);

        return NextResponse.json({
          health,
          summary: {
            totalOperations: aggregated.reduce((sum, a) => sum + a.count, 0),
            avgResponseTime: Math.round(
              aggregated.reduce((sum, a) => sum + a.avgDuration * a.count, 0) /
                Math.max(aggregated.reduce((sum, a) => sum + a.count, 0), 1)
            ),
            errorCount: errors.total,
            slowOperations: slowOps.length,
          },
          metrics: aggregated.slice(0, 20),
          recentErrors: errors.recentErrors,
          slowOperations: slowOps,
        });
      }

      case "metrics": {
        const aggregated = performanceTracker.getAggregatedMetrics(type, period);
        return NextResponse.json({
          metrics: aggregated,
          period,
          type: type || "all",
        });
      }

      case "recent": {
        const limit = parseInt(searchParams.get("limit") || "100");
        const recent = performanceTracker.getRecentMetrics(type, limit);
        return NextResponse.json({
          metrics: recent,
          count: recent.length,
        });
      }

      case "errors": {
        const errors = performanceTracker.getErrorSummary(period);
        return NextResponse.json(errors);
      }

      case "slow": {
        const threshold = parseInt(searchParams.get("threshold") || "1000");
        const limit = parseInt(searchParams.get("limit") || "20");
        const slowOps = performanceTracker.getSlowOperations(threshold, limit);
        return NextResponse.json({
          operations: slowOps,
          threshold,
          count: slowOps.length,
        });
      }

      case "health": {
        const health = performanceTracker.getSystemHealth();
        return NextResponse.json(health);
      }

      default:
        return NextResponse.json(
          { error: "Invalid view. Options: overview, metrics, recent, errors, slow, health" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[PERF_API_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to get performance data" },
      { status: 500 }
    );
  }
}
