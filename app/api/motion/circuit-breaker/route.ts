/**
 * Circuit Breaker API Endpoint
 *
 * Provides circuit breaker status and management for the Motion AI system
 */

import { NextRequest, NextResponse } from 'next/server';
import { circuitBreaker } from '@/lib/agents/motion/services/CircuitBreakerService';

/**
 * GET /api/motion/circuit-breaker
 *
 * Get circuit breaker metrics and status
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const circuitName = searchParams.get('circuit');

    if (circuitName) {
      // Get specific circuit stats
      const stats = circuitBreaker.getCircuitStats(circuitName);

      if (!stats) {
        return NextResponse.json(
          { error: `Circuit '${circuitName}' not found` },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          name: circuitName,
          ...stats,
          health: getHealthStatus(stats.state, stats.failureRate),
        },
      });
    }

    // Get all circuit metrics
    const metrics = circuitBreaker.getMetrics();

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalCircuits: metrics.totalCircuits,
          openCircuits: metrics.openCircuits,
          halfOpenCircuits: metrics.halfOpenCircuits,
          closedCircuits: metrics.closedCircuits,
          globalFailureRate: Math.round(metrics.globalFailureRate * 100) / 100,
          systemHealth: getSystemHealth(metrics),
        },
        circuits: Object.entries(metrics.circuits).map(([name, stats]) => ({
          name,
          ...stats,
          health: getHealthStatus(stats.state, stats.failureRate),
        })),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[CIRCUIT_BREAKER_API] Error:', error);
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
 * POST /api/motion/circuit-breaker
 *
 * Circuit breaker management operations
 *
 * Body:
 * - action: 'reset' | 'force-open' | 'force-close' | 'reset-all'
 * - circuit?: string (circuit name, required for specific operations)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, circuit } = body;

    switch (action) {
      case 'reset':
        if (!circuit) {
          return NextResponse.json(
            { error: 'circuit name is required for reset action' },
            { status: 400 }
          );
        }
        const resetSuccess = circuitBreaker.resetCircuit(circuit);
        if (!resetSuccess) {
          return NextResponse.json(
            { error: `Circuit '${circuit}' not found` },
            { status: 404 }
          );
        }
        return NextResponse.json({
          success: true,
          message: `Circuit '${circuit}' reset successfully`,
        });

      case 'reset-all':
        circuitBreaker.resetAll();
        return NextResponse.json({
          success: true,
          message: 'All circuits reset successfully',
        });

      case 'force-open':
        if (!circuit) {
          return NextResponse.json(
            { error: 'circuit name is required for force-open action' },
            { status: 400 }
          );
        }
        const forceOpenSuccess = circuitBreaker.forceCircuitState(circuit, 'OPEN');
        if (!forceOpenSuccess) {
          return NextResponse.json(
            { error: `Circuit '${circuit}' not found` },
            { status: 404 }
          );
        }
        return NextResponse.json({
          success: true,
          message: `Circuit '${circuit}' forced to OPEN state`,
        });

      case 'force-close':
        if (!circuit) {
          return NextResponse.json(
            { error: 'circuit name is required for force-close action' },
            { status: 400 }
          );
        }
        const forceCloseSuccess = circuitBreaker.forceCircuitState(circuit, 'CLOSED');
        if (!forceCloseSuccess) {
          return NextResponse.json(
            { error: `Circuit '${circuit}' not found` },
            { status: 404 }
          );
        }
        return NextResponse.json({
          success: true,
          message: `Circuit '${circuit}' forced to CLOSED state`,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported: reset, reset-all, force-open, force-close' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[CIRCUIT_BREAKER_API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Helper functions

function getHealthStatus(state: string, failureRate: number): string {
  if (state === 'OPEN') return 'critical';
  if (state === 'HALF_OPEN') return 'recovering';
  if (failureRate > 30) return 'degraded';
  if (failureRate > 10) return 'warning';
  return 'healthy';
}

function getSystemHealth(metrics: {
  openCircuits: number;
  halfOpenCircuits: number;
  totalCircuits: number;
  globalFailureRate: number;
}): string {
  if (metrics.openCircuits > 0) return 'critical';
  if (metrics.halfOpenCircuits > 0) return 'recovering';
  if (metrics.globalFailureRate > 20) return 'degraded';
  if (metrics.globalFailureRate > 5) return 'warning';
  return 'healthy';
}
