/**
 * Brain AI - Connected Sources API
 *
 * GET /api/brain/connected/sources - List connected sources
 * POST /api/brain/connected/sources - Connect new source
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  connectedSearchService,
  ConnectedSourceConfig,
  OAuthTokens,
} from '@/lib/brain/ConnectedSearchService';
import type { ConnectedProvider } from '@/lib/db/schema-connected-intelligence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - List connected sources for workspace
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const workspaceId = req.nextUrl.searchParams.get('workspaceId') || 'default-workspace';

    const sources = await connectedSearchService.getSources(workspaceId, userId);

    // Mask tokens in response
    const sanitizedSources = sources.map(source => ({
      id: source.id,
      provider: source.provider,
      displayName: source.displayName,
      providerEmail: source.providerEmail,
      syncStatus: source.syncStatus,
      lastSyncAt: source.lastSyncAt,
      lastSyncError: source.lastSyncError,
      documentsIndexed: source.documentsIndexed,
      isActive: source.isActive,
      config: source.config,
      syncFolders: source.syncFolders,
      syncFileTypes: source.syncFileTypes,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      sources: sanitizedSources,
    });
  } catch (error) {
    console.error('[CONNECTED_SOURCES_API] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to list connected sources' },
      { status: 500 }
    );
  }
}

interface ConnectSourceRequest {
  provider: ConnectedProvider;
  displayName?: string;
  syncFolders?: string[];
  syncFileTypes?: string[];
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  scope?: string;
  providerAccountId?: string;
  providerEmail?: string;
}

/**
 * POST - Connect a new source
 */
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const body: ConnectSourceRequest = await req.json();

    const workspaceId = 'default-workspace';

    // Validate required fields
    if (!body.provider || !body.accessToken) {
      return NextResponse.json(
        { error: 'Provider and accessToken are required' },
        { status: 400 }
      );
    }

    const config: ConnectedSourceConfig = {
      provider: body.provider,
      displayName: body.displayName,
      syncFolders: body.syncFolders,
      syncFileTypes: body.syncFileTypes,
    };

    const tokens: OAuthTokens = {
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      scope: body.scope,
    };

    const source = await connectedSearchService.connectSource(
      workspaceId,
      userId,
      config,
      tokens,
      body.providerAccountId,
      body.providerEmail
    );

    return NextResponse.json({
      success: true,
      source: {
        id: source.id,
        provider: source.provider,
        displayName: source.displayName,
        syncStatus: source.syncStatus,
        createdAt: source.createdAt,
      },
    });
  } catch (error) {
    console.error('[CONNECTED_SOURCES_API] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to connect source' },
      { status: 500 }
    );
  }
}
