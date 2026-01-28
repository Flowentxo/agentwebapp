import { Router } from 'express';
import { dailyLearningService } from '../services/DailyLearningService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/learning/questions - Get unanswered questions for user
 */
router.get('/questions', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'demo-user';
    const limit = parseInt(req.query.limit as string) || 5;

    const questions = await dailyLearningService.getUnansweredQuestions(userId, limit);

    res.json({
      success: true,
      questions,
    });
  } catch (error: any) {
    logger.error('[LEARNING_API] Failed to fetch questions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/learning/generate - Generate new daily questions
 */
router.post('/generate', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'demo-user';
    const { count = 3 } = req.body;

    const questions = await dailyLearningService.generateDailyQuestions(userId, count);

    res.json({
      success: true,
      questions,
      message: `Generated ${questions.length} personalized learning questions`,
    });
  } catch (error: any) {
    logger.error('[LEARNING_API] Failed to generate questions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/learning/answer - Answer a question
 */
router.post('/answer', async (req, res) => {
  try {
    const { questionId, answer } = req.body;

    if (!questionId || !answer) {
      return res.status(400).json({
        success: false,
        error: 'questionId and answer are required',
      });
    }

    const updatedQuestion = await dailyLearningService.answerQuestion(questionId, answer);

    res.json({
      success: true,
      question: updatedQuestion,
      message: 'Answer submitted successfully',
    });
  } catch (error: any) {
    logger.error('[LEARNING_API] Failed to answer question:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/learning/rate - Rate a question
 */
router.post('/rate', async (req, res) => {
  try {
    const { questionId, rating } = req.body;

    if (!questionId || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'questionId and rating (1-5) are required',
      });
    }

    await dailyLearningService.rateQuestion(questionId, rating);

    res.json({
      success: true,
      message: 'Rating submitted successfully',
    });
  } catch (error: any) {
    logger.error('[LEARNING_API] Failed to rate question:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/learning/insights - Get user learning insights
 */
router.get('/insights', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'demo-user';

    const insights = await dailyLearningService.getUserInsights(userId);

    res.json({
      success: true,
      insights,
    });
  } catch (error: any) {
    logger.error('[LEARNING_API] Failed to fetch insights:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export const learningRouter = router;
