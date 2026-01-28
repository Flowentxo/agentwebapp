// ============================================================================
// BUDGET GUARD SERVICE
// Pre-execution cost validation to prevent budget overruns
// ============================================================================

import { getDb } from "@/lib/db";
import { userBudgets } from "@/lib/db/schema-user-budgets";
import { eq } from "drizzle-orm";

// ============================================================================
// CUSTOM ERROR CLASS
// ============================================================================

/**
 * Error thrown when a budget limit would be exceeded
 */
export class BudgetExceededError extends Error {
  public readonly code = "BUDGET_EXCEEDED";
  public readonly statusCode = 429; // Too Many Requests (rate limiting context)

  constructor(
    message: string,
    public readonly details: {
      currentUsage: number;
      limit: number;
      estimatedCost: number;
      limitType: "daily" | "monthly";
      remainingBudget: number;
    }
  ) {
    super(message);
    this.name = "BudgetExceededError";

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BudgetExceededError);
    }
  }

  /**
   * Returns a user-friendly message
   */
  toUserMessage(): string {
    const { limitType, remainingBudget, estimatedCost } = this.details;

    if (remainingBudget <= 0) {
      return `Your ${limitType} budget has been exhausted. Please wait for the reset or upgrade your plan.`;
    }

    return `This request would exceed your ${limitType} budget. Estimated cost: $${estimatedCost.toFixed(4)}, Remaining: $${remainingBudget.toFixed(4)}`;
  }

  /**
   * Returns structured error response for API
   */
  toApiResponse(): {
    error: string;
    code: string;
    details: typeof this.details;
  } {
    return {
      error: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

// ============================================================================
// BUDGET CHECK RESULT TYPE
// ============================================================================

export interface BudgetCheckResult {
  allowed: boolean;
  dailyBudget: {
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
  monthlyBudget: {
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
  warning?: string;
}

// ============================================================================
// COST ESTIMATION UTILITIES
// ============================================================================

/**
 * Estimates the cost of an AI request based on model and tokens
 */
export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  // Cost per 1M tokens (as of late 2024)
  const costTable: Record<string, { input: number; output: number }> = {
    // OpenAI models
    "gpt-4-turbo": { input: 10.0, output: 30.0 },
    "gpt-4-turbo-preview": { input: 10.0, output: 30.0 },
    "gpt-4o": { input: 5.0, output: 15.0 },
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "gpt-3.5-turbo": { input: 0.5, output: 1.5 },

    // Claude models
    "claude-3-opus": { input: 15.0, output: 75.0 },
    "claude-3-sonnet": { input: 3.0, output: 15.0 },
    "claude-3-haiku": { input: 0.25, output: 1.25 },
    "claude-3.5-sonnet": { input: 3.0, output: 15.0 },

    // Default fallback (conservative estimate)
    default: { input: 10.0, output: 30.0 },
  };

  const pricing = costTable[model] || costTable.default;

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Estimates output tokens based on input (heuristic)
 */
export function estimateOutputTokens(inputTokens: number): number {
  // Typically output is 1-2x input length for chat responses
  return Math.ceil(inputTokens * 1.5);
}

// ============================================================================
// BUDGET GUARD SERVICE CLASS
// ============================================================================

export class BudgetGuard {
  private userId: string;
  private db: ReturnType<typeof getDb>;

  constructor(userId: string) {
    this.userId = userId;
    this.db = getDb();
  }

  /**
   * Checks if the estimated cost is within budget limits.
   * Throws BudgetExceededError if the request would exceed limits.
   *
   * @param estimatedCost - The estimated cost in USD
   * @throws BudgetExceededError if budget would be exceeded
   */
  async checkBudgetAvailability(estimatedCost: number): Promise<BudgetCheckResult> {
    const [budget] = await this.db
      .select()
      .from(userBudgets)
      .where(eq(userBudgets.userId, this.userId))
      .limit(1);

    // If no budget record exists, allow with default limits
    if (!budget) {
      return {
        allowed: true,
        dailyBudget: {
          used: 0,
          limit: 10, // Default $10/day
          remaining: 10,
          percentUsed: 0,
        },
        monthlyBudget: {
          used: 0,
          limit: 100, // Default $100/month
          remaining: 100,
          percentUsed: 0,
        },
      };
    }

    // Check if budget is active
    if (!budget.isActive) {
      throw new BudgetExceededError(
        "Your budget has been deactivated. Please contact support.",
        {
          currentUsage: 0,
          limit: 0,
          estimatedCost,
          limitType: "daily",
          remainingBudget: 0,
        }
      );
    }

    // Parse current usage and limits
    const dailyUsed = parseFloat(budget.currentDayCostUsd || "0");
    const dailyLimit = parseFloat(budget.dailyCostLimitUsd || "10");
    const monthlyUsed = parseFloat(budget.currentMonthCostUsd || "0");
    const monthlyLimit = parseFloat(budget.monthlyCostLimitUsd || "100");

    // Check if day/month has reset
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Adjust usage if reset time has passed
    const effectiveDailyUsed = budget.dayResetAt < dayStart ? 0 : dailyUsed;
    const effectiveMonthlyUsed = budget.monthResetAt < monthStart ? 0 : monthlyUsed;

    // Calculate remaining budgets
    const dailyRemaining = Math.max(0, dailyLimit - effectiveDailyUsed);
    const monthlyRemaining = Math.max(0, monthlyLimit - effectiveMonthlyUsed);

    // Check daily limit
    if (effectiveDailyUsed + estimatedCost > dailyLimit) {
      throw new BudgetExceededError(
        `Daily budget limit of $${dailyLimit.toFixed(2)} would be exceeded`,
        {
          currentUsage: effectiveDailyUsed,
          limit: dailyLimit,
          estimatedCost,
          limitType: "daily",
          remainingBudget: dailyRemaining,
        }
      );
    }

    // Check monthly limit
    if (effectiveMonthlyUsed + estimatedCost > monthlyLimit) {
      throw new BudgetExceededError(
        `Monthly budget limit of $${monthlyLimit.toFixed(2)} would be exceeded`,
        {
          currentUsage: effectiveMonthlyUsed,
          limit: monthlyLimit,
          estimatedCost,
          limitType: "monthly",
          remainingBudget: monthlyRemaining,
        }
      );
    }

    // Prepare result
    const result: BudgetCheckResult = {
      allowed: true,
      dailyBudget: {
        used: effectiveDailyUsed,
        limit: dailyLimit,
        remaining: dailyRemaining,
        percentUsed: dailyLimit > 0 ? (effectiveDailyUsed / dailyLimit) * 100 : 0,
      },
      monthlyBudget: {
        used: effectiveMonthlyUsed,
        limit: monthlyLimit,
        remaining: monthlyRemaining,
        percentUsed: monthlyLimit > 0 ? (effectiveMonthlyUsed / monthlyLimit) * 100 : 0,
      },
    };

    // Add warning if approaching limit
    const dailyAfterRequest = effectiveDailyUsed + estimatedCost;
    const thresholdPercent = budget.notifyThresholdPercent || 80;

    if ((dailyAfterRequest / dailyLimit) * 100 >= thresholdPercent) {
      result.warning = `Warning: This request will bring you to ${((dailyAfterRequest / dailyLimit) * 100).toFixed(1)}% of your daily budget`;
    }

    return result;
  }

  /**
   * Records spending after a successful AI request
   */
  async recordSpending(actualCost: number): Promise<void> {
    const [budget] = await this.db
      .select()
      .from(userBudgets)
      .where(eq(userBudgets.userId, this.userId))
      .limit(1);

    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    if (!budget) {
      // Create new budget record
      await this.db.insert(userBudgets).values({
        userId: this.userId,
        currentDayCostUsd: actualCost.toFixed(6),
        currentMonthCostUsd: actualCost.toFixed(6),
        dayResetAt: dayStart,
        monthResetAt: monthStart,
      });
      return;
    }

    // Calculate new usage, accounting for resets
    let newDayCost = budget.dayResetAt < dayStart
      ? actualCost
      : parseFloat(budget.currentDayCostUsd || "0") + actualCost;

    let newMonthCost = budget.monthResetAt < monthStart
      ? actualCost
      : parseFloat(budget.currentMonthCostUsd || "0") + actualCost;

    await this.db
      .update(userBudgets)
      .set({
        currentDayCostUsd: newDayCost.toFixed(6),
        currentMonthCostUsd: newMonthCost.toFixed(6),
        dayResetAt: dayStart,
        monthResetAt: monthStart,
        currentDayTokens: (budget.currentDayTokens || 0) + 1, // Increment request count
        updatedAt: now,
      })
      .where(eq(userBudgets.userId, this.userId));
  }

  /**
   * Convenience method: Check and record in one operation
   * Use this wrapper for typical AI request flow
   */
  async withBudgetCheck<T>(
    estimatedCost: number,
    operation: () => Promise<{ result: T; actualCost: number }>
  ): Promise<T> {
    // Pre-check
    await this.checkBudgetAvailability(estimatedCost);

    // Execute operation
    const { result, actualCost } = await operation();

    // Record actual spending
    await this.recordSpending(actualCost);

    return result;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Creates a BudgetGuard instance for a user
 */
export function createBudgetGuard(userId: string): BudgetGuard {
  return new BudgetGuard(userId);
}

// ============================================================================
// MIDDLEWARE HELPER
// ============================================================================

/**
 * Express/Next.js middleware-style helper for API routes
 */
export async function checkBudget(
  userId: string,
  model: string,
  inputTokens: number,
  expectedOutputTokens?: number
): Promise<BudgetCheckResult> {
  const guard = createBudgetGuard(userId);
  const outputTokens = expectedOutputTokens ?? estimateOutputTokens(inputTokens);
  const estimatedCost = estimateCost(model, inputTokens, outputTokens);

  return guard.checkBudgetAvailability(estimatedCost);
}
