/**
 * STRIPE CHECKOUT API
 *
 * POST /api/stripe/checkout
 *
 * Creates a Stripe checkout session for subscription purchase
 */

import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/services/stripe-service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const checkoutSchema = z.object({
  plan: z.enum(['pro', 'enterprise']),
  userId: z.string(),
  userEmail: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const validation = checkoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { plan, userId, userEmail } = validation.data;

    // Create checkout session
    const session = await createCheckoutSession({
      userId,
      userEmail,
      plan,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/revolution?checkout=success&plan=${plan}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/revolution?checkout=canceled`,
    });

    console.log(`[STRIPE_CHECKOUT] Created session for user ${userId}, plan: ${plan}`);

    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      url: session.url,
    });
  } catch (error: any) {
    console.error('[STRIPE_CHECKOUT] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
