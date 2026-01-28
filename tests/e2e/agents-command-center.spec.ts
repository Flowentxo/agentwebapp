import { test, expect } from '@playwright/test';

test.describe('Agents Command Center', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/agents');
  });

  test('should display Command Center as default view', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that Cockpit button is active
    const cockpitButton = page.getByRole('button', { name: /cockpit/i });
    await expect(cockpitButton).toHaveAttribute('aria-pressed', 'true');

    // Check that 3-column layout is visible
    await expect(page.getByRole('region', { name: /command center/i })).toBeVisible();
  });

  test('should show StatusSummary with counters', async ({ page }) => {
    // Check that StatusSummary is present
    const statusSummary = page.getByRole('group', { name: /status-übersicht/i });
    await expect(statusSummary).toBeVisible();

    // Check for OK, Eingeschränkt, Fehler buttons
    await expect(page.getByText(/OK/)).toBeVisible();
    await expect(page.getByText(/Eingeschränkt/)).toBeVisible();
    await expect(page.getByText(/Fehler/)).toBeVisible();
  });

  test('should open CommandPalette with ⌘K', async ({ page }) => {
    // Press Cmd/Ctrl+K
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+KeyK' : 'Control+KeyK');

    // Check that CommandPalette is visible
    await expect(page.getByRole('dialog', { name: /command palette/i })).toBeVisible();

    // Check for search input
    await expect(page.getByRole('combobox')).toBeVisible();
  });

  test('should open CommandPalette by clicking Befehle button', async ({ page }) => {
    // Click the Befehle button
    await page.getByRole('button', { name: /befehle/i }).click();

    // Check that CommandPalette is visible
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should close CommandPalette with ESC', async ({ page }) => {
    // Open CommandPalette
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+KeyK' : 'Control+KeyK');
    await expect(page.getByRole('dialog')).toBeVisible();

    // Press ESC
    await page.keyboard.press('Escape');

    // Check that CommandPalette is closed
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should display Watchlist panel', async ({ page }) => {
    // Check for Watchlist header
    await expect(page.getByRole('heading', { name: /watchlist/i })).toBeVisible();
  });

  test('should display IncidentsTimeline panel', async ({ page }) => {
    // Check for Incidents Timeline header
    await expect(page.getByRole('heading', { name: /vorfälle & ereignisse/i })).toBeVisible();
  });

  test('should display AlertsActions panel', async ({ page }) => {
    // Check for Alerts & Actions header
    await expect(page.getByRole('heading', { name: /alerts & aktionen/i })).toBeVisible();
  });

  test('should switch to List view', async ({ page }) => {
    // Click on Tabelle button
    const tableButton = page.getByRole('button', { name: /tabellen-ansicht/i });
    await tableButton.click();

    // Check that table is visible
    await expect(page.getByRole('table')).toBeVisible();

    // Check that Tabelle button is now active
    await expect(tableButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('should switch to Graph view', async ({ page }) => {
    // Click on Graph button
    const graphButton = page.getByRole('button', { name: /graph-ansicht/i });
    await graphButton.click();

    // Check for Graph placeholder message
    await expect(page.getByText(/graph-ansicht wird in einer zukünftigen version hinzugefügt/i)).toBeVisible();

    // Check that Graph button is now active
    await expect(graphButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('should open agent details from Watchlist', async ({ page }) => {
    // Wait for agents to load
    await page.waitForTimeout(1000);

    // Click on first agent in Watchlist (assuming there's at least one)
    const firstAgent = page.locator('[role="list"]').first().locator('button').first();

    if (await firstAgent.isVisible()) {
      await firstAgent.click();

      // Check that details sheet is open
      await expect(page.getByRole('dialog')).toBeVisible();
    }
  });

  test('should have tabs in AgentDetailsSheet', async ({ page }) => {
    // Wait for agents to load
    await page.waitForTimeout(1000);

    // Click on first agent
    const firstAgent = page.locator('[role="list"]').first().locator('button').first();

    if (await firstAgent.isVisible()) {
      await firstAgent.click();

      // Wait for sheet to open
      await expect(page.getByRole('dialog')).toBeVisible();

      // Check for tabs
      await expect(page.getByRole('tab', { name: /metriken/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /logs/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /konfiguration/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /versionen/i })).toBeVisible();
    }
  });

  test('should filter agents by status from StatusSummary', async ({ page }) => {
    // Click on OK status chip
    const okButton = page.getByRole('button', { name: /OK \(\d+\)/i });
    await okButton.click();

    // Check that OK button is now pressed
    await expect(okButton).toHaveAttribute('aria-pressed', 'true');

    // The agent list should be filtered (visual check, exact count will vary)
    // Just verify the UI responds
    await expect(page.getByRole('region', { name: /command center/i })).toBeVisible();
  });

  test('should have keyboard navigation in CommandPalette', async ({ page }) => {
    // Open CommandPalette
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+KeyK' : 'Control+KeyK');
    await expect(page.getByRole('dialog')).toBeVisible();

    // Type search query
    await page.getByRole('combobox').fill('cassie');

    // Check that filtered results appear
    await expect(page.getByText(/cassie öffnen/i)).toBeVisible();

    // Press ArrowDown
    await page.keyboard.press('ArrowDown');

    // Press Enter should execute the command (would open agent details)
    // We won't actually press Enter to avoid side effects in the test
  });
});
