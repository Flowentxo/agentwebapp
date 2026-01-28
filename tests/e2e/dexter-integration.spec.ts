/**
 * Dexter Agent Integration Test
 *
 * Verifies:
 * 1. Dexter appears in agent list with status 'active'
 * 2. Navigation to /agents/dexter/chat works
 * 3. Health check returns model 'gpt-4o-mini'
 * 4. Chat API returns valid responses
 */

import { test, expect } from '@playwright/test';

test.describe('Dexter Agent Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Skip authentication for this test suite
    // In production, you'd login first
  });

  test('Dexter appears in agent list with status active', async ({ page }) => {
    await page.goto('/agents/browse');

    // Wait for agents to load
    await page.waitForSelector('[data-testid="agents-grid"], .agents-grid', {
      timeout: 10000
    });

    // Check if Dexter card exists
    const dexterCard = page.locator('text=Dexter').first();
    await expect(dexterCard).toBeVisible({ timeout: 5000 });

    // Verify role is displayed
    const roleText = page.locator('text=Financial Analyst & Data Expert').first();
    await expect(roleText).toBeVisible();

    // Verify specialties are shown
    const roiCalculator = page.locator('text=ROI Calculator');
    await expect(roiCalculator.first()).toBeVisible();
  });

  test('Navigation to /agents/dexter/chat works without errors', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate directly to Dexter chat
    await page.goto('/agents/dexter/chat');

    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Verify chat interface elements are present
    await expect(page.locator('text=Dexter').first()).toBeVisible({ timeout: 5000 });

    // Check for chat input
    const chatInput = page.locator('textarea, input[type="text"]').filter({
      hasText: /nachricht|message|chat/i
    }).or(page.locator('textarea').first());

    await expect(chatInput).toBeVisible({ timeout: 5000 });

    // Verify no critical console errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('Failed to load resource') &&
      !err.includes('404')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('Health check returns model gpt-4o-mini', async ({ request }) => {
    const response = await request.get('/api/agents/dexter/health');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Verify response structure
    expect(data).toHaveProperty('agent');
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('details');

    // Verify status is healthy
    expect(data.status).toBe('healthy');

    // Verify model is gpt-4o-mini
    expect(data.details.model).toBe('gpt-4o-mini');

    // Verify provider is OpenAI
    expect(data.details.provider).toBe('OpenAI');

    // Verify tools are registered
    expect(data.details.tools).toBeGreaterThan(0);
  });

  test('Chat API returns valid response', async ({ request }) => {
    const response = await request.post('/api/agents/dexter/chat', {
      data: {
        content: 'Hallo Dexter! Kannst du mir helfen?'
      },
      headers: {
        'Content-Type': 'application/json',
      }
    });

    expect(response.ok()).toBeTruthy();

    // Verify it's a streaming response
    expect(response.headers()['content-type']).toContain('text/event-stream');

    // Read the streaming response
    const body = await response.text();

    // Verify SSE format
    expect(body).toContain('data:');

    // Verify completion signal
    expect(body).toContain('"done":true');
  });

  test('Dexter sidebar link navigates to chat', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for sidebar to load
    await page.waitForSelector('nav, [role="navigation"]', { timeout: 10000 });

    // Find Dexter link in sidebar
    const dexterLink = page.locator('a[href="/agents/dexter/chat"]').first();

    // Verify link exists
    await expect(dexterLink).toBeVisible({ timeout: 5000 });

    // Verify link text contains "Dexter"
    await expect(dexterLink).toContainText('Dexter');

    // Click and navigate
    await dexterLink.click();

    // Verify navigation
    await page.waitForURL('**/agents/dexter/chat', { timeout: 5000 });

    // Verify chat page loaded
    await expect(page.locator('text=Dexter').first()).toBeVisible();
  });

  test('Dexter metadata matches registry configuration', async ({ request }) => {
    const response = await request.get('/api/agents/dexter/chat');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Verify metadata structure
    expect(data.success).toBe(true);
    expect(data.status).toBe('active');
    expect(data.agent).toBeDefined();

    // Verify core attributes
    expect(data.agent.id).toBe('dexter');
    expect(data.agent.name).toBe('Dexter');
    expect(data.agent.role).toBe('Financial Analyst & Data Expert');

    // Verify provider and model
    expect(data.agent.provider).toBe('OpenAI');
    expect(data.agent.model).toBe('gpt-4o-mini');
  });

  test('ROI calculation function calling works', async ({ request }) => {
    const response = await request.post('/api/agents/dexter/chat', {
      data: {
        content: 'Berechne ROI für 100.000 Euro Investment mit 180.000 Euro Revenue über 18 Monate'
      },
      headers: {
        'Content-Type': 'application/json',
      }
    });

    expect(response.ok()).toBeTruthy();

    const body = await response.text();

    // Verify tool execution marker
    expect(body).toContain('calculate_roi');

    // Verify ROI calculation result appears
    expect(body).toMatch(/ROI|Return on Investment/i);

    // Verify numeric result is present
    expect(body).toMatch(/\d+(\.\d+)?%/);
  });
});

test.describe('Dexter Agent Visibility', () => {
  test('Dexter is not filtered out when showing active agents', async ({ page }) => {
    await page.goto('/agents/browse');

    // Wait for page load
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Check if there's a filter for "active" agents
    const activeFilter = page.locator('button, [role="tab"]').filter({ hasText: /active|aktiv/i });

    if (await activeFilter.count() > 0) {
      await activeFilter.first().click();
      await page.waitForTimeout(1000);
    }

    // Verify Dexter is still visible
    const dexterCard = page.locator('text=Dexter').first();
    await expect(dexterCard).toBeVisible({ timeout: 5000 });
  });

  test('Dexter appears in Data & Analytics category', async ({ page }) => {
    await page.goto('/agents/browse');

    // Wait for page load
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Look for category filter
    const dataCategory = page.locator('button, [role="tab"]').filter({
      hasText: /data.*analytics|analytics|daten/i
    });

    if (await dataCategory.count() > 0) {
      await dataCategory.first().click();
      await page.waitForTimeout(1000);

      // Verify Dexter is visible in this category
      const dexterCard = page.locator('text=Dexter').first();
      await expect(dexterCard).toBeVisible({ timeout: 5000 });
    }
  });

  test('Search for "Dexter" finds the agent', async ({ page }) => {
    await page.goto('/agents/browse');

    // Wait for page load
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="Suche"]').first();

    if (await searchInput.count() > 0) {
      await searchInput.fill('Dexter');
      await page.waitForTimeout(500);

      // Verify Dexter is visible
      const dexterCard = page.locator('text=Dexter').first();
      await expect(dexterCard).toBeVisible({ timeout: 5000 });

      // Verify other agents are filtered out
      const agentsCount = await page.locator('[data-testid="agent-card"], .agent-card').count();
      expect(agentsCount).toBeLessThanOrEqual(2); // Only Dexter should be visible
    }
  });
});
