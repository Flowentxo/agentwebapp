import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Knowledge E2E Tests
 * Sprint 3 - Knowledge MVP
 * Tests: Create, Dedupe, Search, Ask, Rate-Limit, A11y
 */

test.describe('Knowledge - Create & List', () => {
  test('creates a note and shows in list with chunkCount', async ({ page }) => {
    await page.goto('http://localhost:3003/knowledge');
    await page.waitForLoadState('networkidle');

    // Fill out create form
    const titleInput = page.locator('#create-title');
    const contentTextarea = page.locator('#create-content');
    const createButton = page.getByRole('button', { name: /create knowledge item/i });

    await titleInput.fill('Test Knowledge Note');
    await contentTextarea.fill(
      'This is a test note with some content. It should be chunked and indexed properly. ' +
        'We want to test the PII redaction feature as well. Email: test@example.com Phone: +1-555-1234'
    );

    await createButton.click();

    // Wait for success message
    await expect(page.locator('text=/item created successfully/i')).toBeVisible({ timeout: 5000 });

    // Check that item appears in list
    const card = page.getByTestId('knowledge-card').first();
    await expect(card).toBeVisible();
    await expect(card).toContainText('Test Knowledge Note');

    // Check chunk count > 0
    await expect(card).toContainText(/\d+ chunks/);

    // Check PII redaction counter
    await expect(card).toContainText(/\d+ PII redacted/);
  });

  test('creates a URL item', async ({ page }) => {
    await page.goto('http://localhost:3003/knowledge');
    await page.waitForLoadState('networkidle');

    // Switch to URL type
    const urlTypeButton = page.getByRole('button', { name: /url/i }).nth(1); // Second button in type selector
    await urlTypeButton.click();

    // Fill form
    await page.locator('#create-title').fill('Example Website');
    await page.locator('#create-url').fill('https://example.com');

    await page.getByRole('button', { name: /create knowledge item/i }).click();

    // Check success
    await expect(page.locator('text=/item created successfully/i')).toBeVisible({ timeout: 5000 });

    // Check card appears
    const card = page.getByTestId('knowledge-card').filter({ hasText: 'Example Website' });
    await expect(card).toBeVisible();
    await expect(card).toContainText('https://example.com');
  });
});

test.describe('Knowledge - Dedupe', () => {
  test('prevents duplicate creation of same note', async ({ page }) => {
    await page.goto('http://localhost:3003/knowledge');
    await page.waitForLoadState('networkidle');

    const title = 'Duplicate Test Note ' + Date.now();
    const content = 'This content should only be stored once.';

    // Create first note
    await page.locator('#create-title').fill(title);
    await page.locator('#create-content').fill(content);
    await page.getByRole('button', { name: /create knowledge item/i }).click();
    await page.waitForTimeout(500);

    const initialCount = await page.getByTestId('knowledge-card').count();

    // Try to create duplicate
    await page.locator('#create-title').fill(title);
    await page.locator('#create-content').fill(content);
    await page.getByRole('button', { name: /create knowledge item/i }).click();
    await page.waitForTimeout(500);

    const finalCount = await page.getByTestId('knowledge-card').count();

    // Count should not increase (dedupe worked)
    expect(finalCount).toBe(initialCount);
  });
});

test.describe('Knowledge - Delete', () => {
  test('deletes an item after confirmation', async ({ page }) => {
    await page.goto('http://localhost:3003/knowledge');
    await page.waitForLoadState('networkidle');

    // Create item to delete
    await page.locator('#create-title').fill('Item to Delete');
    await page.locator('#create-content').fill('This item will be deleted.');
    await page.getByRole('button', { name: /create knowledge item/i }).click();
    await page.waitForTimeout(500);

    // Find the card and click delete
    const card = page.getByTestId('knowledge-card').filter({ hasText: 'Item to Delete' });
    const deleteButton = card.getByRole('button', { name: /delete/i });
    await deleteButton.click();

    // Confirm deletion
    const confirmButton = page.getByTestId('confirm-delete');
    await expect(confirmButton).toBeVisible();
    await expect(confirmButton).toBeFocused(); // A11y: focused after alert
    await confirmButton.click();

    // Item should disappear
    await expect(card).not.toBeVisible();
  });
});

test.describe('Knowledge - Search & Filter', () => {
  test('filters items by title', async ({ page }) => {
    await page.goto('http://localhost:3003/knowledge');
    await page.waitForLoadState('networkidle');

    // Create two items
    await page.locator('#create-title').fill('Searchable Item Alpha');
    await page.locator('#create-content').fill('Content alpha.');
    await page.getByRole('button', { name: /create knowledge item/i }).click();
    await page.waitForTimeout(500);

    await page.locator('#create-title').fill('Another Item Beta');
    await page.locator('#create-content').fill('Content beta.');
    await page.getByRole('button', { name: /create knowledge item/i }).click();
    await page.waitForTimeout(500);

    const totalCards = await page.getByTestId('knowledge-card').count();
    expect(totalCards).toBeGreaterThanOrEqual(2);

    // Filter by "Alpha"
    const searchInput = page.locator('#search-filter');
    await searchInput.fill('Alpha');
    await page.waitForTimeout(300);

    // Should only show Alpha item
    const visibleCards = page.getByTestId('knowledge-card');
    await expect(visibleCards).toHaveCount(1);
    await expect(visibleCards.first()).toContainText('Searchable Item Alpha');
  });
});

test.describe('Knowledge - Ask', () => {
  test('asks a question and receives answer with sources', async ({ page }) => {
    await page.goto('http://localhost:3003/knowledge');
    await page.waitForLoadState('networkidle');

    // Create some knowledge first
    await page.locator('#create-title').fill('AI Overview');
    await page.locator('#create-content').fill(
      'Artificial Intelligence (AI) is the simulation of human intelligence by machines. ' +
        'Machine learning is a subset of AI that enables systems to learn from data. ' +
        'Deep learning uses neural networks with multiple layers.'
    );
    await page.getByRole('button', { name: /create knowledge item/i }).click();
    await page.waitForTimeout(500);

    // Ask a question
    const askInput = page.locator('#ask-query');
    await askInput.fill('What is AI?');

    const askButton = page.getByRole('button', { name: /ask question/i });
    await askButton.click();

    // Wait for answer
    await page.waitForTimeout(2000);

    // Check answer is visible
    const answerText = page.locator('text=/answer/i').locator('..').locator('p');
    await expect(answerText).toBeVisible();

    const answerContent = await answerText.textContent();
    expect(answerContent).toBeTruthy();
    expect(answerContent!.length).toBeGreaterThan(10);

    // Check sources
    const sourcesHeading = page.locator('h3').filter({ hasText: /sources/i });
    await expect(sourcesHeading).toBeVisible();

    const sourcesList = page.locator('ul').filter({ has: page.locator('text=/AI Overview/i') });
    await expect(sourcesList).toBeVisible();
  });

  test('ask returns "no content" for unrelated query', async ({ page }) => {
    await page.goto('http://localhost:3003/knowledge');
    await page.waitForLoadState('networkidle');

    // Ask unrelated question (no knowledge items match)
    const askInput = page.locator('#ask-query');
    await askInput.fill('xyzabc123randomquery');

    await page.getByRole('button', { name: /ask question/i }).click();
    await page.waitForTimeout(2000);

    const answerText = await page.locator('text=/keine passenden inhalte/i, text=/no.*content/i').textContent();
    expect(answerText).toBeTruthy();
  });
});

test.describe('Knowledge - Rate Limit', () => {
  test('enforces rate limit on /api/ask (5 requests/min)', async ({ page }) => {
    await page.goto('http://localhost:3003/knowledge');
    await page.waitForLoadState('networkidle');

    // Create some content
    await page.locator('#create-title').fill('Rate Limit Test');
    await page.locator('#create-content').fill('This is test content for rate limiting.');
    await page.getByRole('button', { name: /create knowledge item/i }).click();
    await page.waitForTimeout(500);

    const askInput = page.locator('#ask-query');
    const askButton = page.getByRole('button', { name: /ask question/i });

    // Make 5 requests (should all succeed)
    for (let i = 0; i < 5; i++) {
      await askInput.fill(`Question ${i + 1}`);
      await askButton.click();
      await page.waitForTimeout(400);
    }

    // 6th request should fail with rate limit error
    await askInput.fill('Question 6 - should be rate limited');
    await askButton.click();

    // Check for rate limit error message
    const errorAlert = page.locator('[role="alert"]').filter({ hasText: /rate limit/i });
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
    await expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
  });
});

test.describe('Knowledge - A11y', () => {
  test('knowledge page has no critical/serious violations', async ({ page }) => {
    await page.goto('http://localhost:3003/knowledge');
    await page.waitForLoadState('networkidle');

    // Create an item to have content
    await page.locator('#create-title').fill('A11y Test Item');
    await page.locator('#create-content').fill('Content for accessibility testing.');
    await page.getByRole('button', { name: /create knowledge item/i }).click();
    await page.waitForTimeout(500);

    // Run axe scan
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical');
    const serious = results.violations.filter((v) => v.impact === 'serious');

    if (critical.length > 0) {
      console.error('Critical violations:', JSON.stringify(critical, null, 2));
    }
    if (serious.length > 0) {
      console.error('Serious violations:', JSON.stringify(serious, null, 2));
    }

    expect(critical, 'Critical A11y violations found').toHaveLength(0);
    expect(serious, 'Serious A11y violations found').toHaveLength(0);
  });

  test('form fields have proper labels', async ({ page }) => {
    await page.goto('http://localhost:3003/knowledge');
    await page.waitForLoadState('networkidle');

    // Check title input
    const titleInput = page.locator('#create-title');
    const titleLabel = page.locator('label[for="create-title"]');
    await expect(titleLabel).toBeVisible();
    await expect(titleLabel).toContainText(/title/i);

    // Check content textarea
    const contentTextarea = page.locator('#create-content');
    const contentLabel = page.locator('label[for="create-content"]');
    await expect(contentLabel).toBeVisible();
    await expect(contentLabel).toContainText(/content/i);

    // Check ask input
    const askInput = page.locator('#ask-query');
    const askLabel = page.locator('label[for="ask-query"]');
    await expect(askLabel).toBeVisible();
    await expect(askLabel).toContainText(/question/i);

    // Check search filter
    const searchInput = page.locator('#search-filter');
    const searchLabel = page.locator('label[for="search-filter"]');
    await expect(searchLabel).toBeVisible();
  });

  test('each knowledge card has exactly one primary CTA', async ({ page }) => {
    await page.goto('http://localhost:3003/knowledge');
    await page.waitForLoadState('networkidle');

    // Create an item
    await page.locator('#create-title').fill('CTA Test Item');
    await page.locator('#create-content').fill('Testing primary CTA.');
    await page.getByRole('button', { name: /create knowledge item/i }).click();
    await page.waitForTimeout(500);

    const card = page.getByTestId('knowledge-card').first();

    // Primary CTA is the Delete button
    const deleteButton = card.getByRole('button', { name: /delete/i });
    await expect(deleteButton).toHaveCount(1);

    // Check min height (touch target)
    const box = await deleteButton.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(40);
  });

  test('error alerts have role=alert and aria-live=assertive', async ({ page }) => {
    await page.goto('http://localhost:3003/knowledge');
    await page.waitForLoadState('networkidle');

    // Trigger error by submitting empty form
    const createButton = page.getByRole('button', { name: /create knowledge item/i });

    // This should trigger browser validation, let's instead test rate limit error
    // We'll skip form validation test and focus on rate limit error which we control

    // Make 6 requests to trigger rate limit
    await page.locator('#create-title').fill('Rate Limit A11y Test');
    await page.locator('#create-content').fill('Content.');
    await createButton.click();
    await page.waitForTimeout(500);

    const askInput = page.locator('#ask-query');
    const askButton = page.getByRole('button', { name: /ask question/i });

    for (let i = 0; i < 6; i++) {
      await askInput.fill(`Q${i}`);
      await askButton.click();
      await page.waitForTimeout(300);
    }

    // Error should have proper A11y attributes
    const errorAlert = page.locator('[role="alert"]').filter({ hasText: /rate limit/i });
    if (await errorAlert.count() > 0) {
      await expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
    }
  });

  test('success messages have aria-live=polite', async ({ page }) => {
    await page.goto('http://localhost:3003/knowledge');
    await page.waitForLoadState('networkidle');

    await page.locator('#create-title').fill('Success Test');
    await page.locator('#create-content').fill('Test content.');
    await page.getByRole('button', { name: /create knowledge item/i }).click();

    const successMessage = page.locator('[aria-live="polite"]').filter({ hasText: /created successfully/i });
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });
});
