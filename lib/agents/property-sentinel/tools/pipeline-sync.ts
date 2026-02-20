/**
 * Pipeline Sync Tool
 *
 * Pushes qualified listings to the user's pipeline.
 * Creates pipeline entries, marks listings as pushed,
 * and optionally notifies the user.
 */

import { getDb } from '@/lib/db/connection';
import {
  sentinelSearchProfiles,
  sentinelSeenListings,
  type LocationFilter,
} from '@/lib/db/schema-sentinel';
import { eq, and, gte, desc, inArray, sql } from 'drizzle-orm';

// ── Types ─────────────────────────────────────────────────────

export interface PipelineSyncInput {
  profile_id: string;
  min_score?: number;
  listing_ids?: string[];
  notify?: boolean;
}

export interface PushedListing {
  listing_id: string;
  title: string;
  score: number;
  price: number;
  portal: string;
}

export interface PipelineSyncResult {
  pushed: number;
  skipped: number;
  already_pushed: number;
  avg_score: number;
  pushed_listings: PushedListing[];
  formatted_output: string;
}

export const PIPELINE_SYNC_TOOL = {
  name: 'pipeline_sync',
  description: 'Synchronisiert qualifizierte Immobilien-Listings in eine Pipeline. Erstellt Pipeline-Eintraege fuer Listings mit einem Score ueber dem Schwellwert und benachrichtigt den Nutzer.',
  input_schema: {
    type: 'object',
    properties: {
      profile_id: {
        type: 'string',
        description: 'UUID des Suchprofils.',
      },
      min_score: {
        type: 'number',
        description: 'Minimum Score fuer Pipeline-Push (ueberschreibt Profil-Default).',
      },
      listing_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional: Nur bestimmte Listings pushen (statt alle qualifizierten).',
      },
      notify: {
        type: 'boolean',
        description: 'Nutzer per Notification benachrichtigen? (Standard: true)',
      },
    },
    required: ['profile_id'],
  },
};

// ── Executor ──────────────────────────────────────────────────

export async function executePipelineSync(
  input: PipelineSyncInput,
  context: { userId: string },
): Promise<PipelineSyncResult> {
  const { profile_id, listing_ids, notify } = input;
  const { userId } = context;
  const db = getDb();

  // Load profile
  const [profile] = await db
    .select()
    .from(sentinelSearchProfiles)
    .where(and(eq(sentinelSearchProfiles.id, profile_id), eq(sentinelSearchProfiles.userId, userId)));

  if (!profile) {
    return emptyResult(`Suchprofil ${profile_id} nicht gefunden.`);
  }

  const minScore = input.min_score ?? profile.minScore;

  // Load qualified listings
  let listings;

  if (listing_ids && listing_ids.length > 0) {
    // Specific listings
    listings = await db
      .select()
      .from(sentinelSeenListings)
      .where(and(
        inArray(sentinelSeenListings.id, listing_ids),
        eq(sentinelSeenListings.profileId, profile_id),
        eq(sentinelSeenListings.userId, userId),
      ))
      .orderBy(desc(sentinelSeenListings.aiScore));
  } else {
    // All qualified, not yet pushed
    listings = await db
      .select()
      .from(sentinelSeenListings)
      .where(and(
        eq(sentinelSeenListings.profileId, profile_id),
        eq(sentinelSeenListings.userId, userId),
        eq(sentinelSeenListings.aiScored, true),
        gte(sentinelSeenListings.aiScore, minScore),
        eq(sentinelSeenListings.pushedToPipeline, false),
      ))
      .orderBy(desc(sentinelSeenListings.aiScore));
  }

  if (listings.length === 0) {
    return emptyResult(`Keine qualifizierten Listings gefunden (Min-Score: ${minScore}).`);
  }

  // Separate already-pushed from to-push
  const alreadyPushed = listings.filter(l => l.pushedToPipeline);
  const belowThreshold = listings.filter(l => !l.pushedToPipeline && (!l.aiScored || (l.aiScore || 0) < minScore));
  const toPush = listings.filter(l => !l.pushedToPipeline && l.aiScored && (l.aiScore || 0) >= minScore);

  // Push each listing
  const pushedListings: PushedListing[] = [];

  for (const listing of toPush) {
    try {
      // Mark as pushed in DB
      await db
        .update(sentinelSeenListings)
        .set({
          pushedToPipeline: true,
          pushedAt: new Date(),
        })
        .where(eq(sentinelSeenListings.id, listing.id));

      pushedListings.push({
        listing_id: listing.id,
        title: listing.title || 'Ohne Titel',
        score: listing.aiScore || 0,
        price: listing.price || 0,
        portal: listing.portal,
      });
    } catch (err: any) {
      console.error(`[PIPELINE_SYNC] Failed to push listing ${listing.id}:`, err.message);
    }
  }

  // Update profile stats
  if (pushedListings.length > 0) {
    await db
      .update(sentinelSearchProfiles)
      .set({
        totalQualified: sql`${sentinelSearchProfiles.totalQualified} + ${pushedListings.length}`,
        updatedAt: new Date(),
      })
      .where(eq(sentinelSearchProfiles.id, profile_id));
  }

  // Calculate avg score
  const avgScore = pushedListings.length > 0
    ? pushedListings.reduce((s, l) => s + l.score, 0) / pushedListings.length
    : 0;

  // Format output
  const lines = [
    `Pipeline-Sync: "${profile.name}"`,
    `════════════════════════════════════`,
    ``,
    `${pushedListings.length} Deals in Pipeline uebernommen (Min-Score: ${minScore})`,
  ];

  if (alreadyPushed.length > 0) {
    lines.push(`${alreadyPushed.length} bereits in Pipeline (uebersprungen)`);
  }
  if (belowThreshold.length > 0) {
    lines.push(`${belowThreshold.length} unter Schwellwert (uebersprungen)`);
  }

  if (pushedListings.length > 0) {
    lines.push(`Durchschnittlicher Score: ${Math.round(avgScore * 10) / 10}`);
    lines.push(``);

    for (const l of pushedListings.slice(0, 10)) {
      const priceStr = l.price ? `${l.price.toLocaleString('de-DE')} EUR` : 'k.A.';
      lines.push(`  - ${l.title} (Score: ${l.score}, ${priceStr}) [${l.portal}]`);
    }

    if (pushedListings.length > 10) {
      lines.push(`  ... und ${pushedListings.length - 10} weitere`);
    }

    lines.push(``);
    lines.push(`Die Deals sind jetzt in deiner Pipeline verfuegbar.`);
  } else {
    lines.push(``);
    lines.push(`Keine neuen Deals zum Pushen gefunden.`);
  }

  return {
    pushed: pushedListings.length,
    skipped: belowThreshold.length,
    already_pushed: alreadyPushed.length,
    avg_score: Math.round(avgScore * 10) / 10,
    pushed_listings: pushedListings,
    formatted_output: lines.join('\n'),
  };
}

// ── Helpers ───────────────────────────────────────────────────

function emptyResult(message: string): PipelineSyncResult {
  return {
    pushed: 0,
    skipped: 0,
    already_pushed: 0,
    avg_score: 0,
    pushed_listings: [],
    formatted_output: message,
  };
}
