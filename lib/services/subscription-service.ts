/**
 * SUBSCRIPTION SERVICE
 *
 * Manages user subscriptions, limits, and usage tracking
 */

import { getDb } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema-revolution';
import { eq, and, sql } from 'drizzle-orm';

export interface SubscriptionLimits {
  plan: 'free' | 'pro' | 'enterprise';
  agentLimit: number;
  executionLimit: number;
  agentsCreated: number;
  executionsThisMonth: number;
  canCreateAgent: boolean;
  canExecuteAgent: boolean;
  remainingAgents: number;
  remainingExecutions: number;
}

function buildDevSubscription(): SubscriptionLimits {
  return {
    plan: 'free',
    agentLimit: -1, // treat as unlimited in dev
    executionLimit: -1,
    agentsCreated: 0,
    executionsThisMonth: 0,
    canCreateAgent: true,
    canExecuteAgent: true,
    remainingAgents: -1,
    remainingExecutions: -1,
  };
}

/**
 * Get user subscription with limits and usage
 */
export async function getUserSubscription(userId: string): Promise<SubscriptionLimits | null> {
  const db = getDb();

  try {
    // Fetch subscription
    let [subscription] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active')
        )
      )
      .limit(1);

    if (!subscription) {
      // In non-production, auto-provision a free plan to avoid blocking dev/demo flows.
      if (process.env.NODE_ENV !== 'production') {
        try {
          const now = new Date();
          const insertResult = await db
            .insert(subscriptions)
            .values({
              userId,
              plan: 'free',
              status: 'active',
              agentLimit: 3,
              executionLimit: 100,
              agentsCreated: 0,
              executionsThisMonth: 0,
              lastResetAt: now,
              createdAt: now,
              updatedAt: now,
            })
            .returning();

          subscription = insertResult[0];
          console.warn(`[SUBSCRIPTION_SERVICE] Auto-created free subscription for user: ${userId}`);
        } catch (insertError) {
          // If we cannot insert (e.g., user missing due to FK), fall back to an in-memory dev subscription
          console.warn(
            `[SUBSCRIPTION_SERVICE] Auto-create subscription failed for user ${userId}, using dev fallback:`,
            insertError
          );
          return buildDevSubscription();
        }
      } else {
        console.warn(`[SUBSCRIPTION_SERVICE] No active subscription for user: ${userId}`);
        return null;
      }
    }

    // Check if we need to reset monthly counters
    const now = new Date();
    const lastReset = subscription.lastResetAt ? new Date(subscription.lastResetAt) : new Date(0);
    const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceReset >= 30) {
      // Reset monthly counters
      await db
        .update(subscriptions)
        .set({
          executionsThisMonth: 0,
          lastResetAt: now,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, subscription.id));

      subscription.executionsThisMonth = 0;
    }

    // Calculate limits
    const remainingAgents =
      subscription.agentLimit === -1
        ? Infinity
        : Math.max(0, subscription.agentLimit - subscription.agentsCreated);

    const remainingExecutions =
      subscription.executionLimit === -1
        ? Infinity
        : Math.max(0, subscription.executionLimit - subscription.executionsThisMonth);

    return {
      plan: subscription.plan as 'free' | 'pro' | 'enterprise',
      agentLimit: subscription.agentLimit,
      executionLimit: subscription.executionLimit,
      agentsCreated: subscription.agentsCreated,
      executionsThisMonth: subscription.executionsThisMonth,
      canCreateAgent: remainingAgents > 0,
      canExecuteAgent: remainingExecutions > 0,
      remainingAgents: isFinite(remainingAgents) ? remainingAgents : -1,
      remainingExecutions: isFinite(remainingExecutions) ? remainingExecutions : -1,
    };
  } catch (error) {
    console.error('[SUBSCRIPTION_SERVICE] Error fetching subscription:', error);
    if (process.env.NODE_ENV !== 'production') {
      // Provide a permissive fallback in dev so UI flows keep working
      return buildDevSubscription();
    }
    return null;
  }
}

/**
 * Check if user can create a new agent
 */
export async function canCreateAgent(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const subscription = await getUserSubscription(userId);

  if (!subscription) {
    return { allowed: false, reason: 'No active subscription found' };
  }

  if (!subscription.canCreateAgent) {
    return {
      allowed: false,
      reason: `Agent limit reached (${subscription.agentsCreated}/${subscription.agentLimit}). Upgrade to create more agents.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can execute an agent
 */
export async function canExecuteAgent(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const subscription = await getUserSubscription(userId);

  if (!subscription) {
    return { allowed: false, reason: 'No active subscription found' };
  }

  if (!subscription.canExecuteAgent) {
    return {
      allowed: false,
      reason: `Monthly execution limit reached (${subscription.executionsThisMonth}/${subscription.executionLimit}). Upgrade for more executions.`,
    };
  }

  return { allowed: true };
}

/**
 * Increment agent count after successful creation
 */
export async function incrementAgentCount(userId: string): Promise<void> {
  const db = getDb();

  try {
    await db
      .update(subscriptions)
      .set({
        agentsCreated: sql`agents_created + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active')
        )
      );

    console.log(`[SUBSCRIPTION_SERVICE] Incremented agent count for user: ${userId}`);
  } catch (error) {
    console.error('[SUBSCRIPTION_SERVICE] Error incrementing agent count:', error);
  }
}

/**
 * Decrement agent count after agent deletion
 */
export async function decrementAgentCount(userId: string): Promise<void> {
  const db = getDb();

  try {
    await db
      .update(subscriptions)
      .set({
        agentsCreated: sql`GREATEST(0, agents_created - 1)`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active')
        )
      );

    console.log(`[SUBSCRIPTION_SERVICE] Decremented agent count for user: ${userId}`);
  } catch (error) {
    console.error('[SUBSCRIPTION_SERVICE] Error decrementing agent count:', error);
  }
}

/**
 * Increment execution count after successful execution
 */
export async function incrementExecutionCount(userId: string): Promise<void> {
  const db = getDb();

  try {
    await db
      .update(subscriptions)
      .set({
        executionsThisMonth: sql`executions_this_month + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active')
        )
      );

    console.log(`[SUBSCRIPTION_SERVICE] Incremented execution count for user: ${userId}`);
  } catch (error) {
    console.error('[SUBSCRIPTION_SERVICE] Error incrementing execution count:', error);
  }
}

/**
 * Get subscription plan details
 */
export function getPlanDetails(plan: 'free' | 'pro' | 'enterprise') {
  const plans = {
    free: {
      name: 'Free',
      price: 0,
      agentLimit: 3,
      executionLimit: 100,
      features: [
        'Up to 3 custom agents',
        '100 executions per month',
        'Basic integrations',
        'Community support',
      ],
    },
    pro: {
      name: 'Pro',
      price: 29,
      agentLimit: 50,
      executionLimit: 5000,
      features: [
        'Up to 50 custom agents',
        '5,000 executions per month',
        'All integrations',
        'Priority support',
        'Advanced analytics',
      ],
    },
    enterprise: {
      name: 'Enterprise',
      price: 299,
      agentLimit: -1, // Unlimited
      executionLimit: -1, // Unlimited
      features: [
        'Unlimited custom agents',
        'Unlimited executions',
        'All integrations',
        'Dedicated support',
        'Custom SLA',
        'White-label options',
      ],
    },
  };

  return plans[plan];
}
