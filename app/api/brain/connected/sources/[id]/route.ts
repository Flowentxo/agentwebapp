/**
 * Brain AI - Connected Source by ID API
 *
 * GET /api/brain/connected/sources/[id] - Get source details
 * DELETE /api/brain/connected/sources/[id] - Disconnect source
 * POST /api/brain/connected/sources/[id]/sync - Trigger sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectedSearchService } from '@/lib/brain/ConnectedSearchService';
import { googleDriveConnector } from '@/lib/brain/connectors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - Get source details
 */
export async function GET(req: NextRequest, context: RouteParams) {
  try {
    const { id: sourceId } = await context.params;
    const source = await connectedSearchService.getSource(sourceId);

    if (!source) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      source: {
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
      },
    });
  } catch (error) {
    console.error('[CONNECTED_SOURCE_API] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to get source' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Disconnect source
 */
export async function DELETE(req: NextRequest, context: RouteParams) {
  try {
    const { id: sourceId } = await context.params;
    const source = await connectedSearchService.getSource(sourceId);

    if (!source) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      );
    }

    await connectedSearchService.disconnectSource(sourceId);

    return NextResponse.json({
      success: true,
      message: `Source ${source.provider} disconnected`,
    });
  } catch (error) {
    console.error('[CONNECTED_SOURCE_API] DELETE Error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect source' },
      { status: 500 }
    );
  }
}

/**
 * POST - Trigger sync for source
 */
export async function POST(req: NextRequest, context: RouteParams) {
  try {
    const { id: sourceId } = await context.params;
    const source = await connectedSearchService.getSource(sourceId);

    if (!source) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      );
    }

    if (!source.accessToken) {
      return NextResponse.json(
        { error: 'Source has no access token' },
        { status: 400 }
      );
    }

    // Trigger sync based on provider
    let result;

    switch (source.provider) {
      case 'google_drive':
        result = await googleDriveConnector.syncSource(
          sourceId,
          source.accessToken,
          source.refreshToken || undefined,
          {
            syncFolders: source.syncFolders as string[] | undefined,
            fileTypes: source.syncFileTypes as string[] | undefined,
          }
        );
        break;

      default:
        return NextResponse.json(
          { error: `Provider ${source.provider} not yet supported` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result: {
        indexed: result.indexed,
        updated: result.updated,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error('[CONNECTED_SOURCE_API] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to sync source' },
      { status: 500 }
    );
  }
}
