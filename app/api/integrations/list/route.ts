/**
 * List All User Integrations API
 * GET /api/integrations/list - Get all connected integrations for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserIntegrations, getIntegrationStats } from '@/lib/integrations/providers/integration-repository';
import { getProviderConfig, getProvidersByCategory, PROVIDER_CONFIGS } from '@/lib/integrations/providers/provider-config';

// Get session user ID
async function getUserId(): Promise<string | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('session');
  if (!sessionCookie?.value) return null;

  try {
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    return sessionData.userId || null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const category = request.nextUrl.searchParams.get('category');
    const status = request.nextUrl.searchParams.get('status') as 'active' | 'error' | 'expired' | null;
    const includeStats = request.nextUrl.searchParams.get('stats') === 'true';

    // Get user's connected integrations
    const integrations = await getUserIntegrations(userId);

    // Filter by status if specified
    let filteredIntegrations = integrations;
    if (status) {
      filteredIntegrations = integrations.filter(i => i.status === status);
    }

    // Map to response format
    const connectedIntegrations = filteredIntegrations.map(integration => {
      const config = getProviderConfig(integration.provider);
      return {
        id: integration.id,
        provider: integration.provider,
        service: integration.service,
        status: integration.status,
        connectedAt: integration.createdAt,
        lastUsed: integration.lastUsedAt,
        userInfo: integration.userInfo,
        metadata: integration.metadata,
        config: config ? {
          name: config.name,
          category: config.category,
          icon: config.icon,
          description: config.description,
        } : null,
      };
    });

    // Filter by category if specified
    let result = connectedIntegrations;
    if (category) {
      result = connectedIntegrations.filter(i => i.config?.category === category);
    }

    // Get available providers (not yet connected)
    const connectedProviders = new Set(integrations.map(i => i.provider));
    const availableProviders = Object.entries(PROVIDER_CONFIGS)
      .filter(([key, config]) => {
        // Filter out connected providers
        if (connectedProviders.has(key)) return false;
        // Filter by category if specified
        if (category && config.category !== category) return false;
        return true;
      })
      .map(([key, config]) => ({
        provider: key,
        name: config.name,
        category: config.category,
        icon: config.icon,
        description: config.description,
        configured: !!config.clientId, // Check if API keys are configured
      }));

    // Get stats if requested
    let stats = null;
    if (includeStats) {
      stats = await getIntegrationStats(userId);
    }

    // Group by category
    const byCategory: Record<string, typeof result> = {};
    for (const integration of result) {
      const cat = integration.config?.category || 'other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(integration);
    }

    return NextResponse.json({
      connected: result,
      available: availableProviders,
      byCategory,
      stats,
      summary: {
        total: result.length,
        active: result.filter(i => i.status === 'active').length,
        error: result.filter(i => i.status === 'error').length,
        expired: result.filter(i => i.status === 'expired').length,
      },
    });
  } catch (error: any) {
    console.error(`[INTEGRATIONS_LIST] Error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to list integrations' },
      { status: 500 }
    );
  }
}
