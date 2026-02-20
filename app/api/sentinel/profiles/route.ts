/**
 * Sentinel Search Profiles API
 * GET  - List all profiles for authenticated user
 * POST - Create a new search profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sentinelSearchProfiles } from '@/lib/db/schema-sentinel';
import { withAuth, type AuthContext, type RouteContext } from '@/lib/auth/jwt-middleware';
import { eq, and, desc, sql } from 'drizzle-orm';
import { SENTINEL_CONFIG, SUPPORTED_PORTALS, FREQUENCY_PRESETS, type FrequencyPreset } from '@/lib/agents/property-sentinel/config';

// GET - List all search profiles
export const GET = withAuth(async (req: NextRequest, _ctx: RouteContext, auth: AuthContext) => {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get('active') === 'true';

  const conditions = [eq(sentinelSearchProfiles.userId, auth.userId)];
  if (activeOnly) {
    conditions.push(eq(sentinelSearchProfiles.isActive, true));
  }

  const profiles = await db
    .select()
    .from(sentinelSearchProfiles)
    .where(and(...conditions))
    .orderBy(desc(sentinelSearchProfiles.createdAt));

  const active = profiles.filter(p => p.isActive).length;

  return NextResponse.json({
    profiles,
    meta: { total: profiles.length, active },
  });
});

// POST - Create a new search profile
export const POST = withAuth(async (req: NextRequest, _ctx: RouteContext, auth: AuthContext) => {
  const db = getDb();
  const body = await req.json();

  // Validate required fields
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 });
  }
  if (!body.location?.city?.trim()) {
    return NextResponse.json({ error: 'Stadt ist erforderlich' }, { status: 400 });
  }

  // Check max profiles limit
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sentinelSearchProfiles)
    .where(eq(sentinelSearchProfiles.userId, auth.userId));

  if (countResult.count >= SENTINEL_CONFIG.maxProfilesPerUser) {
    return NextResponse.json(
      { error: `Maximal ${SENTINEL_CONFIG.maxProfilesPerUser} Suchprofile erlaubt` },
      { status: 400 },
    );
  }

  // Validate portals
  const portals = body.portals?.length
    ? body.portals.filter((p: string) => SUPPORTED_PORTALS.includes(p as any))
    : ['immoscout24'];

  // Resolve cron expression from frequency preset
  const frequency: FrequencyPreset = body.frequency || 'daily';
  const preset = frequency !== 'custom' ? FREQUENCY_PRESETS[frequency] : undefined;
  const cronExpression = preset?.cronExpression || '0 8 * * *';

  const [profile] = await db
    .insert(sentinelSearchProfiles)
    .values({
      userId: auth.userId,
      workspaceId: auth.userId, // default to userId as workspace
      name: body.name.trim(),
      location: {
        city: body.location.city.trim(),
        state: body.location.state,
        zip_codes: body.location.zip_codes,
        radius_km: body.location.radius_km,
      },
      propertyType: body.propertyType || 'wohnung',
      purchaseType: body.purchaseType || 'kauf',
      priceMin: body.priceMin ? parseInt(body.priceMin) : null,
      priceMax: body.priceMax ? parseInt(body.priceMax) : null,
      areaMin: body.areaMin ? parseInt(body.areaMin) : null,
      areaMax: body.areaMax ? parseInt(body.areaMax) : null,
      roomsMin: body.roomsMin?.toString() || null,
      roomsMax: body.roomsMax?.toString() || null,
      yieldMin: body.yieldMin?.toString() || null,
      portals,
      frequency,
      cronExpression,
      minScore: body.minScore || SENTINEL_CONFIG.defaultMinScore,
      customFilters: body.customFilters || null,
    })
    .returning();

  return NextResponse.json({ success: true, profile }, { status: 201 });
});
