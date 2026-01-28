/**
 * Multi-Model Router - Intelligent Model Orchestration
 *
 * Routes AI requests to the optimal model based on:
 * - Task complexity
 * - Latency requirements
 * - Token limits
 * - Cost optimization
 *
 * Supported Models:
 * - GPT-4.1 (OpenAI): Complex reasoning, synthesis, long-form
 * - Gemini 2.5 Flash (Google): Speed-critical, simple tasks
 * - GPT-4o-mini: Balanced cost/performance
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// ============================================
// TYPES & INTERFACES
// ============================================

export type ModelProvider = 'openai' | 'google' | 'anthropic';
export type ModelTier = 'fast' | 'balanced' | 'powerful';

export interface ModelConfig {
  id: string;
  provider: ModelProvider;
  tier: ModelTier;
  maxTokens: number;
  costPer1kTokens: number;
  avgLatencyMs: number;
  capabilities: string[];
}

export interface RoutingDecision {
  model: ModelConfig;
  reason: string;
  confidence: number;
  estimatedLatencyMs: number;
  estimatedCost: number;
}

export interface TaskAnalysis {
  complexity: 'simple' | 'moderate' | 'complex';
  complexityScore: number;
  requiresReasoning: boolean;
  requiresSynthesis: boolean;
  estimatedTokens: number;
  taskType: 'query' | 'generate' | 'summarize' | 'extract' | 'classify' | 'chat';
}

export interface RouterOptions {
  preferSpeed?: boolean;
  preferQuality?: boolean;
  maxLatencyMs?: number;
  maxCostPerRequest?: number;
  forceModel?: string;
}

export interface GenerationResult {
  content: string;
  model: string;
  provider: ModelProvider;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  latencyMs: number;
  cost: number;
  cached: boolean;
}

// ============================================
// MODEL CONFIGURATIONS
// ============================================

const MODELS: Record<string, ModelConfig> = {
  'gpt-4-turbo': {
    id: 'gpt-4-turbo-preview',
    provider: 'openai',
    tier: 'powerful',
    maxTokens: 128000,
    costPer1kTokens: 0.01,
    avgLatencyMs: 3000,
    capabilities: ['reasoning', 'synthesis', 'code', 'analysis', 'long-context']
  },
  'gpt-4o': {
    id: 'gpt-4o',
    provider: 'openai',
    tier: 'powerful',
    maxTokens: 128000,
    costPer1kTokens: 0.005,
    avgLatencyMs: 2000,
    capabilities: ['reasoning', 'synthesis', 'code', 'analysis', 'vision']
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    provider: 'openai',
    tier: 'balanced',
    maxTokens: 128000,
    costPer1kTokens: 0.00015,
    avgLatencyMs: 1000,
    capabilities: ['reasoning', 'code', 'analysis']
  },
  'gemini-flash': {
    id: 'gemini-1.5-flash',
    provider: 'google',
    tier: 'fast',
    maxTokens: 1000000,
    costPer1kTokens: 0.000075,
    avgLatencyMs: 400,
    capabilities: ['speed', 'classification', 'extraction', 'simple-qa']
  },
  'gemini-pro': {
    id: 'gemini-1.5-pro',
    provider: 'google',
    tier: 'balanced',
    maxTokens: 2000000,
    costPer1kTokens: 0.00125,
    avgLatencyMs: 1500,
    capabilities: ['reasoning', 'long-context', 'analysis']
  }
};

// ============================================
// TASK ANALYZER
// ============================================

class TaskAnalyzer {
  private static readonly COMPLEX_KEYWORDS = [
    'analyze', 'compare', 'synthesize', 'evaluate', 'design',
    'architect', 'strategy', 'implications', 'tradeoffs',
    'analysiere', 'vergleiche', 'bewerte', 'strategie'
  ];

  private static readonly SIMPLE_KEYWORDS = [
    'list', 'extract', 'classify', 'format', 'convert',
    'translate', 'summarize briefly', 'yes or no',
    'liste', 'extrahiere', 'formatiere'
  ];

  static analyze(prompt: string, context?: string): TaskAnalysis {
    const fullText = `${prompt} ${context || ''}`.toLowerCase();
    const wordCount = fullText.split(/\s+/).length;

    // Calculate complexity score
    let complexityScore = 0;

    // Length factor
    if (wordCount > 500) complexityScore += 0.3;
    else if (wordCount > 200) complexityScore += 0.2;
    else if (wordCount > 50) complexityScore += 0.1;

    // Keyword analysis
    const complexKeywordCount = this.COMPLEX_KEYWORDS.filter(k =>
      fullText.includes(k)
    ).length;
    const simpleKeywordCount = this.SIMPLE_KEYWORDS.filter(k =>
      fullText.includes(k)
    ).length;

    complexityScore += complexKeywordCount * 0.15;
    complexityScore -= simpleKeywordCount * 0.1;

    // Question marks indicate Q&A
    const questionMarks = (fullText.match(/\?/g) || []).length;
    if (questionMarks > 2) complexityScore += 0.1;

    // Code blocks indicate technical task
    if (fullText.includes('```') || fullText.includes('code')) {
      complexityScore += 0.2;
    }

    // Normalize
    complexityScore = Math.max(0, Math.min(1, complexityScore));

    // Determine complexity level
    let complexity: 'simple' | 'moderate' | 'complex';
    if (complexityScore < 0.3) complexity = 'simple';
    else if (complexityScore < 0.6) complexity = 'moderate';
    else complexity = 'complex';

    // Determine task type
    let taskType: TaskAnalysis['taskType'] = 'chat';
    if (fullText.includes('?') && wordCount < 50) taskType = 'query';
    else if (fullText.includes('write') || fullText.includes('create') || fullText.includes('draft') || fullText.includes('schreibe')) taskType = 'generate';
    else if (fullText.includes('summarize') || fullText.includes('zusammenfass')) taskType = 'summarize';
    else if (fullText.includes('extract') || fullText.includes('extrahier')) taskType = 'extract';
    else if (fullText.includes('classify') || fullText.includes('kategorisier')) taskType = 'classify';

    // Estimate tokens
    const estimatedTokens = Math.ceil(fullText.length / 4);

    return {
      complexity,
      complexityScore,
      requiresReasoning: complexityScore > 0.5 || complexKeywordCount > 1,
      requiresSynthesis: fullText.includes('synthesize') || fullText.includes('combine') || fullText.includes('integriere'),
      estimatedTokens,
      taskType
    };
  }
}

// ============================================
// MODEL ROUTER
// ============================================

export class ModelRouter {
  private static instance: ModelRouter;
  private openai: OpenAI;
  private gemini: GoogleGenerativeAI | null = null;
  private geminiModel: GenerativeModel | null = null;
  private requestMetrics: Map<string, { latency: number; success: boolean; timestamp: number }[]> = new Map();

  private constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    // Initialize Gemini if API key exists
    if (process.env.GOOGLE_AI_API_KEY) {
      try {
        this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        console.log('[ModelRouter] Gemini initialized');
      } catch (err) {
        console.warn('[ModelRouter] Gemini initialization failed:', err);
      }
    }

    console.log('[ModelRouter] Initialized with multi-model support');
  }

  public static getInstance(): ModelRouter {
    if (!ModelRouter.instance) {
      ModelRouter.instance = new ModelRouter();
    }
    return ModelRouter.instance;
  }

  /**
   * Route a task to the optimal model
   */
  public routeTask(
    prompt: string,
    context?: string,
    options: RouterOptions = {}
  ): RoutingDecision {
    // Force specific model if requested
    if (options.forceModel && MODELS[options.forceModel]) {
      const model = MODELS[options.forceModel];
      return {
        model,
        reason: 'Model forced by user preference',
        confidence: 1.0,
        estimatedLatencyMs: model.avgLatencyMs,
        estimatedCost: this.estimateCost(prompt, model)
      };
    }

    // Analyze the task
    const analysis = TaskAnalyzer.analyze(prompt, context);

    // Get available models based on constraints
    let candidates = Object.values(MODELS);

    // Filter by latency constraint
    if (options.maxLatencyMs) {
      candidates = candidates.filter(m => m.avgLatencyMs <= options.maxLatencyMs!);
    }

    // Filter by cost constraint
    if (options.maxCostPerRequest) {
      candidates = candidates.filter(m => {
        const estimatedCost = this.estimateCost(prompt, m);
        return estimatedCost <= options.maxCostPerRequest!;
      });
    }

    // Check if Gemini is available
    if (!this.gemini) {
      candidates = candidates.filter(m => m.provider !== 'google');
    }

    // Fallback to GPT-4o-mini if no candidates
    if (candidates.length === 0) {
      candidates = [MODELS['gpt-4o-mini']];
    }

    // Score candidates based on task analysis
    const scoredCandidates = candidates.map(model => {
      let score = 0;

      // Complexity matching
      if (analysis.complexity === 'complex' && model.tier === 'powerful') score += 3;
      else if (analysis.complexity === 'moderate' && model.tier === 'balanced') score += 3;
      else if (analysis.complexity === 'simple' && model.tier === 'fast') score += 3;

      // Speed preference
      if (options.preferSpeed) {
        score += (5000 - model.avgLatencyMs) / 1000;
      }

      // Quality preference
      if (options.preferQuality && model.tier === 'powerful') {
        score += 2;
      }

      // Capability matching
      if (analysis.requiresReasoning && model.capabilities.includes('reasoning')) {
        score += 2;
      }
      if (analysis.requiresSynthesis && model.capabilities.includes('synthesis')) {
        score += 2;
      }

      // Cost efficiency
      score -= model.costPer1kTokens * 100;

      return { model, score };
    });

    // Sort by score and select best
    scoredCandidates.sort((a, b) => b.score - a.score);
    const selected = scoredCandidates[0];

    // Build reason
    let reason = `Selected ${selected.model.id} for ${analysis.complexity} ${analysis.taskType} task`;
    if (options.preferSpeed) reason += ' (speed optimized)';
    if (options.preferQuality) reason += ' (quality optimized)';

    return {
      model: selected.model,
      reason,
      confidence: Math.min(1, selected.score / 10),
      estimatedLatencyMs: selected.model.avgLatencyMs,
      estimatedCost: this.estimateCost(prompt, selected.model)
    };
  }

  /**
   * Generate response using the optimal model
   */
  public async generate(
    systemPrompt: string,
    userPrompt: string,
    options: RouterOptions = {}
  ): Promise<GenerationResult> {
    const startTime = Date.now();

    // Route to optimal model
    const routing = this.routeTask(userPrompt, systemPrompt, options);
    const model = routing.model;

    try {
      let content: string;
      let tokensUsed = { prompt: 0, completion: 0, total: 0 };

      if (model.provider === 'openai') {
        // Use OpenAI
        const response = await this.openai.chat.completions.create({
          model: model.id,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: Math.min(4096, model.maxTokens)
        });

        content = response.choices[0]?.message?.content || '';
        tokensUsed = {
          prompt: response.usage?.prompt_tokens || 0,
          completion: response.usage?.completion_tokens || 0,
          total: response.usage?.total_tokens || 0
        };
      } else if (model.provider === 'google' && this.gemini) {
        // Use Gemini
        const geminiModel = this.gemini.getGenerativeModel({ model: model.id });
        const chat = geminiModel.startChat({
          history: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] }
          ]
        });

        const result = await chat.sendMessage(userPrompt);
        content = result.response.text();

        // Estimate tokens for Gemini
        tokensUsed = {
          prompt: Math.ceil(systemPrompt.length / 4),
          completion: Math.ceil(content.length / 4),
          total: Math.ceil((systemPrompt.length + content.length) / 4)
        };
      } else {
        throw new Error(`Provider ${model.provider} not available`);
      }

      const latencyMs = Date.now() - startTime;
      const cost = (tokensUsed.total / 1000) * model.costPer1kTokens;

      // Track metrics
      this.trackMetrics(model.id, latencyMs, true);

      return {
        content,
        model: model.id,
        provider: model.provider,
        tokensUsed,
        latencyMs,
        cost,
        cached: false
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.trackMetrics(model.id, latencyMs, false);

      // Fallback to different model on error
      if (model.provider === 'google') {
        console.warn('[ModelRouter] Gemini failed, falling back to OpenAI');
        return this.generate(systemPrompt, userPrompt, {
          ...options,
          forceModel: 'gpt-4o-mini'
        });
      }

      throw error;
    }
  }

  /**
   * Stream response from optimal model
   */
  public async *generateStream(
    systemPrompt: string,
    userPrompt: string,
    options: RouterOptions = {}
  ): AsyncGenerator<string, GenerationResult, unknown> {
    const startTime = Date.now();

    // Route to optimal model
    const routing = this.routeTask(userPrompt, systemPrompt, options);
    const model = routing.model;

    let fullContent = '';
    let tokensUsed = { prompt: 0, completion: 0, total: 0 };

    try {
      if (model.provider === 'openai') {
        const stream = await this.openai.chat.completions.create({
          model: model.id,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: Math.min(4096, model.maxTokens),
          stream: true
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            fullContent += content;
            yield content;
          }
        }

        // Estimate tokens
        tokensUsed = {
          prompt: Math.ceil(systemPrompt.length / 4),
          completion: Math.ceil(fullContent.length / 4),
          total: Math.ceil((systemPrompt.length + fullContent.length) / 4)
        };
      } else if (model.provider === 'google' && this.gemini) {
        const geminiModel = this.gemini.getGenerativeModel({ model: model.id });
        const result = await geminiModel.generateContentStream([
          { text: `${systemPrompt}\n\n${userPrompt}` }
        ]);

        for await (const chunk of result.stream) {
          const content = chunk.text();
          if (content) {
            fullContent += content;
            yield content;
          }
        }

        tokensUsed = {
          prompt: Math.ceil(systemPrompt.length / 4),
          completion: Math.ceil(fullContent.length / 4),
          total: Math.ceil((systemPrompt.length + fullContent.length) / 4)
        };
      }
    } catch (error) {
      console.error('[ModelRouter] Stream error:', error);
      throw error;
    }

    const latencyMs = Date.now() - startTime;
    const cost = (tokensUsed.total / 1000) * model.costPer1kTokens;

    this.trackMetrics(model.id, latencyMs, true);

    return {
      content: fullContent,
      model: model.id,
      provider: model.provider,
      tokensUsed,
      latencyMs,
      cost,
      cached: false
    };
  }

  /**
   * Quick classification using fast model
   */
  public async classify(
    text: string,
    categories: string[],
    context?: string
  ): Promise<{ category: string; confidence: number }> {
    const prompt = `Classify the following text into one of these categories: ${categories.join(', ')}

Text: "${text}"
${context ? `Context: ${context}` : ''}

Respond with ONLY the category name, nothing else.`;

    const result = await this.generate(
      'You are a precise text classifier. Respond only with the category name.',
      prompt,
      { preferSpeed: true, forceModel: 'gemini-flash' }
    );

    const category = result.content.trim().toLowerCase();
    const matchedCategory = categories.find(c =>
      c.toLowerCase() === category || category.includes(c.toLowerCase())
    ) || categories[0];

    return {
      category: matchedCategory,
      confidence: category === matchedCategory.toLowerCase() ? 0.9 : 0.6
    };
  }

  /**
   * Quick extraction using fast model
   */
  public async extract(
    text: string,
    fields: string[]
  ): Promise<Record<string, string>> {
    const prompt = `Extract the following fields from the text:
${fields.map(f => `- ${f}`).join('\n')}

Text: "${text}"

Respond in JSON format with field names as keys.`;

    const result = await this.generate(
      'You are a precise information extractor. Always respond with valid JSON.',
      prompt,
      { preferSpeed: true, forceModel: 'gemini-flash' }
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Parse failed
    }

    return {};
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private estimateCost(prompt: string, model: ModelConfig): number {
    const estimatedTokens = Math.ceil(prompt.length / 4) * 2; // Prompt + estimated response
    return (estimatedTokens / 1000) * model.costPer1kTokens;
  }

  private trackMetrics(modelId: string, latencyMs: number, success: boolean): void {
    if (!this.requestMetrics.has(modelId)) {
      this.requestMetrics.set(modelId, []);
    }

    const metrics = this.requestMetrics.get(modelId)!;
    metrics.push({ latency: latencyMs, success, timestamp: Date.now() });

    // Keep only last 100 requests
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  /**
   * Get model performance stats
   */
  public getModelStats(modelId: string): { avgLatency: number; successRate: number; requestCount: number } | null {
    const metrics = this.requestMetrics.get(modelId);
    if (!metrics || metrics.length === 0) return null;

    const avgLatency = metrics.reduce((sum, m) => sum + m.latency, 0) / metrics.length;
    const successRate = metrics.filter(m => m.success).length / metrics.length;

    return {
      avgLatency: Math.round(avgLatency),
      successRate: Math.round(successRate * 100) / 100,
      requestCount: metrics.length
    };
  }

  /**
   * Get all available models
   */
  public getAvailableModels(): ModelConfig[] {
    return Object.values(MODELS).filter(m => {
      if (m.provider === 'google' && !this.gemini) return false;
      return true;
    });
  }
}

export const modelRouter = ModelRouter.getInstance();
