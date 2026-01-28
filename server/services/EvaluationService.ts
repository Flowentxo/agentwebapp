/**
 * EVALUATION SERVICE
 *
 * Quality Evaluation & Feedback Loop
 *
 * Service for analyzing AI response quality based on user feedback.
 * Provides:
 * - Review queue for negative feedback
 * - Quality metrics per model/prompt
 * - Satisfaction score calculations
 */

import { getDb } from '@/lib/db';
import {
  traceFeedback,
  TraceFeedback,
  aiRequestTraces,
} from '@/lib/db/schema-observability';
import { eq, desc, and, sql, count } from 'drizzle-orm';

// ============================================================================
// TYPES
// ============================================================================

export interface FeedbackWithTrace extends TraceFeedback {
  trace?: {
    provider: string;
    responseTimeMs: number | null;
    totalTokens: number | null;
    totalCost: string | null;
  };
}

export interface QualityMetrics {
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  satisfactionScore: number; // Percentage of positive feedback
  pendingReviews: number;
}

export interface ModelQuality {
  model: string;
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  satisfactionScore: number;
}

export interface PromptQuality {
  promptSlug: string;
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  satisfactionScore: number;
}

export interface AgentQuality {
  agentId: string;
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  satisfactionScore: number;
}

export interface ReviewQueueFilters {
  status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  rating?: 'positive' | 'negative';
  agentId?: string;
  model?: string;
  promptSlug?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// EVALUATION SERVICE CLASS
// ============================================================================

export class EvaluationService {
  private db = getDb();

  // --------------------------------------------------------------------------
  // REVIEW QUEUE
  // --------------------------------------------------------------------------

  /**
   * Get feedback items for the review queue
   */
  async getReviewQueue(filters: ReviewQueueFilters = {}): Promise<{
    items: FeedbackWithTrace[];
    total: number;
  }> {
    const {
      status = 'pending',
      rating,
      agentId,
      model,
      promptSlug,
      limit = 50,
      offset = 0,
    } = filters;

    // Build conditions
    const conditions = [];

    if (status) {
      conditions.push(eq(traceFeedback.reviewStatus, status as any));
    }
    if (rating) {
      conditions.push(eq(traceFeedback.rating, rating as any));
    }
    if (agentId) {
      conditions.push(eq(traceFeedback.agentId, agentId));
    }
    if (model) {
      conditions.push(eq(traceFeedback.model, model));
    }
    if (promptSlug) {
      conditions.push(eq(traceFeedback.promptSlug, promptSlug));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get items with trace data
    const [items, countResult] = await Promise.all([
      this.db
        .select({
          feedback: traceFeedback,
          trace: {
            provider: aiRequestTraces.provider,
            responseTimeMs: aiRequestTraces.responseTimeMs,
            totalTokens: aiRequestTraces.totalTokens,
            totalCost: aiRequestTraces.totalCost,
          },
        })
        .from(traceFeedback)
        .leftJoin(aiRequestTraces, eq(traceFeedback.traceId, aiRequestTraces.traceId))
        .where(whereClause)
        .orderBy(desc(traceFeedback.createdAt))
        .limit(limit)
        .offset(offset),

      this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(traceFeedback)
        .where(whereClause),
    ]);

    const feedbackItems: FeedbackWithTrace[] = items.map((item) => ({
      ...item.feedback,
      trace: item.trace ? {
        provider: item.trace.provider,
        responseTimeMs: item.trace.responseTimeMs,
        totalTokens: item.trace.totalTokens,
        totalCost: item.trace.totalCost,
      } : undefined,
    }));

    return {
      items: feedbackItems,
      total: Number(countResult[0]?.count || 0),
    };
  }

  /**
   * Get all low-rated (negative) traces for review
   */
  async getLowRatedTraces(limit = 50): Promise<FeedbackWithTrace[]> {
    const result = await this.getReviewQueue({
      rating: 'negative',
      status: 'pending',
      limit,
    });
    return result.items;
  }

  /**
   * Update the review status of a feedback item
   */
  async updateReviewStatus(
    feedbackId: string,
    status: 'reviewed' | 'resolved' | 'dismissed',
    reviewedBy: string,
    notes?: string
  ): Promise<TraceFeedback | null> {
    const [updated] = await this.db
      .update(traceFeedback)
      .set({
        reviewStatus: status as any,
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes: notes,
      })
      .where(eq(traceFeedback.id, feedbackId))
      .returning();

    return updated || null;
  }

  // --------------------------------------------------------------------------
  // QUALITY METRICS
  // --------------------------------------------------------------------------

  /**
   * Get overall quality metrics
   */
  async getQualityMetrics(days = 30): Promise<QualityMetrics> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const [metrics] = await this.db
      .select({
        totalFeedback: sql<number>`COUNT(*)`,
        positiveFeedback: sql<number>`COUNT(*) FILTER (WHERE ${traceFeedback.rating} = 'positive')`,
        negativeFeedback: sql<number>`COUNT(*) FILTER (WHERE ${traceFeedback.rating} = 'negative')`,
        pendingReviews: sql<number>`COUNT(*) FILTER (WHERE ${traceFeedback.reviewStatus} = 'pending' AND ${traceFeedback.rating} = 'negative')`,
      })
      .from(traceFeedback)
      .where(sql`${traceFeedback.createdAt} >= ${cutoffDate}`);

    const total = Number(metrics?.totalFeedback || 0);
    const positive = Number(metrics?.positiveFeedback || 0);
    const negative = Number(metrics?.negativeFeedback || 0);

    return {
      totalFeedback: total,
      positiveFeedback: positive,
      negativeFeedback: negative,
      satisfactionScore: total > 0 ? Math.round((positive / total) * 100) : 100,
      pendingReviews: Number(metrics?.pendingReviews || 0),
    };
  }

  /**
   * Get quality metrics grouped by model
   */
  async getQualityByModel(days = 30): Promise<ModelQuality[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const results = await this.db
      .select({
        model: traceFeedback.model,
        totalFeedback: sql<number>`COUNT(*)`,
        positiveFeedback: sql<number>`COUNT(*) FILTER (WHERE ${traceFeedback.rating} = 'positive')`,
        negativeFeedback: sql<number>`COUNT(*) FILTER (WHERE ${traceFeedback.rating} = 'negative')`,
      })
      .from(traceFeedback)
      .where(
        and(
          sql`${traceFeedback.createdAt} >= ${cutoffDate}`,
          sql`${traceFeedback.model} IS NOT NULL`
        )
      )
      .groupBy(traceFeedback.model)
      .orderBy(desc(sql`COUNT(*)`));

    return results.map((r) => {
      const total = Number(r.totalFeedback);
      const positive = Number(r.positiveFeedback);
      return {
        model: r.model || 'unknown',
        totalFeedback: total,
        positiveFeedback: positive,
        negativeFeedback: Number(r.negativeFeedback),
        satisfactionScore: total > 0 ? Math.round((positive / total) * 100) : 100,
      };
    });
  }

  /**
   * Get quality metrics grouped by prompt slug
   */
  async getQualityByPrompt(days = 30): Promise<PromptQuality[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const results = await this.db
      .select({
        promptSlug: traceFeedback.promptSlug,
        totalFeedback: sql<number>`COUNT(*)`,
        positiveFeedback: sql<number>`COUNT(*) FILTER (WHERE ${traceFeedback.rating} = 'positive')`,
        negativeFeedback: sql<number>`COUNT(*) FILTER (WHERE ${traceFeedback.rating} = 'negative')`,
      })
      .from(traceFeedback)
      .where(
        and(
          sql`${traceFeedback.createdAt} >= ${cutoffDate}`,
          sql`${traceFeedback.promptSlug} IS NOT NULL`
        )
      )
      .groupBy(traceFeedback.promptSlug)
      .orderBy(desc(sql`COUNT(*)`));

    return results.map((r) => {
      const total = Number(r.totalFeedback);
      const positive = Number(r.positiveFeedback);
      return {
        promptSlug: r.promptSlug || 'unknown',
        totalFeedback: total,
        positiveFeedback: positive,
        negativeFeedback: Number(r.negativeFeedback),
        satisfactionScore: total > 0 ? Math.round((positive / total) * 100) : 100,
      };
    });
  }

  /**
   * Get quality metrics grouped by agent
   */
  async getQualityByAgent(days = 30): Promise<AgentQuality[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const results = await this.db
      .select({
        agentId: traceFeedback.agentId,
        totalFeedback: sql<number>`COUNT(*)`,
        positiveFeedback: sql<number>`COUNT(*) FILTER (WHERE ${traceFeedback.rating} = 'positive')`,
        negativeFeedback: sql<number>`COUNT(*) FILTER (WHERE ${traceFeedback.rating} = 'negative')`,
      })
      .from(traceFeedback)
      .where(
        and(
          sql`${traceFeedback.createdAt} >= ${cutoffDate}`,
          sql`${traceFeedback.agentId} IS NOT NULL`
        )
      )
      .groupBy(traceFeedback.agentId)
      .orderBy(desc(sql`COUNT(*)`));

    return results.map((r) => {
      const total = Number(r.totalFeedback);
      const positive = Number(r.positiveFeedback);
      return {
        agentId: r.agentId || 'unknown',
        totalFeedback: total,
        positiveFeedback: positive,
        negativeFeedback: Number(r.negativeFeedback),
        satisfactionScore: total > 0 ? Math.round((positive / total) * 100) : 100,
      };
    });
  }

  /**
   * Get the most problematic prompt (lowest satisfaction score)
   */
  async getMostFailingPrompt(days = 30): Promise<PromptQuality | null> {
    const prompts = await this.getQualityByPrompt(days);

    // Filter prompts with at least 5 feedback items
    const significantPrompts = prompts.filter((p) => p.totalFeedback >= 5);

    if (significantPrompts.length === 0) {
      return prompts.length > 0 ? prompts[prompts.length - 1] : null;
    }

    // Return the one with lowest satisfaction score
    return significantPrompts.reduce((worst, current) =>
      current.satisfactionScore < worst.satisfactionScore ? current : worst
    );
  }

  /**
   * Get feedback trend over time
   */
  async getFeedbackTrend(days = 30): Promise<Array<{
    date: string;
    positive: number;
    negative: number;
    total: number;
  }>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const results = await this.db
      .select({
        date: sql<string>`DATE(${traceFeedback.createdAt})`,
        positive: sql<number>`COUNT(*) FILTER (WHERE ${traceFeedback.rating} = 'positive')`,
        negative: sql<number>`COUNT(*) FILTER (WHERE ${traceFeedback.rating} = 'negative')`,
        total: sql<number>`COUNT(*)`,
      })
      .from(traceFeedback)
      .where(sql`${traceFeedback.createdAt} >= ${cutoffDate}`)
      .groupBy(sql`DATE(${traceFeedback.createdAt})`)
      .orderBy(sql`DATE(${traceFeedback.createdAt})`);

    return results.map((r) => ({
      date: r.date,
      positive: Number(r.positive),
      negative: Number(r.negative),
      total: Number(r.total),
    }));
  }

  // --------------------------------------------------------------------------
  // SINGLE FEEDBACK OPERATIONS
  // --------------------------------------------------------------------------

  /**
   * Get a single feedback item by ID
   */
  async getFeedbackById(id: string): Promise<FeedbackWithTrace | null> {
    const [result] = await this.db
      .select({
        feedback: traceFeedback,
        trace: {
          provider: aiRequestTraces.provider,
          responseTimeMs: aiRequestTraces.responseTimeMs,
          totalTokens: aiRequestTraces.totalTokens,
          totalCost: aiRequestTraces.totalCost,
        },
      })
      .from(traceFeedback)
      .leftJoin(aiRequestTraces, eq(traceFeedback.traceId, aiRequestTraces.traceId))
      .where(eq(traceFeedback.id, id))
      .limit(1);

    if (!result) return null;

    return {
      ...result.feedback,
      trace: result.trace ? {
        provider: result.trace.provider,
        responseTimeMs: result.trace.responseTimeMs,
        totalTokens: result.trace.totalTokens,
        totalCost: result.trace.totalCost,
      } : undefined,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let evaluationServiceInstance: EvaluationService | null = null;

export function getEvaluationService(): EvaluationService {
  if (!evaluationServiceInstance) {
    evaluationServiceInstance = new EvaluationService();
  }
  return evaluationServiceInstance;
}

export default EvaluationService;
