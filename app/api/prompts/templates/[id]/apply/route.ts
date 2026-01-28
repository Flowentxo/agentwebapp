/**
 * API Route for Applying a Template
 * POST - Create a custom prompt from a template
 */

import { NextRequest, NextResponse } from 'next/server';
import { customPromptsService } from '@/server/services/CustomPromptsService';

/**
 * POST /api/prompts/templates/[id]/apply
 * Create a custom prompt from a template
 *
 * Body:
 * {
 *   customName?: string  // Optional custom name for the prompt
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const templateId = params.id;
    const body = await req.json().catch(() => ({}));
    const { customName } = body;

    const prompt = await customPromptsService.createFromTemplate(
      templateId,
      userId,
      customName
    );

    return NextResponse.json({
      success: true,
      data: prompt,
      message: 'Template applied successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('[APPLY_TEMPLATE]', error);

    if (error.message === 'Template not found') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to apply template' },
      { status: 500 }
    );
  }
}
