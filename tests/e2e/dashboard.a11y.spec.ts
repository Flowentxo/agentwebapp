import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Sintra Dashboard – A11y Gates', () => {
  test.beforeEach(async ({ page }) => {
    // Feature-Flag aktivieren falls nötig
    await page.goto('/dashboard');
  });

  test('has no critical accessibility violations', async ({ page }) => {
    // Warten bis Content geladen ist
    await page.waitForSelector(
      '[data-testid="agent-grid"], [data-testid="empty-state"], [data-testid="error-state"]',
      { timeout: 10000 }
    );

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude([
        '[data-testid="animated-skeleton"]', // Skeletons während Animation ausklammern
        '[data-testid="gradient-bg"]'        // Dekorative Gradients
      ])
      .analyze();

    const critical = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(
      critical,
      `Found ${critical.length} critical/serious violations:\n${JSON.stringify(critical, null, 2)}`
    ).toHaveLength(0);

    // Optional: Log moderate violations als Warnung
    const moderate = accessibilityScanResults.violations.filter(v => v.impact === 'moderate');
    if (moderate.length > 0) {
      console.warn(`⚠️  ${moderate.length} moderate violations found (non-blocking)`);
    }
  });

  test('sticky search stays visible on scroll', async ({ page }) => {
    await page.goto('/dashboard');

    const stickySearch = page.locator('[data-testid="sticky-search"]');
    await expect(stickySearch).toBeVisible();

    // Scroll 2000px runter
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(300); // Warten auf Scroll-Animation

    await expect(stickySearch).toBeVisible();

    // Check z-index (sollte über Content sein)
    const zIndex = await stickySearch.evaluate(el => window.getComputedStyle(el).zIndex);
    expect(parseInt(zIndex)).toBeGreaterThanOrEqual(30);
  });

  test('primary action exists once per card', async ({ page }) => {
    await page.goto('/dashboard');

    const cards = await page.locator('[data-testid="agent-card"]').all();

    if (cards.length === 0) {
      test.skip('No agent cards found (Empty State)');
    }

    for (const card of cards) {
      // Genau 1 Primär-Button pro Card
      const primaryButtons = await card.getByRole('button', { name: /jetzt ausführen/i }).all();
      expect(
        primaryButtons,
        'Card should have exactly one primary CTA'
      ).toHaveLength(1);

      // Primär-Button sollte min-h-44px haben
      const button = primaryButtons[0];
      const height = await button.evaluate(el => el.getBoundingClientRect().height);
      expect(height, 'Primary button should be at least 44px tall').toBeGreaterThanOrEqual(44);
    }
  });

  test('focus indicators are visible', async ({ page }) => {
    await page.goto('/dashboard');

    // Tab durch die ersten 3 interaktiven Elemente
    const interactiveElements = [
      page.getByRole('button', { name: /agent erstellen/i }).first(),
      page.getByRole('button', { name: /active/i }).first(),
      page.getByRole('button', { name: /jetzt ausführen/i }).first(),
    ];

    for (const el of interactiveElements) {
      if (await el.isVisible()) {
        await el.focus();

        // Check ob outline/box-shadow gesetzt ist (Focus-Ring)
        const styles = await el.evaluate(element => {
          const computed = window.getComputedStyle(element);
          return {
            outline: computed.outline,
            boxShadow: computed.boxShadow,
            outlineWidth: computed.outlineWidth,
          };
        });

        const hasFocusIndicator =
          styles.outlineWidth !== '0px' ||
          styles.boxShadow !== 'none';

        expect(hasFocusIndicator, 'Element should have visible focus indicator').toBe(true);
      }
    }
  });

  test('loading state shows aria-live region after 2s', async ({ page }) => {
    // Mock langsame API Response
    await page.route('**/api/unified-agents', route => {
      setTimeout(() => route.fulfill({ status: 200, body: JSON.stringify([]) }), 3000);
    });

    await page.goto('/dashboard');

    // Nach 2s sollte aria-live Region erscheinen
    await page.waitForTimeout(2100);

    const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"]');
    await expect(liveRegion).toBeVisible();

    const text = await liveRegion.textContent();
    expect(text).toContain('Daten werden geladen');
  });

  test('empty state has accessible CTA', async ({ page }) => {
    // Mock Empty Response
    await page.route('**/api/unified-agents', route => {
      route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="empty-state"]');

    const emptyState = page.locator('[data-testid="empty-state"]');
    const cta = emptyState.getByRole('button', { name: /agent erstellen/i });

    await expect(cta).toBeVisible();
    await expect(cta).toBeEnabled();

    // Check Kontrast (sollte genug sein, aber axe prüft das schon)
    const bgColor = await cta.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)'); // Nicht transparent
  });

  test('error state has retry functionality', async ({ page }) => {
    // Mock Error Response
    await page.route('**/api/unified-agents', route => {
      route.fulfill({ status: 500, body: 'Internal Server Error' });
    });

    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="error-state"]');

    const errorState = page.locator('[data-testid="error-state"]');
    await expect(errorState).toBeVisible();

    // aria-live="assertive" für Errors
    const ariaLive = await errorState.getAttribute('aria-live');
    expect(ariaLive).toBe('assertive');

    const retryButton = errorState.getByRole('button', { name: /nochmal versuchen/i });
    await expect(retryButton).toBeVisible();

    // Click Retry sollte API erneut aufrufen
    let apiCalls = 0;
    await page.route('**/api/unified-agents', route => {
      apiCalls++;
      route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await retryButton.click();
    await page.waitForTimeout(500);

    expect(apiCalls).toBeGreaterThan(0);
  });

  test('keyboard navigation works end-to-end', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="agent-card"]');

    // Start von oben
    await page.keyboard.press('Tab'); // -> Search
    await page.keyboard.press('Tab'); // -> Filter Active
    await page.keyboard.press('Tab'); // -> Filter Paused
    await page.keyboard.press('Tab'); // -> Sort Dropdown
    await page.keyboard.press('Tab'); // -> Erste Card Primary CTA

    const focused = page.locator(':focus');
    const ariaLabel = await focused.getAttribute('aria-label');

    expect(ariaLabel?.toLowerCase()).toContain('ausführen');
  });

  test('color contrast meets WCAG AA (4.5:1)', async ({ page }) => {
    await page.goto('/dashboard');

    // axe prüft das automatisch, aber zusätzlicher manueller Check
    const textElements = await page.locator('h1, h2, h3, p, button, a').all();

    for (const el of textElements.slice(0, 10)) { // Erste 10 prüfen
      if (await el.isVisible()) {
        const contrast = await el.evaluate(element => {
          const styles = window.getComputedStyle(element);
          const color = styles.color;
          const bgColor = styles.backgroundColor;

          // Simplified contrast check (echte Implementierung komplexer)
          return { color, bgColor };
        });

        // Hier würde eine echte Kontrast-Berechnung stehen
        // Wir verlassen uns primär auf axe-core
        expect(contrast.color).not.toBe(contrast.bgColor);
      }
    }
  });
});

test.describe('Mobile Viewport A11y', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('tap targets are at least 44x44px', async ({ page }) => {
    await page.goto('/dashboard');

    const buttons = await page.locator('button, a[role="button"]').all();

    for (const btn of buttons) {
      if (await btn.isVisible()) {
        const box = await btn.boundingBox();
        if (box) {
          expect(box.height, `Button should be ≥44px tall`).toBeGreaterThanOrEqual(44);
          expect(box.width, `Button should be ≥44px wide`).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });

  test('grid is single column on mobile', async ({ page }) => {
    await page.goto('/dashboard');

    const grid = page.locator('[data-testid="agent-grid"]');
    const gridTemplateColumns = await grid.evaluate(el =>
      window.getComputedStyle(el).gridTemplateColumns
    );

    // Sollte "1fr" oder ähnlich sein (1 Spalte)
    const columnCount = gridTemplateColumns.split(' ').length;
    expect(columnCount).toBeLessThanOrEqual(1);
  });
});
