/**
 * Budget Forecast Chart API - Phase 5
 * GET /api/budget/charts/forecast
 *
 * Returns Recharts-compatible forecast data including:
 * - Historical actual spending (cumulative)
 * - Projected future spending
 * - Budget limit reference
 * - Trend analysis
 *
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { budgetService } from '@/server/services/BudgetService';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * GET /api/budget/charts/forecast
 *
 * Query params:
 * - daysBack: Number of historical days (default: 30)
 * - daysForward: Number of projected days (default: 15)
 * - includeModelBreakdown: Include spending by model (default: false)
 * - includeAgentBreakdown: Include spending by agent (default: false)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const daysBack = parseInt(searchParams.get('daysBack') || '30', 10);
    const daysForward = parseInt(searchParams.get('daysForward') || '15', 10);
    const includeModelBreakdown = searchParams.get('includeModelBreakdown') === 'true';
    const includeAgentBreakdown = searchParams.get('includeAgentBreakdown') === 'true';

    const userId = session.user.id;

    // Fetch forecast chart data
    const forecastData = await budgetService.getForecastChartData(
      userId,
      daysBack,
      daysForward
    );

    // Calculate trend from data
    const actualDataPoints = forecastData.filter(d => d.actual !== null);
    const projectedDataPoints = forecastData.filter(d => d.projected !== null && d.isFuture);

    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    let projectedOverage = 0;
    let confidenceScore = 75; // Default confidence

    if (actualDataPoints.length >= 3) {
      // Calculate daily change rate from last few days
      const recentActuals = actualDataPoints.slice(-7);
      if (recentActuals.length >= 2) {
        const firstValue = recentActuals[0].actual || 0;
        const lastValue = recentActuals[recentActuals.length - 1].actual || 0;
        const dailyChange = (lastValue - firstValue) / recentActuals.length;

        if (dailyChange > 5) {
          trend = 'increasing';
          confidenceScore = Math.min(90, 70 + actualDataPoints.length);
        } else if (dailyChange < -2) {
          trend = 'decreasing';
          confidenceScore = Math.min(85, 65 + actualDataPoints.length);
        } else {
          trend = 'stable';
          confidenceScore = Math.min(80, 60 + actualDataPoints.length);
        }
      }
    }

    // Calculate projected overage
    const budgetLimit = forecastData.find(d => d.limit !== null)?.limit || 0;
    const lastProjected = projectedDataPoints[projectedDataPoints.length - 1]?.projected || 0;

    if (budgetLimit > 0 && lastProjected > budgetLimit) {
      projectedOverage = lastProjected - budgetLimit;
    }

    // Build response
    const response: any = {
      success: true,
      data: {
        forecast: forecastData,
        summary: {
          trend,
          confidenceScore,
          projectedOverage: Math.round(projectedOverage * 100) / 100,
          budgetLimit,
          currentSpend: actualDataPoints[actualDataPoints.length - 1]?.actual || 0,
          projectedEndOfMonth: lastProjected,
          daysRemaining: daysForward,
        },
      },
    };

    // Optionally include model breakdown
    if (includeModelBreakdown) {
      const modelData = await budgetService.getSpendingByModel(userId, daysBack);
      const totalCost = modelData.reduce((sum, m) => sum + m.cost, 0);

      response.data.modelBreakdown = modelData.map(m => ({
        ...m,
        percentage: totalCost > 0 ? Math.round((m.cost / totalCost) * 10000) / 100 : 0,
      }));
    }

    // Optionally include agent breakdown
    if (includeAgentBreakdown) {
      response.data.agentBreakdown = await budgetService.getSpendingByAgent(userId, daysBack);
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[API] Forecast chart GET error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
