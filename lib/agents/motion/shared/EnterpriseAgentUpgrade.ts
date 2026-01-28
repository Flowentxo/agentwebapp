/**
 * EnterpriseAgentUpgrade - Shared utilities for upgrading Motion agents
 *
 * This module provides common functionality for upgrading all Motion agents
 * to use AI-powered enterprise tools.
 */

import { motionAI } from '../services/MotionAIService';
import { memoryService } from '../services/MemoryService';
import type { MotionAgentContext, MotionAgentId } from './types';

/**
 * Build enriched context for AI-powered agent responses
 */
export async function buildEnrichedAgentContext(
  agentId: MotionAgentId,
  context: {
    userId?: string;
    workspaceId?: string;
    sessionId?: string;
  },
  baseSystemPrompt: string
): Promise<string> {
  const memoryContext = await memoryService.buildAgentContext({
    userId: context.userId || 'default-user',
    workspaceId: context.workspaceId || 'default-workspace',
    agentId,
  });

  return `${baseSystemPrompt}

USER CONTEXT:
- User Profile: ${memoryContext.userProfile.name || 'Unknown User'}
- Communication Style: ${memoryContext.userProfile.communicationStyle || 'professional'}
- Recent Context: ${memoryContext.contextSummary || 'No recent context'}
${memoryContext.userProfile.preferences ? `- Preferences: ${JSON.stringify(memoryContext.userProfile.preferences)}` : ''}`;
}

/**
 * Generate AI response with context enrichment and memory storage
 */
export async function generateEnterpriseResponse(
  agentId: MotionAgentId,
  message: string,
  systemPrompt: string,
  context: {
    userId?: string;
    workspaceId?: string;
    sessionId?: string;
  },
  conversationHistory?: Array<{ role: string; content: string }>,
  options?: {
    style?: 'professional' | 'creative' | 'technical' | 'friendly';
  }
): Promise<{
  content: string;
  tokensUsed: number;
}> {
  // Build enriched system prompt
  const enrichedPrompt = await buildEnrichedAgentContext(agentId, context, systemPrompt);

  // Generate AI response
  const aiResponse = await motionAI.generateContent(message, enrichedPrompt, {
    style: options?.style || 'professional',
    format: 'text',
  });

  // Store conversation in memory
  await memoryService.storeConversation(
    {
      userId: context.userId || 'default-user',
      workspaceId: context.workspaceId || 'default-workspace',
      agentId,
    },
    context.sessionId || crypto.randomUUID(),
    [
      ...(conversationHistory || []),
      { role: 'user', content: message },
      { role: 'assistant', content: aiResponse.content },
    ]
  );

  return {
    content: aiResponse.content,
    tokensUsed: aiResponse.metadata.tokensUsed,
  };
}

/**
 * Standard enterprise tool execution wrapper
 */
export async function executeEnterpriseTool<TInput, TOutput>(
  agentId: MotionAgentId,
  toolName: string,
  input: TInput,
  context: MotionAgentContext,
  executor: (
    input: TInput,
    ai: typeof motionAI,
    memory: typeof memoryService
  ) => Promise<TOutput>
): Promise<TOutput> {
  console.log(`[${agentId.toUpperCase()}] Executing enterprise tool: ${toolName}`);

  const startTime = Date.now();

  try {
    const result = await executor(input, motionAI, memoryService);

    console.log(
      `[${agentId.toUpperCase()}] Tool ${toolName} completed in ${Date.now() - startTime}ms`
    );

    return result;
  } catch (error) {
    console.error(`[${agentId.toUpperCase()}] Tool ${toolName} failed:`, error);
    throw error;
  }
}

/**
 * Create standard agent metadata response
 */
export function createAgentMetadata(
  agentId: string,
  startTime: number,
  tokensUsed?: number
): Record<string, unknown> {
  return {
    agentId,
    executionTimeMs: Date.now() - startTime,
    toolsUsed: [],
    correlationId: crypto.randomUUID(),
    tokensUsed,
    model: 'enterprise-ai',
    version: '2.0.0-enterprise',
  };
}

export default {
  buildEnrichedAgentContext,
  generateEnterpriseResponse,
  executeEnterpriseTool,
  createAgentMetadata,
};
