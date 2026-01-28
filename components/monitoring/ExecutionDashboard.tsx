'use client';

/**
 * EXECUTION DASHBOARD
 *
 * Complete monitoring dashboard for workflow executions
 */

import { useState, useEffect } from 'react';
import {
  getExecutions,
  getExecutionStats,
  cancelExecution,
  WorkflowExecution,
  ExecutionStats
} from '@/lib/api/executions-client';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Zap,
  Play,
  Square,
  Eye,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface ExecutionDashboardProps {
  onViewExecution?: (executionId: string) => void;
}

export function ExecutionDashboard({ onViewExecution }: ExecutionDashboardProps) {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [stats, setStats] = useState<ExecutionStats | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'success' | 'error'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load stats
      const statsData = await getExecutionStats(timeRange);
      setStats(statsData);

      // Load executions
      const executionsData = await getExecutions({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 50
      });
      setExecutions(executionsData.executions);
    } catch (error) {
      console.error('[DASHBOARD] Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleCancelExecution = async (executionId: string) => {
    try {
      await cancelExecution(executionId);
      await loadData(); // Reload data
    } catch (error) {
      console.error('[DASHBOARD] Failed to cancel execution:', error);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 10 seconds
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [timeRange, statusFilter]);

  if (isLoading && !stats) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-[rgb(var(--accent))] mx-auto mb-4" />
          <p className="text-sm text-text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Execution Monitoring</h1>
          <p className="text-sm text-text-muted mt-1">
            Track and monitor workflow execution performance
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '24h' | '7d' | '30d')}
            className="rounded-lg border border-white/10 bg-surface-1 px-4 py-2 text-sm text-text outline-none transition focus:border-[rgb(var(--accent))]"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface-1 px-4 py-2 text-sm text-text transition hover:bg-card/5 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Executions */}
          <StatCard
            icon={Activity}
            label="Total Executions"
            value={stats.total}
            color="#8B5CF6"
          />

          {/* Success Rate */}
          <StatCard
            icon={CheckCircle2}
            label="Success Rate"
            value={`${stats.successRate.toFixed(1)}%`}
            subValue={`${stats.success} successful`}
            color="#10B981"
          />

          {/* Failed */}
          <StatCard
            icon={XCircle}
            label="Failed"
            value={stats.error}
            subValue={`${((stats.error / stats.total) * 100).toFixed(1)}% error rate`}
            color="#EF4444"
          />

          {/* Avg Duration */}
          <StatCard
            icon={Zap}
            label="Avg Duration"
            value={formatDuration(stats.avgDuration)}
            color="#F59E0B"
          />
        </div>
      )}

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            statusFilter === 'all'
              ? 'bg-[rgb(var(--accent))] text-white'
              : 'border border-white/10 bg-surface-1 text-text hover:bg-card/5'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setStatusFilter('running')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            statusFilter === 'running'
              ? 'bg-[rgb(var(--accent))] text-white'
              : 'border border-white/10 bg-surface-1 text-text hover:bg-card/5'
          }`}
        >
          Running
        </button>
        <button
          onClick={() => setStatusFilter('success')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            statusFilter === 'success'
              ? 'bg-[rgb(var(--accent))] text-white'
              : 'border border-white/10 bg-surface-1 text-text hover:bg-card/5'
          }`}
        >
          Success
        </button>
        <button
          onClick={() => setStatusFilter('error')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            statusFilter === 'error'
              ? 'bg-[rgb(var(--accent))] text-white'
              : 'border border-white/10 bg-surface-1 text-text hover:bg-card/5'
          }`}
        >
          Error
        </button>
      </div>

      {/* Execution List */}
      <div className="rounded-lg border border-white/10 bg-surface-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-surface-0">
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Workflow ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Started
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {executions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-text-muted">
                    No executions found
                  </td>
                </tr>
              ) : (
                executions.map((execution) => (
                  <ExecutionRow
                    key={execution.id}
                    execution={execution}
                    onView={() => onViewExecution?.(execution.id)}
                    onCancel={() => handleCancelExecution(execution.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: any;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
}

function StatCard({ icon: Icon, label, value, subValue, color }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-white/10 bg-surface-1 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-2xl font-bold text-text">{value}</p>
        <p className="text-xs text-text-muted">{label}</p>
        {subValue && (
          <p className="text-xs text-text-muted mt-2">{subValue}</p>
        )}
      </div>
    </motion.div>
  );
}

interface ExecutionRowProps {
  execution: WorkflowExecution;
  onView: () => void;
  onCancel: () => void;
}

function ExecutionRow({ execution, onView, onCancel }: ExecutionRowProps) {
  const getStatusIcon = () => {
    switch (execution.status) {
      case 'running':
        return <Play className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = () => {
    const colors = {
      running: 'bg-blue-500/20 text-blue-500',
      success: 'bg-green-500/20 text-green-500',
      error: 'bg-red-500/20 text-red-500'
    };

    return (
      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${colors[execution.status]}`}>
        {getStatusIcon()}
        {execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}
      </span>
    );
  };

  const getDuration = () => {
    if (!execution.completedAt) {
      return <span className="text-text-muted">Running...</span>;
    }
    const duration = new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime();
    return formatDuration(duration);
  };

  return (
    <tr className="hover:bg-card/5 transition">
      <td className="px-6 py-4 whitespace-nowrap">
        {getStatusBadge()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-mono text-text">{execution.workflowId.slice(0, 8)}...</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-text-muted">
          {formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-text">{getDuration()}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <button
            onClick={onView}
            className="rounded-lg border border-white/10 bg-surface-0 p-2 text-text transition hover:bg-card/5"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          {execution.status === 'running' && (
            <button
              onClick={onCancel}
              className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-500 transition hover:bg-red-500/20"
              title="Cancel Execution"
            >
              <Square className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
