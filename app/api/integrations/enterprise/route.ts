/**
 * PHASE 10: Enterprise Integrations API Routes
 * API für Integration-Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  integrationConnections,
  integrationSyncLogs,
} from '@/lib/db/schema-integrations-v2';
import { IntegrationHub } from '@/lib/integrations/IntegrationHub';
import { eq, and, desc } from 'drizzle-orm';

// ============================================
// GET: List integrations and connections
// ============================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const provider = searchParams.get('provider');
    const includeHealth = searchParams.get('includeHealth') === 'true';

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const hub = new IntegrationHub();

    // Get all connections for workspace
    let query = db
      .select()
      .from(integrationConnections)
      .where(eq(integrationConnections.workspaceId, workspaceId));

    if (provider) {
      query = db
        .select()
        .from(integrationConnections)
        .where(
          and(
            eq(integrationConnections.workspaceId, workspaceId),
            eq(integrationConnections.provider, provider)
          )
        );
    }

    const connections = await query;

    // Check health if requested
    if (includeHealth) {
      const healthResults = await Promise.all(
        connections.map(async (conn) => {
          try {
            const isHealthy = await hub.checkConnectionHealth(conn.id);
            return { id: conn.id, healthy: isHealthy };
          } catch {
            return { id: conn.id, healthy: false };
          }
        })
      );

      const healthMap = new Map(healthResults.map(r => [r.id, r.healthy]));

      const enrichedConnections = connections.map(conn => ({
        ...conn,
        isHealthy: healthMap.get(conn.id) ?? false,
        // Remove sensitive data
        accessToken: undefined,
        refreshToken: undefined,
      }));

      return NextResponse.json({
        success: true,
        data: { connections: enrichedConnections },
      });
    }

    // Remove sensitive data
    const safeConnections = connections.map(conn => ({
      ...conn,
      accessToken: undefined,
      refreshToken: undefined,
    }));

    return NextResponse.json({
      success: true,
      data: { connections: safeConnections },
    });
  } catch (error) {
    console.error('[INTEGRATIONS_API_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Initiate OAuth flow or create connection
// ============================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, provider, workspaceId, userId, code, redirectUri, config } = body;

    if (!action || !provider || !workspaceId || !userId) {
      return NextResponse.json(
        { success: false, error: 'action, provider, workspaceId, and userId are required' },
        { status: 400 }
      );
    }

    const hub = new IntegrationHub();

    switch (action) {
      case 'initiate_oauth': {
        // Get OAuth authorization URL
        const authUrl = hub.getAuthorizationUrl(provider, {
          state: JSON.stringify({ workspaceId, userId }),
          redirectUri,
        });

        return NextResponse.json({
          success: true,
          data: { authorizationUrl: authUrl },
        });
      }

      case 'complete_oauth': {
        if (!code) {
          return NextResponse.json(
            { success: false, error: 'code is required for complete_oauth' },
            { status: 400 }
          );
        }

        // Exchange code for tokens
        const tokens = await hub.handleOAuthCallback(provider, code, redirectUri);

        // Create connection record
        const connectionId = await hub.createConnection({
          provider,
          workspaceId,
          userId,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          scopes: tokens.scopes || [],
          accountId: tokens.accountId,
          accountName: tokens.accountName,
        });

        return NextResponse.json({
          success: true,
          data: {
            connectionId,
            accountId: tokens.accountId,
            accountName: tokens.accountName,
          },
        });
      }

      case 'create_api_key': {
        // For API key based integrations
        if (!config?.apiKey) {
          return NextResponse.json(
            { success: false, error: 'config.apiKey is required for create_api_key' },
            { status: 400 }
          );
        }

        const db = getDb();
        const [connection] = await db
          .insert(integrationConnections)
          .values({
            provider,
            workspaceId,
            userId,
            accessToken: config.apiKey, // Store as access token
            scopes: [],
            status: 'active',
            metadata: config.metadata || {},
          })
          .returning();

        return NextResponse.json({
          success: true,
          data: { connectionId: connection.id },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[INTEGRATIONS_API_POST]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process integration request'
      },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Disconnect integration
// ============================================

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const connectionId = searchParams.get('connectionId');
    const workspaceId = searchParams.get('workspaceId');

    if (!connectionId || !workspaceId) {
      return NextResponse.json(
        { success: false, error: 'connectionId and workspaceId are required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify connection belongs to workspace
    const [connection] = await db
      .select()
      .from(integrationConnections)
      .where(
        and(
          eq(integrationConnections.id, connectionId),
          eq(integrationConnections.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Update status to disconnected
    await db
      .update(integrationConnections)
      .set({
        status: 'disconnected',
        accessToken: null,
        refreshToken: null,
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, connectionId));

    return NextResponse.json({
      success: true,
      data: { message: 'Integration disconnected successfully' },
    });
  } catch (error) {
    console.error('[INTEGRATIONS_API_DELETE]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect integration' },
      { status: 500 }
    );
  }
}
