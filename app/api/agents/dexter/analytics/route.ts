/**
 * PHASE 21-25: Dexter Analytics API Routes
 * API endpoints for financial analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { DexterCapabilities } from '@/lib/agents/dexter';

// ============================================
// POST: Run analytics query
// ============================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      analysisType,
      workspaceId,
      startDate,
      endDate,
      options = {},
    } = body;

    if (!analysisType || !workspaceId) {
      return NextResponse.json(
        { success: false, error: 'analysisType and workspaceId are required' },
        { status: 400 }
      );
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    let result;

    switch (analysisType) {
      case 'revenue':
        result = await DexterCapabilities.financial.analyzeRevenue(workspaceId, start, end);
        break;

      case 'pnl':
        result = await DexterCapabilities.financial.generatePnL(workspaceId, start, end);
        break;

      case 'balance_sheet':
        result = await DexterCapabilities.financial.generateBalanceSheet(workspaceId, end);
        break;

      case 'cash_flow':
        result = await DexterCapabilities.financial.generateCashFlow(workspaceId, start, end);
        break;

      case 'customer_profitability':
        result = await DexterCapabilities.customers.analyzeProfitability(workspaceId, options);
        break;

      case 'pipeline':
        result = await DexterCapabilities.crm.analyzePipeline(workspaceId, {
          dateRange: { start, end },
        });
        break;

      case 'sales_performance':
        result = await DexterCapabilities.crm.getSalesPerformance(
          workspaceId,
          options.period || 'this_quarter'
        );
        break;

      case 'win_loss':
        result = await DexterCapabilities.crm.getWinLossAnalysis(workspaceId, { start, end });
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown analysis type: ${analysisType}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        analysisType,
        generatedAt: new Date().toISOString(),
        period: { start: start.toISOString(), end: end.toISOString() },
      },
    });
  } catch (error) {
    console.error('[DEXTER_ANALYTICS_ERROR]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET: Quick metrics dashboard
// ============================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const period = searchParams.get('period') || 'this_quarter';

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    // Get date range based on period
    const now = new Date();
    let start: Date;

    switch (period) {
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'this_quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'last_30_days':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    // Fetch key metrics in parallel
    const [revenueAnalysis, pipelineAnalysis, customerAnalysis] = await Promise.all([
      DexterCapabilities.financial.analyzeRevenue(workspaceId, start, now).catch(() => null),
      DexterCapabilities.crm.analyzePipeline(workspaceId, { dateRange: { start, end: now } }).catch(() => null),
      DexterCapabilities.customers.analyzeProfitability(workspaceId, { period: 'last_90_days', topN: 5 }).catch(() => null),
    ]);

    // Build dashboard response
    const dashboard = {
      period: {
        label: period.replace('_', ' '),
        start: start.toISOString(),
        end: now.toISOString(),
      },
      revenue: revenueAnalysis ? {
        total: revenueAnalysis.summary.totalRevenue,
        growth: revenueAnalysis.summary.averageGrowth,
        trend: revenueAnalysis.summary.trend,
      } : null,
      pipeline: pipelineAnalysis ? {
        totalDeals: pipelineAnalysis.summary.totalDeals,
        totalValue: pipelineAnalysis.summary.totalValue,
        weightedValue: pipelineAnalysis.summary.weightedValue,
        winRate: pipelineAnalysis.summary.winRate,
        forecast: pipelineAnalysis.forecast,
      } : null,
      customers: customerAnalysis ? {
        total: customerAnalysis.summary.totalCustomers,
        active: customerAnalysis.summary.activeCustomers,
        avgLTV: customerAnalysis.summary.averageLTV,
        healthScore: customerAnalysis.summary.customerHealthScore,
        atRisk: customerAnalysis.atRiskCustomers.length,
      } : null,
      topInsights: [
        ...(revenueAnalysis?.insights || []).slice(0, 2),
        ...(pipelineAnalysis?.insights || []).slice(0, 2),
        ...(customerAnalysis?.insights || []).slice(0, 2),
      ],
      recommendations: [
        ...(revenueAnalysis?.recommendations || []).slice(0, 2),
        ...(pipelineAnalysis?.recommendations || []).slice(0, 2),
        ...(customerAnalysis?.recommendations || []).slice(0, 2),
      ],
    };

    return NextResponse.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    console.error('[DEXTER_DASHBOARD_ERROR]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Dashboard fetch failed',
      },
      { status: 500 }
    );
  }
}
