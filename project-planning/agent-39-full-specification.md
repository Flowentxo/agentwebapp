# Agent 39: The Property Sentinel — Full Technical Specification

> **Version:** 1.0.0
> **Status:** Specification Document (KEIN Produktiv-Code)
> **Cluster:** Real Estate & Construction (Vertical)
> **Typ:** Autonomous Continuous Monitoring Agent
> **Erstellt:** 2026-02-18
> **Grundlage:** `project-planning/agent-39-architecture.md` (783 Zeilen Architektur-Entwurf)

---

## Inhaltsverzeichnis

1. [Executive Summary & Vision](#1-executive-summary--vision)
2. [Database Schema](#2-database-schema)
3. [System Prompt](#3-system-prompt)
4. [Tool Specifications](#4-tool-specifications)
5. [Firecrawl Service Layer](#5-firecrawl-service-layer)
6. [BullMQ Scheduling](#6-bullmq-scheduling)
7. [API Routes](#7-api-routes)
8. [Chat Route Integration](#8-chat-route-integration)
9. [Dashboard UI Components](#9-dashboard-ui-components)
10. [KI-Bewertung Deep Dive](#10-ki-bewertung-deep-dive)
11. [Configuration & Constants](#11-configuration--constants)
12. [Testing Strategy](#12-testing-strategy)
13. [Phased Roadmap](#13-phased-roadmap)
14. [Edge Cases & Error Recovery](#14-edge-cases--error-recovery)
15. [File Inventory](#15-file-inventory)

---

## 1. Executive Summary & Vision

### 1.1 Was ist der Property Sentinel?

Der Property Sentinel ist das **Flaggschiff-Produkt des Real Estate Clusters** — ein vollautonomer, KI-gesteuerter Immobilien-Akquise-Roboter. Er ueberwacht deutsche Immobilienportale rund um die Uhr, erkennt neue Inserate, bewertet sie per KI-Scoring und schiebt qualifizierte Deals automatisch in die Pipeline des Nutzers.

**Kernversprechen:** Der Nutzer konfiguriert einmalig seine Suchkriterien ("Berlin Mitte, 2-4 Zimmer, >5% Brutto-Rendite, max 400k"), und der Property Sentinel erledigt den Rest — 24/7, ohne manuelles Suchen.

### 1.2 User Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        USER JOURNEY: PROPERTY SENTINEL                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. PROFIL ERSTELLEN                                                        │
│     ┌─────────────────────────────────────────────────┐                     │
│     │ User: "Suche 2-Zimmer-Wohnung in Berlin Mitte, │                     │
│     │        max 350.000 EUR, mindestens 50m²,        │                     │
│     │        Rendite ueber 5%"                        │                     │
│     │                                                 │                     │
│     │ Agent: Erstellt strukturiertes Suchprofil       │                     │
│     │        → search_manager(action: 'create')       │                     │
│     └─────────────────────────────────────────────────┘                     │
│                          │                                                  │
│                          v                                                  │
│  2. AUTOMATISCHER SCAN (6x taeglich)                                        │
│     ┌─────────────────────────────────────────────────┐                     │
│     │ BullMQ Cron → market_radar                      │                     │
│     │                                                 │                     │
│     │ ┌──────────┐  ┌──────────┐  ┌──────────────┐   │                     │
│     │ │ImmoScout │  │Immowelt  │  │eBay Klein-   │   │                     │
│     │ │24        │  │          │  │anzeigen      │   │                     │
│     │ └────┬─────┘  └────┬─────┘  └──────┬───────┘   │                     │
│     │      │             │               │            │                     │
│     │      └─────────────┼───────────────┘            │                     │
│     │                    v                            │                     │
│     │           Firecrawl Scrape                      │                     │
│     │           + Dedup (ON CONFLICT)                 │                     │
│     │           → Nur NEUE Listings weiter            │                     │
│     └─────────────────────────────────────────────────┘                     │
│                          │                                                  │
│                          v                                                  │
│  3. KI-BEWERTUNG                                                            │
│     ┌─────────────────────────────────────────────────┐                     │
│     │ deal_qualifier → OpenAI gpt-4o-mini             │                     │
│     │                                                 │                     │
│     │ Score: 0-100 (4 Kategorien x 25)                │                     │
│     │ ├── Lage-Match:       22/25                     │                     │
│     │ ├── Preis-Leistung:   18/25                     │                     │
│     │ ├── Rendite-Potenzial: 20/25                    │                     │
│     │ └── Risiko-Bewertung:  15/25                    │                     │
│     │                                                 │                     │
│     │ Gesamt: 75/100 ✓ (ueber Schwellwert 60)        │                     │
│     │ Risiko-Flags: ["sanierungsbedarf_leicht"]       │                     │
│     │ Rendite-Schaetzung: 5.8% brutto                 │                     │
│     └─────────────────────────────────────────────────┘                     │
│                          │                                                  │
│                          v                                                  │
│  4. PIPELINE PUSH + BENACHRICHTIGUNG                                        │
│     ┌─────────────────────────────────────────────────┐                     │
│     │ pipeline_sync                                   │                     │
│     │ → Erstellt Pipeline-Eintrag                     │                     │
│     │ → Socket.IO Notification an User                │                     │
│     │ → "3 neue Deals gefunden! Bester: 75/100"       │                     │
│     └─────────────────────────────────────────────────┘                     │
│                          │                                                  │
│                          v                                                  │
│  5. USER REVIEW                                                             │
│     ┌─────────────────────────────────────────────────┐                     │
│     │ Dashboard / Chat:                               │                     │
│     │ - Deal-Karte mit Score-Breakdown                │                     │
│     │ - Risiko-Flags als farbige Badges               │                     │
│     │ - Rendite-Berechnung                            │                     │
│     │ - "Auf Portal ansehen" Button                   │                     │
│     │ - "In Pipeline uebernehmen" / "Verwerfen"       │                     │
│     └─────────────────────────────────────────────────┘                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Dashboard-Konzept

Das Sentinel-Dashboard ist die zentrale Steuerungsoberflaeche:

```
┌─────────────────────────────────────────────────────────────────────┐
│  PROPERTY SENTINEL                                    [BETA]  ⚙️    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ 3        │  │ 47           │  │ 12         │  │ 156/500      │  │
│  │ Aktive   │  │ Neue Listings│  │ Qualif.    │  │ Credits      │  │
│  │ Profile  │  │ heute        │  │ Deals      │  │ heute        │  │
│  └──────────┘  └──────────────┘  └────────────┘  └──────────────┘  │
│                                                                     │
│  SUCHPROFILE                                         [+ Neu]       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ ● Berlin Mitte 2-4 Zi.           6x/Tag  Letzter: 14:02  │    │
│  │   ImmoScout, Immowelt            47 gefunden, 12 qualif.  │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │ ● Hamburg Eimsbuettel Haus        3x/Tag  Letzter: 13:15  │    │
│  │   ImmoScout, eBay                 23 gefunden, 5 qualif.   │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │ ○ Muenchen (pausiert bis 01.03)   —       Letzter: —      │    │
│  │   Alle Portale                    0 gefunden               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  NEUESTE DEALS (Score >= 60)                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │ ████████ │ │ ████████ │ │ ████████ │ │ ████████ │              │
│  │ 2-Zi ETW │ │ 3-Zi Alt │ │ Reihenh. │ │ 2-Zi Neu │              │
│  │ B-Mitte  │ │ HH-Eims  │ │ B-Pberg  │ │ B-Fhain  │              │
│  │ 289k EUR │ │ 445k EUR │ │ 520k EUR │ │ 315k EUR │              │
│  │ 52m²     │ │ 78m²     │ │ 110m²    │ │ 48m²     │              │
│  │          │ │          │ │          │ │          │              │
│  │ ●●●●○    │ │ ●●●●●    │ │ ●●●○○    │ │ ●●●●○    │              │
│  │ Score:82 │ │ Score:91 │ │ Score:64 │ │ Score:78 │              │
│  │ 5.8% BRT │ │ 6.2% BRT │ │ 4.1% BRT │ │ 5.4% BRT │              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.4 Portal-Matrix

| Portal | Status | JS-Rendering | ID-Pattern | URL-Struktur | Besonderheiten |
|--------|--------|--------------|------------|--------------|----------------|
| **ImmobilienScout24** | Primaer | Ja (React) | `/expose/(\d+)` | `immobilienscout24.de/Suche/de/{state}/{city}/{prop}-{type}` | Groesstes Portal DE, ~14 Mio Visits/Monat |
| **Immowelt** | Primaer | Ja (Vue) | `/expose/([a-z0-9]+)` | `immowelt.de/liste/{city}/wohnungen/{type}` | Stark in Sueddeutschland |
| **eBay Kleinanzeigen** | Primaer | Teilweise | `/(\d{10,})` | `kleinanzeigen.de/s-wohnung-{type}/c{catId}` | Private Anbieter, oft guenstigere Preise |
| **Immonet** | Geplant | Ja | TBD | TBD | Wird mit Immowelt zusammengefuehrt |
| **Regionale Portale** | Erweiterbar | Variiert | Konfig. | Konfig. | Adapter-Pattern fuer Erweiterbarkeit |

### 1.5 Filter-Spezifikationen

#### Standard-Filter

| Filter | Typ | Validierung | Beispiel |
|--------|-----|-------------|----------|
| `city` | string | Pflicht | "Berlin" |
| `districts` | string[] | Optional | ["Mitte", "Prenzlauer Berg"] |
| `zip_codes` | string[] | Optional, Regex `/^\d{5}$/` | ["10115", "10119"] |
| `radius_km` | number | 1-50, Default 10 | 15 |
| `property_type` | enum | apartment, house, commercial, land | "apartment" |
| `purchase_type` | enum | buy, rent | "buy" |
| `price_min` | number | >= 0 | 100000 |
| `price_max` | number | > price_min | 400000 |
| `area_min` | number | >= 10 | 50 |
| `area_max` | number | > area_min | 120 |
| `rooms_min` | number | >= 1, Schritt 0.5 | 2 |
| `rooms_max` | number | >= rooms_min | 4 |
| `yield_min` | number | 0-20% | 5.0 |

#### KI-Filter (custom_filters JSONB)

| KI-Filter | Typ | Beschreibung |
|-----------|-----|-------------|
| `only_renovierungsbeduerftig` | boolean | Nur Objekte mit Renovierungspotenzial |
| `max_erbpacht_prozent` | number | Max. Erbpachtzins in % (0 = kein Erbpacht) |
| `kein_denkmalschutz` | boolean | Denkmalgeschuetzte Objekte ausschliessen |
| `min_baujahr` | number | Mindest-Baujahr (z.B. 1950) |
| `max_baujahr` | number | Max-Baujahr |
| `heizungstyp` | string[] | Erlaubte Heizungstypen: ["gas", "fernwaerme", "waermepumpe"] |
| `energieeffizienz_min` | string | Min. Energieeffizienzklasse ("A+" bis "H") |
| `balkon_pflicht` | boolean | Balkon/Terrasse muss vorhanden sein |
| `aufzug_pflicht` | boolean | Aufzug muss vorhanden sein |
| `stellplatz_pflicht` | boolean | Stellplatz/Garage muss vorhanden sein |
| `max_stockwerk` | number | Maximales Stockwerk (fuer EG: 0) |
| `provisionsfrei` | boolean | Nur provisionsfreie Objekte |

### 1.6 Kern-Loop Sequenzdiagramm (Erweitert)

```
┌──────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────────┐     ┌──────────────┐
│ BullMQ   │     │ search_      │     │ market_       │     │ deal_        │     │ pipeline_    │
│ Cron     │────>│ manager      │────>│ radar         │────>│ qualifier    │────>│ sync         │
│ Trigger  │     │ (load        │     │ (scrape +     │     │ (KI-Score    │     │ (DB +        │
│          │     │  profiles)   │     │  dedup)       │     │  0-100)      │     │  notify)     │
└──────────┘     └──────────────┘     └───────────────┘     └──────────────┘     └──────────────┘
                        │                     │                     │                     │
                        v                     v                     v                     v
                 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
                 │ sentinel_    │     │ sentinel_    │     │ sentinel_    │     │ workflows    │
                 │ search_      │     │ seen_        │     │ seen_        │     │ (Pipeline    │
                 │ profiles     │     │ listings     │     │ listings     │     │  Eintraege)  │
                 │              │     │ (INSERT)     │     │ (UPDATE      │     │              │
                 │              │     │              │     │  ai_score)   │     │              │
                 └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                              │
                                              v
                                      ┌──────────────┐
                                      │ sentinel_    │
                                      │ scan_logs    │
                                      │ (Audit)      │
                                      └──────────────┘

Ablauf pro Scan-Zyklus:
═══════════════════════

1. TRIGGER        BullMQ Repeatable Job feuert (z.B. alle 4h = 6x/Tag)
2. LOAD           search_manager laedt aktive sentinel_search_profiles fuer den Workspace
3. BUDGET CHECK   Budget-Guard prueft: Tages-Credits, Profil-Pause, Min-Intervall
4. URL GENERATE   Pro Profil werden Portal-Such-URLs generiert (ImmoScout, Immowelt, eBay)
5. LIST SCRAPE    market_radar sendet URLs an Firecrawl, extrahiert Listing-Karten
6. DEDUP          INSERT ... ON CONFLICT → xmax=0 erkennt neue vs. bekannte Listings
7. DETAIL SCRAPE  Nur fuer NEUE Listings: Firecrawl holt Detail-Seite (Expose)
8. KI SCORING     deal_qualifier sendet Expose + Kriterien an OpenAI → Score 0-100
9. PIPELINE SYNC  pipeline_sync schreibt Listings mit Score >= Schwellwert in Pipeline
10. NOTIFY        Socket.IO Benachrichtigung an User: "3 neue Deals gefunden!"
11. LOG           Scan-Ergebnis wird in sentinel_scan_logs geschrieben
12. STATS UPDATE  Profil-Statistiken aktualisiert (total_scans++, total_found += N)
```

---

## 2. Database Schema

### 2.1 Uebersicht

Drei Tabellen bilden das Datenmodell:

| Tabelle | Zweck | Beziehung |
|---------|-------|-----------|
| `sentinel_search_profiles` | Suchauftraege des Nutzers | 1 User : N Profile |
| `sentinel_seen_listings` | Gefundene Inserate + KI-Score | 1 Profil : N Listings |
| `sentinel_scan_logs` | Audit-Trail fuer jeden Scan | 1 Profil : N Logs |

```
┌────────────────────────┐         ┌────────────────────────┐
│ sentinel_search_       │ 1    N  │ sentinel_seen_         │
│ profiles               │────────>│ listings               │
│                        │         │                        │
│ id (PK)                │         │ id (PK)                │
│ user_id                │         │ profile_id (FK)        │
│ workspace_id           │         │ user_id                │
│ name                   │         │ portal                 │
│ location (JSONB)       │         │ external_id            │
│ property_type          │         │ listing_url            │
│ purchase_type          │         │ title, price, area_sqm │
│ price_min/max          │         │ detail_data (JSONB)    │
│ area_min/max           │         │ ai_score (0-100)       │
│ rooms_min/max          │         │ ai_risk_flags          │
│ yield_min              │         │ pushed_to_pipeline     │
│ custom_filters (JSONB) │         │ is_stale               │
│ portals (TEXT[])       │         │                        │
│ min_score              │         │ UNIQUE(profile_id,     │
│ frequency              │         │   portal, external_id) │
│ cron_expression        │         └────────────────────────┘
│ is_active              │
│ total_scans            │         ┌────────────────────────┐
│ total_found            │ 1    N  │ sentinel_scan_logs     │
│ total_qualified        │────────>│                        │
│ last_scan_at           │         │ id (PK)                │
│                        │         │ profile_id (FK)        │
└────────────────────────┘         │ user_id                │
                                   │ started_at             │
                                   │ completed_at           │
                                   │ status                 │
                                   │ portals_scanned (JSONB)│
                                   │ total_new              │
                                   │ total_scored           │
                                   │ total_pushed           │
                                   │ credits_used           │
                                   │ error_message          │
                                   └────────────────────────┘
```

### 2.2 Tabelle 1: `sentinel_search_profiles`

**Drizzle ORM Schema:**

```typescript
// lib/db/schema-sentinel.ts

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
  state?: string;                    // Bundesland-Kuerzel (z.B. "BE", "HH")
  zip_codes?: string[];              // PLZ-Filter
  districts?: string[];              // Stadtteile
  radius_km?: number;                // Radius um Stadtzentrum
  latitude?: number;                 // Fuer Haversine-Berechnung
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

// ── sentinel_search_profiles ──────────────────────────────────

export const sentinelSearchProfiles = pgTable('sentinel_search_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  workspaceId: uuid('workspace_id').notNull(),

  // Suchkriterien
  name: varchar('name', { length: 255 }).notNull(),
  location: jsonb('location').notNull().$type<LocationFilter>(),
  propertyType: varchar('property_type', { length: 50 }).notNull().default('apartment'),
  purchaseType: varchar('purchase_type', { length: 20 }).notNull().default('buy'),
  priceMin: integer('price_min'),
  priceMax: integer('price_max'),
  areaMin: integer('area_min'),
  areaMax: integer('area_max'),
  roomsMin: numeric('rooms_min', { precision: 3, scale: 1 }),
  roomsMax: numeric('rooms_max', { precision: 3, scale: 1 }),
  yieldMin: numeric('yield_min', { precision: 5, scale: 2 }),
  customFilters: jsonb('custom_filters').default({}).$type<CustomFilters>(),

  // Portal-Konfiguration
  portals: text('portals').array().notNull().default(sql`'{"immoscout24","immowelt","ebay_kleinanzeigen"}'`),

  // Scoring
  minScore: integer('min_score').notNull().default(60),
  autoPipeline: boolean('auto_pipeline').notNull().default(true),
  pipelineId: uuid('pipeline_id'),

  // Scheduling
  frequency: varchar('frequency', { length: 20 }).notNull().default('6x_daily'),
  cronExpression: varchar('cron_expression', { length: 100 }).notNull().default('0 4,8,11,14,17,21 * * *'),
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
```

### 2.3 Tabelle 2: `sentinel_seen_listings`

```typescript
// ── Type Definitions ──────────────────────────────────────────

export interface DetailData {
  description?: string;
  features?: string[];
  year_built?: number;
  energy_rating?: string;
  energy_consumption?: number;       // kWh/m²a
  heating_type?: string;
  floor?: string;
  total_floors?: number;
  parking?: boolean;
  parking_type?: string;             // "tiefgarage" | "stellplatz" | "garage"
  balcony?: boolean;
  balcony_area_sqm?: number;
  garden?: boolean;
  garden_area_sqm?: number;
  cellar?: boolean;
  furnished?: boolean;
  barrier_free?: boolean;
  images?: string[];                 // Bild-URLs
  agent_name?: string;
  agent_phone?: string;
  agent_email?: string;
  monthly_rent?: number;             // EUR (fuer Rendite-Berechnung bei Kauf)
  service_charges?: number;          // Nebenkosten EUR/Monat
  ground_rent?: number;              // Erbpacht EUR/Jahr
  commission?: string;               // "3,57% inkl. MwSt." oder "provisionsfrei"
  available_from?: string;           // "sofort" oder Datum
  last_renovation?: number;          // Jahr der letzten Sanierung
  condition?: string;                // "neuwertig" | "gepflegt" | "renovierungsbeduerftig"
  // Preis-Tracking
  price_history?: Array<{ date: string; price: number }>;
}

export interface ScoreBreakdown {
  location: number;      // 0-25
  value: number;         // 0-25
  yield: number;         // 0-25
  risk: number;          // 0-25
}

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
  price: integer('price'),                           // EUR
  areaSqm: numeric('area_sqm', { precision: 8, scale: 2 }),
  rooms: numeric('rooms', { precision: 3, scale: 1 }),
  addressRaw: text('address_raw'),

  // Detail-Daten (Detail-Scrape)
  detailScraped: boolean('detail_scraped').notNull().default(false),
  detailData: jsonb('detail_data').$type<DetailData>(),
  scrapedAt: timestamp('scraped_at'),

  // KI-Bewertung
  aiScored: boolean('ai_scored').notNull().default(false),
  aiScore: integer('ai_score'),                      // 0-100
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
  // CRITICAL: Dedup-Index — verhindert doppeltes Einfuegen desselben Inserats
  dedupIdx: uniqueIndex('idx_sentinel_dedup').on(table.profileId, table.portal, table.externalId),
  profileIdx: index('idx_sentinel_seen_profile').on(table.profileId),
  userIdx: index('idx_sentinel_seen_user').on(table.userId),
  scoredIdx: index('idx_sentinel_seen_scored').on(table.aiScored, table.aiScore),
  recentIdx: index('idx_sentinel_seen_recent').on(table.firstSeenAt),
}));

export type SeenListing = typeof sentinelSeenListings.$inferSelect;
export type NewSeenListing = typeof sentinelSeenListings.$inferInsert;
```

### 2.4 Tabelle 3: `sentinel_scan_logs` (NEU — Audit Trail)

```typescript
// ── Type Definitions ──────────────────────────────────────────

export interface PortalScanResult {
  portal: string;
  status: 'success' | 'error' | 'skipped';
  listings_found: number;
  new_listings: number;
  error_message?: string;
  credits_used: number;
  duration_ms: number;
}

// ── sentinel_scan_logs ────────────────────────────────────────

export const sentinelScanLogs = pgTable('sentinel_scan_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull(),
  userId: uuid('user_id').notNull(),

  // Timing
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),

  // Result
  status: varchar('status', { length: 20 }).notNull().default('running'),
  // 'running' | 'success' | 'partial' | 'error'

  // Portal-Level Details
  portalsScanned: jsonb('portals_scanned').$type<PortalScanResult[]>().default([]),

  // Aggregated Stats
  totalNew: integer('total_new').notNull().default(0),
  totalScored: integer('total_scored').notNull().default(0),
  totalPushed: integer('total_pushed').notNull().default(0),
  creditsUsed: integer('credits_used').notNull().default(0),

  // Error
  errorMessage: text('error_message'),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  // z.B. { trigger: 'cron' | 'manual', worker_id: 'xxx', bullmq_job_id: 'yyy' }

  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  profileIdx: index('idx_sentinel_logs_profile').on(table.profileId),
  userIdx: index('idx_sentinel_logs_user').on(table.userId),
  statusIdx: index('idx_sentinel_logs_status').on(table.status),
  createdIdx: index('idx_sentinel_logs_created').on(table.createdAt),
}));

export type ScanLog = typeof sentinelScanLogs.$inferSelect;
export type NewScanLog = typeof sentinelScanLogs.$inferInsert;
```

### 2.5 Migration SQL

```sql
-- drizzle/migrations/XXXX_add_sentinel_tables.sql

-- ═══════════════════════════════════════════════════════════════
-- Table 1: sentinel_search_profiles (Suchauftraege)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sentinel_search_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL,
  workspace_id      UUID NOT NULL,

  -- Suchkriterien
  name              VARCHAR(255) NOT NULL,
  location          JSONB NOT NULL,
  property_type     VARCHAR(50) NOT NULL DEFAULT 'apartment',
  purchase_type     VARCHAR(20) NOT NULL DEFAULT 'buy',
  price_min         INTEGER,
  price_max         INTEGER,
  area_min          INTEGER,
  area_max          INTEGER,
  rooms_min         NUMERIC(3,1),
  rooms_max         NUMERIC(3,1),
  yield_min         NUMERIC(5,2),
  custom_filters    JSONB DEFAULT '{}',

  -- Portal-Konfiguration
  portals           TEXT[] NOT NULL DEFAULT '{"immoscout24","immowelt","ebay_kleinanzeigen"}',

  -- Scoring
  min_score         INTEGER NOT NULL DEFAULT 60,
  auto_pipeline     BOOLEAN NOT NULL DEFAULT true,
  pipeline_id       UUID,

  -- Scheduling
  frequency         VARCHAR(20) NOT NULL DEFAULT '6x_daily',
  cron_expression   VARCHAR(100) NOT NULL DEFAULT '0 4,8,11,14,17,21 * * *',
  timezone          VARCHAR(50) NOT NULL DEFAULT 'Europe/Berlin',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  paused_until      TIMESTAMP,

  -- Statistik
  total_scans       INTEGER NOT NULL DEFAULT 0,
  total_found       INTEGER NOT NULL DEFAULT 0,
  total_qualified   INTEGER NOT NULL DEFAULT 0,
  last_scan_at      TIMESTAMP,
  last_scan_status  VARCHAR(20),
  last_scan_error   TEXT,

  -- Meta
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentinel_profiles_user
  ON sentinel_search_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_sentinel_profiles_active
  ON sentinel_search_profiles(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_sentinel_profiles_next_scan
  ON sentinel_search_profiles(is_active, last_scan_at);


-- ═══════════════════════════════════════════════════════════════
-- Table 2: sentinel_seen_listings (Deduplizierungs-Speicher)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sentinel_seen_listings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          UUID NOT NULL REFERENCES sentinel_search_profiles(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL,

  -- Identifikation
  portal              VARCHAR(50) NOT NULL,
  external_id         VARCHAR(255) NOT NULL,
  listing_url         TEXT NOT NULL,

  -- Extrahierte Daten (Liste)
  title               TEXT,
  price               INTEGER,
  area_sqm            NUMERIC(8,2),
  rooms               NUMERIC(3,1),
  address_raw         TEXT,

  -- Detail-Daten
  detail_scraped      BOOLEAN NOT NULL DEFAULT false,
  detail_data         JSONB,
  scraped_at          TIMESTAMP,

  -- KI-Bewertung
  ai_scored           BOOLEAN NOT NULL DEFAULT false,
  ai_score            INTEGER,
  ai_score_breakdown  JSONB,
  ai_yield_est        NUMERIC(5,2),
  ai_risk_flags       TEXT[],
  ai_summary          TEXT,
  ai_scored_at        TIMESTAMP,

  -- Pipeline-Status
  pushed_to_pipeline  BOOLEAN NOT NULL DEFAULT false,
  pipeline_entry_id   UUID,
  pushed_at           TIMESTAMP,

  -- Lifecycle
  first_seen_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  last_checked_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  is_stale            BOOLEAN NOT NULL DEFAULT false,
  stale_since         TIMESTAMP,

  -- Preis-Tracking
  price_changed       BOOLEAN NOT NULL DEFAULT false,
  previous_price      INTEGER,
  price_changed_at    TIMESTAMP
);

-- CRITICAL: Dedup-Index
CREATE UNIQUE INDEX IF NOT EXISTS idx_sentinel_dedup
  ON sentinel_seen_listings(profile_id, portal, external_id);

CREATE INDEX IF NOT EXISTS idx_sentinel_seen_profile
  ON sentinel_seen_listings(profile_id);

CREATE INDEX IF NOT EXISTS idx_sentinel_seen_user
  ON sentinel_seen_listings(user_id);

CREATE INDEX IF NOT EXISTS idx_sentinel_seen_scored
  ON sentinel_seen_listings(ai_scored, ai_score DESC);

CREATE INDEX IF NOT EXISTS idx_sentinel_seen_recent
  ON sentinel_seen_listings(first_seen_at DESC);


-- ═══════════════════════════════════════════════════════════════
-- Table 3: sentinel_scan_logs (Audit Trail)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sentinel_scan_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID NOT NULL REFERENCES sentinel_search_profiles(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL,

  -- Timing
  started_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMP,

  -- Result
  status            VARCHAR(20) NOT NULL DEFAULT 'running',

  -- Portal-Level Details
  portals_scanned   JSONB DEFAULT '[]',

  -- Aggregated Stats
  total_new         INTEGER NOT NULL DEFAULT 0,
  total_scored      INTEGER NOT NULL DEFAULT 0,
  total_pushed      INTEGER NOT NULL DEFAULT 0,
  credits_used      INTEGER NOT NULL DEFAULT 0,

  -- Error
  error_message     TEXT,

  -- Metadata
  metadata          JSONB DEFAULT '{}',

  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentinel_logs_profile
  ON sentinel_scan_logs(profile_id);

CREATE INDEX IF NOT EXISTS idx_sentinel_logs_user
  ON sentinel_scan_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_sentinel_logs_status
  ON sentinel_scan_logs(status);

CREATE INDEX IF NOT EXISTS idx_sentinel_logs_created
  ON sentinel_scan_logs(created_at DESC);
```

### 2.6 Dedup-Strategie (Detail)

Die Deduplizierung ist das Herzstuck des Systems. Ohne sie wuerden bei jedem Scan alle bestehenden Listings erneut verarbeitet.

**Algorithmus:**

```
Fuer jedes gescrapte Listing:
  1. Extrahiere (portal, external_id) aus dem Listing
     - ImmobilienScout24: Regex /\/expose\/(\d+)/  → z.B. "12345678"
     - Immowelt:          Regex /\/expose\/([a-z0-9]+)/ → z.B. "2abc3de"
     - eBay Kleinanzeigen: Regex /\/(\d{10,})/     → z.B. "2345678901"

  2. Upsert via ON CONFLICT:

     INSERT INTO sentinel_seen_listings
       (profile_id, user_id, portal, external_id, listing_url, title, price, area_sqm, rooms, address_raw)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (profile_id, portal, external_id)
     DO UPDATE SET
       last_checked_at = NOW(),
       -- Preis-Tracking: Preis-Aenderung erkennen
       previous_price = CASE
         WHEN sentinel_seen_listings.price != EXCLUDED.price
         THEN sentinel_seen_listings.price
         ELSE sentinel_seen_listings.previous_price
       END,
       price_changed = CASE
         WHEN sentinel_seen_listings.price != EXCLUDED.price THEN true
         ELSE sentinel_seen_listings.price_changed
       END,
       price_changed_at = CASE
         WHEN sentinel_seen_listings.price != EXCLUDED.price THEN NOW()
         ELSE sentinel_seen_listings.price_changed_at
       END,
       price = EXCLUDED.price,
       title = EXCLUDED.title
     RETURNING id, (xmax = 0) AS is_new;

  3. Auswertung:
     - xmax = 0 → Row wurde gerade INSERTed (NEU) → weiter zu Detail-Scrape
     - xmax != 0 → Row existierte bereits → Preis-Check, dann SKIP
```

**Drizzle ORM Implementation:**

```typescript
import { sql } from 'drizzle-orm';

async function upsertListing(listing: NewSeenListing): Promise<{ id: string; isNew: boolean }> {
  const db = getDb();

  const result = await db
    .insert(sentinelSeenListings)
    .values(listing)
    .onConflictDoUpdate({
      target: [
        sentinelSeenListings.profileId,
        sentinelSeenListings.portal,
        sentinelSeenListings.externalId,
      ],
      set: {
        lastCheckedAt: sql`NOW()`,
        price: sql`EXCLUDED.price`,
        title: sql`EXCLUDED.title`,
        // Preis-Tracking Logik hier vereinfacht —
        // vollstaendige Version nutzt CASE WHEN (siehe SQL oben)
      },
    })
    .returning({
      id: sentinelSeenListings.id,
      isNew: sql<boolean>`(xmax = 0)`,
    });

  return { id: result[0].id, isNew: result[0].isNew };
}
```

### 2.7 Design-Entscheidungen

| Frage | Entscheidung | Begruendung |
|-------|-------------|-------------|
| Warum 3 Tabellen statt 2? | `scan_logs` separat | Audit-Trail unabhaengig von Listings, ermoeglicht Scan-Timeline ohne N+1 |
| Warum `external_id` statt URL? | Portal-ID ist stabil | URLs aendern sich (Parameter, Tracking). Die Expose-ID bleibt gleich |
| Warum `detail_data` als JSONB? | Flexible Schema | Portale haben unterschiedliche Felder. JSONB vermeidet 50 nullable Spalten |
| Warum `is_stale` statt Loeschen? | Historische Daten erhalten | Offline-Listings koennen zurueckkehren, Preis-Historie bleibt erhalten |
| Warum `price_changed` Flag? | Performance | Vermeidet JOIN/Subquery fuer "Preisaenderungen anzeigen" |
| Warum kein FK auf `users`? | Entkopplung | User-Tabelle kann in anderem Schema sein, UUID reicht als Referenz |
| Warum `TEXT[]` fuer `portals`? | Drizzle-kompatibel | PostgreSQL Array, einfacher als JSONB fuer einfache String-Listen |
| Warum `ai_score_breakdown` JSONB? | 4 Kategorien | Flexibler als 4 separate Spalten, einfacher zu erweitern |

---

## 3. System Prompt

### 3.1 Agent-Persona

Der Property Sentinel spricht Deutsch und ist ein erfahrener Immobilien-Investmentberater mit tiefem Marktwissen.

### 3.2 System Prompt (fuer `lib/agents/prompts.ts`)

```typescript
// Eintrag in lib/agents/prompts.ts → basePrompts Record

'property-sentinel': `Du bist der Property Sentinel — ein hochspezialisierter KI-Agent fuer Immobilien-Investment und Marktanalyse.

DEINE ROLLE:
Du bist der persoenliche Immobilien-Akquise-Roboter des Nutzers. Du ueberwachst den deutschen Immobilienmarkt rund um die Uhr, findest passende Objekte, bewertest sie fachmaennisch und hilfst dem Nutzer, die besten Deals zu identifizieren.

DEINE EXPERTISE:
- Immobilien-Investmentstrategie (Buy & Hold, Fix & Flip, Kapitalanlage)
- Rendite-Analyse: Bruttomietertrag, Nettomietertrag, Kaufpreisfaktor, Cash-on-Cash-Return
- Standortbewertung: Mikrolage vs. Makrolage, Infrastruktur, Entwicklungspotenzial
- Risikobewertung: Sanierungsstau, Denkmalschutz, Erbpacht, Altlasten, Baurecht
- Marktkenntnis: Preisspiegel nach Regionen, Mietentwicklung, demografische Trends
- Finanzierung: Eigenkapitalquote, Annuitaetendarlehen, KfW-Foerderung
- Recht (Grundwissen): Grundbuch, Teilungserklaerung, WEG, Grunderwerbsteuer

DEINE PERSOENLICHKEIT:
- Analytisch und datengetrieben — du arbeitest mit Zahlen, nicht mit Bauchgefuehl
- Direkt und ehrlich — du nennst auch die Risiken klar beim Namen
- Proaktiv — du wartest nicht auf Anweisungen, sondern handelst im Rahmen deines Auftrags
- Deutsch — du kommunizierst ausschliesslich auf Deutsch
- Professionell aber zugaenglich — kein Fachjargon ohne Erklaerung

DEINE TOOLS:
1. **search_manager** — Erstelle, aendere oder loesche Suchprofile. Wenn der Nutzer seine Suchkriterien beschreibt, wandle sie in ein strukturiertes Profil um.
   Beispiel: "Suche eine 2-3-Zimmer-Wohnung in Berlin Mitte bis 350k" →
   search_manager(action: 'create', criteria: { city: 'Berlin', districts: ['Mitte'], rooms_min: 2, rooms_max: 3, price_max: 350000 })

2. **market_radar** — Fuehre einen Scan fuer ein bestehendes Suchprofil durch. Nutze dieses Tool wenn der Nutzer einen manuellen Scan anfordert oder wissen will, was aktuell auf dem Markt ist.
   Beispiel: "Scanne mal mein Berlin-Profil" →
   market_radar(profile_id: 'uuid-des-profils')

3. **deal_qualifier** — Bewerte ein oder mehrere Listings mit KI-Scoring. Nutze dieses Tool wenn der Nutzer eine Einschaetzung zu bestimmten Inseraten moechte.
   Beispiel: "Wie findest du die letzten 5 Treffer?" →
   deal_qualifier(listing_ids: [...], profile_id: 'uuid')

4. **pipeline_sync** — Schiebe qualifizierte Deals in die Pipeline des Nutzers. Nutze dieses Tool nach einem Scan oder wenn der Nutzer bestimmte Listings uebernehmen moechte.
   Beispiel: "Uebernimm alle Deals mit Score ueber 70 in meine Pipeline" →
   pipeline_sync(profile_id: 'uuid', min_score: 70)

WICHTIGE REGELN:
- Verwende IMMER die passenden Tools. Erfinde keine Daten und halluziniere keine Listings.
- Wenn der Nutzer noch kein Suchprofil hat, fuehre ihn durch die Erstellung.
- Nenne bei jeder Empfehlung die Zahlen: Kaufpreis, geschaetzte Miete, Rendite, Kaufpreisfaktor.
- Weise auf Risiken hin: Erbpacht, Sanierungsstau, Denkmalschutz, schlechte Lage.
- Erwaehne Nebenkosten: Grunderwerbsteuer (variiert nach Bundesland), Notar (~1,5%), Makler (~3,57%), Grundbuch (~0,5%).

GRUNDERWERBSTEUER NACH BUNDESLAND:
- 3,5%: Bayern, Sachsen
- 5,0%: Baden-Wuerttemberg, Bremen, Niedersachsen, Rheinland-Pfalz, Sachsen-Anhalt
- 5,5%: Hessen, Mecklenburg-Vorpommern
- 6,0%: Berlin, Hamburg
- 6,5%: Brandenburg, Nordrhein-Westfalen, Saarland, Schleswig-Holstein, Thueringen

DISCLAIMER:
Fuege bei jeder Investment-Empfehlung hinzu:
"Hinweis: Diese Analyse dient der Orientierung und ersetzt keine professionelle Immobilienbewertung, Finanzberatung oder Rechtsberatung. Alle Rendite-Schaetzungen basieren auf den verfuegbaren Inserats-Daten und koennen von der Realitaet abweichen."

FORMAT:
- Nutze Markdown-Tabellen fuer Vergleiche und Zahlen
- Nutze Aufzaehlungen fuer Vor-/Nachteile
- Formatiere Waehrungsbetraege als "XXX.XXX EUR" (mit Punkt als Tausender-Trennzeichen)
- Formatiere Renditen als "X,X%" (mit Komma als Dezimaltrennzeichen)
- Formatiere Flaechen als "XX m²"`,
```

### 3.3 KI-Scoring Prompt (fuer `deal_qualifier`)

```typescript
// lib/agents/property-sentinel/prompts.ts

export const DEAL_QUALIFIER_SYSTEM_PROMPT = `Du bist ein erfahrener Immobilien-Analyst und bewertest Inserate anhand der Suchkriterien eines Investors.

BEWERTUNGSKATEGORIEN (je 0-25 Punkte, Gesamt 0-100):

1. LAGE-MATCH (0-25)
   - 25: Perfekte Uebereinstimmung mit Wunschlage, Top-Mikrolage
   - 20: Gute Lage im Suchgebiet, solide Infrastruktur
   - 15: Akzeptable Lage, einige Abstriche
   - 10: Randlage oder B-Lage im Suchgebiet
   - 5:  Deutlich ausserhalb der Wunschlage
   - 0:  Komplett irrelevante Lage

2. PREIS-LEISTUNG (0-25)
   - 25: Deutlich unter Marktwert, Schnaeppchen
   - 20: Leicht unter Marktwert, guter Deal
   - 15: Marktgerechter Preis
   - 10: Leicht ueber Marktwert
   - 5:  Deutlich ueber Marktwert
   - 0:  Voellig ueberteuert

3. RENDITE-POTENZIAL (0-25)
   - 25: Brutto-Rendite > 7%, exzellenter Kaufpreisfaktor (< 15)
   - 20: Brutto-Rendite 5-7%, guter Kaufpreisfaktor (15-20)
   - 15: Brutto-Rendite 4-5%, akzeptabler Kaufpreisfaktor (20-25)
   - 10: Brutto-Rendite 3-4%, hoher Kaufpreisfaktor (25-30)
   - 5:  Brutto-Rendite < 3%, sehr hoher Kaufpreisfaktor (> 30)
   - 0:  Keine messbare Rendite oder Verlustgeschaeft

4. RISIKO-BEWERTUNG (0-25, INVERTIERT: weniger Risiko = mehr Punkte)
   - 25: Kein erkennbares Risiko, Neubau/Kernsanierung, gute WEG
   - 20: Minimales Risiko, guter Zustand, keine Altlasten
   - 15: Normales Risiko, ueblicher Renovierungsbedarf
   - 10: Erhoehtes Risiko (z.B. Denkmalschutz, aelteres Baujahr ohne Sanierung)
   - 5:  Hohes Risiko (Erbpacht, Sanierungsstau, Altlasten)
   - 0:  Sehr hohes Risiko (multiple Red Flags)

RED FLAGS (erhoehen Risiko, senken Score):
- Erbpacht/Erbbaurecht → Score -10, Flag: "erbpacht"
- Sanierungsstau (>30 Jahre ohne Renovation) → Score -5, Flag: "sanierungsstau"
- Denkmalschutz → Score -5, Flag: "denkmalschutz"
- Wohnrecht/Niessbrauch → Score -15, Flag: "wohnrecht"
- Altlasten erwaehnt → Score -10, Flag: "altlasten"
- Asbest erwaehnt → Score -10, Flag: "asbest"
- Schimmel/Feuchtigkeit → Score -5, Flag: "feuchtigkeit"
- Laerm (Flughafen, Autobahn, Bahn) → Score -5, Flag: "laerm"
- Ueberschwemmungsgebiet → Score -10, Flag: "ueberschwemmung"
- Vorkaufsrecht der Gemeinde → Score -3, Flag: "vorkaufsrecht"

ANTWORT-FORMAT (JSON):
{
  "score": 75,
  "breakdown": { "location": 22, "value": 18, "yield": 20, "risk": 15 },
  "yield_estimate": 5.8,
  "kaufpreisfaktor": 17.2,
  "risk_flags": ["sanierungsstau_leicht"],
  "summary": "Solide 2-Zimmer-Wohnung in guter Lage mit ordentlicher Rendite. Leichter Renovierungsbedarf im Bad, aber insgesamt ein guter Deal bei dem Preis.",
  "nebenkosten_estimate": {
    "grunderwerbsteuer_pct": 6.0,
    "notar_pct": 1.5,
    "makler_pct": 3.57,
    "grundbuch_pct": 0.5,
    "total_pct": 11.57,
    "total_eur": 33453
  }
}`;

export const DEAL_QUALIFIER_USER_PROMPT_TEMPLATE = `
SUCHKRITERIEN DES INVESTORS:
- Standort: {location}
- Immobilientyp: {property_type}
- Kauftyp: {purchase_type}
- Budget: {price_min} - {price_max} EUR
- Flaeche: {area_min} - {area_max} m²
- Zimmer: {rooms_min} - {rooms_max}
- Mindest-Rendite: {yield_min}%
- Spezielle Filter: {custom_filters}

INSERAT ZU BEWERTEN:
Portal: {portal}
Titel: {title}
Preis: {price} EUR
Flaeche: {area_sqm} m²
Zimmer: {rooms}
Adresse: {address}
Expose-URL: {listing_url}

DETAIL-DATEN:
{detail_data_json}

Bewerte dieses Inserat gemaess dem Bewertungsschema. Antworte NUR als JSON.`;
```

### 3.4 Prompt-Integration

Der System-Prompt wird in `lib/agents/prompts.ts` als neuer Eintrag im `basePrompts` Record eingefuegt:

```typescript
// In lib/agents/prompts.ts, im basePrompts Record hinzufuegen:

'property-sentinel': `Du bist der Property Sentinel — ...` // (siehe 3.2)
```

Der KI-Scoring-Prompt (`DEAL_QUALIFIER_SYSTEM_PROMPT`) lebt separat in `lib/agents/property-sentinel/prompts.ts`, da er intern vom `deal_qualifier` Tool genutzt wird und nicht als Agent-System-Prompt dient.

---

## 4. Tool Specifications

Der Property Sentinel hat 4 Tools. Jedes Tool folgt dem etablierten Pattern aus `lib/agents/tenant-communicator/tools/`:

- `TOOL_NAME_TOOL` Konstante mit `name`, `description`, `input_schema` (JSON Schema)
- Eigenstaendige `async function` mit typisiertem Input/Output
- Barrel-Export via `index.ts` mit `getXToolsForOpenAI()`, `executeXTool()`, `getXToolDisplay()`

### 4.1 Tool: `search_manager`

**Zweck:** CRUD-Verwaltung von Suchprofilen. Der Nutzer beschreibt seine Kriterien in natuerlicher Sprache, der Agent ruft dieses Tool mit strukturierten Daten auf.

#### 4.1.1 JSON Schema (OpenAI Function Definition)

```typescript
// lib/agents/property-sentinel/tools/search-manager.ts

export const SEARCH_MANAGER_TOOL = {
  name: 'search_manager',
  description: 'Erstellt, aktualisiert, pausiert, aktiviert oder loescht ein Immobilien-Suchprofil. Listet auch alle bestehenden Profile mit Statistiken auf.',
  input_schema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'update', 'pause', 'resume', 'delete', 'list', 'stats'],
        description: 'Die auszufuehrende Aktion.',
      },
      profile_id: {
        type: 'string',
        description: 'UUID des Suchprofils (erforderlich fuer update/pause/resume/delete/stats).',
      },
      criteria: {
        type: 'object',
        description: 'Suchkriterien (fuer create/update).',
        properties: {
          name: { type: 'string', description: 'Anzeigename des Profils, z.B. "Berlin Mitte 2-Zi"' },
          city: { type: 'string', description: 'Stadt, z.B. "Berlin"' },
          state: { type: 'string', description: 'Bundesland-Kuerzel, z.B. "BE"' },
          districts: {
            type: 'array',
            items: { type: 'string' },
            description: 'Stadtteile, z.B. ["Mitte", "Prenzlauer Berg"]',
          },
          zip_codes: {
            type: 'array',
            items: { type: 'string' },
            description: 'PLZ-Filter, z.B. ["10115", "10119"]',
          },
          radius_km: { type: 'number', minimum: 1, maximum: 50, description: 'Suchradius in km' },
          property_type: {
            type: 'string',
            enum: ['apartment', 'house', 'commercial', 'land'],
            description: 'Immobilientyp',
          },
          purchase_type: {
            type: 'string',
            enum: ['buy', 'rent'],
            description: 'Kauf oder Miete',
          },
          price_min: { type: 'number', minimum: 0, description: 'Mindestpreis in EUR' },
          price_max: { type: 'number', minimum: 0, description: 'Hoechstpreis in EUR' },
          area_min: { type: 'number', minimum: 10, description: 'Mindestflaeche in m²' },
          area_max: { type: 'number', description: 'Hoechstflaeche in m²' },
          rooms_min: { type: 'number', minimum: 1, description: 'Mindestzimmer' },
          rooms_max: { type: 'number', description: 'Hoechstzimmer' },
          yield_min: { type: 'number', minimum: 0, maximum: 20, description: 'Mindest-Bruttorendite in %' },
          custom_filters: {
            type: 'object',
            description: 'Erweiterte KI-Filter (z.B. kein_denkmalschutz, provisionsfrei)',
            properties: {
              only_renovierungsbeduerftig: { type: 'boolean' },
              max_erbpacht_prozent: { type: 'number' },
              kein_denkmalschutz: { type: 'boolean' },
              min_baujahr: { type: 'number' },
              max_baujahr: { type: 'number' },
              heizungstyp: { type: 'array', items: { type: 'string' } },
              energieeffizienz_min: { type: 'string' },
              balkon_pflicht: { type: 'boolean' },
              aufzug_pflicht: { type: 'boolean' },
              stellplatz_pflicht: { type: 'boolean' },
              max_stockwerk: { type: 'number' },
              provisionsfrei: { type: 'boolean' },
            },
          },
        },
      },
      frequency: {
        type: 'string',
        enum: ['hourly', '6x_daily', '3x_daily', 'daily'],
        description: 'Scan-Frequenz',
      },
      portals: {
        type: 'array',
        items: { type: 'string', enum: ['immoscout24', 'immowelt', 'ebay_kleinanzeigen'] },
        description: 'Zu scannende Portale',
      },
      min_score: {
        type: 'number',
        minimum: 0,
        maximum: 100,
        description: 'Minimum KI-Score fuer automatischen Pipeline-Push',
      },
    },
    required: ['action'],
  },
} as const;
```

#### 4.1.2 TypeScript Interfaces

```typescript
export interface SearchManagerInput {
  action: 'create' | 'update' | 'pause' | 'resume' | 'delete' | 'list' | 'stats';
  profile_id?: string;
  criteria?: {
    name?: string;
    city?: string;
    state?: string;
    districts?: string[];
    zip_codes?: string[];
    radius_km?: number;
    property_type?: 'apartment' | 'house' | 'commercial' | 'land';
    purchase_type?: 'buy' | 'rent';
    price_min?: number;
    price_max?: number;
    area_min?: number;
    area_max?: number;
    rooms_min?: number;
    rooms_max?: number;
    yield_min?: number;
    custom_filters?: CustomFilters;
  };
  frequency?: 'hourly' | '6x_daily' | '3x_daily' | 'daily';
  portals?: string[];
  min_score?: number;
}

export interface SearchManagerResult {
  profiles?: SearchProfile[];        // fuer action: 'list'
  profile?: SearchProfile;           // fuer action: 'create' | 'update' | 'pause' | 'resume'
  stats?: ProfileStats;              // fuer action: 'stats'
  deleted?: boolean;                 // fuer action: 'delete'
  formatted_output: string;          // Immer vorhanden — formatierte Zusammenfassung
}

export interface ProfileStats {
  profile_id: string;
  name: string;
  total_scans: number;
  total_found: number;
  total_qualified: number;
  qualified_rate: number;            // total_qualified / total_found * 100
  avg_score: number;
  last_scan_at: string | null;
  last_scan_status: string | null;
  credits_used_today: number;
  active_since: string;
}
```

#### 4.1.3 Implementation Algorithm (Pseudocode)

```
async function searchManager(input: SearchManagerInput, userId: string): Promise<SearchManagerResult>

  switch (input.action):

    case 'create':
      1. VALIDATE: input.criteria muss vorhanden sein
      2. VALIDATE: input.criteria.city ist Pflicht
      3. VALIDATE: Max 5 Profile pro User (Limit aus Config)
         → SELECT COUNT(*) FROM sentinel_search_profiles WHERE user_id = $userId AND is_active = true
         → Wenn >= MAX_PROFILES_PER_USER: Return Error "Maximum 5 aktive Suchprofile erreicht"
      4. VALIDATE: portals sind aus Whitelist
      5. BUILD location JSONB aus criteria (city, state, districts, zip_codes, radius_km)
      6. BUILD cronExpression aus frequency (lookup FREQUENCY_PRESETS)
      7. INSERT INTO sentinel_search_profiles (...)
      8. SCHEDULE BullMQ Repeatable Job:
         sentinelQueue.add(SCAN_PROFILE, { profileId, userId }, {
           repeat: { pattern: cronExpression, tz: timezone },
           jobId: `sentinel-${profileId}`,
         })
      9. Return { profile: createdProfile, formatted_output: formatProfileCreated(profile) }

    case 'update':
      1. VALIDATE: input.profile_id muss vorhanden sein
      2. LOAD Profil aus DB, pruefe Ownership (user_id = userId)
      3. MERGE criteria: nur gesetzte Felder ueberschreiben
      4. UPDATE sentinel_search_profiles SET ...
      5. Wenn frequency geaendert:
         a. REMOVE alte BullMQ Repeatable: sentinelQueue.removeRepeatableByKey(oldKey)
         b. ADD neue BullMQ Repeatable mit neuem Cron
      6. Return { profile: updatedProfile, formatted_output: formatProfileUpdated(profile) }

    case 'pause':
      1. VALIDATE: profile_id vorhanden
      2. LOAD Profil, pruefe Ownership
      3. UPDATE SET is_active = false, paused_until = input.paused_until || null
      4. REMOVE BullMQ Repeatable Job
      5. Return { profile: pausedProfile, formatted_output: "Profil pausiert" }

    case 'resume':
      1. VALIDATE: profile_id vorhanden
      2. LOAD Profil, pruefe Ownership
      3. UPDATE SET is_active = true, paused_until = null
      4. ADD BullMQ Repeatable Job (mit gespeichertem Cron)
      5. Return { profile: resumedProfile, formatted_output: "Profil reaktiviert" }

    case 'delete':
      1. VALIDATE: profile_id vorhanden
      2. LOAD Profil, pruefe Ownership
      3. REMOVE BullMQ Repeatable Job
      4. UPDATE SET is_active = false (Soft-Delete, kein physisches Loeschen)
         Alternativ: DELETE CASCADE (loescht auch Listings und Logs)
         → Design-Entscheidung: Soft-Delete bevorzugt (Datenerhalt)
      5. Return { deleted: true, formatted_output: "Profil geloescht" }

    case 'list':
      1. SELECT * FROM sentinel_search_profiles WHERE user_id = $userId ORDER BY created_at DESC
      2. Fuer jedes Profil: Zaehl neue Listings seit letztem Scan
      3. Return { profiles: [...], formatted_output: formatProfileList(profiles) }

    case 'stats':
      1. VALIDATE: profile_id vorhanden
      2. LOAD Profil + Statistiken
      3. BERECHNE:
         - qualified_rate = (total_qualified / total_found) * 100
         - avg_score = AVG(ai_score) FROM sentinel_seen_listings WHERE profile_id AND ai_scored
         - credits_used_today = SUM(credits_used) FROM sentinel_scan_logs WHERE profile_id AND today
      4. Return { stats: { ... }, formatted_output: formatProfileStats(stats) }
```

#### 4.1.4 Formatted Output Beispiel

```
╔══════════════════════════════════════════════════════════════╗
║  SUCHPROFIL ERSTELLT                                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Name:         Berlin Mitte 2-Zi Kapitalanlage               ║
║  Standort:     Berlin, Mitte, Prenzlauer Berg                ║
║  Typ:          Wohnung (Kauf)                                ║
║  Budget:       200.000 - 350.000 EUR                         ║
║  Flaeche:      45 - 80 m²                                    ║
║  Zimmer:       2 - 3                                         ║
║  Rendite:      >= 5,0% brutto                                ║
║                                                              ║
║  Portale:      ImmoScout24, Immowelt, eBay Kleinanzeigen     ║
║  Frequenz:     6x taeglich (04, 08, 11, 14, 17, 21 Uhr)     ║
║  Min-Score:    60                                            ║
║  Auto-Pipeline: Ja                                           ║
║                                                              ║
║  Naechster Scan: in ~2 Stunden                               ║
║  Oder jetzt manuell scannen: "Scanne mein Berlin-Profil"     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 4.2 Tool: `market_radar`

**Zweck:** Der Kern-Scraper. Fuehrt einen Scan fuer ein Suchprofil durch — scannt Portale via Firecrawl, fuehrt Dedup durch, holt Detail-Daten fuer neue Listings.

#### 4.2.1 JSON Schema

```typescript
export const MARKET_RADAR_TOOL = {
  name: 'market_radar',
  description: 'Fuehrt einen manuellen Scan fuer ein Suchprofil durch. Scannt die konfigurierten Immobilienportale, findet neue Inserate und gibt eine Zusammenfassung zurueck. Wird auch automatisch vom Scheduler aufgerufen.',
  input_schema: {
    type: 'object',
    properties: {
      profile_id: {
        type: 'string',
        description: 'UUID des Suchprofils, das gescannt werden soll.',
      },
      portals: {
        type: 'array',
        items: { type: 'string', enum: ['immoscout24', 'immowelt', 'ebay_kleinanzeigen'] },
        description: 'Optional: Nur bestimmte Portale scannen (Standard: alle konfigurierten).',
      },
      dry_run: {
        type: 'boolean',
        description: 'Wenn true: Scan simulieren, keine DB-Schreibvorgaenge. Nuetzlich zum Testen.',
      },
    },
    required: ['profile_id'],
  },
} as const;
```

#### 4.2.2 TypeScript Interfaces

```typescript
export interface MarketRadarInput {
  profile_id: string;
  portals?: string[];
  dry_run?: boolean;
}

export interface MarketRadarResult {
  scan_summary: {
    profile_name: string;
    portals_scanned: number;
    total_listings_found: number;
    new_listings: number;
    detail_scraped: number;
    price_changes_detected: number;
    credits_used: number;
    duration_ms: number;
  };
  new_listings: ListingSummary[];
  portal_status: PortalStatus[];
  price_changes: PriceChange[];
  formatted_output: string;
}

export interface ListingSummary {
  id: string;
  portal: string;
  title: string;
  price: number;
  area_sqm: number;
  rooms: number;
  address: string;
  listing_url: string;
  detail_scraped: boolean;
}

export interface PortalStatus {
  portal: string;
  status: 'success' | 'error' | 'skipped' | 'cached';
  listings_found: number;
  new_listings: number;
  credits_used: number;
  error_message?: string;
  duration_ms: number;
}

export interface PriceChange {
  listing_id: string;
  title: string;
  portal: string;
  old_price: number;
  new_price: number;
  change_pct: number;
  listing_url: string;
}
```

#### 4.2.3 Implementation Algorithm (Pseudocode)

```
async function marketRadar(input: MarketRadarInput, userId: string): Promise<MarketRadarResult>

  const startTime = Date.now()
  const scanLog = await createScanLog(input.profile_id, userId, 'running')

  try:
    // ── 1. Profil laden ──
    const profile = await loadProfile(input.profile_id)
    VALIDATE: profile existiert UND profile.user_id === userId
    VALIDATE: profile.is_active === true (oder dry_run)

    // ── 2. Budget Guard ──
    if (!input.dry_run):
      const canScan = await shouldScan(profile, userId)
      if (!canScan.allowed):
        throw new Error(`Scan blockiert: ${canScan.reason}`)

    // ── 3. Portale bestimmen ──
    const portals = input.portals || profile.portals
    VALIDATE: portals.length > 0

    // ── 4. Portal-Loop (seriell pro Portal, parallel wuerde Rate Limits triggern) ──
    const portalResults: PortalStatus[] = []
    const allNewListings: ListingSummary[] = []
    const allPriceChanges: PriceChange[] = []
    let totalCredits = 0

    for (const portal of portals):
      const portalStart = Date.now()

      try:
        // 4a. Such-URL generieren
        const searchUrls = PortalUrlGenerator.generate(portal, profile)

        // 4b. Listen-Scrape via Firecrawl
        let listings: RawListing[] = []
        for (const url of searchUrls):
          // Cache pruefen (Redis, TTL 30 Min)
          const cached = await redisGet(`sentinel:cache:${hashUrl(url)}`)
          if (cached):
            listings.push(...JSON.parse(cached))
            portalResults.push({ portal, status: 'cached', ... })
            continue

          // Firecrawl Scrape
          const scrapeResult = await firecrawlService.scrapeListPage(url, portal)
          listings.push(...scrapeResult.listings)
          totalCredits += 1  // 1 Credit pro Listen-Seite

          // Cache setzen
          await redisSetEx(`sentinel:cache:${hashUrl(url)}`, 1800, JSON.stringify(scrapeResult.listings))

        // 4c. ID-Extraktion & Normalisierung
        const parsedListings = listings.map(l => ListingParser.parse(l, portal))

        // 4d. Dedup via Upsert
        const newListings: ParsedListing[] = []
        const priceChanges: PriceChange[] = []

        for (const listing of parsedListings):
          if (input.dry_run):
            // Im Dry-Run: nur pruefen ob Listing existiert (SELECT statt UPSERT)
            const exists = await checkListingExists(profile.id, portal, listing.externalId)
            if (!exists): newListings.push(listing)
            continue

          const upsertResult = await upsertListing({
            profileId: profile.id,
            userId,
            portal,
            externalId: listing.externalId,
            listingUrl: listing.listingUrl,
            title: listing.title,
            price: listing.price,
            areaSqm: listing.areaSqm,
            rooms: listing.rooms,
            addressRaw: listing.address,
          })

          if (upsertResult.isNew):
            newListings.push(listing)
          else if (upsertResult.priceChanged):
            priceChanges.push({
              listing_id: upsertResult.id,
              title: listing.title,
              portal,
              old_price: upsertResult.previousPrice,
              new_price: listing.price,
              change_pct: ((listing.price - upsertResult.previousPrice) / upsertResult.previousPrice) * 100,
              listing_url: listing.listingUrl,
            })

        // 4e. Detail-Scrape (nur neue Listings)
        let detailScrapedCount = 0
        for (const newListing of newListings):
          // Budget-Check pro Listing
          if (totalCredits >= SENTINEL_CONFIG.FIRECRAWL_PER_SCAN_LIMIT):
            console.warn(`[SENTINEL] Per-scan credit limit reached (${totalCredits})`)
            break

          try:
            const detail = await firecrawlService.scrapeDetailPage(newListing.listingUrl, portal)
            totalCredits += 1

            if (!input.dry_run):
              await updateListingDetail(newListing.dbId, detail)
            detailScrapedCount++
          catch (detailError):
            console.error(`[SENTINEL] Detail scrape failed for ${newListing.externalId}:`, detailError)
            // Einzelfehler ueberspringen, nicht den ganzen Scan abbrechen

        portalResults.push({
          portal,
          status: 'success',
          listings_found: parsedListings.length,
          new_listings: newListings.length,
          credits_used: totalCredits,  // kumulative Credits bis hier
          duration_ms: Date.now() - portalStart,
        })

        allNewListings.push(...newListings.map(formatListingSummary))
        allPriceChanges.push(...priceChanges)

      catch (portalError):
        console.error(`[SENTINEL] Portal ${portal} failed:`, portalError)
        portalResults.push({
          portal,
          status: 'error',
          listings_found: 0,
          new_listings: 0,
          credits_used: 0,
          error_message: portalError.message,
          duration_ms: Date.now() - portalStart,
        })
        // Portal-Fehler ueberspringen, naechstes Portal scannen

    // ── 5. Profil-Statistiken aktualisieren ──
    if (!input.dry_run):
      await updateProfileStats(profile.id, {
        totalScans: profile.totalScans + 1,
        totalFound: profile.totalFound + allNewListings.length,
        lastScanAt: new Date(),
        lastScanStatus: portalResults.every(p => p.status === 'success') ? 'success' : 'partial',
      })

    // ── 6. Scan-Log abschliessen ──
    if (!input.dry_run):
      await completeScanLog(scanLog.id, {
        status: portalResults.every(p => p.status === 'success') ? 'success' : 'partial',
        portalsScanned: portalResults,
        totalNew: allNewListings.length,
        creditsUsed: totalCredits,
      })

    // ── 7. Stale-Detection ──
    if (!input.dry_run):
      await markStaleListings(profile.id)
      // UPDATE sentinel_seen_listings SET is_stale = true, stale_since = NOW()
      // WHERE profile_id = $1 AND is_stale = false
      // AND last_checked_at < NOW() - INTERVAL '3 days'

    // ── 8. Return ──
    const duration = Date.now() - startTime
    return {
      scan_summary: {
        profile_name: profile.name,
        portals_scanned: portals.length,
        total_listings_found: portalResults.reduce((s, p) => s + p.listings_found, 0),
        new_listings: allNewListings.length,
        detail_scraped: detailScrapedCount,
        price_changes_detected: allPriceChanges.length,
        credits_used: totalCredits,
        duration_ms: duration,
      },
      new_listings: allNewListings,
      portal_status: portalResults,
      price_changes: allPriceChanges,
      formatted_output: formatMarketRadarOutput(scan_summary, allNewListings, portalResults, allPriceChanges),
    }

  catch (error):
    await failScanLog(scanLog.id, error.message)
    throw error
```

#### 4.2.4 Formatted Output Beispiel

```
╔══════════════════════════════════════════════════════════════╗
║  SCAN ABGESCHLOSSEN: Berlin Mitte 2-Zi Kapitalanlage       ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Portale:  3 gescannt | Credits: 18 verbraucht              ║
║  Dauer:    12,4 Sekunden                                     ║
║                                                              ║
║  ┌──────────────────┬────────┬──────┬────────┐              ║
║  │ Portal           │ Status │ Ges. │ Neu    │              ║
║  ├──────────────────┼────────┼──────┼────────┤              ║
║  │ ImmoScout24      │ ✓      │ 24   │ 5      │              ║
║  │ Immowelt         │ ✓      │ 18   │ 3      │              ║
║  │ eBay Kleinanz.   │ ✓      │ 12   │ 0      │              ║
║  └──────────────────┴────────┴──────┴────────┘              ║
║                                                              ║
║  8 NEUE INSERATE GEFUNDEN:                                   ║
║                                                              ║
║  1. 2-Zi ETW Berlin Mitte Rosenthaler Str.                  ║
║     289.000 EUR | 52 m² | 2 Zi | ImmoScout24                ║
║                                                              ║
║  2. Altbau-Wohnung Prenzlauer Berg                          ║
║     315.000 EUR | 61 m² | 2.5 Zi | ImmoScout24              ║
║                                                              ║
║  3. Kapitalanlage: Vermietete 2-Zi-Whg                      ║
║     245.000 EUR | 48 m² | 2 Zi | Immowelt                   ║
║                                                              ║
║  ... (5 weitere)                                             ║
║                                                              ║
║  PREISAENDERUNGEN: 2 erkannt                                 ║
║  ↓ 3-Zi Friedrichshain: 340.000 → 320.000 EUR (-5,9%)       ║
║  ↑ 2-Zi Mitte: 285.000 → 295.000 EUR (+3,5%)               ║
║                                                              ║
║  Naechster Schritt: "Bewerte die neuen Treffer" oder         ║
║  "Schiebe alles mit Score > 70 in die Pipeline"              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 4.3 Tool: `deal_qualifier`

**Zweck:** KI-gesteuerte Bewertung von Listings. Sendet Expose-Daten + Suchkriterien an OpenAI und erhaelt einen strukturierten Score.

#### 4.3.1 JSON Schema

```typescript
export const DEAL_QUALIFIER_TOOL = {
  name: 'deal_qualifier',
  description: 'Bewertet ein oder mehrere Immobilien-Inserate anhand der Suchkriterien des Nutzers mittels KI-Scoring. Gibt einen Score (0-100), Rendite-Schaetzung und Risiko-Flags zurueck.',
  input_schema: {
    type: 'object',
    properties: {
      listing_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'UUIDs der zu bewertenden Listings aus sentinel_seen_listings.',
        maxItems: 10,
      },
      profile_id: {
        type: 'string',
        description: 'UUID des Suchprofils (fuer Kriterien-Kontext bei der Bewertung).',
      },
    },
    required: ['listing_ids', 'profile_id'],
  },
} as const;
```

#### 4.3.2 TypeScript Interfaces

```typescript
export interface DealQualifierInput {
  listing_ids: string[];
  profile_id: string;
}

export interface DealQualifierResult {
  evaluations: ListingEvaluation[];
  summary: QualificationSummary;
  formatted_output: string;
}

export interface ListingEvaluation {
  listing_id: string;
  title: string;
  portal: string;
  score: number;                     // 0-100
  breakdown: ScoreBreakdown;
  yield_estimate: number;            // % brutto
  kaufpreisfaktor: number;
  risk_flags: string[];
  summary: string;                   // 2-3 Satz KI-Begruendung
  nebenkosten_estimate: {
    grunderwerbsteuer_pct: number;
    notar_pct: number;
    makler_pct: number;
    grundbuch_pct: number;
    total_pct: number;
    total_eur: number;
  };
}

export interface QualificationSummary {
  total_evaluated: number;
  avg_score: number;
  top_deal: { listing_id: string; title: string; score: number } | null;
  qualified_count: number;           // Score >= profile.min_score
  risk_flag_distribution: Record<string, number>; // z.B. { "sanierungsstau": 3, "erbpacht": 1 }
}
```

#### 4.3.3 Implementation Algorithm

```
async function dealQualifier(input: DealQualifierInput, userId: string): Promise<DealQualifierResult>

  // ── 1. Daten laden ──
  const profile = await loadProfile(input.profile_id)
  VALIDATE: profile.user_id === userId

  const listings = await loadListings(input.listing_ids)
  VALIDATE: listings.length > 0
  VALIDATE: alle listings.profile_id === input.profile_id

  // ── 2. Listings aufbereiten ──
  // Nur Listings mit detail_data bewerten (ohne Details ist Score ungenau)
  const readyListings = listings.filter(l => l.detailScraped && l.detailData)
  const skippedListings = listings.filter(l => !l.detailScraped)
  // Warnung fuer skipped Listings in formatted_output

  // ── 3. Batch-Verarbeitung (max 5 pro OpenAI-Call) ──
  const BATCH_SIZE = 5
  const evaluations: ListingEvaluation[] = []

  for (const batch of chunk(readyListings, BATCH_SIZE)):

    // 3a. System-Prompt (DEAL_QUALIFIER_SYSTEM_PROMPT aus prompts.ts)
    // 3b. User-Prompt: Suchkriterien + Listing-Daten als JSON
    const userPrompt = batch.map((listing, i) => {
      return DEAL_QUALIFIER_USER_PROMPT_TEMPLATE
        .replace('{location}', JSON.stringify(profile.location))
        .replace('{property_type}', profile.propertyType)
        .replace('{purchase_type}', profile.purchaseType)
        .replace('{price_min}', String(profile.priceMin || 0))
        .replace('{price_max}', String(profile.priceMax || 'unbegrenzt'))
        .replace('{area_min}', String(profile.areaMin || 0))
        .replace('{area_max}', String(profile.areaMax || 'unbegrenzt'))
        .replace('{rooms_min}', String(profile.roomsMin || 1))
        .replace('{rooms_max}', String(profile.roomsMax || 'unbegrenzt'))
        .replace('{yield_min}', String(profile.yieldMin || 0))
        .replace('{custom_filters}', JSON.stringify(profile.customFilters || {}))
        .replace('{portal}', listing.portal)
        .replace('{title}', listing.title)
        .replace('{price}', String(listing.price))
        .replace('{area_sqm}', String(listing.areaSqm))
        .replace('{rooms}', String(listing.rooms))
        .replace('{address}', listing.addressRaw || 'unbekannt')
        .replace('{listing_url}', listing.listingUrl)
        .replace('{detail_data_json}', JSON.stringify(listing.detailData, null, 2))
    }).join('\n\n---\n\n')

    // 3c. OpenAI Call (JSON Mode)
    const openaiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: DEAL_QUALIFIER_SYSTEM_PROMPT },
        { role: 'user', content: `Bewerte die folgenden ${batch.length} Inserate:\n\n${userPrompt}` },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 4000,
    })

    // 3d. Response parsen
    const responseText = openaiResponse.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(responseText)
    // parsed kann sein: { evaluations: [...] } oder einzelnes { score, breakdown, ... }

    // 3e. Evaluations zuordnen
    const batchEvaluations = Array.isArray(parsed.evaluations) ? parsed.evaluations : [parsed]
    for (let i = 0; i < batch.length; i++):
      const listing = batch[i]
      const eval = batchEvaluations[i] || { score: 0, breakdown: { location: 0, value: 0, yield: 0, risk: 0 }, summary: 'Bewertung fehlgeschlagen' }

      evaluations.push({
        listing_id: listing.id,
        title: listing.title,
        portal: listing.portal,
        score: clamp(eval.score, 0, 100),
        breakdown: eval.breakdown,
        yield_estimate: eval.yield_estimate || 0,
        kaufpreisfaktor: eval.kaufpreisfaktor || 0,
        risk_flags: eval.risk_flags || [],
        summary: eval.summary || '',
        nebenkosten_estimate: eval.nebenkosten_estimate || calculateNebenkosten(listing.price, profile.location.state),
      })

      // 3f. Score in DB schreiben
      await updateListingScore(listing.id, {
        aiScored: true,
        aiScore: eval.score,
        aiScoreBreakdown: eval.breakdown,
        aiYieldEst: eval.yield_estimate,
        aiRiskFlags: eval.risk_flags,
        aiSummary: eval.summary,
        aiScoredAt: new Date(),
      })

  // ── 4. Summary berechnen ──
  const qualifiedCount = evaluations.filter(e => e.score >= profile.minScore).length
  const avgScore = evaluations.reduce((s, e) => s + e.score, 0) / evaluations.length
  const topDeal = evaluations.sort((a, b) => b.score - a.score)[0]

  const riskFlagDist: Record<string, number> = {}
  evaluations.forEach(e => e.risk_flags.forEach(f => { riskFlagDist[f] = (riskFlagDist[f] || 0) + 1 }))

  return {
    evaluations,
    summary: {
      total_evaluated: evaluations.length,
      avg_score: Math.round(avgScore * 10) / 10,
      top_deal: topDeal ? { listing_id: topDeal.listing_id, title: topDeal.title, score: topDeal.score } : null,
      qualified_count: qualifiedCount,
      risk_flag_distribution: riskFlagDist,
    },
    formatted_output: formatDealQualifierOutput(evaluations, summary, skippedListings),
  }
```

#### 4.3.4 Formatted Output Beispiel

```
╔══════════════════════════════════════════════════════════════╗
║  KI-BEWERTUNG: 8 Inserate bewertet                          ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Durchschnitt: 68/100 | Qualifiziert (>=60): 6/8            ║
║                                                              ║
║  TOP DEAL: 2-Zi ETW Rosenthaler Str. (Score: 82)            ║
║                                                              ║
║  ┌────┬──────────────────────────┬───────┬───────┬────────┐  ║
║  │ #  │ Titel                    │ Score │ Rend. │ Risiko │  ║
║  ├────┼──────────────────────────┼───────┼───────┼────────┤  ║
║  │ 1  │ 2-Zi ETW Rosenthaler    │ 82 ●● │ 5,8%  │ —      │  ║
║  │ 2  │ Altbau Prenzl.Berg      │ 78 ●● │ 5,2%  │ ⚠ reno │  ║
║  │ 3  │ Kapitalanlage 2-Zi      │ 75 ●● │ 6,1%  │ —      │  ║
║  │ 4  │ Neukoelln Herrfurthstr. │ 71 ●  │ 4,8%  │ ⚠ lage │  ║
║  │ 5  │ Friedrichshain 2.5-Zi   │ 68 ●  │ 4,5%  │ —      │  ║
║  │ 6  │ Wedding Seestr.         │ 62 ●  │ 5,5%  │ ⚠ reno │  ║
║  │ 7  │ Reinickendorf 2-Zi      │ 48 ○  │ 3,2%  │ ⚠ lage │  ║
║  │ 8  │ Spandau Erdgeschoss     │ 35 ○  │ 2,8%  │ ⚠⚠ erb │  ║
║  └────┴──────────────────────────┴───────┴───────┴────────┘  ║
║                                                              ║
║  ●● Score >= 70 (Empfohlen)                                 ║
║  ●  Score >= 60 (Qualifiziert)                               ║
║  ○  Score < 60 (Unter Schwellwert)                           ║
║                                                              ║
║  RISIKO-FLAGS: sanierungsbedarf (2x), lage_risiko (2x),     ║
║                erbpacht (1x)                                 ║
║                                                              ║
║  Naechster Schritt: "Uebernimm die Top 3 in meine Pipeline" ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 4.4 Tool: `pipeline_sync`

**Zweck:** Synchronisiert qualifizierte Listings in die Pipeline des Nutzers. Erstellt Pipeline-Eintraege und benachrichtigt den User.

#### 4.4.1 JSON Schema

```typescript
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
        minimum: 0,
        maximum: 100,
        description: 'Minimum Score fuer Pipeline-Push (ueberschreibt Profil-Default).',
      },
      listing_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional: Nur bestimmte Listings pushen (statt alle qualifizierten).',
      },
      notify: {
        type: 'boolean',
        description: 'Nutzer per Socket.IO benachrichtigen? (Standard: true)',
      },
    },
    required: ['profile_id'],
  },
} as const;
```

#### 4.4.2 TypeScript Interfaces

```typescript
export interface PipelineSyncInput {
  profile_id: string;
  min_score?: number;
  listing_ids?: string[];
  notify?: boolean;
}

export interface PipelineSyncResult {
  pushed: number;
  skipped: number;
  already_pushed: number;
  avg_score: number;
  pushed_listings: PushedListing[];
  formatted_output: string;
}

export interface PushedListing {
  listing_id: string;
  pipeline_entry_id: string;
  title: string;
  score: number;
  price: number;
  portal: string;
}
```

#### 4.4.3 Implementation Algorithm

```
async function pipelineSync(input: PipelineSyncInput, userId: string): Promise<PipelineSyncResult>

  // ── 1. Profil laden ──
  const profile = await loadProfile(input.profile_id)
  VALIDATE: profile.user_id === userId

  // ── 2. Qualifizierte Listings laden ──
  const minScore = input.min_score ?? profile.minScore
  let listings: SeenListing[]

  if (input.listing_ids):
    // Spezifische Listings
    listings = await loadListings(input.listing_ids)
    listings = listings.filter(l => l.aiScored && l.aiScore >= minScore)
  else:
    // Alle qualifizierten, noch nicht gepushten Listings
    listings = await db
      .select()
      .from(sentinelSeenListings)
      .where(and(
        eq(sentinelSeenListings.profileId, input.profile_id),
        eq(sentinelSeenListings.aiScored, true),
        gte(sentinelSeenListings.aiScore, minScore),
        eq(sentinelSeenListings.pushedToPipeline, false),
      ))
      .orderBy(desc(sentinelSeenListings.aiScore))

  // ── 3. Duplikate filtern (bereits in Pipeline) ──
  const alreadyPushed = listings.filter(l => l.pushedToPipeline)
  const toPush = listings.filter(l => !l.pushedToPipeline)

  // ── 4. Pipeline-Eintraege erstellen ──
  const pushedListings: PushedListing[] = []

  for (const listing of toPush):
    try:
      // 4a. Pipeline-Eintrag erstellen
      // Format folgt dem bestehenden Pipeline-Schema
      const pipelineEntry = {
        title: `${listing.title} — ${listing.addressRaw || 'Adresse unbekannt'}`,
        description: listing.aiSummary || '',
        data: {
          type: 'sentinel_deal',
          source_portal: listing.portal,
          listing_url: listing.listingUrl,
          price: listing.price,
          area_sqm: listing.areaSqm,
          rooms: listing.rooms,
          ai_score: listing.aiScore,
          ai_score_breakdown: listing.aiScoreBreakdown,
          ai_yield_estimate: listing.aiYieldEst,
          ai_risk_flags: listing.aiRiskFlags,
          detail_data: listing.detailData,
          first_seen_at: listing.firstSeenAt,
        },
        status: 'new',              // Wartet auf User-Review
        priority: listing.aiScore >= 80 ? 'high' : listing.aiScore >= 70 ? 'medium' : 'low',
      }

      // 4b. In Ziel-Pipeline einfuegen
      const pipelineId = profile.pipelineId || await getOrCreateDefaultPipeline(userId, 'Property Sentinel Deals')
      const entryId = await createPipelineEntry(pipelineId, pipelineEntry, userId)

      // 4c. Listing als gepusht markieren
      await db.update(sentinelSeenListings)
        .set({
          pushedToPipeline: true,
          pipelineEntryId: entryId,
          pushedAt: new Date(),
        })
        .where(eq(sentinelSeenListings.id, listing.id))

      pushedListings.push({
        listing_id: listing.id,
        pipeline_entry_id: entryId,
        title: listing.title,
        score: listing.aiScore,
        price: listing.price,
        portal: listing.portal,
      })

    catch (pushError):
      console.error(`[SENTINEL] Failed to push listing ${listing.id}:`, pushError)
      // Einzelfehler ueberspringen

  // ── 5. Profil-Statistik aktualisieren ──
  await updateProfileStats(profile.id, {
    totalQualified: profile.totalQualified + pushedListings.length,
  })

  // ── 6. Benachrichtigung ──
  if ((input.notify !== false) && pushedListings.length > 0):
    // Socket.IO Event an User
    const io = getSocketIO()
    io.to(`user:${userId}`).emit('sentinel:deals-pushed', {
      profile_name: profile.name,
      count: pushedListings.length,
      top_score: pushedListings[0]?.score,
      message: `${pushedListings.length} neue Deals in Pipeline "${profile.name}"`,
    })

  // ── 7. Return ──
  const avgScore = pushedListings.length > 0
    ? pushedListings.reduce((s, l) => s + l.score, 0) / pushedListings.length
    : 0

  return {
    pushed: pushedListings.length,
    skipped: listings.length - toPush.length - alreadyPushed.length,
    already_pushed: alreadyPushed.length,
    avg_score: Math.round(avgScore * 10) / 10,
    pushed_listings: pushedListings,
    formatted_output: formatPipelineSyncOutput(pushedListings, alreadyPushed.length, minScore, profile.name),
  }
```

#### 4.4.4 Formatted Output Beispiel

```
╔══════════════════════════════════════════════════════════════╗
║  PIPELINE SYNC: Berlin Mitte 2-Zi Kapitalanlage            ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  5 Deals in Pipeline uebernommen (Min-Score: 60)             ║
║  2 bereits in Pipeline (uebersprungen)                       ║
║  1 unter Schwellwert (uebersprungen)                         ║
║                                                              ║
║  Durchschnittlicher Score: 74,2                              ║
║                                                              ║
║  ┌────┬──────────────────────────┬───────┬──────────────┐    ║
║  │ #  │ Titel                    │ Score │ Preis        │    ║
║  ├────┼──────────────────────────┼───────┼──────────────┤    ║
║  │ 1  │ 2-Zi ETW Rosenthaler    │ 82    │ 289.000 EUR  │    ║
║  │ 2  │ Altbau Prenzl.Berg      │ 78    │ 315.000 EUR  │    ║
║  │ 3  │ Kapitalanlage 2-Zi      │ 75    │ 245.000 EUR  │    ║
║  │ 4  │ Friedrichshain 2.5-Zi   │ 68    │ 298.000 EUR  │    ║
║  │ 5  │ Wedding Seestr.         │ 62    │ 220.000 EUR  │    ║
║  └────┴──────────────────────────┴───────┴──────────────┘    ║
║                                                              ║
║  Die Deals sind jetzt in deiner Pipeline verfuegbar.          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 4.5 Tool Barrel Export (`index.ts`)

```typescript
// lib/agents/property-sentinel/tools/index.ts

// Tool Executor
export {
  executeSentinelTool,
  getSentinelToolDisplay,
  type ToolResult,
  type ToolExecutionContext,
} from './tool-executor';

// Individual Tools
export { searchManager, SEARCH_MANAGER_TOOL } from './search-manager';
export { marketRadar, MARKET_RADAR_TOOL } from './market-radar';
export { dealQualifier, DEAL_QUALIFIER_TOOL } from './deal-qualifier';
export { pipelineSync, PIPELINE_SYNC_TOOL } from './pipeline-sync';

// Import tool constants
import { SEARCH_MANAGER_TOOL } from './search-manager';
import { MARKET_RADAR_TOOL } from './market-radar';
import { DEAL_QUALIFIER_TOOL } from './deal-qualifier';
import { PIPELINE_SYNC_TOOL } from './pipeline-sync';

/**
 * All Property Sentinel tools in raw format
 */
export const SENTINEL_TOOLS = [
  SEARCH_MANAGER_TOOL,
  MARKET_RADAR_TOOL,
  DEAL_QUALIFIER_TOOL,
  PIPELINE_SYNC_TOOL,
];

/**
 * Convert to OpenAI function calling format
 */
export function getSentinelToolsForOpenAI() {
  return SENTINEL_TOOLS.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}

/**
 * Get tool names list
 */
export function getSentinelToolNames(): string[] {
  return SENTINEL_TOOLS.map(t => t.name);
}
```

### 4.6 Tool Executor (`tool-executor.ts`)

```typescript
// lib/agents/property-sentinel/tools/tool-executor.ts

import { searchManager, type SearchManagerInput } from './search-manager';
import { marketRadar, type MarketRadarInput } from './market-radar';
import { dealQualifier, type DealQualifierInput } from './deal-qualifier';
import { pipelineSync, type PipelineSyncInput } from './pipeline-sync';
import { toolLoggingService } from '@/server/services/ToolLoggingService';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  summary: string;
}

export interface ToolExecutionContext {
  userId: string;
  workspaceId?: string;
  sessionId?: string;
  agentId?: string;
}

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  search_manager: 'Suchprofil-Manager',
  market_radar: 'Markt-Radar',
  deal_qualifier: 'Deal-Bewerter',
  pipeline_sync: 'Pipeline-Sync',
};

export function getSentinelToolDisplay(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

export async function executeSentinelTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext,
): Promise<ToolResult> {
  const startTime = Date.now();
  const { userId } = context;

  console.log(`[SENTINEL_TOOL] Executing ${toolName}`, { userId, args: summarizeArgs(args) });

  try {
    let result: ToolResult;

    switch (toolName) {
      case 'search_manager': {
        const input: SearchManagerInput = {
          action: args.action,
          profile_id: args.profile_id,
          criteria: args.criteria,
          frequency: args.frequency,
          portals: args.portals,
          min_score: args.min_score,
        };
        const smResult = await searchManager(input, userId);
        result = {
          success: true,
          data: smResult,
          summary: `Suchprofil: ${args.action}${smResult.profile ? ` — "${smResult.profile.name}"` : ''}`,
        };
        break;
      }

      case 'market_radar': {
        const input: MarketRadarInput = {
          profile_id: args.profile_id,
          portals: args.portals,
          dry_run: args.dry_run,
        };
        const mrResult = await marketRadar(input, userId);
        result = {
          success: true,
          data: mrResult,
          summary: `Scan: ${mrResult.scan_summary.new_listings} neue Listings, ${mrResult.scan_summary.portals_scanned} Portale`,
        };
        break;
      }

      case 'deal_qualifier': {
        const input: DealQualifierInput = {
          listing_ids: args.listing_ids,
          profile_id: args.profile_id,
        };
        const dqResult = await dealQualifier(input, userId);
        result = {
          success: true,
          data: dqResult,
          summary: `Bewertung: ${dqResult.summary.total_evaluated} Listings, Durchschnitt ${dqResult.summary.avg_score}/100`,
        };
        break;
      }

      case 'pipeline_sync': {
        const input: PipelineSyncInput = {
          profile_id: args.profile_id,
          min_score: args.min_score,
          listing_ids: args.listing_ids,
          notify: args.notify,
        };
        const psResult = await pipelineSync(input, userId);
        result = {
          success: true,
          data: psResult,
          summary: `Pipeline: ${psResult.pushed} Deals uebernommen, Avg Score ${psResult.avg_score}`,
        };
        break;
      }

      default:
        result = {
          success: false,
          error: `Unbekanntes Tool: ${toolName}`,
          summary: `Tool "${toolName}" ist nicht implementiert`,
        };
    }

    const executionTime = Date.now() - startTime;
    console.log(`[SENTINEL_TOOL] ${toolName} completed in ${executionTime}ms`, {
      success: result.success,
      summary: result.summary,
    });

    // Log to database
    try {
      await toolLoggingService.quickLog(
        userId,
        'property-sentinel',
        toolName,
        summarizeArgs(args),
        { success: result.success, summary: result.summary, error: result.error },
        executionTime,
        context.sessionId,
      );
    } catch (logError) {
      console.error('[SENTINEL_TOOL_LOG] Failed to log:', logError);
    }

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error(`[SENTINEL_TOOL] ${toolName} failed:`, error);

    const errorResult: ToolResult = {
      success: false,
      error: error.message,
      summary: `${getSentinelToolDisplay(toolName)} fehlgeschlagen: ${error.message}`,
    };

    try {
      await toolLoggingService.quickLog(
        userId, 'property-sentinel', toolName,
        summarizeArgs(args),
        { success: false, error: error.message },
        executionTime, context.sessionId,
      );
    } catch {}

    return errorResult;
  }
}

function summarizeArgs(args: Record<string, any>): Record<string, any> {
  const summary = { ...args };
  // Truncate listing_ids if too many
  if (summary.listing_ids?.length > 5) {
    summary.listing_ids = [...summary.listing_ids.slice(0, 5), `... +${summary.listing_ids.length - 5} more`];
  }
  return summary;
}
```

---

## 5. Firecrawl Service Layer

### 5.1 Uebersicht

Firecrawl ist der zentrale Scraping-Service. Er rendert JavaScript (notwendig fuer ImmoScout24/Immowelt), extrahiert strukturierte Daten via LLM und liefert sie als JSON zurueck.

**Warum Firecrawl statt eigenes Scraping?**

| Aspekt | Eigenes Scraping | Firecrawl |
|--------|-----------------|-----------|
| JS-Rendering | Puppeteer/Playwright selbst hosten | Managed, skalierbar |
| Strukturierte Extraktion | Eigene Parser pro Portal (fragil) | LLM-basiert (adaptiv) |
| Rate Limiting | Selbst implementieren | Eingebaut |
| Captcha-Handling | Komplex, unzuverlaessig | Eingebaut |
| Wartung bei Portal-Aenderungen | Parser-Updates noetig | LLM passt sich an |
| Kosten | Infrastruktur + Entwicklung | Credits (~$0.01/Scrape) |

### 5.2 `FirecrawlService.ts` — Singleton Service

```typescript
// lib/agents/property-sentinel/services/FirecrawlService.ts

import FirecrawlApp from '@mendable/firecrawl-js';
import { z } from 'zod';
import { withRetry } from '@/lib/ai/error-handler';
import { SENTINEL_CONFIG } from '../config';

// ── Zod Schemas fuer strukturierte Extraktion ──────────────

// Schema fuer Listen-Scrape (Such-Ergebnisseite)
const ListingScrapeSchema = z.object({
  listings: z.array(z.object({
    title: z.string().describe('Titel des Inserats'),
    price: z.number().optional().describe('Kaufpreis oder Kaltmiete in EUR'),
    price_text: z.string().optional().describe('Preis als Text falls Zahl nicht extrahierbar'),
    area_sqm: z.number().optional().describe('Wohnflaeche in Quadratmetern'),
    rooms: z.number().optional().describe('Anzahl Zimmer'),
    address: z.string().optional().describe('Adresse oder Standort-Beschreibung'),
    portal_id: z.string().describe('Eindeutige Inserat-ID oder Expose-Nummer des Portals'),
    detail_url: z.string().describe('URL zur Detail-/Expose-Seite'),
  })),
});

// Schema fuer Detail-Scrape (Einzelnes Expose)
const DetailScrapeSchema = z.object({
  description: z.string().optional().describe('Freitext-Beschreibung des Objekts'),
  features: z.array(z.string()).optional().describe('Liste der Ausstattungsmerkmale'),
  year_built: z.number().optional().describe('Baujahr'),
  last_renovation: z.number().optional().describe('Jahr der letzten Sanierung/Modernisierung'),
  energy_rating: z.string().optional().describe('Energieeffizienzklasse (A+ bis H)'),
  energy_consumption: z.number().optional().describe('Energieverbrauchskennwert in kWh/m²a'),
  heating_type: z.string().optional().describe('Heizungsart (Gas, Fernwaerme, etc.)'),
  condition: z.string().optional().describe('Zustand (neuwertig, gepflegt, renovierungsbeduerftig)'),
  floor: z.string().optional().describe('Stockwerk/Etage'),
  total_floors: z.number().optional().describe('Gesamtanzahl Stockwerke im Gebaeude'),
  parking: z.boolean().optional().describe('Stellplatz/Garage vorhanden'),
  parking_type: z.string().optional().describe('Art des Parkplatzes'),
  balcony: z.boolean().optional().describe('Balkon/Terrasse vorhanden'),
  garden: z.boolean().optional().describe('Garten vorhanden'),
  cellar: z.boolean().optional().describe('Keller vorhanden'),
  barrier_free: z.boolean().optional().describe('Barrierefrei/rollstuhlgeeignet'),
  furnished: z.boolean().optional().describe('Moebliert'),
  images: z.array(z.string()).optional().describe('URLs der Immobilienbilder'),
  agent_name: z.string().optional().describe('Name des Maklers/Anbieters'),
  agent_phone: z.string().optional().describe('Telefonnummer des Maklers'),
  agent_email: z.string().optional().describe('E-Mail des Maklers'),
  monthly_rent: z.number().optional().describe('Monatliche Kaltmiete in EUR (fuer Renditeberechnung)'),
  service_charges: z.number().optional().describe('Monatliche Nebenkosten in EUR'),
  ground_rent: z.number().optional().describe('Jaehrliche Erbpacht in EUR'),
  commission: z.string().optional().describe('Maklerprovision (z.B. "3,57% inkl. MwSt." oder "provisionsfrei")'),
  available_from: z.string().optional().describe('Verfuegbar ab (Datum oder "sofort")'),
});

// ── Types ──────────────────────────────────────────────────

export interface ListPageResult {
  listings: z.infer<typeof ListingScrapeSchema>['listings'];
  url: string;
  credits_used: number;
  cached: boolean;
}

export interface DetailPageResult {
  detail: z.infer<typeof DetailScrapeSchema>;
  url: string;
  credits_used: number;
}

// ── Circuit Breaker State ──────────────────────────────────

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

// ── FirecrawlService Class ─────────────────────────────────

export class FirecrawlService {
  private static instance: FirecrawlService;
  private client: FirecrawlApp;
  private circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailure: 0,
    isOpen: false,
  };

  // Rate limiting state
  private activeRequests = 0;
  private requestQueue: Array<{ resolve: () => void }> = [];

  private constructor() {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY is not set');
    }
    this.client = new FirecrawlApp({ apiKey });
  }

  static getInstance(): FirecrawlService {
    if (!FirecrawlService.instance) {
      FirecrawlService.instance = new FirecrawlService();
    }
    return FirecrawlService.instance;
  }

  // ── Rate Limiter ─────────────────────────────────────────

  private async acquireSlot(): Promise<void> {
    if (this.activeRequests < SENTINEL_CONFIG.FIRECRAWL_CONCURRENT_REQUESTS) {
      this.activeRequests++;
      return;
    }

    // Queue the request
    return new Promise<void>((resolve) => {
      this.requestQueue.push({ resolve });
    });
  }

  private releaseSlot(): void {
    this.activeRequests--;
    if (this.requestQueue.length > 0) {
      const next = this.requestQueue.shift()!;
      this.activeRequests++;
      next.resolve();
    }
  }

  // ── Circuit Breaker ──────────────────────────────────────

  private checkCircuitBreaker(): void {
    if (this.circuitBreaker.isOpen) {
      const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailure;
      // Half-open after 5 minutes
      if (timeSinceLastFailure > 5 * 60 * 1000) {
        this.circuitBreaker.isOpen = false;
        this.circuitBreaker.failures = 0;
        console.log('[FIRECRAWL] Circuit breaker half-open, allowing retry');
      } else {
        throw new Error(
          `Firecrawl circuit breaker is OPEN (${this.circuitBreaker.failures} consecutive failures). ` +
          `Retry in ${Math.ceil((5 * 60 * 1000 - timeSinceLastFailure) / 1000)}s`
        );
      }
    }
  }

  private recordFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailure = Date.now();
    if (this.circuitBreaker.failures >= 5) {
      this.circuitBreaker.isOpen = true;
      console.error(`[FIRECRAWL] Circuit breaker OPEN after ${this.circuitBreaker.failures} failures`);
    }
  }

  private recordSuccess(): void {
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.isOpen = false;
  }

  // ── Credit Tracking ──────────────────────────────────────

  // Credit tracking is done via Redis counters:
  //   Key: sentinel:credits:{userId}:{YYYY-MM-DD}
  //   TTL: 48h (auto-expire)
  //
  // Implementation:
  //   async incrementCredits(userId: string, amount: number): Promise<number>
  //     const key = `sentinel:credits:${userId}:${formatDate(new Date())}`
  //     const newTotal = await redis.incrby(key, amount)
  //     if (newTotal === amount) await redis.expire(key, 48 * 3600)
  //     return newTotal
  //
  //   async getTodayCredits(userId: string): Promise<number>
  //     const key = `sentinel:credits:${userId}:${formatDate(new Date())}`
  //     return parseInt(await redis.get(key) || '0')

  // ── Public API ───────────────────────────────────────────

  /**
   * Scrape a search results page and extract listing cards
   */
  async scrapeListPage(url: string, portal: string): Promise<ListPageResult> {
    this.checkCircuitBreaker();
    await this.acquireSlot();

    try {
      const result = await withRetry(async () => {
        return await this.client.scrapeUrl(url, {
          formats: ['extract'],
          extract: {
            schema: ListingScrapeSchema,
            prompt: this.getListScrapePrompt(portal),
          },
          timeout: 30000,
        });
      }, 3, 2000); // 3 retries, 2s initial delay

      this.recordSuccess();

      const listings = result?.extract?.listings || [];

      return {
        listings,
        url,
        credits_used: 1,
        cached: false,
      };
    } catch (error) {
      this.recordFailure();
      throw error;
    } finally {
      this.releaseSlot();
    }
  }

  /**
   * Scrape a single listing detail/expose page
   */
  async scrapeDetailPage(url: string, portal: string): Promise<DetailPageResult> {
    this.checkCircuitBreaker();
    await this.acquireSlot();

    try {
      const result = await withRetry(async () => {
        return await this.client.scrapeUrl(url, {
          formats: ['extract'],
          extract: {
            schema: DetailScrapeSchema,
            prompt: this.getDetailScrapePrompt(portal),
          },
          timeout: 30000,
        });
      }, 3, 2000);

      this.recordSuccess();

      return {
        detail: result?.extract || {},
        url,
        credits_used: 1,
      };
    } catch (error) {
      this.recordFailure();
      throw error;
    } finally {
      this.releaseSlot();
    }
  }

  // ── Portal-specific Prompts ──────────────────────────────

  private getListScrapePrompt(portal: string): string {
    const base = 'Extract all property listings from this search results page. ' +
      'For each listing extract: title, price in EUR (as number), area in square meters, ' +
      'number of rooms, address/location, the unique listing/expose ID, and the URL to the detail page.';

    switch (portal) {
      case 'immoscout24':
        return base + ' The portal is ImmobilienScout24. Listing IDs are numeric (e.g., 12345678). ' +
          'Detail URLs follow the pattern /expose/XXXXXXXX. Prices may show "VB" (Verhandlungsbasis).';
      case 'immowelt':
        return base + ' The portal is Immowelt. Listing IDs are alphanumeric. ' +
          'Detail URLs follow the pattern /expose/XXXXXXXX.';
      case 'ebay_kleinanzeigen':
        return base + ' The portal is Kleinanzeigen (formerly eBay Kleinanzeigen). ' +
          'Listing IDs are long numeric strings. Prices often show "VB" or "VHB".';
      default:
        return base;
    }
  }

  private getDetailScrapePrompt(portal: string): string {
    return 'Extract all property details from this real estate listing page. ' +
      'Include: full description text, list of features/amenities, year built, ' +
      'energy rating, heating type, condition, floor/level, parking availability, ' +
      'balcony, garden, cellar, accessibility, furnishing status, ' +
      'all image URLs, agent/broker name and contact, ' +
      'monthly rent (if rental or if listed for yield calculation), ' +
      'service charges, ground rent (Erbpacht) if applicable, ' +
      'commission info, and availability date. ' +
      'Return null for fields that are not available on the page.';
  }
}
```

### 5.3 `PortalUrlGenerator.ts`

```typescript
// lib/agents/property-sentinel/services/PortalUrlGenerator.ts

import { SearchProfile, LocationFilter } from '@/lib/db/schema-sentinel';

export interface SearchCriteria {
  location: LocationFilter;
  propertyType: string;
  purchaseType: string;
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  roomsMin?: string | null;
  roomsMax?: string | null;
}

/**
 * Generates search URLs for each portal based on search criteria.
 * Returns 1-2 URLs per portal (page 1 and optionally page 2).
 */
export class PortalUrlGenerator {

  static generate(portal: string, profile: SearchProfile): string[] {
    const criteria: SearchCriteria = {
      location: profile.location as LocationFilter,
      propertyType: profile.propertyType,
      purchaseType: profile.purchaseType,
      priceMin: profile.priceMin ?? undefined,
      priceMax: profile.priceMax ?? undefined,
      areaMin: profile.areaMin ?? undefined,
      areaMax: profile.areaMax ?? undefined,
      roomsMin: profile.roomsMin,
      roomsMax: profile.roomsMax,
    };

    switch (portal) {
      case 'immoscout24':
        return this.generateImmoScout24(criteria);
      case 'immowelt':
        return this.generateImmowelt(criteria);
      case 'ebay_kleinanzeigen':
        return this.generateKleinanzeigen(criteria);
      default:
        console.warn(`[PORTAL_URL] Unknown portal: ${portal}`);
        return [];
    }
  }

  // ── ImmobilienScout24 ────────────────────────────────────

  private static generateImmoScout24(c: SearchCriteria): string[] {
    // URL-Schema: immobilienscout24.de/Suche/de/{state}/{city}/{prop}-{type}
    const state = this.getImmoScoutState(c.location.state || 'berlin');
    const city = this.slugify(c.location.city);
    const propType = c.propertyType === 'apartment' ? 'wohnung' : 'haus';
    const purchaseType = c.purchaseType === 'buy' ? 'kaufen' : 'mieten';

    const base = `https://www.immobilienscout24.de/Suche/de/${state}/${city}/${propType}-${purchaseType}`;
    const params = new URLSearchParams();

    if (c.priceMax) params.set('priceto', String(c.priceMax));
    if (c.priceMin) params.set('pricefrom', String(c.priceMin));
    if (c.areaMin) params.set('livingspacefrom', String(c.areaMin));
    if (c.areaMax) params.set('livingspaceto', String(c.areaMax));
    if (c.roomsMin) params.set('numberofrooms', `${c.roomsMin}-`);
    if (c.roomsMax) params.set('numberofrooms', `${c.roomsMin || 1}-${c.roomsMax}`);

    const paramStr = params.toString();
    const page1 = paramStr ? `${base}?${paramStr}` : base;
    const page2 = paramStr ? `${base}?${paramStr}&pagenumber=2` : `${base}?pagenumber=2`;

    return [page1, page2];
  }

  // ── Immowelt ─────────────────────────────────────────────

  private static generateImmowelt(c: SearchCriteria): string[] {
    const city = this.slugify(c.location.city);
    const propType = c.propertyType === 'apartment' ? 'wohnungen' : 'haeuser';
    const purchaseType = c.purchaseType === 'buy' ? 'kaufen' : 'mieten';

    const base = `https://www.immowelt.de/liste/${city}/${propType}/${purchaseType}`;
    const params = new URLSearchParams();

    if (c.priceMax) params.set('pma', String(c.priceMax));
    if (c.priceMin) params.set('pmi', String(c.priceMin));
    if (c.areaMin) params.set('wflf', String(c.areaMin));
    if (c.areaMax) params.set('wflt', String(c.areaMax));
    if (c.roomsMin) params.set('rmf', String(c.roomsMin));
    if (c.roomsMax) params.set('rmt', String(c.roomsMax));

    const paramStr = params.toString();
    const page1 = paramStr ? `${base}?${paramStr}` : base;

    return [page1]; // Immowelt: nur Seite 1 (Pagination ist komplex)
  }

  // ── Kleinanzeigen (ehemals eBay Kleinanzeigen) ───────────

  private static generateKleinanzeigen(c: SearchCriteria): string[] {
    // Kategorie-IDs: Wohnung kaufen: 196, Wohnung mieten: 203, Haus kaufen: 208
    const catMap: Record<string, Record<string, number>> = {
      apartment: { buy: 196, rent: 203 },
      house: { buy: 208, rent: 205 },
    };

    const catId = catMap[c.propertyType]?.[c.purchaseType] || 196;
    const city = this.slugify(c.location.city);

    let url = `https://www.kleinanzeigen.de/s-${city}/c${catId}`;

    // Kleinanzeigen hat begrenzte URL-Parameter
    const params: string[] = [];
    if (c.priceMax) params.push(`maxPrice:${c.priceMax}`);
    if (c.priceMin) params.push(`minPrice:${c.priceMin}`);
    if (c.areaMin) params.push(`minSize:${c.areaMin}`);

    if (params.length > 0) {
      url += `+${params.join('+')}`;
    }

    return [url];
  }

  // ── Helpers ──────────────────────────────────────────────

  private static slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/ae/g, 'ae')
      .replace(/oe/g, 'oe')
      .replace(/ue/g, 'ue')
      .replace(/ss/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private static getImmoScoutState(stateCode: string): string {
    const stateMap: Record<string, string> = {
      'BW': 'baden-wuerttemberg', 'BY': 'bayern', 'BE': 'berlin',
      'BB': 'brandenburg', 'HB': 'bremen', 'HH': 'hamburg',
      'HE': 'hessen', 'MV': 'mecklenburg-vorpommern',
      'NI': 'niedersachsen', 'NW': 'nordrhein-westfalen',
      'RP': 'rheinland-pfalz', 'SL': 'saarland',
      'SN': 'sachsen', 'ST': 'sachsen-anhalt',
      'SH': 'schleswig-holstein', 'TH': 'thueringen',
    };
    return stateMap[stateCode] || stateCode.toLowerCase();
  }
}
```

### 5.4 `ListingParser.ts`

```typescript
// lib/agents/property-sentinel/services/ListingParser.ts

export interface RawListing {
  title: string;
  price?: number;
  price_text?: string;
  area_sqm?: number;
  rooms?: number;
  address?: string;
  portal_id: string;
  detail_url: string;
}

export interface ParsedListing {
  externalId: string;
  listingUrl: string;
  title: string;
  price: number | null;
  areaSqm: number | null;
  rooms: number | null;
  address: string | null;
}

/**
 * Normalizes raw scraped listing data across different portals.
 * Handles portal-specific ID extraction, price normalization, etc.
 */
export class ListingParser {

  /**
   * Parse and normalize a raw listing from any portal
   */
  static parse(raw: RawListing, portal: string): ParsedListing {
    return {
      externalId: this.extractExternalId(raw, portal),
      listingUrl: this.normalizeUrl(raw.detail_url, portal),
      title: raw.title?.trim() || 'Unbekanntes Inserat',
      price: this.normalizePrice(raw.price, raw.price_text),
      areaSqm: this.normalizeArea(raw.area_sqm),
      rooms: raw.rooms || null,
      address: raw.address?.trim() || null,
    };
  }

  // ── ID Extraction ────────────────────────────────────────

  /**
   * Extract stable portal-specific ID from listing data.
   * This is CRITICAL for deduplication.
   */
  static extractExternalId(raw: RawListing, portal: string): string {
    // 1. Try portal_id from scrape (most reliable)
    if (raw.portal_id) {
      return raw.portal_id.trim();
    }

    // 2. Fallback: extract from URL using portal-specific regex
    const url = raw.detail_url || '';

    switch (portal) {
      case 'immoscout24': {
        // URL: /expose/12345678 oder /Suche/expose/12345678
        const match = url.match(/\/expose\/(\d+)/);
        if (match) return match[1];
        break;
      }
      case 'immowelt': {
        // URL: /expose/2abc3de oder /immobilien/expose/2abc3de
        const match = url.match(/\/expose\/([a-z0-9]+)/i);
        if (match) return match[1];
        break;
      }
      case 'ebay_kleinanzeigen': {
        // URL: /s-anzeige/titel/2345678901-xxx-xxxx
        const match = url.match(/\/(\d{10,})/);
        if (match) return match[1];
        break;
      }
    }

    // 3. Last resort: hash the URL
    console.warn(`[LISTING_PARSER] Could not extract external ID for ${portal}, using URL hash`);
    return this.hashString(url);
  }

  // ── Price Normalization ──────────────────────────────────

  /**
   * Normalize price from various formats:
   * - Number: 289000 → 289000
   * - String: "289.000 €" → 289000
   * - String: "289.000 EUR VB" → 289000
   * - String: "Preis auf Anfrage" → null
   */
  static normalizePrice(price?: number, priceText?: string): number | null {
    // Direct number
    if (typeof price === 'number' && price > 0) {
      return Math.round(price);
    }

    // Parse from text
    if (priceText) {
      // Remove currency symbols, "VB", "VHB", spaces
      const cleaned = priceText
        .replace(/[€EUR\s]/gi, '')
        .replace(/VB|VHB|Verhandlungsbasis/gi, '')
        .replace(/\./g, '')       // Remove thousand separators (German: 289.000)
        .replace(/,(\d{2})$/, '.$1') // Convert decimal comma: 289000,00 → 289000.00
        .trim();

      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed) && parsed > 0) {
        return Math.round(parsed);
      }
    }

    return null;
  }

  // ── Area Normalization ───────────────────────────────────

  /**
   * Normalize area in m²:
   * - Number: 52.5 → 52.5
   * - Handles comma decimals internally
   */
  static normalizeArea(areaSqm?: number): number | null {
    if (typeof areaSqm === 'number' && areaSqm > 0) {
      return Math.round(areaSqm * 100) / 100; // 2 decimal places
    }
    return null;
  }

  // ── URL Normalization ────────────────────────────────────

  /**
   * Ensure URLs are absolute and clean
   */
  static normalizeUrl(url: string, portal: string): string {
    if (!url) return '';

    // Already absolute
    if (url.startsWith('http')) return url;

    // Make absolute based on portal
    const bases: Record<string, string> = {
      immoscout24: 'https://www.immobilienscout24.de',
      immowelt: 'https://www.immowelt.de',
      ebay_kleinanzeigen: 'https://www.kleinanzeigen.de',
    };

    const base = bases[portal] || '';
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  // ── Helpers ──────────────────────────────────────────────

  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `hash_${Math.abs(hash)}`;
  }
}
```

### 5.5 Redis Caching Layer

```typescript
// Caching wird in market_radar implementiert, nicht als separater Service.
// Pattern:

// Cache-Key: sentinel:cache:{sha256(url)}
// TTL: 1800 Sekunden (30 Minuten)
//
// Vor jedem Listen-Scrape:
//   const cacheKey = `sentinel:cache:${crypto.createHash('sha256').update(url).digest('hex')}`
//   const cached = await redis.get(cacheKey)
//   if (cached) return { listings: JSON.parse(cached), cached: true, credits_used: 0 }
//
// Nach erfolgreichem Scrape:
//   await redis.setex(cacheKey, 1800, JSON.stringify(listings))
//
// Vorteile:
// - Wenn 2 Profile die gleiche Stadt durchsuchen → Cache-Hit fuer Seite 1
// - Bei manuellem Re-Scan innerhalb von 30 Min → keine erneuten Credits
// - Redis TTL raeumt automatisch auf
```

### 5.6 Kostenmodell

```
Kosten pro Scan-Zyklus (1 Profil, 3 Portale):
═══════════════════════════════════════════════

Listen-Scrapes:
  ImmoScout24:        2 Seiten × 1 Credit = 2 Credits
  Immowelt:           1 Seite  × 1 Credit = 1 Credit
  eBay Kleinanzeigen: 1 Seite  × 1 Credit = 1 Credit
  ─────────────────────────────────────────
  Subtotal Listen:    4 Credits

Detail-Scrapes (nur neue Listings):
  Durchschnittlich ~5-15 neue Listings pro Scan
  × 1 Credit pro Expose
  ─────────────────────────────────────────
  Subtotal Details:   5-15 Credits

Gesamt pro Scan:      9-19 Credits
× 6 Scans/Tag:       54-114 Credits/Tag pro Profil
× 30 Tage:           1.620-3.420 Credits/Monat pro Profil

Firecrawl Pricing:
  Hobby:     3.000 Credits/Monat  ($19)  → ~1 Profil
  Standard:  50.000 Credits/Monat ($99)  → ~15-30 Profile
  Growth:    500.000 Credits/Monat ($399) → ~150-300 Profile
```

---

## 6. BullMQ Scheduling

### 6.1 Queue Definition

```typescript
// server/lib/sentinel-queue.ts

import { Queue, QueueEvents } from 'bullmq';
import { createBullMQConnection } from '@/lib/redis/connection';
import { validateQueueName } from '@/workers/queues';

const SENTINEL_QUEUE_NAME = 'sentinel-scan';
validateQueueName(SENTINEL_QUEUE_NAME);

const connection = createBullMQConnection();

export const sentinelQueue = new Queue(SENTINEL_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 60_000 },       // 1 Min Retry-Delay
    removeOnComplete: { age: 86400, count: 500 },     // 24h oder 500 Jobs
    removeOnFail: { age: 604800 },                    // 7 Tage
  },
});

export const sentinelQueueEvents = new QueueEvents(SENTINEL_QUEUE_NAME, { connection });

export const SENTINEL_JOB_TYPES = {
  SCAN_PROFILE: 'scan-profile',
  SCAN_ALL: 'scan-all-profiles',
} as const;

// ── Scheduling Functions ───────────────────────────────────

/**
 * Schedule a repeating scan for a profile.
 * Called when: profile created, profile resumed.
 */
export async function scheduleSentinelProfile(
  profileId: string,
  userId: string,
  cronExpression: string,
  timezone: string,
): Promise<void> {
  await sentinelQueue.add(
    SENTINEL_JOB_TYPES.SCAN_PROFILE,
    { profileId, userId },
    {
      repeat: {
        pattern: cronExpression,
        tz: timezone,
      },
      jobId: `sentinel-${profileId}`,
    },
  );
  console.log(`[SENTINEL_QUEUE] Scheduled profile ${profileId} with cron: ${cronExpression}`);
}

/**
 * Remove the repeating scan for a profile.
 * Called when: profile paused, profile deleted.
 */
export async function unscheduleSentinelProfile(profileId: string): Promise<void> {
  // Get all repeatable jobs and find the one for this profile
  const repeatableJobs = await sentinelQueue.getRepeatableJobs();
  const job = repeatableJobs.find(j => j.id === `sentinel-${profileId}`);

  if (job) {
    await sentinelQueue.removeRepeatableByKey(job.key);
    console.log(`[SENTINEL_QUEUE] Unscheduled profile ${profileId}`);
  } else {
    console.warn(`[SENTINEL_QUEUE] No repeatable job found for profile ${profileId}`);
  }
}

/**
 * Trigger an immediate scan for a profile (non-repeating).
 * Called when: user requests manual scan via chat/API.
 */
export async function triggerManualScan(
  profileId: string,
  userId: string,
): Promise<string> {
  const job = await sentinelQueue.add(
    SENTINEL_JOB_TYPES.SCAN_PROFILE,
    { profileId, userId, manual: true },
    {
      // Non-repeating, immediate execution
      jobId: `sentinel-manual-${profileId}-${Date.now()}`,
      priority: 1, // Higher priority than scheduled scans
    },
  );
  console.log(`[SENTINEL_QUEUE] Manual scan triggered for profile ${profileId}, job: ${job.id}`);
  return job.id!;
}

/**
 * Get queue statistics for monitoring.
 */
export async function getSentinelQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    sentinelQueue.getWaitingCount(),
    sentinelQueue.getActiveCount(),
    sentinelQueue.getCompletedCount(),
    sentinelQueue.getFailedCount(),
    sentinelQueue.getDelayedCount(),
  ]);
  const repeatableJobs = await sentinelQueue.getRepeatableJobs();

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    scheduledProfiles: repeatableJobs.length,
  };
}

// ── Graceful Shutdown ──────────────────────────────────────

process.on('SIGTERM', async () => {
  console.log('[SENTINEL_QUEUE] Shutting down...');
  await sentinelQueue.close();
});
```

### 6.2 Worker

```typescript
// workers/sentinel-scan-worker.ts

import { Worker, Job } from 'bullmq';
import { createBullMQConnection } from '@/lib/redis/connection';
import { SENTINEL_JOB_TYPES } from '@/server/lib/sentinel-queue';
import { marketRadar } from '@/lib/agents/property-sentinel/tools/market-radar';
import { dealQualifier } from '@/lib/agents/property-sentinel/tools/deal-qualifier';
import { pipelineSync } from '@/lib/agents/property-sentinel/tools/pipeline-sync';
import { getDb } from '@/lib/db/connection';
import { sentinelSearchProfiles, sentinelSeenListings } from '@/lib/db/schema-sentinel';
import { eq, and, gte } from 'drizzle-orm';

const connection = createBullMQConnection();

const worker = new Worker(
  'sentinel-scan',
  async (job: Job) => {
    const { profileId, userId, manual } = job.data;

    console.log(`[SENTINEL_WORKER] Processing job ${job.id}: ${job.name}`, { profileId, manual });

    switch (job.name) {
      case SENTINEL_JOB_TYPES.SCAN_PROFILE:
        return await scanSingleProfile(profileId, userId, job);

      case SENTINEL_JOB_TYPES.SCAN_ALL:
        return await scanAllDueProfiles(job);

      default:
        console.warn(`[SENTINEL_WORKER] Unknown job type: ${job.name}`);
    }
  },
  {
    connection,
    concurrency: 2,           // Max 2 Profiles gleichzeitig scannen
    limiter: {
      max: 10,                // Max 10 Jobs pro Zeitfenster
      duration: 60_000,       // Pro Minute
    },
  },
);

// ── Scan Single Profile ────────────────────────────────────

async function scanSingleProfile(profileId: string, userId: string, job: Job): Promise<void> {
  const db = getDb();

  try {
    // 1. Check if profile is still active
    const profile = await db
      .select()
      .from(sentinelSearchProfiles)
      .where(eq(sentinelSearchProfiles.id, profileId))
      .limit(1)
      .then(rows => rows[0]);

    if (!profile) {
      console.warn(`[SENTINEL_WORKER] Profile ${profileId} not found, skipping`);
      return;
    }

    if (!profile.isActive) {
      console.log(`[SENTINEL_WORKER] Profile ${profileId} is inactive, skipping`);
      return;
    }

    // 2. Run market_radar (scrape + dedup)
    job.updateProgress({ step: 'scraping', portal: 'all' });
    const scanResult = await marketRadar({ profile_id: profileId }, userId);

    console.log(`[SENTINEL_WORKER] Scan complete: ${scanResult.scan_summary.new_listings} new listings`);

    // 3. Score new listings (if any)
    if (scanResult.new_listings.length > 0) {
      job.updateProgress({ step: 'scoring', count: scanResult.new_listings.length });

      // Get listing IDs that need scoring
      const unscoredListings = await db
        .select({ id: sentinelSeenListings.id })
        .from(sentinelSeenListings)
        .where(and(
          eq(sentinelSeenListings.profileId, profileId),
          eq(sentinelSeenListings.detailScraped, true),
          eq(sentinelSeenListings.aiScored, false),
        ));

      if (unscoredListings.length > 0) {
        const listingIds = unscoredListings.map(l => l.id);
        await dealQualifier({ listing_ids: listingIds, profile_id: profileId }, userId);
        console.log(`[SENTINEL_WORKER] Scored ${listingIds.length} listings`);
      }
    }

    // 4. Push qualified to pipeline (if auto_pipeline enabled)
    if (profile.autoPipeline) {
      job.updateProgress({ step: 'pipeline_sync' });
      const syncResult = await pipelineSync({ profile_id: profileId }, userId);
      console.log(`[SENTINEL_WORKER] Pipeline sync: ${syncResult.pushed} pushed`);
    }

    job.updateProgress({ step: 'done' });

  } catch (error: any) {
    console.error(`[SENTINEL_WORKER] Scan failed for profile ${profileId}:`, error);
    // The error will be caught by BullMQ and trigger retry if attempts remain
    throw error;
  }
}

// ── Scan All Due Profiles ──────────────────────────────────

async function scanAllDueProfiles(job: Job): Promise<void> {
  const db = getDb();

  // Load all active profiles that haven't been scanned recently
  const profiles = await db
    .select()
    .from(sentinelSearchProfiles)
    .where(eq(sentinelSearchProfiles.isActive, true));

  console.log(`[SENTINEL_WORKER] Found ${profiles.length} active profiles`);

  for (const profile of profiles) {
    try {
      await scanSingleProfile(profile.id, profile.userId, job);
    } catch (error) {
      console.error(`[SENTINEL_WORKER] Failed to scan profile ${profile.id}:`, error);
      // Continue with next profile
    }
  }
}

// ── Event Handlers ─────────────────────────────────────────

worker.on('completed', (job) => {
  console.log(`[SENTINEL_WORKER] Job ${job.id} completed`);
});

worker.on('failed', (job, error) => {
  console.error(`[SENTINEL_WORKER] Job ${job?.id} failed:`, error.message);
});

worker.on('error', (error) => {
  console.error('[SENTINEL_WORKER] Worker error:', error);
});

// ── Graceful Shutdown ──────────────────────────────────────

process.on('SIGTERM', async () => {
  console.log('[SENTINEL_WORKER] Shutting down...');
  await worker.close();
});

export { worker as sentinelWorker };
```

### 6.3 Frequenz-Presets

```typescript
// Definiert in lib/agents/property-sentinel/config.ts

export const FREQUENCY_PRESETS: Record<string, { cron: string; label: string; scansPerDay: number }> = {
  hourly: {
    cron: '0 * * * *',
    label: 'Stuendlich (24x/Tag)',
    scansPerDay: 24,
  },
  '6x_daily': {
    cron: '0 4,8,11,14,17,21 * * *',
    label: '6x taeglich (Standard)',
    scansPerDay: 6,
  },
  '3x_daily': {
    cron: '0 7,13,19 * * *',
    label: '3x taeglich',
    scansPerDay: 3,
  },
  daily: {
    cron: '0 7 * * *',
    label: 'Taeglich (07:00)',
    scansPerDay: 1,
  },
};
```

### 6.4 Budget Guard

```typescript
// Implementiert als Utility-Funktion, aufgerufen vor jedem Scan

interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
}

async function shouldScan(profile: SearchProfile, userId: string): Promise<BudgetCheckResult> {
  // 1. Tages-Budget pruefen (Firecrawl Credits)
  const todayCredits = await getTodayFirecrawlCredits(userId);
  if (todayCredits >= SENTINEL_CONFIG.FIRECRAWL_DAILY_LIMIT) {
    return {
      allowed: false,
      reason: `Tages-Budget erschoepft (${todayCredits}/${SENTINEL_CONFIG.FIRECRAWL_DAILY_LIMIT} Credits)`,
    };
  }

  // 2. Profil-Pause pruefen
  if (profile.pausedUntil && new Date(profile.pausedUntil) > new Date()) {
    return {
      allowed: false,
      reason: `Profil pausiert bis ${profile.pausedUntil}`,
    };
  }

  // 3. Minimum-Intervall pruefen (Safety: nicht oefter als alle 30 Min)
  if (profile.lastScanAt) {
    const timeSinceLastScan = Date.now() - new Date(profile.lastScanAt).getTime();
    if (timeSinceLastScan < SENTINEL_CONFIG.MIN_SCAN_INTERVAL_MS) {
      return {
        allowed: false,
        reason: `Minimum-Intervall nicht erreicht (letzer Scan vor ${Math.round(timeSinceLastScan / 60000)} Min)`,
      };
    }
  }

  // 4. Profil aktiv?
  if (!profile.isActive) {
    return { allowed: false, reason: 'Profil ist inaktiv' };
  }

  return { allowed: true };
}
```

---

## 7. API Routes

### 7.1 Uebersicht

| Route | Methode | Auth | Beschreibung |
|-------|---------|------|-------------|
| `/api/sentinel/profiles` | GET | JWT | Alle Suchprofile des Users |
| `/api/sentinel/profiles` | POST | JWT | Neues Suchprofil erstellen |
| `/api/sentinel/profiles/[id]` | GET | JWT | Einzelnes Profil mit Stats |
| `/api/sentinel/profiles/[id]` | PATCH | JWT | Profil aktualisieren |
| `/api/sentinel/profiles/[id]` | DELETE | JWT | Profil loeschen (Soft-Delete) |
| `/api/sentinel/scan/[profileId]` | POST | JWT | Manuellen Scan triggern |
| `/api/sentinel/listings` | GET | JWT | Listings mit Filter/Pagination |
| `/api/sentinel/stats` | GET | JWT | Dashboard-Statistiken |

### 7.2 `app/api/sentinel/profiles/route.ts`

```typescript
// app/api/sentinel/profiles/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { sentinelSearchProfiles } from '@/lib/db/schema-sentinel';
import { withAuth, type RouteContext } from '@/lib/auth/jwt-middleware';
import { eq, desc } from 'drizzle-orm';
import { scheduleSentinelProfile } from '@/server/lib/sentinel-queue';
import { SENTINEL_CONFIG } from '@/lib/agents/property-sentinel/config';
import { FREQUENCY_PRESETS } from '@/lib/agents/property-sentinel/config';
import { z } from 'zod';

// ── Validation Schema ──────────────────────────────────────

const createProfileSchema = z.object({
  name: z.string().min(1).max(255),
  location: z.object({
    city: z.string().min(1),
    state: z.string().optional(),
    zip_codes: z.array(z.string().regex(/^\d{5}$/)).optional(),
    districts: z.array(z.string()).optional(),
    radius_km: z.number().min(1).max(50).optional(),
  }),
  property_type: z.enum(['apartment', 'house', 'commercial', 'land']).default('apartment'),
  purchase_type: z.enum(['buy', 'rent']).default('buy'),
  price_min: z.number().min(0).optional(),
  price_max: z.number().min(0).optional(),
  area_min: z.number().min(10).optional(),
  area_max: z.number().optional(),
  rooms_min: z.number().min(1).optional(),
  rooms_max: z.number().optional(),
  yield_min: z.number().min(0).max(20).optional(),
  custom_filters: z.record(z.any()).optional(),
  portals: z.array(z.enum(['immoscout24', 'immowelt', 'ebay_kleinanzeigen'])).optional(),
  frequency: z.enum(['hourly', '6x_daily', '3x_daily', 'daily']).default('6x_daily'),
  min_score: z.number().min(0).max(100).default(60),
});

// ── GET: List all profiles ─────────────────────────────────

export const GET = withAuth(async (req: NextRequest, context: RouteContext) => {
  const { userId } = context.auth;
  const db = getDb();

  const profiles = await db
    .select()
    .from(sentinelSearchProfiles)
    .where(eq(sentinelSearchProfiles.userId, userId))
    .orderBy(desc(sentinelSearchProfiles.createdAt));

  return NextResponse.json({ profiles });
});

// ── POST: Create new profile ───────────────────────────────

export const POST = withAuth(async (req: NextRequest, context: RouteContext) => {
  const { userId, workspaceId } = context.auth;
  const db = getDb();

  // 1. Parse & validate body
  const body = await req.json();
  const parsed = createProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const data = parsed.data;

  // 2. Check profile limit
  const existingCount = await db
    .select({ id: sentinelSearchProfiles.id })
    .from(sentinelSearchProfiles)
    .where(eq(sentinelSearchProfiles.userId, userId))
    .then(rows => rows.length);

  if (existingCount >= SENTINEL_CONFIG.MAX_PROFILES_PER_USER) {
    return NextResponse.json(
      { error: `Maximum ${SENTINEL_CONFIG.MAX_PROFILES_PER_USER} Suchprofile erreicht` },
      { status: 400 },
    );
  }

  // 3. Resolve cron expression
  const frequency = data.frequency || '6x_daily';
  const cronExpression = FREQUENCY_PRESETS[frequency]?.cron || FREQUENCY_PRESETS['6x_daily'].cron;

  // 4. Insert profile
  const [profile] = await db
    .insert(sentinelSearchProfiles)
    .values({
      userId,
      workspaceId: workspaceId || userId,
      name: data.name,
      location: data.location,
      propertyType: data.property_type,
      purchaseType: data.purchase_type,
      priceMin: data.price_min ?? null,
      priceMax: data.price_max ?? null,
      areaMin: data.area_min ?? null,
      areaMax: data.area_max ?? null,
      roomsMin: data.rooms_min?.toString() ?? null,
      roomsMax: data.rooms_max?.toString() ?? null,
      yieldMin: data.yield_min?.toString() ?? null,
      customFilters: data.custom_filters || {},
      portals: data.portals || ['immoscout24', 'immowelt', 'ebay_kleinanzeigen'],
      frequency,
      cronExpression,
      minScore: data.min_score,
    })
    .returning();

  // 5. Schedule BullMQ repeatable job
  await scheduleSentinelProfile(
    profile.id,
    userId,
    cronExpression,
    profile.timezone,
  );

  return NextResponse.json({ profile }, { status: 201 });
});
```

### 7.3 `app/api/sentinel/profiles/[id]/route.ts`

```typescript
// app/api/sentinel/profiles/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { sentinelSearchProfiles, sentinelSeenListings } from '@/lib/db/schema-sentinel';
import { withAuth, type RouteContext } from '@/lib/auth/jwt-middleware';
import { eq, and, count } from 'drizzle-orm';
import {
  scheduleSentinelProfile,
  unscheduleSentinelProfile,
} from '@/server/lib/sentinel-queue';
import { FREQUENCY_PRESETS } from '@/lib/agents/property-sentinel/config';

interface ProfileRouteContext extends RouteContext {
  params: { id: string };
}

// ── GET: Single profile with stats ─────────────────────────

export const GET = withAuth<ProfileRouteContext>(async (req, context) => {
  const { userId } = context.auth;
  const profileId = context.params.id;
  const db = getDb();

  const profile = await db
    .select()
    .from(sentinelSearchProfiles)
    .where(and(
      eq(sentinelSearchProfiles.id, profileId),
      eq(sentinelSearchProfiles.userId, userId),
    ))
    .limit(1)
    .then(rows => rows[0]);

  if (!profile) {
    return NextResponse.json({ error: 'Profil nicht gefunden' }, { status: 404 });
  }

  // Get listing counts
  const [listingStats] = await db
    .select({ total: count() })
    .from(sentinelSeenListings)
    .where(eq(sentinelSeenListings.profileId, profileId));

  return NextResponse.json({
    profile,
    stats: {
      total_listings: listingStats?.total || 0,
    },
  });
});

// ── PATCH: Update profile ──────────────────────────────────

export const PATCH = withAuth<ProfileRouteContext>(async (req, context) => {
  const { userId } = context.auth;
  const profileId = context.params.id;
  const db = getDb();
  const body = await req.json();

  // 1. Load & verify ownership
  const existing = await db
    .select()
    .from(sentinelSearchProfiles)
    .where(and(
      eq(sentinelSearchProfiles.id, profileId),
      eq(sentinelSearchProfiles.userId, userId),
    ))
    .limit(1)
    .then(rows => rows[0]);

  if (!existing) {
    return NextResponse.json({ error: 'Profil nicht gefunden' }, { status: 404 });
  }

  // 2. Build update object (only provided fields)
  const updates: Record<string, any> = { updatedAt: new Date() };

  if (body.name !== undefined) updates.name = body.name;
  if (body.location !== undefined) updates.location = body.location;
  if (body.property_type !== undefined) updates.propertyType = body.property_type;
  if (body.purchase_type !== undefined) updates.purchaseType = body.purchase_type;
  if (body.price_min !== undefined) updates.priceMin = body.price_min;
  if (body.price_max !== undefined) updates.priceMax = body.price_max;
  if (body.area_min !== undefined) updates.areaMin = body.area_min;
  if (body.area_max !== undefined) updates.areaMax = body.area_max;
  if (body.rooms_min !== undefined) updates.roomsMin = body.rooms_min?.toString();
  if (body.rooms_max !== undefined) updates.roomsMax = body.rooms_max?.toString();
  if (body.yield_min !== undefined) updates.yieldMin = body.yield_min?.toString();
  if (body.custom_filters !== undefined) updates.customFilters = body.custom_filters;
  if (body.portals !== undefined) updates.portals = body.portals;
  if (body.min_score !== undefined) updates.minScore = body.min_score;

  // 3. Handle frequency change → reschedule BullMQ
  let frequencyChanged = false;
  if (body.frequency !== undefined && body.frequency !== existing.frequency) {
    const preset = FREQUENCY_PRESETS[body.frequency];
    if (preset) {
      updates.frequency = body.frequency;
      updates.cronExpression = preset.cron;
      frequencyChanged = true;
    }
  }

  // 4. Update DB
  const [updated] = await db
    .update(sentinelSearchProfiles)
    .set(updates)
    .where(eq(sentinelSearchProfiles.id, profileId))
    .returning();

  // 5. Reschedule if frequency changed
  if (frequencyChanged && updated.isActive) {
    await unscheduleSentinelProfile(profileId);
    await scheduleSentinelProfile(
      profileId,
      userId,
      updated.cronExpression,
      updated.timezone,
    );
  }

  return NextResponse.json({ profile: updated });
});

// ── DELETE: Soft-delete profile ────────────────────────────

export const DELETE = withAuth<ProfileRouteContext>(async (req, context) => {
  const { userId } = context.auth;
  const profileId = context.params.id;
  const db = getDb();

  // 1. Verify ownership
  const existing = await db
    .select()
    .from(sentinelSearchProfiles)
    .where(and(
      eq(sentinelSearchProfiles.id, profileId),
      eq(sentinelSearchProfiles.userId, userId),
    ))
    .limit(1)
    .then(rows => rows[0]);

  if (!existing) {
    return NextResponse.json({ error: 'Profil nicht gefunden' }, { status: 404 });
  }

  // 2. Remove BullMQ job
  await unscheduleSentinelProfile(profileId);

  // 3. Soft-delete
  await db
    .update(sentinelSearchProfiles)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(sentinelSearchProfiles.id, profileId));

  return NextResponse.json({ deleted: true });
});
```

### 7.4 `app/api/sentinel/scan/[profileId]/route.ts`

```typescript
// app/api/sentinel/scan/[profileId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { sentinelSearchProfiles } from '@/lib/db/schema-sentinel';
import { withAuth, type RouteContext } from '@/lib/auth/jwt-middleware';
import { eq, and } from 'drizzle-orm';
import { triggerManualScan } from '@/server/lib/sentinel-queue';

interface ScanRouteContext extends RouteContext {
  params: { profileId: string };
}

// ── POST: Trigger manual scan ──────────────────────────────

export const POST = withAuth<ScanRouteContext>(async (req, context) => {
  const { userId } = context.auth;
  const { profileId } = context.params;
  const db = getDb();

  // 1. Verify profile exists and belongs to user
  const profile = await db
    .select()
    .from(sentinelSearchProfiles)
    .where(and(
      eq(sentinelSearchProfiles.id, profileId),
      eq(sentinelSearchProfiles.userId, userId),
    ))
    .limit(1)
    .then(rows => rows[0]);

  if (!profile) {
    return NextResponse.json({ error: 'Profil nicht gefunden' }, { status: 404 });
  }

  if (!profile.isActive) {
    return NextResponse.json({ error: 'Profil ist inaktiv' }, { status: 400 });
  }

  // 2. Trigger manual scan via BullMQ
  const jobId = await triggerManualScan(profileId, userId);

  return NextResponse.json({
    message: 'Scan gestartet',
    job_id: jobId,
    profile_name: profile.name,
  });
});
```

### 7.5 `app/api/sentinel/listings/route.ts`

```typescript
// app/api/sentinel/listings/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { sentinelSeenListings } from '@/lib/db/schema-sentinel';
import { withAuth, type RouteContext } from '@/lib/auth/jwt-middleware';
import { eq, and, gte, lte, desc, asc, count, sql } from 'drizzle-orm';

// ── GET: List listings with filters ────────────────────────

export const GET = withAuth(async (req: NextRequest, context: RouteContext) => {
  const { userId } = context.auth;
  const db = getDb();
  const url = new URL(req.url);

  // Parse query params
  const profileId = url.searchParams.get('profileId');
  const minScore = parseInt(url.searchParams.get('minScore') || '0');
  const maxScore = parseInt(url.searchParams.get('maxScore') || '100');
  const portal = url.searchParams.get('portal');
  const scored = url.searchParams.get('scored');       // 'true' | 'false'
  const pushed = url.searchParams.get('pushed');       // 'true' | 'false'
  const stale = url.searchParams.get('stale');         // 'true' | 'false'
  const sort = url.searchParams.get('sort') || 'date'; // 'score' | 'date' | 'price'
  const order = url.searchParams.get('order') || 'desc';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const offset = (page - 1) * limit;

  // Build conditions
  const conditions = [eq(sentinelSeenListings.userId, userId)];

  if (profileId) conditions.push(eq(sentinelSeenListings.profileId, profileId));
  if (minScore > 0) conditions.push(gte(sentinelSeenListings.aiScore, minScore));
  if (maxScore < 100) conditions.push(lte(sentinelSeenListings.aiScore, maxScore));
  if (portal) conditions.push(eq(sentinelSeenListings.portal, portal));
  if (scored === 'true') conditions.push(eq(sentinelSeenListings.aiScored, true));
  if (scored === 'false') conditions.push(eq(sentinelSeenListings.aiScored, false));
  if (pushed === 'true') conditions.push(eq(sentinelSeenListings.pushedToPipeline, true));
  if (pushed === 'false') conditions.push(eq(sentinelSeenListings.pushedToPipeline, false));
  if (stale === 'true') conditions.push(eq(sentinelSeenListings.isStale, true));
  if (stale === 'false') conditions.push(eq(sentinelSeenListings.isStale, false));

  // Build sort
  const sortColumn = sort === 'score' ? sentinelSeenListings.aiScore
    : sort === 'price' ? sentinelSeenListings.price
    : sentinelSeenListings.firstSeenAt;
  const sortOrder = order === 'asc' ? asc(sortColumn) : desc(sortColumn);

  // Query
  const [listings, [totalResult]] = await Promise.all([
    db
      .select()
      .from(sentinelSeenListings)
      .where(and(...conditions))
      .orderBy(sortOrder)
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(sentinelSeenListings)
      .where(and(...conditions)),
  ]);

  const total = totalResult?.total || 0;

  return NextResponse.json({
    listings,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  });
});
```

### 7.6 `app/api/sentinel/stats/route.ts`

```typescript
// app/api/sentinel/stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import {
  sentinelSearchProfiles,
  sentinelSeenListings,
  sentinelScanLogs,
} from '@/lib/db/schema-sentinel';
import { withAuth, type RouteContext } from '@/lib/auth/jwt-middleware';
import { eq, and, gte, count, sum, sql } from 'drizzle-orm';

// ── GET: Dashboard statistics ──────────────────────────────

export const GET = withAuth(async (req: NextRequest, context: RouteContext) => {
  const { userId } = context.auth;
  const db = getDb();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());

  const [
    profileCount,
    activeProfileCount,
    todayNewListings,
    weekQualifiedDeals,
    todayCredits,
  ] = await Promise.all([
    // Total profiles
    db.select({ count: count() })
      .from(sentinelSearchProfiles)
      .where(eq(sentinelSearchProfiles.userId, userId))
      .then(r => r[0]?.count || 0),

    // Active profiles
    db.select({ count: count() })
      .from(sentinelSearchProfiles)
      .where(and(
        eq(sentinelSearchProfiles.userId, userId),
        eq(sentinelSearchProfiles.isActive, true),
      ))
      .then(r => r[0]?.count || 0),

    // New listings today
    db.select({ count: count() })
      .from(sentinelSeenListings)
      .where(and(
        eq(sentinelSeenListings.userId, userId),
        gte(sentinelSeenListings.firstSeenAt, today),
      ))
      .then(r => r[0]?.count || 0),

    // Qualified deals this week (pushed to pipeline)
    db.select({ count: count() })
      .from(sentinelSeenListings)
      .where(and(
        eq(sentinelSeenListings.userId, userId),
        eq(sentinelSeenListings.pushedToPipeline, true),
        gte(sentinelSeenListings.pushedAt, thisWeekStart),
      ))
      .then(r => r[0]?.count || 0),

    // Credits used today
    db.select({ total: sum(sentinelScanLogs.creditsUsed) })
      .from(sentinelScanLogs)
      .where(and(
        eq(sentinelScanLogs.userId, userId),
        gte(sentinelScanLogs.startedAt, today),
      ))
      .then(r => parseInt(String(r[0]?.total || '0'))),
  ]);

  return NextResponse.json({
    stats: {
      total_profiles: profileCount,
      active_profiles: activeProfileCount,
      new_listings_today: todayNewListings,
      qualified_deals_week: weekQualifiedDeals,
      credits_used_today: todayCredits,
      credits_daily_limit: parseInt(process.env.FIRECRAWL_DAILY_LIMIT || '500'),
    },
  });
});
```

---

## 8. Chat Route Integration

### 8.1 Aenderungen an `app/api/agents/[id]/chat/route.ts`

Die Integration folgt exakt dem etablierten Pattern der 16 bestehenden Agents. **6 Aenderungen** an der bestehenden Datei:

### 8.2 Aenderung 1: Import (ca. Zeile 33)

```typescript
// BESTEHEND (Zeile 32):
import { getTenantCommunicatorToolsForOpenAI, executeTenantCommunicatorTool, getTenantCommunicatorToolDisplay } from '@/lib/agents/tenant-communicator/tools';

// NEU (nach Zeile 32 einfuegen):
import { getSentinelToolsForOpenAI, executeSentinelTool, getSentinelToolDisplay } from '@/lib/agents/property-sentinel/tools';
```

### 8.3 Aenderung 2: Boolean Flag (ca. Zeile 399-400)

```typescript
// BESTEHEND (Zeile 399):
const isTenantCommunicatorAgent = agentId === 'tenant-communicator';

// NEU (nach Zeile 399 einfuegen):
const isPropertySentinelAgent = agentId === 'property-sentinel';
```

### 8.4 Aenderung 3: `isAgenticAgent` Compound (ca. Zeile 400-404)

```typescript
// BESTEHEND (Zeile 400-404):
const isAgenticAgent = isEmmieAgent || isDexterAgent || isBuddyAgent
  || isKaiAgent || isLexAgent || isNovaAgent || isOmniAgent
  || isCassieAgent || isVeraAgent || isAriAgent || isAuraAgent
  || isVinceAgent || isMiloAgent || isEchoAgent || isFinnAgent
  || isTenantCommunicatorAgent;

// GEAENDERT (isPropertySentinelAgent hinzufuegen):
const isAgenticAgent = isEmmieAgent || isDexterAgent || isBuddyAgent
  || isKaiAgent || isLexAgent || isNovaAgent || isOmniAgent
  || isCassieAgent || isVeraAgent || isAriAgent || isAuraAgent
  || isVinceAgent || isMiloAgent || isEchoAgent || isFinnAgent
  || isTenantCommunicatorAgent || isPropertySentinelAgent;
```

### 8.5 Aenderung 4: Tool Selection Ternary (ca. Zeile 455)

```typescript
// BESTEHEND (ca. Zeile 455):
: isTenantCommunicatorAgent
  ? getTenantCommunicatorToolsForOpenAI()

// NEU (vor der Zeile oben oder danach einfuegen — Reihenfolge der Ternary-Kette):
: isPropertySentinelAgent
  ? getSentinelToolsForOpenAI()
```

### 8.6 Aenderung 5: Executor Dispatch (ca. Zeile 599)

```typescript
// BESTEHEND (ca. Zeile 599):
} else if (isTenantCommunicatorAgent) {
  return executeTenantCommunicatorTool(toolName, args, { userId, sessionId, agentId });

// NEU (danach einfuegen):
} else if (isPropertySentinelAgent) {
  return executeSentinelTool(toolName, args, { userId, sessionId, agentId });
}
```

### 8.7 Aenderung 6: Display Name (ca. Zeile 630)

```typescript
// BESTEHEND (ca. Zeile 630):
if (isTenantCommunicatorAgent) return getTenantCommunicatorToolDisplay(toolName);

// NEU (danach einfuegen):
if (isPropertySentinelAgent) return getSentinelToolDisplay(toolName);
```

### 8.8 Aenderung 7: `maxToolCalls` (ca. Zeile 643)

```typescript
// BESTEHEND (Zeile 643):
maxToolCalls: isEmmieAgent ? 10 : isOmniAgent ? 15 : 5,

// GEAENDERT (property-sentinel bekommt 10 wegen komplexer Multi-Step-Workflows):
maxToolCalls: isEmmieAgent ? 10 : isOmniAgent ? 15 : isPropertySentinelAgent ? 10 : 5,
```

### 8.9 Zusammenfassung der Integration

```
Datei: app/api/agents/[id]/chat/route.ts
Aenderungen: 7 Stellen (alle minimal, folgen bestehendem Pattern)

1. Import:          +1 Zeile (Import der 3 Sentinel-Functions)
2. Boolean:         +1 Zeile (isPropertySentinelAgent Flag)
3. isAgenticAgent:  +1 Token in bestehender OR-Kette
4. Tool Selection:  +2 Zeilen in Ternary-Kette
5. Executor:        +3 Zeilen (else-if Block)
6. Display Name:    +1 Zeile (if-Block)
7. maxToolCalls:    +1 Ternary-Glied

Gesamt: ~10 Zeilen Aenderungen an einer ~1000-Zeilen-Datei
```

---

## 9. Dashboard UI Components

### 9.1 Uebersicht

6 React-Komponenten bilden das Sentinel-Dashboard. Sie folgen dem bestehenden Glassmorphism-Design des Flowent UI Systems.

```
components/sentinel/
├── SentinelDashboard.tsx       # Haupt-Dashboard (Container)
├── ProfileCreator.tsx          # Multi-Step Wizard (3 Steps)
├── ListingGrid.tsx             # Grid/List Toggle View
├── DealCard.tsx                # Einzelne Property-Karte
├── ScanTimeline.tsx            # Scan-Historie Timeline
└── store/
    └── useSentinelStore.ts     # Zustand Store Slice
```

### 9.2 `SentinelDashboard.tsx`

```typescript
// components/sentinel/SentinelDashboard.tsx

'use client';

import { useState, useEffect } from 'react';
import { useSentinelStore } from './store/useSentinelStore';
import { ProfileCreator } from './ProfileCreator';
import { ListingGrid } from './ListingGrid';
import { ScanTimeline } from './ScanTimeline';

// ── Props ──────────────────────────────────────────────────

interface SentinelDashboardProps {
  userId: string;
}

// ── Component ──────────────────────────────────────────────

export function SentinelDashboard({ userId }: SentinelDashboardProps) {
  // State
  const {
    profiles, listings, stats, isLoading,
    fetchProfiles, fetchStats, fetchListings,
  } = useSentinelStore();
  const [showCreator, setShowCreator] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'deals' | 'timeline'>('deals');

  // Fetch on mount
  useEffect(() => {
    fetchProfiles();
    fetchStats();
  }, [fetchProfiles, fetchStats]);

  // Fetch listings when profile selected
  useEffect(() => {
    if (selectedProfileId) {
      fetchListings({ profileId: selectedProfileId, minScore: 0 });
    }
  }, [selectedProfileId, fetchListings]);

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="sentinel-dashboard">
      {/* Header */}
      <div className="sentinel-header">
        <div className="sentinel-title">
          <h1>Property Sentinel</h1>
          <span className="beta-badge">BETA</span>
        </div>
        <button onClick={() => setShowCreator(true)} className="btn-primary">
          + Neues Profil
        </button>
      </div>

      {/* Stats Row */}
      <div className="sentinel-stats-row">
        <StatCard label="Aktive Profile" value={stats.active_profiles} />
        <StatCard label="Neue Listings heute" value={stats.new_listings_today} />
        <StatCard label="Qualif. Deals" value={stats.qualified_deals_week} />
        <StatCard
          label="Credits heute"
          value={`${stats.credits_used_today}/${stats.credits_daily_limit}`}
        />
      </div>

      {/* Profile Cards */}
      <div className="sentinel-profiles">
        <h2>Suchprofile</h2>
        <div className="profile-grid">
          {profiles.map(profile => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isSelected={selectedProfileId === profile.id}
              onClick={() => setSelectedProfileId(profile.id)}
            />
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sentinel-tabs">
        <button
          className={`tab ${activeTab === 'deals' ? 'active' : ''}`}
          onClick={() => setActiveTab('deals')}
        >
          Deals ({listings.length})
        </button>
        <button
          className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          Scan-Timeline
        </button>
      </div>

      {/* Content */}
      {activeTab === 'deals' ? (
        <ListingGrid
          listings={listings}
          profileId={selectedProfileId}
          onPushToPipeline={(listingIds) => {/* pipeline_sync API call */}}
        />
      ) : (
        <ScanTimeline profileId={selectedProfileId} />
      )}

      {/* Profile Creator Modal */}
      {showCreator && (
        <ProfileCreator
          onClose={() => setShowCreator(false)}
          onCreated={(profile) => {
            setShowCreator(false);
            fetchProfiles();
            setSelectedProfileId(profile.id);
          }}
        />
      )}
    </div>
  );
}

// ── Sub-Components ─────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card glass">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

// ProfileCard: Zeigt ein Suchprofil als Karte
//   - Name, Portale, Frequenz
//   - Letzter Scan Zeitpunkt + Status (gruen/rot/grau)
//   - Statistiken: gefunden / qualifiziert
//   - Pause/Resume Toggle
//   - Click → selektiert Profil fuer Listing-Ansicht
```

### 9.3 `ProfileCreator.tsx` — Multi-Step Wizard

```typescript
// components/sentinel/ProfileCreator.tsx
//
// 3-Step Wizard (folgt dem Pattern von PipelineWizard):
//
// Step 1: STANDORT
//   - Stadt (Autocomplete-Input)
//   - Bundesland (Dropdown)
//   - Stadtteile (Multi-Select Tags)
//   - PLZ-Filter (Chip-Input)
//   - Radius-Slider (1-50 km)
//
// Step 2: KRITERIEN
//   - Immobilientyp (Tabs: Wohnung | Haus | Gewerbe | Grundstueck)
//   - Kauftyp (Toggle: Kauf | Miete)
//   - Preis-Range (Dual-Slider + Inputs)
//   - Flaeche-Range (Dual-Slider + Inputs)
//   - Zimmer-Range (Stepper + - Buttons)
//   - Mindest-Rendite (Slider + Input, nur bei Kauf)
//   - KI-Filter (Checkbox-Gruppe):
//     ☐ Nur renovierungsbeduerftig
//     ☐ Kein Denkmalschutz
//     ☐ Kein Erbpacht
//     ☐ Provisionsfrei
//     ☐ Balkon Pflicht
//     ☐ Stellplatz Pflicht
//
// Step 3: KONFIGURATION
//   - Profilname (Auto-generiert, editierbar)
//   - Portale (Checkbox: ImmoScout24, Immowelt, eBay Kleinanzeigen)
//   - Frequenz (Radio: Stuendlich | 6x taeglich | 3x taeglich | Taeglich)
//   - Min-Score Slider (0-100, Default: 60)
//   - Auto-Pipeline Toggle (Ja/Nein)
//   - Zusammenfassung aller Kriterien
//   - "Profil erstellen" Button

interface ProfileCreatorProps {
  onClose: () => void;
  onCreated: (profile: SearchProfile) => void;
}

// State Management:
//   const [step, setStep] = useState(1)  // 1, 2, oder 3
//   const [data, setData] = useState<Partial<CreateProfileData>>({})
//
// Validation pro Step:
//   Step 1: city ist Pflicht
//   Step 2: mindestens property_type gesetzt
//   Step 3: name ist Pflicht, mindestens 1 Portal
//
// Submit:
//   POST /api/sentinel/profiles mit allen gesammelten Daten
//   onCreated(response.profile)
```

### 9.4 `ListingGrid.tsx`

```typescript
// components/sentinel/ListingGrid.tsx
//
// Grid/List Toggle View fuer Listings
//
// Props:
//   listings: SeenListing[]
//   profileId: string | null
//   onPushToPipeline: (listingIds: string[]) => void
//
// Features:
//   - Toggle: Grid View (Cards) ↔ List View (Tabelle)
//   - Filter-Bar:
//     - Portal Dropdown (Alle | ImmoScout24 | Immowelt | eBay)
//     - Score Range Slider (0-100)
//     - Preis Range Inputs
//     - Status Filter (Alle | Neu | Bewertet | In Pipeline)
//   - Sort: Nach Score | Datum | Preis (aufsteigend/absteigend)
//   - Batch-Aktionen:
//     - "Alle auswaehlen" Checkbox
//     - "In Pipeline uebernehmen" Button (fuer selektierte)
//   - Pagination (20 pro Seite)
//
// Grid View:
//   Zeigt DealCard Komponenten in einem 2-4 Spalten Grid
//   (responsive: 1 Spalte mobil, 2 Tablet, 3-4 Desktop)
//
// List View:
//   Kompakte Tabelle mit Spalten:
//   | Portal | Titel | Preis | Flaeche | Zimmer | Score | Rendite | Status | Aktionen |
//   Sortierbar per Klick auf Spaltenkopf
```

### 9.5 `DealCard.tsx`

```typescript
// components/sentinel/DealCard.tsx
//
// Einzelne Property-Karte mit Score-Visualisierung
//
// Props:
//   listing: SeenListing
//   onPushToPipeline: () => void
//   onDismiss: () => void
//   onViewOnPortal: () => void
//
// Layout:
// ┌──────────────────────────────────┐
// │ [Bild oder Placeholder]          │
// │                                  │
// │ 2-Zi ETW Rosenthaler Str.       │  ← Titel (truncated)
// │ Berlin Mitte                     │  ← Adresse
// │                                  │
// │ 289.000 EUR    52 m²    2 Zi    │  ← Preis, Flaeche, Zimmer
// │                                  │
// │ Score: 82/100                    │  ← Score Badge (farbig)
// │ ████████████████████░░░░░       │  ← Progress Bar
// │                                  │
// │ Lage:   ████████████████░░░     │  22/25
// │ Preis:  ██████████████░░░░░     │  18/25
// │ Rend.:  ████████████████████    │  20/25
// │ Risiko: ████████████░░░░░░░░    │  15/25
// │                                  │
// │ Rendite: 5,8% brutto             │
// │ KPF: 17,2                        │  ← Kaufpreisfaktor
// │                                  │
// │ ⚠ sanierungsstau_leicht         │  ← Risk Flags (rot/gelb Badges)
// │                                  │
// │ [Auf Portal] [Pipeline] [✕]     │  ← Action Buttons
// └──────────────────────────────────┘
//
// Score Badge Farben:
//   >= 80: Gruen (#10B981)
//   >= 60: Gelb (#F59E0B)
//   < 60:  Rot (#EF4444)
//
// Risk Flag Badges:
//   Rot (kritisch): erbpacht, altlasten, wohnrecht, asbest, ueberschwemmung
//   Gelb (warnung): sanierungsstau, denkmalschutz, feuchtigkeit, laerm, vorkaufsrecht
```

### 9.6 `ScanTimeline.tsx`

```typescript
// components/sentinel/ScanTimeline.tsx
//
// Zeigt die Scan-Historie als vertikale Timeline
//
// Props:
//   profileId: string | null (null = alle Profile)
//
// Datenquelle: GET /api/sentinel/scan-logs?profileId=xxx
//
// Layout:
//
// 14:02  ● Berlin Mitte 2-Zi
//        ├── ImmoScout24: ✓ 24 gefunden, 5 neu (2.3s)
//        ├── Immowelt:    ✓ 18 gefunden, 3 neu (1.8s)
//        └── eBay:        ✓ 12 gefunden, 0 neu (1.1s)
//        8 neue Listings | 12 Credits | 5.2s gesamt
//
// 11:00  ● Berlin Mitte 2-Zi
//        ├── ImmoScout24: ✓ 22 gefunden, 1 neu
//        ├── Immowelt:    ✓ 17 gefunden, 0 neu
//        └── eBay:        ✗ Fehler: Timeout
//        1 neues Listing | 8 Credits | Status: partial
//
// 08:00  ● Hamburg Eimsbuettel
//        ├── ImmoScout24: ✓ 15 gefunden, 2 neu
//        └── eBay:        ✓ 8 gefunden, 1 neu
//        3 neue Listings | 6 Credits
//
// Portal-Status Icons:
//   ✓ = success (gruen)
//   ✗ = error (rot)
//   ○ = skipped (grau)
//   ◐ = cached (blau)
```

### 9.7 `useSentinelStore.ts` — Zustand Store

```typescript
// components/sentinel/store/useSentinelStore.ts

import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';

// ── Types ──────────────────────────────────────────────────

interface SentinelStats {
  total_profiles: number;
  active_profiles: number;
  new_listings_today: number;
  qualified_deals_week: number;
  credits_used_today: number;
  credits_daily_limit: number;
}

interface ListingFilter {
  profileId?: string;
  minScore?: number;
  maxScore?: number;
  portal?: string;
  scored?: boolean;
  pushed?: boolean;
  sort?: 'score' | 'date' | 'price';
  order?: 'asc' | 'desc';
  page?: number;
}

// ── Store ──────────────────────────────────────────────────

interface SentinelState {
  // Data
  profiles: SearchProfile[];
  listings: SeenListing[];
  scanLogs: ScanLog[];
  stats: SentinelStats;

  // UI State
  isLoading: boolean;
  error: string | null;
  selectedProfileId: string | null;
  listingFilter: ListingFilter;
  pagination: { page: number; total: number; total_pages: number };

  // Actions
  fetchProfiles: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchListings: (filter?: ListingFilter) => Promise<void>;
  fetchScanLogs: (profileId?: string) => Promise<void>;
  createProfile: (data: CreateProfileData) => Promise<SearchProfile>;
  triggerScan: (profileId: string) => Promise<void>;
  setSelectedProfile: (id: string | null) => void;
  setListingFilter: (filter: Partial<ListingFilter>) => void;
}

export const useSentinelStore = create<SentinelState>((set, get) => ({
  // Initial state
  profiles: [],
  listings: [],
  scanLogs: [],
  stats: {
    total_profiles: 0,
    active_profiles: 0,
    new_listings_today: 0,
    qualified_deals_week: 0,
    credits_used_today: 0,
    credits_daily_limit: 500,
  },
  isLoading: false,
  error: null,
  selectedProfileId: null,
  listingFilter: {},
  pagination: { page: 1, total: 0, total_pages: 0 },

  // ── Actions ────────────────────────────────────────────

  fetchProfiles: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.get('/api/sentinel/profiles');
      set({ profiles: res.data.profiles, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchStats: async () => {
    try {
      const res = await apiClient.get('/api/sentinel/stats');
      set({ stats: res.data.stats });
    } catch (err: any) {
      console.error('[SENTINEL_STORE] Failed to fetch stats:', err);
    }
  },

  fetchListings: async (filter) => {
    const currentFilter = filter || get().listingFilter;
    set({ isLoading: true, error: null, listingFilter: currentFilter });

    try {
      const params = new URLSearchParams();
      if (currentFilter.profileId) params.set('profileId', currentFilter.profileId);
      if (currentFilter.minScore) params.set('minScore', String(currentFilter.minScore));
      if (currentFilter.maxScore) params.set('maxScore', String(currentFilter.maxScore));
      if (currentFilter.portal) params.set('portal', currentFilter.portal);
      if (currentFilter.sort) params.set('sort', currentFilter.sort);
      if (currentFilter.order) params.set('order', currentFilter.order);
      if (currentFilter.page) params.set('page', String(currentFilter.page));

      const res = await apiClient.get(`/api/sentinel/listings?${params.toString()}`);
      set({
        listings: res.data.listings,
        pagination: res.data.pagination,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchScanLogs: async (profileId) => {
    try {
      const params = profileId ? `?profileId=${profileId}` : '';
      const res = await apiClient.get(`/api/sentinel/scan-logs${params}`);
      set({ scanLogs: res.data.logs });
    } catch (err: any) {
      console.error('[SENTINEL_STORE] Failed to fetch scan logs:', err);
    }
  },

  createProfile: async (data) => {
    const res = await apiClient.post('/api/sentinel/profiles', data);
    const profile = res.data.profile;
    set((state) => ({ profiles: [profile, ...state.profiles] }));
    return profile;
  },

  triggerScan: async (profileId) => {
    await apiClient.post(`/api/sentinel/scan/${profileId}`);
    // Refresh stats after triggering scan
    get().fetchStats();
  },

  setSelectedProfile: (id) => set({ selectedProfileId: id }),

  setListingFilter: (filter) => {
    const current = get().listingFilter;
    const merged = { ...current, ...filter };
    get().fetchListings(merged);
  },
}));
```

### 9.8 CSS/Styling Hinweise

```css
/* Folgt dem bestehenden Glassmorphism-Design aus globals.css */
/* Alle Komponenten nutzen die Design-Tokens aus lib/design/tokens.ts */

.sentinel-dashboard {
  /* Container mit max-width, padding */
  padding: var(--space-6);
}

.sentinel-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  /* Responsive: 2 Spalten auf Tablet, 1 auf Mobil */
}

.stat-card.glass {
  /* Glassmorphism: backdrop-blur, semi-transparent background */
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-4);
}

/* Score Badge Farben */
.score-badge--high { color: #10B981; }  /* >= 80 */
.score-badge--mid  { color: #F59E0B; }  /* >= 60 */
.score-badge--low  { color: #EF4444; }  /* < 60 */

/* Risk Flag Badges */
.risk-flag--critical { background: rgba(239, 68, 68, 0.2); color: #EF4444; }
.risk-flag--warning  { background: rgba(245, 158, 11, 0.2); color: #F59E0B; }
```

---

## 10. KI-Bewertung Deep Dive

### 10.1 Scoring-System Architektur

Das Scoring-System besteht aus 3 Schichten:

```
Schicht 1: REGELBASIERTE VOR-FILTERUNG (lokal, ohne API-Call)
  → Preis ausserhalb Budget? → Score = 0, Skip
  → Flaeche ausserhalb Range? → Score = 0, Skip
  → Zimmer ausserhalb Range? → Score = 0, Skip
  → Ergebnis: Nur relevante Listings werden an OpenAI gesendet

Schicht 2: KI-SCORING (OpenAI gpt-4o-mini)
  → 4 Kategorien x 25 Punkte = 0-100 Gesamt
  → Rendite-Schaetzung
  → Risk Flags
  → Nebenkosten-Schaetzung

Schicht 3: NACHBEARBEITUNG (lokal)
  → Nebenkosten-Berechnung (Grunderwerbsteuer nach Bundesland)
  → 10-Jahres-Cashflow Projektion
  → Sortierung und Ranking
```

### 10.2 Score-Kategorien im Detail

#### Kategorie 1: Lage-Match (0-25)

```
Bewertungskriterien:
─────────────────────────────────────────────────
25 Punkte: Exakte Uebereinstimmung mit Wunschlage
  - Wunsch-Stadtteil
  - Top-Mikrolage (U-Bahn < 500m, Einkauf < 300m)
  - Ruhige Strasse, gute Nachbarschaft
  - Steigende Wertentwicklung im Gebiet

20 Punkte: Gute Lage im Suchgebiet
  - Nahe am Wunsch-Stadtteil
  - Solide Infrastruktur (OEPNV < 800m)
  - Durchschnittliche Wohngegend

15 Punkte: Akzeptable Lage
  - Im erweiterten Suchgebiet
  - Basis-Infrastruktur vorhanden
  - Einige Abstriche (Laerm, weiter Weg zum OEPNV)

10 Punkte: Randlage
  - Am Rand des Suchgebiets
  - Maessige Infrastruktur
  - B-/C-Lage

5 Punkte: Deutlich ausserhalb
  - Weit vom Wunschgebiet entfernt
  - Schlechte Anbindung

0 Punkte: Irrelevant
  - Komplett andere Stadt/Region
```

#### Kategorie 2: Preis-Leistung (0-25)

```
Bewertungskriterien:
─────────────────────────────────────────────────
Referenz: Durchschnittlicher m²-Preis der Stadt/Region

25 Punkte: > 20% unter Marktwert
  - Schnaeppchen, z.B. Zwangsversteigerung oder Notverkauf
  - Preis/m² deutlich unter Vergleichswerten

20 Punkte: 10-20% unter Marktwert
  - Guter Deal, leicht unter Markt
  - Verhandlungsspielraum wahrscheinlich

15 Punkte: Marktgerecht (±10%)
  - Fairer Preis fuer Lage und Zustand
  - Standard-Angebot

10 Punkte: 10-20% ueber Marktwert
  - Leicht ueberteuert
  - Verhandlung noetig

5 Punkte: > 20% ueber Marktwert
  - Deutlich ueberteuert

0 Punkte: Voellig unrealistischer Preis
```

#### Kategorie 3: Rendite-Potenzial (0-25)

```
Bewertungskriterien:
─────────────────────────────────────────────────
Brutto-Mietrendite = (Jahresmiete / Kaufpreis) × 100
Kaufpreisfaktor = Kaufpreis / Jahresmiete

25 Punkte: Rendite > 7%, KPF < 15
  - Exzellente Kapitalanlage
  - Cash-Flow positiv ab Tag 1

20 Punkte: Rendite 5-7%, KPF 15-20
  - Gute Kapitalanlage
  - Solider Cash-Flow

15 Punkte: Rendite 4-5%, KPF 20-25
  - Akzeptable Rendite
  - Knapper Cash-Flow

10 Punkte: Rendite 3-4%, KPF 25-30
  - Geringe Rendite
  - Negativer Cash-Flow wahrscheinlich

5 Punkte: Rendite < 3%, KPF > 30
  - Rendite unter Inflationsausgleich

0 Punkte: Keine Rendite messbar
  - Selbstnutzer-Objekt oder Verlustgeschaeft
```

#### Kategorie 4: Risiko-Bewertung (0-25, invertiert)

```
Bewertungskriterien (weniger Risiko = mehr Punkte):
─────────────────────────────────────────────────
25 Punkte: Kein erkennbares Risiko
  - Neubau oder Kernsanierung (< 5 Jahre)
  - Gute WEG-Verwaltung (bei ETW)
  - Keine Altlasten, kein Denkmalschutz
  - Solide Bausubstanz

20 Punkte: Minimales Risiko
  - Guter Zustand, kleinere Schoenheitsreparaturen
  - Normale Instandhaltungsruecklage

15 Punkte: Normales Risiko
  - Ueblicher Renovierungsbedarf (Bad/Kueche)
  - Baujahr 1960-1990, nicht saniert

10 Punkte: Erhoehtes Risiko
  - Denkmalschutz (eingeschraenkte Sanierungsfreiheit)
  - Aelteres Baujahr ohne Sanierung (> 40 Jahre)
  - Hohe Instandhaltungsruecklage noetig

5 Punkte: Hohes Risiko
  - Erbpacht/Erbbaurecht
  - Deutlicher Sanierungsstau
  - Altlasten im Grundbuch

0 Punkte: Sehr hohes Risiko
  - Multiple Red Flags gleichzeitig
  - Wohnrecht/Niessbrauch
  - Asbest-Belastung + Sanierungsstau
```

### 10.3 Red Flags — Vollstaendige Liste

| Red Flag | Score-Abzug | Keyword-Pattern | Risiko-Stufe |
|----------|------------|-----------------|-------------|
| Erbpacht/Erbbaurecht | -10 | erbpacht, erbbau, erbbauzins | Kritisch |
| Wohnrecht/Niessbrauch | -15 | wohnrecht, niessbrauch, wohnungsrecht | Kritisch |
| Altlasten | -10 | altlast, kontaminiert, bodenbelas | Kritisch |
| Asbest | -10 | asbest, schadstoff | Kritisch |
| Ueberschwemmungsgebiet | -10 | ueberschwemmung, hochwasser, flutgebiet | Kritisch |
| Sanierungsstau (schwer) | -10 | sanierungsstau, komplettsanierung, kernsanierung noetig | Hoch |
| Sanierungsstau (leicht) | -5 | renovierungsbeduerftig, modernisierungsbedarf | Mittel |
| Denkmalschutz | -5 | denkmal, denkmalschutz, baudenkmal | Mittel |
| Schimmel/Feuchtigkeit | -5 | schimmel, feucht, nass, wasserschaden | Mittel |
| Laerm (Flug/Strasse/Bahn) | -5 | fluglaerm, strassenlaerm, bahnlaerm, laermbelastung | Mittel |
| Vorkaufsrecht Gemeinde | -3 | vorkaufsrecht, gemeinde, milieuschutz | Niedrig |
| Abstandsflaechen | -3 | abstandsflaeche, bebauungsplan, einschraenkung | Niedrig |
| Hohe Instandhaltung | -3 | sonderumlage, instandhaltungsruecklage | Niedrig |
| WEG-Streitigkeiten | -5 | klage, streit, rechtsstreit, eigentuemergemeinschaft | Mittel |
| Vermietungsbeschraenkung | -5 | zweckentfremdung, eigennutzungspflicht | Mittel |

### 10.4 Finanzielle Analyse

#### Bruttomietertrag-Berechnung

```typescript
function calculateBruttoRendite(kaufpreis: number, jahresmiete: number): number {
  if (kaufpreis <= 0 || jahresmiete <= 0) return 0;
  return (jahresmiete / kaufpreis) * 100;
}

// Beispiel:
// Kaufpreis: 289.000 EUR
// Monatsmiete: 1.400 EUR (kalt)
// Jahresmiete: 16.800 EUR
// Brutto-Rendite: (16.800 / 289.000) * 100 = 5,81%
```

#### Kaufpreisfaktor

```typescript
function calculateKaufpreisfaktor(kaufpreis: number, jahresmiete: number): number {
  if (jahresmiete <= 0) return Infinity;
  return kaufpreis / jahresmiete;
}

// Beispiel: 289.000 / 16.800 = 17,2
// Interpretation: In 17,2 Jahren ist der Kaufpreis durch Miete amortisiert
// Ziel: < 20 (gut), < 25 (akzeptabel), > 30 (schlecht)
```

#### Nebenkosten-Schaetzung nach Bundesland

```typescript
function calculateNebenkosten(kaufpreis: number, bundesland?: string): NebenkostenEstimate {
  const grunderwerbsteuer: Record<string, number> = {
    'BY': 3.5, 'SN': 3.5,
    'BW': 5.0, 'HB': 5.0, 'NI': 5.0, 'RP': 5.0, 'ST': 5.0,
    'HE': 5.5, 'MV': 5.5,
    'BE': 6.0, 'HH': 6.0,
    'BB': 6.5, 'NW': 6.5, 'SL': 6.5, 'SH': 6.5, 'TH': 6.5,
  };

  const gePct = grunderwerbsteuer[bundesland || 'BE'] || 6.0;
  const notarPct = 1.5;
  const maklerPct = 3.57;  // Haeufigster Wert (kann 0 sein bei provisionsfrei)
  const grundbuchPct = 0.5;

  const totalPct = gePct + notarPct + maklerPct + grundbuchPct;

  return {
    grunderwerbsteuer_pct: gePct,
    notar_pct: notarPct,
    makler_pct: maklerPct,
    grundbuch_pct: grundbuchPct,
    total_pct: totalPct,
    total_eur: Math.round(kaufpreis * totalPct / 100),
  };
}

// Beispiel Berlin:
// Kaufpreis: 289.000 EUR
// Grunderwerbsteuer: 6,0% = 17.340 EUR
// Notar: 1,5% = 4.335 EUR
// Makler: 3,57% = 10.317 EUR
// Grundbuch: 0,5% = 1.445 EUR
// Gesamt: 11,57% = 33.437 EUR
```

#### 10-Jahres-Cashflow Projektion

```typescript
interface CashflowProjection {
  year: number;
  miete_brutto: number;          // Jahresmiete
  nebenkosten: number;           // Nicht umlegbare NK
  instandhaltung: number;        // ~1% des Kaufpreises
  verwaltung: number;            // WEG-Verwaltung + Hausverwaltung
  mietausfall: number;           // ~3% der Jahresmiete (Leerstand, Mietausfall)
  netto_mieteinnahmen: number;   // Brutto - Abzuege
  zinskosten: number;            // Hypothek Zinsen
  tilgung: number;               // Hypothek Tilgung
  cashflow: number;              // Netto - Zins - Tilgung
  eigenkapital_rendite: number;  // Cashflow / Eigenkapital
}

function projectCashflow(params: {
  kaufpreis: number;
  nebenkosten: number;
  eigenkapitalQuote: number;     // z.B. 0.2 = 20%
  zinssatz: number;              // z.B. 0.035 = 3,5%
  tilgungsrate: number;          // z.B. 0.02 = 2%
  jahresmiete: number;
  mietsteigerung: number;        // z.B. 0.02 = 2% p.a.
  instandhaltungPct: number;     // z.B. 0.01 = 1%
  verwaltungPaMonat: number;     // z.B. 30 EUR/Monat
  leerstandPct: number;          // z.B. 0.03 = 3%
}): CashflowProjection[] {
  // ... 10 Zeilen pro Jahr berechnen
  // Mietsteigerung: +2% p.a.
  // Instandhaltung: 1% des Kaufpreises p.a.
  // Leerstand: 3% der Jahresmiete
  // Verwaltung: ~360 EUR/Jahr
  // Annuitaet: Zins + Tilgung auf (Kaufpreis + NK - Eigenkapital)
}

// Annahmen (Defaults, im Config konfigurierbar):
// - Eigenkapitalquote: 20%
// - Zinssatz: 3,5% (aktueller Marktzins 2026)
// - Tilgungsrate: 2%
// - Mietsteigerung: 2% p.a.
// - Instandhaltung: 1% des Kaufpreises p.a.
// - Verwaltung: 30 EUR/Monat
// - Leerstandsrisiko: 3%
```

### 10.5 Batch-Verarbeitung

```
Batch-Strategie fuer deal_qualifier:
═════════════════════════════════════

Problem: 15 neue Listings einzeln an OpenAI senden = 15 API-Calls = teuer + langsam

Loesung: Batch-Verarbeitung mit max 5 Listings pro Call

Ablauf:
  15 Listings → [Batch 1: 5] [Batch 2: 5] [Batch 3: 5]

Pro Batch:
  System-Prompt: DEAL_QUALIFIER_SYSTEM_PROMPT (statisch, ~800 Tokens)
  User-Prompt:   5 × Listing-Daten (~500 Tokens pro Listing = ~2500 Tokens)
  Response:      5 × Evaluation (~200 Tokens pro Evaluation = ~1000 Tokens)
  ─────────────────────────────────────────────
  Gesamt pro Batch: ~4300 Tokens
  Kosten (gpt-4o-mini): ~$0.0006 pro Batch

3 Batches:
  Total Tokens: ~12900
  Total Kosten: ~$0.002
  Total Latenz: ~3-5 Sekunden (parallel ausfuehrbar)

Vergleich Einzeln:
  15 × ~1800 Tokens = ~27000 Tokens
  15 × $0.0003 = $0.0045
  15 × ~1-2s = 15-30 Sekunden (seriell)

Einsparung durch Batching:
  Tokens: -52%
  Kosten: -56%
  Latenz: -80%
```

---

## 11. Configuration & Constants

### 11.1 Haupt-Konfigurationsdatei

**Datei: `lib/agents/property-sentinel/config.ts`**

```typescript
/**
 * Property Sentinel Configuration
 *
 * Central configuration for all Sentinel subsystems.
 * Values can be overridden via environment variables where noted.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Sentinel Limits
// ─────────────────────────────────────────────────────────────────────────────

export const SENTINEL_CONFIG = {
  /** Maximum search profiles per user (env: SENTINEL_MAX_PROFILES) */
  maxProfilesPerUser: parseInt(process.env.SENTINEL_MAX_PROFILES || '5'),

  /** Maximum portals per profile */
  maxPortalsPerProfile: 3,

  /** Maximum pages to scrape per portal per scan */
  maxPagesPerPortal: 2,

  /** Minimum interval between scans for same profile (minutes) */
  minScanIntervalMinutes: 30,

  /** Default minimum score for deal qualification */
  defaultMinScore: parseInt(process.env.SENTINEL_MIN_SCORE || '60'),

  /** Maximum listings to score per scan */
  maxListingsPerScan: 50,

  /** Maximum listings per deal_qualifier batch (OpenAI call) */
  batchSize: 5,

  /** Days after which unseen listings are marked stale */
  staleThresholdDays: 14,

  /** Days after which stale listings are purged */
  purgeThresholdDays: 90,

  /** Maximum concurrent Firecrawl requests */
  maxConcurrentRequests: 2,

  /** Firecrawl requests per minute limit */
  requestsPerMinute: 10,

  /** Maximum tool calls per chat turn */
  maxToolCalls: 10,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Firecrawl / Credit Limits
// ─────────────────────────────────────────────────────────────────────────────

export const FIRECRAWL_CONFIG = {
  /** Daily Firecrawl credit cap per user (env: FIRECRAWL_DAILY_LIMIT) */
  dailyCreditLimit: parseInt(process.env.FIRECRAWL_DAILY_LIMIT || '500'),

  /** Credits per scan cap */
  perScanCreditLimit: 30,

  /** Credits consumed per list page scrape */
  listPageCreditCost: 1,

  /** Credits consumed per detail page scrape */
  detailPageCreditCost: 1,

  /** Cache TTL for list page results (seconds) */
  listPageCacheTtlSeconds: 1800, // 30 minutes

  /** Cache TTL for detail page results (seconds) */
  detailPageCacheTtlSeconds: 86400, // 24 hours

  /** Circuit breaker: consecutive failures before tripping */
  circuitBreakerThreshold: 5,

  /** Circuit breaker: half-open retry delay (ms) */
  circuitBreakerRecoveryMs: 300_000, // 5 minutes

  /** Retry: max attempts per Firecrawl call */
  maxRetries: 3,

  /** Retry: initial backoff delay (ms) */
  initialBackoffMs: 1000,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Portal Configuration
// ─────────────────────────────────────────────────────────────────────────────

export type PortalId = 'immoscout24' | 'immowelt' | 'kleinanzeigen';

export interface PortalConfig {
  id: PortalId;
  name: string;
  displayName: string;
  baseUrl: string;
  supportedPropertyTypes: PropertyType[];
  supportedPurchaseTypes: PurchaseType[];
  idPattern: RegExp;
  maxPages: number;
  requiresJsRendering: boolean;
  searchUrlTemplate: string;
  detailUrlTemplate: string;
}

export const PORTAL_CONFIG: Record<PortalId, PortalConfig> = {
  immoscout24: {
    id: 'immoscout24',
    name: 'ImmobilienScout24',
    displayName: 'ImmoScout24',
    baseUrl: 'https://www.immobilienscout24.de',
    supportedPropertyTypes: ['wohnung', 'haus', 'grundstueck', 'gewerbe'],
    supportedPurchaseTypes: ['kauf', 'miete'],
    idPattern: /\/expose\/(\d+)/,
    maxPages: 2,
    requiresJsRendering: true,
    searchUrlTemplate: '/Suche/de/{state}/{city}/{propertyType}-{purchaseType}',
    detailUrlTemplate: '/expose/{externalId}',
  },
  immowelt: {
    id: 'immowelt',
    name: 'Immowelt',
    displayName: 'Immowelt',
    baseUrl: 'https://www.immowelt.de',
    supportedPropertyTypes: ['wohnung', 'haus', 'grundstueck'],
    supportedPurchaseTypes: ['kauf', 'miete'],
    idPattern: /\/expose\/([a-z0-9]+)/,
    maxPages: 2,
    requiresJsRendering: true,
    searchUrlTemplate: '/liste/{city}/wohnungen/{purchaseType}',
    detailUrlTemplate: '/expose/{externalId}',
  },
  kleinanzeigen: {
    id: 'kleinanzeigen',
    name: 'eBay Kleinanzeigen',
    displayName: 'Kleinanzeigen',
    baseUrl: 'https://www.kleinanzeigen.de',
    supportedPropertyTypes: ['wohnung', 'haus'],
    supportedPurchaseTypes: ['kauf', 'miete'],
    idPattern: /\/(\d{10,})/,
    maxPages: 2,
    requiresJsRendering: false,
    searchUrlTemplate: '/s-wohnung-{purchaseType}/c{categoryId}',
    detailUrlTemplate: '/s-anzeige/{externalId}',
  },
} as const;

export const SUPPORTED_PORTALS: PortalId[] = ['immoscout24', 'immowelt', 'kleinanzeigen'];

// ─────────────────────────────────────────────────────────────────────────────
// Property Types & Purchase Types
// ─────────────────────────────────────────────────────────────────────────────

export type PropertyType = 'wohnung' | 'haus' | 'grundstueck' | 'gewerbe' | 'mehrfamilienhaus';
export type PurchaseType = 'kauf' | 'miete';

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  wohnung: 'Eigentumswohnung',
  haus: 'Haus',
  grundstueck: 'Grundstueck',
  gewerbe: 'Gewerbeimmobilie',
  mehrfamilienhaus: 'Mehrfamilienhaus',
};

export const PURCHASE_TYPE_LABELS: Record<PurchaseType, string> = {
  kauf: 'Kauf',
  miete: 'Miete',
};

// ─────────────────────────────────────────────────────────────────────────────
// Scan Frequency Presets
// ─────────────────────────────────────────────────────────────────────────────

export type FrequencyPreset = 'hourly' | '6x_daily' | '3x_daily' | 'daily' | 'custom';

export interface FrequencyConfig {
  label: string;
  cronExpression: string;
  description: string;
  estimatedDailyCredits: number;
}

export const FREQUENCY_PRESETS: Record<Exclude<FrequencyPreset, 'custom'>, FrequencyConfig> = {
  hourly: {
    label: 'Stuendlich',
    cronExpression: '0 * * * *',
    description: 'Jede Stunde (24 Scans/Tag)',
    estimatedDailyCredits: 240,
  },
  '6x_daily': {
    label: '6x taeglich',
    cronExpression: '0 */4 * * *',
    description: 'Alle 4 Stunden (6 Scans/Tag)',
    estimatedDailyCredits: 60,
  },
  '3x_daily': {
    label: '3x taeglich',
    cronExpression: '0 8,14,20 * * *',
    description: 'Um 8:00, 14:00, 20:00 (3 Scans/Tag)',
    estimatedDailyCredits: 30,
  },
  daily: {
    label: 'Taeglich',
    cronExpression: '0 8 * * *',
    description: 'Taeglich um 8:00 (1 Scan/Tag)',
    estimatedDailyCredits: 10,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// KI Scoring Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const SCORING_CONFIG = {
  /** Model for KI scoring (gpt-4o-mini is cost-effective) */
  scoringModel: 'gpt-4o-mini',

  /** Max tokens for scoring response */
  scoringMaxTokens: 2000,

  /** Temperature for scoring (low = more consistent) */
  scoringTemperature: 0.3,

  /** Score thresholds */
  thresholds: {
    excellent: 80,  // >= 80: Sofort ansehen
    good: 65,       // >= 65: Interessant
    acceptable: 50, // >= 50: Vielleicht
    poor: 0,        // < 50: Nicht interessant
  },

  /** Scoring categories with max points */
  categories: {
    lage_match: { maxPoints: 25, weight: 1.0 },
    preis_leistung: { maxPoints: 25, weight: 1.0 },
    rendite_potenzial: { maxPoints: 25, weight: 1.0 },
    risiko_bewertung: { maxPoints: 25, weight: 1.0 },
  },

  /** Labels for score thresholds */
  scoreLabels: {
    80: { label: 'Exzellent', color: '#10B981', emoji: '🟢' },
    65: { label: 'Gut', color: '#3B82F6', emoji: '🔵' },
    50: { label: 'Akzeptabel', color: '#F59E0B', emoji: '🟡' },
    0: { label: 'Schwach', color: '#EF4444', emoji: '🔴' },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Red Flags
// ─────────────────────────────────────────────────────────────────────────────

export interface RedFlagDefinition {
  id: string;
  keywords: string[];
  severity: 'critical' | 'high' | 'medium';
  scorePenalty: number;
  description: string;
}

export const RED_FLAGS: RedFlagDefinition[] = [
  { id: 'erbpacht', keywords: ['erbpacht', 'erbbaurecht', 'erbbauzins'], severity: 'critical', scorePenalty: -15, description: 'Erbbaurecht / Erbpacht vorhanden' },
  { id: 'sanierungsstau', keywords: ['sanierungsstau', 'sanierungsbedarf', 'komplettsanierung'], severity: 'high', scorePenalty: -10, description: 'Erheblicher Sanierungsbedarf' },
  { id: 'denkmalschutz', keywords: ['denkmalschutz', 'denkmalgeschuetzt', 'baudenkmal'], severity: 'high', scorePenalty: -10, description: 'Denkmalschutz-Auflagen' },
  { id: 'wohnrecht', keywords: ['wohnrecht', 'niessbrauch', 'wohnungsrecht'], severity: 'critical', scorePenalty: -15, description: 'Wohnrecht / Niessbrauch eingetragen' },
  { id: 'altlasten', keywords: ['altlasten', 'kontaminiert', 'bodenverschmutzung'], severity: 'critical', scorePenalty: -15, description: 'Altlasten im Grundstueck' },
  { id: 'asbest', keywords: ['asbest', 'asbestbelastung'], severity: 'high', scorePenalty: -10, description: 'Asbestbelastung bekannt' },
  { id: 'schimmel', keywords: ['schimmel', 'schimmelbefall', 'feuchteschaden'], severity: 'high', scorePenalty: -8, description: 'Schimmel- oder Feuchtigkeitsschaeden' },
  { id: 'feuchtigkeit', keywords: ['feuchtigkeit', 'wasserschaden', 'nass', 'durchfeuchtet'], severity: 'high', scorePenalty: -8, description: 'Feuchtigkeitsschaeden' },
  { id: 'laerm', keywords: ['laerm', 'laermbelastung', 'fluglaerm', 'strassenlaerm', 'bahnlaerm'], severity: 'medium', scorePenalty: -5, description: 'Erhoehte Laermbelastung' },
  { id: 'ueberschwemmung', keywords: ['ueberschwemmung', 'hochwasser', 'ueberschwemmungsgebiet', 'hochwassergebiet'], severity: 'high', scorePenalty: -10, description: 'Ueberschwemmungsgebiet' },
  { id: 'grundstuecksbelastung', keywords: ['grunddienstbarkeit', 'wegerecht', 'leitungsrecht', 'belastung'], severity: 'medium', scorePenalty: -5, description: 'Grunddienstbarkeiten eingetragen' },
  { id: 'vorkaufsrecht', keywords: ['vorkaufsrecht', 'gemeinde', 'vorkauf'], severity: 'medium', scorePenalty: -5, description: 'Gemeindliches Vorkaufsrecht' },
  { id: 'zweckentfremdung', keywords: ['zweckentfremdung', 'eigennutzungspflicht'], severity: 'medium', scorePenalty: -5, description: 'Zweckentfremdungsverbot / Eigennutzungspflicht' },
  { id: 'weg_streit', keywords: ['klage', 'rechtsstreit', 'streit', 'eigentuemergemeinschaft'], severity: 'medium', scorePenalty: -5, description: 'WEG-Streitigkeiten bekannt' },
  { id: 'abstandsflaechen', keywords: ['abstandsflaechen', 'baurecht', 'baulast'], severity: 'medium', scorePenalty: -5, description: 'Abstandsflaechen-/Baulast-Probleme' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Kleinanzeigen Category IDs
// ─────────────────────────────────────────────────────────────────────────────

export const KLEINANZEIGEN_CATEGORIES: Record<string, number> = {
  'wohnung_kauf': 196,
  'wohnung_miete': 203,
  'haus_kauf': 208,
  'haus_miete': 205,
};

// ─────────────────────────────────────────────────────────────────────────────
// Bundesland Codes (for URL generation & GrESt)
// ─────────────────────────────────────────────────────────────────────────────

export const BUNDESLAND_CODES: Record<string, string> = {
  'Baden-Wuerttemberg': 'BW', 'Bayern': 'BY', 'Berlin': 'BE',
  'Brandenburg': 'BB', 'Bremen': 'HB', 'Hamburg': 'HH',
  'Hessen': 'HE', 'Mecklenburg-Vorpommern': 'MV',
  'Niedersachsen': 'NI', 'Nordrhein-Westfalen': 'NW',
  'Rheinland-Pfalz': 'RP', 'Saarland': 'SL', 'Sachsen': 'SN',
  'Sachsen-Anhalt': 'ST', 'Schleswig-Holstein': 'SH', 'Thueringen': 'TH',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get portal config by ID with type safety
 */
export function getPortalConfig(portalId: string): PortalConfig | undefined {
  return PORTAL_CONFIG[portalId as PortalId];
}

/**
 * Validate portal ID
 */
export function isValidPortal(portalId: string): portalId is PortalId {
  return SUPPORTED_PORTALS.includes(portalId as PortalId);
}

/**
 * Get frequency config for preset
 */
export function getFrequencyConfig(frequency: FrequencyPreset): FrequencyConfig | undefined {
  if (frequency === 'custom') return undefined;
  return FREQUENCY_PRESETS[frequency];
}

/**
 * Get score label for a given score
 */
export function getScoreLabel(score: number): { label: string; color: string; emoji: string } {
  const { scoreLabels } = SCORING_CONFIG;
  if (score >= 80) return scoreLabels[80];
  if (score >= 65) return scoreLabels[65];
  if (score >= 50) return scoreLabels[50];
  return scoreLabels[0];
}

/**
 * Redis key builders
 */
export const REDIS_KEYS = {
  listPageCache: (urlHash: string) => `sentinel:cache:list:${urlHash}`,
  detailPageCache: (urlHash: string) => `sentinel:cache:detail:${urlHash}`,
  dailyCredits: (userId: string, date: string) => `sentinel:credits:${userId}:${date}`,
  scanLock: (profileId: string) => `sentinel:lock:scan:${profileId}`,
  circuitBreaker: (portal: string) => `sentinel:circuit:${portal}`,
  rateLimiter: (userId: string) => `sentinel:rate:${userId}`,
} as const;
```

### 11.2 Environment Variables

```
# ─── Required ─────────────────────────────────────────────────────────────────
FIRECRAWL_API_KEY=fc-...                  # Firecrawl API key for web scraping

# ─── Optional (with defaults) ────────────────────────────────────────────────
FIRECRAWL_DAILY_LIMIT=500                 # Max Firecrawl credits per user per day
SENTINEL_MAX_PROFILES=5                   # Max search profiles per user
SENTINEL_MIN_SCORE=60                     # Global minimum score threshold

# ─── Already configured (from existing .env.local) ──────────────────────────
OPENAI_API_KEY=sk-...                     # For KI scoring (deal_qualifier)
OPENAI_MODEL=gpt-5-mini                  # Primary model (agents)
REDIS_URL=redis://localhost:6379          # BullMQ + caching
DATABASE_URL=postgresql://...             # PostgreSQL connection
```

### 11.3 Konfigurationsmatrix

```
┌─────────────────────────────────┬──────────┬───────────────┬──────────────────────────────────┐
│ Konfiguration                   │ Default  │ Env-Variable  │ Beschreibung                     │
├─────────────────────────────────┼──────────┼───────────────┼──────────────────────────────────┤
│ maxProfilesPerUser              │ 5        │ SENTINEL_MAX_ │ Max Suchprofile pro User         │
│                                 │          │ PROFILES      │                                  │
│ maxPortalsPerProfile            │ 3        │ –             │ Max Portale pro Profil           │
│ maxPagesPerPortal               │ 2        │ –             │ Max Seiten pro Portal pro Scan   │
│ minScanIntervalMinutes          │ 30       │ –             │ Min Abstand zwischen Scans       │
│ defaultMinScore                 │ 60       │ SENTINEL_MIN_ │ Min Score fuer Qualifikation     │
│                                 │          │ SCORE         │                                  │
│ maxListingsPerScan              │ 50       │ –             │ Max Listings pro Scan            │
│ batchSize                       │ 5        │ –             │ Listings pro OpenAI Batch-Call   │
│ staleThresholdDays              │ 14       │ –             │ Tage bis Listing als stale gilt  │
│ purgeThresholdDays              │ 90       │ –             │ Tage bis stale Listing geloescht │
│ dailyCreditLimit                │ 500      │ FIRECRAWL_    │ Tages-Credits pro User           │
│                                 │          │ DAILY_LIMIT   │                                  │
│ perScanCreditLimit              │ 30       │ –             │ Credits pro einzelnen Scan       │
│ circuitBreakerThreshold         │ 5        │ –             │ Fehler bis Circuit-Breaker offen │
│ circuitBreakerRecoveryMs        │ 300000   │ –             │ Recovery-Zeit (5 Min)            │
│ maxConcurrentRequests           │ 2        │ –             │ Parallele Firecrawl Requests     │
│ requestsPerMinute               │ 10       │ –             │ Firecrawl Requests pro Minute    │
│ scoringModel                    │ gpt-4o-  │ –             │ OpenAI Modell fuer Scoring       │
│                                 │ mini     │               │                                  │
│ scoringMaxTokens                │ 2000     │ –             │ Max Tokens fuer Scoring-Response │
│ scoringTemperature              │ 0.3      │ –             │ Temperatur fuer konsistentes     │
│                                 │          │               │ Scoring                          │
└─────────────────────────────────┴──────────┴───────────────┴──────────────────────────────────┘
```

---

## 12. Testing Strategy

### 12.1 Uebersicht

```
Test-Architektur fuer Property Sentinel
════════════════════════════════════════

Framework:        Vitest (bestehend, konfiguriert)
Pattern:          Unit Tests pro Tool/Service
Location:         tests/unit/agents/property-sentinel/
Mocking:          vi.mock() fuer externe Abhaengigkeiten
Convention:       Matching tenant-communicator test structure

Test-Dateien:
├── config.spec.ts                   ~80 Tests
├── search-manager.spec.ts           ~35 Tests
├── market-radar.spec.ts             ~40 Tests
├── deal-qualifier.spec.ts           ~30 Tests
├── pipeline-sync.spec.ts            ~20 Tests
├── firecrawl-service.spec.ts        ~30 Tests
├── portal-url-generator.spec.ts     ~25 Tests
└── listing-parser.spec.ts           ~25 Tests
                                     ────────
                                     ~285 Tests
```

### 12.2 Mock-Strategie

```typescript
// ─────────────────────────────────────────────────────────────────────────────
// Mock 1: Firecrawl SDK
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@mendable/firecrawl-js', () => ({
  default: class FirecrawlApp {
    constructor(private opts: { apiKey: string }) {}

    async scrapeUrl(url: string, opts?: any) {
      // Return portal-specific mock data based on URL
      if (url.includes('immobilienscout24.de')) {
        return {
          success: true,
          data: {
            extract: {
              listings: [
                {
                  title: '3-Zimmer-Wohnung in Kreuzberg',
                  price: 289000,
                  area_sqm: 78,
                  rooms: 3,
                  address: 'Oranienstr. 45, 10969 Berlin',
                  portal_id: '132456789',
                  detail_url: 'https://www.immobilienscout24.de/expose/132456789',
                },
                // ... more mock listings
              ],
            },
          },
        };
      }
      // ... immowelt, kleinanzeigen mocks
      return { success: false, error: 'Unknown portal' };
    }
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Mock 2: Database (Drizzle)
// ─────────────────────────────────────────────────────────────────────────────

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  execute: vi.fn(),
};

vi.mock('@/lib/db/connection', () => ({
  getDb: () => mockDb,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Mock 3: BullMQ
// ─────────────────────────────────────────────────────────────────────────────

const mockQueue = {
  add: vi.fn().mockResolvedValue({ id: 'mock-job-id', name: 'SCAN_PROFILE' }),
  removeRepeatableByKey: vi.fn().mockResolvedValue(true),
  getRepeatableJobs: vi.fn().mockResolvedValue([]),
  getJobCounts: vi.fn().mockResolvedValue({ active: 0, waiting: 1, completed: 10 }),
  close: vi.fn().mockResolvedValue(undefined),
};

vi.mock('bullmq', () => ({
  Queue: vi.fn(() => mockQueue),
  Worker: vi.fn(),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Mock 4: OpenAI (for deal_qualifier scoring)
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('openai', () => ({
  default: class OpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                evaluations: [{
                  listing_id: 'mock-listing-1',
                  total_score: 72,
                  lage_match: 20,
                  preis_leistung: 18,
                  rendite_potenzial: 19,
                  risiko_bewertung: 15,
                  red_flags: ['erbpacht'],
                  summary: 'Gute Lage, akzeptabler Preis, Erbpacht beachten.',
                  recommendation: 'pruefenswert',
                }],
              }),
            },
            finish_reason: 'stop',
          }],
          usage: { total_tokens: 1500 },
        }),
      },
    };
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Mock 5: Redis (for caching + credit tracking)
// ─────────────────────────────────────────────────────────────────────────────

const mockRedis = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
  setex: vi.fn().mockResolvedValue('OK'),
  incr: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(1),
  del: vi.fn().mockResolvedValue(1),
};

vi.mock('@/lib/redis/connection', () => ({
  getRedisClient: () => mockRedis,
  createBullMQConnection: () => ({}),
}));
```

### 12.3 Test-Datei: `config.spec.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  SENTINEL_CONFIG,
  FIRECRAWL_CONFIG,
  PORTAL_CONFIG,
  SUPPORTED_PORTALS,
  FREQUENCY_PRESETS,
  SCORING_CONFIG,
  RED_FLAGS,
  PROPERTY_TYPE_LABELS,
  PURCHASE_TYPE_LABELS,
  BUNDESLAND_CODES,
  KLEINANZEIGEN_CATEGORIES,
  REDIS_KEYS,
  getPortalConfig,
  isValidPortal,
  getFrequencyConfig,
  getScoreLabel,
  type PortalId,
  type PropertyType,
  type PurchaseType,
  type FrequencyPreset,
} from '@/lib/agents/property-sentinel/config';

describe('property-sentinel config', () => {
  describe('SENTINEL_CONFIG', () => {
    it('has valid maxProfilesPerUser', () => {
      expect(SENTINEL_CONFIG.maxProfilesPerUser).toBeGreaterThan(0);
      expect(SENTINEL_CONFIG.maxProfilesPerUser).toBeLessThanOrEqual(20);
    });

    it('has valid minScanIntervalMinutes', () => {
      expect(SENTINEL_CONFIG.minScanIntervalMinutes).toBeGreaterThanOrEqual(15);
    });

    it('has valid defaultMinScore', () => {
      expect(SENTINEL_CONFIG.defaultMinScore).toBeGreaterThanOrEqual(0);
      expect(SENTINEL_CONFIG.defaultMinScore).toBeLessThanOrEqual(100);
    });

    it('has valid batchSize', () => {
      expect(SENTINEL_CONFIG.batchSize).toBeGreaterThan(0);
      expect(SENTINEL_CONFIG.batchSize).toBeLessThanOrEqual(10);
    });

    it('has staleThresholdDays < purgeThresholdDays', () => {
      expect(SENTINEL_CONFIG.staleThresholdDays).toBeLessThan(SENTINEL_CONFIG.purgeThresholdDays);
    });
  });

  describe('FIRECRAWL_CONFIG', () => {
    it('has valid credit limits', () => {
      expect(FIRECRAWL_CONFIG.dailyCreditLimit).toBeGreaterThan(0);
      expect(FIRECRAWL_CONFIG.perScanCreditLimit).toBeGreaterThan(0);
      expect(FIRECRAWL_CONFIG.perScanCreditLimit).toBeLessThan(FIRECRAWL_CONFIG.dailyCreditLimit);
    });

    it('has valid retry config', () => {
      expect(FIRECRAWL_CONFIG.maxRetries).toBeGreaterThanOrEqual(1);
      expect(FIRECRAWL_CONFIG.initialBackoffMs).toBeGreaterThan(0);
    });

    it('has valid circuit breaker config', () => {
      expect(FIRECRAWL_CONFIG.circuitBreakerThreshold).toBeGreaterThan(0);
      expect(FIRECRAWL_CONFIG.circuitBreakerRecoveryMs).toBeGreaterThan(0);
    });

    it('has valid cache TTLs', () => {
      expect(FIRECRAWL_CONFIG.listPageCacheTtlSeconds).toBeGreaterThan(0);
      expect(FIRECRAWL_CONFIG.detailPageCacheTtlSeconds).toBeGreaterThan(FIRECRAWL_CONFIG.listPageCacheTtlSeconds);
    });
  });

  describe('PORTAL_CONFIG', () => {
    it('has config for all supported portals', () => {
      for (const portalId of SUPPORTED_PORTALS) {
        expect(PORTAL_CONFIG[portalId]).toBeDefined();
        expect(PORTAL_CONFIG[portalId].id).toBe(portalId);
      }
    });

    it('has valid regex patterns for each portal', () => {
      // ImmoScout24: /expose/132456789
      expect(PORTAL_CONFIG.immoscout24.idPattern.test('/expose/132456789')).toBe(true);
      expect(PORTAL_CONFIG.immoscout24.idPattern.test('/expose/')).toBe(false);

      // Immowelt: /expose/abc123
      expect(PORTAL_CONFIG.immowelt.idPattern.test('/expose/abc123def')).toBe(true);

      // Kleinanzeigen: /1234567890
      expect(PORTAL_CONFIG.kleinanzeigen.idPattern.test('/1234567890')).toBe(true);
      expect(PORTAL_CONFIG.kleinanzeigen.idPattern.test('/123')).toBe(false);
    });

    it('has non-empty baseUrl for each portal', () => {
      for (const portalId of SUPPORTED_PORTALS) {
        expect(PORTAL_CONFIG[portalId].baseUrl).toMatch(/^https:\/\//);
      }
    });

    it('has at least one supported property type per portal', () => {
      for (const portalId of SUPPORTED_PORTALS) {
        expect(PORTAL_CONFIG[portalId].supportedPropertyTypes.length).toBeGreaterThan(0);
      }
    });

    it('has at least one supported purchase type per portal', () => {
      for (const portalId of SUPPORTED_PORTALS) {
        expect(PORTAL_CONFIG[portalId].supportedPurchaseTypes.length).toBeGreaterThan(0);
      }
    });
  });

  describe('FREQUENCY_PRESETS', () => {
    it('has valid cron expressions', () => {
      const cronPattern = /^(\*|[0-9,*/]+)\s+(\*|[0-9,*/]+)\s+(\*|[0-9,*/]+)\s+(\*|[0-9,*/]+)\s+(\*|[0-9,*/]+)$/;
      for (const [key, preset] of Object.entries(FREQUENCY_PRESETS)) {
        expect(preset.cronExpression).toMatch(cronPattern);
      }
    });

    it('has positive estimated daily credits', () => {
      for (const [key, preset] of Object.entries(FREQUENCY_PRESETS)) {
        expect(preset.estimatedDailyCredits).toBeGreaterThan(0);
      }
    });

    it('hourly has highest estimated credits', () => {
      expect(FREQUENCY_PRESETS.hourly.estimatedDailyCredits)
        .toBeGreaterThan(FREQUENCY_PRESETS.daily.estimatedDailyCredits);
    });
  });

  describe('SCORING_CONFIG', () => {
    it('categories sum to 100 max points', () => {
      const totalMax = Object.values(SCORING_CONFIG.categories)
        .reduce((sum, cat) => sum + cat.maxPoints, 0);
      expect(totalMax).toBe(100);
    });

    it('has valid thresholds in descending order', () => {
      expect(SCORING_CONFIG.thresholds.excellent).toBeGreaterThan(SCORING_CONFIG.thresholds.good);
      expect(SCORING_CONFIG.thresholds.good).toBeGreaterThan(SCORING_CONFIG.thresholds.acceptable);
      expect(SCORING_CONFIG.thresholds.acceptable).toBeGreaterThanOrEqual(SCORING_CONFIG.thresholds.poor);
    });
  });

  describe('RED_FLAGS', () => {
    it('has at least 10 red flags', () => {
      expect(RED_FLAGS.length).toBeGreaterThanOrEqual(10);
    });

    it('all red flags have negative score penalties', () => {
      for (const flag of RED_FLAGS) {
        expect(flag.scorePenalty).toBeLessThan(0);
      }
    });

    it('all red flags have unique IDs', () => {
      const ids = RED_FLAGS.map(f => f.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all red flags have at least one keyword', () => {
      for (const flag of RED_FLAGS) {
        expect(flag.keywords.length).toBeGreaterThan(0);
      }
    });

    it('all red flags have valid severity', () => {
      for (const flag of RED_FLAGS) {
        expect(['critical', 'high', 'medium']).toContain(flag.severity);
      }
    });

    it('critical flags have highest penalties', () => {
      const criticals = RED_FLAGS.filter(f => f.severity === 'critical');
      const mediums = RED_FLAGS.filter(f => f.severity === 'medium');
      const avgCritical = criticals.reduce((s, f) => s + f.scorePenalty, 0) / criticals.length;
      const avgMedium = mediums.reduce((s, f) => s + f.scorePenalty, 0) / mediums.length;
      expect(avgCritical).toBeLessThan(avgMedium);
    });
  });

  describe('PROPERTY_TYPE_LABELS', () => {
    it('has label for every PropertyType', () => {
      const types: PropertyType[] = ['wohnung', 'haus', 'grundstueck', 'gewerbe', 'mehrfamilienhaus'];
      for (const t of types) {
        expect(PROPERTY_TYPE_LABELS[t]).toBeDefined();
        expect(PROPERTY_TYPE_LABELS[t].length).toBeGreaterThan(0);
      }
    });
  });

  describe('BUNDESLAND_CODES', () => {
    it('has 16 Bundeslaender', () => {
      expect(Object.keys(BUNDESLAND_CODES).length).toBe(16);
    });

    it('has unique 2-letter codes', () => {
      const codes = Object.values(BUNDESLAND_CODES);
      expect(new Set(codes).size).toBe(16);
      for (const code of codes) {
        expect(code).toMatch(/^[A-Z]{2}$/);
      }
    });
  });

  describe('Helper Functions', () => {
    describe('getPortalConfig', () => {
      it('returns config for valid portal', () => {
        const config = getPortalConfig('immoscout24');
        expect(config).toBeDefined();
        expect(config!.id).toBe('immoscout24');
      });

      it('returns undefined for invalid portal', () => {
        expect(getPortalConfig('nonexistent')).toBeUndefined();
      });
    });

    describe('isValidPortal', () => {
      it('returns true for supported portals', () => {
        expect(isValidPortal('immoscout24')).toBe(true);
        expect(isValidPortal('immowelt')).toBe(true);
        expect(isValidPortal('kleinanzeigen')).toBe(true);
      });

      it('returns false for unsupported portals', () => {
        expect(isValidPortal('zillow')).toBe(false);
        expect(isValidPortal('')).toBe(false);
      });
    });

    describe('getFrequencyConfig', () => {
      it('returns config for preset frequencies', () => {
        expect(getFrequencyConfig('daily')).toBeDefined();
        expect(getFrequencyConfig('hourly')).toBeDefined();
      });

      it('returns undefined for custom', () => {
        expect(getFrequencyConfig('custom')).toBeUndefined();
      });
    });

    describe('getScoreLabel', () => {
      it('returns Exzellent for >= 80', () => {
        expect(getScoreLabel(80).label).toBe('Exzellent');
        expect(getScoreLabel(100).label).toBe('Exzellent');
      });

      it('returns Gut for 65-79', () => {
        expect(getScoreLabel(65).label).toBe('Gut');
        expect(getScoreLabel(79).label).toBe('Gut');
      });

      it('returns Akzeptabel for 50-64', () => {
        expect(getScoreLabel(50).label).toBe('Akzeptabel');
        expect(getScoreLabel(64).label).toBe('Akzeptabel');
      });

      it('returns Schwach for < 50', () => {
        expect(getScoreLabel(49).label).toBe('Schwach');
        expect(getScoreLabel(0).label).toBe('Schwach');
      });
    });

    describe('REDIS_KEYS', () => {
      it('generates valid list page cache key', () => {
        expect(REDIS_KEYS.listPageCache('abc123')).toBe('sentinel:cache:list:abc123');
      });

      it('generates valid daily credits key', () => {
        expect(REDIS_KEYS.dailyCredits('user-1', '2026-02-18')).toBe('sentinel:credits:user-1:2026-02-18');
      });

      it('generates valid scan lock key', () => {
        expect(REDIS_KEYS.scanLock('profile-1')).toBe('sentinel:lock:scan:profile-1');
      });
    });
  });
});
```

### 12.4 Test-Datei: `search-manager.spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeSearchManager, type SearchManagerInput } from '@/lib/agents/property-sentinel/tools/search-manager';

// Mock imports (from 12.2)

function makeInput(overrides: Partial<SearchManagerInput> = {}): SearchManagerInput {
  return {
    action: 'list',
    ...overrides,
  };
}

describe('search_manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('action: create', () => {
    it('creates profile with valid criteria', async () => {
      const result = await executeSearchManager(makeInput({
        action: 'create',
        criteria: {
          location: { city: 'Berlin', plz: '10115', radius_km: 10 },
          property_type: 'wohnung',
          purchase_type: 'kauf',
          price_min: 100000,
          price_max: 400000,
        },
        portals: ['immoscout24'],
        frequency: 'daily',
      }), { userId: 'test-user' });

      expect(result.profile).toBeDefined();
      expect(result.formatted_output).toContain('erstellt');
    });

    it('rejects when max profiles reached', async () => {
      // Mock: user already has 5 profiles
      mockDb.returning.mockResolvedValueOnce(Array(5).fill({ id: 'x' }));

      const result = await executeSearchManager(makeInput({
        action: 'create',
        criteria: {
          location: { city: 'Berlin' },
          property_type: 'wohnung',
          purchase_type: 'kauf',
        },
      }), { userId: 'test-user' });

      expect(result.formatted_output).toContain('Maximum');
    });

    it('validates required criteria fields', async () => {
      const result = await executeSearchManager(makeInput({
        action: 'create',
        criteria: {} as any,
      }), { userId: 'test-user' });

      expect(result.formatted_output).toContain('fehlt');
    });

    it('validates portal names', async () => {
      const result = await executeSearchManager(makeInput({
        action: 'create',
        criteria: {
          location: { city: 'Berlin' },
          property_type: 'wohnung',
          purchase_type: 'kauf',
        },
        portals: ['zillow' as any],
      }), { userId: 'test-user' });

      expect(result.formatted_output).toContain('unterstuetzt');
    });

    it('schedules BullMQ job on create', async () => {
      await executeSearchManager(makeInput({
        action: 'create',
        criteria: {
          location: { city: 'Berlin' },
          property_type: 'wohnung',
          purchase_type: 'kauf',
        },
        frequency: 'daily',
      }), { userId: 'test-user' });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'SCAN_PROFILE',
        expect.objectContaining({ profileId: expect.any(String) }),
        expect.objectContaining({ repeat: expect.any(Object) }),
      );
    });
  });

  describe('action: list', () => {
    it('returns all profiles for user', async () => {
      mockDb.returning.mockResolvedValueOnce([
        { id: 'p1', name: 'Berlin Wohnungen', is_active: true },
        { id: 'p2', name: 'Hamburg Haeuser', is_active: false },
      ]);

      const result = await executeSearchManager(makeInput({ action: 'list' }), { userId: 'test-user' });

      expect(result.profiles).toBeDefined();
      expect(result.formatted_output).toContain('Berlin');
    });

    it('returns empty list when no profiles', async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      const result = await executeSearchManager(makeInput({ action: 'list' }), { userId: 'test-user' });

      expect(result.profiles).toHaveLength(0);
      expect(result.formatted_output).toContain('keine');
    });
  });

  describe('action: pause', () => {
    it('pauses active profile', async () => {
      const result = await executeSearchManager(makeInput({
        action: 'pause',
        profile_id: 'mock-profile-id',
      }), { userId: 'test-user' });

      expect(result.formatted_output).toContain('pausiert');
      expect(mockQueue.removeRepeatableByKey).toHaveBeenCalled();
    });
  });

  describe('action: resume', () => {
    it('resumes paused profile and reschedules', async () => {
      const result = await executeSearchManager(makeInput({
        action: 'resume',
        profile_id: 'mock-profile-id',
      }), { userId: 'test-user' });

      expect(result.formatted_output).toContain('aktiviert');
      expect(mockQueue.add).toHaveBeenCalled();
    });
  });

  describe('action: delete', () => {
    it('soft-deletes profile', async () => {
      const result = await executeSearchManager(makeInput({
        action: 'delete',
        profile_id: 'mock-profile-id',
      }), { userId: 'test-user' });

      expect(result.formatted_output).toContain('geloescht');
      expect(mockQueue.removeRepeatableByKey).toHaveBeenCalled();
    });
  });

  describe('action: stats', () => {
    it('returns profile statistics', async () => {
      const result = await executeSearchManager(makeInput({
        action: 'stats',
        profile_id: 'mock-profile-id',
      }), { userId: 'test-user' });

      expect(result.stats).toBeDefined();
      expect(result.formatted_output.length).toBeGreaterThan(50);
    });
  });

  describe('action: update', () => {
    it('updates criteria for existing profile', async () => {
      const result = await executeSearchManager(makeInput({
        action: 'update',
        profile_id: 'mock-profile-id',
        criteria: { price_max: 500000 },
      }), { userId: 'test-user' });

      expect(result.formatted_output).toContain('aktualisiert');
    });

    it('reschedules BullMQ when frequency changes', async () => {
      await executeSearchManager(makeInput({
        action: 'update',
        profile_id: 'mock-profile-id',
        frequency: 'hourly',
      }), { userId: 'test-user' });

      expect(mockQueue.removeRepeatableByKey).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalled();
    });
  });
});
```

### 12.5 Test-Datei: `market-radar.spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeMarketRadar, type MarketRadarInput } from '@/lib/agents/property-sentinel/tools/market-radar';

function makeInput(overrides: Partial<MarketRadarInput> = {}): MarketRadarInput {
  return {
    profile_id: 'mock-profile-id',
    ...overrides,
  };
}

describe('market_radar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);  // No cache
    mockRedis.incr.mockResolvedValue(5);    // Under daily limit
  });

  describe('scan flow', () => {
    it('scrapes list page for each portal', async () => {
      const result = await executeMarketRadar(makeInput({ portals: ['immoscout24'] }), { userId: 'test-user' });

      expect(result.scan_summary).toBeDefined();
      expect(result.portal_status.length).toBeGreaterThan(0);
    });

    it('deduplicates existing listings', async () => {
      // First scan: 5 listings inserted
      // Second scan: same 5 listings → 0 new
      const result = await executeMarketRadar(makeInput(), { userId: 'test-user' });

      expect(result.scan_summary.total_new).toBeDefined();
    });

    it('returns portal_status for each scanned portal', async () => {
      const result = await executeMarketRadar(makeInput({
        portals: ['immoscout24', 'immowelt'],
      }), { userId: 'test-user' });

      expect(result.portal_status).toHaveLength(2);
      for (const status of result.portal_status) {
        expect(['success', 'error', 'skipped']).toContain(status.status);
      }
    });

    it('tracks credits used', async () => {
      const result = await executeMarketRadar(makeInput(), { userId: 'test-user' });

      expect(result.credits_used).toBeGreaterThanOrEqual(0);
    });
  });

  describe('budget guard', () => {
    it('blocks scan when daily limit exhausted', async () => {
      mockRedis.incr.mockResolvedValue(501);  // Over 500 daily limit

      const result = await executeMarketRadar(makeInput(), { userId: 'test-user' });

      expect(result.formatted_output).toContain('Tageslimit');
    });

    it('blocks scan when minimum interval not met', async () => {
      // Profile last scanned 10 minutes ago (< 30 min minimum)
      mockDb.returning.mockResolvedValueOnce([{
        id: 'p1',
        last_scan_at: new Date(Date.now() - 10 * 60 * 1000),
      }]);

      const result = await executeMarketRadar(makeInput(), { userId: 'test-user' });

      expect(result.formatted_output).toContain('Mindestabstand');
    });
  });

  describe('dry_run mode', () => {
    it('returns URLs without scraping', async () => {
      const result = await executeMarketRadar(makeInput({ dry_run: true }), { userId: 'test-user' });

      expect(result.formatted_output).toContain('Dry-Run');
      expect(result.credits_used).toBe(0);
    });
  });

  describe('error handling', () => {
    it('continues on portal failure', async () => {
      // immoscout24 fails, immowelt succeeds
      const result = await executeMarketRadar(makeInput({
        portals: ['immoscout24', 'immowelt'],
      }), { userId: 'test-user' });

      // Should still have results for the portal that succeeded
      expect(result.portal_status.some(p => p.status === 'error' || p.status === 'success')).toBe(true);
    });

    it('records partial success in scan log', async () => {
      const result = await executeMarketRadar(makeInput(), { userId: 'test-user' });

      // Scan log should be created
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('caching', () => {
    it('uses cached list page when available', async () => {
      mockRedis.get.mockResolvedValueOnce(JSON.stringify({
        listings: [{ title: 'Cached', price: 200000, portal_id: '999' }],
      }));

      const result = await executeMarketRadar(makeInput(), { userId: 'test-user' });

      expect(result.credits_used).toBe(0);  // No Firecrawl call = no credits
    });
  });

  describe('stale detection', () => {
    it('marks listings not seen in 14+ days as stale', async () => {
      // Listing last seen 15 days ago
      const result = await executeMarketRadar(makeInput(), { userId: 'test-user' });

      // Should update stale flag
      expect(result.formatted_output.length).toBeGreaterThan(0);
    });
  });

  describe('formatted output', () => {
    it('produces non-empty formatted_output', async () => {
      const result = await executeMarketRadar(makeInput(), { userId: 'test-user' });

      expect(result.formatted_output.length).toBeGreaterThan(100);
    });

    it('includes portal names in output', async () => {
      const result = await executeMarketRadar(makeInput({
        portals: ['immoscout24'],
      }), { userId: 'test-user' });

      expect(result.formatted_output).toContain('ImmoScout24');
    });
  });
});
```

### 12.6 Test-Datei: `deal-qualifier.spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeDealQualifier, type DealQualifierInput } from '@/lib/agents/property-sentinel/tools/deal-qualifier';

function makeInput(overrides: Partial<DealQualifierInput> = {}): DealQualifierInput {
  return {
    listing_ids: ['listing-1', 'listing-2'],
    profile_id: 'mock-profile-id',
    ...overrides,
  };
}

describe('deal_qualifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('scoring', () => {
    it('returns evaluation for each listing', async () => {
      const result = await executeDealQualifier(makeInput(), { userId: 'test-user' });

      expect(result.evaluations.length).toBeGreaterThan(0);
    });

    it('score is between 0 and 100', async () => {
      const result = await executeDealQualifier(makeInput(), { userId: 'test-user' });

      for (const ev of result.evaluations) {
        expect(ev.total_score).toBeGreaterThanOrEqual(0);
        expect(ev.total_score).toBeLessThanOrEqual(100);
      }
    });

    it('subcategory scores sum to total', async () => {
      const result = await executeDealQualifier(makeInput(), { userId: 'test-user' });

      for (const ev of result.evaluations) {
        const sum = ev.lage_match + ev.preis_leistung + ev.rendite_potenzial + ev.risiko_bewertung;
        expect(ev.total_score).toBe(sum);
      }
    });

    it('each subcategory is <= 25', async () => {
      const result = await executeDealQualifier(makeInput(), { userId: 'test-user' });

      for (const ev of result.evaluations) {
        expect(ev.lage_match).toBeLessThanOrEqual(25);
        expect(ev.preis_leistung).toBeLessThanOrEqual(25);
        expect(ev.rendite_potenzial).toBeLessThanOrEqual(25);
        expect(ev.risiko_bewertung).toBeLessThanOrEqual(25);
      }
    });
  });

  describe('red flag detection', () => {
    it('includes red_flags array in evaluation', async () => {
      const result = await executeDealQualifier(makeInput(), { userId: 'test-user' });

      for (const ev of result.evaluations) {
        expect(Array.isArray(ev.red_flags)).toBe(true);
      }
    });
  });

  describe('batch processing', () => {
    it('processes up to 5 listings per batch', async () => {
      const result = await executeDealQualifier(makeInput({
        listing_ids: ['l1', 'l2', 'l3', 'l4', 'l5'],
      }), { userId: 'test-user' });

      // Should be a single batch (5 listings = 1 OpenAI call)
      expect(result.evaluations.length).toBeLessThanOrEqual(5);
    });

    it('splits 10 listings into 2 batches', async () => {
      const ids = Array.from({ length: 10 }, (_, i) => `listing-${i}`);
      const result = await executeDealQualifier(makeInput({
        listing_ids: ids,
      }), { userId: 'test-user' });

      // OpenAI should be called twice (2 batches of 5)
      // The mock resolves consistently
      expect(result.evaluations.length).toBeGreaterThan(0);
    });
  });

  describe('summary', () => {
    it('includes average score', async () => {
      const result = await executeDealQualifier(makeInput(), { userId: 'test-user' });

      expect(result.summary.avg_score).toBeDefined();
      expect(result.summary.avg_score).toBeGreaterThanOrEqual(0);
    });

    it('categorizes listings by quality', async () => {
      const result = await executeDealQualifier(makeInput(), { userId: 'test-user' });

      expect(result.summary.excellent).toBeDefined();
      expect(result.summary.good).toBeDefined();
    });
  });

  describe('formatted output', () => {
    it('produces non-empty formatted_output', async () => {
      const result = await executeDealQualifier(makeInput(), { userId: 'test-user' });

      expect(result.formatted_output.length).toBeGreaterThan(100);
    });

    it('includes score labels', async () => {
      const result = await executeDealQualifier(makeInput(), { userId: 'test-user' });

      // Should contain at least one score label
      expect(
        result.formatted_output.includes('Exzellent') ||
        result.formatted_output.includes('Gut') ||
        result.formatted_output.includes('Akzeptabel') ||
        result.formatted_output.includes('Schwach')
      ).toBe(true);
    });
  });

  describe('error handling', () => {
    it('handles empty listing_ids gracefully', async () => {
      const result = await executeDealQualifier(makeInput({
        listing_ids: [],
      }), { userId: 'test-user' });

      expect(result.formatted_output).toContain('keine');
    });

    it('handles listings not found in DB', async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      const result = await executeDealQualifier(makeInput({
        listing_ids: ['nonexistent'],
      }), { userId: 'test-user' });

      expect(result.evaluations).toHaveLength(0);
    });
  });
});
```

### 12.7 Test-Datei: `pipeline-sync.spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executePipelineSync, type PipelineSyncInput } from '@/lib/agents/property-sentinel/tools/pipeline-sync';

function makeInput(overrides: Partial<PipelineSyncInput> = {}): PipelineSyncInput {
  return {
    profile_id: 'mock-profile-id',
    ...overrides,
  };
}

describe('pipeline_sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('push flow', () => {
    it('pushes qualified listings to pipeline', async () => {
      const result = await executePipelineSync(makeInput({
        min_score: 60,
      }), { userId: 'test-user' });

      expect(result.pushed).toBeGreaterThanOrEqual(0);
    });

    it('skips already-pushed listings', async () => {
      // Listing already has pushed_to_pipeline = true
      mockDb.returning.mockResolvedValueOnce([{
        id: 'l1',
        score: 80,
        pushed_to_pipeline: true,
      }]);

      const result = await executePipelineSync(makeInput(), { userId: 'test-user' });

      expect(result.skipped).toBeGreaterThanOrEqual(0);
    });

    it('respects min_score filter', async () => {
      const result = await executePipelineSync(makeInput({
        min_score: 90,
      }), { userId: 'test-user' });

      // Only listings >= 90 should be pushed
      expect(result.formatted_output.length).toBeGreaterThan(0);
    });

    it('pushes specific listing_ids when provided', async () => {
      const result = await executePipelineSync(makeInput({
        listing_ids: ['l1', 'l2'],
      }), { userId: 'test-user' });

      expect(result.formatted_output.length).toBeGreaterThan(0);
    });
  });

  describe('notification', () => {
    it('sends notification when notify=true', async () => {
      const result = await executePipelineSync(makeInput({
        notify: true,
      }), { userId: 'test-user' });

      expect(result.formatted_output).toContain('Benachrichtigung');
    });
  });

  describe('formatted output', () => {
    it('includes push count and average score', async () => {
      const result = await executePipelineSync(makeInput(), { userId: 'test-user' });

      expect(result.formatted_output.length).toBeGreaterThan(50);
    });
  });

  describe('error handling', () => {
    it('handles missing profile gracefully', async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      const result = await executePipelineSync(makeInput({
        profile_id: 'nonexistent',
      }), { userId: 'test-user' });

      expect(result.formatted_output).toContain('nicht gefunden');
    });

    it('handles missing pipeline_id on profile', async () => {
      mockDb.returning.mockResolvedValueOnce([{
        id: 'p1',
        pipeline_id: null,
        auto_pipeline: false,
      }]);

      const result = await executePipelineSync(makeInput(), { userId: 'test-user' });

      expect(result.formatted_output).toContain('Pipeline');
    });
  });
});
```

### 12.8 Test-Datei: `firecrawl-service.spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FirecrawlService } from '@/lib/agents/property-sentinel/services/FirecrawlService';

describe('FirecrawlService', () => {
  let service: FirecrawlService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FirecrawlService();
  });

  describe('scrapeListPage', () => {
    it('returns parsed listings for valid URL', async () => {
      const result = await service.scrapeListPage(
        'https://www.immobilienscout24.de/Suche/de/berlin/wohnung-kauf',
        'immoscout24',
      );

      expect(result.listings).toBeDefined();
      expect(result.listings.length).toBeGreaterThan(0);
    });

    it('returns empty array for failed scrape', async () => {
      // Mock failure
      const result = await service.scrapeListPage(
        'https://invalid-url.test',
        'immoscout24',
      );

      expect(result.listings).toHaveLength(0);
    });

    it('uses cached result when available', async () => {
      mockRedis.get.mockResolvedValueOnce(JSON.stringify({
        listings: [{ title: 'Cached Listing', price: 100000 }],
      }));

      const result = await service.scrapeListPage(
        'https://www.immobilienscout24.de/Suche/de/berlin/wohnung-kauf',
        'immoscout24',
      );

      expect(result.listings[0].title).toBe('Cached Listing');
    });
  });

  describe('scrapeDetailPage', () => {
    it('returns property details for valid URL', async () => {
      const result = await service.scrapeDetailPage(
        'https://www.immobilienscout24.de/expose/132456789',
        'immoscout24',
      );

      expect(result).toBeDefined();
    });
  });

  describe('rate limiting', () => {
    it('enforces max concurrent requests', async () => {
      // Fire 5 requests simultaneously
      const promises = Array.from({ length: 5 }, (_, i) =>
        service.scrapeListPage(`https://example.com/page-${i}`, 'immoscout24'),
      );

      // All should complete (rate limiter queues them)
      const results = await Promise.all(promises);
      expect(results.length).toBe(5);
    });
  });

  describe('circuit breaker', () => {
    it('trips after consecutive failures', async () => {
      // Simulate 5 consecutive failures
      for (let i = 0; i < 5; i++) {
        await service.scrapeListPage('https://failing-url.test', 'immoscout24')
          .catch(() => {});
      }

      // Next call should be blocked by circuit breaker
      const result = await service.scrapeListPage(
        'https://www.immobilienscout24.de/Suche/de/berlin/wohnung-kauf',
        'immoscout24',
      );

      expect(result.listings).toHaveLength(0);
    });
  });

  describe('credit tracking', () => {
    it('increments credit counter on scrape', async () => {
      await service.scrapeListPage(
        'https://www.immobilienscout24.de/Suche/de/berlin/wohnung-kauf',
        'immoscout24',
      );

      expect(mockRedis.incr).toHaveBeenCalled();
    });
  });

  describe('retry logic', () => {
    it('retries on transient failure', async () => {
      // First call fails, second succeeds
      // Handled internally by withRetry
      const result = await service.scrapeListPage(
        'https://www.immobilienscout24.de/Suche/de/berlin/wohnung-kauf',
        'immoscout24',
      );

      expect(result).toBeDefined();
    });
  });
});
```

### 12.9 Test-Datei: `portal-url-generator.spec.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { generatePortalUrl } from '@/lib/agents/property-sentinel/services/PortalUrlGenerator';
import type { SearchCriteria } from '@/lib/agents/property-sentinel/config';

function makeCriteria(overrides: Partial<SearchCriteria> = {}): SearchCriteria {
  return {
    location: { city: 'Berlin', plz: '10115' },
    property_type: 'wohnung',
    purchase_type: 'kauf',
    price_min: 100000,
    price_max: 400000,
    area_min: 50,
    rooms_min: 2,
    ...overrides,
  };
}

describe('PortalUrlGenerator', () => {
  describe('ImmoScout24', () => {
    it('generates valid search URL', () => {
      const url = generatePortalUrl('immoscout24', makeCriteria());
      expect(url).toContain('immobilienscout24.de');
      expect(url).toContain('wohnung');
      expect(url).toContain('kauf');
    });

    it('includes price filter params', () => {
      const url = generatePortalUrl('immoscout24', makeCriteria({
        price_min: 200000,
        price_max: 500000,
      }));
      expect(url).toContain('200000');
      expect(url).toContain('500000');
    });

    it('includes area filter', () => {
      const url = generatePortalUrl('immoscout24', makeCriteria({ area_min: 60 }));
      expect(url).toContain('60');
    });

    it('includes rooms filter', () => {
      const url = generatePortalUrl('immoscout24', makeCriteria({ rooms_min: 3 }));
      expect(url).toContain('3');
    });

    it('generates page 2 URL', () => {
      const url = generatePortalUrl('immoscout24', makeCriteria(), 2);
      expect(url).toContain('pagenumber=2');
    });
  });

  describe('Immowelt', () => {
    it('generates valid search URL', () => {
      const url = generatePortalUrl('immowelt', makeCriteria());
      expect(url).toContain('immowelt.de');
    });

    it('includes price range', () => {
      const url = generatePortalUrl('immowelt', makeCriteria({
        price_min: 150000,
        price_max: 350000,
      }));
      expect(url).toContain('150000');
      expect(url).toContain('350000');
    });
  });

  describe('Kleinanzeigen', () => {
    it('generates valid search URL', () => {
      const url = generatePortalUrl('kleinanzeigen', makeCriteria());
      expect(url).toContain('kleinanzeigen.de');
    });

    it('uses correct category ID', () => {
      const url = generatePortalUrl('kleinanzeigen', makeCriteria({
        property_type: 'wohnung',
        purchase_type: 'kauf',
      }));
      expect(url).toContain('196');  // wohnung_kauf category
    });

    it('uses Miete category for rental', () => {
      const url = generatePortalUrl('kleinanzeigen', makeCriteria({
        purchase_type: 'miete',
      }));
      expect(url).toContain('203');  // wohnung_miete category
    });
  });

  describe('error cases', () => {
    it('throws for unknown portal', () => {
      expect(() => generatePortalUrl('zillow' as any, makeCriteria())).toThrow();
    });

    it('handles missing optional criteria', () => {
      const url = generatePortalUrl('immoscout24', {
        location: { city: 'Berlin' },
        property_type: 'wohnung',
        purchase_type: 'kauf',
      } as SearchCriteria);

      expect(url).toContain('immobilienscout24.de');
    });
  });
});
```

### 12.10 Test-Datei: `listing-parser.spec.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  extractPortalId,
  normalizePrice,
  normalizeArea,
  extractCity,
  extractPlz,
} from '@/lib/agents/property-sentinel/services/ListingParser';

describe('ListingParser', () => {
  describe('extractPortalId', () => {
    it('extracts ImmoScout24 expose ID', () => {
      expect(extractPortalId(
        'https://www.immobilienscout24.de/expose/132456789',
        'immoscout24',
      )).toBe('132456789');
    });

    it('extracts Immowelt expose ID', () => {
      expect(extractPortalId(
        'https://www.immowelt.de/expose/abc123def',
        'immowelt',
      )).toBe('abc123def');
    });

    it('extracts Kleinanzeigen listing ID', () => {
      expect(extractPortalId(
        'https://www.kleinanzeigen.de/s-anzeige/1234567890',
        'kleinanzeigen',
      )).toBe('1234567890');
    });

    it('returns null for invalid URL', () => {
      expect(extractPortalId('https://example.com/invalid', 'immoscout24')).toBeNull();
    });

    it('returns null for unknown portal', () => {
      expect(extractPortalId('https://example.com/123', 'zillow' as any)).toBeNull();
    });
  });

  describe('normalizePrice', () => {
    it('parses plain number', () => {
      expect(normalizePrice('289000')).toBe(289000);
    });

    it('removes EUR symbol', () => {
      expect(normalizePrice('289.000 €')).toBe(289000);
    });

    it('removes dots as thousand separators', () => {
      expect(normalizePrice('1.250.000')).toBe(1250000);
    });

    it('handles comma as decimal separator', () => {
      expect(normalizePrice('289.000,50')).toBe(289000.5);
    });

    it('removes VB marker', () => {
      expect(normalizePrice('289.000 VB')).toBe(289000);
    });

    it('removes VHB marker', () => {
      expect(normalizePrice('289.000 VHB')).toBe(289000);
    });

    it('returns 0 for "Preis auf Anfrage"', () => {
      expect(normalizePrice('Preis auf Anfrage')).toBe(0);
    });

    it('returns 0 for empty string', () => {
      expect(normalizePrice('')).toBe(0);
    });

    it('returns 0 for null/undefined', () => {
      expect(normalizePrice(null as any)).toBe(0);
      expect(normalizePrice(undefined as any)).toBe(0);
    });
  });

  describe('normalizeArea', () => {
    it('parses plain number', () => {
      expect(normalizeArea('78')).toBe(78);
    });

    it('removes m² suffix', () => {
      expect(normalizeArea('78 m²')).toBe(78);
    });

    it('handles comma decimal', () => {
      expect(normalizeArea('78,5 m²')).toBe(78.5);
    });

    it('handles "qm" suffix', () => {
      expect(normalizeArea('78 qm')).toBe(78);
    });

    it('returns 0 for empty string', () => {
      expect(normalizeArea('')).toBe(0);
    });
  });

  describe('extractCity', () => {
    it('extracts city from "City" format', () => {
      expect(extractCity('Berlin')).toBe('Berlin');
    });

    it('extracts city from "PLZ City" format', () => {
      expect(extractCity('10115 Berlin')).toBe('Berlin');
    });

    it('extracts city from "Strasse, PLZ City" format', () => {
      expect(extractCity('Oranienstr. 45, 10969 Berlin')).toBe('Berlin');
    });

    it('extracts city from "City-District" format', () => {
      expect(extractCity('Berlin-Kreuzberg')).toBe('Berlin');
    });
  });

  describe('extractPlz', () => {
    it('extracts 5-digit PLZ', () => {
      expect(extractPlz('10115 Berlin')).toBe('10115');
    });

    it('extracts PLZ from full address', () => {
      expect(extractPlz('Oranienstr. 45, 10969 Berlin')).toBe('10969');
    });

    it('returns null when no PLZ found', () => {
      expect(extractPlz('Berlin')).toBeNull();
    });
  });
});
```

### 12.11 Test-Ausfuehrung

```bash
# Alle Property Sentinel Tests ausfuehren
npx vitest run tests/unit/agents/property-sentinel/

# Einzelne Test-Datei ausfuehren
npx vitest run tests/unit/agents/property-sentinel/config.spec.ts

# Mit Coverage
npx vitest run tests/unit/agents/property-sentinel/ --coverage

# Watch-Mode fuer Entwicklung
npx vitest watch tests/unit/agents/property-sentinel/
```

### 12.12 Coverage-Ziele

```
┌────────────────────────────────┬───────────┬───────────────┐
│ Datei                          │ Ziel      │ Kritisch?     │
├────────────────────────────────┼───────────┼───────────────┤
│ config.ts                      │ > 95%     │ Ja            │
│ tools/search-manager.ts        │ > 90%     │ Ja            │
│ tools/market-radar.ts          │ > 85%     │ Ja            │
│ tools/deal-qualifier.ts        │ > 85%     │ Ja            │
│ tools/pipeline-sync.ts         │ > 90%     │ Nein          │
│ services/FirecrawlService.ts   │ > 80%     │ Ja            │
│ services/PortalUrlGenerator.ts │ > 95%     │ Ja            │
│ services/ListingParser.ts      │ > 95%     │ Ja            │
│ tools/tool-executor.ts         │ > 90%     │ Ja            │
│ tools/index.ts                 │ > 95%     │ Nein          │
├────────────────────────────────┼───────────┼───────────────┤
│ Gesamt                         │ > 85%     │               │
└────────────────────────────────┴───────────┴───────────────┘
```

---

## 13. Phased Roadmap

### 13.1 Uebersicht

```
Implementierungs-Roadmap Property Sentinel
═══════════════════════════════════════════

Phase 1 ─ MVP (Minimal Viable Product)
  Ziel:     1 Portal, manueller Scan, Chat-Integration
  Umfang:   ~2500 Zeilen Produktionscode
  Dauer:    Sprint 1-2

Phase 2 ─ Full Automation
  Ziel:     Alle 3 Portale, BullMQ Scheduling, Pipeline-Sync
  Umfang:   ~1500 Zeilen Produktionscode
  Dauer:    Sprint 3-4

Phase 3 ─ Dashboard & Intelligence
  Ziel:     Volles Dashboard UI, Preis-Tracking, KI-Sourcing
  Umfang:   ~2000 Zeilen Produktionscode
  Dauer:    Sprint 5-6

Phase 4 ─ Enterprise
  Ziel:     Custom Portale, Team Features, Webhooks
  Umfang:   ~1000 Zeilen Produktionscode
  Dauer:    Sprint 7-8
```

### 13.2 Phase 1 — MVP (~2500 Zeilen)

**Ziel:** Ein funktionsfaehiger Property Sentinel, der ueber den Chat ImmoScout24 durchsuchen, Listings bewerten und dem User praesentieren kann.

```
Phase 1 Scope:
──────────────

1. Database Schema (alle 3 Tabellen)
   ├── sentinel_search_profiles
   ├── sentinel_seen_listings
   └── sentinel_scan_logs
   Datei: lib/db/schema-sentinel.ts (~120 Zeilen)
   Migration: drizzle/migrations/add_sentinel_tables.sql

2. Config & Constants
   Datei: lib/agents/property-sentinel/config.ts (~200 Zeilen)
   - SENTINEL_CONFIG, FIRECRAWL_CONFIG, PORTAL_CONFIG
   - Nur ImmoScout24 Portal aktiv (andere vorbereitet)
   - RED_FLAGS, SCORING_CONFIG
   - FREQUENCY_PRESETS (nur fuer spaeter, manueller Scan)

3. System Prompt
   Datei: lib/agents/prompts.ts (Eintrag 'property-sentinel' hinzufuegen)
   - Deutsche Persona
   - Tool-Nutzungsinstruktionen
   - Investment Disclaimer

4. Tool: search_manager (eingeschraenkt)
   Datei: lib/agents/property-sentinel/tools/search-manager.ts (~250 Zeilen)
   - Nur: create, list, delete, stats
   - Kein BullMQ-Scheduling (kommt Phase 2)
   - Profil erstellen → DB speichern, fertig

5. Tool: market_radar
   Datei: lib/agents/property-sentinel/tools/market-radar.ts (~400 Zeilen)
   - Nur ImmoScout24
   - Firecrawl List-Scrape + Detail-Scrape
   - Dedup via ON CONFLICT
   - Budget Guard (Credits pruefen)
   - Manueller Aufruf via Chat

6. Tool: deal_qualifier
   Datei: lib/agents/property-sentinel/tools/deal-qualifier.ts (~350 Zeilen)
   - Volle KI-Bewertung (4 Kategorien, Red Flags)
   - Batch-Verarbeitung (5 pro Call)
   - Scoring-Ergebnis in DB speichern

7. Tool: pipeline_sync (Basis)
   Datei: lib/agents/property-sentinel/tools/pipeline-sync.ts (~200 Zeilen)
   - Push qualifizierte Listings zur Pipeline
   - Duplikat-Pruefung (pushed_to_pipeline Flag)
   - Keine Notification (kommt Phase 2)

8. Tool Executor + Index
   Datei: lib/agents/property-sentinel/tools/tool-executor.ts (~200 Zeilen)
   Datei: lib/agents/property-sentinel/tools/index.ts (~60 Zeilen)

9. Services
   Datei: lib/agents/property-sentinel/services/FirecrawlService.ts (~300 Zeilen)
   - Singleton mit Firecrawl SDK
   - Rate Limiting (Token Bucket)
   - Redis Caching (List + Detail Pages)
   - Retry Logic (withRetry, 3 Versuche)
   - Circuit Breaker (5 Fehler → Trip)
   - Credit Tracking (Redis Counter)

   Datei: lib/agents/property-sentinel/services/PortalUrlGenerator.ts (~100 Zeilen)
   - Nur ImmoScout24 URL-Builder

   Datei: lib/agents/property-sentinel/services/ListingParser.ts (~150 Zeilen)
   - ID-Extraktion (ImmoScout24 Regex)
   - Preis-Normalisierung
   - Flaeche-Normalisierung

10. Chat Route Integration
    Datei: app/api/agents/[id]/chat/route.ts (7 Aenderungen)
    - Import, Flag, isAgenticAgent, Tool-Selektion, Executor, Display, maxToolCalls

11. Persona Update
    Datei: lib/agents/personas.ts (status: 'beta' → behalten)

Phase 1 Dateien:
  lib/agents/property-sentinel/config.ts
  lib/agents/property-sentinel/tools/index.ts
  lib/agents/property-sentinel/tools/tool-executor.ts
  lib/agents/property-sentinel/tools/search-manager.ts
  lib/agents/property-sentinel/tools/market-radar.ts
  lib/agents/property-sentinel/tools/deal-qualifier.ts
  lib/agents/property-sentinel/tools/pipeline-sync.ts
  lib/agents/property-sentinel/services/FirecrawlService.ts
  lib/agents/property-sentinel/services/PortalUrlGenerator.ts
  lib/agents/property-sentinel/services/ListingParser.ts
  lib/db/schema-sentinel.ts
  drizzle/migrations/add_sentinel_tables.sql

Aenderungen an bestehenden Dateien:
  lib/agents/prompts.ts (neuer Eintrag)
  app/api/agents/[id]/chat/route.ts (7 Integration Points)
```

**Akzeptanzkriterien Phase 1:**

```
✅ User kann im Chat ein Suchprofil erstellen:
   "Erstelle ein Suchprofil fuer 2-Zimmer-Wohnungen in Berlin, 100k-300k"

✅ User kann manuell scannen:
   "Scanne ImmoScout24 fuer mein Profil"

✅ Listings werden dedupliziert (kein doppelter Import)

✅ User kann Listings bewerten lassen:
   "Bewerte die neuen Listings"

✅ KI-Score (0-100) wird pro Listing gespeichert

✅ User kann qualifizierte Deals zur Pipeline pushen:
   "Push alle Deals ueber 70 Punkte zur Pipeline"

✅ Budget Guard verhindert exzessive Firecrawl-Nutzung

✅ Circuit Breaker schuetzt bei Portal-Ausfaellen

✅ Alle Unit Tests bestehen (config, tools, services)
```

### 13.3 Phase 2 — Full Automation (~1500 Zeilen)

```
Phase 2 Scope:
──────────────

1. Alle 3 Portale aktivieren
   - Immowelt URL-Builder + ID-Regex
   - Kleinanzeigen URL-Builder + ID-Regex + Kategorie-Mapping
   - Erweiterung PortalUrlGenerator.ts (+100 Zeilen)
   - Erweiterung ListingParser.ts (+80 Zeilen)

2. BullMQ Scheduling
   Datei: server/lib/sentinel-queue.ts (~150 Zeilen)
   - Queue Definition: 'sentinel-scan'
   - scheduleSentinelProfile(), unscheduleSentinelProfile()
   - triggerManualScan()
   - getSentinelQueueStats()

   Datei: workers/sentinel-scan-worker.ts (~300 Zeilen)
   - Worker mit Concurrency 2
   - scanSingleProfile() Algorithmus
   - Error-Handling: Portal-Level Fehler → Continue
   - Progress Reporting

3. search_manager erweitern
   - pause/resume Aktionen
   - update Aktion
   - BullMQ Integration: create → schedule, delete → unschedule
   (+100 Zeilen zu search-manager.ts)

4. API Routes
   Datei: app/api/sentinel/profiles/route.ts (~150 Zeilen)
   Datei: app/api/sentinel/profiles/[id]/route.ts (~200 Zeilen)
   Datei: app/api/sentinel/scan/[profileId]/route.ts (~80 Zeilen)
   Datei: app/api/sentinel/listings/route.ts (~150 Zeilen)
   Datei: app/api/sentinel/stats/route.ts (~80 Zeilen)

5. pipeline_sync erweitern
   - Socket.IO Notification bei Push
   - Auto-Pipeline Toggle respektieren
   (+50 Zeilen zu pipeline-sync.ts)

6. Stale Detection
   - market_radar: Listings die 14+ Tage nicht gesehen → stale markieren
   - Purge nach 90 Tagen
   (+30 Zeilen zu market-radar.ts)

Phase 2 Akzeptanzkriterien:
  ✅ Scans laufen automatisch per Cron (hourly/daily/etc.)
  ✅ Alle 3 Portale werden gescannt
  ✅ Budget Guard stoppt bei Tageslimit
  ✅ API Routes funktionieren (CRUD Profiles, Listings, Stats)
  ✅ Socket.IO Notification bei neuen Deals
  ✅ Stale Listings werden markiert
```

### 13.4 Phase 3 — Dashboard & Intelligence (~2000 Zeilen)

```
Phase 3 Scope:
──────────────

1. Dashboard UI
   Datei: components/agents/property-sentinel/SentinelDashboard.tsx (~300 Zeilen)
   - Stats-Row, Profile-Cards, Recent Deals
   - Glasmorphism-Design (matching existing UI)

   Datei: components/agents/property-sentinel/ProfileCreator.tsx (~250 Zeilen)
   - 3-Step Wizard: Location → Criteria → Config

   Datei: components/agents/property-sentinel/ListingGrid.tsx (~200 Zeilen)
   - Grid/List Toggle, Sortierung, Filter

   Datei: components/agents/property-sentinel/DealCard.tsx (~150 Zeilen)
   - Score-Breakdown Bars, Risk Badges, Financial Summary

   Datei: components/agents/property-sentinel/ScanTimeline.tsx (~100 Zeilen)
   - Timeline der letzten Scans

2. Zustand Store
   Datei: store/slices/createSentinelSlice.ts (~200 Zeilen)
   - profiles, listings, scanLogs, dashboardStats
   - fetchProfiles, createProfile, triggerScan, fetchListings

3. Preis-Tracking (Price Change Detection)
   - Bei Re-Scan: Preis vergleichen mit gespeichertem Preis
   - price_changed Flag + price_history JSONB Array
   - Notification bei Preisaenderung
   (+100 Zeilen verteilt auf market-radar + DealCard)

4. KI-Sourcing (Proaktive Vorschlaege)
   - Agent schlaegt Listings vor, die ausserhalb der Suchkriterien liegen
     aber hohes Potenzial haben (z.B. unterbewertete Immobilie in Nachbar-PLZ)
   - Separater "KI-Empfehlungen" Bereich im Dashboard
   (+200 Zeilen: neues Tool oder Erweiterung deal_qualifier)

5. Export
   - CSV Export qualifizierter Deals
   - PDF Einzelbericht pro Deal (Score-Breakdown, Finanzanalyse)
   (+150 Zeilen: API Route + Hilfsfunktionen)

Phase 3 Akzeptanzkriterien:
  ✅ Vollstaendiges Dashboard mit allen 5 Komponenten
  ✅ Profile erstellen/verwalten ueber UI (nicht nur Chat)
  ✅ Listings filtern, sortieren, Grid/List Toggle
  ✅ Preisaenderungen werden erkannt und angezeigt
  ✅ CSV Export funktioniert
```

### 13.5 Phase 4 — Enterprise (~1000 Zeilen)

```
Phase 4 Scope:
──────────────

1. Custom Portal Adapters
   - User kann eigene Portal-URLs konfigurieren
   - Generic Scraping mit benutzerdefinierten Zod-Schemas
   - Admin-UI fuer Portal-Konfiguration
   (~300 Zeilen)

2. Team Features
   - Shared Profiles (mehrere User pro Profil)
   - Deal Assignment (User A weist Deal an User B zu)
   - Workspace-Level Budget (statt pro User)
   (~250 Zeilen)

3. Budget Management
   - Workspace-Admin kann Tages-/Monats-Budget setzen
   - Budget-Dashboard mit Verbrauchshistorie
   - Alert bei 80% Budget-Verbrauch
   (~200 Zeilen)

4. Webhook Notifications
   - Webhook-URL pro Profil konfigurierbar
   - Payload: Neue Listings, Score-Updates, Preisaenderungen
   - Retry mit Exponential Backoff
   (~150 Zeilen)

5. API Rate Limiting per Tier
   - Free: 1 Profil, 1 Portal, daily Scan
   - Pro: 5 Profile, 3 Portale, hourly Scan
   - Enterprise: Unlimited, Custom Portale, Webhooks
   (~100 Zeilen)

Phase 4 Akzeptanzkriterien:
  ✅ Custom Portal Adapter konfigurierbar
  ✅ Team-Zuweisung von Deals funktioniert
  ✅ Budget-Dashboard zeigt Verbrauch
  ✅ Webhook Notifications werden zuverlaessig zugestellt
  ✅ Rate Limiting per Tier durchgesetzt
```

### 13.6 Gesamtuebersicht

```
┌─────────┬──────────────────────┬─────────────┬──────────────┬────────────────┐
│ Phase   │ Fokus                │ Code-Zeilen │ Test-Zeilen  │ Neue Dateien   │
├─────────┼──────────────────────┼─────────────┼──────────────┼────────────────┤
│ Phase 1 │ MVP (1 Portal, Chat) │ ~2500       │ ~800         │ 12             │
│ Phase 2 │ Full Automation      │ ~1500       │ ~400         │ 6              │
│ Phase 3 │ Dashboard & KI       │ ~2000       │ ~300         │ 7              │
│ Phase 4 │ Enterprise           │ ~1000       │ ~200         │ 5              │
├─────────┼──────────────────────┼─────────────┼──────────────┼────────────────┤
│ Gesamt  │                      │ ~7000       │ ~1700        │ 30             │
└─────────┴──────────────────────┴─────────────┴──────────────┴────────────────┘

Kumulativer Fortschritt:
  Nach Phase 1: MVP funktionsfaehig (Chat-basiert)
  Nach Phase 2: Volle Automatisierung (laeuft autonom)
  Nach Phase 3: Professionelles Dashboard (visuell)
  Nach Phase 4: Enterprise-Ready (Team, Custom, Webhooks)
```

---

## 14. Edge Cases & Error Recovery

### 14.1 Listing-Lifecycle Edge Cases

#### Edge Case 1: Listing geloescht waehrend Monitoring

```
Szenario:
  Ein Listing ist auf ImmoScout24 nicht mehr verfuegbar (verkauft, zurueckgezogen).

Erkennung:
  - market_radar scrapt Listenpage → Listing nicht mehr in Ergebnissen
  - Detail-Scrape liefert 404 oder leere Seite

Behandlung:
  1. Listing wird NICHT sofort geloescht
  2. `last_seen_at` wird nicht aktualisiert
  3. Nach SENTINEL_CONFIG.staleThresholdDays (14 Tage):
     - `is_stale = true` gesetzt
     - formatted_output zeigt "Nicht mehr verfuegbar" Hinweis
  4. Nach SENTINEL_CONFIG.purgeThresholdDays (90 Tage):
     - Listing wird aus DB geloescht (Hard Delete)
  5. Bereits zur Pipeline gepushte Listings bleiben in Pipeline (kein Rueckruf)

Pseudocode:
  if (listing.last_seen_at < now() - 14 days) {
    update listing SET is_stale = true;
  }
  if (listing.last_seen_at < now() - 90 days) {
    delete from sentinel_seen_listings WHERE id = listing.id;
  }
```

#### Edge Case 2: Preisaenderung waehrend Beobachtung

```
Szenario:
  Listing hatte Preis 289.000 EUR, jetzt 269.000 EUR (Preissenkung).

Erkennung:
  - market_radar scrapt Detail-Page → neuer Preis weicht ab
  - Vergleich: detail_data.price !== gespeicherter price_cents

Behandlung:
  1. price_cents im Listing aktualisieren
  2. price_changed = true Flag setzen
  3. Alten Preis in detail_data.price_history[] Array anhaengen:
     { price: 289000, date: '2026-02-15' }
  4. Re-Scoring ausloesen (deal_qualifier erneut aufrufen)
     → Neuer Score reflektiert den geaenderten Preis
  5. Notification an User: "Preisaenderung: Listing X von 289k auf 269k"
  6. formatted_output zeigt Preisverlauf

JSONB Update:
  detail_data = jsonb_set(
    detail_data,
    '{price_history}',
    detail_data->'price_history' || '[{"price": 289000, "date": "2026-02-15"}]'
  )
```

#### Edge Case 3: Listing mit fehlendem Preis

```
Szenario:
  Portal zeigt "Preis auf Anfrage" statt eines Preises.

Behandlung:
  1. Listing wird trotzdem gespeichert (price_cents = 0)
  2. ListingParser.normalizePrice("Preis auf Anfrage") → 0
  3. deal_qualifier erhaelt Hinweis: "Preis nicht bekannt"
  4. Scoring-Anpassung:
     - Preis-Leistung Kategorie: 0 Punkte (nicht bewertbar)
     - Gesamtscore maximal 75 (3 × 25)
     - Warning: "Preis nicht angegeben — Kontakt zum Anbieter erforderlich"
  5. formatted_output zeigt "Preis auf Anfrage" statt "0 EUR"
```

### 14.2 Portal-Scraping Edge Cases

#### Edge Case 4: Portal Layout-Aenderung

```
Szenario:
  ImmoScout24 aendert HTML-Struktur → Firecrawl Zod-Extraction schlaegt fehl.

Erkennung:
  - Firecrawl scrapeUrl() gibt success: true aber extract: null/partial
  - Zod parse Fehler bei Validierung der Ergebnisse

Behandlung:
  1. Fehler loggen: portal_status = 'degraded'
  2. Fallback-Strategie:
     a. Versuche vereinfachtes Zod-Schema (nur title + price + url)
     b. Falls auch das fehlschlaegt → portal_status = 'error'
  3. Scan-Log dokumentiert: portals_scanned[i].error_message = 'Extraction schema mismatch'
  4. Andere Portale werden weiterhin gescannt (kein Abbruch)
  5. KEIN automatischer Schema-Fix — erfordert manuellen Code-Update
  6. formatted_output: "ImmoScout24: Datenextraktion eingeschraenkt, [X] Listings teilweise geladen"

Circuit Breaker Eskalation:
  - 5 aufeinanderfolgende 'degraded' Scans → Circuit Breaker Trip
  - Portal wird 5 Minuten pausiert (circuitBreakerRecoveryMs)
  - Danach Half-Open: 1 Test-Scrape → bei Erfolg schliessen, bei Fehler erneut oeffnen
```

#### Edge Case 5: Portal Captcha / IP-Block

```
Szenario:
  Portal erkennt Bot-Zugriff und zeigt Captcha oder blockiert IP.

Erkennung:
  - Firecrawl gibt success: false mit spezifischem Error
  - Oder: success: true aber extract enthalt Captcha-Marker ("Bitte bestaetigen Sie...")

Behandlung:
  1. Firecrawl handhabt Captcha-Losung intern (JS-Rendering, Headless-Browser)
  2. Falls persistent: Circuit Breaker Trip nach 5 Fehlern
  3. User-Notification: "Portal [X] voruebergehend nicht erreichbar"
  4. Automatische Erholung nach circuitBreakerRecoveryMs (5 Min)
  5. Bei persistentem Block (> 1 Stunde): Admin-Alert
```

#### Edge Case 6: Netzwerkfehler mid-Scan

```
Szenario:
  Internetverbindung bricht waehrend eines Scans ab.

Behandlung:
  1. withRetry() versucht 3x mit Exponential Backoff (1s, 2s, 4s)
  2. Falls alle Retries fehlschlagen: Portal als 'error' markieren
  3. Bereits gescannte Portale behalten ihre Ergebnisse
  4. BullMQ Worker: Job faellt in Retry (2 Versuche, 60s Backoff)
  5. Scan-Log: status = 'partial', portals_scanned zeigt Teilerfolge
  6. Naechster regulaerer Scan holt verpasste Daten nach
```

### 14.3 Budget & Resource Edge Cases

#### Edge Case 7: Budget-Erschoepfung mid-Scan

```
Szenario:
  User hat 495 von 500 Tages-Credits verbraucht. Scan benoetigt ~15 Credits.

Behandlung:
  1. Budget Guard PRUEZT VOR dem Scan: verbleibende Credits >= geschaetzte Kosten?
  2. Falls nicht ausreichend:
     a. Wenn genug fuer mindestens 1 Portal: partielle Ausfuehrung
        - Scanne nur Portale innerhalb des Budgets
        - Ueberspringe Rest mit portal_status = 'skipped (Budget)'
     b. Wenn gar nicht ausreichend: Scan abbrechen
        - formatted_output: "Tageslimit erreicht (495/500 Credits). Naechster Scan morgen."
  3. NICHT mitten im Portal-Scrape abbrechen (atomic per Portal)
  4. paused_until: Setze auf Mitternacht (Budget-Reset)

Pseudocode:
  const remaining = dailyLimit - await getCreditsUsedToday(userId);
  const estimatedCost = portals.length * (listPageCost + avgNewListings * detailPageCost);
  if (remaining < listPageCost) {
    return { error: 'Tageslimit erreicht' };
  }
  // Scan portals until budget exhausted
  for (const portal of portals) {
    if (creditsUsed >= remaining) {
      portalStatus.push({ portal, status: 'skipped', reason: 'Budget' });
      continue;
    }
    // ... scrape
  }
```

#### Edge Case 8: Concurrent Scans fuer gleiches Profil

```
Szenario:
  BullMQ Cron-Job feuert waehrend manueller Scan noch laeuft.

Behandlung:
  1. Redis Scan Lock: REDIS_KEYS.scanLock(profileId)
     - SET NX EX 300 (5 Minuten TTL, nur wenn nicht existiert)
  2. Wenn Lock existiert → Skip Scan: "Scan fuer Profil laeuft bereits"
  3. Lock wird am Ende des Scans geloescht (oder expirt nach 5 Min)
  4. BullMQ: jobId Uniqueness:
     - Repeatable Job Key: `sentinel-scan:${profileId}`
     - Bei add() mit gleicher jobId → Update statt Duplikat

Pseudocode:
  const lockKey = REDIS_KEYS.scanLock(profileId);
  const locked = await redis.set(lockKey, 'scanning', 'NX', 'EX', 300);
  if (!locked) {
    return { formatted_output: 'Scan laeuft bereits fuer dieses Profil.' };
  }
  try {
    // ... perform scan
  } finally {
    await redis.del(lockKey);
  }
```

### 14.4 Data Integrity Edge Cases

#### Edge Case 9: User loescht Profil waehrend aktivem Scan

```
Szenario:
  User loescht Profil per Chat/API waehrend BullMQ Worker den Scan ausfuehrt.

Behandlung:
  1. search_manager delete: Setzt is_active = false (Soft Delete)
  2. Worker PRUEFT vor jedem Portal-Scrape:
     const profile = await db.query(sentinel_search_profiles, { id: profileId });
     if (!profile || !profile.is_active) {
       job.discard();
       return { status: 'cancelled', reason: 'Profile deactivated' };
     }
  3. BullMQ Repeatable Job wird entfernt (removeRepeatableByKey)
  4. Bereits gescrapte Daten bleiben in sentinel_seen_listings
     (gehoeren zum User, nicht zum Profil allein)
```

#### Edge Case 10: Database Connection Loss waehrend Scan

```
Szenario:
  PostgreSQL-Verbindung bricht mitten im Listing-Upsert ab.

Behandlung:
  1. Drizzle ORM wirft Connection Error
  2. market_radar funkt per-Portal try/catch:
     - Ergebnisse des aktuellen Portals gehen verloren
     - Naechstes Portal wird versucht
  3. BullMQ Retry: Job wird nach 60s nochmal versucht (2 Versuche)
  4. Scan-Log: Falls DB wieder erreichbar, wird partial status geschrieben
  5. KEIN Datenverlust: Dedup-Logik stellt sicher, dass bereits gespeicherte
     Listings bei Retry nicht dupliziert werden (ON CONFLICT)
```

#### Edge Case 11: Malformed Portal Response

```
Szenario:
  Firecrawl gibt unerwartete Daten zurueck (missing fields, wrong types).

Behandlung:
  1. Zod-Schema Validierung faengt fehlerhafte Daten ab
  2. Strategie: Skip invalid Listings, continue valid ones
     - Per-Listing try/catch im Parser
     - Fehlerhaftes Listing → log + skip
     - Valide Listings werden normal verarbeitet
  3. Scan-Log: metadata.parse_errors = [{ listing_url, error }]
  4. formatted_output: "[Portal]: [X] Listings geladen, [Y] uebersprungen (Parser-Fehler)"

Pseudocode:
  const validListings: ParsedListing[] = [];
  const parseErrors: ParseError[] = [];

  for (const raw of scrapedListings) {
    try {
      const parsed = listingSchema.parse(raw);
      validListings.push(parsed);
    } catch (err) {
      parseErrors.push({ url: raw.detail_url, error: err.message });
    }
  }
```

### 14.5 Timing & Timezone Edge Cases

#### Edge Case 12: Timezone-Handling

```
Szenario:
  User in Berlin (CET/CEST), Server in UTC.

Behandlung:
  1. Alle Timestamps in DB: UTC (timestamp with time zone)
  2. Profile.timezone: 'Europe/Berlin' (IANA timezone)
  3. BullMQ Cron: Interpretiert cronExpression in Profile.timezone
     - repeat: { cron: '0 8 * * *', tz: 'Europe/Berlin' }
     - → Scan um 8:00 Berliner Zeit, auch bei DST-Wechsel
  4. formatted_output: Zeigt Zeiten in User-Timezone
     - "Naechster Scan: 08:00 MEZ" (nicht UTC)
  5. Sommerzeit-Wechsel:
     - BullMQ tz-Option handelt DST korrekt
     - Kein doppelter oder verpasster Scan beim Uhrenumstellen
```

#### Edge Case 13: Firecrawl API Key abgelaufen

```
Szenario:
  FIRECRAWL_API_KEY ist abgelaufen oder wurde widerrufen.

Erkennung:
  - Firecrawl gibt 401 Unauthorized zurueck
  - withRetry: 401 ist NICHT retryable → sofortiger Abbruch

Behandlung:
  1. Alle Scans stoppen (jeder Firecrawl-Call schlaegt fehl)
  2. Circuit Breaker Trip fuer ALLE Portale gleichzeitig
  3. Error in Scan-Log: "Firecrawl API Key ungueltig"
  4. formatted_output: "Firecrawl-Zugang gestoert. Bitte API-Key pruefen."
  5. Admin-Level Alert (falls Monitoring konfiguriert)
  6. Automatische Recovery: Wenn neuer Key gesetzt wird,
     Circuit Breaker Half-Open → Test-Call → Erfolg → Scans weiterlaufen
```

#### Edge Case 14: Leere Suchergebnisse

```
Szenario:
  Portal gibt 0 Ergebnisse zurueck (zu restriktive Filter, neues Gebiet).

Behandlung:
  1. KEIN Fehler — leere Ergebnisse sind valide
  2. portal_status = 'success', new_count = 0
  3. formatted_output: "Keine neuen Listings auf [Portal] fuer dieses Profil."
  4. Hinweis nach 3 aufeinanderfolgenden leeren Scans:
     "Seit 3 Scans keine Treffer. Suchkriterien ueberpruefen?"
  5. stats.total_scans wird trotzdem inkrementiert
  6. scan_log wird normal geschrieben (total_new: 0)

Intelligenter Hinweis (Phase 3):
  if (profile.consecutive_empty_scans >= 3) {
    warning: "Moechten Sie den Suchradius erweitern oder den Preisrahmen anpassen?"
  }
```

#### Edge Case 15: Profil mit ungueltigen Kriterien

```
Szenario:
  User erstellt Profil mit price_min > price_max, oder PLZ existiert nicht.

Behandlung:
  1. Validation bei Profil-Erstellung (search_manager create):
     - price_min < price_max → Fehler wenn verletzt
     - area_min < area_max → Fehler wenn verletzt
     - rooms_min < rooms_max → Fehler wenn verletzt
     - PLZ Format: /^\d{5}$/ → Fehler bei ungueltigem Format
     - Mindestens 1 Portal ausgewaehlt
     - property_type muss von Portal unterstuetzt werden
  2. Spezifische Fehlermeldungen:
     - "Mindestpreis (400.000) ist hoeher als Hoechstpreis (300.000)"
     - "PLZ '999' ist ungueltig (5 Ziffern erforderlich)"
  3. Profil wird NICHT erstellt bei Validierungsfehler
  4. formatted_output zeigt alle Validierungsfehler auf einmal
     (nicht nur den ersten — User soll alle Probleme sehen)

Validation Pseudocode:
  const errors: string[] = [];
  if (criteria.price_min && criteria.price_max && criteria.price_min > criteria.price_max) {
    errors.push(`Mindestpreis (${criteria.price_min}) > Hoechstpreis (${criteria.price_max})`);
  }
  if (criteria.location?.plz && !/^\d{5}$/.test(criteria.location.plz)) {
    errors.push(`PLZ '${criteria.location.plz}' ungueltig`);
  }
  // ... more validations
  if (errors.length > 0) {
    return { formatted_output: `Validierungsfehler:\n${errors.map(e => `• ${e}`).join('\n')}` };
  }
```

### 14.6 Edge Case Zusammenfassung

```
┌────┬──────────────────────────────┬────────────┬──────────────────────────────────┐
│ #  │ Edge Case                    │ Schwere    │ Behandlung                       │
├────┼──────────────────────────────┼────────────┼──────────────────────────────────┤
│ 1  │ Listing geloescht            │ Normal     │ Stale nach 14d, Purge nach 90d   │
│ 2  │ Preisaenderung               │ Normal     │ Update + Re-Score + History       │
│ 3  │ Kein Preis                   │ Normal     │ Speichern mit 0, Score begrenzt   │
│ 4  │ Portal Layout-Aenderung      │ Hoch       │ Fallback Schema + Circuit Breaker │
│ 5  │ Captcha/IP-Block             │ Hoch       │ Firecrawl intern + Circuit Breaker│
│ 6  │ Netzwerkfehler mid-Scan      │ Mittel     │ withRetry + BullMQ Retry          │
│ 7  │ Budget exhausted mid-Scan    │ Mittel     │ Partieller Scan + Skip Rest       │
│ 8  │ Concurrent Scans             │ Mittel     │ Redis Lock (NX EX)                │
│ 9  │ Profil geloescht mid-Scan    │ Niedrig    │ isActive Check vor jedem Portal   │
│ 10 │ DB Connection Loss           │ Hoch       │ Per-Portal catch + BullMQ Retry   │
│ 11 │ Malformed Response           │ Mittel     │ Per-Listing skip + continue       │
│ 12 │ Timezone / DST               │ Niedrig    │ BullMQ tz Option + IANA Timezone  │
│ 13 │ API Key abgelaufen           │ Kritisch   │ 401 → sofort stoppen + Alert      │
│ 14 │ Leere Suchergebnisse         │ Niedrig    │ Valid result, Hinweis nach 3x     │
│ 15 │ Ungueltige Kriterien         │ Niedrig    │ Validation bei create, alle Error │
└────┴──────────────────────────────┴────────────┴──────────────────────────────────┘
```

---

## 15. File Inventory

### 15.1 Neue Dateien (Produktionscode)

```
lib/agents/property-sentinel/
├── config.ts                                    ~250 Zeilen
├── tools/
│   ├── index.ts                                 ~60 Zeilen
│   ├── tool-executor.ts                         ~220 Zeilen
│   ├── search-manager.ts                        ~350 Zeilen
│   ├── market-radar.ts                          ~500 Zeilen
│   ├── deal-qualifier.ts                        ~400 Zeilen
│   └── pipeline-sync.ts                         ~250 Zeilen
├── services/
│   ├── FirecrawlService.ts                      ~350 Zeilen
│   ├── PortalUrlGenerator.ts                    ~150 Zeilen
│   └── ListingParser.ts                         ~200 Zeilen
└── (prompts added to lib/agents/prompts.ts)     ~80 Zeilen

lib/db/
└── schema-sentinel.ts                           ~120 Zeilen

drizzle/migrations/
└── add_sentinel_tables.sql                      ~60 Zeilen

server/lib/
└── sentinel-queue.ts                            ~150 Zeilen

workers/
└── sentinel-scan-worker.ts                      ~300 Zeilen

app/api/sentinel/
├── profiles/
│   ├── route.ts                                 ~150 Zeilen
│   └── [id]/
│       └── route.ts                             ~200 Zeilen
├── scan/
│   └── [profileId]/
│       └── route.ts                             ~80 Zeilen
├── listings/
│   └── route.ts                                 ~150 Zeilen
└── stats/
    └── route.ts                                 ~80 Zeilen

components/agents/property-sentinel/
├── SentinelDashboard.tsx                        ~300 Zeilen
├── ProfileCreator.tsx                           ~250 Zeilen
├── ListingGrid.tsx                              ~200 Zeilen
├── DealCard.tsx                                 ~150 Zeilen
└── ScanTimeline.tsx                             ~100 Zeilen

store/slices/
└── createSentinelSlice.ts                       ~200 Zeilen
```

### 15.2 Neue Dateien (Tests)

```
tests/unit/agents/property-sentinel/
├── config.spec.ts                               ~200 Zeilen
├── search-manager.spec.ts                       ~250 Zeilen
├── market-radar.spec.ts                         ~300 Zeilen
├── deal-qualifier.spec.ts                       ~250 Zeilen
├── pipeline-sync.spec.ts                        ~180 Zeilen
├── firecrawl-service.spec.ts                    ~250 Zeilen
├── portal-url-generator.spec.ts                 ~200 Zeilen
└── listing-parser.spec.ts                       ~200 Zeilen
```

### 15.3 Bestehende Dateien (Aenderungen)

```
Aenderungen an bestehenden Dateien:
────────────────────────────────────

lib/agents/prompts.ts
  + System Prompt fuer 'property-sentinel' (~80 Zeilen)

lib/agents/personas.ts
  ⊘ Keine Aenderung (Persona bereits registriert, Zeile 280-292)

app/api/agents/[id]/chat/route.ts
  + Import (1 Zeile)
  + isPropertySentinelAgent Flag (1 Zeile)
  + isAgenticAgent Erweiterung (1 Zeile)
  + Tool-Selektion Ternary (1 Zeile)
  + Executor Dispatch (3 Zeilen)
  + Display Name (3 Zeilen)
  + maxToolCalls (1 Zeile)
  = Gesamt: ~11 Zeilen Aenderung
```

### 15.4 Zeilenzaehlung Zusammenfassung

```
Zusammenfassung:
════════════════

Produktionscode:
  lib/agents/property-sentinel/    2730 Zeilen
  lib/db/schema-sentinel.ts          120 Zeilen
  drizzle/migrations/                  60 Zeilen
  server/lib/sentinel-queue.ts        150 Zeilen
  workers/sentinel-scan-worker.ts     300 Zeilen
  app/api/sentinel/                   660 Zeilen
  components/                        1000 Zeilen
  store/slices/                       200 Zeilen
  Bestehende Dateien (Deltas)          92 Zeilen
  ─────────────────────────────────────────────
  Subtotal Produktion:              5312 Zeilen

Tests:
  tests/unit/agents/property-sentinel/ 1830 Zeilen
  ─────────────────────────────────────────────
  Subtotal Tests:                    1830 Zeilen

Planung (dieses Dokument):
  project-planning/agent-39-full-specification.md  ~6900+ Zeilen
  project-planning/agent-39-architecture.md          783 Zeilen (existiert)
  ─────────────────────────────────────────────────────────────
  Subtotal Planung:                               ~7683 Zeilen

  ═════════════════════════════════════════════════════════════
  GRAND TOTAL:                                    ~14825 Zeilen
  ═════════════════════════════════════════════════════════════
```

---

## Anhang A: Abkuerzungsverzeichnis

| Abkuerzung | Bedeutung |
|---|---|
| BGB | Buergerliches Gesetzbuch |
| BullMQ | Bull Message Queue (Redis-basierter Job-Scheduler) |
| CET/CEST | Central European Time / Summer Time |
| CRUD | Create, Read, Update, Delete |
| DB | Datenbank (PostgreSQL) |
| DST | Daylight Saving Time |
| GrESt | Grunderwerbsteuer |
| HITL | Human-in-the-Loop |
| IANA | Internet Assigned Numbers Authority (Timezone DB) |
| KI | Kuenstliche Intelligenz |
| MFH | Mehrfamilienhaus |
| MVP | Minimal Viable Product |
| NK | Nebenkosten |
| ORM | Object-Relational Mapping (Drizzle) |
| PLZ | Postleitzahl |
| QM | Quadratmeter |
| TTL | Time to Live (Cache Expiry) |
| UUID | Universally Unique Identifier |
| WEG | Wohnungseigentuemergemeinschaft |

---

## Anhang B: Referenzen

1. **Firecrawl SDK**: `@mendable/firecrawl-js` — Web Scraping mit Zod-Schema Extraction
2. **BullMQ**: Redis-basierter Job-Scheduler fuer Node.js
3. **Drizzle ORM**: TypeScript ORM fuer PostgreSQL
4. **OpenAI API**: GPT-4o-mini fuer KI-Scoring (gpt-4o-mini)
5. **Zod**: TypeScript-first Schema Validation
6. **Existing Patterns**: Tenant Communicator (Agent 35), Omni Orchestrator, Chat Route Integration

---

*Erstellt: 2026-02-18*
*Letzte Aktualisierung: 2026-02-18*
*Autor: Claude Opus 4.6 + Luis*
*Status: COMPLETE — Bereit fuer Phase 1 Implementierung*
