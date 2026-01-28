'use client';

/**
 * ExecutionInspector Component
 *
 * Slide-out panel showing detailed execution information for selected nodes
 * Uses react-json-view for JSON visualization
 *
 * Part of Phase 5: Live Visualization
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  SkipForward,
  Copy,
  Check,
} from 'lucide-react';
import { NodeExecutionStatus, NodeStatusData } from '@/hooks/useExecutionStream';

// Simple JSON viewer since react-json-view might not be installed
function JsonViewer({ data, name }: { data: unknown; name?: string }) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (data === null || data === undefined) {
    return <span className="text-muted-foreground italic">null</span>;
  }

  if (typeof data !== 'object') {
    if (typeof data === 'string') {
      return <span className="text-green-400">&quot;{data}&quot;</span>;
    }
    if (typeof data === 'number') {
      return <span className="text-blue-400">{data}</span>;
    }
    if (typeof data === 'boolean') {
      return <span className="text-purple-400">{data.toString()}</span>;
    }
    return <span className="text-muted-foreground">{String(data)}</span>;
  }

  const isArray = Array.isArray(data);
  const entries = isArray ? data.map((v, i) => [i, v] as const) : Object.entries(data);
  const isEmpty = entries.length === 0;

  return (
    <div className="font-mono text-sm">
      <div className="flex items-center gap-1">
        {!isEmpty && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 hover:bg-gray-700 rounded"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
        )}
        {name && <span className="text-muted-foreground">{name}: </span>}
        <span className="text-muted-foreground">{isArray ? '[' : '{'}</span>
        {!expanded && <span className="text-muted-foreground">...</span>}
        <button
          onClick={handleCopy}
          className="ml-2 p-1 hover:bg-gray-700 rounded text-muted-foreground hover:text-gray-300"
          title="Copy JSON"
        >
          {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
        </button>
      </div>

      {expanded && !isEmpty && (
        <div className="ml-4 border-l border-gray-700 pl-2">
          {entries.map(([key, value], index) => (
            <div key={key} className="py-0.5">
              <span className="text-cyan-400">{isArray ? '' : `"${key}"`}</span>
              {!isArray && <span className="text-muted-foreground">: </span>}
              <JsonViewer data={value} />
              {index < entries.length - 1 && <span className="text-muted-foreground">,</span>}
            </div>
          ))}
        </div>
      )}

      <span className="text-muted-foreground">{isArray ? ']' : '}'}</span>
    </div>
  );
}

interface ExecutionInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNodeId: string | null;
  selectedNodeLabel?: string;
  nodeStatus?: NodeStatusData;
  nodeInput?: unknown;
  nodeConfig?: unknown;
}

export function ExecutionInspector({
  isOpen,
  onClose,
  selectedNodeId,
  selectedNodeLabel,
  nodeStatus,
  nodeInput,
  nodeConfig,
}: ExecutionInspectorProps) {
  const [activeTab, setActiveTab] = useState<'output' | 'input' | 'config'>('output');

  // Reset tab when node changes
  useEffect(() => {
    setActiveTab('output');
  }, [selectedNodeId]);

  const getStatusIcon = (status?: NodeExecutionStatus) => {
    switch (status) {
      case 'running':
        return <Loader2 size={16} className="text-blue-400 animate-spin" />;
      case 'completed':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'error':
        return <XCircle size={16} className="text-red-400" />;
      case 'waiting_approval':
        return <AlertTriangle size={16} className="text-orange-400" />;
      case 'skipped':
        return <SkipForward size={16} className="text-muted-foreground" />;
      default:
        return <Clock size={16} className="text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status?: NodeExecutionStatus) => {
    switch (status) {
      case 'running':
        return 'Running';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      case 'waiting_approval':
        return 'Waiting for Approval';
      case 'skipped':
        return 'Skipped';
      default:
        return 'Pending';
    }
  };

  const getStatusColor = (status?: NodeExecutionStatus) => {
    switch (status) {
      case 'running':
        return 'text-blue-400 bg-blue-400/10';
      case 'completed':
        return 'text-green-400 bg-green-400/10';
      case 'error':
        return 'text-red-400 bg-red-400/10';
      case 'waiting_approval':
        return 'text-orange-400 bg-orange-400/10';
      case 'skipped':
        return 'text-muted-foreground bg-gray-400/10';
      default:
        return 'text-muted-foreground bg-muted/500/10';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute right-0 top-0 bottom-0 w-[400px] bg-card border-l border-gray-700 shadow-2xl z-50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold text-white">
                Node Inspector
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-800 rounded text-muted-foreground hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {selectedNodeId ? (
            <>
              {/* Node Info */}
              <div className="px-4 py-3 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  {getStatusIcon(nodeStatus?.status)}
                  <span className="font-medium text-white">
                    {selectedNodeLabel || selectedNodeId}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(nodeStatus?.status)}`}
                  >
                    {getStatusLabel(nodeStatus?.status)}
                  </span>

                  {nodeStatus?.startedAt && (
                    <span className="text-xs text-muted-foreground">
                      Started: {new Date(nodeStatus.startedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                {nodeStatus?.duration && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Duration: {nodeStatus.duration}ms
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-700">
                {(['output', 'input', 'config'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`
                      flex-1 px-4 py-2 text-sm font-medium transition-colors
                      ${activeTab === tab
                        ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5'
                        : 'text-muted-foreground hover:text-gray-300 hover:bg-gray-800'
                      }
                    `}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-4">
                {activeTab === 'output' && (
                  <div>
                    {nodeStatus?.error ? (
                      <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                        <div className="flex items-center gap-2 text-red-400 font-medium mb-2">
                          <XCircle size={14} />
                          <span>Error</span>
                        </div>
                        <pre className="text-sm text-red-300 whitespace-pre-wrap">
                          {nodeStatus.error}
                        </pre>
                      </div>
                    ) : nodeStatus?.output ? (
                      <div className="bg-gray-800/50 rounded-lg p-3 overflow-x-auto">
                        <JsonViewer data={nodeStatus.output} name="output" />
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        {nodeStatus?.status === 'pending' ? (
                          <div>
                            <Clock size={24} className="mx-auto mb-2 opacity-50" />
                            <p>Node has not executed yet</p>
                          </div>
                        ) : nodeStatus?.status === 'running' ? (
                          <div>
                            <Loader2 size={24} className="mx-auto mb-2 animate-spin text-blue-400" />
                            <p>Executing...</p>
                          </div>
                        ) : (
                          <p>No output data available</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'input' && (
                  <div>
                    {nodeInput ? (
                      <div className="bg-gray-800/50 rounded-lg p-3 overflow-x-auto">
                        <JsonViewer data={nodeInput} name="input" />
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No input data available</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'config' && (
                  <div>
                    {nodeConfig ? (
                      <div className="bg-gray-800/50 rounded-lg p-3 overflow-x-auto">
                        <JsonViewer data={nodeConfig} name="config" />
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No configuration data available</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="text-4xl mb-2">🔍</div>
                <p>Select a node to inspect</p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ExecutionInspector;
