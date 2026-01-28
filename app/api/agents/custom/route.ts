import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { customAgents, NewCustomAgent } from '@/lib/db/schema-custom-agents';
import { eq, and, or, desc } from 'drizzle-orm';
import { getSessionToken } from '@/lib/auth/cookies';
import { getSessionByToken } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Validate if a string is a valid UUID v4
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Check if error is due to missing table
 */
function isTableNotFoundError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  return (
    message.includes('relation') && message.includes('does not exist') ||
    message.includes('table') && message.includes('not found') ||
    message.includes('custom_agents') && message.includes('does not exist') ||
    error?.code === '42P01' // PostgreSQL error code for undefined_table
  );
}

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
 * GET /api/agents/custom
 * List all custom agents OR get single agent by ID
 * - GET /api/agents/custom -> list all
 * - GET /api/agents/custom?id=xxx -> get single agent
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('id');
    const visibility = searchParams.get('visibility');
    const status = searchParams.get('status');

    const db = getDb();

    // If ID is provided, return single agent
    if (agentId) {
      // Validate UUID format before querying database
      if (!isValidUUID(agentId)) {
        console.warn(`[CUSTOM_AGENTS_GET] Invalid UUID format: "${agentId}"`);
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid agent ID format. Expected a valid UUID.',
            receivedId: agentId
          },
          { status: 400 }
        );
      }

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
    }

    // Build query conditions
    const conditions = [];

    // User can see their own agents + public agents + shared agents
    conditions.push(
      or(
        eq(customAgents.createdBy, userId),
        eq(customAgents.visibility, 'public'),
        eq(customAgents.visibility, 'listed')
      )!
    );

    if (visibility) {
      conditions.push(eq(customAgents.visibility, visibility as any));
    }

    if (status) {
      conditions.push(eq(customAgents.status, status as any));
    }

    const agents = await db
      .select()
      .from(customAgents)
      .where(and(...conditions))
      .orderBy(desc(customAgents.createdAt))
      .limit(100);

    return NextResponse.json({
      success: true,
      data: agents,
    });
  } catch (error: any) {
    // Graceful fallback if table doesn't exist
    if (isTableNotFoundError(error)) {
      console.info('[CUSTOM_AGENTS_GET] Table custom_agents does not exist, returning empty list');
      return NextResponse.json({
        success: true,
        data: [],
      });
    }
    console.error('[CUSTOM_AGENTS_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch custom agents' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/custom
 * Create a new custom agent
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const body = await req.json();

    const {
      name,
      description,
      icon,
      color,
      systemInstructions,
      model,
      temperature,
      maxTokens,
      conversationStarters,
      capabilities,
      fallbackChain,
      visibility,
      tags,
    } = body;

    // Validation
    if (!name || !systemInstructions) {
      return NextResponse.json(
        { success: false, error: 'name and systemInstructions are required' },
        { status: 400 }
      );
    }

    const db = getDb();

    const newAgent: NewCustomAgent = {
      name,
      description: description || null,
      icon: icon || '🤖',
      color: color || '#3B82F6',
      systemInstructions,
      model: model || 'gpt-5.1',
      temperature: temperature?.toString() || '0.7',
      maxTokens: maxTokens?.toString() || '4000',
      conversationStarters: conversationStarters || [],
      capabilities: capabilities || {
        webBrowsing: false,
        codeInterpreter: false,
        imageGeneration: false,
        knowledgeBase: false,
        customActions: false,
      },
      fallbackChain: fallbackChain || 'standard',
      visibility: visibility || 'private',
      status: 'draft',
      createdBy: userId,
      tags: tags || [],
    };

    const [agent] = await db.insert(customAgents).values(newAgent).returning();

    console.log(`[CUSTOM_AGENTS] Created agent: ${agent.name} (${agent.id})`);

    return NextResponse.json({
      success: true,
      data: agent,
    });
  } catch (error: any) {
    if (isTableNotFoundError(error)) {
      return NextResponse.json(
        { success: false, error: 'Custom agents feature not available - table does not exist' },
        { status: 503 }
      );
    }
    console.error('[CUSTOM_AGENTS_POST]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create custom agent' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/agents/custom?id=xxx
 * Update a custom agent
 */
export async function PATCH(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('id');

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Validate UUID format before querying database
    if (!isValidUUID(agentId)) {
      console.warn(`[CUSTOM_AGENTS_PATCH] Invalid UUID format: "${agentId}"`);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid agent ID format. Expected a valid UUID.',
          receivedId: agentId
        },
        { status: 400 }
      );
    }

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
  } catch (error: any) {
    if (isTableNotFoundError(error)) {
      return NextResponse.json(
        { success: false, error: 'Custom agents feature not available' },
        { status: 503 }
      );
    }
    console.error('[CUSTOM_AGENTS_PATCH]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/custom?id=xxx
 * Delete a custom agent
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('id');

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Validate UUID format before querying database
    if (!isValidUUID(agentId)) {
      console.warn(`[CUSTOM_AGENTS_DELETE] Invalid UUID format: "${agentId}"`);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid agent ID format. Expected a valid UUID.',
          receivedId: agentId
        },
        { status: 400 }
      );
    }

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
  } catch (error: any) {
    if (isTableNotFoundError(error)) {
      return NextResponse.json(
        { success: false, error: 'Custom agents feature not available' },
        { status: 503 }
      );
    }
    console.error('[CUSTOM_AGENTS_DELETE]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
