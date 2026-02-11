/**
 * Unified AI Service for Flowent System
 * Routes all AI requests to OpenAI GPT models.
 *
 * Instrumented with AI Telemetry for cost tracking and performance monitoring.
 */

import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { AITelemetryService } from './AITelemetryService';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AICompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  /** User ID for telemetry tracking */
  userId?: string;
  /** Agent ID for telemetry tracking */
  agentId?: string;
  /** Workspace ID for telemetry tracking */
  workspaceId?: string;
}

interface AIResponse {
  message: string;
  model: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
}

export class UnifiedAIService {
  private readonly model: string;
  private readonly maxTokens: number;

  constructor() {
    this.model = process.env.OPENAI_MODEL || 'gpt-4o';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '4096');

    logger.info('[UNIFIED_AI] Initialized with OpenAI');
    logger.info(`[UNIFIED_AI] Model: ${this.model}, Max Tokens: ${this.maxTokens}`);
  }

  /**
   * Generate chat completion using OpenAI GPT
   *
   * Instrumented with AI Telemetry for automatic logging.
   */
  async generateChatCompletion(
    messages: ChatMessage[],
    options: AICompletionOptions = {}
  ): Promise<AIResponse> {
    // Start timer for telemetry
    const timer = AITelemetryService.startTimer();
    let status: 'success' | 'failed' | 'rate_limited' = 'success';
    let errorCode: string | undefined;
    let errorMessage: string | undefined;
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      const temperature = options.temperature ?? 0.7;
      const maxTokens = options.maxTokens ?? this.maxTokens;
      const model = options.model || this.model;

      // If a separate systemPrompt is provided, prepend it
      let finalMessages: ChatMessage[] = messages;
      if (options.systemPrompt) {
        const hasSystem = messages.some(m => m.role === 'system');
        if (!hasSystem) {
          finalMessages = [{ role: 'system', content: options.systemPrompt }, ...messages];
        }
      }

      logger.info('[UNIFIED_AI] Generating completion with OpenAI', {
        model,
        messageCount: finalMessages.length,
        temperature,
        maxTokens,
      });

      // gpt-5/gpt-4o models use max_completion_tokens, others use max_tokens
      const isNewModel = model.includes('gpt-5') || model.includes('gpt-4o');
      const tokenKey = isNewModel ? 'max_completion_tokens' : 'max_tokens';

      // gpt-5 models only support temperature=1 (default), so omit it
      const response = await openai.chat.completions.create({
        model,
        messages: finalMessages,
        ...(model.includes('gpt-5') ? {} : { temperature }),
        [tokenKey]: maxTokens,
      });

      const responseText = response.choices[0]?.message?.content || '';

      // Capture token usage for telemetry
      promptTokens = response.usage?.prompt_tokens || 0;
      completionTokens = response.usage?.completion_tokens || 0;

      const result: AIResponse = {
        message: responseText,
        model: response.model,
        tokens: {
          input: promptTokens,
          output: completionTokens,
          total: promptTokens + completionTokens
        }
      };

      logger.info('[UNIFIED_AI] Completion generated successfully', {
        model: result.model,
        tokens: result.tokens.total,
        responseLength: responseText.length
      });

      return result;
    } catch (error: any) {
      logger.error('[UNIFIED_AI] Error generating completion:', error);

      // Capture error details for telemetry
      status = error.status === 429 ? 'rate_limited' : 'failed';
      errorCode = error.status?.toString() || 'UNKNOWN';
      errorMessage = error.message || 'Unknown error occurred';

      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your configuration.');
      }
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      throw new Error(`AI Service Error: ${error.message || 'Unknown error occurred'}`);
    } finally {
      // Log telemetry (fire-and-forget, never blocks)
      const responseTimeMs = timer.stop();

      AITelemetryService.logTrace({
        provider: 'openai',
        model: this.model,
        requestType: 'chat',
        userId: options.userId,
        agentId: options.agentId,
        workspaceId: options.workspaceId,
        promptTokens,
        completionTokens,
        responseTimeMs,
        status,
        errorCode,
        errorMessage,
        metadata: {
          temperature: options.temperature ?? 0.7,
          maxTokens: options.maxTokens ?? this.maxTokens,
        },
      });
    }
  }

  /**
   * Generate streaming chat completion
   */
  async* generateStreamingCompletion(
    messages: ChatMessage[],
    options: AICompletionOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    try {
      const temperature = options.temperature ?? 0.7;
      const maxTokens = options.maxTokens ?? this.maxTokens;
      const model = options.model || this.model;

      // If a separate systemPrompt is provided, prepend it
      let finalMessages: ChatMessage[] = messages;
      if (options.systemPrompt) {
        const hasSystem = messages.some(m => m.role === 'system');
        if (!hasSystem) {
          finalMessages = [{ role: 'system', content: options.systemPrompt }, ...messages];
        }
      }

      const isNewModel = model.includes('gpt-5') || model.includes('gpt-4o');
      const tokenKey = isNewModel ? 'max_completion_tokens' : 'max_tokens';

      const stream = await openai.chat.completions.create({
        model,
        messages: finalMessages,
        ...(model.includes('gpt-5') ? {} : { temperature }),
        [tokenKey]: maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error: any) {
      logger.error('[UNIFIED_AI] Streaming error:', error);
      throw new Error(`Streaming Error: ${error.message}`);
    }
  }

  /**
   * Check if AI service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      await openai.chat.completions.create({
        model: this.model,
        max_completion_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      return true;
    } catch (error) {
      logger.error('[UNIFIED_AI] Health check failed:', error);
      return false;
    }
  }

  /**
   * Get current model information
   */
  getModelInfo() {
    return {
      provider: 'openai',
      model: this.model,
      maxTokens: this.maxTokens,
      contextWindow: 128000,
    };
  }
}

// Singleton instance
export const unifiedAIService = new UnifiedAIService();
