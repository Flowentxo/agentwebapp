/**
 * Cost Optimization - Model Recommendation
 * POST - Get model recommendation for a prompt
 */

import { NextRequest, NextResponse } from 'next/server';
import { costOptimizationService } from '@/server/services/CostOptimizationService';

/**
 * POST /api/optimization/recommend
 * Get optimal model recommendation for a prompt
 *
 * Body:
 * {
 *   prompt: string,
 *   currentModel: string,
 *   conversationHistory?: Array<{ role: string, content: string }>
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { prompt, currentModel, conversationHistory } = await req.json();

    if (!prompt || !currentModel) {
      return NextResponse.json(
        { success: false, error: 'prompt and currentModel are required' },
        { status: 400 }
      );
    }

    const recommendation = costOptimizationService.recommendModel(
      prompt,
      currentModel,
      conversationHistory || []
    );

    return NextResponse.json({
      success: true,
      data: recommendation,
    });
  } catch (error) {
    console.error('[OPTIMIZATION_RECOMMEND]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate recommendation' },
      { status: 500 }
    );
  }
}
