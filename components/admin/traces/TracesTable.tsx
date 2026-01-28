/**
 * TRACES TABLE COMPONENT
 *
 * Data table for displaying AI request traces with filtering and pagination.
 * Uses the Command Core glass-command design system.
 */

'use client';

import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Timer,
  Clock,
  AlertTriangle,
  Zap,
  DollarSign,
  Activity,
} from 'lucide-react';
import type { TraceDetail } from './TraceDetailDrawer';

interface TracesTableProps {
  traces: TraceDetail[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    totalCost: number;
    totalTokens: number;
    avgResponseTime: number;
    successCount: number;
    failedCount: number;
    successRate: number;
  };
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onTraceClick: (trace: TraceDetail) => void;
  onFilterChange: (filters: TraceFilters) => void;
  filters: TraceFilters;
}

export interface TraceFilters {
  search: string;
  status: string;
  provider: string;
  model: string;
}

export default function TracesTable({
  traces,
  total,
  page,
  limit,
  totalPages,
  stats,
  isLoading,
  onPageChange,
  onRefresh,
  onTraceClick,
  onFilterChange,
  filters,
}: TracesTableProps) {
  const [showFilters, setShowFilters] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-emerald-400 bg-emerald-500/10';
      case 'failed':
        return 'text-red-400 bg-red-500/10';
      case 'rate_limited':
        return 'text-amber-400 bg-amber-500/10';
      case 'timeout':
        return 'text-orange-400 bg-orange-500/10';
      case 'cancelled':
        return 'text-zinc-400 bg-zinc-500/10';
      default:
        return 'text-blue-400 bg-blue-500/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-3.5 h-3.5" />;
      case 'failed':
        return <XCircle className="w-3.5 h-3.5" />;
      case 'rate_limited':
        return <Timer className="w-3.5 h-3.5" />;
      case 'timeout':
        return <Clock className="w-3.5 h-3.5" />;
      default:
        return <AlertTriangle className="w-3.5 h-3.5" />;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'text-emerald-400';
      case 'anthropic':
        return 'text-orange-400';
      case 'google':
        return 'text-blue-400';
      case 'azure_openai':
        return 'text-cyan-400';
      default:
        return 'text-zinc-400';
    }
  };

  const formatCost = (cost: number | null) => {
    if (cost === null || cost === undefined) return '–';
    return `$${cost.toFixed(4)}`;
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '–';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins}m`;
    if (diffHours < 24) return `vor ${diffHours}h`;
    if (diffDays < 7) return `vor ${diffDays}d`;

    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="glass-blade p-4">
          <div className="flex items-center gap-2 text-cyan-400/60 mb-1">
            <Activity className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Total</span>
          </div>
          <p className="text-xl font-bold text-white tabular-nums">
            {total.toLocaleString('de-DE')}
          </p>
        </div>
        <div className="glass-blade p-4">
          <div className="flex items-center gap-2 text-emerald-400/60 mb-1">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Success</span>
          </div>
          <p className="text-xl font-bold text-emerald-400 tabular-nums">
            {stats.successRate}%
          </p>
        </div>
        <div className="glass-blade p-4">
          <div className="flex items-center gap-2 text-amber-400/60 mb-1">
            <Zap className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Tokens</span>
          </div>
          <p className="text-xl font-bold text-white tabular-nums">
            {stats.totalTokens > 1000000
              ? `${(stats.totalTokens / 1000000).toFixed(1)}M`
              : stats.totalTokens > 1000
              ? `${(stats.totalTokens / 1000).toFixed(1)}K`
              : stats.totalTokens.toLocaleString('de-DE')}
          </p>
        </div>
        <div className="glass-blade p-4">
          <div className="flex items-center gap-2 text-violet-400/60 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Avg Time</span>
          </div>
          <p className="text-xl font-bold text-white tabular-nums">
            {stats.avgResponseTime.toLocaleString('de-DE')}ms
          </p>
        </div>
        <div className="glass-blade p-4">
          <div className="flex items-center gap-2 text-green-400/60 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Cost</span>
          </div>
          <p className="text-xl font-bold text-green-400 tabular-nums">
            ${stats.totalCost.toFixed(2)}
          </p>
        </div>
        <div className="glass-blade p-4">
          <div className="flex items-center gap-2 text-red-400/60 mb-1">
            <XCircle className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Failed</span>
          </div>
          <p className="text-xl font-bold text-red-400 tabular-nums">
            {stats.failedCount.toLocaleString('de-DE')}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="glass-command-panel p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Suche nach User, Agent, Trace ID..."
              value={filters.search}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 bg-card/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-lg border transition-all flex items-center gap-2 ${
              showFilters
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                : 'bg-card/5 border-white/10 text-white/60 hover:text-white hover:border-white/20'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm">Filter</span>
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-lg bg-card/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="text-sm">Refresh</span>
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Status</label>
              <select
                value={filters.status}
                onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 bg-card/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500/50"
              >
                <option value="">Alle Status</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="rate_limited">Rate Limited</option>
                <option value="timeout">Timeout</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Provider</label>
              <select
                value={filters.provider}
                onChange={(e) => onFilterChange({ ...filters, provider: e.target.value })}
                className="w-full px-3 py-2 bg-card/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500/50"
              >
                <option value="">Alle Provider</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google</option>
                <option value="azure_openai">Azure OpenAI</option>
                <option value="local">Local</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Model</label>
              <input
                type="text"
                placeholder="z.B. gpt-4o-mini"
                value={filters.model}
                onChange={(e) => onFilterChange({ ...filters, model: e.target.value })}
                className="w-full px-3 py-2 bg-card/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass-command-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cyan-500/20">
                <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-400/80 uppercase tracking-wide">
                  Zeit
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-400/80 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-400/80 uppercase tracking-wide">
                  Provider
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-400/80 uppercase tracking-wide">
                  Model
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-400/80 uppercase tracking-wide">
                  Agent
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-cyan-400/80 uppercase tracking-wide">
                  Tokens
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-cyan-400/80 uppercase tracking-wide">
                  Latenz
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-cyan-400/80 uppercase tracking-wide">
                  Kosten
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="h-4 bg-card/5 rounded w-16" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-6 bg-card/5 rounded-full w-20" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-card/5 rounded w-16" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-card/5 rounded w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-card/5 rounded w-20" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="h-4 bg-card/5 rounded w-12 ml-auto" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="h-4 bg-card/5 rounded w-14 ml-auto" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="h-4 bg-card/5 rounded w-16 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : traces.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="text-white/40">
                      <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Keine Traces gefunden</p>
                      <p className="text-xs mt-1">Versuche andere Filter oder warte auf neue Requests</p>
                    </div>
                  </td>
                </tr>
              ) : (
                traces.map((trace) => (
                  <tr
                    key={trace.id}
                    onClick={() => onTraceClick(trace)}
                    className="group hover:bg-cyan-500/5 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm text-white/60 group-hover:text-white/80">
                        {formatTime(trace.startedAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${getStatusColor(
                          trace.status
                        )}`}
                      >
                        {getStatusIcon(trace.status)}
                        {trace.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${getProviderColor(trace.provider)}`}>
                        {trace.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-white/80 font-mono">
                        {trace.model.length > 20 ? `${trace.model.substring(0, 20)}...` : trace.model}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-white/60">
                        {trace.agentId || '–'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-white/80 font-mono tabular-nums">
                        {trace.totalTokens?.toLocaleString('de-DE') || '–'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-white/80 font-mono tabular-nums">
                        {trace.responseTimeMs ? `${trace.responseTimeMs.toLocaleString('de-DE')}ms` : '–'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-emerald-400 font-mono tabular-nums">
                        {formatCost(trace.totalCost)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
            <p className="text-sm text-white/50">
              Zeige {(page - 1) * limit + 1} - {Math.min(page * limit, total)} von {total.toLocaleString('de-DE')}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="p-2 rounded-lg hover:bg-card/10 text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        page === pageNum
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'hover:bg-card/10 text-white/60'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-2 rounded-lg hover:bg-card/10 text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
