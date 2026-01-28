'use client';

/**
 * DATA CONTEXT PANEL
 *
 * Right sidebar component for Pipeline Studio that displays
 * live execution state including:
 * - Global context (userId, inputs, env)
 * - Node outputs with their data
 * - Variables set during execution
 *
 * Features:
 * - Collapsible sections
 * - JSON tree viewer with expandable nodes
 * - Copy variable path to clipboard (e.g., {{nodeId.output.field}})
 * - Real-time updates during execution
 *
 * Part of Phase 2: Frontend State Integration
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  X,
  Globe,
  Box,
  Variable,
  Zap,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Database,
} from 'lucide-react';
import type { ExecutionState, NodeState, ExecutionLogEntry, ExecutionStatus } from '@/hooks/useExecutionStreamV2';

// ============================================================================
// TYPES
// ============================================================================

interface DataContextPanelProps {
  /** Full execution state from useExecutionStreamV2 */
  executionState: ExecutionState | null;
  /** Currently active/running node ID */
  activeNodeId: string | null;
  /** Execution logs */
  logs: ExecutionLogEntry[];
  /** Overall execution status */
  status: ExecutionStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Error message if any */
  error: string | null;
  /** Whether the panel is open */
  isOpen: boolean;
  /** Toggle panel visibility */
  onToggle: () => void;
  /** Optional: Node name lookup map */
  nodeNames?: Record<string, string>;
}

interface JsonTreeProps {
  data: unknown;
  path: string;
  depth?: number;
  onCopyPath: (path: string) => void;
}

interface CopiedState {
  path: string;
  timeout: NodeJS.Timeout | null;
}

// ============================================================================
// JSON TREE VIEWER COMPONENT
// ============================================================================

function JsonTreeNode({
  keyName,
  value,
  path,
  depth = 0,
  onCopyPath,
  copiedPath,
}: {
  keyName: string;
  value: unknown;
  path: string;
  depth?: number;
  onCopyPath: (path: string) => void;
  copiedPath: string | null;
}) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const [isHovered, setIsHovered] = useState(false);

  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  const isEmpty = isObject && Object.keys(value as object).length === 0;

  const toggleExpand = () => {
    if (isObject && !isEmpty) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyPath(path);
  };

  const renderValue = () => {
    if (value === null) {
      return <span className="text-muted-foreground italic">null</span>;
    }
    if (value === undefined) {
      return <span className="text-muted-foreground italic">undefined</span>;
    }
    if (typeof value === 'boolean') {
      return <span className="text-purple-400">{value.toString()}</span>;
    }
    if (typeof value === 'number') {
      return <span className="text-blue-400">{value}</span>;
    }
    if (typeof value === 'string') {
      const displayValue = value.length > 100 ? value.slice(0, 100) + '...' : value;
      return <span className="text-green-400">&quot;{displayValue}&quot;</span>;
    }
    if (isArray) {
      return <span className="text-muted-foreground">[{(value as unknown[]).length}]</span>;
    }
    if (isObject) {
      return <span className="text-muted-foreground">{`{${Object.keys(value as object).length}}`}</span>;
    }
    return <span className="text-gray-300">{String(value)}</span>;
  };

  const isCopied = copiedPath === path;

  return (
    <div className="font-mono text-xs">
      <div
        className={`
          flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer
          transition-colors duration-150
          ${isHovered ? 'bg-card/5' : ''}
        `}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={toggleExpand}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Expand/Collapse Icon */}
        {isObject && !isEmpty ? (
          <span className="text-muted-foreground w-3">
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        ) : (
          <span className="w-3" />
        )}

        {/* Key Name */}
        <span className="text-cyan-400">{keyName}</span>
        <span className="text-muted-foreground">:</span>

        {/* Value (inline for primitives, type hint for objects) */}
        {(!isObject || !isExpanded || isEmpty) && (
          <span className="ml-1">{renderValue()}</span>
        )}

        {/* Copy Button */}
        {isHovered && (
          <button
            onClick={handleCopy}
            className={`
              ml-auto p-0.5 rounded transition-colors
              ${isCopied ? 'text-green-400' : 'text-muted-foreground hover:text-white hover:bg-card/10'}
            `}
            title={`Copy: {{${path}}}`}
          >
            {isCopied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        )}
      </div>

      {/* Children (expanded) */}
      {isObject && !isEmpty && isExpanded && (
        <div>
          {Object.entries(value as object).map(([childKey, childValue]) => (
            <JsonTreeNode
              key={childKey}
              keyName={isArray ? `[${childKey}]` : childKey}
              value={childValue}
              path={isArray ? `${path}[${childKey}]` : `${path}.${childKey}`}
              depth={depth + 1}
              onCopyPath={onCopyPath}
              copiedPath={copiedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function JsonTree({ data, path, depth = 0, onCopyPath }: JsonTreeProps) {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const handleCopyPath = useCallback((p: string) => {
    const variableSyntax = `{{${p}}}`;
    navigator.clipboard.writeText(variableSyntax).then(() => {
      setCopiedPath(p);
      setTimeout(() => setCopiedPath(null), 2000);
      onCopyPath(p);
    });
  }, [onCopyPath]);

  if (data === null || data === undefined) {
    return (
      <div className="text-muted-foreground text-xs italic px-2 py-1">
        No data
      </div>
    );
  }

  if (typeof data !== 'object') {
    return (
      <JsonTreeNode
        keyName="value"
        value={data}
        path={path}
        depth={depth}
        onCopyPath={handleCopyPath}
        copiedPath={copiedPath}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      {Object.entries(data).map(([key, value]) => (
        <JsonTreeNode
          key={key}
          keyName={key}
          value={value}
          path={`${path}.${key}`}
          depth={depth}
          onCopyPath={handleCopyPath}
          copiedPath={copiedPath}
        />
      ))}
    </div>
  );
}

// ============================================================================
// COLLAPSIBLE SECTION COMPONENT
// ============================================================================

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  statusBadge?: React.ReactNode;
}

function Section({ title, icon, count, defaultOpen = true, children, statusBadge }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-white/10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-card/5 transition-colors"
      >
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm font-medium text-white flex-1 text-left">{title}</span>
        {count !== undefined && (
          <span className="text-xs text-muted-foreground bg-card/5 px-1.5 py-0.5 rounded">
            {count}
          </span>
        )}
        {statusBadge}
        <span className="text-muted-foreground">
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// NODE STATUS BADGE
// ============================================================================

function NodeStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return (
        <span className="flex items-center gap-1 text-xs text-green-400">
          <CheckCircle size={12} />
        </span>
      );
    case 'running':
      return (
        <span className="flex items-center gap-1 text-xs text-blue-400">
          <Loader2 size={12} className="animate-spin" />
        </span>
      );
    case 'error':
      return (
        <span className="flex items-center gap-1 text-xs text-red-400">
          <AlertCircle size={12} />
        </span>
      );
    default:
      return null;
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DataContextPanel({
  executionState,
  activeNodeId,
  logs,
  status,
  progress,
  error,
  isOpen,
  onToggle,
  nodeNames = {},
}: DataContextPanelProps) {
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  const handleCopyPath = useCallback((path: string) => {
    setCopiedToast(`{{${path}}}`);
    setTimeout(() => setCopiedToast(null), 2000);
  }, []);

  // Count nodes by status
  const nodeCounts = useMemo(() => {
    if (!executionState?.nodes) return { total: 0, completed: 0, running: 0, error: 0 };

    const nodes = Object.values(executionState.nodes);
    return {
      total: nodes.length,
      completed: nodes.filter(n => n.meta.status === 'completed').length,
      running: nodes.filter(n => n.meta.status === 'running').length,
      error: nodes.filter(n => n.meta.status === 'error').length,
    };
  }, [executionState?.nodes]);

  const variableCount = executionState?.variables
    ? Object.keys(executionState.variables).length
    : 0;

  // Status indicator
  const statusConfig = {
    idle: { color: 'text-muted-foreground', bg: 'bg-muted/500/20', label: 'Idle' },
    running: { color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Running' },
    completed: { color: 'text-green-400', bg: 'bg-green-500/20', label: 'Completed' },
    error: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Error' },
    waiting_approval: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Waiting' },
    cancelled: { color: 'text-muted-foreground', bg: 'bg-muted/500/20', label: 'Cancelled' },
  };

  const currentStatus = statusConfig[status] || statusConfig.idle;

  if (!isOpen) {
    // Collapsed state - show toggle button
    return (
      <button
        onClick={onToggle}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-50
          bg-card border border-white/10 rounded-lg p-2
          hover:bg-gray-800 transition-colors shadow-xl"
        title="Open Data Context Panel"
      >
        <Database size={20} className="text-muted-foreground" />
      </button>
    );
  }

  return (
    <>
      {/* Copied Toast */}
      <AnimatePresence>
        {copiedToast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed bottom-4 right-4 z-50 bg-green-500/90 text-white px-3 py-2 rounded-lg text-sm font-mono shadow-lg"
          >
            Copied: {copiedToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Panel */}
      <motion.div
        initial={{ x: 320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 320, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-80 z-40
          bg-card/95 backdrop-blur-sm border-l border-white/10
          flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Data Context</h2>
          </div>
          <button
            onClick={onToggle}
            className="p-1 rounded hover:bg-card/10 transition-colors"
          >
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-4 py-2 border-b border-white/10 flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${currentStatus.bg} ${currentStatus.color}`}>
            {status === 'running' && <Loader2 size={12} className="animate-spin" />}
            {status === 'completed' && <CheckCircle size={12} />}
            {status === 'error' && <AlertCircle size={12} />}
            <span>{currentStatus.label}</span>
          </div>

          {status === 'running' && (
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 h-1 bg-card/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20">
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Global Context Section */}
          <Section
            title="Global Context"
            icon={<Globe size={14} />}
            defaultOpen={true}
          >
            {executionState?.global ? (
              <JsonTree
                data={{
                  userId: executionState.global.userId,
                  userEmail: executionState.global.userEmail,
                  workspaceId: executionState.global.workspaceId,
                  isTest: executionState.global.isTest,
                  timestamp: executionState.global.timestamp,
                }}
                path="global"
                onCopyPath={handleCopyPath}
              />
            ) : (
              <div className="text-xs text-muted-foreground italic px-2">
                No global context available
              </div>
            )}
          </Section>

          {/* Trigger Section */}
          <Section
            title="Trigger Data"
            icon={<Zap size={14} />}
            defaultOpen={true}
          >
            {executionState?.trigger ? (
              <JsonTree
                data={executionState.trigger}
                path="trigger"
                onCopyPath={handleCopyPath}
              />
            ) : (
              <div className="text-xs text-muted-foreground italic px-2">
                No trigger data
              </div>
            )}
          </Section>

          {/* Node Outputs Section */}
          <Section
            title="Node Outputs"
            icon={<Box size={14} />}
            count={nodeCounts.total}
            defaultOpen={true}
            statusBadge={
              nodeCounts.running > 0 ? (
                <span className="text-xs text-blue-400 flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" />
                  {nodeCounts.running}
                </span>
              ) : nodeCounts.error > 0 ? (
                <span className="text-xs text-red-400">{nodeCounts.error} errors</span>
              ) : nodeCounts.completed > 0 ? (
                <span className="text-xs text-green-400">{nodeCounts.completed} done</span>
              ) : null
            }
          >
            {executionState?.nodes && Object.keys(executionState.nodes).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(executionState.nodes).map(([nodeId, nodeState]) => (
                  <div
                    key={nodeId}
                    className={`
                      rounded border border-white/10 overflow-hidden
                      ${activeNodeId === nodeId ? 'ring-1 ring-blue-500/50' : ''}
                    `}
                  >
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-card/5">
                      <NodeStatusBadge status={nodeState.meta.status} />
                      <span className="text-xs font-medium text-white truncate flex-1">
                        {nodeNames[nodeId] || nodeId}
                      </span>
                      {nodeState.meta.durationMs && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={10} />
                          {nodeState.meta.durationMs}ms
                        </span>
                      )}
                    </div>
                    <div className="px-1 py-1 max-h-40 overflow-y-auto">
                      <JsonTree
                        data={nodeState.output}
                        path={`${nodeId}.output`}
                        onCopyPath={handleCopyPath}
                      />
                    </div>
                    {nodeState.meta.error && (
                      <div className="px-2 py-1 bg-red-500/10 text-xs text-red-300">
                        {nodeState.meta.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic px-2">
                No node outputs yet
              </div>
            )}
          </Section>

          {/* Variables Section */}
          <Section
            title="Variables"
            icon={<Variable size={14} />}
            count={variableCount}
            defaultOpen={variableCount > 0}
          >
            {executionState?.variables && Object.keys(executionState.variables).length > 0 ? (
              <JsonTree
                data={executionState.variables}
                path="variables"
                onCopyPath={handleCopyPath}
              />
            ) : (
              <div className="text-xs text-muted-foreground italic px-2">
                No variables set
              </div>
            )}
          </Section>

          {/* Execution Logs Section */}
          <Section
            title="Execution Logs"
            icon={<Clock size={14} />}
            count={logs.length}
            defaultOpen={false}
          >
            {logs.length > 0 ? (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {logs.slice().reverse().map((log, idx) => (
                  <div
                    key={idx}
                    className={`
                      text-xs px-2 py-1 rounded
                      ${log.level === 'error' ? 'bg-red-500/10 text-red-300' : ''}
                      ${log.level === 'success' ? 'bg-green-500/10 text-green-300' : ''}
                      ${log.level === 'warn' ? 'bg-yellow-500/10 text-yellow-300' : ''}
                      ${log.level === 'info' ? 'text-muted-foreground' : ''}
                      ${log.level === 'debug' ? 'text-muted-foreground' : ''}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="font-medium">{log.nodeName}</span>
                    </div>
                    <div className="mt-0.5">{log.message}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic px-2">
                No logs yet
              </div>
            )}
          </Section>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-white/10 text-xs text-muted-foreground">
          Click on any value to copy its variable path
        </div>
      </motion.div>
    </>
  );
}

export default DataContextPanel;
