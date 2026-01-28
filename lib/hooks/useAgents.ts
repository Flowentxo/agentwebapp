/**
 * Centralized hook for fetching agents with React-Query
 * Prevents duplicate API calls and provides caching
 */

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface Agent {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'ok' | 'degraded' | 'down';
  type: string;
  description?: string;
  metrics?: {
    requests24h?: number;
    successRate24h?: number;
    avgTimeMs24h?: number;
    errorCount?: number;
  };
}

export interface AgentsResponse {
  items: Agent[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Fetch agents from API
 */
async function fetchAgents(): Promise<AgentsResponse> {
  const response = await axios.get('/api/agents');
  return response.data;
}

/**
 * Hook to fetch agents with automatic caching and deduplication
 */
export function useAgents(options?: {
  refetchInterval?: number | false;
  enabled?: boolean;
}) {
  return useQuery<AgentsResponse>({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    staleTime: 30 * 1000, // Data stays fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: options?.refetchInterval ?? false,
    enabled: options?.enabled ?? true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook to fetch a single agent by ID
 */
export function useAgent(agentId: string | undefined, options?: {
  enabled?: boolean;
}) {
  return useQuery<Agent>({
    queryKey: ['agents', agentId],
    queryFn: async () => {
      if (!agentId) throw new Error('Agent ID is required');
      const response = await axios.get(`/api/agents/${agentId}`);
      return response.data;
    },
    enabled: !!agentId && (options?.enabled ?? true),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
