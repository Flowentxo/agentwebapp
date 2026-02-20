/**
 * Firecrawl Service
 *
 * Singleton wrapper around the Firecrawl API for scraping real estate portals.
 * Includes: rate limiting, circuit breaker, Redis caching, credit tracking, retry logic.
 */

import { createHash } from 'crypto';
import { FIRECRAWL_CONFIG, PORTAL_CONFIG, type PortalId } from '../config';
import { withRetry } from '@/lib/ai/error-handler';

// ── Types ─────────────────────────────────────────────────────

export interface ScrapedListing {
  title: string;
  price?: number;
  area_sqm?: number;
  rooms?: number;
  address?: string;
  portal_id: string;
  detail_url: string;
}

export interface ListScrapeResult {
  listings: ScrapedListing[];
  creditsUsed: number;
  cached: boolean;
}

export interface DetailScrapeResult {
  description?: string;
  features?: string[];
  year_built?: number;
  energy_rating?: string;
  heating_type?: string;
  floor?: string;
  parking?: boolean;
  balcony?: boolean;
  garden?: boolean;
  images?: string[];
  agent_name?: string;
  agent_phone?: string;
  monthly_rent?: number;
  service_charges?: number;
  ground_rent?: number;
  commission?: string;
  condition?: string;
  creditsUsed: number;
  cached: boolean;
}

// ── Circuit Breaker State ─────────────────────────────────────

interface CircuitState {
  failures: number;
  lastFailureAt: number;
  isOpen: boolean;
}

// ── Rate Limiter (Token Bucket) ───────────────────────────────

class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillRate: number, // tokens per second
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    // Wait until a token is available
    const waitMs = Math.ceil((1 - this.tokens) / this.refillRate * 1000);
    await new Promise(resolve => setTimeout(resolve, waitMs));
    this.refill();
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// ── Firecrawl Service ─────────────────────────────────────────

export class FirecrawlService {
  private static instance: FirecrawlService;
  private apiKey: string;
  private baseUrl = 'https://api.firecrawl.dev/v1';
  private rateLimiter: TokenBucket;
  private circuitBreakers: Map<string, CircuitState> = new Map();
  private creditsUsedToday: Map<string, number> = new Map();

  constructor() {
    this.apiKey = process.env.FIRECRAWL_API_KEY || '';
    // Max 2 concurrent, ~10 per minute → ~0.167 per second
    this.rateLimiter = new TokenBucket(
      FIRECRAWL_CONFIG.maxRetries,
      FIRECRAWL_CONFIG.maxRetries / 60,
    );
  }

  static getInstance(): FirecrawlService {
    if (!FirecrawlService.instance) {
      FirecrawlService.instance = new FirecrawlService();
    }
    return FirecrawlService.instance;
  }

  // ── List Page Scrape ──────────────────────────────────────

  async scrapeListPage(url: string, portal: PortalId): Promise<ListScrapeResult> {
    // Check circuit breaker
    if (this.isCircuitOpen(portal)) {
      console.warn(`[FIRECRAWL] Circuit breaker OPEN for ${portal}, skipping`);
      return { listings: [], creditsUsed: 0, cached: false };
    }

    // Check cache
    const cacheKey = this.hashUrl(url);
    const cached = await this.getFromCache(`list:${cacheKey}`);
    if (cached) {
      return { listings: JSON.parse(cached), creditsUsed: 0, cached: true };
    }

    // Rate limit
    await this.rateLimiter.acquire();

    try {
      const result = await withRetry(async () => {
        const response = await fetch(`${this.baseUrl}/scrape`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            url,
            formats: ['extract'],
            extract: {
              schema: {
                type: 'object',
                properties: {
                  listings: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string' },
                        price: { type: 'number' },
                        area_sqm: { type: 'number' },
                        rooms: { type: 'number' },
                        address: { type: 'string' },
                        portal_id: { type: 'string' },
                        detail_url: { type: 'string' },
                      },
                      required: ['title', 'detail_url'],
                    },
                  },
                },
                required: ['listings'],
              },
            },
            waitFor: PORTAL_CONFIG[portal].requiresJsRendering ? 5000 : 0,
          }),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Firecrawl API error ${response.status}: ${errText}`);
        }

        return response.json();
      }, FIRECRAWL_CONFIG.maxRetries, FIRECRAWL_CONFIG.initialBackoffMs);

      const listings: ScrapedListing[] = result?.data?.extract?.listings || [];

      // Reset circuit breaker on success
      this.resetCircuitBreaker(portal);

      // Cache result
      await this.setCache(
        `list:${cacheKey}`,
        JSON.stringify(listings),
        FIRECRAWL_CONFIG.listPageCacheTtlSeconds,
      );

      return {
        listings,
        creditsUsed: FIRECRAWL_CONFIG.listPageCreditCost,
        cached: false,
      };
    } catch (error: any) {
      console.error(`[FIRECRAWL] List scrape failed for ${portal}:`, error.message);
      this.recordFailure(portal);
      return { listings: [], creditsUsed: 0, cached: false };
    }
  }

  // ── Detail Page Scrape ────────────────────────────────────

  async scrapeDetailPage(url: string, portal: PortalId): Promise<DetailScrapeResult | null> {
    if (this.isCircuitOpen(portal)) {
      return null;
    }

    const cacheKey = this.hashUrl(url);
    const cached = await this.getFromCache(`detail:${cacheKey}`);
    if (cached) {
      return { ...JSON.parse(cached), creditsUsed: 0, cached: true };
    }

    await this.rateLimiter.acquire();

    try {
      const result = await withRetry(async () => {
        const response = await fetch(`${this.baseUrl}/scrape`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            url,
            formats: ['extract'],
            extract: {
              schema: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  features: { type: 'array', items: { type: 'string' } },
                  year_built: { type: 'number' },
                  energy_rating: { type: 'string' },
                  heating_type: { type: 'string' },
                  floor: { type: 'string' },
                  parking: { type: 'boolean' },
                  balcony: { type: 'boolean' },
                  garden: { type: 'boolean' },
                  images: { type: 'array', items: { type: 'string' } },
                  agent_name: { type: 'string' },
                  agent_phone: { type: 'string' },
                  monthly_rent: { type: 'number' },
                  service_charges: { type: 'number' },
                  ground_rent: { type: 'number' },
                  commission: { type: 'string' },
                  condition: { type: 'string' },
                },
              },
            },
            waitFor: PORTAL_CONFIG[portal].requiresJsRendering ? 5000 : 0,
          }),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Firecrawl API error ${response.status}: ${errText}`);
        }

        return response.json();
      }, FIRECRAWL_CONFIG.maxRetries, FIRECRAWL_CONFIG.initialBackoffMs);

      const detail = result?.data?.extract || {};
      this.resetCircuitBreaker(portal);

      await this.setCache(
        `detail:${cacheKey}`,
        JSON.stringify(detail),
        FIRECRAWL_CONFIG.detailPageCacheTtlSeconds,
      );

      return {
        ...detail,
        creditsUsed: FIRECRAWL_CONFIG.detailPageCreditCost,
        cached: false,
      };
    } catch (error: any) {
      console.error(`[FIRECRAWL] Detail scrape failed for ${portal}:`, error.message);
      this.recordFailure(portal);
      return null;
    }
  }

  // ── Budget Guard ──────────────────────────────────────────

  async checkBudget(userId: string): Promise<{ allowed: boolean; remaining: number; reason?: string }> {
    const today = new Date().toISOString().split('T')[0];
    const key = `${userId}:${today}`;
    const used = this.creditsUsedToday.get(key) || 0;
    const remaining = FIRECRAWL_CONFIG.dailyCreditLimit - used;

    if (remaining <= 0) {
      return { allowed: false, remaining: 0, reason: 'Tageslimit erreicht' };
    }

    return { allowed: true, remaining };
  }

  trackCredits(userId: string, credits: number): void {
    const today = new Date().toISOString().split('T')[0];
    const key = `${userId}:${today}`;
    const current = this.creditsUsedToday.get(key) || 0;
    this.creditsUsedToday.set(key, current + credits);
  }

  // ── Circuit Breaker ───────────────────────────────────────

  private isCircuitOpen(portal: string): boolean {
    const state = this.circuitBreakers.get(portal);
    if (!state || !state.isOpen) return false;

    // Check if recovery period has passed (half-open)
    if (Date.now() - state.lastFailureAt > FIRECRAWL_CONFIG.circuitBreakerRecoveryMs) {
      state.isOpen = false;
      state.failures = 0;
      return false;
    }

    return true;
  }

  private recordFailure(portal: string): void {
    const state = this.circuitBreakers.get(portal) || { failures: 0, lastFailureAt: 0, isOpen: false };
    state.failures += 1;
    state.lastFailureAt = Date.now();

    if (state.failures >= FIRECRAWL_CONFIG.circuitBreakerThreshold) {
      state.isOpen = true;
      console.warn(`[FIRECRAWL] Circuit breaker TRIPPED for ${portal} after ${state.failures} failures`);
    }

    this.circuitBreakers.set(portal, state);
  }

  private resetCircuitBreaker(portal: string): void {
    this.circuitBreakers.delete(portal);
  }

  // ── Caching (in-memory for Phase 1, Redis in Phase 2) ────

  private cache: Map<string, { value: string; expiresAt: number }> = new Map();

  private async getFromCache(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  private async setCache(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  // ── Utility ───────────────────────────────────────────────

  private hashUrl(url: string): string {
    return createHash('sha256').update(url).digest('hex').substring(0, 16);
  }

  /** Check if the service has a valid API key */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.startsWith('fc-');
  }
}
