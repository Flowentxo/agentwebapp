/**
 * PHASE 49-50: Cassie Knowledge Base API Routes
 * Knowledge base management endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { CassieCapabilities } from '@/lib/agents/cassie';

// ============================================
// POST: Create article or perform actions
// ============================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, workspaceId, ...data } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'create': {
        const article = await CassieCapabilities.knowledge.createArticle(workspaceId, {
          title: data.title,
          content: data.content,
          category: data.category,
          tags: data.tags,
          visibility: data.visibility,
          author: data.author || 'System',
          status: data.status,
        });

        return NextResponse.json({
          success: true,
          data: article,
        });
      }

      case 'update': {
        if (!data.articleId) {
          return NextResponse.json(
            { success: false, error: 'articleId is required for update' },
            { status: 400 }
          );
        }

        const updated = await CassieCapabilities.knowledge.updateArticle(
          workspaceId,
          data.articleId,
          data.updates
        );

        if (!updated) {
          return NextResponse.json(
            { success: false, error: 'Article not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: updated,
        });
      }

      case 'delete': {
        if (!data.articleId) {
          return NextResponse.json(
            { success: false, error: 'articleId is required for delete' },
            { status: 400 }
          );
        }

        const deleted = await CassieCapabilities.knowledge.deleteArticle(
          workspaceId,
          data.articleId,
          data.hardDelete || false
        );

        return NextResponse.json({
          success: true,
          data: { deleted },
        });
      }

      case 'search': {
        if (!data.query) {
          return NextResponse.json(
            { success: false, error: 'query is required for search' },
            { status: 400 }
          );
        }

        const results = await CassieCapabilities.knowledge.search({
          workspaceId,
          query: data.query,
          category: data.category,
          tags: data.tags,
          status: data.status,
          visibility: data.visibility,
          limit: data.limit || 10,
          offset: data.offset || 0,
          sortBy: data.sortBy || 'relevance',
        });

        return NextResponse.json({
          success: true,
          data: results,
        });
      }

      case 'find_solution': {
        if (!data.ticketContent) {
          return NextResponse.json(
            { success: false, error: 'ticketContent is required' },
            { status: 400 }
          );
        }

        const solution = await CassieCapabilities.knowledge.findSolutionForTicket(
          workspaceId,
          data.ticketContent,
          data.category
        );

        return NextResponse.json({
          success: true,
          data: solution,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[CASSIE_KNOWLEDGE_POST]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Operation failed',
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET: Get articles and categories
// ============================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const action = searchParams.get('action');

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'stats': {
        const stats = await CassieCapabilities.knowledge.getStats(workspaceId);
        return NextResponse.json({
          success: true,
          data: stats,
        });
      }

      case 'categories': {
        const categories = await CassieCapabilities.knowledge.getCategories(workspaceId);
        return NextResponse.json({
          success: true,
          data: { categories },
        });
      }

      case 'article': {
        const articleId = searchParams.get('articleId');
        if (!articleId) {
          return NextResponse.json(
            { success: false, error: 'articleId is required' },
            { status: 400 }
          );
        }

        const article = await CassieCapabilities.knowledge.getArticle(
          workspaceId,
          articleId
        );

        if (!article) {
          return NextResponse.json(
            { success: false, error: 'Article not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: article,
        });
      }

      default: {
        // Get articles with filters
        const category = searchParams.get('category') || undefined;
        const status = searchParams.get('status') as 'draft' | 'published' | 'archived' | undefined;
        const visibility = searchParams.get('visibility') as 'internal' | 'external' | 'both' | undefined;
        const tags = searchParams.get('tags')?.split(',');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');
        const sortBy = searchParams.get('sortBy') as 'date' | 'views' | 'helpful' | 'title' | undefined;
        const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | undefined;

        const result = await CassieCapabilities.knowledge.getArticles({
          workspaceId,
          category,
          status,
          visibility,
          tags,
          limit,
          offset,
          sortBy,
          sortOrder,
        });

        return NextResponse.json({
          success: true,
          data: result,
        });
      }
    }
  } catch (error) {
    console.error('[CASSIE_KNOWLEDGE_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch knowledge base' },
      { status: 500 }
    );
  }
}
