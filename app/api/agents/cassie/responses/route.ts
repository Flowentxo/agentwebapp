/**
 * PHASE 49-50: Cassie Response Generation API Routes
 * AI-powered response generation endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { CassieCapabilities } from '@/lib/agents/cassie';

// ============================================
// POST: Generate or process responses
// ============================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, workspaceId, ...data } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'generate': {
        if (!data.issue) {
          return NextResponse.json(
            { success: false, error: 'issue is required' },
            { status: 400 }
          );
        }

        const response = await CassieCapabilities.responses.generate({
          ticketId: data.ticketId || crypto.randomUUID(),
          workspaceId,
          customerId: data.customerId || 'anonymous',
          customerName: data.customerName,
          issue: data.issue,
          category: data.category,
          previousMessages: data.previousMessages,
          customerHistory: data.customerHistory,
          agentName: data.agentName,
          companyName: data.companyName,
          tone: data.tone,
        });

        return NextResponse.json({
          success: true,
          data: response,
        });
      }

      case 'variations': {
        if (!data.issue) {
          return NextResponse.json(
            { success: false, error: 'issue is required' },
            { status: 400 }
          );
        }

        const variations = await CassieCapabilities.responses.generateVariations(
          {
            ticketId: data.ticketId || crypto.randomUUID(),
            workspaceId,
            customerId: data.customerId || 'anonymous',
            customerName: data.customerName,
            issue: data.issue,
            category: data.category,
          },
          data.count || 3
        );

        return NextResponse.json({
          success: true,
          data: { variations },
        });
      }

      case 'from_template': {
        if (!data.templateId || !data.issue) {
          return NextResponse.json(
            { success: false, error: 'templateId and issue are required' },
            { status: 400 }
          );
        }

        const response = await CassieCapabilities.responses.suggestFromTemplate(
          {
            ticketId: data.ticketId || crypto.randomUUID(),
            workspaceId,
            customerId: data.customerId || 'anonymous',
            customerName: data.customerName,
            issue: data.issue,
            agentName: data.agentName,
            companyName: data.companyName,
          },
          data.templateId
        );

        return NextResponse.json({
          success: true,
          data: response,
        });
      }

      case 'improve': {
        if (!data.originalResponse || !data.feedback) {
          return NextResponse.json(
            { success: false, error: 'originalResponse and feedback are required' },
            { status: 400 }
          );
        }

        const improved = await CassieCapabilities.responses.improveResponse(
          data.originalResponse,
          data.feedback,
          {
            ticketId: data.ticketId || crypto.randomUUID(),
            workspaceId,
            customerId: data.customerId || 'anonymous',
            issue: data.originalResponse,
          }
        );

        return NextResponse.json({
          success: true,
          data: { content: improved },
        });
      }

      case 'translate': {
        if (!data.response || !data.targetLanguage) {
          return NextResponse.json(
            { success: false, error: 'response and targetLanguage are required' },
            { status: 400 }
          );
        }

        const translated = await CassieCapabilities.responses.translateResponse(
          data.response,
          data.targetLanguage
        );

        return NextResponse.json({
          success: true,
          data: { content: translated, language: data.targetLanguage },
        });
      }

      case 'analyze': {
        if (!data.response) {
          return NextResponse.json(
            { success: false, error: 'response is required' },
            { status: 400 }
          );
        }

        const analysis = CassieCapabilities.responses.analyzeResponse(data.response);

        return NextResponse.json({
          success: true,
          data: analysis,
        });
      }

      case 'create_template': {
        if (!data.name || !data.content || !data.category) {
          return NextResponse.json(
            { success: false, error: 'name, content, and category are required' },
            { status: 400 }
          );
        }

        const template = CassieCapabilities.responses.createTemplate({
          name: data.name,
          content: data.content,
          category: data.category,
          variables: data.variables || [],
          tone: data.tone || 'professional',
        });

        return NextResponse.json({
          success: true,
          data: template,
        });
      }

      case 'apply_quick_reply': {
        if (!data.replyId) {
          return NextResponse.json(
            { success: false, error: 'replyId is required' },
            { status: 400 }
          );
        }

        const content = CassieCapabilities.responses.applyQuickReply(data.replyId, {
          ticketId: data.ticketId || '',
          workspaceId,
          customerId: data.customerId || 'anonymous',
          customerName: data.customerName,
          issue: data.issue || '',
          agentName: data.agentName,
          companyName: data.companyName,
        });

        return NextResponse.json({
          success: true,
          data: { content },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[CASSIE_RESPONSES_POST]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Operation failed',
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET: Get templates and quick replies
// ============================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'templates': {
        const category = searchParams.get('category') || undefined;
        const templates = CassieCapabilities.responses.getTemplates(category);

        return NextResponse.json({
          success: true,
          data: { templates },
        });
      }

      case 'quick_replies': {
        const category = searchParams.get('category') || undefined;
        const quickReplies = CassieCapabilities.responses.getQuickReplies(category);

        return NextResponse.json({
          success: true,
          data: { quickReplies },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Use action=templates or action=quick_replies' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[CASSIE_RESPONSES_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch response data' },
      { status: 500 }
    );
  }
}
