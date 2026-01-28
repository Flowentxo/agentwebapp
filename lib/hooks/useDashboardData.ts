import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002';

export interface AgentMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  successRate: number;
  requestsPerMinute: number;
  activeConnections: number;
}

export interface AgentHealth {
  id: string;
  name: string;
  type: string;
  version: string;
  status: 'healthy' | 'degraded' | 'down';
  capabilities: string[];
  metrics: AgentMetrics;
  lastActivity?: string;
  realDataMode: boolean;
}

export interface SystemStats {
  totalAgents: number;
  healthyAgents: number;
  degradedAgents: number;
  downAgents: number;
  totalRequests: number;
  totalErrors: number;
  averageResponseTime: number;
  systemCpuUsage?: number;
  systemMemoryUsage?: number;
  uptime: number;
}

export interface DashboardData {
  agents: AgentHealth[];
  systemStats: SystemStats;
  health: {
    status: 'healthy' | 'degraded' | 'critical';
    message: string;
  };
  timestamp: string;
}

interface UseDashboardDataOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
}

export function useDashboardData(options: UseDashboardDataOptions = {}) {
  const { refreshInterval = 10000, autoRefresh = true } = options;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch from Next.js API route (which handles auth internally)
      const [agentsRes, statsRes, healthRes] = await Promise.all([
        axios.get('/api/agents', { withCredentials: true }),
        axios.get('/api/agents/stats', { withCredentials: true }),
        axios.get('/api/agents/health', { withCredentials: true }),
      ]);

      const dashboardData: DashboardData = {
        agents: agentsRes.data.agents || [],
        systemStats: statsRes.data || {
          totalAgents: 0,
          healthyAgents: 0,
          degradedAgents: 0,
          downAgents: 0,
          totalRequests: 0,
          totalErrors: 0,
          averageResponseTime: 0,
          uptime: 0,
        },
        health: healthRes.data || { status: 'healthy', message: 'System operational' },
        timestamp: new Date().toISOString(),
      };

      setData(dashboardData);
      setLastUpdate(new Date());
      setError(null);
    } catch (err: any) {
      console.error('[useDashboardData] Error fetching data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchDashboardData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchDashboardData]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    data,
    loading,
    error,
    lastUpdate,
    refresh,
  };
}
