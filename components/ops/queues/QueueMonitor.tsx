'use client';

/**
 * QueueMonitor.tsx
 *
 * Phase 7: Operational Intelligence Layer - Frontend
 *
 * Real-time monitoring and management UI for BullMQ queues.
 *
 * Features:
 * - Live queue status with auto-refresh
 * - Pause/Resume queue controls
 * - Retry failed jobs
 * - Clear completed jobs
 * - Visual progress bars for queue fullness
 * - Health status indicators
 */

import { useState, useMemo } from 'react';
import {
  Server,
  Play,
  Pause,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Loader2,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Settings,
  Activity,
  Timer,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/contexts/ThemeContext';
import {
  useQueueHealth,
  useQueueActions,
  QueueHealth,
} from '@/hooks/useOpsMetrics';

// ============================================================================
// TYPES
// ============================================================================

interface QueueCardProps {
  queue: QueueHealth;
  isDark: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onPause: () => void;
  onResume: () => void;
  onRetryFailed: () => void;
  isPausing: boolean;
  isResuming: boolean;
  isRetrying: boolean;
}

// ============================================================================
// QUEUE CARD
// ============================================================================

function QueueCard({
  queue,
  isDark,
  expanded,
  onToggleExpand,
  onPause,
  onResume,
  onRetryFailed,
  isPausing,
  isResuming,
  isRetrying,
}: QueueCardProps) {
  const totalJobs =
    queue.waitingCount +
    queue.activeCount +
    queue.delayedCount;

  const utilizationPercent = Math.min(
    100,
    ((queue.waitingCount + queue.activeCount) / Math.max(100, totalJobs)) * 100
  );

  const isPaused = queue.pausedCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border overflow-hidden transition-all',
        isDark
          ? 'bg-zinc-900/50 border-white/10'
          : 'bg-white border-zinc-200',
        !queue.isHealthy && 'border-yellow-500/50'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'p-4 cursor-pointer',
          isDark ? 'hover:bg-white/5' : 'hover:bg-zinc-50'
        )}
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-4">
          {/* Status Indicator */}
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              queue.isHealthy
                ? isDark
                  ? 'bg-green-500/10'
                  : 'bg-green-50'
                : isDark
                ? 'bg-yellow-500/10'
                : 'bg-yellow-50'
            )}
          >
            {isPaused ? (
              <Pause
                className={cn(
                  'w-5 h-5',
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                )}
              />
            ) : queue.isHealthy ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            )}
          </div>

          {/* Queue Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className={cn(
                  'text-sm font-medium',
                  isDark ? 'text-white' : 'text-zinc-900'
                )}
              >
                {queue.queueName}
              </h3>
              {isPaused && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-500/20 text-zinc-400">
                  PAUSED
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1">
              <span
                className={cn(
                  'text-xs flex items-center gap-1',
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                )}
              >
                <Clock className="w-3 h-3" />
                {queue.waitingCount} waiting
              </span>
              <span
                className={cn(
                  'text-xs flex items-center gap-1',
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                )}
              >
                <Zap className="w-3 h-3" />
                {queue.activeCount} active
              </span>
              <span
                className={cn(
                  'text-xs flex items-center gap-1',
                  queue.failedCount > 0 ? 'text-red-400' : isDark ? 'text-zinc-400' : 'text-zinc-500'
                )}
              >
                <XCircle className="w-3 h-3" />
                {queue.failedCount} failed
              </span>
            </div>
          </div>

          {/* Throughput */}
          <div className="text-right">
            <p
              className={cn(
                'text-lg font-bold tabular-nums',
                isDark ? 'text-white' : 'text-zinc-900'
              )}
            >
              {queue.jobsPerSecond.toFixed(1)}
            </p>
            <p
              className={cn(
                'text-[10px]',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}
            >
              jobs/sec
            </p>
          </div>

          {/* Expand Arrow */}
          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight
              className={cn(
                'w-5 h-5',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}
            />
          </motion.div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div
            className={cn(
              'h-1.5 rounded-full overflow-hidden',
              isDark ? 'bg-white/5' : 'bg-zinc-100'
            )}
          >
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                queue.isHealthy
                  ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                  : 'bg-gradient-to-r from-yellow-500 to-orange-400'
              )}
              style={{ width: `${utilizationPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className={cn(
                'px-4 pb-4 border-t',
                isDark ? 'border-white/5' : 'border-zinc-100'
              )}
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div
                  className={cn(
                    'p-3 rounded-lg',
                    isDark ? 'bg-white/5' : 'bg-zinc-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Users
                      className={cn(
                        'w-4 h-4',
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      )}
                    />
                    <span
                      className={cn(
                        'text-xs',
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      )}
                    >
                      Workers
                    </span>
                  </div>
                  <p
                    className={cn(
                      'mt-1 text-lg font-bold',
                      isDark ? 'text-white' : 'text-zinc-900'
                    )}
                  >
                    {queue.workerCount}
                  </p>
                </div>

                <div
                  className={cn(
                    'p-3 rounded-lg',
                    isDark ? 'bg-white/5' : 'bg-zinc-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Timer
                      className={cn(
                        'w-4 h-4',
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      )}
                    />
                    <span
                      className={cn(
                        'text-xs',
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      )}
                    >
                      Avg Time
                    </span>
                  </div>
                  <p
                    className={cn(
                      'mt-1 text-lg font-bold',
                      isDark ? 'text-white' : 'text-zinc-900'
                    )}
                  >
                    {queue.avgProcessingTimeMs >= 1000
                      ? `${(queue.avgProcessingTimeMs / 1000).toFixed(1)}s`
                      : `${queue.avgProcessingTimeMs}ms`}
                  </p>
                </div>

                <div
                  className={cn(
                    'p-3 rounded-lg',
                    isDark ? 'bg-white/5' : 'bg-zinc-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Clock
                      className={cn(
                        'w-4 h-4',
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      )}
                    />
                    <span
                      className={cn(
                        'text-xs',
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      )}
                    >
                      Delayed
                    </span>
                  </div>
                  <p
                    className={cn(
                      'mt-1 text-lg font-bold',
                      isDark ? 'text-white' : 'text-zinc-900'
                    )}
                  >
                    {queue.delayedCount}
                  </p>
                </div>

                <div
                  className={cn(
                    'p-3 rounded-lg',
                    isDark ? 'bg-white/5' : 'bg-zinc-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle
                      className={cn(
                        'w-4 h-4',
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      )}
                    />
                    <span
                      className={cn(
                        'text-xs',
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      )}
                    >
                      Completed
                    </span>
                  </div>
                  <p
                    className={cn(
                      'mt-1 text-lg font-bold',
                      isDark ? 'text-white' : 'text-zinc-900'
                    )}
                  >
                    {queue.completedCount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Health Issues */}
              {queue.healthIssues.length > 0 && (
                <div
                  className={cn(
                    'mt-4 p-3 rounded-lg',
                    isDark ? 'bg-yellow-500/10' : 'bg-yellow-50'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-medium text-yellow-400">
                      Health Issues
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {queue.healthIssues.map((issue, i) => (
                      <li
                        key={i}
                        className={cn(
                          'text-xs',
                          isDark ? 'text-yellow-400/80' : 'text-yellow-600'
                        )}
                      >
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4">
                {isPaused ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onResume();
                    }}
                    disabled={isResuming}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                      isDark
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    )}
                  >
                    {isResuming ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    Resume Queue
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPause();
                    }}
                    disabled={isPausing}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                      isDark
                        ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    )}
                  >
                    {isPausing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Pause className="w-3.5 h-3.5" />
                    )}
                    Pause Queue
                  </button>
                )}

                {queue.failedCount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetryFailed();
                    }}
                    disabled={isRetrying}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                      isDark
                        ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    )}
                  >
                    {isRetrying ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    Retry Failed ({queue.failedCount})
                  </button>
                )}
              </div>

              {/* Last Updated */}
              <p
                className={cn(
                  'mt-3 text-[10px]',
                  isDark ? 'text-zinc-600' : 'text-zinc-400'
                )}
              >
                Last updated: {new Date(queue.lastUpdated).toLocaleTimeString()}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function QueueMonitor() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [expandedQueues, setExpandedQueues] = useState<Set<string>>(new Set());
  const [actionInProgress, setActionInProgress] = useState<{
    queue: string;
    action: 'pause' | 'resume' | 'retry';
  } | null>(null);

  const { data, isLoading, refetch } = useQueueHealth({ pollingInterval: 5000 });
  const { pauseQueue, resumeQueue, retryFailed } = useQueueActions();

  const toggleExpand = (queueName: string) => {
    setExpandedQueues((prev) => {
      const next = new Set(prev);
      if (next.has(queueName)) {
        next.delete(queueName);
      } else {
        next.add(queueName);
      }
      return next;
    });
  };

  const handlePause = async (queueName: string) => {
    setActionInProgress({ queue: queueName, action: 'pause' });
    try {
      await pauseQueue.mutateAsync(queueName);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleResume = async (queueName: string) => {
    setActionInProgress({ queue: queueName, action: 'resume' });
    try {
      await resumeQueue.mutateAsync(queueName);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRetryFailed = async (queueName: string) => {
    setActionInProgress({ queue: queueName, action: 'retry' });
    try {
      await retryFailed.mutateAsync({ queueName, limit: 100 });
    } finally {
      setActionInProgress(null);
    }
  };

  // Summary stats
  const summary = useMemo(() => {
    if (!data?.queues) return null;

    return {
      totalQueues: data.queues.length,
      totalWaiting: data.queues.reduce((sum, q) => sum + q.waitingCount, 0),
      totalActive: data.queues.reduce((sum, q) => sum + q.activeCount, 0),
      totalFailed: data.queues.reduce((sum, q) => sum + q.failedCount, 0),
      totalWorkers: data.queues.reduce((sum, q) => sum + q.workerCount, 0),
      unhealthyCount: data.queues.filter((q) => !q.isHealthy).length,
    };
  }, [data?.queues]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className={cn(
              'text-2xl font-bold',
              isDark ? 'text-white' : 'text-zinc-900'
            )}
          >
            Queue Monitor
          </h1>
          <p
            className={cn(
              'text-sm mt-1',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}
          >
            Real-time BullMQ queue status and controls
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            isDark
              ? 'bg-white/5 text-zinc-300 hover:bg-white/10'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          )}
        >
          <RefreshCw
            className={cn('w-4 h-4', isLoading && 'animate-spin')}
          />
          Refresh
        </button>
      </div>

      {/* System Status Banner */}
      {data && (
        <div
          className={cn(
            'rounded-xl border p-4',
            data.systemHealthy
              ? isDark
                ? 'bg-green-500/5 border-green-500/20'
                : 'bg-green-50 border-green-200'
              : isDark
              ? 'bg-yellow-500/5 border-yellow-500/20'
              : 'bg-yellow-50 border-yellow-200'
          )}
        >
          <div className="flex items-center gap-3">
            {data.systemHealthy ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            )}
            <div>
              <p
                className={cn(
                  'text-sm font-medium',
                  data.systemHealthy
                    ? 'text-green-400'
                    : 'text-yellow-400'
                )}
              >
                {data.systemHealthy
                  ? 'All Systems Operational'
                  : `${data.issues.length} Issue${data.issues.length > 1 ? 's' : ''} Detected`}
              </p>
              {data.issues.length > 0 && (
                <p
                  className={cn(
                    'text-xs mt-0.5',
                    isDark ? 'text-yellow-400/70' : 'text-yellow-600'
                  )}
                >
                  {data.issues.join(' • ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div
            className={cn(
              'rounded-xl border p-4',
              isDark
                ? 'bg-zinc-900/50 border-white/10'
                : 'bg-white border-zinc-200'
            )}
          >
            <div className="flex items-center gap-2">
              <Server
                className={cn(
                  'w-4 h-4',
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                )}
              />
              <span
                className={cn(
                  'text-xs',
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                )}
              >
                Queues
              </span>
            </div>
            <p
              className={cn(
                'mt-2 text-2xl font-bold',
                isDark ? 'text-white' : 'text-zinc-900'
              )}
            >
              {summary.totalQueues}
            </p>
          </div>

          <div
            className={cn(
              'rounded-xl border p-4',
              isDark
                ? 'bg-zinc-900/50 border-white/10'
                : 'bg-white border-zinc-200'
            )}
          >
            <div className="flex items-center gap-2">
              <Clock
                className={cn(
                  'w-4 h-4',
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                )}
              />
              <span
                className={cn(
                  'text-xs',
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                )}
              >
                Waiting
              </span>
            </div>
            <p
              className={cn(
                'mt-2 text-2xl font-bold',
                isDark ? 'text-white' : 'text-zinc-900'
              )}
            >
              {summary.totalWaiting.toLocaleString()}
            </p>
          </div>

          <div
            className={cn(
              'rounded-xl border p-4',
              isDark
                ? 'bg-zinc-900/50 border-white/10'
                : 'bg-white border-zinc-200'
            )}
          >
            <div className="flex items-center gap-2">
              <Activity
                className={cn(
                  'w-4 h-4',
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                )}
              />
              <span
                className={cn(
                  'text-xs',
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                )}
              >
                Active
              </span>
            </div>
            <p
              className={cn(
                'mt-2 text-2xl font-bold',
                isDark ? 'text-white' : 'text-zinc-900'
              )}
            >
              {summary.totalActive}
            </p>
          </div>

          <div
            className={cn(
              'rounded-xl border p-4',
              isDark
                ? 'bg-zinc-900/50 border-white/10'
                : 'bg-white border-zinc-200'
            )}
          >
            <div className="flex items-center gap-2">
              <XCircle
                className={cn(
                  'w-4 h-4',
                  summary.totalFailed > 0
                    ? 'text-red-400'
                    : isDark
                    ? 'text-zinc-400'
                    : 'text-zinc-500'
                )}
              />
              <span
                className={cn(
                  'text-xs',
                  summary.totalFailed > 0
                    ? 'text-red-400'
                    : isDark
                    ? 'text-zinc-400'
                    : 'text-zinc-500'
                )}
              >
                Failed
              </span>
            </div>
            <p
              className={cn(
                'mt-2 text-2xl font-bold',
                summary.totalFailed > 0
                  ? 'text-red-400'
                  : isDark
                  ? 'text-white'
                  : 'text-zinc-900'
              )}
            >
              {summary.totalFailed}
            </p>
          </div>

          <div
            className={cn(
              'rounded-xl border p-4',
              isDark
                ? 'bg-zinc-900/50 border-white/10'
                : 'bg-white border-zinc-200'
            )}
          >
            <div className="flex items-center gap-2">
              <Users
                className={cn(
                  'w-4 h-4',
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                )}
              />
              <span
                className={cn(
                  'text-xs',
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                )}
              >
                Workers
              </span>
            </div>
            <p
              className={cn(
                'mt-2 text-2xl font-bold',
                isDark ? 'text-white' : 'text-zinc-900'
              )}
            >
              {summary.totalWorkers}
            </p>
          </div>
        </div>
      )}

      {/* Queue List */}
      <div className="space-y-4">
        {isLoading && !data ? (
          <div className="flex items-center justify-center py-12">
            <Loader2
              className={cn(
                'w-8 h-8 animate-spin',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}
            />
          </div>
        ) : !data?.queues || data.queues.length === 0 ? (
          <div
            className={cn(
              'text-center py-12 rounded-xl border',
              isDark
                ? 'bg-zinc-900/50 border-white/10'
                : 'bg-white border-zinc-200'
            )}
          >
            <Server
              className={cn(
                'w-12 h-12 mx-auto mb-4',
                isDark ? 'text-zinc-700' : 'text-zinc-300'
              )}
            />
            <p
              className={cn(
                'text-sm',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}
            >
              No queues registered
            </p>
          </div>
        ) : (
          data.queues.map((queue) => (
            <QueueCard
              key={queue.queueName}
              queue={queue}
              isDark={isDark}
              expanded={expandedQueues.has(queue.queueName)}
              onToggleExpand={() => toggleExpand(queue.queueName)}
              onPause={() => handlePause(queue.queueName)}
              onResume={() => handleResume(queue.queueName)}
              onRetryFailed={() => handleRetryFailed(queue.queueName)}
              isPausing={
                actionInProgress?.queue === queue.queueName &&
                actionInProgress.action === 'pause'
              }
              isResuming={
                actionInProgress?.queue === queue.queueName &&
                actionInProgress.action === 'resume'
              }
              isRetrying={
                actionInProgress?.queue === queue.queueName &&
                actionInProgress.action === 'retry'
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

export default QueueMonitor;
