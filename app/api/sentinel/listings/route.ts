/**
 * Sentinel Listings API
 * GET   - List scored listings with pagination/filters/sorting
 * PATCH - Batch actions (dismiss, push to pipeline)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sentinelSeenListings } from '@/lib/db/schema-sentinel';
import { withAuth, type AuthContext, type RouteContext } from '@/lib/auth/jwt-middleware';
import { eq, and, desc, asc, gte, sql, inArray } from 'drizzle-orm';

// GET - Paginated listings
export const GET = withAuth(async (req: NextRequest, _ctx: RouteContext, auth: AuthContext) => {
  const db = getDb();
  const { searchParams } = new URL(req.url);

  const profileId = searchParams.get('profileId');
  const minScore = parseInt(searchParams.get('minScore') || '0');
  const sort = searchParams.get('sort') || 'score';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const offset = (page - 1) * limit;

  // Build conditions
  const conditions = [eq(sentinelSeenListings.userId, auth.userId)];
  if (profileId) {
    conditions.push(eq(sentinelSeenListings.profileId, profileId));
  }
  if (minScore > 0) {
    conditions.push(gte(sentinelSeenListings.aiScore, minScore));
  }

  // Sort
  const orderBy = sort === 'date'
    ? desc(sentinelSeenListings.firstSeenAt)
    : sort === 'price'
      ? asc(sentinelSeenListings.price)
      : desc(sentinelSeenListings.aiScore);

  // Count total
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sentinelSeenListings)
    .where(and(...conditions));

  const total = countResult.count;

  // Fetch page
  const listings = await db
    .select()
    .from(sentinelSeenListings)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    listings,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// PATCH - Batch actions
export const PATCH = withAuth(async (req: NextRequest, _ctx: RouteContext, auth: AuthContext) => {
  const db = getDb();
  const body = await req.json();

  const { listingIds, action } = body;

  if (!Array.isArray(listingIds) || listingIds.length === 0) {
    return NextResponse.json({ error: 'listingIds erforderlich' }, { status: 400 });
  }

  if (!['dismiss', 'push_to_pipeline'].includes(action)) {
    return NextResponse.json({ error: 'Ungueltige Aktion' }, { status: 400 });
  }

  let updateData: Record<string, any>;

  if (action === 'dismiss') {
    updateData = { isStale: true, staleSince: new Date() };
  } else {
    updateData = { pushedToPipeline: true, pushedAt: new Date() };
  }

  const result = await db
    .update(sentinelSeenListings)
    .set(updateData)
    .where(and(
      eq(sentinelSeenListings.userId, auth.userId),
      inArray(sentinelSeenListings.id, listingIds),
    ))
    .returning({ id: sentinelSeenListings.id });

  return NextResponse.json({ success: true, updated: result.length });
});
