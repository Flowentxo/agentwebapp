/**
 * HUBSPOT INTEGRATION - STATUS
 *
 * Returns connection status and account information
 */

import { NextRequest, NextResponse } from 'next/server';
import { hubspotOAuthService } from '@/server/services/HubSpotOAuthService';
import { getDb } from '@/lib/db';
import { integrationUsage } from '@/lib/db/schema-integrations';
import { eq, and, gte } from 'drizzle-orm';

/**
 * GET /api/integrations/hubspot/status
 *
 * Returns HubSpot integration status
 */
export async function GET(req: NextRequest) {
  try {
    // Get user ID from headers
    const userId = req.headers.get('x-user-id') || 'demo-user';

    // Get connection
    const connection = await hubspotOAuthService.getConnection(userId);

    if (!connection) {
      return NextResponse.json({
        connected: false,
        status: 'disconnected',
        message: 'No HubSpot connection found',
      });
    }

    // Get usage statistics (last 24 hours)
    const db = getDb();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const usageStats = await db
      .select()
      .from(integrationUsage)
      .where(
        and(
          eq(integrationUsage.userId, userId),
          eq(integrationUsage.provider, 'hubspot'),
          gte(integrationUsage.createdAt, yesterday)
        )
      );

    const successCount = usageStats.filter((u) => u.status === 'success').length;
    const errorCount = usageStats.filter((u) => u.status === 'error').length;
    const rateLimitedCount = usageStats.filter((u) => u.status === 'rate_limited').length;

    return NextResponse.json({
      connected: true,
      status: connection.isActive ? 'connected' : 'disconnected',
      accountInfo: {
        portalId: connection.metadata?.portalId,
        user: connection.metadata?.user,
        userEmail: connection.metadata?.userEmail,
        hubDomain: connection.metadata?.hubDomain,
      },
      lastSync: connection.updatedAt,
      expiresAt: connection.expiresAt,
      stats: {
        apiCalls24h: usageStats.length,
        successCount,
        errorCount,
        rateLimitedCount,
        errorRate: usageStats.length > 0 ? (errorCount / usageStats.length) * 100 : 0,
      },
    });
  } catch (error: any) {
    console.error('[HUBSPOT_STATUS] Error getting status:', error);
    return NextResponse.json(
      {
        error: 'Failed to get HubSpot status',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
