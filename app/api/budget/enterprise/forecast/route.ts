/**
 * Enterprise Budget Forecast API
 * GET /api/budget/enterprise/forecast
 *
 * Returns predictive analytics including:
 * - Run-out date estimation
 * - End-of-month cost projection
 * - Usage trends (increasing/stable/decreasing)
 * - Confidence scores
 * - Recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { budgetService } from '@/server/services/BudgetService';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please log in to access forecasts' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);

    // Optional filters
    const costCenterId = searchParams.get('costCenterId') || undefined;
    const projectId = searchParams.get('projectId') || undefined;

    // Calculate forecast using linear regression
    const forecast = await budgetService.calculateForecast(
      userId,
      costCenterId,
      projectId
    );

    // Also detect any anomalies
    const anomalies = await budgetService.detectAnomalies(userId);

    // Get current budget for context
    const budget = await budgetService.getUserBudget(userId);

    return NextResponse.json({
      success: true,
      data: {
        forecast: {
          currentMonthSpend: forecast.currentMonthSpend,
          projectedMonthEnd: forecast.projectedMonthEnd,
          projectedOverage: forecast.projectedOverage,
          runOutDate: forecast.runOutDate?.toISOString() || null,
          confidenceScore: forecast.confidenceScore,
          trend: forecast.trend,
          recommendation: forecast.recommendation,
        },
        anomalies: anomalies.map(a => ({
          id: a.id,
          type: a.type,
          severity: a.severity,
          message: a.message,
          metric: a.metric,
          expectedValue: a.expectedValue,
          actualValue: a.actualValue,
          percentageDeviation: a.percentageDeviation,
          detectedAt: a.detectedAt.toISOString(),
        })),
        budget: {
          monthlyLimit: parseFloat(String(budget.monthlyCostLimitUsd || 0)),
          monthlyTokenLimit: budget.monthlyTokenLimit || 0,
          currentMonthCost: parseFloat(String(budget.currentMonthCostUsd || 0)),
          currentMonthTokens: budget.currentMonthTokens || 0,
          isEnterprise: budget.isEnterprise || false,
        },
        meta: {
          calculatedAt: new Date().toISOString(),
          algorithm: 'linear_regression',
          dataPointsUsed: 30,
        },
      },
    });
  } catch (error: any) {
    console.error('[API] Forecast error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/budget/enterprise/forecast
 * Trigger a fresh forecast calculation (bypasses cache)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await req.json();
    const { costCenterId, projectId } = body;

    // Force recalculation
    const forecast = await budgetService.calculateForecast(
      userId,
      costCenterId,
      projectId
    );

    return NextResponse.json({
      success: true,
      data: {
        forecast,
        recalculatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[API] Forecast recalculation error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
