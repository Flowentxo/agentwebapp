'use client';

/**
 * LIVE EXECUTION VIEWER
 *
 * Real-time monitoring of workflow execution using Server-Sent Events
 */

import { useState, useEffect, useRef } from 'react';
import { createExecutionStream, getExecution, WorkflowExecution, ExecutionLog } from '@/lib/api/executions-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Play,
  AlertCircle,
  Info
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface LiveExecutionViewerProps {
  executionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function LiveExecutionViewer({ executionId, isOpen, onClose }: LiveExecutionViewerProps) {
  const [execution, setExecution] = useState<Partial<WorkflowExecution> | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Load initial execution data
  useEffect(() => {
    if (!isOpen || !executionId) return;

    const loadExecution = async () => {
      try {
        setIsLoading(true);
        const { execution: execData, isLive: live } = await getExecution(executionId);
        setExecution(execData);
        setIsLive(live);
      } catch (err: any) {
        setError(err.message || 'Failed to load execution');
      } finally {
        setIsLoading(false);
      }
    };

    loadExecution();
  }, [executionId, isOpen]);

  // Setup SSE stream for live executions
  useEffect(() => {
    if (!isOpen || !executionId || !isLive) return;

    console.log('[LIVE_VIEWER] Setting up SSE stream for:', executionId);

    eventSourceRef.current = createExecutionStream(
      executionId,
      (update) => {
        console.log('[LIVE_VIEWER] Received update:', update);
        setExecution((prev) => ({
          ...prev,
          ...update
        }));
      },
      () => {
        console.log('[LIVE_VIEWER] Execution completed');
        setIsLive(false);
      },
      (errorMsg) => {
        console.error('[LIVE_VIEWER] Stream error:', errorMsg);
        setError(errorMsg);
        setIsLive(false);
      }
    );

    return () => {
      if (eventSourceRef.current) {
        console.log('[LIVE_VIEWER] Closing SSE connection');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [executionId, isOpen, isLive]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [execution?.logs]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-5xl max-h-[90vh] rounded-2xl border border-white/10 bg-surface-1 shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgb(var(--accent))]/20">
                <Activity className="h-5 w-5 text-[rgb(var(--accent))]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text">Execution Monitor</h2>
                <p className="text-xs text-text-muted font-mono mt-1">
                  {executionId.slice(0, 16)}...
                </p>
              </div>
              {isLive && (
                <span className="inline-flex items-center gap-2 rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-500">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                  Live
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-text-muted transition hover:bg-card/5 hover:text-text"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Activity className="h-8 w-8 animate-spin text-[rgb(var(--accent))] mx-auto mb-4" />
                  <p className="text-sm text-text-muted">Loading execution...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <XCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                  <p className="text-sm text-text-muted">{error}</p>
                </div>
              </div>
            ) : execution ? (
              <>
                {/* Status Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatusCard
                    icon={getStatusIcon(execution.status)}
                    label="Status"
                    value={execution.status ? execution.status.charAt(0).toUpperCase() + execution.status.slice(1) : 'Unknown'}
                    color={getStatusColor(execution.status)}
                  />
                  <StatusCard
                    icon={Clock}
                    label="Started"
                    value={execution.startedAt ? formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true }) : 'N/A'}
                    color="#8B5CF6"
                  />
                  <StatusCard
                    icon={Play}
                    label="Current Node"
                    value={execution.currentNodeId || 'Completed'}
                    color="#F59E0B"
                  />
                </div>

                {/* Error Message */}
                {execution.error && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-red-500 mb-1">Execution Error</h4>
                        <p className="text-sm text-text-muted">{execution.error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Execution Logs */}
                <div className="rounded-lg border border-white/10 bg-surface-0 overflow-hidden">
                  <div className="flex items-center gap-3 border-b border-white/10 bg-surface-1 px-4 py-3">
                    <Terminal className="h-4 w-4 text-[rgb(var(--accent))]" />
                    <h3 className="text-sm font-semibold text-text">Execution Logs</h3>
                    <span className="text-xs text-text-muted">
                      {execution.logs?.length || 0} entries
                    </span>
                  </div>

                  <div className="h-96 overflow-y-auto p-4 space-y-2 font-mono text-xs">
                    {execution.logs && execution.logs.length > 0 ? (
                      execution.logs.map((log, index) => (
                        <LogEntry key={index} log={log} />
                      ))
                    ) : (
                      <div className="flex items-center justify-center h-full text-text-muted">
                        No logs available
                      </div>
                    )}
                    <div ref={logsEndRef} />
                  </div>
                </div>

                {/* Node Results */}
                {execution.nodeResults && Object.keys(execution.nodeResults).length > 0 && (
                  <div className="rounded-lg border border-white/10 bg-surface-0 overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-white/10 bg-surface-1 px-4 py-3">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <h3 className="text-sm font-semibold text-text">Node Results</h3>
                    </div>

                    <div className="p-4 space-y-3">
                      {Object.entries(execution.nodeResults).map(([nodeId, result]) => (
                        <div key={nodeId} className="rounded-lg border border-white/10 bg-surface-1 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                            <span className="text-xs font-semibold text-text">{nodeId}</span>
                          </div>
                          <pre className="text-xs text-text-muted overflow-x-auto">
                            {JSON.stringify(result, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

interface StatusCardProps {
  icon: any;
  label: string;
  value: string;
  color: string;
}

function StatusCard({ icon: Icon, label, value, color }: StatusCardProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-surface-1 p-4">
      <div className="flex items-center gap-3 mb-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <span className="text-xs text-text-muted">{label}</span>
      </div>
      <p className="text-sm font-semibold text-text truncate">{value}</p>
    </div>
  );
}

interface LogEntryProps {
  log: ExecutionLog;
}

function LogEntry({ log }: LogEntryProps) {
  const getLevelColor = () => {
    switch (log.level) {
      case 'error':
        return 'text-red-500';
      case 'warn':
        return 'text-yellow-500';
      case 'info':
      default:
        return 'text-blue-500';
    }
  };

  const getLevelIcon = () => {
    switch (log.level) {
      case 'error':
        return <XCircle className="h-3 w-3" />;
      case 'warn':
        return <AlertCircle className="h-3 w-3" />;
      case 'info':
      default:
        return <Info className="h-3 w-3" />;
    }
  };

  const timestamp = new Date(log.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="flex items-start gap-3 text-text-muted hover:bg-card/5 rounded px-2 py-1 transition">
      <span className="text-text-muted/50 flex-shrink-0">{timestamp}</span>
      <span className={`flex items-center gap-1 flex-shrink-0 ${getLevelColor()}`}>
        {getLevelIcon()}
        {log.level.toUpperCase()}
      </span>
      <span className="text-[rgb(var(--accent))]/70 flex-shrink-0">[{log.nodeName}]</span>
      <span className="flex-1">{log.message}</span>
    </div>
  );
}

function getStatusIcon(status?: string) {
  switch (status) {
    case 'running':
      return Activity;
    case 'success':
      return CheckCircle2;
    case 'error':
      return XCircle;
    default:
      return Clock;
  }
}

function getStatusColor(status?: string): string {
  switch (status) {
    case 'running':
      return '#3B82F6';
    case 'success':
      return '#10B981';
    case 'error':
      return '#EF4444';
    default:
      return '#8B5CF6';
  }
}
