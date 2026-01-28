/**
 * AI FALLBACK EXECUTION ENGINE
 *
 * Orchestrates fallback chains with circuit breakers and retry policies
 * to ensure high availability and automatic failover.
 */

import { AgentPersona } from '@/lib/agents/personas';
import { ChatMessage } from './ai-service';
import * as OpenAIService from './openai-service';
import * as AnthropicService from './anthropic-service';
import { getAgentSystemPrompt } from '@/lib/agents/prompts';
import {
  FallbackChain,
  FallbackModel,
  getAgentFallbackChain,
  getRetryDelay,
  shouldFallback,
  shouldRetry,
  FallbackTrigger,
} from './fallback-config';
import { globalCircuitBreaker, CircuitState } from './circuit-breaker';
import { classifyOpenAIError, OpenAIError, getUserFriendlyMessage } from './error-handler';

export interface FallbackExecutionResult {
  content: string;
  tokensUsed: number;
  inputTokens?: number;
  outputTokens?: number;
  model: string;
  provider: string;
  finishReason: string;
  attemptedModels: string[];
  fallbacksUsed: number;
  totalRetries: number;
  executionTimeMs: number;
}

export interface FallbackExecutionOptions {
  agent: AgentPersona;
  userMessage: string;
  conversationHistory?: ChatMessage[];
  fallbackChainName?: string;
  timeoutMs?: number;
}

/**
 * Fallback Execution Engine
 */
export class FallbackEngine {
  /**
   * Execute with automatic fallback and retry
   */
  async execute(options: FallbackExecutionOptions): Promise<FallbackExecutionResult> {
    const {
      agent,
      userMessage,
      conversationHistory = [],
      fallbackChainName,
      timeoutMs = 60000,
    } = options;

    // Get fallback chain for this agent
    const chain = fallbackChainName
      ? require('./fallback-config').getFallbackChain(fallbackChainName)
      : getAgentFallbackChain(agent.id);

    const startTime = Date.now();
    const attemptedModels: string[] = [];
    let totalRetries = 0;
    let fallbacksUsed = 0;

    console.log(
      `[FALLBACK_ENGINE] Starting execution for agent ${agent.id} using chain: ${chain.name}`
    );

    // Try each model in the fallback chain
    for (const fallbackModel of chain.models) {
      const modelKey = `${fallbackModel.provider}:${fallbackModel.model}`;

      // Check circuit breaker
      if (!globalCircuitBreaker.canExecute(fallbackModel.provider, fallbackModel.model)) {
        console.log(`[FALLBACK_ENGINE] Skipping ${modelKey} (circuit breaker OPEN)`);
        attemptedModels.push(`${modelKey} (skipped - circuit open)`);
        fallbacksUsed++;
        continue;
      }

      // Try this model with retries
      const result = await this.tryModelWithRetries(
        agent,
        userMessage,
        conversationHistory,
        fallbackModel,
        timeoutMs
      );

      attemptedModels.push(modelKey);

      if (result.success) {
        // Success!
        globalCircuitBreaker.recordSuccess(fallbackModel.provider, fallbackModel.model);

        const executionTimeMs = Date.now() - startTime;
        console.log(
          `[FALLBACK_ENGINE] ✅ Success with ${modelKey} after ${result.retries} retries (${executionTimeMs}ms)`
        );

        return {
          content: result.content!,
          tokensUsed: result.tokensUsed!,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          model: fallbackModel.model,
          provider: fallbackModel.provider,
          finishReason: result.finishReason || 'stop',
          attemptedModels,
          fallbacksUsed,
          totalRetries: totalRetries + result.retries,
          executionTimeMs,
        };
      } else {
        // Failure - record and try next model
        globalCircuitBreaker.recordFailure(
          fallbackModel.provider,
          fallbackModel.model,
          result.errorType
        );
        totalRetries += result.retries;
        fallbacksUsed++;

        console.log(
          `[FALLBACK_ENGINE] ❌ Failed with ${modelKey} after ${result.retries} retries: ${result.error}`
        );

        // Check if we should fallback to next model
        if (!shouldFallback(result.errorType || '')) {
          // Non-fallback error (e.g., invalid request), don't try other models
          throw new Error(
            `Request failed: ${result.error} (error type: ${result.errorType})`
          );
        }
      }
    }

    // All models failed
    const executionTimeMs = Date.now() - startTime;
    console.error(
      `[FALLBACK_ENGINE] ❌ All models failed after ${totalRetries} total retries`
    );

    throw new Error(
      `All AI models failed after trying ${attemptedModels.length} models: ${attemptedModels.join(', ')}`
    );
  }

  /**
   * Try a single model with retry logic
   */
  private async tryModelWithRetries(
    agent: AgentPersona,
    userMessage: string,
    conversationHistory: ChatMessage[],
    fallbackModel: FallbackModel,
    globalTimeoutMs: number
  ): Promise<{
    success: boolean;
    content?: string;
    tokensUsed?: number;
    inputTokens?: number;
    outputTokens?: number;
    finishReason?: string;
    retries: number;
    error?: string;
    errorType?: string;
  }> {
    const { provider, model, maxRetries, timeoutMs } = fallbackModel;

    let lastError: Error | null = null;
    let lastErrorType: string | null = null;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        console.log(
          `[FALLBACK_ENGINE] Attempting ${provider}:${model} (attempt ${attempt}/${maxRetries + 1})`
        );

        // Execute with timeout
        const result = await this.executeWithTimeout(
          () =>
            this.executeModel(
              provider,
              model,
              agent,
              userMessage,
              conversationHistory
            ),
          Math.min(timeoutMs, globalTimeoutMs)
        );

        return {
          success: true,
          ...result,
          retries: attempt - 1,
        };
      } catch (error: any) {
        lastError = error;
        lastErrorType = error.type || FallbackTrigger.SERVER_ERROR;

        console.log(
          `[FALLBACK_ENGINE] ${provider}:${model} attempt ${attempt} failed: ${error.message}`
        );

        // Check if we should retry
        if (attempt <= maxRetries && shouldRetry(lastErrorType)) {
          const delay = getRetryDelay(attempt);
          console.log(
            `[FALLBACK_ENGINE] Retrying ${provider}:${model} in ${delay}ms...`
          );
          await this.sleep(delay);
        } else {
          // No more retries
          break;
        }
      }
    }

    return {
      success: false,
      retries: maxRetries,
      error: lastError?.message || 'Unknown error',
      errorType: lastErrorType || undefined,
    };
  }

  /**
   * Execute a specific model
   */
  private async executeModel(
    provider: string,
    model: string,
    agent: AgentPersona,
    userMessage: string,
    conversationHistory: ChatMessage[]
  ): Promise<{
    content: string;
    tokensUsed: number;
    inputTokens?: number;
    outputTokens?: number;
    finishReason: string;
  }> {
    if (provider === 'openai') {
      // Temporarily override the model
      const originalModel = process.env.OPENAI_MODEL;
      process.env.OPENAI_MODEL = model;

      try {
        const response = await OpenAIService.generateAgentResponse(
          agent,
          userMessage,
          conversationHistory as OpenAIService.ChatMessage[]
        );

        return {
          content: response.content,
          tokensUsed: response.tokensUsed,
          finishReason: response.finishReason,
        };
      } finally {
        // Restore original model
        if (originalModel) {
          process.env.OPENAI_MODEL = originalModel;
        }
      }
    } else if (provider === 'anthropic') {
      // Temporarily override the model
      const originalModel = process.env.ANTHROPIC_MODEL;
      process.env.ANTHROPIC_MODEL = model;

      try {
        const response = await AnthropicService.generateAgentResponse(
          agent,
          userMessage,
          conversationHistory
        );

        return {
          content: response.content,
          tokensUsed: response.tokensUsed,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          finishReason: response.finishReason,
        };
      } finally {
        // Restore original model
        if (originalModel) {
          process.env.ANTHROPIC_MODEL = originalModel;
        }
      }
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () =>
            reject(
              Object.assign(new Error('Request timeout'), {
                type: FallbackTrigger.TIMEOUT,
              })
            ),
          timeoutMs
        )
      ),
    ]);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Global fallback engine instance
 */
export const globalFallbackEngine = new FallbackEngine();

/**
 * Execute with automatic fallback (convenience function)
 */
export async function executeWithFallback(
  options: FallbackExecutionOptions
): Promise<FallbackExecutionResult> {
  return globalFallbackEngine.execute(options);
}
