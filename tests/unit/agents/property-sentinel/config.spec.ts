import { describe, it, expect } from 'vitest';
import {
  SENTINEL_CONFIG,
  FIRECRAWL_CONFIG,
  PORTAL_CONFIG,
  FREQUENCY_PRESETS,
  SCORING_CONFIG,
  RED_FLAGS,
  GRUNDERWERBSTEUER,
  KLEINANZEIGEN_CATEGORIES,
  SUPPORTED_PORTALS,
  isValidPortal,
  getPortalConfig,
  getFrequencyConfig,
  getScoreLabel,
  type PortalId,
} from '@/lib/agents/property-sentinel/config';

describe('SENTINEL_CONFIG', () => {
  it('has valid maxProfilesPerUser', () => {
    expect(SENTINEL_CONFIG.maxProfilesPerUser).toBeGreaterThan(0);
    expect(SENTINEL_CONFIG.maxProfilesPerUser).toBeLessThanOrEqual(20);
  });

  it('has valid minScanIntervalMinutes', () => {
    expect(SENTINEL_CONFIG.minScanIntervalMinutes).toBeGreaterThan(0);
  });

  it('has valid defaultMinScore', () => {
    expect(SENTINEL_CONFIG.defaultMinScore).toBeGreaterThanOrEqual(0);
    expect(SENTINEL_CONFIG.defaultMinScore).toBeLessThanOrEqual(100);
  });

  it('has valid batchSize', () => {
    expect(SENTINEL_CONFIG.batchSize).toBeGreaterThan(0);
    expect(SENTINEL_CONFIG.batchSize).toBeLessThanOrEqual(10);
  });
});

describe('FIRECRAWL_CONFIG', () => {
  it('has valid dailyCreditLimit', () => {
    expect(FIRECRAWL_CONFIG.dailyCreditLimit).toBeGreaterThan(0);
  });

  it('has valid perScanCreditLimit', () => {
    expect(FIRECRAWL_CONFIG.perScanCreditLimit).toBeGreaterThan(0);
    expect(FIRECRAWL_CONFIG.perScanCreditLimit).toBeLessThan(FIRECRAWL_CONFIG.dailyCreditLimit);
  });

  it('has valid cache TTLs', () => {
    expect(FIRECRAWL_CONFIG.listPageCacheTtlSeconds).toBeGreaterThan(0);
    expect(FIRECRAWL_CONFIG.detailPageCacheTtlSeconds).toBeGreaterThan(0);
    expect(FIRECRAWL_CONFIG.detailPageCacheTtlSeconds).toBeGreaterThan(FIRECRAWL_CONFIG.listPageCacheTtlSeconds);
  });

  it('has valid circuit breaker settings', () => {
    expect(FIRECRAWL_CONFIG.circuitBreakerThreshold).toBeGreaterThan(0);
    expect(FIRECRAWL_CONFIG.circuitBreakerRecoveryMs).toBeGreaterThan(0);
  });
});

describe('PORTAL_CONFIG', () => {
  it('has all supported portals configured', () => {
    for (const portalId of SUPPORTED_PORTALS) {
      expect(PORTAL_CONFIG[portalId]).toBeDefined();
      expect(PORTAL_CONFIG[portalId].id).toBe(portalId);
      expect(PORTAL_CONFIG[portalId].name).toBeTruthy();
      expect(PORTAL_CONFIG[portalId].baseUrl).toMatch(/^https?:\/\//);
      expect(PORTAL_CONFIG[portalId].idPattern).toBeInstanceOf(RegExp);
      expect(PORTAL_CONFIG[portalId].maxPages).toBeGreaterThan(0);
    }
  });

  it('has immoscout24 with correct base URL', () => {
    expect(PORTAL_CONFIG.immoscout24.baseUrl).toContain('immobilienscout24');
  });

  it('has immowelt with correct base URL', () => {
    expect(PORTAL_CONFIG.immowelt.baseUrl).toContain('immowelt');
  });

  it('has kleinanzeigen with correct base URL', () => {
    expect(PORTAL_CONFIG.kleinanzeigen.baseUrl).toContain('kleinanzeigen');
  });

  it('each portal has at least one supported property type', () => {
    for (const portalId of SUPPORTED_PORTALS) {
      expect(PORTAL_CONFIG[portalId].supportedPropertyTypes.length).toBeGreaterThan(0);
    }
  });

  it('each portal has at least one supported purchase type', () => {
    for (const portalId of SUPPORTED_PORTALS) {
      expect(PORTAL_CONFIG[portalId].supportedPurchaseTypes.length).toBeGreaterThan(0);
    }
  });
});

describe('FREQUENCY_PRESETS', () => {
  it('has valid presets with cron expressions', () => {
    const presets = ['hourly', '6x_daily', '3x_daily', 'daily'] as const;
    for (const preset of presets) {
      const config = FREQUENCY_PRESETS[preset];
      expect(config).toBeDefined();
      expect(config.cronExpression).toBeTruthy();
      expect(config.label).toBeTruthy();
    }
  });
});

describe('SCORING_CONFIG', () => {
  it('has 4 categories totaling 100 max points', () => {
    const categories = Object.values(SCORING_CONFIG.categories);
    expect(categories.length).toBe(4);
    const totalMax = categories.reduce((sum, cat) => sum + cat.maxPoints, 0);
    expect(totalMax).toBe(100);
  });

  it('has valid thresholds in descending order', () => {
    expect(SCORING_CONFIG.thresholds.excellent).toBeGreaterThan(SCORING_CONFIG.thresholds.good);
    expect(SCORING_CONFIG.thresholds.good).toBeGreaterThan(SCORING_CONFIG.thresholds.acceptable);
    expect(SCORING_CONFIG.thresholds.acceptable).toBeGreaterThan(SCORING_CONFIG.thresholds.poor);
  });
});

describe('RED_FLAGS', () => {
  it('has at least 10 red flag definitions', () => {
    expect(RED_FLAGS.length).toBeGreaterThanOrEqual(10);
  });

  it('each red flag has required fields', () => {
    for (const flag of RED_FLAGS) {
      expect(flag.id).toBeTruthy();
      expect(flag.keywords.length).toBeGreaterThan(0);
      expect(['critical', 'high', 'medium']).toContain(flag.severity);
      expect(flag.scorePenalty).toBeLessThan(0);
      expect(flag.description).toBeTruthy();
    }
  });

  it('has unique IDs', () => {
    const ids = RED_FLAGS.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('GRUNDERWERBSTEUER', () => {
  it('has all German Bundeslaender', () => {
    const expected = ['BY', 'SN', 'BW', 'HB', 'NI', 'RP', 'ST', 'HE', 'MV', 'BE', 'HH', 'BB', 'NW', 'SL', 'SH', 'TH'];
    for (const code of expected) {
      expect(GRUNDERWERBSTEUER[code]).toBeDefined();
      expect(GRUNDERWERBSTEUER[code]).toBeGreaterThanOrEqual(3.5);
      expect(GRUNDERWERBSTEUER[code]).toBeLessThanOrEqual(6.5);
    }
  });
});

describe('KLEINANZEIGEN_CATEGORIES', () => {
  it('has categories for common combinations', () => {
    expect(KLEINANZEIGEN_CATEGORIES['wohnung_kauf']).toBeDefined();
    expect(KLEINANZEIGEN_CATEGORIES['wohnung_miete']).toBeDefined();
    expect(KLEINANZEIGEN_CATEGORIES['haus_kauf']).toBeDefined();
  });
});

describe('isValidPortal', () => {
  it('returns true for valid portals', () => {
    expect(isValidPortal('immoscout24')).toBe(true);
    expect(isValidPortal('immowelt')).toBe(true);
    expect(isValidPortal('kleinanzeigen')).toBe(true);
  });

  it('returns false for invalid portals', () => {
    expect(isValidPortal('zillow')).toBe(false);
    expect(isValidPortal('')).toBe(false);
    expect(isValidPortal('IMMOSCOUT24')).toBe(false);
  });
});

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

describe('getFrequencyConfig', () => {
  it('returns config for valid frequency', () => {
    const config = getFrequencyConfig('daily');
    expect(config).toBeDefined();
    expect(config!.cronExpression).toBeTruthy();
  });

  it('returns undefined for custom frequency', () => {
    expect(getFrequencyConfig('custom')).toBeUndefined();
  });
});

describe('getScoreLabel', () => {
  it('returns Exzellent for high scores', () => {
    expect(getScoreLabel(85).label).toBe('Exzellent');
    expect(getScoreLabel(100).label).toBe('Exzellent');
  });

  it('returns Gut for good scores', () => {
    expect(getScoreLabel(65).label).toBe('Gut');
    expect(getScoreLabel(79).label).toBe('Gut');
  });

  it('returns Akzeptabel for acceptable scores', () => {
    expect(getScoreLabel(50).label).toBe('Akzeptabel');
    expect(getScoreLabel(64).label).toBe('Akzeptabel');
  });

  it('returns Schwach for poor scores', () => {
    expect(getScoreLabel(0).label).toBe('Schwach');
    expect(getScoreLabel(49).label).toBe('Schwach');
  });

  it('returns a color for each label', () => {
    expect(getScoreLabel(90).color).toMatch(/^#/);
    expect(getScoreLabel(70).color).toMatch(/^#/);
    expect(getScoreLabel(55).color).toMatch(/^#/);
    expect(getScoreLabel(30).color).toMatch(/^#/);
  });
});
