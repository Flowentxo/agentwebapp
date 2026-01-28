
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { budgetUsageHistory } from '@/lib/db/schema';
import { desc, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 1. Authenticate - but allow fallback
    let userId = 'default-user';
    try {
      const session = await getSession();
      if (session?.user?.id) {
        userId = session.user.id;
      }
    } catch (authError) {
      console.warn('[BUDGET_HISTORY] Auth error, using default user');
    }

    // 2. Duration (default 30 days)
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '30');

    let chartData: { date: string; tokens: number; cost: number }[] = [];

    try {
      const db = getDb();

      // 3. Fetch History
      const history = await db
        .select()
        .from(budgetUsageHistory)
        .where(
          sql`${budgetUsageHistory.userId} = ${userId} AND ${budgetUsageHistory.period} = 'day'`
        )
        .orderBy(desc(budgetUsageHistory.periodStart))
        .limit(limit);

      // 4. Format for Chart
      chartData = history.reverse().map(record => ({
        date: new Date(record.periodStart).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' }),
        tokens: record.tokensUsed,
        cost: parseFloat(record.costUsd || '0'),
      }));
    } catch (dbError) {
      console.warn('[BUDGET_HISTORY] Database error, returning empty array:', dbError);
      // Return empty array if DB fails
    }

    return NextResponse.json({ success: true, data: chartData });

  } catch (error) {
    console.error('Failed to fetch budget history:', error);
    return NextResponse.json({ success: true, data: [] }, { status: 200 });
  }
}
