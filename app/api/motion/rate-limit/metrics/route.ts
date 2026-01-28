/**
 * Rate Limit Metrics API Endpoint
 *
 * Provides rate limiting metrics and analytics for monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/agents/motion/services/RateLimitService';

/**
 * GET /api/motion/rate-limit/metrics
 *
 * Get rate limiting metrics for monitoring and analytics
 */
export async function GET(req: NextRequest) {
  try {
    const metrics = rateLimiter.getMetrics();

    // Calculate additional derived metrics
    const successRate = metrics.totalRequests > 0
      ? (metrics.allowedRequests / metrics.totalRequests) * 100
      : 100;

    const denialRate = metrics.totalRequests > 0
      ? (metrics.deniedRequests / metrics.totalRequests) * 100
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        // Core metrics
        totalRequests: metrics.totalRequests,
        allowedRequests: metrics.allowedRequests,
        deniedRequests: metrics.deniedRequests,
        queuedRequests: metrics.queuedRequests,

        // Performance metrics
        averageWaitTimeMs: Math.round(metrics.averageWaitTime),
        peakRequestsPerSecond: metrics.peakRequestsPerSecond,

        // Derived metrics
        successRate: Math.round(successRate * 100) / 100,
        denialRate: Math.round(denialRate * 100) / 100,

        // Current state
        currentTokens: metrics.currentTokens,
        windowCounts: metrics.windowCounts,

        // Timestamp
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[RATE_LIMIT_METRICS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
