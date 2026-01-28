/**
 * Hook for accessing complete (production-ready) agents
 * Respects env flag
 */

'use client';

import { useMemo } from 'react';
import { filterCompleteAgents } from './selectors';

/**
 * Agent-like type that has a buildStatus property
 */
interface AgentLike {
  buildStatus?: string;
  [key: string]: any;
}

/**
 * Hook that returns only complete agents based on env flag
 *
 * @param agents - Full list of agents
 * @returns Filtered list of complete agents
 */
export function useCompleteAgents<T extends AgentLike>(agents: T[]): T[] {
  const filteredAgents = useMemo(() => {
    // Check env flag (default to true = only show complete)
    const onlyCompleteEnabled =
      process.env.NEXT_PUBLIC_ONLY_COMPLETE_AGENTS !== 'false';

    if (!onlyCompleteEnabled) {
      return agents;
    }

    return filterCompleteAgents(agents);
  }, [agents]);

  return filteredAgents;
}
