import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { agentMessages, agentConversations } from '@/lib/db/schema';
import { getSessionToken } from '@/lib/auth/cookies';
import { getSessionByToken } from '@/lib/auth/session';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getAgentById } from '@/lib/agents/personas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper to get user ID from session
async function getUserId(req: NextRequest): Promise<string> {
  try {
    const token = await getSessionToken();
    if (token) {
      const session = await getSessionByToken(token);
      if (session?.userId) {
        return session.userId;
      }
    }
  } catch (error) {
    console.log('[AUTH] No valid session, using demo user');
  }

  // Fallback for development/testing
  return 'default-user';
}

// Helper to get workspace ID from header
function getWorkspaceId(req: NextRequest): string | null {
  const workspaceId = req.headers.get('x-workspace-id');
  if (!workspaceId) {
    console.warn('[WORKSPACE] No x-workspace-id header provided');
  }
  return workspaceId;
}

/**
 * GET /api/conversations
 * Fetch all conversations grouped by agent for the current workspace
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);

    // Get workspace ID from header
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID required in x-workspace-id header' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Fetch latest message per agent for this workspace
    // First, get message counts and last timestamp per agent
    const agentStats = await db
      .select({
        agentId: agentMessages.agentId,
        lastMessageAt: sql<Date>`MAX(${agentMessages.createdAt})`,
        messageCount: sql<number>`COUNT(*)`,
      })
      .from(agentMessages)
      .where(
        and(
          eq(agentMessages.userId, userId),
          eq(agentMessages.workspaceId, workspaceId)
        )
      )
      .groupBy(agentMessages.agentId);

    // Then, get the actual last message for each agent
    const conversations = await Promise.all(
      agentStats.map(async (stats) => {
        const [lastMsg] = await db
          .select({
            content: agentMessages.content,
            role: agentMessages.role,
          })
          .from(agentMessages)
          .where(
            and(
              eq(agentMessages.userId, userId),
              eq(agentMessages.workspaceId, workspaceId),
              eq(agentMessages.agentId, stats.agentId)
            )
          )
          .orderBy(desc(agentMessages.createdAt))
          .limit(1);

        return {
          agentId: stats.agentId,
          lastMessage: lastMsg?.content || '',
          lastMessageRole: lastMsg?.role || 'user',
          lastMessageAt: stats.lastMessageAt,
          messageCount: stats.messageCount,
        };
      })
    );

    // Sort by last message time
    conversations.sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    // Enrich with agent metadata
    const enrichedConversations = conversations.map((conv) => {
      const agent = getAgentById(conv.agentId);
      return {
        agentId: conv.agentId,
        agentName: agent?.name || conv.agentId,
        agentIcon: agent?.icon || '🤖',
        agentColor: agent?.color || 'gray',
        lastMessage: conv.lastMessage,
        lastMessageRole: conv.lastMessageRole,
        lastMessageAt: conv.lastMessageAt,
        messageCount: conv.messageCount,
      };
    });

    return NextResponse.json({
      conversations: enrichedConversations,
      workspaceId,
    });
  } catch (error) {
    console.error('[CONVERSATIONS_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
