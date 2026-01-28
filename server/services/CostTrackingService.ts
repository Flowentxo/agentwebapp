/**
 * COST TRACKING SERVICE
 *
 * Tracks AI model usage costs and provides analytics
 */

import { getDb } from '@/lib/db';
import { aiUsage, AIUsage, NewAIUsage } from '@/lib/db/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { getModelConfig } from '@/lib/ai/model-config';

// ============================================================
// TYPES
// ============================================================

export interface CostEntry {
  id: string;
  agentId: string;
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number; // in micro-dollars
  responseTimeMs: number | null;
  success: boolean;
  errorType: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface CostSummary {
  totalCost: number; // in dollars
  totalTokens: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  costByModel: Record<string, {
    cost: number;
    tokens: number;
    requests: number;
  }>;
  costByAgent: Record<string, {
    cost: number;
    tokens: number;
    requests: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    cost: number;
    tokens: number;
    requests: number;
  }>;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// ============================================================
// COST TRACKING SERVICE
// ============================================================

export class CostTrackingService {
  private db = getDb();

  /**
   * Track AI usage and calculate cost
   */
  async trackUsage(usage: {
    agentId: string;
    userId: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    responseTimeMs?: number;
    success?: boolean;
    errorType?: string;
    metadata?: Record<string, unknown>;
  }): Promise<AIUsage> {
    const totalTokens = usage.promptTokens + usage.completionTokens;

    // Calculate cost using model config
    const estimatedCost = this.calculateCost(
      usage.model,
      usage.promptTokens,
      usage.completionTokens
    );

    const [tracked] = await this.db
      .insert(aiUsage)
      .values({
        agentId: usage.agentId,
        userId: usage.userId,
        model: usage.model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens,
        estimatedCost,
        responseTimeMs: usage.responseTimeMs || null,
        success: usage.success ?? true,
        errorType: usage.errorType || null,
        metadata: usage.metadata || {},
      })
      .returning();

    console.log(
      `[COST_TRACKING] Tracked usage: ${usage.model} | ` +
      `${totalTokens} tokens | $${(estimatedCost / 1_000_000).toFixed(6)}`
    );

    return tracked;
  }

  /**
   * Calculate cost in micro-dollars (1/1,000,000 USD)
   */
  private calculateCost(
    model: string,
    promptTokens: number,
    completionTokens: number
  ): number {
    const modelConfig = getModelConfig(model);

    if (!modelConfig) {
      console.warn(`[COST_TRACKING] Unknown model: ${model}, using default pricing`);
      // Default pricing (similar to GPT-4)
      const inputCost = promptTokens * 0.01; // $10 per 1M tokens
      const outputCost = completionTokens * 0.03; // $30 per 1M tokens
      return Math.round(inputCost + outputCost);
    }

    const inputCost = promptTokens * modelConfig.pricing.inputPerToken * 1_000_000;
    const outputCost = completionTokens * modelConfig.pricing.outputPerToken * 1_000_000;

    return Math.round(inputCost + outputCost);
  }

  /**
   * Get cost summary for a date range
   */
  async getCostSummary(
    userId?: string,
    dateRange?: DateRange
  ): Promise<CostSummary> {
    const conditions = [];

    if (userId) {
      conditions.push(eq(aiUsage.userId, userId));
    }

    if (dateRange) {
      conditions.push(gte(aiUsage.createdAt, dateRange.startDate));
      conditions.push(lte(aiUsage.createdAt, dateRange.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get all usage records
    const records = await this.db
      .select()
      .from(aiUsage)
      .where(whereClause)
      .orderBy(desc(aiUsage.createdAt));

    // Calculate summary
    const summary: CostSummary = {
      totalCost: 0,
      totalTokens: 0,
      totalRequests: records.length,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      costByModel: {},
      costByAgent: {},
      dailyBreakdown: [],
    };

    const dailyMap = new Map<string, { cost: number; tokens: number; requests: number }>();
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    for (const record of records) {
      const costInDollars = record.estimatedCost / 1_000_000;
      summary.totalCost += costInDollars;
      summary.totalTokens += record.totalTokens;

      if (record.success) {
        summary.successfulRequests++;
      } else {
        summary.failedRequests++;
      }

      if (record.responseTimeMs) {
        totalResponseTime += record.responseTimeMs;
        responseTimeCount++;
      }

      // Cost by model
      if (!summary.costByModel[record.model]) {
        summary.costByModel[record.model] = { cost: 0, tokens: 0, requests: 0 };
      }
      summary.costByModel[record.model].cost += costInDollars;
      summary.costByModel[record.model].tokens += record.totalTokens;
      summary.costByModel[record.model].requests++;

      // Cost by agent
      if (!summary.costByAgent[record.agentId]) {
        summary.costByAgent[record.agentId] = { cost: 0, tokens: 0, requests: 0 };
      }
      summary.costByAgent[record.agentId].cost += costInDollars;
      summary.costByAgent[record.agentId].tokens += record.totalTokens;
      summary.costByAgent[record.agentId].requests++;

      // Daily breakdown
      const dateKey = record.createdAt.toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { cost: 0, tokens: 0, requests: 0 });
      }
      const daily = dailyMap.get(dateKey)!;
      daily.cost += costInDollars;
      daily.tokens += record.totalTokens;
      daily.requests++;
    }

    summary.avgResponseTime = responseTimeCount > 0
      ? Math.round(totalResponseTime / responseTimeCount)
      : 0;

    // Convert daily map to array
    summary.dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return summary;
  }

  /**
   * Get recent usage records
   */
  async getRecentUsage(
    userId?: string,
    limit: number = 100
  ): Promise<CostEntry[]> {
    const conditions = userId ? [eq(aiUsage.userId, userId)] : [];
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const records = await this.db
      .select()
      .from(aiUsage)
      .where(whereClause)
      .orderBy(desc(aiUsage.createdAt))
      .limit(limit);

    return records.map(record => ({
      id: record.id,
      agentId: record.agentId,
      userId: record.userId,
      model: record.model,
      promptTokens: record.promptTokens,
      completionTokens: record.completionTokens,
      totalTokens: record.totalTokens,
      estimatedCost: record.estimatedCost,
      responseTimeMs: record.responseTimeMs,
      success: record.success,
      errorType: record.errorType,
      metadata: record.metadata as Record<string, unknown>,
      createdAt: record.createdAt,
    }));
  }

  /**
   * Get cost summary by agent
   */
  async getCostByAgent(
    agentId: string,
    dateRange?: DateRange
  ): Promise<{
    agentId: string;
    totalCost: number;
    totalTokens: number;
    totalRequests: number;
    modelBreakdown: Record<string, { cost: number; tokens: number; requests: number }>;
  }> {
    const conditions = [eq(aiUsage.agentId, agentId)];

    if (dateRange) {
      conditions.push(gte(aiUsage.createdAt, dateRange.startDate));
      conditions.push(lte(aiUsage.createdAt, dateRange.endDate));
    }

    const records = await this.db
      .select()
      .from(aiUsage)
      .where(and(...conditions));

    const modelBreakdown: Record<string, { cost: number; tokens: number; requests: number }> = {};
    let totalCost = 0;
    let totalTokens = 0;

    for (const record of records) {
      const costInDollars = record.estimatedCost / 1_000_000;
      totalCost += costInDollars;
      totalTokens += record.totalTokens;

      if (!modelBreakdown[record.model]) {
        modelBreakdown[record.model] = { cost: 0, tokens: 0, requests: 0 };
      }
      modelBreakdown[record.model].cost += costInDollars;
      modelBreakdown[record.model].tokens += record.totalTokens;
      modelBreakdown[record.model].requests++;
    }

    return {
      agentId,
      totalCost,
      totalTokens,
      totalRequests: records.length,
      modelBreakdown,
    };
  }

  /**
   * Get monthly cost report
   */
  async getMonthlyCostReport(
    userId?: string,
    year?: number,
    month?: number
  ): Promise<CostSummary> {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth();

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    return this.getCostSummary(userId, { startDate, endDate });
  }

  /**
   * Get cost trends (last 30 days)
   */
  async getCostTrends(userId?: string): Promise<{
    last7Days: CostSummary;
    last30Days: CostSummary;
    trend: 'up' | 'down' | 'stable';
    percentageChange: number;
  }> {
    const now = new Date();

    const last7DaysStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const prev7DaysStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const last7Days = await this.getCostSummary(userId, {
      startDate: last7DaysStart,
      endDate: now,
    });

    const last30Days = await this.getCostSummary(userId, {
      startDate: last30DaysStart,
      endDate: now,
    });

    const prev7Days = await this.getCostSummary(userId, {
      startDate: prev7DaysStart,
      endDate: last7DaysStart,
    });

    const percentageChange = prev7Days.totalCost > 0
      ? ((last7Days.totalCost - prev7Days.totalCost) / prev7Days.totalCost) * 100
      : 0;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (percentageChange > 5) trend = 'up';
    else if (percentageChange < -5) trend = 'down';

    return {
      last7Days,
      last30Days,
      trend,
      percentageChange: Math.round(percentageChange * 100) / 100,
    };
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const costTrackingService = new CostTrackingService();
