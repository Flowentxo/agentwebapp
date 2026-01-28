/**
 * API Routes for User Custom Prompts
 * GET    - Get all user prompts for an agent
 * POST   - Create new custom prompt
 */

import { NextRequest, NextResponse } from 'next/server';
import { customPromptsService } from '@/server/services/CustomPromptsService';

/**
 * GET /api/prompts/custom?agentId=<id>
 * Get all custom prompts for the current user and agent
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

    const prompts = await customPromptsService.getUserPrompts(userId, agentId);

    return NextResponse.json({
      success: true,
      data: prompts,
    });
  } catch (error) {
    console.error('[GET_CUSTOM_PROMPTS]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch custom prompts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/prompts/custom
 * Create a new custom prompt
 *
 * Body:
 * {
 *   agentId: string,
 *   name: string,
 *   description?: string,
 *   promptText: string,
 *   isActive?: boolean,
 *   isDefault?: boolean,
 *   metadata?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const body = await req.json();

    const { agentId, name, description, promptText, isActive, isDefault, metadata } = body;

    // Validation
    if (!agentId || !name || !promptText) {
      return NextResponse.json(
        { success: false, error: 'agentId, name, and promptText are required' },
        { status: 400 }
      );
    }

    if (promptText.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Prompt text must be at least 10 characters' },
        { status: 400 }
      );
    }

    const prompt = await customPromptsService.createPrompt({
      userId,
      agentId,
      name,
      description: description || null,
      promptText,
      isActive: isActive !== undefined ? isActive : true,
      isDefault: isDefault !== undefined ? isDefault : false,
      metadata: metadata || null,
    });

    return NextResponse.json({
      success: true,
      data: prompt,
    }, { status: 201 });
  } catch (error) {
    console.error('[CREATE_CUSTOM_PROMPT]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create custom prompt' },
      { status: 500 }
    );
  }
}
