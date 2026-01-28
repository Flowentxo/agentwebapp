'use client';

import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Zap,
  Clock,
} from 'lucide-react';
import {
  LedgerEntry,
  formatCurrency,
  formatCompact,
  formatPercent,
  formatTimestampFull,
} from '@/lib/finops-terminal-data';

interface GranularLedgerProps {
  entries: LedgerEntry[];
}

type SortField = 'timestamp' | 'cost' | 'tokens' | 'latency' | 'cache' | 'model' | 'agent';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZES = [25, 50, 100, 250];

export function GranularLedger({ entries }: GranularLedgerProps) {
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [modelFilter, setModelFilter] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');

  // Get unique models and agents for filters
  const models = useMemo(() => [...new Set(entries.map((e) => e.modelId))], [entries]);
  const agents = useMemo(() => [...new Set(entries.map((e) => e.agentId))], [entries]);

  // Filter and sort entries
  const filteredAndSortedEntries = useMemo(() => {
    let result = [...entries];

    // Apply filters
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.requestId.toLowerCase().includes(query) ||
          e.userName.toLowerCase().includes(query) ||
          e.agentName.toLowerCase().includes(query) ||
          e.modelName.toLowerCase().includes(query) ||
          e.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    if (modelFilter) {
      result = result.filter((e) => e.modelId === modelFilter);
    }

    if (agentFilter) {
      result = result.filter((e) => e.agentId === agentFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((e) => (statusFilter === 'success' ? e.success : !e.success));
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'cost':
          comparison = a.cost - b.cost;
          break;
        case 'tokens':
          comparison = a.totalTokens - b.totalTokens;
          break;
        case 'latency':
          comparison = a.latencyMs - b.latencyMs;
          break;
        case 'cache':
          comparison = a.cacheHitRate - b.cacheHitRate;
          break;
        case 'model':
          comparison = a.modelName.localeCompare(b.modelName);
          break;
        case 'agent':
          comparison = a.agentName.localeCompare(b.agentName);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [entries, searchQuery, modelFilter, agentFilter, statusFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedEntries.length / pageSize);
  const paginatedEntries = filteredAndSortedEntries.slice(
    page * pageSize,
    (page + 1) * pageSize
  );

  // Toggle sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort indicator
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-zinc-600" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-blue-400" />
    ) : (
      <ChevronDown className="w-3 h-3 text-blue-400" />
    );
  };

  // Calculate aggregates
  const aggregates = useMemo(() => {
    const visible = filteredAndSortedEntries;
    const totalCost = visible.reduce((sum, e) => sum + e.cost, 0);
    const totalTokens = visible.reduce((sum, e) => sum + e.totalTokens, 0);
    const avgLatency = visible.length > 0
      ? visible.reduce((sum, e) => sum + e.latencyMs, 0) / visible.length
      : 0;
    const avgCache = visible.length > 0
      ? visible.reduce((sum, e) => sum + e.cacheHitRate, 0) / visible.length
      : 0;
    const errorRate = visible.length > 0
      ? (visible.filter((e) => !e.success).length / visible.length) * 100
      : 0;

    return { totalCost, totalTokens, avgLatency, avgCache, errorRate };
  }, [filteredAndSortedEntries]);

  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-medium text-zinc-200">Transaction Ledger</h3>

          {/* Quick Aggregates */}
          <div className="flex items-center gap-3 text-[10px]">
            <div className="flex items-center gap-1">
              <span className="text-zinc-500">Total:</span>
              <span className="font-mono text-zinc-300">{formatCurrency(aggregates.totalCost, 4)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-zinc-500">Tokens:</span>
              <span className="font-mono text-zinc-300">{formatCompact(aggregates.totalTokens)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-zinc-500">Avg Latency:</span>
              <span className="font-mono text-zinc-300">{aggregates.avgLatency.toFixed(0)}ms</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-zinc-500">Cache:</span>
              <span className="font-mono text-emerald-400">{formatPercent(aggregates.avgCache * 100)}</span>
            </div>
            {aggregates.errorRate > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-zinc-500">Errors:</span>
                <span className="font-mono text-red-400">{formatPercent(aggregates.errorRate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="w-40 pl-7 pr-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded placeholder-zinc-500 text-zinc-300 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Model Filter */}
          <select
            value={modelFilter || ''}
            onChange={(e) => {
              setModelFilter(e.target.value || null);
              setPage(0);
            }}
            className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Models</option>
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>

          {/* Agent Filter */}
          <select
            value={agentFilter || ''}
            onChange={(e) => {
              setAgentFilter(e.target.value || null);
              setPage(0);
            }}
            className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Agents</option>
            {agents.map((agent) => (
              <option key={agent} value={agent}>
                {agent}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="flex items-center rounded border border-zinc-700 overflow-hidden">
            {(['all', 'success', 'error'] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(0);
                }}
                className={`px-2 py-1 text-[10px] transition-colors ${
                  statusFilter === status
                    ? 'bg-zinc-700 text-zinc-200'
                    : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {status === 'all' ? 'All' : status === 'success' ? '✓' : '✗'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="text-left px-3 py-2 w-8">
                <span className="text-[10px] font-medium text-zinc-500">#</span>
              </th>
              <th className="text-left px-3 py-2">
                <button
                  onClick={() => toggleSort('timestamp')}
                  className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-300"
                >
                  Timestamp
                  <SortIndicator field="timestamp" />
                </button>
              </th>
              <th className="text-left px-3 py-2">
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Request ID
                </span>
              </th>
              <th className="text-left px-3 py-2">
                <button
                  onClick={() => toggleSort('agent')}
                  className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-300"
                >
                  Agent
                  <SortIndicator field="agent" />
                </button>
              </th>
              <th className="text-left px-3 py-2">
                <button
                  onClick={() => toggleSort('model')}
                  className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-300"
                >
                  Model
                  <SortIndicator field="model" />
                </button>
              </th>
              <th className="text-right px-3 py-2">
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Prompt
                </span>
              </th>
              <th className="text-right px-3 py-2">
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Completion
                </span>
              </th>
              <th className="text-right px-3 py-2">
                <button
                  onClick={() => toggleSort('tokens')}
                  className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-300 ml-auto"
                >
                  Total
                  <SortIndicator field="tokens" />
                </button>
              </th>
              <th className="text-right px-3 py-2">
                <button
                  onClick={() => toggleSort('cost')}
                  className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-300 ml-auto"
                >
                  Cost
                  <SortIndicator field="cost" />
                </button>
              </th>
              <th className="text-right px-3 py-2">
                <button
                  onClick={() => toggleSort('latency')}
                  className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-300 ml-auto"
                >
                  Latency
                  <SortIndicator field="latency" />
                </button>
              </th>
              <th className="text-right px-3 py-2">
                <button
                  onClick={() => toggleSort('cache')}
                  className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-300 ml-auto"
                >
                  Cache
                  <SortIndicator field="cache" />
                </button>
              </th>
              <th className="text-center px-3 py-2 w-10">
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  OK
                </span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-800/30">
            {paginatedEntries.map((entry, idx) => (
              <tr
                key={entry.id}
                className="group hover:bg-zinc-800/30 transition-colors text-xs"
              >
                <td className="px-3 py-1.5 text-[10px] text-zinc-600 font-mono">
                  {page * pageSize + idx + 1}
                </td>
                <td className="px-3 py-1.5">
                  <span className="text-zinc-400 font-mono text-[10px]">
                    {formatTimestampFull(entry.timestamp)}
                  </span>
                </td>
                <td className="px-3 py-1.5">
                  <span className="text-zinc-500 font-mono text-[10px] truncate max-w-[100px] block">
                    {entry.requestId}
                  </span>
                </td>
                <td className="px-3 py-1.5">
                  <span className="text-zinc-300 text-[11px]">{entry.agentName}</span>
                </td>
                <td className="px-3 py-1.5">
                  <span className="text-zinc-400 text-[10px] font-mono">{entry.modelId}</span>
                </td>
                <td className="px-3 py-1.5 text-right">
                  <span className="text-zinc-400 font-mono text-[10px]">
                    {formatCompact(entry.promptTokens)}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right">
                  <span className="text-zinc-400 font-mono text-[10px]">
                    {formatCompact(entry.completionTokens)}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right">
                  <span className="text-zinc-300 font-mono text-[10px] font-medium">
                    {formatCompact(entry.totalTokens)}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right">
                  <span className="text-amber-400 font-mono text-[10px] font-semibold">
                    ${entry.cost.toFixed(4)}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right">
                  <span className={`font-mono text-[10px] ${
                    entry.latencyMs > 3000
                      ? 'text-red-400'
                      : entry.latencyMs > 1500
                        ? 'text-amber-400'
                        : 'text-zinc-400'
                  }`}>
                    {entry.latencyMs}ms
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right">
                  <span className={`font-mono text-[10px] ${
                    entry.cacheHitRate > 0.3
                      ? 'text-emerald-400'
                      : entry.cacheHitRate > 0.15
                        ? 'text-zinc-400'
                        : 'text-zinc-500'
                  }`}>
                    {formatPercent(entry.cacheHitRate * 100)}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-center">
                  {entry.success ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                  ) : (
                    <div className="flex items-center justify-center" title={entry.errorCode}>
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>Showing</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-300 focus:outline-none"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span>
            of {filteredAndSortedEntries.length.toLocaleString()} entries
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(0)}
            disabled={page === 0}
            className="p-1 rounded hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronsLeft className="w-4 h-4 text-zinc-400" />
          </button>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1 rounded hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-zinc-400" />
          </button>

          <span className="px-3 text-xs text-zinc-400">
            Page {page + 1} of {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-1 rounded hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </button>
          <button
            onClick={() => setPage(totalPages - 1)}
            disabled={page >= totalPages - 1}
            className="p-1 rounded hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronsRight className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
