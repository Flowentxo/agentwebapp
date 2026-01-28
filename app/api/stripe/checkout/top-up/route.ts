import { NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/services/stripe-service';
import { getSession } from '@/lib/auth/session';

export async function POST(req: Request) {
  try {
    // 1. Authenticate
    const session = await getSession();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    const userEmail = session.user.email;

    const body = await req.json();
    const { packageId, amount, tokens } = body;

    if (!packageId || !amount || !tokens) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Create Stripe Checkout Session
    const stripe = getStripeClient();
    
    // We need a price ID or we can create line items on the fly for one-time payments
    // For simplicity/flexibility, we'll use ad-hoc line items here since packages might change.
    // In production, you'd want defined Price IDs in Stripe.
    
    // Convert amount to cents (USD)
    const unitAmount = Math.round(amount * 100);

    const sessionStripe = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Credit Top-Up: ${tokens} Tokens`,
              description: `Package ${packageId}`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/budget?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/budget?canceled=true`,
      metadata: {
        type: 'top_up',
        userId: userId,
        packageId: String(packageId),
        tokens: String(tokens),
        amount: String(amount)
      },
      customer_email: userEmail || undefined, 
    });

    return NextResponse.json({ url: sessionStripe.url });

  } catch (error) {
    console.error('[STRIPE_TOPUP]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
