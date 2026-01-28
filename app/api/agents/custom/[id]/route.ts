import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { customAgents } from '@/lib/db/schema-custom-agents';
import { eq, and } from 'drizzle-orm';
import { getSessionToken } from '@/lib/auth/cookies';
import { getSessionByToken } from '@/lib/auth/session';

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
    console.log('[AUTH] No valid session, using default user');
  }

  return 'default-user';
}

/**
 * GET /api/agents/custom/:id
 * Get a specific custom agent
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(req);
    const { id: agentId } = await params;

    const db = getDb();

    const [agent] = await db
      .select()
      .from(customAgents)
      .where(eq(customAgents.id, agentId))
      .limit(1);

    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    const canAccess =
      agent.createdBy === userId ||
      agent.visibility === 'public' ||
      agent.visibility === 'listed';

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    console.error('[CUSTOM_AGENT_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/agents/custom/:id
 * Update a custom agent
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(req);
    const { id: agentId } = await params;
    const body = await req.json();

    const db = getDb();

    // Check ownership
    const [existing] = await db
      .select()
      .from(customAgents)
      .where(eq(customAgents.id, agentId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (existing.createdBy !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update fields
    const updates: any = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.color !== undefined) updates.color = body.color;
    if (body.systemInstructions !== undefined)
      updates.systemInstructions = body.systemInstructions;
    if (body.model !== undefined) updates.model = body.model;
    if (body.temperature !== undefined)
      updates.temperature = body.temperature.toString();
    if (body.maxTokens !== undefined)
      updates.maxTokens = body.maxTokens.toString();
    if (body.conversationStarters !== undefined)
      updates.conversationStarters = body.conversationStarters;
    if (body.capabilities !== undefined) updates.capabilities = body.capabilities;
    if (body.fallbackChain !== undefined)
      updates.fallbackChain = body.fallbackChain;
    if (body.visibility !== undefined) updates.visibility = body.visibility;
    if (body.status !== undefined) updates.status = body.status;
    if (body.tags !== undefined) updates.tags = body.tags;

    const [updated] = await db
      .update(customAgents)
      .set(updates)
      .where(eq(customAgents.id, agentId))
      .returning();

    console.log(`[CUSTOM_AGENTS] Updated agent: ${updated.name} (${updated.id})`);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('[CUSTOM_AGENT_PATCH]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/custom/:id
 * Delete a custom agent
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(req);
    const { id: agentId } = await params;

    const db = getDb();

    // Check ownership
    const [existing] = await db
      .select()
      .from(customAgents)
      .where(eq(customAgents.id, agentId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (existing.createdBy !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    await db.delete(customAgents).where(eq(customAgents.id, agentId));

    console.log(`[CUSTOM_AGENTS] Deleted agent: ${existing.name} (${agentId})`);

    return NextResponse.json({
      success: true,
      message: 'Agent deleted successfully',
    });
  } catch (error) {
    console.error('[CUSTOM_AGENT_DELETE]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
 
