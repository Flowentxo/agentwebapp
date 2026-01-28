/**
 * Budget Tools for Buddy AI Agent
 *
 * This file defines the AI tools that Buddy can use to query and interact
 * with the user's financial data via OpenAI Function Calling.
 *
 * Tools:
 * - get_wallet_status: Get current budget status and health score
 * - get_spending_analysis: Get detailed spending analysis and trends
 * - check_forecast: Get budget forecast and predictions
 *
 * @author AI Systems Team
 * @version 1.0.0
 */

import { z } from 'zod';
import { budgetService, type FinancialHealthSummary } from '@/server/services/BudgetService';
import { financialContextBridge } from '@/server/services/FinancialContextBridge';

// =====================================================
// ZOD SCHEMAS FOR TOOL PARAMETERS
// =====================================================

/**
 * Schema for get_wallet_status tool
 */
export const GetWalletStatusSchema = z.object({
  include_recommendations: z.boolean()
    .optional()
    .default(true)
    .describe('Whether to include AI-generated recommendations'),
});

/**
 * Schema for get_spending_analysis tool
 */
export const GetSpendingAnalysisSchema = z.object({
  period: z.enum(['day', 'week', 'month'])
    .optional()
    .default('month')
    .describe('Time period for the analysis'),
  include_breakdown: z.boolean()
    .optional()
    .default(true)
    .describe('Include breakdown by model/agent'),
});

/**
 * Schema for check_forecast tool
 */
export const CheckForecastSchema = z.object({
  include_anomalies: z.boolean()
    .optional()
    .default(true)
    .describe('Include anomaly detection results'),
});

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export type GetWalletStatusParams = z.infer<typeof GetWalletStatusSchema>;
export type GetSpendingAnalysisParams = z.infer<typeof GetSpendingAnalysisSchema>;
export type CheckForecastParams = z.infer<typeof CheckForecastSchema>;

// =====================================================
// TOOL DEFINITIONS FOR OPENAI FUNCTION CALLING
// =====================================================

/**
 * OpenAI Function definitions for Buddy's budget tools
 */
export const BUDDY_BUDGET_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_wallet_status',
      description: `Get the user's current AI wallet/budget status including:
- Current spending and remaining budget
- Token usage statistics
- Health score (0-100)
- Active alerts and warnings
Use this when the user asks about their budget, spending, or wallet status.`,
      parameters: {
        type: 'object',
        properties: {
          include_recommendations: {
            type: 'boolean',
            description: 'Whether to include AI-generated recommendations',
            default: true,
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_spending_analysis',
      description: `Get detailed spending analysis including:
- Usage trends (increasing/stable/decreasing)
- Cost breakdown by model and agent
- Daily/weekly/monthly comparisons
Use this when the user wants to understand their spending patterns.`,
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['day', 'week', 'month'],
            description: 'Time period for the analysis',
            default: 'month',
          },
          include_breakdown: {
            type: 'boolean',
            description: 'Include breakdown by model/agent',
            default: true,
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'check_forecast',
      description: `Get budget forecast and predictions including:
- Projected end-of-month spending
- Budget run-out date (if applicable)
- Spending trend analysis
- Anomaly detection (unusual spending patterns)
Use this when the user asks about future spending or budget predictions.`,
      parameters: {
        type: 'object',
        properties: {
          include_anomalies: {
            type: 'boolean',
            description: 'Include anomaly detection results',
            default: true,
          },
        },
        required: [],
      },
    },
  },
];

// =====================================================
// TOOL EXECUTION FUNCTIONS
// =====================================================

/**
 * Execute the get_wallet_status tool
 */
export async function executeGetWalletStatus(
  userId: string,
  params: GetWalletStatusParams
): Promise<WalletStatusResult> {
  try {
    const healthSummary = await budgetService.getFinancialHealthSummary(userId);

    // Also sync to semantic memory for future context
    await financialContextBridge.syncFinancialContext(userId).catch(err => {
      console.warn('[BuddyTools] Failed to sync context:', err);
    });

    const result: WalletStatusResult = {
      success: true,
      wallet: {
        healthScore: healthSummary.healthScore,
        status: healthSummary.status,
        currentSpend: {
          today: healthSummary.budget.currentDaySpend,
          thisMonth: healthSummary.budget.currentMonthSpend,
        },
        limits: {
          daily: healthSummary.budget.dailyLimit,
          monthly: healthSummary.budget.monthlyLimit,
        },
        remaining: {
          today: healthSummary.budget.dailyLimit - healthSummary.budget.currentDaySpend,
          thisMonth: healthSummary.budget.remainingMonthlyBudget,
        },
        utilization: {
          daily: healthSummary.budget.dailyUtilization,
          monthly: healthSummary.budget.monthlyUtilization,
        },
        tokens: {
          used: healthSummary.tokens.currentUsage,
          limit: healthSummary.tokens.monthlyLimit,
          utilization: healthSummary.tokens.utilization,
        },
        daysRemaining: healthSummary.budget.daysRemaining,
        isActive: healthSummary.budget.isActive,
      },
      alerts: healthSummary.alerts.latest.map(a => ({
        severity: a.severity as 'info' | 'warning' | 'high' | 'critical',
        message: a.message,
      })),
    };

    if (params.include_recommendations) {
      result.recommendations = healthSummary.recommendations;
    }

    return result;

  } catch (error) {
    console.error('[BuddyTools] get_wallet_status failed:', error);
    return {
      success: false,
      error: 'Failed to retrieve wallet status. Please try again.',
    };
  }
}

/**
 * Execute the get_spending_analysis tool
 */
export async function executeGetSpendingAnalysis(
  userId: string,
  params: GetSpendingAnalysisParams
): Promise<SpendingAnalysisResult> {
  try {
    const healthSummary = await budgetService.getFinancialHealthSummary(userId);

    // Get trend from forecast if available
    const trend = healthSummary.forecast?.trend || 'stable';

    // Calculate comparison metrics
    const result: SpendingAnalysisResult = {
      success: true,
      period: params.period,
      analysis: {
        currentSpend: params.period === 'day'
          ? healthSummary.budget.currentDaySpend
          : healthSummary.budget.currentMonthSpend,
        trend,
        averageDailySpend: healthSummary.budget.currentMonthSpend /
          (30 - healthSummary.budget.daysRemaining || 1),
        projectedMonthEnd: healthSummary.forecast?.projectedMonthEnd || null,
      },
      utilization: {
        budget: healthSummary.budget.monthlyUtilization,
        tokens: healthSummary.tokens.utilization,
      },
    };

    // Include breakdown if requested (placeholder - would need additional data)
    if (params.include_breakdown) {
      result.breakdown = {
        note: 'Detailed breakdown by model and agent is available in the Analytics dashboard.',
        summary: {
          totalRequests: 'N/A - Enable detailed tracking for this data',
        },
      };
    }

    return result;

  } catch (error) {
    console.error('[BuddyTools] get_spending_analysis failed:', error);
    return {
      success: false,
      error: 'Failed to analyze spending. Please try again.',
    };
  }
}

/**
 * Execute the check_forecast tool
 */
export async function executeCheckForecast(
  userId: string,
  params: CheckForecastParams
): Promise<ForecastResult> {
  try {
    const healthSummary = await budgetService.getFinancialHealthSummary(userId);

    if (!healthSummary.forecast) {
      return {
        success: true,
        hasData: false,
        message: 'Not enough historical data to generate a forecast. Continue using the service and check back in a few days.',
      };
    }

    const result: ForecastResult = {
      success: true,
      hasData: true,
      forecast: {
        projectedMonthEnd: healthSummary.forecast.projectedMonthEnd,
        projectedOverage: healthSummary.forecast.projectedOverage,
        runOutDate: healthSummary.forecast.runOutDate,
        trend: healthSummary.forecast.trend,
        confidenceScore: Math.round(healthSummary.forecast.confidenceScore * 100),
      },
      budgetContext: {
        monthlyLimit: healthSummary.budget.monthlyLimit,
        currentSpend: healthSummary.budget.currentMonthSpend,
        daysRemaining: healthSummary.budget.daysRemaining,
        dailyBudgetRecommended: healthSummary.budget.dailyBudgetForRemaining,
      },
    };

    // Include anomalies if requested
    if (params.include_anomalies && healthSummary.anomalies.total > 0) {
      result.anomalies = {
        count: healthSummary.anomalies.total,
        critical: healthSummary.anomalies.critical,
        details: healthSummary.anomalies.latest.map(a => ({
          type: a.type,
          severity: a.severity,
          message: a.message,
        })),
      };
    }

    // Add warnings if applicable
    if (healthSummary.forecast.projectedOverage > 0) {
      result.warnings = result.warnings || [];
      result.warnings.push(
        `You're projected to exceed your budget by $${healthSummary.forecast.projectedOverage.toFixed(2)}`
      );
    }

    if (healthSummary.forecast.runOutDate) {
      const runOutDate = new Date(healthSummary.forecast.runOutDate);
      const now = new Date();
      const daysUntilRunout = Math.ceil(
        (runOutDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilRunout < 7) {
        result.warnings = result.warnings || [];
        result.warnings.push(
          `Budget expected to run out in ${daysUntilRunout} days (${runOutDate.toLocaleDateString()})`
        );
      }
    }

    return result;

  } catch (error) {
    console.error('[BuddyTools] check_forecast failed:', error);
    return {
      success: false,
      hasData: false,
      error: 'Failed to generate forecast. Please try again.',
    };
  }
}

// =====================================================
// RESULT TYPE DEFINITIONS
// =====================================================

export interface WalletStatusResult {
  success: boolean;
  error?: string;
  wallet?: {
    healthScore: number;
    status: 'excellent' | 'good' | 'fair' | 'warning' | 'critical';
    currentSpend: {
      today: number;
      thisMonth: number;
    };
    limits: {
      daily: number;
      monthly: number;
    };
    remaining: {
      today: number;
      thisMonth: number;
    };
    utilization: {
      daily: number;
      monthly: number;
    };
    tokens: {
      used: number;
      limit: number;
      utilization: number;
    };
    daysRemaining: number;
    isActive: boolean;
  };
  alerts?: Array<{
    severity: 'info' | 'warning' | 'high' | 'critical';
    message: string;
  }>;
  recommendations?: string[];
}

export interface SpendingAnalysisResult {
  success: boolean;
  error?: string;
  period?: 'day' | 'week' | 'month';
  analysis?: {
    currentSpend: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    averageDailySpend: number;
    projectedMonthEnd: number | null;
  };
  utilization?: {
    budget: number;
    tokens: number;
  };
  breakdown?: {
    note: string;
    summary: Record<string, any>;
  };
}

export interface ForecastResult {
  success: boolean;
  hasData: boolean;
  error?: string;
  message?: string;
  forecast?: {
    projectedMonthEnd: number;
    projectedOverage: number;
    runOutDate: string | null;
    trend: 'increasing' | 'stable' | 'decreasing';
    confidenceScore: number;
  };
  budgetContext?: {
    monthlyLimit: number;
    currentSpend: number;
    daysRemaining: number;
    dailyBudgetRecommended: number;
  };
  anomalies?: {
    count: number;
    critical: number;
    details: Array<{
      type: string;
      severity: string;
      message: string;
    }>;
  };
  warnings?: string[];
}

// =====================================================
// TOOL ROUTER
// =====================================================

/**
 * Route and execute a budget tool call
 */
export async function executeBudgetTool(
  toolName: string,
  userId: string,
  args: Record<string, any>
): Promise<WalletStatusResult | SpendingAnalysisResult | ForecastResult> {
  switch (toolName) {
    case 'get_wallet_status': {
      const params = GetWalletStatusSchema.parse(args);
      return executeGetWalletStatus(userId, params);
    }

    case 'get_spending_analysis': {
      const params = GetSpendingAnalysisSchema.parse(args);
      return executeGetSpendingAnalysis(userId, params);
    }

    case 'check_forecast': {
      const params = CheckForecastSchema.parse(args);
      return executeCheckForecast(userId, params);
    }

    default:
      throw new Error(`Unknown budget tool: ${toolName}`);
  }
}

/**
 * Check if a tool name is a budget tool
 */
export function isBudgetTool(toolName: string): boolean {
  return ['get_wallet_status', 'get_spending_analysis', 'check_forecast'].includes(toolName);
}
