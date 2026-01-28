'use client';

/**
 * Pipeline Analytics Dashboard
 *
 * Comprehensive analytics view for pipeline executions
 * Shows metrics, charts, execution history, and error breakdown
 */

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Activity,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Filter,
  Calendar,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';

// =====================================================
// TYPES
// =====================================================

interface PipelineMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  totalCost: number;
  avgCostPerRun: number;
  avgDuration: number;
  totalDuration: number;
}

interface TimeSeriesDataPoint {
  date: string;
  count: number;
  cost: number;
  successCount: number;
  failureCount: number;
  avgDuration: number;
}

interface ExecutionRecord {
  id: string;
  pipelineId: string;
  pipelineName: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  cost: number;
  nodeCount: number;
  errorMessage?: string;
}

interface NodeErrorStats {
  nodeId: string;
  nodeType: string;
  nodeName: string;
  errorCount: number;
  errorRate: number;
  lastError: string;
  lastErrorAt: string;
}

interface PipelineAnalytics {
  metrics: PipelineMetrics;
  timeSeries: TimeSeriesDataPoint[];
  recentExecutions: ExecutionRecord[];
  nodeErrors: NodeErrorStats[];
  topPipelines: Array<{
    id: string;
    name: string;
    runCount: number;
    totalCost: number;
    successRate: number;
  }>;
}

// =====================================================
// CONSTANTS
// =====================================================

const CHART_COLORS = {
  primary: '#6366F1',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  secondary: '#8B5CF6',
  muted: '#6B7280',
};

const DATE_RANGES = [
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
];

// =====================================================
// COMPONENTS
// =====================================================

function MetricCard({
  title,
  value,
  subValue,
  trend,
  icon: Icon,
  color = 'primary',
}: {
  title: string;
  value: string | number;
  subValue?: string;
  trend?: { value: number; positive: boolean };
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color?: 'primary' | 'success' | 'error' | 'warning';
}) {
  const colorClasses = {
    primary: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  };

  return (
    <div className="p-4 rounded-xl bg-card border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon size={18} />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs ${
              trend.positive ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {trend.positive ? (
              <ArrowUpRight size={14} />
            ) : (
              <ArrowDownRight size={14} />
            )}
            <span>{Math.abs(trend.value).toFixed(1)}%</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
        <p className="text-sm text-muted-foreground mt-1">{title}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    success: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Success' },
    error: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Failed' },
    running: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Running' },
    pending: { bg: 'bg-muted/500/10', text: 'text-muted-foreground', label: 'Pending' },
  }[status] || { bg: 'bg-muted/500/10', text: 'text-muted-foreground', label: status };

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}

// =====================================================
// MAIN PAGE
// =====================================================

export default function PipelineAnalyticsPage() {
  const [analytics, setAnalytics] = useState<PipelineAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('7d');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'executions' | 'errors'>('overview');

  // Fetch analytics data
  useEffect(() => {
    async function fetchAnalytics() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/pipelines/analytics?range=${dateRange}`);
        if (!response.ok) throw new Error('Failed to fetch analytics');
        const data = await response.json();
        setAnalytics(data.data);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalytics();
  }, [dateRange]);

  // Format helpers
  const formatCost = (cost: number) => {
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    if (cost < 1) return `$${cost.toFixed(3)}`;
    return `$${cost.toFixed(2)}`;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="animate-spin" size={24} />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  const { metrics, timeSeries, recentExecutions, nodeErrors, topPipelines } = analytics;

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Pipeline Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your pipeline performance and costs
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none bg-gray-800 border border-white/10 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:border-indigo-500"
            >
              {DATE_RANGES.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
          </div>

          <button
            onClick={() => window.location.reload()}
            className="p-2 bg-gray-800 border border-white/10 rounded-lg hover:bg-gray-700"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Total Runs"
          value={metrics.totalRuns.toLocaleString()}
          icon={Activity}
          color="primary"
        />
        <MetricCard
          title="Success Rate"
          value={`${metrics.successRate.toFixed(1)}%`}
          subValue={`${metrics.successfulRuns} successful, ${metrics.failedRuns} failed`}
          icon={CheckCircle2}
          color="success"
        />
        <MetricCard
          title="Total Cost"
          value={formatCost(metrics.totalCost)}
          subValue={`Avg: ${formatCost(metrics.avgCostPerRun)}/run`}
          icon={DollarSign}
          color="warning"
        />
        <MetricCard
          title="Avg Duration"
          value={formatDuration(metrics.avgDuration)}
          icon={Clock}
          color="primary"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
        {(['overview', 'executions', 'errors'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              selectedTab === tab
                ? 'bg-indigo-500 text-white'
                : 'text-muted-foreground hover:bg-gray-800'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost Over Time Chart */}
          <div className="p-6 rounded-xl bg-card border border-white/10">
            <h3 className="text-lg font-semibold mb-4">Cost Over Time</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']}
                  />
                  <Bar dataKey="cost" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Execution Duration Chart */}
          <div className="p-6 rounded-xl bg-card border border-white/10">
            <h3 className="text-lg font-semibold mb-4">Execution Duration</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(1)}s`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${(value / 1000).toFixed(2)}s`, 'Avg Duration']}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgDuration"
                    stroke={CHART_COLORS.secondary}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.secondary }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Pipelines */}
          <div className="p-6 rounded-xl bg-card border border-white/10">
            <h3 className="text-lg font-semibold mb-4">Top Pipelines</h3>
            <div className="space-y-3">
              {topPipelines.map((pipeline, idx) => (
                <div
                  key={pipeline.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-white truncate max-w-[200px]">
                        {pipeline.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{pipeline.runCount} runs</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      {formatCost(pipeline.totalCost)}
                    </p>
                    <p
                      className={`text-xs ${
                        pipeline.successRate >= 90 ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {pipeline.successRate.toFixed(0)}% success
                    </p>
                  </div>
                </div>
              ))}
              {topPipelines.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No pipelines yet</p>
              )}
            </div>
          </div>

          {/* Success/Failure Distribution */}
          <div className="p-6 rounded-xl bg-card border border-white/10">
            <h3 className="text-lg font-semibold mb-4">Execution Status</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Success', value: metrics.successfulRuns },
                      { name: 'Failed', value: metrics.failedRuns },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill={CHART_COLORS.success} />
                    <Cell fill={CHART_COLORS.error} />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'executions' && (
        <div className="p-6 rounded-xl bg-card border border-white/10">
          <h3 className="text-lg font-semibold mb-4">Recent Executions</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-muted-foreground border-b border-white/10">
                  <th className="pb-3 pr-4">Pipeline</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Started</th>
                  <th className="pb-3 pr-4">Duration</th>
                  <th className="pb-3 pr-4">Cost</th>
                  <th className="pb-3">Error</th>
                </tr>
              </thead>
              <tbody>
                {recentExecutions.map((exec) => (
                  <tr
                    key={exec.id}
                    className="border-b border-white/5 hover:bg-gray-800/50"
                  >
                    <td className="py-3 pr-4">
                      <p className="font-medium text-white truncate max-w-[200px]">
                        {exec.pipelineName}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {exec.id.slice(0, 8)}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={exec.status} />
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted-foreground">
                      {formatDate(exec.startedAt)}
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted-foreground">
                      {exec.durationMs ? formatDuration(exec.durationMs) : '-'}
                    </td>
                    <td className="py-3 pr-4 text-sm font-medium text-white">
                      {formatCost(exec.cost)}
                    </td>
                    <td className="py-3">
                      {exec.errorMessage ? (
                        <span className="text-xs text-red-400 truncate block max-w-[200px]">
                          {exec.errorMessage}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {recentExecutions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No executions yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTab === 'errors' && (
        <div className="p-6 rounded-xl bg-card border border-white/10">
          <h3 className="text-lg font-semibold mb-4">Error Breakdown</h3>
          {nodeErrors.length > 0 ? (
            <div className="space-y-3">
              {nodeErrors.map((node) => (
                <div
                  key={node.nodeId}
                  className="p-4 rounded-lg bg-red-500/5 border border-red-500/20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-500/10">
                        <XCircle size={18} className="text-red-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{node.nodeName}</p>
                        <p className="text-xs text-muted-foreground">{node.nodeType}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-400">
                        {node.errorCount}
                      </p>
                      <p className="text-xs text-muted-foreground">errors</p>
                    </div>
                  </div>
                  <div className="mt-3 p-2 rounded bg-gray-800/50">
                    <p className="text-xs text-red-400 font-mono">
                      {node.lastError}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last: {formatDate(node.lastErrorAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-white">No errors found</p>
              <p className="text-muted-foreground mt-1">
                All your pipelines are running smoothly
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
