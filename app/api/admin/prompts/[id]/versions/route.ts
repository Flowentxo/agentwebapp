/**
 * PROMPT VERSIONS API
 *
 * Phase 4.1 - Prompt Registry & Lab
 *
 * Endpoints for managing prompt versions.
 *
 * GET  /api/admin/prompts/[id]/versions - List all versions
 * POST /api/admin/prompts/[id]/versions - Create new version
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPromptService } from '@/server/services/PromptService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/prompts/[id]/versions
 *
 * List all versions of a prompt (newest first)
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const promptService = getPromptService();

    // Check if prompt exists
    const prompt = await promptService.getPromptById(id);
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }

    const versions = await promptService.listVersions(id);

    return NextResponse.json({
      success: true,
      data: versions,
      promptId: id,
      promptSlug: prompt.slug,
    });
  } catch (error) {
    console.error('[PROMPT_VERSIONS_API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/prompts/[id]/versions
 *
 * Create a new version of a prompt
 *
 * Body:
 * {
 *   content: string,       // The prompt content
 *   changeNote?: string,   // Optional change description
 *   setActive?: boolean,   // Whether to set as active (default: false)
 * }
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const userId = req.headers.get('x-user-id') || 'system';

    // Validate required fields
    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    const promptService = getPromptService();

    // Check if prompt exists
    const prompt = await promptService.getPromptById(id);
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }

    // Create new version
    const version = await promptService.createVersion({
      promptId: id,
      content: body.content,
      changeNote: body.changeNote,
      createdBy: userId,
      setActive: body.setActive ?? false,
    });

    return NextResponse.json({
      success: true,
      data: version,
    }, { status: 201 });
  } catch (error) {
    console.error('[PROMPT_VERSIONS_API] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create version' },
      { status: 500 }
    );
  }
}
