'use client';

/**
 * OpsDashboard.tsx
 *
 * Phase 7: Operational Intelligence Layer - Frontend
 *
 * Main operations dashboard providing real-time visibility into
 * system health, execution metrics, and queue status.
 *
 * Features:
 * - Real-time metrics with auto-polling
 * - Time series charts (RPM, Failure Rate, Latency)
 * - Health cards for quick status overview
 * - Top workflows by activity
 * - Active incidents panel
 */

import { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  DollarSign,
  Layers,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
  XCircle,
  Timer,
  Server,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useOpsDashboardData } from '@/hooks/useOpsMetrics';

// ============================================================================
// TYPES
// ============================================================================

type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  status?: 'success' | 'warning' | 'error' | 'neutral';
  className?: string;
}

// ============================================================================
// METRIC CARD COMPONENT
// ============================================================================

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  status = 'neutral',
  className,
}: MetricCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const statusColors = {
    success: isDark ? 'text-green-400' : 'text-green-600',
    warning: isDark ? 'text-yellow-400' : 'text-yellow-600',
    error: isDark ? 'text-red-400' : 'text-red-600',
    neutral: isDark ? 'text-zinc-400' : 'text-zinc-500',
  };

  const statusBg = {
    success: isDark ? 'bg-green-500/10' : 'bg-green-50',
    warning: isDark ? 'bg-yellow-500/10' : 'bg-yellow-50',
    error: isDark ? 'bg-red-500/10' : 'bg-red-50',
    neutral: isDark ? 'bg-zinc-500/10' : 'bg-zinc-50',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border p-4 transition-all',
        isDark
          ? 'bg-zinc-900/50 border-white/10 hover:border-white/20'
          : 'bg-white border-zinc-200 hover:border-zinc-300',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p
            className={cn(
              'text-xs font-medium uppercase tracking-wide',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              'mt-2 text-2xl font-bold tabular-nums',
              isDark ? 'text-white' : 'text-zinc-900'
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p
              className={cn(
                'mt-1 text-xs',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={cn(
            'p-2 rounded-lg',
            statusBg[status]
          )}
        >
          <div className={statusColors[status]}>{icon}</div>
        </div>
      </div>

      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1.5">
          {trend > 0 ? (
            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
          ) : trend < 0 ? (
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
          ) : null}
          <span
            className={cn(
              'text-xs font-medium',
              trend > 0
                ? 'text-green-400'
                : trend < 0
                ? 'text-red-400'
                : isDark
                ? 'text-zinc-500'
                : 'text-zinc-400'
            )}
          >
            {trend > 0 ? '+' : ''}
            {trend.toFixed(1)}%
          </span>
          {trendLabel && (
            <span
              className={cn(
                'text-xs',
                isDark ? 'text-zinc-600' : 'text-zinc-400'
              )}
            >
              {trendLabel}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// CHART TOOLTIP
// ============================================================================

function ChartTooltip({ active, payload, label, isDark }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2 shadow-xl',
        isDark
          ? 'bg-zinc-900 border-white/10'
          : 'bg-white border-zinc-200'
      )}
    >
      <p
        className={cn(
          'text-xs font-medium mb-1',
          isDark ? 'text-zinc-400' : 'text-zinc-500'
        )}
      >
        {label}
      </p>
      {payload.map((entry: any, index: number) => (
        <p
          key={index}
          className="text-sm font-medium"
          style={{ color: entry.color }}
        >
          {entry.name}: {entry.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OpsDashboard() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const {
    dashboard,
    queues,
    topWorkflows,
    incidents,
    timeSeries,
    isLoading,
    refetch,
  } = useOpsDashboardData({ timeRange });

  // Format time series data for charts
  const chartData = useMemo(() => {
    if (!timeSeries.executions.length) return [];

    return timeSeries.executions.map((point, index) => ({
      time: new Date(point.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      executions: point.value,
      failureRate: timeSeries.failureRate[index]?.value || 0,
      p95Duration: Math.round(
        (timeSeries.duration[index]?.value || 0) / 1000
      ),
    }));
  }, [timeSeries]);

  // Time range buttons
  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: '1h', label: '1H' },
    { value: '6h', label: '6H' },
    { value: '24h', label: '24H' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
  ];

  // Chart colors
  const chartColors = {
    executions: '#3b82f6',
    failureRate: '#ef4444',
    duration: '#8b5cf6',
    grid: isDark ? '#27272a' : '#e4e4e7',
    text: isDark ? '#71717a' : '#a1a1aa',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className={cn(
              'text-2xl font-bold',
              isDark ? 'text-white' : 'text-zinc-900'
            )}
          >
            Operations Dashboard
          </h1>
          <p
            className={cn(
              'text-sm mt-1',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}
          >
            Real-time system health and performance metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div
            className={cn(
              'flex items-center rounded-lg p-1',
              isDark ? 'bg-zinc-800' : 'bg-zinc-100'
            )}
          >
            {timeRangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  timeRange === option.value
                    ? isDark
                      ? 'bg-zinc-700 text-white'
                      : 'bg-white text-zinc-900 shadow-sm'
                    : isDark
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-zinc-500 hover:text-zinc-900'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark
                ? 'hover:bg-white/5 text-zinc-400'
                : 'hover:bg-zinc-100 text-zinc-500'
            )}
          >
            <RefreshCw
              className={cn('w-4 h-4', isLoading && 'animate-spin')}
            />
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Executions / Min"
          value={dashboard?.rpm || 0}
          subtitle={`${dashboard?.lastHourExecutions || 0} last hour`}
          icon={<Zap className="w-5 h-5" />}
          trend={dashboard?.trends.executionsChange}
          trendLabel="vs prev hour"
          status="neutral"
        />

        <MetricCard
          title="Failure Rate"
          value={`${(dashboard?.failureRate || 0).toFixed(1)}%`}
          subtitle={`${dashboard?.activeExecutions || 0} active`}
          icon={
            (dashboard?.failureRate || 0) > 5 ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )
          }
          trend={dashboard?.trends.failureRateChange}
          trendLabel="vs prev hour"
          status={
            (dashboard?.failureRate || 0) > 10
              ? 'error'
              : (dashboard?.failureRate || 0) > 5
              ? 'warning'
              : 'success'
          }
        />

        <MetricCard
          title="P95 Latency"
          value={`${((dashboard?.duration.p95 || 0) / 1000).toFixed(1)}s`}
          subtitle={`Avg: ${((dashboard?.duration.avg || 0) / 1000).toFixed(1)}s`}
          icon={<Timer className="w-5 h-5" />}
          trend={dashboard?.trends.durationChange}
          trendLabel="vs prev hour"
          status={
            (dashboard?.duration.p95 || 0) > 30000
              ? 'warning'
              : 'neutral'
          }
        />

        <MetricCard
          title="Today's Cost"
          value={`$${(dashboard?.cost.estimatedCostUsd || 0).toFixed(2)}`}
          subtitle={`${(dashboard?.cost.totalTokens || 0).toLocaleString()} tokens`}
          icon={<DollarSign className="w-5 h-5" />}
          trend={dashboard?.trends.costChange}
          trendLabel="vs prev day"
          status="neutral"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Executions Chart */}
        <div
          className={cn(
            'rounded-xl border p-4',
            isDark
              ? 'bg-zinc-900/50 border-white/10'
              : 'bg-white border-zinc-200'
          )}
        >
          <h3
            className={cn(
              'text-sm font-medium mb-4',
              isDark ? 'text-white' : 'text-zinc-900'
            )}
          >
            Executions Over Time
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="execGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={chartColors.executions}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={chartColors.executions}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartColors.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: chartColors.text }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: chartColors.text }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip content={(props) => <ChartTooltip {...props} isDark={isDark} />} />
                <Area
                  type="monotone"
                  dataKey="executions"
                  name="Executions"
                  stroke={chartColors.executions}
                  fill="url(#execGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Failure Rate & Latency Chart */}
        <div
          className={cn(
            'rounded-xl border p-4',
            isDark
              ? 'bg-zinc-900/50 border-white/10'
              : 'bg-white border-zinc-200'
          )}
        >
          <h3
            className={cn(
              'text-sm font-medium mb-4',
              isDark ? 'text-white' : 'text-zinc-900'
            )}
          >
            Failure Rate & P95 Latency
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartColors.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: chartColors.text }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: chartColors.text }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: chartColors.text }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickFormatter={(v) => `${v}s`}
                />
                <Tooltip content={(props) => <ChartTooltip {...props} isDark={isDark} />} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="failureRate"
                  name="Failure Rate %"
                  stroke={chartColors.failureRate}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="p95Duration"
                  name="P95 Latency (s)"
                  stroke={chartColors.duration}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Workflows */}
        <div
          className={cn(
            'lg:col-span-2 rounded-xl border p-4',
            isDark
              ? 'bg-zinc-900/50 border-white/10'
              : 'bg-white border-zinc-200'
          )}
        >
          <h3
            className={cn(
              'text-sm font-medium mb-4',
              isDark ? 'text-white' : 'text-zinc-900'
            )}
          >
            Top Workflows
          </h3>
          <div className="space-y-3">
            {topWorkflows?.slice(0, 5).map((workflow, index) => (
              <div
                key={workflow.workflowId}
                className={cn(
                  'flex items-center gap-4 p-3 rounded-lg',
                  isDark ? 'bg-white/5' : 'bg-zinc-50'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold',
                    index === 0
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : index === 1
                      ? 'bg-zinc-400/20 text-zinc-400'
                      : index === 2
                      ? 'bg-amber-600/20 text-amber-500'
                      : isDark
                      ? 'bg-white/10 text-zinc-500'
                      : 'bg-zinc-200 text-zinc-400'
                  )}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium truncate',
                      isDark ? 'text-white' : 'text-zinc-900'
                    )}
                  >
                    {workflow.workflowName}
                  </p>
                  <p
                    className={cn(
                      'text-xs',
                      isDark ? 'text-zinc-500' : 'text-zinc-400'
                    )}
                  >
                    {workflow.totalExecutions.toLocaleString()} executions
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      workflow.failureRate > 5
                        ? 'text-red-400'
                        : isDark
                        ? 'text-zinc-300'
                        : 'text-zinc-700'
                    )}
                  >
                    {workflow.failureRate.toFixed(1)}% errors
                  </p>
                  <p
                    className={cn(
                      'text-xs',
                      isDark ? 'text-zinc-500' : 'text-zinc-400'
                    )}
                  >
                    {(workflow.avgDurationMs / 1000).toFixed(1)}s avg
                  </p>
                </div>
              </div>
            ))}
            {(!topWorkflows || topWorkflows.length === 0) && (
              <div
                className={cn(
                  'text-center py-8 text-sm',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}
              >
                No workflow data available
              </div>
            )}
          </div>
        </div>

        {/* System Health */}
        <div
          className={cn(
            'rounded-xl border p-4',
            isDark
              ? 'bg-zinc-900/50 border-white/10'
              : 'bg-white border-zinc-200'
          )}
        >
          <h3
            className={cn(
              'text-sm font-medium mb-4',
              isDark ? 'text-white' : 'text-zinc-900'
            )}
          >
            System Health
          </h3>

          <div className="space-y-4">
            {/* Queue Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'text-xs font-medium',
                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                  )}
                >
                  Queue Status
                </span>
                <span
                  className={cn(
                    'text-xs font-medium flex items-center gap-1',
                    queues?.systemHealthy
                      ? 'text-green-400'
                      : 'text-red-400'
                  )}
                >
                  {queues?.systemHealthy ? (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      Healthy
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3" />
                      Issues
                    </>
                  )}
                </span>
              </div>
              <div
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg',
                  isDark ? 'bg-white/5' : 'bg-zinc-50'
                )}
              >
                <Server className="w-4 h-4 text-zinc-400" />
                <div className="flex-1">
                  <div className="flex justify-between text-xs">
                    <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
                      Waiting
                    </span>
                    <span className={isDark ? 'text-white' : 'text-zinc-900'}>
                      {queues?.queues.reduce(
                        (sum, q) => sum + q.waitingCount,
                        0
                      ) || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
                      Active
                    </span>
                    <span className={isDark ? 'text-white' : 'text-zinc-900'}>
                      {queues?.queues.reduce(
                        (sum, q) => sum + q.activeCount,
                        0
                      ) || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Incidents */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'text-xs font-medium',
                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                  )}
                >
                  Active Incidents
                </span>
                <span
                  className={cn(
                    'text-xs font-bold',
                    (incidents?.length || 0) > 0
                      ? 'text-red-400'
                      : 'text-green-400'
                  )}
                >
                  {incidents?.length || 0}
                </span>
              </div>

              {incidents?.slice(0, 3).map((incident) => (
                <div
                  key={incident.id}
                  className={cn(
                    'p-2 rounded-lg border-l-2',
                    incident.severity === 'critical'
                      ? 'border-red-500 bg-red-500/10'
                      : incident.severity === 'error'
                      ? 'border-orange-500 bg-orange-500/10'
                      : incident.severity === 'warning'
                      ? 'border-yellow-500 bg-yellow-500/10'
                      : 'border-blue-500 bg-blue-500/10'
                  )}
                >
                  <p
                    className={cn(
                      'text-xs font-medium truncate',
                      isDark ? 'text-white' : 'text-zinc-900'
                    )}
                  >
                    {incident.title}
                  </p>
                  <p
                    className={cn(
                      'text-[10px] mt-0.5',
                      isDark ? 'text-zinc-500' : 'text-zinc-400'
                    )}
                  >
                    {new Date(incident.triggeredAt).toLocaleTimeString()}
                  </p>
                </div>
              ))}

              {(!incidents || incidents.length === 0) && (
                <div
                  className={cn(
                    'text-center py-4 text-xs',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}
                >
                  No active incidents
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OpsDashboard;
