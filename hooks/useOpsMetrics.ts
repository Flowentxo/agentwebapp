/**
 * useOpsMetrics.ts
 *
 * Phase 7: Operational Intelligence Layer - Frontend
 *
 * React Query hooks for fetching and polling operational metrics.
 * Provides real-time updates for the Ops Dashboard.
 *
 * Features:
 * - Auto-polling with configurable intervals
 * - Optimistic updates for actions
 * - Error handling with retry logic
 * - Caching and deduplication
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardMetrics {
  rpm: number;
  lastHourExecutions: number;
  todayExecutions: number;
  failureRate: number;
  activeExecutions: number;
  duration: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
  };
  cost: {
    totalTokens: number;
    totalCredits: number;
    estimatedCostUsd: number;
  };
  queues: {
    totalWaiting: number;
    totalActive: number;
    isHealthy: boolean;
  };
  trends: {
    executionsChange: number;
    failureRateChange: number;
    durationChange: number;
    costChange: number;
  };
}

export interface WorkflowMetrics {
  workflowId: string;
  workflowName: string;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  failureRate: number;
  avgDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  maxDurationMs: number;
  totalTokens: number;
  totalCredits: number;
  executionsTrend: number;
  failureRateTrend: number;
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface QueueHealth {
  queueName: string;
  waitingCount: number;
  activeCount: number;
  completedCount: number;
  failedCount: number;
  delayedCount: number;
  pausedCount: number;
  workerCount: number;
  jobsPerSecond: number;
  avgProcessingTimeMs: number;
  oldestWaitingJobAge: number;
  isHealthy: boolean;
  healthIssues: string[];
  lastUpdated: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  workflowId?: string;
  workflowTags?: string[];
  conditionType: string;
  conditionConfig: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  actions: AlertAction[];
  cooldownMinutes: number;
  isEnabled: boolean;
  lastTriggeredAt?: string;
  createdAt: string;
}

export interface AlertAction {
  type: 'slack' | 'email' | 'webhook' | 'pagerduty';
  channel?: string;
  recipients?: string[];
  url?: string;
}

export interface AlertIncident {
  id: string;
  ruleId: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved' | 'silenced';
  title: string;
  description?: string;
  context: Record<string, any>;
  triggeredAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface SearchQuery {
  query?: string;
  status?: string | string[];
  workflowId?: string;
  tags?: string[];
  dateRange?: { from?: string; to?: string };
  errorMessageLike?: string;
}

export interface SearchResult {
  id: string;
  executionId: string;
  workflowId: string;
  workflowName: string;
  status: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  tokenCount?: number;
  triggeredBy?: string;
  score?: number;
  highlights?: {
    workflowName?: string;
    errorMessage?: string;
    payload?: string;
  };
}

// ============================================================================
// API CLIENT
// ============================================================================

const API_BASE = '/api/ops';

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

// ============================================================================
// DASHBOARD METRICS HOOK
// ============================================================================

export interface UseDashboardMetricsOptions {
  enabled?: boolean;
  pollingInterval?: number;
  workspaceId?: string;
}

export function useDashboardMetrics(options: UseDashboardMetricsOptions = {}) {
  const { enabled = true, pollingInterval = 5000, workspaceId } = options;

  const queryParams = workspaceId ? `?workspaceId=${workspaceId}` : '';

  return useQuery({
    queryKey: ['ops', 'dashboard', workspaceId],
    queryFn: () => fetchApi<DashboardMetrics>(`/dashboard${queryParams}`),
    enabled,
    refetchInterval: pollingInterval,
    staleTime: pollingInterval / 2,
  });
}

// ============================================================================
// TIME SERIES HOOK
// ============================================================================

export interface UseTimeSeriesOptions {
  metric: 'executions' | 'failure-rate' | 'duration';
  granularity?: '1m' | '5m' | '15m' | '1h' | '1d';
  from?: Date;
  to?: Date;
  workflowId?: string;
  percentile?: number;
  enabled?: boolean;
  pollingInterval?: number;
}

export function useTimeSeries(options: UseTimeSeriesOptions) {
  const {
    metric,
    granularity = '1h',
    from,
    to,
    workflowId,
    percentile,
    enabled = true,
    pollingInterval = 30000,
  } = options;

  const queryParams = new URLSearchParams();
  queryParams.set('granularity', granularity);
  if (from) queryParams.set('from', from.toISOString());
  if (to) queryParams.set('to', to.toISOString());
  if (workflowId) queryParams.set('workflowId', workflowId);
  if (percentile) queryParams.set('percentile', percentile.toString());

  return useQuery({
    queryKey: ['ops', 'timeseries', metric, granularity, from, to, workflowId],
    queryFn: () =>
      fetchApi<{
        metric: string;
        granularity: string;
        series: TimeSeriesDataPoint[];
      }>(`/timeseries/${metric}?${queryParams.toString()}`),
    enabled,
    refetchInterval: pollingInterval,
    staleTime: pollingInterval / 2,
  });
}

// ============================================================================
// TOP WORKFLOWS HOOK
// ============================================================================

export interface UseTopWorkflowsOptions {
  limit?: number;
  from?: Date;
  to?: Date;
  workspaceId?: string;
  enabled?: boolean;
}

export function useTopWorkflows(options: UseTopWorkflowsOptions = {}) {
  const { limit = 10, from, to, workspaceId, enabled = true } = options;

  const queryParams = new URLSearchParams();
  queryParams.set('limit', limit.toString());
  if (from) queryParams.set('from', from.toISOString());
  if (to) queryParams.set('to', to.toISOString());
  if (workspaceId) queryParams.set('workspaceId', workspaceId);

  return useQuery({
    queryKey: ['ops', 'workflows', 'top', limit, from, to, workspaceId],
    queryFn: () =>
      fetchApi<WorkflowMetrics[]>(`/workflows/top?${queryParams.toString()}`),
    enabled,
    staleTime: 30000,
  });
}

// ============================================================================
// EXECUTION SEARCH HOOK
// ============================================================================

export interface UseExecutionSearchOptions {
  enabled?: boolean;
}

export function useExecutionSearch(options: UseExecutionSearchOptions = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useState<{
    query: SearchQuery;
    options: {
      limit: number;
      offset: number;
      sortBy: string;
      sortOrder: 'asc' | 'desc';
    };
  }>({
    query: {},
    options: {
      limit: 50,
      offset: 0,
      sortBy: 'startedAt',
      sortOrder: 'desc',
    },
  });

  const searchQuery = useQuery({
    queryKey: ['ops', 'search', searchParams],
    queryFn: () =>
      fetchApi<{
        results: SearchResult[];
        total: number;
        totalExact: boolean;
        nextCursor?: string;
      }>('/search', {
        method: 'POST',
        body: JSON.stringify({
          ...searchParams.query,
          options: searchParams.options,
        }),
      }),
    enabled: enabled && Object.keys(searchParams.query).length > 0,
    staleTime: 10000,
  });

  const search = useCallback(
    (query: SearchQuery, opts?: Partial<typeof searchParams.options>) => {
      setSearchParams((prev) => ({
        query,
        options: { ...prev.options, ...opts, offset: 0 },
      }));
    },
    []
  );

  const nextPage = useCallback(() => {
    setSearchParams((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        offset: prev.options.offset + prev.options.limit,
      },
    }));
  }, []);

  const prevPage = useCallback(() => {
    setSearchParams((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        offset: Math.max(0, prev.options.offset - prev.options.limit),
      },
    }));
  }, []);

  const setSort = useCallback(
    (sortBy: string, sortOrder: 'asc' | 'desc') => {
      setSearchParams((prev) => ({
        ...prev,
        options: { ...prev.options, sortBy, sortOrder, offset: 0 },
      }));
    },
    []
  );

  return {
    ...searchQuery,
    search,
    nextPage,
    prevPage,
    setSort,
    searchParams,
    hasNextPage:
      searchQuery.data &&
      searchQuery.data.results.length === searchParams.options.limit,
    hasPrevPage: searchParams.options.offset > 0,
    currentPage:
      Math.floor(searchParams.options.offset / searchParams.options.limit) + 1,
  };
}

// ============================================================================
// QUEUE HEALTH HOOK
// ============================================================================

export interface UseQueueHealthOptions {
  enabled?: boolean;
  pollingInterval?: number;
}

export function useQueueHealth(options: UseQueueHealthOptions = {}) {
  const { enabled = true, pollingInterval = 5000 } = options;

  return useQuery({
    queryKey: ['ops', 'queues'],
    queryFn: () =>
      fetchApi<{
        queues: QueueHealth[];
        systemHealthy: boolean;
        issues: string[];
      }>('/queues'),
    enabled,
    refetchInterval: pollingInterval,
    staleTime: pollingInterval / 2,
  });
}

// ============================================================================
// QUEUE ACTIONS HOOK
// ============================================================================

export function useQueueActions() {
  const queryClient = useQueryClient();

  const pauseQueue = useMutation({
    mutationFn: (queueName: string) =>
      fetchApi(`/queues/${queueName}/pause`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops', 'queues'] });
    },
  });

  const resumeQueue = useMutation({
    mutationFn: (queueName: string) =>
      fetchApi(`/queues/${queueName}/resume`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops', 'queues'] });
    },
  });

  const retryFailed = useMutation({
    mutationFn: ({ queueName, limit }: { queueName: string; limit?: number }) =>
      fetchApi<{ retriedCount: number }>(`/queues/${queueName}/retry-failed`, {
        method: 'POST',
        body: JSON.stringify({ limit }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops', 'queues'] });
    },
  });

  return {
    pauseQueue,
    resumeQueue,
    retryFailed,
  };
}

// ============================================================================
// ALERT RULES HOOK
// ============================================================================

export interface UseAlertRulesOptions {
  workspaceId?: string;
  workflowId?: string;
  enabled?: boolean;
}

export function useAlertRules(options: UseAlertRulesOptions = {}) {
  const { workspaceId, workflowId, enabled = true } = options;

  const queryParams = new URLSearchParams();
  if (workspaceId) queryParams.set('workspaceId', workspaceId);
  if (workflowId) queryParams.set('workflowId', workflowId);

  return useQuery({
    queryKey: ['ops', 'alerts', 'rules', workspaceId, workflowId],
    queryFn: () =>
      fetchApi<AlertRule[]>(`/alerts/rules?${queryParams.toString()}`),
    enabled,
    staleTime: 30000,
  });
}

// ============================================================================
// ALERT RULE MUTATIONS
// ============================================================================

export interface CreateAlertRuleInput {
  name: string;
  description?: string;
  workflowId?: string;
  workflowTags?: string[];
  conditionType: string;
  conditionConfig: Record<string, any>;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  actions?: AlertAction[];
  cooldownMinutes?: number;
  isEnabled?: boolean;
}

export function useAlertRuleMutations() {
  const queryClient = useQueryClient();

  const createRule = useMutation({
    mutationFn: (input: CreateAlertRuleInput) =>
      fetchApi<AlertRule>('/alerts/rules', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops', 'alerts', 'rules'] });
    },
  });

  const updateRule = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<CreateAlertRuleInput>;
    }) =>
      fetchApi<AlertRule>(`/alerts/rules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops', 'alerts', 'rules'] });
    },
  });

  const deleteRule = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/alerts/rules/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops', 'alerts', 'rules'] });
    },
  });

  const toggleRule = useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      fetchApi<AlertRule>(`/alerts/rules/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isEnabled }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops', 'alerts', 'rules'] });
    },
  });

  return {
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
  };
}

// ============================================================================
// ALERT INCIDENTS HOOK
// ============================================================================

export interface UseAlertIncidentsOptions {
  workspaceId?: string;
  enabled?: boolean;
  pollingInterval?: number;
}

export function useAlertIncidents(options: UseAlertIncidentsOptions = {}) {
  const { workspaceId, enabled = true, pollingInterval = 10000 } = options;

  const queryParams = workspaceId ? `?workspaceId=${workspaceId}` : '';

  return useQuery({
    queryKey: ['ops', 'alerts', 'incidents', workspaceId],
    queryFn: () =>
      fetchApi<AlertIncident[]>(`/alerts/incidents${queryParams}`),
    enabled,
    refetchInterval: pollingInterval,
    staleTime: pollingInterval / 2,
  });
}

// ============================================================================
// INCIDENT ACTIONS HOOK
// ============================================================================

export function useIncidentActions() {
  const queryClient = useQueryClient();

  const acknowledge = useMutation({
    mutationFn: (incidentId: string) =>
      fetchApi<AlertIncident>(`/alerts/incidents/${incidentId}/acknowledge`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ops', 'alerts', 'incidents'],
      });
    },
  });

  const resolve = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      fetchApi<AlertIncident>(`/alerts/incidents/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ note }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ops', 'alerts', 'incidents'],
      });
    },
  });

  const silence = useMutation({
    mutationFn: ({
      id,
      durationMinutes,
    }: {
      id: string;
      durationMinutes: number;
    }) =>
      fetchApi<AlertIncident>(`/alerts/incidents/${id}/silence`, {
        method: 'POST',
        body: JSON.stringify({ durationMinutes }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ops', 'alerts', 'incidents'],
      });
    },
  });

  return {
    acknowledge,
    resolve,
    silence,
  };
}

// ============================================================================
// COST TRACKING HOOK
// ============================================================================

export interface UseCostBreakdownOptions {
  days?: number;
  workspaceId?: string;
  enabled?: boolean;
}

export function useCostBreakdown(options: UseCostBreakdownOptions = {}) {
  const { days = 30, workspaceId, enabled = true } = options;

  const queryParams = new URLSearchParams();
  queryParams.set('days', days.toString());
  if (workspaceId) queryParams.set('workspaceId', workspaceId);

  return useQuery({
    queryKey: ['ops', 'costs', days, workspaceId],
    queryFn: () =>
      fetchApi<
        Array<{
          date: string;
          totalTokens: number;
          totalCredits: number;
          totalCostUsd: number;
          byWorkflow: Record<string, { tokens: number; cost: number }>;
        }>
      >(`/costs?${queryParams.toString()}`),
    enabled,
    staleTime: 60000,
  });
}

// ============================================================================
// COMBINED DASHBOARD DATA HOOK
// ============================================================================

export interface UseOpsDashboardDataOptions {
  pollingInterval?: number;
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d';
}

export function useOpsDashboardData(options: UseOpsDashboardDataOptions = {}) {
  const { pollingInterval = 5000, timeRange = '24h' } = options;

  const timeRangeMs = useMemo(() => {
    switch (timeRange) {
      case '1h':
        return 60 * 60 * 1000;
      case '6h':
        return 6 * 60 * 60 * 1000;
      case '24h':
        return 24 * 60 * 60 * 1000;
      case '7d':
        return 7 * 24 * 60 * 60 * 1000;
      case '30d':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }, [timeRange]);

  const granularity = useMemo(() => {
    switch (timeRange) {
      case '1h':
        return '1m' as const;
      case '6h':
        return '5m' as const;
      case '24h':
        return '15m' as const;
      case '7d':
        return '1h' as const;
      case '30d':
        return '1d' as const;
      default:
        return '1h' as const;
    }
  }, [timeRange]);

  const from = useMemo(
    () => new Date(Date.now() - timeRangeMs),
    [timeRangeMs]
  );
  const to = useMemo(() => new Date(), []);

  const dashboard = useDashboardMetrics({ pollingInterval });
  const queues = useQueueHealth({ pollingInterval });
  const topWorkflows = useTopWorkflows({ limit: 5, from, to });
  const incidents = useAlertIncidents({ pollingInterval: 10000 });

  const executionsTimeSeries = useTimeSeries({
    metric: 'executions',
    granularity,
    from,
    to,
    pollingInterval: 30000,
  });

  const failureRateTimeSeries = useTimeSeries({
    metric: 'failure-rate',
    granularity,
    from,
    to,
    pollingInterval: 30000,
  });

  const durationTimeSeries = useTimeSeries({
    metric: 'duration',
    granularity,
    from,
    to,
    percentile: 0.95,
    pollingInterval: 30000,
  });

  const isLoading =
    dashboard.isLoading ||
    queues.isLoading ||
    topWorkflows.isLoading ||
    executionsTimeSeries.isLoading;

  const hasError =
    dashboard.isError ||
    queues.isError ||
    topWorkflows.isError ||
    executionsTimeSeries.isError;

  return {
    dashboard: dashboard.data,
    queues: queues.data,
    topWorkflows: topWorkflows.data,
    incidents: incidents.data,
    timeSeries: {
      executions: executionsTimeSeries.data?.series || [],
      failureRate: failureRateTimeSeries.data?.series || [],
      duration: durationTimeSeries.data?.series || [],
    },
    isLoading,
    hasError,
    timeRange,
    granularity,
    refetch: () => {
      dashboard.refetch();
      queues.refetch();
      topWorkflows.refetch();
      executionsTimeSeries.refetch();
      failureRateTimeSeries.refetch();
      durationTimeSeries.refetch();
    },
  };
}
