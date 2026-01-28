'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  MessageSquare,
  DollarSign,
  Activity,
  TrendingUp,
  TrendingDown,
  Cpu,
  Bot,
  Sparkles,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

interface SystemOverview {
  totalUsers: number;
  activeUsers24h: number;
  activeUsers7d: number;
  totalConversations: number;
  totalMessages: number;
  totalAIRequests: number;
  totalCost: number;
  avgCostPerUser: number;
}

interface ModelStats {
  modelId: string;
  requestCount: number;
  totalTokens: number;
  totalCost: number;
}

interface AgentStats {
  agentId: string;
  conversationCount: number;
  messageCount: number;
  totalCost: number;
  popularityScore: number;
}

interface BudgetUtilization {
  totalBudget: number;
  totalSpent: number;
  utilizationRate: number;
  usersOverBudget: number;
  usersNearLimit: number;
}

export function AdminAnalyticsDashboard() {
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [modelStats, setModelStats] = useState<ModelStats[]>([]);
  const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
  const [budgetUtilization, setBudgetUtilization] = useState<BudgetUtilization | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30');

  useEffect(() => {
    loadAllData();
  }, [period]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [overviewRes, modelsRes, agentsRes, budgetsRes] = await Promise.all([
        fetch('/api/admin/analytics/overview'),
        fetch(`/api/admin/analytics/models?days=${period}`),
        fetch(`/api/admin/analytics/agents?days=${period}`),
        fetch('/api/admin/analytics/budgets'),
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(data.data);
      }

      if (modelsRes.ok) {
        const data = await modelsRes.json();
        setModelStats(data.data);
      }

      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgentStats(data.data);
      }

      if (budgetsRes.ok) {
        const data = await budgetsRes.json();
        setBudgetUtilization(data.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(cost);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Usage Analytics</h2>
          <p className="text-muted-foreground mt-1">
            System-wide AI model usage and cost analytics
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('7')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              period === '7'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setPeriod('30')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              period === '30'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setPeriod('90')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              period === '90'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Last 90 Days
          </button>
        </div>
      </div>

      {/* System Overview Stats */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Users</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{formatNumber(overview.totalUsers)}</div>
            <div className="text-sm text-muted-foreground mt-2">
              {formatNumber(overview.activeUsers24h)} active today
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">AI Requests</span>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{formatNumber(overview.totalAIRequests)}</div>
            <div className="text-sm text-muted-foreground mt-2">
              {formatNumber(overview.totalConversations)} conversations
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Cost</span>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{formatCost(overview.totalCost)}</div>
            <div className="text-sm text-muted-foreground mt-2">
              {formatCost(overview.avgCostPerUser)} per user
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Messages</span>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{formatNumber(overview.totalMessages)}</div>
            <div className="text-sm text-muted-foreground mt-2">
              Across all agents
            </div>
          </div>
        </div>
      )}

      {/* Budget Utilization Alert */}
      {budgetUtilization && (budgetUtilization.usersOverBudget > 0 || budgetUtilization.usersNearLimit > 0) && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-yellow-900 dark:text-yellow-100">Budget Alerts</h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
              {budgetUtilization.usersOverBudget > 0 && (
                <span>{budgetUtilization.usersOverBudget} users exceeded their budget. </span>
              )}
              {budgetUtilization.usersNearLimit > 0 && (
                <span>{budgetUtilization.usersNearLimit} users are near their limit (80%+).</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Budget Utilization Stats */}
      {budgetUtilization && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Budget</span>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{formatCost(budgetUtilization.totalBudget)}</div>
            <div className="text-sm text-muted-foreground mt-2">
              Across all users
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Spent</span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{formatCost(budgetUtilization.totalSpent)}</div>
            <div className="text-sm text-muted-foreground mt-2">
              {budgetUtilization.utilizationRate.toFixed(1)}% utilized
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Remaining Budget</span>
              {budgetUtilization.utilizationRate < 80 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
            </div>
            <div className="text-2xl font-bold">
              {formatCost(budgetUtilization.totalBudget - budgetUtilization.totalSpent)}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {(100 - budgetUtilization.utilizationRate).toFixed(1)}% available
            </div>
          </div>
        </div>
      )}

      {/* Model Usage Stats */}
      {modelStats.length > 0 && (
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Model Usage</h3>
          </div>
          <div className="space-y-4">
            {modelStats.map((model) => (
              <div key={model.modelId}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{model.modelId}</span>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{formatNumber(model.requestCount)} requests</span>
                    <span>{formatCost(model.totalCost)}</span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{
                      width: `${(model.requestCount / Math.max(...modelStats.map(m => m.requestCount))) * 100}%`,
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{formatNumber(model.totalTokens)} tokens</span>
                  <span>{(model.totalCost / model.requestCount * 1000).toFixed(2)}¢ per request</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Usage Stats */}
      {agentStats.length > 0 && (
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Agent Popularity</h3>
          </div>
          <div className="space-y-4">
            {agentStats.slice(0, 5).map((agent, index) => (
              <div key={agent.agentId}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-6">#{index + 1}</span>
                    <span className="font-medium capitalize">{agent.agentId}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{formatNumber(agent.conversationCount)} conversations</span>
                    <span>{formatCost(agent.totalCost)}</span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: `${(agent.popularityScore / Math.max(...agentStats.map(a => a.popularityScore))) * 100}%`,
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{formatNumber(agent.messageCount)} messages</span>
                  <span>Avg {agent.conversationCount > 0 ? (agent.messageCount / agent.conversationCount).toFixed(1) : 0} msg/conversation</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
