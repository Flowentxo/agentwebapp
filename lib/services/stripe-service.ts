/**
 * STRIPE SERVICE
 *
 * Handles Stripe subscription management
 * - Create checkout sessions
 * - Process webhook events
 * - Manage subscriptions
 */

import Stripe from 'stripe';
import { getDb } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema-revolution';
import { eq, and } from 'drizzle-orm';

// =====================================================
// CONFIGURATION
// =====================================================

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!STRIPE_SECRET_KEY) {
  console.warn('[STRIPE_SERVICE] STRIPE_SECRET_KEY not configured');
}

// Initialize Stripe
let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    if (!STRIPE_SECRET_KEY) {
      throw new Error('Stripe is not configured');
    }

    stripeClient = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    });

    console.log('[STRIPE_SERVICE] Initialized');
  }

  return stripeClient;
}

// =====================================================
// PLAN CONFIGURATION
// =====================================================

export interface StripePlanConfig {
  name: string;
  priceId: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  agentLimit: number;
  executionLimit: number;
  features: string[];
}

export const STRIPE_PLANS: Record<'pro' | 'enterprise', StripePlanConfig> = {
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRICE_ID_PRO || 'price_pro',
    price: 29,
    currency: 'usd',
    interval: 'month',
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
    priceId: process.env.STRIPE_PRICE_ID_ENTERPRISE || 'price_enterprise',
    price: 299,
    currency: 'usd',
    interval: 'month',
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

// =====================================================
// CHECKOUT SESSION
// =====================================================

export interface CreateCheckoutSessionParams {
  userId: string;
  userEmail: string;
  plan: 'pro' | 'enterprise';
  successUrl: string;
  cancelUrl: string;
}

/**
 * Create Stripe checkout session
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<{ sessionId: string; url: string }> {
  const stripe = getStripeClient();
  const planConfig = STRIPE_PLANS[params.plan];

  console.log(`[STRIPE_SERVICE] Creating checkout session for user ${params.userId}, plan: ${params.plan}`);

  // Get or create Stripe customer
  const db = getDb();
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, params.userId))
    .limit(1);

  let customerId = subscription?.stripeCustomerId;

  if (!customerId) {
    // Create new customer
    const customer = await stripe.customers.create({
      email: params.userEmail,
      metadata: {
        userId: params.userId,
      },
    });

    customerId = customer.id;

    // Update subscription with customer ID
    if (subscription) {
      await db
        .update(subscriptions)
        .set({ stripeCustomerId: customerId })
        .where(eq(subscriptions.id, subscription.id));
    }

    console.log(`[STRIPE_SERVICE] Created Stripe customer: ${customerId}`);
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: planConfig.priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      userId: params.userId,
      plan: params.plan,
    },
    subscription_data: {
      metadata: {
        userId: params.userId,
        plan: params.plan,
      },
    },
  });

  console.log(`[STRIPE_SERVICE] Checkout session created: ${session.id}`);

  return {
    sessionId: session.id,
    url: session.url!,
  };
}

// =====================================================
// WEBHOOK HANDLING
// =====================================================

/**
 * Construct Stripe event from webhook
 */
export function constructWebhookEvent(
  body: string | Buffer,
  signature: string
): Stripe.Event {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhook secret not configured');
  }

  const stripe = getStripeClient();

  return stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
}

/**
 * Handle subscription created event
 */
export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata.userId;
  const plan = subscription.metadata.plan as 'pro' | 'enterprise';

  if (!userId || !plan) {
    console.error('[STRIPE_SERVICE] Missing metadata in subscription:', subscription.id);
    return;
  }

  console.log(`[STRIPE_SERVICE] Subscription created: ${subscription.id} for user ${userId}, plan: ${plan}`);

  const db = getDb();
  const planConfig = STRIPE_PLANS[plan];

  // Update subscription in database
  await db
    .update(subscriptions)
    .set({
      plan,
      status: 'active',
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      agentLimit: planConfig.agentLimit,
      executionLimit: planConfig.executionLimit,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));

  console.log(`[STRIPE_SERVICE] Updated subscription for user ${userId}`);
}

/**
 * Handle subscription updated event
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.error('[STRIPE_SERVICE] Missing userId in subscription metadata:', subscription.id);
    return;
  }

  console.log(`[STRIPE_SERVICE] Subscription updated: ${subscription.id} for user ${userId}`);

  const db = getDb();

  // Determine status
  let status: 'active' | 'past_due' | 'canceled' = 'active';
  if (subscription.status === 'past_due') {
    status = 'past_due';
  } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    status = 'canceled';
  }

  await db
    .update(subscriptions)
    .set({
      status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));

  console.log(`[STRIPE_SERVICE] Updated subscription status to ${status} for user ${userId}`);
}

/**
 * Handle subscription deleted event
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.error('[STRIPE_SERVICE] Missing userId in subscription metadata:', subscription.id);
    return;
  }

  console.log(`[STRIPE_SERVICE] Subscription deleted: ${subscription.id} for user ${userId}`);

  const db = getDb();

  // Downgrade to free plan
  await db
    .update(subscriptions)
    .set({
      plan: 'free',
      status: 'active',
      stripeSubscriptionId: null,
      stripePriceId: null,
      agentLimit: 3,
      executionLimit: 100,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));

  console.log(`[STRIPE_SERVICE] Downgraded user ${userId} to free plan`);
}

/**
 * Handle invoice payment succeeded event
 */
export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<void> {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    console.warn('[STRIPE_SERVICE] Invoice has no subscription:', invoice.id);
    return;
  }

  console.log(`[STRIPE_SERVICE] Invoice payment succeeded: ${invoice.id} for subscription ${subscriptionId}`);

  // Fetch subscription to get updated period
  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const userId = subscription.metadata.userId;

  if (!userId) {
    console.error('[STRIPE_SERVICE] Missing userId in subscription metadata:', subscriptionId);
    return;
  }

  const db = getDb();

  // Extend subscription period
  await db
    .update(subscriptions)
    .set({
      status: 'active',
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));

  console.log(`[STRIPE_SERVICE] Extended subscription period for user ${userId}`);
}

/**
 * Handle invoice payment failed event
 */
export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    return;
  }

  console.log(`[STRIPE_SERVICE] Invoice payment failed: ${invoice.id} for subscription ${subscriptionId}`);

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const userId = subscription.metadata.userId;

  if (!userId) {
    return;
  }

  const db = getDb();

  // Mark as past_due
  await db
    .update(subscriptions)
    .set({
      status: 'past_due',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));

  console.log(`[STRIPE_SERVICE] Marked subscription as past_due for user ${userId}`);
}

// =====================================================
// SUBSCRIPTION MANAGEMENT
// =====================================================

/**
 * Cancel subscription
 */
export async function cancelSubscription(userId: string): Promise<void> {
  const db = getDb();

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!subscription || !subscription.stripeSubscriptionId) {
    throw new Error('No active subscription found');
  }

  const stripe = getStripeClient();

  // Cancel at period end
  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  // Update database
  await db
    .update(subscriptions)
    .set({
      cancelAtPeriodEnd: true,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));

  console.log(`[STRIPE_SERVICE] Subscription will cancel at period end for user ${userId}`);
}

/**
 * Reactivate canceled subscription
 */
export async function reactivateSubscription(userId: string): Promise<void> {
  const db = getDb();

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!subscription || !subscription.stripeSubscriptionId) {
    throw new Error('No subscription found');
  }

  const stripe = getStripeClient();

  // Remove cancel_at_period_end
  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  // Update database
  await db
    .update(subscriptions)
    .set({
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));

  console.log(`[STRIPE_SERVICE] Reactivated subscription for user ${userId}`);
}
