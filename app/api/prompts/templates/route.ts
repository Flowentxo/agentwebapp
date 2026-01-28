/**
 * API Routes for Prompt Templates
 * GET - Get all available templates (optionally filtered by agent/category)
 */

import { NextRequest, NextResponse } from 'next/server';
import { customPromptsService } from '@/server/services/CustomPromptsService';

/**
 * GET /api/prompts/templates?agentId=<id>&category=<category>&search=<query>
 * Get all available prompt templates
 *
 * Query params:
 * - agentId: Filter by agent (optional)
 * - category: Filter by category (optional)
 * - search: Search by keyword (optional)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId') || undefined;
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search');

    let templates;

    if (search) {
      templates = await customPromptsService.searchTemplates(search, agentId);
    } else {
      templates = await customPromptsService.getTemplates(agentId, category);
    }

    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('[GET_TEMPLATES]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
