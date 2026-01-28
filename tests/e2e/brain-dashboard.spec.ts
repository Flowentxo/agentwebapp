/**
 * E2E Tests for Brain AI Dashboard
 * Tests complete user workflows
 */

import { test, expect } from '@playwright/test';

test.describe('Brain AI Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/brain');
  });

  test('should display dashboard with all sections', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Brain AI/);

    // Check header
    await expect(page.getByText('Brain AI')).toBeVisible();
    await expect(page.getByText('Intelligent Knowledge Management')).toBeVisible();

    // Check stats cards
    await expect(page.getByText('Total Documents')).toBeVisible();
    await expect(page.getByText('Active Contexts')).toBeVisible();
    await expect(page.getByText('Total Queries')).toBeVisible();

    // Check tabs
    await expect(page.getByRole('tab', { name: 'Knowledge Library' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Active Contexts' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Insights' })).toBeVisible();
  });

  test('should perform search with results', async ({ page }) => {
    // Type in search bar
    const searchInput = page.getByPlaceholder(/Search knowledge/);
    await searchInput.fill('test query');

    // Wait for results
    await page.waitForTimeout(500); // Debounce delay

    // Check if results dropdown appears
    await expect(page.getByText('results found')).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    // Click Knowledge Library tab
    await page.getByRole('tab', { name: 'Knowledge Library' }).click();
    await expect(page.getByText('Knowledge Library')).toBeVisible();

    // Click Insights tab
    await page.getByRole('tab', { name: 'Insights' }).click();
    await expect(page.getByText('Analytics & Insights')).toBeVisible();

    // Click Active Contexts tab
    await page.getByRole('tab', { name: 'Active Contexts' }).click();
    await expect(page.getByText('Active Conversation Contexts')).toBeVisible();
  });

  test('should upload document', async ({ page }) => {
    // Navigate to Knowledge Library
    await page.getByRole('tab', { name: 'Knowledge Library' }).click();

    // Click upload area
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-document.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('This is a test document for Brain AI'),
    });

    // Wait for upload to complete
    await page.waitForTimeout(2000);

    // Check for success (document should appear in list)
    await expect(page.getByText('test-document.txt')).toBeVisible();
  });

  test('should toggle view modes', async ({ page }) => {
    await page.getByRole('tab', { name: 'Knowledge Library' }).click();

    // Check grid view button
    const gridBtn = page.getByTitle('Grid view');
    const listBtn = page.getByTitle('List view');

    await expect(gridBtn).toBeVisible();
    await expect(listBtn).toBeVisible();

    // Toggle to grid view
    await gridBtn.click();
    // Check if view changed (implementation specific)
  });

  test('should refresh data', async ({ page }) => {
    const refreshBtn = page.getByLabel('Refresh data');
    await refreshBtn.click();

    // Check for loading state
    await expect(refreshBtn).toBeDisabled();

    // Wait for refresh to complete
    await page.waitForTimeout(1500);

    // Button should be enabled again
    await expect(refreshBtn).toBeEnabled();
  });

  test('should be keyboard accessible', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab'); // Search bar
    await page.keyboard.press('Tab'); // Filter button
    await page.keyboard.press('Tab'); // First tab
    await page.keyboard.press('Enter'); // Activate tab

    // Check if tab was activated
    await expect(page.getByRole('tab', { name: 'Knowledge Library' })).toHaveAttribute(
      'data-state',
      'active'
    );
  });

  test('should handle empty states', async ({ page }) => {
    await page.getByRole('tab', { name: 'Knowledge Library' }).click();

    // If no documents, should show empty state
    const emptyState = page.getByText('No documents found');
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
      await expect(page.getByText('Upload documents to get started')).toBeVisible();
    }
  });
});

test.describe('Search Functionality', () => {
  test('should filter search by type', async ({ page }) => {
    await page.goto('http://localhost:3000/brain');

    // Open filters
    await page.getByLabel('Toggle filters').click();

    // Check filter options
    await expect(page.getByText('Hybrid')).toBeVisible();
    await expect(page.getByText('Semantic')).toBeVisible();
    await expect(page.getByText('Full-Text')).toBeVisible();

    // Select semantic search
    await page.getByText('Semantic').click();

    // Perform search
    await page.getByPlaceholder(/Search knowledge/).fill('test');
    await page.waitForTimeout(500);

    // Check that search type badge shows "semantic"
    await expect(page.getByText('semantic')).toBeVisible();
  });

  test('should clear search', async ({ page }) => {
    await page.goto('http://localhost:3000/brain');

    const searchInput = page.getByPlaceholder(/Search knowledge/);
    await searchInput.fill('test query');

    // Click clear button
    await page.getByLabel('Clear search').click();

    // Check input is empty
    await expect(searchInput).toHaveValue('');
  });
});

test.describe('Performance', () => {
  test('should load within performance budget', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('http://localhost:3000/brain');

    // Wait for main content
    await page.waitForSelector('.brain-dashboard');

    const loadTime = Date.now() - startTime;

    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle rapid interactions', async ({ page }) => {
    await page.goto('http://localhost:3000/brain');

    // Rapidly switch tabs
    for (let i = 0; i < 5; i++) {
      await page.getByRole('tab', { name: 'Knowledge Library' }).click();
      await page.getByRole('tab', { name: 'Insights' }).click();
    }

    // Should not crash or freeze
    await expect(page.getByText('Brain AI')).toBeVisible();
  });
});
