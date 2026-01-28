'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Zap, TrendingUp, AlertTriangle, Info, X, Clock } from 'lucide-react';

interface BudgetData {
  limits: {
    monthlyTokens: number;
    monthlyCostUsd: number;
    dailyTokens: number;
    dailyCostUsd: number;
    maxTokensPerRequest: number;
    maxRequestsPerMinute: number;
  };
  usage: {
    monthlyTokens: number;
    monthlyCostUsd: number;
    dailyTokens: number;
    dailyCostUsd: number;
  };
  percentages: {
    monthlyTokens: number;
    monthlyCost: number;
    dailyTokens: number;
    dailyCost: number;
  };
  resets: {
    monthResetAt: string;
    dayResetAt: string;
  };
  isActive: boolean;
  plan: string;
}

interface Alert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  currentUsage?: any;
  limit?: any;
  createdAt: string;
}

interface RateLimitData {
  config: {
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
    maxRequestsPerDay: number;
  };
  status: {
    minute: {
      allowed: boolean;
      limit: number;
      remaining: number;
      resetAt: string;
      percentage: number;
    };
    hour: {
      allowed: boolean;
      limit: number;
      remaining: number;
      resetAt: string;
      percentage: number;
    };
    day: {
      allowed: boolean;
      limit: number;
      remaining: number;
      resetAt: string;
      percentage: number;
    };
  };
}

export function BudgetDashboard() {
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rateLimit, setRateLimit] = useState<RateLimitData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBudgetData();
    fetchRateLimits();
  }, []);

  const fetchBudgetData = async () => {
    try {
      const response = await fetch('/api/budget');
      if (response.ok) {
        const data = await response.json();
        setBudget(data.data.budget);
        setAlerts(data.data.alerts || []);
      }
    } catch (error) {
      console.error('Failed to fetch budget:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRateLimits = async () => {
    try {
      const response = await fetch('/api/budget/rate-limits');
      if (response.ok) {
        const data = await response.json();
        setRateLimit(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch rate limits:', error);
    }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      await fetch('/api/budget/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      });
      setAlerts(alerts.filter((a) => a.id !== alertId));
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 border-red-500 text-red-900';
      case 'warning':
        return 'bg-orange-100 border-orange-500 text-orange-900';
      default:
        return 'bg-blue-500/20 border-blue-500 text-blue-900';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Failed to load budget data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 border-l-4 rounded-lg ${getSeverityColor(alert.severity)} flex items-start gap-3`}
            >
              {getSeverityIcon(alert.severity)}
              <div className="flex-1">
                <p className="font-medium">{alert.message}</p>
                {alert.currentUsage && (
                  <p className="text-sm mt-1 opacity-80">
                    Current: {alert.currentUsage.tokens?.toLocaleString()} tokens
                    {alert.limit?.tokens && ` / ${alert.limit.tokens.toLocaleString()}`}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                className="text-current hover:opacity-70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Plan Badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Budget & Usage</h2>
        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium capitalize">
          {budget.plan} Plan
        </span>
      </div>

      {/* Monthly Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly Tokens */}
        <div className="p-6 bg-card border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Monthly Tokens</h3>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                {budget.usage.monthlyTokens.toLocaleString()} /{' '}
                {budget.limits.monthlyTokens.toLocaleString()}
              </span>
              <span className="font-medium">
                {budget.percentages.monthlyTokens.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(
                  budget.percentages.monthlyTokens
                )}`}
                style={{ width: `${Math.min(budget.percentages.monthlyTokens, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Monthly Cost */}
        <div className="p-6 bg-card border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <h3 className="font-semibold">Monthly Cost</h3>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                ${budget.usage.monthlyCostUsd.toFixed(2)} / $
                {budget.limits.monthlyCostUsd.toFixed(2)}
              </span>
              <span className="font-medium">
                {budget.percentages.monthlyCost.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(
                  budget.percentages.monthlyCost
                )}`}
                style={{ width: `${Math.min(budget.percentages.monthlyCost, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Daily Tokens */}
        <div className="p-6 bg-card border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold">Daily Tokens</h3>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                {budget.usage.dailyTokens.toLocaleString()} /{' '}
                {budget.limits.dailyTokens.toLocaleString()}
              </span>
              <span className="font-medium">
                {budget.percentages.dailyTokens.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(
                  budget.percentages.dailyTokens
                )}`}
                style={{ width: `${Math.min(budget.percentages.dailyTokens, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Daily Cost */}
        <div className="p-6 bg-card border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-purple-500" />
            <h3 className="font-semibold">Daily Cost</h3>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                ${budget.usage.dailyCostUsd.toFixed(2)} / $
                {budget.limits.dailyCostUsd.toFixed(2)}
              </span>
              <span className="font-medium">
                {budget.percentages.dailyCost.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(
                  budget.percentages.dailyCost
                )}`}
                style={{ width: `${Math.min(budget.percentages.dailyCost, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Rate Limiting */}
      {rateLimit && (
        <div className="p-6 bg-card border rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Rate Limiting</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Per Minute */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Per Minute</span>
                <span className="font-medium">
                  {rateLimit.status.minute.remaining} / {rateLimit.status.minute.limit}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressColor(
                    rateLimit.status.minute.percentage
                  )}`}
                  style={{ width: `${Math.min(rateLimit.status.minute.percentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Resets: {new Date(rateLimit.status.minute.resetAt).toLocaleTimeString()}
              </p>
            </div>

            {/* Per Hour */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Per Hour</span>
                <span className="font-medium">
                  {rateLimit.status.hour.remaining} / {rateLimit.status.hour.limit}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressColor(
                    rateLimit.status.hour.percentage
                  )}`}
                  style={{ width: `${Math.min(rateLimit.status.hour.percentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Resets: {new Date(rateLimit.status.hour.resetAt).toLocaleTimeString()}
              </p>
            </div>

            {/* Per Day */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Per Day</span>
                <span className="font-medium">
                  {rateLimit.status.day.remaining} / {rateLimit.status.day.limit}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressColor(
                    rateLimit.status.day.percentage
                  )}`}
                  style={{ width: `${Math.min(rateLimit.status.day.percentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Resets: {new Date(rateLimit.status.day.resetAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Limits Info */}
      <div className="p-6 bg-card border rounded-lg">
        <h3 className="font-semibold mb-4">Current Limits</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Max Tokens/Request</p>
            <p className="text-lg font-medium">
              {budget.limits.maxTokensPerRequest.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Requests/Minute</p>
            <p className="text-lg font-medium">{budget.limits.maxRequestsPerMinute}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Daily Reset</p>
            <p className="text-lg font-medium">
              {new Date(budget.resets.dayResetAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
