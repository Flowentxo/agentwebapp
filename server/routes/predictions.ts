import { Router } from 'express';
import { contextPredictorService } from '../services/ContextPredictorService';
import { predictionScheduler } from '../services/PredictionSchedulerService';
import { getDb } from '@/lib/db';
import { meetingBriefings, contextPredictions } from '@/lib/db/schema-calendar';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/predictions/predict/:eventId
 * Predict context for a specific calendar event
 */
router.post('/predict/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.headers['x-user-id'] as string || 'demo-user';

    const predictedContext = await contextPredictorService.predictContextForEvent(eventId, userId);

    res.json({
      success: true,
      eventId,
      predictedContext,
      count: predictedContext.length,
      message: 'Context predicted successfully'
    });
  } catch (error: any) {
    logger.error('[PREDICTIONS_PREDICT]', error);

    if (error.message.includes('Event not found')) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.status(500).json({ error: 'Failed to predict context' });
  }
});

/**
 * POST /api/predictions/briefing/:eventId
 * Generate meeting briefing for a specific event
 */
router.post('/briefing/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.headers['x-user-id'] as string || 'demo-user';

    const briefing = await contextPredictorService.generateBriefing(eventId, userId);

    res.json({
      success: true,
      briefing,
      message: 'Briefing generated successfully'
    });
  } catch (error: any) {
    logger.error('[PREDICTIONS_BRIEFING]', error);

    if (error.message.includes('Event not found')) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (error.message.includes('No context predictions')) {
      return res.status(400).json({
        error: 'No predictions found. Run /api/predictions/predict/:eventId first'
      });
    }

    res.status(500).json({ error: 'Failed to generate briefing' });
  }
});

/**
 * GET /api/predictions/briefing/:eventId
 * Get existing briefing for an event
 */
router.get('/briefing/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.headers['x-user-id'] as string || 'demo-user';

    const db = getDb();
    const [briefing] = await db
      .select()
      .from(meetingBriefings)
      .where(
        and(
          eq(meetingBriefings.eventId, eventId),
          eq(meetingBriefings.userId, userId)
        )
      )
      .orderBy(meetingBriefings.createdAt)
      .limit(1);

    if (!briefing) {
      return res.status(404).json({ error: 'Briefing not found' });
    }

    res.json({
      success: true,
      briefing
    });
  } catch (error) {
    logger.error('[PREDICTIONS_GET_BRIEFING]', error);
    res.status(500).json({ error: 'Failed to fetch briefing' });
  }
});

/**
 * GET /api/predictions/briefings
 * Get all briefings for user (upcoming meetings)
 */
router.get('/briefings', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'demo-user';
    const limit = parseInt(req.query.limit as string) || 10;

    const db = getDb();
    const briefings = await db
      .select()
      .from(meetingBriefings)
      .where(eq(meetingBriefings.userId, userId))
      .orderBy(meetingBriefings.createdAt)
      .limit(limit);

    res.json({
      success: true,
      briefings,
      count: briefings.length
    });
  } catch (error) {
    logger.error('[PREDICTIONS_GET_BRIEFINGS]', error);
    res.status(500).json({ error: 'Failed to fetch briefings' });
  }
});

/**
 * PATCH /api/predictions/briefing/:briefingId/viewed
 * Mark briefing as viewed
 */
router.patch('/briefing/:briefingId/viewed', async (req, res) => {
  try {
    const { briefingId } = req.params;
    const userId = req.headers['x-user-id'] as string || 'demo-user';

    const db = getDb();
    const [updated] = await db
      .update(meetingBriefings)
      .set({
        viewedAt: new Date(),
        status: 'viewed',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(meetingBriefings.id, briefingId),
          eq(meetingBriefings.userId, userId)
        )
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Briefing not found' });
    }

    res.json({
      success: true,
      briefing: updated,
      message: 'Briefing marked as viewed'
    });
  } catch (error) {
    logger.error('[PREDICTIONS_MARK_VIEWED]', error);
    res.status(500).json({ error: 'Failed to update briefing' });
  }
});

/**
 * GET /api/predictions/context/:eventId
 * Get predicted context for an event
 */
router.get('/context/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.headers['x-user-id'] as string || 'demo-user';

    const db = getDb();
    const [prediction] = await db
      .select()
      .from(contextPredictions)
      .where(
        and(
          eq(contextPredictions.eventId, eventId),
          eq(contextPredictions.userId, userId)
        )
      )
      .orderBy(contextPredictions.predictedAt)
      .limit(1);

    if (!prediction) {
      return res.status(404).json({ error: 'No predictions found' });
    }

    res.json({
      success: true,
      prediction
    });
  } catch (error) {
    logger.error('[PREDICTIONS_GET_CONTEXT]', error);
    res.status(500).json({ error: 'Failed to fetch prediction' });
  }
});

/**
 * POST /api/predictions/feedback/:predictionId
 * Submit user feedback on prediction accuracy
 */
router.post('/feedback/:predictionId', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const { feedback } = req.body; // 'helpful', 'not_helpful', 'very_helpful'
    const userId = req.headers['x-user-id'] as string || 'demo-user';

    if (!['helpful', 'not_helpful', 'very_helpful'].includes(feedback)) {
      return res.status(400).json({
        error: 'Invalid feedback. Must be: helpful, not_helpful, or very_helpful'
      });
    }

    const db = getDb();
    const [updated] = await db
      .update(contextPredictions)
      .set({
        userFeedback: feedback,
        userViewed: true,
        viewedAt: new Date()
      })
      .where(
        and(
          eq(contextPredictions.id, predictionId),
          eq(contextPredictions.userId, userId)
        )
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Prediction not found' });
    }

    res.json({
      success: true,
      message: 'Feedback recorded successfully'
    });
  } catch (error) {
    logger.error('[PREDICTIONS_FEEDBACK]', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

/**
 * POST /api/predictions/batch-predict
 * Predict context for all upcoming events (batch operation)
 */
router.post('/batch-predict', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'demo-user';
    const { hoursAhead = 24 } = req.body;

    const results = await contextPredictorService.predictUpcomingEvents(userId, hoursAhead);

    res.json({
      success: true,
      results,
      message: `Predicted context for ${results.length} upcoming events`
    });
  } catch (error) {
    logger.error('[PREDICTIONS_BATCH]', error);
    res.status(500).json({ error: 'Failed to batch predict' });
  }
});

/**
 * GET /api/predictions/scheduler/status
 * Get prediction scheduler status
 */
router.get('/scheduler/status', async (req, res) => {
  try {
    const status = predictionScheduler.getStatus();

    res.json({
      success: true,
      scheduler: status,
      message: `Scheduler is ${status.isRunning ? 'running' : 'stopped'}`
    });
  } catch (error) {
    logger.error('[PREDICTIONS_SCHEDULER_STATUS]', error);
    res.status(500).json({ error: 'Failed to get scheduler status' });
  }
});

/**
 * POST /api/predictions/scheduler/trigger
 * Manually trigger prediction cycle (admin/debug)
 */
router.post('/scheduler/trigger', async (req, res) => {
  try {
    logger.info('[PREDICTIONS_SCHEDULER_TRIGGER] Manual trigger requested');

    // Run async but don't wait for completion
    predictionScheduler.triggerManualRun().catch((error) => {
      logger.error('[PREDICTIONS_SCHEDULER_TRIGGER] Manual run failed:', error);
    });

    res.json({
      success: true,
      message: 'Prediction cycle triggered. Check logs for results.'
    });
  } catch (error) {
    logger.error('[PREDICTIONS_SCHEDULER_TRIGGER]', error);
    res.status(500).json({ error: 'Failed to trigger scheduler' });
  }
});

export default router;
