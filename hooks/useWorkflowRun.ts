/**
 * useWorkflowRun Hook
 *
 * Manages workflow execution with polling for execution logs
 * Uses the new /api/workflows/:id/execute and /api/workflows/executions/:id/logs endpoints
 *
 * Part of Phase 5: Live Visualization via Polling
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================
// TYPES
// ============================================

export type NodeExecutionStatus =
  | 'pending'
  | 'started'
  | 'running'
  | 'success'
  | 'error'
  | 'waiting'
  | 'skipped';

export interface NodeLogEntry {
  id: string;
  executionId: string;
  workflowId: string;
  nodeId: string;
  nodeType: string;
  nodeName?: string;
  status: NodeExecutionStatus;
  input?: unknown;
  output?: unknown;
  error?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  tokensUsed?: number;
  costUsd?: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionSummary {
  totalNodes: number;
  successCount: number;
  errorCount: number;
  pendingCount: number;
  skippedCount: number;
  totalDurationMs: number;
  totalTokensUsed: number;
  totalCostUsd: number;
}

export interface WorkflowExecution {
  executionId: string;
  workflowId: string;
  status: 'pending' | 'running' | 'success' | 'error';
  logs: NodeLogEntry[];
  summary: ExecutionSummary;
}

export interface TriggerOptions {
  triggerData?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  isTest?: boolean;
  async?: boolean;
}

export interface UseWorkflowRunReturn {
  // Execution state
  execution: WorkflowExecution | null;
  isRunning: boolean;
  isPolling: boolean;
  error: string | null;

  // Node status map for quick lookup
  nodeStatuses: Record<string, NodeLogEntry>;

  // Actions
  runWorkflow: (workflowId: string, options?: TriggerOptions) => Promise<void>;
  stopPolling: () => void;
  reset: () => void;

  // Helpers
  getNodeStatus: (nodeId: string) => NodeExecutionStatus;
  getNodeLog: (nodeId: string) => NodeLogEntry | undefined;
}

// ============================================
// CONSTANTS
// ============================================

const POLL_INTERVAL_MS = 1000; // Poll every 1 second
const MAX_POLL_ATTEMPTS = 300; // Max 5 minutes of polling

// ============================================
// HOOK
// ============================================

export function useWorkflowRun(): UseWorkflowRunReturn {
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeLogEntry>>({});

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ============================================
  // POLLING LOGIC
  // ============================================

  const fetchExecutionLogs = useCallback(async (executionId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/workflows/executions/${executionId}/logs`, {
        headers: {
          'x-user-id': localStorage.getItem('userId') || 'demo-user',
        },
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch logs: ${response.status}`);
      }

      const data = await response.json();

      // Update execution state
      setExecution({
        executionId,
        workflowId: data.workflowId,
        status: data.status,
        logs: data.logs || [],
        summary: data.summary || {
          totalNodes: 0,
          successCount: 0,
          errorCount: 0,
          pendingCount: 0,
          skippedCount: 0,
          totalDurationMs: 0,
          totalTokensUsed: 0,
          totalCostUsd: 0,
        },
      });

      // Update node statuses map
      const statusMap: Record<string, NodeLogEntry> = {};
      for (const log of data.logs || []) {
        statusMap[log.nodeId] = log;
      }
      setNodeStatuses(statusMap);

      // Check if execution is complete
      const isComplete = data.status === 'success' || data.status === 'error';
      if (isComplete) {
        setIsRunning(false);
      }

      return isComplete;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return true; // Abort = stop polling
      }
      console.error('[useWorkflowRun] Error fetching logs:', err);
      setError(err.message);
      return false;
    }
  }, []);

  const startPolling = useCallback((executionId: string) => {
    setIsPolling(true);
    pollCountRef.current = 0;

    const poll = async () => {
      pollCountRef.current++;

      if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
        console.warn('[useWorkflowRun] Max poll attempts reached');
        stopPolling();
        return;
      }

      const isComplete = await fetchExecutionLogs(executionId);

      if (isComplete) {
        stopPolling();
      } else {
        pollIntervalRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();
  }, [fetchExecutionLogs]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearTimeout(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // ============================================
  // RUN WORKFLOW
  // ============================================

  const runWorkflow = useCallback(async (workflowId: string, options: TriggerOptions = {}) => {
    setError(null);
    setIsRunning(true);
    setExecution(null);
    setNodeStatuses({});

    // Cancel any existing polling
    stopPolling();

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const {
        triggerData = {},
        variables = {},
        isTest = true,
        async: asyncMode = false,
      } = options;

      // Build URL with async parameter
      const url = `/api/workflows/${workflowId}/execute${asyncMode ? '?async=true' : ''}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': localStorage.getItem('userId') || 'demo-user',
        },
        body: JSON.stringify({
          triggerData,
          variables,
          isTest,
        }),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to execute workflow');
      }

      const executionId = data.executionId;

      // For sync execution, we get the result immediately
      if (!asyncMode && data.status !== 'queued') {
        // Parse logs from sync response
        const logs: NodeLogEntry[] = (data.logs || []).map((log: any, index: number) => ({
          id: `log-${index}`,
          executionId,
          workflowId,
          nodeId: log.nodeId,
          nodeType: log.data?.nodeType || 'unknown',
          nodeName: log.nodeName,
          status: log.level === 'success' ? 'success' : log.level === 'error' ? 'error' : 'running',
          startedAt: new Date(log.timestamp).toISOString(),
          completedAt: log.data?.endTime ? new Date(log.data.endTime).toISOString() : undefined,
          durationMs: log.data?.duration,
          output: log.data?.output,
          error: log.data?.error,
        }));

        setExecution({
          executionId,
          workflowId,
          status: data.status,
          logs,
          summary: {
            totalNodes: logs.length,
            successCount: logs.filter(l => l.status === 'success').length,
            errorCount: logs.filter(l => l.status === 'error').length,
            pendingCount: 0,
            skippedCount: 0,
            totalDurationMs: data.durationMs || 0,
            totalTokensUsed: 0,
            totalCostUsd: data.totalCost || 0,
          },
        });

        // Update node statuses map
        const statusMap: Record<string, NodeLogEntry> = {};
        for (const log of logs) {
          statusMap[log.nodeId] = log;
        }
        setNodeStatuses(statusMap);

        setIsRunning(false);
      } else {
        // For async execution, start polling
        startPolling(executionId);
      }

      return;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      console.error('[useWorkflowRun] Error running workflow:', err);
      setError(err.message);
      setIsRunning(false);
    }
  }, [startPolling, stopPolling]);

  // ============================================
  // RESET
  // ============================================

  const reset = useCallback(() => {
    stopPolling();
    setExecution(null);
    setIsRunning(false);
    setError(null);
    setNodeStatuses({});
  }, [stopPolling]);

  // ============================================
  // HELPERS
  // ============================================

  const getNodeStatus = useCallback((nodeId: string): NodeExecutionStatus => {
    return nodeStatuses[nodeId]?.status || 'pending';
  }, [nodeStatuses]);

  const getNodeLog = useCallback((nodeId: string): NodeLogEntry | undefined => {
    return nodeStatuses[nodeId];
  }, [nodeStatuses]);

  // ============================================
  // CLEANUP
  // ============================================

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    execution,
    isRunning,
    isPolling,
    error,
    nodeStatuses,
    runWorkflow,
    stopPolling,
    reset,
    getNodeStatus,
    getNodeLog,
  };
}

export default useWorkflowRun;
