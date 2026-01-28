/**
 * Brain AI v2.0 - AI Usage Tracker
 *
 * ISO 42001 compliant tracking of all AI model invocations:
 * - Token usage and cost tracking
 * - Latency monitoring
 * - Audit trail for compliance
 * - Usage analytics and reporting
 */

import { getDb } from '@/lib/db/connection';
import { brainAiUsage, BrainAiUsage } from '@/lib/db/schema-connected-intelligence';
import { eq, and, desc, sql, gte, lte, count, sum } from 'drizzle-orm';
import type { ModelProvider } from './ModelRouter';

// ============================================
// TYPES
// ============================================

export type AIOperation =
  | 'query'
  | 'generate'
  | 'embed'
  | 'summarize'
  | 'standup'
  | 'classify'
  | 'extract'
  | 'translate'
  | 'chat';

export interface UsageRecord {
  workspaceId: string;
  userId: string;
  model: string;
  provider: ModelProvider;
  operation: AIOperation;
  tokensPrompt: number;
  tokensCompletion: number;
  latencyMs?: number;
  success?: boolean;
  errorMessage?: string;
  context?: {
    agentId?: string;
    feature?: string;
    sessionId?: string;
  };
}

export interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  successRate: number;
  byModel: Record<string, { requests: number; tokens: number; cost: number }>;
  byOperation: Record<string, { requests: number; tokens: number }>;
  byDay: { date: string; requests: number; tokens: number; cost: number }[];
}

export interface CostConfig {
  model: string;
  promptCostPer1k: number;
  completionCostPer1k: number;
}

// ============================================
// COST CONFIGURATION
// ============================================

const MODEL_COSTS: CostConfig[] = [
  // OpenAI
  { model: 'gpt-4-turbo', promptCostPer1k: 0.01, completionCostPer1k: 0.03 },
  { model: 'gpt-4o', promptCostPer1k: 0.005, completionCostPer1k: 0.015 },
  { model: 'gpt-4o-mini', promptCostPer1k: 0.00015, completionCostPer1k: 0.0006 },
  { model: 'gpt-3.5-turbo', promptCostPer1k: 0.0005, completionCostPer1k: 0.0015 },
  { model: 'text-embedding-3-small', promptCostPer1k: 0.00002, completionCostPer1k: 0 },
  { model: 'text-embedding-3-large', promptCostPer1k: 0.00013, completionCostPer1k: 0 },

  // Google
  { model: 'gemini-1.5-flash', promptCostPer1k: 0.000075, completionCostPer1k: 0.0003 },
  { model: 'gemini-1.5-pro', promptCostPer1k: 0.00125, completionCostPer1k: 0.005 },
  { model: 'gemini-2.0-flash', promptCostPer1k: 0.0001, completionCostPer1k: 0.0004 },

  // Anthropic
  { model: 'claude-3-opus', promptCostPer1k: 0.015, completionCostPer1k: 0.075 },
  { model: 'claude-3-sonnet', promptCostPer1k: 0.003, completionCostPer1k: 0.015 },
  { model: 'claude-3-haiku', promptCostPer1k: 0.00025, completionCostPer1k: 0.00125 },
];

// ============================================
// AI USAGE TRACKER SERVICE
// ============================================

export class AIUsageTrackerService {
  /**
   * Track an AI model invocation
   */
  async track(record: UsageRecord): Promise<void> {
    const db = getDb();

    // Calculate cost
    const cost = this.calculateCost(
      record.model,
      record.tokensPrompt,
      record.tokensCompletion
    );

    await db.insert(brainAiUsage).values({
      workspaceId: record.workspaceId,
      userId: record.userId,
      model: record.model,
      provider: record.provider,
      operation: record.operation,
      tokensPrompt: record.tokensPrompt,
      tokensCompletion: record.tokensCompletion,
      tokensTotal: record.tokensPrompt + record.tokensCompletion,
      costUsd: cost.toString(),
      latencyMs: record.latencyMs,
      requestContext: record.context || {},
      success: record.success ?? true,
      errorMessage: record.errorMessage,
    });

    console.log(
      `[AI_USAGE] Tracked: ${record.operation} via ${record.model} - ` +
      `${record.tokensPrompt + record.tokensCompletion} tokens, $${cost.toFixed(6)}`
    );
  }

  /**
   * Get usage statistics for a workspace
   */
  async getStats(
    workspaceId: string,
    options: {
      userId?: string;
      from?: Date;
      to?: Date;
    } = {}
  ): Promise<UsageStats> {
    const db = getDb();

    // Build conditions
    const conditions = [eq(brainAiUsage.workspaceId, workspaceId)];

    if (options.userId) {
      conditions.push(eq(brainAiUsage.userId, options.userId));
    }

    if (options.from) {
      conditions.push(gte(brainAiUsage.createdAt, options.from));
    }

    if (options.to) {
      conditions.push(lte(brainAiUsage.createdAt, options.to));
    }

    // Get all usage records
    const records = await db
      .select()
      .from(brainAiUsage)
      .where(and(...conditions))
      .orderBy(desc(brainAiUsage.createdAt));

    // Calculate stats
    const totalRequests = records.length;
    const successfulRequests = records.filter(r => r.success).length;
    const totalTokens = records.reduce((sum, r) => sum + r.tokensTotal, 0);
    const totalCost = records.reduce((sum, r) => sum + parseFloat(r.costUsd || '0'), 0);
    const totalLatency = records.reduce((sum, r) => sum + (r.latencyMs || 0), 0);

    // By model
    const byModel: Record<string, { requests: number; tokens: number; cost: number }> = {};
    for (const r of records) {
      if (!byModel[r.model]) {
        byModel[r.model] = { requests: 0, tokens: 0, cost: 0 };
      }
      byModel[r.model].requests++;
      byModel[r.model].tokens += r.tokensTotal;
      byModel[r.model].cost += parseFloat(r.costUsd || '0');
    }

    // By operation
    const byOperation: Record<string, { requests: number; tokens: number }> = {};
    for (const r of records) {
      if (!byOperation[r.operation]) {
        byOperation[r.operation] = { requests: 0, tokens: 0 };
      }
      byOperation[r.operation].requests++;
      byOperation[r.operation].tokens += r.tokensTotal;
    }

    // By day
    const byDayMap: Record<string, { requests: number; tokens: number; cost: number }> = {};
    for (const r of records) {
      const date = r.createdAt?.toISOString().split('T')[0] || 'unknown';
      if (!byDayMap[date]) {
        byDayMap[date] = { requests: 0, tokens: 0, cost: 0 };
      }
      byDayMap[date].requests++;
      byDayMap[date].tokens += r.tokensTotal;
      byDayMap[date].cost += parseFloat(r.costUsd || '0');
    }

    const byDay = Object.entries(byDayMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalRequests,
      totalTokens,
      totalCost,
      averageLatency: totalRequests > 0 ? totalLatency / totalRequests : 0,
      successRate: totalRequests > 0 ? successfulRequests / totalRequests : 1,
      byModel,
      byOperation,
      byDay,
    };
  }

  /**
   * Get recent usage records
   */
  async getRecentUsage(
    workspaceId: string,
    limit = 100
  ): Promise<BrainAiUsage[]> {
    const db = getDb();

    return db
      .select()
      .from(brainAiUsage)
      .where(eq(brainAiUsage.workspaceId, workspaceId))
      .orderBy(desc(brainAiUsage.createdAt))
      .limit(limit);
  }

  /**
   * Get usage for a specific user
   */
  async getUserUsage(
    workspaceId: string,
    userId: string,
    days = 30
  ): Promise<{
    totalTokens: number;
    totalCost: number;
    requestCount: number;
    topOperations: { operation: string; count: number }[];
  }> {
    const db = getDb();
    const from = new Date();
    from.setDate(from.getDate() - days);

    const records = await db
      .select()
      .from(brainAiUsage)
      .where(
        and(
          eq(brainAiUsage.workspaceId, workspaceId),
          eq(brainAiUsage.userId, userId),
          gte(brainAiUsage.createdAt, from)
        )
      );

    const operationCounts: Record<string, number> = {};
    for (const r of records) {
      operationCounts[r.operation] = (operationCounts[r.operation] || 0) + 1;
    }

    const topOperations = Object.entries(operationCounts)
      .map(([operation, count]) => ({ operation, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalTokens: records.reduce((sum, r) => sum + r.tokensTotal, 0),
      totalCost: records.reduce((sum, r) => sum + parseFloat(r.costUsd || '0'), 0),
      requestCount: records.length,
      topOperations,
    };
  }

  /**
   * Check if user is within budget
   */
  async checkBudget(
    workspaceId: string,
    userId: string,
    budgetUsd: number,
    periodDays = 30
  ): Promise<{
    withinBudget: boolean;
    currentSpend: number;
    remaining: number;
    percentUsed: number;
  }> {
    const usage = await this.getUserUsage(workspaceId, userId, periodDays);

    return {
      withinBudget: usage.totalCost < budgetUsd,
      currentSpend: usage.totalCost,
      remaining: Math.max(0, budgetUsd - usage.totalCost),
      percentUsed: (usage.totalCost / budgetUsd) * 100,
    };
  }

  /**
   * Calculate cost for a model invocation
   */
  calculateCost(
    model: string,
    promptTokens: number,
    completionTokens: number
  ): number {
    const config = MODEL_COSTS.find(c => model.includes(c.model));

    if (!config) {
      // Default fallback cost
      return ((promptTokens + completionTokens) / 1000) * 0.001;
    }

    const promptCost = (promptTokens / 1000) * config.promptCostPer1k;
    const completionCost = (completionTokens / 1000) * config.completionCostPer1k;

    return promptCost + completionCost;
  }

  /**
   * Generate ISO 42001 compliance report
   */
  async generateComplianceReport(
    workspaceId: string,
    from: Date,
    to: Date
  ): Promise<{
    period: { from: string; to: string };
    summary: {
      totalAIInteractions: number;
      uniqueUsers: number;
      modelsUsed: string[];
      operationsPerformed: string[];
      totalTokensProcessed: number;
      estimatedCost: number;
      successRate: number;
    };
    breakdown: {
      byModel: Record<string, number>;
      byOperation: Record<string, number>;
      byUser: Record<string, number>;
    };
    audit: {
      generatedAt: string;
      generatedBy: string;
      dataRetentionPolicy: string;
    };
  }> {
    const db = getDb();

    const records = await db
      .select()
      .from(brainAiUsage)
      .where(
        and(
          eq(brainAiUsage.workspaceId, workspaceId),
          gte(brainAiUsage.createdAt, from),
          lte(brainAiUsage.createdAt, to)
        )
      );

    const uniqueUsers = new Set(records.map(r => r.userId));
    const modelsUsed = [...new Set(records.map(r => r.model))];
    const operationsPerformed = [...new Set(records.map(r => r.operation))];

    const byModel: Record<string, number> = {};
    const byOperation: Record<string, number> = {};
    const byUser: Record<string, number> = {};

    for (const r of records) {
      byModel[r.model] = (byModel[r.model] || 0) + 1;
      byOperation[r.operation] = (byOperation[r.operation] || 0) + 1;
      byUser[r.userId] = (byUser[r.userId] || 0) + 1;
    }

    const successfulRequests = records.filter(r => r.success).length;

    return {
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      summary: {
        totalAIInteractions: records.length,
        uniqueUsers: uniqueUsers.size,
        modelsUsed,
        operationsPerformed,
        totalTokensProcessed: records.reduce((sum, r) => sum + r.tokensTotal, 0),
        estimatedCost: records.reduce((sum, r) => sum + parseFloat(r.costUsd || '0'), 0),
        successRate: records.length > 0 ? successfulRequests / records.length : 1,
      },
      breakdown: {
        byModel,
        byOperation,
        byUser,
      },
      audit: {
        generatedAt: new Date().toISOString(),
        generatedBy: 'Brain AI v2.0 Compliance System',
        dataRetentionPolicy: '90 days rolling window',
      },
    };
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const aiUsageTracker = new AIUsageTrackerService();
