import { test, expect } from '@playwright/test';

test.describe('All Agents Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the All Agents page
    await page.goto('http://localhost:3001/agents/all');
  });

  test('should load and display agents', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check if the page title is visible
    const pageTitle = page.locator('h1.page-title');
    await expect(pageTitle).toBeVisible();
    await expect(pageTitle).toHaveText('All Agents');

    // Check for the count badge
    const countBadge = page.locator('.count-badge');
    await expect(countBadge).toBeVisible();

    // Get the count value
    const count = await countBadge.textContent();
    console.log(`Found ${count} agents displayed`);

    // Check if agents are displayed
    if (count && parseInt(count) > 0) {
      // Wait for agent cards to be visible
      const agentCards = page.locator('.all-agent-card');
      await expect(agentCards.first()).toBeVisible({ timeout: 10000 });

      // Count the actual cards displayed
      const cardCount = await agentCards.count();
      console.log(`Found ${cardCount} agent cards`);
      expect(cardCount).toBeGreaterThan(0);

      // Check first agent card has required elements
      const firstCard = agentCards.first();
      await expect(firstCard.locator('.agent-name')).toBeVisible();
      await expect(firstCard.locator('.agent-description')).toBeVisible();
      await expect(firstCard.locator('.status-badge')).toBeVisible();
    } else {
      // Check for empty state
      const emptyState = page.locator('.empty-state, .no-results-state');
      await expect(emptyState).toBeVisible();
    }
  });

  test('should fetch agents from API', async ({ page }) => {
    // Intercept the API call
    const apiResponse = await page.waitForResponse(
      response => response.url().includes('/api/agents') && response.status() === 200,
      { timeout: 10000 }
    );

    const data = await apiResponse.json();
    console.log('API Response:', data);

    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total');
    expect(data.items).toBeInstanceOf(Array);
    expect(data.total).toBeGreaterThanOrEqual(0);

    // If API returns agents, verify they're displayed
    if (data.total > 0) {
      // Wait for cards to render
      await page.waitForTimeout(2000);

      const agentCards = page.locator('.all-agent-card');
      const cardCount = await agentCards.count();

      console.log(`API returned ${data.total} agents, displayed ${cardCount} cards`);

      // Cards displayed should match page limit or total (whichever is smaller)
      const expectedCount = Math.min(data.total, data.limit || 20);
      expect(cardCount).toBeLessThanOrEqual(expectedCount);
    }
  });

  test('should display agent details correctly', async ({ page }) => {
    // Wait for agents to load
    await page.waitForLoadState('networkidle');

    const agentCards = page.locator('.all-agent-card');
    const cardCount = await agentCards.count();

    if (cardCount > 0) {
      // Check first agent card details
      const firstCard = agentCards.first();

      // Get agent name
      const name = await firstCard.locator('.agent-name').textContent();
      console.log(`First agent name: ${name}`);
      expect(name).toBeTruthy();

      // Check for status badge
      const statusBadge = firstCard.locator('.status-badge');
      await expect(statusBadge).toBeVisible();
      const status = await statusBadge.textContent();
      expect(['active', 'disabled', 'draft']).toContain(status?.trim());

      // Check for tags if present
      const tags = firstCard.locator('.agent-tag');
      const tagCount = await tags.count();
      console.log(`Agent has ${tagCount} tags`);

      if (tagCount > 0) {
        const firstTag = await tags.first().textContent();
        expect(firstTag).toBeTruthy();
      }
    }
  });

  test('search functionality works', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();

    // Type a search query
    await searchInput.fill('data');
    await page.waitForTimeout(500); // Wait for debounce

    // Check API was called with query parameter
    const apiResponse = await page.waitForResponse(
      response => response.url().includes('/api/agents') && response.url().includes('query=data'),
      { timeout: 5000 }
    );

    expect(apiResponse.status()).toBe(200);
  });

  test('filters work correctly', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Click status filter
    const statusFilterButton = page.locator('.filter-button').filter({ hasText: 'Status' });
    await statusFilterButton.click();

    // Check filter dropdown is visible
    const filterDropdown = page.locator('.dropdown-menu');
    await expect(filterDropdown).toBeVisible();

    // Select "active" status
    const activeCheckbox = filterDropdown.locator('label').filter({ hasText: 'Active' }).locator('input[type="checkbox"]');
    await activeCheckbox.click();

    // Wait for API call with status filter
    const apiResponse = await page.waitForResponse(
      response => response.url().includes('/api/agents') && response.url().includes('status=active'),
      { timeout: 5000 }
    );

    expect(apiResponse.status()).toBe(200);
  });
});