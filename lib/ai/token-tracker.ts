/**
 * Token Tracking and Cost Calculation Service
 * Tracks OpenAI API usage, token consumption, and estimated costs
 * Updated to use CostTrackingService for better model pricing support
 */

import { costTrackingService } from '@/server/services/CostTrackingService';

/**
 * Format micro-dollars to USD string
 */
export function formatCost(microDollars: number): string {
  const dollars = microDollars / 1_000_000;
  return `$${dollars.toFixed(6)}`;
}

/**
 * Track AI usage in database
 * Delegates to CostTrackingService for accurate model-based pricing
 */
export async function trackUsage(params: {
  agentId: string;
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  responseTimeMs?: number;
  success?: boolean;
  errorType?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await costTrackingService.trackUsage({
      agentId: params.agentId,
      userId: params.userId,
      model: params.model,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      responseTimeMs: params.responseTimeMs,
      success: params.success,
      errorType: params.errorType,
      metadata: params.metadata,
    });
  } catch (error) {
    console.error('[TOKEN_TRACKER] Failed to track usage:', error);
    // Don't throw - tracking failure shouldn't break the main flow
  }
}

/**
 * Get usage statistics for a user
 * Delegates to CostTrackingService
 */
export async function getUserUsageStats(
  userId: string,
  options: {
    agentId?: string;
    since?: Date;
    limit?: number;
  } = {}
) {
  const dateRange = options.since
    ? { startDate: options.since, endDate: new Date() }
    : undefined;

  const summary = await costTrackingService.getCostSummary(userId, dateRange);
  const records = await costTrackingService.getRecentUsage(userId, options.limit || 100);

  return {
    stats: {
      totalRequests: summary.totalRequests,
      successfulRequests: summary.successfulRequests,
      failedRequests: summary.failedRequests,
      totalTokens: summary.totalTokens,
      totalCostUSD: summary.totalCost,
      totalCostMicroDollars: Math.round(summary.totalCost * 1_000_000),
      avgResponseTimeMs: summary.avgResponseTime,
      modelBreakdown: Object.fromEntries(
        Object.entries(summary.costByModel).map(([model, data]) => [
          model,
          {
            requests: data.requests,
            tokens: data.tokens,
            cost: Math.round(data.cost * 1_000_000),
          },
        ])
      ),
    },
    records,
  };
}

/**
 * Get organization-wide usage stats (admin view)
 * Delegates to CostTrackingService
 */
export async function getOrgUsageStats(options: {
  since?: Date;
  limit?: number;
} = {}) {
  const dateRange = options.since
    ? { startDate: options.since, endDate: new Date() }
    : undefined;

  const summary = await costTrackingService.getCostSummary(undefined, dateRange);

  return {
    totalRequests: summary.totalRequests,
    totalTokens: summary.totalTokens,
    totalCostMicroDollars: Math.round(summary.totalCost * 1_000_000),
    totalCostUSD: summary.totalCost,
    successRate:
      summary.totalRequests > 0
        ? (summary.successfulRequests / summary.totalRequests) * 100
        : 0,
  };
}
