/**
 * Model Preferences API
 * GET /api/models/preferences - Get user's model preferences
 * PUT /api/models/preferences - Update preferred model
 */

import { NextRequest, NextResponse } from 'next/server';
import { budgetService } from '@/server/services/BudgetService';
import { getSessionToken } from '@/lib/auth/cookies';
import { getSessionByToken } from '@/lib/auth/session';

async function getUserId(req: NextRequest): Promise<string | null> {
  try {
    const token = await getSessionToken();
    if (token) {
      const session = await getSessionByToken(token);
      if (session?.userId) {
        return session.userId;
      }
    }
  } catch (error) {
    console.log('[AUTH] No valid session');
  }

  return 'default-user';
}

/**
 * GET /api/models/preferences - Get model preferences
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await budgetService.getModelPreferences(userId);

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('[MODEL_PREFERENCES_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch model preferences' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/models/preferences - Update preferred model or auto-optimization setting
 * Body: { modelId?: string, autoCostOptimization?: boolean }
 */
export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { modelId, autoCostOptimization } = await req.json();

    // Handle model change
    if (modelId) {
      await budgetService.setPreferredModel(userId, modelId);
    }

    // Handle auto-optimization toggle
    if (typeof autoCostOptimization === 'boolean') {
      await budgetService.setAutoCostOptimization(userId, autoCostOptimization);
    }

    // Return updated preferences
    const preferences = await budgetService.getModelPreferences(userId);

    return NextResponse.json({
      success: true,
      data: preferences,
      message: 'Preferences updated successfully',
    });
  } catch (error: any) {
    console.error('[MODEL_PREFERENCES_PUT]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update preferences' },
      { status: 400 }
    );
  }
}
