/**
 * MotionAIService - Enterprise-Grade AI Service for Motion Agents
 *
 * This service provides AI-powered capabilities for all Motion agent tools:
 * - LLM-based content generation
 * - Intelligent analysis and insights
 * - Smart recommendations
 * - Context-aware responses
 * - Enterprise Rate Limiting
 * - Request Queuing with Priority
 * - Automatic Retry with Exponential Backoff
 *
 * NO MOCKS - Real AI-powered functionality
 */

import { EventEmitter } from 'events';
import * as AIService from '@/lib/ai/ai-service';
import { getDb } from '@/lib/db';
import {
  motionAgentContext,
  motionConversations,
  motionEvents,
  motionCreditUsage,
} from '@/lib/db/schema-motion';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import type { MotionAgentId } from '../shared/types';
import {
  rateLimiter,
  RateLimitContext,
  RateLimitError,
  RateLimitResult,
} from './RateLimitService';
import {
  cacheService,
  CacheResult,
} from './CacheService';
import {
  circuitBreaker,
  CircuitBreakerOpenError,
} from './CircuitBreakerService';
import {
  logger,
  LoggerInstance,
  LogContext,
} from './LoggingService';

// ============================================
// TYPES
// ============================================

export interface AIGenerationOptions {
  temperature?: number;
  maxTokens?: number;
  format?: 'text' | 'json' | 'markdown' | 'html';
  style?: 'professional' | 'casual' | 'formal' | 'creative';
  language?: string;
}

export interface AIAnalysisResult<T = unknown> {
  result: T;
  confidence: number;
  reasoning?: string;
  suggestions?: string[];
  tokensUsed: number;
  model: string;
}

export interface AIContentResult {
  content: string;
  metadata: {
    tokensUsed: number;
    model: string;
    format: string;
  };
}

export interface ContextData {
  userId: string;
  workspaceId: string;
  agentId: MotionAgentId;
  recentContext?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
}

export interface RateLimitedOptions {
  userId?: string;
  workspaceId?: string;
  agentId?: MotionAgentId;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  skipRateLimit?: boolean; // For internal system calls
  skipCache?: boolean; // Skip cache, always fetch fresh
  cacheTTL?: number; // Custom cache TTL in milliseconds
}

// ============================================
// MOTION AI SERVICE CLASS
// ============================================

export class MotionAIService extends EventEmitter {
  private static instance: MotionAIService;

  // Structured logger for this service
  private log: LoggerInstance;

  // Default rate limit context for system calls
  private defaultContext: RateLimitContext = {
    userId: 'system',
    workspaceId: 'system',
    priority: 'normal',
    operation: 'ai-generation',
  };

  private constructor() {
    super();
    // Initialize structured logger
    this.log = logger.createLogger({
      service: 'motion-ai',
      component: 'ai-service',
    });
    // Initialize rate limiter event handlers
    this.setupRateLimiterEvents();
    // Initialize cache event handlers
    this.setupCacheEvents();

    this.log.info('MotionAIService initialized');
  }

  public static getInstance(): MotionAIService {
    if (!MotionAIService.instance) {
      MotionAIService.instance = new MotionAIService();
    }
    return MotionAIService.instance;
  }

  /**
   * Setup cache event handlers
   */
  private setupCacheEvents(): void {
    cacheService.on('cache:hit', ({ key }) => {
      this.log.debug('Cache hit', { cacheKey: key });
    });

    cacheService.on('cache:miss', ({ key }) => {
      this.log.debug('Cache miss', { cacheKey: key });
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return cacheService.getStats();
  }

  /**
   * Invalidate cache by agent ID
   */
  async invalidateAgentCache(agentId: string): Promise<number> {
    return cacheService.invalidateByTag(agentId);
  }

  /**
   * Clear all AI response cache
   */
  async clearCache(): Promise<void> {
    await cacheService.invalidateByTag('ai-content');
  }

  /**
   * Get circuit breaker metrics
   */
  getCircuitBreakerMetrics() {
    return circuitBreaker.getMetrics();
  }

  /**
   * Get circuit breaker state for an agent
   */
  getCircuitState(agentId?: string): string {
    const circuitName = `ai-generation:${agentId || 'motion-ai'}`;
    const stats = circuitBreaker.getCircuitStats(circuitName);
    return stats?.state || 'CLOSED';
  }

  /**
   * Reset circuit breaker for an agent
   */
  resetCircuit(agentId?: string): boolean {
    const circuitName = `ai-generation:${agentId || 'motion-ai'}`;
    return circuitBreaker.resetCircuit(circuitName);
  }

  /**
   * Setup rate limiter event handlers for monitoring
   */
  private setupRateLimiterEvents(): void {
    rateLimiter.on('request:denied', ({ context, result }) => {
      this.log.warn('Rate limit denied', {
        userId: context.userId,
        agentId: context.agentId,
        retryAfter: result.retryAfter,
        remainingTokens: result.remainingTokens,
      });
    });

    rateLimiter.on('external:ratelimit', ({ context, retryAfter }) => {
      this.log.error('External API rate limit hit', null, {
        userId: context.userId,
        retryAfter,
        operation: context.operation,
      });
    });

    rateLimiter.on('request:queued', ({ context, position }) => {
      this.log.debug('Request queued', {
        userId: context.userId,
        agentId: context.agentId,
        queuePosition: position,
      });
    });
  }

  /**
   * Build rate limit context from options
   */
  private buildRateLimitContext(options?: RateLimitedOptions): RateLimitContext {
    return {
      userId: options?.userId || this.defaultContext.userId,
      workspaceId: options?.workspaceId || this.defaultContext.workspaceId,
      agentId: options?.agentId,
      priority: options?.priority || 'normal',
      operation: 'openai-generation',
    };
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(options?: RateLimitedOptions): Promise<{
    allowed: boolean;
    remainingTokens: number;
    remainingRequests: number;
    resetTime: number;
  }> {
    const context = this.buildRateLimitContext(options);
    return rateLimiter.checkLimit(context);
  }

  /**
   * Get rate limiter metrics
   */
  getRateLimitMetrics() {
    return rateLimiter.getMetrics();
  }

  // ============================================
  // CONTENT GENERATION
  // ============================================

  /**
   * Generate content using AI (emails, messages, documents, etc.)
   * NOW WITH ENTERPRISE RATE LIMITING AND CACHING
   */
  async generateContent(
    prompt: string,
    systemPrompt: string,
    options: AIGenerationOptions = {},
    rateLimitOptions?: RateLimitedOptions
  ): Promise<AIContentResult> {
    const {
      temperature = 0.7,
      maxTokens = 2000,
      format = 'text',
      style = 'professional',
      language = 'en',
    } = options;

    const enhancedSystemPrompt = `${systemPrompt}

OUTPUT REQUIREMENTS:
- Style: ${style}
- Format: ${format}
- Language: ${language}
${format === 'json' ? '- Return valid JSON only, no markdown code blocks' : ''}
${format === 'markdown' ? '- Use proper markdown formatting' : ''}`;

    // Build rate limit context
    const rateLimitContext = this.buildRateLimitContext(rateLimitOptions);

    // Generate cache key (only cache deterministic outputs with low temperature)
    const shouldCache = !rateLimitOptions?.skipCache && temperature <= 0.5;
    const cacheKey = shouldCache
      ? cacheService.generateAIKey(
          rateLimitOptions?.agentId || 'motion-ai',
          prompt,
          { systemPrompt: enhancedSystemPrompt.substring(0, 200), format, style }
        )
      : null;

    // Try cache first
    if (cacheKey) {
      const cached = await cacheService.get<AIContentResult>(cacheKey);
      if (cached) {
        this.log.debug('Cache hit for content generation', { cacheKey });
        this.emit('cache:hit', { key: cacheKey, type: 'content' });
        return cached;
      }
    }

    // Estimate token cost (prompt + max response)
    const estimatedTokens = Math.ceil((prompt.length + systemPrompt.length) / 4) + maxTokens;

    try {
      let result: AIContentResult;

      // Execute with circuit breaker, rate limiting and automatic retry
      const circuitName = `ai-generation:${rateLimitOptions?.agentId || 'motion-ai'}`;

      result = await circuitBreaker.execute(
        circuitName,
        async () => {
          if (rateLimitOptions?.skipRateLimit) {
            // Skip rate limiting for internal system calls
            return await this.executeAIGeneration(prompt, enhancedSystemPrompt, format);
          }

          return await rateLimiter.executeWithRetry(
            rateLimitContext,
            async () => this.executeAIGeneration(prompt, enhancedSystemPrompt, format),
            { tokenCost: Math.ceil(estimatedTokens / 100) } // Normalize token cost
          );
        },
        // Fallback: return cached result if available or throw
        async () => {
          if (cacheKey) {
            const cached = await cacheService.get<AIContentResult>(cacheKey);
            if (cached) {
              this.log.info('Circuit breaker fallback: returning cached result', { cacheKey });
              return cached;
            }
          }
          throw new Error('AI service temporarily unavailable. Please try again later.');
        }
      );

      // Cache the result
      if (cacheKey) {
        await cacheService.set(cacheKey, result, {
          ttl: rateLimitOptions?.cacheTTL || 5 * 60 * 1000, // Default 5 minutes
          tags: ['ai-content', rateLimitOptions?.agentId || 'motion-ai'],
        });
      }

      return result;
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        this.log.warn('Circuit breaker open', {
          circuit: error.circuitName,
          retryAfter: error.retryAfter,
          agentId: rateLimitOptions?.agentId,
        });
        throw new Error(`AI service temporarily unavailable. Please retry after ${Math.ceil(error.retryAfter / 1000)} seconds.`);
      }
      if (error instanceof RateLimitError) {
        this.log.warn('Rate limit exceeded', {
          retryAfter: error.retryAfter,
          remainingTokens: error.result.remainingTokens,
          userId: rateLimitOptions?.userId,
          agentId: rateLimitOptions?.agentId,
        });
        throw new Error(`Rate limit exceeded. Please retry after ${Math.ceil(error.retryAfter / 1000)} seconds.`);
      }
      this.log.error('Content generation failed', error, {
        promptLength: prompt.length,
        agentId: rateLimitOptions?.agentId,
      });
      throw new Error(`AI content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Internal method to execute AI generation
   */
  private async executeAIGeneration(
    prompt: string,
    systemPrompt: string,
    format: string
  ): Promise<AIContentResult> {
    const response = await AIService.generateAgentResponse(
      {
        id: 'motion-ai',
        name: 'Motion AI',
        role: 'AI Content Generator',
        bio: 'Enterprise-grade AI content generation',
        specialties: ['Content Generation', 'Analysis', 'Recommendations'],
        color: '#6366f1',
        icon: 'Sparkles',
        greeting: '',
      },
      prompt,
      [{ role: 'user', content: systemPrompt }]
    );

    return {
      content: response.content,
      metadata: {
        tokensUsed: response.tokensUsed,
        model: response.model,
        format,
      },
    };
  }

  /**
   * Generate structured JSON output from AI
   * NOW WITH ENTERPRISE RATE LIMITING
   */
  async generateStructuredOutput<T>(
    prompt: string,
    systemPrompt: string,
    schema: Record<string, unknown>,
    rateLimitOptions?: RateLimitedOptions
  ): Promise<AIAnalysisResult<T>> {
    const schemaPrompt = `${systemPrompt}

You MUST respond with valid JSON matching this schema:
${JSON.stringify(schema, null, 2)}

IMPORTANT: Return ONLY the JSON object, no markdown code blocks, no explanations.`;

    try {
      const result = await this.generateContent(
        prompt,
        schemaPrompt,
        {
          format: 'json',
          temperature: 0.3, // Lower temperature for structured output
        },
        rateLimitOptions
      );

      // Parse JSON response
      let parsed: T;
      try {
        // Clean potential markdown code blocks
        let cleanContent = result.content.trim();
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.slice(7);
        }
        if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.slice(3);
        }
        if (cleanContent.endsWith('```')) {
          cleanContent = cleanContent.slice(0, -3);
        }
        parsed = JSON.parse(cleanContent.trim()) as T;
      } catch (parseError) {
        this.log.error('JSON parse error in structured output', parseError, {
          contentLength: result.content.length,
          contentPreview: result.content.substring(0, 100),
        });
        throw new Error('Failed to parse AI response as JSON');
      }

      return {
        result: parsed,
        confidence: 0.85,
        tokensUsed: result.metadata.tokensUsed,
        model: result.metadata.model,
      };
    } catch (error) {
      this.log.error('Structured output generation failed', error, {
        promptLength: prompt.length,
      });
      throw error;
    }
  }

  // ============================================
  // EMAIL & COMMUNICATION
  // ============================================

  /**
   * Generate professional email content
   */
  async generateEmail(params: {
    purpose: string;
    recipient: { name: string; title?: string; company?: string };
    context: string;
    tone: 'professional' | 'friendly' | 'formal' | 'urgent';
    includeSignature?: boolean;
    senderName?: string;
  }): Promise<{ subject: string; body: string; tokensUsed: number }> {
    const systemPrompt = `You are an expert email writer. Generate a professional email.

RECIPIENT INFO:
- Name: ${params.recipient.name}
- Title: ${params.recipient.title || 'Unknown'}
- Company: ${params.recipient.company || 'Unknown'}

TONE: ${params.tone}
CONTEXT: ${params.context}

Generate ONLY valid JSON with this structure:
{
  "subject": "Email subject line",
  "body": "Full email body with proper formatting"
}`;

    const result = await this.generateStructuredOutput<{ subject: string; body: string }>(
      params.purpose,
      systemPrompt,
      { subject: 'string', body: 'string' }
    );

    let body = result.result.body;
    if (params.includeSignature && params.senderName) {
      body += `\n\nBest regards,\n${params.senderName}`;
    }

    return {
      subject: result.result.subject,
      body,
      tokensUsed: result.tokensUsed,
    };
  }

  /**
   * Generate LinkedIn/Social message
   */
  async generateSocialMessage(params: {
    platform: 'linkedin' | 'twitter' | 'facebook';
    purpose: string;
    targetAudience: string;
    tone: 'professional' | 'casual' | 'engaging';
    maxLength?: number;
  }): Promise<{ message: string; hashtags?: string[]; tokensUsed: number }> {
    const maxLength = params.maxLength || (params.platform === 'twitter' ? 280 : 3000);

    const systemPrompt = `You are a social media expert for ${params.platform}.

TARGET AUDIENCE: ${params.targetAudience}
TONE: ${params.tone}
MAX LENGTH: ${maxLength} characters

Generate ONLY valid JSON:
{
  "message": "The social media message",
  "hashtags": ["relevant", "hashtags"]
}`;

    const result = await this.generateStructuredOutput<{ message: string; hashtags: string[] }>(
      params.purpose,
      systemPrompt,
      { message: 'string', hashtags: ['string'] }
    );

    return {
      message: result.result.message.slice(0, maxLength),
      hashtags: result.result.hashtags,
      tokensUsed: result.tokensUsed,
    };
  }

  // ============================================
  // ANALYSIS & INSIGHTS
  // ============================================

  /**
   * Analyze data and provide insights
   */
  async analyzeData<T>(params: {
    data: unknown;
    analysisType: string;
    questions?: string[];
    outputSchema: Record<string, unknown>;
  }): Promise<AIAnalysisResult<T>> {
    const systemPrompt = `You are an expert data analyst. Analyze the provided data.

ANALYSIS TYPE: ${params.analysisType}
${params.questions ? `QUESTIONS TO ANSWER:\n${params.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}` : ''}

DATA TO ANALYZE:
${JSON.stringify(params.data, null, 2)}

Provide your analysis as valid JSON matching this schema:
${JSON.stringify(params.outputSchema, null, 2)}`;

    return this.generateStructuredOutput<T>(
      'Analyze the data and provide insights',
      systemPrompt,
      params.outputSchema
    );
  }

  /**
   * Generate recommendations based on data
   */
  async generateRecommendations(params: {
    context: string;
    data: unknown;
    maxRecommendations?: number;
    focusAreas?: string[];
  }): Promise<{
    recommendations: Array<{
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      impact: string;
      effort: string;
    }>;
    tokensUsed: number;
  }> {
    const systemPrompt = `You are a strategic advisor. Generate actionable recommendations.

CONTEXT: ${params.context}
MAX RECOMMENDATIONS: ${params.maxRecommendations || 5}
${params.focusAreas ? `FOCUS AREAS: ${params.focusAreas.join(', ')}` : ''}

DATA:
${JSON.stringify(params.data, null, 2)}

Generate ONLY valid JSON:
{
  "recommendations": [
    {
      "title": "Short title",
      "description": "Detailed description of the recommendation",
      "priority": "high",
      "impact": "Expected impact",
      "effort": "Estimated effort required"
    }
  ]
}`;

    const result = await this.generateStructuredOutput<{
      recommendations: Array<{
        title: string;
        description: string;
        priority: 'low' | 'medium' | 'high' | 'critical';
        impact: string;
        effort: string;
      }>;
    }>(
      'Generate strategic recommendations',
      systemPrompt,
      {
        recommendations: [
          {
            title: 'string',
            description: 'string',
            priority: 'string',
            impact: 'string',
            effort: 'string',
          },
        ],
      }
    );

    return {
      recommendations: result.result.recommendations.slice(0, params.maxRecommendations || 5),
      tokensUsed: result.tokensUsed,
    };
  }

  // ============================================
  // DOCUMENT GENERATION
  // ============================================

  /**
   * Generate a document (report, plan, etc.)
   */
  async generateDocument(params: {
    type: 'report' | 'plan' | 'proposal' | 'summary' | 'analysis';
    title: string;
    sections: string[];
    context: string;
    data?: unknown;
    format?: 'markdown' | 'text' | 'html';
  }): Promise<{
    title: string;
    content: string;
    sections: Array<{ title: string; content: string }>;
    tokensUsed: number;
  }> {
    const systemPrompt = `You are a professional document writer. Generate a ${params.type}.

DOCUMENT TITLE: ${params.title}
REQUIRED SECTIONS: ${params.sections.join(', ')}
CONTEXT: ${params.context}
${params.data ? `RELEVANT DATA:\n${JSON.stringify(params.data, null, 2)}` : ''}

Generate a comprehensive ${params.type} in ${params.format || 'markdown'} format.
Include all requested sections with detailed content.`;

    const result = await this.generateContent(
      `Generate a ${params.type} titled "${params.title}"`,
      systemPrompt,
      { format: params.format || 'markdown', style: 'professional' }
    );

    // Parse sections from the generated content
    const sectionRegex = /^##?\s+(.+)$/gm;
    const sections: Array<{ title: string; content: string }> = [];
    let lastIndex = 0;
    let match;

    const content = result.content;
    while ((match = sectionRegex.exec(content)) !== null) {
      if (lastIndex > 0) {
        const prevContent = content.slice(lastIndex, match.index).trim();
        if (sections.length > 0) {
          sections[sections.length - 1].content = prevContent;
        }
      }
      sections.push({ title: match[1], content: '' });
      lastIndex = match.index + match[0].length;
    }

    // Add content for last section
    if (sections.length > 0 && lastIndex < content.length) {
      sections[sections.length - 1].content = content.slice(lastIndex).trim();
    }

    return {
      title: params.title,
      content: result.content,
      sections: sections.length > 0 ? sections : [{ title: params.title, content: result.content }],
      tokensUsed: result.metadata.tokensUsed,
    };
  }

  // ============================================
  // SCORING & ASSESSMENT
  // ============================================

  /**
   * Generate a score with reasoning
   */
  async generateScore(params: {
    subject: string;
    criteria: Array<{ name: string; weight: number; description: string }>;
    data: unknown;
    maxScore?: number;
  }): Promise<{
    overallScore: number;
    criteriaScores: Array<{
      criterion: string;
      score: number;
      maxScore: number;
      reasoning: string;
    }>;
    summary: string;
    tokensUsed: number;
  }> {
    const maxScore = params.maxScore || 100;

    const systemPrompt = `You are an expert evaluator. Score the subject based on the criteria.

SUBJECT: ${params.subject}
MAX SCORE: ${maxScore}

CRITERIA:
${params.criteria.map((c) => `- ${c.name} (Weight: ${c.weight}%): ${c.description}`).join('\n')}

DATA TO EVALUATE:
${JSON.stringify(params.data, null, 2)}

Generate ONLY valid JSON:
{
  "overallScore": 85,
  "criteriaScores": [
    {
      "criterion": "Criterion Name",
      "score": 42,
      "maxScore": 50,
      "reasoning": "Explanation for this score"
    }
  ],
  "summary": "Overall assessment summary"
}`;

    const result = await this.generateStructuredOutput<{
      overallScore: number;
      criteriaScores: Array<{
        criterion: string;
        score: number;
        maxScore: number;
        reasoning: string;
      }>;
      summary: string;
    }>(
      'Evaluate and score the subject',
      systemPrompt,
      {
        overallScore: 'number',
        criteriaScores: [
          {
            criterion: 'string',
            score: 'number',
            maxScore: 'number',
            reasoning: 'string',
          },
        ],
        summary: 'string',
      }
    );

    return {
      ...result.result,
      tokensUsed: result.tokensUsed,
    };
  }

  // ============================================
  // CONTEXT MANAGEMENT
  // ============================================

  /**
   * Load agent context from database
   */
  async loadAgentContext(params: ContextData): Promise<Record<string, unknown>> {
    try {
      const db = getDb();
      const contexts = await db
        .select()
        .from(motionAgentContext)
        .where(
          and(
            eq(motionAgentContext.userId, params.userId),
            eq(motionAgentContext.workspaceId, params.workspaceId),
            eq(motionAgentContext.agentId, params.agentId)
          )
        )
        .limit(50);

      const contextMap: Record<string, unknown> = {};
      for (const ctx of contexts) {
        contextMap[ctx.contextKey] = ctx.contextValue;
      }

      return contextMap;
    } catch (error) {
      this.log.error('Failed to load agent context', error, {
        userId: params.userId,
        workspaceId: params.workspaceId,
        agentId: params.agentId,
      });
      return {};
    }
  }

  /**
   * Save agent context to database
   */
  async saveAgentContext(
    params: ContextData,
    key: string,
    value: unknown,
    expiresIn?: number
  ): Promise<void> {
    try {
      const db = getDb();
      const expiresAt = expiresIn ? new Date(Date.now() + expiresIn) : null;

      await db
        .insert(motionAgentContext)
        .values({
          userId: params.userId,
          workspaceId: params.workspaceId,
          agentId: params.agentId,
          contextType: 'learned',
          contextKey: key,
          contextValue: value as Record<string, unknown>,
          expiresAt,
        })
        .onConflictDoUpdate({
          target: [
            motionAgentContext.workspaceId,
            motionAgentContext.userId,
            motionAgentContext.agentId,
            motionAgentContext.contextKey,
          ],
          set: {
            contextValue: value as Record<string, unknown>,
            expiresAt,
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      this.log.error('Failed to save agent context', error, {
        userId: params.userId,
        workspaceId: params.workspaceId,
        agentId: params.agentId,
        contextKey: key,
      });
    }
  }

  // ============================================
  // SUMMARIZATION
  // ============================================

  /**
   * Summarize text content
   */
  async summarize(params: {
    content: string;
    maxLength?: number;
    style?: 'bullet' | 'paragraph' | 'executive';
    focusOn?: string[];
  }): Promise<{ summary: string; keyPoints: string[]; tokensUsed: number }> {
    const systemPrompt = `You are an expert summarizer. Summarize the content.

STYLE: ${params.style || 'paragraph'}
MAX LENGTH: ${params.maxLength || 500} characters
${params.focusOn ? `FOCUS ON: ${params.focusOn.join(', ')}` : ''}

Generate ONLY valid JSON:
{
  "summary": "The summary text",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"]
}`;

    const result = await this.generateStructuredOutput<{
      summary: string;
      keyPoints: string[];
    }>(
      params.content,
      systemPrompt,
      { summary: 'string', keyPoints: ['string'] }
    );

    return {
      summary: result.result.summary.slice(0, params.maxLength || 500),
      keyPoints: result.result.keyPoints,
      tokensUsed: result.tokensUsed,
    };
  }

  // ============================================
  // TRANSLATION & LOCALIZATION
  // ============================================

  /**
   * Translate content to another language
   */
  async translate(params: {
    content: string;
    targetLanguage: string;
    preserveFormatting?: boolean;
    contextHints?: string;
  }): Promise<{ translated: string; tokensUsed: number }> {
    const systemPrompt = `You are a professional translator. Translate the content to ${params.targetLanguage}.

${params.preserveFormatting ? 'PRESERVE: Original formatting, markdown, and structure' : ''}
${params.contextHints ? `CONTEXT: ${params.contextHints}` : ''}

Provide ONLY the translated text, nothing else.`;

    const result = await this.generateContent(params.content, systemPrompt, {
      format: 'text',
      temperature: 0.3,
    });

    return {
      translated: result.content,
      tokensUsed: result.metadata.tokensUsed,
    };
  }

  // ============================================
  // EXTRACTION
  // ============================================

  /**
   * Extract structured data from text
   */
  async extractData<T>(params: {
    content: string;
    extractionType: string;
    schema: Record<string, unknown>;
  }): Promise<AIAnalysisResult<T>> {
    const systemPrompt = `You are a data extraction expert. Extract ${params.extractionType} from the content.

Extract data matching this schema:
${JSON.stringify(params.schema, null, 2)}

If data is not found, use null for that field.`;

    return this.generateStructuredOutput<T>(params.content, systemPrompt, params.schema);
  }

  /**
   * Extract action items from text
   */
  async extractActionItems(content: string): Promise<{
    actionItems: Array<{
      task: string;
      owner?: string;
      deadline?: string;
      priority: 'low' | 'medium' | 'high';
    }>;
    tokensUsed: number;
  }> {
    const result = await this.extractData<{
      actionItems: Array<{
        task: string;
        owner?: string;
        deadline?: string;
        priority: 'low' | 'medium' | 'high';
      }>;
    }>({
      content,
      extractionType: 'action items and tasks',
      schema: {
        actionItems: [
          {
            task: 'string',
            owner: 'string or null',
            deadline: 'string or null',
            priority: 'low | medium | high',
          },
        ],
      },
    });

    return {
      actionItems: result.result.actionItems,
      tokensUsed: result.tokensUsed,
    };
  }
}

// Export singleton instance
export const motionAI = MotionAIService.getInstance();
export default MotionAIService;
