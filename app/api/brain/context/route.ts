/**
 * Brain AI Context API
 * Endpoint: /api/brain/context
 * Manages session contexts and conversation snapshots
 *
 * SECURITY: Protected with API Key authentication, rate limiting, RBAC
 * POST/DELETE: Requires editor role, context:write permission
 * GET: Requires viewer role, context:read permission
 */

import { NextRequest, NextResponse } from 'next/server';
import { contextManager, type SessionContext } from '@/lib/brain';
import { withBrainSecurity, type SecurityContext } from '@/lib/brain/security/SecurityMiddleware';
import { BRAIN_PERMISSIONS } from '@/lib/db/schema-brain-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ContextUpsertRequest {
  sessionId: string;
  userId: string;
  agentId?: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
  summary?: string;
  intent?: string;
  entities?: Record<string, any>;
  topics?: string[];
  keyPoints?: string[];
  metadata?: Record<string, any>;
}

interface ContextQueryRequest {
  workspaceId?: string;
  userId?: string;
  agentId?: string;
  sessionId?: string;
  limit?: number;
  includeInactive?: boolean;
}

// POST - Create/Update context
export const POST = withBrainSecurity(
  async (req: NextRequest, context: SecurityContext) => {
    try {
      const body: ContextUpsertRequest = await req.json();

      // Validation
      if (!body.sessionId) {
        return NextResponse.json(
          { error: 'sessionId is required' },
          { status: 400 }
        );
      }

      // Use authenticated user's ID if not provided
      const userId = body.userId || context.userId;

    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: 'messages array is required' },
        { status: 400 }
      );
    }

    // Validate messages
    for (const msg of body.messages) {
      if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role)) {
        return NextResponse.json(
          { error: 'Each message must have a valid role (user, assistant, or system)' },
          { status: 400 }
        );
      }
      if (!msg.content) {
        return NextResponse.json(
          { error: 'Each message must have content' },
          { status: 400 }
        );
      }
      if (!msg.timestamp) {
        return NextResponse.json(
          { error: 'Each message must have a timestamp' },
          { status: 400 }
        );
      }
    }

      const sessionContext: SessionContext = {
        sessionId: body.sessionId,
        userId: userId!,
        agentId: body.agentId || context.agentId,
        messages: body.messages,
        summary: body.summary,
        intent: body.intent,
        entities: body.entities,
        topics: body.topics,
        keyPoints: body.keyPoints,
        metadata: body.metadata,
      };

      const contextId = await contextManager.upsertSessionContext(sessionContext);

      return NextResponse.json({
        success: true,
        contextId,
        sessionId: body.sessionId,
        messageCount: body.messages.length,
      });
    } catch (error: any) {
      console.error('[Brain Context API POST] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to upsert context',
          message: error.message,
        },
        { status: 500 }
      );
    }
  },
  {
    requireAuth: true,
    requireRole: 'editor',
    requireScopes: [BRAIN_PERMISSIONS.CONTEXT_WRITE],
    rateLimitKey: 'user',
  }
);

// GET - Retrieve context(s)
export const GET = withBrainSecurity(
  async (req: NextRequest, context: SecurityContext) => {
    try {
      const searchParams = req.nextUrl.searchParams;
      const sessionId = searchParams.get('sessionId');

      // If sessionId provided, get specific session
      if (sessionId) {
        const sessionContext = await contextManager.getSessionContext(sessionId);

        if (!sessionContext) {
          return NextResponse.json(
            { error: 'Session not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          context: sessionContext,
        });
      }

      // Otherwise, query contexts with filters
      const workspaceId = searchParams.get('workspaceId') || context.workspaceId || undefined;
      const userId = searchParams.get('userId') || context.userId || undefined;
      const agentId = searchParams.get('agentId') || context.agentId || undefined;
      const limit = parseInt(searchParams.get('limit') || '10');
      const includeInactive = searchParams.get('includeInactive') === 'true';

      const contexts = await contextManager.queryContexts({
        workspaceId,
        userId,
        agentId,
        limit,
        includeInactive,
      });

      return NextResponse.json({
        success: true,
        contexts: contexts.map(ctx => ({
          id: ctx.id,
          sessionId: ctx.sessionId,
          userId: ctx.userId,
          agentId: ctx.agentId,
          contextType: ctx.contextType,
          relevanceScore: ctx.relevanceScore,
          tokenCount: ctx.tokenCount,
          isActive: ctx.isActive,
          createdAt: ctx.createdAt,
          updatedAt: ctx.updatedAt,
          snapshot: ctx.contextSnapshot,
        })),
        total: contexts.length,
      });
    } catch (error: any) {
      console.error('[Brain Context API GET] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to retrieve contexts',
          message: error.message,
        },
        { status: 500 }
      );
    }
  },
  {
    requireAuth: true,
    requireRole: 'viewer',
    requireScopes: [BRAIN_PERMISSIONS.CONTEXT_READ],
    rateLimitKey: 'user',
  }
);

// DELETE - Archive context
export const DELETE = withBrainSecurity(
  async (req: NextRequest, context: SecurityContext) => {
    try {
      const searchParams = req.nextUrl.searchParams;
      const contextId = searchParams.get('contextId');

      if (!contextId) {
        return NextResponse.json(
          { error: 'contextId is required' },
          { status: 400 }
        );
      }

      const success = await contextManager.archiveContext(contextId);

      if (!success) {
        return NextResponse.json(
          { error: 'Context not found or already archived' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Context archived successfully',
        contextId,
      });
    } catch (error: any) {
      console.error('[Brain Context API DELETE] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to archive context',
          message: error.message,
        },
        { status: 500 }
      );
    }
  },
  {
    requireAuth: true,
    requireRole: 'editor',
    requireScopes: [BRAIN_PERMISSIONS.CONTEXT_DELETE],
    rateLimitKey: 'user',
  }
);
