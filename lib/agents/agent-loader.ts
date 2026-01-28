/**
 * AGENT LOADER
 *
 * Unified loader for both built-in and custom agents
 */

import { getAgentById, type AgentPersona } from './personas';
import { getDb } from '@/lib/db/connection';
import { customAgents } from '@/lib/db/schema-custom-agents';
import { eq } from 'drizzle-orm';

/**
 * Check if ID is a UUID (custom agent) or slug (built-in)
 */
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Load agent (custom or built-in)
 * Returns AgentPersona format for both types
 */
export async function loadAgent(agentId: string): Promise<AgentPersona | null> {
  try {
    // Check if custom agent (UUID) or built-in (slug)
    if (isUUID(agentId)) {
      // Load custom agent from database
      const db = getDb();
      const [customAgent] = await db
        .select()
        .from(customAgents)
        .where(eq(customAgents.id, agentId))
        .limit(1);

      if (!customAgent) {
        return null;
      }

      // Transform custom agent to AgentPersona format
      const personaAgent: AgentPersona = {
        id: customAgent.id,
        name: customAgent.name,
        role: customAgent.description || 'Custom AI Agent',
        bio: customAgent.systemInstructions || '',
        icon: customAgent.icon || '🤖',
        color: customAgent.color || '#3B82F6',
        specialties: customAgent.conversationStarters || [],
        emoji: customAgent.icon || '🤖',
        // Add custom agent metadata
        _customAgent: {
          model: customAgent.model || 'gpt-5.1',
          temperature: parseFloat(customAgent.temperature || '0.7'),
          maxTokens: parseInt(customAgent.maxTokens || '4000'),
          capabilities: customAgent.capabilities,
        },
      };

      return personaAgent;
    } else {
      // Load built-in persona
      return (await getAgentById(agentId)) || null;
    }
  } catch (error) {
    console.error('[AGENT_LOADER] Failed to load agent:', error);
    return null;
  }
}

/**
 * Get agent model settings (for custom agents)
 */
export function getAgentModelSettings(agent: AgentPersona): {
  model: string;
  temperature: number;
  maxTokens: number;
} {
  // Check if custom agent with settings
  if ('_customAgent' in agent && agent._customAgent) {
    return {
      model: agent._customAgent.model || 'gpt-5.1',
      temperature: agent._customAgent.temperature || 0.7,
      maxTokens: agent._customAgent.maxTokens || 4000,
    };
  }

  // Default settings for built-in agents
  return {
    model: process.env.OPENAI_MODEL || 'gpt-5.1',
    temperature: 0.7,
    maxTokens: 4000,
  };
}
