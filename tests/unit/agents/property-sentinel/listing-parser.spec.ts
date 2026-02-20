import { describe, it, expect } from 'vitest';
import {
  extractPortalId,
  normalizePrice,
  normalizeArea,
  extractCity,
  extractPlz,
  normalizeRooms,
} from '@/lib/agents/property-sentinel/services/ListingParser';

describe('extractPortalId', () => {
  it('extracts ImmoScout24 expose ID from URL', () => {
    const url = 'https://www.immobilienscout24.de/expose/123456789';
    const result = extractPortalId(url, 'immoscout24');
    expect(result).toBe('123456789');
  });

  it('extracts Immowelt expose ID from URL', () => {
    const url = 'https://www.immowelt.de/expose/abc123xyz';
    const result = extractPortalId(url, 'immowelt');
    expect(result).toBe('abc123xyz');
  });

  it('extracts Kleinanzeigen ID from URL', () => {
    const url = 'https://www.kleinanzeigen.de/s-anzeige/1234567890';
    const result = extractPortalId(url, 'kleinanzeigen');
    expect(result).toBe('1234567890');
  });

  it('returns null for non-matching URL', () => {
    const url = 'https://example.com/page';
    expect(extractPortalId(url, 'immoscout24')).toBeNull();
  });
});

describe('normalizePrice', () => {
  it('returns 0 for null/empty input', () => {
    expect(normalizePrice(null)).toBe(0);
    expect(normalizePrice(undefined)).toBe(0);
    expect(normalizePrice('')).toBe(0);
  });

  it('returns number directly', () => {
    expect(normalizePrice(289000)).toBe(289000);
    expect(normalizePrice(0)).toBe(0);
  });

  it('parses German price format: "289.000 €"', () => {
    expect(normalizePrice('289.000 €')).toBe(289000);
  });

  it('parses million: "1.250.000 €"', () => {
    expect(normalizePrice('1.250.000 €')).toBe(1250000);
  });

  it('parses price with VB marker', () => {
    expect(normalizePrice('289.000 VB')).toBe(289000);
  });

  it('parses price with VHB marker', () => {
    expect(normalizePrice('289.000 VHB')).toBe(289000);
  });

  it('returns 0 for "Preis auf Anfrage"', () => {
    expect(normalizePrice('Preis auf Anfrage')).toBe(0);
  });

  it('returns 0 for "Verhandlungsbasis"', () => {
    expect(normalizePrice('Verhandlungsbasis')).toBe(0);
  });

  it('handles German decimal format: "289.000,50"', () => {
    expect(normalizePrice('289.000,50')).toBe(289000.50);
  });

  it('handles plain number string', () => {
    expect(normalizePrice('350000')).toBe(350000);
  });

  it('handles $ sign', () => {
    expect(normalizePrice('$350000')).toBe(350000);
  });
});

describe('normalizeArea', () => {
  it('returns 0 for null/empty input', () => {
    expect(normalizeArea(null)).toBe(0);
    expect(normalizeArea(undefined)).toBe(0);
    expect(normalizeArea('')).toBe(0);
  });

  it('returns number directly', () => {
    expect(normalizeArea(78)).toBe(78);
  });

  it('parses "78 m²"', () => {
    expect(normalizeArea('78 m²')).toBe(78);
  });

  it('parses "78,5 qm"', () => {
    expect(normalizeArea('78,5 qm')).toBe(78.5);
  });

  it('parses "78.5 m2"', () => {
    expect(normalizeArea('78.5 m2')).toBe(78.5);
  });

  it('parses plain number string', () => {
    expect(normalizeArea('120')).toBe(120);
  });

  it('handles "m²" suffix', () => {
    expect(normalizeArea('120m²')).toBe(120);
  });
});

describe('extractCity', () => {
  it('returns empty for empty input', () => {
    expect(extractCity('')).toBe('');
  });

  it('extracts city from "PLZ Stadt"', () => {
    expect(extractCity('10115 Berlin')).toBe('Berlin');
  });

  it('extracts city from "Strasse, PLZ Stadt"', () => {
    expect(extractCity('Oranienstr. 45, 10969 Berlin')).toBe('Berlin');
  });

  it('extracts city from "Stadt-Stadtteil"', () => {
    expect(extractCity('Berlin-Kreuzberg')).toBe('Berlin');
  });

  it('returns plain city name', () => {
    expect(extractCity('Berlin')).toBe('Berlin');
  });

  it('handles München', () => {
    expect(extractCity('80333 München')).toBe('München');
  });
});

describe('extractPlz', () => {
  it('returns null for empty input', () => {
    expect(extractPlz('')).toBeNull();
  });

  it('extracts PLZ from address', () => {
    expect(extractPlz('10115 Berlin')).toBe('10115');
  });

  it('extracts PLZ from full address', () => {
    expect(extractPlz('Oranienstr. 45, 10969 Berlin')).toBe('10969');
  });

  it('returns null for address without PLZ', () => {
    expect(extractPlz('Berlin')).toBeNull();
  });

  it('does not match partial numbers', () => {
    expect(extractPlz('123 Berlin')).toBeNull();
  });
});

describe('normalizeRooms', () => {
  it('returns 0 for null/empty', () => {
    expect(normalizeRooms(null)).toBe(0);
    expect(normalizeRooms(undefined)).toBe(0);
    expect(normalizeRooms('')).toBe(0);
  });

  it('returns number directly', () => {
    expect(normalizeRooms(3)).toBe(3);
  });

  it('parses "3 Zimmer"', () => {
    expect(normalizeRooms('3 Zimmer')).toBe(3);
  });

  it('parses "3,5 Zi."', () => {
    expect(normalizeRooms('3,5 Zi.')).toBe(3.5);
  });

  it('parses "2.5 rooms"', () => {
    expect(normalizeRooms('2.5 rooms')).toBe(2.5);
  });

  it('parses plain number string', () => {
    expect(normalizeRooms('4')).toBe(4);
  });
});
