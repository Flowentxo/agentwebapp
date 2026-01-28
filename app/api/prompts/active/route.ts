/**
 * API Route for Getting Active Prompt
 * GET - Get the currently active/default prompt for a user and agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { customPromptsService } from '@/server/services/CustomPromptsService';

/**
 * GET /api/prompts/active?agentId=<id>
 * Get the active/default prompt for the current user and agent
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'agentId is required' },
        { status: 400 }
      );
    }

    const prompt = await customPromptsService.getActivePrompt(userId, agentId);

    if (!prompt) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No custom prompt set for this agent',
      });
    }

    return NextResponse.json({
      success: true,
      data: prompt,
    });
  } catch (error) {
    console.error('[GET_ACTIVE_PROMPT]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch active prompt' },
      { status: 500 }
    );
  }
}
