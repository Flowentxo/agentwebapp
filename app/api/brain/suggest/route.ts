/**
 * Brain AI Suggest API
 * Endpoint: GET /api/brain/suggest
 * Provides AI-powered suggestions for queries, topics, and related content
 *
 * SECURITY: Protected with API Key authentication, rate limiting, RBAC
 * Required role: viewer
 * Required permissions: knowledge:read
 */

import { NextRequest, NextResponse } from 'next/server';
import { brainService, contextManager } from '@/lib/brain';
import { withBrainSecurity, type SecurityContext } from '@/lib/brain/security/SecurityMiddleware';
import { BRAIN_PERMISSIONS } from '@/lib/db/schema-brain-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withBrainSecurity(
  async (req: NextRequest, context: SecurityContext) => {
    try {
      const searchParams = req.nextUrl.searchParams;
      const type = searchParams.get('type') || 'all'; // popular, topics, related, all
      const workspaceId = searchParams.get('workspaceId') || context.workspaceId || 'default-workspace';
      const userId = searchParams.get('userId') || context.userId || undefined;
      const agentId = searchParams.get('agentId') || context.agentId || undefined;
      const query = searchParams.get('query') || undefined;
      const limit = parseInt(searchParams.get('limit') || '10');

    const suggestions: any = {
      type,
      workspaceId,
    };

    // Popular queries
    if (type === 'popular' || type === 'all') {
      const popularQueries = await brainService.getPopularQueries({
        workspaceId,
        limit,
      });

      suggestions.popularQueries = popularQueries.map(q => ({
        query: q,
        type: 'query',
      }));
    }

    // Topic suggestions
    if (type === 'topics' || type === 'all') {
      const topics = await brainService.getSuggestedTopics({
        workspaceId,
        userId,
        limit,
      });

      suggestions.topics = topics.map(t => ({
        topic: t,
        type: 'topic',
      }));
    }

    // Related content (if query provided)
    if ((type === 'related' || type === 'all') && query) {
      const queryResult = await brainService.query(query, {
        workspaceId,
        userId,
        agentId,
        limit: 5,
        searchType: 'hybrid',
      });

      suggestions.relatedContent = queryResult.documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        snippet: doc.content.slice(0, 200),
        similarity: doc.similarity,
        type: 'document',
      }));

      // Add AI suggestions from query result
      if (queryResult.suggestions) {
        suggestions.aiSuggestions = queryResult.suggestions.map(s => ({
          suggestion: s,
          type: 'tag',
        }));
      }
    }

    // Context-based suggestions (if userId provided)
    if ((type === 'context' || type === 'all') && userId) {
      const recentContexts = await contextManager.queryContexts({
        workspaceId,
        userId,
        limit: 5,
      });

      if (recentContexts.length > 0) {
        const contextTopics = new Set<string>();

        for (const ctx of recentContexts) {
          const snapshot = ctx.contextSnapshot as any;
          if (snapshot?.topics) {
            snapshot.topics.forEach((topic: string) => contextTopics.add(topic));
          }
        }

        suggestions.contextSuggestions = Array.from(contextTopics).slice(0, limit).map(t => ({
          topic: t,
          type: 'context-topic',
          source: 'recent-conversations',
        }));
      }
    }

    // Trending (most active topics in last 24h)
    if (type === 'trending' || type === 'all') {
      // TODO: Implement trending logic based on query logs
      suggestions.trending = [];
    }

      return NextResponse.json({
        success: true,
        suggestions,
        generatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[Brain Suggest API] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate suggestions',
          message: error.message,
        },
        { status: 500 }
      );
    }
  },
  {
    requireAuth: true,
    requireRole: 'viewer',
    requireScopes: [BRAIN_PERMISSIONS.KNOWLEDGE_READ],
    rateLimitKey: 'user',
  }
);

// POST - Get suggestions based on input
export const POST = withBrainSecurity(
  async (req: NextRequest, context: SecurityContext) => {
    try {
      const body = await req.json();

      const {
        input,
        workspaceId = context.workspaceId || 'default-workspace',
        userId = context.userId,
        agentId = context.agentId,
        limit = 10,
        types = ['queries', 'topics', 'documents'],
      } = body;

    if (!input || input.trim().length === 0) {
      return NextResponse.json(
        { error: 'Input text is required' },
        { status: 400 }
      );
    }

    const suggestions: any = {
      input,
      suggestions: [],
    };

    // Find similar queries
    if (types.includes('queries')) {
      const popularQueries = await brainService.getPopularQueries({
        workspaceId,
        limit: limit * 2,
      });

      // Filter by similarity to input
      const relevantQueries = popularQueries.filter(q =>
        q.toLowerCase().includes(input.toLowerCase()) ||
        input.toLowerCase().includes(q.toLowerCase())
      );

      suggestions.suggestions.push(...relevantQueries.slice(0, limit).map(q => ({
        text: q,
        type: 'query',
        confidence: 0.8,
      })));
    }

    // Find similar documents
    if (types.includes('documents')) {
      const queryResult = await brainService.query(input, {
        workspaceId,
        userId,
        agentId,
        limit: 5,
        searchType: 'hybrid',
      });

      suggestions.suggestions.push(...queryResult.documents.map(doc => ({
        text: doc.title,
        snippet: doc.content.slice(0, 100),
        type: 'document',
        confidence: doc.similarity || 0.5,
        documentId: doc.id,
      })));
    }

    // Find related topics
    if (types.includes('topics')) {
      const topics = await brainService.getSuggestedTopics({
        workspaceId,
        userId,
        limit,
      });

      const relevantTopics = topics.filter(t =>
        t.toLowerCase().includes(input.toLowerCase())
      );

      suggestions.suggestions.push(...relevantTopics.map(t => ({
        text: t,
        type: 'topic',
        confidence: 0.7,
      })));
    }

      // Sort by confidence
      suggestions.suggestions.sort((a: any, b: any) => b.confidence - a.confidence);

      return NextResponse.json({
        success: true,
        ...suggestions,
        total: suggestions.suggestions.length,
      });
    } catch (error: any) {
      console.error('[Brain Suggest API POST] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate suggestions',
          message: error.message,
        },
        { status: 500 }
      );
    }
  },
  {
    requireAuth: true,
    requireRole: 'viewer',
    requireScopes: [BRAIN_PERMISSIONS.KNOWLEDGE_READ],
    rateLimitKey: 'user',
  }
);
