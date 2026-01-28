/**
 * Dexter Financial Analyst - Chat API Endpoint
 * SECURED: JWT Authentication Required
 *
 * POST /api/agents/dexter/chat - Send message and receive streaming response
 * GET  /api/agents/dexter/chat - Get conversation history
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDexterService } from '@/lib/agents/dexter/dexter-service';
import { withAuth, requireWorkspaceId, AuthConfigs } from '@/lib/auth/jwt-middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST - Send message to Dexter with streaming response (AUTHENTICATION REQUIRED)
 */
export const POST = withAuth(async (req: NextRequest, auth) => {
  const encoder = new TextEncoder();

  try {
    const { content } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Require workspace ID for multi-tenant security
    const workspaceId = requireWorkspaceId(req);

    console.log(`[Dexter API] Authenticated request from user: ${auth.userId}, workspace: ${workspaceId}`);

    // Get Dexter service
    const dexter = getDexterService();

    // Create readable stream for response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Get streaming response from Dexter with user context
          const responseStream = await dexter.chat(content, {
            userId: auth.userId,
            workspaceId: workspaceId,
            timestamp: new Date().toISOString(),
          });

          // Stream chunks to client
          for await (const chunk of responseStream) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }

          // Send completion signal
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        } catch (error) {
          console.error('[Dexter API] Stream error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
              })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Dexter API] POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}, AuthConfigs.agent);

/**
 * GET - Get conversation metadata (AUTHENTICATION REQUIRED)
 */
export const GET = withAuth(async (req: NextRequest, auth) => {
  try {
    // Require workspace ID for multi-tenant security
    const workspaceId = requireWorkspaceId(req);

    console.log(`[Dexter API] GET request from user: ${auth.userId}, workspace: ${workspaceId}`);

    const dexter = getDexterService();
    const metadata = dexter.getMetadata();

    return NextResponse.json({
      success: true,
      agent: metadata,
      status: 'active',
      user: auth.userId,
      workspace: workspaceId,
    });
  } catch (error) {
    console.error('[Dexter API] GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}, AuthConfigs.agent);

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-workspace-id',
    },
  });
}
