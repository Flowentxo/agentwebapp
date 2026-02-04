/**
 * Extract @-mention from user message
 *
 * Supports: @Dexter, @dexter, @Kai, etc.
 * Returns the matched agent or null if no valid mention found.
 */

import { agentPersonas, getAgentById } from '../../lib/agents/personas';

interface MentionedAgent {
  id: string;
  name: string;
}

/**
 * Extract the first valid @AgentName mention from a message.
 * Matches against known agent names (case-insensitive).
 */
export function extractMentionedAgent(message: string): MentionedAgent | null {
  // Match @word patterns
  const mentionRegex = /@(\w+)/g;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(message)) !== null) {
    const mentionName = match[1].toLowerCase();

    // Try exact ID match first
    const agentById = getAgentById(mentionName);
    if (agentById) {
      return { id: agentById.id, name: agentById.name };
    }

    // Try name match (case-insensitive)
    const agentByName = agentPersonas.find(
      (a) => a.name.toLowerCase() === mentionName
    );
    if (agentByName) {
      return { id: agentByName.id, name: agentByName.name };
    }
  }

  return null;
}

/**
 * Strip @mention from message content for cleaner AI processing.
 */
export function stripMention(message: string): string {
  return message.replace(/@(\w+)\s?/, '').trim();
}
