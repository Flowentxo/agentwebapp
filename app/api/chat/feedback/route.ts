/**
 * CHAT FEEDBACK API
 *
 * Quality Evaluation & Feedback Loop
 *
 * Allows users to rate AI responses with thumbs up/down.
 *
 * POST /api/chat/feedback - Submit feedback for a trace
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { traceFeedback } from '@/lib/db/schema-observability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/chat/feedback
 *
 * Submit feedback for an AI response
 *
 * Body:
 * {
 *   traceId: string,           // Required: The trace ID of the AI response
 *   rating: 'positive' | 'negative',  // Required: User rating
 *   comment?: string,          // Optional: User comment
 *   userMessage?: string,      // Optional: The user's message (for context)
 *   aiResponse?: string,       // Optional: The AI's response (for context)
 *   promptSlug?: string,       // Optional: The prompt slug used
 *   agentId?: string,          // Optional: The agent ID
 *   model?: string,            // Optional: The model used
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = req.headers.get('x-user-id') || undefined;

    // Validate required fields
    if (!body.traceId || typeof body.traceId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'traceId is required' },
        { status: 400 }
      );
    }

    if (!body.rating || !['positive', 'negative'].includes(body.rating)) {
      return NextResponse.json(
        { success: false, error: 'rating must be "positive" or "negative"' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Insert feedback
    const [feedback] = await db
      .insert(traceFeedback)
      .values({
        traceId: body.traceId,
        userId,
        rating: body.rating as 'positive' | 'negative',
        comment: body.comment || null,
        promptSlug: body.promptSlug || null,
        agentId: body.agentId || null,
        model: body.model || null,
        userMessage: body.userMessage || null,
        aiResponse: body.aiResponse || null,
        reviewStatus: 'pending',
      })
      .returning();

    console.log('[FEEDBACK_API] Feedback recorded:', {
      traceId: body.traceId,
      rating: body.rating,
      feedbackId: feedback.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: feedback.id,
        traceId: feedback.traceId,
        rating: feedback.rating,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[FEEDBACK_API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
