"use client";

// ============================================================================
// FINOPS DATA HOOK
// Fetches real analytics data for the Budget page
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import {
  getFinOpsAnalytics,
  type FinOpsAnalyticsResult,
  type DateRangeFilter,
} from "@/actions/budget-analytics";
import type {
  MetricRibbonData,
  CostDataPoint,
  BudgetPolicy,
  LedgerEntry,
  DateRange,
} from "@/lib/finops-terminal-data";

// ============================================================================
// TYPES
// ============================================================================

export interface UseFinOpsDataOptions {
  initialRange?: DateRange;
  autoRefresh?: boolean;
  refreshInterval?: number; // ms
}

export interface UseFinOpsDataReturn {
  // Data
  metricRibbon: MetricRibbonData | null;
  costExplorerData: CostDataPoint[];
  policies: BudgetPolicy[];
  ledgerEntries: LedgerEntry[];
  summary: FinOpsAnalyticsResult["summary"] | null;

  // State
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  lastUpdated: Date | null;

  // Actions
  refresh: () => Promise<void>;
  setDateRange: (range: DateRange) => void;
  selectedRange: DateRange;
}

// ============================================================================
// DEFAULT RANGE
// ============================================================================

const defaultRange: DateRange = {
  label: "Last 7 days",
  value: "7d",
};

// ============================================================================
// HOOK
// ============================================================================

export function useFinOpsData(options: UseFinOpsDataOptions = {}): UseFinOpsDataReturn {
  const {
    initialRange = defaultRange,
    autoRefresh = false,
    refreshInterval = 60000, // 1 minute
  } = options;

  // State
  const [selectedRange, setSelectedRangeState] = useState<DateRange>(initialRange);
  const [metricRibbon, setMetricRibbon] = useState<MetricRibbonData | null>(null);
  const [costExplorerData, setCostExplorerData] = useState<CostDataPoint[]>([]);
  const [policies, setPolicies] = useState<BudgetPolicy[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<FinOpsAnalyticsResult["summary"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Convert DateRange to DateRangeFilter
  const toDateRangeFilter = useCallback((range: DateRange): DateRangeFilter => {
    const now = new Date();
    const endDate = new Date(now);
    let startDate = new Date(now);

    switch (range.value) {
      case "24h":
        startDate.setHours(startDate.getHours() - 24);
        break;
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      case "custom":
        if (range.startDate && range.endDate) {
          startDate = range.startDate;
          endDate.setTime(range.endDate.getTime());
        }
        break;
    }

    return {
      startDate,
      endDate,
      rangeLabel: range.value,
    };
  }, []);

  // Fetch data
  const fetchData = useCallback(
    async (showRefreshState = false) => {
      try {
        if (showRefreshState) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setError(null);

        const filter = toDateRangeFilter(selectedRange);
        const result = await getFinOpsAnalytics(filter);

        setMetricRibbon(result.metricRibbon);
        setCostExplorerData(result.costExplorerData);
        setPolicies(result.policies);
        setLedgerEntries(result.ledgerEntries);
        setSummary(result.summary);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("[useFinOpsData] Error fetching data:", err);
        setError(err instanceof Error ? err : new Error("Failed to fetch FinOps data"));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedRange, toDateRangeFilter]
  );

  // Refresh action
  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Set date range
  const setDateRange = useCallback((range: DateRange) => {
    setSelectedRangeState(range);
  }, []);

  // Initial fetch and range change
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, refresh]);

  return {
    // Data
    metricRibbon,
    costExplorerData,
    policies,
    ledgerEntries,
    summary,

    // State
    isLoading,
    isRefreshing,
    error,
    lastUpdated,

    // Actions
    refresh,
    setDateRange,
    selectedRange,
  };
}

// ============================================================================
// UTILITY: Format for display
// ============================================================================

export function formatFinOpsDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatFinOpsCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}
