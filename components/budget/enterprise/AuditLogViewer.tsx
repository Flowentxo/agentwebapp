'use client';

/**
 * Enterprise Audit Log Viewer Component
 * Displays comprehensive audit logs for compliance and monitoring
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Info,
  AlertCircle,
  Download,
  RefreshCw,
  User,
  Shield,
  DollarSign,
  Settings,
  Clock,
  X,
  Eye,
} from 'lucide-react';

type AuditSeverity = 'info' | 'warning' | 'critical';
type ActionCategory =
  | 'budget_change'
  | 'limit_update'
  | 'top_up'
  | 'allocation'
  | 'project_change'
  | 'cost_center_change'
  | 'user_action'
  | 'system_action'
  | 'security';

interface AuditLog {
  id: string;
  userId: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  actionCategory: ActionCategory;
  severity: AuditSeverity;
  resourceType: string;
  resourceId: string;
  resourceName?: string;
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  changeDescription?: string;
  ipAddress?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface AuditLogViewerProps {
  className?: string;
  defaultDateRange?: number; // days
}

const severityConfig: Record<AuditSeverity, { label: string; color: string; icon: any; bg: string }> = {
  info: { label: 'Info', color: 'text-blue-400', icon: Info, bg: 'bg-blue-500/10 border-blue-500/20' },
  warning: { label: 'Warning', color: 'text-orange-400', icon: AlertTriangle, bg: 'bg-orange-500/10 border-orange-500/20' },
  critical: { label: 'Critical', color: 'text-red-400', icon: AlertCircle, bg: 'bg-red-500/10 border-red-500/20' },
};

const categoryConfig: Record<ActionCategory, { label: string; icon: any; color: string }> = {
  budget_change: { label: 'Budget Change', icon: DollarSign, color: 'text-green-400' },
  limit_update: { label: 'Limit Update', icon: Settings, color: 'text-blue-400' },
  top_up: { label: 'Top Up', icon: DollarSign, color: 'text-emerald-400' },
  allocation: { label: 'Allocation', icon: DollarSign, color: 'text-purple-400' },
  project_change: { label: 'Project', icon: FileText, color: 'text-indigo-400' },
  cost_center_change: { label: 'Cost Center', icon: Settings, color: 'text-cyan-400' },
  user_action: { label: 'User Action', icon: User, color: 'text-pink-400' },
  system_action: { label: 'System', icon: Settings, color: 'text-muted-foreground' },
  security: { label: 'Security', icon: Shield, color: 'text-red-400' },
};

export function AuditLogViewer({
  className = '',
  defaultDateRange = 30,
}: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ActionCategory | 'all'>('all');
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    totalInRange: number;
  } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: '100',
      });

      if (severityFilter !== 'all') {
        params.append('severity', severityFilter);
      }
      if (categoryFilter !== 'all') {
        params.append('actionCategory', categoryFilter);
      }

      const response = await fetch(`/api/budget/enterprise/audit-logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');

      const data = await response.json();
      setLogs(data.data.logs || []);
      setSummary(data.data.summary || null);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, severityFilter, categoryFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);

      const response = await fetch(
        `/api/budget/enterprise/export?type=audit-logs&format=csv&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );

      if (!response.ok) throw new Error('Failed to export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.resourceName?.toLowerCase().includes(searchLower) ||
      log.userEmail?.toLowerCase().includes(searchLower) ||
      log.changeDescription?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className={`rounded-3xl bg-card/[0.02] border border-white/[0.05] p-8 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-card/10 rounded w-1/3" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-card/10 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-3xl bg-card/[0.02] border border-white/[0.05] overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-white/[0.05]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30">
              <FileText className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">
                Audit Logs
              </h3>
              <p className="text-[10px] text-white/30 mt-0.5">
                {summary?.totalInRange || 0} events in last {dateRange} days
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs()}
              className="p-2 rounded-lg bg-card/5 hover:bg-card/10 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4 text-white/40" />
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-4 gap-3 mb-4">
            {Object.entries(summary.bySeverity).map(([severity, count]) => {
              const config = severityConfig[severity as AuditSeverity];
              if (!config) return null;
              const SeverityIcon = config.icon;
              return (
                <div
                  key={severity}
                  className={`p-3 rounded-xl border ${config.bg}`}
                >
                  <div className="flex items-center justify-between">
                    <SeverityIcon className={`h-4 w-4 ${config.color}`} />
                    <span className={`text-lg font-bold ${config.color}`}>{count}</span>
                  </div>
                  <p className="text-[10px] text-white/40 mt-1 capitalize">{severity}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as AuditSeverity | 'all')}
            className="px-4 py-2.5 rounded-xl bg-card/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-white/20"
          >
            <option value="all">All Severity</option>
            {Object.entries(severityConfig).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as ActionCategory | 'all')}
            className="px-4 py-2.5 rounded-xl bg-card/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-white/20"
          >
            <option value="all">All Categories</option>
            {Object.entries(categoryConfig).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(parseInt(e.target.value))}
            className="px-4 py-2.5 rounded-xl bg-card/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-white/20"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="m-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-card/10 rounded">
            <X className="h-4 w-4 text-red-400" />
          </button>
        </div>
      )}

      {/* Log List */}
      <div className="max-h-[600px] overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-white/10 mx-auto mb-4" />
            <p className="text-sm text-white/40">No audit logs found</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {filteredLogs.map((log) => {
              const severityConf = severityConfig[log.severity];
              const categoryConf = categoryConfig[log.actionCategory];
              const SeverityIcon = severityConf?.icon || Info;
              const CategoryIcon = categoryConf?.icon || Settings;
              const isExpanded = expandedLogId === log.id;

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="group"
                >
                  <div
                    className="p-4 hover:bg-card/[0.02] transition-colors cursor-pointer"
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Severity Icon */}
                      <div className={`p-2 rounded-lg ${severityConf?.bg || 'bg-card/5'}`}>
                        <SeverityIcon className={`h-4 w-4 ${severityConf?.color || 'text-white/40'}`} />
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white">
                            {log.action.replace(/_/g, ' ').replace(/\./g, ' › ')}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 ${
                              categoryConf?.color || 'text-white/40'
                            } bg-card/5`}
                          >
                            <CategoryIcon className="h-3 w-3" />
                            {categoryConf?.label || log.actionCategory}
                          </span>
                        </div>

                        {log.changeDescription && (
                          <p className="text-xs text-white/50 mt-1 truncate">
                            {log.changeDescription}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-[10px] text-white/30">
                          {log.userEmail && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.userEmail}
                            </span>
                          )}
                          {log.resourceName && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {log.resourceName}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Expand Button */}
                      <button className="p-2 rounded-lg hover:bg-card/10 transition-colors">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-white/40" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-white/40" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 ml-11">
                          <div className="p-4 rounded-xl bg-card/[0.02] border border-white/[0.05] space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <p className="text-white/30 mb-1">Timestamp</p>
                                <p className="text-white/70">{formatFullDate(log.createdAt)}</p>
                              </div>
                              <div>
                                <p className="text-white/30 mb-1">Resource</p>
                                <p className="text-white/70">
                                  {log.resourceType}: {log.resourceId}
                                </p>
                              </div>
                              {log.userRole && (
                                <div>
                                  <p className="text-white/30 mb-1">User Role</p>
                                  <p className="text-white/70 capitalize">{log.userRole}</p>
                                </div>
                              )}
                              {log.ipAddress && (
                                <div>
                                  <p className="text-white/30 mb-1">IP Address</p>
                                  <p className="text-white/70 font-mono">{log.ipAddress}</p>
                                </div>
                              )}
                            </div>

                            {(log.previousValue || log.newValue) && (
                              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/[0.05]">
                                {log.previousValue && (
                                  <div>
                                    <p className="text-white/30 text-xs mb-2">Previous Value</p>
                                    <pre className="text-[10px] text-white/50 bg-card/[0.02] p-2 rounded-lg overflow-x-auto">
                                      {JSON.stringify(log.previousValue, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.newValue && (
                                  <div>
                                    <p className="text-white/30 text-xs mb-2">New Value</p>
                                    <pre className="text-[10px] text-white/50 bg-card/[0.02] p-2 rounded-lg overflow-x-auto">
                                      {JSON.stringify(log.newValue, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}

                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div className="pt-3 border-t border-white/[0.05]">
                                <p className="text-white/30 text-xs mb-2">Metadata</p>
                                <pre className="text-[10px] text-white/50 bg-card/[0.02] p-2 rounded-lg overflow-x-auto">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
