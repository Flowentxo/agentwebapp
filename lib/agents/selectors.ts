/**
 * Agent selectors and filters
 * Central logic for determining which agents are "complete" and ready for production use
 */

import { type Agent } from '@/components/agents/AgentsTable';

/**
 * Determines if an agent is "complete" (fertig gebaut) and ready for production
 *
 * Priority:
 * 1. Explicit API flags (buildStatus, state, isComplete)
 * 2. Fallback heuristic (only if no API flag exists)
 *
 * @param agent - Agent to check
 * @returns true if agent is complete and ready
 */
export function isAgentComplete(agent: Agent | null | undefined): boolean {
  if (!agent) return false;

  // Explicit disabled check
  if (agent.enabled === false) return false;

  // Check explicit API flags first (primary source of truth)
  const hasExplicitFlag =
    agent.buildStatus !== undefined ||
    agent.state !== undefined ||
    agent.isComplete !== undefined;

  if (hasExplicitFlag) {
    return (
      agent.buildStatus === 'complete' ||
      agent.state === 'ready' ||
      agent.isComplete === true
    );
  }

  // Fallback heuristic (only when no explicit flags exist)
  // An agent is considered complete if it has:
  // - A primary endpoint
  // - High uptime (>= 90%)
  // - Valid success rate
  // - At least one tool
  // - A version number
  const hasEndpoint = !!agent.endpoints?.primary;
  const hasHighUptime = (agent.health?.uptimePct ?? 0) >= 90;
  const hasSuccessRate = typeof agent.successRate === 'number' && agent.successRate >= 0;
  const hasTools = Array.isArray(agent.tools) && agent.tools.length > 0;
  const hasVersion = !!agent.version && agent.version.length > 0;

  return (
    hasEndpoint &&
    hasHighUptime &&
    hasSuccessRate &&
    hasTools &&
    hasVersion
  );
}

/**
 * Filters a list of agents to only include complete ones
 *
 * @param agents - Array of agents to filter
 * @returns Filtered array containing only complete agents
 */
export function filterCompleteAgents<T extends { buildStatus?: string; [key: string]: any }>(agents: T[]): T[] {
  return agents.filter((agent) => isAgentComplete(agent as any)) as T[];
}

/**
 * Counts agents by status (healthy, degraded, error) from a filtered list
 *
 * @param agents - Array of agents (should already be filtered if needed)
 * @returns Object with counts per status
 */
export function countAgentsByStatus(agents: Agent[]): {
  healthy: number;
  degraded: number;
  error: number;
} {
  return {
    healthy: agents.filter((a) => a.status === 'healthy').length,
    degraded: agents.filter((a) => a.status === 'degraded').length,
    error: agents.filter((a) => a.status === 'error').length,
  };
}
