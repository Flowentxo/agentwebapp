/**
 * Admin Analytics Service
 * Provides system-wide analytics and insights for administrators
 * Includes graceful fallback when tables don't exist
 */

import { getDb } from '@/lib/db';
import { aiUsage, customPrompts, promptTemplates, agentMessages, userBudgets } from '@/lib/db/schema';
import { aiRequestTraces } from '@/lib/db/schema-observability';
import { sql, desc, eq, and, gte, lte, count, sum, avg } from 'drizzle-orm';

/**
 * Check if error is due to missing table
 */
function isTableNotFoundError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  return (
    message.includes('relation') && message.includes('does not exist') ||
    message.includes('table') && message.includes('not found') ||
    error?.code === '42P01' // PostgreSQL error code for undefined_table
  );
}

export interface SystemOverview {
  totalUsers: number;
  activeUsers24h: number;
  activeUsers7d: number;
  totalConversations: number;
  totalMessages: number;
  totalAIRequests: number;
  totalCost: number;
  avgCostPerUser: number;
}

export interface ModelStats {
  modelId: string;
  requestCount: number;
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
  successRate: number;
  errorRate: number;
}

export interface AgentStats {
  agentId: string;
  conversationCount: number;
  messageCount: number;
  totalCost: number;
  avgMessagesPerConversation: number;
  popularityScore: number;
}

export interface UserActivityStats {
  userId: string;
  conversationCount: number;
  messageCount: number;
  totalTokens: number;
  totalCost: number;
  favoriteAgent: string | null;
  lastActive: Date;
}

export interface CostTrend {
  date: string;
  cost: number;
  tokens: number;
  requests: number;
}

export interface PromptAnalytics {
  totalCustomPrompts: number;
  totalTemplates: number;
  mostPopularTemplates: Array<{
    templateId: string;
    name: string;
    agentId: string;
    useCount: number;
  }>;
  customPromptsPerAgent: Record<string, number>;
}

// ============================================================================
// AI TELEMETRY ANALYTICS INTERFACES
// ============================================================================

export interface DailyCostData {
  date: string;
  cost: number;
  requests: number;
}

export interface ModelUsageData {
  model: string;
  provider: string;
  requestCount: number;
  totalCost: number;
  totalTokens: number;
  avgResponseTime: number;
  successRate: number;
}

export interface LatencyPercentileData {
  date: string;
  p50: number;
  p90: number;
  p99: number;
  avg: number;
}

export interface TokenUsageData {
  date: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIAnalyticsSummary {
  totalSpend: number;
  totalRequests: number;
  avgLatency: number;
  avgTokensPerRequest: number;
  successRate: number;
  spendChange: number; // Percentage change from previous period
  requestsChange: number;
}

export class AdminAnalyticsService {
  private db = getDb();

  /**
   * Get system-wide overview statistics
   */
  async getSystemOverview(): Promise<SystemOverview> {
    const emptyOverview: SystemOverview = {
      totalUsers: 0,
      activeUsers24h: 0,
      activeUsers7d: 0,
      totalConversations: 0,
      totalMessages: 0,
      totalAIRequests: 0,
      totalCost: 0,
      avgCostPerUser: 0,
    };

    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      let totalUsers = 0;
      let activeUsers24h = 0;
      let activeUsers7d = 0;
      let totalConversations = 0;
      let totalMessages = 0;
      let totalAIRequests = 0;
      let totalCost = 0;

      // Total users (from budgets table) - optional
      try {
        const [totalUsersResult] = await this.db
          .select({ count: count() })
          .from(userBudgets);
        totalUsers = totalUsersResult?.count || 0;
      } catch (e: any) {
        if (!isTableNotFoundError(e)) throw e;
      }

      // Active users in last 24h - optional
      try {
        const [activeUsers24hResult] = await this.db
          .select({ count: count() })
          .from(agentMessages)
          .where(gte(agentMessages.createdAt, yesterday));
        activeUsers24h = activeUsers24hResult?.count || 0;
      } catch (e: any) {
        if (!isTableNotFoundError(e)) throw e;
      }

      // Active users in last 7 days - optional
      try {
        const [activeUsers7dResult] = await this.db
          .select({ count: count() })
          .from(agentMessages)
          .where(gte(agentMessages.createdAt, weekAgo));
        activeUsers7d = activeUsers7dResult?.count || 0;
      } catch (e: any) {
        if (!isTableNotFoundError(e)) throw e;
      }

      // Total conversations (estimated by unique user-agent combinations) - optional
      try {
        const [conversationsResult] = await this.db.execute(
          sql`SELECT COUNT(DISTINCT CONCAT(user_id, '-', agent_id)) as count FROM agent_messages`
        );
        totalConversations = Number((conversationsResult as any).rows?.[0]?.count || 0);
      } catch (e: any) {
        if (!isTableNotFoundError(e)) throw e;
      }

      // Total messages - optional
      try {
        const [totalMessagesResult] = await this.db
          .select({ count: count() })
          .from(agentMessages);
        totalMessages = totalMessagesResult?.count || 0;
      } catch (e: any) {
        if (!isTableNotFoundError(e)) throw e;
      }

      // Total AI requests and cost - optional
      try {
        const [aiStatsResult] = await this.db
          .select({
            totalRequests: count(),
            totalCost: sum(aiUsage.cost),
          })
          .from(aiUsage);
        totalAIRequests = aiStatsResult?.totalRequests || 0;
        totalCost = Number(aiStatsResult?.totalCost || 0);
      } catch (e: any) {
        if (!isTableNotFoundError(e)) throw e;
      }

      return {
        totalUsers,
        activeUsers24h,
        activeUsers7d,
        totalConversations,
        totalMessages,
        totalAIRequests,
        totalCost,
        avgCostPerUser: totalUsers > 0 ? totalCost / totalUsers : 0,
      };
    } catch (error: any) {
      console.error('[ADMIN_ANALYTICS] getSystemOverview error:', error);
      return emptyOverview;
    }
  }

  /**
   * Get model usage statistics
   */
  async getModelStats(days: number = 30): Promise<ModelStats[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await this.db
        .select({
          modelId: aiUsage.model,
          requestCount: count(),
          totalTokens: sum(aiUsage.tokensTotal),
          totalCost: sum(aiUsage.cost),
        })
        .from(aiUsage)
        .where(gte(aiUsage.createdAt, startDate))
        .groupBy(aiUsage.model)
        .orderBy(desc(count()));

      // Calculate success rate (would need error tracking table)
      return stats.map((stat) => ({
        modelId: stat.modelId,
        requestCount: stat.requestCount,
        totalTokens: Number(stat.totalTokens || 0),
        totalCost: Number(stat.totalCost || 0),
        avgResponseTime: 0, // TODO: Add response time tracking
        successRate: 100, // TODO: Add error tracking
        errorRate: 0,
      }));
    } catch (error: any) {
      if (isTableNotFoundError(error)) {
        return [];
      }
      console.error('[ADMIN_ANALYTICS] getModelStats error:', error);
      return [];
    }
  }

  /**
   * Get agent usage statistics
   */
  async getAgentStats(days: number = 30): Promise<AgentStats[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get message counts per agent
      let messageCounts: Array<{ agentId: string; messageCount: number }> = [];
      try {
        messageCounts = await this.db
          .select({
            agentId: agentMessages.agentId,
            messageCount: count(),
          })
          .from(agentMessages)
          .where(gte(agentMessages.createdAt, startDate))
          .groupBy(agentMessages.agentId);
      } catch (e: any) {
        if (!isTableNotFoundError(e)) throw e;
      }

      // Get cost per agent
      let costPerAgent: Array<{ agentId: string; totalCost: any }> = [];
      try {
        costPerAgent = await this.db
          .select({
            agentId: aiUsage.agentId,
            totalCost: sum(aiUsage.cost),
          })
          .from(aiUsage)
          .where(gte(aiUsage.createdAt, startDate))
          .groupBy(aiUsage.agentId);
      } catch (e: any) {
        if (!isTableNotFoundError(e)) throw e;
      }

      // Estimate conversations (unique user-agent-date combinations)
      let conversationEstimates: any = { rows: [] };
      try {
        conversationEstimates = await this.db.execute<any>(
          sql`
            SELECT
              agent_id,
              COUNT(DISTINCT CONCAT(user_id, '-', DATE(created_at))) as conversation_count
            FROM agent_messages
            WHERE created_at >= ${startDate}
            GROUP BY agent_id
          `
        );
      } catch (e: any) {
        if (!isTableNotFoundError(e)) throw e;
      }

      // Combine stats
      const statsMap = new Map<string, AgentStats>();

      messageCounts.forEach(({ agentId, messageCount }) => {
        statsMap.set(agentId, {
          agentId,
          conversationCount: 0,
          messageCount,
          totalCost: 0,
          avgMessagesPerConversation: 0,
          popularityScore: messageCount,
        });
      });

      costPerAgent.forEach(({ agentId, totalCost }) => {
        const stat = statsMap.get(agentId);
        if (stat) {
          stat.totalCost = Number(totalCost || 0);
        }
      });

      conversationEstimates.rows?.forEach((row: any) => {
        const stat = statsMap.get(row.agent_id);
        if (stat) {
          stat.conversationCount = Number(row.conversation_count || 0);
          stat.avgMessagesPerConversation =
            stat.conversationCount > 0
              ? stat.messageCount / stat.conversationCount
              : 0;
        }
      });

      return Array.from(statsMap.values()).sort(
        (a, b) => b.popularityScore - a.popularityScore
      );
    } catch (error: any) {
      console.error('[ADMIN_ANALYTICS] getAgentStats error:', error);
      return [];
    }
  }

  /**
   * Get user activity statistics
   */
  async getTopUsers(limit: number = 10): Promise<UserActivityStats[]> {
    try {
      // Get message counts per user
      let userMessages: Array<{ userId: string; messageCount: number }> = [];
      try {
        userMessages = await this.db
          .select({
            userId: agentMessages.userId,
            messageCount: count(),
          })
          .from(agentMessages)
          .groupBy(agentMessages.userId)
          .orderBy(desc(count()))
          .limit(limit);
      } catch (e: any) {
        if (!isTableNotFoundError(e)) throw e;
        return [];
      }

      const stats: UserActivityStats[] = [];

      for (const { userId, messageCount } of userMessages) {
        try {
          // Get conversation count
          let conversationCount = 0;
          try {
            const [conversationResult] = await this.db.execute<any>(
              sql`
                SELECT COUNT(DISTINCT CONCAT(agent_id, '-', DATE(created_at))) as count
                FROM agent_messages
                WHERE user_id = ${userId}
              `
            );
            conversationCount = Number(conversationResult?.rows?.[0]?.count || 0);
          } catch (e: any) {
            if (!isTableNotFoundError(e)) throw e;
          }

          // Get AI usage stats
          let totalTokens = 0;
          let totalCost = 0;
          try {
            const [aiStats] = await this.db
              .select({
                totalTokens: sum(aiUsage.tokensTotal),
                totalCost: sum(aiUsage.cost),
              })
              .from(aiUsage)
              .where(eq(aiUsage.userId, userId));
            totalTokens = Number(aiStats?.totalTokens || 0);
            totalCost = Number(aiStats?.totalCost || 0);
          } catch (e: any) {
            if (!isTableNotFoundError(e)) throw e;
          }

          // Get favorite agent (most used)
          let favoriteAgentId: string | null = null;
          try {
            const [favoriteAgent] = await this.db
              .select({
                agentId: agentMessages.agentId,
                count: count(),
              })
              .from(agentMessages)
              .where(eq(agentMessages.userId, userId))
              .groupBy(agentMessages.agentId)
              .orderBy(desc(count()))
              .limit(1);
            favoriteAgentId = favoriteAgent?.agentId || null;
          } catch (e: any) {
            if (!isTableNotFoundError(e)) throw e;
          }

          // Get last activity
          let lastActive = new Date();
          try {
            const [lastActivity] = await this.db
              .select({
                createdAt: agentMessages.createdAt,
              })
              .from(agentMessages)
              .where(eq(agentMessages.userId, userId))
              .orderBy(desc(agentMessages.createdAt))
              .limit(1);
            lastActive = lastActivity?.createdAt || new Date();
          } catch (e: any) {
            if (!isTableNotFoundError(e)) throw e;
          }

          stats.push({
            userId,
            conversationCount,
            messageCount,
            totalTokens,
            totalCost,
            favoriteAgent: favoriteAgentId,
            lastActive,
          });
        } catch (error: any) {
          console.error(`[ADMIN_ANALYTICS] Error processing user ${userId}:`, error);
        }
      }

      return stats;
    } catch (error: any) {
      console.error('[ADMIN_ANALYTICS] getTopUsers error:', error);
      return [];
    }
  }

  /**
   * Get cost trends over time
   */
  async getCostTrends(days: number = 30): Promise<CostTrend[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const trends = await this.db.execute<any>(
        sql`
          SELECT
            DATE(created_at) as date,
            SUM(CAST(cost AS DECIMAL)) as cost,
            SUM(tokens_total) as tokens,
            COUNT(*) as requests
          FROM ai_usage
          WHERE created_at >= ${startDate}
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `
      );

      return (trends.rows || []).map((row: any) => ({
        date: row.date,
        cost: Number(row.cost || 0),
        tokens: Number(row.tokens || 0),
        requests: Number(row.requests || 0),
      }));
    } catch (error: any) {
      if (isTableNotFoundError(error)) {
        return [];
      }
      console.error('[ADMIN_ANALYTICS] getCostTrends error:', error);
      return [];
    }
  }

  /**
   * Get custom prompts analytics
   */
  async getPromptAnalytics(): Promise<PromptAnalytics> {
    const emptyAnalytics: PromptAnalytics = {
      totalCustomPrompts: 0,
      totalTemplates: 0,
      mostPopularTemplates: [],
      customPromptsPerAgent: {},
    };

    try {
      let totalCustomPrompts = 0;
      let totalTemplates = 0;
      let popularTemplates: any[] = [];
      const customPromptsPerAgent: Record<string, number> = {};

      // Total custom prompts
      try {
        const [totalCustomPromptsResult] = await this.db
          .select({ count: count() })
          .from(customPrompts);
        totalCustomPrompts = totalCustomPromptsResult?.count || 0;
      } catch (e: any) {
        if (!isTableNotFoundError(e)) throw e;
      }

      // Total templates
      try {
        const [totalTemplatesResult] = await this.db
          .select({ count: count() })
          .from(promptTemplates);
        totalTemplates = totalTemplatesResult?.count || 0;
      } catch (e: any) {
        if (!isTableNotFoundError(e)) throw e;
      }

      // Most popular templates
      try {
        popularTemplates = await this.db
          .select({
            templateId: promptTemplates.id,
            name: promptTemplates.name,
            agentId: promptTemplates.agentId,
            useCount: promptTemplates.useCount,
          })
          .from(promptTemplates)
          .orderBy(desc(promptTemplates.useCount))
          .limit(10);
      } catch (e: any) {
        if (!isTableNotFoundError(e)) throw e;
      }

      // Custom prompts per agent
      try {
        const promptsPerAgent = await this.db
          .select({
            agentId: customPrompts.agentId,
            count: count(),
          })
          .from(customPrompts)
          .groupBy(customPrompts.agentId);

        promptsPerAgent.forEach(({ agentId, count }) => {
          customPromptsPerAgent[agentId] = count;
        });
      } catch (e: any) {
        if (!isTableNotFoundError(e)) throw e;
      }

      return {
        totalCustomPrompts,
        totalTemplates,
        mostPopularTemplates: popularTemplates.map((t) => ({
          templateId: t.templateId,
          name: t.name,
          agentId: t.agentId,
          useCount: (t.useCount as any) || 0,
        })),
        customPromptsPerAgent,
      };
    } catch (error: any) {
      console.error('[ADMIN_ANALYTICS] getPromptAnalytics error:', error);
      return emptyAnalytics;
    }
  }

  /**
   * Get budget utilization across all users
   */
  async getBudgetUtilization(): Promise<{
    totalBudget: number;
    totalSpent: number;
    utilizationRate: number;
    usersOverBudget: number;
    usersNearLimit: number;
  }> {
    const emptyUtilization = {
      totalBudget: 0,
      totalSpent: 0,
      utilizationRate: 0,
      usersOverBudget: 0,
      usersNearLimit: 0,
    };

    try {
      const allBudgets = await this.db.select().from(userBudgets);

      let totalBudget = 0;
      let totalSpent = 0;
      let usersOverBudget = 0;
      let usersNearLimit = 0;

      allBudgets.forEach((budget) => {
        const monthlyCost = Number(budget.currentMonthCostUsd || 0);
        const monthlyLimit = Number(budget.monthlyCostLimitUsd || 0);

        totalBudget += monthlyLimit;
        totalSpent += monthlyCost;

        const utilization = monthlyLimit > 0 ? (monthlyCost / monthlyLimit) * 100 : 0;

        if (utilization >= 100) {
          usersOverBudget++;
        } else if (utilization >= 80) {
          usersNearLimit++;
        }
      });

      return {
        totalBudget,
        totalSpent,
        utilizationRate: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
        usersOverBudget,
        usersNearLimit,
      };
    } catch (error: any) {
      if (isTableNotFoundError(error)) {
        return emptyUtilization;
      }
      console.error('[ADMIN_ANALYTICS] getBudgetUtilization error:', error);
      return emptyUtilization;
    }
  }

  // ============================================================================
  // AI TELEMETRY ANALYTICS METHODS (from ai_request_traces table)
  // ============================================================================

  /**
   * Get daily cost trend from AI request traces
   * Aggregates total_cost per day for the specified period
   */
  async getDailyCostTrend(days: number = 30): Promise<DailyCostData[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await this.db.execute<any>(
        sql`
          SELECT
            DATE(started_at) as date,
            COALESCE(SUM(CAST(total_cost AS DECIMAL)), 0) as cost,
            COUNT(*) as requests
          FROM ai_request_traces
          WHERE started_at >= ${startDate}
          GROUP BY DATE(started_at)
          ORDER BY date ASC
        `
      );

      return (result.rows || []).map((row: any) => ({
        date: row.date instanceof Date
          ? row.date.toISOString().split('T')[0]
          : String(row.date),
        cost: Number(row.cost || 0),
        requests: Number(row.requests || 0),
      }));
    } catch (error: any) {
      if (isTableNotFoundError(error)) {
        return [];
      }
      console.error('[ADMIN_ANALYTICS] getDailyCostTrend error:', error);
      return [];
    }
  }

  /**
   * Get model usage statistics
   * Groups by model to show request counts, costs, and performance
   */
  async getModelUsageStats(days: number = 30): Promise<ModelUsageData[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await this.db.execute<any>(
        sql`
          SELECT
            model,
            provider,
            COUNT(*) as request_count,
            COALESCE(SUM(CAST(total_cost AS DECIMAL)), 0) as total_cost,
            COALESCE(SUM(total_tokens), 0) as total_tokens,
            COALESCE(AVG(response_time_ms), 0) as avg_response_time,
            ROUND(
              100.0 * COUNT(*) FILTER (WHERE status = 'success') / NULLIF(COUNT(*), 0),
              2
            ) as success_rate
          FROM ai_request_traces
          WHERE started_at >= ${startDate}
          GROUP BY model, provider
          ORDER BY request_count DESC
        `
      );

      return (result.rows || []).map((row: any) => ({
        model: row.model || 'unknown',
        provider: row.provider || 'unknown',
        requestCount: Number(row.request_count || 0),
        totalCost: Number(row.total_cost || 0),
        totalTokens: Number(row.total_tokens || 0),
        avgResponseTime: Math.round(Number(row.avg_response_time || 0)),
        successRate: Number(row.success_rate || 100),
      }));
    } catch (error: any) {
      if (isTableNotFoundError(error)) {
        return [];
      }
      console.error('[ADMIN_ANALYTICS] getModelUsageStats error:', error);
      return [];
    }
  }

  /**
   * Get latency percentiles per day
   * Calculates p50, p90, p99 latencies (or averages if percentiles not supported)
   */
  async getLatencyPercentiles(days: number = 30): Promise<LatencyPercentileData[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // PostgreSQL supports percentile_cont for accurate percentiles
      const result = await this.db.execute<any>(
        sql`
          SELECT
            DATE(started_at) as date,
            COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms), 0) as p50,
            COALESCE(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY response_time_ms), 0) as p90,
            COALESCE(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms), 0) as p99,
            COALESCE(AVG(response_time_ms), 0) as avg
          FROM ai_request_traces
          WHERE started_at >= ${startDate}
            AND response_time_ms IS NOT NULL
          GROUP BY DATE(started_at)
          ORDER BY date ASC
        `
      );

      return (result.rows || []).map((row: any) => ({
        date: row.date instanceof Date
          ? row.date.toISOString().split('T')[0]
          : String(row.date),
        p50: Math.round(Number(row.p50 || 0)),
        p90: Math.round(Number(row.p90 || 0)),
        p99: Math.round(Number(row.p99 || 0)),
        avg: Math.round(Number(row.avg || 0)),
      }));
    } catch (error: any) {
      if (isTableNotFoundError(error)) {
        return [];
      }
      console.error('[ADMIN_ANALYTICS] getLatencyPercentiles error:', error);
      return [];
    }
  }

  /**
   * Get token usage trend (prompt vs completion tokens per day)
   */
  async getTokenUsageTrend(days: number = 30): Promise<TokenUsageData[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await this.db.execute<any>(
        sql`
          SELECT
            DATE(started_at) as date,
            COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
            COALESCE(SUM(completion_tokens), 0) as completion_tokens,
            COALESCE(SUM(total_tokens), 0) as total_tokens
          FROM ai_request_traces
          WHERE started_at >= ${startDate}
          GROUP BY DATE(started_at)
          ORDER BY date ASC
        `
      );

      return (result.rows || []).map((row: any) => ({
        date: row.date instanceof Date
          ? row.date.toISOString().split('T')[0]
          : String(row.date),
        promptTokens: Number(row.prompt_tokens || 0),
        completionTokens: Number(row.completion_tokens || 0),
        totalTokens: Number(row.total_tokens || 0),
      }));
    } catch (error: any) {
      if (isTableNotFoundError(error)) {
        return [];
      }
      console.error('[ADMIN_ANALYTICS] getTokenUsageTrend error:', error);
      return [];
    }
  }

  /**
   * Get AI analytics summary with period comparison
   * Provides KPI data and change percentages vs previous period
   */
  async getAIAnalyticsSummary(days: number = 30): Promise<AIAnalyticsSummary> {
    const emptySummary: AIAnalyticsSummary = {
      totalSpend: 0,
      totalRequests: 0,
      avgLatency: 0,
      avgTokensPerRequest: 0,
      successRate: 100,
      spendChange: 0,
      requestsChange: 0,
    };

    try {
      const now = new Date();
      const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const prevPeriodStart = new Date(periodStart.getTime() - days * 24 * 60 * 60 * 1000);

      // Current period stats
      const [currentStats] = await this.db.execute<any>(
        sql`
          SELECT
            COALESCE(SUM(CAST(total_cost AS DECIMAL)), 0) as total_spend,
            COUNT(*) as total_requests,
            COALESCE(AVG(response_time_ms), 0) as avg_latency,
            COALESCE(AVG(total_tokens), 0) as avg_tokens,
            ROUND(
              100.0 * COUNT(*) FILTER (WHERE status = 'success') / NULLIF(COUNT(*), 0),
              2
            ) as success_rate
          FROM ai_request_traces
          WHERE started_at >= ${periodStart}
        `
      );

      // Previous period stats (for comparison)
      const [prevStats] = await this.db.execute<any>(
        sql`
          SELECT
            COALESCE(SUM(CAST(total_cost AS DECIMAL)), 0) as total_spend,
            COUNT(*) as total_requests
          FROM ai_request_traces
          WHERE started_at >= ${prevPeriodStart}
            AND started_at < ${periodStart}
        `
      );

      const current = currentStats?.rows?.[0] || {};
      const prev = prevStats?.rows?.[0] || {};

      const totalSpend = Number(current.total_spend || 0);
      const totalRequests = Number(current.total_requests || 0);
      const prevSpend = Number(prev.total_spend || 0);
      const prevRequests = Number(prev.total_requests || 0);

      // Calculate percentage changes
      const spendChange = prevSpend > 0
        ? Math.round(((totalSpend - prevSpend) / prevSpend) * 100)
        : 0;
      const requestsChange = prevRequests > 0
        ? Math.round(((totalRequests - prevRequests) / prevRequests) * 100)
        : 0;

      return {
        totalSpend,
        totalRequests,
        avgLatency: Math.round(Number(current.avg_latency || 0)),
        avgTokensPerRequest: Math.round(Number(current.avg_tokens || 0)),
        successRate: Number(current.success_rate || 100),
        spendChange,
        requestsChange,
      };
    } catch (error: any) {
      if (isTableNotFoundError(error)) {
        return emptySummary;
      }
      console.error('[ADMIN_ANALYTICS] getAIAnalyticsSummary error:', error);
      return emptySummary;
    }
  }

  /**
   * Detect cost anomalies (days with unusually high spend)
   * Returns dates where cost exceeded 2x the average
   */
  async detectCostAnomalies(days: number = 30): Promise<Array<{
    date: string;
    cost: number;
    avgCost: number;
    deviation: number;
  }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await this.db.execute<any>(
        sql`
          WITH daily_costs AS (
            SELECT
              DATE(started_at) as date,
              SUM(CAST(total_cost AS DECIMAL)) as daily_cost
            FROM ai_request_traces
            WHERE started_at >= ${startDate}
            GROUP BY DATE(started_at)
          ),
          stats AS (
            SELECT AVG(daily_cost) as avg_cost, STDDEV(daily_cost) as stddev_cost
            FROM daily_costs
          )
          SELECT
            dc.date,
            dc.daily_cost as cost,
            s.avg_cost,
            CASE
              WHEN s.avg_cost > 0 THEN (dc.daily_cost - s.avg_cost) / s.avg_cost * 100
              ELSE 0
            END as deviation
          FROM daily_costs dc, stats s
          WHERE dc.daily_cost > s.avg_cost * 2
          ORDER BY dc.date DESC
        `
      );

      return (result.rows || []).map((row: any) => ({
        date: row.date instanceof Date
          ? row.date.toISOString().split('T')[0]
          : String(row.date),
        cost: Number(row.cost || 0),
        avgCost: Number(row.avg_cost || 0),
        deviation: Math.round(Number(row.deviation || 0)),
      }));
    } catch (error: any) {
      if (isTableNotFoundError(error)) {
        return [];
      }
      console.error('[ADMIN_ANALYTICS] detectCostAnomalies error:', error);
      return [];
    }
  }
}

// Singleton instance
export const adminAnalyticsService = new AdminAnalyticsService();
