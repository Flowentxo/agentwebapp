/**
 * AI INTELLIGENCE ANALYTICS PAGE
 *
 * Phase 3.3 of the observability roadmap.
 * Visualizes AI spending, model usage, latency, and token consumption.
 *
 * Features:
 * - KPI cards with period-over-period comparison
 * - Cost trend area chart
 * - Model distribution donut chart
 * - Token usage stacked bar chart
 * - Latency percentile line chart
 * - Anomaly detection insights
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
  AlertTriangle,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import {
  CostTrendChart,
  ModelDistributionChart,
  TokenStackChart,
  LatencyChart,
} from '@/components/admin/analytics/charts';

// Range options for date picker
const RANGES = [
  { label: '7T', value: '7d' },
  { label: '30T', value: '30d' },
  { label: '90T', value: '90d' },
];

interface AnalyticsData {
  range: string;
  days: number;
  summary: {
    totalSpend: number;
    totalRequests: number;
    avgLatency: number;
    avgTokensPerRequest: number;
    successRate: number;
    spendChange: number;
    requestsChange: number;
  };
  charts: {
    costTrend: Array<{ date: string; cost: number; requests: number }>;
    modelUsage: Array<{
      model: string;
      provider: string;
      requestCount: number;
      totalCost: number;
      totalTokens: number;
      avgResponseTime: number;
      successRate: number;
    }>;
    latencyPercentiles: Array<{ date: string; p50: number; p90: number; p99: number; avg: number }>;
    tokenUsage: Array<{ date: string; promptTokens: number; completionTokens: number; totalTokens: number }>;
  };
  insights: Array<{
    type: string;
    date: string;
    message: string;
    severity: string;
  }>;
}

export default function AIAnalyticsPage() {
  const [range, setRange] = useState('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/analytics/ai?range=${range}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const result: AnalyticsData = await res.json();
      setData(result);
    } catch (error) {
      console.error('[AI_ANALYTICS] Error:', error);
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

  const handleRangeChange = (newRange: string) => {
    if (newRange !== range) {
      setRange(newRange);
    }
  };

  // Helper to render trend indicator
  const renderTrend = (change: number, inverse: boolean = false) => {
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

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════
          Header with Range Picker
      ═══════════════════════════════════════════════════════════════ */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/admin"
              className="p-2 -ml-2 rounded-lg hover:bg-card/10 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Brain className="w-7 h-7 text-purple-400" />
              <span>AI Intelligence</span>
            </h1>
          </div>
          <p className="text-white/50 ml-10">
            Cost analysis, model performance, and usage insights
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Range Picker */}
          <div className="flex items-center bg-card/5 rounded-lg p-1 border border-white/10">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => handleRangeChange(r.value)}
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
          KPI Cards Row
      ═══════════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spend */}
        <div className="glass-command-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            {data && renderTrend(data.summary.spendChange, true)}
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">
            {loading ? '—' : `$${data?.summary.totalSpend.toFixed(2) || '0.00'}`}
          </p>
          <p className="text-xs text-white/50 mt-1">Total Spend</p>
        </div>

        {/* Total Requests */}
        <div className="glass-command-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>
            {data && renderTrend(data.summary.requestsChange)}
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">
            {loading ? '—' : data?.summary.totalRequests.toLocaleString() || '0'}
          </p>
          <p className="text-xs text-white/50 mt-1">Total Requests</p>
        </div>

        {/* Avg Latency */}
        <div className="glass-command-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-violet-500/20">
              <Clock className="w-5 h-5 text-violet-400" />
            </div>
            <div className={`flex items-center gap-1 ${
              (data?.summary.avgLatency || 0) < 500 ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">
                {(data?.summary.avgLatency || 0) < 500 ? 'Good' : 'Slow'}
              </span>
            </div>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">
            {loading ? '—' : `${data?.summary.avgLatency.toLocaleString() || '0'}ms`}
          </p>
          <p className="text-xs text-white/50 mt-1">Avg Latency</p>
        </div>

        {/* Avg Tokens/Request */}
        <div className="glass-command-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div className={`flex items-center gap-1 ${
              (data?.summary.successRate || 100) >= 95 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              <span className="text-xs font-medium">
                {data?.summary.successRate.toFixed(1) || '100'}% success
              </span>
            </div>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">
            {loading ? '—' : data?.summary.avgTokensPerRequest.toLocaleString() || '0'}
          </p>
          <p className="text-xs text-white/50 mt-1">Avg Tokens/Request</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          Main Cost Trend Chart (Full Width)
      ═══════════════════════════════════════════════════════════════ */}
      <section>
        <CostTrendChart
          data={data?.charts.costTrend || []}
          isLoading={loading}
        />
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          Secondary Charts Row (2 Columns)
      ═══════════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModelDistributionChart
          data={data?.charts.modelUsage || []}
          isLoading={loading}
        />
        <TokenStackChart
          data={data?.charts.tokenUsage || []}
          isLoading={loading}
        />
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          Latency Chart (Full Width)
      ═══════════════════════════════════════════════════════════════ */}
      <section>
        <LatencyChart
          data={data?.charts.latencyPercentiles || []}
          isLoading={loading}
        />
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          Insights / Anomalies Section
      ═══════════════════════════════════════════════════════════════ */}
      {data?.insights && data.insights.length > 0 && (
        <section className="glass-command-panel p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Detected Anomalies</h3>
              <p className="text-xs text-white/50">
                Unusual patterns detected in the last {data.days} days
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {data.insights.map((insight, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  insight.severity === 'high'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}
              >
                <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  insight.severity === 'high' ? 'text-red-400' : 'text-amber-400'
                }`} />
                <div>
                  <p className={`text-sm ${
                    insight.severity === 'high' ? 'text-red-300' : 'text-amber-300'
                  }`}>
                    {insight.message}
                  </p>
                  <p className="text-xs text-white/40 mt-1">
                    Detected on {new Date(insight.date).toLocaleDateString('de-DE', {
                      weekday: 'long',
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state for insights */}
      {data && (!data.insights || data.insights.length === 0) && (
        <section className="glass-command-panel p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">No Anomalies Detected</h3>
              <p className="text-xs text-white/50">
                All systems operating within normal parameters for the last {data.days} days
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
