
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { brainBusinessIdeas, brainIdeasAnalytics } from '@/lib/db/schema-brain-ideas';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/business-ideas/analytics
 * Get analytics data for business ideas dashboard
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';

    const db = getDb();

    // Get all ideas for this user
    const allIdeas = await db
      .select()
      .from(brainBusinessIdeas)
      .where(sql`${brainBusinessIdeas.userId} = ${userId} `)
      .orderBy(sql`${brainBusinessIdeas.createdAt} DESC`);

    // Count by status
    const byStatus = allIdeas.reduce((acc, idea) => {
      const status = idea.status || 'new';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count by category
    const byCategory = allIdeas.reduce((acc, idea) => {
      const category = idea.category || 'other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Prepare impact/effort matrix data
    const impactEffortMatrix = allIdeas.map(idea => ({
      title: idea.title,
      impact: idea.impact || 'medium',
      effort: idea.effort || 'medium',
      status: idea.status || 'new',
    }));

    return NextResponse.json({
      success: true,
      analytics: {
        totalGenerated: allIdeas.length,
        byStatus: Object.entries(byStatus).map(([status, count]) => ({
          status,
          count,
        })),
        byCategory: Object.entries(byCategory).map(([category, count]) => ({
          category,
          count,
        })),
        impactEffortMatrix,
      },
    });
  } catch (error: any) {
    console.error('[BUSINESS_IDEAS_ANALYTICS]', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch analytics',
      },
      { status: 500 }
    );
  }
}
