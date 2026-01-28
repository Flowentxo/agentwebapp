/**
 * Provider Integration API
 * GET /api/integrations/[provider] - Get integration status
 * DELETE /api/integrations/[provider] - Disconnect integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIntegration, disconnectIntegration } from '@/lib/integrations/providers/integration-repository';
import { getProviderConfig } from '@/lib/integrations/providers/provider-config';
import { testProviderConnection } from '@/lib/integrations/services';

// Get session user ID (simplified - use your actual auth)
async function getUserId(): Promise<string | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('session');
  if (!sessionCookie?.value) return null;

  try {
    // Parse session token to get user ID
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    return sessionData.userId || null;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const provider = params.provider;
    const config = getProviderConfig(provider);

    if (!config) {
      return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });
    }

    // Get integration from database
    const integration = await getIntegration(userId, provider);

    if (!integration) {
      return NextResponse.json({
        provider,
        connected: false,
        status: 'disconnected',
        config: {
          name: config.name,
          category: config.category,
          icon: config.icon,
          description: config.description,
        },
      });
    }

    // Test connection if requested
    const testConnection = request.nextUrl.searchParams.get('test') === 'true';
    let connectionStatus = integration.status;

    if (testConnection) {
      const isConnected = await testProviderConnection(provider, userId);
      connectionStatus = isConnected ? 'active' : 'error';
    }

    return NextResponse.json({
      provider,
      connected: true,
      status: connectionStatus,
      service: integration.service,
      connectedAt: integration.createdAt,
      lastUsed: integration.lastUsedAt,
      userInfo: integration.userInfo,
      metadata: integration.metadata,
      config: {
        name: config.name,
        category: config.category,
        icon: config.icon,
        description: config.description,
      },
    });
  } catch (error: any) {
    console.error(`[INTEGRATION_GET] Error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to get integration status' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const provider = params.provider;
    const config = getProviderConfig(provider);

    if (!config) {
      return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });
    }

    // Get service from query params (optional)
    const service = request.nextUrl.searchParams.get('service') || undefined;

    // Disconnect integration
    await disconnectIntegration(userId, provider, service);

    return NextResponse.json({
      success: true,
      message: `Successfully disconnected ${config.name}`,
    });
  } catch (error: any) {
    console.error(`[INTEGRATION_DELETE] Error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect integration' },
      { status: 500 }
    );
  }
}
