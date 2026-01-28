/**
 * Brain AI - Connected Search API
 *
 * POST /api/brain/connected/search - Search across connected sources
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectedSearchService, SearchOptions } from '@/lib/brain/ConnectedSearchService';
import type { ConnectedProvider } from '@/lib/db/schema-connected-intelligence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SearchRequest {
  query: string;
  workspaceId?: string;
  providers?: ConnectedProvider[];
  limit?: number;
  fileTypes?: string[];
  dateFrom?: string;
  dateTo?: string;
  includeChunks?: boolean;
}

/**
 * POST - Search across all connected sources
 */
export async function POST(req: NextRequest) {
  try {
    const body: SearchRequest = await req.json();

    if (!body.query || body.query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const workspaceId = body.workspaceId || 'default-workspace';

    const options: SearchOptions = {
      providers: body.providers,
      limit: body.limit || 20,
      fileTypes: body.fileTypes,
      dateFrom: body.dateFrom ? new Date(body.dateFrom) : undefined,
      dateTo: body.dateTo ? new Date(body.dateTo) : undefined,
    };

    // Search documents
    const results = await connectedSearchService.search(
      workspaceId,
      body.query,
      options
    );

    // Optionally include chunk-level results for RAG
    let chunks;
    if (body.includeChunks) {
      chunks = await connectedSearchService.searchChunks(
        workspaceId,
        body.query,
        10
      );
    }

    return NextResponse.json({
      success: true,
      query: body.query,
      results,
      chunks,
      totalResults: results.length,
    });
  } catch (error) {
    console.error('[CONNECTED_SEARCH_API] Error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}

/**
 * GET - Get sync statistics
 */
export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspaceId') || 'default-workspace';

    const stats = await connectedSearchService.getSyncStats(workspaceId);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[CONNECTED_SEARCH_API] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}
