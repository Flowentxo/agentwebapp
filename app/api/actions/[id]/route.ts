/**
 * ACTIONS API
 *
 * Manage custom actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { actionExecutorService } from '@/server/services/ActionExecutorService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/actions/[id]
 *
 * Get action operations
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actionId = params.id;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'test') {
      // Test action configuration
      const result = await actionExecutorService.testAction(actionId);
      return NextResponse.json(result);
    }

    if (action === 'operations') {
      // Get available operations
      const operations = await actionExecutorService.getActionOperations(actionId);
      return NextResponse.json({ operations });
    }

    return NextResponse.json(
      { error: 'Invalid action parameter. Use: test or operations' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[ACTIONS_GET]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get action info' },
      { status: 500 }
    );
  }
}
