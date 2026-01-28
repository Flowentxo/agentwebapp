/**
 * API Routes for Individual Custom Prompt Management
 * GET    - Get specific prompt by ID
 * PUT    - Update prompt
 * DELETE - Delete prompt
 */

import { NextRequest, NextResponse } from 'next/server';
import { customPromptsService } from '@/server/services/CustomPromptsService';

/**
 * GET /api/prompts/custom/[id]
 * Get a specific custom prompt
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const promptId = params.id;

    const prompt = await customPromptsService.getPromptById(promptId, userId);

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: prompt,
    });
  } catch (error) {
    console.error('[GET_CUSTOM_PROMPT]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch prompt' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/prompts/custom/[id]
 * Update a custom prompt
 *
 * Body:
 * {
 *   name?: string,
 *   description?: string,
 *   promptText?: string,
 *   isActive?: boolean,
 *   metadata?: string
 * }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const promptId = params.id;
    const updates = await req.json();

    // Validate promptText length if provided
    if (updates.promptText && updates.promptText.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Prompt text must be at least 10 characters' },
        { status: 400 }
      );
    }

    const updatedPrompt = await customPromptsService.updatePrompt(
      promptId,
      userId,
      updates
    );

    return NextResponse.json({
      success: true,
      data: updatedPrompt,
    });
  } catch (error: any) {
    console.error('[UPDATE_CUSTOM_PROMPT]', error);

    if (error.message === 'Prompt not found or unauthorized') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update prompt' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/prompts/custom/[id]
 * Delete a custom prompt
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const promptId = params.id;

    await customPromptsService.deletePrompt(promptId, userId);

    return NextResponse.json({
      success: true,
      message: 'Prompt deleted successfully',
    });
  } catch (error: any) {
    console.error('[DELETE_CUSTOM_PROMPT]', error);

    if (error.message === 'Prompt not found or unauthorized') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete prompt' },
      { status: 500 }
    );
  }
}
