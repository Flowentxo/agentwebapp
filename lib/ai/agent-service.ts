'use server';

/**
 * Level 16 Phase 3: Agent Service with Human-in-the-Loop (HITL)
 * Handles AI response generation for the Inbox system
 *
 * This service:
 * 1. Fetches thread context (agent, messages, knowledge)
 * 2. Builds the conversation history
 * 3. Injects RAG knowledge if available
 * 4. Generates AI response via OpenAI with tool support
 * 5. For SAFE tools: Executes immediately
 * 6. For CRITICAL tools: Pauses and requests approval (HITL)
 * 7. Saves the assistant message to the database
 */

import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

// ============================================================================
// DEBUG LOGGING UTILITIES
// ============================================================================

const AI_DEBUG = true; // Toggle for verbose logging

function debugLog(context: string, message: string, data?: any) {
  if (!AI_DEBUG) return;
  const timestamp = new Date().toISOString();
  console.log(`[AI_DEBUG] [${timestamp}] [${context}] ${message}`);
  if (data !== undefined) {
    try {
      console.log(`[AI_DEBUG]   └─ Data:`, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    } catch {
      console.log(`[AI_DEBUG]   └─ Data: [Unable to stringify]`);
    }
  }
}

function debugError(context: string, message: string, error: any) {
  const timestamp = new Date().toISOString();
  console.error(`[AI_DEBUG] [${timestamp}] [${context}] ERROR: ${message}`);
  console.error(`[AI_DEBUG]   ├─ Error Name: ${error?.name || 'Unknown'}`);
  console.error(`[AI_DEBUG]   ├─ Error Message: ${error?.message || 'No message'}`);
  console.error(`[AI_DEBUG]   ├─ Error Status: ${error?.status || 'N/A'}`);
  console.error(`[AI_DEBUG]   ├─ Error Code: ${error?.code || 'N/A'}`);
  console.error(`[AI_DEBUG]   ├─ Error Type: ${error?.type || 'N/A'}`);
  if (error?.response) {
    try {
      console.error(`[AI_DEBUG]   ├─ Response Status: ${error.response.status}`);
      console.error(`[AI_DEBUG]   ├─ Response Data:`, JSON.stringify(error.response.data, null, 2));
    } catch {
      console.error(`[AI_DEBUG]   ├─ Response: [Unable to stringify]`);
    }
  }
  if (error?.stack) {
    console.error(`[AI_DEBUG]   └─ Stack (first 5 lines):`);
    error.stack.split('\n').slice(0, 5).forEach((line: string) => {
      console.error(`[AI_DEBUG]       ${line}`);
    });
  }
}

function maskApiKey(key: string | undefined): string {
  if (!key) return '<NOT SET>';
  if (key.length <= 8) return '***';
  return `${key.substring(0, 7)}...${key.substring(key.length - 4)}`;
}

// ============================================================================
// HELPER: Get authenticated user ID
// ============================================================================

async function getAuthUserId(): Promise<string | null> {
  try {
    const session = await getSession();
    return session?.user?.id || null;
  } catch {
    return null;
  }
}
import { getAgentById, AgentPersona } from '@/lib/agents/personas';
import { getAgentSystemPrompt } from '@/lib/agents/prompts';
import type { ChatCompletionMessageParam, ChatCompletionTool, ChatCompletionToolChoiceOption } from 'openai/resources/chat/completions';
import type { Message, MessageRole, PendingAction } from '@/actions/inbox-actions';

// Import centralized OpenAI client and config
import { openai } from './openai-client';
import { OPENAI_MODEL, MAX_TOKENS, AI_TEMPERATURE, PRESENCE_PENALTY, FREQUENCY_PENALTY } from './config';

// Import FinOps services
import { BudgetGuard, BudgetExceededError } from './budget-guard';
import { compressConversation, estimateTokens as estimateMemoryTokens } from './memory-service';

// ============================================================================
// Types
// ============================================================================

interface GenerateResponseResult {
  success: boolean;
  message?: Message;
  error?: string;
  errorCode?: 'BUDGET_EXCEEDED' | 'UNAUTHORIZED' | 'THREAD_NOT_FOUND' | 'AI_ERROR' | 'UNKNOWN';
  tokensUsed?: number;
  model?: string;
  costUsd?: number;
  budgetDetails?: {
    currentSpend: number;
    dailyLimit: number;
    remainingBudget: number;
  };
}

interface ToolInvocation {
  id: string;
  name: string;
  args: Record<string, any>;
  result?: any;
  status: 'pending' | 'success' | 'error';
}

// ============================================================================
// Tool Definitions & HITL Configuration
// ============================================================================

/**
 * Tools that require human approval before execution (CRITICAL)
 * These can have significant external effects
 */
const CRITICAL_TOOLS = ['sendEmail', 'sendSlackNotification'] as const;

/**
 * Tools that execute immediately without approval (SAFE)
 * These are read-only or have minimal external impact
 */
const SAFE_TOOLS = ['webSearch'] as const;

/**
 * All available tools for agents
 */
const AGENT_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'webSearch',
      description: 'Search the web for current information. Use this when the user asks about current events, recent news, or information that may have changed since your training data.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to look up',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of results to return (default: 5)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sendEmail',
      description: 'Send an email to a recipient. Use this when the user explicitly asks to send an email.',
      parameters: {
        type: 'object',
        properties: {
          to: {
            type: 'string',
            description: 'Email recipient address',
          },
          subject: {
            type: 'string',
            description: 'Email subject line',
          },
          body: {
            type: 'string',
            description: 'Email body content (supports HTML)',
          },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sendSlackNotification',
      description: 'Send a message to a Slack channel. Use this when the user asks to send a Slack message or notification.',
      parameters: {
        type: 'object',
        properties: {
          channel: {
            type: 'string',
            description: 'Slack channel name (e.g., #general)',
          },
          message: {
            type: 'string',
            description: 'The message content to send',
          },
        },
        required: ['channel', 'message'],
      },
    },
  },
];

/**
 * Check if a tool requires human approval
 */
function isCriticalTool(toolName: string): boolean {
  return CRITICAL_TOOLS.includes(toolName as any);
}

// ============================================================================
// OpenAI Client - Uses centralized singleton from @/lib/ai/openai-client
// ============================================================================

// Note: We now use the centralized `openai` client imported above
// All model configuration comes from @/lib/ai/config

// ============================================================================
// Safe Tool Execution (Immediate)
// ============================================================================

/**
 * Execute a web search using Tavily API
 * This is a SAFE tool that executes immediately without approval
 */
async function executeWebSearch(query: string, maxResults: number = 5): Promise<{ success: boolean; results?: any[]; error?: string }> {
  const tavilyApiKey = process.env.TAVILY_API_KEY;
  if (!tavilyApiKey) {
    console.warn('[AGENT_SERVICE] TAVILY_API_KEY not configured, skipping web search');
    return {
      success: false,
      error: 'Web search is not configured. Please add TAVILY_API_KEY to environment variables.',
    };
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query,
        max_results: maxResults,
        include_answer: true,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[AGENT_SERVICE] Web search executed successfully for:', query);

    return {
      success: true,
      results: data.results?.map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
      })) || [],
    };
  } catch (error: any) {
    console.error('[AGENT_SERVICE] Web search failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to execute web search',
    };
  }
}

// ============================================================================
// Knowledge Base Integration (RAG)
// ============================================================================

/**
 * Fetch relevant knowledge files for the user and agent
 * Returns formatted context string to inject into system prompt
 */
async function getKnowledgeContext(userId: string, agentId?: string): Promise<string> {
  try {
    // Fetch knowledge files for the user
    // In a full implementation, you'd filter by agentId access or use vector similarity search
    const knowledgeFiles = await prisma.knowledgeFile.findMany({
      where: {
        userId,
        // Add agent-specific filtering if needed
        // For now, include all user's knowledge files
      },
      select: {
        name: true,
        content: true,
      },
      take: 5, // Limit to prevent token overflow
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (knowledgeFiles.length === 0) {
      return '';
    }

    // Format knowledge for injection
    const knowledgeContext = knowledgeFiles
      .map((file) => {
        // Truncate long content to prevent token overflow
        const truncatedContent = file.content.length > 2000
          ? file.content.substring(0, 2000) + '...[truncated]'
          : file.content;
        return `### ${file.name}\n${truncatedContent}`;
      })
      .join('\n\n');

    return `
═══════════════════════════════════════════════════════════════════════════
USER'S KNOWLEDGE BASE (Use this information to provide accurate answers)
═══════════════════════════════════════════════════════════════════════════

${knowledgeContext}

═══════════════════════════════════════════════════════════════════════════
`;
  } catch (error) {
    console.error('[AGENT_SERVICE] Failed to fetch knowledge context:', error);
    return '';
  }
}

// ============================================================================
// Message History Formatting
// ============================================================================

/**
 * Convert database messages to OpenAI chat format
 */
function formatMessagesForOpenAI(
  messages: Array<{
    role: string;
    content: string;
    toolInvocations?: any;
  }>
): ChatCompletionMessageParam[] {
  return messages.map((msg) => {
    const role = msg.role.toLowerCase() as 'user' | 'assistant' | 'system';

    // Map TOOL role to assistant (or handle separately if needed)
    const mappedRole = role === 'tool' ? 'assistant' : role;

    return {
      role: mappedRole === 'system' ? 'system' : mappedRole === 'user' ? 'user' : 'assistant',
      content: msg.content,
    } as ChatCompletionMessageParam;
  });
}

// ============================================================================
// Main Agent Response Generation with HITL
// ============================================================================

/**
 * Generate an AI response for a thread with tool support and HITL
 *
 * This function:
 * 1. Loads the thread and validates ownership
 * 2. Gets the agent configuration
 * 3. Loads message history (last 20 messages)
 * 4. Fetches knowledge base for RAG
 * 5. Generates AI response with tool support
 * 6. For SAFE tools (webSearch): Execute immediately and continue
 * 7. For CRITICAL tools (sendEmail, sendSlackNotification): Pause and request approval
 * 8. Saves the assistant message to the database
 *
 * @param threadId - The thread ID to generate a response for
 * @returns The generated message or error
 */
export async function generateAgentResponse(threadId: string): Promise<GenerateResponseResult> {
  debugLog('generateAgentResponse', '═══════════════════════════════════════════════════════════');
  debugLog('generateAgentResponse', 'STARTING AI RESPONSE GENERATION');
  debugLog('generateAgentResponse', '═══════════════════════════════════════════════════════════');
  debugLog('generateAgentResponse', `Thread ID: ${threadId}`);

  // Step 1: Authentication
  debugLog('generateAgentResponse', 'Step 1: Authenticating user...');
  const userId = await getAuthUserId();
  debugLog('generateAgentResponse', `Auth User ID: ${userId || '<NOT AUTHENTICATED>'}`);

  if (!userId) {
    debugLog('generateAgentResponse', 'ABORTING: No user ID - returning Unauthorized');
    return { success: false, error: 'Unauthorized', errorCode: 'UNAUTHORIZED' };
  }

  try {
    // ════════════════════════════════════════════════════════════════════════
    // FINOPS PRE-FLIGHT CHECK: Budget Availability
    // ════════════════════════════════════════════════════════════════════════
    debugLog('generateAgentResponse', 'FinOps Pre-Flight: Checking budget availability...');

    try {
      // Estimate cost for this operation (assume ~500 output tokens for typical response)
      const preFlightEstimate = BudgetGuard.estimateCost(OPENAI_MODEL, '', 500);
      await BudgetGuard.checkBudgetAvailability(userId, preFlightEstimate.estimatedCostUsd);
      debugLog('generateAgentResponse', 'FinOps Pre-Flight: Budget check PASSED');
    } catch (budgetError) {
      if (budgetError instanceof BudgetExceededError) {
        debugLog('generateAgentResponse', 'ABORTING: Budget limit exceeded');
        return {
          success: false,
          error: budgetError.message,
          errorCode: 'BUDGET_EXCEEDED',
          budgetDetails: budgetError.details,
        };
      }
      // Non-budget errors - log but continue (graceful degradation)
      debugLog('generateAgentResponse', 'FinOps Pre-Flight: Budget check failed (non-critical)', budgetError);
    }

    // Step 2: Load the thread with messages
    debugLog('generateAgentResponse', 'Step 2: Loading thread from database...');
    const thread = await prisma.thread.findFirst({
      where: {
        id: threadId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20, // Last 20 messages for context
        },
      },
    });

    if (!thread) {
      debugLog('generateAgentResponse', 'ABORTING: Thread not found in database');
      return { success: false, error: 'Thread not found' };
    }

    debugLog('generateAgentResponse', 'Thread loaded:', {
      threadId: thread.id,
      agentId: thread.agentId,
      messageCount: thread.messages.length,
      status: thread.status,
    });

    // Step 3: Get the agent configuration
    debugLog('generateAgentResponse', 'Step 3: Loading agent configuration...');
    let agent: AgentPersona | undefined;
    let systemPrompt: string;

    if (thread.agentId) {
      agent = getAgentById(thread.agentId);
      debugLog('generateAgentResponse', `Agent found: ${agent?.name || 'NOT FOUND'}`);
    }

    if (agent) {
      // Get the full system prompt for the agent (includes custom prompts if any)
      systemPrompt = await getAgentSystemPrompt(agent, userId);
      debugLog('generateAgentResponse', `System prompt loaded for agent: ${agent.name}`, {
        promptLength: systemPrompt.length,
        promptPreview: systemPrompt.substring(0, 100) + '...',
      });
    } else {
      // Fallback to a generic assistant prompt
      systemPrompt = `You are a helpful AI assistant.
You are having a conversation with the user.
Be helpful, clear, and professional in your responses.
If you don't know something, say so honestly.

You have access to tools for web search, sending emails, and sending Slack notifications.
Use these tools when appropriate to help the user.`;
      debugLog('generateAgentResponse', 'Using generic assistant prompt (no agent specified)');
    }

    // Step 4: Fetch knowledge base for RAG (inject into system prompt)
    debugLog('generateAgentResponse', 'Step 4: Fetching knowledge base (RAG)...');
    const knowledgeContext = await getKnowledgeContext(userId, thread.agentId || undefined);
    if (knowledgeContext) {
      systemPrompt = `${systemPrompt}\n\n${knowledgeContext}`;
      debugLog('generateAgentResponse', 'Knowledge context injected', {
        contextLength: knowledgeContext.length,
      });
    } else {
      debugLog('generateAgentResponse', 'No knowledge context available');
    }

    // Step 5: Format message history for OpenAI
    debugLog('generateAgentResponse', 'Step 5: Formatting message history...');
    const messageHistory = formatMessagesForOpenAI(
      thread.messages.map((m) => ({
        role: m.role,
        content: m.content,
        toolInvocations: m.toolInvocations,
      }))
    );

    debugLog('generateAgentResponse', 'Message history formatted:', {
      historyCount: messageHistory.length,
      messages: messageHistory.map((m, i) => ({
        index: i,
        role: m.role,
        contentPreview: typeof m.content === 'string' ? m.content.substring(0, 50) + '...' : '[non-string]',
      })),
    });

    // Step 6: Build the full messages array
    const openAIMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messageHistory,
    ];

    debugLog('generateAgentResponse', 'Full OpenAI messages prepared:', {
      totalMessages: openAIMessages.length,
      systemPromptLength: systemPrompt.length,
    });

    // ════════════════════════════════════════════════════════════════════════
    // FINOPS PRE-FLIGHT CHECK: Memory Optimization (Auto-Compress)
    // ════════════════════════════════════════════════════════════════════════
    const fullContextText = openAIMessages.map(m => typeof m.content === 'string' ? m.content : '').join('\n');
    const contextTokens = estimateMemoryTokens(fullContextText);

    debugLog('generateAgentResponse', `FinOps Pre-Flight: Context size = ${contextTokens} tokens`);

    // Auto-optimize if context exceeds 4000 tokens (configurable threshold)
    const AUTO_OPTIMIZE_THRESHOLD = 4000;
    if (contextTokens > AUTO_OPTIMIZE_THRESHOLD && thread.agentId) {
      debugLog('generateAgentResponse', `FinOps Pre-Flight: Context exceeds threshold (${contextTokens} > ${AUTO_OPTIMIZE_THRESHOLD}), triggering auto-compression`);

      try {
        // Get workspace ID from thread or use default
        const workspaceId = thread.workspaceId || 'default';

        const compressionResult = await compressConversation(thread.agentId, userId, workspaceId);

        if (compressionResult.success && compressionResult.savedTokens > 0) {
          debugLog('generateAgentResponse', `FinOps Pre-Flight: Compression saved ${compressionResult.savedTokens} tokens`);

          // Reload messages after compression
          const freshThread = await prisma.thread.findFirst({
            where: { id: threadId, userId },
            include: {
              messages: {
                where: {
                  OR: [
                    { metadata: { path: ['archived'], equals: null } },
                    { metadata: { path: ['archived'], equals: false } },
                  ],
                },
                orderBy: { createdAt: 'asc' },
                take: 20,
              },
            },
          });

          if (freshThread) {
            // Update message history with fresh data
            const freshMessageHistory = formatMessagesForOpenAI(
              freshThread.messages.map((m) => ({
                role: m.role,
                content: m.content,
                toolInvocations: m.toolInvocations,
              }))
            );

            // Rebuild openAIMessages with compressed history
            openAIMessages.length = 0;
            openAIMessages.push({ role: 'system', content: systemPrompt });
            openAIMessages.push(...freshMessageHistory);

            debugLog('generateAgentResponse', `FinOps Pre-Flight: Messages reloaded after compression (${openAIMessages.length} messages)`);
          }
        }
      } catch (compressionError) {
        // Non-critical - log but continue without compression
        debugLog('generateAgentResponse', 'FinOps Pre-Flight: Compression failed (non-critical)', compressionError);
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // FINOPS: Final Budget Check with Actual Context Size
    // ════════════════════════════════════════════════════════════════════════
    const finalContextText = openAIMessages.map(m => typeof m.content === 'string' ? m.content : '').join('\n');
    const finalEstimate = BudgetGuard.estimateCost(OPENAI_MODEL, finalContextText, MAX_TOKENS);

    debugLog('generateAgentResponse', `FinOps: Final cost estimate = $${finalEstimate.estimatedCostUsd.toFixed(4)} (${finalEstimate.inputTokens} input + ${finalEstimate.estimatedOutputTokens} output tokens)`);

    try {
      await BudgetGuard.checkBudgetAvailability(userId, finalEstimate.estimatedCostUsd);
    } catch (budgetError) {
      if (budgetError instanceof BudgetExceededError) {
        debugLog('generateAgentResponse', 'ABORTING: Final budget check failed');
        return {
          success: false,
          error: budgetError.message,
          errorCode: 'BUDGET_EXCEEDED',
          budgetDetails: budgetError.details,
        };
      }
    }

    // Step 7: Call OpenAI API with tools
    // Uses centralized config from @/lib/ai/config
    debugLog('generateAgentResponse', 'Step 6: Calling OpenAI API...');
    debugLog('generateAgentResponse', 'API Call Parameters:', {
      model: OPENAI_MODEL,
      maxTokens: MAX_TOKENS,
      temperature: AI_TEMPERATURE,
      toolsAvailable: AGENT_TOOLS.map(t => t.function.name),
      messageCount: openAIMessages.length,
    });

    const apiCallStart = Date.now();

    let response;
    try {
      response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: openAIMessages,
        tools: AGENT_TOOLS,
        tool_choice: 'auto' as ChatCompletionToolChoiceOption,
        temperature: AI_TEMPERATURE,
        max_tokens: MAX_TOKENS,
        presence_penalty: PRESENCE_PENALTY,
        frequency_penalty: FREQUENCY_PENALTY,
      });
    } catch (apiError: any) {
      const apiCallDuration = Date.now() - apiCallStart;
      debugError('generateAgentResponse', `OpenAI API call FAILED after ${apiCallDuration}ms`, apiError);

      // Detailed error analysis
      if (apiError.status === 401) {
        debugLog('generateAgentResponse', 'ERROR DIAGNOSIS: 401 Unauthorized - API key is invalid or expired');
      } else if (apiError.status === 429) {
        debugLog('generateAgentResponse', 'ERROR DIAGNOSIS: 429 Rate Limit - Too many requests or quota exceeded');
      } else if (apiError.status === 404) {
        debugLog('generateAgentResponse', `ERROR DIAGNOSIS: 404 Not Found - Model "${OPENAI_MODEL}" may not exist`);
      } else if (apiError.status === 500) {
        debugLog('generateAgentResponse', 'ERROR DIAGNOSIS: 500 Server Error - OpenAI service issue');
      } else if (apiError.code === 'ENOTFOUND' || apiError.code === 'ECONNREFUSED') {
        debugLog('generateAgentResponse', 'ERROR DIAGNOSIS: Network error - Cannot reach OpenAI servers');
      }

      throw apiError; // Re-throw to be caught by outer catch
    }

    const apiCallDuration = Date.now() - apiCallStart;
    debugLog('generateAgentResponse', `OpenAI API call SUCCEEDED in ${apiCallDuration}ms`);
    debugLog('generateAgentResponse', 'API Response:', {
      id: response.id,
      model: response.model,
      finishReason: response.choices[0]?.finish_reason,
      usage: response.usage,
    });

    const choice = response.choices[0];
    const assistantMessage = choice.message;
    const tokensUsed = response.usage?.total_tokens || 0;

    // Step 8: Handle tool calls
    debugLog('generateAgentResponse', 'Step 7: Processing response...');

    const toolCalls = assistantMessage?.tool_calls || [];
    const toolInvocations: ToolInvocation[] = [];
    let pendingAction: PendingAction | null = null;
    let finalContent = assistantMessage?.content || '';

    debugLog('generateAgentResponse', 'Response content:', {
      hasContent: !!finalContent,
      contentLength: finalContent.length,
      contentPreview: finalContent.substring(0, 100) + (finalContent.length > 100 ? '...' : ''),
      toolCallsCount: toolCalls.length,
    });

    if (toolCalls.length > 0) {
      debugLog('generateAgentResponse', 'Tool calls detected:', toolCalls.length);

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        let toolArgs: Record<string, any>;

        try {
          toolArgs = JSON.parse(toolCall.function.arguments);
        } catch {
          toolArgs = {};
        }

        console.log(`[AGENT_SERVICE] Tool: ${toolName}`, toolArgs);

        if (isCriticalTool(toolName)) {
          // CRITICAL TOOL: Pause for approval (HITL)
          console.log(`[AGENT_SERVICE] Critical tool detected: ${toolName}, requiring approval`);

          pendingAction = {
            id: toolCall.id,
            type: toolName as 'sendEmail' | 'sendSlackNotification',
            data: toolArgs,
            status: 'pending',
          };

          toolInvocations.push({
            id: toolCall.id,
            name: toolName,
            args: toolArgs,
            status: 'pending',
          });

          // Add explanation to the response
          if (!finalContent) {
            if (toolName === 'sendEmail') {
              finalContent = `I'm ready to send an email to **${toolArgs.to}** with the subject "**${toolArgs.subject}**".\n\nPlease review and approve this action below.`;
            } else if (toolName === 'sendSlackNotification') {
              finalContent = `I'm ready to send a Slack message to **${toolArgs.channel}**.\n\nPlease review and approve this action below.`;
            }
          }

          // Only process the first critical tool (stop processing more tools)
          break;
        } else {
          // SAFE TOOL: Execute immediately
          console.log(`[AGENT_SERVICE] Safe tool detected: ${toolName}, executing immediately`);

          let toolResult: any;
          let toolStatus: 'success' | 'error' = 'success';

          if (toolName === 'webSearch') {
            const searchResult = await executeWebSearch(toolArgs.query, toolArgs.maxResults);
            if (searchResult.success) {
              toolResult = searchResult.results;
            } else {
              toolResult = { error: searchResult.error };
              toolStatus = 'error';
            }
          }

          toolInvocations.push({
            id: toolCall.id,
            name: toolName,
            args: toolArgs,
            result: toolResult,
            status: toolStatus,
          });

          // If we have a search result, make a follow-up call to generate the response
          if (toolName === 'webSearch' && toolResult && !toolResult.error) {
            // Add the tool result to messages and call OpenAI again
            const followUpMessages: ChatCompletionMessageParam[] = [
              ...openAIMessages,
              {
                role: 'assistant',
                content: null,
                tool_calls: [toolCall],
              } as ChatCompletionMessageParam,
              {
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(toolResult),
              } as ChatCompletionMessageParam,
            ];

            const followUpResponse = await openai.chat.completions.create({
              model: OPENAI_MODEL,
              messages: followUpMessages,
              temperature: AI_TEMPERATURE,
              max_tokens: MAX_TOKENS,
            });

            finalContent = followUpResponse.choices[0]?.message?.content || '';
          }
        }
      }
    }

    if (!finalContent && !pendingAction) {
      debugLog('generateAgentResponse', 'WARNING: No content and no pending action - returning error');
      return { success: false, error: 'No response generated from AI' };
    }

    // Step 9: Save the assistant message to the database
    debugLog('generateAgentResponse', 'Step 8: Saving message to database...');
    const savedMessage = await prisma.message.create({
      data: {
        threadId,
        role: 'ASSISTANT' as MessageRole,
        content: finalContent,
        toolInvocations: toolInvocations.length > 0 ? toolInvocations : null,
        pendingAction: pendingAction as any,
        tokensUsed,
        model: response.model,
        metadata: {
          finishReason: choice.finish_reason,
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
        },
      },
    });

    // 9. Update thread's lastMessageAt, preview, and status
    await prisma.thread.update({
      where: { id: threadId },
      data: {
        lastMessageAt: new Date(),
        preview: finalContent.slice(0, 100),
        // Set to PENDING_APPROVAL if there's a pending action
        ...(pendingAction ? { status: 'PENDING_APPROVAL' } : {}),
      },
    });

    // ════════════════════════════════════════════════════════════════════════
    // FINOPS POST-EXECUTION: Record Actual Spending
    // ════════════════════════════════════════════════════════════════════════
    const promptTokens = response.usage?.prompt_tokens || 0;
    const completionTokens = response.usage?.completion_tokens || 0;
    const actualCostUsd = BudgetGuard.calculateActualCost(
      response.model,
      promptTokens,
      completionTokens
    );

    debugLog('generateAgentResponse', `FinOps Post-Execution: Recording spend = $${actualCostUsd.toFixed(4)}`);

    try {
      await BudgetGuard.recordSpending(userId, {
        agentId: thread.agentId || 'unknown',
        model: response.model,
        promptTokens,
        completionTokens,
        totalTokens: tokensUsed,
        costUsd: actualCostUsd,
        metadata: {
          threadId,
          finishReason: choice.finish_reason,
          hasToolCalls: toolCalls.length > 0,
        },
      });
      debugLog('generateAgentResponse', 'FinOps Post-Execution: Spending recorded successfully');
    } catch (recordError) {
      // Non-critical - log but don't fail the response
      debugLog('generateAgentResponse', 'FinOps Post-Execution: Failed to record spending (non-critical)', recordError);
    }

    debugLog('generateAgentResponse', 'Message saved to database:', {
      messageId: savedMessage.id,
      contentLength: savedMessage.content.length,
      hasToolInvocations: !!savedMessage.toolInvocations,
      hasPendingAction: !!savedMessage.pendingAction,
    });

    debugLog('generateAgentResponse', '═══════════════════════════════════════════════════════════');
    debugLog('generateAgentResponse', 'AI RESPONSE GENERATION COMPLETED SUCCESSFULLY');
    debugLog('generateAgentResponse', '═══════════════════════════════════════════════════════════');
    debugLog('generateAgentResponse', 'Summary:', {
      tokensUsed,
      model: response.model,
      responseLength: finalContent.length,
      pendingAction: pendingAction?.type || null,
      actualCostUsd,
    });

    return {
      success: true,
      message: {
        id: savedMessage.id,
        threadId: savedMessage.threadId,
        role: savedMessage.role as MessageRole,
        content: savedMessage.content,
        toolInvocations: savedMessage.toolInvocations as ToolInvocation[] | null,
        pendingAction: savedMessage.pendingAction as PendingAction | null,
        tokensUsed: savedMessage.tokensUsed,
        model: savedMessage.model,
        metadata: savedMessage.metadata,
        createdAt: savedMessage.createdAt,
      },
      tokensUsed,
      costUsd: actualCostUsd,
      model: response.model,
    };
  } catch (error: any) {
    debugLog('generateAgentResponse', '═══════════════════════════════════════════════════════════');
    debugLog('generateAgentResponse', 'AI RESPONSE GENERATION FAILED');
    debugLog('generateAgentResponse', '═══════════════════════════════════════════════════════════');
    debugError('generateAgentResponse', 'Error during response generation', error);

    // Handle specific OpenAI errors with detailed logging
    if (error.status === 401) {
      debugLog('generateAgentResponse', 'Returning: Invalid OpenAI API key');
      return { success: false, error: 'Invalid OpenAI API key. Please check your configuration.' };
    }
    if (error.status === 429) {
      debugLog('generateAgentResponse', 'Returning: Rate limit exceeded');
      return { success: false, error: 'Rate limit exceeded. Please wait a moment and try again.' };
    }
    if (error.status === 500) {
      debugLog('generateAgentResponse', 'Returning: OpenAI service unavailable');
      return { success: false, error: 'OpenAI service is temporarily unavailable. Please try again later.' };
    }
    if (error.status === 404) {
      debugLog('generateAgentResponse', 'Returning: Model not found');
      return { success: false, error: `Model not found. Please check OPENAI_MODEL configuration.` };
    }

    const errorMessage = error.message || 'Failed to generate AI response';
    debugLog('generateAgentResponse', `Returning: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================================================
// Approved Tool Execution (HITL)
// ============================================================================

/**
 * Execute an approved tool call
 * Called after user approves a pending action
 */
export async function executeApprovedTool(
  pendingAction: PendingAction
): Promise<{ success: boolean; result?: any; error?: string }> {
  console.log('[AGENT_SERVICE] Executing approved tool:', pendingAction.type);

  try {
    switch (pendingAction.type) {
      case 'sendEmail':
        return await executeSendEmail(pendingAction.data);
      case 'sendSlackNotification':
        return await executeSendSlack(pendingAction.data);
      default:
        return {
          success: false,
          error: `Unknown tool type: ${pendingAction.type}`,
        };
    }
  } catch (error: any) {
    console.error('[AGENT_SERVICE] Tool execution failed:', error);
    return {
      success: false,
      error: error.message || 'Tool execution failed',
    };
  }
}

/**
 * Execute send email action using Gmail OAuth
 * Falls back to Resend if Gmail is not connected
 */
async function executeSendEmail(data: { to: string; subject: string; body: string }): Promise<{ success: boolean; result?: any; error?: string }> {
  // Get user ID from session
  const userId = await getAuthUserId();
  if (!userId) {
    return {
      success: false,
      error: 'Authentication required. Please log in to send emails.',
    };
  }

  // Try Gmail OAuth first
  try {
    const { gmailOAuthService } = await import('@/server/services/GmailOAuthService');

    const result = await gmailOAuthService.sendEmail(userId, {
      to: data.to,
      subject: data.subject,
      body: data.body,
    });

    if (result.success) {
      console.log('[AGENT_SERVICE] Email sent via Gmail:', result.messageId);
      return {
        success: true,
        result: { sent: true, id: result.messageId, to: data.to, provider: 'gmail' },
      };
    }

    // Check for auth-related errors and provide helpful message
    if (result.error?.includes('not connected') ||
        result.error?.includes('token invalid') ||
        result.error?.includes('reconnect')) {
      console.error('[AGENT_SERVICE] Gmail auth error:', result.error);
      return {
        success: false,
        error: 'Gmail not connected. Please go to Settings → Integrations and reconnect your Gmail account.',
      };
    }

    // Other Gmail errors - log but try fallback
    console.error('[AGENT_SERVICE] Gmail send failed:', result.error);
  } catch (gmailError: any) {
    console.error('[AGENT_SERVICE] Gmail service error:', gmailError.message);

    // Check for decryption/auth errors
    if (gmailError.message?.includes('decrypt') ||
        gmailError.message?.includes('token') ||
        gmailError.message?.includes('reconnect')) {
      return {
        success: false,
        error: 'Gmail authentication failed. Please go to Settings → Integrations and reconnect your Gmail account.',
      };
    }
  }

  // Fallback to Resend if available
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(resendApiKey);

      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@sintra.ai';

      const result = await resend.emails.send({
        from: fromEmail,
        to: data.to,
        subject: data.subject,
        html: data.body,
      });

      console.log('[AGENT_SERVICE] Email sent via Resend (fallback):', result);
      return {
        success: true,
        result: { sent: true, id: result.data?.id, to: data.to, provider: 'resend' },
      };
    } catch (resendError: any) {
      console.error('[AGENT_SERVICE] Resend fallback failed:', resendError);
    }
  }

  // Both methods failed
  return {
    success: false,
    error: 'Email service not available. Please connect Gmail in Settings → Integrations, or contact support.',
  };
}

/**
 * Execute send Slack notification action
 */
async function executeSendSlack(data: { channel: string; message: string }): Promise<{ success: boolean; result?: any; error?: string }> {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhookUrl) {
    return {
      success: false,
      error: 'Slack integration not configured. Please add SLACK_WEBHOOK_URL to environment variables.',
    };
  }

  try {
    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: data.channel,
        text: data.message,
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }

    console.log('[AGENT_SERVICE] Slack notification sent successfully');
    return {
      success: true,
      result: { posted: true, channel: data.channel },
    };
  } catch (error: any) {
    console.error('[AGENT_SERVICE] Slack notification failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to send Slack notification',
    };
  }
}

// ============================================================================
// Streaming Support (Future Enhancement)
// ============================================================================

/**
 * Generate a streaming response for real-time UI updates
 * This is a placeholder for future streaming support via WebSocket/SSE
 */
export async function* generateAgentResponseStream(
  threadId: string
): AsyncGenerator<{ type: 'chunk' | 'done' | 'error'; content?: string; error?: string }> {
  const userId = await getAuthUserId();
  if (!userId) {
    yield { type: 'error', error: 'Unauthorized' };
    return;
  }

  // Future: Implement streaming response
  // For now, generate the full response and yield it as a single chunk
  const result = await generateAgentResponse(threadId);

  if (result.success && result.message) {
    yield { type: 'chunk', content: result.message.content };
    yield { type: 'done' };
  } else {
    yield { type: 'error', error: result.error || 'Unknown error' };
  }
}
