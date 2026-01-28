/**
 * Budget Insights API Endpoint
 * GET /api/budget/insights
 *
 * Returns AI-generated financial insights including:
 * - Financial health summary with score
 * - Narrative analysis from BrainAI
 * - Active anomalies and recommendations
 * - Forecast data
 *
 * @author AI Systems Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { budgetService, type FinancialHealthSummary } from '@/server/services/BudgetService';
import { financialContextBridge } from '@/server/services/FinancialContextBridge';
import { brainAI } from '@/server/services/BrainAIService';

export const dynamic = 'force-dynamic';

// =====================================================
// RESPONSE TYPES
// =====================================================

interface BuddyInsight {
  healthScore: number;
  status: 'excellent' | 'good' | 'fair' | 'warning' | 'critical';
  summary: string;
  highlights: string[];
  recommendations: string[];
  anomalies: Array<{
    type: string;
    severity: string;
    message: string;
  }>;
  forecast: {
    projectedMonthEnd: number;
    projectedOverage: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    runOutDate: string | null;
    confidenceScore: number;
  } | null;
  budget: {
    monthlyLimit: number;
    currentSpend: number;
    remaining: number;
    utilization: number;
    daysRemaining: number;
  };
  tokens: {
    limit: number;
    used: number;
    utilization: number;
  };
  lastSyncedAt: string;
  alerts: {
    total: number;
    highSeverity: number;
    latest: Array<{
      type: string;
      severity: string;
      message: string;
    }>;
  };
}

interface InsightsResponse {
  success: boolean;
  data?: {
    insight: BuddyInsight;
    raw?: FinancialHealthSummary;
  };
  error?: string;
  message?: string;
}

// =====================================================
// GET /api/budget/insights
// =====================================================

export async function GET(req: NextRequest): Promise<NextResponse<InsightsResponse>> {
  try {
    // Authenticate user
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Please log in to access financial insights',
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const includeRaw = searchParams.get('includeRaw') === 'true';
    const forceSync = searchParams.get('forceSync') === 'true';

    // Optionally force sync financial context
    if (forceSync) {
      await financialContextBridge.forceSyncFinancialContext(userId);
    }

    // Get financial health summary
    const healthSummary = await budgetService.getFinancialHealthSummary(userId);

    // Try to get narrative from BrainAI (if available)
    let narrativeSummary = '';
    try {
      const contextResult = await financialContextBridge.queryFinancialContext(
        userId,
        'financial status budget health'
      );
      narrativeSummary = contextResult || '';
    } catch (error) {
      console.warn('[InsightsAPI] Could not fetch narrative from BrainAI:', error);
    }

    // Generate highlights based on data
    const highlights = generateHighlights(healthSummary);

    // Build response
    const insight: BuddyInsight = {
      healthScore: healthSummary.healthScore,
      status: healthSummary.status,
      summary: narrativeSummary || generateFallbackSummary(healthSummary),
      highlights,
      recommendations: healthSummary.recommendations,
      anomalies: healthSummary.anomalies.latest,
      forecast: healthSummary.forecast,
      budget: {
        monthlyLimit: healthSummary.budget.monthlyLimit,
        currentSpend: healthSummary.budget.currentMonthSpend,
        remaining: healthSummary.budget.remainingMonthlyBudget,
        utilization: healthSummary.budget.monthlyUtilization,
        daysRemaining: healthSummary.budget.daysRemaining,
      },
      tokens: {
        limit: healthSummary.tokens.monthlyLimit,
        used: healthSummary.tokens.currentUsage,
        utilization: healthSummary.tokens.utilization,
      },
      lastSyncedAt: healthSummary.timestamp,
      alerts: {
        total: healthSummary.alerts.total,
        highSeverity: healthSummary.alerts.highSeverity,
        latest: healthSummary.alerts.latest,
      },
    };

    const responseData: InsightsResponse['data'] = { insight };

    if (includeRaw) {
      responseData.raw = healthSummary;
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error: any) {
    console.error('[InsightsAPI] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'Failed to fetch financial insights',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/budget/insights (Trigger manual sync)
// =====================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Force sync financial context
    const syncResult = await financialContextBridge.forceSyncFinancialContext(userId);

    if (!syncResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Sync failed',
        message: syncResult.error,
      });
    }

    // Get updated health summary
    const healthSummary = await budgetService.getFinancialHealthSummary(userId);

    return NextResponse.json({
      success: true,
      data: {
        syncResult,
        healthScore: healthSummary.healthScore,
        status: healthSummary.status,
      },
    });

  } catch (error: any) {
    console.error('[InsightsAPI] Sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Generate highlight bullets based on health summary
 */
function generateHighlights(summary: FinancialHealthSummary): string[] {
  const highlights: string[] = [];

  // Health score highlight
  if (summary.healthScore >= 90) {
    highlights.push('Excellent financial health - keep it up!');
  } else if (summary.healthScore >= 75) {
    highlights.push('Good budget management this month');
  } else if (summary.healthScore >= 50) {
    highlights.push('Budget needs attention');
  } else {
    highlights.push('Critical: Budget intervention required');
  }

  // Utilization highlight
  if (summary.budget.monthlyUtilization < 50) {
    highlights.push(`Only ${summary.budget.monthlyUtilization.toFixed(0)}% of monthly budget used`);
  } else if (summary.budget.monthlyUtilization > 80) {
    highlights.push(`${summary.budget.monthlyUtilization.toFixed(0)}% of budget consumed`);
  }

  // Days remaining
  if (summary.budget.daysRemaining <= 7) {
    highlights.push(`${summary.budget.daysRemaining} days until month resets`);
  }

  // Forecast highlight
  if (summary.forecast) {
    if (summary.forecast.projectedOverage > 0) {
      highlights.push(`Projected overage: $${summary.forecast.projectedOverage.toFixed(2)}`);
    } else if (summary.forecast.trend === 'decreasing') {
      highlights.push('Spending trend is decreasing - great!');
    }
  }

  // Anomalies
  if (summary.anomalies.critical > 0) {
    highlights.push(`${summary.anomalies.critical} critical anomaly detected`);
  }

  return highlights.slice(0, 5); // Max 5 highlights
}

/**
 * Generate fallback summary when BrainAI narrative unavailable
 */
function generateFallbackSummary(summary: FinancialHealthSummary): string {
  const statusMessages: Record<string, string> = {
    excellent: 'Your financial health is excellent! Budget usage is well within limits and spending patterns are stable.',
    good: 'Your budget is in good shape. Continue monitoring to maintain healthy spending patterns.',
    fair: 'Your budget needs some attention. Consider reviewing spending patterns and setting stricter limits.',
    warning: 'Warning: Your budget is under stress. Immediate action recommended to avoid overages.',
    critical: 'Critical: Your budget health is critical. Immediate intervention required to prevent service disruption.',
  };

  let summary_text = statusMessages[summary.status] || statusMessages.fair;

  if (summary.forecast?.projectedOverage && summary.forecast.projectedOverage > 0) {
    summary_text += ` At current pace, you're projected to exceed your budget by $${summary.forecast.projectedOverage.toFixed(2)}.`;
  }

  if (summary.budget.remainingMonthlyBudget > 0) {
    summary_text += ` You have $${summary.budget.remainingMonthlyBudget.toFixed(2)} remaining this month.`;
  }

  return summary_text;
}
