'use client';

/**
 * LogExplorer.tsx
 *
 * Phase 7: Operational Intelligence Layer - Frontend
 *
 * Advanced log explorer with full-text search, filters, and
 * virtualized list for handling large result sets.
 *
 * Features:
 * - Smart search bar with filter syntax (status:error, workflow:xyz)
 * - Virtualized list using react-window for performance
 * - JSON tree viewer for payload inspection
 * - Replay button for re-running executions
 * - Export functionality
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  Search,
  Filter,
  X,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Play,
  Copy,
  Download,
  ChevronDown,
  ChevronUp,
  Calendar,
  Tag,
  Workflow,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/contexts/ThemeContext';
import {
  useExecutionSearch,
  SearchQuery,
  SearchResult,
} from '@/hooks/useOpsMetrics';

// ============================================================================
// TYPES
// ============================================================================

interface FilterChip {
  type: 'status' | 'workflow' | 'tag' | 'date' | 'text';
  value: string;
  label: string;
}

interface LogRowProps {
  data: {
    results: SearchResult[];
    isDark: boolean;
    onSelect: (result: SearchResult) => void;
    selectedId: string | null;
  };
  index: number;
  style: React.CSSProperties;
}

// ============================================================================
// LOG ROW COMPONENT
// ============================================================================

function LogRow({ data, index, style }: LogRowProps) {
  const { results, isDark, onSelect, selectedId } = data;
  const log = results[index];

  if (!log) return null;

  const isSelected = selectedId === log.id;

  const statusIcon = {
    completed: <CheckCircle className="w-4 h-4 text-green-400" />,
    failed: <XCircle className="w-4 h-4 text-red-400" />,
    running: <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />,
    pending: <Clock className="w-4 h-4 text-zinc-400" />,
    cancelled: <X className="w-4 h-4 text-zinc-400" />,
  };

  const statusColor = {
    completed: 'text-green-400',
    failed: 'text-red-400',
    running: 'text-blue-400',
    pending: 'text-zinc-400',
    cancelled: 'text-zinc-400',
  };

  return (
    <div style={style}>
      <button
        onClick={() => onSelect(log)}
        className={cn(
          'w-full px-4 py-3 text-left flex items-center gap-4 border-b transition-colors',
          isDark
            ? 'border-white/5 hover:bg-white/5'
            : 'border-zinc-100 hover:bg-zinc-50',
          isSelected && (isDark ? 'bg-white/10' : 'bg-zinc-100')
        )}
      >
        {/* Status Icon */}
        <div className="flex-shrink-0">
          {statusIcon[log.status as keyof typeof statusIcon] || (
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-medium truncate',
                isDark ? 'text-white' : 'text-zinc-900'
              )}
            >
              {log.workflowName || 'Unknown Workflow'}
            </span>
            {log.triggeredBy && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded',
                  isDark ? 'bg-white/10 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
                )}
              >
                {log.triggeredBy}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span
              className={cn(
                'text-xs',
                statusColor[log.status as keyof typeof statusColor] ||
                  'text-zinc-400'
              )}
            >
              {log.status}
            </span>
            {log.errorMessage && (
              <span
                className={cn(
                  'text-xs truncate max-w-[200px]',
                  isDark ? 'text-red-400/80' : 'text-red-500'
                )}
              >
                {log.errorMessage}
              </span>
            )}
          </div>
        </div>

        {/* Duration */}
        {log.durationMs !== undefined && (
          <div className="flex-shrink-0 text-right">
            <span
              className={cn(
                'text-xs font-mono',
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              )}
            >
              {log.durationMs >= 1000
                ? `${(log.durationMs / 1000).toFixed(1)}s`
                : `${log.durationMs}ms`}
            </span>
          </div>
        )}

        {/* Timestamp */}
        <div className="flex-shrink-0 text-right min-w-[100px]">
          <span
            className={cn(
              'text-xs',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )}
          >
            {new Date(log.startedAt).toLocaleTimeString()}
          </span>
          <br />
          <span
            className={cn(
              'text-[10px]',
              isDark ? 'text-zinc-600' : 'text-zinc-300'
            )}
          >
            {new Date(log.startedAt).toLocaleDateString()}
          </span>
        </div>

        {/* Arrow */}
        <ChevronRight
          className={cn(
            'w-4 h-4 flex-shrink-0 transition-transform',
            isDark ? 'text-zinc-600' : 'text-zinc-300',
            isSelected && 'rotate-90'
          )}
        />
      </button>
    </div>
  );
}

// ============================================================================
// JSON TREE VIEWER
// ============================================================================

function JsonTreeViewer({
  data,
  isDark,
  level = 0,
}: {
  data: any;
  isDark: boolean;
  level?: number;
}) {
  const [expanded, setExpanded] = useState(level < 2);

  if (data === null) {
    return <span className="text-zinc-500">null</span>;
  }

  if (typeof data !== 'object') {
    if (typeof data === 'string') {
      return (
        <span className={isDark ? 'text-green-400' : 'text-green-600'}>
          "{data}"
        </span>
      );
    }
    if (typeof data === 'number') {
      return (
        <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>
          {data}
        </span>
      );
    }
    if (typeof data === 'boolean') {
      return (
        <span className={isDark ? 'text-yellow-400' : 'text-yellow-600'}>
          {data.toString()}
        </span>
      );
    }
    return <span>{String(data)}</span>;
  }

  const isArray = Array.isArray(data);
  const entries = Object.entries(data);
  const isEmpty = entries.length === 0;

  if (isEmpty) {
    return <span className="text-zinc-500">{isArray ? '[]' : '{}'}</span>;
  }

  return (
    <div className="font-mono text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1 hover:bg-white/5 rounded px-1 -ml-1"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        <span className="text-zinc-500">
          {isArray ? `[${entries.length}]` : `{${entries.length}}`}
        </span>
      </button>
      {expanded && (
        <div className="ml-4 border-l border-white/10 pl-2 mt-1 space-y-1">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-start gap-2">
              <span className={isDark ? 'text-purple-400' : 'text-purple-600'}>
                {isArray ? `[${key}]` : key}:
              </span>
              <JsonTreeViewer data={value} isDark={isDark} level={level + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DETAIL PANEL
// ============================================================================

function DetailPanel({
  log,
  isDark,
  onClose,
}: {
  log: SearchResult;
  isDark: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'payload' | 'error'>(
    'overview'
  );
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [log]);

  const handleReplay = useCallback(() => {
    // TODO: Implement replay functionality
    console.log('Replay execution:', log.executionId);
  }, [log]);

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25 }}
      className={cn(
        'w-[450px] h-full border-l flex flex-col',
        isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'px-4 py-3 border-b flex items-center justify-between',
          isDark ? 'border-white/10' : 'border-zinc-200'
        )}
      >
        <div>
          <h3
            className={cn(
              'text-sm font-medium',
              isDark ? 'text-white' : 'text-zinc-900'
            )}
          >
            Execution Details
          </h3>
          <p
            className={cn(
              'text-xs mt-0.5 font-mono',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )}
          >
            {log.executionId.slice(0, 8)}...
          </p>
        </div>
        <button
          onClick={onClose}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-100'
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Actions */}
      <div
        className={cn(
          'px-4 py-2 border-b flex items-center gap-2',
          isDark ? 'border-white/10' : 'border-zinc-200'
        )}
      >
        <button
          onClick={handleReplay}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            isDark
              ? 'bg-primary/20 text-primary hover:bg-primary/30'
              : 'bg-primary/10 text-primary hover:bg-primary/20'
          )}
        >
          <Play className="w-3.5 h-3.5" />
          Replay
        </button>
        <button
          onClick={handleCopy}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            isDark
              ? 'bg-white/5 text-zinc-300 hover:bg-white/10'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          )}
        >
          {copied ? (
            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
        <a
          href={`/studio/${log.workflowId}/executions/${log.executionId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            isDark
              ? 'bg-white/5 text-zinc-300 hover:bg-white/10'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          )}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View in Studio
        </a>
      </div>

      {/* Tabs */}
      <div
        className={cn(
          'px-4 border-b flex gap-4',
          isDark ? 'border-white/10' : 'border-zinc-200'
        )}
      >
        {(['overview', 'payload', 'error'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'py-2 text-xs font-medium border-b-2 transition-colors -mb-px capitalize',
              activeTab === tab
                ? isDark
                  ? 'border-primary text-white'
                  : 'border-primary text-zinc-900'
                : isDark
                ? 'border-transparent text-zinc-500 hover:text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-900'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div>
              <label
                className={cn(
                  'text-[10px] uppercase tracking-wide font-medium',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}
              >
                Workflow
              </label>
              <p
                className={cn(
                  'text-sm mt-1',
                  isDark ? 'text-white' : 'text-zinc-900'
                )}
              >
                {log.workflowName || 'Unknown'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className={cn(
                    'text-[10px] uppercase tracking-wide font-medium',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}
                >
                  Status
                </label>
                <p
                  className={cn(
                    'text-sm mt-1 capitalize',
                    log.status === 'completed'
                      ? 'text-green-400'
                      : log.status === 'failed'
                      ? 'text-red-400'
                      : isDark
                      ? 'text-white'
                      : 'text-zinc-900'
                  )}
                >
                  {log.status}
                </p>
              </div>
              <div>
                <label
                  className={cn(
                    'text-[10px] uppercase tracking-wide font-medium',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}
                >
                  Duration
                </label>
                <p
                  className={cn(
                    'text-sm mt-1',
                    isDark ? 'text-white' : 'text-zinc-900'
                  )}
                >
                  {log.durationMs !== undefined
                    ? log.durationMs >= 1000
                      ? `${(log.durationMs / 1000).toFixed(2)}s`
                      : `${log.durationMs}ms`
                    : '-'}
                </p>
              </div>
              <div>
                <label
                  className={cn(
                    'text-[10px] uppercase tracking-wide font-medium',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}
                >
                  Started
                </label>
                <p
                  className={cn(
                    'text-sm mt-1',
                    isDark ? 'text-white' : 'text-zinc-900'
                  )}
                >
                  {new Date(log.startedAt).toLocaleString()}
                </p>
              </div>
              <div>
                <label
                  className={cn(
                    'text-[10px] uppercase tracking-wide font-medium',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}
                >
                  Completed
                </label>
                <p
                  className={cn(
                    'text-sm mt-1',
                    isDark ? 'text-white' : 'text-zinc-900'
                  )}
                >
                  {log.completedAt
                    ? new Date(log.completedAt).toLocaleString()
                    : '-'}
                </p>
              </div>
              <div>
                <label
                  className={cn(
                    'text-[10px] uppercase tracking-wide font-medium',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}
                >
                  Trigger
                </label>
                <p
                  className={cn(
                    'text-sm mt-1 capitalize',
                    isDark ? 'text-white' : 'text-zinc-900'
                  )}
                >
                  {log.triggeredBy || 'Unknown'}
                </p>
              </div>
              <div>
                <label
                  className={cn(
                    'text-[10px] uppercase tracking-wide font-medium',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}
                >
                  Tokens
                </label>
                <p
                  className={cn(
                    'text-sm mt-1',
                    isDark ? 'text-white' : 'text-zinc-900'
                  )}
                >
                  {log.tokenCount?.toLocaleString() || '0'}
                </p>
              </div>
            </div>

            {log.highlights && (
              <div>
                <label
                  className={cn(
                    'text-[10px] uppercase tracking-wide font-medium',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}
                >
                  Matched Content
                </label>
                {log.highlights.errorMessage && (
                  <p
                    className={cn(
                      'text-sm mt-1 p-2 rounded',
                      isDark ? 'bg-white/5' : 'bg-zinc-50'
                    )}
                    dangerouslySetInnerHTML={{
                      __html: log.highlights.errorMessage,
                    }}
                  />
                )}
                {log.highlights.payload && (
                  <p
                    className={cn(
                      'text-sm mt-1 p-2 rounded',
                      isDark ? 'bg-white/5' : 'bg-zinc-50'
                    )}
                    dangerouslySetInnerHTML={{
                      __html: log.highlights.payload,
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'payload' && (
          <div
            className={cn(
              'p-3 rounded-lg',
              isDark ? 'bg-black/30' : 'bg-zinc-50'
            )}
          >
            <JsonTreeViewer data={log} isDark={isDark} />
          </div>
        )}

        {activeTab === 'error' && (
          <div className="space-y-4">
            {log.errorMessage ? (
              <>
                <div>
                  <label
                    className={cn(
                      'text-[10px] uppercase tracking-wide font-medium',
                      isDark ? 'text-zinc-500' : 'text-zinc-400'
                    )}
                  >
                    Error Message
                  </label>
                  <p
                    className={cn(
                      'text-sm mt-2 p-3 rounded-lg font-mono',
                      isDark
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-red-50 text-red-600'
                    )}
                  >
                    {log.errorMessage}
                  </p>
                </div>
              </>
            ) : (
              <div
                className={cn(
                  'text-center py-8 text-sm',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}
              >
                No error recorded for this execution
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LogExplorer() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<FilterChip[]>([]);
  const [selectedLog, setSelectedLog] = useState<SearchResult | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    data,
    isLoading,
    search,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
    currentPage,
    searchParams,
  } = useExecutionSearch();

  // Parse search input for filter syntax
  const parseSearchInput = useCallback((input: string) => {
    const newFilters: FilterChip[] = [];
    let textQuery = input;

    // Parse status:value
    const statusMatch = input.match(/status:(\w+)/g);
    if (statusMatch) {
      statusMatch.forEach((match) => {
        const value = match.split(':')[1];
        newFilters.push({ type: 'status', value, label: `Status: ${value}` });
        textQuery = textQuery.replace(match, '').trim();
      });
    }

    // Parse workflow:value
    const workflowMatch = input.match(/workflow:(\S+)/g);
    if (workflowMatch) {
      workflowMatch.forEach((match) => {
        const value = match.split(':')[1];
        newFilters.push({
          type: 'workflow',
          value,
          label: `Workflow: ${value}`,
        });
        textQuery = textQuery.replace(match, '').trim();
      });
    }

    // Parse tag:value
    const tagMatch = input.match(/tag:(\S+)/g);
    if (tagMatch) {
      tagMatch.forEach((match) => {
        const value = match.split(':')[1];
        newFilters.push({ type: 'tag', value, label: `Tag: ${value}` });
        textQuery = textQuery.replace(match, '').trim();
      });
    }

    if (textQuery.trim()) {
      newFilters.push({
        type: 'text',
        value: textQuery.trim(),
        label: textQuery.trim(),
      });
    }

    return newFilters;
  }, []);

  // Execute search
  const handleSearch = useCallback(() => {
    const parsedFilters = parseSearchInput(searchInput);
    setFilters(parsedFilters);

    const query: SearchQuery = {};

    parsedFilters.forEach((filter) => {
      switch (filter.type) {
        case 'status':
          query.status = filter.value;
          break;
        case 'workflow':
          query.workflowId = filter.value;
          break;
        case 'tag':
          query.tags = [...(query.tags || []), filter.value];
          break;
        case 'text':
          query.query = filter.value;
          break;
      }
    });

    search(query);
  }, [searchInput, parseSearchInput, search]);

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  // Remove filter
  const removeFilter = useCallback(
    (index: number) => {
      const newFilters = filters.filter((_, i) => i !== index);
      setFilters(newFilters);

      // Rebuild search input
      const newInput = newFilters
        .map((f) => {
          if (f.type === 'text') return f.value;
          return `${f.type}:${f.value}`;
        })
        .join(' ');

      setSearchInput(newInput);

      // Re-execute search
      const query: SearchQuery = {};
      newFilters.forEach((filter) => {
        switch (filter.type) {
          case 'status':
            query.status = filter.value;
            break;
          case 'workflow':
            query.workflowId = filter.value;
            break;
          case 'tag':
            query.tags = [...(query.tags || []), filter.value];
            break;
          case 'text':
            query.query = filter.value;
            break;
        }
      });
      search(query);
    },
    [filters, search]
  );

  // Quick filter buttons
  const quickFilters = [
    { label: 'Failed', query: 'status:failed' },
    { label: 'Slow (>10s)', query: 'duration:>10000' },
    { label: 'Today', query: 'date:today' },
    { label: 'Webhooks', query: 'trigger:webhook' },
  ];

  const itemData = useMemo(
    () => ({
      results: data?.results || [],
      isDark,
      onSelect: setSelectedLog,
      selectedId: selectedLog?.id || null,
    }),
    [data?.results, isDark, selectedLog]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Search Header */}
      <div
        className={cn(
          'border-b p-4',
          isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200'
        )}
      >
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search logs... (status:error, workflow:xyz, or free text)"
              className={cn(
                'w-full h-10 pl-10 pr-4 rounded-lg border text-sm transition-colors',
                isDark
                  ? 'bg-zinc-800 border-white/10 text-white placeholder:text-zinc-500 focus:border-primary/50'
                  : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-primary'
              )}
            />
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className={cn(
              'h-10 px-4 rounded-lg text-sm font-medium transition-colors',
              'bg-primary text-white hover:bg-primary/90',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Search'
            )}
          </button>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'h-10 px-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
              isDark
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2 mt-3">
          <span
            className={cn(
              'text-xs',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )}
          >
            Quick:
          </span>
          {quickFilters.map((qf) => (
            <button
              key={qf.label}
              onClick={() => {
                setSearchInput(qf.query);
                handleSearch();
              }}
              className={cn(
                'px-2 py-1 rounded text-xs font-medium transition-colors',
                isDark
                  ? 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              )}
            >
              {qf.label}
            </button>
          ))}
        </div>

        {/* Active Filters */}
        {filters.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {filters.map((filter, index) => (
              <span
                key={index}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
                  isDark
                    ? 'bg-primary/20 text-primary'
                    : 'bg-primary/10 text-primary'
                )}
              >
                {filter.label}
                <button
                  onClick={() => removeFilter(index)}
                  className="hover:bg-white/10 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={() => {
                setFilters([]);
                setSearchInput('');
              }}
              className={cn(
                'text-xs',
                isDark
                  ? 'text-zinc-500 hover:text-white'
                  : 'text-zinc-400 hover:text-zinc-900'
              )}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 flex overflow-hidden">
        {/* List */}
        <div className="flex-1 flex flex-col">
          {/* Results Header */}
          <div
            className={cn(
              'px-4 py-2 border-b flex items-center justify-between',
              isDark
                ? 'bg-zinc-900/50 border-white/5'
                : 'bg-zinc-50 border-zinc-100'
            )}
          >
            <span
              className={cn(
                'text-xs',
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              )}
            >
              {data?.total !== undefined ? (
                <>
                  {data.total.toLocaleString()} results
                  {!data.totalExact && ' (estimated)'}
                </>
              ) : (
                'Enter a search query'
              )}
            </span>

            {/* Pagination */}
            {data?.results && data.results.length > 0 && (
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-xs',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}
                >
                  Page {currentPage}
                </span>
                <button
                  onClick={prevPage}
                  disabled={!hasPrevPage}
                  className={cn(
                    'p-1 rounded transition-colors',
                    isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-200',
                    !hasPrevPage && 'opacity-30 cursor-not-allowed'
                  )}
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={nextPage}
                  disabled={!hasNextPage}
                  className={cn(
                    'p-1 rounded transition-colors',
                    isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-200',
                    !hasNextPage && 'opacity-30 cursor-not-allowed'
                  )}
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Virtualized List */}
          <div className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2
                  className={cn(
                    'w-8 h-8 animate-spin',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}
                />
              </div>
            ) : !data?.results || data.results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Search
                  className={cn(
                    'w-12 h-12 mb-4',
                    isDark ? 'text-zinc-700' : 'text-zinc-300'
                  )}
                />
                <p
                  className={cn(
                    'text-sm',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}
                >
                  {filters.length > 0
                    ? 'No results found'
                    : 'Enter a search query to find executions'}
                </p>
              </div>
            ) : (
              <AutoSizer>
                {({ height, width }) => (
                  <List
                    height={height}
                    width={width}
                    itemCount={data.results.length}
                    itemSize={72}
                    itemData={itemData}
                  >
                    {LogRow}
                  </List>
                )}
              </AutoSizer>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedLog && (
            <DetailPanel
              log={selectedLog}
              isDark={isDark}
              onClose={() => setSelectedLog(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default LogExplorer;
