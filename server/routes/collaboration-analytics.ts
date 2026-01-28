/**
 * COLLABORATION ANALYTICS API
 *
 * Provides analytics and insights for multi-agent collaborations
 */

import { Router, Request, Response } from 'express';
import { getDb } from '../../lib/db/connection';
import { collaborations, collaborationMessages, collaborationAgents } from '../../lib/db/schema';
import { eq, sql, and, gte } from 'drizzle-orm';

const router = Router();

/**
 * Helper: Get user ID from request
 */
function getUserId(req: Request): string {
  return req.headers['x-user-id'] as string || 'default-user';
}

/**
 * GET /api/collaboration-analytics/stats
 *
 * Get overall collaboration statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const db = getDb();

    // Get total collaborations
    const totalCollaborations = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(collaborations)
      .where(eq(collaborations.userId, userId));

    // Get completed collaborations
    const completedCollaborations = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(collaborations)
      .where(and(
        eq(collaborations.userId, userId),
        eq(collaborations.status, 'completed')
      ));

    // Get failed collaborations
    const failedCollaborations = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(collaborations)
      .where(and(
        eq(collaborations.userId, userId),
        eq(collaborations.status, 'failed')
      ));

    // Get total messages
    const totalMessages = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(collaborationMessages)
      .innerJoin(
        collaborations,
        eq(collaborationMessages.collaborationId, collaborations.id)
      )
      .where(eq(collaborations.userId, userId));

    // Get token statistics
    const tokenStats = await db
      .select({
        totalTokens: sql<number>`coalesce(sum(${collaborationMessages.tokensUsed}), 0)::int`,
        avgTokens: sql<number>`coalesce(avg(${collaborationMessages.tokensUsed}), 0)::int`,
        maxTokens: sql<number>`coalesce(max(${collaborationMessages.tokensUsed}), 0)::int`
      })
      .from(collaborationMessages)
      .innerJoin(
        collaborations,
        eq(collaborationMessages.collaborationId, collaborations.id)
      )
      .where(eq(collaborations.userId, userId));

    // Calculate estimated cost (GPT-4o-mini pricing)
    const INPUT_COST_PER_1M = 0.15;  // $0.15 per 1M input tokens
    const OUTPUT_COST_PER_1M = 0.60; // $0.60 per 1M output tokens
    const totalTokens = tokenStats[0]?.totalTokens || 0;
    const estimatedCost = (totalTokens / 1_000_000) * ((INPUT_COST_PER_1M + OUTPUT_COST_PER_1M) / 2);

    // Get most active agents
    const agentActivity = await db
      .select({
        agentId: collaborationMessages.agentId,
        agentName: collaborationMessages.agentName,
        messageCount: sql<number>`count(*)::int`,
        totalTokens: sql<number>`coalesce(sum(${collaborationMessages.tokensUsed}), 0)::int`
      })
      .from(collaborationMessages)
      .innerJoin(
        collaborations,
        eq(collaborationMessages.collaborationId, collaborations.id)
      )
      .where(and(
        eq(collaborations.userId, userId),
        sql`${collaborationMessages.agentId} != 'user'`
      ))
      .groupBy(collaborationMessages.agentId, collaborationMessages.agentName)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    // Get average collaboration duration
    const durationStats = await db
      .select({
        avgDuration: sql<number>`
          coalesce(
            avg(
              extract(epoch from (${collaborations.completedAt} - ${collaborations.startedAt}))
            ),
            0
          )::int
        `
      })
      .from(collaborations)
      .where(and(
        eq(collaborations.userId, userId),
        eq(collaborations.status, 'completed')
      ));

    const avgDurationSeconds = durationStats[0]?.avgDuration || 0;

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivity = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(collaborations)
      .where(and(
        eq(collaborations.userId, userId),
        gte(collaborations.createdAt, sevenDaysAgo)
      ));

    res.json({
      success: true,
      stats: {
        total: {
          collaborations: totalCollaborations[0]?.count || 0,
          completed: completedCollaborations[0]?.count || 0,
          failed: failedCollaborations[0]?.count || 0,
          messages: totalMessages[0]?.count || 0,
          recentActivity: recentActivity[0]?.count || 0
        },
        successRate: totalCollaborations[0]?.count > 0
          ? ((completedCollaborations[0]?.count || 0) / totalCollaborations[0].count) * 100
          : 0,
        tokens: {
          total: tokenStats[0]?.totalTokens || 0,
          average: tokenStats[0]?.avgTokens || 0,
          max: tokenStats[0]?.maxTokens || 0,
          estimatedCost: estimatedCost.toFixed(4)
        },
        duration: {
          averageSeconds: avgDurationSeconds,
          averageMinutes: (avgDurationSeconds / 60).toFixed(1)
        },
        agents: agentActivity
      }
    });
  } catch (error) {
    console.error('[ANALYTICS_STATS]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/collaboration-analytics/trends
 *
 * Get collaboration trends over time (daily breakdown)
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const days = parseInt(req.query.days as string) || 7;
    const db = getDb();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyTrends = await db
      .select({
        date: sql<string>`date(${collaborations.createdAt})`,
        count: sql<number>`count(*)::int`,
        completed: sql<number>`sum(case when ${collaborations.status} = 'completed' then 1 else 0 end)::int`,
        failed: sql<number>`sum(case when ${collaborations.status} = 'failed' then 1 else 0 end)::int`
      })
      .from(collaborations)
      .where(and(
        eq(collaborations.userId, userId),
        gte(collaborations.createdAt, startDate)
      ))
      .groupBy(sql`date(${collaborations.createdAt})`)
      .orderBy(sql`date(${collaborations.createdAt})`);

    res.json({
      success: true,
      trends: dailyTrends
    });
  } catch (error) {
    console.error('[ANALYTICS_TRENDS]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trends' });
  }
});

/**
 * GET /api/collaboration-analytics/agent-performance
 *
 * Get detailed agent performance metrics
 */
router.get('/agent-performance', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const db = getDb();

    const agentPerformance = await db
      .select({
        agentId: collaborationMessages.agentId,
        agentName: collaborationMessages.agentName,
        totalMessages: sql<number>`count(*)::int`,
        avgTokensPerMessage: sql<number>`coalesce(avg(${collaborationMessages.tokensUsed}), 0)::int`,
        totalTokens: sql<number>`coalesce(sum(${collaborationMessages.tokensUsed}), 0)::int`,
        avgConfidence: sql<number>`coalesce(avg(${collaborationMessages.confidence}), 0)::int`,
        avgLatency: sql<number>`coalesce(avg(${collaborationMessages.latencyMs}), 0)::int`
      })
      .from(collaborationMessages)
      .innerJoin(
        collaborations,
        eq(collaborationMessages.collaborationId, collaborations.id)
      )
      .where(and(
        eq(collaborations.userId, userId),
        sql`${collaborationMessages.agentId} != 'user'`
      ))
      .groupBy(collaborationMessages.agentId, collaborationMessages.agentName)
      .orderBy(sql`count(*) desc`);

    res.json({
      success: true,
      performance: agentPerformance
    });
  } catch (error) {
    console.error('[ANALYTICS_PERFORMANCE]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch performance' });
  }
});

export default router;
