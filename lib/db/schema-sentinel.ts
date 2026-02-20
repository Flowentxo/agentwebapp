/**
 * Property Sentinel Database Schema
 *
 * Three tables for the Property Sentinel agent:
 * - sentinel_search_profiles: User search configurations
 * - sentinel_seen_listings: Deduplication store + listing data + AI scores
 * - sentinel_scan_logs: Audit trail for every scan
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ── Type Definitions ──────────────────────────────────────────

export interface LocationFilter {
  city: string;
  state?: string;
  zip_codes?: string[];
  districts?: string[];
  radius_km?: number;
  latitude?: number;
  longitude?: number;
}

export interface CustomFilters {
  only_renovierungsbeduerftig?: boolean;
  max_erbpacht_prozent?: number;
  kein_denkmalschutz?: boolean;
  min_baujahr?: number;
  max_baujahr?: number;
  heizungstyp?: string[];
  energieeffizienz_min?: string;
  balkon_pflicht?: boolean;
  aufzug_pflicht?: boolean;
  stellplatz_pflicht?: boolean;
  max_stockwerk?: number;
  provisionsfrei?: boolean;
}

export interface DetailData {
  description?: string;
  features?: string[];
  year_built?: number;
  energy_rating?: string;
  energy_consumption?: number;
  heating_type?: string;
  floor?: string;
  total_floors?: number;
  parking?: boolean;
  parking_type?: string;
  balcony?: boolean;
  balcony_area_sqm?: number;
  garden?: boolean;
  garden_area_sqm?: number;
  cellar?: boolean;
  furnished?: boolean;
  barrier_free?: boolean;
  images?: string[];
  agent_name?: string;
  agent_phone?: string;
  agent_email?: string;
  monthly_rent?: number;
  service_charges?: number;
  ground_rent?: number;
  commission?: string;
  available_from?: string;
  last_renovation?: number;
  condition?: string;
  price_history?: Array<{ date: string; price: number }>;
}

export interface ScoreBreakdown {
  location: number;
  value: number;
  yield: number;
  risk: number;
}

export interface PortalScanResult {
  portal: string;
  status: 'success' | 'error' | 'skipped';
  listings_found: number;
  new_listings: number;
  error_message?: string;
  credits_used: number;
  duration_ms: number;
}

// ── sentinel_search_profiles ──────────────────────────────────

export const sentinelSearchProfiles = pgTable('sentinel_search_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  workspaceId: uuid('workspace_id').notNull(),

  // Suchkriterien
  name: varchar('name', { length: 255 }).notNull(),
  location: jsonb('location').notNull().$type<LocationFilter>(),
  propertyType: varchar('property_type', { length: 50 }).notNull().default('wohnung'),
  purchaseType: varchar('purchase_type', { length: 20 }).notNull().default('kauf'),
  priceMin: integer('price_min'),
  priceMax: integer('price_max'),
  areaMin: integer('area_min'),
  areaMax: integer('area_max'),
  roomsMin: numeric('rooms_min', { precision: 3, scale: 1 }),
  roomsMax: numeric('rooms_max', { precision: 3, scale: 1 }),
  yieldMin: numeric('yield_min', { precision: 5, scale: 2 }),
  customFilters: jsonb('custom_filters').default({}).$type<CustomFilters>(),

  // Portal-Konfiguration
  portals: text('portals').array().notNull().default(sql`'{"immoscout24"}'`),

  // Scoring
  minScore: integer('min_score').notNull().default(60),
  autoPipeline: boolean('auto_pipeline').notNull().default(true),
  pipelineId: uuid('pipeline_id'),

  // Scheduling
  frequency: varchar('frequency', { length: 20 }).notNull().default('daily'),
  cronExpression: varchar('cron_expression', { length: 100 }).notNull().default('0 8 * * *'),
  timezone: varchar('timezone', { length: 50 }).notNull().default('Europe/Berlin'),
  isActive: boolean('is_active').notNull().default(true),
  pausedUntil: timestamp('paused_until'),

  // Statistik
  totalScans: integer('total_scans').notNull().default(0),
  totalFound: integer('total_found').notNull().default(0),
  totalQualified: integer('total_qualified').notNull().default(0),
  lastScanAt: timestamp('last_scan_at'),
  lastScanStatus: varchar('last_scan_status', { length: 20 }),
  lastScanError: text('last_scan_error'),

  // Meta
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdx: index('idx_sentinel_profiles_user').on(table.userId),
  activeIdx: index('idx_sentinel_profiles_active').on(table.isActive),
  nextScanIdx: index('idx_sentinel_profiles_next_scan').on(table.isActive, table.lastScanAt),
}));

export type SearchProfile = typeof sentinelSearchProfiles.$inferSelect;
export type NewSearchProfile = typeof sentinelSearchProfiles.$inferInsert;

// ── sentinel_seen_listings ────────────────────────────────────

export const sentinelSeenListings = pgTable('sentinel_seen_listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull(),
  userId: uuid('user_id').notNull(),

  // Identifikation (Composite Unique fuer Dedup)
  portal: varchar('portal', { length: 50 }).notNull(),
  externalId: varchar('external_id', { length: 255 }).notNull(),
  listingUrl: text('listing_url').notNull(),

  // Extrahierte Daten (Listen-Scrape)
  title: text('title'),
  price: integer('price'),
  areaSqm: numeric('area_sqm', { precision: 8, scale: 2 }),
  rooms: numeric('rooms', { precision: 3, scale: 1 }),
  addressRaw: text('address_raw'),

  // Detail-Daten (Detail-Scrape)
  detailScraped: boolean('detail_scraped').notNull().default(false),
  detailData: jsonb('detail_data').$type<DetailData>(),
  scrapedAt: timestamp('scraped_at'),

  // KI-Bewertung
  aiScored: boolean('ai_scored').notNull().default(false),
  aiScore: integer('ai_score'),
  aiScoreBreakdown: jsonb('ai_score_breakdown').$type<ScoreBreakdown>(),
  aiYieldEst: numeric('ai_yield_est', { precision: 5, scale: 2 }),
  aiRiskFlags: text('ai_risk_flags').array(),
  aiSummary: text('ai_summary'),
  aiScoredAt: timestamp('ai_scored_at'),

  // Pipeline-Status
  pushedToPipeline: boolean('pushed_to_pipeline').notNull().default(false),
  pipelineEntryId: uuid('pipeline_entry_id'),
  pushedAt: timestamp('pushed_at'),

  // Lifecycle
  firstSeenAt: timestamp('first_seen_at').notNull().defaultNow(),
  lastCheckedAt: timestamp('last_checked_at').notNull().defaultNow(),
  isStale: boolean('is_stale').notNull().default(false),
  staleSince: timestamp('stale_since'),

  // Preis-Tracking
  priceChanged: boolean('price_changed').notNull().default(false),
  previousPrice: integer('previous_price'),
  priceChangedAt: timestamp('price_changed_at'),
}, (table) => ({
  dedupIdx: uniqueIndex('idx_sentinel_dedup').on(table.profileId, table.portal, table.externalId),
  profileIdx: index('idx_sentinel_seen_profile').on(table.profileId),
  userIdx: index('idx_sentinel_seen_user').on(table.userId),
  scoredIdx: index('idx_sentinel_seen_scored').on(table.aiScored, table.aiScore),
  recentIdx: index('idx_sentinel_seen_recent').on(table.firstSeenAt),
}));

export type SeenListing = typeof sentinelSeenListings.$inferSelect;
export type NewSeenListing = typeof sentinelSeenListings.$inferInsert;

// ── sentinel_scan_logs ────────────────────────────────────────

export const sentinelScanLogs = pgTable('sentinel_scan_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull(),
  userId: uuid('user_id').notNull(),

  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),

  status: varchar('status', { length: 20 }).notNull().default('running'),

  portalsScanned: jsonb('portals_scanned').$type<PortalScanResult[]>().default([]),

  totalNew: integer('total_new').notNull().default(0),
  totalScored: integer('total_scored').notNull().default(0),
  totalPushed: integer('total_pushed').notNull().default(0),
  creditsUsed: integer('credits_used').notNull().default(0),

  errorMessage: text('error_message'),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),

  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  profileIdx: index('idx_sentinel_logs_profile').on(table.profileId),
  userIdx: index('idx_sentinel_logs_user').on(table.userId),
  statusIdx: index('idx_sentinel_logs_status').on(table.status),
  createdIdx: index('idx_sentinel_logs_created').on(table.createdAt),
}));

export type ScanLog = typeof sentinelScanLogs.$inferSelect;
export type NewScanLog = typeof sentinelScanLogs.$inferInsert;

// ── Migration SQL ─────────────────────────────────────────────

export const SENTINEL_MIGRATION_SQL = `
-- ═══════════════════════════════════════════════════════════════
-- Property Sentinel Tables
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sentinel_search_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL,
  workspace_id      UUID NOT NULL,
  name              VARCHAR(255) NOT NULL,
  location          JSONB NOT NULL,
  property_type     VARCHAR(50) NOT NULL DEFAULT 'wohnung',
  purchase_type     VARCHAR(20) NOT NULL DEFAULT 'kauf',
  price_min         INTEGER,
  price_max         INTEGER,
  area_min          INTEGER,
  area_max          INTEGER,
  rooms_min         NUMERIC(3,1),
  rooms_max         NUMERIC(3,1),
  yield_min         NUMERIC(5,2),
  custom_filters    JSONB DEFAULT '{}',
  portals           TEXT[] NOT NULL DEFAULT '{"immoscout24"}',
  min_score         INTEGER NOT NULL DEFAULT 60,
  auto_pipeline     BOOLEAN NOT NULL DEFAULT true,
  pipeline_id       UUID,
  frequency         VARCHAR(20) NOT NULL DEFAULT 'daily',
  cron_expression   VARCHAR(100) NOT NULL DEFAULT '0 8 * * *',
  timezone          VARCHAR(50) NOT NULL DEFAULT 'Europe/Berlin',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  paused_until      TIMESTAMP,
  total_scans       INTEGER NOT NULL DEFAULT 0,
  total_found       INTEGER NOT NULL DEFAULT 0,
  total_qualified   INTEGER NOT NULL DEFAULT 0,
  last_scan_at      TIMESTAMP,
  last_scan_status  VARCHAR(20),
  last_scan_error   TEXT,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentinel_profiles_user ON sentinel_search_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_sentinel_profiles_active ON sentinel_search_profiles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sentinel_profiles_next_scan ON sentinel_search_profiles(is_active, last_scan_at);

CREATE TABLE IF NOT EXISTS sentinel_seen_listings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          UUID NOT NULL REFERENCES sentinel_search_profiles(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL,
  portal              VARCHAR(50) NOT NULL,
  external_id         VARCHAR(255) NOT NULL,
  listing_url         TEXT NOT NULL,
  title               TEXT,
  price               INTEGER,
  area_sqm            NUMERIC(8,2),
  rooms               NUMERIC(3,1),
  address_raw         TEXT,
  detail_scraped      BOOLEAN NOT NULL DEFAULT false,
  detail_data         JSONB,
  scraped_at          TIMESTAMP,
  ai_scored           BOOLEAN NOT NULL DEFAULT false,
  ai_score            INTEGER,
  ai_score_breakdown  JSONB,
  ai_yield_est        NUMERIC(5,2),
  ai_risk_flags       TEXT[],
  ai_summary          TEXT,
  ai_scored_at        TIMESTAMP,
  pushed_to_pipeline  BOOLEAN NOT NULL DEFAULT false,
  pipeline_entry_id   UUID,
  pushed_at           TIMESTAMP,
  first_seen_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  last_checked_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  is_stale            BOOLEAN NOT NULL DEFAULT false,
  stale_since         TIMESTAMP,
  price_changed       BOOLEAN NOT NULL DEFAULT false,
  previous_price      INTEGER,
  price_changed_at    TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sentinel_dedup ON sentinel_seen_listings(profile_id, portal, external_id);
CREATE INDEX IF NOT EXISTS idx_sentinel_seen_profile ON sentinel_seen_listings(profile_id);
CREATE INDEX IF NOT EXISTS idx_sentinel_seen_user ON sentinel_seen_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_sentinel_seen_scored ON sentinel_seen_listings(ai_scored, ai_score);
CREATE INDEX IF NOT EXISTS idx_sentinel_seen_recent ON sentinel_seen_listings(first_seen_at DESC);

CREATE TABLE IF NOT EXISTS sentinel_scan_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID NOT NULL REFERENCES sentinel_search_profiles(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL,
  started_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMP,
  status            VARCHAR(20) NOT NULL DEFAULT 'running',
  portals_scanned   JSONB DEFAULT '[]',
  total_new         INTEGER NOT NULL DEFAULT 0,
  total_scored      INTEGER NOT NULL DEFAULT 0,
  total_pushed      INTEGER NOT NULL DEFAULT 0,
  credits_used      INTEGER NOT NULL DEFAULT 0,
  error_message     TEXT,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentinel_logs_profile ON sentinel_scan_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_sentinel_logs_user ON sentinel_scan_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sentinel_logs_status ON sentinel_scan_logs(status);
CREATE INDEX IF NOT EXISTS idx_sentinel_logs_created ON sentinel_scan_logs(created_at DESC);
`;
