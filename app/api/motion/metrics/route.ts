/**
 * Metrics API Endpoint
 *
 * Provides monitoring and metrics access for the Motion AI system
 */

import { NextRequest, NextResponse } from 'next/server';
import { metrics } from '@/lib/agents/motion/services/MetricsService';

/**
 * GET /api/motion/metrics
 *
 * Get metrics in various formats
 *
 * Query params:
 * - format: 'json' | 'prometheus' (default: 'json')
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json';

    if (format === 'prometheus') {
      const prometheusOutput = metrics.exportPrometheus();
      return new NextResponse(prometheusOutput, {
        headers: {
          'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        },
      });
    }

    const summary = metrics.getMetricsSummary();

    return NextResponse.json({
      success: true,
      data: {
        metrics: summary,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[METRICS_API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
