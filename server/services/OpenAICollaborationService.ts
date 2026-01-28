/**
 * OpenAI Service for Agent Collaboration
 * Uses centralized OpenAI client from @/lib/ai/openai-client
 */

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { getAgentPrompt } from '@/lib/agents/collaboration-prompts';

// Import centralized client and config
import { openai } from '@/lib/ai/openai-client';
import { OPENAI_MODEL, AI_TEMPERATURE, PRESENCE_PENALTY, FREQUENCY_PENALTY } from '@/lib/ai/config';

const COLLAB_MAX_TOKENS = 500; // Keep responses concise for collaboration

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AgentResponse {
  content: string;
  tokensUsed: number;
  model: string;
  confidence: number;
  latencyMs: number;
}

/**
 * Generate agent response using centralized OpenAI client
 */
export async function generateAgentResponse(
  agentId: string,
  taskDescription: string,
  conversationHistory: AgentMessage[] = []
): Promise<AgentResponse> {
  const startTime = Date.now();

  try {
    // Get agent-specific prompt
    const agentConfig = getAgentPrompt(agentId);
    if (!agentConfig) {
      throw new Error(`Unknown agent: ${agentId}`);
    }

    // Build messages array
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: agentConfig.systemPrompt
      },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })) as ChatCompletionMessageParam[],
      {
        role: 'user',
        content: `Task: ${taskDescription}\n\nProvide your perspective as ${agentConfig.name}. Keep your response focused and concise (2-4 sentences).`
      }
    ];

    // Call OpenAI using centralized client
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      temperature: agentConfig.temperature || AI_TEMPERATURE,
      max_tokens: COLLAB_MAX_TOKENS,
      presence_penalty: PRESENCE_PENALTY,
      frequency_penalty: 0.3
    });

    const choice = response.choices[0];
    const latencyMs = Date.now() - startTime;

    // Calculate confidence (simplified)
    const confidence = choice.finish_reason === 'stop' ? 90 : 70;

    return {
      content: choice.message?.content || '',
      tokensUsed: response.usage?.total_tokens || 0,
      model: OPENAI_MODEL,
      confidence,
      latencyMs
    };

  } catch (error) {
    console.error(`[OPENAI_ERROR] Agent ${agentId}:`, error);
    throw error;
  }
}

/**
 * Analyze task and select relevant agents using centralized OpenAI client
 */
export async function analyzeTaskAndSelectAgents(
  taskDescription: string
): Promise<{
  selectedAgentIds: string[];
  reasoning: string;
  complexity: number;
}> {
  const startTime = Date.now();

  try {
    const systemPrompt = `You are an AI task analyzer. Given a task description, identify which specialized agents would be most helpful.

Available Agents:
- dexter: Data Analyst (data, analytics, metrics, trends)
- cassie: Customer Support (customer service, communication, support)
- emmie: Marketing Strategist (marketing, campaigns, branding, strategy)
- kai: Technical Developer (code, technical, development, systems)
- lex: Legal Advisor (legal, compliance, contracts, regulations)
- finn: Finance Analyst (finance, budget, costs, ROI)
- aura: Workflow Orchestrator (process, coordination, workflows)

Respond with a JSON object:
{
  "agents": ["agent1", "agent2", ...],
  "reasoning": "Brief explanation",
  "complexity": 1-10
}

Select 2-4 most relevant agents. Consider the task's domain and what expertise is needed.`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Task: ${taskDescription}` }
      ],
      temperature: 0.5,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message?.content || '{}';
    const parsed = JSON.parse(content);

    console.log('[AGENT_SELECTION]', {
      task: taskDescription.substring(0, 50),
      selected: parsed.agents,
      reasoning: parsed.reasoning,
      latencyMs: Date.now() - startTime
    });

    return {
      selectedAgentIds: parsed.agents || ['aura', 'emmie'],
      reasoning: parsed.reasoning || 'Default selection',
      complexity: parsed.complexity || 5
    };

  } catch (error) {
    console.error('[AGENT_SELECTION_ERROR]', error);
    // Fallback to default agents
    return {
      selectedAgentIds: ['aura', 'emmie'],
      reasoning: 'Fallback: Using default agents due to analysis error',
      complexity: 5
    };
  }
}

/**
 * Generate follow-up message based on previous messages
 */
export async function generateFollowUpMessage(
  agentId: string,
  taskDescription: string,
  previousMessages: Array<{ agentName: string; content: string }>
): Promise<AgentResponse> {
  const startTime = Date.now();

  try {
    const agentConfig = getAgentPrompt(agentId);
    if (!agentConfig) {
      throw new Error(`Unknown agent: ${agentId}`);
    }

    // Build conversation context
    const conversationContext = previousMessages
      .map(msg => `${msg.agentName}: ${msg.content}`)
      .join('\n\n');

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: agentConfig.systemPrompt
      },
      {
        role: 'user',
        content: `Task: ${taskDescription}\n\nPrevious discussion:\n${conversationContext}\n\nProvide your follow-up perspective as ${agentConfig.name}. Build on what others have said. Keep it concise (2-3 sentences).`
      }
    ];

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      temperature: agentConfig.temperature || AI_TEMPERATURE,
      max_tokens: COLLAB_MAX_TOKENS,
      presence_penalty: 0.8,
      frequency_penalty: 0.5
    });

    const choice = response.choices[0];
    const latencyMs = Date.now() - startTime;

    return {
      content: choice.message?.content || '',
      tokensUsed: response.usage?.total_tokens || 0,
      model: OPENAI_MODEL,
      confidence: choice.finish_reason === 'stop' ? 85 : 70,
      latencyMs
    };

  } catch (error) {
    console.error(`[OPENAI_FOLLOWUP_ERROR] Agent ${agentId}:`, error);
    throw error;
  }
}
