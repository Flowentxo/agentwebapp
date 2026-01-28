import Anthropic from '@anthropic-ai/sdk';
import { AgentPersona } from '@/lib/agents/personas';
import { getAgentSystemPrompt } from '@/lib/agents/prompts';
import { withRetry, classifyAnthropicError } from './error-handler';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnthropicStreamOptions {
  agent: AgentPersona;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  onToken?: (token: string) => void;
}

export interface AnthropicResponse {
  content: string;
  tokensUsed: number;
  model: string;
  finishReason: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Generate AI response (non-streaming) with retry logic using Claude Sonnet 4.5
 */
export async function generateAgentResponse(
  agent: AgentPersona,
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): Promise<AnthropicResponse> {
  const systemPrompt = getAgentSystemPrompt(agent);

  // Filter out system messages from conversation history (Anthropic handles system separately)
  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    {
      role: 'user' as const,
      content: userMessage
    }
  ];

  return withRetry(async () => {
    try {
      const response = await anthropic.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4096'),
        temperature: 0.7,
        system: systemPrompt, // Claude uses system parameter separately
        messages,
      });

      const content = response.content[0];
      const textContent = content.type === 'text' ? content.text : '';

      return {
        content: textContent,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: response.model,
        finishReason: response.stop_reason || 'end_turn'
      };
    } catch (error) {
      console.error('[ANTHROPIC_SERVICE]', error);
      throw classifyAnthropicError(error);
    }
  }, {
    maxRetries: 3,
    initialDelay: 1000,
  });
}

/**
 * Generate AI response with streaming using Claude Sonnet 4.5
 * Note: Retry only applies to initial connection, not mid-stream errors
 */
export async function* generateAgentResponseStream(
  agent: AgentPersona,
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): AsyncGenerator<string, void, unknown> {
  const systemPrompt = getAgentSystemPrompt(agent);

  // Filter out system messages from conversation history
  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    {
      role: 'user' as const,
      content: userMessage
    }
  ];

  // Use retry for establishing the stream connection
  const stream = await withRetry(async () => {
    try {
      return await anthropic.messages.stream({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4096'),
        temperature: 0.7,
        system: systemPrompt,
        messages,
      });
    } catch (error) {
      console.error('[ANTHROPIC_STREAM_INIT]', error);
      throw classifyAnthropicError(error);
    }
  }, {
    maxRetries: 2, // Fewer retries for streaming to avoid long waits
    initialDelay: 500,
  });

  // Stream the response (errors here are not retried)
  try {
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  } catch (error) {
    console.error('[ANTHROPIC_STREAM]', error);
    throw classifyAnthropicError(error);
  }
}

/**
 * Calculate conversation token count (estimate)
 * Claude uses a similar ~4 chars per token ratio
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token (similar to GPT)
  return Math.ceil(text.length / 4);
}

/**
 * Trim conversation history to fit token limit
 * Claude Sonnet 4 has a 200k context window, but we'll be conservative
 */
export function trimConversationHistory(
  messages: ChatMessage[],
  maxTokens: number = 100000 // Conservative limit for Claude
): ChatMessage[] {
  let totalTokens = 0;
  const trimmed: ChatMessage[] = [];

  // Add messages from newest to oldest (no system message in array for Claude)
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const tokens = estimateTokens(message.content);

    if (totalTokens + tokens > maxTokens) break;

    trimmed.unshift(message);
    totalTokens += tokens;
  }

  return trimmed;
}

/**
 * Count tokens more accurately using Anthropic's API (optional, for future use)
 */
export async function countTokens(text: string): Promise<number> {
  try {
    const response = await anthropic.messages.countTokens({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      system: '',
      messages: [{ role: 'user', content: text }]
    });
    return response.input_tokens;
  } catch (error) {
    console.error('[ANTHROPIC_COUNT_TOKENS]', error);
    // Fallback to estimate
    return estimateTokens(text);
  }
}
