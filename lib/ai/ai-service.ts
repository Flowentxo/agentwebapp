/**
 * Unified AI Service
 * Automatically selects the appropriate AI provider (OpenAI or Anthropic)
 * based on environment configuration
 *
 * Now includes automatic fallback and retry capabilities for high availability
 */

import * as OpenAIService from './openai-service';
import * as AnthropicService from './anthropic-service';
import { AgentPersona } from '@/lib/agents/personas';
import { executeWithFallback, FallbackExecutionResult } from './fallback-engine';

// Re-export ChatMessage type (compatible with both providers)
export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export interface AIResponse {
  content: string;
  tokensUsed: number;
  inputTokens?: number;
  outputTokens?: number;
  model: string;
  finishReason: string;
}

/**
 * Get the active AI provider from environment
 */
export function getAIProvider(): 'openai' | 'anthropic' {
  const provider = process.env.AI_PROVIDER?.toLowerCase();

  if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    return 'anthropic';
  }

  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    return 'openai';
  }

  // Default to Anthropic if both are configured
  if (process.env.ANTHROPIC_API_KEY) {
    return 'anthropic';
  }

  // Fallback to OpenAI
  return 'openai';
}

/**
 * Generate AI response (non-streaming) using configured provider
 */
export async function generateAgentResponse(
  agent: AgentPersona,
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): Promise<AIResponse> {
  const provider = getAIProvider();

  if (provider === 'anthropic') {
    console.log('[AI_SERVICE] Using Anthropic Claude Sonnet 4.5');
    return await AnthropicService.generateAgentResponse(
      agent,
      userMessage,
      conversationHistory
    );
  } else {
    console.log('[AI_SERVICE] Using OpenAI GPT-5.1');
    const response = await OpenAIService.generateAgentResponse(
      agent,
      userMessage,
      conversationHistory as OpenAIService.ChatMessage[]
    );
    return {
      content: response.content,
      tokensUsed: response.tokensUsed,
      model: response.model,
      finishReason: response.finishReason,
    };
  }
}

/**
 * Generate AI response with streaming using configured provider
 */
export async function* generateAgentResponseStream(
  agent: AgentPersona,
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): AsyncGenerator<string, void, unknown> {
  const provider = getAIProvider();

  if (provider === 'anthropic') {
    console.log('[AI_SERVICE] Streaming with Anthropic Claude Sonnet 4.5');
    yield* AnthropicService.generateAgentResponseStream(
      agent,
      userMessage,
      conversationHistory
    );
  } else {
    console.log('[AI_SERVICE] Streaming with OpenAI GPT-5.1');
    yield* OpenAIService.generateAgentResponseStream(
      agent,
      userMessage,
      conversationHistory as OpenAIService.ChatMessage[]
    );
  }
}

/**
 * Estimate token count
 */
export function estimateTokens(text: string): number {
  const provider = getAIProvider();

  if (provider === 'anthropic') {
    return AnthropicService.estimateTokens(text);
  } else {
    return OpenAIService.estimateTokens(text);
  }
}

/**
 * Trim conversation history to fit token limit
 */
export function trimConversationHistory(
  messages: ChatMessage[],
  maxTokens?: number
): ChatMessage[] {
  const provider = getAIProvider();

  if (provider === 'anthropic') {
    return AnthropicService.trimConversationHistory(messages, maxTokens);
  } else {
    return OpenAIService.trimConversationHistory(
      messages as OpenAIService.ChatMessage[],
      maxTokens
    ) as ChatMessage[];
  }
}

/**
 * Get current AI model name
 */
export function getCurrentModel(): string {
  const provider = getAIProvider();

  if (provider === 'anthropic') {
    return process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
  } else {
    return process.env.OPENAI_MODEL || 'gpt-5.1';
  }
}

/**
 * Get max tokens for current provider
 */
export function getMaxTokens(): number {
  const provider = getAIProvider();

  if (provider === 'anthropic') {
    return parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4096');
  } else {
    return parseInt(process.env.OPENAI_MAX_TOKENS || '4000');
  }
}

/**
 * Generate AI response with automatic fallback and retry
 *
 * This is the RESILIENT version that:
 * - Automatically retries failed requests with exponential backoff
 * - Falls back to alternative models when primary fails
 * - Monitors model health with circuit breakers
 * - Provides detailed execution metadata
 *
 * @param agent - Agent persona for system prompt
 * @param userMessage - User's message
 * @param conversationHistory - Previous conversation messages
 * @param fallbackChainName - Optional custom fallback chain (defaults to agent-specific)
 * @returns Detailed response with fallback metadata
 */
export async function generateAgentResponseResilient(
  agent: AgentPersona,
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
  fallbackChainName?: string
): Promise<FallbackExecutionResult> {
  console.log(`[AI_SERVICE] Using RESILIENT mode with fallback for agent: ${agent.id}`);

  return executeWithFallback({
    agent,
    userMessage,
    conversationHistory,
    fallbackChainName,
    timeoutMs: 60000,
  });
}

/**
 * Re-export fallback types for convenience
 */
export type { FallbackExecutionResult } from './fallback-engine';
