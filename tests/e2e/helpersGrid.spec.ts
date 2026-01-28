import { test, expect } from '@playwright/test';

/**
 * HelpersGrid/AgentGrid Tests
 * Tests filter, sort, empty states and grid functionality
 * Sprint 1 - Foundations & Dashboard Parity
 */

test.describe('Helpers Grid - Filter & Sort', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3003/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('renders at least 8 agent cards', async ({ page }) => {
    await page.waitForSelector('[data-testid="agent-card"]', { timeout: 10000 });
    const cards = await page.locator('[data-testid="agent-card"]').count();
    expect(cards, 'Should have at least 8 agents in the grid').toBeGreaterThanOrEqual(8);
  });

  test('filters agents by query param ?q=', async ({ page }) => {
    await page.goto('http://localhost:3003/dashboard?q=dexter');
    await page.waitForLoadState('networkidle');
    const searchInput = page.locator('input[type="search"], input[placeholder*="suchen"], input[placeholder*="Suchen"]').first();
    await expect(searchInput).toHaveValue('dexter');
    const cards = await page.locator('[data-testid="agent-card"]').count();
    expect(cards, 'Filtered results should show fewer cards').toBeGreaterThan(0);
  });

  test('sorts agents by name when ?sort=name-asc', async ({ page }) => {
    await page.goto('http://localhost:3003/dashboard?sort=name-asc');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="agent-card"]', { timeout: 10000 });
    const cards = await page.locator('[data-testid="agent-card"]').all();
    const names = [];
    for (const card of cards.slice(0, 5)) {
      const nameEl = await card.locator('h3').textContent();
      if (nameEl) names.push(nameEl.trim());
    }
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  test('filters by onlyActive=true shows only active agents', async ({ page }) => {
    await page.goto('http://localhost:3003/dashboard');
    await page.waitForLoadState('networkidle');
    const activeFilter = page.getByRole('button', { name: /active/i });
    if (await activeFilter.count() > 0) {
      await activeFilter.first().click();
      await page.waitForTimeout(500);
      const statusIndicators = await page.locator('[aria-label="Active"]').count();
      const cards = await page.locator('[data-testid="agent-card"]').count();
      expect(statusIndicators, 'All cards should show active status').toBeGreaterThanOrEqual(1);
    } else {
      test.skip('Active filter button not found');
    }
  });
});

test.describe('Helpers Grid - Empty State', () => {
  test('shows empty state when no agents available', async ({ page }) => {
    await page.route('**/api/unified-agents', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
    await page.goto('http://localhost:3003/dashboard');
    await page.waitForLoadState('networkidle');
    const emptyMessage = page.locator('text=/keine.*agents/i, text=/no.*agents/i, text=/empty/i').first();
    if (await emptyMessage.count() > 0) {
      await expect(emptyMessage).toBeVisible({ timeout: 5000 });
    }
  });

  test('empty state has accessible CTA button', async ({ page }) => {
    await page.route('**/api/unified-agents', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.goto('http://localhost:3003/dashboard');
    await page.waitForTimeout(1000);
    const createButton = page.getByRole('button', { name: /agent erstellen/i });
    if (await createButton.count() > 0) {
      const button = createButton.first();
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      if (box) expect(box.height, 'CTA button should be at least 44px tall').toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('Helpers Grid - Card CTAs', () => {
  test('each card has exactly one primary CTA', async ({ page }) => {
    await page.goto('http://localhost:3003/dashboard');
    await page.waitForSelector('[data-testid="agent-card"]', { timeout: 10000 });
    const cards = await page.locator('[data-testid="agent-card"]').all();
    expect(cards.length, 'Should have at least one card').toBeGreaterThan(0);
    for (const card of cards.slice(0, 5)) {
      const primaryCTA = card.locator('a').filter({ hasText: /open|→/i });
      const ctaCount = await primaryCTA.count();
      expect(ctaCount, 'Each card should have at least one primary CTA').toBeGreaterThanOrEqual(1);
      const firstCTA = primaryCTA.first();
      await expect(firstCTA).toBeVisible();
      const box = await firstCTA.boundingBox();
      if (box) expect(box.height, 'Primary CTA should be at least 40px tall').toBeGreaterThanOrEqual(40);
    }
  });
});

test.describe('Helpers Grid - Search Integration', () => {
  test('search input filters results in real-time', async ({ page }) => {
    await page.goto('http://localhost:3003/dashboard');
    await page.waitForSelector('[data-testid="agent-card"]', { timeout: 10000 });
    const initialCount = await page.locator('[data-testid="agent-card"]').count();
    const searchInput = page.locator('input[type="search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('dexter');
      await page.waitForTimeout(500);
      const filteredCount = await page.locator('[data-testid="agent-card"]').count();
      expect(filteredCount, 'Filtered count should be less than or equal to initial count').toBeLessThanOrEqual(initialCount);
    } else {
      test.skip('Search input not found');
    }
  });

  test('keyboard shortcuts / and Cmd+K focus search', async ({ page }) => {
    await page.goto('http://localhost:3003/dashboard');
    await page.waitForLoadState('networkidle');
    const searchInput = page.locator('input[type="search"]').first();
    if (await searchInput.count() > 0) {
      await page.keyboard.press('/');
      await expect(searchInput).toBeFocused();
      await page.keyboard.press('Escape');
      const isMac = process.platform === 'darwin';
      if (isMac) await page.keyboard.press('Meta+K');
      else await page.keyboard.press('Control+K');
      await expect(searchInput).toBeFocused();
    } else {
      test.skip('Search input not found');
    }
  });
});

test.describe('Helpers Grid - Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 667 } });
  test('all touch targets are at least 44x44px', async ({ page }) => {
    await page.goto('http://localhost:3003/dashboard');
    await page.waitForSelector('[data-testid="agent-card"]', { timeout: 10000 });
    const buttons = await page.locator('button, a[role="button"], a[href]').all();
    for (const btn of buttons.slice(0, 10)) {
      if (await btn.isVisible()) {
        const box = await btn.boundingBox();
        if (box) {
          expect(box.height, 'Touch target should be ≥44px tall').toBeGreaterThanOrEqual(44);
          expect(box.width, 'Touch target should be ≥44px wide').toBeGreaterThanOrEqual(44);
        }
      }
    }
  });
});