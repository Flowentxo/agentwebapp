"use server";

// ============================================================================
// FINOPS ANALYTICS SERVER ACTIONS
// Aggregate cost data for Cost Explorer, Ledger, and Metrics
// ============================================================================

import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { budgetUsageHistory, userBudgets, billingTransactions } from "@/lib/db/schema-user-budgets";
import { eq, and, gte, lte, desc, sql, asc } from "drizzle-orm";
import type {
  MetricRibbonData,
  CostDataPoint,
  BudgetPolicy,
  LedgerEntry,
} from "@/lib/finops-terminal-data";

// ============================================================================
// TYPES
// ============================================================================

export interface FinOpsAnalyticsResult {
  metricRibbon: MetricRibbonData;
  costExplorerData: CostDataPoint[];
  policies: BudgetPolicy[];
  ledgerEntries: LedgerEntry[];
  summary: {
    totalCost: number;
    totalTokens: number;
    totalRequests: number;
    avgCostPerRequest: number;
    avgTokensPerRequest: number;
  };
}

export interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
  rangeLabel: "24h" | "7d" | "30d" | "90d" | "custom";
}

// ============================================================================
// HELPER: Get authenticated user ID
// ============================================================================

async function getAuthUserId(): Promise<string> {
  const session = await getSession();

  if (!session || !session.user?.id) {
    // For demo purposes, return a default user
    return "default-user";
  }

  return session.user.id;
}

// ============================================================================
// LINEAR REGRESSION FOR FORECAST
// ============================================================================

function calculateLinearRegression(data: { x: number; y: number }[]): {
  slope: number;
  intercept: number;
  predict: (x: number) => number;
} {
  if (data.length < 2) {
    return { slope: 0, intercept: data[0]?.y || 0, predict: () => data[0]?.y || 0 };
  }

  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (const point of data) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return {
    slope,
    intercept,
    predict: (x: number) => Math.max(0, slope * x + intercept),
  };
}

// ============================================================================
// MAIN ACTION: Get FinOps Analytics
// ============================================================================

export async function getFinOpsAnalytics(
  range: DateRangeFilter,
  _filters?: { model?: string[]; agent?: string[]; user?: string[] }
): Promise<FinOpsAnalyticsResult> {
  const userId = await getAuthUserId();
  const db = getDb();

  // Fetch usage history within the date range
  let usageData: typeof budgetUsageHistory.$inferSelect[] = [];

  try {
    usageData = await db
      .select()
      .from(budgetUsageHistory)
      .where(
        and(
          eq(budgetUsageHistory.userId, userId),
          gte(budgetUsageHistory.periodStart, range.startDate),
          lte(budgetUsageHistory.periodEnd, range.endDate)
        )
      )
      .orderBy(asc(budgetUsageHistory.periodStart));
  } catch (error) {
    // Table might not exist yet - continue with empty data
    console.warn("[getFinOpsAnalytics] Could not fetch usage history:", error);
  }

  // Fetch current budget settings
  let budget: typeof userBudgets.$inferSelect | undefined;

  try {
    const [budgetResult] = await db
      .select()
      .from(userBudgets)
      .where(eq(userBudgets.userId, userId))
      .limit(1);
    budget = budgetResult;
  } catch (error) {
    console.warn("[getFinOpsAnalytics] Could not fetch user budget:", error);
  }

  // Build cost explorer data points
  const costDataPoints: CostDataPoint[] = [];
  const dailyBudget = parseFloat(budget?.dailyCostLimitUsd || "10");

  // Group usage by day
  const dailyUsage: Map<string, {
    actual: number;
    tokens: number;
    requests: number;
    byModel: Record<string, number>;
    byAgent: Record<string, number>;
    byUser: Record<string, number>;
  }> = new Map();

  for (const record of usageData) {
    const dateKey = record.periodStart.toISOString().split("T")[0];
    const cost = parseFloat(record.costUsd as string);

    const existing = dailyUsage.get(dateKey) || {
      actual: 0,
      tokens: 0,
      requests: 0,
      byModel: {},
      byAgent: {},
      byUser: {},
    };

    existing.actual += cost;
    existing.tokens += record.tokensUsed;
    existing.requests += record.requestCount;

    // Aggregate model usage
    if (record.modelUsage) {
      const modelData = record.modelUsage as Record<string, { cost: number }>;
      for (const [model, data] of Object.entries(modelData)) {
        existing.byModel[model] = (existing.byModel[model] || 0) + data.cost;
      }
    }

    // Aggregate agent usage
    if (record.agentUsage) {
      const agentData = record.agentUsage as Record<string, { cost: number }>;
      for (const [agent, data] of Object.entries(agentData)) {
        existing.byAgent[agent] = (existing.byAgent[agent] || 0) + data.cost;
      }
    }

    dailyUsage.set(dateKey, existing);
  }

  // Convert to array and sort by date
  const sortedDates = Array.from(dailyUsage.entries()).sort(
    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
  );

  // Calculate regression for forecast (using last 7 data points)
  const regressionData = sortedDates.slice(-7).map(([, data], idx) => ({
    x: idx,
    y: data.actual,
  }));
  const regression = calculateLinearRegression(regressionData);

  // Generate data points with forecast
  let dayIndex = 0;
  for (const [dateStr, data] of sortedDates) {
    const isLastDays = dayIndex >= sortedDates.length - 7;
    const forecastValue = isLastDays ? regression.predict(dayIndex) : null;

    costDataPoints.push({
      date: dateStr,
      timestamp: new Date(dateStr).getTime(),
      actual: data.actual,
      forecast: forecastValue,
      budget: dailyBudget,
      byModel: data.byModel,
      byAgent: data.byAgent,
      byUser: { [userId]: data.actual }, // Simplified for single user
      byTag: {}, // Tags not implemented yet
    });

    dayIndex++;
  }

  // If no data, generate placeholder for current range
  if (costDataPoints.length === 0) {
    const days = Math.ceil(
      (range.endDate.getTime() - range.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    for (let i = 0; i < days; i++) {
      const date = new Date(range.startDate);
      date.setDate(date.getDate() + i);
      costDataPoints.push({
        date: date.toISOString().split("T")[0],
        timestamp: date.getTime(),
        actual: 0,
        forecast: null,
        budget: dailyBudget,
        byModel: {},
        byAgent: {},
        byUser: {},
        byTag: {},
      });
    }
  }

  // Calculate metric ribbon data
  const totalCost = sortedDates.reduce((sum, [, data]) => sum + data.actual, 0);
  const totalTokens = sortedDates.reduce((sum, [, data]) => sum + data.tokens, 0);
  const totalRequests = sortedDates.reduce((sum, [, data]) => sum + data.requests, 0);
  const avgDailyCost = sortedDates.length > 0 ? totalCost / sortedDates.length : 0;

  // Forecast to end of month
  const now = new Date();
  const daysRemaining = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  const projectedMonthEnd = totalCost + avgDailyCost * daysRemaining;

  const monthlyLimit = parseFloat(budget?.monthlyCostLimitUsd || "100");
  const projectionStatus: "on_track" | "over_budget" | "under_budget" =
    projectedMonthEnd > monthlyLimit * 1.1
      ? "over_budget"
      : projectedMonthEnd < monthlyLimit * 0.8
        ? "under_budget"
        : "on_track";

  // Calculate burn rate (credits per hour based on last 24 hours)
  const last24h = sortedDates.slice(-1);
  const last24hCost = last24h.reduce((sum, [, data]) => sum + data.actual, 0);
  const burnRate = last24hCost / 24;

  // Detect anomalies (simple: if any day > 2x average)
  const anomalyDays = sortedDates.filter(([, data]) => data.actual > avgDailyCost * 2);

  const metricRibbon: MetricRibbonData = {
    forecast: {
      value: projectedMonthEnd,
      trend: avgDailyCost > 0 ? ((projectedMonthEnd - monthlyLimit) / monthlyLimit) * 100 : 0,
      projection: projectionStatus,
    },
    burnRate: {
      value: burnRate,
      unit: "credits/hr",
      trend: 0, // Could calculate trend if we had more historical data
    },
    activeBudgets: {
      value: 1, // User's active budget
      healthy: projectionStatus === "under_budget" ? 1 : 0,
      warning: projectionStatus === "on_track" ? 1 : 0,
      critical: projectionStatus === "over_budget" ? 1 : 0,
    },
    anomalies: {
      count: anomalyDays.length,
      severity: anomalyDays.length > 3 ? "high" : anomalyDays.length > 0 ? "medium" : "none",
      lastDetected: anomalyDays.length > 0 ? anomalyDays[anomalyDays.length - 1][0] : null,
    },
  };

  // Build policies from budget settings
  const metadata = budget?.metadata as { autoReload?: { enabled: boolean } } | null;
  const policies: BudgetPolicy[] = budget
    ? [
        {
          id: "pol_daily",
          name: "Daily Spending Limit",
          scope: "user",
          scopeTarget: userId,
          thresholdType: "absolute",
          threshold: parseFloat(budget.dailyCostLimitUsd || "10"),
          currentUsage: parseFloat(budget.currentDayCostUsd || "0"),
          limit: parseFloat(budget.dailyCostLimitUsd || "10"),
          action: "block",
          status:
            parseFloat(budget.currentDayCostUsd || "0") >=
            parseFloat(budget.dailyCostLimitUsd || "10")
              ? "triggered"
              : "active",
          createdAt: budget.createdAt.toISOString(),
        },
        {
          id: "pol_monthly",
          name: "Monthly Budget Cap",
          scope: "user",
          scopeTarget: userId,
          thresholdType: "absolute",
          threshold: parseFloat(budget.monthlyCostLimitUsd || "100"),
          currentUsage: parseFloat(budget.currentMonthCostUsd || "0"),
          limit: parseFloat(budget.monthlyCostLimitUsd || "100"),
          action: "alert",
          status:
            parseFloat(budget.currentMonthCostUsd || "0") >=
            parseFloat(budget.monthlyCostLimitUsd || "100") * 0.9
              ? "triggered"
              : "active",
          createdAt: budget.createdAt.toISOString(),
        },
        {
          id: "pol_alert",
          name: "Usage Alert Threshold",
          scope: "global",
          thresholdType: "percentage",
          threshold: budget.notifyThresholdPercent || 80,
          currentUsage:
            (parseFloat(budget.currentMonthCostUsd || "0") /
              parseFloat(budget.monthlyCostLimitUsd || "100")) *
            100,
          limit: 100,
          action: "alert",
          status: metadata?.autoReload?.enabled ? "active" : "disabled",
          createdAt: budget.createdAt.toISOString(),
        },
      ]
    : [];

  // Generate ledger entries from usage history
  const ledgerEntries: LedgerEntry[] = usageData.slice(-100).map((record, idx) => ({
    id: record.id,
    timestamp: record.periodStart.toISOString(),
    requestId: `req_${record.id.slice(0, 8)}`,
    userId: record.userId,
    userName: "Current User",
    agentId: "default",
    agentName: "AI Assistant",
    modelId: "gpt-4o-mini",
    modelName: "GPT-4o Mini",
    promptTokens: Math.floor(record.tokensUsed * 0.4),
    completionTokens: Math.floor(record.tokensUsed * 0.6),
    totalTokens: record.tokensUsed,
    cost: parseFloat(record.costUsd as string),
    latencyMs: record.avgResponseTimeMs || Math.floor(Math.random() * 2000) + 500,
    cacheHitRate: Math.random() * 0.3, // Simulated
    success: (record.successRate || 95) > 50,
    tags: (record.tags as string[]) || [],
  }));

  return {
    metricRibbon,
    costExplorerData: costDataPoints,
    policies,
    ledgerEntries,
    summary: {
      totalCost,
      totalTokens,
      totalRequests,
      avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
      avgTokensPerRequest: totalRequests > 0 ? totalTokens / totalRequests : 0,
    },
  };
}

// ============================================================================
// GET INVOICE DATA
// ============================================================================

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  billingPeriod: { start: string; end: string };
  customer: {
    name: string;
    email: string;
    address?: string;
  };
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
}

export async function getInvoiceData(month?: Date): Promise<InvoiceData> {
  const userId = await getAuthUserId();
  const db = getDb();

  const targetMonth = month || new Date();
  const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
  const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);

  // Fetch usage for the month
  const usageData = await db
    .select()
    .from(budgetUsageHistory)
    .where(
      and(
        eq(budgetUsageHistory.userId, userId),
        gte(budgetUsageHistory.periodStart, startOfMonth),
        lte(budgetUsageHistory.periodEnd, endOfMonth)
      )
    );

  // Fetch transactions for the month
  const transactions = await db
    .select()
    .from(billingTransactions)
    .where(
      and(
        eq(billingTransactions.userId, userId),
        gte(billingTransactions.createdAt, startOfMonth),
        lte(billingTransactions.createdAt, endOfMonth)
      )
    );

  // Calculate totals
  const totalTokens = usageData.reduce((sum, r) => sum + r.tokensUsed, 0);
  const totalCost = usageData.reduce((sum, r) => sum + parseFloat(r.costUsd as string), 0);

  // Group by model for line items
  const modelCosts: Record<string, { tokens: number; cost: number }> = {};
  for (const record of usageData) {
    if (record.modelUsage) {
      const modelData = record.modelUsage as Record<string, { tokens: number; cost: number }>;
      for (const [model, data] of Object.entries(modelData)) {
        if (!modelCosts[model]) {
          modelCosts[model] = { tokens: 0, cost: 0 };
        }
        modelCosts[model].tokens += data.tokens;
        modelCosts[model].cost += data.cost;
      }
    }
  }

  // If no model breakdown, use aggregate data
  if (Object.keys(modelCosts).length === 0 && totalTokens > 0) {
    modelCosts["AI Compute Credits"] = { tokens: totalTokens, cost: totalCost };
  }

  const lineItems = Object.entries(modelCosts).map(([model, data]) => ({
    description: `${model} - ${(data.tokens / 1000).toFixed(1)}K tokens`,
    quantity: data.tokens,
    unitPrice: data.tokens > 0 ? data.cost / data.tokens : 0,
    total: data.cost,
  }));

  // Add platform fee (5% of compute)
  const platformFee = totalCost * 0.05;
  if (platformFee > 0) {
    lineItems.push({
      description: "Platform Fee",
      quantity: 1,
      unitPrice: platformFee,
      total: platformFee,
    });
  }

  const subtotal = totalCost + platformFee;
  const tax = 0; // VAT reverse charge
  const total = subtotal + tax;

  const year = targetMonth.getFullYear();
  const monthNum = String(targetMonth.getMonth() + 1).padStart(2, "0");

  return {
    invoiceNumber: `INV-${year}-${monthNum}`,
    invoiceDate: new Date().toISOString().split("T")[0],
    billingPeriod: {
      start: startOfMonth.toISOString().split("T")[0],
      end: endOfMonth.toISOString().split("T")[0],
    },
    customer: {
      name: "Flowent Customer",
      email: userId.includes("@") ? userId : `${userId}@flowent.de`,
    },
    lineItems,
    subtotal,
    tax,
    total,
    notes: "VAT Reverse Charge applies. Payment due within 30 days.",
  };
}

// ============================================================================
// SEED DEMO DATA (for testing)
// ============================================================================

export async function seedDemoFinOpsData(): Promise<{ success: boolean; message: string }> {
  const userId = await getAuthUserId();
  const db = getDb();

  try {
    // Generate 30 days of mock usage data
    const now = new Date();
    const records = [];

    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      // Random usage with some variance
      const baseCost = 5 + Math.random() * 10;
      const baseTokens = 10000 + Math.floor(Math.random() * 30000);
      const baseRequests = 20 + Math.floor(Math.random() * 50);

      // Add occasional spikes
      const spike = Math.random() > 0.85 ? 2 + Math.random() : 1;

      records.push({
        userId,
        period: "day" as const,
        periodStart: date,
        periodEnd: endDate,
        tokensUsed: Math.floor(baseTokens * spike),
        costUsd: (baseCost * spike).toFixed(6),
        requestCount: Math.floor(baseRequests * spike),
        tokenLimit: 50000,
        costLimit: "20.00",
        exceededLimit: baseCost * spike > 20,
        modelUsage: {
          "gpt-4o-mini": {
            tokens: Math.floor(baseTokens * 0.7 * spike),
            cost: baseCost * 0.3 * spike,
            requests: Math.floor(baseRequests * 0.7 * spike),
          },
          "gpt-4o": {
            tokens: Math.floor(baseTokens * 0.3 * spike),
            cost: baseCost * 0.7 * spike,
            requests: Math.floor(baseRequests * 0.3 * spike),
          },
        },
        agentUsage: {
          dexter: {
            tokens: Math.floor(baseTokens * 0.4 * spike),
            cost: baseCost * 0.4 * spike,
            requests: Math.floor(baseRequests * 0.4 * spike),
          },
          cassie: {
            tokens: Math.floor(baseTokens * 0.3 * spike),
            cost: baseCost * 0.3 * spike,
            requests: Math.floor(baseRequests * 0.3 * spike),
          },
          emmie: {
            tokens: Math.floor(baseTokens * 0.3 * spike),
            cost: baseCost * 0.3 * spike,
            requests: Math.floor(baseRequests * 0.3 * spike),
          },
        },
        avgResponseTimeMs: 500 + Math.floor(Math.random() * 1500),
        errorCount: Math.floor(Math.random() * 3),
        successRate: 95 + Math.floor(Math.random() * 5),
        tags: ["production"],
      });
    }

    // Insert all records
    await db.insert(budgetUsageHistory).values(records);

    return { success: true, message: `Seeded ${records.length} days of demo data` };
  } catch (error) {
    console.error("[SEED_DEMO_DATA]", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to seed demo data",
    };
  }
}
