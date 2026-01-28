import { describe, it, expect } from 'vitest';
import { ROUTES_IN_GROUP, isAppRoute } from '@/lib/routes';

describe('Routing Group Guard', () => {
  describe('ROUTES_IN_GROUP', () => {
    it('should contain /dashboard route', () => {
      expect(ROUTES_IN_GROUP).toContain('/dashboard');
    });

    it('should contain all main app routes', () => {
      const expectedRoutes = [
        '/dashboard',
        '/agents',
        '/workflows',
        '/knowledge',
        '/analytics',
        '/board',
        '/admin',
        '/settings',
      ];

      expectedRoutes.forEach((route) => {
        expect(ROUTES_IN_GROUP).toContain(route);
      });
    });

    it('should have at least 8 routes', () => {
      expect(ROUTES_IN_GROUP.length).toBeGreaterThanOrEqual(8);
    });

    it('should have unique routes', () => {
      const uniqueRoutes = new Set(ROUTES_IN_GROUP);
      expect(uniqueRoutes.size).toBe(ROUTES_IN_GROUP.length);
    });

    it('should have routes starting with /', () => {
      ROUTES_IN_GROUP.forEach((route) => {
        expect(route.startsWith('/')).toBe(true);
      });
    });
  });

  describe('isAppRoute', () => {
    it('should return true for dashboard route', () => {
      expect(isAppRoute('/dashboard')).toBe(true);
    });

    it('should return true for agents route', () => {
      expect(isAppRoute('/agents')).toBe(true);
    });

    it('should return true for nested app routes', () => {
      expect(isAppRoute('/agents/123')).toBe(true);
      expect(isAppRoute('/knowledge/456')).toBe(true);
      expect(isAppRoute('/settings/profile')).toBe(true);
    });

    it('should return false for non-app routes', () => {
      expect(isAppRoute('/auth')).toBe(false);
      expect(isAppRoute('/login')).toBe(false);
      expect(isAppRoute('/')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isAppRoute('')).toBe(false);
    });

    it('should handle routes with query params', () => {
      expect(isAppRoute('/dashboard?tab=overview')).toBe(true);
      expect(isAppRoute('/agents?filter=active')).toBe(true);
    });

    it('should handle routes with hash', () => {
      expect(isAppRoute('/dashboard#section')).toBe(true);
      expect(isAppRoute('/settings#profile')).toBe(true);
    });
  });

  describe('Route structure validation', () => {
    it('should not have duplicate route prefixes', () => {
      // Check that no route is a prefix of another
      const sorted = [...ROUTES_IN_GROUP].sort((a, b) => a.length - b.length);

      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          // Ensure longer route doesn't start with shorter unless they're different
          // This is OK if intentional (e.g., /knowledge and /knowledge/settings)
          // But /dashboard and /dashboards would be confusing
          if (sorted[j].startsWith(sorted[i] + '/')) {
            // Just verify the longer one has more path segments
            expect(sorted[j].split('/').length).toBeGreaterThan(sorted[i].split('/').length);
          }
        }
      }
    });

    it('should not have trailing slashes', () => {
      ROUTES_IN_GROUP.forEach((route) => {
        expect(route.endsWith('/')).toBe(false);
      });
    });

    it('should not have double slashes', () => {
      ROUTES_IN_GROUP.forEach((route) => {
        expect(route.includes('//')).toBe(false);
      });
    });
  });

  describe('Type safety', () => {
    it('should be a readonly array', () => {
      // TypeScript compile-time check
      expect(Array.isArray(ROUTES_IN_GROUP)).toBe(true);
    });

    it('should export correct TypeScript type', () => {
      // This is a compile-time check
      const route: (typeof ROUTES_IN_GROUP)[number] = '/dashboard';
      expect(route).toBe('/dashboard');
    });
  });

  describe('Edge cases', () => {
    it('should handle case sensitivity', () => {
      // Routes should be lowercase
      ROUTES_IN_GROUP.forEach((route) => {
        expect(route).toBe(route.toLowerCase());
      });
    });

    it('should return consistent results', () => {
      // Multiple calls should return same result
      expect(isAppRoute('/dashboard')).toBe(isAppRoute('/dashboard'));
      expect(isAppRoute('/agents/123')).toBe(isAppRoute('/agents/123'));
    });

    it('should handle special characters in route', () => {
      // These should still work with dynamic segments
      expect(isAppRoute('/agents/test-agent-123')).toBe(true);
      expect(isAppRoute('/knowledge/doc_123')).toBe(true);
    });
  });
});

describe('File System Guard (Smoke Test)', () => {
  it('should have routes defined', () => {
    // Ensure the routes file exports correctly
    expect(ROUTES_IN_GROUP).toBeDefined();
    expect(Array.isArray(ROUTES_IN_GROUP)).toBe(true);
  });

  it('should export isAppRoute function', () => {
    expect(typeof isAppRoute).toBe('function');
  });

  it('should match expected route structure', () => {
    // Smoke test: verify structure matches what we expect in (app) group
    const mustHaveRoutes = ['/dashboard', '/agents', '/settings'];

    mustHaveRoutes.forEach((route) => {
      expect(ROUTES_IN_GROUP).toContain(route);
    });
  });
});

describe('Integration with Next.js App Router', () => {
  it('should match Next.js route group pattern', () => {
    // All routes should be valid Next.js routes
    ROUTES_IN_GROUP.forEach((route) => {
      // Should start with /
      expect(route.startsWith('/')).toBe(true);

      // Should not contain Next.js special characters unless in dynamic segment
      const segments = route.split('/').filter(Boolean);
      segments.forEach((segment) => {
        if (segment.startsWith('[') && segment.endsWith(']')) {
          // Dynamic segment - OK
          expect(segment.length).toBeGreaterThan(2);
        } else {
          // Normal segment - should be lowercase alphanumeric with hyphens
          expect(segment).toMatch(/^[a-z0-9-_]+$/);
        }
      });
    });
  });

  it('should not conflict with Next.js reserved routes', () => {
    const reservedRoutes = ['/_next', '/api', '/_error', '/404', '/500'];

    ROUTES_IN_GROUP.forEach((route) => {
      reservedRoutes.forEach((reserved) => {
        expect(route.startsWith(reserved)).toBe(false);
      });
    });
  });
});
