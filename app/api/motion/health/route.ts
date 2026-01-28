/**
 * Health Check API Endpoint
 *
 * Provides health status for the Motion AI system
 */

import { NextRequest, NextResponse } from 'next/server';
import { metrics } from '@/lib/agents/motion/services/MetricsService';

/**
 * GET /api/motion/health
 *
 * Get system health status
 *
 * Query params:
 * - detailed: 'true' | 'false' (default: 'false')
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const detailed = searchParams.get('detailed') === 'true';

    const health = await metrics.getSystemHealth();

    // For Kubernetes/Load Balancer health checks
    const statusCode = health.status === 'healthy' ? 200 :
                       health.status === 'degraded' ? 200 :
                       503;

    if (detailed) {
      return NextResponse.json({
        success: true,
        data: health,
      }, { status: statusCode });
    }

    // Simple health check response
    return NextResponse.json({
      status: health.status,
      timestamp: health.timestamp,
      uptime: health.uptime,
    }, { status: statusCode });
  } catch (error) {
    console.error('[HEALTH_API] Error:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

/**
 * HEAD /api/motion/health
 *
 * Quick health check (for load balancers)
 */
export async function HEAD(req: NextRequest) {
  try {
    const health = await metrics.getSystemHealth();
    const statusCode = health.status === 'unhealthy' ? 503 : 200;

    return new NextResponse(null, { status: statusCode });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
