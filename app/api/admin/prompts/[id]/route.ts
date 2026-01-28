/**
 * PROMPT DETAIL API
 *
 * Phase 4.1 - Prompt Registry & Lab
 *
 * Endpoints for managing individual prompts.
 *
 * GET    /api/admin/prompts/[id] - Get prompt details
 * PUT    /api/admin/prompts/[id] - Update prompt metadata
 * DELETE /api/admin/prompts/[id] - Delete a prompt
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPromptService } from '@/server/services/PromptService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/prompts/[id]
 *
 * Get a single prompt with its active version content
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const promptService = getPromptService();

    const prompt = await promptService.getPromptById(id);

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
    console.error('[PROMPT_DETAIL_API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch prompt' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/prompts/[id]
 *
 * Update prompt metadata (not content - use versions for that)
 *
 * Body:
 * {
 *   name?: string,
 *   description?: string,
 *   category?: string,
 *   agentId?: string,
 *   tags?: string[],
 *   status?: string,
 * }
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const userId = req.headers.get('x-user-id') || 'system';

    const promptService = getPromptService();

    // Check if prompt exists
    const existing = await promptService.getPromptById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }

    // Update the prompt
    const updated = await promptService.updatePrompt(id, {
      name: body.name,
      description: body.description,
      category: body.category,
      agentId: body.agentId,
      tags: body.tags,
      status: body.status,
      updatedBy: userId,
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('[PROMPT_DETAIL_API] PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update prompt' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/prompts/[id]
 *
 * Delete a prompt and all its versions
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const promptService = getPromptService();

    // Check if prompt exists
    const existing = await promptService.getPromptById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of system prompts
    if (existing.category === 'system') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete system prompts' },
        { status: 403 }
      );
    }

    const deleted = await promptService.deletePrompt(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete prompt' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Prompt deleted successfully',
    });
  } catch (error) {
    console.error('[PROMPT_DETAIL_API] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete prompt' },
      { status: 500 }
    );
  }
}
