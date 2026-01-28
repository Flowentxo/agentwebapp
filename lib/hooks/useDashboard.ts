'use client';

import { useMemo } from 'react';
import { type Agent } from '@/components/dashboard/TopAgentsCompact';
import { type Incident } from '@/components/dashboard/IncidentsFeed';

/**
 * useDashboard - Aggregates dashboard metrics from agents
 * Provides 24h window aggregation and mock data
 */

interface DashboardMetrics {
  kpi: {
    requests: number;
    successPct: number;
    avgTimeSec: number;
    errorPct: number;
  };
  series: {
    requests: Array<[number, number]>;
    success: Array<[number, number]>;
    avgTime: Array<[number, number]>;
    errors: Array<[number, number]>;
  };
  health: {
    ok: number;
    degraded: number;
    error: number;
  };
  capacity: {
    rateLimit: {
      used: number;
      limit: number;
    };
    tokens: {
      today: number;
      week: number;
    };
  };
  incidents: Incident[];
}

/**
 * Generate mock time series data for sparklines
 */
function generateMockSeries(baseValue: number, variance: number, points: number = 24) {
  const now = Date.now();
  const hourMs = 3600000;

  return Array.from({ length: points }, (_, i) => {
    const timestamp = now - (points - i - 1) * hourMs;
    const value = baseValue + (Math.random() - 0.5) * variance;
    return [timestamp, Math.max(0, value)] as [number, number];
  });
}

/**
 * Generate mock incidents
 */
function generateMockIncidents(): Incident[] {
  const now = Date.now();
  const hourMs = 3600000;

  return [
    {
      id: 'inc-1',
      at: new Date(now - 2 * hourMs).toISOString(),
      type: 'deploy',
      message: 'Deployment v3.5.2 erfolgreich abgeschlossen',
    },
    {
      id: 'inc-2',
      at: new Date(now - 4 * hourMs).toISOString(),
      type: 'spike',
      agentId: 'dexter',
      message: 'Traffic-Spike erkannt: +250% gegenüber Baseline',
      severity: 'medium',
    },
    {
      id: 'inc-3',
      at: new Date(now - 6 * hourMs).toISOString(),
      type: 'error',
      agentId: 'aura',
      message: 'Workflow-Timeout bei „Daily Report Generation"',
      severity: 'low',
    },
    {
      id: 'inc-4',
      at: new Date(now - 8 * hourMs).toISOString(),
      type: 'rate_limit',
      agentId: 'cassie',
      message: 'Rate-Limit erreicht (95% der Quota)',
      severity: 'medium',
    },
    {
      id: 'inc-5',
      at: new Date(now - 12 * hourMs).toISOString(),
      type: 'deploy',
      message: 'Rollback zu v3.5.1 durchgeführt',
    },
    {
      id: 'inc-6',
      at: new Date(now - 18 * hourMs).toISOString(),
      type: 'spike',
      agentId: 'ari',
      message: 'Hohe Last durch Marketing-Kampagne',
      severity: 'low',
    },
  ];
}

export function useDashboard(agents: Agent[]): DashboardMetrics {
  return useMemo(() => {
    // Calculate health distribution
    const health = {
      ok: agents.filter((a) => a.status === 'ok').length,
      degraded: agents.filter((a) => a.status === 'degraded').length,
      error: agents.filter((a) => a.status === 'error').length,
    };

    // Aggregate 24h metrics
    const totalRequests = agents.reduce((sum, a) => sum + (a.requests24h || 0), 0);
    const avgSuccess =
      agents.length > 0
        ? agents.reduce((sum, a) => sum + (a.successRate24h || 0), 0) / agents.length
        : 0;
    const avgTime =
      agents.length > 0
        ? agents.reduce((sum, a) => sum + (a.avgTimeMs24h || 0), 0) / agents.length / 1000
        : 0;
    const errorPct = 100 - avgSuccess;

    // Generate time series for sparklines
    const series = {
      requests: generateMockSeries(totalRequests / 24, totalRequests / 24 / 4),
      success: generateMockSeries(avgSuccess, 5),
      avgTime: generateMockSeries(avgTime, avgTime / 2),
      errors: generateMockSeries(errorPct, errorPct / 2),
    };

    // Mock capacity metrics
    const capacity = {
      rateLimit: {
        used: 4567,
        limit: 10000,
      },
      tokens: {
        today: 125000,
        week: 750000,
      },
    };

    // Mock incidents
    const incidents = generateMockIncidents();

    return {
      kpi: {
        requests: totalRequests,
        successPct: avgSuccess,
        avgTimeSec: avgTime,
        errorPct,
      },
      series,
      health,
      capacity,
      incidents,
    };
  }, [agents]);
}
