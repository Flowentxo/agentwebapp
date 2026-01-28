/**
 * REVOLUTION API - AGENT MANAGEMENT
 *
 * GET /api/revolution/agents/[id] - Get agent details
 * PUT /api/revolution/agents/[id] - Update agent
 * DELETE /api/revolution/agents/[id] - Delete agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { customAgents } from '@/lib/db/schema-custom-agents';
import { decrementAgentCount } from '@/lib/services/subscription-service';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Update schema
const updateAgentSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().optional(),
  systemInstructions: z.string().optional(),
  model: z.string().optional(),
  temperature: z.string().optional(),
  maxTokens: z.string().optional(),
  conversationStarters: z.array(z.string()).optional(),
  capabilities: z.object({
    webBrowsing: z.boolean().optional(),
    codeInterpreter: z.boolean().optional(),
    imageGeneration: z.boolean().optional(),
    knowledgeBase: z.boolean().optional(),
    customActions: z.boolean().optional(),
  }).optional(),
  visibility: z.enum(['private', 'team', 'public', 'listed']).optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/revolution/agents/[id]
 *
 * Get agent details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const db = getDb();

    // Fetch agent
    const [agent] = await db
      .select()
      .from(customAgents)
      .where(
        and(
          eq(customAgents.id, agentId),
          eq(customAgents.createdBy, userId)
        )
      )
      .limit(1);

    if (!agent) {
      return NextResponse.json(
        {
          error: 'Agent not found',
          message: 'Agent does not exist or you do not have access',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      agent,
    });
  } catch (error: any) {
    console.error('[REVOLUTION_AGENT_GET]', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch agent',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/revolution/agents/[id]
 *
 * Update agent details
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const body = await req.json();
    const db = getDb();

    // Validate input
    const validation = updateAgentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    // Check if agent exists and user owns it
    const [existing] = await db
      .select()
      .from(customAgents)
      .where(
        and(
          eq(customAgents.id, agentId),
          eq(customAgents.createdBy, userId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        {
          error: 'Agent not found',
          message: 'Agent does not exist or you do not have access',
        },
        { status: 404 }
      );
    }

    // Update agent
    const [updatedAgent] = await db
      .update(customAgents)
      .set({
        ...validation.data,
        updatedAt: new Date(),
      })
      .where(eq(customAgents.id, agentId))
      .returning();

    console.log(`[REVOLUTION_API] Updated agent: ${updatedAgent.id} - ${updatedAgent.name}`);

    return NextResponse.json({
      success: true,
      agent: updatedAgent,
    });
  } catch (error: any) {
    console.error('[REVOLUTION_AGENT_PUT]', error);
    return NextResponse.json(
      {
        error: 'Failed to update agent',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/revolution/agents/[id]
 *
 * Delete an agent
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const db = getDb();

    // Check if agent exists and user owns it
    const [existing] = await db
      .select()
      .from(customAgents)
      .where(
        and(
          eq(customAgents.id, agentId),
          eq(customAgents.createdBy, userId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        {
          error: 'Agent not found',
          message: 'Agent does not exist or you do not have access',
        },
        { status: 404 }
      );
    }

    // Delete agent (cascade will delete related data)
    await db
      .delete(customAgents)
      .where(eq(customAgents.id, agentId));

    // Update subscription agent count
    await decrementAgentCount(userId);

    console.log(`[REVOLUTION_API] Deleted agent: ${agentId}`);

    return NextResponse.json({
      success: true,
      message: 'Agent deleted successfully',
    });
  } catch (error: any) {
    console.error('[REVOLUTION_AGENT_DELETE]', error);
    return NextResponse.json(
      {
        error: 'Failed to delete agent',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
