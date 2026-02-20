/**
 * Listing Parser
 *
 * Normalization layer for portal-specific data formats.
 * Extracts IDs, normalizes prices, areas, and addresses.
 */

import { PORTAL_CONFIG, type PortalId } from '../config';

/**
 * Extract portal-specific listing ID from URL
 */
export function extractPortalId(url: string, portal: PortalId): string | null {
  const config = PORTAL_CONFIG[portal];
  if (!config) return null;

  const match = url.match(config.idPattern);
  return match ? match[1] : null;
}

/**
 * Normalize price string to number (EUR)
 *
 * Handles: "289.000 €", "1.250.000", "289.000 VB", "Preis auf Anfrage"
 */
export function normalizePrice(raw: any): number {
  if (raw == null || raw === '') return 0;

  // Already a number
  if (typeof raw === 'number') return raw;

  const str = String(raw).trim();

  // "Preis auf Anfrage" or similar
  if (/anfrage/i.test(str) || /verhandl/i.test(str)) return 0;

  // Remove VB/VHB markers
  let cleaned = str.replace(/\s*(VB|VHB)\s*/gi, '');

  // Remove currency symbols and whitespace
  cleaned = cleaned.replace(/[€$\s]/g, '');

  // Handle German number format: 289.000,50 → 289000.50
  if (cleaned.includes(',')) {
    // Has comma = decimal separator in German
    cleaned = cleaned.replace(/\./g, ''); // Remove thousand separators
    cleaned = cleaned.replace(',', '.');  // Comma → decimal point
  } else {
    // No comma: dots are thousand separators (289.000 → 289000)
    // But only if there are exactly 3 digits after each dot
    if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
      cleaned = cleaned.replace(/\./g, '');
    }
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Normalize area string to number (sqm)
 *
 * Handles: "78 m²", "78,5 qm", "78.5"
 */
export function normalizeArea(raw: any): number {
  if (raw == null || raw === '') return 0;
  if (typeof raw === 'number') return raw;

  const str = String(raw).trim();

  // Remove unit suffixes
  let cleaned = str.replace(/\s*(m²|m2|qm)\s*/gi, '').trim();

  // Handle comma decimal
  cleaned = cleaned.replace(',', '.');

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Extract city from various address formats
 *
 * Handles: "Berlin", "10115 Berlin", "Oranienstr. 45, 10969 Berlin", "Berlin-Kreuzberg"
 */
export function extractCity(address: string): string {
  if (!address) return '';

  const trimmed = address.trim();

  // Pattern: "Strasse, PLZ Stadt"
  const commaMatch = trimmed.match(/,\s*\d{5}\s+([A-Za-zÄÖÜäöüß-]+)/);
  if (commaMatch) return commaMatch[1].split('-')[0];

  // Pattern: "PLZ Stadt"
  const plzMatch = trimmed.match(/\d{5}\s+([A-Za-zÄÖÜäöüß-]+)/);
  if (plzMatch) return plzMatch[1].split('-')[0];

  // Pattern: "Stadt-Stadtteil"
  if (trimmed.includes('-') && !trimmed.includes(',')) {
    return trimmed.split('-')[0].trim();
  }

  // Plain city name
  return trimmed;
}

/**
 * Extract 5-digit PLZ from address string
 */
export function extractPlz(address: string): string | null {
  if (!address) return null;
  const match = address.match(/\b(\d{5})\b/);
  return match ? match[1] : null;
}

/**
 * Normalize rooms to number
 */
export function normalizeRooms(raw: any): number {
  if (raw == null || raw === '') return 0;
  if (typeof raw === 'number') return raw;

  const str = String(raw).trim();
  let cleaned = str.replace(/\s*(zimmer|zi\.?|rooms?)\s*/gi, '').trim();
  cleaned = cleaned.replace(',', '.');

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
