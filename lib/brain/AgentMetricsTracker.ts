/**
 * Agent Metrics Tracker
 * Monitors agent-brain interactions and performance
 *
 * Features:
 * - Real-time metrics collection
 * - Performance tracking
 * - Usage analytics
 * - Alerting for anomalies
 */

import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { redisCache } from './RedisCache';

// ============================================
// Types
// ============================================

export interface AgentInteractionMetrics {
  agentId: string;
  period: 'hour' | 'day' | 'week';
  metrics: {
    totalQueries: number;
    successfulQueries: number;
    failedQueries: number;
    averageResponseTime: number;
    totalContextsStored: number;
    totalDocumentsIndexed: number;
    cacheHitRate: number;
  };
  performance: {
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  };
  usage: {
    totalApiCalls: number;
    totalTokensUsed: number;
    estimatedCost: number;
  };
}

export interface AgentAlert {
  severity: 'info' | 'warning' | 'critical';
  type: string;
  message: string;
  agentId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// ============================================
// Agent Metrics Tracker
// ============================================

export class AgentMetricsTracker {
  private static instance: AgentMetricsTracker;

  private constructor() {}

  public static getInstance(): AgentMetricsTracker {
    if (!AgentMetricsTracker.instance) {
      AgentMetricsTracker.instance = new AgentMetricsTracker();
    }
    return AgentMetricsTracker.instance;
  }

  // ============================================
  // Metrics Collection
  // ============================================

  /**
   * Track a query interaction
   */
  public async trackQuery(
    agentId: string,
    query: string,
    success: boolean,
    responseTime: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Store in Redis for real-time metrics
      const key = `brain:metrics:agent:${agentId}:queries`;

      await redisCache.getClient()?.zAdd(key, {
        score: Date.now(),
        value: JSON.stringify({
          query,
          success,
          responseTime,
          timestamp: new Date().toISOString(),
          ...metadata,
        }),
      });

      // Keep only last 1000 queries
      await redisCache.getClient()?.zRemRangeByRank(key, 0, -1001);

      // Update real-time counters
      const counterKey = `brain:metrics:agent:${agentId}:counters`;
      await redisCache.getClient()?.hIncrBy(counterKey, 'totalQueries', 1);

      if (success) {
        await redisCache.getClient()?.hIncrBy(counterKey, 'successfulQueries', 1);
      } else {
        await redisCache.getClient()?.hIncrBy(counterKey, 'failedQueries', 1);
      }

      // Track response time
      await redisCache.getClient()?.lPush(
        `brain:metrics:agent:${agentId}:responseTimes`,
        responseTime.toString()
      );
      await redisCache.getClient()?.lTrim(
        `brain:metrics:agent:${agentId}:responseTimes`,
        0,
        999
      );
    } catch (error) {
      console.error('[AgentMetricsTracker] trackQuery failed:', error);
    }
  }

  /**
   * Track context storage
   */
  public async trackContextStorage(
    agentId: string,
    sessionId: string,
    messageCount: number
  ): Promise<void> {
    try {
      const counterKey = `brain:metrics:agent:${agentId}:counters`;
      await redisCache.getClient()?.hIncrBy(counterKey, 'totalContextsStored', 1);
      await redisCache.getClient()?.hIncrBy(
        counterKey,
        'totalMessagesStored',
        messageCount
      );
    } catch (error) {
      console.error('[AgentMetricsTracker] trackContextStorage failed:', error);
    }
  }

  /**
   * Track document indexing
   */
  public async trackDocumentIndexing(
    agentId: string,
    documentCount: number,
    totalTokens: number
  ): Promise<void> {
    try {
      const counterKey = `brain:metrics:agent:${agentId}:counters`;
      await redisCache.getClient()?.hIncrBy(
        counterKey,
        'totalDocumentsIndexed',
        documentCount
      );
      await redisCache.getClient()?.hIncrBy(
        counterKey,
        'totalTokensIndexed',
        totalTokens
      );
    } catch (error) {
      console.error('[AgentMetricsTracker] trackDocumentIndexing failed:', error);
    }
  }

  /**
   * Track API call
   */
  public async trackApiCall(
    agentId: string,
    endpoint: string,
    success: boolean,
    responseTime: number
  ): Promise<void> {
    try {
      const key = `brain:metrics:agent:${agentId}:api:${endpoint}`;

      await redisCache.getClient()?.hIncrBy(key, 'calls', 1);
      if (success) {
        await redisCache.getClient()?.hIncrBy(key, 'success', 1);
      } else {
        await redisCache.getClient()?.hIncrBy(key, 'failures', 1);
      }

      // Track average response time
      const avgKey = `${key}:avgResponseTime`;
      const currentAvg = (await redisCache.getClient()?.get(avgKey)) || '0';
      const newAvg = (parseFloat(currentAvg) + responseTime) / 2;
      await redisCache.getClient()?.set(avgKey, newAvg.toString());
    } catch (error) {
      console.error('[AgentMetricsTracker] trackApiCall failed:', error);
    }
  }

  // ============================================
  // Metrics Retrieval
  // ============================================

  /**
   * Get agent metrics for a time period
   */
  public async getAgentMetrics(
    agentId: string,
    period: 'hour' | 'day' | 'week' = 'day'
  ): Promise<AgentInteractionMetrics> {
    try {
      const db = getDb();

      // Calculate time range
      const periodMap = {
        hour: '1 hour',
        day: '1 day',
        week: '7 days',
      };

      // Get query statistics from database
      const queryStats = await db.execute(sql`
        SELECT
          COUNT(*) as total_queries,
          COUNT(*) FILTER (WHERE was_helpful = true) as successful_queries,
          COUNT(*) FILTER (WHERE was_helpful = false) as failed_queries,
          AVG(response_time)::integer as avg_response_time,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time)::integer as p50_response_time,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time)::integer as p95_response_time,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time)::integer as p99_response_time
        FROM brain_query_logs
        WHERE agent_id = ${agentId}
          AND created_at > NOW() - INTERVAL ${periodMap[period]}
      `);

      const stats = queryStats.rows[0] as any;

      // Get context statistics
      const contextStats = await db.execute(sql`
        SELECT COUNT(*) as total_contexts
        FROM brain_contexts
        WHERE agent_id = ${agentId}
          AND created_at > NOW() - INTERVAL ${periodMap[period]}
      `);

      // Get indexed documents count
      const docStats = await db.execute(sql`
        SELECT
          COUNT(*) as total_documents,
          SUM(token_count)::integer as total_tokens
        FROM brain_documents
        WHERE created_by = ${agentId}
          AND created_at > NOW() - INTERVAL ${periodMap[period]}
      `);

      // Get cache hit rate from Redis
      const counterKey = `brain:metrics:agent:${agentId}:counters`;
      const cacheHits =
        parseInt((await redisCache.getClient()?.hGet(counterKey, 'cacheHits')) || '0');
      const totalQueries = parseInt(stats.total_queries || '0');
      const cacheHitRate = totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0;

      // Estimate cost (rough estimate: $0.0001 per token)
      const totalTokens = parseInt((docStats.rows[0] as any)?.total_tokens || '0');
      const estimatedCost = totalTokens * 0.0001;

      return {
        agentId,
        period,
        metrics: {
          totalQueries: parseInt(stats.total_queries || '0'),
          successfulQueries: parseInt(stats.successful_queries || '0'),
          failedQueries: parseInt(stats.failed_queries || '0'),
          averageResponseTime: parseInt(stats.avg_response_time || '0'),
          totalContextsStored: parseInt(
            (contextStats.rows[0] as any)?.total_contexts || '0'
          ),
          totalDocumentsIndexed: parseInt(
            (docStats.rows[0] as any)?.total_documents || '0'
          ),
          cacheHitRate: Math.round(cacheHitRate * 10) / 10,
        },
        performance: {
          p50ResponseTime: parseInt(stats.p50_response_time || '0'),
          p95ResponseTime: parseInt(stats.p95_response_time || '0'),
          p99ResponseTime: parseInt(stats.p99_response_time || '0'),
        },
        usage: {
          totalApiCalls: totalQueries,
          totalTokensUsed: totalTokens,
          estimatedCost,
        },
      };
    } catch (error) {
      console.error('[AgentMetricsTracker] getAgentMetrics failed:', error);
      return this.getEmptyMetrics(agentId, period);
    }
  }

  /**
   * Get metrics for all agents
   */
  public async getAllAgentsMetrics(
    period: 'hour' | 'day' | 'week' = 'day'
  ): Promise<AgentInteractionMetrics[]> {
    try {
      const db = getDb();

      // Get all unique agent IDs
      const agentIds = await db.execute(sql`
        SELECT DISTINCT agent_id
        FROM brain_query_logs
        WHERE agent_id IS NOT NULL
        ORDER BY agent_id
      `);

      const metrics: AgentInteractionMetrics[] = [];

      for (const row of agentIds.rows) {
        const agentId = (row as any).agent_id;
        const agentMetrics = await this.getAgentMetrics(agentId, period);
        metrics.push(agentMetrics);
      }

      return metrics;
    } catch (error) {
      console.error('[AgentMetricsTracker] getAllAgentsMetrics failed:', error);
      return [];
    }
  }

  /**
   * Get agent performance trends
   */
  public async getAgentTrends(
    agentId: string,
    days: number = 7
  ): Promise<
    Array<{
      date: string;
      queries: number;
      avgResponseTime: number;
      successRate: number;
    }>
  > {
    try {
      const db = getDb();

      const trends = await db.execute(sql`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as queries,
          AVG(response_time)::integer as avg_response_time,
          (COUNT(*) FILTER (WHERE was_helpful = true)::float / COUNT(*)::float * 100)::integer as success_rate
        FROM brain_query_logs
        WHERE agent_id = ${agentId}
          AND created_at > NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);

      return trends.rows.map((row: any) => ({
        date: row.date,
        queries: parseInt(row.queries),
        avgResponseTime: parseInt(row.avg_response_time || '0'),
        successRate: parseInt(row.success_rate || '0'),
      }));
    } catch (error) {
      console.error('[AgentMetricsTracker] getAgentTrends failed:', error);
      return [];
    }
  }

  // ============================================
  // Alerting
  // ============================================

  /**
   * Check for anomalies and generate alerts
   */
  public async checkAnomalies(agentId: string): Promise<AgentAlert[]> {
    const alerts: AgentAlert[] = [];

    try {
      const metrics = await this.getAgentMetrics(agentId, 'hour');

      // Alert: High failure rate
      const failureRate =
        metrics.metrics.totalQueries > 0
          ? (metrics.metrics.failedQueries / metrics.metrics.totalQueries) * 100
          : 0;

      if (failureRate > 20 && metrics.metrics.totalQueries > 10) {
        alerts.push({
          severity: 'warning',
          type: 'high-failure-rate',
          message: `Agent ${agentId} has high failure rate: ${failureRate.toFixed(1)}%`,
          agentId,
          timestamp: new Date().toISOString(),
          metadata: { failureRate, totalQueries: metrics.metrics.totalQueries },
        });
      }

      // Alert: Slow response times
      if (metrics.performance.p95ResponseTime > 3000) {
        alerts.push({
          severity: 'warning',
          type: 'slow-response',
          message: `Agent ${agentId} has slow P95 response time: ${metrics.performance.p95ResponseTime}ms`,
          agentId,
          timestamp: new Date().toISOString(),
          metadata: { p95ResponseTime: metrics.performance.p95ResponseTime },
        });
      }

      // Alert: Low cache hit rate
      if (
        metrics.metrics.cacheHitRate < 30 &&
        metrics.metrics.totalQueries > 20
      ) {
        alerts.push({
          severity: 'info',
          type: 'low-cache-hit-rate',
          message: `Agent ${agentId} has low cache hit rate: ${metrics.metrics.cacheHitRate}%`,
          agentId,
          timestamp: new Date().toISOString(),
          metadata: { cacheHitRate: metrics.metrics.cacheHitRate },
        });
      }

      // Alert: High usage
      if (metrics.usage.totalApiCalls > 1000) {
        alerts.push({
          severity: 'info',
          type: 'high-usage',
          message: `Agent ${agentId} has high API usage: ${metrics.usage.totalApiCalls} calls in last hour`,
          agentId,
          timestamp: new Date().toISOString(),
          metadata: {
            totalApiCalls: metrics.usage.totalApiCalls,
            estimatedCost: metrics.usage.estimatedCost,
          },
        });
      }
    } catch (error) {
      console.error('[AgentMetricsTracker] checkAnomalies failed:', error);
    }

    return alerts;
  }

  // ============================================
  // Utility Methods
  // ============================================

  private getEmptyMetrics(
    agentId: string,
    period: 'hour' | 'day' | 'week'
  ): AgentInteractionMetrics {
    return {
      agentId,
      period,
      metrics: {
        totalQueries: 0,
        successfulQueries: 0,
        failedQueries: 0,
        averageResponseTime: 0,
        totalContextsStored: 0,
        totalDocumentsIndexed: 0,
        cacheHitRate: 0,
      },
      performance: {
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
      },
      usage: {
        totalApiCalls: 0,
        totalTokensUsed: 0,
        estimatedCost: 0,
      },
    };
  }

  /**
   * Reset metrics for an agent (use with caution)
   */
  public async resetAgentMetrics(agentId: string): Promise<boolean> {
    try {
      const keys = [
        `brain:metrics:agent:${agentId}:queries`,
        `brain:metrics:agent:${agentId}:counters`,
        `brain:metrics:agent:${agentId}:responseTimes`,
      ];

      for (const key of keys) {
        await redisCache.getClient()?.del(key);
      }

      return true;
    } catch (error) {
      console.error('[AgentMetricsTracker] resetAgentMetrics failed:', error);
      return false;
    }
  }
}

// Singleton export
export const agentMetricsTracker = AgentMetricsTracker.getInstance();
