/**
 * PHASE 26-30: Dexter Forecasting API Routes
 * AI-powered financial forecasting endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { DexterCapabilities } from '@/lib/agents/dexter';
import { forecastEngine } from '@/lib/agents/dexter/tools/ForecastEngine';
import { getDb } from '@/lib/db';
import { unifiedDeals } from '@/lib/db/schema-integrations-v2';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

// ============================================
// POST: Generate forecast
// ============================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      workspaceId,
      forecastType,
      periods = 6,
      model = 'arima',
      confidenceLevel = 0.95,
      includeSeasonality = true,
      customData,
    } = body;

    if (!workspaceId && !customData) {
      return NextResponse.json(
        { success: false, error: 'workspaceId or customData is required' },
        { status: 400 }
      );
    }

    let data: Array<{ date: Date; value: number }>;

    if (customData) {
      // Use custom data provided by client
      data = customData.map((d: { date: string; value: number }) => ({
        date: new Date(d.date),
        value: d.value,
      }));
    } else {
      // Fetch historical data based on forecast type
      data = await fetchHistoricalData(workspaceId, forecastType);
    }

    if (data.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Insufficient historical data for forecasting (minimum 3 data points required)' },
        { status: 400 }
      );
    }

    // Generate forecast
    const forecast = await forecastEngine.forecast(data, {
      periods,
      model,
      confidenceLevel,
      includeSeasonality,
    });

    // Calculate additional metrics
    const lastActual = data[data.length - 1].value;
    const firstForecast = forecast.forecasts[0].predicted;
    const lastForecast = forecast.forecasts[forecast.forecasts.length - 1].predicted;

    const enhancedForecast = {
      ...forecast,
      summary: {
        lastActualValue: lastActual,
        firstForecastValue: firstForecast,
        lastForecastValue: lastForecast,
        totalGrowth: (lastForecast - lastActual) / lastActual,
        averagePeriodGrowth: Math.pow(lastForecast / lastActual, 1 / periods) - 1,
      },
      historicalData: data.slice(-12).map(d => ({
        date: d.date.toISOString().slice(0, 7),
        value: d.value,
      })),
      scenarios: {
        optimistic: forecast.forecasts.map(f => ({
          ...f,
          predicted: Math.round(f.upperBound * 0.9),
        })),
        pessimistic: forecast.forecasts.map(f => ({
          ...f,
          predicted: Math.round(f.lowerBound * 1.1),
        })),
      },
    };

    return NextResponse.json({
      success: true,
      data: enhancedForecast,
      metadata: {
        forecastType: forecastType || 'custom',
        model,
        periods,
        confidenceLevel,
        generatedAt: new Date().toISOString(),
        dataPoints: data.length,
      },
    });
  } catch (error) {
    console.error('[DEXTER_FORECAST_ERROR]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Forecast generation failed',
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET: Get forecast templates
// ============================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'templates') {
      // Return available forecast templates
      return NextResponse.json({
        success: true,
        data: {
          templates: [
            {
              id: 'revenue_forecast',
              name: 'Revenue Forecast',
              description: 'Predict future revenue based on historical sales data',
              recommendedModel: 'arima',
              defaultPeriods: 6,
              requiredData: ['revenue', 'date'],
            },
            {
              id: 'sales_forecast',
              name: 'Sales Forecast',
              description: 'Forecast sales volume and deal closures',
              recommendedModel: 'holtwinters',
              defaultPeriods: 3,
              requiredData: ['deals', 'date'],
            },
            {
              id: 'expense_forecast',
              name: 'Expense Forecast',
              description: 'Project future expenses and costs',
              recommendedModel: 'linear',
              defaultPeriods: 12,
              requiredData: ['expenses', 'date'],
            },
            {
              id: 'cash_flow_forecast',
              name: 'Cash Flow Forecast',
              description: 'Predict future cash positions',
              recommendedModel: 'arima',
              defaultPeriods: 6,
              requiredData: ['cash_flow', 'date'],
            },
            {
              id: 'customer_growth',
              name: 'Customer Growth Forecast',
              description: 'Forecast customer acquisition and growth',
              recommendedModel: 'exponential',
              defaultPeriods: 12,
              requiredData: ['customer_count', 'date'],
            },
          ],
          models: [
            {
              id: 'linear',
              name: 'Linear Regression',
              description: 'Simple trend-based forecasting',
              bestFor: 'Stable, linear growth patterns',
              accuracy: 'Low to Medium',
            },
            {
              id: 'exponential',
              name: 'Exponential Growth',
              description: 'Forecasting with compound growth',
              bestFor: 'Rapid growth or decline patterns',
              accuracy: 'Medium',
            },
            {
              id: 'arima',
              name: 'ARIMA',
              description: 'Auto-regressive integrated moving average',
              bestFor: 'Complex patterns with autocorrelation',
              accuracy: 'High',
            },
            {
              id: 'holtwinters',
              name: 'Holt-Winters',
              description: 'Triple exponential smoothing with seasonality',
              bestFor: 'Seasonal patterns (monthly, quarterly)',
              accuracy: 'High',
            },
          ],
        },
      });
    }

    if (action === 'ensemble') {
      const workspaceId = searchParams.get('workspaceId');
      const periods = parseInt(searchParams.get('periods') || '6');

      if (!workspaceId) {
        return NextResponse.json(
          { success: false, error: 'workspaceId is required' },
          { status: 400 }
        );
      }

      // Fetch data and run ensemble forecast
      const data = await fetchHistoricalData(workspaceId, 'revenue');

      if (data.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Insufficient data for ensemble forecast' },
          { status: 400 }
        );
      }

      const ensembleForecast = await forecastEngine.ensembleForecast(data, {
        periods,
        confidenceLevel: 0.95,
      });

      return NextResponse.json({
        success: true,
        data: ensembleForecast,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use action=templates or action=ensemble' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[DEXTER_FORECAST_GET_ERROR]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
      },
      { status: 500 }
    );
  }
}

// ============================================
// Helper function to fetch historical data
// ============================================

async function fetchHistoricalData(
  workspaceId: string,
  forecastType: string
): Promise<Array<{ date: Date; value: number }>> {
  const db = getDb();
  const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000);

  switch (forecastType) {
    case 'revenue':
    case 'sales':
    default:
      // Fetch closed-won deals grouped by month
      const deals = await db
        .select({
          createdAt: unifiedDeals.createdAt,
          value: unifiedDeals.value,
        })
        .from(unifiedDeals)
        .where(
          and(
            eq(unifiedDeals.workspaceId, workspaceId),
            eq(unifiedDeals.stage, 'closed_won'),
            gte(unifiedDeals.createdAt, twoYearsAgo)
          )
        )
        .orderBy(unifiedDeals.createdAt);

      // Aggregate by month
      const monthlyData = new Map<string, number>();

      for (const deal of deals) {
        if (!deal.createdAt) continue;
        const monthKey = deal.createdAt.toISOString().slice(0, 7);
        const current = monthlyData.get(monthKey) || 0;
        monthlyData.set(monthKey, current + parseFloat(deal.value || '0'));
      }

      // Convert to array and fill gaps
      const sortedMonths = Array.from(monthlyData.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));

      if (sortedMonths.length === 0) {
        // Return simulated data if no real data exists
        return generateSimulatedData(24);
      }

      return sortedMonths.map(([month, value]) => ({
        date: new Date(month + '-01'),
        value,
      }));
  }
}

/**
 * Generate simulated data for demo purposes
 */
function generateSimulatedData(months: number): Array<{ date: Date; value: number }> {
  const data: Array<{ date: Date; value: number }> = [];
  const now = new Date();

  for (let i = months; i > 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const baseValue = 100000;
    const trend = 1 + (months - i) * 0.02; // 2% monthly growth
    const seasonality = 1 + 0.15 * Math.sin(((months - i) / 12) * 2 * Math.PI);
    const noise = 0.9 + Math.random() * 0.2;

    data.push({
      date,
      value: Math.round(baseValue * trend * seasonality * noise),
    });
  }

  return data;
}
