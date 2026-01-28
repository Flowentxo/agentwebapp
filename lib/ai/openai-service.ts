/**
 * OPENAI SERVICE - Agent Response Generation
 *
 * Uses the centralized OpenAI client from @/lib/ai/openai-client
 * All model and configuration settings come from @/lib/ai/config
 *
 * Instrumented with AI Telemetry for cost tracking and performance monitoring.
 */

import type { ChatCompletionTool, ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { AgentPersona } from '@/lib/agents/personas';
import { getAgentSystemPrompt } from '@/lib/agents/prompts';
import { classifyOpenAIError } from './error-handler';
import { getModelConfig, calculateCost as calculateModelCost } from './model-config';
import { createLogger } from '@/lib/logger';
import { AITelemetryService } from '@/server/services/AITelemetryService';

// Import centralized client and config
import { openai } from './openai-client';
import {
  OPENAI_MODEL,
  AI_TEMPERATURE,
  MAX_TOKENS,
  PRESENCE_PENALTY,
  FREQUENCY_PENALTY,
  MAX_RETRIES,
  RETRY_BASE_DELAY,
} from './config';

// Create namespaced logger
const logger = createLogger('openai-service');

// Use centralized retry logic
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; initialDelay?: number } = {}
): Promise<T> {
  const { maxRetries = MAX_RETRIES, initialDelay = RETRY_BASE_DELAY } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (error.status === 401 || error.status === 400) throw error;
      if (attempt === maxRetries) break;
      await new Promise(r => setTimeout(r, initialDelay * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export interface ToolCallEvent {
  type: 'tool_call_start' | 'tool_call_result' | 'text_chunk' | 'done' | 'error' | 'confirmation_required';
  tool?: string;
  args?: Record<string, any>;
  result?: any;
  chunk?: string;
  error?: string;
  /** For confirmation_required events */
  confirmation?: {
    actionId: string;
    description: string;
    details: Record<string, any>;
  };
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  summary: string;
}

export interface OpenAIStreamOptions {
  agent: AgentPersona;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  onToken?: (token: string) => void;
}

export interface OpenAIResponse {
  content: string;
  tokensUsed: number;
  tokensInput: number;
  tokensOutput: number;
  cost: number;
  model: string;
  finishReason: string;
}

/**
 * Generate AI response (non-streaming) with retry logic
 * Instrumented with AI Telemetry for automatic logging.
 */
export async function generateAgentResponse(
  agent: AgentPersona,
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
  modelId?: string,
  userId?: string
): Promise<OpenAIResponse> {
  const systemPrompt = await getAgentSystemPrompt(agent, userId);
  const timer = AITelemetryService.startTimer();
  let status: 'success' | 'failed' | 'rate_limited' = 'success';
  let errorCode: string | undefined;
  let errorMessage: string | undefined;
  let tokensInput = 0;
  let tokensOutput = 0;
  const model = modelId || OPENAI_MODEL;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  try {
    return await withRetry(async () => {
      try {
        const modelConfig = getModelConfig(model);

        const maxTokensKey = model.includes('gpt-5') || model.includes('gpt-4o')
          ? 'max_completion_tokens'
          : 'max_tokens';

        const response = await openai.chat.completions.create({
          model,
          messages,
          temperature: AI_TEMPERATURE,
          [maxTokensKey]: Math.min(
            MAX_TOKENS,
            modelConfig?.capabilities.maxTokens || MAX_TOKENS
          ),
          presence_penalty: PRESENCE_PENALTY,
          frequency_penalty: FREQUENCY_PENALTY,
        } as any);

        const choice = response.choices[0];
        tokensInput = response.usage?.prompt_tokens || 0;
        tokensOutput = response.usage?.completion_tokens || 0;
        const tokensTotal = response.usage?.total_tokens || 0;

        // Calculate cost using model-specific pricing
        const cost = calculateModelCost(model, tokensInput, tokensOutput);

        return {
          content: choice.message?.content || '',
          tokensUsed: tokensTotal,
          tokensInput,
          tokensOutput,
          cost,
          model: response.model,
          finishReason: choice.finish_reason || 'stop'
        };
      } catch (error) {
        logger.error('Failed to generate agent response', { error });
        throw classifyOpenAIError(error);
      }
    }, {
      maxRetries: 3,
      initialDelay: 1000,
    });
  } catch (error: any) {
    status = error.status === 429 ? 'rate_limited' : 'failed';
    errorCode = error.status?.toString() || 'UNKNOWN';
    errorMessage = error.message;
    throw error;
  } finally {
    // Log telemetry (fire-and-forget, never blocks)
    const responseTimeMs = timer.stop();

    AITelemetryService.logTrace({
      provider: 'openai',
      model,
      requestType: 'chat',
      userId,
      agentId: agent.id,
      promptTokens: tokensInput,
      completionTokens: tokensOutput,
      responseTimeMs,
      status,
      errorCode,
      errorMessage,
      metadata: {
        temperature: AI_TEMPERATURE,
        maxTokens: MAX_TOKENS,
      },
    });
  }
}

/**
 * Generate AI response with streaming and retry logic
 * Note: Retry only applies to initial connection, not mid-stream errors
 * Returns the model ID used for cost calculation later
 *
 * @param agent - Agent persona for system prompt
 * @param userMessage - User's message
 * @param conversationHistory - Previous messages in conversation
 * @param modelId - Optional model override
 * @param userId - User ID for personalization
 * @param temperature - Optional temperature override (0-1)
 * @param maxTokensOverride - Optional max tokens override
 */
export async function* generateAgentResponseStream(
  agent: AgentPersona,
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
  modelId?: string,
  userId?: string,
  temperature?: number,
  maxTokensOverride?: number
): AsyncGenerator<string, { model: string }, unknown> {
  const systemPrompt = await getAgentSystemPrompt(agent, userId);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  const model = modelId || OPENAI_MODEL;
  const modelConfig = getModelConfig(model);

  // Use provided values or fall back to defaults
  const effectiveTemperature = temperature ?? AI_TEMPERATURE;
  const effectiveMaxTokens = maxTokensOverride ?? MAX_TOKENS;

  logger.debug('Stream config', { model, temperature: effectiveTemperature, maxTokens: effectiveMaxTokens });

  // Use retry for establishing the stream connection
  const stream = await withRetry(async () => {
    try {
      const maxTokensKey = model.includes('gpt-5') || model.includes('gpt-4o')
        ? 'max_completion_tokens'
        : 'max_tokens';

      return await openai.chat.completions.create({
        model,
        messages,
        temperature: effectiveTemperature,
        [maxTokensKey]: Math.min(
          effectiveMaxTokens,
          modelConfig?.capabilities.maxTokens || effectiveMaxTokens
        ),
        stream: true,
      } as any);
    } catch (error) {
      logger.error('Failed to initialize stream', { error });
      throw classifyOpenAIError(error);
    }
  }, {
    maxRetries: 2, // Fewer retries for streaming to avoid long waits
    initialDelay: 500,
  });

  // Stream the response (errors here are not retried)
  try {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }

    // Return the model used for cost calculation
    return { model };
  } catch (error) {
    logger.error('Stream processing failed', { error });
    throw classifyOpenAIError(error);
  }
}

/**
 * Calculate conversation token count (estimate)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Trim conversation history to fit token limit
 */
export function trimConversationHistory(
  messages: ChatMessage[],
  maxTokens: number = 8000
): ChatMessage[] {
  let totalTokens = 0;
  const trimmed: ChatMessage[] = [];

  // Keep system message
  const systemMessage = messages.find(m => m.role === 'system');
  if (systemMessage) {
    trimmed.push(systemMessage);
    totalTokens += estimateTokens(systemMessage.content);
  }

  // Add messages from newest to oldest
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === 'system') continue;

    const tokens = estimateTokens(message.content);
    if (totalTokens + tokens > maxTokens) break;

    trimmed.unshift(message);
    totalTokens += tokens;
  }

  return trimmed;
}

/**
 * Stream with tools (Function Calling) for agentic behavior
 *
 * This function enables agents like Emmie to execute tools (e.g., gmail_search)
 * during the conversation. It handles the tool call loop automatically.
 */
export interface StreamWithToolsOptions {
  systemPrompt: string;
  userMessage: string;
  conversationHistory?: ChatMessage[];
  tools: ChatCompletionTool[];
  toolExecutor: (toolName: string, args: Record<string, any>) => Promise<ToolResult>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  maxToolCalls?: number;
  /** Maximum retries for OpenAI API connection errors */
  maxRetries?: number;
  /** Callback when recovery from partial failure occurs */
  onRecovery?: (error: Error, attempt: number) => void;
  /** Check if a tool requires user confirmation before execution */
  requiresConfirmation?: (toolName: string) => boolean;
  /** Get human-readable description of tool action */
  getToolDescription?: (toolName: string, args: Record<string, any>) => string;
  /** Pending confirmations map - key is actionId, value indicates if confirmed */
  pendingConfirmations?: Map<string, { confirmed: boolean; cancelled: boolean }>;
}

export async function* streamWithTools(
  options: StreamWithToolsOptions
): AsyncGenerator<ToolCallEvent, { model: string; totalToolCalls: number }, unknown> {
  const {
    systemPrompt,
    userMessage,
    conversationHistory = [],
    tools,
    toolExecutor,
    model: modelId,
    temperature = 0.7,
    maxTokens,
    maxToolCalls = 10,
    maxRetries = 3,
    onRecovery,
  } = options;

  const model = modelId || OPENAI_MODEL;
  const modelConfig = getModelConfig(model);

  // Build initial messages
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'tool',
      content: msg.content,
      ...(msg.tool_call_id ? { tool_call_id: msg.tool_call_id } : {}),
      ...(msg.tool_calls ? { tool_calls: msg.tool_calls } : {}),
    })),
    { role: 'user', content: userMessage },
  ];

  let toolCallCount = 0;
  let continueLoop = true;
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 3;

  while (continueLoop && toolCallCount < maxToolCalls) {
    let retryCount = 0;
    let streamSuccess = false;

    // Retry loop for OpenAI connection
    while (retryCount < maxRetries && !streamSuccess) {
      try {
        const maxTokensKey = model.includes('gpt-5') || model.includes('gpt-4o')
          ? 'max_completion_tokens'
          : 'max_tokens';

        // Make OpenAI request with tools
        const response = await openai.chat.completions.create({
          model,
          messages,
          tools: tools.length > 0 ? tools : undefined,
          tool_choice: tools.length > 0 ? 'auto' : undefined,
          temperature,
          [maxTokensKey]: Math.min(
            maxTokens || MAX_TOKENS,
            modelConfig?.capabilities.maxTokens || MAX_TOKENS
          ),
          stream: true,
        } as any);

        // Accumulate tool calls and content
        let currentContent = '';
        let currentToolCalls: Array<{
          id: string;
          type: 'function';
          function: {
            name: string;
            arguments: string;
          };
        }> = [];

        // Process stream
        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta;
          const finishReason = chunk.choices[0]?.finish_reason;

          // Handle content chunks
          if (delta?.content) {
            currentContent += delta.content;
            yield {
              type: 'text_chunk',
              chunk: delta.content,
            };
          }

          // Handle tool call chunks
          if (delta?.tool_calls) {
            for (const toolCall of delta.tool_calls) {
              const index = toolCall.index;

              // Initialize tool call if new
              if (!currentToolCalls[index]) {
                currentToolCalls[index] = {
                  id: toolCall.id || '',
                  type: 'function',
                  function: {
                    name: toolCall.function?.name || '',
                    arguments: '',
                  },
                };
              }

              // Accumulate tool call data
              if (toolCall.id) {
                currentToolCalls[index].id = toolCall.id;
              }
              if (toolCall.function?.name) {
                currentToolCalls[index].function.name = toolCall.function.name;
              }
              if (toolCall.function?.arguments) {
                currentToolCalls[index].function.arguments += toolCall.function.arguments;
              }
            }
          }

          // Handle finish
          if (finishReason === 'stop') {
            continueLoop = false;
            streamSuccess = true;
          } else if (finishReason === 'tool_calls') {
            // Execute tool calls with error isolation
            let hasToolError = false;

            for (const toolCall of currentToolCalls) {
              if (!toolCall.function.name) continue;

              toolCallCount++;

              // Parse arguments with validation
              let args: Record<string, any> = {};
              let parseError = false;
              try {
                args = JSON.parse(toolCall.function.arguments || '{}');
              } catch (e) {
                logger.error('Failed to parse tool arguments', { error: e, toolName: toolCall.function.name });
                parseError = true;
              }

              // Notify start
              yield {
                type: 'tool_call_start',
                tool: toolCall.function.name,
                args,
              };

              // Execute tool with timeout and error handling
              let result: ToolResult;
              if (parseError) {
                result = {
                  success: false,
                  error: 'Invalid tool arguments format',
                  summary: `Tool-Argumente konnten nicht verarbeitet werden`,
                };
                hasToolError = true;
              } else {
                try {
                  // Execute with timeout (30 seconds)
                  result = await Promise.race([
                    toolExecutor(toolCall.function.name, args),
                    new Promise<ToolResult>((_, reject) =>
                      setTimeout(() => reject(new Error('Tool execution timeout (30s)')), 30000)
                    ),
                  ]);

                  if (!result.success) {
                    hasToolError = true;
                  }
                } catch (error: any) {
                  hasToolError = true;
                  const errorMessage = error.message || 'Unknown error';
                  const isTimeout = errorMessage.includes('timeout');
                  const isAuthError = errorMessage.includes('401') || errorMessage.includes('unauthorized');

                  result = {
                    success: false,
                    error: errorMessage,
                    summary: isTimeout
                      ? `Tool-Ausführung hat zu lange gedauert`
                      : isAuthError
                        ? `Authentifizierung fehlgeschlagen - bitte erneut anmelden`
                        : `Tool-Ausführung fehlgeschlagen: ${errorMessage}`,
                  };
                }
              }

              // Notify result
              yield {
                type: 'tool_call_result',
                tool: toolCall.function.name,
                args,
                result,
              };

              // Add assistant message with tool calls
              messages.push({
                role: 'assistant',
                content: currentContent || null,
                tool_calls: [toolCall],
              } as any);

              // Add tool result message
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(result),
              } as any);
            }

            // Track consecutive errors for circuit breaker
            if (hasToolError) {
              consecutiveErrors++;
              if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                logger.warn('Circuit breaker triggered after consecutive tool failures', { consecutiveErrors });
                yield {
                  type: 'error',
                  error: `Zu viele aufeinanderfolgende Tool-Fehler (${consecutiveErrors})`,
                };
                continueLoop = false;
              }
            } else {
              consecutiveErrors = 0; // Reset on success
            }

            // Reset for next iteration
            currentContent = '';
            currentToolCalls = [];
            streamSuccess = true;
          }
        }

        // If we had content but no tool calls, we're done
        if (currentContent && currentToolCalls.length === 0) {
          continueLoop = false;
          streamSuccess = true;
        }

      } catch (error: any) {
        const classifiedError = classifyOpenAIError(error);
        logger.error('Tool execution error', { attempt: retryCount + 1, maxRetries, error: classifiedError });

        // Check if error is retryable
        const isRetryable = classifiedError.retryable &&
          !classifiedError.message.includes('401') &&
          !classifiedError.message.includes('Invalid API key');

        if (isRetryable && retryCount < maxRetries - 1) {
          retryCount++;
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s

          if (onRecovery) {
            onRecovery(error, retryCount);
          }

          logger.info('Retrying OpenAI request', { delayMs: delay, attempt: retryCount });
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Non-retryable error or max retries reached
          yield {
            type: 'error',
            error: classifiedError.message,
          };
          continueLoop = false;
          streamSuccess = true; // Exit retry loop
        }
      }
    }
  }

  // Final done event
  yield { type: 'done' };

  return { model, totalToolCalls: toolCallCount };
}

/**
 * Non-streaming version of tool execution
 * Useful for background tasks or when streaming isn't needed
 */
export async function executeWithTools(
  options: Omit<StreamWithToolsOptions, 'toolExecutor'> & {
    toolExecutor: (toolName: string, args: Record<string, any>) => Promise<ToolResult>;
  }
): Promise<{
  content: string;
  toolCalls: Array<{ tool: string; args: any; result: ToolResult }>;
  model: string;
}> {
  let content = '';
  const toolCalls: Array<{ tool: string; args: any; result: ToolResult }> = [];

  const generator = streamWithTools(options);

  for await (const event of generator) {
    if (event.type === 'text_chunk' && event.chunk) {
      content += event.chunk;
    } else if (event.type === 'tool_call_result') {
      toolCalls.push({
        tool: event.tool!,
        args: event.args,
        result: event.result,
      });
    }
  }

  const result = await generator.return({ model: options.model || OPENAI_MODEL, totalToolCalls: toolCalls.length });

  return {
    content,
    toolCalls,
    model: result.value.model,
  };
}
