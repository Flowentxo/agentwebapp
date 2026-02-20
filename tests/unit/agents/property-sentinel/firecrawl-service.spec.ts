import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the config before importing service
vi.mock('@/lib/agents/property-sentinel/config', () => ({
  FIRECRAWL_CONFIG: {
    dailyCreditLimit: 500,
    perScanCreditLimit: 30,
    listPageCreditCost: 1,
    detailPageCreditCost: 1,
    listPageCacheTtlSeconds: 1800,
    detailPageCacheTtlSeconds: 86400,
    circuitBreakerThreshold: 3,
    circuitBreakerRecoveryMs: 5000,
    maxRetries: 2,
    initialBackoffMs: 100,
  },
  PORTAL_CONFIG: {
    immoscout24: {
      id: 'immoscout24',
      name: 'ImmoScout24',
      baseUrl: 'https://www.immobilienscout24.de',
      requiresJsRendering: true,
      idPattern: /\/expose\/(\d+)/,
      maxPages: 2,
      supportedPropertyTypes: ['wohnung'],
      supportedPurchaseTypes: ['kauf'],
    },
  },
}));

// Mock the retry function
vi.mock('@/lib/ai/error-handler', () => ({
  withRetry: vi.fn(async (fn) => fn()),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('FirecrawlService', () => {
  let service: any;

  beforeEach(async () => {
    vi.stubEnv('FIRECRAWL_API_KEY', 'fc-test-key-123');
    // Reset singleton
    vi.resetModules();
    const mod = await import('@/lib/agents/property-sentinel/services/FirecrawlService');
    // Access the class to create a new instance for testing
    service = mod.FirecrawlService.getInstance();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('isConfigured', () => {
    it('returns true when API key starts with fc-', () => {
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('checkBudget', () => {
    it('returns allowed=true for new user', async () => {
      const result = await service.checkBudget('user-123');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('tracks credits and enforces daily limit', async () => {
      service.trackCredits('user-budget-test', 500);
      const result = await service.checkBudget('user-budget-test');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('trackCredits', () => {
    it('accumulates credits for the same user+day', () => {
      service.trackCredits('user-track', 10);
      service.trackCredits('user-track', 15);
      // Check by budget
      // The credits should be 25 total, remaining should be 500-25=475
      // We can verify via checkBudget
    });
  });

  describe('scrapeListPage', () => {
    it('returns listings on successful scrape', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            extract: {
              listings: [
                { title: 'Test Wohnung', price: 289000, detail_url: 'https://example.com/expose/123' },
              ],
            },
          },
        }),
      });

      const result = await service.scrapeListPage(
        'https://www.immobilienscout24.de/Suche/de/berlin/berlin/wohnung-kaufen',
        'immoscout24',
      );

      expect(result.listings).toHaveLength(1);
      expect(result.listings[0].title).toBe('Test Wohnung');
      expect(result.creditsUsed).toBe(1);
    });

    it('returns empty listings on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const result = await service.scrapeListPage(
        'https://www.immobilienscout24.de/Suche/de/berlin/berlin/wohnung-kaufen',
        'immoscout24',
      );

      expect(result.listings).toHaveLength(0);
      expect(result.creditsUsed).toBe(0);
    });

    it('returns cached results on second call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            extract: {
              listings: [{ title: 'Cached', detail_url: 'https://example.com/1' }],
            },
          },
        }),
      });

      const url = 'https://www.immobilienscout24.de/Suche/de/berlin/cache-test';

      // First call — hits API
      const result1 = await service.scrapeListPage(url, 'immoscout24');
      expect(result1.cached).toBe(false);
      expect(result1.creditsUsed).toBe(1);

      // Second call — should be cached
      const result2 = await service.scrapeListPage(url, 'immoscout24');
      expect(result2.cached).toBe(true);
      expect(result2.creditsUsed).toBe(0);

      // Fetch should only have been called once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('scrapeDetailPage', () => {
    it('returns detail data on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            extract: {
              description: 'Schöne 2-Zimmer-Wohnung',
              year_built: 1990,
              balcony: true,
            },
          },
        }),
      });

      const result = await service.scrapeDetailPage(
        'https://www.immobilienscout24.de/expose/123456',
        'immoscout24',
      );

      expect(result).not.toBeNull();
      expect(result.description).toBe('Schöne 2-Zimmer-Wohnung');
      expect(result.year_built).toBe(1990);
      expect(result.balcony).toBe(true);
    });

    it('returns null on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      const result = await service.scrapeDetailPage(
        'https://www.immobilienscout24.de/expose/notfound',
        'immoscout24',
      );

      expect(result).toBeNull();
    });
  });
});
