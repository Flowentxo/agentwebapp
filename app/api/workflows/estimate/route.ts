/**
 * Workflow Cost Estimation API
 * POST /api/workflows/estimate
 *
 * Estimates the cost of executing a workflow based on its nodes and configuration.
 * Used by the Studio frontend to show cost projections before execution.
 *
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  workflowCostEstimator,
  type WorkflowCostEstimate,
  COST_TIER_THRESHOLDS,
} from '@/server/services/WorkflowCostEstimator';
import { budgetService } from '@/server/services/BudgetService';
import { Node, Edge } from 'reactflow';

export const dynamic = 'force-dynamic';

interface EstimateRequestBody {
  nodes: Node[];
  edges?: Edge[];
  includeNodeBreakdown?: boolean;
  includeBudgetCheck?: boolean;
}

interface EstimateResponse {
  success: boolean;
  data: {
    estimate: WorkflowCostEstimate;
    budgetStatus?: {
      allowed: boolean;
      remainingBudget: number;
      percentageOfBudget: number;
      warningLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
    };
    displayInfo: {
      formattedMinCost: string;
      formattedMaxCost: string;
      formattedAvgCost: string;
      costLabel: string;
      colorClass: string;
    };
  };
  error?: string;
}

/**
 * POST /api/workflows/estimate
 *
 * Request body:
 * - nodes: Array of React Flow nodes
 * - edges: Optional array of React Flow edges
 * - includeNodeBreakdown: Include per-node cost breakdown (default: true)
 * - includeBudgetCheck: Check against user's budget (default: true)
 */
export async function POST(req: NextRequest): Promise<NextResponse<EstimateResponse>> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          data: {} as any,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const body: EstimateRequestBody = await req.json();

    // Validate request
    if (!body.nodes || !Array.isArray(body.nodes)) {
      return NextResponse.json(
        {
          success: false,
          data: {} as any,
          error: 'Invalid request: nodes array is required',
        },
        { status: 400 }
      );
    }

    if (body.nodes.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          estimate: {
            minCost: 0,
            maxCost: 0,
            avgCost: 0,
            nodeEstimates: [],
            tierSummary: [],
            warnings: ['No nodes in workflow'],
            recommendedBuffer: 0,
            estimatedTokens: 0,
          },
          displayInfo: {
            formattedMinCost: '$0.00',
            formattedMaxCost: '$0.00',
            formattedAvgCost: '$0.00',
            costLabel: 'Free',
            colorClass: 'text-muted-foreground',
          },
        },
      });
    }

    // Calculate cost estimate
    const estimate = workflowCostEstimator.estimateWorkflowCost(body.nodes);

    // Optionally remove node breakdown to reduce response size
    if (body.includeNodeBreakdown === false) {
      estimate.nodeEstimates = [];
    }

    // Build response data
    const responseData: EstimateResponse['data'] = {
      estimate,
      displayInfo: formatDisplayInfo(estimate),
    };

    // Check against user's budget if requested
    if (body.includeBudgetCheck !== false) {
      const userId = session.user.id;
      const budgetCheck = await budgetService.checkBudget(userId, estimate.estimatedTokens);

      const remainingBudget = budgetCheck.limits.monthlyCostUsd - budgetCheck.currentUsage.monthlyCostUsd;
      const percentageOfBudget = budgetCheck.limits.monthlyCostUsd > 0
        ? (estimate.maxCost / budgetCheck.limits.monthlyCostUsd) * 100
        : 0;

      // Determine warning level
      let warningLevel: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';
      if (!budgetCheck.allowed) {
        warningLevel = 'critical';
      } else if (estimate.maxCost > remainingBudget) {
        warningLevel = 'critical';
      } else if (percentageOfBudget > 50) {
        warningLevel = 'high';
      } else if (percentageOfBudget > 25) {
        warningLevel = 'medium';
      } else if (percentageOfBudget > 10) {
        warningLevel = 'low';
      }

      responseData.budgetStatus = {
        allowed: budgetCheck.allowed && estimate.maxCost <= remainingBudget,
        remainingBudget: Math.round(remainingBudget * 100) / 100,
        percentageOfBudget: Math.round(percentageOfBudget * 100) / 100,
        warningLevel,
      };

      // Add budget warning if needed
      if (warningLevel === 'critical') {
        estimate.warnings.push(
          `This workflow may exceed your remaining budget of $${remainingBudget.toFixed(2)}`
        );
      } else if (warningLevel === 'high') {
        estimate.warnings.push(
          `This workflow uses ${percentageOfBudget.toFixed(0)}% of your monthly budget`
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error('[API] Workflow estimate error:', error);
    return NextResponse.json(
      {
        success: false,
        data: {} as any,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Format display information for the frontend
 */
function formatDisplayInfo(estimate: WorkflowCostEstimate): EstimateResponse['data']['displayInfo'] {
  const formatCost = (cost: number): string => {
    if (cost === 0) return '$0.00';
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    if (cost < 1) return `$${cost.toFixed(3)}`;
    return `$${cost.toFixed(2)}`;
  };

  // Determine overall cost tier based on average cost
  let costLabel: string;
  let colorClass: string;

  if (estimate.avgCost === 0) {
    costLabel = 'Free';
    colorClass = 'text-muted-foreground';
  } else if (estimate.avgCost < COST_TIER_THRESHOLDS.low.max) {
    costLabel = '$';
    colorClass = 'text-emerald-500';
  } else if (estimate.avgCost < COST_TIER_THRESHOLDS.medium.max) {
    costLabel = '$$';
    colorClass = 'text-amber-500';
  } else if (estimate.avgCost < COST_TIER_THRESHOLDS.high.max) {
    costLabel = '$$$';
    colorClass = 'text-orange-500';
  } else {
    costLabel = '$$$$';
    colorClass = 'text-red-500';
  }

  return {
    formattedMinCost: formatCost(estimate.minCost),
    formattedMaxCost: formatCost(estimate.maxCost),
    formattedAvgCost: formatCost(estimate.avgCost),
    costLabel,
    colorClass,
  };
}

/**
 * GET /api/workflows/estimate
 *
 * Returns cost tier definitions for the frontend
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      tiers: COST_TIER_THRESHOLDS,
      modelCosts: {
        'gpt-4o': { estimatedPerCall: 0.03, tier: 'high' },
        'gpt-4o-mini': { estimatedPerCall: 0.001, tier: 'low' },
        'gpt-4-turbo': { estimatedPerCall: 0.04, tier: 'premium' },
        'gpt-3.5-turbo': { estimatedPerCall: 0.002, tier: 'low' },
        'claude-3-opus': { estimatedPerCall: 0.075, tier: 'premium' },
        'claude-3-sonnet': { estimatedPerCall: 0.015, tier: 'medium' },
        'claude-3-haiku': { estimatedPerCall: 0.001, tier: 'low' },
      },
      operationCosts: {
        'web-search': { estimatedPerCall: 0.01, tier: 'low' },
        'image-gen': { estimatedPerCall: 0.04, tier: 'high' },
        'database-query': { estimatedPerCall: 0.0001, tier: 'free' },
        'webhook': { estimatedPerCall: 0.0001, tier: 'free' },
        'condition': { estimatedPerCall: 0, tier: 'free' },
        'trigger': { estimatedPerCall: 0, tier: 'free' },
      },
    },
  });
}
