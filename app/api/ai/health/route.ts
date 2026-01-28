import { NextRequest, NextResponse } from 'next/server';
import { globalCircuitBreaker } from '@/lib/ai/circuit-breaker';
import { FALLBACK_CHAINS } from '@/lib/ai/fallback-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/health
 * Get health status of all AI models and circuit breakers
 */
export async function GET(req: NextRequest) {
  try {
    // Get circuit breaker stats
    const circuitStats = globalCircuitBreaker.getStats();

    // Get all available models from fallback chains
    const allModels = new Set<string>();
    Object.values(FALLBACK_CHAINS).forEach((chain) => {
      chain.models.forEach((model) => {
        allModels.add(`${model.provider}:${model.model}`);
      });
    });

    // Build health report
    const modelHealth = Array.from(allModels).map((modelKey) => {
      const stats = circuitStats.find((s) => s.model === modelKey);

      return {
        model: modelKey,
        status: stats?.state || 'unknown',
        healthy: stats?.state === 'closed',
        failures: stats?.failures || 0,
        lastFailure: stats?.lastFailure,
        uptime: stats?.uptime || 100,
      };
    });

    // Calculate overall health
    const healthyModels = modelHealth.filter((m) => m.healthy).length;
    const totalModels = modelHealth.length;
    const overallHealth = (healthyModels / totalModels) * 100;

    return NextResponse.json({
      success: true,
      data: {
        overall: {
          health: overallHealth,
          healthyModels,
          totalModels,
          status: overallHealth >= 80 ? 'healthy' : overallHealth >= 50 ? 'degraded' : 'unhealthy',
        },
        models: modelHealth,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[AI_HEALTH_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch AI health status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/health/reset
 * Reset circuit breaker for a specific model
 */
export async function POST(req: NextRequest) {
  try {
    const { model, provider } = await req.json();

    if (!model || !provider) {
      return NextResponse.json(
        { success: false, error: 'model and provider are required' },
        { status: 400 }
      );
    }

    globalCircuitBreaker.reset(provider, model);

    return NextResponse.json({
      success: true,
      message: `Circuit breaker reset for ${provider}:${model}`,
    });
  } catch (error) {
    console.error('[AI_HEALTH_RESET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset circuit breaker' },
      { status: 500 }
    );
  }
}
