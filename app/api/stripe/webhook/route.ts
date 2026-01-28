/**
 * STRIPE WEBHOOK API
 *
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events for subscription management
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  constructWebhookEvent,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentSucceeded,
  handleInvoicePaymentFailed,
} from '@/lib/services/stripe-service';
import { billingService } from '@/server/services/BillingService';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Get raw body as text
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        {
          error: 'Missing Stripe signature',
        },
        { status: 400 }
      );
    }

    // Construct and verify event
    let event: Stripe.Event;

    try {
      event = constructWebhookEvent(body, signature);
    } catch (err: any) {
      console.error('[STRIPE_WEBHOOK] Signature verification failed:', err.message);
      return NextResponse.json(
        {
          error: 'Invalid signature',
        },
        { status: 400 }
      );
    }

    console.log(`[STRIPE_WEBHOOK] Received event: ${event.type} (${event.id})`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as any;
        // Handle Top-Up
        if (session.metadata?.type === 'top_up') {
          const { userId, packageId, amount, tokens } = session.metadata;
          console.log(`[STRIPE_WEBHOOK] Processing Top-Up for user ${userId}`);
          await billingService.processTopUp(
            userId,
            packageId,
            parseFloat(amount),
            parseInt(tokens)
          );
        }
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[STRIPE_WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({
      success: true,
      received: true,
    });
  } catch (error: any) {
    console.error('[STRIPE_WEBHOOK] Error:', error);

    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
