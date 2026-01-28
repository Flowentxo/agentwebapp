/**
 * MARKETPLACE AGENT DETAIL API
 *
 * Get detailed information about a specific marketplace agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { customAgents } from '@/lib/db/schema-custom-agents';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/agents/marketplace/[id]
 *
 * Get detailed information about a marketplace agent
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;

    const db = getDb();

    // Fetch the agent
    const [agent] = await db
      .select()
      .from(customAgents)
      .where(
        and(
          eq(customAgents.id, agentId),
          eq(customAgents.visibility, 'public')
        )
      )
      .limit(1);

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found or not public' },
        { status: 404 }
      );
    }

    // Transform data
    const transformedAgent = {
      id: agent.id,
      name: agent.name,
      description: agent.description || '',
      icon: agent.icon || '🤖',
      color: agent.color || '#3B82F6',
      createdBy: agent.createdBy,
      usageCount: parseInt(agent.usageCount || '0'),
      rating: parseFloat(agent.rating || '0'),
      tags: (agent.tags as string[]) || [],
      capabilities: agent.capabilities || {
        webBrowsing: false,
        codeInterpreter: false,
        imageGeneration: false,
        knowledgeBase: false,
        customActions: false,
      },
      systemInstructions: agent.systemInstructions,
      model: agent.model,
      temperature: parseFloat(agent.temperature || '0.7'),
      maxTokens: parseInt(agent.maxTokens || '4000'),
      conversationStarters: (agent.conversationStarters as string[]) || [],
      publishedAt: agent.publishedAt?.toISOString() || new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      agent: transformedAgent,
    });
  } catch (error: any) {
    console.error('[MARKETPLACE_AGENT_GET]', error);
    return NextResponse.json(
      { error: 'Failed to load agent details' },
      { status: 500 }
    );
  }
}
