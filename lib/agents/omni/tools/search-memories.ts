/**
 * Search Agent Memories Tool
 *
 * Enables Omni to search across all agents' memories
 * for cross-agent context and knowledge retrieval.
 */

import { agentMemoryService } from '@/server/services/AgentMemoryService';

export interface SearchMemoriesInput {
  query: string;
  agent_filter?: string;
  limit?: number;
}

export interface SearchMemoriesResult {
  query: string;
  total_found: number;
  memories: Array<{
    agent_id: string | null;
    category: string | null;
    content: string;
    source: string | null;
    created_at: Date | null;
    similarity?: number;
  }>;
  formatted_output: string;
}

export const SEARCH_MEMORIES_TOOL = {
  name: 'search_agent_memories',
  description: 'Suche in den Erinnerungen aller Agenten nach relevantem Kontext. Nutze dies um Ergebnisse frueherer Agent-Interaktionen zu finden, cross-agent Wissen abzurufen oder vergangene Analysen/Ergebnisse nachzuschlagen.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Suchanfrage fuer semantische Suche in Agent-Erinnerungen' },
      agent_filter: { type: 'string', description: 'Optional: nur Erinnerungen eines bestimmten Agenten (z.B. dexter, kai, lex, nova, emmie)' },
      limit: { type: 'number', description: 'Maximale Anzahl Ergebnisse (default: 5, max: 20)' },
    },
    required: ['query'],
  },
};

export async function searchAgentMemories(
  input: SearchMemoriesInput,
  userId: string
): Promise<SearchMemoriesResult> {
  const { query, agent_filter, limit = 5 } = input;
  const effectiveLimit = Math.min(limit, 20);

  try {
    const memories = await agentMemoryService.searchCrossAgentMemories(
      userId,
      query,
      effectiveLimit,
      agent_filter
    );

    const formattedMemories = memories.map(m => ({
      agent_id: m.agentId,
      category: m.category,
      content: m.content,
      source: m.source,
      created_at: m.createdAt,
      similarity: (m as any).similarity,
    }));

    const agentEmoji: Record<string, string> = {
      dexter: '📊', kai: '💻', lex: '⚖️', nova: '🔍', buddy: '📋',
      emmie: '📧', cassie: '🎧', vera: '🔒', ari: '⚙️', aura: '📣',
      vince: '🎬', milo: '🎨', echo: '🎙️', finn: '💰', omni: '🌐',
    };

    const formatted = formattedMemories.length > 0
      ? [
          `🧠 **${formattedMemories.length} Erinnerungen gefunden** ${agent_filter ? `(${agent_filter})` : '(alle Agenten)'}`,
          '',
          ...formattedMemories.map((m, i) => {
            const emoji = agentEmoji[m.agent_id || ''] || '🤖';
            const sim = m.similarity ? ` (${(m.similarity * 100).toFixed(0)}% relevant)` : '';
            return `${i + 1}. ${emoji} **[${m.agent_id}]** [${m.category}] ${m.content.slice(0, 300)}${sim}`;
          }),
        ].join('\n')
      : `🧠 Keine Erinnerungen gefunden fuer: "${query}"`;

    return {
      query,
      total_found: formattedMemories.length,
      memories: formattedMemories,
      formatted_output: formatted,
    };
  } catch (error: any) {
    return {
      query,
      total_found: 0,
      memories: [],
      formatted_output: `❌ Erinnerungssuche fehlgeschlagen: ${error.message}`,
    };
  }
}
