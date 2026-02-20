# Agent 39: The Property Sentinel — Technical Architecture

> **Status:** Design Document (kein Code)
> **Cluster:** Real Estate & Construction (Vertical)
> **Typ:** Autonomous Continuous Monitoring Agent
> **Autor:** System Architect
> **Datum:** 2026-02-18

---

## 1. Vision & Kern-Loop

Der Property Sentinel ist ein **autonomer Watchdog**. Der Nutzer konfiguriert einmalig ein Suchprofil ("Berlin Mitte, 2-4 Zimmer, >5% Brutto-Rendite, max 400k"). Der Agent wacht dann 6x täglich auf, scannt alle konfigurierten Portale, filtert Duplikate heraus und bewertet nur die **neuen** Treffer per KI. Relevante Deals landen automatisch in der Pipeline.

### Der Loop (Sequenzdiagramm)

```
┌──────────┐     ┌──────────────┐     ┌───────────┐     ┌──────────┐     ┌──────────┐
│ BullMQ   │     │ search_      │     │ market_   │     │ deal_    │     │ pipeline │
│ Cron     │────>│ manager      │────>│ radar     │────>│qualifier │────>│ _sync    │
│ Trigger  │     │ (load        │     │ (scrape + │     │ (KI-     │     │ (DB +    │
│          │     │  profiles)   │     │  dedup)   │     │  Score)  │     │  notify) │
└──────────┘     └──────────────┘     └───────────┘     └──────────┘     └──────────┘
                        │                    │                 │                │
                        v                    v                 v                v
                  ┌──────────┐        ┌──────────┐      ┌──────────┐    ┌──────────┐
                  │ sentinel_│        │ sentinel_│      │ agent_   │    │ workflows│
                  │ search_  │        │ seen_    │      │executions│    │ (pipeline)│
                  │ profiles │        │ listings │      │          │    │          │
                  └──────────┘        └──────────┘      └──────────┘    └──────────┘
```

### Ablauf pro Scan-Zyklus

1. **Trigger** — BullMQ Repeatable Job feuert (alle 4h = 6x/Tag)
2. **Load Profiles** — `search_manager` lädt alle aktiven `sentinel_search_profiles` für den Workspace
3. **Generate URLs** — Pro Profil werden Portal-Such-URLs generiert (ImmobilienScout24, Immowelt, eBay Kleinanzeigen, etc.)
4. **Scrape Liste** — `market_radar` sendet URLs an Firecrawl (`/scrape` oder `/crawl`), extrahiert Listing-Karten (Titel, Preis, Fläche, Link, Portal-ID)
5. **Dedup** — Jedes Listing wird gegen `sentinel_seen_listings` geprüft (Composite Key: `portal + external_id`). Bereits gesehene werden übersprungen.
6. **Scrape Detail** — Nur für **neue** Listings: Firecrawl holt die Detail-Seite (Exposé-Text, Bilder-URLs, Eckdaten)
7. **KI-Bewertung** — `deal_qualifier` sendet Exposé-Daten + Suchkriterien an OpenAI. Output: Relevanz-Score (0-100), Rendite-Schätzung, Risiko-Flags, kurze Begründung
8. **Pipeline Sync** — `pipeline_sync` schreibt Listings mit Score >= Schwellwert in die Pipeline-DB und triggert optional eine Benachrichtigung

---

## 2. Database Schema

### 2.1 `sentinel_search_profiles` (Suchaufträge)

```sql
CREATE TABLE sentinel_search_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  workspace_id    UUID NOT NULL,

  -- Suchkriterien
  name            VARCHAR(255) NOT NULL,          -- "Mein Berlin-Suchprofil"
  location        JSONB NOT NULL,                  -- { city, zip, radius_km, districts[] }
  property_type   VARCHAR(50) NOT NULL DEFAULT 'apartment',  -- apartment | house | commercial | land
  purchase_type   VARCHAR(20) NOT NULL DEFAULT 'buy',        -- buy | rent
  price_min       INTEGER,                         -- in EUR
  price_max       INTEGER,
  area_min        INTEGER,                         -- in m²
  area_max        INTEGER,
  rooms_min       NUMERIC(3,1),
  rooms_max       NUMERIC(3,1),
  yield_min       NUMERIC(5,2),                    -- Mindest-Brutto-Rendite in %
  custom_filters  JSONB DEFAULT '{}',              -- Freie Filter: { balcony: true, garage: true, ... }

  -- Portal-Konfiguration
  portals         TEXT[] NOT NULL DEFAULT '{"immoscout24","immowelt","ebay_kleinanzeigen"}',

  -- Scoring
  min_score       INTEGER NOT NULL DEFAULT 60,     -- Minimum KI-Score für Pipeline-Push (0-100)
  auto_pipeline   BOOLEAN NOT NULL DEFAULT true,   -- Automatisch in Pipeline schieben?
  pipeline_id     UUID,                            -- Ziel-Pipeline (optional)

  -- Scheduling
  frequency       VARCHAR(20) NOT NULL DEFAULT '6x_daily',  -- 6x_daily | 3x_daily | hourly | daily
  cron_expression VARCHAR(100) NOT NULL DEFAULT '0 4,8,11,14,17,21 * * *', -- 6x: 04:00, 08:00, 11:00, 14:00, 17:00, 21:00
  timezone        VARCHAR(50) NOT NULL DEFAULT 'Europe/Berlin',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  paused_until    TIMESTAMP,                       -- Temporäre Pause

  -- Statistik
  total_scans     INTEGER NOT NULL DEFAULT 0,
  total_found     INTEGER NOT NULL DEFAULT 0,
  total_qualified INTEGER NOT NULL DEFAULT 0,
  last_scan_at    TIMESTAMP,
  last_scan_status VARCHAR(20),                    -- success | partial | error
  last_scan_error TEXT,

  -- Meta
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sentinel_profiles_user ON sentinel_search_profiles(user_id);
CREATE INDEX idx_sentinel_profiles_active ON sentinel_search_profiles(is_active) WHERE is_active = true;
CREATE INDEX idx_sentinel_profiles_next_scan ON sentinel_search_profiles(is_active, last_scan_at);
```

### 2.2 `sentinel_seen_listings` (Deduplizierungs-Speicher)

```sql
CREATE TABLE sentinel_seen_listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES sentinel_search_profiles(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,

  -- Identifikation (Composite Unique)
  portal          VARCHAR(50) NOT NULL,            -- immoscout24 | immowelt | ebay_kleinanzeigen
  external_id     VARCHAR(255) NOT NULL,           -- Portal-spezifische Exposé-ID
  listing_url     TEXT NOT NULL,

  -- Extrahierte Daten (Liste)
  title           TEXT,
  price           INTEGER,                         -- EUR
  area_sqm        NUMERIC(8,2),                    -- m²
  rooms           NUMERIC(3,1),
  address_raw     TEXT,                            -- Ungefilterte Adresszeile

  -- Detail-Daten (nach Einzel-Scrape)
  detail_scraped  BOOLEAN NOT NULL DEFAULT false,
  detail_data     JSONB,                           -- Vollständiges Exposé: Beschreibung, Ausstattung, Bilder-URLs, Energieausweis, etc.
  scraped_at      TIMESTAMP,

  -- KI-Bewertung
  ai_scored       BOOLEAN NOT NULL DEFAULT false,
  ai_score        INTEGER,                         -- 0-100
  ai_yield_est    NUMERIC(5,2),                    -- Geschätzte Rendite %
  ai_risk_flags   TEXT[],                          -- ["sanierungsbedarf", "lage_risiko", ...]
  ai_summary      TEXT,                            -- Kurze KI-Begründung (2-3 Sätze)
  ai_scored_at    TIMESTAMP,

  -- Pipeline-Status
  pushed_to_pipeline BOOLEAN NOT NULL DEFAULT false,
  pipeline_entry_id  UUID,
  pushed_at       TIMESTAMP,

  -- Lifecycle
  first_seen_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  last_checked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  is_stale        BOOLEAN NOT NULL DEFAULT false,  -- Listing nicht mehr online
  stale_since     TIMESTAMP
);

-- CRITICAL: Dedup-Index — verhindert doppeltes Einfügen desselben Inserats
CREATE UNIQUE INDEX idx_sentinel_dedup
  ON sentinel_seen_listings(profile_id, portal, external_id);

CREATE INDEX idx_sentinel_seen_profile ON sentinel_seen_listings(profile_id);
CREATE INDEX idx_sentinel_seen_user ON sentinel_seen_listings(user_id);
CREATE INDEX idx_sentinel_seen_scored ON sentinel_seen_listings(ai_scored, ai_score DESC);
CREATE INDEX idx_sentinel_seen_recent ON sentinel_seen_listings(first_seen_at DESC);
```

### 2.3 Warum zwei Tabellen?

| Frage | Antwort |
|-------|---------|
| Warum nicht eine Tabelle? | Suchprofile sind die "Aufträge", Listings sind die "Ergebnisse". 1:N Beziehung. |
| Warum `external_id` statt URL? | URLs ändern sich (Parameter, Tracking). Die Portal-ID ist stabil. |
| Warum `detail_data` als JSONB? | Portale haben unterschiedliche Felder. Flexibles Schema vermeidet 50 nullable Spalten. |
| Warum `is_stale`? | Wenn ein Listing beim nächsten Scan nicht mehr auftaucht, markieren wir es als "offline" statt zu löschen. Historische Daten bleiben erhalten. |

---

## 3. Deduplizierungs-Strategie

### 3.1 Der Dedup-Algorithmus

```
Für jedes gescrapte Listing:
  1. Extrahiere (portal, external_id) aus dem Listing
     - ImmobilienScout24: ID aus URL → /expose/12345678
     - Immowelt:          ID aus URL → /expose/2abc3de
     - eBay Kleinanzeigen: ID aus URL → /s-anzeige/...../2345678901

  2. INSERT ... ON CONFLICT (profile_id, portal, external_id) DO NOTHING
     - Wenn Conflict → Listing war schon bekannt → SKIP
     - Wenn Insert → Neues Listing → weiter zu Detail-Scrape

  3. Optional: UPDATE last_checked_at für existierende Listings
     (beweist, dass das Listing noch online ist)
```

### 3.2 PostgreSQL Upsert Pattern

```sql
INSERT INTO sentinel_seen_listings
  (profile_id, user_id, portal, external_id, listing_url, title, price, area_sqm, rooms, address_raw)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
ON CONFLICT (profile_id, portal, external_id)
DO UPDATE SET last_checked_at = NOW()
RETURNING id, (xmax = 0) AS is_new;
-- xmax = 0 → Row wurde gerade INSERTed (neu)
-- xmax != 0 → Row existierte bereits (UPDATE)
```

**Warum `xmax = 0`?** Das ist ein PostgreSQL-Internal, das uns ohne Extra-Query verrät, ob die Row neu oder ein Update war. Effizienter als ein vorheriges SELECT.

### 3.3 Stale-Detection

Listings die bei 3 aufeinanderfolgenden Scans **nicht mehr** in der Portal-Liste auftauchen, werden als `is_stale = true` markiert:

```sql
-- Nach jedem Scan: Markiere Listings, die nicht mehr gefunden wurden
UPDATE sentinel_seen_listings
SET is_stale = true, stale_since = NOW()
WHERE profile_id = $1
  AND is_stale = false
  AND last_checked_at < NOW() - INTERVAL '3 days';
```

---

## 4. Scheduling Design

### 4.1 BullMQ Repeatable Jobs

Wir nutzen die **bestehende BullMQ-Infrastruktur** (`server/lib/pipeline-queue.ts`), aber mit einer eigenen Queue:

```typescript
// server/lib/sentinel-queue.ts (NEU)
import { Queue } from 'bullmq';
import { getBullMQRedisOptions } from '@/lib/redis/connection';
import { validateQueueName } from '@/workers/queues';

const SENTINEL_QUEUE_NAME = 'sentinel-scan';
validateQueueName(SENTINEL_QUEUE_NAME);

export const sentinelQueue = new Queue(SENTINEL_QUEUE_NAME, {
  connection: new Redis(getBullMQRedisOptions()),
  defaultJobOptions: {
    attempts: 2,                    // Max 2 Versuche pro Scan
    backoff: { type: 'fixed', delay: 60_000 }, // 1 Min Retry-Delay
    removeOnComplete: { age: 86400, count: 500 },
    removeOnFail: { age: 604800 },  // 7 Tage
  },
});

export const SENTINEL_JOB_TYPES = {
  SCAN_PROFILE: 'scan-profile',     // Ein einzelnes Profil scannen
  SCAN_ALL: 'scan-all-profiles',    // Alle fälligen Profile scannen
} as const;
```

### 4.2 Scheduling-Strategie: Profile-Level Cron

Jedes Suchprofil hat seinen eigenen Cron. Beim Erstellen/Aktivieren eines Profils:

```typescript
// Profil erstellen → BullMQ Repeatable anlegen
await sentinelQueue.add(
  SENTINEL_JOB_TYPES.SCAN_PROFILE,
  { profileId: profile.id, userId: profile.userId },
  {
    repeat: {
      pattern: profile.cronExpression, // z.B. "0 4,8,11,14,17,21 * * *"
      tz: profile.timezone,
    },
    jobId: `sentinel-${profile.id}`,
  }
);
```

**Warum pro Profil statt ein globaler Cron?**

| Ansatz | Pro | Contra |
|--------|-----|--------|
| Globaler Cron (1 Job scannt alle) | Einfacher | Alle User blockieren sich gegenseitig; ein Fehler stoppt alles |
| **Pro Profil (gewählt)** | Isoliert; pausierbar; individuelle Frequenz möglich | Mehr BullMQ Jobs (aber BullMQ kann Millionen) |

### 4.3 Budget Guard

**Vor jedem Scan** prüft der Worker:

```typescript
async function shouldScan(profile: SearchProfile): Promise<boolean> {
  // 1. Tages-Budget prüfen (Firecrawl Credits)
  const todayCreditsUsed = await getTodayFirecrawlCredits(profile.userId);
  if (todayCreditsUsed >= DAILY_FIRECRAWL_LIMIT) {
    console.warn(`[SENTINEL] Budget exhausted for user ${profile.userId}`);
    return false;
  }

  // 2. Profil-Pause prüfen
  if (profile.pausedUntil && profile.pausedUntil > new Date()) return false;

  // 3. Minimum-Intervall prüfen (Safety: nicht öfter als alle 30 Min)
  if (profile.lastScanAt && Date.now() - profile.lastScanAt.getTime() < 30 * 60 * 1000) return false;

  return true;
}
```

### 4.4 Frequenz-Presets

| Preset | Cron | Scans/Tag | Empfohlen für |
|--------|------|-----------|---------------|
| `hourly` | `0 * * * *` | 24 | Power-User, heiße Märkte |
| `6x_daily` | `0 4,8,11,14,17,21 * * *` | 6 | Standard |
| `3x_daily` | `0 7,13,19 * * *` | 3 | Budget-schonend |
| `daily` | `0 7 * * *` | 1 | Passive Beobachtung |

---

## 5. Firecrawl Integration

### 5.1 Warum Firecrawl?

- **JS-Rendering**: ImmobilienScout & Immowelt laden Listings per JavaScript → einfaches HTTP reicht nicht
- **Structured Extraction**: Firecrawl kann mit einem LLM-Prompt strukturierte Daten aus HTML extrahieren
- **Rate Limiting built-in**: Firecrawl handhabt eigene Rate Limits zum Schutz der Zielseiten

### 5.2 Zwei-Stufen-Scraping

| Stufe | Firecrawl API | Was | Kosten |
|-------|---------------|-----|--------|
| **1. Liste** | `POST /v1/scrape` | Such-Ergebnisseite → Array von {title, price, link, id} | 1 Credit pro Seite |
| **2. Detail** | `POST /v1/scrape` | Einzelnes Exposé → Vollständige Daten | 1 Credit pro Exposé |

**Stufe 1: Listen-Scrape**

```typescript
const result = await firecrawl.scrapeUrl(searchUrl, {
  formats: ['extract'],
  extract: {
    schema: z.object({
      listings: z.array(z.object({
        title: z.string(),
        price: z.number().optional(),
        area_sqm: z.number().optional(),
        rooms: z.number().optional(),
        address: z.string().optional(),
        portal_id: z.string(),          // Exposé-ID
        detail_url: z.string(),
      })),
    }),
    prompt: 'Extract all property listings from this search results page. For each listing extract the title, price in EUR, area in square meters, number of rooms, address, the unique listing/expose ID, and the URL to the detail page.',
  },
});
```

**Stufe 2: Detail-Scrape (nur neue Listings)**

```typescript
const detail = await firecrawl.scrapeUrl(listing.detail_url, {
  formats: ['extract'],
  extract: {
    schema: z.object({
      description: z.string(),
      features: z.array(z.string()),
      year_built: z.number().optional(),
      energy_rating: z.string().optional(),
      heating_type: z.string().optional(),
      floor: z.string().optional(),
      parking: z.boolean().optional(),
      balcony: z.boolean().optional(),
      garden: z.boolean().optional(),
      images: z.array(z.string()),       // Bild-URLs
      agent_name: z.string().optional(),
      agent_phone: z.string().optional(),
    }),
    prompt: 'Extract the full property details from this real estate listing page...',
  },
});
```

### 5.3 Rate Limiting & Cost Control

```
Rechnung pro Scan-Zyklus (1 Profil, 3 Portale):
─────────────────────────────────────────────────
Listen-Scrapes:     3 Portale × 1-2 Seiten = 3-6 Credits
Neue Listings:      ~5-15 neue pro Scan × 1 Credit = 5-15 Credits
─────────────────────────────────────────────────
Gesamt pro Scan:    8-21 Credits
× 6 Scans/Tag:     48-126 Credits/Tag pro Profil

Firecrawl Pricing (Stand 2026):
- Free:     500 Credits/Monat
- Hobby:    3.000 Credits/Monat ($19)
- Standard: 50.000 Credits/Monat ($99)
- Growth:   500.000 Credits/Monat ($399)

→ Standard-Plan reicht für ~10 Profile bei 6x/Tag
→ Growth-Plan reicht für ~100+ Profile
```

**Schutzmaßnahmen:**

| Maßnahme | Implementation |
|----------|----------------|
| **Daily Credit Cap** | `FIRECRAWL_DAILY_LIMIT` Env-Variable (default: 500) |
| **Per-Profile Cap** | Max 30 Credits pro Scan-Zyklus |
| **Throttling** | Max 2 parallele Firecrawl-Requests (serialisiert pro Portal) |
| **Cache** | Redis-Cache für Listen-Seiten (TTL: 30 Min). Wenn gleiche URL innerhalb von 30 Min erneut angefragt wird → Cache-Hit statt neuer Scrape |
| **Smart Pagination** | Nur Seite 1-2 scrapen. Seite 3+ nur wenn alle Listings auf Seite 1-2 bereits bekannt sind |

---

## 6. Tool-Spezifikationen

### 6.1 `search_manager` — Suchprofil-Verwaltung (CRUD)

```typescript
// OpenAI Function Definition
{
  name: 'search_manager',
  description: 'Erstellt, aktualisiert, pausiert oder löscht ein Immobilien-Suchprofil. Der Nutzer beschreibt seine Suchkriterien in natürlicher Sprache, und dieses Tool wandelt sie in ein strukturiertes Profil um.',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'update', 'pause', 'resume', 'delete', 'list'],
      },
      profile_id: { type: 'string', description: 'UUID des Profils (für update/pause/resume/delete)' },
      criteria: {
        type: 'object',
        properties: {
          city: { type: 'string' },
          districts: { type: 'array', items: { type: 'string' } },
          radius_km: { type: 'number' },
          property_type: { type: 'string', enum: ['apartment', 'house', 'commercial', 'land'] },
          purchase_type: { type: 'string', enum: ['buy', 'rent'] },
          price_min: { type: 'number' },
          price_max: { type: 'number' },
          area_min: { type: 'number' },
          area_max: { type: 'number' },
          rooms_min: { type: 'number' },
          rooms_max: { type: 'number' },
          yield_min: { type: 'number' },
          custom_filters: { type: 'object' },
        },
      },
      frequency: { type: 'string', enum: ['hourly', '6x_daily', '3x_daily', 'daily'] },
      portals: { type: 'array', items: { type: 'string' } },
      min_score: { type: 'number', minimum: 0, maximum: 100 },
    },
    required: ['action'],
  },
}
```

**Verantwortung:**
- CRUD auf `sentinel_search_profiles`
- Bei `create`/`resume`: BullMQ Repeatable Job anlegen
- Bei `pause`/`delete`: BullMQ Repeatable Job entfernen
- Bei `list`: Alle Profile mit Statistiken zurückgeben

---

### 6.2 `market_radar` — Der Scraper-Loop

```typescript
{
  name: 'market_radar',
  description: 'Führt einen manuellen Scan für ein Suchprofil durch. Scannt die konfigurierten Portale, findet neue Inserate und gibt eine Zusammenfassung zurück. Wird auch automatisch vom Scheduler aufgerufen.',
  parameters: {
    type: 'object',
    properties: {
      profile_id: { type: 'string', description: 'UUID des Suchprofils' },
      portals: { type: 'array', items: { type: 'string' }, description: 'Optional: Nur bestimmte Portale scannen' },
      dry_run: { type: 'boolean', description: 'Wenn true: Scan simulieren, keine DB-Writes' },
    },
    required: ['profile_id'],
  },
}
```

**Interner Ablauf:**

```
market_radar(profile_id)
  │
  ├── 1. Lade Profil aus DB
  ├── 2. Budget-Check (shouldScan)
  ├── 3. Für jedes Portal:
  │     ├── 3a. Generiere Such-URL aus Kriterien
  │     ├── 3b. Firecrawl scrape (Liste)
  │     ├── 3c. Parse Ergebnisse → Listing[]
  │     └── 3d. Upsert in sentinel_seen_listings (ON CONFLICT → Dedup)
  ├── 4. Sammle neue Listings (is_new = true)
  ├── 5. Für jedes neue Listing:
  │     ├── 5a. Firecrawl scrape (Detail)
  │     └── 5b. Update sentinel_seen_listings.detail_data
  ├── 6. Update Profil-Statistiken (total_scans++, total_found += new_count)
  └── 7. Return: { scanned: 3, new_found: 8, portals_status: {...} }
```

---

### 6.3 `deal_qualifier` — KI-Bewertung

```typescript
{
  name: 'deal_qualifier',
  description: 'Bewertet ein oder mehrere Immobilien-Inserate anhand der Suchkriterien des Nutzers. Gibt einen Score (0-100), eine Rendite-Schätzung und Risiko-Flags zurück.',
  parameters: {
    type: 'object',
    properties: {
      listing_ids: { type: 'array', items: { type: 'string' }, description: 'UUIDs der zu bewertenden Listings' },
      profile_id: { type: 'string', description: 'UUID des Suchprofils (für Kriterien-Kontext)' },
    },
    required: ['listing_ids', 'profile_id'],
  },
}
```

**KI-Bewertungs-Prompt (an OpenAI):**

```
Du bist ein erfahrener Immobilien-Analyst.

SUCHKRITERIEN DES NUTZERS:
- Standort: {location}
- Typ: {property_type}
- Budget: {price_min} - {price_max} EUR
- Fläche: {area_min} - {area_max} m²
- Mindest-Rendite: {yield_min}%

EXPOSÉ-DATEN:
{detail_data als JSON}

BEWERTE dieses Inserat auf einer Skala von 0-100:
- Lage-Match (0-25): Wie gut passt der Standort?
- Preis-Leistung (0-25): Ist der Preis fair für Lage & Zustand?
- Rendite-Potenzial (0-25): Geschätzte Brutto-Rendite?
- Risiko-Bewertung (0-25): Sanierungsbedarf, Markt-Risiko?

Antworte als JSON:
{
  "score": 0-100,
  "yield_estimate": 5.2,
  "risk_flags": ["sanierungsbedarf", ...],
  "summary": "Kompakte 2-Satz-Begründung",
  "breakdown": { "location": 20, "value": 18, "yield": 22, "risk": 15 }
}
```

**Batching:** Bis zu 5 Listings pro OpenAI-Call, um Token-Kosten zu minimieren.

---

### 6.4 `pipeline_sync` — Pipeline-Integration

```typescript
{
  name: 'pipeline_sync',
  description: 'Synchronisiert qualifizierte Immobilien-Listings in eine Pipeline. Erstellt Pipeline-Einträge für Listings mit einem Score über dem Schwellwert.',
  parameters: {
    type: 'object',
    properties: {
      profile_id: { type: 'string' },
      min_score: { type: 'number', description: 'Minimum Score für Pipeline-Push (überschreibt Profil-Default)' },
      listing_ids: { type: 'array', items: { type: 'string' }, description: 'Optional: Nur bestimmte Listings pushen' },
      notify: { type: 'boolean', default: true, description: 'Nutzer benachrichtigen?' },
    },
    required: ['profile_id'],
  },
}
```

**Ablauf:**

```
pipeline_sync(profile_id)
  │
  ├── 1. Lade alle unbewerteten Listings → deal_qualifier aufrufen
  ├── 2. Filtere: score >= profile.min_score
  ├── 3. Für jedes qualifizierte Listing:
  │     ├── 3a. Erstelle Pipeline-Node (Workflow-Eintrag)
  │     │     - Titel: "{listing.title} - {listing.address}"
  │     │     - Daten: price, area, rooms, score, yield_est, detail_url
  │     │     - Status: "new" (wartet auf User-Review)
  │     ├── 3b. Markiere sentinel_seen_listings.pushed_to_pipeline = true
  │     └── 3c. Optional: Notification an User (via Socket.IO oder E-Mail)
  └── 4. Return: { pushed: 5, skipped: 3, avg_score: 74 }
```

---

## 7. Worker-Architektur

### 7.1 `sentinel-scan-worker.ts` (NEU)

```typescript
// workers/sentinel-scan-worker.ts
import { Worker, Job } from 'bullmq';
import { sentinelQueue, SENTINEL_JOB_TYPES } from '@/server/lib/sentinel-queue';

const worker = new Worker(
  'sentinel-scan',
  async (job: Job) => {
    switch (job.name) {
      case SENTINEL_JOB_TYPES.SCAN_PROFILE:
        return await scanSingleProfile(job.data.profileId, job.data.userId);

      case SENTINEL_JOB_TYPES.SCAN_ALL:
        return await scanAllDueProfiles();
    }
  },
  {
    connection: sentinelRedisConnection,
    concurrency: 2,          // Max 2 Profile parallel scannen
    limiter: {
      max: 10,               // Max 10 Jobs pro Zeitfenster
      duration: 60_000,      // Pro Minute
    },
  }
);
```

### 7.2 Concurrency & Isolation

```
Worker-Instanz
  │
  ├── Concurrency: 2 (max 2 Profile gleichzeitig)
  │
  ├── Profil A ──────────────────────────────────────
  │   ├── Portal 1: Firecrawl (seriell)
  │   ├── Portal 2: Firecrawl (seriell)      ← Seriell pro Profil
  │   └── Portal 3: Firecrawl (seriell)        (Rate Limit Schutz)
  │
  └── Profil B ──────────────────────────────────────
      ├── Portal 1: Firecrawl (seriell)      ← Parallel zu Profil A
      ├── Portal 2: Firecrawl (seriell)
      └── Portal 3: Firecrawl (seriell)
```

---

## 8. Portal URL-Generierung

### 8.1 URL-Templates

```typescript
const PORTAL_URL_GENERATORS: Record<string, (criteria: SearchCriteria) => string[]> = {

  immoscout24: (c) => {
    // ImmobilienScout24 Such-URL
    const type = c.purchaseType === 'buy' ? 'kaufen' : 'mieten';
    const prop = c.propertyType === 'apartment' ? 'wohnung' : 'haus';
    const base = `https://www.immobilienscout24.de/Suche/de/${c.location.state}/${c.location.city}/${prop}-${type}`;
    const params = new URLSearchParams();
    if (c.priceMax) params.set('priceto', String(c.priceMax));
    if (c.priceMin) params.set('pricefrom', String(c.priceMin));
    if (c.areaMin) params.set('livingspacefrom', String(c.areaMin));
    if (c.roomsMin) params.set('numberofrooms', `${c.roomsMin}-`);
    return [`${base}?${params.toString()}`];
  },

  immowelt: (c) => {
    const type = c.purchaseType === 'buy' ? 'kaufen' : 'mieten';
    const base = `https://www.immowelt.de/liste/${c.location.city}/wohnungen/${type}`;
    const params = new URLSearchParams();
    if (c.priceMax) params.set('pma', String(c.priceMax));
    if (c.areaMin) params.set('wflf', String(c.areaMin));
    return [`${base}?${params.toString()}`];
  },

  ebay_kleinanzeigen: (c) => {
    const catId = c.propertyType === 'apartment' ? 203 : 208; // WG: 199
    return [`https://www.kleinanzeigen.de/s-wohnung-${c.purchaseType === 'buy' ? 'kaufen' : 'mieten'}/c${catId}`];
  },
};
```

---

## 9. Datei-Struktur (Geplant)

```
lib/agents/property-sentinel/
├── tools/
│   ├── function-definitions.ts      # OpenAI ChatCompletionTool[] für alle 4 Tools
│   ├── tool-executor.ts             # Switch-Dispatcher
│   ├── search-manager.ts            # CRUD Suchprofile + BullMQ Scheduling
│   ├── market-radar.ts              # Firecrawl Scrape-Loop + Dedup
│   ├── deal-qualifier.ts            # KI-Scoring via OpenAI
│   └── pipeline-sync.ts             # Push qualifizierte Listings → Pipeline
├── services/
│   ├── FirecrawlService.ts          # Firecrawl SDK Wrapper (rate limit, retry, caching)
│   ├── PortalUrlGenerator.ts        # URL-Templates pro Portal
│   └── ListingParser.ts             # Normalisierung der gescrapten Daten
├── config.ts                        # FIRECRAWL_DAILY_LIMIT, DEFAULT_MIN_SCORE, etc.
├── prompts.ts                       # Agent-System-Prompt + deal_qualifier Prompt
└── index.ts                         # Exports

server/lib/sentinel-queue.ts          # BullMQ Queue Definition
workers/sentinel-scan-worker.ts       # BullMQ Worker

lib/db/schema-sentinel.ts            # Drizzle Schema: sentinel_search_profiles + sentinel_seen_listings
drizzle/migrations/XXXX_add_sentinel_tables.sql

app/api/sentinel/
├── profiles/route.ts                # GET/POST Suchprofile
├── profiles/[id]/route.ts           # GET/PATCH/DELETE einzelnes Profil
├── scan/[profileId]/route.ts        # POST manuellen Scan triggern
└── listings/route.ts                # GET Listings mit Filter/Pagination
```

---

## 10. Kostenanalyse & Limits

### 10.1 Kosten pro User pro Monat (Standard-Setup: 1 Profil, 6x/Tag, 3 Portale)

| Posten | Berechnung | Kosten/Monat |
|--------|-----------|--------------|
| Firecrawl Credits | ~100 Credits/Tag × 30 = 3.000 | $19 (Hobby) oder anteilig $99 (Standard) |
| OpenAI (deal_qualifier) | ~15 Listings/Tag × 500 Tokens × 30 = 225k Tokens | ~$0.50 (gpt-4o-mini) |
| OpenAI (Firecrawl extract) | Eingebettet in Firecrawl-Kosten | $0 |
| PostgreSQL Storage | ~450 Listings/Monat × 2KB = ~1MB | Vernachlässigbar |
| Redis | BullMQ Jobs + Cache | Vernachlässigbar |
| **Gesamt** | | **~$20-25/User/Monat** |

### 10.2 Skalierungs-Limits

| Szenario | Profile | Scans/Tag | Credits/Tag | Empf. Plan |
|----------|---------|-----------|-------------|------------|
| 1 User, 1 Profil | 1 | 6 | ~100 | Hobby ($19) |
| 1 User, 3 Profile | 3 | 18 | ~300 | Standard ($99) |
| 10 User, je 2 Profile | 20 | 120 | ~2.000 | Growth ($399) |
| Enterprise (50 User) | 100 | 600 | ~10.000 | Scale/Custom |

### 10.3 Hard Limits (Konfigurierbar)

```typescript
// lib/agents/property-sentinel/config.ts
export const SENTINEL_CONFIG = {
  // Firecrawl
  FIRECRAWL_DAILY_LIMIT: 500,           // Credits/Tag pro Workspace
  FIRECRAWL_PER_SCAN_LIMIT: 30,         // Credits pro Scan-Zyklus
  FIRECRAWL_CONCURRENT_REQUESTS: 2,     // Gleichzeitige Requests

  // Scanning
  MAX_PROFILES_PER_USER: 5,             // Max Suchprofile pro User
  MAX_PORTALS_PER_PROFILE: 5,           // Max Portale pro Profil
  MAX_PAGES_PER_PORTAL: 2,              // Nur Seite 1-2 scrapen
  MIN_SCAN_INTERVAL_MS: 30 * 60 * 1000, // Min 30 Min zwischen Scans

  // Scoring
  DEFAULT_MIN_SCORE: 60,                // Minimum Score für Pipeline-Push
  MAX_LISTINGS_PER_QUALIFICATION: 10,   // Max Listings pro KI-Batch

  // Cleanup
  STALE_AFTER_DAYS: 3,                  // Als offline markieren nach 3 Tagen
  PURGE_STALE_AFTER_DAYS: 90,           // Stale Listings löschen nach 90 Tagen
};
```

---

## 11. Fehlerbehandlung

| Fehler | Handling |
|--------|----------|
| Firecrawl 429 (Rate Limit) | Exponential Backoff (1s → 2s → 4s), max 3 Retries |
| Firecrawl 500 (Server Error) | Skip Portal für diesen Scan, log in `last_scan_error` |
| Portal-Website geändert (Parse Error) | Log detailliert, markiere Portal als `degraded`, benachrichtige Admin |
| OpenAI Timeout | Retry 1x, dann Listing als `ai_scored = false` belassen für nächsten Zyklus |
| Budget exceeded | Scan abbrechen, Profil auf `paused_until = tomorrow 04:00` setzen |
| DB Connection Error | BullMQ Retry (2 Attempts mit 60s Delay) |

---

## 12. Zusammenfassung der Entscheidungen

| Entscheidung | Gewählt | Begründung |
|-------------|---------|------------|
| **Scheduling** | BullMQ Repeatable pro Profil | Isolation, individuelle Frequenz, keine gegenseitige Blockierung |
| **Dedup** | PostgreSQL UNIQUE Index + `ON CONFLICT` | Atomic, kein Race Condition, effizient |
| **Scraping** | Firecrawl (2-Stufen) | JS-Rendering-fähig, strukturierte Extraktion, managed Service |
| **KI-Scoring** | OpenAI gpt-4o-mini | Günstig, schnell, ausreichend für Bewertung |
| **State** | PostgreSQL (nicht Redis) | Persistenz wichtig für Listing-Historie, Dedup muss Crashes überleben |
| **Caching** | Redis (TTL 30 Min) | Vermeidet doppelte Firecrawl-Calls bei kurzfristigem Re-Scan |
| **Queue** | Eigene `sentinel-scan` Queue | Trennung von Pipeline-Execution, eigene Concurrency/Rate Limits |
