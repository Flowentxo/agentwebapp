/**
 * useSchemaDiscovery Hook
 *
 * Phase 6: Builder Experience Enhancement
 *
 * React hook for fetching variable schemas from the DX discovery API.
 * Powers autocomplete in the expression editor by discovering upstream
 * node outputs and global variables.
 *
 * Usage:
 *   const { data, isLoading, refetch } = useSchemaDiscovery(workflowId, nodeId);
 *   // data.nodes - upstream node schemas
 *   // data.globalVariables - available global variables
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface VariablePath {
  path: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'unknown';
  label: string;
  description?: string;
  sampleValue?: any;
  priority?: number;
}

export interface NodeSchema {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  paths: VariablePath[];
}

export interface SchemaDiscoveryResult {
  nodes: NodeSchema[];
  globalVariables: VariablePath[];
  credentialHints?: Array<{
    id: string;
    name: string;
    provider: string;
  }>;
}

export interface DiscoveryOptions {
  /** Current node ID (excluded from results) */
  currentNodeId?: string;
  /** Include global variables like $execution, $workflow */
  includeGlobals?: boolean;
  /** Include credential hints */
  includeCredentials?: boolean;
  /** Skip cache and force fresh discovery */
  forceRefresh?: boolean;
}

export interface UseSchemaDiscoveryOptions {
  /** Auto-fetch on mount */
  enabled?: boolean;
  /** Cache duration in ms (default: 30000) */
  cacheTime?: number;
  /** Stale time in ms (default: 10000) */
  staleTime?: number;
  /** Callback on success */
  onSuccess?: (data: SchemaDiscoveryResult) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface UseSchemaDiscoveryReturn {
  /** Schema discovery result */
  data: SchemaDiscoveryResult | null;
  /** Loading state */
  isLoading: boolean;
  /** Fetching state (includes refetch) */
  isFetching: boolean;
  /** Error state */
  error: Error | null;
  /** Is data stale? */
  isStale: boolean;
  /** Manual refetch */
  refetch: (options?: DiscoveryOptions) => Promise<SchemaDiscoveryResult | null>;
  /** Clear cached data */
  invalidate: () => void;
}

// ============================================================================
// CACHE
// ============================================================================

interface CacheEntry {
  data: SchemaDiscoveryResult;
  timestamp: number;
  workflowId: string;
  nodeId?: string;
}

const schemaCache = new Map<string, CacheEntry>();

function getCacheKey(workflowId: string, nodeId?: string): string {
  return `${workflowId}:${nodeId || 'root'}`;
}

function getFromCache(
  workflowId: string,
  nodeId?: string,
  staleTime?: number
): { data: SchemaDiscoveryResult | null; isStale: boolean } {
  const key = getCacheKey(workflowId, nodeId);
  const entry = schemaCache.get(key);

  if (!entry) {
    return { data: null, isStale: true };
  }

  const age = Date.now() - entry.timestamp;
  const isStale = staleTime !== undefined && age > staleTime;

  return { data: entry.data, isStale };
}

function setCache(workflowId: string, nodeId: string | undefined, data: SchemaDiscoveryResult): void {
  const key = getCacheKey(workflowId, nodeId);
  schemaCache.set(key, {
    data,
    timestamp: Date.now(),
    workflowId,
    nodeId,
  });
}

function clearCache(workflowId?: string, nodeId?: string): void {
  if (workflowId) {
    const key = getCacheKey(workflowId, nodeId);
    if (nodeId) {
      schemaCache.delete(key);
    } else {
      // Clear all entries for this workflow
      for (const k of schemaCache.keys()) {
        if (k.startsWith(`${workflowId}:`)) {
          schemaCache.delete(k);
        }
      }
    }
  } else {
    schemaCache.clear();
  }
}

// ============================================================================
// DEFAULT GLOBALS (fallback when API fails)
// ============================================================================

const DEFAULT_GLOBALS: VariablePath[] = [
  {
    path: '$execution.id',
    type: 'string',
    label: 'Execution ID',
    description: 'Unique identifier for the current execution',
    priority: 100,
  },
  {
    path: '$execution.startedAt',
    type: 'string',
    label: 'Execution Start Time',
    description: 'ISO timestamp when execution started',
    priority: 95,
  },
  {
    path: '$workflow.id',
    type: 'string',
    label: 'Workflow ID',
    description: 'Unique identifier for the workflow',
    priority: 90,
  },
  {
    path: '$workflow.name',
    type: 'string',
    label: 'Workflow Name',
    description: 'Name of the current workflow',
    priority: 85,
  },
  {
    path: '$now',
    type: 'string',
    label: 'Current Timestamp',
    description: 'Current ISO timestamp',
    priority: 80,
  },
  {
    path: '$today',
    type: 'string',
    label: 'Today\'s Date',
    description: 'Current date in YYYY-MM-DD format',
    priority: 75,
  },
  {
    path: '$runIndex',
    type: 'number',
    label: 'Loop Run Index',
    description: 'Current iteration index in a loop (0-based)',
    priority: 70,
  },
  {
    path: '$batchIndex',
    type: 'number',
    label: 'Batch Index',
    description: 'Current batch index for batched execution',
    priority: 65,
  },
  {
    path: '$itemIndex',
    type: 'number',
    label: 'Item Index',
    description: 'Current item index within the batch',
    priority: 60,
  },
  {
    path: '$isFirstItem',
    type: 'boolean',
    label: 'Is First Item',
    description: 'True if this is the first item in the loop',
    priority: 55,
  },
  {
    path: '$isLastItem',
    type: 'boolean',
    label: 'Is Last Item',
    description: 'True if this is the last item in the loop',
    priority: 50,
  },
];

// ============================================================================
// HOOK
// ============================================================================

export function useSchemaDiscovery(
  workflowId: string | undefined,
  currentNodeId?: string,
  options: UseSchemaDiscoveryOptions = {}
): UseSchemaDiscoveryReturn {
  const {
    enabled = true,
    cacheTime = 30000,
    staleTime = 10000,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<SchemaDiscoveryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(true);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchRef = useRef<number>(0);

  // ============================================================================
  // FETCH FUNCTION
  // ============================================================================

  const fetchSchema = useCallback(
    async (fetchOptions?: DiscoveryOptions): Promise<SchemaDiscoveryResult | null> => {
      if (!workflowId) {
        return null;
      }

      // Check cache first (unless forced refresh)
      if (!fetchOptions?.forceRefresh) {
        const cached = getFromCache(workflowId, currentNodeId, staleTime);
        if (cached.data && !cached.isStale) {
          setData(cached.data);
          setIsStale(false);
          setError(null);
          return cached.data;
        }
      }

      // Abort any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const isInitialLoad = !data;
      if (isInitialLoad) {
        setIsLoading(true);
      }
      setIsFetching(true);
      setError(null);

      try {
        const response = await fetch(`/api/dx/discover/${workflowId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentNodeId: fetchOptions?.currentNodeId ?? currentNodeId,
            includeGlobals: fetchOptions?.includeGlobals ?? true,
            includeCredentials: fetchOptions?.includeCredentials ?? true,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Discovery failed: ${response.status}`);
        }

        const result: SchemaDiscoveryResult = await response.json();

        // Update cache
        setCache(workflowId, currentNodeId, result);
        lastFetchRef.current = Date.now();

        // Update state
        setData(result);
        setIsStale(false);
        setError(null);

        // Callback
        onSuccess?.(result);

        return result;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return null;
        }

        console.error('[useSchemaDiscovery] Error:', err);
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        // Return fallback globals on error
        const fallback: SchemaDiscoveryResult = {
          nodes: [],
          globalVariables: DEFAULT_GLOBALS,
        };
        setData(fallback);

        // Callback
        onError?.(error);

        return fallback;
      } finally {
        setIsLoading(false);
        setIsFetching(false);
        abortControllerRef.current = null;
      }
    },
    [workflowId, currentNodeId, staleTime, data, onSuccess, onError]
  );

  // ============================================================================
  // INVALIDATE
  // ============================================================================

  const invalidate = useCallback(() => {
    if (workflowId) {
      clearCache(workflowId, currentNodeId);
      setIsStale(true);
    }
  }, [workflowId, currentNodeId]);

  // ============================================================================
  // AUTO-FETCH ON MOUNT
  // ============================================================================

  useEffect(() => {
    if (enabled && workflowId) {
      // Check cache first
      const cached = getFromCache(workflowId, currentNodeId, staleTime);
      if (cached.data) {
        setData(cached.data);
        setIsStale(cached.isStale);

        // If stale, refetch in background
        if (cached.isStale) {
          fetchSchema();
        }
      } else {
        // No cache, fetch immediately
        fetchSchema();
      }
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, workflowId, currentNodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================================
  // STALE CHECK
  // ============================================================================

  useEffect(() => {
    if (!data || !workflowId) return;

    const checkStale = () => {
      const age = Date.now() - lastFetchRef.current;
      if (age > staleTime) {
        setIsStale(true);
      }
    };

    const interval = setInterval(checkStale, staleTime);
    return () => clearInterval(interval);
  }, [data, workflowId, staleTime]);

  // ============================================================================
  // CACHE CLEANUP
  // ============================================================================

  useEffect(() => {
    // Cleanup old cache entries periodically
    const cleanup = () => {
      const now = Date.now();
      for (const [key, entry] of schemaCache.entries()) {
        if (now - entry.timestamp > cacheTime) {
          schemaCache.delete(key);
        }
      }
    };

    const interval = setInterval(cleanup, cacheTime);
    return () => clearInterval(interval);
  }, [cacheTime]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    data,
    isLoading,
    isFetching,
    error,
    isStale,
    refetch: fetchSchema,
    invalidate,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to get variable paths for a specific node
 */
export function useNodeVariables(
  workflowId: string | undefined,
  targetNodeId: string,
  currentNodeId?: string
): {
  paths: VariablePath[];
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useSchemaDiscovery(workflowId, currentNodeId);

  const paths =
    data?.nodes.find((n) => n.nodeId === targetNodeId || n.nodeName === targetNodeId)?.paths || [];

  return { paths, isLoading, error };
}

/**
 * Hook to search variables across all nodes
 */
export function useVariableSearch(
  workflowId: string | undefined,
  currentNodeId?: string
): {
  search: (query: string) => Array<{ node: NodeSchema; path: VariablePath }>;
  isLoading: boolean;
} {
  const { data, isLoading } = useSchemaDiscovery(workflowId, currentNodeId);

  const search = useCallback(
    (query: string) => {
      if (!data || !query) return [];

      const q = query.toLowerCase();
      const results: Array<{ node: NodeSchema; path: VariablePath }> = [];

      // Search node variables
      for (const node of data.nodes) {
        for (const path of node.paths) {
          if (
            path.path.toLowerCase().includes(q) ||
            path.label.toLowerCase().includes(q) ||
            path.description?.toLowerCase().includes(q)
          ) {
            results.push({ node, path });
          }
        }
      }

      // Search global variables (create a pseudo-node for them)
      const globalNode: NodeSchema = {
        nodeId: 'globals',
        nodeName: 'Global Variables',
        nodeType: 'globals',
        paths: data.globalVariables,
      };

      for (const path of data.globalVariables) {
        if (
          path.path.toLowerCase().includes(q) ||
          path.label.toLowerCase().includes(q) ||
          path.description?.toLowerCase().includes(q)
        ) {
          results.push({ node: globalNode, path });
        }
      }

      // Sort by priority
      results.sort((a, b) => (b.path.priority || 50) - (a.path.priority || 50));

      return results;
    },
    [data]
  );

  return { search, isLoading };
}

/**
 * Invalidate schema cache for a workflow (call after execution)
 */
export function invalidateSchemaCache(workflowId?: string): void {
  clearCache(workflowId);
}

export default useSchemaDiscovery;
