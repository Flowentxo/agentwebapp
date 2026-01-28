/**
 * UNIFIED OPENAI CLIENT (SINGLETON)
 *
 * Single source of truth for OpenAI API access.
 * All services MUST use this client instead of creating their own instances.
 *
 * Usage:
 *   import { openai, chatCompletion, streamChatCompletion, createEmbedding } from '@/lib/ai/openai-client';
 *
 * DO NOT create new OpenAI() instances anywhere else!
 */

import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from 'openai/resources/chat/completions';
import {
  OPENAI_MODEL,
  EMBEDDING_MODEL,
  FALLBACK_MODEL,
  AI_TEMPERATURE,
  MAX_TOKENS,
  PRESENCE_PENALTY,
  FREQUENCY_PENALTY,
  MAX_RETRIES,
  RETRY_BASE_DELAY,
  REQUEST_TIMEOUT,
  ENABLE_STREAMING,
  ENABLE_TOOLS,
  VERBOSE_LOGGING,
  validateAIConfig,
} from './config';

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let _openaiInstance: OpenAI | null = null;
let _isInitialized = false;

/**
 * Get the singleton OpenAI client instance
 * Lazily initialized on first access
 */
function getClient(): OpenAI {
  if (!_openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;

    // During build phase, use a placeholder to prevent errors
    const isBuildPhase = process.env.NEXT_BUILD_PHASE === '1' ||
                         process.env.NODE_ENV === 'production' && !apiKey;

    if (!apiKey && !isBuildPhase) {
      throw new Error(
        '[OpenAI Client] CRITICAL: OPENAI_API_KEY is not set. ' +
          'Please add it to your .env.local file.'
      );
    }

    _openaiInstance = new OpenAI({
      apiKey: apiKey || 'sk-build-placeholder',
      baseURL: process.env.OPENAI_BASE_URL, // Support for LocalAI/Ollama/Azure
      timeout: REQUEST_TIMEOUT,
      maxRetries: 0, // We handle retries ourselves
    });

    if (!_isInitialized && !isBuildPhase) {
      console.log('[OpenAI Client] ✅ Singleton instance created');
      console.log(`[OpenAI Client] Model: ${OPENAI_MODEL}`);
      _isInitialized = true;
    }
  }

  return _openaiInstance;
}

/**
 * Export the singleton client for direct API access
 * Use this when you need the raw OpenAI client
 */
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return getClient()[prop as keyof OpenAI];
  },
});

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface ChatCompletionOptions {
  messages: ChatCompletionMessageParam[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ChatCompletionTool[];
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
  presencePenalty?: number;
  frequencyPenalty?: number;
  user?: string;
  responseFormat?: { type: 'text' | 'json_object' };
}

export interface ChatCompletionResult {
  content: string;
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
}

export interface EmbeddingResult {
  embedding: number[];
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
  model: string;
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = RETRY_BASE_DELAY
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on authentication or validation errors
      if (error.status === 401 || error.status === 400 || error.status === 403) {
        throw error;
      }

      // Don't retry on final attempt
      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      if (VERBOSE_LOGGING) {
        console.warn(`[OpenAI Client] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`, error.message);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ============================================================================
// CHAT COMPLETION (NON-STREAMING)
// ============================================================================

/**
 * Create a chat completion (non-streaming)
 * Uses the global model and settings from config
 */
export async function chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const {
    messages,
    model = OPENAI_MODEL,
    temperature = AI_TEMPERATURE,
    maxTokens = MAX_TOKENS,
    tools,
    toolChoice,
    presencePenalty = PRESENCE_PENALTY,
    frequencyPenalty = FREQUENCY_PENALTY,
    user,
    responseFormat,
  } = options;

  const client = getClient();

  const params: ChatCompletionCreateParamsNonStreaming = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    presence_penalty: presencePenalty,
    frequency_penalty: frequencyPenalty,
    stream: false,
  };

  if (tools && tools.length > 0 && ENABLE_TOOLS) {
    params.tools = tools;
    if (toolChoice) {
      params.tool_choice = toolChoice;
    }
  }

  if (user) {
    params.user = user;
  }

  if (responseFormat) {
    params.response_format = responseFormat;
  }

  if (VERBOSE_LOGGING) {
    console.log(`[OpenAI Client] Chat completion: model=${model}, messages=${messages.length}`);
  }

  try {
    const response = await withRetry(() => client.chat.completions.create(params));

    const choice = response.choices[0];

    return {
      content: choice.message?.content || '',
      toolCalls: choice.message?.tool_calls?.map((tc) => ({
        id: tc.id,
        type: tc.type,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      model: response.model,
      finishReason: choice.finish_reason || 'stop',
    };
  } catch (error: any) {
    console.error(`[OpenAI Client] Chat completion failed:`, error.message);

    // Try fallback model if primary fails with model-related error
    if (model !== FALLBACK_MODEL && (error.status === 404 || error.message?.includes('model'))) {
      console.warn(`[OpenAI Client] Falling back to ${FALLBACK_MODEL}`);
      return chatCompletion({ ...options, model: FALLBACK_MODEL });
    }

    throw error;
  }
}

// ============================================================================
// CHAT COMPLETION (STREAMING)
// ============================================================================

/**
 * Create a streaming chat completion
 * Returns an async generator that yields content chunks
 */
export async function* streamChatCompletion(
  options: ChatCompletionOptions
): AsyncGenerator<string, ChatCompletionResult, unknown> {
  const {
    messages,
    model = OPENAI_MODEL,
    temperature = AI_TEMPERATURE,
    maxTokens = MAX_TOKENS,
    tools,
    toolChoice,
    presencePenalty = PRESENCE_PENALTY,
    frequencyPenalty = FREQUENCY_PENALTY,
    user,
  } = options;

  if (!ENABLE_STREAMING) {
    // Fallback to non-streaming if disabled
    const result = await chatCompletion(options);
    yield result.content;
    return result;
  }

  const client = getClient();

  const params: ChatCompletionCreateParamsStreaming = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    presence_penalty: presencePenalty,
    frequency_penalty: frequencyPenalty,
    stream: true,
    stream_options: { include_usage: true },
  };

  if (tools && tools.length > 0 && ENABLE_TOOLS) {
    params.tools = tools;
    if (toolChoice) {
      params.tool_choice = toolChoice;
    }
  }

  if (user) {
    params.user = user;
  }

  if (VERBOSE_LOGGING) {
    console.log(`[OpenAI Client] Streaming: model=${model}, messages=${messages.length}`);
  }

  let fullContent = '';
  let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  let finishReason = 'stop';

  try {
    const stream = await client.chat.completions.create(params);

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullContent += content;
        yield content;
      }

      if (chunk.choices[0]?.finish_reason) {
        finishReason = chunk.choices[0].finish_reason;
      }

      if (chunk.usage) {
        usage = {
          promptTokens: chunk.usage.prompt_tokens,
          completionTokens: chunk.usage.completion_tokens,
          totalTokens: chunk.usage.total_tokens,
        };
      }
    }
  } catch (error: any) {
    console.error(`[OpenAI Client] Streaming failed:`, error.message);
    throw error;
  }

  return {
    content: fullContent,
    usage,
    model,
    finishReason,
  };
}

// ============================================================================
// EMBEDDINGS
// ============================================================================

/**
 * Create an embedding for the given text
 */
export async function createEmbedding(
  text: string,
  model: string = EMBEDDING_MODEL
): Promise<EmbeddingResult> {
  const client = getClient();

  if (VERBOSE_LOGGING) {
    console.log(`[OpenAI Client] Creating embedding: ${text.slice(0, 50)}...`);
  }

  try {
    const response = await withRetry(() =>
      client.embeddings.create({
        model,
        input: text,
      })
    );

    return {
      embedding: response.data[0].embedding,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        totalTokens: response.usage.total_tokens,
      },
      model: response.model,
    };
  } catch (error: any) {
    console.error(`[OpenAI Client] Embedding failed:`, error.message);
    throw error;
  }
}

/**
 * Create embeddings for multiple texts (batch)
 */
export async function createEmbeddings(
  texts: string[],
  model: string = EMBEDDING_MODEL
): Promise<EmbeddingResult[]> {
  const client = getClient();

  if (VERBOSE_LOGGING) {
    console.log(`[OpenAI Client] Creating ${texts.length} embeddings`);
  }

  try {
    const response = await withRetry(() =>
      client.embeddings.create({
        model,
        input: texts,
      })
    );

    return response.data.map((item, index) => ({
      embedding: item.embedding,
      usage: {
        promptTokens: Math.floor(response.usage.prompt_tokens / texts.length),
        totalTokens: Math.floor(response.usage.total_tokens / texts.length),
      },
      model: response.model,
    }));
  } catch (error: any) {
    console.error(`[OpenAI Client] Batch embedding failed:`, error.message);
    throw error;
  }
}

// ============================================================================
// MODERATION
// ============================================================================

/**
 * Check content for policy violations
 */
export async function moderateContent(text: string): Promise<{
  flagged: boolean;
  categories: Record<string, boolean>;
  scores: Record<string, number>;
}> {
  const client = getClient();

  try {
    const response = await client.moderations.create({
      input: text,
    });

    const result = response.results[0];

    return {
      flagged: result.flagged,
      categories: result.categories as unknown as Record<string, boolean>,
      scores: result.category_scores as unknown as Record<string, number>,
    };
  } catch (error: any) {
    console.error(`[OpenAI Client] Moderation failed:`, error.message);
    throw error;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Estimate token count for a string (rough approximation)
 * ~4 characters per token for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(text);
  if (estimatedTokens <= maxTokens) {
    return text;
  }

  const ratio = maxTokens / estimatedTokens;
  const targetLength = Math.floor(text.length * ratio * 0.9); // 10% buffer
  return text.slice(0, targetLength) + '...';
}

/**
 * Get the current model configuration
 */
export function getCurrentModelConfig() {
  return {
    model: OPENAI_MODEL,
    embeddingModel: EMBEDDING_MODEL,
    fallbackModel: FALLBACK_MODEL,
    temperature: AI_TEMPERATURE,
    maxTokens: MAX_TOKENS,
  };
}

/**
 * Health check for OpenAI connection
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  model: string;
  latency: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    const client = getClient();
    await client.models.retrieve(OPENAI_MODEL);

    return {
      healthy: true,
      model: OPENAI_MODEL,
      latency: Date.now() - start,
    };
  } catch (error: any) {
    return {
      healthy: false,
      model: OPENAI_MODEL,
      latency: Date.now() - start,
      error: error.message,
    };
  }
}

// Re-export config validation for server startup
export { validateAIConfig };
