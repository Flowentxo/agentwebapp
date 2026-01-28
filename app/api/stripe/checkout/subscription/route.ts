import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createCheckoutSession } from '@/lib/services/stripe-service';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const { plan } = await req.json();
    
    if (plan !== 'pro' && plan !== 'enterprise') {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const { url } = await createCheckoutSession({
        userId: session.user.id,
        userEmail: session.user.email || '',
        plan: plan,
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/budget?subscription_success=true`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/budget?subscription_canceled=true`,
    });

    return NextResponse.json({ url });

  } catch (error) {
    console.error('[STRIPE_SUBSCRIPTION]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
