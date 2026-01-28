/**
 * API Route: Get personalized recommendations
 * GET /api/command-center/recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateRecommendations } from '@/lib/command-center/recommendation-engine';
import { getIntegratedContext } from '@/lib/command-center/integration-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'default-user';

    // Get query params
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '5');
    const minRelevance = parseFloat(searchParams.get('minRelevance') || '0.5');

    // Generate recommendations
    const recommendations = await generateRecommendations(userId, undefined, {
      limit,
      minRelevance,
    });

    // Get integrated context (calendar, email, CRM)
    const integratedContext = await getIntegratedContext(userId);

    return NextResponse.json({
      recommendations,
      context: {
        upcomingMeetingsCount: integratedContext.upcomingMeetings.length,
        unreadEmailsCount: integratedContext.unreadEmails.length,
        urgentEmailsCount: integratedContext.urgentEmails.length,
        followUpNeededCount: integratedContext.followUpNeeded.length,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
