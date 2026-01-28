import { NextRequest, NextResponse } from 'next/server';
import { budgetService } from '@/server/services/BudgetService';
import { getSessionToken } from '@/lib/auth/cookies';
import { getSessionByToken } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    // Auth Check
    const token = await getSessionToken();
    const session = token ? await getSessionByToken(token) : null;
    let userId = session?.userId;

    if (!userId) {
       // Fallback for demo environment consistency with budget/route.ts
       userId = 'default-user'; 
    }

    const body = await req.json();
    const { autoReload } = body;

    if (!autoReload) {
        return NextResponse.json({ error: 'Missing autoReload settings' }, { status: 400 });
    }

    const updatedBudget = await budgetService.updateBudgetPreferences(userId, {
        autoReload: {
            enabled: autoReload.enabled,
            threshold: autoReload.threshold,
            packageId: autoReload.packageId
        }
    });

    return NextResponse.json({ 
        success: true, 
        data: updatedBudget.metadata 
    });

  } catch (error) {
    console.error('[BUDGET_PREFS_POST]', error);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
