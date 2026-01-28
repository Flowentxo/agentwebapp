import { Router } from 'express';
import { businessIdeasService } from '../services/BusinessIdeasService';
import { logger } from '../utils/logger';

const router = Router();

// POST /api/business-ideas/generate - Generate new business ideas
router.post('/generate', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'demo-user';
    const { focusArea, count = 3 } = req.body;

    const ideas = await businessIdeasService.generateIdeas({ userId, focusArea, count });

    res.json({ success: true, ideas });
  } catch (error: any) {
    logger.error('[BUSINESS_IDEAS_API] Generation failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/business-ideas - Get ideas for user
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'demo-user';
    const { status, limit = 20 } = req.query;

    const ideas = await businessIdeasService.getIdeas(userId, status as string, parseInt(limit as string));

    res.json({ success: true, ideas });
  } catch (error: any) {
    logger.error('[BUSINESS_IDEAS_API] Fetch failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/business-ideas/:id/status - Update idea status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;

    const updated = await businessIdeasService.updateIdeaStatus(id, status, feedback);

    res.json({ success: true, idea: updated });
  } catch (error: any) {
    logger.error('[BUSINESS_IDEAS_API] Update failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/business-ideas/:id/rate - Rate an idea
router.post('/:id/rate', async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be 1-5' });
    }

    await businessIdeasService.rateIdea(id, rating);

    res.json({ success: true });
  } catch (error: any) {
    logger.error('[BUSINESS_IDEAS_API] Rating failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/business-ideas/analytics - Get analytics
router.get('/analytics', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'demo-user';
    const analytics = await businessIdeasService.getAnalytics(userId);

    res.json({ success: true, analytics });
  } catch (error: any) {
    logger.error('[BUSINESS_IDEAS_API] Analytics failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export const businessIdeasRouter = router;
