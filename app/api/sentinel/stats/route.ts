/**
 * Sentinel Dashboard Stats
 * GET - Dashboard aggregate statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sentinelSearchProfiles, sentinelSeenListings } from '@/lib/db/schema-sentinel';
import { withAuth, type AuthContext, type RouteContext } from '@/lib/auth/jwt-middleware';
import { eq, and, gte, sql, desc } from 'drizzle-orm';

export const GET = withAuth(async (req: NextRequest, _ctx: RouteContext, auth: AuthContext) => {
  const db = getDb();

  // Profile stats
  const profiles = await db
    .select()
    .from(sentinelSearchProfiles)
    .where(eq(sentinelSearchProfiles.userId, auth.userId));

  const totalProfiles = profiles.length;
  const activeProfiles = profiles.filter(p => p.isActive).length;
  const lastScanAt = profiles
    .map(p => p.lastScanAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] || null;

  // Listing stats
  const [listingStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      qualified: sql<number>`count(*) filter (where ai_score >= 60)::int`,
      avgScore: sql<number>`coalesce(avg(ai_score) filter (where ai_scored = true), 0)::int`,
      inPipeline: sql<number>`count(*) filter (where pushed_to_pipeline = true)::int`,
    })
    .from(sentinelSeenListings)
    .where(eq(sentinelSeenListings.userId, auth.userId));

  // Top red flags (aggregate across all listings)
  const redFlagRows = await db
    .select({
      flag: sql<string>`unnest(ai_risk_flags)`,
    })
    .from(sentinelSeenListings)
    .where(and(
      eq(sentinelSeenListings.userId, auth.userId),
      sql`ai_risk_flags is not null and array_length(ai_risk_flags, 1) > 0`,
    ));

  // Count flag occurrences
  const flagCounts = new Map<string, number>();
  for (const row of redFlagRows) {
    flagCounts.set(row.flag, (flagCounts.get(row.flag) || 0) + 1);
  }
  const topRedFlags = Array.from(flagCounts.entries())
    .map(([flag, count]) => ({ flag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return NextResponse.json({
    totalProfiles,
    activeProfiles,
    totalListings: listingStats.total,
    qualifiedListings: listingStats.qualified,
    avgScore: listingStats.avgScore,
    inPipeline: listingStats.inPipeline,
    lastScanAt,
    topRedFlags,
  });
});
