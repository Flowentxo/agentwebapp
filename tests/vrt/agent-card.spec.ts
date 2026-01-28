import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests für AgentCard
 *
 * Diese Tests vergleichen Screenshots mit Baseline-Images.
 * Bei ersten Durchlauf werden Baselines erstellt.
 *
 * Run:
 *   pnpm playwright test tests/vrt --update-snapshots  // Baselines erstellen
 *   pnpm playwright test tests/vrt                      // Vergleichen
 */

test.describe('AgentCard Visual Regression', () => {
  const storybookUrl = 'http://localhost:6006';
  const iframePrefix = '/iframe.html?id=';

  test.beforeEach(async ({ page }) => {
    // Warten bis Storybook bereit ist
    await page.goto(storybookUrl, { waitUntil: 'networkidle' });
  });

  test('Default state matches baseline', async ({ page }) => {
    await page.goto(`${storybookUrl}${iframePrefix}components-agents-classicagentcard--default`);

    const card = page.locator('[data-testid="agent-card"]').first();
    await card.waitFor({ state: 'visible' });

    // Warten auf Animationen (falls vorhanden)
    await page.waitForTimeout(300);

    await expect(card).toHaveScreenshot('agent-card-default.png', {
      maxDiffPixels: 150,
      threshold: 0.2,
    });
  });

  test('Paused state matches baseline', async ({ page }) => {
    await page.goto(`${storybookUrl}${iframePrefix}components-agents-classicagentcard--paused`);

    const card = page.locator('[data-testid="agent-card"]').first();
    await card.waitFor({ state: 'visible' });
    await page.waitForTimeout(300);

    await expect(card).toHaveScreenshot('agent-card-paused.png', {
      maxDiffPixels: 150,
      threshold: 0.2,
    });
  });

  test('Warning state matches baseline', async ({ page }) => {
    await page.goto(`${storybookUrl}${iframePrefix}components-agents-classicagentcard--warning`);

    const card = page.locator('[data-testid="agent-card"]').first();
    await card.waitFor({ state: 'visible' });
    await page.waitForTimeout(300);

    await expect(card).toHaveScreenshot('agent-card-warning.png', {
      maxDiffPixels: 150,
      threshold: 0.2,
    });
  });

  test('Empty metrics state matches baseline', async ({ page }) => {
    await page.goto(`${storybookUrl}${iframePrefix}components-agents-classicagentcard--empty-metrics`);

    const card = page.locator('[data-testid="agent-card"]').first();
    await card.waitFor({ state: 'visible' });
    await page.waitForTimeout(300);

    await expect(card).toHaveScreenshot('agent-card-empty-metrics.png', {
      maxDiffPixels: 150,
      threshold: 0.2,
    });
  });

  test('Hover state matches baseline', async ({ page }) => {
    await page.goto(`${storybookUrl}${iframePrefix}components-agents-classicagentcard--default`);

    const card = page.locator('[data-testid="agent-card"]').first();
    await card.waitFor({ state: 'visible' });

    // Hover simulieren
    await card.hover();
    await page.waitForTimeout(200); // Warten auf Hover-Transition

    await expect(card).toHaveScreenshot('agent-card-hover.png', {
      maxDiffPixels: 200, // Mehr Toleranz wegen Shadow-Transition
      threshold: 0.2,
    });
  });

  test('Focus state matches baseline', async ({ page }) => {
    await page.goto(`${storybookUrl}${iframePrefix}components-agents-classicagentcard--default`);

    const card = page.locator('[data-testid="agent-card"]').first();
    await card.waitFor({ state: 'visible' });

    // Primär-Button fokussieren
    const primaryButton = card.getByRole('button', { name: /jetzt ausführen/i });
    await primaryButton.focus();
    await page.waitForTimeout(200);

    await expect(card).toHaveScreenshot('agent-card-focus.png', {
      maxDiffPixels: 150,
      threshold: 0.2,
    });
  });

  test('Dropdown open state matches baseline', async ({ page }) => {
    await page.goto(`${storybookUrl}${iframePrefix}components-agents-classicagentcard--default`);

    const card = page.locator('[data-testid="agent-card"]').first();
    await card.waitFor({ state: 'visible' });

    // Dropdown öffnen
    const menuButton = card.getByRole('button', { name: /weitere aktionen/i });
    await menuButton.click();
    await page.waitForTimeout(200);

    // Screenshot des gesamten Viewports (inkl. Dropdown)
    await expect(page).toHaveScreenshot('agent-card-dropdown-open.png', {
      maxDiffPixels: 200,
      threshold: 0.2,
    });
  });
});

test.describe('Dashboard Visual Regression', () => {
  test('Full dashboard matches baseline', async ({ page }) => {
    await page.goto('/dashboard');

    await page.waitForSelector('[data-testid="agent-grid"], [data-testid="empty-state"]', {
      timeout: 10000
    });

    // Warten auf alle Bilder/Animationen
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('dashboard-full.png', {
      fullPage: true,
      maxDiffPixels: 500,
      threshold: 0.2,
    });
  });

  test('Empty state matches baseline', async ({ page }) => {
    // Mock Empty Response
    await page.route('**/api/unified-agents', route => {
      route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="empty-state"]');
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('dashboard-empty-state.png', {
      maxDiffPixels: 200,
      threshold: 0.2,
    });
  });

  test('Error state matches baseline', async ({ page }) => {
    // Mock Error Response
    await page.route('**/api/unified-agents', route => {
      route.fulfill({ status: 500, body: 'Internal Server Error' });
    });

    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="error-state"]');
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('dashboard-error-state.png', {
      maxDiffPixels: 200,
      threshold: 0.2,
    });
  });

  test('Sticky search while scrolling matches baseline', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="agent-grid"]');

    // Scroll 1000px runter
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(300);

    const stickySearch = page.locator('[data-testid="sticky-search"]');
    await expect(stickySearch).toHaveScreenshot('sticky-search-scrolled.png', {
      maxDiffPixels: 150,
      threshold: 0.2,
    });
  });
});

test.describe('Responsive Visual Regression', () => {
  test('Mobile viewport (375px) matches baseline', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    await page.waitForSelector('[data-testid="agent-grid"], [data-testid="empty-state"]');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true,
      maxDiffPixels: 500,
      threshold: 0.2,
    });
  });

  test('Tablet viewport (768px) matches baseline', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');

    await page.waitForSelector('[data-testid="agent-grid"], [data-testid="empty-state"]');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      fullPage: true,
      maxDiffPixels: 500,
      threshold: 0.2,
    });
  });

  test('Desktop viewport (1920px) matches baseline', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard');

    await page.waitForSelector('[data-testid="agent-grid"], [data-testid="empty-state"]');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('dashboard-desktop.png', {
      fullPage: true,
      maxDiffPixels: 500,
      threshold: 0.2,
    });
  });
});
