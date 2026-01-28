/**
 * SUBSCRIPTION STATUS API
 *
 * GET /api/revolution/subscription
 *
 * Returns user's subscription status and usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserSubscription } from '@/lib/services/subscription-service';
import { getDb } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema-revolution';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Missing user ID',
          message: 'x-user-id header is required',
        },
        { status: 400 }
      );
    }

    // Get subscription with limits
    const subscriptionLimits = await getUserSubscription(userId);

    if (!subscriptionLimits) {
      return NextResponse.json(
        {
          error: 'No subscription found',
          message: 'User has no active subscription',
        },
        { status: 404 }
      );
    }

    // Get full subscription details
    const db = getDb();
    const [fullSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    return NextResponse.json({
      success: true,
      subscription: {
        // Plan info
        plan: subscriptionLimits.plan,
        status: fullSubscription?.status || 'active',

        // Limits
        agentLimit: subscriptionLimits.agentLimit,
        executionLimit: subscriptionLimits.executionLimit,

        // Usage
        agentsCreated: subscriptionLimits.agentsCreated,
        executionsThisMonth: subscriptionLimits.executionsThisMonth,

        // Remaining
        remainingAgents: subscriptionLimits.remainingAgents,
        remainingExecutions: subscriptionLimits.remainingExecutions,

        // Permissions
        canCreateAgent: subscriptionLimits.canCreateAgent,
        canExecuteAgent: subscriptionLimits.canExecuteAgent,

        // Billing
        currentPeriodStart: fullSubscription?.currentPeriodStart,
        currentPeriodEnd: fullSubscription?.currentPeriodEnd,
        cancelAtPeriodEnd: fullSubscription?.cancelAtPeriodEnd,

        // Stripe
        stripeCustomerId: fullSubscription?.stripeCustomerId,
        stripeSubscriptionId: fullSubscription?.stripeSubscriptionId,
      },
    });
  } catch (error: any) {
    console.error('[SUBSCRIPTION_STATUS]', error);
    return NextResponse.json(
      {
        error: 'Failed to get subscription status',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
