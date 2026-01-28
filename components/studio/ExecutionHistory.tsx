'use client';

/**
 * EXECUTION HISTORY COMPONENT
 *
 * Displays workflow execution history with status, duration, and details
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import {
  getExecutions,
  WorkflowExecution,
  ExecutionListResponse
} from '@/lib/api/executions-client';

interface ExecutionHistoryProps {
  workflowId: string;
  onExecutionClick?: (execution: WorkflowExecution) => void;
}

// Status badge configurations
const STATUS_CONFIG = {
  running: {
    icon: Loader2,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
    label: 'Running',
    animate: true
  },
  success: {
    icon: CheckCircle2,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/20',
    label: 'Success',
    animate: false
  },
  error: {
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/20',
    label: 'Failed',
    animate: false
  }
};

export function ExecutionHistory({ workflowId, onExecutionClick }: ExecutionHistoryProps) {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'running' | 'success' | 'error'>('all');

  const loadExecutions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        workflowId,
        limit: 20,
        offset: 0
      };

      if (filter !== 'all') {
        params.status = filter;
      }

      const response: ExecutionListResponse = await getExecutions(params);
      setExecutions(response.executions);
    } catch (err: any) {
      console.error('[EXECUTION_HISTORY] Failed to load:', err);
      setError(err.message || 'Failed to load executions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExecutions();
  }, [workflowId, filter]);

  const formatDuration = (startedAt: Date, completedAt?: Date) => {
    const start = new Date(startedAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : Date.now();
    const duration = Math.floor((end - start) / 1000);

    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const formatTimestamp = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();

    // Less than 1 hour ago
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins} min${mins !== 1 ? 's' : ''} ago`;
    }

    // Less than 24 hours ago
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }

    // Format as date
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-full flex-col bg-surface-1 rounded-xl border border-white/10">
      {/* Header */}
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text">Execution History</h2>
          <button
            onClick={loadExecutions}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-surface-0 px-3 py-2 text-sm text-text-muted transition hover:bg-card/5 hover:text-text disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['all', 'running', 'success', 'error'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filter === status
                  ? 'bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] border border-[rgb(var(--accent))]/20'
                  : 'bg-surface-0 text-text-muted border border-white/10 hover:bg-card/5'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Execution List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && executions.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--accent))] mx-auto mb-3" />
              <p className="text-sm text-text-muted">Loading executions...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-text mb-2">Failed to Load</h3>
              <p className="text-sm text-text-muted mb-4">{error}</p>
              <button
                onClick={loadExecutions}
                className="rounded-lg bg-[rgb(var(--accent))] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : executions.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <Play className="h-12 w-12 text-text-muted opacity-30 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-text mb-2">No Executions Yet</h3>
              <p className="text-sm text-text-muted">
                {filter === 'all'
                  ? 'Run your workflow to see execution history here'
                  : `No ${filter} executions found`
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {executions.map((execution) => {
              const config = STATUS_CONFIG[execution.status];
              const Icon = config.icon;

              return (
                <motion.button
                  key={execution.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => onExecutionClick?.(execution)}
                  className="w-full rounded-lg border border-white/10 bg-surface-0 p-4 text-left transition hover:border-white/20 hover:bg-card/5"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Status + Info */}
                    <div className="flex items-start gap-3 flex-1">
                      {/* Status Badge */}
                      <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${config.bg} border ${config.border}`}>
                        <Icon className={`h-4 w-4 ${config.color} ${config.animate ? 'animate-spin' : ''}`} />
                      </div>

                      {/* Execution Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold ${config.color}`}>
                            {config.label}
                          </span>
                          <span className="text-xs text-text-muted">
                            {formatTimestamp(execution.startedAt)}
                          </span>
                        </div>

                        {/* Duration */}
                        <div className="flex items-center gap-1.5 text-xs text-text-muted">
                          <Clock className="h-3 w-3" />
                          <span>Duration: {formatDuration(execution.startedAt, execution.completedAt)}</span>
                        </div>

                        {/* Error Message */}
                        {execution.error && (
                          <p className="mt-2 text-xs text-red-400 line-clamp-2">
                            {execution.error}
                          </p>
                        )}

                        {/* Current Node (for running executions) */}
                        {execution.status === 'running' && execution.currentNodeId && (
                          <p className="mt-2 text-xs text-blue-400">
                            Current: {execution.currentNodeId}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Arrow */}
                    <ChevronRight className="h-5 w-5 text-text-muted flex-shrink-0 mt-1" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {executions.length > 0 && (
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Total: {executions.length} execution{executions.length !== 1 ? 's' : ''}</span>
            <span>
              Success Rate: {executions.length > 0
                ? Math.round((executions.filter(e => e.status === 'success').length / executions.length) * 100)
                : 0
              }%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
