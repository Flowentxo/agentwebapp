"use server";

// ============================================================================
// BUDGET SETTINGS SERVER ACTIONS
// Manage user budget limits, auto-recharge, and spending controls
// ============================================================================

import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { userBudgets } from "@/lib/db/schema-user-budgets";
import { eq } from "drizzle-orm";
import { z } from "zod";

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Schema for updating budget configuration
 */
export const BudgetConfigSchema = z.object({
  dailyHardLimit: z
    .number()
    .min(1, "Daily limit must be at least $1")
    .max(10000, "Daily limit cannot exceed $10,000"),
  autoRechargeEnabled: z.boolean(),
  alertThreshold: z
    .number()
    .min(10, "Alert threshold must be at least 10%")
    .max(100, "Alert threshold cannot exceed 100%")
    .optional()
    .default(80),
  monthlyLimit: z
    .number()
    .min(10, "Monthly limit must be at least $10")
    .max(100000, "Monthly limit cannot exceed $100,000")
    .optional(),
});

export type BudgetConfigInput = z.infer<typeof BudgetConfigSchema>;

/**
 * Schema for auto-recharge settings
 */
export const AutoRechargeSchema = z.object({
  enabled: z.boolean(),
  threshold: z
    .number()
    .min(1, "Threshold must be at least $1")
    .max(100, "Threshold cannot exceed $100"),
  packageId: z.number().optional(),
});

export type AutoRechargeInput = z.infer<typeof AutoRechargeSchema>;

// ============================================================================
// TYPES
// ============================================================================

export interface BudgetSettingsData {
  id: string;
  userId: string;
  dailyCostLimitUsd: string;
  currentDayCostUsd: string;
  monthlyCostLimitUsd: string;
  currentMonthCostUsd: string;
  notifyThresholdPercent: number;
  autoRechargeEnabled: boolean;
  autoRechargeThreshold: number | null;
  dayResetAt: Date;
  monthResetAt: Date;
  isActive: boolean;
}

export interface BudgetStatus {
  dailyUsed: number;
  dailyLimit: number;
  dailyRemaining: number;
  dailyPercentUsed: number;
  monthlyUsed: number;
  monthlyLimit: number;
  monthlyRemaining: number;
  monthlyPercentUsed: number;
  status: 'safe' | 'warning' | 'critical';
  autoRechargeEnabled: boolean;
}

// ============================================================================
// HELPER: Get authenticated user ID
// ============================================================================

async function getAuthUserId(): Promise<string> {
  const session = await getSession();

  if (!session || !session.user?.id) {
    throw new Error("Unauthorized: Please sign in to access this resource");
  }

  return session.user.id;
}

// ============================================================================
// GET BUDGET SETTINGS
// ============================================================================

export async function getBudgetSettings(): Promise<BudgetSettingsData | null> {
  const userId = await getAuthUserId();
  const db = getDb();

  const [budget] = await db
    .select()
    .from(userBudgets)
    .where(eq(userBudgets.userId, userId))
    .limit(1);

  if (!budget) {
    return null;
  }

  const metadata = budget.metadata as { autoReload?: { enabled: boolean; threshold: number } } | null;

  return {
    id: budget.id,
    userId: budget.userId,
    dailyCostLimitUsd: budget.dailyCostLimitUsd || '10.00',
    currentDayCostUsd: budget.currentDayCostUsd || '0.00',
    monthlyCostLimitUsd: budget.monthlyCostLimitUsd || '100.00',
    currentMonthCostUsd: budget.currentMonthCostUsd || '0.00',
    notifyThresholdPercent: budget.notifyThresholdPercent || 80,
    autoRechargeEnabled: metadata?.autoReload?.enabled ?? false,
    autoRechargeThreshold: metadata?.autoReload?.threshold ?? null,
    dayResetAt: budget.dayResetAt,
    monthResetAt: budget.monthResetAt,
    isActive: budget.isActive,
  };
}

// ============================================================================
// GET BUDGET STATUS (for UI display)
// ============================================================================

export async function getBudgetStatus(): Promise<BudgetStatus> {
  const userId = await getAuthUserId();
  const db = getDb();

  const [budget] = await db
    .select()
    .from(userBudgets)
    .where(eq(userBudgets.userId, userId))
    .limit(1);

  // Default values if no budget exists
  if (!budget) {
    return {
      dailyUsed: 0,
      dailyLimit: 10,
      dailyRemaining: 10,
      dailyPercentUsed: 0,
      monthlyUsed: 0,
      monthlyLimit: 100,
      monthlyRemaining: 100,
      monthlyPercentUsed: 0,
      status: 'safe',
      autoRechargeEnabled: false,
    };
  }

  const dailyUsed = parseFloat(budget.currentDayCostUsd || '0');
  const dailyLimit = parseFloat(budget.dailyCostLimitUsd || '10');
  const monthlyUsed = parseFloat(budget.currentMonthCostUsd || '0');
  const monthlyLimit = parseFloat(budget.monthlyCostLimitUsd || '100');
  const metadata = budget.metadata as { autoReload?: { enabled: boolean } } | null;

  const dailyPercentUsed = dailyLimit > 0 ? (dailyUsed / dailyLimit) * 100 : 0;
  const monthlyPercentUsed = monthlyLimit > 0 ? (monthlyUsed / monthlyLimit) * 100 : 0;

  // Determine status based on usage percentage
  let status: 'safe' | 'warning' | 'critical' = 'safe';
  const maxPercent = Math.max(dailyPercentUsed, monthlyPercentUsed);

  if (maxPercent >= 90) {
    status = 'critical';
  } else if (maxPercent >= budget.notifyThresholdPercent!) {
    status = 'warning';
  }

  return {
    dailyUsed,
    dailyLimit,
    dailyRemaining: Math.max(0, dailyLimit - dailyUsed),
    dailyPercentUsed,
    monthlyUsed,
    monthlyLimit,
    monthlyRemaining: Math.max(0, monthlyLimit - monthlyUsed),
    monthlyPercentUsed,
    status,
    autoRechargeEnabled: metadata?.autoReload?.enabled ?? false,
  };
}

// ============================================================================
// UPDATE BUDGET CONFIG (Main Action with Zod Validation)
// ============================================================================

export async function updateBudgetConfig(
  input: BudgetConfigInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate input with Zod
    const validatedInput = BudgetConfigSchema.parse(input);
    const userId = await getAuthUserId();
    const db = getDb();

    // Check if budget exists
    const [existing] = await db
      .select()
      .from(userBudgets)
      .where(eq(userBudgets.userId, userId))
      .limit(1);

    const currentMetadata = (existing?.metadata as Record<string, any>) || {};

    const updates = {
      dailyCostLimitUsd: validatedInput.dailyHardLimit.toFixed(2),
      notifyThresholdPercent: validatedInput.alertThreshold,
      monthlyCostLimitUsd: validatedInput.monthlyLimit?.toFixed(2),
      metadata: {
        ...currentMetadata,
        autoReload: {
          ...currentMetadata.autoReload,
          enabled: validatedInput.autoRechargeEnabled,
        },
      },
      updatedAt: new Date(),
    };

    if (existing) {
      // Update existing record
      await db
        .update(userBudgets)
        .set(updates)
        .where(eq(userBudgets.userId, userId));
    } else {
      // Create new record
      await db.insert(userBudgets).values({
        userId,
        ...updates,
        dayResetAt: new Date(),
        monthResetAt: new Date(),
      });
    }

    revalidatePath("/budget");
    revalidatePath("/settings");

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: `Validation Error: ${firstError.path.join('.')} - ${firstError.message}`,
      };
    }

    console.error("[BUDGET_UPDATE_ERROR]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update budget settings",
    };
  }
}

// ============================================================================
// UPDATE AUTO-RECHARGE SETTINGS
// ============================================================================

export async function updateAutoRecharge(
  input: AutoRechargeInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate input with Zod
    const validatedInput = AutoRechargeSchema.parse(input);
    const userId = await getAuthUserId();
    const db = getDb();

    const [existing] = await db
      .select()
      .from(userBudgets)
      .where(eq(userBudgets.userId, userId))
      .limit(1);

    const currentMetadata = (existing?.metadata as Record<string, any>) || {};

    const updates = {
      metadata: {
        ...currentMetadata,
        autoReload: {
          enabled: validatedInput.enabled,
          threshold: validatedInput.threshold,
          packageId: validatedInput.packageId,
        },
      },
      updatedAt: new Date(),
    };

    if (existing) {
      await db
        .update(userBudgets)
        .set(updates)
        .where(eq(userBudgets.userId, userId));
    } else {
      await db.insert(userBudgets).values({
        userId,
        ...updates,
        dayResetAt: new Date(),
        monthResetAt: new Date(),
      });
    }

    revalidatePath("/budget");

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: `Validation Error: ${firstError.path.join('.')} - ${firstError.message}`,
      };
    }

    console.error("[AUTO_RECHARGE_UPDATE_ERROR]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update auto-recharge settings",
    };
  }
}

// ============================================================================
// TOGGLE AUTO-RECHARGE (Quick toggle)
// ============================================================================

export async function toggleAutoRecharge(
  enabled: boolean
): Promise<{ success: boolean }> {
  const userId = await getAuthUserId();
  const db = getDb();

  const [existing] = await db
    .select()
    .from(userBudgets)
    .where(eq(userBudgets.userId, userId))
    .limit(1);

  const currentMetadata = (existing?.metadata as Record<string, any>) || {};

  const updates = {
    metadata: {
      ...currentMetadata,
      autoReload: {
        ...currentMetadata.autoReload,
        enabled,
      },
    },
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(userBudgets)
      .set(updates)
      .where(eq(userBudgets.userId, userId));
  } else {
    await db.insert(userBudgets).values({
      userId,
      ...updates,
      dayResetAt: new Date(),
      monthResetAt: new Date(),
    });
  }

  revalidatePath("/budget");

  return { success: true };
}

// ============================================================================
// SET DAILY HARD LIMIT
// ============================================================================

export async function setDailyHardLimit(
  limit: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate
    if (limit < 1 || limit > 10000) {
      return {
        success: false,
        error: "Daily limit must be between $1 and $10,000",
      };
    }

    const userId = await getAuthUserId();
    const db = getDb();

    const [existing] = await db
      .select()
      .from(userBudgets)
      .where(eq(userBudgets.userId, userId))
      .limit(1);

    if (existing) {
      await db
        .update(userBudgets)
        .set({
          dailyCostLimitUsd: limit.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(userBudgets.userId, userId));
    } else {
      await db.insert(userBudgets).values({
        userId,
        dailyCostLimitUsd: limit.toFixed(2),
        dayResetAt: new Date(),
        monthResetAt: new Date(),
      });
    }

    revalidatePath("/budget");

    return { success: true };
  } catch (error) {
    console.error("[SET_DAILY_LIMIT_ERROR]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to set daily limit",
    };
  }
}

// ============================================================================
// RECORD SPENDING (Called after each AI request)
// ============================================================================

export async function recordSpending(
  costUsd: number
): Promise<{ success: boolean; budgetExceeded: boolean }> {
  const userId = await getAuthUserId();
  const db = getDb();

  const [budget] = await db
    .select()
    .from(userBudgets)
    .where(eq(userBudgets.userId, userId))
    .limit(1);

  if (!budget) {
    // Create new budget record
    await db.insert(userBudgets).values({
      userId,
      currentDayCostUsd: costUsd.toFixed(6),
      currentMonthCostUsd: costUsd.toFixed(6),
      dayResetAt: new Date(),
      monthResetAt: new Date(),
    });
    return { success: true, budgetExceeded: false };
  }

  // Check if day/month reset is needed
  const now = new Date();
  let newDayCost = parseFloat(budget.currentDayCostUsd || '0');
  let newMonthCost = parseFloat(budget.currentMonthCostUsd || '0');

  // Reset daily counter if new day
  if (budget.dayResetAt < new Date(now.setHours(0, 0, 0, 0))) {
    newDayCost = 0;
  }

  // Reset monthly counter if new month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  if (budget.monthResetAt < monthStart) {
    newMonthCost = 0;
  }

  // Add new spending
  newDayCost += costUsd;
  newMonthCost += costUsd;

  // Check if budget exceeded
  const dailyLimit = parseFloat(budget.dailyCostLimitUsd || '10');
  const monthlyLimit = parseFloat(budget.monthlyCostLimitUsd || '100');
  const budgetExceeded = newDayCost > dailyLimit || newMonthCost > monthlyLimit;

  await db
    .update(userBudgets)
    .set({
      currentDayCostUsd: newDayCost.toFixed(6),
      currentMonthCostUsd: newMonthCost.toFixed(6),
      dayResetAt: new Date(new Date().setHours(0, 0, 0, 0)),
      updatedAt: new Date(),
    })
    .where(eq(userBudgets.userId, userId));

  return { success: true, budgetExceeded };
}
