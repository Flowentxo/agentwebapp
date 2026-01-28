import { NextRequest, NextResponse } from 'next/server';
import { billingService } from '@/server/services/BillingService';
import { getSessionToken } from '@/lib/auth/cookies';
import { getSessionByToken } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const token = await getSessionToken();
        const session = token ? await getSessionByToken(token) : null;

        let userId = session?.userId;
        if (!userId) {
             userId = 'default-user'; // Consistency with other routes
        }

        let history = [];
        try {
            history = await billingService.getTransactionHistory(userId);
        } catch (dbError) {
            console.warn('[BILLING_HISTORY_GET] Database error, returning empty array:', dbError);
            // Return empty array if DB fails
        }

        return NextResponse.json({ success: true, data: history });
    } catch (error) {
        console.error('[BILLING_HISTORY_GET]', error);
        return NextResponse.json({ success: true, data: [] }, { status: 200 });
    }
}
