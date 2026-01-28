import { test, expect } from '@playwright/test';

test.describe('Dashboard A11y', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should have proper section landmarks', async ({ page }) => {
    // KPI section
    const kpiSection = page.locator('section[aria-labelledby="kpi-section"]');
    await expect(kpiSection).toBeVisible();

    // Activity section
    const activitySection = page.locator('section[aria-labelledby="activity-section"]');
    await expect(activitySection).toBeVisible();

    // Agents section
    const agentsSection = page.locator('section[aria-labelledby="agents-section"]');
    await expect(agentsSection).toBeVisible();
  });

  test('should have screen reader only headings', async ({ page }) => {
    // Check sr-only headings exist
    const kpiHeading = page.locator('#kpi-section');
    await expect(kpiHeading).toHaveClass(/sr-only/);

    const activityHeading = page.locator('#activity-section');
    await expect(activityHeading).toHaveClass(/sr-only/);

    const agentsHeading = page.locator('#agents-section');
    await expect(agentsHeading).toHaveClass(/sr-only/);
  });

  test('should announce KPI metrics with aria-label', async ({ page }) => {
    const kpiCards = page.locator('[role="group"]');
    await expect(kpiCards).toHaveCount(4);

    // Check first KPI has aria-label
    const firstKpi = kpiCards.first();
    const ariaLabel = await firstKpi.getAttribute('aria-label');
    expect(ariaLabel).toContain('Anfragen');
  });

  test('should have clickable KPI cards', async ({ page }) => {
    const firstKpi = page.locator('[role="group"]').first();

    // Should be a button
    const tagName = await firstKpi.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe('button');

    // Should have keyboard support
    await firstKpi.focus();
    await page.keyboard.press('Enter');

    // Should navigate (check URL changed)
    await page.waitForTimeout(500);
    const url = page.url();
    expect(url).toContain('/agents');
  });
});

test.describe('Activity List A11y', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should have role="feed" for activity list', async ({ page }) => {
    const feed = page.locator('[role="feed"]');
    await expect(feed).toBeVisible();

    const ariaLabel = await feed.getAttribute('aria-label');
    expect(ariaLabel).toContain('Aktivitäts-Feed');
  });

  test('should have filter chips with aria-pressed', async ({ page }) => {
    const filterButtons = page.locator('[role="group"][aria-label="Aktivitätsfilter"] button');
    await expect(filterButtons.first()).toHaveAttribute('aria-pressed');
  });

  test('should filter activities on chip click', async ({ page }) => {
    // Get initial activity count
    const activities = page.locator('[role="feed"] > div').filter({ hasNotText: 'Keine Aktivitäten' });
    const initialCount = await activities.count();

    // Click "Fehler" filter
    const errorFilter = page.locator('button', { hasText: 'Fehler' });
    await errorFilter.click();

    // Count should change or stay same
    const filteredCount = await activities.count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    // Error filter should be pressed
    await expect(errorFilter).toHaveAttribute('aria-pressed', 'true');
  });

  test('should show time badges with datetime attribute', async ({ page }) => {
    const timeBadges = page.locator('[role="feed"] time');
    await expect(timeBadges.first()).toHaveAttribute('dateTime');
  });

  test('should have proper German time formatting', async ({ page }) => {
    const timeBadge = page.locator('[role="feed"] time').first();
    const text = await timeBadge.textContent();

    // Should contain German time text
    expect(text).toMatch(/(vor|Gerade eben)/);
  });
});

test.describe('Agents Table A11y', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should focus search input with / key', async ({ page }) => {
    // Press /
    await page.keyboard.press('/');

    // Search input should be focused
    const searchInput = page.locator('#agents-table-search');
    await expect(searchInput).toBeFocused();
  });

  test('should have proper table structure', async ({ page }) => {
    const table = page.locator('section[aria-labelledby="agents-section"] table');
    await expect(table).toBeVisible();

    // Should have thead with th elements
    const headers = table.locator('thead th');
    await expect(headers).toHaveCount(5); // Name, Status, Requests, Success, Time
  });

  test('should have sortable columns with aria-sort', async ({ page }) => {
    const nameHeader = page.locator('th', { hasText: 'Agent' });
    const ariaSort = await nameHeader.getAttribute('aria-sort');
    expect(ariaSort).toMatch(/none|ascending|descending/);
  });

  test('should sort table on header click', async ({ page }) => {
    // Click on "Anfragen 24h" header
    const requestsHeader = page.locator('th', { hasText: 'Anfragen 24h' });
    await requestsHeader.click();

    // Check aria-sort changed
    const ariaSort = await requestsHeader.getAttribute('aria-sort');
    expect(ariaSort).toMatch(/ascending|descending/);
  });

  test('should have keyboard navigable rows', async ({ page }) => {
    const firstRow = page.locator('section[aria-labelledby="agents-section"] tbody tr').first();

    // Should be focusable
    await expect(firstRow).toHaveAttribute('tabIndex', '0');

    // Should have role="button"
    await expect(firstRow).toHaveAttribute('role', 'button');

    // Should have aria-label
    const ariaLabel = await firstRow.getAttribute('aria-label');
    expect(ariaLabel).toContain('öffnen');
  });

  test('should open agent with Enter key', async ({ page }) => {
    const firstRow = page.locator('section[aria-labelledby="agents-section"] tbody tr').first();

    await firstRow.focus();
    await page.keyboard.press('Enter');

    // Should navigate to agent page
    await page.waitForTimeout(500);
    const url = page.url();
    expect(url).toContain('/agents/');
  });

  test('should open agent with Space key', async ({ page }) => {
    const firstRow = page.locator('section[aria-labelledby="agents-section"] tbody tr').first();

    await firstRow.focus();
    await page.keyboard.press('Space');

    // Should navigate to agent page
    await page.waitForTimeout(500);
    const url = page.url();
    expect(url).toContain('/agents/');
  });

  test('should announce search results with live region', async ({ page }) => {
    // Type in search
    const searchInput = page.locator('#agents-table-search');
    await searchInput.fill('Dexter');

    // Live region should announce results
    const liveRegion = page.locator('[role="status"][aria-live="polite"]');
    await expect(liveRegion).toBeVisible();

    const announcement = await liveRegion.textContent();
    expect(announcement).toContain('Agents gefunden');
  });

  test('should filter agents by name', async ({ page }) => {
    const searchInput = page.locator('#agents-table-search');
    await searchInput.fill('Dexter');

    // Wait for filter
    await page.waitForTimeout(300);

    // Should show only matching agents
    const rows = page.locator('section[aria-labelledby="agents-section"] tbody tr');
    const firstRow = rows.first();
    const text = await firstRow.textContent();
    expect(text).toContain('Dexter');
  });

  test('should show no results message when search has no matches', async ({ page }) => {
    const searchInput = page.locator('#agents-table-search');
    await searchInput.fill('NonExistentAgent123');

    // Wait for filter
    await page.waitForTimeout(300);

    // Should show "Keine Agents gefunden"
    const noResultsMessage = page.locator('text=Keine Agents gefunden');
    await expect(noResultsMessage).toBeVisible();
  });

  test('should have German number formatting', async ({ page }) => {
    // Check a number cell
    const numberCell = page.locator('section[aria-labelledby="agents-section"] tbody td.mono').first();
    const text = await numberCell.textContent();

    // Should use German formatting (comma as decimal separator or Tsd./Mio.)
    expect(text).toMatch(/[\d,\s]+(Tsd\.|Mio\.|%|s)?/);
  });

  test('should have status chips with tooltips', async ({ page }) => {
    const statusChip = page.locator('section[aria-labelledby="agents-section"] tbody td').nth(1).locator('[role="img"]');

    if (await statusChip.count() > 0) {
      // Should have aria-label
      const ariaLabel = await statusChip.first().getAttribute('aria-label');
      expect(ariaLabel).toMatch(/OK|Eingeschränkt|Fehler/);
    }
  });
});

test.describe('Dashboard Responsive Layout', () => {
  test('should stack sections on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    // Check grid layout
    const grid = page.locator('.grid');
    const gridTemplateColumns = await grid.evaluate((el) => {
      return window.getComputedStyle(el).gridTemplateColumns;
    });

    // Should be single column on mobile
    expect(gridTemplateColumns).toContain('1fr');
  });

  test('should show 12-column layout on xl screens', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard');

    // Check activity section spans 7 columns
    const activitySection = page.locator('section[aria-labelledby="activity-section"]');
    const hasXlCol7 = await activitySection.evaluate((el) => {
      return el.classList.contains('xl:col-span-7');
    });
    expect(hasXlCol7).toBe(true);

    // Check agents section spans 5 columns
    const agentsSection = page.locator('section[aria-labelledby="agents-section"]');
    const hasXlCol5 = await agentsSection.evaluate((el) => {
      return el.classList.contains('xl:col-span-5');
    });
    expect(hasXlCol5).toBe(true);
  });
});

test.describe('Dashboard Empty State', () => {
  test.skip('should show empty state when no agents available', async ({ page }) => {
    // Note: This test would require mocking the API to return empty agents
    // Skipped for now as it depends on backend state

    await page.goto('/dashboard');

    // Check for empty state message
    const emptyState = page.locator('text=Keine fertigen Agents gefunden');

    if (await emptyState.isVisible()) {
      // Should have create button
      const createButton = page.locator('button', { hasText: 'Agent erstellen' });
      await expect(createButton).toBeVisible();
    }
  });
});
