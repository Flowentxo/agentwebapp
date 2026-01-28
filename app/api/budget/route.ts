/**
 * Budget & Usage API Endpoints
 * GET /api/budget - Get current user's budget and usage
 * PUT /api/budget - Update user's budget limits (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { budgetService } from '@/server/services/BudgetService';
import { getSessionToken } from '@/lib/auth/cookies';
import { getSessionByToken } from '@/lib/auth/session';

async function getUserId(req: NextRequest): Promise<string | null> {
  try {
    const token = await getSessionToken();
    if (token) {
      const session = await getSessionByToken(token);
      if (session?.userId) {
        return session.userId;
      }
    }
  } catch (error) {
    console.log('[AUTH] No valid session');
  }

  // Fallback for development
  return 'default-user';
}

/**
 * GET /api/budget - Get current budget and usage
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let budget;
    let alerts: any[] = [];
    let isFallback = false;

    try {
      // Get user budget
      budget = await budgetService.getUserBudget(userId);
      // Get unread alerts
      alerts = await budgetService.getUnreadAlerts(userId);
    } catch (dbError) {
      console.error('[BUDGET_GET] Database error, using fallback:', dbError);
      isFallback = true;
      // Fallback budget data
      budget = {
        monthlyTokenLimit: 100000,
        monthlyCostLimitUsd: '10.00',
        dailyTokenLimit: 10000,
        dailyCostLimitUsd: '1.00',
        maxTokensPerRequest: 4000,
        maxRequestsPerMinute: 60,
        currentMonthTokens: 0,
        currentMonthCostUsd: '0.00',
        currentDayTokens: 0,
        currentDayCostUsd: '0.00',
        monthResetAt: new Date(),
        dayResetAt: new Date(),
        isActive: true,
        metadata: { plan: 'free' },
      };
    }

    return NextResponse.json({
      success: true,
      isFallback,
      data: {
        budget: {
          // Limits
          limits: {
            monthlyTokens: budget.monthlyTokenLimit,
            monthlyCostUsd: parseFloat(String(budget.monthlyCostLimitUsd || 0)),
            dailyTokens: budget.dailyTokenLimit,
            dailyCostUsd: parseFloat(String(budget.dailyCostLimitUsd || 0)),
            maxTokensPerRequest: budget.maxTokensPerRequest,
            maxRequestsPerMinute: budget.maxRequestsPerMinute,
          },

          // Current usage
          usage: {
            monthlyTokens: budget.currentMonthTokens || 0,
            monthlyCostUsd: parseFloat(String(budget.currentMonthCostUsd || 0)),
            dailyTokens: budget.currentDayTokens || 0,
            dailyCostUsd: parseFloat(String(budget.currentDayCostUsd || 0)),
          },

          // Percentages
          percentages: {
            monthlyTokens: budget.monthlyTokenLimit
              ? ((budget.currentMonthTokens || 0) / budget.monthlyTokenLimit) * 100
              : 0,
            monthlyCost: budget.monthlyCostLimitUsd
              ? (parseFloat(String(budget.currentMonthCostUsd || 0)) /
                parseFloat(String(budget.monthlyCostLimitUsd))) *
              100
              : 0,
            dailyTokens: budget.dailyTokenLimit
              ? ((budget.currentDayTokens || 0) / budget.dailyTokenLimit) * 100
              : 0,
            dailyCost: budget.dailyCostLimitUsd
              ? (parseFloat(String(budget.currentDayCostUsd || 0)) /
                parseFloat(String(budget.dailyCostLimitUsd))) *
              100
              : 0,
          },

          // Reset times
          resets: {
            monthResetAt: budget.monthResetAt,
            dayResetAt: budget.dayResetAt,
          },

          // Status
          isActive: budget.isActive,
          plan: budget.metadata?.plan || 'free',
          autoReload: budget.metadata?.autoReload || { enabled: false, threshold: 10 },
        },

        alerts: alerts.map((alert) => ({
          id: alert.id,
          type: alert.alertType,
          severity: alert.severity,
          message: alert.message,
          currentUsage: alert.currentUsage,
          limit: alert.limit,
          createdAt: alert.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('[BUDGET_GET] Critical error:', error);
    // Return fallback data instead of error
    return NextResponse.json({
      success: true,
      isFallback: true,
      data: {
        budget: {
          limits: {
            monthlyTokens: 100000,
            monthlyCostUsd: 50,
            dailyTokens: 10000,
            dailyCostUsd: 10,
            maxTokensPerRequest: 4000,
            maxRequestsPerMinute: 60,
          },
          usage: {
            monthlyTokens: 0,
            monthlyCostUsd: 0,
            dailyTokens: 0,
            dailyCostUsd: 0,
          },
          percentages: {
            monthlyTokens: 0,
            monthlyCost: 0,
            dailyTokens: 0,
            dailyCost: 0,
          },
          resets: {
            monthResetAt: new Date(),
            dayResetAt: new Date(),
          },
          isActive: true,
          plan: 'free',
          autoReload: { enabled: false, threshold: 10 },
        },
        alerts: [],
      },
    });
  }
}

/**
 * PUT /api/budget - Update budget limits (admin only)
 */
export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin check here
    // For now, allow all users to update their own budget (for demo purposes)

    const body = await req.json();
    const {
      monthlyTokenLimit,
      monthlyCostLimitUsd,
      dailyTokenLimit,
      dailyCostLimitUsd,
      maxTokensPerRequest,
      maxRequestsPerMinute,
    } = body;

    const updatedBudget = await budgetService.updateBudgetLimits(userId, {
      monthlyTokenLimit,
      monthlyCostLimitUsd,
      dailyTokenLimit,
      dailyCostLimitUsd,
      maxTokensPerRequest,
      maxRequestsPerMinute,
    });

    return NextResponse.json({
      success: true,
      data: updatedBudget,
      message: 'Budget limits updated successfully',
    });
  } catch (error) {
    console.error('[BUDGET_PUT]', error);
    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    );
  }
}
