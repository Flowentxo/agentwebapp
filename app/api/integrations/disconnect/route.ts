/**
 * POST /api/integrations/disconnect
 *
 * Disconnects an integration by removing it from the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { integrations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionByToken } from '@/lib/auth/session';
import { getSessionTokenFromRequest } from '@/lib/auth/cookies';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Get user ID from session
    let userId = 'demo-user';
    const sessionToken = getSessionTokenFromRequest(req);
    if (sessionToken) {
      const session = await getSessionByToken(sessionToken);
      if (session?.userId) {
        userId = session.userId;
      }
    }

    const body = await req.json();
    const { provider, service } = body;

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider is required' },
        { status: 400 }
      );
    }

    console.log('[DISCONNECT] Disconnecting:', { userId, provider, service });

    const db = getDb();

    // Determine service to disconnect
    let serviceToDelete = service;
    if (provider === 'google' && !service) {
      // If no specific service, disconnect all Google services
      serviceToDelete = 'all';
    }

    // Delete the integration
    const deleted = await db
      .delete(integrations)
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.provider, provider),
          serviceToDelete ? eq(integrations.service, serviceToDelete) : undefined
        )
      )
      .returning();

    console.log('[DISCONNECT] Deleted records:', deleted.length);

    return NextResponse.json({
      success: true,
      deleted: deleted.length,
      message: `Disconnected ${provider}${serviceToDelete ? ` (${serviceToDelete})` : ''}`,
    });
  } catch (error: any) {
    console.error('[DISCONNECT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect integration' },
      { status: 500 }
    );
  }
}
