'use client';

/**
 * LiveExecutionSidebar Component
 *
 * Right sidebar showing real-time execution logs during workflow run.
 * Part of the Control Mode system for Pipeline Automation.
 *
 * Vicy-Style: Deep Black (#0f172a) + Violet Glow
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  SkipForward,
  Timer,
  Coins,
  ChevronDown,
  ChevronRight,
  Activity,
  Pause,
  Square,
  RotateCcw,
} from 'lucide-react';
import type { NodeLogEntry, ExecutionSummary } from '@/hooks/useWorkflowRun';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface LiveExecutionSidebarProps {
  executionId: string | null;
  logs: NodeLogEntry[];
  summary?: ExecutionSummary;
  isRunning: boolean;
  onClose: () => void;
  onStop?: () => void;
  onPause?: () => void;
  onRetry?: () => void;
  onNodeClick?: (nodeId: string) => void;
}

// ============================================
// STATUS CONFIG
// ============================================

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-white/40',
    bgColor: 'bg-white/5',
    ringColor: 'ring-white/10',
    label: 'Pending',
  },
  started: {
    icon: Loader2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    ringColor: 'ring-blue-500/30',
    label: 'Started',
    animate: true,
  },
  running: {
    icon: Loader2,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    ringColor: 'ring-violet-500/30',
    label: 'Running',
    animate: true,
  },
  success: {
    icon: CheckCircle,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    ringColor: 'ring-emerald-500/30',
    label: 'Success',
  },
  error: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    ringColor: 'ring-red-500/30',
    label: 'Error',
  },
  waiting: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    ringColor: 'ring-amber-500/30',
    label: 'Awaiting Approval',
  },
  skipped: {
    icon: SkipForward,
    color: 'text-white/30',
    bgColor: 'bg-white/5',
    ringColor: 'ring-white/10',
    label: 'Skipped',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDuration(ms?: number): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
}

function formatTime(timestamp?: string): string {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ============================================
// LOG ENTRY COMPONENT
// ============================================

function StepLogEntry({
  log,
  isExpanded,
  onToggle,
  onNodeClick,
  isLast,
}: {
  log: NodeLogEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onNodeClick?: (nodeId: string) => void;
  isLast: boolean;
}) {
  const config = statusConfig[log.status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative"
    >
      {/* Connector Line */}
      {!isLast && (
        <div className="absolute left-[15px] top-[32px] bottom-0 w-px bg-white/10" />
      )}

      <div
        className={cn(
          'flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all',
          'hover:bg-white/[0.03]',
          isExpanded && 'bg-white/[0.02]'
        )}
        onClick={onToggle}
      >
        {/* Status Icon */}
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
            'ring-1',
            config.bgColor,
            config.ringColor
          )}
        >
          <Icon
            size={16}
            className={cn(config.color, config.animate && 'animate-spin')}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNodeClick?.(log.nodeId);
              }}
              className="text-sm font-medium text-white hover:text-violet-400 transition-colors truncate"
            >
              {log.nodeName || log.nodeId}
            </button>
            <span className="text-[10px] text-white/30 px-1.5 py-0.5 rounded bg-white/5 uppercase tracking-wider">
              {log.nodeType}
            </span>
          </div>

          {/* Time & Duration */}
          <div className="flex items-center gap-2 mt-1 text-xs text-white/40">
            <span>{formatTime(log.startedAt)}</span>
            {log.durationMs !== undefined && (
              <>
                <span className="text-white/20">·</span>
                <span className="flex items-center gap-1">
                  <Timer size={10} />
                  {formatDuration(log.durationMs)}
                </span>
              </>
            )}
            {log.costUsd && parseFloat(log.costUsd) > 0 && (
              <>
                <span className="text-white/20">·</span>
                <span className="flex items-center gap-1 text-amber-400/80">
                  <Coins size={10} />
                  ${parseFloat(log.costUsd).toFixed(4)}
                </span>
              </>
            )}
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 space-y-2 overflow-hidden"
              >
                {/* Error */}
                {log.error && (
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-300 font-mono break-all">
                      {log.error}
                    </p>
                  </div>
                )}

                {/* Output Preview */}
                {log.output && (
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                      Output
                    </p>
                    <pre className="text-xs text-white/60 font-mono overflow-x-auto max-h-24">
                      {typeof log.output === 'string'
                        ? log.output.slice(0, 300)
                        : JSON.stringify(log.output, null, 2).slice(0, 300)}
                      {(typeof log.output === 'string'
                        ? log.output.length
                        : JSON.stringify(log.output).length) > 300 && '...'}
                    </pre>
                  </div>
                )}

                {/* Tokens */}
                {log.tokensUsed && log.tokensUsed > 0 && (
                  <p className="text-xs text-white/30">
                    Tokens: {log.tokensUsed.toLocaleString()}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Expand Arrow */}
        <div className="text-white/30 mt-1">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function LiveExecutionSidebar({
  executionId,
  logs,
  summary,
  isRunning,
  onClose,
  onStop,
  onPause,
  onRetry,
  onNodeClick,
}: LiveExecutionSidebarProps) {
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length]);

  // Auto-expand latest log
  useEffect(() => {
    if (logs.length > 0) {
      const latestLog = logs[logs.length - 1];
      if (latestLog.status === 'running' || latestLog.status === 'error') {
        setExpandedLogs(new Set([latestLog.id]));
      }
    }
  }, [logs]);

  const toggleLogExpand = (logId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const successCount = logs.filter((l) => l.status === 'success').length;
  const errorCount = logs.filter((l) => l.status === 'error').length;
  const totalSteps = logs.length;

  return (
    <div
      className="h-full flex flex-col border-l border-white/[0.05] backdrop-blur-xl"
      style={{
        background: 'rgba(9, 9, 11, 0.80)',
        boxShadow: isRunning
          ? 'inset 0 0 60px rgba(139, 92, 246, 0.04)'
          : 'none',
      }}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity
              className={cn(
                'w-4 h-4',
                isRunning ? 'text-violet-400 animate-pulse' : 'text-white/40'
              )}
            />
            <span className="text-sm font-medium text-white/80">
              Live Execution
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Status Bar */}
        {isRunning && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-white/40 mb-1.5">
              <span>Progress</span>
              <span>
                {successCount}/{totalSteps} steps
              </span>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: `${totalSteps > 0 ? (successCount / totalSteps) * 100 : 0}%`,
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {!isRunning && logs.length > 0 && (
          <div className="mt-3 flex items-center gap-3">
            {successCount > 0 && (
              <span className="text-xs text-emerald-400 px-2 py-1 rounded-lg bg-emerald-500/10">
                {successCount} success
              </span>
            )}
            {errorCount > 0 && (
              <span className="text-xs text-red-400 px-2 py-1 rounded-lg bg-red-500/10">
                {errorCount} failed
              </span>
            )}
            {summary?.totalDurationMs && (
              <span className="text-xs text-white/40">
                {formatDuration(summary.totalDurationMs)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Control Buttons */}
      {isRunning && (onStop || onPause) && (
        <div className="flex-shrink-0 px-4 py-2 border-b border-white/[0.06] flex gap-2">
          {onPause && (
            <button
              onClick={onPause}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                bg-amber-500/10 text-amber-400 text-xs font-medium
                hover:bg-amber-500/20 transition-colors"
            >
              <Pause size={14} />
              Pause
            </button>
          )}
          {onStop && (
            <button
              onClick={onStop}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                bg-red-500/10 text-red-400 text-xs font-medium
                hover:bg-red-500/20 transition-colors"
            >
              <Square size={14} />
              Stop
            </button>
          )}
        </div>
      )}

      {/* Retry Button */}
      {!isRunning && errorCount > 0 && onRetry && (
        <div className="flex-shrink-0 px-4 py-2 border-b border-white/[0.06]">
          <button
            onClick={onRetry}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
              bg-violet-500/10 text-violet-400 text-xs font-medium
              hover:bg-violet-500/20 transition-colors"
          >
            <RotateCcw size={14} />
            Retry Failed Steps
          </button>
        </div>
      )}

      {/* Logs List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Activity className="w-8 h-8 text-white/15 mb-3" />
            <p className="text-sm text-white/30">Waiting for execution...</p>
            <p className="text-xs text-white/20 mt-1">
              Logs will appear here in real-time
            </p>
          </div>
        ) : (
          <>
            {logs.map((log, index) => (
              <StepLogEntry
                key={log.id}
                log={log}
                isExpanded={expandedLogs.has(log.id)}
                onToggle={() => toggleLogExpand(log.id)}
                onNodeClick={onNodeClick}
                isLast={index === logs.length - 1}
              />
            ))}
            <div ref={logsEndRef} />
          </>
        )}
      </div>

      {/* Footer - Execution ID */}
      {executionId && (
        <div className="flex-shrink-0 px-4 py-2 border-t border-white/[0.06]">
          <p className="text-[10px] text-white/20 font-mono truncate">
            ID: {executionId}
          </p>
        </div>
      )}
    </div>
  );
}

export default LiveExecutionSidebar;
