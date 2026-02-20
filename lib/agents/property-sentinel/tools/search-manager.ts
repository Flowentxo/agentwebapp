/**
 * Search Manager Tool
 *
 * CRUD operations for sentinel search profiles.
 * Phase 1: create, list, delete, stats (no BullMQ scheduling).
 */

import { getDb } from '@/lib/db/connection';
import { sentinelSearchProfiles, type NewSearchProfile } from '@/lib/db/schema-sentinel';
import { eq, and, desc } from 'drizzle-orm';
import {
  SENTINEL_CONFIG,
  SUPPORTED_PORTALS,
  PROPERTY_TYPE_LABELS,
  PURCHASE_TYPE_LABELS,
  FREQUENCY_PRESETS,
  isValidPortal,
  getScoreLabel,
  type PortalId,
  type PropertyType,
  type PurchaseType,
  type FrequencyPreset,
} from '../config';
import type { LocationFilter, CustomFilters } from '@/lib/db/schema-sentinel';

// ── Types ─────────────────────────────────────────────────────

export interface SearchManagerInput {
  action: 'create' | 'list' | 'update' | 'pause' | 'resume' | 'delete' | 'stats';
  profile_id?: string;
  criteria?: {
    name?: string;
    location?: Partial<LocationFilter>;
    property_type?: PropertyType;
    purchase_type?: PurchaseType;
    price_min?: number;
    price_max?: number;
    area_min?: number;
    area_max?: number;
    rooms_min?: number;
    rooms_max?: number;
    yield_min?: number;
    custom_filters?: Partial<CustomFilters>;
  };
  portals?: string[];
  frequency?: FrequencyPreset;
  min_score?: number;
}

export interface SearchManagerResult {
  profiles?: any[];
  profile?: any;
  stats?: any;
  formatted_output: string;
}

export const SEARCH_MANAGER_TOOL = {
  name: 'search_manager',
  description: 'Verwaltet Immobilien-Suchprofile: Erstellen, Auflisten, Aktualisieren, Pausieren, Loeschen. Jedes Profil definiert Suchkriterien (Ort, Preis, Flaeche, Objekttyp) und Portal-Konfiguration fuer automatische Scans.',
  input_schema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'list', 'update', 'pause', 'resume', 'delete', 'stats'],
        description: 'Aktion: create (neues Profil), list (alle Profile), update (Kriterien aendern), pause/resume (Scan pausieren/fortsetzen), delete (Profil loeschen), stats (Statistik)',
      },
      profile_id: { type: 'string', description: 'Profil-ID (fuer update/pause/resume/delete/stats)' },
      criteria: {
        type: 'object',
        description: 'Suchkriterien (fuer create/update)',
        properties: {
          name: { type: 'string', description: 'Name des Suchprofils' },
          location: {
            type: 'object',
            properties: {
              city: { type: 'string' },
              state: { type: 'string' },
              zip_codes: { type: 'array', items: { type: 'string' } },
              radius_km: { type: 'number' },
            },
          },
          property_type: { type: 'string', enum: ['wohnung', 'haus', 'grundstueck', 'gewerbe', 'mehrfamilienhaus'] },
          purchase_type: { type: 'string', enum: ['kauf', 'miete'] },
          price_min: { type: 'number' },
          price_max: { type: 'number' },
          area_min: { type: 'number' },
          area_max: { type: 'number' },
          rooms_min: { type: 'number' },
          rooms_max: { type: 'number' },
          yield_min: { type: 'number' },
        },
      },
      portals: { type: 'array', items: { type: 'string' }, description: 'Portal-Liste: immoscout24, immowelt, kleinanzeigen' },
      frequency: { type: 'string', enum: ['hourly', '6x_daily', '3x_daily', 'daily'], description: 'Scan-Frequenz' },
      min_score: { type: 'number', description: 'Mindest-Score (0-100)' },
    },
    required: ['action'],
  },
};

// ── Executor ──────────────────────────────────────────────────

export async function executeSearchManager(
  input: SearchManagerInput,
  context: { userId: string; workspaceId?: string },
): Promise<SearchManagerResult> {
  const { action } = input;
  const { userId } = context;
  const workspaceId = context.workspaceId || userId;

  switch (action) {
    case 'create':
      return createProfile(input, userId, workspaceId);
    case 'list':
      return listProfiles(userId);
    case 'delete':
      return deleteProfile(input.profile_id!, userId);
    case 'stats':
      return getProfileStats(input.profile_id!, userId);
    case 'pause':
      return toggleProfile(input.profile_id!, userId, false);
    case 'resume':
      return toggleProfile(input.profile_id!, userId, true);
    case 'update':
      return updateProfile(input, userId);
    default:
      return { formatted_output: `Unbekannte Aktion: ${action}` };
  }
}

// ── Create ────────────────────────────────────────────────────

async function createProfile(
  input: SearchManagerInput,
  userId: string,
  workspaceId: string,
): Promise<SearchManagerResult> {
  const { criteria, portals, frequency, min_score } = input;

  // Validate criteria
  const errors: string[] = [];
  if (!criteria?.location?.city) errors.push('Stadt (location.city) fehlt');
  if (!criteria?.property_type) errors.push('Objekttyp (property_type) fehlt');
  if (!criteria?.purchase_type) errors.push('Kauf/Miete (purchase_type) fehlt');
  if (criteria?.price_min && criteria?.price_max && criteria.price_min > criteria.price_max) {
    errors.push(`Mindestpreis (${criteria.price_min}) > Hoechstpreis (${criteria.price_max})`);
  }
  if (criteria?.area_min && criteria?.area_max && criteria.area_min > criteria.area_max) {
    errors.push(`Mindestflaeche (${criteria.area_min}) > Hoechstflaeche (${criteria.area_max})`);
  }

  // Validate portals
  const validPortals = (portals || ['immoscout24']).filter(p => {
    if (!isValidPortal(p)) {
      errors.push(`Portal "${p}" wird nicht unterstuetzt. Verfuegbar: ${SUPPORTED_PORTALS.join(', ')}`);
      return false;
    }
    return true;
  });

  if (errors.length > 0) {
    return {
      formatted_output: `Validierungsfehler:\n${errors.map(e => `  - ${e}`).join('\n')}`,
    };
  }

  const db = getDb();

  // Check max profiles
  const existing = await db
    .select()
    .from(sentinelSearchProfiles)
    .where(and(eq(sentinelSearchProfiles.userId, userId), eq(sentinelSearchProfiles.isActive, true)));

  if (existing.length >= SENTINEL_CONFIG.maxProfilesPerUser) {
    return {
      formatted_output: `Maximum von ${SENTINEL_CONFIG.maxProfilesPerUser} aktiven Profilen erreicht. Bitte ein bestehendes Profil loeschen oder pausieren.`,
    };
  }

  const freq = (frequency || 'daily') as FrequencyPreset;
  const freqConfig = FREQUENCY_PRESETS[freq === 'custom' ? 'daily' : freq];
  const profileName = criteria?.name || `${criteria!.location!.city} ${PROPERTY_TYPE_LABELS[criteria!.property_type!]} ${PURCHASE_TYPE_LABELS[criteria!.purchase_type!]}`;

  const [profile] = await db
    .insert(sentinelSearchProfiles)
    .values({
      userId,
      workspaceId,
      name: profileName,
      location: criteria!.location as LocationFilter,
      propertyType: criteria!.property_type!,
      purchaseType: criteria!.purchase_type!,
      priceMin: criteria?.price_min || null,
      priceMax: criteria?.price_max || null,
      areaMin: criteria?.area_min || null,
      areaMax: criteria?.area_max || null,
      roomsMin: criteria?.rooms_min?.toString() || null,
      roomsMax: criteria?.rooms_max?.toString() || null,
      yieldMin: criteria?.yield_min?.toString() || null,
      customFilters: criteria?.custom_filters as CustomFilters || {},
      portals: validPortals,
      minScore: min_score || SENTINEL_CONFIG.defaultMinScore,
      frequency: freq,
      cronExpression: freqConfig?.cronExpression || '0 8 * * *',
    })
    .returning();

  const lines = [
    `Suchprofil erstellt`,
    `════════════════════════════════`,
    ``,
    `Name:       ${profileName}`,
    `ID:         ${profile.id}`,
    `Stadt:      ${criteria!.location!.city}`,
    `Typ:        ${PROPERTY_TYPE_LABELS[criteria!.property_type!]} (${PURCHASE_TYPE_LABELS[criteria!.purchase_type!]})`,
  ];

  if (criteria?.price_min || criteria?.price_max) {
    lines.push(`Preis:      ${criteria.price_min ? criteria.price_min.toLocaleString('de-DE') : '—'} – ${criteria.price_max ? criteria.price_max.toLocaleString('de-DE') : '—'} EUR`);
  }
  if (criteria?.area_min || criteria?.area_max) {
    lines.push(`Flaeche:    ${criteria.area_min || '—'} – ${criteria.area_max || '—'} m²`);
  }
  if (criteria?.rooms_min) {
    lines.push(`Zimmer:     ab ${criteria.rooms_min}`);
  }

  lines.push(`Portale:    ${validPortals.join(', ')}`);
  lines.push(`Frequenz:   ${freqConfig?.label || freq}`);
  lines.push(`Min-Score:  ${min_score || SENTINEL_CONFIG.defaultMinScore}`);
  lines.push(``);
  lines.push(`Nutze "market_radar" mit dieser Profil-ID, um den ersten Scan zu starten.`);

  return { profile, formatted_output: lines.join('\n') };
}

// ── List ──────────────────────────────────────────────────────

async function listProfiles(userId: string): Promise<SearchManagerResult> {
  const db = getDb();
  const profiles = await db
    .select()
    .from(sentinelSearchProfiles)
    .where(eq(sentinelSearchProfiles.userId, userId))
    .orderBy(desc(sentinelSearchProfiles.createdAt));

  if (profiles.length === 0) {
    return {
      profiles: [],
      formatted_output: 'Keine Suchprofile vorhanden. Erstelle eines mit action: "create".',
    };
  }

  const lines = [
    `Deine Suchprofile (${profiles.length})`,
    `════════════════════════════════`,
    ``,
  ];

  for (const p of profiles) {
    const status = p.isActive ? 'Aktiv' : 'Pausiert';
    const lastScan = p.lastScanAt ? new Date(p.lastScanAt).toLocaleDateString('de-DE') : 'Nie';
    lines.push(`[${status}] ${p.name}`);
    lines.push(`  ID: ${p.id}`);
    lines.push(`  Portale: ${(p.portals || []).join(', ')}`);
    lines.push(`  Scans: ${p.totalScans} | Gefunden: ${p.totalFound} | Qualifiziert: ${p.totalQualified}`);
    lines.push(`  Letzter Scan: ${lastScan}`);
    lines.push(``);
  }

  return { profiles, formatted_output: lines.join('\n') };
}

// ── Delete ────────────────────────────────────────────────────

async function deleteProfile(profileId: string, userId: string): Promise<SearchManagerResult> {
  const db = getDb();
  const [profile] = await db
    .update(sentinelSearchProfiles)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(sentinelSearchProfiles.id, profileId), eq(sentinelSearchProfiles.userId, userId)))
    .returning();

  if (!profile) {
    return { formatted_output: `Profil ${profileId} nicht gefunden oder gehoert nicht dir.` };
  }

  return {
    profile,
    formatted_output: `Suchprofil "${profile.name}" geloescht (deaktiviert).`,
  };
}

// ── Stats ─────────────────────────────────────────────────────

async function getProfileStats(profileId: string, userId: string): Promise<SearchManagerResult> {
  const db = getDb();
  const [profile] = await db
    .select()
    .from(sentinelSearchProfiles)
    .where(and(eq(sentinelSearchProfiles.id, profileId), eq(sentinelSearchProfiles.userId, userId)));

  if (!profile) {
    return { formatted_output: `Profil ${profileId} nicht gefunden.` };
  }

  const loc = profile.location as LocationFilter;
  const lines = [
    `Profil-Statistik: ${profile.name}`,
    `════════════════════════════════`,
    ``,
    `Status:        ${profile.isActive ? 'Aktiv' : 'Pausiert'}`,
    `Stadt:         ${loc.city}`,
    `Typ:           ${PROPERTY_TYPE_LABELS[profile.propertyType as PropertyType] || profile.propertyType}`,
    `Portale:       ${(profile.portals || []).join(', ')}`,
    `Frequenz:      ${profile.frequency}`,
    `Min-Score:     ${profile.minScore}`,
    ``,
    `Gesamt-Scans:      ${profile.totalScans}`,
    `Gefundene Inserate: ${profile.totalFound}`,
    `Qualifizierte Deals:${profile.totalQualified}`,
    `Letzter Scan:       ${profile.lastScanAt ? new Date(profile.lastScanAt).toLocaleString('de-DE') : 'Nie'}`,
    `Letzter Status:     ${profile.lastScanStatus || '—'}`,
  ];

  if (profile.lastScanError) {
    lines.push(`Letzter Fehler:     ${profile.lastScanError}`);
  }

  return { stats: profile, formatted_output: lines.join('\n') };
}

// ── Toggle (Pause/Resume) ─────────────────────────────────────

async function toggleProfile(
  profileId: string,
  userId: string,
  activate: boolean,
): Promise<SearchManagerResult> {
  const db = getDb();
  const [profile] = await db
    .update(sentinelSearchProfiles)
    .set({
      isActive: activate,
      pausedUntil: activate ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    })
    .where(and(eq(sentinelSearchProfiles.id, profileId), eq(sentinelSearchProfiles.userId, userId)))
    .returning();

  if (!profile) {
    return { formatted_output: `Profil ${profileId} nicht gefunden.` };
  }

  return {
    profile,
    formatted_output: activate
      ? `Suchprofil "${profile.name}" aktiviert. Scans werden fortgesetzt.`
      : `Suchprofil "${profile.name}" pausiert. Keine weiteren Scans.`,
  };
}

// ── Update ────────────────────────────────────────────────────

async function updateProfile(input: SearchManagerInput, userId: string): Promise<SearchManagerResult> {
  if (!input.profile_id) {
    return { formatted_output: 'profile_id fehlt fuer Update.' };
  }

  const db = getDb();
  const updates: Record<string, any> = { updatedAt: new Date() };

  if (input.criteria?.price_min !== undefined) updates.priceMin = input.criteria.price_min;
  if (input.criteria?.price_max !== undefined) updates.priceMax = input.criteria.price_max;
  if (input.criteria?.area_min !== undefined) updates.areaMin = input.criteria.area_min;
  if (input.criteria?.area_max !== undefined) updates.areaMax = input.criteria.area_max;
  if (input.criteria?.rooms_min !== undefined) updates.roomsMin = String(input.criteria.rooms_min);
  if (input.criteria?.property_type) updates.propertyType = input.criteria.property_type;
  if (input.criteria?.purchase_type) updates.purchaseType = input.criteria.purchase_type;
  if (input.criteria?.name) updates.name = input.criteria.name;
  if (input.min_score !== undefined) updates.minScore = input.min_score;
  if (input.portals) updates.portals = input.portals.filter(isValidPortal);
  if (input.frequency && input.frequency !== 'custom') {
    updates.frequency = input.frequency;
    updates.cronExpression = FREQUENCY_PRESETS[input.frequency].cronExpression;
  }

  const [profile] = await db
    .update(sentinelSearchProfiles)
    .set(updates)
    .where(and(eq(sentinelSearchProfiles.id, input.profile_id), eq(sentinelSearchProfiles.userId, userId)))
    .returning();

  if (!profile) {
    return { formatted_output: `Profil ${input.profile_id} nicht gefunden.` };
  }

  return {
    profile,
    formatted_output: `Suchprofil "${profile.name}" aktualisiert.`,
  };
}
