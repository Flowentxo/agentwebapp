/**
 * Portal URL Generator
 *
 * Constructs search URLs for each supported real estate portal
 * based on user search criteria.
 */

import {
  PORTAL_CONFIG,
  KLEINANZEIGEN_CATEGORIES,
  type PortalId,
  type PropertyType,
  type PurchaseType,
} from '../config';

export interface SearchCriteria {
  location: { city: string; state?: string; plz?: string; radius_km?: number };
  property_type: PropertyType;
  purchase_type: PurchaseType;
  price_min?: number;
  price_max?: number;
  area_min?: number;
  area_max?: number;
  rooms_min?: number;
  rooms_max?: number;
}

/**
 * Generate a portal search URL from criteria
 */
export function generatePortalUrl(portal: PortalId, criteria: SearchCriteria, page = 1): string {
  switch (portal) {
    case 'immoscout24':
      return buildImmoScout24Url(criteria, page);
    case 'immowelt':
      return buildImmoweltUrl(criteria, page);
    case 'kleinanzeigen':
      return buildKleinanzeigenUrl(criteria, page);
    default:
      throw new Error(`Unsupported portal: ${portal}`);
  }
}

// ── ImmoScout24 ─────────────────────────────────────────────

function buildImmoScout24Url(criteria: SearchCriteria, page: number): string {
  const base = PORTAL_CONFIG.immoscout24.baseUrl;
  const city = encodeURIComponent(criteria.location.city.toLowerCase());
  const state = criteria.location.state?.toLowerCase() || 'berlin';

  const typeMap: Record<string, string> = {
    wohnung: 'wohnung',
    haus: 'haus',
    grundstueck: 'grundstueck',
    gewerbe: 'gewerbeimmobilien',
    mehrfamilienhaus: 'mehrfamilienhaus',
  };

  const purchaseMap: Record<string, string> = {
    kauf: 'kaufen',
    miete: 'mieten',
  };

  const propType = typeMap[criteria.property_type] || 'wohnung';
  const purchType = purchaseMap[criteria.purchase_type] || 'kaufen';

  const params = new URLSearchParams();
  if (criteria.price_min) params.set('pricefrom', String(criteria.price_min));
  if (criteria.price_max) params.set('priceto', String(criteria.price_max));
  if (criteria.area_min) params.set('livingspacefrom', String(criteria.area_min));
  if (criteria.area_max) params.set('livingspaceto', String(criteria.area_max));
  if (criteria.rooms_min) params.set('numberofrooms', `${criteria.rooms_min}-`);
  if (page > 1) params.set('pagenumber', String(page));

  const queryString = params.toString();
  return `${base}/Suche/de/${state}/${city}/${propType}-${purchType}${queryString ? `?${queryString}` : ''}`;
}

// ── Immowelt ────────────────────────────────────────────────

function buildImmoweltUrl(criteria: SearchCriteria, page: number): string {
  const base = PORTAL_CONFIG.immowelt.baseUrl;
  const city = encodeURIComponent(criteria.location.city.toLowerCase());

  const typeMap: Record<string, string> = {
    wohnung: 'wohnungen',
    haus: 'haeuser',
    grundstueck: 'grundstuecke',
    gewerbe: 'gewerbe',
    mehrfamilienhaus: 'haeuser',
  };

  const purchaseMap: Record<string, string> = {
    kauf: 'kaufen',
    miete: 'mieten',
  };

  const propType = typeMap[criteria.property_type] || 'wohnungen';
  const purchType = purchaseMap[criteria.purchase_type] || 'kaufen';

  const params = new URLSearchParams();
  if (criteria.price_min) params.set('pma', String(criteria.price_min));
  if (criteria.price_max) params.set('pmx', String(criteria.price_max));
  if (criteria.area_min) params.set('wflf', String(criteria.area_min));
  if (criteria.area_max) params.set('wflt', String(criteria.area_max));
  if (criteria.rooms_min) params.set('rof', String(criteria.rooms_min));
  if (page > 1) params.set('page', String(page));

  const queryString = params.toString();
  return `${base}/liste/${city}/${propType}/${purchType}${queryString ? `?${queryString}` : ''}`;
}

// ── Kleinanzeigen ───────────────────────────────────────────

function buildKleinanzeigenUrl(criteria: SearchCriteria, page: number): string {
  const base = PORTAL_CONFIG.kleinanzeigen.baseUrl;
  const categoryKey = `${criteria.property_type}_${criteria.purchase_type}`;
  const categoryId = KLEINANZEIGEN_CATEGORIES[categoryKey] || KLEINANZEIGEN_CATEGORIES['wohnung_kauf'];

  const params = new URLSearchParams();
  if (criteria.price_min) params.set('minPrice', String(criteria.price_min));
  if (criteria.price_max) params.set('maxPrice', String(criteria.price_max));
  if (criteria.location.city) params.set('locationStr', criteria.location.city);
  if (criteria.location.radius_km) params.set('radius', String(criteria.location.radius_km));
  if (page > 1) params.set('page', String(page));

  const queryString = params.toString();
  return `${base}/s-wohnung-${criteria.purchase_type}/c${categoryId}${queryString ? `?${queryString}` : ''}`;
}
