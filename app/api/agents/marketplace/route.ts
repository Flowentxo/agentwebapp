/**
 * AGENT MARKETPLACE API
 *
 * Browse and search public agents from the community
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { customAgents } from '@/lib/db/schema-custom-agents';
import { eq, and, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/agents/marketplace
 *
 * Get all public agents
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const sortBy = searchParams.get('sortBy') || 'popular';

    const db = getDb();

    // Build query conditions
    const conditions = [
      eq(customAgents.visibility, 'public'),
      eq(customAgents.status, 'active'),
    ];

    // Fetch public agents
    let query = db
      .select({
        id: customAgents.id,
        name: customAgents.name,
        description: customAgents.description,
        icon: customAgents.icon,
        color: customAgents.color,
        createdBy: customAgents.createdBy,
        usageCount: customAgents.usageCount,
        rating: customAgents.rating,
        tags: customAgents.tags,
        capabilities: customAgents.capabilities,
        publishedAt: customAgents.publishedAt,
      })
      .from(customAgents)
      .where(and(...conditions));

    // Execute query
    const agents = await query;

    // Filter by category (tag)
    let filtered = agents;
    if (category && category !== 'all') {
      filtered = agents.filter((agent) =>
        (agent.tags as string[])?.includes(category)
      );
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => {
          const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'rating':
        filtered.sort((a, b) => {
          const ratingA = a.rating ? parseFloat(a.rating) : 0;
          const ratingB = b.rating ? parseFloat(b.rating) : 0;
          return ratingB - ratingA;
        });
        break;
      case 'popular':
      default:
        filtered.sort((a, b) => {
          const usageA = a.usageCount ? parseInt(a.usageCount) : 0;
          const usageB = b.usageCount ? parseInt(b.usageCount) : 0;
          return usageB - usageA;
        });
        break;
    }

    // Transform data
    const transformedAgents = filtered.map((agent) => ({
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
      publishedAt: agent.publishedAt?.toISOString() || new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      agents: transformedAgents,
      total: transformedAgents.length,
    });
  } catch (error: any) {
    console.error('[MARKETPLACE_GET]', error);
    return NextResponse.json(
      { error: 'Failed to load marketplace' },
      { status: 500 }
    );
  }
}
