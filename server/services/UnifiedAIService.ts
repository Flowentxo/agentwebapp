/**
 * Unified AI Service for SINTRA System
 * Automatically routes all AI requests to Anthropic Claude Sonnet 4.5
 * Compatible with existing OpenAI-based interfaces
 *
 * Instrumented with AI Telemetry for cost tracking and performance monitoring.
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';
import { AITelemetryService } from './AITelemetryService';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
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
    this.model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
    this.maxTokens = parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4096');

    logger.info('[UNIFIED_AI] Initialized with Anthropic Claude Sonnet 4.5');
    logger.info(`[UNIFIED_AI] Model: ${this.model}, Max Tokens: ${this.maxTokens}`);
  }

  /**
   * Generate chat completion using Claude Sonnet 4.5
   * Compatible with OpenAI interface for easy migration
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
      // Extract system message (Claude handles it separately)
      const systemMessage = messages.find(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');

      // Convert to Claude format
      const claudeMessages: Anthropic.MessageParam[] = conversationMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

      const temperature = options.temperature ?? 0.7;
      const maxTokens = options.maxTokens ?? this.maxTokens;
      const systemPrompt = options.systemPrompt || systemMessage?.content || '';

      logger.info('[UNIFIED_AI] Generating completion with Claude', {
        messageCount: claudeMessages.length,
        temperature,
        maxTokens,
        hasSystemPrompt: !!systemPrompt
      });

      const response = await anthropic.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: claudeMessages,
      });

      const content = response.content[0];
      const responseText = content.type === 'text' ? content.text : '';

      // Capture token usage for telemetry
      promptTokens = response.usage.input_tokens;
      completionTokens = response.usage.output_tokens;

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

      // Enhanced error handling for Anthropic
      if (error.status === 401) {
        throw new Error('Invalid Anthropic API key. Please check your configuration.');
      }
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (error.status === 529) {
        throw new Error('Anthropic API is temporarily overloaded. Please try again.');
      }

      throw new Error(`AI Service Error: ${error.message || 'Unknown error occurred'}`);
    } finally {
      // Log telemetry (fire-and-forget, never blocks)
      const responseTimeMs = timer.stop();

      AITelemetryService.logTrace({
        provider: 'anthropic',
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
   * For future implementation
   */
  async* generateStreamingCompletion(
    messages: ChatMessage[],
    options: AICompletionOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    try {
      const systemMessage = messages.find(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');

      const claudeMessages: Anthropic.MessageParam[] = conversationMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

      const temperature = options.temperature ?? 0.7;
      const maxTokens = options.maxTokens ?? this.maxTokens;
      const systemPrompt = options.systemPrompt || systemMessage?.content || '';

      const stream = await anthropic.messages.stream({
        model: this.model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: claudeMessages,
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          yield chunk.delta.text;
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
      await anthropic.messages.create({
        model: this.model,
        max_tokens: 10,
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
      provider: 'anthropic',
      model: this.model,
      maxTokens: this.maxTokens,
      contextWindow: 200000, // Claude Sonnet 4 has 200k context
    };
  }
}

// Singleton instance
export const unifiedAIService = new UnifiedAIService();
