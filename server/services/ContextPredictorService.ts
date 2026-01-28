import { getDb } from '@/lib/db';
import { calendarEvents, contextPredictions, meetingBriefings } from '@/lib/db/schema-calendar';
import { brainMemories } from '@/lib/db/schema';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
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

interface PredictedContext {
  type: string;
  data: any;
  source: string;
  relevance: number;
  memoryId?: string;
}

interface MeetingBriefing {
  title: string;
  summary: string;
  keyPoints: string[];
  lastInteractions: any[];
  painPoints: string[];
  suggestedTalkingPoints: string[];
  competitorIntel?: any;
  pricingInfo?: any;
  actionItems: string[];
  relevantDocuments: string[];
  relevantIdeas: string[];
  confidence: string;
}

export class ContextPredictorService {
  private static instance: ContextPredictorService;

  private constructor() {}

  public static getInstance(): ContextPredictorService {
    if (!ContextPredictorService.instance) {
      ContextPredictorService.instance = new ContextPredictorService();
    }
    return ContextPredictorService.instance;
  }

  /**
   * Predict needed context for an upcoming event
   */
  public async predictContextForEvent(eventId: string, userId: string): Promise<PredictedContext[]> {
    try {
      const db = getDb();

      // Get event details
      const [event] = await db
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.id, eventId));

      if (!event) {
        throw new Error('Event not found');
      }

      const contexts: PredictedContext[] = [];

      // 1. Extract entities from event title & description
      const entities = this.extractEntities(event.title, event.description || '');

      // 2. Company/Organization detection
      if (entities.companies.length > 0) {
        for (const company of entities.companies) {
          const companyContext = await this.loadCompanyContext(company, userId);
          contexts.push(...companyContext);
        }
      }

      // 3. Meeting type detection
      const meetingType = this.detectMeetingType(event.title, event.description || '');

      if (meetingType === 'sales') {
        const salesContext = await this.loadSalesContext(event, userId);
        contexts.push(...salesContext);
      } else if (meetingType === 'customer_support') {
        const supportContext = await this.loadSupportContext(event, userId);
        contexts.push(...supportContext);
      } else if (meetingType === 'planning') {
        const planningContext = await this.loadPlanningContext(event, userId);
        contexts.push(...planningContext);
      }

      // 4. Attendee-based context
      if (event.attendees && Array.isArray(event.attendees)) {
        const attendeeEmails = (event.attendees as any[]).map(a => a.email);
        const attendeeContext = await this.loadAttendeeContext(attendeeEmails, userId);
        contexts.push(...attendeeContext);
      }

      // 5. Time-based context (what happened recently)
      const recentContext = await this.loadRecentRelevantContext(event.title, userId);
      contexts.push(...recentContext);

      // Sort by relevance
      contexts.sort((a, b) => b.relevance - a.relevance);

      // Take top 15 most relevant
      const topContexts = contexts.slice(0, 15);

      // Store prediction
      await db.insert(contextPredictions).values({
        userId,
        eventId,
        predictedContext: topContexts as any,
        confidence: this.calculateConfidence(topContexts),
        reasoning: this.generateReasoning(event, topContexts),
        sources: topContexts.filter(c => c.memoryId).map(c => c.memoryId!),
      });

      logger.info(`[CONTEXT_PREDICTOR] Predicted ${topContexts.length} contexts for event ${eventId}`);
      return topContexts;
    } catch (error) {
      logger.error('[CONTEXT_PREDICTOR] Prediction failed:', error);
      throw error;
    }
  }

  /**
   * Extract entities from text (companies, people, topics)
   */
  private extractEntities(title: string, description: string): {
    companies: string[];
    people: string[];
    topics: string[];
  } {
    const text = `${title} ${description}`.toLowerCase();

    // Simple entity extraction (can be improved with NLP)
    const companies: string[] = [];
    const people: string[] = [];
    const topics: string[] = [];

    // Common business indicators
    if (text.includes('sales') || text.includes('demo') || text.includes('pitch')) {
      topics.push('sales');
    }
    if (text.includes('support') || text.includes('issue') || text.includes('bug')) {
      topics.push('customer_support');
    }
    if (text.includes('planning') || text.includes('roadmap') || text.includes('strategy')) {
      topics.push('planning');
    }
    if (text.includes('review') || text.includes('1:1') || text.includes('one-on-one')) {
      topics.push('review');
    }

    // Extract potential company names (capitalized words)
    const words = title.split(' ');
    for (const word of words) {
      if (word.length > 1 && word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
        // Likely a proper noun (company or person name)
        if (!['Meeting', 'Call', 'With', 'The', 'And', 'For'].includes(word)) {
          companies.push(word);
        }
      }
    }

    return { companies, people, topics };
  }

  /**
   * Detect meeting type from title/description
   */
  private detectMeetingType(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase();

    if (text.match(/sales|demo|pitch|proposal|client call/)) return 'sales';
    if (text.match(/support|issue|bug|problem|ticket/)) return 'customer_support';
    if (text.match(/planning|roadmap|strategy|okr|goals/)) return 'planning';
    if (text.match(/review|1:1|one-on-one|feedback/)) return 'review';
    if (text.match(/standup|daily|sync|status/)) return 'standup';
    if (text.match(/interview|hiring|candidate/)) return 'interview';

    return 'general';
  }

  /**
   * Load company-related context
   */
  private async loadCompanyContext(company: string, userId: string): Promise<PredictedContext[]> {
    const db = getDb();
    const contexts: PredictedContext[] = [];

    // Search Brain memories for this company
    const memories = await db
      .select()
      .from(brainMemories)
      .where(
        sql`${brainMemories.context}::text ILIKE ${`%${company}%`}`
      )
      .orderBy(desc(brainMemories.createdAt))
      .limit(5);

    for (const memory of memories) {
      contexts.push({
        type: 'company_memory',
        data: memory.context,
        source: 'Brain AI',
        relevance: memory.importance / 10,
        memoryId: memory.id,
      });
    }

    return contexts;
  }

  /**
   * Load sales-specific context
   */
  private async loadSalesContext(event: any, userId: string): Promise<PredictedContext[]> {
    const db = getDb();
    const contexts: PredictedContext[] = [];

    // Get recent sales-related memories
    const salesMemories = await db
      .select()
      .from(brainMemories)
      .where(
        sql`${brainMemories.tags}::text ILIKE '%sales%'`
      )
      .orderBy(desc(brainMemories.createdAt))
      .limit(5);

    for (const memory of salesMemories) {
      contexts.push({
        type: 'sales_context',
        data: memory.context,
        source: 'Sales History',
        relevance: 0.8,
        memoryId: memory.id,
      });
    }

    return contexts;
  }

  /**
   * Load support-specific context
   */
  private async loadSupportContext(event: any, userId: string): Promise<PredictedContext[]> {
    const db = getDb();
    const contexts: PredictedContext[] = [];

    // Get recent support-related memories
    const supportMemories = await db
      .select()
      .from(brainMemories)
      .where(
        sql`${brainMemories.tags}::text ILIKE '%support%' OR ${brainMemories.tags}::text ILIKE '%customer%'`
      )
      .orderBy(desc(brainMemories.createdAt))
      .limit(5);

    for (const memory of supportMemories) {
      contexts.push({
        type: 'support_context',
        data: memory.context,
        source: 'Support History',
        relevance: 0.7,
        memoryId: memory.id,
      });
    }

    return contexts;
  }

  /**
   * Load planning-specific context
   */
  private async loadPlanningContext(event: any, userId: string): Promise<PredictedContext[]> {
    const db = getDb();
    const contexts: PredictedContext[] = [];

    // Get planning/strategy memories
    const planningMemories = await db
      .select()
      .from(brainMemories)
      .where(
        sql`${brainMemories.tags}::text ILIKE '%planning%' OR ${brainMemories.tags}::text ILIKE '%strategy%' OR ${brainMemories.tags}::text ILIKE '%roadmap%'`
      )
      .orderBy(desc(brainMemories.createdAt))
      .limit(5);

    for (const memory of planningMemories) {
      contexts.push({
        type: 'planning_context',
        data: memory.context,
        source: 'Planning History',
        relevance: 0.75,
        memoryId: memory.id,
      });
    }

    return contexts;
  }

  /**
   * Load attendee-related context
   */
  private async loadAttendeeContext(emails: string[], userId: string): Promise<PredictedContext[]> {
    const db = getDb();
    const contexts: PredictedContext[] = [];

    for (const email of emails.slice(0, 3)) { // Limit to first 3 attendees
      // Search for memories mentioning this email or domain
      const domain = email.split('@')[1];

      const attendeeMemories = await db
        .select()
        .from(brainMemories)
        .where(
          sql`${brainMemories.context}::text ILIKE ${`%${email}%`} OR ${brainMemories.context}::text ILIKE ${`%${domain}%`}`
        )
        .orderBy(desc(brainMemories.createdAt))
        .limit(3);

      for (const memory of attendeeMemories) {
        contexts.push({
          type: 'attendee_context',
          data: memory.context,
          source: `Previous interactions with ${email.split('@')[0]}`,
          relevance: 0.85,
          memoryId: memory.id,
        });
      }
    }

    return contexts;
  }

  /**
   * Load recent relevant context based on keywords
   */
  private async loadRecentRelevantContext(title: string, userId: string): Promise<PredictedContext[]> {
    const db = getDb();
    const contexts: PredictedContext[] = [];

    // Extract keywords from title
    const keywords = title.toLowerCase().split(/\s+/).filter(word => word.length > 3);

    if (keywords.length === 0) return contexts;

    // Build search query
    const searchPattern = keywords.join('|');

    const recentMemories = await db
      .select()
      .from(brainMemories)
      .where(
        sql`${brainMemories.context}::text ~* ${searchPattern}`
      )
      .orderBy(desc(brainMemories.createdAt))
      .limit(5);

    for (const memory of recentMemories) {
      contexts.push({
        type: 'keyword_match',
        data: memory.context,
        source: 'Recent Activity',
        relevance: 0.6,
        memoryId: memory.id,
      });
    }

    return contexts;
  }

  /**
   * Calculate confidence level
   */
  private calculateConfidence(contexts: PredictedContext[]): string {
    if (contexts.length === 0) return 'low';

    const avgRelevance = contexts.reduce((sum, c) => sum + c.relevance, 0) / contexts.length;

    if (avgRelevance >= 0.8 && contexts.length >= 10) return 'critical';
    if (avgRelevance >= 0.6 && contexts.length >= 5) return 'high';
    if (avgRelevance >= 0.4 && contexts.length >= 3) return 'medium';
    return 'low';
  }

  /**
   * Generate reasoning explanation
   */
  private generateReasoning(event: any, contexts: PredictedContext[]): string {
    const reasons: string[] = [];

    const types = new Set(contexts.map(c => c.type));

    if (types.has('company_memory')) {
      reasons.push('Previous interactions with this company found');
    }
    if (types.has('sales_context')) {
      reasons.push('Sales-related meeting detected');
    }
    if (types.has('attendee_context')) {
      reasons.push('Previous communications with attendees available');
    }
    if (types.has('keyword_match')) {
      reasons.push('Relevant recent activities identified');
    }

    return reasons.join('; ');
  }

  /**
   * Generate meeting briefing using AI
   */
  public async generateBriefing(eventId: string, userId: string): Promise<MeetingBriefing> {
    try {
      const db = getDb();

      // Get event and prediction
      const [event] = await db
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.id, eventId));

      if (!event) {
        throw new Error('Event not found');
      }

      const [prediction] = await db
        .select()
        .from(contextPredictions)
        .where(eq(contextPredictions.eventId, eventId))
        .orderBy(desc(contextPredictions.createdAt))
        .limit(1);

      const predictedContext = prediction?.predictedContext || [];

      // Build context for AI
      const contextSummary = Array.isArray(predictedContext)
        ? predictedContext.map((c: any) => JSON.stringify(c.data)).join('\n\n')
        : '';

      // Generate briefing with GPT-4
      const response = await getOpenAIClient().chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert executive assistant preparing a meeting briefing.

Create a concise, actionable briefing for an upcoming meeting.

Include:
1. Summary (2-3 sentences)
2. Key Points (3-5 bullet points)
3. Last Interactions (if available from context)
4. Pain Points (identified issues/concerns)
5. Suggested Talking Points (5-7 actionable points)
6. Action Items (recommended actions)

Return as JSON.`,
          },
          {
            role: 'user',
            content: `Meeting: ${event.title}

Description: ${event.description || 'No description'}

Time: ${event.startTime}

Available Context:
${contextSummary || 'No previous context available'}

Generate a meeting briefing.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const briefingData = JSON.parse(response.choices[0].message?.content || '{}');

      const briefing: MeetingBriefing = {
        title: `Briefing: ${event.title}`,
        summary: briefingData.summary || 'No summary available',
        keyPoints: briefingData.keyPoints || [],
        lastInteractions: Array.isArray(predictedContext)
          ? predictedContext.filter((c: any) => c.type === 'company_memory' || c.type === 'attendee_context').slice(0, 3)
          : [],
        painPoints: briefingData.painPoints || [],
        suggestedTalkingPoints: briefingData.suggestedTalkingPoints || [],
        actionItems: briefingData.actionItems || [],
        relevantDocuments: [],
        relevantIdeas: [],
        confidence: prediction?.confidence || 'medium',
      };

      // Store briefing
      await db.insert(meetingBriefings).values({
        userId,
        eventId,
        predictionId: prediction?.id,
        title: briefing.title,
        summary: briefing.summary,
        keyPoints: briefing.keyPoints as any,
        lastInteractions: briefing.lastInteractions as any,
        painPoints: briefing.painPoints as any,
        suggestedTalkingPoints: briefing.suggestedTalkingPoints as any,
        actionItems: briefing.actionItems as any,
        relevantDocuments: briefing.relevantDocuments as any,
        relevantIdeas: briefing.relevantIdeas as any,
        confidence: briefing.confidence,
      });

      logger.info(`[CONTEXT_PREDICTOR] Briefing generated for event ${eventId}`);
      return briefing;
    } catch (error) {
      logger.error('[CONTEXT_PREDICTOR] Briefing generation failed:', error);
      throw error;
    }
  }

  /**
   * Get briefing for event
   */
  public async getBriefing(eventId: string): Promise<any> {
    const db = getDb();

    const [briefing] = await db
      .select()
      .from(meetingBriefings)
      .where(eq(meetingBriefings.eventId, eventId))
      .orderBy(desc(meetingBriefings.createdAt))
      .limit(1);

    return briefing;
  }

  /**
   * Mark briefing as viewed
   */
  public async markBriefingViewed(briefingId: string): Promise<void> {
    const db = getDb();

    await db
      .update(meetingBriefings)
      .set({
        status: 'viewed',
        viewedAt: new Date(),
      })
      .where(eq(meetingBriefings.id, briefingId));
  }

  /**
   * Predict context for all upcoming events (batch operation)
   */
  public async predictUpcomingEvents(
    userId: string,
    hoursAhead: number = 24
  ): Promise<Array<{ eventId: string; contexts: PredictedContext[]; error?: string }>> {
    try {
      const db = getDb();
      const now = new Date();
      const future = new Date();
      future.setHours(future.getHours() + hoursAhead);

      // Get upcoming events
      const events = await db
        .select()
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.userId, userId),
            gte(calendarEvents.startTime, now),
            eq(calendarEvents.status, 'confirmed')
          )
        )
        .orderBy(calendarEvents.startTime)
        .limit(20);

      logger.info(`[CONTEXT_PREDICTOR] Found ${events.length} upcoming events for batch prediction`);

      const results: Array<{ eventId: string; contexts: PredictedContext[]; error?: string }> = [];

      // Predict context for each event
      for (const event of events) {
        try {
          const contexts = await this.predictContextForEvent(event.id, userId);
          results.push({
            eventId: event.id,
            contexts,
          });
        } catch (error: any) {
          logger.error(`[CONTEXT_PREDICTOR] Failed to predict context for event ${event.id}:`, error);
          results.push({
            eventId: event.id,
            contexts: [],
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('[CONTEXT_PREDICTOR] Batch prediction failed:', error);
      throw error;
    }
  }
}

export const contextPredictorService = ContextPredictorService.getInstance();
