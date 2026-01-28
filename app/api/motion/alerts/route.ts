/**
 * Alerts API Endpoint
 *
 * Provides alert management for the Motion AI system
 */

import { NextRequest, NextResponse } from 'next/server';
import { metrics } from '@/lib/agents/motion/services/MetricsService';

/**
 * GET /api/motion/alerts
 *
 * Get active alerts
 */
export async function GET(req: NextRequest) {
  try {
    const alerts = metrics.getActiveAlerts();

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[ALERTS_API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/motion/alerts
 *
 * Add alert threshold or acknowledge alert
 *
 * Body:
 * - action: 'add_threshold' | 'acknowledge'
 * - For add_threshold:
 *   - metric: string
 *   - condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
 *   - value: number
 *   - severity: 'warning' | 'critical'
 *   - message: string
 * - For acknowledge:
 *   - alertId: string
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'add_threshold': {
        const { metric, condition, value, severity, message } = body;

        if (!metric || !condition || value === undefined || !severity || !message) {
          return NextResponse.json(
            { error: 'Missing required fields: metric, condition, value, severity, message' },
            { status: 400 }
          );
        }

        metrics.addThreshold({
          metric,
          condition,
          value,
          severity,
          message,
        });

        return NextResponse.json({
          success: true,
          message: 'Alert threshold added',
        });
      }

      case 'acknowledge': {
        const { alertId } = body;

        if (!alertId) {
          return NextResponse.json(
            { error: 'alertId is required for acknowledge action' },
            { status: 400 }
          );
        }

        const acknowledged = metrics.acknowledgeAlert(alertId);

        if (!acknowledged) {
          return NextResponse.json(
            { error: `Alert '${alertId}' not found` },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Alert acknowledged',
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported: add_threshold, acknowledge' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[ALERTS_API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
