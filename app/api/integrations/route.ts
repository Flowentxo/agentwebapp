/**
 * GET /api/integrations
 *
 * Fetches all integrations with their connection status for the current user
 *
 * NOTE: Currently returns empty array as database table not yet created.
 * To enable database persistence, run: npx tsx scripts/migrate-oauth2-integrations.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { oauthConnections } from '@/lib/db/schema-integrations';
import { eq } from 'drizzle-orm';
import { getSessionByToken } from '@/lib/auth/session';
import { getSessionTokenFromRequest } from '@/lib/auth/cookies';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Try to get user ID from session first
    let userId = 'demo-user';
    const sessionToken = getSessionTokenFromRequest(req);
    if (sessionToken) {
      const session = await getSessionByToken(sessionToken);
      if (session?.userId) {
        userId = session.userId;
      }
    }
    // Fallback to header
    if (userId === 'demo-user') {
      const headerUserId = req.headers.get('x-user-id');
      if (headerUserId && headerUserId !== 'demo-user') {
        userId = headerUserId;
      }
    }

    console.log('[GET /api/integrations] Using userId:', userId);
    const db = getDb();

    // Fetch active connections from legacy table (HubSpot)
    const legacyConnections = await db
      .select({
        provider: oauthConnections.provider,
        status: oauthConnections.isActive,
        updatedAt: oauthConnections.updatedAt,
      })
      .from(oauthConnections)
      .where(eq(oauthConnections.userId, userId));

    // Fetch active connections from new table (Google: Gmail, Calendar)
    const newIntegrations = await db.query.integrations.findMany({
      where: (integrations, { eq, and }) => 
        and(
          eq(integrations.userId, userId),
          eq(integrations.status, 'connected')
        ),
      columns: {
        provider: true, // e.g. 'google'
        service: true,  // e.g. 'gmail', 'calendar'
        updatedAt: true
      }
    });

    // Map Legacy (HubSpot)
    const mappedLegacy = legacyConnections.map(conn => ({
      id: conn.provider,
      status: conn.status ? 'connected' : 'error',
      lastSync: conn.updatedAt
    }));

    // Map New (Google)
    // Note: Frontend expects ID to be 'google' for Google Workspace (service='all'),
    // 'gmail' for Gmail only, 'google-calendar' for Calendar only
    const mappedNew = newIntegrations.map(int => {
       let id = int.service;
       if (int.provider === 'google') {
         if (int.service === 'all') {
           // Google Workspace (all services) - frontend expects 'google'
           id = 'google';
         } else if (int.service === 'calendar') {
           id = 'google-calendar';
         }
         // 'gmail' stays as 'gmail'
       }
       return {
         id: id,
         status: 'connected',
         lastSync: int.updatedAt
       };
    });

    // Merge lists, preferring new integrations if duplicates exist (though unlikely)
    const combined = [...mappedLegacy, ...mappedNew];

    return NextResponse.json({
      success: true,
      data: combined,
    });
  } catch (error: any) {
    console.error('[GET /api/integrations]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'fetch_failed',
          message: error.message || 'Failed to fetch integrations',
        },
      },
      { status: 500 }
    );
  }
}
