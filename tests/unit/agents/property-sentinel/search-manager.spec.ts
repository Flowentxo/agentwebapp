import { describe, it, expect, vi, beforeEach } from 'vitest';

// Build a fresh chainable mock for each test
function buildChainableMock() {
  const mock: any = {};
  const methods = ['select', 'from', 'where', 'orderBy', 'insert', 'values', 'returning', 'update', 'set'];
  for (const m of methods) {
    mock[m] = vi.fn().mockReturnValue(mock);
  }
  return mock;
}

let mockDb: any;

vi.mock('@/lib/db/connection', () => ({
  getDb: () => mockDb,
}));

vi.mock('@/lib/db/schema-sentinel', () => ({
  sentinelSearchProfiles: {
    id: 'id',
    userId: 'user_id',
    isActive: 'is_active',
    createdAt: 'created_at',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...args) => ({ and: args })),
  desc: vi.fn((col) => ({ desc: col })),
}));

import { executeSearchManager } from '@/lib/agents/property-sentinel/tools/search-manager';

describe('executeSearchManager', () => {
  const userId = 'test-user-uuid';

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = buildChainableMock();
  });

  describe('action: list', () => {
    it('returns empty list message when no profiles', async () => {
      // select → from → where → orderBy resolves to empty
      mockDb.orderBy.mockResolvedValueOnce([]);

      const result = await executeSearchManager(
        { action: 'list' },
        { userId },
      );

      expect(result.formatted_output).toContain('Keine Suchprofile');
    });

    it('returns formatted profiles list', async () => {
      const profiles = [
        {
          id: 'profile-1',
          name: 'Berlin Wohnung Kauf',
          isActive: true,
          portals: ['immoscout24'],
          totalScans: 5,
          totalFound: 20,
          totalQualified: 3,
          lastScanAt: new Date('2026-02-01'),
        },
      ];
      mockDb.orderBy.mockResolvedValueOnce(profiles);

      const result = await executeSearchManager(
        { action: 'list' },
        { userId },
      );

      expect(result.profiles).toHaveLength(1);
      expect(result.formatted_output).toContain('Berlin Wohnung Kauf');
      expect(result.formatted_output).toContain('Aktiv');
    });
  });

  describe('action: create — validation', () => {
    it('returns validation error when city is missing', async () => {
      const result = await executeSearchManager(
        {
          action: 'create',
          criteria: {
            property_type: 'wohnung',
            purchase_type: 'kauf',
          },
        },
        { userId },
      );

      expect(result.formatted_output).toContain('Validierungsfehler');
      expect(result.formatted_output).toContain('Stadt');
    });

    it('returns validation error when property_type is missing', async () => {
      const result = await executeSearchManager(
        {
          action: 'create',
          criteria: {
            location: { city: 'Berlin' },
            purchase_type: 'kauf',
          },
        },
        { userId },
      );

      expect(result.formatted_output).toContain('Validierungsfehler');
      expect(result.formatted_output).toContain('Objekttyp');
    });

    it('returns validation error when purchase_type is missing', async () => {
      const result = await executeSearchManager(
        {
          action: 'create',
          criteria: {
            location: { city: 'Berlin' },
            property_type: 'wohnung',
          },
        },
        { userId },
      );

      expect(result.formatted_output).toContain('Validierungsfehler');
      expect(result.formatted_output).toContain('Kauf/Miete');
    });

    it('returns validation error when price_min > price_max', async () => {
      const result = await executeSearchManager(
        {
          action: 'create',
          criteria: {
            location: { city: 'Berlin' },
            property_type: 'wohnung',
            purchase_type: 'kauf',
            price_min: 500000,
            price_max: 200000,
          },
        },
        { userId },
      );

      expect(result.formatted_output).toContain('Validierungsfehler');
      expect(result.formatted_output).toContain('Mindestpreis');
    });

    it('rejects invalid portal', async () => {
      const result = await executeSearchManager(
        {
          action: 'create',
          criteria: {
            location: { city: 'Berlin' },
            property_type: 'wohnung',
            purchase_type: 'kauf',
          },
          portals: ['zillow'],
        },
        { userId },
      );

      expect(result.formatted_output).toContain('Validierungsfehler');
      expect(result.formatted_output).toContain('zillow');
    });
  });

  describe('action: create — success', () => {
    it('creates profile when all criteria valid', async () => {
      // First DB call: select existing active profiles
      // select → from → where chain returns array
      mockDb.where.mockResolvedValueOnce([]);
      // Second DB call: insert → values → returning
      mockDb.returning.mockResolvedValueOnce([
        { id: 'new-profile-uuid', name: 'Test Profil' },
      ]);

      const result = await executeSearchManager(
        {
          action: 'create',
          criteria: {
            name: 'Test Profil',
            location: { city: 'Berlin' },
            property_type: 'wohnung',
            purchase_type: 'kauf',
            price_max: 400000,
          },
          portals: ['immoscout24'],
        },
        { userId },
      );

      expect(result.formatted_output).toContain('Suchprofil erstellt');
      expect(result.formatted_output).toContain('Test Profil');
    });
  });

  describe('action: delete', () => {
    it('returns not found when profile does not exist', async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      const result = await executeSearchManager(
        { action: 'delete', profile_id: 'nonexistent-uuid' },
        { userId },
      );

      expect(result.formatted_output).toContain('nicht gefunden');
    });

    it('deletes (deactivates) existing profile', async () => {
      mockDb.returning.mockResolvedValueOnce([
        { id: 'profile-1', name: 'Berlin Profil', isActive: false },
      ]);

      const result = await executeSearchManager(
        { action: 'delete', profile_id: 'profile-1' },
        { userId },
      );

      expect(result.formatted_output).toContain('geloescht');
      expect(result.formatted_output).toContain('Berlin Profil');
    });
  });

  describe('action: pause', () => {
    it('returns not found for nonexistent profile', async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      const result = await executeSearchManager(
        { action: 'pause', profile_id: 'nonexistent-uuid' },
        { userId },
      );

      expect(result.formatted_output).toContain('nicht gefunden');
    });

    it('pauses existing profile', async () => {
      mockDb.returning.mockResolvedValueOnce([
        { id: 'profile-1', name: 'Test Profil', isActive: false },
      ]);

      const result = await executeSearchManager(
        { action: 'pause', profile_id: 'profile-1' },
        { userId },
      );

      expect(result.formatted_output).toContain('pausiert');
    });
  });

  describe('action: resume', () => {
    it('resumes paused profile', async () => {
      mockDb.returning.mockResolvedValueOnce([
        { id: 'profile-1', name: 'Test Profil', isActive: true },
      ]);

      const result = await executeSearchManager(
        { action: 'resume', profile_id: 'profile-1' },
        { userId },
      );

      expect(result.formatted_output).toContain('aktiviert');
    });
  });

  describe('action: stats', () => {
    it('returns not found for nonexistent profile', async () => {
      mockDb.where.mockResolvedValueOnce([]);

      const result = await executeSearchManager(
        { action: 'stats', profile_id: 'nonexistent-uuid' },
        { userId },
      );

      expect(result.formatted_output).toContain('nicht gefunden');
    });

    it('returns stats for existing profile', async () => {
      mockDb.where.mockResolvedValueOnce([
        {
          id: 'profile-1',
          name: 'Berlin Test',
          isActive: true,
          location: { city: 'Berlin', state: 'BE' },
          propertyType: 'wohnung',
          portals: ['immoscout24'],
          frequency: 'daily',
          minScore: 60,
          totalScans: 10,
          totalFound: 50,
          totalQualified: 8,
          lastScanAt: new Date('2026-02-15'),
          lastScanStatus: 'success',
          lastScanError: null,
        },
      ]);

      const result = await executeSearchManager(
        { action: 'stats', profile_id: 'profile-1' },
        { userId },
      );

      expect(result.formatted_output).toContain('Berlin Test');
      expect(result.formatted_output).toContain('Aktiv');
      expect(result.formatted_output).toContain('10');
    });
  });

  describe('unknown action', () => {
    it('returns error for unknown action', async () => {
      const result = await executeSearchManager(
        { action: 'unknown' as any },
        { userId },
      );

      expect(result.formatted_output).toContain('Unbekannte Aktion');
    });
  });
});
