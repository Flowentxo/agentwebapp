/**
 * Budget Analytics Hooks - Phase 5
 *
 * Custom hooks for fetching budget data with caching and loading states.
 * Designed for use with the PremiumBudgetPage.
 *
 * @version 1.0.0
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ForecastChartDataPoint, ModelSpendingData, AgentSpendingData } from '@/server/services/BudgetService';

// =====================================================
// TYPES
// =====================================================

export interface ForecastSummary {
  trend: 'increasing' | 'stable' | 'decreasing';
  confidenceScore: number;
  projectedOverage: number;
  budgetLimit: number;
  currentSpend: number;
  projectedEndOfMonth: number;
  daysRemaining: number;
}

export interface ForecastResponse {
  forecast: ForecastChartDataPoint[];
  summary: ForecastSummary;
  modelBreakdown?: ModelSpendingData[];
  agentBreakdown?: AgentSpendingData[];
}

export interface CostCenter {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  parentCostCenterId?: string | null;
  monthlyBudgetLimitUsd: number;
  usedBudgetUsd: number;
  usagePercentage: number;
  managerId?: string | null;
  isActive: boolean;
  projectCount: number;
  children?: CostCenter[];
}

export interface CostCenterAggregates {
  totalCostCenters: number;
  totalBudget: number;
  totalUsed: number;
  totalProjects: number;
  overallUtilization: number;
}

export interface UseForecastOptions {
  daysBack?: number;
  daysForward?: number;
  includeModelBreakdown?: boolean;
  includeAgentBreakdown?: boolean;
  refreshInterval?: number; // ms
  enabled?: boolean;
}

export interface UseCostCentersOptions {
  organizationId?: string;
  format?: 'tree' | 'flat';
  refreshInterval?: number;
  enabled?: boolean;
}

// =====================================================
// FORECAST HOOK
// =====================================================

/**
 * Hook to fetch forecast chart data
 */
export function useForecastData(options: UseForecastOptions = {}) {
  const {
    daysBack = 30,
    daysForward = 15,
    includeModelBreakdown = true,
    includeAgentBreakdown = false,
    refreshInterval = 0,
    enabled = true,
  } = options;

  const [data, setData] = useState<ForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      setIsLoading(prev => prev || data === null); // Only show loading on initial fetch

      const params = new URLSearchParams({
        daysBack: String(daysBack),
        daysForward: String(daysForward),
        includeModelBreakdown: String(includeModelBreakdown),
        includeAgentBreakdown: String(includeAgentBreakdown),
      });

      const response = await fetch(`/api/budget/charts/forecast?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch forecast data: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }

      setData(result.data);
      setError(null);
    } catch (err) {
      console.error('[useForecastData] Fetch error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [enabled, daysBack, daysForward, includeModelBreakdown, includeAgentBreakdown, data]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval > 0 && enabled) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshInterval, enabled, fetchData]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    return fetchData();
  }, [fetchData]);

  return {
    data,
    forecast: data?.forecast || [],
    summary: data?.summary || null,
    modelBreakdown: data?.modelBreakdown || [],
    agentBreakdown: data?.agentBreakdown || [],
    isLoading,
    error,
    refetch,
  };
}

// =====================================================
// COST CENTERS HOOK
// =====================================================

/**
 * Hook to fetch cost centers data
 */
export function useCostCenters(options: UseCostCentersOptions = {}) {
  const {
    organizationId = 'default-org',
    format = 'flat',
    refreshInterval = 0,
    enabled = true,
  } = options;

  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [tree, setTree] = useState<CostCenter[]>([]);
  const [aggregates, setAggregates] = useState<CostCenterAggregates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      setIsLoading(prev => prev || costCenters.length === 0);

      const params = new URLSearchParams({
        organizationId,
        format,
        includeStats: 'true',
      });

      const response = await fetch(`/api/budget/enterprise/cost-centers?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cost centers: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }

      if (format === 'tree') {
        setTree(result.data.tree || []);
        setAggregates(result.data.aggregates || null);
        // Flatten tree for table if needed
        const flattened = flattenTree(result.data.tree || []);
        setCostCenters(flattened);
      } else {
        setCostCenters(result.data.costCenters || []);
        setAggregates({
          totalCostCenters: result.data.total || 0,
          totalBudget: result.data.costCenters?.reduce((sum: number, c: CostCenter) => sum + c.monthlyBudgetLimitUsd, 0) || 0,
          totalUsed: result.data.costCenters?.reduce((sum: number, c: CostCenter) => sum + c.usedBudgetUsd, 0) || 0,
          totalProjects: result.data.costCenters?.reduce((sum: number, c: CostCenter) => sum + c.projectCount, 0) || 0,
          overallUtilization: 0,
        });
      }

      setError(null);
    } catch (err) {
      console.error('[useCostCenters] Fetch error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [enabled, organizationId, format, costCenters.length]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval > 0 && enabled) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshInterval, enabled, fetchData]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    return fetchData();
  }, [fetchData]);

  // Transfer budget between cost centers
  const transferBudget = useCallback(async (
    sourceCostCenterId: string,
    targetCostCenterId: string,
    amount: number,
    reason?: string
  ) => {
    try {
      const response = await fetch('/api/budget/enterprise/cost-centers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sourceCostCenterId,
          targetCostCenterId,
          amount,
          reason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Transfer failed');
      }

      const result = await response.json();

      // Refetch to get updated data
      await refetch();

      return result.data;
    } catch (err) {
      console.error('[useCostCenters] Transfer error:', err);
      throw err;
    }
  }, [refetch]);

  return {
    costCenters,
    tree,
    aggregates,
    isLoading,
    error,
    refetch,
    transferBudget,
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Flatten a tree structure to a flat array
 */
function flattenTree(nodes: CostCenter[], depth: number = 0): CostCenter[] {
  const result: CostCenter[] = [];

  for (const node of nodes) {
    result.push({ ...node, children: undefined });
    if (node.children && node.children.length > 0) {
      result.push(...flattenTree(node.children, depth + 1));
    }
  }

  return result;
}

// =====================================================
// BUDGET HEALTH HOOK
// =====================================================

export interface BudgetHealthData {
  healthScore: number;
  status: 'excellent' | 'good' | 'fair' | 'warning' | 'critical';
  budget: {
    limit: number;
    used: number;
    available: number;
    utilizationPercent: number;
  };
  trend: 'increasing' | 'stable' | 'decreasing';
  alerts: Array<{
    id: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
  }>;
  recommendations: string[];
}

/**
 * Hook to fetch budget health summary
 */
export function useBudgetHealth(options: { enabled?: boolean; refreshInterval?: number } = {}) {
  const { enabled = true, refreshInterval = 60000 } = options;

  const [health, setHealth] = useState<BudgetHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      setIsLoading(prev => prev || health === null);

      const response = await fetch('/api/budget?includeHealth=true', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch budget health: ${response.status}`);
      }

      const result = await response.json();

      if (result.health) {
        setHealth({
          healthScore: result.health.score || 0,
          status: result.health.status || 'fair',
          budget: {
            limit: parseFloat(result.budget?.monthlyCostLimitUsd || 0),
            used: parseFloat(result.budget?.currentMonthCostUsd || 0),
            available: parseFloat(result.budget?.monthlyCostLimitUsd || 0) - parseFloat(result.budget?.currentMonthCostUsd || 0),
            utilizationPercent: result.health.utilizationPercent || 0,
          },
          trend: result.health.trend || 'stable',
          alerts: result.alerts || [],
          recommendations: result.health.recommendations || [],
        });
      }

      setError(null);
    } catch (err) {
      console.error('[useBudgetHealth] Fetch error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [enabled, health]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (refreshInterval > 0 && enabled) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshInterval, enabled, fetchData]);

  return {
    health,
    isLoading,
    error,
    refetch: fetchData,
  };
}

// =====================================================
// COMBINED ANALYTICS HOOK
// =====================================================

/**
 * Combined hook for all budget analytics data
 */
export function useBudgetAnalytics(options: {
  enabled?: boolean;
  refreshInterval?: number;
} = {}) {
  const { enabled = true, refreshInterval = 60000 } = options;

  const forecast = useForecastData({
    enabled,
    refreshInterval,
    includeModelBreakdown: true,
    includeAgentBreakdown: true,
  });

  const costCenters = useCostCenters({
    enabled,
    format: 'tree',
  });

  const health = useBudgetHealth({
    enabled,
    refreshInterval,
  });

  const isLoading = forecast.isLoading || costCenters.isLoading || health.isLoading;
  const hasError = forecast.error || costCenters.error || health.error;

  const refetchAll = useCallback(async () => {
    await Promise.all([
      forecast.refetch(),
      costCenters.refetch(),
      health.refetch(),
    ]);
  }, [forecast, costCenters, health]);

  return {
    forecast,
    costCenters,
    health,
    isLoading,
    hasError,
    refetchAll,
  };
}
