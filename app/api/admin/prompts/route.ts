/**
 * PROMPT REGISTRY API
 *
 * Phase 4.1 - Prompt Registry & Lab
 *
 * Endpoints for managing prompts in the registry.
 *
 * GET  /api/admin/prompts       - List all prompts
 * POST /api/admin/prompts       - Create a new prompt
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPromptService } from '@/server/services/PromptService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/prompts
 *
 * List all prompts with optional filtering
 *
 * Query params:
 * - category: Filter by category (system, agent, tool, template, experiment, custom)
 * - status: Filter by status (draft, active, deprecated, archived)
 * - agentId: Filter by agent ID
 * - search: Search in name and slug
 * - limit: Number of results (default: 50)
 * - offset: Pagination offset (default: 0)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const options = {
      category: searchParams.get('category') || undefined,
      status: searchParams.get('status') || undefined,
      agentId: searchParams.get('agentId') || undefined,
      search: searchParams.get('search') || undefined,
      limit: parseInt(searchParams.get('limit') || '50', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
    };

    const promptService = getPromptService();
    const result = await promptService.listPrompts(options);

    return NextResponse.json({
      success: true,
      data: result.prompts,
      total: result.total,
      limit: options.limit,
      offset: options.offset,
    });
  } catch (error) {
    console.error('[PROMPTS_API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch prompts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/prompts
 *
 * Create a new prompt with initial version
 *
 * Body:
 * {
 *   slug: string,           // Unique identifier
 *   name: string,           // Display name
 *   description?: string,   // Optional description
 *   category?: string,      // Category (default: 'agent')
 *   agentId?: string,       // Optional agent association
 *   tags?: string[],        // Optional tags
 *   initialContent: string, // The prompt content
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.slug || typeof body.slug !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Slug is required' },
        { status: 400 }
      );
    }

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!body.initialContent || typeof body.initialContent !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Initial content is required' },
        { status: 400 }
      );
    }

    // Validate slug format (alphanumeric and hyphens only)
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(body.slug)) {
      return NextResponse.json(
        { success: false, error: 'Slug must be lowercase alphanumeric with hyphens' },
        { status: 400 }
      );
    }

    const promptService = getPromptService();

    // Check if slug is available
    const isAvailable = await promptService.isSlugAvailable(body.slug);
    if (!isAvailable) {
      return NextResponse.json(
        { success: false, error: 'Slug already exists' },
        { status: 409 }
      );
    }

    // Get user ID from headers (set by auth middleware)
    const userId = req.headers.get('x-user-id') || 'system';

    // Create the prompt
    const prompt = await promptService.createPrompt({
      slug: body.slug,
      name: body.name,
      description: body.description,
      category: body.category,
      agentId: body.agentId,
      tags: body.tags,
      initialContent: body.initialContent,
      createdBy: userId,
    });

    return NextResponse.json({
      success: true,
      data: prompt,
    }, { status: 201 });
  } catch (error) {
    console.error('[PROMPTS_API] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create prompt' },
      { status: 500 }
    );
  }
}
