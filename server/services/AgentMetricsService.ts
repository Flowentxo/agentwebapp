/**
 * AGENT METRICS SERVICE
 *
 * Handles agent performance tracking, ratings, and real-time status
 */

import { getDb } from '@/lib/db';
import {
  agentMetrics,
  agentRatings,
  agentLiveStatus,
  agentRequestLog,
  agentUsageSummary,
  type NewAgentRequestLog,
  type NewAgentRating
} from '@/lib/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

export class AgentMetricsService {
  /**
   * Get aggregated metrics for an agent
   * Returns overall stats: requests, success rate, avg response time
   */
  async getAgentMetrics(agentId: string, userId?: string) {
    try {
      const db = getDb();

      // Query aggregated stats from request_log
      const stats = await db
        .select({
          totalRequests: sql<number>`COUNT(*)`,
          successfulRequests: sql<number>`SUM(CASE WHEN ${agentRequestLog.success} = 1 THEN 1 ELSE 0 END)`,
          failedRequests: sql<number>`SUM(CASE WHEN ${agentRequestLog.success} = 0 THEN 1 ELSE 0 END)`,
          avgResponseTimeMs: sql<number>`AVG(${agentRequestLog.responseTimeMs})`,
          totalTokens: sql<number>`SUM(${agentRequestLog.tokensUsed})`,
        })
        .from(agentRequestLog)
        .where(
          userId
            ? and(
                eq(agentRequestLog.agentId, agentId),
                eq(agentRequestLog.userId, userId)
              )
            : eq(agentRequestLog.agentId, agentId)
        );

      const stat = stats[0];

      // Calculate success rate
      const successRate =
        stat.totalRequests > 0
          ? (Number(stat.successfulRequests) / Number(stat.totalRequests)) * 100
          : 100;

      return {
        agentId,
        requests: Number(stat.totalRequests) || 0,
        successRate: Math.round(successRate * 10) / 10, // 1 decimal
        avgTimeSec: stat.avgResponseTimeMs
          ? Math.round(Number(stat.avgResponseTimeMs) / 100) / 10 // Convert ms to sec with 1 decimal
          : 0,
        totalTokens: Number(stat.totalTokens) || 0
      };
    } catch (error) {
      logger.error('[AGENT_METRICS_SERVICE] Failed to get agent metrics:', error);
      // Return fallback data
      return {
        agentId,
        requests: 0,
        successRate: 100,
        avgTimeSec: 1.0,
        totalTokens: 0
      };
    }
  }

  /**
   * Track a new agent request
   * Logs every request for analytics
   */
  async trackAgentRequest(params: {
    agentId: string;
    userId: string;
    chatSessionId?: string;
    messageContent?: string;
    success: boolean;
    responseTimeMs?: number;
    tokensUsed?: number;
    errorMessage?: string;
  }) {
    try {
      const db = getDb();

      const logEntry: NewAgentRequestLog = {
        agentId: params.agentId,
        userId: params.userId,
        chatSessionId: params.chatSessionId,
        messageContent: params.messageContent,
        success: params.success ? 1 : 0,
        responseTimeMs: params.responseTimeMs,
        tokensUsed: params.tokensUsed,
        errorMessage: params.errorMessage
      };

      await db.insert(agentRequestLog).values(logEntry);

      logger.info(`[AGENT_METRICS_SERVICE] Tracked request for ${params.agentId}`);
    } catch (error) {
      logger.error('[AGENT_METRICS_SERVICE] Failed to track request:', error);
      // Don't throw - tracking failures shouldn't break the app
    }
  }

  /**
   * Get agent ratings and average score
   */
  async getAgentRatings(agentId: string) {
    try {
      const db = getDb();

      const ratings = await db
        .select({
          averageRating: sql<number>`AVG(${agentRatings.rating})`,
          totalRatings: sql<number>`COUNT(*)`,
          ratings5Star: sql<number>`SUM(CASE WHEN ${agentRatings.rating} = 5 THEN 1 ELSE 0 END)`,
          ratings4Star: sql<number>`SUM(CASE WHEN ${agentRatings.rating} = 4 THEN 1 ELSE 0 END)`,
          ratings3Star: sql<number>`SUM(CASE WHEN ${agentRatings.rating} = 3 THEN 1 ELSE 0 END)`,
          ratings2Star: sql<number>`SUM(CASE WHEN ${agentRatings.rating} = 2 THEN 1 ELSE 0 END)`,
          ratings1Star: sql<number>`SUM(CASE WHEN ${agentRatings.rating} = 1 THEN 1 ELSE 0 END)`,
        })
        .from(agentRatings)
        .where(eq(agentRatings.agentId, agentId));

      const rating = ratings[0];

      return {
        agentId,
        averageRating: rating.averageRating ? Math.round(Number(rating.averageRating) * 10) / 10 : 0,
        totalRatings: Number(rating.totalRatings) || 0,
        distribution: {
          5: Number(rating.ratings5Star) || 0,
          4: Number(rating.ratings4Star) || 0,
          3: Number(rating.ratings3Star) || 0,
          2: Number(rating.ratings2Star) || 0,
          1: Number(rating.ratings1Star) || 0,
        }
      };
    } catch (error) {
      logger.error('[AGENT_METRICS_SERVICE] Failed to get ratings:', error);
      return {
        agentId,
        averageRating: 0,
        totalRatings: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }
  }

  /**
   * Submit a new rating for an agent
   */
  async submitRating(params: {
    agentId: string;
    userId: string;
    rating: number;
    feedback?: string;
    chatSessionId?: string;
  }) {
    try {
      // Validate rating
      if (params.rating < 1 || params.rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const db = getDb();

      const newRating: NewAgentRating = {
        agentId: params.agentId,
        userId: params.userId,
        rating: params.rating,
        feedback: params.feedback,
        chatSessionId: params.chatSessionId
      };

      const [inserted] = await db.insert(agentRatings).values(newRating).returning();

      logger.info(`[AGENT_METRICS_SERVICE] Rating submitted for ${params.agentId}: ${params.rating} stars`);

      return inserted;
    } catch (error) {
      logger.error('[AGENT_METRICS_SERVICE] Failed to submit rating:', error);
      throw error;
    }
  }

  /**
   * Get agent's current status (online, offline, busy)
   */
  async getAgentStatus(agentId: string) {
    try {
      const db = getDb();

      const statuses = await db
        .select()
        .from(agentLiveStatus)
        .where(eq(agentLiveStatus.agentId, agentId))
        .limit(1);

      if (statuses.length === 0) {
        // Default to offline if no status exists
        return {
          agentId,
          status: 'offline',
          currentQueueSize: 0,
          avgWaitTimeSec: null,
          lastHeartbeat: null
        };
      }

      return statuses[0];
    } catch (error) {
      logger.error('[AGENT_METRICS_SERVICE] Failed to get status:', error);
      return {
        agentId,
        status: 'offline',
        currentQueueSize: 0,
        avgWaitTimeSec: null,
        lastHeartbeat: null
      };
    }
  }

  /**
   * Update agent's status
   */
  async updateAgentStatus(params: {
    agentId: string;
    status: 'online' | 'offline' | 'busy' | 'maintenance';
    currentQueueSize?: number;
    avgWaitTimeSec?: number;
  }) {
    try {
      const db = getDb();

      // Upsert (insert or update)
      await db
        .insert(agentLiveStatus)
        .values({
          agentId: params.agentId,
          status: params.status,
          currentQueueSize: params.currentQueueSize ?? 0,
          avgWaitTimeSec: params.avgWaitTimeSec,
          lastHeartbeat: new Date(),
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: agentLiveStatus.agentId,
          set: {
            status: params.status,
            currentQueueSize: params.currentQueueSize ?? 0,
            avgWaitTimeSec: params.avgWaitTimeSec,
            lastHeartbeat: new Date(),
            updatedAt: new Date()
          }
        });

      logger.info(`[AGENT_METRICS_SERVICE] Status updated for ${params.agentId}: ${params.status}`);
    } catch (error) {
      logger.error('[AGENT_METRICS_SERVICE] Failed to update status:', error);
      throw error;
    }
  }

  /**
   * Get recent feedback for an agent
   */
  async getRecentFeedback(agentId: string, limit: number = 10) {
    try {
      const db = getDb();

      const feedback = await db
        .select({
          id: agentRatings.id,
          rating: agentRatings.rating,
          feedback: agentRatings.feedback,
          createdAt: agentRatings.createdAt
        })
        .from(agentRatings)
        .where(
          and(
            eq(agentRatings.agentId, agentId),
            sql`${agentRatings.feedback} IS NOT NULL`
          )
        )
        .orderBy(desc(agentRatings.createdAt))
        .limit(limit);

      return feedback;
    } catch (error) {
      logger.error('[AGENT_METRICS_SERVICE] Failed to get feedback:', error);
      return [];
    }
  }

  /**
   * Get all agents with their metrics (for Revolutionary Agents Grid)
   */
  async getAllAgentsMetrics(userId?: string) {
    try {
      const db = getDb();

      // Get list of all unique agent IDs from request log
      const agentIds = await db
        .selectDistinct({ agentId: agentRequestLog.agentId })
        .from(agentRequestLog);

      // Fetch metrics for each agent
      const metricsPromises = agentIds.map(({ agentId }) =>
        this.getAgentMetrics(agentId, userId)
      );

      const allMetrics = await Promise.all(metricsPromises);

      // Convert to Record<agentId, metrics> format for easy lookup
      const metricsMap: Record<string, any> = {};
      allMetrics.forEach(metric => {
        metricsMap[metric.agentId] = metric;
      });

      return metricsMap;
    } catch (error) {
      logger.error('[AGENT_METRICS_SERVICE] Failed to get all agents metrics:', error);
      return {};
    }
  }
}
