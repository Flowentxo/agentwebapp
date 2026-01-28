import { NextRequest, NextResponse } from 'next/server';
import { agentConnector } from '@/lib/platform/agent-connector';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/connection';
import { agentMessages, agentConversations } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * POST /api/platform/agents/[id]/chat
 * Send message to external agent
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    if (!body.message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get workspace ID from header or use default
    const workspaceId = req.headers.get('x-workspace-id') || 'default-workspace';

    const db = getDb();

    // Save user message to DB
    const [userMessage] = await db
      .insert(agentMessages)
      .values({
        agentId: params.id,
        userId: session.user.id,
        workspaceId,
        content: body.message,
        role: 'user',
        metadata: {},
      })
      .returning();

    // Send message to external agent
    const response = await agentConnector.sendMessage(
      params.id,
      body.message,
      {
        userId: session.user.id,
        conversationId: body.conversationId,
        metadata: body.metadata,
      }
    );

    if (!response.success) {
      return NextResponse.json(
        { error: response.error || 'Agent request failed' },
        { status: 500 }
      );
    }

    // Save agent response to DB
    const [assistantMessage] = await db
      .insert(agentMessages)
      .values({
        agentId: params.id,
        userId: session.user.id,
        workspaceId,
        content: response.message || '',
        role: 'assistant',
        metadata: response.metadata || {},
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: response.message,
      data: response.data,
      metadata: response.metadata,
      messageId: assistantMessage.id,
    });
  } catch (error) {
    console.error('Chat request failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chat request failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/platform/agents/[id]/chat
 * Get chat history with agent
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const db = getDb();

    const messages = await db
      .select()
      .from(agentMessages)
      .where(
        and(
          eq(agentMessages.agentId, params.id),
          eq(agentMessages.userId, session.user.id)
        )
      )
      .orderBy(desc(agentMessages.createdAt))
      .limit(limit);

    return NextResponse.json({
      messages: messages.reverse(), // Oldest first
      total: messages.length,
    });
  } catch (error) {
    console.error('Failed to get chat history:', error);
    return NextResponse.json(
      { error: 'Failed to get chat history' },
      { status: 500 }
    );
  }
}
