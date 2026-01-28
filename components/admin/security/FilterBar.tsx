/**
 * Filter Bar Component
 * Provides filtering and search capabilities for security events
 */

'use client';

import { Search, Filter, Download, RefreshCw } from 'lucide-react';

interface FilterBarProps {
  timeRange: string;
  severity: string;
  status: string;
  eventType: string;
  searchQuery: string;
  onTimeRangeChange: (value: string) => void;
  onSeverityChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onEventTypeChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onExport: () => void;
  onRefresh: () => void;
}

export default function FilterBar({
  timeRange,
  severity,
  status,
  eventType,
  searchQuery,
  onTimeRangeChange,
  onSeverityChange,
  onStatusChange,
  onEventTypeChange,
  onSearchChange,
  onExport,
  onRefresh,
}: FilterBarProps) {
  return (
    <div className="panel p-4">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        {/* Left Side: Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Suche nach User, IP, Event-ID..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-card/[0.02] border border-white/10 text-white text-sm placeholder:text-white/30 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
            />
          </div>

          {/* Time Range */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-white/40 hidden sm:block" />
            <select
              value={timeRange}
              onChange={(e) => onTimeRangeChange(e.target.value)}
              className="px-3 py-2 rounded-lg bg-card/[0.02] border border-white/10 text-white text-sm focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all cursor-pointer"
            >
              <option value="1h">Letzte Stunde</option>
              <option value="24h">Letzte 24h</option>
              <option value="7d">Letzte 7 Tage</option>
              <option value="30d">Letzte 30 Tage</option>
              <option value="all">Alle</option>
            </select>
          </div>

          {/* Severity */}
          <select
            value={severity}
            onChange={(e) => onSeverityChange(e.target.value)}
            className="px-3 py-2 rounded-lg bg-card/[0.02] border border-white/10 text-white text-sm focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all cursor-pointer"
          >
            <option value="all">Alle Severity</option>
            <option value="critical">🔴 Critical</option>
            <option value="high">🟠 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-3 py-2 rounded-lg bg-card/[0.02] border border-white/10 text-white text-sm focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all cursor-pointer"
          >
            <option value="all">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="reviewed">Überprüft</option>
            <option value="dismissed">Verworfen</option>
            <option value="blocked">Blockiert</option>
          </select>

          {/* Event Type */}
          <select
            value={eventType}
            onChange={(e) => onEventTypeChange(e.target.value)}
            className="px-3 py-2 rounded-lg bg-card/[0.02] border border-white/10 text-white text-sm focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all cursor-pointer"
          >
            <option value="all">Alle Event-Typen</option>
            <option value="brute_force">Brute-Force</option>
            <option value="failed_login">Failed Login</option>
            <option value="rate_limit">Rate-Limit</option>
            <option value="admin_access">Admin-Zugriff</option>
            <option value="unusual_location">Ungewöhnliche Location</option>
            <option value="sql_injection">SQL-Injection</option>
            <option value="xss_attempt">XSS-Versuch</option>
          </select>
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="px-4 py-2 rounded-lg bg-card/5 hover:bg-card/10 text-white/60 hover:text-white text-sm font-medium transition-all ring-1 ring-white/10 hover:ring-white/20 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={onExport}
            className="px-4 py-2 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-sm font-medium transition-all ring-1 ring-violet-500/30 hover:ring-violet-500/50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
}
