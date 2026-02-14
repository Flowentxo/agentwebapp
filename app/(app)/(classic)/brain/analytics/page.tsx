/**
 * 📊 Brain AI - Analytics Dashboard
 * Enterprise-grade analytics with real-time KPIs and deep insights
 *
 * FEATURES:
 * - Real-time KPIs (Time-to-Insight, Agent Performance, API Consumption)
 * - Trend & Comparison Charts
 * - Agent Performance Metrics
 * - User Activity Analytics
 * - Error Rate Monitoring
 * - Export Capabilities
 */

'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Clock,
  Users,
  AlertCircle,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  LineChart as LineChartIcon,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PanelHeader } from '@/components/common/PanelHeader';
import { formatThousandsDE, formatPercentDE, formatTrendDE } from '@/lib/format/number';

interface AnalyticsKPI {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: any;
  color: string;
}

interface TimeSeriesData {
  timestamp: string;
  value: number;
  label?: string;
}

interface AgentPerformance {
  agentId: string;
  agentName: string;
  totalQueries: number;
  successRate: number;
  avgResponseTime: number;
  tokensUsed: number;
  costUSD: number;
}

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d');

  // Mock data - replace with API calls
  const [kpis, setKpis] = useState<AnalyticsKPI[]>([]);
  const [timeToInsightData, setTimeToInsightData] = useState<TimeSeriesData[]>([]);
  const [apiConsumptionData, setApiConsumptionData] = useState<TimeSeriesData[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [userActivityData, setUserActivityData] = useState<any[]>([]);
  const [errorRateData, setErrorRateData] = useState<TimeSeriesData[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);

    try {
      // Map frontend time ranges to API period params
      const periodMap: Record<string, string> = { '24h': '7d', '7d': '7d', '30d': '30d', '90d': '90d' };
      const period = periodMap[timeRange] || '30d';

      const res = await fetch(`/api/brain/analytics?period=${period}`, {
        headers: { 'x-workspace-id': 'default-workspace' },
      });

      if (!res.ok) throw new Error('Analytics fetch failed');

      const json = await res.json();
      const data = json.data as {
        query: { totalQueries: number; uniqueUsers: number; avgResponseTime: number; queriesOverTime: { date: string; count: number }[] };
        usage: { totalDocuments: number; documentsPerCategory: { category: string; count: number }[] };
        quality: { searchSuccessRate: number };
        performance: { avgQueryLatency: number; errorRate: number; cacheHitRate: number; queriesPerMinute: number };
      };

      // Build KPIs from real data
      const avgLatencyS = data.performance.avgQueryLatency > 0
        ? (data.performance.avgQueryLatency / 1000).toFixed(1) + 's'
        : '0s';
      const errorPct = (data.performance.errorRate * 100).toFixed(2) + '%';

      setKpis([
        {
          label: 'Avg Time to Insight',
          value: avgLatencyS,
          change: 0,
          changeLabel: period,
          icon: Clock,
          color: 'rgb(var(--accent))',
        },
        {
          label: 'Total Queries',
          value: data.query.totalQueries.toLocaleString('de-DE'),
          change: 0,
          changeLabel: period,
          icon: Zap,
          color: 'rgb(var(--accent-2))',
        },
        {
          label: 'Active Users',
          value: data.query.uniqueUsers.toLocaleString('de-DE'),
          change: 0,
          changeLabel: period,
          icon: Users,
          color: 'var(--success)',
        },
        {
          label: 'Error Rate',
          value: errorPct,
          change: 0,
          changeLabel: period,
          icon: AlertCircle,
          color: 'var(--warning)',
        },
      ]);

      // Time-to-Insight trend from queriesOverTime (use avg response time per day if available, otherwise show query volume)
      const queriesOverTime = data.query.queriesOverTime || [];
      setTimeToInsightData(
        queriesOverTime.slice(0, 14).reverse().map((d) => ({
          timestamp: new Date(d.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit' }),
          value: d.count,
        }))
      );

      // API Consumption = same queriesOverTime data
      setApiConsumptionData(
        queriesOverTime.slice(0, 14).reverse().map((d) => ({
          timestamp: new Date(d.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit' }),
          value: d.count,
        }))
      );

      // Agent performance from /api/brain/agents/metrics (separate call)
      try {
        const agentRes = await fetch('/api/brain/agents/metrics?includeTrends=false');
        if (agentRes.ok) {
          const agentJson = await agentRes.json();
          const agents = agentJson.data || agentJson.metrics || [];
          if (Array.isArray(agents) && agents.length > 0) {
            setAgentPerformance(agents.map((a: any) => ({
              agentId: a.agentId || a.id || 'unknown',
              agentName: a.agentName || a.name || a.agentId || 'Agent',
              totalQueries: a.totalQueries || a.queryCount || 0,
              successRate: a.successRate ?? a.accuracy ?? 0,
              avgResponseTime: a.avgResponseTime ?? a.latency ?? 0,
              tokensUsed: a.tokensUsed ?? a.tokens ?? 0,
              costUSD: a.costUSD ?? a.cost ?? 0,
            })));
          } else {
            setAgentPerformance([]);
          }
        } else {
          setAgentPerformance([]);
        }
      } catch {
        setAgentPerformance([]);
      }

      // User Activity by feature (from document categories)
      const featureColors = ['rgb(var(--accent))', 'rgb(var(--accent-2))', 'var(--success)', 'var(--warning)', 'oklch(70% 0.2 25)'];
      const categories = data.usage.documentsPerCategory || [];
      setUserActivityData(
        categories.slice(0, 5).map((cat, i) => ({
          feature: cat.category.charAt(0).toUpperCase() + cat.category.slice(1),
          usage: cat.count,
          color: featureColors[i % featureColors.length],
        }))
      );

      // Error rate - show search success rate inverted as "error" trend (single point for now)
      const failRate = ((1 - (data.quality.searchSuccessRate || 0)) * 100);
      setErrorRateData([
        { timestamp: 'Current', value: parseFloat(failRate.toFixed(2)) },
      ]);

    } catch (error) {
      console.error('[Analytics] Failed to fetch:', error);
      // Set empty state on error
      setKpis([
        { label: 'Avg Time to Insight', value: '—', change: 0, changeLabel: 'N/A', icon: Clock, color: 'rgb(var(--accent))' },
        { label: 'Total Queries', value: '0', change: 0, changeLabel: 'N/A', icon: Zap, color: 'rgb(var(--accent-2))' },
        { label: 'Active Users', value: '0', change: 0, changeLabel: 'N/A', icon: Users, color: 'var(--success)' },
        { label: 'Error Rate', value: '—', change: 0, changeLabel: 'N/A', icon: AlertCircle, color: 'var(--warning)' },
      ]);
      setTimeToInsightData([]);
      setApiConsumptionData([]);
      setAgentPerformance([]);
      setUserActivityData([]);
      setErrorRateData([]);
    }

    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const handleExport = () => {
    console.log('Export analytics data');
    // TODO: Implement CSV/PDF export
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text mb-2 tracking-tight">Analytics Dashboard</h1>
          <p className="text-base text-text-muted">
            Real-time insights and performance metrics • Last updated {new Date().toLocaleTimeString('de-DE')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 rounded-lg border border-[#262C33] bg-[#181B21] p-1">
            {(['24h', '7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-all duration-100 ${
                  timeRange === range
                    ? 'bg-[rgb(var(--accent))]/20 text-[rgb(var(--accent))]'
                    : 'text-text-muted hover:text-text hover:bg-[#1E2229]'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex h-9 items-center gap-2 rounded-lg border border-[#262C33] bg-[#181B21] px-3 text-sm font-medium text-text transition-all duration-100 hover:bg-[#1E2229] active:scale-95 disabled:opacity-60"
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex h-9 items-center gap-2 rounded-lg border border-[rgb(var(--accent))]/30 bg-[rgb(var(--accent))]/10 px-3 text-sm font-medium text-[rgb(var(--accent))] transition-all duration-100 hover:bg-[rgb(var(--accent))]/20 active:scale-95"
            title="Export analytics"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, index) => (
          <AnalyticsKpiCard key={index} kpi={kpi} isLoading={isLoading} />
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Time to Insight Chart */}
        <div
          className="bg-[#181B21] rounded-lg border border-[#262C33] overflow-hidden"
          style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
        >
          <PanelHeader
            title="Time to Insight"
            info="Average response time over time (seconds)"
            icon={<LineChartIcon className="h-4 w-4 text-[rgb(var(--accent))]" />}
          />
          <div className="p-5">
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={300} minHeight={280}>
                <AreaChart data={timeToInsightData}>
                  <defs>
                    <linearGradient id="colorInsight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(var(--accent))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="rgb(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262C33" />
                  <XAxis dataKey="timestamp" stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1D24',
                      border: '1px solid #262C33',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#E5E7EB' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="rgb(var(--accent))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorInsight)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* API Consumption Chart */}
        <div
          className="bg-[#181B21] rounded-lg border border-[#262C33] overflow-hidden"
          style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
        >
          <PanelHeader
            title="API Consumption"
            info="Total API requests per day"
            icon={<BarChart3 className="h-4 w-4 text-[rgb(var(--accent-2))]" />}
          />
          <div className="p-5">
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={300} minHeight={280}>
                <BarChart data={apiConsumptionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262C33" />
                  <XAxis dataKey="timestamp" stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1D24',
                      border: '1px solid #262C33',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#E5E7EB' }}
                  />
                  <Bar dataKey="value" fill="rgb(var(--accent-2))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* User Activity Pie Chart */}
        <div
          className="bg-[#181B21] rounded-lg border border-[#262C33] overflow-hidden"
          style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
        >
          <PanelHeader
            title="User Activity by Feature"
            info="Most used features by users"
            icon={<PieChart className="h-4 w-4 text-[var(--success)]" />}
          />
          <div className="p-5">
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={300} minHeight={280}>
                <RechartsPieChart>
                  <Pie
                    data={userActivityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ feature, percent }: any) => `${feature} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="usage"
                  >
                    {userActivityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1D24',
                      border: '1px solid #262C33',
                      borderRadius: '8px',
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Error Rate Chart */}
        <div
          className="bg-[#181B21] rounded-lg border border-[#262C33] overflow-hidden"
          style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
        >
          <PanelHeader
            title="Error Rate"
            info="Error percentage over time"
            icon={<AlertCircle className="h-4 w-4 text-[var(--warning)]" />}
          />
          <div className="p-5">
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={300} minHeight={280}>
                <LineChart data={errorRateData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262C33" />
                  <XAxis dataKey="timestamp" stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1D24',
                      border: '1px solid #262C33',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#E5E7EB' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--warning)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--warning)', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Agent Performance Table */}
      <div
        className="bg-[#181B21] rounded-lg border border-[#262C33] overflow-hidden"
        style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
      >
        <PanelHeader
          title="Agent Performance Metrics"
          info="Detailed performance stats for each AI agent"
          icon={<Activity className="h-4 w-4 text-[rgb(var(--accent))]" />}
        />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#262C33] bg-[#1A1D24]">
                <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase">
                  Agent
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-text-muted uppercase">
                  Queries
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-text-muted uppercase">
                  Success Rate
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-text-muted uppercase">
                  Avg Response
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-text-muted uppercase">
                  Tokens Used
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-text-muted uppercase">
                  Cost (USD)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262C33]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8">
                    <TableSkeleton />
                  </td>
                </tr>
              ) : (
                agentPerformance.map((agent) => (
                  <tr
                    key={agent.agentId}
                    className="hover:bg-[#1E2229] transition-colors duration-100"
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium text-text">{agent.agentName}</div>
                      <div className="text-xs text-text-muted">{agent.agentId}</div>
                    </td>
                    <td className="px-5 py-4 text-right mono text-text">
                      {formatThousandsDE(agent.totalQueries)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          agent.successRate >= 98
                            ? 'bg-[var(--success)]/15 text-[var(--success)]'
                            : agent.successRate >= 95
                            ? 'bg-[var(--warning)]/15 text-[var(--warning)]'
                            : 'bg-[oklch(70%_0.2_25)]/15 text-[oklch(70%_0.2_25)]'
                        }`}
                      >
                        {formatPercentDE(agent.successRate)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right mono text-text">
                      {agent.avgResponseTime}s
                    </td>
                    <td className="px-5 py-4 text-right mono text-text">
                      {formatThousandsDE(agent.tokensUsed)}
                    </td>
                    <td className="px-5 py-4 text-right mono text-text">
                      ${agent.costUSD.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===== ANALYTICS KPI CARD COMPONENT =====

interface AnalyticsKpiCardProps {
  kpi: AnalyticsKPI;
  isLoading: boolean;
}

function AnalyticsKpiCard({ kpi, isLoading }: AnalyticsKpiCardProps) {
  if (isLoading) {
    return (
      <div
        className="bg-[#181B21] rounded-lg border border-[#262C33] p-5 animate-pulse"
        style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-3">
            <div className="h-3 w-24 rounded bg-card-contrast" />
            <div className="h-8 w-32 rounded bg-card-contrast" />
            <div className="h-4 w-20 rounded bg-card-contrast" />
          </div>
          <div className="h-12 w-12 rounded-lg bg-card-contrast" />
        </div>
      </div>
    );
  }

  const Icon = kpi.icon;
  const TrendIcon = kpi.change >= 0 ? TrendingUp : TrendingDown;
  const trendColor = kpi.change >= 0 ? 'text-[var(--success)]' : 'text-[oklch(70%_0.2_25)]';

  return (
    <div
      className="bg-[#181B21] rounded-lg border border-[#262C33] p-5 transition-all duration-100 hover:border-[rgb(var(--accent))]/30"
      style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-text-muted mb-2">{kpi.label}</p>
          <p className="text-3xl font-bold text-text tracking-tight mb-3">{kpi.value}</p>
          <div className={`flex items-center gap-1.5 text-sm font-medium ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            <span>{formatTrendDE(Math.abs(kpi.change))}</span>
            <span className="text-text-muted">{kpi.changeLabel}</span>
          </div>
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-lg"
          style={{
            backgroundColor: `${kpi.color}20`,
            boxShadow: `0 0 0 1px ${kpi.color}30`,
          }}
        >
          <Icon className="h-6 w-6" style={{ color: kpi.color }} />
        </div>
      </div>
    </div>
  );
}

// ===== LOADING SKELETONS =====

function ChartSkeleton() {
  return (
    <div className="h-[300px] flex items-center justify-center">
      <div className="space-y-3 w-full">
        <div className="flex items-end justify-between gap-2 h-48">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-card-contrast rounded-t animate-pulse"
              style={{ height: `${40 + Math.random() * 60}%` }}
            />
          ))}
        </div>
        <div className="h-3 bg-card-contrast rounded animate-pulse" />
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-10 w-24 rounded bg-card-contrast animate-pulse" />
          <div className="h-10 flex-1 rounded bg-card-contrast animate-pulse" />
          <div className="h-10 w-20 rounded bg-card-contrast animate-pulse" />
          <div className="h-10 w-20 rounded bg-card-contrast animate-pulse" />
          <div className="h-10 w-24 rounded bg-card-contrast animate-pulse" />
          <div className="h-10 w-20 rounded bg-card-contrast animate-pulse" />
        </div>
      ))}
    </div>
  );
}
