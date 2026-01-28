import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';

export interface Agent {
  id: string;
  name: string;
  description: string;
  icon?: any;
  color?: string;
  status: 'active' | 'disabled' | 'draft';
  type: 'chat' | 'tool' | 'workflow';
  tags: string[];
  updatedAt: string;
  createdAt: string;
  owner: {
    name: string;
    avatarUrl: string;
  };
}

export interface AgentsResponse {
  items: Agent[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

export interface UseAgentsParams {
  query?: string;
  status?: string[];
  type?: string[];
  sort?: string;
  page?: number;
  limit?: number;
}

export interface UseAgentsResult {
  data: Agent[] | null;
  total: number;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  isRefetching: boolean;
  hasMore: boolean;
  totalPages: number;
}

export function useAgents({
  query = '',
  status = [],
  type = [],
  sort = 'updatedAt_desc',
  page = 1,
  limit = 20
}: UseAgentsParams): UseAgentsResult {
  const [data, setData] = useState<Agent[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debouncedQuery = useDebounce(query, 400);

  const fetchAgents = useCallback(async (isRefetch = false) => {
    // Abort previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      if (isRefetch) {
        setIsRefetching(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (debouncedQuery) params.append('query', debouncedQuery);
      if (status.length > 0) params.append('status', status.join(','));
      if (type.length > 0) params.append('type', type.join(','));
      params.append('sort', sort);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const response = await fetch(`/api/agents?${params}`, {
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }

      const result: AgentsResponse = await response.json();

      console.log('[useAgents] API Response:', result);
      console.log('[useAgents] Items count:', result.items?.length);
      console.log('[useAgents] Total:', result.total);

      setData(result.items);
      setTotal(result.total);
      setHasMore(result.hasMore);
      setTotalPages(result.totalPages);

    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }
      setError(err);
      console.error('Error fetching agents:', err);
    } finally {
      setLoading(false);
      setIsRefetching(false);
    }
  }, [debouncedQuery, status, type, sort, page, limit]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchAgents();

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchAgents]);

  const refetch = useCallback(() => {
    fetchAgents(true);
  }, [fetchAgents]);

  return {
    data,
    total,
    loading,
    error,
    refetch,
    isRefetching,
    hasMore,
    totalPages
  };
}

// useDebounce is now imported from ./useDebounce