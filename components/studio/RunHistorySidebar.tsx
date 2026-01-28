/**
 * RUN HISTORY SIDEBAR
 *
 * Phase 13: Flight Recorder - Visual Debugger
 *
 * Displays a list of past workflow runs for time-travel debugging.
 * Users can click on a run to enter debug mode and inspect the execution.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  History,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  AlertTriangle,
  Timer,
  ChevronRight,
  RefreshCw,
  Loader2,
  Zap,
  Globe,
  Calendar,
  Code,
  RotateCcw,
  PlayCircle,
  X,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePipelineStore, type WorkflowRun } from '@/components/pipelines/store/usePipelineStore';

// ============================================================================
// TYPES
// ============================================================================

interface RunListResponse {
  runs: WorkflowRun[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

type RunStatusFilter = 'all' | 'completed' | 'failed' | 'running' | 'pending';

// ============================================================================
// STATUS CONFIG
// ============================================================================

const statusConfig: Record<
  string,
  { icon: React.ElementType; color: string; bgColor: string; label: string }
> = {
  pending: {
    icon: Clock,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    label: 'Pending',
  },
  running: {
    icon: Play,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    label: 'Running',
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
    label: 'Completed',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    label: 'Failed',
  },
  cancelled: {
    icon: X,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
    label: 'Cancelled',
  },
  suspended: {
    icon: Pause,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500/10',
    label: 'Suspended',
  },
  timeout: {
    icon: Timer,
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    label: 'Timeout',
  },
};

const triggerConfig: Record<
  string,
  { icon: React.ElementType; label: string }
> = {
  manual: { icon: PlayCircle, label: 'Manual' },
  webhook: { icon: Globe, label: 'Webhook' },
  schedule: { icon: Calendar, label: 'Scheduled' },
  api: { icon: Code, label: 'API' },
  event: { icon: Zap, label: 'Event' },
  resume: { icon: Play, label: 'Resumed' },
  retry: { icon: RotateCcw, label: 'Retry' },
};

// ============================================================================
// COMPONENT
// ============================================================================

interface RunHistorySidebarProps {
  workflowId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function RunHistorySidebar({
  workflowId,
  isOpen,
  onClose,
}: RunHistorySidebarProps) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RunStatusFilter>('all');
  const [showTestRuns, setShowTestRuns] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const {
    selectedRunId,
    isDebugMode,
    isLoadingRun,
    loadRun,
    exitDebugMode,
  } = usePipelineStore();

  // Fetch runs
  const fetchRuns = async (reset = false) => {
    if (!workflowId) return;

    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        page: reset ? '1' : String(page),
        pageSize: '20',
      });

      if (statusFilter !== 'all') {
        queryParams.set('status', statusFilter);
      }

      if (!showTestRuns) {
        queryParams.set('isTest', 'false');
      }

      const response = await fetch(
        `/api/runs/${workflowId}?${queryParams.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch runs');
      }

      const data: RunListResponse = await response.json();

      if (reset) {
        setRuns(data.runs);
        setPage(1);
      } else {
        setRuns((prev) => [...prev, ...data.runs]);
      }

      setHasMore(data.pagination.hasNext);
      setTotal(data.pagination.total);
    } catch (err: any) {
      console.error('[RUN_HISTORY] Failed to fetch runs:', err);
      setError(err.message || 'Failed to load runs');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch and refetch on filter change
  useEffect(() => {
    if (isOpen && workflowId) {
      fetchRuns(true);
    }
  }, [isOpen, workflowId, statusFilter, showTestRuns]);

  // Handle run click
  const handleRunClick = (run: WorkflowRun) => {
    if (run.id === selectedRunId) {
      exitDebugMode();
    } else {
      loadRun(run.id);
    }
  };

  // Load more
  const loadMore = () => {
    if (hasMore && !isLoading) {
      setPage((p) => p + 1);
      fetchRuns(false);
    }
  };

  // Format duration
  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (!isOpen) return null;

  return (
    <div className="h-full w-80 bg-background border-l border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Run History</h2>
            {total > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {total}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RunStatusFilter)}
              className="w-full appearance-none bg-card border border-border rounded-lg px-3 py-1.5 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
              <option value="pending">Pending</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showTestRuns}
              onChange={(e) => setShowTestRuns(e.target.checked)}
              className="rounded border-border bg-card text-primary focus:ring-primary/20"
            />
            Test
          </label>

          <button
            onClick={() => fetchRuns(true)}
            disabled={isLoading}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={cn('w-4 h-4 text-muted-foreground', isLoading && 'animate-spin')}
            />
          </button>
        </div>
      </div>

      {/* Debug Mode Banner */}
      {isDebugMode && (
        <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 flex items-center justify-between">
          <span className="text-xs text-primary font-medium">
            Debug Mode Active
          </span>
          <button
            onClick={exitDebugMode}
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            Exit
          </button>
        </div>
      )}

      {/* Run List */}
      <div className="flex-1 overflow-y-auto">
        {error ? (
          <div className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => fetchRuns(true)}
              className="mt-2 text-sm text-primary hover:text-primary/80"
            >
              Try again
            </button>
          </div>
        ) : runs.length === 0 && !isLoading ? (
          <div className="p-4 text-center">
            <History className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No runs found</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Execute the workflow to see runs here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {runs.map((run) => {
              const status = statusConfig[run.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              const trigger = triggerConfig[run.triggerType] || triggerConfig.manual;
              const TriggerIcon = trigger.icon;
              const isSelected = run.id === selectedRunId;

              return (
                <button
                  key={run.id}
                  onClick={() => handleRunClick(run)}
                  disabled={isLoadingRun}
                  className={cn(
                    'w-full p-3 text-left hover:bg-muted/50 transition-all group',
                    isSelected && 'bg-primary/10 border-l-2 border-primary'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Status Icon */}
                    <div
                      className={cn(
                        'p-1.5 rounded-lg',
                        status.bgColor,
                        run.status === 'running' && 'animate-pulse'
                      )}
                    >
                      <StatusIcon className={cn('w-4 h-4', status.color)} />
                    </div>

                    {/* Run Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground">
                          Run #{run.runNumber}
                        </span>
                        {run.isTest && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-600">
                            TEST
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <TriggerIcon className="w-3 h-3" />
                        <span>{trigger.label}</span>
                        <span>•</span>
                        <span>{formatDuration(run.totalDurationMs)}</span>
                      </div>

                      <div className="text-[11px] text-muted-foreground/70 mt-1">
                        {run.startedAt
                          ? formatDistanceToNow(new Date(run.startedAt), {
                              addSuffix: true,
                            })
                          : 'Not started'}
                      </div>

                      {/* Error Preview */}
                      {run.errorMessage && (
                        <div className="mt-2 text-xs text-red-600/80 truncate">
                          {run.errorMessage}
                        </div>
                      )}

                      {/* Stats */}
                      {(run.nodesExecuted || run.totalTokensUsed) && (
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/70">
                          {run.nodesExecuted !== undefined && (
                            <span>
                              {run.nodesSucceeded}/{run.nodesTotal} nodes
                            </span>
                          )}
                          {run.totalTokensUsed !== undefined &&
                            run.totalTokensUsed > 0 && (
                              <span>{run.totalTokensUsed.toLocaleString()} tokens</span>
                            )}
                          {run.totalCostUsd !== undefined && run.totalCostUsd > 0 && (
                            <span>${run.totalCostUsd.toFixed(4)}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Chevron */}
                    <ChevronRight
                      className={cn(
                        'w-4 h-4 text-muted-foreground/30 transition-transform',
                        isSelected && 'text-primary rotate-90'
                      )}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="p-4 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        )}

        {/* Load More */}
        {hasMore && !isLoading && (
          <button
            onClick={loadMore}
            className="w-full p-3 text-sm text-primary hover:bg-muted/50 transition-colors"
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}

export default RunHistorySidebar;
