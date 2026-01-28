'use client';

/**
 * EXECUTION DETAIL MODAL
 *
 * Shows detailed execution information including logs, node results, and timeline
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import {
  getExecution,
  getExecutionLogs,
  WorkflowExecution,
  ExecutionLog
} from '@/lib/api/executions-client';

interface ExecutionDetailModalProps {
  executionId: string;
  isOpen: boolean;
  onClose: () => void;
}

const LOG_LEVEL_CONFIG = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  warn: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' }
};

export function ExecutionDetailModal({ executionId, isOpen, onClose }: ExecutionDetailModalProps) {
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && executionId) {
      loadExecutionDetails();
    }
  }, [isOpen, executionId]);

  const loadExecutionDetails = async () => {
    try {
      setLoading(true);

      const [execResponse, logsResponse] = await Promise.all([
        getExecution(executionId),
        getExecutionLogs(executionId)
      ]);

      setExecution(execResponse.execution);
      setLogs(logsResponse.logs);
    } catch (error) {
      console.error('[EXECUTION_DETAIL] Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const formatDuration = (startedAt: Date, completedAt?: Date) => {
    const start = new Date(startedAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : Date.now();
    const duration = Math.floor((end - start) / 1000);

    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-5xl max-h-[90vh] bg-surface-1 rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="border-b border-white/10 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-text mb-2">Execution Details</h2>
                {execution && (
                  <div className="flex items-center gap-4 text-sm text-text-muted">
                    <span>ID: {execution.id.slice(0, 8)}...</span>
                    <span>•</span>
                    <span>Duration: {formatDuration(execution.startedAt, execution.completedAt)}</span>
                    <span>•</span>
                    <span className={
                      execution.status === 'success' ? 'text-green-400' :
                      execution.status === 'error' ? 'text-red-400' :
                      'text-blue-400'
                    }>
                      {execution.status.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-text-muted transition hover:bg-card/5 hover:text-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-[rgb(var(--accent))] mx-auto mb-3" />
                  <p className="text-sm text-text-muted">Loading execution details...</p>
                </div>
              </div>
            ) : execution ? (
              <div className="space-y-6">
                {/* Error Message */}
                {execution.error && (
                  <div className="rounded-xl bg-red-400/10 border border-red-400/20 p-4">
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-semibold text-red-400 mb-1">Error</h3>
                        <p className="text-sm text-text-muted">{execution.error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <h3 className="text-base font-semibold text-text mb-4">Timeline</h3>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="w-24 text-text-muted">Started:</span>
                      <span className="text-text">{new Date(execution.startedAt).toLocaleString()}</span>
                    </div>
                    {execution.completedAt && (
                      <div className="flex items-center gap-3 text-sm">
                        <span className="w-24 text-text-muted">Completed:</span>
                        <span className="text-text">{new Date(execution.completedAt).toLocaleString()}</span>
                      </div>
                    )}
                    {execution.currentNodeId && (
                      <div className="flex items-center gap-3 text-sm">
                        <span className="w-24 text-text-muted">Current:</span>
                        <span className="text-blue-400">{execution.currentNodeId}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Execution Logs */}
                <div>
                  <h3 className="text-base font-semibold text-text mb-4">Execution Logs</h3>
                  {logs.length === 0 ? (
                    <div className="rounded-xl bg-surface-0 border border-white/10 p-8 text-center">
                      <Info className="h-8 w-8 text-text-muted opacity-30 mx-auto mb-2" />
                      <p className="text-sm text-text-muted">No logs available</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {logs.map((log, index) => {
                        const config = LOG_LEVEL_CONFIG[log.level];
                        const Icon = config.icon;

                        return (
                          <div
                            key={index}
                            className={`rounded-lg border border-white/10 p-3 ${config.bg}`}
                          >
                            <div className="flex items-start gap-3">
                              <Icon className={`h-4 w-4 ${config.color} flex-shrink-0 mt-0.5`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-mono text-text-muted">
                                    {formatTime(log.timestamp)}
                                  </span>
                                  <span className="text-xs text-text-muted">•</span>
                                  <span className="text-xs font-semibold text-text">
                                    {log.nodeName}
                                  </span>
                                </div>
                                <p className="text-sm text-text">{log.message}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Node Results */}
                <div>
                  <h3 className="text-base font-semibold text-text mb-4">Node Results</h3>
                  {Object.keys(execution.nodeResults).length === 0 ? (
                    <div className="rounded-xl bg-surface-0 border border-white/10 p-8 text-center">
                      <Info className="h-8 w-8 text-text-muted opacity-30 mx-auto mb-2" />
                      <p className="text-sm text-text-muted">No results available</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(execution.nodeResults).map(([nodeId, result]) => {
                        const isExpanded = expandedNodes.has(nodeId);

                        return (
                          <div
                            key={nodeId}
                            className="rounded-lg border border-white/10 bg-surface-0 overflow-hidden"
                          >
                            <button
                              onClick={() => toggleNode(nodeId)}
                              className="w-full flex items-center justify-between p-3 text-left transition hover:bg-card/5"
                            >
                              <span className="text-sm font-semibold text-text">{nodeId}</span>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-text-muted" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-text-muted" />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="border-t border-white/10 p-3">
                                <pre className="text-xs text-text-muted font-mono overflow-x-auto">
                                  {JSON.stringify(result, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
                  <p className="text-sm text-text-muted">Failed to load execution details</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
