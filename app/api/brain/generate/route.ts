/**
 * Brain AI - Content Generation API
 *
 * POST /api/brain/generate - Generate content with AI Writer
 *
 * Features:
 * - Role-based generation
 * - Template support
 * - Thread summarization
 * - Content improvement
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiWriter, WriterConfig, ThreadMessage } from '@/lib/brain/AIWriter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GenerateRequest {
  action: 'generate' | 'summarize' | 'improve' | 'variations';

  // For generate action
  input?: string;
  role?: WriterConfig['role'];
  template?: WriterConfig['template'];
  tone?: WriterConfig['tone'];
  language?: 'de' | 'en';
  maxLength?: 'short' | 'medium' | 'long';
  includeCallToAction?: boolean;

  // For summarize action
  messages?: ThreadMessage[];
  focusOn?: 'decisions' | 'action-items' | 'key-points' | 'all';

  // For improve action
  content?: string;
  instructions?: string;

  // For variations action
  count?: number;
  variationType?: 'tone' | 'length' | 'style';
}

/**
 * POST - Generate content
 */
export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();

    switch (body.action) {
      case 'generate': {
        if (!body.input?.trim()) {
          return NextResponse.json(
            { error: 'Input is required for generation' },
            { status: 400 }
          );
        }

        const result = await aiWriter.generate(body.input, {
          role: body.role || 'general',
          template: body.template,
          tone: body.tone,
          language: body.language,
          maxLength: body.maxLength,
          includeCallToAction: body.includeCallToAction
        });

        return NextResponse.json({
          success: true,
          result: {
            content: result.content,
            title: result.title,
            sections: result.sections,
            metadata: result.metadata,
            suggestions: result.suggestions
          }
        });
      }

      case 'summarize': {
        if (!body.messages || body.messages.length === 0) {
          return NextResponse.json(
            { error: 'Messages are required for summarization' },
            { status: 400 }
          );
        }

        const summary = await aiWriter.summarizeThread(body.messages, {
          maxLength: body.maxLength,
          focusOn: body.focusOn
        });

        return NextResponse.json({
          success: true,
          summary
        });
      }

      case 'improve': {
        if (!body.content?.trim() || !body.instructions?.trim()) {
          return NextResponse.json(
            { error: 'Content and instructions are required' },
            { status: 400 }
          );
        }

        const improved = await aiWriter.improve(
          body.content,
          body.instructions,
          {
            role: body.role,
            tone: body.tone
          }
        );

        return NextResponse.json({
          success: true,
          result: improved
        });
      }

      case 'variations': {
        if (!body.content?.trim()) {
          return NextResponse.json(
            { error: 'Content is required for variations' },
            { status: 400 }
          );
        }

        const variations = await aiWriter.generateVariations(
          body.content,
          body.count || 3,
          body.variationType || 'tone'
        );

        return NextResponse.json({
          success: true,
          variations
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: generate, summarize, improve, or variations' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[GENERATE_API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}

/**
 * GET - Get available roles and templates
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const role = url.searchParams.get('role');

  const roles = aiWriter.getRoles();

  if (role) {
    const templates = aiWriter.getTemplates(role as WriterConfig['role']);
    return NextResponse.json({
      success: true,
      role,
      templates
    });
  }

  return NextResponse.json({
    success: true,
    roles,
    tones: ['professional', 'casual', 'formal', 'friendly', 'technical', 'persuasive', 'concise']
  });
}
