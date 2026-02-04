/**
 * ENTERPRISE AI ANALYTICS DASHBOARD
 *
 * Phase 12: ISO 42001 Compliant Analytics Visualization
 *
 * Features:
 * - KPI Cards: Total Cost, Total Tokens, Avg Latency, Success Rate
 * - Daily Cost Chart (Area/Bar chart)
 * - Agent Usage Distribution (Bar chart)
 * - Model Usage Distribution (Donut chart)
 * - Recent Audit Log Table
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Brain,
  DollarSign,
  Activity,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  CheckCircle,
  XCircle,
  Bot,
  Cpu,
  FileText,
  Shield,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface DailyUsage {
  date: string;
  cost: number;
  tokens: number;
  requests: number;
}

interface AgentUsage {
  agentId: string;
  requests: number;
  tokens: number;
  cost: number;
  avgLatency: number;
}

interface ModelUsage {
  model: string;
  provider: string;
  requests: number;
  tokens: number;
  cost: number;
  percentage: number;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  model: string;
  provider: string;
  operation: string;
  tokens: number;
  cost: number;
  latencyMs: number;
  success: boolean;
  agentId?: string;
  traceId?: string;
}

interface AnalyticsData {
  range: string;
  days: number;
  kpis: {
    totalCost: number;
    previousPeriodCost: number;
    costChange: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    totalRequests: number;
    avgLatency: number;
    successRate: number;
  };
  dailyUsage: DailyUsage[];
  usageByAgent: AgentUsage[];
  usageByModel: ModelUsage[];
  recentAudit: AuditEntry[];
}

// ═══════════════════════════════════════════════════════════════════
// CHART COLORS
// ═══════════════════════════════════════════════════════════════════

const MODEL_COLORS: Record<string, string> = {
  'gpt-4-turbo': '#10b981',
  'gpt-4o': '#06b6d4',
  'gpt-4o-mini': '#8b5cf6',
  'gpt-3.5-turbo': '#f59e0b',
  'gemini-1.5-flash': '#ef4444',
  'gemini-1.5-pro': '#ec4899',
  'gemini-2.0-flash': '#f97316',
  'claude-3-opus': '#6366f1',
  'claude-3-sonnet': '#a855f7',
  'claude-3-haiku': '#14b8a6',
  default: '#64748b',
};

const AGENT_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
  '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6',
];

// ═══════════════════════════════════════════════════════════════════
// RANGE OPTIONS
// ═══════════════════════════════════════════════════════════════════

const RANGES = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
];

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function EnterpriseAnalyticsPage() {
  const [range, setRange] = useState('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics/enterprise?range=${range}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const result: AnalyticsData = await res.json();
      setData(result);
    } catch (error) {
      console.error('[ENTERPRISE_ANALYTICS] Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  useEffect(() => {
    setLoading(true);
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  // Helper to render trend indicator
  const renderTrend = (change: number, inverse = false) => {
    const isPositive = inverse ? change < 0 : change > 0;
    const color = isPositive ? 'text-emerald-400' : change < 0 ? 'text-red-400' : 'text-white/50';
    const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Activity;

    return (
      <div className={`flex items-center gap-1 ${color}`}>
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">
          {change > 0 ? '+' : ''}{change}%
        </span>
      </div>
    );
  };

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1) return `$${value.toFixed(2)}`;
    if (value >= 0.01) return `$${value.toFixed(3)}`;
    return `$${value.toFixed(4)}`;
  };

  // Format tokens
  const formatTokens = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════
          Header
      ═══════════════════════════════════════════════════════════════ */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/analytics"
              className="p-2 -ml-2 rounded-lg hover:bg-card/10 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Shield className="w-7 h-7 text-purple-400" />
              <span>Enterprise AI Analytics</span>
            </h1>
          </div>
          <p className="text-white/50 ml-10">
            ISO 42001 Compliant - AI Usage Tracking & Cost Analysis
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Range Picker */}
          <div className="flex items-center bg-card/5 rounded-lg p-1 border border-white/10">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  range === r.value
                    ? 'bg-purple-500/30 text-purple-400'
                    : 'text-white/60 hover:text-white hover:bg-card/5'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="p-2 rounded-lg bg-card/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          KPI Cards
      ═══════════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cost */}
        <div className="glass-command-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            {data && renderTrend(data.kpis.costChange, true)}
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">
            {loading ? '—' : formatCurrency(data?.kpis.totalCost || 0)}
          </p>
          <p className="text-xs text-white/50 mt-1">Total Cost ({data?.days || 30}d)</p>
        </div>

        {/* Total Tokens */}
        <div className="glass-command-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex gap-2 text-[10px]">
              <span className="text-emerald-400">{formatTokens(data?.kpis.promptTokens || 0)} in</span>
              <span className="text-amber-400">{formatTokens(data?.kpis.completionTokens || 0)} out</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">
            {loading ? '—' : formatTokens(data?.kpis.totalTokens || 0)}
          </p>
          <p className="text-xs text-white/50 mt-1">Total Tokens</p>
        </div>

        {/* Avg Latency */}
        <div className="glass-command-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-violet-500/20">
              <Clock className="w-5 h-5 text-violet-400" />
            </div>
            <div className={`flex items-center gap-1 ${
              (data?.kpis.avgLatency || 0) < 500 ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">
                {(data?.kpis.avgLatency || 0) < 500 ? 'Good' : 'Slow'}
              </span>
            </div>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">
            {loading ? '—' : `${(data?.kpis.avgLatency || 0).toLocaleString()}ms`}
          </p>
          <p className="text-xs text-white/50 mt-1">Avg Latency</p>
        </div>

        {/* Success Rate */}
        <div className="glass-command-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Activity className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-xs text-white/50">
              {data?.kpis.totalRequests.toLocaleString() || 0} requests
            </span>
          </div>
          <p className={`text-2xl font-bold tabular-nums ${
            (data?.kpis.successRate || 100) >= 95 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {loading ? '—' : `${data?.kpis.successRate || 100}%`}
          </p>
          <p className="text-xs text-white/50 mt-1">Success Rate</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          Daily Cost Chart
      ═══════════════════════════════════════════════════════════════ */}
      <section className="glass-command-panel p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-emerald-500/20">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Daily Cost Trend</h3>
            <p className="text-xs text-white/50">AI spending over the last {data?.days || 30} days</p>
          </div>
        </div>

        {loading ? (
          <div className="h-[300px] animate-pulse bg-card/5 rounded-lg" />
        ) : data?.dailyUsage.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-white/40">
            <p>No data available for selected period</p>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data?.dailyUsage.map((d) => ({
                  ...d,
                  displayDate: new Date(d.date).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                  }),
                }))}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="50%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                  dx={-10}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '8px',
                    padding: '10px',
                  }}
                  labelStyle={{ color: 'rgba(99, 102, 241, 0.8)', marginBottom: '8px' }}
                  formatter={(value: number, name: string) => [
                    name === 'cost' ? formatCurrency(value) : formatTokens(value),
                    name === 'cost' ? 'Cost' : 'Tokens',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#costGradient)"
                  dot={false}
                  activeDot={{ r: 6, fill: '#10b981', stroke: '#0a0a0a', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          Charts Row: Agent Usage + Model Distribution
      ═══════════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Expensive Agents */}
        <div className="glass-command-panel p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-indigo-500/20">
              <Bot className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Agent Usage</h3>
              <p className="text-xs text-white/50">Cost distribution by agent</p>
            </div>
          </div>

          {loading ? (
            <div className="h-[250px] animate-pulse bg-card/5 rounded-lg" />
          ) : data?.usageByAgent.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-white/40">
              <p>No agent data available</p>
            </div>
          ) : (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.usageByAgent.slice(0, 6)}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 60, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <YAxis
                    type="category"
                    dataKey="agentId"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                    width={55}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'cost' ? formatCurrency(value) : value.toLocaleString(),
                      name === 'cost' ? 'Cost' : 'Requests',
                    ]}
                  />
                  <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                    {data?.usageByAgent.slice(0, 6).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={AGENT_COLORS[index % AGENT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Model Usage Donut */}
        <div className="glass-command-panel p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Model Usage</h3>
              <p className="text-xs text-white/50">Request distribution by model</p>
            </div>
          </div>

          {loading ? (
            <div className="h-[250px] animate-pulse bg-card/5 rounded-lg" />
          ) : data?.usageByModel.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-white/40">
              <p>No model data available</p>
            </div>
          ) : (
            <div className="h-[250px] flex items-center">
              <ResponsiveContainer width="60%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.usageByModel as unknown as Array<{ [key: string]: unknown }>}
                    dataKey="requests"
                    nameKey="model"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {(data?.usageByModel || []).map((entry) => (
                      <Cell
                        key={entry.model}
                        fill={MODEL_COLORS[entry.model] || MODEL_COLORS.default}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string, props) => [
                      `${value.toLocaleString()} requests (${props.payload.percentage}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="w-40 space-y-2">
                {data?.usageByModel.slice(0, 5).map((model) => (
                  <div key={model.model} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: MODEL_COLORS[model.model] || MODEL_COLORS.default }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{model.model}</p>
                      <p className="text-[10px] text-white/40">{model.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          Recent Audit Log
      ═══════════════════════════════════════════════════════════════ */}
      <section className="glass-command-panel p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <FileText className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Recent Audit Log</h3>
            <p className="text-xs text-white/50">Last 15 AI interactions (ISO 42001 Compliance)</p>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-card/5 rounded-lg" />
            ))}
          </div>
        ) : data?.recentAudit.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-white/40">
            <p>No audit entries available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/40 text-xs uppercase tracking-wider border-b border-white/10">
                  <th className="pb-3 pr-4">Timestamp</th>
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">Model</th>
                  <th className="pb-3 pr-4">Operation</th>
                  <th className="pb-3 pr-4 text-right">Tokens</th>
                  <th className="pb-3 pr-4 text-right">Cost</th>
                  <th className="pb-3 pr-4 text-right">Latency</th>
                  <th className="pb-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data?.recentAudit.map((entry) => (
                  <tr key={entry.id} className="text-white/70 hover:bg-card/5 transition-colors">
                    <td className="py-3 pr-4">
                      <span className="text-xs text-white/50">
                        {new Date(entry.timestamp).toLocaleString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-mono text-xs">{entry.userId.slice(0, 8)}...</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: `${MODEL_COLORS[entry.model] || MODEL_COLORS.default}20`,
                          color: MODEL_COLORS[entry.model] || MODEL_COLORS.default,
                        }}
                      >
                        {entry.model}
                      </span>
                    </td>
                    <td className="py-3 pr-4 capitalize text-xs">{entry.operation}</td>
                    <td className="py-3 pr-4 text-right font-mono text-xs">{entry.tokens.toLocaleString()}</td>
                    <td className="py-3 pr-4 text-right font-mono text-xs text-emerald-400">
                      {formatCurrency(entry.cost)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-xs">
                      {entry.latencyMs}ms
                    </td>
                    <td className="py-3 text-center">
                      {entry.success ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 inline" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 inline" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
