/**
 * BudgetGuard Service
 *
 * Centralized budget enforcement for all AI operations.
 * Acts as a gatekeeper before any LLM call is made.
 *
 * Features:
 * - Pre-flight cost estimation
 * - Budget availability checking
 * - Post-execution cost recording
 * - Spending alerts and notifications
 *
 * @version 1.0.0
 */

import { getDb } from '@/lib/db';
import { userBudgets, budgetUsageHistory, aiUsage } from '@/lib/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const logger = createLogger('budget-guard');

// ============================================================================
// TYPES & ERRORS
// ============================================================================

export class BudgetExceededError extends Error {
  constructor(
    message: string,
    public readonly details: {
      currentSpend: number;
      dailyLimit: number;
      estimatedCost: number;
      remainingBudget: number;
    }
  ) {
    super(message);
    this.name = 'BudgetExceededError';
  }
}

export interface CostEstimate {
  inputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
  model: string;
}

export interface SpendingRecord {
  agentId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  metadata?: Record<string, unknown>;
}

export interface BudgetStatus {
  dailyLimitUsd: number;
  todaySpendUsd: number;
  remainingUsd: number;
  percentUsed: number;
  isLimitReached: boolean;
  warningLevel: 'normal' | 'warning' | 'critical' | 'exceeded';
}

// ============================================================================
// PRICING CONFIGURATION
// ============================================================================

/**
 * OpenAI pricing per 1M tokens (December 2024)
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-4-turbo-preview': { input: 10.0, output: 30.0 },
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4': { input: 30.0, output: 60.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  // Anthropic
  'claude-3-opus': { input: 15.0, output: 75.0 },
  'claude-3-sonnet': { input: 3.0, output: 15.0 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  // Default fallback
  default: { input: 2.5, output: 10.0 },
};

/**
 * Get pricing for a specific model
 */
function getModelPricing(model: string): { input: number; output: number } {
  // Normalize model name
  const normalizedModel = model.toLowerCase();

  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (normalizedModel.includes(key)) {
      return pricing;
    }
  }

  return MODEL_PRICING.default;
}

// ============================================================================
// TOKEN ESTIMATION
// ============================================================================

/**
 * Estimate token count for text
 * Uses approximation: ~4 characters per token for English
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Estimate cost based on input context and expected output
 */
export function estimateCost(
  model: string,
  inputText: string,
  expectedOutputTokens: number = 500
): CostEstimate {
  const inputTokens = estimateTokens(inputText);
  const pricing = getModelPricing(model);

  // Calculate cost in USD
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (expectedOutputTokens / 1_000_000) * pricing.output;
  const totalCost = inputCost + outputCost;

  return {
    inputTokens,
    estimatedOutputTokens: expectedOutputTokens,
    estimatedCostUsd: totalCost,
    model,
  };
}

/**
 * Calculate actual cost from token usage
 */
export function calculateActualCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = getModelPricing(model);

  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

// ============================================================================
// BUDGET CHECKING
// ============================================================================

/**
 * Get today's spending for a user
 */
async function getTodaySpending(userId: string): Promise<number> {
  const db = getDb();

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(${aiUsage.estimatedCost}), 0)`,
      })
      .from(aiUsage)
      .where(
        and(
          eq(aiUsage.userId, userId),
          gte(aiUsage.createdAt, today)
        )
      );

    // Convert from credits (micro-dollars * 1000) back to USD
    const totalCredits = Number(result[0]?.total || 0);
    return totalCredits / 1000; // Credits to USD
  } catch (error) {
    logger.warn('[BUDGET] Could not fetch today spending:', error);
    return 0;
  }
}

/**
 * Get user's budget configuration
 */
async function getUserBudget(userId: string): Promise<{ dailyLimit: number; alertThreshold: number }> {
  const db = getDb();

  try {
    const [budget] = await db
      .select()
      .from(userBudgets)
      .where(eq(userBudgets.userId, userId))
      .limit(1);

    if (budget) {
      return {
        dailyLimit: parseFloat(budget.dailyCostLimitUsd || '10'),
        alertThreshold: parseFloat(budget.alertThresholdPercent || '80'),
      };
    }
  } catch (error) {
    logger.warn('[BUDGET] Could not fetch user budget config:', error);
  }

  // Default budget
  return { dailyLimit: 10.0, alertThreshold: 80 };
}

/**
 * Get full budget status for a user
 */
export async function getBudgetStatus(userId: string): Promise<BudgetStatus> {
  const { dailyLimit, alertThreshold } = await getUserBudget(userId);
  const todaySpend = await getTodaySpending(userId);
  const remaining = Math.max(0, dailyLimit - todaySpend);
  const percentUsed = dailyLimit > 0 ? (todaySpend / dailyLimit) * 100 : 0;

  let warningLevel: BudgetStatus['warningLevel'] = 'normal';
  if (percentUsed >= 100) {
    warningLevel = 'exceeded';
  } else if (percentUsed >= 90) {
    warningLevel = 'critical';
  } else if (percentUsed >= alertThreshold) {
    warningLevel = 'warning';
  }

  return {
    dailyLimitUsd: dailyLimit,
    todaySpendUsd: todaySpend,
    remainingUsd: remaining,
    percentUsed,
    isLimitReached: percentUsed >= 100,
    warningLevel,
  };
}

/**
 * Check if budget is available for an estimated cost
 * Throws BudgetExceededError if limit would be exceeded
 */
export async function checkBudgetAvailability(
  userId: string,
  estimatedCostUsd: number
): Promise<void> {
  const status = await getBudgetStatus(userId);

  logger.info(`[BUDGET] Checking availability: estimated=$${estimatedCostUsd.toFixed(4)}, remaining=$${status.remainingUsd.toFixed(4)}`);

  if (status.isLimitReached) {
    throw new BudgetExceededError('Daily budget limit reached. Please try again tomorrow or upgrade your plan.', {
      currentSpend: status.todaySpendUsd,
      dailyLimit: status.dailyLimitUsd,
      estimatedCost: estimatedCostUsd,
      remainingBudget: status.remainingUsd,
    });
  }

  // Check if this operation would exceed the limit
  if (status.todaySpendUsd + estimatedCostUsd > status.dailyLimitUsd) {
    throw new BudgetExceededError(
      `This operation would exceed your daily budget. Estimated cost: $${estimatedCostUsd.toFixed(4)}, Remaining: $${status.remainingUsd.toFixed(4)}`,
      {
        currentSpend: status.todaySpendUsd,
        dailyLimit: status.dailyLimitUsd,
        estimatedCost: estimatedCostUsd,
        remainingBudget: status.remainingUsd,
      }
    );
  }
}

// ============================================================================
// SPENDING RECORDING
// ============================================================================

/**
 * Record AI spending after a successful operation
 */
export async function recordSpending(
  userId: string,
  spending: SpendingRecord
): Promise<void> {
  const db = getDb();

  try {
    // Convert cost to credits (1 credit = $0.001)
    const credits = Math.ceil(spending.costUsd * 1000);

    await db.insert(aiUsage).values({
      userId,
      agentId: spending.agentId,
      model: spending.model,
      promptTokens: spending.promptTokens,
      completionTokens: spending.completionTokens,
      totalTokens: spending.totalTokens,
      estimatedCost: credits,
      success: true,
      metadata: spending.metadata || {},
    });

    logger.info(`[BUDGET] Recorded spending: $${spending.costUsd.toFixed(4)} (${spending.totalTokens} tokens) for agent=${spending.agentId}`);

    // Check if we should send a warning
    const status = await getBudgetStatus(userId);
    if (status.warningLevel === 'critical') {
      logger.warn(`[BUDGET] User ${userId} has reached ${status.percentUsed.toFixed(1)}% of daily budget`);
      // TODO: Send notification/email
    }
  } catch (error) {
    logger.error('[BUDGET] Failed to record spending:', error);
    // Don't throw - spending recording shouldn't block the response
  }
}

// ============================================================================
// BUDGET GUARD SINGLETON
// ============================================================================

/**
 * BudgetGuard - Unified interface for budget management
 */
export const BudgetGuard = {
  estimateCost,
  calculateActualCost,
  estimateTokens,
  checkBudgetAvailability,
  recordSpending,
  getBudgetStatus,
  BudgetExceededError,
};

export default BudgetGuard;
