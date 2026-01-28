/**
 * EVALUATION FEEDBACK DETAIL API
 *
 * Quality Evaluation & Feedback Loop
 *
 * GET  /api/admin/evaluation/[id] - Get feedback details
 * PUT  /api/admin/evaluation/[id] - Update review status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEvaluationService } from '@/server/services/EvaluationService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/evaluation/[id]
 *
 * Get details of a specific feedback item
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const evaluationService = getEvaluationService();

    const feedback = await evaluationService.getFeedbackById(id);

    if (!feedback) {
      return NextResponse.json(
        { success: false, error: 'Feedback not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    console.error('[EVALUATION_DETAIL_API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/evaluation/[id]
 *
 * Update the review status of a feedback item
 *
 * Body:
 * {
 *   status: 'reviewed' | 'resolved' | 'dismissed',
 *   notes?: string,
 * }
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const userId = req.headers.get('x-user-id') || 'admin';

    // Validate status
    if (!body.status || !['reviewed', 'resolved', 'dismissed'].includes(body.status)) {
      return NextResponse.json(
        { success: false, error: 'status must be "reviewed", "resolved", or "dismissed"' },
        { status: 400 }
      );
    }

    const evaluationService = getEvaluationService();

    // Check if feedback exists
    const existing = await evaluationService.getFeedbackById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Feedback not found' },
        { status: 404 }
      );
    }

    // Update status
    const updated = await evaluationService.updateReviewStatus(
      id,
      body.status,
      userId,
      body.notes
    );

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('[EVALUATION_DETAIL_API] PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update feedback' },
      { status: 500 }
    );
  }
}
