import { test, expect } from '@playwright/test';

/**
 * Dashboard Smoke Tests
 * Prüft die wichtigsten UX-Anforderungen des Dashboards
 */

test.describe('Dashboard UX Tests', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Anpassen an deine Authentifizierung
    await page.goto('/dashboard');
  });

  test('sticky search stays visible on scroll', async ({ page }) => {
    const stickySearch = page.getByTestId('sticky-search');

    // Initial sichtbar
    await expect(stickySearch).toBeVisible();

    // Nach Scrollen immer noch sichtbar
    await page.mouse.wheel(0, 2000);
    await expect(stickySearch).toBeVisible();
  });

  test('each agent card has exactly one primary CTA', async ({ page }) => {
    const cards = page.getByTestId('agent-card');
    const firstCard = cards.first();

    // Prüfe, dass genau ein "Jetzt ausführen" Button existiert
    const primaryButton = firstCard.getByRole('button', { name: /jetzt ausführen/i });
    await expect(primaryButton).toHaveCount(1);

    // Prüfe minimale Höhe (Touch-Target)
    const box = await primaryButton.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test('keyboard shortcuts focus search input', async ({ page }) => {
    const searchInput = page.getByRole('searchbox', { name: /suchen oder fragen/i });

    // Test Slash-Shortcut
    await page.keyboard.press('/');
    await expect(searchInput).toBeFocused();

    // Blur und test Cmd+K
    await page.keyboard.press('Escape');
    await page.keyboard.press('Meta+K');
    await expect(searchInput).toBeFocused();
  });

  test('focus rings are visible on interactive elements', async ({ page }) => {
    const primaryButton = page.getByRole('button', { name: /jetzt ausführen/i }).first();

    // Tab zum Button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Prüfe, dass outline oder box-shadow gesetzt ist
    const styles = await primaryButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        outline: computed.outline,
        boxShadow: computed.boxShadow,
      };
    });

    expect(
      styles.outline !== 'none' || styles.boxShadow !== 'none'
    ).toBeTruthy();
  });

  test('empty state shows when no agents', async ({ page }) => {
    // TODO: Mock leeren Zustand (z.B. via Feature-Flag oder API-Mock)
    // await page.goto('/dashboard?mock=empty');

    // const emptyState = page.getByTestId('empty-state');
    // await expect(emptyState).toBeVisible();
    // await expect(emptyState.getByRole('link', { name: /agent erstellen/i })).toBeVisible();
  });

  test('loading hint appears after 2 seconds', async ({ page }) => {
    // TODO: Mock langsamen API-Call
    // await page.route('**/api/agents', route => route.abort());

    // const loadingHint = page.getByRole('status');
    // await expect(loadingHint).toBeVisible({ timeout: 3000 });
  });
});
