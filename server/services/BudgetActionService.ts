/**
 * Budget Action Service - Phase 3: Active Intervention Layer
 *
 * Provides methods for Buddy AI to actively modify user budget settings
 * with proper audit logging and Human-in-the-Loop approval.
 *
 * Features:
 * - Optimize user config (model switching, auto-optimization)
 * - Update daily/monthly limits
 * - Full audit trail via Enterprise Audit Logs
 * - Socket.IO events for real-time UI updates
 *
 * @author AI Systems Team
 * @version 1.0.0
 */

import { getDb } from '@/lib/db/connection';
import { userBudgets } from '@/lib/db/schema-user-budgets';
import { enterpriseAuditLogs } from '@/lib/db/schema-budget-enterprise';
import { eq } from 'drizzle-orm';

// =====================================================
// TYPES & INTERFACES
// =====================================================

export type OptimizationStrategy = 'cost_save' | 'performance';

export interface OptimizationResult {
  success: boolean;
  error?: string;
  changes?: {
    preferredModel: { from: string; to: string };
    autoCostOptimization: { from: boolean; to: boolean };
  };
  estimatedSavings?: {
    monthlyUsd: number;
    percentage: number;
  };
  message?: string;
}

export interface LimitChangeResult {
  success: boolean;
  error?: string;
  changes?: {
    dailyTokenLimit?: { from: number; to: number };
    dailyCostLimitUsd?: { from: string; to: string };
    monthlyTokenLimit?: { from: number; to: number };
    monthlyCostLimitUsd?: { from: string; to: string };
  };
  message?: string;
}

export interface ApprovalRequest {
  id: string;
  type: 'optimization' | 'limit_change';
  userId: string;
  strategy?: OptimizationStrategy;
  newLimit?: number;
  reason: string;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
}

export interface AuditContext {
  userId: string;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  triggeredBy?: 'buddy_ai' | 'user' | 'system' | 'scheduler';
  reason?: string;
}

// =====================================================
// MODEL COST MAPPING
// =====================================================

const MODEL_COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
};

// =====================================================
// BUDGET ACTION SERVICE CLASS
// =====================================================

export class BudgetActionService {
  private db = getDb();

  // In-memory store for pending approval requests (would be DB in production)
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();

  // =====================================================
  // OPTIMIZATION METHODS
  // =====================================================

  /**
   * Optimize user configuration based on strategy
   *
   * @param userId - User ID
   * @param strategy - 'cost_save' or 'performance'
   * @param context - Audit context for logging
   */
  async optimizeUserConfig(
    userId: string,
    strategy: OptimizationStrategy,
    context?: AuditContext
  ): Promise<OptimizationResult> {
    try {
      // Get current budget settings
      const [currentBudget] = await this.db
        .select()
        .from(userBudgets)
        .where(eq(userBudgets.userId, userId))
        .limit(1);

      if (!currentBudget) {
        return {
          success: false,
          error: 'User budget not found. Please initialize budget first.',
        };
      }

      const previousModel = currentBudget.preferredModel || 'gpt-4o-mini';
      const previousAutoOptimize = currentBudget.autoCostOptimization ?? false;

      let newModel: string;
      let newAutoOptimize: boolean;

      if (strategy === 'cost_save') {
        // Cost-saving strategy: Use cheapest model, enable auto-optimization
        newModel = 'gpt-4o-mini';
        newAutoOptimize = true;
      } else {
        // Performance strategy: Use best model, disable auto-optimization
        newModel = 'gpt-4o';
        newAutoOptimize = false;
      }

      // Skip if no changes
      if (newModel === previousModel && newAutoOptimize === previousAutoOptimize) {
        return {
          success: true,
          message: 'Configuration already optimized for this strategy.',
          changes: {
            preferredModel: { from: previousModel, to: newModel },
            autoCostOptimization: { from: previousAutoOptimize, to: newAutoOptimize },
          },
        };
      }

      // Apply changes
      await this.db
        .update(userBudgets)
        .set({
          preferredModel: newModel,
          autoCostOptimization: newAutoOptimize,
          updatedAt: new Date(),
        })
        .where(eq(userBudgets.userId, userId));

      // Calculate estimated savings
      const estimatedSavings = this.calculateSavings(
        previousModel,
        newModel,
        currentBudget.currentMonthTokens || 0
      );

      // Log to audit
      await this.logAuditAction({
        userId,
        action: 'budget.config.optimized',
        actionCategory: 'budget_change',
        severity: 'info',
        resourceType: 'user_budget',
        resourceId: currentBudget.id,
        previousValue: {
          preferredModel: previousModel,
          autoCostOptimization: previousAutoOptimize,
        },
        newValue: {
          preferredModel: newModel,
          autoCostOptimization: newAutoOptimize,
        },
        changeDescription: `Budget configuration optimized for ${strategy}. Model: ${previousModel} → ${newModel}`,
        context: {
          ...context,
          reason: context?.reason || `Buddy AI optimized for ${strategy}`,
        },
      });

      console.log('[BudgetActionService] Config optimized:', {
        userId,
        strategy,
        changes: { from: previousModel, to: newModel },
      });

      return {
        success: true,
        changes: {
          preferredModel: { from: previousModel, to: newModel },
          autoCostOptimization: { from: previousAutoOptimize, to: newAutoOptimize },
        },
        estimatedSavings,
        message: strategy === 'cost_save'
          ? `Auf günstigeres Modell (${newModel}) gewechselt. Auto-Optimierung aktiviert.`
          : `Auf leistungsstärkstes Modell (${newModel}) gewechselt.`,
      };
    } catch (error) {
      console.error('[BudgetActionService] optimizeUserConfig failed:', error);
      return {
        success: false,
        error: 'Failed to optimize configuration. Please try again.',
      };
    }
  }

  // =====================================================
  // LIMIT CHANGE METHODS
  // =====================================================

  /**
   * Update user's daily token limit
   *
   * @param userId - User ID
   * @param newLimit - New daily token limit
   * @param context - Audit context for logging
   */
  async updateDailyLimit(
    userId: string,
    newLimit: number,
    context?: AuditContext
  ): Promise<LimitChangeResult> {
    try {
      // Validate limit
      if (newLimit < 1000) {
        return {
          success: false,
          error: 'Daily limit must be at least 1,000 tokens.',
        };
      }

      if (newLimit > 10000000) {
        return {
          success: false,
          error: 'Daily limit cannot exceed 10,000,000 tokens.',
        };
      }

      // Get current budget
      const [currentBudget] = await this.db
        .select()
        .from(userBudgets)
        .where(eq(userBudgets.userId, userId))
        .limit(1);

      if (!currentBudget) {
        return {
          success: false,
          error: 'User budget not found.',
        };
      }

      const previousLimit = currentBudget.dailyTokenLimit || 50000;

      // Skip if no change
      if (newLimit === previousLimit) {
        return {
          success: true,
          message: 'Daily limit is already set to this value.',
          changes: {
            dailyTokenLimit: { from: previousLimit, to: newLimit },
          },
        };
      }

      // Calculate new daily cost limit (based on gpt-4o-mini pricing)
      const costPer1kTokens = (MODEL_COST_PER_1K_TOKENS['gpt-4o-mini'].input +
        MODEL_COST_PER_1K_TOKENS['gpt-4o-mini'].output) / 2;
      const newDailyCostLimit = ((newLimit / 1000) * costPer1kTokens).toFixed(2);

      // Apply changes
      await this.db
        .update(userBudgets)
        .set({
          dailyTokenLimit: newLimit,
          dailyCostLimitUsd: newDailyCostLimit,
          updatedAt: new Date(),
        })
        .where(eq(userBudgets.userId, userId));

      // Log to audit (MANDATORY)
      await this.logAuditAction({
        userId,
        action: 'budget.daily_limit.updated',
        actionCategory: 'limit_update',
        severity: newLimit < previousLimit ? 'warning' : 'info',
        resourceType: 'user_budget',
        resourceId: currentBudget.id,
        previousValue: {
          dailyTokenLimit: previousLimit,
          dailyCostLimitUsd: currentBudget.dailyCostLimitUsd,
        },
        newValue: {
          dailyTokenLimit: newLimit,
          dailyCostLimitUsd: newDailyCostLimit,
        },
        changeDescription: `Daily token limit changed from ${previousLimit.toLocaleString()} to ${newLimit.toLocaleString()}`,
        context: {
          ...context,
          reason: context?.reason || 'Limit adjustment via Buddy AI',
        },
      });

      console.log('[BudgetActionService] Daily limit updated:', {
        userId,
        from: previousLimit,
        to: newLimit,
      });

      return {
        success: true,
        changes: {
          dailyTokenLimit: { from: previousLimit, to: newLimit },
          dailyCostLimitUsd: {
            from: String(currentBudget.dailyCostLimitUsd || '10.00'),
            to: newDailyCostLimit,
          },
        },
        message: `Tageslimit auf ${newLimit.toLocaleString()} Tokens aktualisiert.`,
      };
    } catch (error) {
      console.error('[BudgetActionService] updateDailyLimit failed:', error);
      return {
        success: false,
        error: 'Failed to update daily limit. Please try again.',
      };
    }
  }

  /**
   * Update user's monthly token limit
   */
  async updateMonthlyLimit(
    userId: string,
    newLimit: number,
    context?: AuditContext
  ): Promise<LimitChangeResult> {
    try {
      if (newLimit < 10000) {
        return {
          success: false,
          error: 'Monthly limit must be at least 10,000 tokens.',
        };
      }

      const [currentBudget] = await this.db
        .select()
        .from(userBudgets)
        .where(eq(userBudgets.userId, userId))
        .limit(1);

      if (!currentBudget) {
        return {
          success: false,
          error: 'User budget not found.',
        };
      }

      const previousLimit = currentBudget.monthlyTokenLimit || 1000000;

      // Calculate new monthly cost limit
      const costPer1kTokens = (MODEL_COST_PER_1K_TOKENS['gpt-4o-mini'].input +
        MODEL_COST_PER_1K_TOKENS['gpt-4o-mini'].output) / 2;
      const newMonthlyCostLimit = ((newLimit / 1000) * costPer1kTokens).toFixed(2);

      await this.db
        .update(userBudgets)
        .set({
          monthlyTokenLimit: newLimit,
          monthlyCostLimitUsd: newMonthlyCostLimit,
          updatedAt: new Date(),
        })
        .where(eq(userBudgets.userId, userId));

      await this.logAuditAction({
        userId,
        action: 'budget.monthly_limit.updated',
        actionCategory: 'limit_update',
        severity: newLimit < previousLimit ? 'warning' : 'info',
        resourceType: 'user_budget',
        resourceId: currentBudget.id,
        previousValue: {
          monthlyTokenLimit: previousLimit,
          monthlyCostLimitUsd: currentBudget.monthlyCostLimitUsd,
        },
        newValue: {
          monthlyTokenLimit: newLimit,
          monthlyCostLimitUsd: newMonthlyCostLimit,
        },
        changeDescription: `Monthly token limit changed from ${previousLimit.toLocaleString()} to ${newLimit.toLocaleString()}`,
        context,
      });

      return {
        success: true,
        changes: {
          monthlyTokenLimit: { from: previousLimit, to: newLimit },
          monthlyCostLimitUsd: {
            from: String(currentBudget.monthlyCostLimitUsd || '100.00'),
            to: newMonthlyCostLimit,
          },
        },
        message: `Monatslimit auf ${newLimit.toLocaleString()} Tokens aktualisiert.`,
      };
    } catch (error) {
      console.error('[BudgetActionService] updateMonthlyLimit failed:', error);
      return {
        success: false,
        error: 'Failed to update monthly limit.',
      };
    }
  }

  // =====================================================
  // APPROVAL REQUEST METHODS (Human-in-the-Loop)
  // =====================================================

  /**
   * Create a pending approval request for sensitive changes
   */
  createApprovalRequest(
    type: 'optimization' | 'limit_change',
    userId: string,
    details: {
      strategy?: OptimizationStrategy;
      newLimit?: number;
      reason: string;
    }
  ): ApprovalRequest {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

    const request: ApprovalRequest = {
      id: `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      userId,
      strategy: details.strategy,
      newLimit: details.newLimit,
      reason: details.reason,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'pending',
    };

    this.pendingApprovals.set(request.id, request);

    console.log('[BudgetActionService] Approval request created:', request.id);

    return request;
  }

  /**
   * Process an approved request
   */
  async processApproval(
    approvalId: string,
    approved: boolean,
    context?: AuditContext
  ): Promise<OptimizationResult | LimitChangeResult> {
    const request = this.pendingApprovals.get(approvalId);

    if (!request) {
      return {
        success: false,
        error: 'Approval request not found or expired.',
      };
    }

    if (request.status !== 'pending') {
      return {
        success: false,
        error: `Request already ${request.status}.`,
      };
    }

    // Check expiration
    if (new Date() > new Date(request.expiresAt)) {
      request.status = 'expired';
      this.pendingApprovals.set(approvalId, request);
      return {
        success: false,
        error: 'Approval request has expired.',
      };
    }

    if (!approved) {
      request.status = 'rejected';
      this.pendingApprovals.set(approvalId, request);
      return {
        success: true,
        message: 'Request rejected by user.',
      };
    }

    request.status = 'approved';
    this.pendingApprovals.set(approvalId, request);

    // Execute the approved action
    if (request.type === 'optimization' && request.strategy) {
      return this.optimizeUserConfig(request.userId, request.strategy, {
        ...context,
        reason: request.reason,
      });
    } else if (request.type === 'limit_change' && request.newLimit) {
      return this.updateDailyLimit(request.userId, request.newLimit, {
        ...context,
        reason: request.reason,
      });
    }

    return {
      success: false,
      error: 'Invalid approval request type.',
    };
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Calculate estimated savings from model switch
   */
  private calculateSavings(
    fromModel: string,
    toModel: string,
    monthlyTokens: number
  ): { monthlyUsd: number; percentage: number } {
    const fromCost = MODEL_COST_PER_1K_TOKENS[fromModel] ||
      MODEL_COST_PER_1K_TOKENS['gpt-4o'];
    const toCost = MODEL_COST_PER_1K_TOKENS[toModel] ||
      MODEL_COST_PER_1K_TOKENS['gpt-4o-mini'];

    const avgFromCost = (fromCost.input + fromCost.output) / 2;
    const avgToCost = (toCost.input + toCost.output) / 2;

    const fromMonthlyCost = (monthlyTokens / 1000) * avgFromCost;
    const toMonthlyCost = (monthlyTokens / 1000) * avgToCost;

    const savingsUsd = fromMonthlyCost - toMonthlyCost;
    const savingsPercent = fromMonthlyCost > 0
      ? (savingsUsd / fromMonthlyCost) * 100
      : 0;

    return {
      monthlyUsd: Math.max(0, savingsUsd),
      percentage: Math.max(0, savingsPercent),
    };
  }

  /**
   * Log action to Enterprise Audit Logs
   */
  private async logAuditAction(params: {
    userId: string;
    action: string;
    actionCategory: 'budget_change' | 'limit_update' | 'user_action' | 'system_action';
    severity: 'info' | 'warning' | 'critical';
    resourceType: string;
    resourceId: string;
    previousValue?: Record<string, any>;
    newValue?: Record<string, any>;
    changeDescription?: string;
    context?: AuditContext;
  }): Promise<void> {
    try {
      await this.db.insert(enterpriseAuditLogs).values({
        userId: params.userId,
        userEmail: params.context?.userEmail,
        userRole: params.context?.userRole,
        action: params.action,
        actionCategory: params.actionCategory,
        severity: params.severity,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        previousValue: params.previousValue,
        newValue: params.newValue,
        changeDescription: params.changeDescription,
        ipAddress: params.context?.ipAddress,
        userAgent: params.context?.userAgent,
        sessionId: params.context?.sessionId,
        requestId: params.context?.requestId,
        metadata: {
          reason: params.context?.reason,
          triggeredBy: params.context?.triggeredBy || 'buddy_ai',
        },
      });
    } catch (error) {
      console.error('[BudgetActionService] Failed to log audit action:', error);
      // Don't throw - audit logging should not block the main operation
    }
  }

  /**
   * Get pending approval for user
   */
  getPendingApproval(userId: string): ApprovalRequest | undefined {
    const entries = Array.from(this.pendingApprovals.values());
    for (const request of entries) {
      if (request.userId === userId && request.status === 'pending') {
        return request;
      }
    }
    return undefined;
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

export const budgetActionService = new BudgetActionService();
