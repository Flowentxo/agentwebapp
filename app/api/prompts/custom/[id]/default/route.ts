/**
 * API Route for Setting Default Prompt
 * PUT - Set a prompt as the default for its agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { customPromptsService } from '@/server/services/CustomPromptsService';

/**
 * PUT /api/prompts/custom/[id]/default
 * Set a custom prompt as the default for its agent
 *
 * Body:
 * {
 *   agentId: string
 * }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const promptId = params.id;
    const { agentId } = await req.json();

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'agentId is required' },
        { status: 400 }
      );
    }

    const updatedPrompt = await customPromptsService.setDefaultPrompt(
      promptId,
      userId,
      agentId
    );

    return NextResponse.json({
      success: true,
      data: updatedPrompt,
      message: 'Prompt set as default',
    });
  } catch (error: any) {
    console.error('[SET_DEFAULT_PROMPT]', error);

    if (error.message === 'Prompt not found or unauthorized') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to set default prompt' },
      { status: 500 }
    );
  }
}
