/**
 * Market Radar Tool
 *
 * Scrapes real estate portals using Firecrawl, deduplicates listings,
 * and stores new finds in the database.
 */

import { getDb } from '@/lib/db/connection';
import {
  sentinelSearchProfiles,
  sentinelSeenListings,
  sentinelScanLogs,
  type LocationFilter,
  type PortalScanResult,
} from '@/lib/db/schema-sentinel';
import { eq, and, sql } from 'drizzle-orm';
import { FirecrawlService, type ScrapedListing } from '../services/FirecrawlService';
import { generatePortalUrl, type SearchCriteria } from '../services/PortalUrlGenerator';
import { extractPortalId, normalizePrice, normalizeArea } from '../services/ListingParser';
import { SENTINEL_CONFIG, type PortalId, isValidPortal } from '../config';

// ── Types ─────────────────────────────────────────────────────

export interface MarketRadarInput {
  profile_id: string;
  portals?: string[];
  dry_run?: boolean;
}

export interface MarketRadarResult {
  scan_summary: {
    total_scraped: number;
    total_new: number;
    total_existing: number;
  };
  new_listings: Array<{
    id: string;
    title: string;
    price: number;
    portal: string;
    url: string;
  }>;
  portal_status: PortalScanResult[];
  credits_used: number;
  formatted_output: string;
}

export const MARKET_RADAR_TOOL = {
  name: 'market_radar',
  description: 'Scannt Immobilien-Portale nach neuen Inseraten basierend auf einem Suchprofil. Verwendet Firecrawl fuer Web-Scraping, dedupliziert automatisch und speichert neue Listings. Verbraucht Firecrawl-Credits.',
  input_schema: {
    type: 'object',
    properties: {
      profile_id: { type: 'string', description: 'ID des Suchprofils (aus search_manager list)' },
      portals: { type: 'array', items: { type: 'string' }, description: 'Optional: Nur bestimmte Portale scannen' },
      dry_run: { type: 'boolean', description: 'Wenn true: Zeigt URLs ohne zu scrapen' },
    },
    required: ['profile_id'],
  },
};

// ── Executor ──────────────────────────────────────────────────

export async function executeMarketRadar(
  input: MarketRadarInput,
  context: { userId: string },
): Promise<MarketRadarResult> {
  const { profile_id, portals: portalOverride, dry_run } = input;
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

  if (!profile.isActive) {
    return emptyResult(`Suchprofil "${profile.name}" ist pausiert.`);
  }

  // Check minimum scan interval
  if (profile.lastScanAt) {
    const minInterval = SENTINEL_CONFIG.minScanIntervalMinutes * 60 * 1000;
    const elapsed = Date.now() - new Date(profile.lastScanAt).getTime();
    if (elapsed < minInterval) {
      const waitMinutes = Math.ceil((minInterval - elapsed) / 60000);
      return emptyResult(`Mindestabstand zwischen Scans: ${SENTINEL_CONFIG.minScanIntervalMinutes} Min. Bitte in ${waitMinutes} Min. erneut versuchen.`);
    }
  }

  // Firecrawl service
  const firecrawl = FirecrawlService.getInstance();

  // Budget check
  const budget = await firecrawl.checkBudget(userId);
  if (!budget.allowed) {
    return emptyResult(`Tageslimit erreicht (${budget.reason}). Naechster Scan morgen.`);
  }

  // Determine portals
  const targetPortals = (portalOverride || profile.portals || ['immoscout24'])
    .filter(p => isValidPortal(p)) as PortalId[];

  // Build search criteria
  const location = profile.location as LocationFilter;
  const criteria: SearchCriteria = {
    location: { city: location.city, state: location.state, plz: location.zip_codes?.[0], radius_km: location.radius_km },
    property_type: profile.propertyType as any,
    purchase_type: profile.purchaseType as any,
    price_min: profile.priceMin || undefined,
    price_max: profile.priceMax || undefined,
    area_min: profile.areaMin || undefined,
    area_max: profile.areaMax || undefined,
    rooms_min: profile.roomsMin ? parseFloat(profile.roomsMin) : undefined,
  };

  // Dry run: just show URLs
  if (dry_run) {
    const urls = targetPortals.map(p => ({
      portal: p,
      url: generatePortalUrl(p, criteria),
    }));
    const lines = [
      `Dry-Run: Such-URLs fuer "${profile.name}"`,
      `════════════════════════════════════`,
      ``,
      ...urls.map(u => `${u.portal}: ${u.url}`),
    ];
    return {
      scan_summary: { total_scraped: 0, total_new: 0, total_existing: 0 },
      new_listings: [],
      portal_status: [],
      credits_used: 0,
      formatted_output: lines.join('\n'),
    };
  }

  // Check Firecrawl is configured
  if (!firecrawl.isConfigured()) {
    return emptyResult('Firecrawl API Key nicht konfiguriert. Bitte FIRECRAWL_API_KEY in .env.local setzen.');
  }

  // Create scan log
  const [scanLog] = await db
    .insert(sentinelScanLogs)
    .values({ profileId: profile_id, userId, metadata: { trigger: 'manual' } })
    .returning();

  // Scan each portal
  const portalResults: PortalScanResult[] = [];
  const allNewListings: Array<{ id: string; title: string; price: number; portal: string; url: string }> = [];
  let totalCredits = 0;
  let totalScraped = 0;
  let totalNew = 0;

  for (const portal of targetPortals) {
    const startMs = Date.now();

    try {
      const url = generatePortalUrl(portal, criteria);
      const scrapeResult = await firecrawl.scrapeListPage(url, portal);

      totalCredits += scrapeResult.creditsUsed;
      firecrawl.trackCredits(userId, scrapeResult.creditsUsed);

      const listings = scrapeResult.listings;
      totalScraped += listings.length;

      // Upsert each listing (dedup via UNIQUE index)
      let portalNew = 0;
      for (const listing of listings) {
        const externalId = extractPortalId(listing.detail_url, portal) || listing.portal_id || listing.detail_url;
        if (!externalId) continue;

        try {
          const [inserted] = await db
            .insert(sentinelSeenListings)
            .values({
              profileId: profile_id,
              userId,
              portal,
              externalId,
              listingUrl: listing.detail_url,
              title: listing.title,
              price: normalizePrice(listing.price) || null,
              areaSqm: listing.area_sqm ? String(normalizeArea(listing.area_sqm)) : null,
              rooms: listing.rooms ? String(listing.rooms) : null,
              addressRaw: listing.address || null,
            })
            .onConflictDoUpdate({
              target: [sentinelSeenListings.profileId, sentinelSeenListings.portal, sentinelSeenListings.externalId],
              set: { lastCheckedAt: new Date() },
            })
            .returning();

          // Detect if this was a new insert (created just now) vs update
          const isNew = inserted && (
            new Date(inserted.firstSeenAt).getTime() > Date.now() - 5000
          );

          if (isNew) {
            portalNew++;
            allNewListings.push({
              id: inserted.id,
              title: listing.title || 'Ohne Titel',
              price: normalizePrice(listing.price),
              portal,
              url: listing.detail_url,
            });
          }
        } catch (err: any) {
          console.error(`[MARKET_RADAR] Listing upsert error:`, err.message);
        }
      }

      totalNew += portalNew;

      portalResults.push({
        portal,
        status: 'success',
        listings_found: listings.length,
        new_listings: portalNew,
        credits_used: scrapeResult.creditsUsed,
        duration_ms: Date.now() - startMs,
      });
    } catch (err: any) {
      console.error(`[MARKET_RADAR] Portal ${portal} failed:`, err.message);
      portalResults.push({
        portal,
        status: 'error',
        listings_found: 0,
        new_listings: 0,
        error_message: err.message,
        credits_used: 0,
        duration_ms: Date.now() - startMs,
      });
    }
  }

  // Update scan log
  const scanStatus = portalResults.every(p => p.status === 'error') ? 'error'
    : portalResults.some(p => p.status === 'error') ? 'partial'
    : 'success';

  await db
    .update(sentinelScanLogs)
    .set({
      completedAt: new Date(),
      status: scanStatus,
      portalsScanned: portalResults,
      totalNew,
      creditsUsed: totalCredits,
    })
    .where(eq(sentinelScanLogs.id, scanLog.id));

  // Update profile stats
  await db
    .update(sentinelSearchProfiles)
    .set({
      totalScans: sql`${sentinelSearchProfiles.totalScans} + 1`,
      totalFound: sql`${sentinelSearchProfiles.totalFound} + ${totalNew}`,
      lastScanAt: new Date(),
      lastScanStatus: scanStatus,
      updatedAt: new Date(),
    })
    .where(eq(sentinelSearchProfiles.id, profile_id));

  // Format output
  const lines = [
    `Scan-Ergebnis: "${profile.name}"`,
    `════════════════════════════════════`,
    ``,
  ];

  for (const pr of portalResults) {
    const icon = pr.status === 'success' ? '[OK]' : pr.status === 'error' ? '[FEHLER]' : '[TEIL]';
    lines.push(`${icon} ${pr.portal}: ${pr.listings_found} Inserate gefunden, ${pr.new_listings} neu`);
    if (pr.error_message) lines.push(`     Fehler: ${pr.error_message}`);
  }

  lines.push(``);
  lines.push(`Zusammenfassung:`);
  lines.push(`  Gescannt: ${totalScraped} Inserate`);
  lines.push(`  Neu:      ${totalNew} Inserate`);
  lines.push(`  Credits:  ${totalCredits} verbraucht`);

  if (allNewListings.length > 0) {
    lines.push(``);
    lines.push(`Neue Inserate:`);
    for (const l of allNewListings.slice(0, 10)) {
      const priceStr = l.price ? `${l.price.toLocaleString('de-DE')} EUR` : 'k.A.';
      lines.push(`  - ${l.title} (${priceStr}) [${l.portal}]`);
    }
    if (allNewListings.length > 10) {
      lines.push(`  ... und ${allNewListings.length - 10} weitere`);
    }
    lines.push(``);
    lines.push(`Nutze "deal_qualifier" um die neuen Inserate per KI bewerten zu lassen.`);
  }

  return {
    scan_summary: {
      total_scraped: totalScraped,
      total_new: totalNew,
      total_existing: totalScraped - totalNew,
    },
    new_listings: allNewListings,
    portal_status: portalResults,
    credits_used: totalCredits,
    formatted_output: lines.join('\n'),
  };
}

function emptyResult(message: string): MarketRadarResult {
  return {
    scan_summary: { total_scraped: 0, total_new: 0, total_existing: 0 },
    new_listings: [],
    portal_status: [],
    credits_used: 0,
    formatted_output: message,
  };
}
