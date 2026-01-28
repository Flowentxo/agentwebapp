'use client';

/**
 * ExecutionLogPanel Component
 *
 * Bottom panel showing step-by-step execution logs for a workflow run
 * Displays real-time updates as nodes are executed
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  SkipForward,
  Timer,
  Coins,
  Cpu,
  Terminal,
  X,
  Maximize2,
  Minimize2,
  Trash2,
} from 'lucide-react';
import type { NodeLogEntry, ExecutionSummary } from '@/hooks/useWorkflowRun';

// ============================================
// TYPES
// ============================================

interface ExecutionLogPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  logs: NodeLogEntry[];
  summary?: ExecutionSummary;
  isRunning?: boolean;
  executionId?: string;
  onClear?: () => void;
  onNodeClick?: (nodeId: string) => void;
}

// ============================================
// STATUS CONFIG
// ============================================

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/500/10',
    label: 'Pending',
  },
  started: {
    icon: Loader2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    label: 'Started',
    animate: true,
  },
  running: {
    icon: Loader2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    label: 'Running',
    animate: true,
  },
  success: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    label: 'Success',
  },
  error: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    label: 'Error',
  },
  waiting: {
    icon: AlertTriangle,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    label: 'Waiting',
  },
  skipped: {
    icon: SkipForward,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/500/10',
    label: 'Skipped',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDuration(ms?: number): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
}

function formatTime(timestamp?: string): string {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

// ============================================
// LOG ENTRY COMPONENT
// ============================================

function LogEntry({
  log,
  isExpanded,
  onToggle,
  onNodeClick,
}: {
  log: NodeLogEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onNodeClick?: (nodeId: string) => void;
}) {
  const config = statusConfig[log.status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        border rounded-lg overflow-hidden transition-colors
        ${config.bgColor} border-gray-800 hover:border-gray-700
      `}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={onToggle}
      >
        {/* Status Icon */}
        <div className={`flex-shrink-0 ${config.color}`}>
          <Icon
            size={18}
            className={config.animate ? 'animate-spin' : ''}
          />
        </div>

        {/* Node Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNodeClick?.(log.nodeId);
              }}
              className="font-medium text-white hover:text-blue-400 transition-colors truncate"
            >
              {log.nodeName || log.nodeId}
            </button>
            <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-gray-800">
              {log.nodeType}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {formatTime(log.startedAt)}
            {log.completedAt && ` → ${formatTime(log.completedAt)}`}
          </div>
        </div>

        {/* Duration */}
        {log.durationMs !== undefined && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Timer size={12} />
            {formatDuration(log.durationMs)}
          </div>
        )}

        {/* Cost Badge */}
        {log.costUsd && parseFloat(log.costUsd) > 0 && (
          <div className="flex items-center gap-1 text-xs text-yellow-400 px-2 py-0.5 rounded bg-yellow-500/10">
            <Coins size={12} />
            ${parseFloat(log.costUsd).toFixed(4)}
          </div>
        )}

        {/* Expand Button */}
        <button className="text-muted-foreground hover:text-white transition-colors">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-800"
          >
            <div className="p-4 space-y-3">
              {/* Error Message */}
              {log.error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-start gap-2">
                    <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-red-400">Error</div>
                      <div className="text-sm text-red-300 mt-1 font-mono">
                        {log.error}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Input */}
              {log.input && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Terminal size={12} />
                    Input
                  </div>
                  <pre className="text-xs text-gray-300 bg-gray-800/50 p-3 rounded-lg overflow-x-auto max-h-32">
                    {typeof log.input === 'string'
                      ? log.input
                      : JSON.stringify(log.input, null, 2)}
                  </pre>
                </div>
              )}

              {/* Output */}
              {log.output && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Cpu size={12} />
                    Output
                  </div>
                  <pre className="text-xs text-gray-300 bg-gray-800/50 p-3 rounded-lg overflow-x-auto max-h-32">
                    {typeof log.output === 'string'
                      ? log.output
                      : JSON.stringify(log.output, null, 2)}
                  </pre>
                </div>
              )}

              {/* Tokens */}
              {log.tokensUsed && log.tokensUsed > 0 && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Cpu size={12} />
                  Tokens used: {log.tokensUsed.toLocaleString()}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ExecutionLogPanel({
  isOpen,
  onToggle,
  logs,
  summary,
  isRunning = false,
  executionId,
  onClear,
  onNodeClick,
}: ExecutionLogPanelProps) {
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [isMaximized, setIsMaximized] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length, isOpen]);

  const toggleLogExpand = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const panelHeight = isMaximized ? 'h-[60vh]' : 'h-64';

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-40
        bg-card border-t border-gray-800
        transition-all duration-300
        ${isOpen ? panelHeight : 'h-10'}
      `}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 h-10 border-b border-gray-800 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <Terminal size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium text-gray-300">
            Execution Logs
          </span>

          {/* Status Badge */}
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs text-blue-400 px-2 py-0.5 rounded-full bg-blue-500/10">
              <Loader2 size={12} className="animate-spin" />
              Running
            </span>
          )}

          {/* Summary Badges */}
          {summary && logs.length > 0 && (
            <div className="flex items-center gap-2">
              {summary.successCount > 0 && (
                <span className="text-xs text-green-400 px-1.5 py-0.5 rounded bg-green-500/10">
                  {summary.successCount} success
                </span>
              )}
              {summary.errorCount > 0 && (
                <span className="text-xs text-red-400 px-1.5 py-0.5 rounded bg-red-500/10">
                  {summary.errorCount} error
                </span>
              )}
              {summary.totalDurationMs > 0 && (
                <span className="text-xs text-muted-foreground">
                  {formatDuration(summary.totalDurationMs)}
                </span>
              )}
              {summary.totalCostUsd > 0 && (
                <span className="text-xs text-yellow-400">
                  ${summary.totalCostUsd.toFixed(4)}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isOpen && (
            <>
              {/* Clear Button */}
              {onClear && logs.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  className="p-1.5 text-muted-foreground hover:text-gray-300 transition-colors"
                  title="Clear logs"
                >
                  <Trash2 size={14} />
                </button>
              )}

              {/* Maximize/Minimize */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMaximized(!isMaximized);
                }}
                className="p-1.5 text-muted-foreground hover:text-gray-300 transition-colors"
                title={isMaximized ? 'Minimize' : 'Maximize'}
              >
                {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </>
          )}

          {/* Toggle Arrow */}
          <div className="text-muted-foreground">
            {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </div>
        </div>
      </div>

      {/* Logs Content */}
      {isOpen && (
        <div className="h-[calc(100%-40px)] overflow-y-auto p-4">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Terminal size={32} className="mb-3 opacity-50" />
              <p className="text-sm">No execution logs yet</p>
              <p className="text-xs mt-1">Run the workflow to see step-by-step progress</p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {logs.map((log) => (
                <LogEntry
                  key={log.id}
                  log={log}
                  isExpanded={expandedLogs.has(log.id)}
                  onToggle={() => toggleLogExpand(log.id)}
                  onNodeClick={onNodeClick}
                />
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ExecutionLogPanel;
