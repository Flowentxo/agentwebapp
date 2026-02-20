/**
 * Sentinel Single Profile API
 * GET    - Get single profile
 * PATCH  - Update profile
 * DELETE - Delete profile (cascade removes listings)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sentinelSearchProfiles } from '@/lib/db/schema-sentinel';
import { withAuth, type AuthContext, type RouteContext } from '@/lib/auth/jwt-middleware';
import { eq, and } from 'drizzle-orm';

// GET - Single profile
export const GET = withAuth(async (req: NextRequest, ctx: RouteContext, auth: AuthContext) => {
  const id = ctx.params.id;
  const db = getDb();

  const [profile] = await db
    .select()
    .from(sentinelSearchProfiles)
    .where(and(
      eq(sentinelSearchProfiles.id, id),
      eq(sentinelSearchProfiles.userId, auth.userId),
    ));

  if (!profile) {
    return NextResponse.json({ error: 'Profil nicht gefunden' }, { status: 404 });
  }

  return NextResponse.json({ profile });
});

// PATCH - Update profile
export const PATCH = withAuth(async (req: NextRequest, ctx: RouteContext, auth: AuthContext) => {
  const id = ctx.params.id;
  const db = getDb();
  const body = await req.json();

  // Build update object from allowed fields
  const allowedFields = [
    'name', 'location', 'propertyType', 'purchaseType',
    'priceMin', 'priceMax', 'areaMin', 'areaMax',
    'roomsMin', 'roomsMax', 'yieldMin', 'portals',
    'minScore', 'frequency', 'cronExpression', 'isActive',
    'autoPipeline', 'pipelineId',
  ];

  const updateData: Record<string, any> = { updatedAt: new Date() };
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  // Handle pause/unpause
  if (body.isActive === false && body.pausedUntil) {
    updateData.pausedUntil = new Date(body.pausedUntil);
  } else if (body.isActive === true) {
    updateData.pausedUntil = null;
  }

  const [updated] = await db
    .update(sentinelSearchProfiles)
    .set(updateData)
    .where(and(
      eq(sentinelSearchProfiles.id, id),
      eq(sentinelSearchProfiles.userId, auth.userId),
    ))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'Profil nicht gefunden' }, { status: 404 });
  }

  return NextResponse.json({ success: true, profile: updated });
});

// DELETE - Hard delete profile (cascade deletes listings)
export const DELETE = withAuth(async (req: NextRequest, ctx: RouteContext, auth: AuthContext) => {
  const id = ctx.params.id;
  const db = getDb();

  const [deleted] = await db
    .delete(sentinelSearchProfiles)
    .where(and(
      eq(sentinelSearchProfiles.id, id),
      eq(sentinelSearchProfiles.userId, auth.userId),
    ))
    .returning({ id: sentinelSearchProfiles.id });

  if (!deleted) {
    return NextResponse.json({ error: 'Profil nicht gefunden' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
});
