/**
 * Sentinel Manual Scan Trigger
 * POST - Trigger a manual scan for a profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sentinelSearchProfiles, sentinelScanLogs } from '@/lib/db/schema-sentinel';
import { withAuth, type AuthContext, type RouteContext } from '@/lib/auth/jwt-middleware';
import { eq, and } from 'drizzle-orm';
import { SENTINEL_CONFIG } from '@/lib/agents/property-sentinel/config';

export const POST = withAuth(async (req: NextRequest, ctx: RouteContext, auth: AuthContext) => {
  const profileId = ctx.params.profileId;
  const db = getDb();

  // Verify profile exists and belongs to user
  const [profile] = await db
    .select()
    .from(sentinelSearchProfiles)
    .where(and(
      eq(sentinelSearchProfiles.id, profileId),
      eq(sentinelSearchProfiles.userId, auth.userId),
    ));

  if (!profile) {
    return NextResponse.json({ error: 'Profil nicht gefunden' }, { status: 404 });
  }

  // Rate limit check: min interval between scans
  if (profile.lastScanAt) {
    const minIntervalMs = SENTINEL_CONFIG.minScanIntervalMinutes * 60 * 1000;
    const elapsed = Date.now() - new Date(profile.lastScanAt).getTime();
    if (elapsed < minIntervalMs) {
      const remaining = Math.ceil((minIntervalMs - elapsed) / 60000);
      return NextResponse.json(
        { error: `Bitte warte noch ${remaining} Minuten bis zum naechsten Scan` },
        { status: 429 },
      );
    }
  }

  // Create scan log entry
  const [scanLog] = await db
    .insert(sentinelScanLogs)
    .values({
      profileId,
      userId: auth.userId,
      status: 'queued',
    })
    .returning();

  return NextResponse.json(
    { success: true, scanId: scanLog.id, message: 'Scan gestartet' },
    { status: 202 },
  );
});
