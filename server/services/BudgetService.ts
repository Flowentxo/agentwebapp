/**
 * Budget Service
 * Manages user budgets, token limits, and cost tracking
 *
 * Enterprise Features (Phase 2):
 * - Cost Center & Project tracking
 * - Forecasting with linear regression
 * - Enterprise audit logging
 * - Model & Agent usage breakdown
 */

import { getDb } from '@/lib/db/connection';
import {
  userBudgets,
  budgetUsageHistory,
  budgetAlerts
} from '@/lib/db/schema';
import {
  costCenters,
  budgetProjects,
  enterpriseAuditLogs,
  budgetForecasts,
  type CostCenter,
  type BudgetProject,
  type EnterpriseAuditLog,
  type BudgetForecast,
  type ForecastSummary,
  type AnomalyAlert
} from '@/lib/db/schema-budget-enterprise';
import { eq, and, gte, lte, desc, lt, sql, asc } from 'drizzle-orm';

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage: {
    monthlyTokens: number;
    monthlyCostUsd: number;
    dailyTokens: number;
    dailyCostUsd: number;
  };
  limits: {
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
}

// =====================================================
// ENTERPRISE INTERFACES (Phase 2)
// =====================================================

/**
 * Context for tracking usage with Enterprise features
 */
export interface UsageContext {
  // Enterprise context
  costCenterId?: string;
  projectId?: string;

  // Model & Agent tracking
  model?: string;
  agentId?: string;

  // Performance metrics
  responseTimeMs?: number;
  isError?: boolean;

  // Tags for categorization
  tags?: string[];
}

/**
 * Audit action context for logging
 */
export interface AuditContext {
  userId: string;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
}

/**
 * Linear regression result for forecasting
 */
interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number; // R-squared (0-1)
  mse: number; // Mean Squared Error
}

export class BudgetService {
  private db = getDb();

  /**
   * Default budget for when database is unavailable
   */
  private getDefaultBudget(userId: string) {
    return {
      id: 'default',
      userId,
      isActive: true,
      monthlyTokenLimit: 1000000,
      dailyTokenLimit: 100000,
      monthlyCostLimitUsd: '50.00',
      dailyCostLimitUsd: '10.00',
      currentMonthTokens: 0,
      currentDayTokens: 0,
      currentMonthCostUsd: '0.00',
      currentDayCostUsd: '0.00',
      maxRequestsPerMinute: 10,
      maxRequestsPerHour: 100,
      maxRequestsPerDay: 500,
      preferredModel: 'gpt-4o-mini',
      allowedModels: ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4-turbo'],
      autoCostOptimization: false,
      warningThresholdPercent: 80,
      metadata: { plan: 'free' },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastDayReset: new Date(),
      lastMonthReset: new Date(),
    };
  }

  /**
   * Get or create user budget
   */
  async getUserBudget(userId: string) {
    try {
      let [budget] = await this.db
        .select()
        .from(userBudgets)
        .where(eq(userBudgets.userId, userId))
        .limit(1);

      // Create default budget if doesn't exist
      if (!budget) {
        [budget] = await this.db
          .insert(userBudgets)
          .values({
            userId,
            metadata: { plan: 'free' },
          })
          .returning();
      }

      // Check if daily/monthly reset is needed
      await this.checkAndResetUsage(budget);

      // Fetch fresh data after potential reset
      [budget] = await this.db
        .select()
        .from(userBudgets)
        .where(eq(userBudgets.userId, userId))
        .limit(1);

      return budget;
    } catch (error: any) {
      // If table doesn't exist or DB error, return default budget
      console.warn('[BudgetService] Database error, using default budget:', error.message);
      return this.getDefaultBudget(userId);
    }
  }

  /**
   * Check if user can make a request (pre-flight check)
   */
  async checkBudget(userId: string, estimatedTokens: number = 1000): Promise<BudgetCheckResult> {
    const budget = await this.getUserBudget(userId);

    if (!budget.isActive) {
      return {
        allowed: false,
        reason: 'Budget is inactive. Please contact support.',
        currentUsage: this.getCurrentUsage(budget),
        limits: this.getLimits(budget),
        percentages: this.calculatePercentages(budget),
      };
    }

    // Check monthly token limit
    const projectedMonthlyTokens = (budget.currentMonthTokens || 0) + estimatedTokens;
    if (projectedMonthlyTokens > (budget.monthlyTokenLimit || Infinity)) {
      return {
        allowed: false,
        reason: 'Monthly token limit exceeded. Resets at the beginning of next month.',
        currentUsage: this.getCurrentUsage(budget),
        limits: this.getLimits(budget),
        percentages: this.calculatePercentages(budget),
      };
    }

    // Check daily token limit
    const projectedDailyTokens = (budget.currentDayTokens || 0) + estimatedTokens;
    if (projectedDailyTokens > (budget.dailyTokenLimit || Infinity)) {
      return {
        allowed: false,
        reason: 'Daily token limit exceeded. Resets at midnight.',
        currentUsage: this.getCurrentUsage(budget),
        limits: this.getLimits(budget),
        percentages: this.calculatePercentages(budget),
      };
    }

    // Check per-request token limit
    if (estimatedTokens > (budget.maxTokensPerRequest || Infinity)) {
      return {
        allowed: false,
        reason: `Request exceeds max tokens per request (${budget.maxTokensPerRequest}).`,
        currentUsage: this.getCurrentUsage(budget),
        limits: this.getLimits(budget),
        percentages: this.calculatePercentages(budget),
      };
    }

    return {
      allowed: true,
      currentUsage: this.getCurrentUsage(budget),
      limits: this.getLimits(budget),
      percentages: this.calculatePercentages(budget),
    };
  }

  /**
   * Track usage after a request completes
   * Extended with Enterprise context (Phase 2)
   *
   * @param userId - User ID
   * @param tokens - Tokens consumed
   * @param costUsd - Cost in USD
   * @param context - Optional Enterprise context (costCenter, project, model, agent, etc.)
   */
  async trackUsage(
    userId: string,
    tokens: number,
    costUsd: number,
    context?: UsageContext
  ) {
    try {
      const budget = await this.getUserBudget(userId);

      // Skip DB update if using default budget (table doesn't exist)
      if (budget.id === 'default') {
        console.log('[BudgetService] Skipping usage tracking - using default budget');
        return;
      }

      // Update current usage
      await this.db
        .update(userBudgets)
        .set({
          currentMonthTokens: (budget.currentMonthTokens || 0) + tokens,
          currentMonthCostUsd: String(
            parseFloat(String(budget.currentMonthCostUsd || 0)) + costUsd
          ),
          currentDayTokens: (budget.currentDayTokens || 0) + tokens,
          currentDayCostUsd: String(
            parseFloat(String(budget.currentDayCostUsd || 0)) + costUsd
          ),
          updatedAt: new Date(),
        })
        .where(eq(userBudgets.userId, userId));

      // =====================================================
      // ENTERPRISE: Track usage with context (Phase 2)
      // =====================================================
      if (context) {
        await this.trackEnterpriseUsage(userId, tokens, costUsd, context);
      }

      // Check if we should send threshold alerts
      const updatedBudget = await this.getUserBudget(userId);
      await this.checkThresholdAlerts(updatedBudget);
    } catch (error: any) {
      console.warn('[BudgetService] Failed to track usage:', error.message);
    }
  }

  /**
   * Track Enterprise usage details
   * Updates cost center, project, and creates detailed usage records
   */
  private async trackEnterpriseUsage(
    userId: string,
    tokens: number,
    costUsd: number,
    context: UsageContext
  ) {
    try {
      const {
        costCenterId,
        projectId,
        model,
        agentId,
        responseTimeMs,
        isError,
        tags
      } = context;

      // Update Cost Center usage if provided
      if (costCenterId) {
        await this.db
          .update(costCenters)
          .set({
            usedBudgetUsd: sql`${costCenters.usedBudgetUsd} + ${costUsd}`,
            usedTokens: sql`${costCenters.usedTokens} + ${tokens}`,
            updatedAt: new Date(),
          })
          .where(eq(costCenters.id, costCenterId));
      }

      // Update Project usage if provided
      if (projectId) {
        await this.db
          .update(budgetProjects)
          .set({
            usedBudgetUsd: sql`${budgetProjects.usedBudgetUsd} + ${costUsd}`,
            usedTokens: sql`${budgetProjects.usedTokens} + ${tokens}`,
            totalRequests: sql`${budgetProjects.totalRequests} + 1`,
            lastActivityAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(budgetProjects.id, projectId));
      }

      // Record detailed usage in history (for analytics)
      // This creates a granular record that can be aggregated later
      const now = new Date();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      // Build model usage object
      const modelUsage = model
        ? {
            [model]: {
              tokens,
              cost: costUsd,
              requests: 1,
            },
          }
        : undefined;

      // Build agent usage object
      const agentUsage = agentId
        ? {
            [agentId]: {
              tokens,
              cost: costUsd,
              requests: 1,
            },
          }
        : undefined;

      // Insert or update the daily usage record with enterprise context
      await this.db
        .insert(budgetUsageHistory)
        .values({
          userId,
          period: 'day',
          periodStart: dayStart,
          periodEnd: dayEnd,
          tokensUsed: tokens,
          costUsd: String(costUsd),
          requestCount: 1,
          costCenterId,
          projectId,
          modelUsage,
          agentUsage,
          avgResponseTimeMs: responseTimeMs,
          errorCount: isError ? 1 : 0,
          successRate: isError ? 0 : 100,
          tags: tags || [],
        });

      console.log('[BudgetService] Enterprise usage tracked:', {
        userId,
        tokens,
        costUsd,
        costCenterId,
        projectId,
        model,
        agentId,
      });
    } catch (error: any) {
      console.warn('[BudgetService] Failed to track enterprise usage:', error.message);
    }
  }

  /**
   * Check and reset daily/monthly usage if needed
   */
  private async checkAndResetUsage(budget: typeof userBudgets.$inferSelect) {
    const now = new Date();
    let needsUpdate = false;
    const updates: any = {};

    // Check monthly reset (reset on 1st of month)
    const monthResetDate = new Date(budget.monthResetAt);
    if (now.getMonth() !== monthResetDate.getMonth() || now.getFullYear() !== monthResetDate.getFullYear()) {
      // Archive current month's usage
      await this.archiveUsage(budget, 'month');

      updates.currentMonthTokens = 0;
      updates.currentMonthCostUsd = '0.000000';
      updates.monthResetAt = new Date(now.getFullYear(), now.getMonth(), 1);
      needsUpdate = true;
    }

    // Check daily reset (reset at midnight)
    const dayResetDate = new Date(budget.dayResetAt);
    const daysDiff = Math.floor((now.getTime() - dayResetDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff >= 1) {
      // Archive current day's usage
      await this.archiveUsage(budget, 'day');

      updates.currentDayTokens = 0;
      updates.currentDayCostUsd = '0.000000';
      updates.dayResetAt = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      needsUpdate = true;
    }

    if (needsUpdate) {
      await this.db
        .update(userBudgets)
        .set(updates)
        .where(eq(userBudgets.userId, budget.userId));
    }
  }

  /**
   * Archive usage to history table
   */
  private async archiveUsage(budget: typeof userBudgets.$inferSelect, period: 'day' | 'month') {
    const now = new Date();

    if (period === 'month') {
      const monthStart = new Date(budget.monthResetAt);
      const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      await this.db.insert(budgetUsageHistory).values({
        userId: budget.userId,
        period: 'month',
        periodStart: monthStart,
        periodEnd: monthEnd,
        tokensUsed: budget.currentMonthTokens || 0,
        costUsd: String(budget.currentMonthCostUsd || 0),
        requestCount: 0, // TODO: Track request count
        tokenLimit: budget.monthlyTokenLimit,
        costLimit: budget.monthlyCostLimitUsd,
        exceededLimit:
          (budget.currentMonthTokens || 0) > (budget.monthlyTokenLimit || Infinity),
      });
    } else {
      const dayStart = new Date(budget.dayResetAt);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      await this.db.insert(budgetUsageHistory).values({
        userId: budget.userId,
        period: 'day',
        periodStart: dayStart,
        periodEnd: dayEnd,
        tokensUsed: budget.currentDayTokens || 0,
        costUsd: String(budget.currentDayCostUsd || 0),
        requestCount: 0, // TODO: Track request count
        tokenLimit: budget.dailyTokenLimit,
        costLimit: budget.dailyCostLimitUsd,
        exceededLimit:
          (budget.currentDayTokens || 0) > (budget.dailyTokenLimit || Infinity),
      });
    }
  }

  /**
   * Check if threshold alerts should be sent
   */
  private async checkThresholdAlerts(budget: typeof userBudgets.$inferSelect) {
    if (!budget.notifyOnThreshold) return;

    const threshold = budget.notifyThresholdPercent || 80;
    const percentages = this.calculatePercentages(budget);

    // Check monthly token threshold
    if (percentages.monthlyTokens >= threshold && percentages.monthlyTokens < 100) {
      await this.createAlertInternal(budget.userId, 'threshold', 'warning', {
        message: `You've used ${percentages.monthlyTokens.toFixed(0)}% of your monthly token limit.`,
        currentUsage: { tokens: budget.currentMonthTokens, percentage: percentages.monthlyTokens },
        limit: { tokens: budget.monthlyTokenLimit },
      });
    }

    // Check monthly cost threshold
    if (percentages.monthlyCost >= threshold && percentages.monthlyCost < 100) {
      await this.createAlertInternal(budget.userId, 'threshold', 'warning', {
        message: `You've used ${percentages.monthlyCost.toFixed(0)}% of your monthly cost limit ($${budget.currentMonthCostUsd}).`,
        currentUsage: { costUsd: parseFloat(String(budget.currentMonthCostUsd)), percentage: percentages.monthlyCost },
        limit: { costUsd: parseFloat(String(budget.monthlyCostLimitUsd)) },
      });
    }

    // Check if limit exceeded
    if (percentages.monthlyTokens >= 100) {
      await this.createAlertInternal(budget.userId, 'limit_exceeded', 'critical', {
        message: 'Monthly token limit exceeded. Your requests may be throttled.',
        currentUsage: { tokens: budget.currentMonthTokens, percentage: 100 },
        limit: { tokens: budget.monthlyTokenLimit },
      });
    }
  }

  /**
   * Create a budget alert (public API for external services)
   */
  async createAlert(
    userId: string,
    options: {
      alertType: string;
      severity: string;
      message: string;
      currentUsage: number;
      limit: number;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    await this.createAlertInternal(userId, options.alertType, options.severity, {
      message: options.message,
      currentUsage: options.currentUsage,
      limit: options.limit,
    });
  }

  /**
   * Create a budget alert (internal)
   */
  private async createAlertInternal(
    userId: string,
    alertType: string,
    severity: string,
    data: { message: string; currentUsage: any; limit: any }
  ) {
    // Check if similar alert exists in last 24 hours (avoid spam)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const existingAlerts = await this.db
      .select()
      .from(budgetAlerts)
      .where(
        and(
          eq(budgetAlerts.userId, userId),
          eq(budgetAlerts.alertType, alertType),
          gte(budgetAlerts.createdAt, yesterday)
        )
      )
      .limit(1);

    if (existingAlerts.length > 0) return; // Don't spam

    await this.db.insert(budgetAlerts).values({
      userId,
      alertType,
      severity,
      message: data.message,
      currentUsage: data.currentUsage,
      limit: data.limit,
    });
  }

  /**
   * Get unread alerts for user
   */
  async getUnreadAlerts(userId: string) {
    return await this.db
      .select()
      .from(budgetAlerts)
      .where(and(eq(budgetAlerts.userId, userId), eq(budgetAlerts.isRead, false)))
      .orderBy(desc(budgetAlerts.createdAt))
      .limit(10);
  }

  /**
   * Mark alert as read
   */
  async markAlertAsRead(alertId: string) {
    await this.db
      .update(budgetAlerts)
      .set({ isRead: true })
      .where(eq(budgetAlerts.id, alertId));
  }

  /**
   * Check cost-based alerts after AI usage
   * Called by CostTrackingService after each request
   */
  async checkCostAlerts(userId: string, costUsd: number) {
    try {
      const budget = await this.getUserBudget(userId);

      // Skip if using default budget (table doesn't exist)
      if (budget.id === 'default') return;

      if (!budget.notifyOnThreshold) return;

    const threshold = budget.notifyThresholdPercent || 80;
    const percentages = this.calculatePercentages(budget);

    // Daily cost threshold alert
    if (percentages.dailyCost >= threshold && percentages.dailyCost < 100) {
      await this.createAlertInternal(budget.userId, 'daily_cost_threshold', 'warning', {
        message: `You've used ${percentages.dailyCost.toFixed(0)}% of your daily cost limit ($${budget.currentDayCostUsd} of $${budget.dailyCostLimitUsd}).`,
        currentUsage: { costUsd: parseFloat(String(budget.currentDayCostUsd)), percentage: percentages.dailyCost },
        limit: { costUsd: parseFloat(String(budget.dailyCostLimitUsd)) },
      });
    }

    // Daily cost limit exceeded
    if (percentages.dailyCost >= 100) {
      await this.createAlertInternal(budget.userId, 'daily_cost_exceeded', 'critical', {
        message: `Daily cost limit exceeded! You've spent $${budget.currentDayCostUsd} (limit: $${budget.dailyCostLimitUsd}).`,
        currentUsage: { costUsd: parseFloat(String(budget.currentDayCostUsd)), percentage: 100 },
        limit: { costUsd: parseFloat(String(budget.dailyCostLimitUsd)) },
      });
    }

    // Monthly cost approaching limit
    if (percentages.monthlyCost >= threshold && percentages.monthlyCost < 100) {
      await this.createAlertInternal(budget.userId, 'monthly_cost_threshold', 'warning', {
        message: `You've used ${percentages.monthlyCost.toFixed(0)}% of your monthly cost limit ($${budget.currentMonthCostUsd} of $${budget.monthlyCostLimitUsd}).`,
        currentUsage: { costUsd: parseFloat(String(budget.currentMonthCostUsd)), percentage: percentages.monthlyCost },
        limit: { costUsd: parseFloat(String(budget.monthlyCostLimitUsd)) },
      });
    }

    // Monthly cost limit exceeded
    if (percentages.monthlyCost >= 100) {
      await this.createAlertInternal(budget.userId, 'monthly_cost_exceeded', 'critical', {
        message: `Monthly cost limit exceeded! You've spent $${budget.currentMonthCostUsd} (limit: $${budget.monthlyCostLimitUsd}).`,
        currentUsage: { costUsd: parseFloat(String(budget.currentMonthCostUsd)), percentage: 100 },
        limit: { costUsd: parseFloat(String(budget.monthlyCostLimitUsd)) },
      });
    }

    // High single-request cost warning (>$1)
    if (costUsd > 1.0) {
      await this.createAlertInternal(budget.userId, 'high_cost_request', 'warning', {
        message: `High-cost request detected: $${costUsd.toFixed(4)}. Consider using a cheaper model for similar tasks.`,
        currentUsage: { costUsd },
        limit: { costUsd: 1.0 },
      });
    }
    } catch (error: any) {
      console.warn('[BudgetService] Failed to check cost alerts:', error.message);
    }
  }

  /**
   * Get all alerts for user (read and unread)
   */
  async getAllAlerts(userId: string, limit: number = 50) {
    return await this.db
      .select()
      .from(budgetAlerts)
      .where(eq(budgetAlerts.userId, userId))
      .orderBy(desc(budgetAlerts.createdAt))
      .limit(limit);
  }

  /**
   * Mark all alerts as read for user
   */
  async markAllAlertsAsRead(userId: string) {
    await this.db
      .update(budgetAlerts)
      .set({ isRead: true })
      .where(and(eq(budgetAlerts.userId, userId), eq(budgetAlerts.isRead, false)));
  }

  /**
   * Delete old alerts (older than 30 days)
   */
  async cleanupOldAlerts() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await this.db
      .delete(budgetAlerts)
      .where(lte(budgetAlerts.createdAt, thirtyDaysAgo));
  }

  /**
   * Helper methods
   */
  private getCurrentUsage(budget: typeof userBudgets.$inferSelect) {
    return {
      monthlyTokens: budget.currentMonthTokens || 0,
      monthlyCostUsd: parseFloat(String(budget.currentMonthCostUsd || 0)),
      dailyTokens: budget.currentDayTokens || 0,
      dailyCostUsd: parseFloat(String(budget.currentDayCostUsd || 0)),
    };
  }

  private getLimits(budget: typeof userBudgets.$inferSelect) {
    return {
      monthlyTokens: budget.monthlyTokenLimit || 0,
      monthlyCostUsd: parseFloat(String(budget.monthlyCostLimitUsd || 0)),
      dailyTokens: budget.dailyTokenLimit || 0,
      dailyCostUsd: parseFloat(String(budget.dailyCostLimitUsd || 0)),
    };
  }

  private calculatePercentages(budget: typeof userBudgets.$inferSelect) {
    return {
      monthlyTokens: budget.monthlyTokenLimit
        ? ((budget.currentMonthTokens || 0) / budget.monthlyTokenLimit) * 100
        : 0,
      monthlyCost: budget.monthlyCostLimitUsd
        ? (parseFloat(String(budget.currentMonthCostUsd || 0)) /
            parseFloat(String(budget.monthlyCostLimitUsd))) *
          100
        : 0,
      dailyTokens: budget.dailyTokenLimit
        ? ((budget.currentDayTokens || 0) / budget.dailyTokenLimit) * 100
        : 0,
      dailyCost: budget.dailyCostLimitUsd
        ? (parseFloat(String(budget.currentDayCostUsd || 0)) /
            parseFloat(String(budget.dailyCostLimitUsd))) *
          100
        : 0,
    };
  }

  /**
   * Get rate limit configuration for user
   */
  async getRateLimitConfig(userId: string) {
    const budget = await this.getUserBudget(userId);

    return {
      maxRequestsPerMinute: budget.maxRequestsPerMinute || 5,
      maxRequestsPerHour: budget.maxRequestsPerHour || 50,
      maxRequestsPerDay: budget.maxRequestsPerDay || 200,
    };
  }

  /**
   * Get user's model preferences
   */
  async getModelPreferences(userId: string) {
    const budget = await this.getUserBudget(userId);

    return {
      preferredModel: budget.preferredModel || 'gpt-4o-mini',
      allowedModels: (budget.allowedModels as string[]) || ['gpt-4o-mini', 'gpt-3.5-turbo'],
      autoCostOptimization: budget.autoCostOptimization || false,
    };
  }

  /**
   * Update user's preferred model
   */
  async setPreferredModel(userId: string, modelId: string) {
    const budget = await this.getUserBudget(userId);
    const allowedModels = (budget.allowedModels as string[]) || [];

    // Verify model is allowed
    if (!allowedModels.includes(modelId)) {
      throw new Error(`Model ${modelId} is not allowed for this user's tier`);
    }

    await this.db
      .update(userBudgets)
      .set({
        preferredModel: modelId,
        updatedAt: new Date(),
      })
      .where(eq(userBudgets.userId, userId));

    return { preferredModel: modelId };
  }

  /**
   * Toggle auto cost optimization
   */
  async setAutoCostOptimization(userId: string, enabled: boolean) {
    await this.db
      .update(userBudgets)
      .set({
        autoCostOptimization: enabled,
        updatedAt: new Date(),
      })
      .where(eq(userBudgets.userId, userId));

    return { autoCostOptimization: enabled };
  }

  /**
   * Update user budget preferences (auto-reload, etc.)
   */
  async updateBudgetPreferences(
    userId: string,
    preferences: {
      autoReload?: {
        enabled: boolean;
        threshold: number;
        packageId?: number;
      };
    }
  ) {
    const budget = await this.getUserBudget(userId);
    const metadata = (budget.metadata as Record<string, any>) || {};

    const updatedMetadata = {
      ...metadata,
      autoReload: preferences.autoReload
        ? { ...metadata.autoReload, ...preferences.autoReload }
        : metadata.autoReload,
    };

    await this.db
      .update(userBudgets)
      .set({
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(userBudgets.userId, userId));

    return await this.getUserBudget(userId);
  }

  /**
   * Update user budget limits (admin only)
   */
  async updateBudgetLimits(
    userId: string,
    limits: {
      monthlyTokenLimit?: number;
      monthlyCostLimitUsd?: number;
      dailyTokenLimit?: number;
      dailyCostLimitUsd?: number;
      maxTokensPerRequest?: number;
      maxRequestsPerMinute?: number;
      maxRequestsPerHour?: number;
      maxRequestsPerDay?: number;
    }
  ) {
    await this.db
      .update(userBudgets)
      .set({
        ...limits,
        updatedAt: new Date(),
      })
      .where(eq(userBudgets.userId, userId));

    return await this.getUserBudget(userId);
  }

  // =====================================================
  // ENTERPRISE METHODS (Phase 2)
  // =====================================================

  /**
   * Calculate forecast using linear regression
   * Uses the last 30 days of usage data to predict future costs/tokens
   *
   * @param userId - User ID
   * @param costCenterId - Optional cost center filter
   * @param projectId - Optional project filter
   * @returns ForecastSummary with predictions
   */
  async calculateForecast(
    userId: string,
    costCenterId?: string,
    projectId?: string
  ): Promise<ForecastSummary> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Build query conditions
      const conditions = [
        eq(budgetUsageHistory.userId, userId),
        gte(budgetUsageHistory.periodStart, thirtyDaysAgo),
      ];

      if (costCenterId) {
        conditions.push(eq(budgetUsageHistory.costCenterId, costCenterId));
      }
      if (projectId) {
        conditions.push(eq(budgetUsageHistory.projectId, projectId));
      }

      // Fetch usage history
      const history = await this.db
        .select()
        .from(budgetUsageHistory)
        .where(and(...conditions))
        .orderBy(asc(budgetUsageHistory.periodStart));

      // Need at least 3 data points for meaningful regression
      if (history.length < 3) {
        return {
          currentMonthSpend: 0,
          projectedMonthEnd: 0,
          projectedOverage: 0,
          runOutDate: null,
          confidenceScore: 0,
          trend: 'stable',
          recommendation: 'Not enough data for forecast. Need at least 3 days of usage history.',
        };
      }

      // Prepare data for linear regression
      // X = day index (0, 1, 2, ...), Y = daily cost
      const dataPoints: { x: number; y: number; tokens: number }[] = [];
      const startDate = new Date(history[0].periodStart);

      for (const record of history) {
        const recordDate = new Date(record.periodStart);
        const dayIndex = Math.floor(
          (recordDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        dataPoints.push({
          x: dayIndex,
          y: parseFloat(String(record.costUsd || 0)),
          tokens: record.tokensUsed || 0,
        });
      }

      // Perform linear regression
      const regression = this.linearRegression(dataPoints.map(p => ({ x: p.x, y: p.y })));

      // Calculate current month spend
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthSpend = history
        .filter(h => new Date(h.periodStart) >= monthStart)
        .reduce((sum, h) => sum + parseFloat(String(h.costUsd || 0)), 0);

      // Calculate days remaining in month
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysElapsed = now.getDate();
      const daysRemaining = daysInMonth - daysElapsed;

      // Project end of month cost
      const dailyAvgCost = dataPoints.reduce((sum, p) => sum + p.y, 0) / dataPoints.length;
      const projectedMonthEnd = currentMonthSpend + dailyAvgCost * daysRemaining;

      // Get user's budget limit
      const budget = await this.getUserBudget(userId);
      const monthlyLimit = parseFloat(String(budget.monthlyCostLimitUsd || 0));
      const projectedOverage = Math.max(0, projectedMonthEnd - monthlyLimit);

      // Calculate run-out date (when budget will be exhausted)
      let runOutDate: Date | null = null;
      if (dailyAvgCost > 0 && monthlyLimit > 0) {
        const remainingBudget = monthlyLimit - currentMonthSpend;
        if (remainingBudget > 0) {
          const daysUntilRunOut = Math.floor(remainingBudget / dailyAvgCost);
          runOutDate = new Date();
          runOutDate.setDate(runOutDate.getDate() + daysUntilRunOut);
        } else {
          runOutDate = new Date(); // Already exceeded
        }
      }

      // Determine trend based on regression slope
      let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
      const slopeThreshold = 0.01; // 1 cent/day change
      if (regression.slope > slopeThreshold) {
        trend = 'increasing';
      } else if (regression.slope < -slopeThreshold) {
        trend = 'decreasing';
      }

      // Calculate confidence score (based on R²)
      const confidenceScore = Math.round(regression.r2 * 100);

      // Generate recommendation
      let recommendation = '';
      if (projectedOverage > 0) {
        recommendation = `Warning: Projected to exceed budget by $${projectedOverage.toFixed(2)}. Consider reducing usage or upgrading plan.`;
      } else if (trend === 'increasing' && confidenceScore > 50) {
        recommendation = 'Usage is trending upward. Monitor closely to avoid exceeding limits.';
      } else if (trend === 'decreasing') {
        recommendation = 'Good news! Usage is trending downward. You are well within budget.';
      } else {
        recommendation = 'Usage is stable. Continue monitoring for any changes.';
      }

      // Cache the forecast result
      await this.cacheForecast(userId, {
        costCenterId,
        projectId,
        currentMonthSpend,
        projectedMonthEnd,
        projectedOverage,
        runOutDate,
        confidenceScore,
        trend,
        dailyAvgCost,
        dailyAvgTokens: Math.round(dataPoints.reduce((sum, p) => sum + p.tokens, 0) / dataPoints.length),
        regression,
      });

      return {
        currentMonthSpend,
        projectedMonthEnd,
        projectedOverage,
        runOutDate,
        confidenceScore,
        trend,
        recommendation,
      };
    } catch (error: any) {
      console.error('[BudgetService] Forecast calculation failed:', error.message);
      return {
        currentMonthSpend: 0,
        projectedMonthEnd: 0,
        projectedOverage: 0,
        runOutDate: null,
        confidenceScore: 0,
        trend: 'stable',
        recommendation: 'Unable to calculate forecast. Please try again later.',
      };
    }
  }

  /**
   * Linear regression calculation
   * Returns slope, intercept, R², and MSE
   */
  private linearRegression(data: { x: number; y: number }[]): RegressionResult {
    const n = data.length;
    if (n === 0) {
      return { slope: 0, intercept: 0, r2: 0, mse: 0 };
    }

    // Calculate means
    const sumX = data.reduce((sum, p) => sum + p.x, 0);
    const sumY = data.reduce((sum, p) => sum + p.y, 0);
    const meanX = sumX / n;
    const meanY = sumY / n;

    // Calculate slope and intercept
    let numerator = 0;
    let denominator = 0;

    for (const point of data) {
      numerator += (point.x - meanX) * (point.y - meanY);
      denominator += (point.x - meanX) ** 2;
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = meanY - slope * meanX;

    // Calculate R² and MSE
    let ssRes = 0; // Sum of squared residuals
    let ssTot = 0; // Total sum of squares
    let mse = 0;

    for (const point of data) {
      const predicted = slope * point.x + intercept;
      const residual = point.y - predicted;
      ssRes += residual ** 2;
      ssTot += (point.y - meanY) ** 2;
      mse += residual ** 2;
    }

    const r2 = ssTot !== 0 ? 1 - ssRes / ssTot : 0;
    mse = mse / n;

    return { slope, intercept, r2: Math.max(0, Math.min(1, r2)), mse };
  }

  /**
   * Cache forecast result in database
   */
  private async cacheForecast(
    userId: string,
    data: {
      costCenterId?: string;
      projectId?: string;
      currentMonthSpend: number;
      projectedMonthEnd: number;
      projectedOverage: number;
      runOutDate: Date | null;
      confidenceScore: number;
      trend: 'increasing' | 'stable' | 'decreasing';
      dailyAvgCost: number;
      dailyAvgTokens: number;
      regression: RegressionResult;
    }
  ) {
    try {
      const now = new Date();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 6); // Cache for 6 hours

      await this.db.insert(budgetForecasts).values({
        userId,
        costCenterId: data.costCenterId,
        projectId: data.projectId,
        forecastPeriod: 'monthly',
        periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
        periodEnd: monthEnd,
        predictedTokens: Math.round(data.dailyAvgTokens * 30),
        predictedCostUsd: String(data.projectedMonthEnd.toFixed(4)),
        predictedRequests: null,
        estimatedRunOutDate: data.runOutDate,
        estimatedEomCostUsd: String(data.projectedMonthEnd.toFixed(4)),
        estimatedEomTokens: Math.round(data.dailyAvgTokens * 30),
        dailyAvgTokens: data.dailyAvgTokens,
        dailyAvgCostUsd: String(data.dailyAvgCost.toFixed(4)),
        weeklyGrowthRate: null, // TODO: Calculate from multiple weeks
        monthlyGrowthRate: null,
        confidenceScore: data.confidenceScore,
        dataPointsUsed: 30,
        algorithm: 'linear_regression',
        modelParams: {
          slope: data.regression.slope,
          intercept: data.regression.intercept,
          r2: data.regression.r2,
          mse: data.regression.mse,
        },
        anomalyDetected: false,
        anomalyDetails: null,
        isStale: false,
        calculatedAt: now,
        expiresAt,
      });

      // Also update the cached forecast in user_budgets for quick dashboard access
      await this.db
        .update(userBudgets)
        .set({
          forecastData: {
            estimatedRunOutDate: data.runOutDate?.toISOString(),
            projectedEomCostUsd: data.projectedMonthEnd,
            projectedEomTokens: Math.round(data.dailyAvgTokens * 30),
            dailyAvgTokens: data.dailyAvgTokens,
            dailyAvgCostUsd: data.dailyAvgCost,
            trend: data.trend,
            confidenceScore: data.confidenceScore,
            calculatedAt: now.toISOString(),
          },
          updatedAt: now,
        })
        .where(eq(userBudgets.userId, userId));
    } catch (error: any) {
      console.warn('[BudgetService] Failed to cache forecast:', error.message);
    }
  }

  /**
   * Log an audit action for enterprise compliance
   *
   * @param action - The action being performed (e.g., "budget.limit.updated")
   * @param category - Action category for filtering
   * @param resourceType - Type of resource (e.g., "budget", "project")
   * @param resourceId - ID of the resource
   * @param context - User and request context
   * @param details - Change details
   */
  async logAuditAction(
    action: string,
    category: 'budget_change' | 'limit_update' | 'top_up' | 'allocation' | 'project_change' | 'cost_center_change' | 'user_action' | 'system_action' | 'security',
    resourceType: string,
    resourceId: string,
    context: AuditContext,
    details: {
      severity?: 'info' | 'warning' | 'critical' | 'security';
      resourceName?: string;
      previousValue?: Record<string, any>;
      newValue?: Record<string, any>;
      changeDescription?: string;
      metadata?: Record<string, any>;
    } = {}
  ) {
    try {
      // Calculate retention expiry (7 years for financial compliance)
      const retentionExpiresAt = new Date();
      retentionExpiresAt.setFullYear(retentionExpiresAt.getFullYear() + 7);

      await this.db.insert(enterpriseAuditLogs).values({
        userId: context.userId,
        userEmail: context.userEmail,
        userRole: context.userRole,
        action,
        actionCategory: category,
        severity: details.severity || 'info',
        resourceType,
        resourceId,
        resourceName: details.resourceName,
        previousValue: details.previousValue,
        newValue: details.newValue,
        changeDescription: details.changeDescription,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
        requestId: context.requestId,
        metadata: details.metadata || {},
        retentionExpiresAt,
      });

      console.log('[BudgetService] Audit log created:', {
        action,
        category,
        resourceType,
        resourceId,
        userId: context.userId,
      });
    } catch (error: any) {
      console.error('[BudgetService] Failed to log audit action:', error.message);
    }
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filters: {
    userId?: string;
    action?: string;
    actionCategory?: string;
    resourceType?: string;
    resourceId?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    try {
      const conditions: any[] = [];

      if (filters.userId) {
        conditions.push(eq(enterpriseAuditLogs.userId, filters.userId));
      }
      if (filters.action) {
        conditions.push(eq(enterpriseAuditLogs.action, filters.action));
      }
      if (filters.resourceType) {
        conditions.push(eq(enterpriseAuditLogs.resourceType, filters.resourceType));
      }
      if (filters.resourceId) {
        conditions.push(eq(enterpriseAuditLogs.resourceId, filters.resourceId));
      }
      if (filters.startDate) {
        conditions.push(gte(enterpriseAuditLogs.createdAt, filters.startDate));
      }
      if (filters.endDate) {
        conditions.push(lte(enterpriseAuditLogs.createdAt, filters.endDate));
      }

      const query = this.db
        .select()
        .from(enterpriseAuditLogs)
        .orderBy(desc(enterpriseAuditLogs.createdAt))
        .limit(filters.limit || 100)
        .offset(filters.offset || 0);

      if (conditions.length > 0) {
        return await query.where(and(...conditions));
      }

      return await query;
    } catch (error: any) {
      console.error('[BudgetService] Failed to get audit logs:', error.message);
      return [];
    }
  }

  // =====================================================
  // COST CENTER MANAGEMENT (Phase 2)
  // =====================================================

  /**
   * Get all cost centers for an organization
   */
  async getCostCenters(organizationId: string): Promise<CostCenter[]> {
    try {
      return await this.db
        .select()
        .from(costCenters)
        .where(eq(costCenters.organizationId, organizationId))
        .orderBy(asc(costCenters.name));
    } catch (error: any) {
      console.error('[BudgetService] Failed to get cost centers:', error.message);
      return [];
    }
  }

  /**
   * Create a new cost center
   */
  async createCostCenter(data: {
    organizationId: string;
    name: string;
    code: string;
    description?: string;
    parentCostCenterId?: string;
    managerId?: string;
    monthlyBudgetLimitUsd?: number;
    monthlyTokenLimit?: number;
    allowOverspend?: boolean;
    metadata?: Record<string, any>;
  }, auditContext?: AuditContext): Promise<CostCenter | null> {
    try {
      const [costCenter] = await this.db
        .insert(costCenters)
        .values({
          organizationId: data.organizationId,
          name: data.name,
          code: data.code,
          description: data.description,
          parentCostCenterId: data.parentCostCenterId,
          managerId: data.managerId,
          monthlyBudgetLimitUsd: data.monthlyBudgetLimitUsd ? String(data.monthlyBudgetLimitUsd) : undefined,
          monthlyTokenLimit: data.monthlyTokenLimit,
          allowOverspend: data.allowOverspend || false,
          metadata: data.metadata || {},
        })
        .returning();

      // Log audit action
      if (auditContext) {
        await this.logAuditAction(
          'cost_center.created',
          'cost_center_change',
          'cost_center',
          costCenter.id,
          auditContext,
          {
            resourceName: data.name,
            newValue: data,
            changeDescription: `Cost center "${data.name}" (${data.code}) created`,
          }
        );
      }

      return costCenter;
    } catch (error: any) {
      console.error('[BudgetService] Failed to create cost center:', error.message);
      return null;
    }
  }

  // =====================================================
  // PROJECT MANAGEMENT (Phase 2)
  // =====================================================

  /**
   * Get all projects, optionally filtered by cost center
   */
  async getProjects(costCenterId?: string): Promise<BudgetProject[]> {
    try {
      if (costCenterId) {
        return await this.db
          .select()
          .from(budgetProjects)
          .where(eq(budgetProjects.costCenterId, costCenterId))
          .orderBy(desc(budgetProjects.lastActivityAt));
      }

      return await this.db
        .select()
        .from(budgetProjects)
        .orderBy(desc(budgetProjects.lastActivityAt));
    } catch (error: any) {
      console.error('[BudgetService] Failed to get projects:', error.message);
      return [];
    }
  }

  /**
   * Create a new project
   */
  async createProject(data: {
    name: string;
    code: string;
    description?: string;
    ownerId: string;
    costCenterId?: string;
    allocatedBudgetUsd?: number;
    allocatedTokens?: number;
    startDate?: Date;
    endDate?: Date;
    dailyBudgetLimitUsd?: number;
    dailyTokenLimit?: number;
    allowedModels?: string[];
    allowedAgents?: string[];
    metadata?: Record<string, any>;
  }, auditContext?: AuditContext): Promise<BudgetProject | null> {
    try {
      const [project] = await this.db
        .insert(budgetProjects)
        .values({
          name: data.name,
          code: data.code,
          description: data.description,
          ownerId: data.ownerId,
          costCenterId: data.costCenterId,
          allocatedBudgetUsd: data.allocatedBudgetUsd ? String(data.allocatedBudgetUsd) : undefined,
          allocatedTokens: data.allocatedTokens,
          startDate: data.startDate,
          endDate: data.endDate,
          dailyBudgetLimitUsd: data.dailyBudgetLimitUsd ? String(data.dailyBudgetLimitUsd) : undefined,
          dailyTokenLimit: data.dailyTokenLimit,
          allowedModels: data.allowedModels || [],
          allowedAgents: data.allowedAgents || [],
          metadata: data.metadata || {},
          status: 'planning',
        })
        .returning();

      // Log audit action
      if (auditContext) {
        await this.logAuditAction(
          'project.created',
          'project_change',
          'project',
          project.id,
          auditContext,
          {
            resourceName: data.name,
            newValue: data,
            changeDescription: `Project "${data.name}" (${data.code}) created`,
          }
        );
      }

      return project;
    } catch (error: any) {
      console.error('[BudgetService] Failed to create project:', error.message);
      return null;
    }
  }

  /**
   * Detect anomalies in usage patterns
   * Compares recent usage against historical averages
   */
  async detectAnomalies(userId: string): Promise<AnomalyAlert[]> {
    try {
      const alerts: AnomalyAlert[] = [];
      const now = new Date();

      // Get last 7 days of usage
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get last 30 days for baseline
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentUsage = await this.db
        .select()
        .from(budgetUsageHistory)
        .where(
          and(
            eq(budgetUsageHistory.userId, userId),
            gte(budgetUsageHistory.periodStart, sevenDaysAgo)
          )
        );

      const baselineUsage = await this.db
        .select()
        .from(budgetUsageHistory)
        .where(
          and(
            eq(budgetUsageHistory.userId, userId),
            gte(budgetUsageHistory.periodStart, thirtyDaysAgo),
            lt(budgetUsageHistory.periodStart, sevenDaysAgo)
          )
        );

      if (baselineUsage.length < 7) {
        return []; // Not enough data for anomaly detection
      }

      // Calculate baseline averages
      const baselineAvgCost =
        baselineUsage.reduce((sum, u) => sum + parseFloat(String(u.costUsd || 0)), 0) /
        baselineUsage.length;
      const baselineAvgTokens =
        baselineUsage.reduce((sum, u) => sum + (u.tokensUsed || 0), 0) /
        baselineUsage.length;

      // Calculate standard deviation for threshold
      const costVariance =
        baselineUsage.reduce((sum, u) => {
          const diff = parseFloat(String(u.costUsd || 0)) - baselineAvgCost;
          return sum + diff * diff;
        }, 0) / baselineUsage.length;
      const costStdDev = Math.sqrt(costVariance);

      // Check each recent day for anomalies
      for (const usage of recentUsage) {
        const dailyCost = parseFloat(String(usage.costUsd || 0));
        const dailyTokens = usage.tokensUsed || 0;

        // Spike detection (> 2 standard deviations)
        if (dailyCost > baselineAvgCost + 2 * costStdDev) {
          const percentageDeviation = ((dailyCost - baselineAvgCost) / baselineAvgCost) * 100;

          alerts.push({
            id: `anomaly-${usage.id}`,
            type: 'spike',
            severity: percentageDeviation > 100 ? 'critical' : 'warning',
            message: `Unusual cost spike detected: $${dailyCost.toFixed(2)} (${percentageDeviation.toFixed(0)}% above average)`,
            metric: 'cost',
            expectedValue: baselineAvgCost,
            actualValue: dailyCost,
            percentageDeviation,
            detectedAt: now,
            resourceType: 'budget',
            resourceId: userId,
            resourceName: 'User Budget',
          });
        }

        // Drop detection (< 50% of average - might indicate issues)
        if (dailyCost < baselineAvgCost * 0.5 && baselineAvgCost > 0) {
          const percentageDeviation = ((baselineAvgCost - dailyCost) / baselineAvgCost) * 100;

          alerts.push({
            id: `anomaly-drop-${usage.id}`,
            type: 'drop',
            severity: 'info',
            message: `Significant usage drop detected: $${dailyCost.toFixed(2)} (${percentageDeviation.toFixed(0)}% below average)`,
            metric: 'cost',
            expectedValue: baselineAvgCost,
            actualValue: dailyCost,
            percentageDeviation: -percentageDeviation,
            detectedAt: now,
            resourceType: 'budget',
            resourceId: userId,
            resourceName: 'User Budget',
          });
        }
      }

      return alerts;
    } catch (error: any) {
      console.error('[BudgetService] Anomaly detection failed:', error.message);
      return [];
    }
  }

  // =====================================================
  // FINANCIAL INTELLIGENCE - AI Agent Integration
  // =====================================================

  /**
   * Get comprehensive financial health summary for AI agents
   * This aggregates all relevant KPIs into a single object
   *
   * @param userId - The user's ID
   * @returns Promise<FinancialHealthSummary>
   */
  async getFinancialHealthSummary(userId: string): Promise<FinancialHealthSummary> {
    try {
      // Fetch budget data
      const budget = await this.getUserBudget(userId);

      // Fetch forecast data
      let forecast: ForecastSummary | null = null;
      try {
        forecast = await this.calculateForecast(userId);
      } catch (error) {
        console.warn('[BudgetService] Forecast unavailable for health summary:', error);
      }

      // Fetch unread alerts
      let alerts: any[] = [];
      try {
        alerts = await this.getUnreadAlerts(userId);
      } catch (error) {
        console.warn('[BudgetService] Alerts unavailable for health summary:', error);
      }

      // Fetch anomalies
      let anomalies: AnomalyAlert[] = [];
      try {
        anomalies = await this.detectAnomalies(userId);
      } catch (error) {
        console.warn('[BudgetService] Anomalies unavailable for health summary:', error);
      }

      // Calculate key metrics
      const monthlyLimit = parseFloat(String(budget.monthlyCostLimitUsd || 0));
      const dailyLimit = parseFloat(String(budget.dailyCostLimitUsd || 0));
      const currentMonthSpend = parseFloat(String(budget.currentMonthCostUsd || 0));
      const currentDaySpend = parseFloat(String(budget.currentDayCostUsd || 0));

      const monthlyUtilization = monthlyLimit > 0
        ? (currentMonthSpend / monthlyLimit) * 100
        : 0;

      const dailyUtilization = dailyLimit > 0
        ? (currentDaySpend / dailyLimit) * 100
        : 0;

      const tokenUtilization = (budget.monthlyTokenLimit || 0) > 0
        ? ((budget.currentMonthTokens || 0) / (budget.monthlyTokenLimit || 1)) * 100
        : 0;

      // Calculate days remaining in month
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const daysRemaining = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate remaining budget
      const remainingMonthlyBudget = monthlyLimit - currentMonthSpend;
      const dailyBudgetForRemaining = daysRemaining > 0 ? remainingMonthlyBudget / daysRemaining : 0;

      // Determine health score (0-100)
      let healthScore = 100;

      // Deduct based on utilization
      if (monthlyUtilization > 100) {
        healthScore -= 40;
      } else if (monthlyUtilization > 90) {
        healthScore -= 25;
      } else if (monthlyUtilization > 80) {
        healthScore -= 15;
      } else if (monthlyUtilization > 70) {
        healthScore -= 10;
      }

      // Deduct based on forecast
      if (forecast && forecast.projectedOverage > 0) {
        healthScore -= 20;
      }
      if (forecast && forecast.trend === 'increasing') {
        healthScore -= 10;
      }

      // Deduct based on alerts and anomalies
      const highSeverityAlerts = alerts.filter(
        a => a.severity === 'high' || a.severity === 'critical'
      ).length;
      const criticalAnomalies = anomalies.filter(
        a => a.severity === 'critical'
      ).length;

      healthScore -= highSeverityAlerts * 10;
      healthScore -= criticalAnomalies * 15;
      healthScore -= (alerts.length - highSeverityAlerts) * 3;

      healthScore = Math.max(0, Math.min(100, healthScore));

      // Determine status label
      let status: 'excellent' | 'good' | 'fair' | 'warning' | 'critical';
      if (healthScore >= 90) status = 'excellent';
      else if (healthScore >= 75) status = 'good';
      else if (healthScore >= 50) status = 'fair';
      else if (healthScore >= 25) status = 'warning';
      else status = 'critical';

      // Generate recommendations
      const recommendations: string[] = [];

      if (monthlyUtilization > 90) {
        recommendations.push('Consider increasing monthly budget or reducing usage');
      }
      if (forecast && forecast.projectedOverage > 0) {
        recommendations.push(`Projected overage of $${forecast.projectedOverage.toFixed(2)} - reduce usage or increase limits`);
      }
      if (forecast && forecast.runOutDate) {
        const runOutDate = new Date(forecast.runOutDate);
        if (runOutDate < endOfMonth) {
          recommendations.push(`Budget expected to run out on ${runOutDate.toLocaleDateString()}`);
        }
      }
      if (dailyUtilization > 80) {
        recommendations.push('Daily limit nearly reached - pace your usage');
      }
      if (highSeverityAlerts > 0) {
        recommendations.push(`${highSeverityAlerts} high-priority alert(s) require attention`);
      }
      if (recommendations.length === 0) {
        recommendations.push('Budget usage is healthy - no action required');
      }

      return {
        userId,
        timestamp: new Date().toISOString(),
        healthScore,
        status,
        budget: {
          monthlyLimit,
          dailyLimit,
          currentMonthSpend,
          currentDaySpend,
          remainingMonthlyBudget,
          dailyBudgetForRemaining: Math.round(dailyBudgetForRemaining * 100) / 100,
          monthlyUtilization: Math.round(monthlyUtilization * 100) / 100,
          dailyUtilization: Math.round(dailyUtilization * 100) / 100,
          daysRemaining,
          isActive: budget.isActive !== false,
        },
        tokens: {
          monthlyLimit: budget.monthlyTokenLimit || 0,
          currentUsage: budget.currentMonthTokens || 0,
          utilization: Math.round(tokenUtilization * 100) / 100,
        },
        forecast: forecast ? {
          projectedMonthEnd: forecast.projectedMonthEnd,
          projectedOverage: forecast.projectedOverage,
          runOutDate: forecast.runOutDate?.toISOString() || null,
          trend: forecast.trend,
          confidenceScore: forecast.confidenceScore,
        } : null,
        alerts: {
          total: alerts.length,
          highSeverity: highSeverityAlerts,
          unread: alerts.length,
          latest: alerts.slice(0, 3).map(a => ({
            type: a.alertType,
            severity: a.severity,
            message: a.message,
          })),
        },
        anomalies: {
          total: anomalies.length,
          critical: criticalAnomalies,
          latest: anomalies.slice(0, 3).map(a => ({
            type: a.type,
            severity: a.severity,
            message: a.message,
          })),
        },
        recommendations,
      };
    } catch (error: any) {
      console.error('[BudgetService] Failed to get financial health summary:', error.message);

      // Return minimal fallback summary
      return {
        userId,
        timestamp: new Date().toISOString(),
        healthScore: 50,
        status: 'fair',
        budget: {
          monthlyLimit: 50,
          dailyLimit: 10,
          currentMonthSpend: 0,
          currentDaySpend: 0,
          remainingMonthlyBudget: 50,
          dailyBudgetForRemaining: 10,
          monthlyUtilization: 0,
          dailyUtilization: 0,
          daysRemaining: 30,
          isActive: true,
        },
        tokens: {
          monthlyLimit: 100000,
          currentUsage: 0,
          utilization: 0,
        },
        forecast: null,
        alerts: {
          total: 0,
          highSeverity: 0,
          unread: 0,
          latest: [],
        },
        anomalies: {
          total: 0,
          critical: 0,
          latest: [],
        },
        recommendations: ['Unable to fetch complete data - using fallback values'],
      };
    }
  }

  // =====================================================
  // RECHARTS DATA TRANSFORMATION (Phase 4)
  // =====================================================

  /**
   * Get forecast data formatted for Recharts visualization
   * Returns actual usage + projected future data with seamless transition
   *
   * @param userId - User ID
   * @param daysBack - Number of historical days to include (default: 30)
   * @param daysForward - Number of future days to project (default: 15)
   * @returns Array of ForecastChartDataPoint for Recharts
   */
  async getForecastChartData(
    userId: string,
    daysBack: number = 30,
    daysForward: number = 15
  ): Promise<ForecastChartDataPoint[]> {
    try {
      const now = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Fetch historical usage data
      const history = await this.db
        .select()
        .from(budgetUsageHistory)
        .where(
          and(
            eq(budgetUsageHistory.userId, userId),
            gte(budgetUsageHistory.periodStart, startDate),
            lte(budgetUsageHistory.periodStart, now)
          )
        )
        .orderBy(asc(budgetUsageHistory.periodStart));

      // Create data points map for actual data
      const dataMap = new Map<string, ForecastChartDataPoint>();

      // Initialize all dates with nulls
      for (let d = new Date(startDate); d <= new Date(now.getTime() + daysForward * 24 * 60 * 60 * 1000); d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        dataMap.set(dateKey, {
          date: dateKey,
          actual: null,
          projected: null,
          tokens: null,
          projectedTokens: null,
          limit: null,
          isToday: dateKey === now.toISOString().split('T')[0],
          isFuture: d > now,
        });
      }

      // Populate actual data from history
      let cumulativeCost = 0;
      let cumulativeTokens = 0;

      for (const record of history) {
        const dateKey = new Date(record.periodStart).toISOString().split('T')[0];
        const dailyCost = parseFloat(String(record.costUsd || 0));
        const dailyTokens = record.tokensUsed || 0;

        cumulativeCost += dailyCost;
        cumulativeTokens += dailyTokens;

        if (dataMap.has(dateKey)) {
          const point = dataMap.get(dateKey)!;
          point.actual = Math.round(cumulativeCost * 100) / 100;
          point.tokens = cumulativeTokens;
        }
      }

      // Calculate regression for projection
      const dataPoints: { x: number; y: number; tokens: number }[] = [];
      const firstHistoryDate = history.length > 0 ? new Date(history[0].periodStart) : startDate;

      for (const record of history) {
        const recordDate = new Date(record.periodStart);
        const dayIndex = Math.floor(
          (recordDate.getTime() - firstHistoryDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        dataPoints.push({
          x: dayIndex,
          y: parseFloat(String(record.costUsd || 0)),
          tokens: record.tokensUsed || 0,
        });
      }

      // Perform linear regression
      const regression = this.linearRegression(dataPoints.map(p => ({ x: p.x, y: p.y })));
      const tokenRegression = this.linearRegression(dataPoints.map(p => ({ x: p.x, y: p.tokens })));

      // Get user's budget limit
      const budget = await this.getUserBudget(userId);
      const monthlyLimit = parseFloat(String(budget.monthlyCostLimitUsd || 0));

      // Calculate today's index for projection starting point
      const todayIndex = Math.floor(
        (now.getTime() - firstHistoryDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Project future values (starting from today)
      let projectedCumulativeCost = cumulativeCost;
      let projectedCumulativeTokens = cumulativeTokens;

      for (let i = 0; i <= daysForward; i++) {
        const futureDate = new Date(now);
        futureDate.setDate(futureDate.getDate() + i);
        const dateKey = futureDate.toISOString().split('T')[0];

        if (dataMap.has(dateKey)) {
          const point = dataMap.get(dateKey)!;
          const dayIndex = todayIndex + i;

          // Calculate daily projected value using regression
          const predictedDailyCost = Math.max(0, regression.slope * dayIndex + regression.intercept);
          const predictedDailyTokens = Math.max(0, tokenRegression.slope * dayIndex + tokenRegression.intercept);

          projectedCumulativeCost += predictedDailyCost;
          projectedCumulativeTokens += predictedDailyTokens;

          point.projected = Math.round(projectedCumulativeCost * 100) / 100;
          point.projectedTokens = Math.round(projectedCumulativeTokens);
          point.limit = monthlyLimit;

          // On today, set projected to match actual for seamless transition
          if (i === 0) {
            point.projected = point.actual;
            point.projectedTokens = point.tokens;
          }
        }
      }

      // Convert map to sorted array
      const result = Array.from(dataMap.values()).sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      return result;
    } catch (error: any) {
      console.error('[BudgetService] getForecastChartData failed:', error.message);
      return [];
    }
  }

  /**
   * Get spending breakdown by model for pie chart
   */
  async getSpendingByModel(userId: string, days: number = 30): Promise<ModelSpendingData[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const history = await this.db
        .select()
        .from(budgetUsageHistory)
        .where(
          and(
            eq(budgetUsageHistory.userId, userId),
            gte(budgetUsageHistory.periodStart, startDate)
          )
        );

      // Aggregate by model
      const modelMap = new Map<string, { cost: number; tokens: number; requests: number }>();

      for (const record of history) {
        const modelUsage = record.modelUsage as Record<string, { tokens: number; cost: number; requests: number }> | null;
        if (modelUsage) {
          for (const [model, usage] of Object.entries(modelUsage)) {
            const existing = modelMap.get(model) || { cost: 0, tokens: 0, requests: 0 };
            existing.cost += usage.cost || 0;
            existing.tokens += usage.tokens || 0;
            existing.requests += usage.requests || 0;
            modelMap.set(model, existing);
          }
        }
      }

      // Convert to array with colors
      const modelColors: Record<string, string> = {
        'gpt-4o': '#8B5CF6',
        'gpt-4o-mini': '#3B82F6',
        'gpt-4-turbo': '#EC4899',
        'gpt-3.5-turbo': '#10B981',
        'claude-3-opus': '#F59E0B',
        'claude-3-sonnet': '#6366F1',
        'other': '#6B7280',
      };

      return Array.from(modelMap.entries()).map(([model, data]) => ({
        model,
        cost: Math.round(data.cost * 100) / 100,
        tokens: data.tokens,
        requests: data.requests,
        color: modelColors[model] || modelColors['other'],
        percentage: 0, // Will be calculated by frontend
      }));
    } catch (error: any) {
      console.error('[BudgetService] getSpendingByModel failed:', error.message);
      return [];
    }
  }

  /**
   * Get spending breakdown by agent for bar chart
   */
  async getSpendingByAgent(userId: string, days: number = 30): Promise<AgentSpendingData[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const history = await this.db
        .select()
        .from(budgetUsageHistory)
        .where(
          and(
            eq(budgetUsageHistory.userId, userId),
            gte(budgetUsageHistory.periodStart, startDate)
          )
        );

      // Aggregate by agent
      const agentMap = new Map<string, { cost: number; tokens: number; requests: number }>();

      for (const record of history) {
        const agentUsage = record.agentUsage as Record<string, { tokens: number; cost: number; requests: number }> | null;
        if (agentUsage) {
          for (const [agent, usage] of Object.entries(agentUsage)) {
            const existing = agentMap.get(agent) || { cost: 0, tokens: 0, requests: 0 };
            existing.cost += usage.cost || 0;
            existing.tokens += usage.tokens || 0;
            existing.requests += usage.requests || 0;
            agentMap.set(agent, existing);
          }
        }
      }

      // Convert to array with colors
      const agentColors: Record<string, string> = {
        'dexter': '#3B82F6',
        'cassie': '#10B981',
        'emmie': '#8B5CF6',
        'aura': '#EC4899',
        'buddy': '#F59E0B',
        'kai': '#10B981',
        'lex': '#64748B',
        'other': '#6B7280',
      };

      return Array.from(agentMap.entries())
        .map(([agent, data]) => ({
          agent,
          name: agent.charAt(0).toUpperCase() + agent.slice(1),
          cost: Math.round(data.cost * 100) / 100,
          tokens: data.tokens,
          requests: data.requests,
          color: agentColors[agent] || agentColors['other'],
        }))
        .sort((a, b) => b.cost - a.cost);
    } catch (error: any) {
      console.error('[BudgetService] getSpendingByAgent failed:', error.message);
      return [];
    }
  }

  /**
   * Get daily spending trend for area chart
   */
  async getDailySpendingTrend(userId: string, days: number = 30): Promise<DailySpendingData[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const history = await this.db
        .select()
        .from(budgetUsageHistory)
        .where(
          and(
            eq(budgetUsageHistory.userId, userId),
            gte(budgetUsageHistory.periodStart, startDate)
          )
        )
        .orderBy(asc(budgetUsageHistory.periodStart));

      // Group by date
      const dailyMap = new Map<string, { cost: number; tokens: number; requests: number }>();

      for (const record of history) {
        const dateKey = new Date(record.periodStart).toISOString().split('T')[0];
        const existing = dailyMap.get(dateKey) || { cost: 0, tokens: 0, requests: 0 };
        existing.cost += parseFloat(String(record.costUsd || 0));
        existing.tokens += record.tokensUsed || 0;
        existing.requests += record.requestCount || 0;
        dailyMap.set(dateKey, existing);
      }

      return Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date,
          cost: Math.round(data.cost * 100) / 100,
          tokens: data.tokens,
          requests: data.requests,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error: any) {
      console.error('[BudgetService] getDailySpendingTrend failed:', error.message);
      return [];
    }
  }
}

/**
 * Chart data interfaces for Recharts
 */
export interface ForecastChartDataPoint {
  date: string; // YYYY-MM-DD
  actual: number | null; // Actual cumulative cost up to this date
  projected: number | null; // Projected cumulative cost (null for past dates)
  tokens: number | null; // Actual tokens
  projectedTokens: number | null; // Projected tokens
  limit: number | null; // Budget limit (for reference line)
  isToday: boolean;
  isFuture: boolean;
}

export interface ModelSpendingData {
  model: string;
  cost: number;
  tokens: number;
  requests: number;
  color: string;
  percentage: number;
}

export interface AgentSpendingData {
  agent: string;
  name: string;
  cost: number;
  tokens: number;
  requests: number;
  color: string;
}

export interface DailySpendingData {
  date: string;
  cost: number;
  tokens: number;
  requests: number;
}

/**
 * Financial Health Summary interface for AI agents
 */
export interface FinancialHealthSummary {
  userId: string;
  timestamp: string;
  healthScore: number; // 0-100
  status: 'excellent' | 'good' | 'fair' | 'warning' | 'critical';
  budget: {
    monthlyLimit: number;
    dailyLimit: number;
    currentMonthSpend: number;
    currentDaySpend: number;
    remainingMonthlyBudget: number;
    dailyBudgetForRemaining: number;
    monthlyUtilization: number;
    dailyUtilization: number;
    daysRemaining: number;
    isActive: boolean;
  };
  tokens: {
    monthlyLimit: number;
    currentUsage: number;
    utilization: number;
  };
  forecast: {
    projectedMonthEnd: number;
    projectedOverage: number;
    runOutDate: string | null;
    trend: 'increasing' | 'stable' | 'decreasing';
    confidenceScore: number;
  } | null;
  alerts: {
    total: number;
    highSeverity: number;
    unread: number;
    latest: Array<{
      type: string;
      severity: string;
      message: string;
    }>;
  };
  anomalies: {
    total: number;
    critical: number;
    latest: Array<{
      type: string;
      severity: string;
      message: string;
    }>;
  };
  recommendations: string[];
}

// Singleton instance
export const budgetService = new BudgetService();
