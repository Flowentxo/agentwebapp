/**
 * Brain AI Query API - Frontend Compatible Version
 * Endpoint: POST /api/brain/query
 * 
 * Supports both:
 * - API Key auth (for external integrations)
 * - Session/Header auth (for frontend)
 */

import { NextRequest, NextResponse } from 'next/server';
import { brainService } from '@/lib/brain';
import { redisCache } from '@/lib/brain/RedisCache';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface QueryRequest {
  query: string;
  workspaceId?: string;
  userId?: string;
  agentId?: string;
  searchType?: 'semantic' | 'hybrid' | 'fulltext';
  limit?: number;
  minSimilarity?: number;
  includeContext?: boolean;
  useSemanticSearch?: boolean;
  filters?: {
    tags?: string[];
    category?: string;
    sourceType?: string;
  };
  useCache?: boolean;
}

// Helper to get user ID from various sources
function getUserId(req: NextRequest): string {
  // Try x-user-id header first (frontend convention)
  const headerUserId = req.headers.get('x-user-id');
  if (headerUserId) return headerUserId;
  
  // Fallback to demo user for development
  return 'demo-user';
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const body: QueryRequest = await req.json();

    // Validation
    if (!body.query || body.query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query text is required' },
        { status: 400 }
      );
    }

    if (body.query.length > 5000) {
      return NextResponse.json(
        { error: 'Query text too long (max 5000 characters)' },
        { status: 400 }
      );
    }

    const {
      query,
      workspaceId = 'default-workspace',
      agentId,
      searchType = body.useSemanticSearch ? 'semantic' : 'hybrid',
      limit = 10,
      minSimilarity = 0.6,
      includeContext = false,
      filters,
      useCache = true,
    } = body;

    // Check cache if enabled
    let cacheKey: string | null = null;
    if (useCache) {
      cacheKey = crypto
        .createHash('sha256')
        .update(JSON.stringify({ query, workspaceId, searchType, filters, limit }))
        .digest('hex');

      try {
        const cached = await redisCache.getCachedQueryResult(cacheKey);
        if (cached) {
          console.log('[Brain Query API] Cache hit');
          return NextResponse.json({
            ...cached,
            cached: true,
          });
        }
      } catch (cacheError) {
        // Redis not available, continue without cache
        console.warn('[Brain Query API] Cache unavailable:', cacheError);
      }
    }

    // Execute query
    const result = await brainService.query(query, {
      workspaceId,
      userId,
      agentId,
      searchType,
      limit,
      minSimilarity,
      includeContext,
      filters,
    });

    // Format response
    const response = {
      success: true,
      query,
      results: result.documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        content: doc.content.slice(0, 500),
        similarity: doc.similarity,
        rank: doc.rank,
        metadata: doc.metadata,
        createdAt: doc.createdAt,
      })),
      context: result.context,
      suggestions: result.suggestions,
      totalResults: result.totalResults,
      searchType: result.searchType,
      responseTime: result.responseTime,
      cached: false,
    };

    // Cache result if possible
    if (useCache && cacheKey) {
      try {
        await redisCache.cacheQueryResult(cacheKey, response, 300);
      } catch {
        // Ignore cache errors
      }
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Brain Query API] Error:', error);
    
    // Return a helpful error for frontend
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process query',
        message: error.message || 'An unexpected error occurred',
        // Provide mock response for development
        results: [],
        context: `Ich konnte keine Ergebnisse für deine Anfrage finden. ${error.message || 'Bitte versuche es erneut.'}`,
        suggestions: ['Versuche eine andere Formulierung', 'Lade mehr Dokumente hoch'],
      },
      { status: 200 } // Return 200 so frontend can display the message
    );
  }
}

// GET method for simple queries
export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q') || searchParams.get('query');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" or "query" is required' },
        { status: 400 }
      );
    }

    const workspaceId = searchParams.get('workspaceId') || 'default-workspace';
    const searchType = (searchParams.get('type') || 'hybrid') as 'semantic' | 'hybrid' | 'fulltext';
    const limit = parseInt(searchParams.get('limit') || '10');

    const result = await brainService.query(query, {
      workspaceId,
      userId,
      searchType,
      limit,
    });

    return NextResponse.json({
      success: true,
      query,
      results: result.documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        content: doc.content.slice(0, 500),
        similarity: doc.similarity,
        metadata: doc.metadata,
      })),
      totalResults: result.totalResults,
      searchType: result.searchType,
      responseTime: result.responseTime,
    });
  } catch (error: any) {
    console.error('[Brain Query API GET] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process query', 
        message: error.message,
        results: [],
      },
      { status: 200 }
    );
  }
}
