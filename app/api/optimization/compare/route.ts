/**
 * Cost Optimization - Cost Comparison
 * POST - Compare costs across all available models
 */

import { NextRequest, NextResponse } from 'next/server';
import { costOptimizationService } from '@/server/services/CostOptimizationService';
import { budgetService } from '@/server/services/BudgetService';

/**
 * POST /api/optimization/compare
 * Compare costs across all available models for a prompt
 *
 * Body:
 * {
 *   prompt: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'prompt is required' },
        { status: 400 }
      );
    }

    // Get user's allowed models
    const modelPreferences = await budgetService.getModelPreferences(userId);
    const allowedModels = modelPreferences.allowedModels;

    // Compare costs
    const comparisons = costOptimizationService.compareCosts(prompt, allowedModels);

    // Mark recommended model (cheapest with good quality)
    if (comparisons.length > 0) {
      // Find cheapest model with quality score >= 80
      const recommended = comparisons.find(c => c.qualityScore >= 80) || comparisons[0];
      recommended.recommended = true;
    }

    return NextResponse.json({
      success: true,
      data: {
        comparisons,
        allowedModels,
      },
    });
  } catch (error) {
    console.error('[OPTIMIZATION_COMPARE]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to compare costs' },
      { status: 500 }
    );
  }
}
