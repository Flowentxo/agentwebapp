'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface ModelHealth {
  model: string;
  status: 'closed' | 'open' | 'half_open' | 'unknown';
  healthy: boolean;
  failures: number;
  lastFailure: number | null;
  uptime: number;
}

interface HealthData {
  overall: {
    health: number;
    healthyModels: number;
    totalModels: number;
    status: 'healthy' | 'degraded' | 'unhealthy';
  };
  models: ModelHealth[];
  timestamp: string;
}

export function AIHealthMonitor() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadHealth();

    if (autoRefresh) {
      const interval = setInterval(loadHealth, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadHealth = async () => {
    try {
      const response = await fetch('/api/ai/health');
      const result = await response.json();

      if (result.success) {
        setHealthData(result.data);
      }
    } catch (error) {
      console.error('Failed to load AI health:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetCircuitBreaker = async (modelKey: string) => {
    const [provider, model] = modelKey.split(':');

    try {
      const response = await fetch('/api/ai/health/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model }),
      });

      const result = await response.json();

      if (result.success) {
        await loadHealth(); // Reload health data
      }
    } catch (error) {
      console.error('Failed to reset circuit breaker:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'closed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'open':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'half_open':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'open':
        return 'bg-red-500/20 text-red-800 border-red-500/30';
      case 'half_open':
        return 'bg-yellow-500/20 text-yellow-800 border-yellow-500/30';
      default:
        return 'bg-muted text-foreground border-border';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'closed':
        return 'Healthy';
      case 'open':
        return 'Circuit Open';
      case 'half_open':
        return 'Testing Recovery';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading AI health...</p>
        </div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">No health data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Model Health Monitor</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time circuit breaker and fallback status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>
          <button
            onClick={loadHealth}
            className="p-2 rounded-lg hover:bg-muted"
            title="Refresh now"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Overall Health Card */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Zap
                className={`h-6 w-6 ${
                  healthData.overall.status === 'healthy'
                    ? 'text-green-500'
                    : healthData.overall.status === 'degraded'
                    ? 'text-yellow-500'
                    : 'text-red-500'
                }`}
              />
              <h3 className="text-xl font-semibold">System Health</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {healthData.overall.healthyModels} of {healthData.overall.totalModels} models
              operational
            </p>
          </div>

          <div className="text-right">
            <div className="text-4xl font-bold">
              {Math.round(healthData.overall.health)}%
            </div>
            <div
              className={`text-sm font-medium mt-1 ${
                healthData.overall.status === 'healthy'
                  ? 'text-green-600'
                  : healthData.overall.status === 'degraded'
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}
            >
              {healthData.overall.status.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Health Bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                healthData.overall.status === 'healthy'
                  ? 'bg-green-500'
                  : healthData.overall.status === 'degraded'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${healthData.overall.health}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Models List */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Model Status</h3>
        <div className="space-y-3">
          {healthData.models.map((model) => (
            <div
              key={model.model}
              className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(model.status)}
                <div>
                  <div className="font-medium">{model.model}</div>
                  <div className="text-sm text-muted-foreground">
                    {model.failures > 0 ? `${model.failures} recent failures` : 'No failures'}
                    {model.lastFailure && (
                      <span className="ml-2">
                        • Last: {new Date(model.lastFailure).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                    model.status
                  )}`}
                >
                  {getStatusText(model.status)}
                </div>

                {model.status === 'open' && (
                  <button
                    onClick={() => resetCircuitBreaker(model.model)}
                    className="px-3 py-1 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-xs text-muted-foreground text-center">
        Last updated: {new Date(healthData.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
