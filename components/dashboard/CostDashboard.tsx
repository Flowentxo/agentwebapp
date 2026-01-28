'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Cpu,
  Activity,
  BarChart3,
} from 'lucide-react';
import { AlertBanner } from '@/components/budget/AlertBanner';

interface CostSummary {
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  costByModel: Record<string, {
    cost: number;
    tokens: number;
    requests: number;
  }>;
  costByAgent: Record<string, {
    cost: number;
    tokens: number;
    requests: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    cost: number;
    tokens: number;
    requests: number;
  }>;
}

interface CostTrends {
  last7Days: CostSummary;
  last30Days: CostSummary;
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
}

export function CostDashboard() {
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month');
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [trends, setTrends] = useState<CostTrends | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, trendsRes] = await Promise.all([
        fetch(`/api/cost-tracking?period=${period}`),
        fetch('/api/cost-tracking/trends'),
      ]);

      const summaryData = await summaryRes.json();
      const trendsData = await trendsRes.json();

      if (summaryData.success) {
        setSummary(summaryData.data);
      }

      if (trendsData.success) {
        setTrends(trendsData.data);
      }
    } catch (error) {
      console.error('Failed to load cost data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(cost);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading cost data...</p>
        </div>
      </div>
    );
  }

  if (!summary || !trends) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">No cost data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Budget Alerts */}
      <AlertBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Cost Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your AI model usage and costs
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg ${
              period === 'week'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg ${
              period === 'month'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`px-4 py-2 rounded-lg ${
              period === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cost */}
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Cost</span>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{formatCost(summary.totalCost)}</div>
          {trends.trend !== 'stable' && (
            <div className={`flex items-center mt-2 text-sm ${
              trends.trend === 'up' ? 'text-red-500' : 'text-green-500'
            }`}>
              {trends.trend === 'up' ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              {Math.abs(trends.percentageChange)}% vs last week
            </div>
          )}
        </div>

        {/* Total Requests */}
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Requests</span>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{formatNumber(summary.totalRequests)}</div>
          <div className="text-sm text-muted-foreground mt-2">
            {summary.successfulRequests} successful, {summary.failedRequests} failed
          </div>
        </div>

        {/* Total Tokens */}
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Tokens</span>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{formatNumber(summary.totalTokens)}</div>
          <div className="text-sm text-muted-foreground mt-2">
            Avg per request: {Math.round(summary.totalTokens / summary.totalRequests)}
          </div>
        </div>

        {/* Avg Response Time */}
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Avg Response Time</span>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{summary.avgResponseTime}ms</div>
          <div className="text-sm text-muted-foreground mt-2">
            Success rate: {((summary.successfulRequests / summary.totalRequests) * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Model Breakdown */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Cost by Model</h2>
        <div className="space-y-3">
          {Object.entries(summary.costByModel).map(([model, data]) => (
            <div key={model} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{model}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatCost(data.cost)}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{
                      width: `${(data.cost / summary.totalCost) * 100}%`,
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{formatNumber(data.tokens)} tokens</span>
                  <span>{formatNumber(data.requests)} requests</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Breakdown */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Cost by Agent</h2>
        <div className="space-y-3">
          {Object.entries(summary.costByAgent)
            .sort(([, a], [, b]) => b.cost - a.cost)
            .slice(0, 10)
            .map(([agentId, data]) => (
              <div key={agentId} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium capitalize">{agentId}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCost(data.cost)}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${(data.cost / summary.totalCost) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{formatNumber(data.tokens)} tokens</span>
                    <span>{formatNumber(data.requests)} requests</span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Daily Breakdown Chart */}
      {summary.dailyBreakdown && summary.dailyBreakdown.length > 0 && (
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Daily Cost Breakdown</h2>
          <div className="space-y-2">
            {summary.dailyBreakdown.map((day) => (
              <div key={day.date} className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-24">
                  {new Date(day.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <div className="flex-1">
                  <div className="w-full bg-muted rounded-full h-6 relative">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{
                        width: `${(day.cost / Math.max(...summary.dailyBreakdown.map(d => d.cost))) * 100}%`,
                      }}
                    >
                      <span className="text-xs text-white font-medium">
                        {formatCost(day.cost)}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground w-20 text-right">
                  {formatNumber(day.requests)} reqs
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
