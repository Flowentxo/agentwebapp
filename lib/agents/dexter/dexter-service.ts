/**
 * Dexter Financial Analyst Agent Service
 *
 * TypeScript implementation of Dexter using OpenAI GPT-4 with function calling
 * Integrates with SINTRA AI Agent System
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { createOpenAIClient, DEXTER_OPENAI_CONFIG, DEXTER_METADATA } from './config';
import { DEXTER_SYSTEM_PROMPT } from './prompts';
import { calculateROI, type ROIInput } from './tools/roi-calculator';
import { DEXTER_TOOLS } from './tools/function-definitions';

/**
 * Message in conversation history
 */
export interface DexterMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
}

/**
 * Dexter Service Class
 */
export class DexterService {
  private client: OpenAI;
  private conversationHistory: ChatCompletionMessageParam[] = [];
  private tools: ChatCompletionTool[];

  constructor() {
    this.client = createOpenAIClient();
    this.tools = DEXTER_TOOLS;

    console.log('[Dexter] Service initialized with OpenAI');
    console.log(`[Dexter] Model: ${DEXTER_OPENAI_CONFIG.model}`);
    console.log(`[Dexter] Tools registered: ${this.tools.length}`);
  }

  /**
   * Execute tool by name
   */
  private async executeTool(toolName: string, toolInput: any): Promise<any> {
    console.log(`[Dexter] Executing tool: ${toolName}`);
    console.log('[Dexter] Tool input:', JSON.stringify(toolInput, null, 2));

    try {
      switch (toolName) {
        case 'calculate_roi':
          return await calculateROI(toolInput as ROIInput);

        // Future tools:
        // case 'forecast_sales':
        //   return await forecastSales(toolInput);
        // case 'calculate_pnl':
        //   return await calculatePNL(toolInput);
        // etc.

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      console.error(`[Dexter] Tool execution error:`, error);
      return {
        error: error instanceof Error ? error.message : String(error),
        tool_name: toolName,
      };
    }
  }

  /**
   * Send message to Dexter and get streaming response
   */
  async *chat(userMessage: string): AsyncGenerator<string, void, unknown> {
    console.log(`[Dexter] User message: ${userMessage.substring(0, 100)}...`);

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    let isComplete = false;
    let iterationCount = 0;
    const maxIterations = 5; // Prevent infinite loops

    while (!isComplete && iterationCount < maxIterations) {
      iterationCount++;
      console.log(`[Dexter] Iteration ${iterationCount}`);

      try {
        // Create chat completion with function calling
        const response = await this.client.chat.completions.create({
          model: DEXTER_OPENAI_CONFIG.model,
          messages: [
            { role: 'system', content: DEXTER_SYSTEM_PROMPT },
            ...this.conversationHistory,
          ],
          tools: this.tools,
          tool_choice: 'auto',
          temperature: DEXTER_OPENAI_CONFIG.temperature,
          max_tokens: DEXTER_OPENAI_CONFIG.maxTokens,
          stream: false, // We'll implement streaming in the next iteration
        });

        const choice = response.choices[0];
        const message = choice.message;

        // Check if tool calls are present
        if (message.tool_calls && message.tool_calls.length > 0) {
          console.log(`[Dexter] ${message.tool_calls.length} tool call(s) detected`);

          // Add assistant message with tool calls to history
          this.conversationHistory.push({
            role: 'assistant',
            content: message.content,
            tool_calls: message.tool_calls,
          });

          // Execute each tool call
          for (const toolCall of message.tool_calls) {
            const toolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments);

            yield `\n\n[🔧 Verwende Tool: ${toolName}]\n\n`;

            // Execute the tool
            const toolResult = await this.executeTool(toolName, toolArgs);

            // Show formatted output if available
            if (toolResult.formatted_output) {
              yield toolResult.formatted_output;
            }

            // Add tool result to conversation
            this.conversationHistory.push({
              role: 'tool',
              content: JSON.stringify(toolResult),
              tool_call_id: toolCall.id,
            });
          }

          // Continue to next iteration to get final response
          continue;
        }

        // No tool calls, return the assistant's text response
        if (message.content) {
          this.conversationHistory.push({
            role: 'assistant',
            content: message.content,
          });

          yield message.content;
        }

        isComplete = true;
      } catch (error) {
        console.error('[Dexter] Chat error:', error);

        if (error instanceof OpenAI.APIError) {
          yield `\n\n❌ API Error: ${error.message}\n`;
          yield `Status: ${error.status}\n`;
        } else {
          yield `\n\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`;
        }

        isComplete = true;
      }
    }

    if (iterationCount >= maxIterations) {
      yield `\n\n⚠️ Maximum iterations reached. Response may be incomplete.\n`;
    }

    console.log('[Dexter] Response complete');
  }

  /**
   * Reset conversation history
   */
  resetConversation(): void {
    this.conversationHistory = [];
    console.log('[Dexter] Conversation reset');
  }

  /**
   * Get agent metadata
   */
  getMetadata() {
    return DEXTER_METADATA;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      // Simple ping to OpenAI API
      const response = await this.client.chat.completions.create({
        model: DEXTER_OPENAI_CONFIG.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 10,
      });

      return {
        status: 'healthy',
        details: {
          provider: 'OpenAI',
          model: DEXTER_OPENAI_CONFIG.model,
          tools: this.tools.length,
          conversationLength: this.conversationHistory.length,
          lastResponse: response.choices[0]?.finish_reason,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          provider: 'OpenAI',
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}

/**
 * Singleton instance
 */
let dexterInstance: DexterService | null = null;

/**
 * Get Dexter service instance
 */
export function getDexterService(): DexterService {
  if (!dexterInstance) {
    dexterInstance = new DexterService();
  }
  return dexterInstance;
}
