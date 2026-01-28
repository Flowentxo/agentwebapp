/**
 * ACTION EXECUTION API
 *
 * Execute custom actions from agents
 */

import { NextRequest, NextResponse } from 'next/server';
import { actionExecutorService } from '@/server/services/ActionExecutorService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/actions/execute
 *
 * Execute a custom action
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      actionId,
      agentId,
      operationId,
      parameters,
      userId,
      workspaceId,
      conversationId,
    } = body;

    // Validation
    if (!actionId || !agentId || !operationId) {
      return NextResponse.json(
        { error: 'Missing required fields: actionId, agentId, operationId' },
        { status: 400 }
      );
    }

    // Execute action
    const result = await actionExecutorService.executeAction(
      {
        actionId,
        agentId,
        userId: userId || 'default-user',
        workspaceId,
        conversationId,
      },
      operationId,
      parameters || {}
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        executionTime: result.executionTime,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          executionTime: result.executionTime,
        },
        { status: result.statusCode || 500 }
      );
    }
  } catch (error: any) {
    console.error('[ACTIONS_EXECUTE]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute action' },
      { status: 500 }
    );
  }
}
