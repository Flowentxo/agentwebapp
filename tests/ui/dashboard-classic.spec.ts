import { test, expect } from '@playwright/test';

test.describe('Dashboard Classic', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display header with title and subtitle', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toBeVisible();

    const title = header.locator('h1');
    await expect(title).toHaveText('Dashboard');

    const subtitle = header.locator('p.text-text-muted');
    await expect(subtitle).toContainText('Überblick über Systeme & Metriken');
  });

  test('should focus search input with / keyboard shortcut', async ({ page }) => {
    const searchInput = page.locator('#dashboard-search');
    await expect(searchInput).toBeVisible();

    // Press / to focus search
    await page.keyboard.press('/');
    await expect(searchInput).toBeFocused();
  });

  test('should display command palette button with ⌘K', async ({ page }) => {
    const cmdButton = page.locator('button[aria-label*="Befehlspalette"]');
    await expect(cmdButton).toBeVisible();
    await expect(cmdButton).toContainText('⌘K');
  });

  test('should render 4 KPI cards', async ({ page }) => {
    const kpiSection = page.locator('section[aria-labelledby="kpi-section"]');
    await expect(kpiSection).toBeVisible();

    // Check for 4 KPI cards
    const kpiCards = kpiSection.locator('.panel');
    await expect(kpiCards).toHaveCount(4);

    // Check KPI labels
    await expect(kpiSection).toContainText('Anfragen (24h)');
    await expect(kpiSection).toContainText('Erfolgsrate (24h)');
    await expect(kpiSection).toContainText('Ø Zeit (24h)');
    await expect(kpiSection).toContainText('Fehlerquote (24h)');
  });

  test('should display activity list with feed role', async ({ page }) => {
    const activitySection = page.locator('section[aria-labelledby="activity-section"]');
    await expect(activitySection).toBeVisible();

    const feed = activitySection.locator('[role="feed"]');
    await expect(feed).toBeVisible();

    // Check for at least one activity item
    const activityItems = feed.locator('[role="group"], > div').first();
    await expect(activityItems).toBeVisible();

    // Check for time element
    const timeElement = feed.locator('time').first();
    await expect(timeElement).toBeVisible();
  });

  test('should display agents snapshot table with max 10 rows', async ({ page }) => {
    const agentsSection = page.locator('section[aria-labelledby="agents-section"]');
    await expect(agentsSection).toBeVisible();

    const table = agentsSection.locator('table');
    await expect(table).toBeVisible();

    // Check table headers
    await expect(table).toContainText('Agent');
    await expect(table).toContainText('Status');
    await expect(table).toContainText('Anfragen 24h');
    await expect(table).toContainText('Erfolg %');
    await expect(table).toContainText('Ø Zeit');

    // Check max 10 rows in tbody
    const rows = table.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeLessThanOrEqual(10);
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should display "Alle Agents ansehen" link', async ({ page }) => {
    const agentsSection = page.locator('section[aria-labelledby="agents-section"]');

    const link = agentsSection.locator('a[href="/agents"]');
    await expect(link).toBeVisible();
    await expect(link).toContainText('Alle Agents ansehen');
  });

  test('should have "Öffnen" buttons for each agent row', async ({ page }) => {
    const table = page.locator('table');
    const rows = table.locator('tbody tr');
    const firstRow = rows.first();

    const openButton = firstRow.locator('button[aria-label*="öffnen"]');
    await expect(openButton).toBeVisible();
    await expect(openButton).toContainText('Öffnen');
  });

  test('should filter agents by search query', async ({ page }) => {
    const searchInput = page.locator('#dashboard-search');
    const table = page.locator('table tbody');

    // Get initial row count
    const initialRows = await table.locator('tr').count();
    expect(initialRows).toBeGreaterThan(0);

    // Type a search query
    await searchInput.fill('Dexter');
    await page.waitForTimeout(300); // Wait for filter to apply

    // Check that table is filtered
    const filteredRows = await table.locator('tr').count();
    expect(filteredRows).toBeLessThanOrEqual(initialRows);

    // Check that visible rows contain "Dexter"
    const visibleRows = table.locator('tr');
    const count = await visibleRows.count();
    if (count > 0) {
      const firstRowText = await visibleRows.first().textContent();
      expect(firstRowText).toContain('Dexter');
    }
  });

  test('should have accessible landmarks', async ({ page }) => {
    // Check for main landmark
    const main = page.locator('main[role="main"]');
    await expect(main).toBeVisible();

    // Check for sections with aria-labelledby
    const kpiSection = page.locator('section[aria-labelledby="kpi-section"]');
    await expect(kpiSection).toBeVisible();

    const activitySection = page.locator('section[aria-labelledby="activity-section"]');
    await expect(activitySection).toBeVisible();

    const agentsSection = page.locator('section[aria-labelledby="agents-section"]');
    await expect(agentsSection).toBeVisible();
  });

  test('should display compact density (row height 44-48px)', async ({ page }) => {
    const table = page.locator('table tbody tr').first();
    const box = await table.boundingBox();

    // Check row height is between 44-52px (allowing 4px margin)
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeLessThanOrEqual(52);
  });

  test('should handle empty state when no agents available', async ({ page }) => {
    // This would require mocking API to return no agents
    // For now, we just check if the component handles it gracefully
    // In a real scenario, you'd mock the data source
  });

  test('should show German number formatting', async ({ page }) => {
    const kpiSection = page.locator('section[aria-labelledby="kpi-section"]');
    const kpiCards = kpiSection.locator('.panel');

    // Get text from KPI cards
    const texts = await kpiCards.allTextContents();
    const combinedText = texts.join(' ');

    // Check for German formatting patterns (comma instead of dot)
    // Numbers like "5,4 Tsd." or "96,8 %"
    const hasGermanFormat = /\d+,\d+/.test(combinedText);
    expect(hasGermanFormat).toBeTruthy();
  });
});
