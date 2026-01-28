/**
 * EVALUATION API
 *
 * Quality Evaluation & Feedback Loop
 *
 * GET /api/admin/evaluation - Get evaluation metrics and review queue
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEvaluationService } from '@/server/services/EvaluationService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/evaluation
 *
 * Get evaluation dashboard data
 *
 * Query params:
 * - days: Number of days to analyze (default: 30)
 * - status: Filter review queue by status (pending, reviewed, resolved, dismissed)
 * - rating: Filter review queue by rating (positive, negative)
 * - limit: Number of items in review queue (default: 20)
 * - offset: Pagination offset (default: 0)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const days = parseInt(searchParams.get('days') || '30', 10);
    const status = searchParams.get('status') || 'pending';
    const rating = searchParams.get('rating') || 'negative';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const evaluationService = getEvaluationService();

    // Fetch all data in parallel
    const [
      metrics,
      reviewQueue,
      qualityByModel,
      qualityByPrompt,
      qualityByAgent,
      mostFailingPrompt,
      feedbackTrend,
    ] = await Promise.all([
      evaluationService.getQualityMetrics(days),
      evaluationService.getReviewQueue({
        status: status as any,
        rating: rating as any,
        limit,
        offset,
      }),
      evaluationService.getQualityByModel(days),
      evaluationService.getQualityByPrompt(days),
      evaluationService.getQualityByAgent(days),
      evaluationService.getMostFailingPrompt(days),
      evaluationService.getFeedbackTrend(days),
    ]);

    return NextResponse.json({
      success: true,
      days,
      metrics,
      reviewQueue: {
        items: reviewQueue.items,
        total: reviewQueue.total,
        limit,
        offset,
      },
      qualityByModel,
      qualityByPrompt,
      qualityByAgent,
      mostFailingPrompt,
      feedbackTrend,
    });
  } catch (error) {
    console.error('[EVALUATION_API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch evaluation data' },
      { status: 500 }
    );
  }
}
