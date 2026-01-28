'use client';

/**
 * ContextInspector Component
 *
 * Debug panel that shows the shared context during pipeline execution.
 * Displays context entries, artifacts, and variables in real-time.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Database,
  FileText,
  Variable,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Layers,
  Box,
  Image,
  Code,
  File,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// =====================================================
// TYPES
// =====================================================

interface ContextEntry {
  key: string;
  value: any;
  sourceNode: string;
  nodeType: string;
  timestamp: number;
  summary?: string;
}

interface ContextArtifact {
  id: string;
  type: 'file' | 'image' | 'code' | 'data' | 'text';
  name: string;
  content: string;
  mimeType?: string;
  sourceNode: string;
  createdAt: number;
  metadata?: Record<string, any>;
}

interface ExecutionContext {
  executionId: string;
  pipelineId: string;
  startedAt: number;
  entries: ContextEntry[];
  artifacts: ContextArtifact[];
  variables: Record<string, any>;
  nodeOutputs: Record<string, any>;
}

interface ContextInspectorProps {
  executionId: string;
  isLive?: boolean;
  pollInterval?: number;
  className?: string;
  onClose?: () => void;
}

// =====================================================
// JSON TREE VIEWER
// =====================================================

interface JsonTreeProps {
  data: any;
  name?: string;
  depth?: number;
  maxDepth?: number;
}

function JsonTree({ data, name, depth = 0, maxDepth = 4 }: JsonTreeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  if (depth > maxDepth) {
    return <span className="text-muted-foreground">[Max depth reached]</span>;
  }

  const type = Array.isArray(data) ? 'array' : typeof data;

  // Primitive values
  if (data === null) {
    return <span className="text-muted-foreground">null</span>;
  }

  if (type === 'undefined') {
    return <span className="text-muted-foreground">undefined</span>;
  }

  if (type === 'string') {
    const truncated = data.length > 100 ? data.substring(0, 100) + '...' : data;
    return <span className="text-emerald-400">"{truncated}"</span>;
  }

  if (type === 'number') {
    return <span className="text-amber-400">{data}</span>;
  }

  if (type === 'boolean') {
    return <span className="text-purple-400">{data ? 'true' : 'false'}</span>;
  }

  // Objects and Arrays
  if (type === 'object' || type === 'array') {
    const isArray = Array.isArray(data);
    const entries = Object.entries(data);
    const isEmpty = entries.length === 0;

    if (isEmpty) {
      return <span className="text-muted-foreground">{isArray ? '[]' : '{}'}</span>;
    }

    return (
      <div className="font-mono text-xs">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 hover:text-white transition"
        >
          {isExpanded ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronRight size={12} />
          )}
          {name && <span className="text-blue-400">{name}</span>}
          <span className="text-muted-foreground">
            {isArray ? `[${entries.length}]` : `{${entries.length}}`}
          </span>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="pl-4 border-l border-white/10 ml-1"
            >
              {entries.map(([key, value], idx) => (
                <div key={key} className="py-0.5">
                  <span className="text-blue-400">{key}</span>
                  <span className="text-muted-foreground">: </span>
                  <JsonTree data={value} depth={depth + 1} maxDepth={maxDepth} />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return <span className="text-muted-foreground">{String(data)}</span>;
}

// =====================================================
// CONTEXT ENTRY CARD
// =====================================================

interface EntryCardProps {
  entry: ContextEntry;
  isSelected: boolean;
  onSelect: () => void;
}

function EntryCard({ entry, isSelected, onSelect }: EntryCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(JSON.stringify(entry.value, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const timeAgo = useMemo(() => {
    const seconds = Math.floor((Date.now() - entry.timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  }, [entry.timestamp]);

  return (
    <motion.div
      layout
      onClick={onSelect}
      className={`
        p-3 rounded-lg cursor-pointer transition-all
        ${isSelected
          ? 'bg-blue-500/20 border-blue-500/50 border'
          : 'bg-card/5 border border-white/10 hover:border-white/20'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-blue-400" />
          <span className="text-sm font-medium text-white truncate max-w-[150px]">
            {entry.key}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-card/10 rounded transition"
            title="Copy value"
          >
            {copied ? (
              <Check size={12} className="text-emerald-400" />
            ) : (
              <Copy size={12} className="text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
        <span className="flex items-center gap-1">
          <Layers size={10} />
          {entry.sourceNode}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={10} />
          {timeAgo}
        </span>
      </div>

      {/* Summary or Preview */}
      {entry.summary ? (
        <p className="text-xs text-muted-foreground line-clamp-2">{entry.summary}</p>
      ) : (
        <div className="text-xs text-muted-foreground line-clamp-2 font-mono">
          {typeof entry.value === 'object'
            ? JSON.stringify(entry.value).substring(0, 80) + '...'
            : String(entry.value).substring(0, 80)}
        </div>
      )}
    </motion.div>
  );
}

// =====================================================
// ARTIFACT CARD
// =====================================================

interface ArtifactCardProps {
  artifact: ContextArtifact;
  onView: () => void;
}

function ArtifactCard({ artifact, onView }: ArtifactCardProps) {
  const getIcon = () => {
    switch (artifact.type) {
      case 'image':
        return <Image size={14} className="text-pink-400" />;
      case 'code':
        return <Code size={14} className="text-amber-400" />;
      case 'file':
        return <File size={14} className="text-blue-400" />;
      case 'data':
        return <Database size={14} className="text-emerald-400" />;
      default:
        return <FileText size={14} className="text-muted-foreground" />;
    }
  };

  return (
    <motion.div
      layout
      onClick={onView}
      className="p-3 rounded-lg bg-card/5 border border-white/10 hover:border-white/20 cursor-pointer transition-all"
    >
      <div className="flex items-center gap-2 mb-2">
        {getIcon()}
        <span className="text-sm font-medium text-white truncate">
          {artifact.name}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="uppercase">{artifact.type}</span>
        <span>from {artifact.sourceNode}</span>
      </div>
    </motion.div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function ContextInspector({
  executionId,
  isLive = false,
  pollInterval = 2000,
  className = '',
  onClose,
}: ContextInspectorProps) {
  const [context, setContext] = useState<ExecutionContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ContextEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'entries' | 'artifacts' | 'variables'>('entries');

  // Fetch context
  const fetchContext = useCallback(async () => {
    try {
      const response = await fetch(`/api/pipelines/context/${executionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch context');
      }
      const data = await response.json();
      if (data.success) {
        setContext(data.data);
        setError(null);
      } else {
        setError(data.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [executionId]);

  // Initial fetch and polling
  useEffect(() => {
    fetchContext();

    if (isLive) {
      const interval = setInterval(fetchContext, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchContext, isLive, pollInterval]);

  // Filter entries by search
  const filteredEntries = useMemo(() => {
    if (!context?.entries) return [];
    if (!searchQuery) return context.entries;

    const query = searchQuery.toLowerCase();
    return context.entries.filter(
      (entry) =>
        entry.key.toLowerCase().includes(query) ||
        entry.sourceNode.toLowerCase().includes(query) ||
        (entry.summary && entry.summary.toLowerCase().includes(query))
    );
  }, [context?.entries, searchQuery]);

  // Filter artifacts by search
  const filteredArtifacts = useMemo(() => {
    if (!context?.artifacts) return [];
    if (!searchQuery) return context.artifacts;

    const query = searchQuery.toLowerCase();
    return context.artifacts.filter(
      (artifact) =>
        artifact.name.toLowerCase().includes(query) ||
        artifact.sourceNode.toLowerCase().includes(query)
    );
  }, [context?.artifacts, searchQuery]);

  return (
    <div className={`flex flex-col h-full bg-card border-l border-white/10 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Box size={16} className="text-blue-400" />
          <h3 className="text-sm font-medium text-white">Context Inspector</h3>
          {isLive && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchContext}
            className="p-1.5 hover:bg-card/10 rounded transition"
            title="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-blue-400' : 'text-muted-foreground'} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-card/10 rounded transition"
            >
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-white/10">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search context..."
            className="w-full pl-9 pr-3 py-2 bg-card/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500/50 transition"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('entries')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition ${
            activeTab === 'entries'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-muted-foreground hover:text-gray-300'
          }`}
        >
          <Database size={14} />
          Entries ({context?.entries.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('artifacts')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition ${
            activeTab === 'artifacts'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-muted-foreground hover:text-gray-300'
          }`}
        >
          <FileText size={14} />
          Artifacts ({context?.artifacts.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('variables')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition ${
            activeTab === 'variables'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-muted-foreground hover:text-gray-300'
          }`}
        >
          <Variable size={14} />
          Variables
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Error State */}
        {error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-4">
              <AlertCircle size={24} className="text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={fetchContext}
                className="mt-3 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs transition"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !context && !error && (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw size={20} className="text-muted-foreground animate-spin" />
          </div>
        )}

        {/* Entries Tab */}
        {!error && context && activeTab === 'entries' && (
          <div className="flex-1 flex">
            {/* List */}
            <div className="w-1/2 border-r border-white/10 overflow-y-auto p-3 space-y-2">
              {filteredEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No context entries yet
                </div>
              ) : (
                filteredEntries.map((entry, idx) => (
                  <EntryCard
                    key={`${entry.key}-${idx}`}
                    entry={entry}
                    isSelected={selectedEntry === entry}
                    onSelect={() => setSelectedEntry(entry)}
                  />
                ))
              )}
            </div>

            {/* Detail */}
            <div className="w-1/2 overflow-y-auto p-3">
              {selectedEntry ? (
                <div>
                  <h4 className="text-sm font-medium text-white mb-3">
                    {selectedEntry.key}
                  </h4>
                  <JsonTree data={selectedEntry.value} />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Select an entry to view details
                </div>
              )}
            </div>
          </div>
        )}

        {/* Artifacts Tab */}
        {!error && context && activeTab === 'artifacts' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredArtifacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No artifacts generated
              </div>
            ) : (
              filteredArtifacts.map((artifact) => (
                <ArtifactCard
                  key={artifact.id}
                  artifact={artifact}
                  onView={() => {
                    // Could open a modal or side panel
                    console.log('View artifact:', artifact);
                  }}
                />
              ))
            )}
          </div>
        )}

        {/* Variables Tab */}
        {!error && context && activeTab === 'variables' && (
          <div className="flex-1 overflow-y-auto p-3">
            {Object.keys(context.variables).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No pipeline variables
              </div>
            ) : (
              <JsonTree data={context.variables} name="variables" />
            )}

            {Object.keys(context.nodeOutputs).length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Node Outputs
                </h4>
                <JsonTree data={context.nodeOutputs} name="nodeOutputs" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {context && (
        <div className="px-4 py-2 border-t border-white/10 bg-card/5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Execution: {executionId.substring(0, 8)}...</span>
            <span>
              Started: {new Date(context.startedAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// COMPACT VERSION FOR EMBEDDING
// =====================================================

interface CompactContextViewProps {
  executionId: string;
  maxEntries?: number;
}

export function CompactContextView({
  executionId,
  maxEntries = 5,
}: CompactContextViewProps) {
  const [entries, setEntries] = useState<ContextEntry[]>([]);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await fetch(`/api/pipelines/context/${executionId}`);
        const data = await response.json();
        if (data.success) {
          setEntries(data.data.entries.slice(-maxEntries));
        }
      } catch (err) {
        console.error('Failed to fetch context:', err);
      }
    };

    fetchEntries();
    const interval = setInterval(fetchEntries, 3000);
    return () => clearInterval(interval);
  }, [executionId, maxEntries]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="p-2 bg-card/5 rounded-lg border border-white/10">
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <Box size={12} />
        <span>Shared Context</span>
      </div>
      <div className="space-y-1">
        {entries.map((entry, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 text-xs px-2 py-1 bg-card/5 rounded"
          >
            <span className="text-blue-400 truncate max-w-[80px]">{entry.key}</span>
            <span className="text-muted-foreground">←</span>
            <span className="text-muted-foreground truncate">{entry.sourceNode}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ContextInspector;
