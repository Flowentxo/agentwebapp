/**
 * Property Sentinel Configuration
 *
 * Central configuration for all Sentinel subsystems.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Sentinel Limits
// ─────────────────────────────────────────────────────────────────────────────

export const SENTINEL_CONFIG = {
  maxProfilesPerUser: parseInt(process.env.SENTINEL_MAX_PROFILES || '5'),
  maxPortalsPerProfile: 3,
  maxPagesPerPortal: 2,
  minScanIntervalMinutes: 30,
  defaultMinScore: parseInt(process.env.SENTINEL_MIN_SCORE || '60'),
  maxListingsPerScan: 50,
  batchSize: 5,
  staleThresholdDays: 14,
  purgeThresholdDays: 90,
  maxConcurrentRequests: 2,
  requestsPerMinute: 10,
  maxToolCalls: 10,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Firecrawl / Credit Limits
// ─────────────────────────────────────────────────────────────────────────────

export const FIRECRAWL_CONFIG = {
  dailyCreditLimit: parseInt(process.env.FIRECRAWL_DAILY_LIMIT || '500'),
  perScanCreditLimit: 30,
  listPageCreditCost: 1,
  detailPageCreditCost: 1,
  listPageCacheTtlSeconds: 1800,
  detailPageCacheTtlSeconds: 86400,
  circuitBreakerThreshold: 5,
  circuitBreakerRecoveryMs: 300_000,
  maxRetries: 3,
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
  scoringModel: 'gpt-4o-mini',
  scoringMaxTokens: 2000,
  scoringTemperature: 0.3,
  thresholds: {
    excellent: 80,
    good: 65,
    acceptable: 50,
    poor: 0,
  },
  categories: {
    lage_match: { maxPoints: 25, weight: 1.0 },
    preis_leistung: { maxPoints: 25, weight: 1.0 },
    rendite_potenzial: { maxPoints: 25, weight: 1.0 },
    risiko_bewertung: { maxPoints: 25, weight: 1.0 },
  },
} as const;

export function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Exzellent', color: '#10B981' };
  if (score >= 65) return { label: 'Gut', color: '#3B82F6' };
  if (score >= 50) return { label: 'Akzeptabel', color: '#F59E0B' };
  return { label: 'Schwach', color: '#EF4444' };
}

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
  { id: 'ueberschwemmung', keywords: ['ueberschwemmung', 'hochwasser', 'ueberschwemmungsgebiet'], severity: 'high', scorePenalty: -10, description: 'Ueberschwemmungsgebiet' },
  { id: 'grundstuecksbelastung', keywords: ['grunddienstbarkeit', 'wegerecht', 'leitungsrecht'], severity: 'medium', scorePenalty: -5, description: 'Grunddienstbarkeiten eingetragen' },
  { id: 'vorkaufsrecht', keywords: ['vorkaufsrecht', 'gemeinde', 'vorkauf'], severity: 'medium', scorePenalty: -5, description: 'Gemeindliches Vorkaufsrecht' },
  { id: 'zweckentfremdung', keywords: ['zweckentfremdung', 'eigennutzungspflicht'], severity: 'medium', scorePenalty: -5, description: 'Zweckentfremdungsverbot' },
  { id: 'weg_streit', keywords: ['klage', 'rechtsstreit', 'streit'], severity: 'medium', scorePenalty: -5, description: 'WEG-Streitigkeiten bekannt' },
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
// Grunderwerbsteuer by Bundesland
// ─────────────────────────────────────────────────────────────────────────────

export const GRUNDERWERBSTEUER: Record<string, number> = {
  'BY': 3.5, 'SN': 3.5,
  'BW': 5.0, 'HB': 5.0, 'NI': 5.0, 'RP': 5.0, 'ST': 5.0,
  'HE': 5.5, 'MV': 5.5,
  'BE': 6.0, 'HH': 6.0,
  'BB': 6.5, 'NW': 6.5, 'SL': 6.5, 'SH': 6.5, 'TH': 6.5,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

export function getPortalConfig(portalId: string): PortalConfig | undefined {
  return PORTAL_CONFIG[portalId as PortalId];
}

export function isValidPortal(portalId: string): portalId is PortalId {
  return SUPPORTED_PORTALS.includes(portalId as PortalId);
}

export function getFrequencyConfig(frequency: FrequencyPreset): FrequencyConfig | undefined {
  if (frequency === 'custom') return undefined;
  return FREQUENCY_PRESETS[frequency];
}

export const REDIS_KEYS = {
  listPageCache: (urlHash: string) => `sentinel:cache:list:${urlHash}`,
  detailPageCache: (urlHash: string) => `sentinel:cache:detail:${urlHash}`,
  dailyCredits: (userId: string, date: string) => `sentinel:credits:${userId}:${date}`,
  scanLock: (profileId: string) => `sentinel:lock:scan:${profileId}`,
  circuitBreaker: (portal: string) => `sentinel:circuit:${portal}`,
} as const;
