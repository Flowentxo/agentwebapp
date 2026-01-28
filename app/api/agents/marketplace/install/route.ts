/**
 * MARKETPLACE INSTALL API
 *
 * Clone/install a public agent from marketplace
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { customAgents, agentActions, agentKnowledgeBase } from '@/lib/db/schema-custom-agents';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/agents/marketplace/install
 *
 * Install (clone) an agent from marketplace
 */
export async function POST(req: NextRequest) {
  try {
    const { agentId } = await req.json();

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Get current user (TODO: Get from auth session)
    const userId = 'default-user';

    const db = getDb();

    // Fetch the source agent
    const [sourceAgent] = await db
      .select()
      .from(customAgents)
      .where(
        and(
          eq(customAgents.id, agentId),
          eq(customAgents.visibility, 'public')
        )
      )
      .limit(1);

    if (!sourceAgent) {
      return NextResponse.json(
        { error: 'Agent not found or not public' },
        { status: 404 }
      );
    }

    // Clone the agent
    const [newAgent] = await db
      .insert(customAgents)
      .values({
        name: `${sourceAgent.name} (Copy)`,
        description: sourceAgent.description,
        icon: sourceAgent.icon,
        color: sourceAgent.color,
        systemInstructions: sourceAgent.systemInstructions,
        model: sourceAgent.model,
        temperature: sourceAgent.temperature,
        maxTokens: sourceAgent.maxTokens,
        conversationStarters: sourceAgent.conversationStarters,
        capabilities: sourceAgent.capabilities,
        fallbackChain: sourceAgent.fallbackChain,
        responseFormat: sourceAgent.responseFormat,
        visibility: 'private', // User's copy is private by default
        status: 'active',
        createdBy: userId,
        tags: sourceAgent.tags,
      })
      .returning();

    // Clone custom actions (if any)
    const sourceActions = await db
      .select()
      .from(agentActions)
      .where(eq(agentActions.agentId, agentId));

    if (sourceActions.length > 0) {
      const newActions = sourceActions.map((action) => ({
        agentId: newAgent.id,
        name: action.name,
        description: action.description,
        schema: action.schema,
        authentication: action.authentication,
        enabled: action.enabled,
      }));

      await db.insert(agentActions).values(newActions);
    }

    // NOTE: Knowledge base files are NOT cloned (user needs to upload their own)

    // Increment usage count on source agent
    await db
      .update(customAgents)
      .set({
        usageCount: (parseInt(sourceAgent.usageCount || '0') + 1).toString(),
      })
      .where(eq(customAgents.id, agentId));

    console.log(`[MARKETPLACE] Agent installed: ${sourceAgent.name} -> ${newAgent.id}`);

    return NextResponse.json({
      success: true,
      newAgentId: newAgent.id,
      message: 'Agent installed successfully',
    });
  } catch (error: any) {
    console.error('[MARKETPLACE_INSTALL]', error);
    return NextResponse.json(
      { error: 'Failed to install agent' },
      { status: 500 }
    );
  }
}
