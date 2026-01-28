import { getDb } from '@/lib/db';
import { brainLearningQuestions, brainLearningInsights } from '@/lib/db/schema-brain-learning';
import { brainMemories } from '@/lib/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import OpenAI from 'openai';

// Lazy initialization to prevent crash when API key is missing
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

interface QuestionContext {
  recentActivities: any[];
  recentMemories: any[];
  userProfile: {
    skillLevel: string;
    preferredCategories: string[];
    currentStreak: number;
  };
}

export class DailyLearningService {
  private static instance: DailyLearningService;

  private constructor() {}

  public static getInstance(): DailyLearningService {
    if (!DailyLearningService.instance) {
      DailyLearningService.instance = new DailyLearningService();
    }
    return DailyLearningService.instance;
  }

  /**
   * Generate daily learning questions based on user activity
   */
  public async generateDailyQuestions(userId: string, count: number = 3): Promise<any[]> {
    try {
      const db = getDb();

      // Fetch user learning insights
      let [insights] = await db
        .select()
        .from(brainLearningInsights)
        .where(eq(brainLearningInsights.userId, userId));

      // Create insights if they don't exist
      if (!insights) {
        [insights] = await db
          .insert(brainLearningInsights)
          .values({ userId })
          .returning();
      }

      // Fetch recent memories from Brain AI
      const recentMemories = await db
        .select()
        .from(brainMemories)
        .orderBy(desc(brainMemories.createdAt))
        .limit(20);

      // Build context for question generation
      const context: QuestionContext = {
        recentActivities: [],
        recentMemories: recentMemories.map(m => ({
          context: m.context,
          tags: m.tags,
          importance: m.importance,
          createdAt: m.createdAt,
        })),
        userProfile: {
          skillLevel: insights.skillLevel,
          preferredCategories: (insights.preferredCategories as string[]) || [],
          currentStreak: insights.currentStreak,
        },
      };

      // Generate questions using OpenAI
      const questions = await this.generateQuestionsWithAI(context, count);

      // Store questions in database
      const storedQuestions = await db
        .insert(brainLearningQuestions)
        .values(
          questions.map(q => ({
            userId,
            question: q.question,
            category: q.category,
            difficulty: q.difficulty,
            context: q.context,
            suggestedActions: q.suggestedActions,
          }))
        )
        .returning();

      // Update insights
      await db
        .update(brainLearningInsights)
        .set({
          totalQuestionsAsked: sql`${brainLearningInsights.totalQuestionsAsked} + ${count}`,
          lastQuestionAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(brainLearningInsights.userId, userId));

      logger.info(`[DAILY_LEARNING] Generated ${questions.length} questions for user ${userId}`);
      return storedQuestions;
    } catch (error) {
      logger.error('[DAILY_LEARNING] Failed to generate questions:', error);
      throw error;
    }
  }

  /**
   * Generate questions using OpenAI based on context
   */
  private async generateQuestionsWithAI(context: QuestionContext, count: number): Promise<any[]> {
    const systemPrompt = `You are an AI Learning Coach that generates personalized daily learning questions based on user activity and business context.

USER PROFILE:
- Skill Level: ${context.userProfile.skillLevel}
- Current Streak: ${context.userProfile.currentStreak} days
- Preferred Categories: ${context.userProfile.preferredCategories.join(', ') || 'Not specified'}

RECENT ACTIVITY:
${context.recentMemories.slice(0, 5).map((m, i) => `${i + 1}. ${JSON.stringify(m.context)}`).join('\n')}

GENERATE ${count} PERSONALIZED LEARNING QUESTIONS that:
1. Help the user reflect on recent activities
2. Encourage strategic thinking
3. Promote continuous improvement
4. Are actionable and practical

For each question, provide:
- question: The actual question text
- category: business/technical/strategic/operational
- difficulty: easy/medium/hard (match user skill level)
- suggestedActions: 3 concrete actions the user could take
- context: Brief explanation of why this question matters

Return JSON array of questions.`;

    try {
      const response = await getOpenAIClient().chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate personalized learning questions based on my recent activity.' },
        ],
        temperature: 0.8,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message?.content || '{}');
      return result.questions || [];
    } catch (error) {
      logger.error('[DAILY_LEARNING] OpenAI generation failed:', error);
      // Fallback to template questions
      return this.getFallbackQuestions(context, count);
    }
  }

  /**
   * Fallback questions if AI generation fails
   */
  private getFallbackQuestions(context: QuestionContext, count: number): any[] {
    const templates = [
      {
        question: 'What was the most important decision you made today, and what data informed it?',
        category: 'strategic',
        difficulty: 'medium',
        suggestedActions: [
          'Review the decision criteria you used',
          'Identify gaps in available data',
          'Set up automated reporting for similar decisions',
        ],
        context: 'Reflecting on decision-making processes improves strategic thinking',
      },
      {
        question: 'Which workflow or process could you automate to save 30+ minutes daily?',
        category: 'operational',
        difficulty: 'easy',
        suggestedActions: [
          'List your 5 most repetitive tasks',
          'Research automation tools for top task',
          'Create a simple automation prototype',
        ],
        context: 'Automation is key to scaling your productivity',
      },
      {
        question: 'What customer insight from today could shape your product roadmap?',
        category: 'business',
        difficulty: 'hard',
        suggestedActions: [
          'Document the insight in your CRM',
          'Share with product team for validation',
          'Schedule customer interview to explore deeper',
        ],
        context: 'Customer-driven development creates better products',
      },
    ];

    return templates.slice(0, count);
  }

  /**
   * Answer a learning question
   */
  public async answerQuestion(questionId: string, userAnswer: string): Promise<any> {
    try {
      const db = getDb();

      // Fetch question
      const [question] = await db
        .select()
        .from(brainLearningQuestions)
        .where(eq(brainLearningQuestions.id, questionId));

      if (!question) {
        throw new Error('Question not found');
      }

      // Generate AI response to user's answer
      const aiResponse = await this.generateAIResponse(question.question, userAnswer);

      // Update question with answer
      const [updated] = await db
        .update(brainLearningQuestions)
        .set({
          answered: true,
          userAnswer,
          aiResponse,
          answeredAt: new Date(),
        })
        .where(eq(brainLearningQuestions.id, questionId))
        .returning();

      // Update user insights
      await this.updateInsightsAfterAnswer(question.userId);

      logger.info(`[DAILY_LEARNING] Question ${questionId} answered by user ${question.userId}`);
      return updated;
    } catch (error) {
      logger.error('[DAILY_LEARNING] Failed to answer question:', error);
      throw error;
    }
  }

  /**
   * Generate AI response to user's answer
   */
  private async generateAIResponse(question: string, userAnswer: string): Promise<string> {
    try {
      const response = await getOpenAIClient().chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a supportive AI Learning Coach. Provide thoughtful, encouraging feedback on the user\'s answer. Acknowledge their insight, add valuable perspective, and suggest next steps.',
          },
          {
            role: 'user',
            content: `Question: ${question}\n\nMy Answer: ${userAnswer}\n\nPlease provide feedback and guidance.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return response.choices[0].message?.content || 'Thank you for your thoughtful answer!';
    } catch (error) {
      logger.error('[DAILY_LEARNING] Failed to generate AI response:', error);
      return 'Thank you for your thoughtful answer! Keep reflecting and learning.';
    }
  }

  /**
   * Update user insights after answering a question
   */
  private async updateInsightsAfterAnswer(userId: string): Promise<void> {
    const db = getDb();

    // Calculate stats
    const stats = await db
      .select({
        totalAnswered: sql<number>`count(*)`,
        avgRating: sql<number>`coalesce(avg(${brainLearningQuestions.rating}), 0)`,
      })
      .from(brainLearningQuestions)
      .where(
        and(
          eq(brainLearningQuestions.userId, userId),
          eq(brainLearningQuestions.answered, true)
        )
      );

    const totalAnswered = stats[0]?.totalAnswered || 0;
    const avgRating = Math.round(stats[0]?.avgRating || 0);

    // Check streak (answered question today?)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [insights] = await db
      .select()
      .from(brainLearningInsights)
      .where(eq(brainLearningInsights.userId, userId));

    let currentStreak = insights?.currentStreak || 0;
    const lastAnswer = insights?.lastAnswerAt;

    if (lastAnswer) {
      const lastAnswerDate = new Date(lastAnswer);
      lastAnswerDate.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((today.getTime() - lastAnswerDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        currentStreak += 1; // Continue streak
      } else if (daysDiff > 1) {
        currentStreak = 1; // Reset streak
      }
      // If daysDiff === 0, it's still today, don't increment
    } else {
      currentStreak = 1; // First answer
    }

    const longestStreak = Math.max(insights?.longestStreak || 0, currentStreak);

    await db
      .update(brainLearningInsights)
      .set({
        totalQuestionsAnswered: totalAnswered,
        averageRating: avgRating,
        currentStreak,
        longestStreak,
        lastAnswerAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(brainLearningInsights.userId, userId));
  }

  /**
   * Get unanswered questions for user
   */
  public async getUnansweredQuestions(userId: string, limit: number = 5): Promise<any[]> {
    const db = getDb();

    const questions = await db
      .select()
      .from(brainLearningQuestions)
      .where(
        and(
          eq(brainLearningQuestions.userId, userId),
          eq(brainLearningQuestions.answered, false)
        )
      )
      .orderBy(desc(brainLearningQuestions.createdAt))
      .limit(limit);

    return questions;
  }

  /**
   * Get user learning insights
   */
  public async getUserInsights(userId: string): Promise<any> {
    const db = getDb();

    let [insights] = await db
      .select()
      .from(brainLearningInsights)
      .where(eq(brainLearningInsights.userId, userId));

    if (!insights) {
      [insights] = await db
        .insert(brainLearningInsights)
        .values({ userId })
        .returning();
    }

    return insights;
  }

  /**
   * Rate a question
   */
  public async rateQuestion(questionId: string, rating: number): Promise<void> {
    const db = getDb();

    await db
      .update(brainLearningQuestions)
      .set({ rating })
      .where(eq(brainLearningQuestions.id, questionId));

    logger.info(`[DAILY_LEARNING] Question ${questionId} rated: ${rating}/5`);
  }
}

export const dailyLearningService = DailyLearningService.getInstance();
