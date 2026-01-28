import { getDb } from '@/lib/db';
import { brainBusinessIdeas, brainIdeasAnalytics } from '@/lib/db/schema-brain-ideas';
import { brainMemories } from '@/lib/db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
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

interface BusinessIdeaRequest {
  userId: string;
  focusArea?: string; // Optional focus: 'revenue', 'efficiency', 'growth', 'innovation'
  count?: number;
}

export class BusinessIdeasService {
  private static instance: BusinessIdeasService;

  private constructor() {}

  public static getInstance(): BusinessIdeasService {
    if (!BusinessIdeasService.instance) {
      BusinessIdeasService.instance = new BusinessIdeasService();
    }
    return BusinessIdeasService.instance;
  }

  /**
   * Generate proactive business ideas based on user context
   */
  public async generateIdeas(request: BusinessIdeaRequest): Promise<any[]> {
    try {
      const { userId, focusArea, count = 3 } = request;
      const db = getDb();

      // Fetch recent memories from Brain AI
      const recentMemories = await db
        .select()
        .from(brainMemories)
        .orderBy(desc(brainMemories.createdAt))
        .limit(30);

      // Fetch user's analytics to personalize ideas
      let [analytics] = await db
        .select()
        .from(brainIdeasAnalytics)
        .where(eq(brainIdeasAnalytics.userId, userId));

      if (!analytics) {
        [analytics] = await db
          .insert(brainIdeasAnalytics)
          .values({ userId })
          .returning();
      }

      // Build context for AI
      const context = {
        recentActivities: recentMemories.map(m => ({
          context: m.context,
          tags: m.tags,
          importance: m.importance,
          createdAt: m.createdAt,
        })),
        focusArea: focusArea || 'general',
        favoriteCategories: (analytics.favoriteCategories as string[]) || [],
        implementationHistory: {
          total: analytics.totalIdeasImplemented,
          averageRating: analytics.averageRating,
        },
      };

      // Generate ideas using AI
      const generatedIdeas = await this.generateIdeasWithAI(context, count);

      // Store ideas in database
      const storedIdeas = await db
        .insert(brainBusinessIdeas)
        .values(
          generatedIdeas.map(idea => ({
            userId,
            title: idea.title,
            description: idea.description,
            category: idea.category,
            impact: idea.impact,
            effort: idea.effort,
            timeframe: idea.timeframe,
            contextSource: idea.contextSource,
            steps: idea.steps,
            resources: idea.resources,
            risks: idea.risks,
            metrics: idea.metrics,
          }))
        )
        .returning();

      // Update analytics
      await db
        .update(brainIdeasAnalytics)
        .set({
          totalIdeasGenerated: sql`${brainIdeasAnalytics.totalIdeasGenerated} + ${count}`,
          lastIdeaAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(brainIdeasAnalytics.userId, userId));

      logger.info(`[BUSINESS_IDEAS] Generated ${generatedIdeas.length} ideas for user ${userId}`);
      return storedIdeas;
    } catch (error) {
      logger.error('[BUSINESS_IDEAS] Failed to generate ideas:', error);
      throw error;
    }
  }

  /**
   * Generate business ideas using AI
   */
  private async generateIdeasWithAI(context: any, count: number): Promise<any[]> {
    const systemPrompt = `You are an expert business strategist and innovation consultant. You generate actionable, data-driven business ideas based on user activity and context.

CONTEXT:
- Focus Area: ${context.focusArea}
- Recent Activities: ${JSON.stringify(context.recentActivities.slice(0, 10))}
- User Preferences: ${JSON.stringify(context.favoriteCategories)}

GENERATE ${count} PROACTIVE BUSINESS IDEAS that:
1. Are based on recent user activities and patterns
2. Address real business opportunities or challenges
3. Are actionable with clear next steps
4. Include measurable success metrics
5. Consider effort vs. impact

For each idea, provide:
- title: Compelling, action-oriented title (max 100 chars)
- description: Detailed explanation (2-3 paragraphs)
- category: revenue/efficiency/growth/innovation/risk
- impact: low/medium/high/critical (business impact)
- effort: low/medium/high (implementation effort)
- timeframe: short/medium/long (time to implement)
- steps: Array of 5-7 concrete implementation steps
- resources: Required resources (people, tools, budget)
- risks: Potential risks and mitigation strategies
- metrics: 3-5 KPIs to track success
- contextSource: Which activities triggered this idea

Return JSON array of ideas.`;

    try {
      const response = await getOpenAIClient().chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate innovative business ideas based on my recent context.' },
        ],
        temperature: 0.8,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message?.content || '{}');
      return result.ideas || [];
    } catch (error) {
      logger.error('[BUSINESS_IDEAS] AI generation failed:', error);
      return this.getFallbackIdeas(context, count);
    }
  }

  /**
   * Fallback ideas if AI generation fails
   */
  private getFallbackIdeas(context: any, count: number): any[] {
    const templates = [
      {
        title: 'Automate Repetitive Workflows',
        description: 'Identify and automate the most time-consuming repetitive tasks in your daily workflow. Recent activity shows potential for automation in data processing, report generation, and communication tasks.',
        category: 'efficiency',
        impact: 'high',
        effort: 'medium',
        timeframe: 'medium',
        steps: [
          'Audit all repetitive tasks in current workflow',
          'Prioritize by time savings potential',
          'Research automation tools (Zapier, Make, n8n)',
          'Create proof-of-concept for top task',
          'Measure time savings and iterate',
        ],
        resources: { people: 1, tools: ['Automation platform'], budget: 500 },
        risks: [{ risk: 'Tool complexity', mitigation: 'Start with simple workflows' }],
        metrics: ['Time saved per week', 'Task error rate', 'Cost per automation'],
        contextSource: { type: 'activity_pattern', description: 'Repetitive manual tasks detected' },
      },
      {
        title: 'Launch Customer Feedback Loop',
        description: 'Implement systematic customer feedback collection and analysis. Create a continuous improvement cycle based on real customer insights to drive product development.',
        category: 'growth',
        impact: 'high',
        effort: 'medium',
        timeframe: 'short',
        steps: [
          'Set up feedback collection tool (Typeform, Google Forms)',
          'Design 5-question feedback survey',
          'Integrate into customer touchpoints',
          'Weekly review of feedback trends',
          'Monthly action planning sessions',
        ],
        resources: { people: 2, tools: ['Survey tool', 'Analytics dashboard'], budget: 300 },
        risks: [{ risk: 'Low response rate', mitigation: 'Incentivize participation' }],
        metrics: ['Response rate', 'NPS score', 'Feature requests implemented'],
        contextSource: { type: 'business_opportunity', description: 'Customer engagement gap detected' },
      },
      {
        title: 'Develop Data-Driven Decision Framework',
        description: 'Create a structured framework for making business decisions based on data rather than intuition. Establish key metrics, dashboards, and review cadences.',
        category: 'innovation',
        impact: 'critical',
        effort: 'high',
        timeframe: 'long',
        steps: [
          'Define 10-15 North Star metrics',
          'Set up analytics infrastructure',
          'Create executive dashboard',
          'Train team on data interpretation',
          'Establish weekly metrics review',
          'Document decision-making process',
        ],
        resources: { people: 3, tools: ['BI tool', 'Data warehouse'], budget: 2000 },
        risks: [{ risk: 'Analysis paralysis', mitigation: 'Set decision deadlines' }],
        metrics: ['Data-driven decisions %', 'Decision quality score', 'Time to decision'],
        contextSource: { type: 'strategic_gap', description: 'Decision-making inefficiency detected' },
      },
    ];

    return templates.slice(0, count);
  }

  /**
   * Get ideas for user
   */
  public async getIdeas(userId: string, status?: string, limit: number = 20): Promise<any[]> {
    const db = getDb();

    let query = db
      .select()
      .from(brainBusinessIdeas)
      .where(eq(brainBusinessIdeas.userId, userId));

    if (status) {
      query = query.where(
        and(
          eq(brainBusinessIdeas.userId, userId),
          eq(brainBusinessIdeas.status, status)
        )
      );
    }

    const ideas = await query
      .orderBy(desc(brainBusinessIdeas.createdAt))
      .limit(limit);

    return ideas;
  }

  /**
   * Update idea status
   */
  public async updateIdeaStatus(ideaId: string, status: string, feedback?: string): Promise<any> {
    const db = getDb();

    const updates: any = {
      status,
      updatedAt: new Date(),
    };

    if (feedback) {
      updates.userFeedback = feedback;
    }

    if (status === 'completed') {
      updates.implementedAt = new Date();
    }

    const [updated] = await db
      .update(brainBusinessIdeas)
      .set(updates)
      .where(eq(brainBusinessIdeas.id, ideaId))
      .returning();

    // Update analytics if implemented
    if (status === 'completed') {
      const [idea] = await db
        .select()
        .from(brainBusinessIdeas)
        .where(eq(brainBusinessIdeas.id, ideaId));

      await db
        .update(brainIdeasAnalytics)
        .set({
          totalIdeasImplemented: sql`${brainIdeasAnalytics.totalIdeasImplemented} + 1`,
          lastImplementationAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(brainIdeasAnalytics.userId, idea.userId));
    }

    return updated;
  }

  /**
   * Rate an idea
   */
  public async rateIdea(ideaId: string, rating: number): Promise<void> {
    const db = getDb();

    await db
      .update(brainBusinessIdeas)
      .set({ rating, updatedAt: new Date() })
      .where(eq(brainBusinessIdeas.id, ideaId));

    logger.info(`[BUSINESS_IDEAS] Idea ${ideaId} rated: ${rating}/5`);
  }

  /**
   * Get analytics
   */
  public async getAnalytics(userId: string): Promise<any> {
    const db = getDb();

    let [analytics] = await db
      .select()
      .from(brainIdeasAnalytics)
      .where(eq(brainIdeasAnalytics.userId, userId));

    if (!analytics) {
      [analytics] = await db
        .insert(brainIdeasAnalytics)
        .values({ userId })
        .returning();
    }

    return analytics;
  }
}

export const businessIdeasService = BusinessIdeasService.getInstance();
