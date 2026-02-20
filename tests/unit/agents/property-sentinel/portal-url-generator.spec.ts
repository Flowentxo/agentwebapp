import { describe, it, expect } from 'vitest';
import { generatePortalUrl, type SearchCriteria } from '@/lib/agents/property-sentinel/services/PortalUrlGenerator';

const baseCriteria: SearchCriteria = {
  location: { city: 'Berlin', state: 'berlin' },
  property_type: 'wohnung',
  purchase_type: 'kauf',
};

describe('generatePortalUrl — ImmoScout24', () => {
  it('generates basic URL for Berlin apartment purchase', () => {
    const url = generatePortalUrl('immoscout24', baseCriteria);
    expect(url).toContain('immobilienscout24.de');
    expect(url).toContain('berlin');
    expect(url).toContain('wohnung-kaufen');
  });

  it('includes price filters', () => {
    const criteria: SearchCriteria = {
      ...baseCriteria,
      price_min: 200000,
      price_max: 500000,
    };
    const url = generatePortalUrl('immoscout24', criteria);
    expect(url).toContain('pricefrom=200000');
    expect(url).toContain('priceto=500000');
  });

  it('includes area filters', () => {
    const criteria: SearchCriteria = {
      ...baseCriteria,
      area_min: 50,
      area_max: 100,
    };
    const url = generatePortalUrl('immoscout24', criteria);
    expect(url).toContain('livingspacefrom=50');
    expect(url).toContain('livingspaceto=100');
  });

  it('includes rooms filter', () => {
    const criteria: SearchCriteria = {
      ...baseCriteria,
      rooms_min: 2,
    };
    const url = generatePortalUrl('immoscout24', criteria);
    expect(url).toContain('numberofrooms=2-');
  });

  it('handles miete (rent) type', () => {
    const criteria: SearchCriteria = {
      ...baseCriteria,
      purchase_type: 'miete',
    };
    const url = generatePortalUrl('immoscout24', criteria);
    expect(url).toContain('wohnung-mieten');
  });

  it('handles haus property type', () => {
    const criteria: SearchCriteria = {
      ...baseCriteria,
      property_type: 'haus',
    };
    const url = generatePortalUrl('immoscout24', criteria);
    expect(url).toContain('haus-kaufen');
  });

  it('handles pagination', () => {
    const url = generatePortalUrl('immoscout24', baseCriteria, 2);
    expect(url).toContain('pagenumber=2');
  });
});

describe('generatePortalUrl — Immowelt', () => {
  it('generates basic URL for Berlin', () => {
    const url = generatePortalUrl('immowelt', baseCriteria);
    expect(url).toContain('immowelt.de');
    expect(url).toContain('berlin');
    expect(url).toContain('wohnungen');
    expect(url).toContain('kaufen');
  });

  it('includes price filters', () => {
    const criteria: SearchCriteria = {
      ...baseCriteria,
      price_min: 200000,
      price_max: 500000,
    };
    const url = generatePortalUrl('immowelt', criteria);
    expect(url).toContain('pma=200000');
    expect(url).toContain('pmx=500000');
  });

  it('includes area filters', () => {
    const criteria: SearchCriteria = {
      ...baseCriteria,
      area_min: 50,
      area_max: 100,
    };
    const url = generatePortalUrl('immowelt', criteria);
    expect(url).toContain('wflf=50');
    expect(url).toContain('wflt=100');
  });

  it('handles pagination', () => {
    const url = generatePortalUrl('immowelt', baseCriteria, 2);
    expect(url).toContain('page=2');
  });
});

describe('generatePortalUrl — Kleinanzeigen', () => {
  it('generates basic URL', () => {
    const url = generatePortalUrl('kleinanzeigen', baseCriteria);
    expect(url).toContain('kleinanzeigen.de');
    expect(url).toContain('wohnung-kauf');
  });

  it('includes price filters', () => {
    const criteria: SearchCriteria = {
      ...baseCriteria,
      price_min: 200000,
      price_max: 500000,
    };
    const url = generatePortalUrl('kleinanzeigen', criteria);
    expect(url).toContain('minPrice=200000');
    expect(url).toContain('maxPrice=500000');
  });

  it('includes location filter', () => {
    const url = generatePortalUrl('kleinanzeigen', baseCriteria);
    expect(url).toContain('locationStr=Berlin');
  });

  it('includes radius when set', () => {
    const criteria: SearchCriteria = {
      ...baseCriteria,
      location: { city: 'Berlin', radius_km: 20 },
    };
    const url = generatePortalUrl('kleinanzeigen', criteria);
    expect(url).toContain('radius=20');
  });
});

describe('generatePortalUrl — error handling', () => {
  it('throws for unsupported portal', () => {
    expect(() => generatePortalUrl('zillow' as any, baseCriteria)).toThrow('Unsupported portal');
  });
});
