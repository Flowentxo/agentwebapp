/**
 * API Key Audit Events Endpoint
 *
 * GET /api/api-keys/[id]/audit - Get audit trail for specific API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { apiKeyAuditEvents, apiKeys } from '@/lib/db/schema-api-keys';
import { getSessionUser } from '@/lib/auth/session';
import { eq, and, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/api-keys/[id]/audit - Get audit events
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in' },
        { status: 401 }
      );
    }

    const db = getDb();

    // Verify ownership
    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, params.id), eq(apiKeys.userId, user.id)))
      .limit(1);

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Not found', message: 'API key not found' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const url = req.nextUrl;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 500);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get audit events
    const events = await db
      .select()
      .from(apiKeyAuditEvents)
      .where(eq(apiKeyAuditEvents.apiKeyId, params.id))
      .orderBy(desc(apiKeyAuditEvents.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: {
        events,
        meta: {
          limit,
          offset,
          total: events.length,
        },
      },
    });
  } catch (error) {
    console.error('[API_KEY_AUDIT]', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch audit events' },
      { status: 500 }
    );
  }
}
