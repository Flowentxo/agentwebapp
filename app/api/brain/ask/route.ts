/**
 * Brain AI - Ask Q&A API
 *
 * POST /api/brain/ask - Ask a question with RAG-powered answer
 *
 * Features:
 * - Natural language Q&A
 * - Multi-source synthesis
 * - Confidence scoring
 * - Source attribution
 * - Streaming support
 */

import { NextRequest, NextResponse } from 'next/server';
import { enhancedRAG, RAGResponse } from '@/lib/brain/EnhancedRAG';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AskRequest {
  question: string;
  workspaceId?: string;
  stream?: boolean;
  options?: {
    useReranking?: boolean;
    expandQuery?: boolean;
    topK?: number;
    model?: string;
  };
}

/**
 * POST - Ask a question
 */
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const body: AskRequest = await req.json();

    if (!body.question?.trim()) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    const workspaceId = body.workspaceId || 'default-workspace';

    // Build RAG config from options
    const ragOptions = body.options ? {
      retrieval: {
        useReranking: body.options.useReranking ?? true,
        expandQuery: body.options.expandQuery ?? true,
        topK: body.options.topK ?? 10,
        strategy: 'hybrid' as const,
        minRelevance: 0.3
      },
      generation: body.options.model ? { model: body.options.model } : undefined
    } : undefined;

    // Handle streaming response
    if (body.stream) {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            const generator = enhancedRAG.queryStream(
              body.question,
              workspaceId,
              userId,
              ragOptions as Parameters<typeof enhancedRAG.queryStream>[3]
            );

            for await (const event of generator) {
              const data = JSON.stringify(event);
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          } catch (error) {
            console.error('[ASK_API] Stream error:', error);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'error', data: 'Stream failed' })}\n\n`)
            );
          } finally {
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming response
    const response: RAGResponse = await enhancedRAG.query(
      body.question,
      workspaceId,
      userId,
      ragOptions as Parameters<typeof enhancedRAG.query>[3]
    );

    return NextResponse.json({
      success: true,
      answer: response.answer,
      confidence: response.confidence,
      confidenceScore: response.confidenceScore,
      sources: response.sources,
      followUpQuestions: response.followUpQuestions,
      meta: {
        tokensUsed: response.tokensUsed,
        latencyMs: response.latencyMs,
        model: response.model
      }
    });
  } catch (error) {
    console.error('[ASK_API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    );
  }
}
