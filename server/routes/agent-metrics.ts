/**
 * AGENT METRICS API ROUTES
 *
 * Endpoints for agent performance, ratings, and status
 */

import { Router } from 'express';
import { AgentMetricsService } from '../services/AgentMetricsService';
import { logger } from '../utils/logger';

export const agentMetricsRouter = Router();
const metricsService = new AgentMetricsService();

/**
 * GET /api/agents/:id/metrics
 * Get performance metrics for a specific agent
 */
agentMetricsRouter.get('/:id/metrics', async (req, res) => {
  try {
    const agentId = req.params.id;
    const userId = req.headers['x-user-id'] as string | undefined;

    const metrics = await metricsService.getAgentMetrics(agentId, userId);

    res.json(metrics);
  } catch (error) {
    logger.error('[AGENT_METRICS_API] Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch agent metrics' });
  }
});

/**
 * POST /api/agents/:id/metrics/track
 * Track a new agent request (called by chat endpoint)
 */
agentMetricsRouter.post('/:id/metrics/track', async (req, res) => {
  try {
    const agentId = req.params.id;
    const userId = req.headers['x-user-id'] as string || 'anonymous';

    const {
      chatSessionId,
      messageContent,
      success,
      responseTimeMs,
      tokensUsed,
      errorMessage
    } = req.body;

    await metricsService.trackAgentRequest({
      agentId,
      userId,
      chatSessionId,
      messageContent,
      success: success !== false, // Default to true
      responseTimeMs,
      tokensUsed,
      errorMessage
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('[AGENT_METRICS_API] Error tracking request:', error);
    res.status(500).json({ error: 'Failed to track request' });
  }
});

/**
 * GET /api/agents/:id/ratings
 * Get ratings and reviews for an agent
 */
agentMetricsRouter.get('/:id/ratings', async (req, res) => {
  try {
    const agentId = req.params.id;

    const ratings = await metricsService.getAgentRatings(agentId);

    res.json(ratings);
  } catch (error) {
    logger.error('[AGENT_METRICS_API] Error fetching ratings:', error);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

/**
 * POST /api/agents/:id/ratings
 * Submit a new rating for an agent
 */
agentMetricsRouter.post('/:id/ratings', async (req, res) => {
  try {
    const agentId = req.params.id;
    const userId = req.headers['x-user-id'] as string || 'anonymous';

    const { rating, feedback, chatSessionId } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const submitted = await metricsService.submitRating({
      agentId,
      userId,
      rating: Number(rating),
      feedback,
      chatSessionId
    });

    res.json(submitted);
  } catch (error) {
    logger.error('[AGENT_METRICS_API] Error submitting rating:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

/**
 * GET /api/agents/:id/status
 * Get current status of an agent
 */
agentMetricsRouter.get('/:id/status', async (req, res) => {
  try {
    const agentId = req.params.id;

    const status = await metricsService.getAgentStatus(agentId);

    res.json(status);
  } catch (error) {
    logger.error('[AGENT_METRICS_API] Error fetching status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

/**
 * PUT /api/agents/:id/status
 * Update agent status (internal use)
 */
agentMetricsRouter.put('/:id/status', async (req, res) => {
  try {
    const agentId = req.params.id;
    const { status, currentQueueSize, avgWaitTimeSec } = req.body;

    if (!['online', 'offline', 'busy', 'maintenance'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    await metricsService.updateAgentStatus({
      agentId,
      status,
      currentQueueSize,
      avgWaitTimeSec
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('[AGENT_METRICS_API] Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/**
 * GET /api/agents/:id/feedback
 * Get recent feedback for an agent
 */
agentMetricsRouter.get('/:id/feedback', async (req, res) => {
  try {
    const agentId = req.params.id;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const feedback = await metricsService.getRecentFeedback(agentId, limit);

    res.json(feedback);
  } catch (error) {
    logger.error('[AGENT_METRICS_API] Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

/**
 * GET /api/agents/metrics/all
 * Get metrics for all agents (for Revolutionary Agents Grid)
 */
agentMetricsRouter.get('/metrics/all', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string | undefined;

    const allMetrics = await metricsService.getAllAgentsMetrics(userId);

    res.json(allMetrics);
  } catch (error) {
    logger.error('[AGENT_METRICS_API] Error fetching all metrics:', error);
    res.status(500).json({ error: 'Failed to fetch all metrics' });
  }
});
