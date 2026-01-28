import { test, expect } from '@playwright/test';

test.describe('Agents Dashboard – A11y smoke (List + Details)', () => {
  // NEW: Test for list view, search, keyboard, and details sheet
  test('Agents: Suche + Tastatur + Details-Sheet', async ({ page }) => {
    await page.goto('http://localhost:3000/agents');

    // "/" fokussiert Suche
    await page.keyboard.press('/');
    const searchBox = page.getByRole('searchbox');
    await expect(searchBox).toBeFocused();

    // Ensure we're in list view (table should be visible)
    const table = page.locator('[role="table"]');
    await expect(table).toBeVisible();

    // Row fokussierbar + Enter öffnet Details
    const row = page.getByRole('row').nth(1); // Skip header row
    await row.focus();
    await page.keyboard.press('Enter');

    // Details sheet öffnet sich
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Close dialog
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  // NEW: Test table accessibility
  test('table has proper ARIA structure', async ({ page }) => {
    await page.goto('http://localhost:3000/agents');

    // Switch to list view if not already
    const listButton = page.getByRole('button', { name: /Liste/i });
    await listButton.click();

    // Table has caption (sr-only)
    const table = page.locator('[role="table"]');
    await expect(table).toBeVisible();
    const caption = table.locator('caption');
    await expect(caption).toBeAttached();

    // Rows are focusable
    const firstDataRow = page.getByRole('row').nth(1);
    await expect(firstDataRow).toHaveAttribute('tabIndex', '0');
  });

  // NEW: Test ViewSwitch toggle
  test('view switch toggles between list and cards', async ({ page }) => {
    await page.goto('http://localhost:3000/agents');

    // Start with list view
    const listButton = page.getByRole('button', { name: /Liste/i });
    await listButton.click();
    await page.waitForTimeout(300);

    // Table should be visible
    const table = page.locator('[role="table"]');
    await expect(table).toBeVisible();

    // Switch to cards
    const cardsButton = page.getByRole('button', { name: /Karten/i });
    await cardsButton.click();
    await page.waitForTimeout(300);

    // Cards should be visible
    const cards = page.locator('article');
    await expect(cards.first()).toBeVisible();
  });
});

test.describe('Agents Dashboard – A11y smoke (Cards)', () => {
  test('cards are links, metrics have tooltips & progress is ARIA-labelled', async ({ page }) => {
    await page.goto('http://localhost:3000/agents');

    // Switch to cards view
    const cardsButton = page.getByRole('button', { name: /Karten/i });
    await cardsButton.click();
    await page.waitForTimeout(300);

    // Eine Karte besitzt einen anklickbaren Link (volle Fläche)
    const firstCardLink = page.locator('article >> a[href^="/agents/"]').first();
    await expect(firstCardLink).toBeVisible();

    // Erfolgsbar hat korrektes ARIA
    const progress = page.locator('[role="progressbar"]').first();
    await expect(progress).toHaveAttribute('aria-valuemin', '0');
    await expect(progress).toHaveAttribute('aria-valuemax', '100');
    await expect(progress).toHaveAttribute('aria-valuenow');

    // Tooltip erscheint bei Fokus auf Metrik
    const metric = page.locator('text=Anfragen').first();
    await metric.hover();
    // Wait for tooltip to appear
    await page.waitForTimeout(200);
    const tooltip = page.locator('[role="tooltip"]');
    await expect(tooltip).toBeVisible();
  });

  test('keyboard path: / focuses search, space toggles status chip, enter opens details', async ({ page }) => {
    await page.goto('http://localhost:3000/agents');

    // "/" fokussiert Suche
    await page.keyboard.press('/');
    const searchInput = page.locator('input[aria-label*="Search agents" i]');
    await expect(searchInput).toBeFocused();

    // Tab zu erstem Status-Chip und toggeln
    await page.keyboard.press('Escape'); // Clear search focus first
    const chip = page.getByRole('checkbox', { name: /Healthy/i }).first();
    await chip.focus();
    const initialState = await chip.getAttribute('aria-checked');
    await page.keyboard.press('Space');
    const newState = await chip.getAttribute('aria-checked');
    expect(initialState).not.toBe(newState);

    // Tab zur ersten Karte, Enter öffnet
    const cardLink = page.locator('article >> a[href^="/agents/"]').first();
    await cardLink.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/agents\/.+/);
  });

  test('screen reader labels exist for progress bars', async ({ page }) => {
    await page.goto('http://localhost:3000/agents');

    // Progress bars haben sr-only Labels
    const srOnlyLabel = page.locator('[role="progressbar"] .sr-only').first();
    await expect(srOnlyLabel).toBeAttached();
    const labelText = await srOnlyLabel.textContent();
    expect(labelText).toMatch(/Erfolgsrate.*Prozent/i);
  });

  test('status indicators have multiple modalities (color + icon + text)', async ({ page }) => {
    await page.goto('http://localhost:3000/agents');

    const firstCard = page.locator('article').first();

    // Status hat Farbdot (nicht alleine verlassen auf Farbe)
    const dot = firstCard.locator('span[class*="rounded-full"]').first();
    await expect(dot).toBeVisible();

    // Status hat Icon (CheckCircle, AlertTriangle, oder OctagonX)
    const statusIcon = firstCard.locator('svg').first();
    await expect(statusIcon).toBeVisible();

    // Status hat Text-Label
    const statusText = firstCard.locator('text=/OK|Eingeschränkt|Fehler/').first();
    await expect(statusText).toBeVisible();
  });

  test('filter counter shows active filters', async ({ page }) => {
    await page.goto('http://localhost:3000/agents');

    // Klick auf einen Status-Chip
    const healthyChip = page.getByRole('checkbox', { name: /Healthy/i });
    await healthyChip.click();

    // Filter-Counter erscheint
    const filterCounter = page.locator('text=/1 Status/i');
    await expect(filterCounter).toBeVisible();

    // "Filter zurücksetzen" Button erscheint
    const clearButton = page.locator('button:has-text("Filter zurücksetzen")');
    await expect(clearButton).toBeVisible();

    // Clear funktioniert
    await clearButton.click();
    await expect(filterCounter).not.toBeVisible();
  });

  test('intro banner dismisses and persists', async ({ page }) => {
    // Clear localStorage before test
    await page.goto('http://localhost:3000/agents');
    await page.evaluate(() => localStorage.removeItem('sintra_agents_intro_dismissed'));
    await page.reload();

    // Banner sollte erscheinen
    const banner = page.locator('text=/Ein Agent automatisiert/i');
    await expect(banner).toBeVisible();

    // Dismiss
    const dismissButton = page.locator('button:has-text("Verstanden")');
    await dismissButton.click();
    await expect(banner).not.toBeVisible();

    // Nach Reload bleibt es dismissed
    await page.reload();
    await expect(banner).not.toBeVisible();
  });
});
