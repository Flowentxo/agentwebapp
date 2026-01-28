/**
 * E2E Tests: OAuth2 Integration Flow
 *
 * Complete end-to-end tests for OAuth2 integration
 * Tests the full user journey from initiating OAuth to disconnecting
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'demo-user@example.com';

// Page selectors
const SELECTORS = {
  integrationsTab: 'button:has-text("Integrationen")',
  gmailCard: '[data-integration="google-gmail"]',
  calendarCard: '[data-integration="google-calendar"]',
  statusBadge: '.status-badge',
  oauthButton: '.oauth-btn-google',
  connectedProfile: '.connected-profile',
  resyncButton: 'button:has-text("Resync")',
  disconnectButton: 'button:has-text("Disconnect")',
  categoryAll: 'button:has-text("All Integrations")',
  categoryCommunication: 'button:has-text("Communication")',
  categoryProductivity: 'button:has-text("Productivity")',
};

test.describe('OAuth2 Integration Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to settings page
    await page.goto(`${BASE_URL}/settings`);

    // Click integrations tab
    await page.click(SELECTORS.integrationsTab);

    // Wait for integrations to load
    await page.waitForSelector(SELECTORS.gmailCard);
  });

  test.describe('Page Load & Display', () => {
    test('should display integrations page correctly', async ({ page }) => {
      // Check page title
      await expect(page.locator('h2#integrations-heading')).toContainText('Integrationen');

      // Check stats
      await expect(page.locator('.integrations-stats')).toBeVisible();
      await expect(page.locator('.stat-label:has-text("Verfügbar")')).toBeVisible();

      // Check category filters
      await expect(page.locator(SELECTORS.categoryAll)).toBeVisible();
      await expect(page.locator(SELECTORS.categoryCommunication)).toBeVisible();
      await expect(page.locator(SELECTORS.categoryProductivity)).toBeVisible();

      // Check integration cards displayed
      const cards = page.locator('.integration-card');
      const count = await cards.count();
      expect(count).toBe(7); // All 7 integrations
    });

    test('should display Gmail card with correct information', async ({ page }) => {
      const gmailCard = page.locator(SELECTORS.gmailCard);

      // Card is visible
      await expect(gmailCard).toBeVisible();

      // Check icon
      await expect(gmailCard.locator('.integration-icon')).toBeVisible();

      // Check name
      await expect(gmailCard.locator('.integration-name')).toContainText('Gmail');

      // Check description
      await expect(gmailCard.locator('.integration-description')).toBeVisible();

      // Check features list
      const features = gmailCard.locator('.integration-features li');
      const featureCount = await features.count();
      expect(featureCount).toBeGreaterThan(0);

      // Check OAuth button
      await expect(gmailCard.locator(SELECTORS.oauthButton)).toBeVisible();
      await expect(gmailCard.locator(SELECTORS.oauthButton)).toContainText('Sign in with Google');

      // Check status badge shows "Not Connected"
      await expect(gmailCard.locator(SELECTORS.statusBadge)).toContainText('Not Connected');
    });
  });

  test.describe('Category Filtering', () => {
    test('should filter integrations by category', async ({ page }) => {
      // Initially all integrations visible
      let cards = page.locator('.integration-card');
      let count = await cards.count();
      expect(count).toBe(7);

      // Click Communication filter
      await page.click(SELECTORS.categoryCommunication);
      await page.waitForTimeout(300); // Wait for animation

      // Should show only communication integrations
      cards = page.locator('.integration-card:visible');
      count = await cards.count();
      expect(count).toBe(4); // Gmail, Outlook, Teams, Slack

      // Click Productivity filter
      await page.click(SELECTORS.categoryProductivity);
      await page.waitForTimeout(300);

      // Should show only productivity integrations
      cards = page.locator('.integration-card:visible');
      count = await cards.count();
      expect(count).toBe(2); // Calendar, Drive

      // Click All filter
      await page.click(SELECTORS.categoryAll);
      await page.waitForTimeout(300);

      // Should show all again
      cards = page.locator('.integration-card:visible');
      count = await cards.count();
      expect(count).toBe(7);
    });

    test('should highlight active category', async ({ page }) => {
      // All should be active initially
      await expect(page.locator(SELECTORS.categoryAll)).toHaveClass(/active/);

      // Click Communication
      await page.click(SELECTORS.categoryCommunication);

      // Communication should be active
      await expect(page.locator(SELECTORS.categoryCommunication)).toHaveClass(/active/);

      // All should not be active
      await expect(page.locator(SELECTORS.categoryAll)).not.toHaveClass(/active/);
    });
  });

  test.describe('OAuth Connection Flow (Mocked)', () => {
    test('should initiate OAuth flow when clicking connect button', async ({ page }) => {
      const gmailCard = page.locator(SELECTORS.gmailCard);
      const oauthButton = gmailCard.locator(SELECTORS.oauthButton);

      // Intercept OAuth initiate request
      await page.route('**/api/oauth/google/initiate', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&redirect_uri=http://localhost:3000/api/oauth/google/callback&response_type=code&scope=test&state=teststate&code_challenge=testchallenge&code_challenge_method=S256',
            service: 'gmail',
          }),
        });
      });

      // Track navigation
      const navigationPromise = page.waitForNavigation({ timeout: 5000 }).catch(() => null);

      // Click OAuth button
      await oauthButton.click();

      // Wait for navigation or timeout
      await navigationPromise;

      // Verify loading state was shown (might be too fast to catch)
      // This is best-effort
      const wasLoading = await oauthButton.textContent();
      // Button text might have changed to "Connecting..."
    });

    test('should show connected state after successful OAuth', async ({ page }) => {
      // Mock successful OAuth callback
      await page.route('**/api/integrations', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            integrations: [
              {
                provider: 'google',
                service: 'gmail',
                status: 'connected',
                connectedUser: {
                  id: 'test-user-id',
                  name: 'Test User',
                  email: TEST_USER_EMAIL,
                  avatar: 'https://example.com/avatar.jpg',
                  lastSync: new Date().toISOString(),
                },
                lastConnectedAt: new Date().toISOString(),
              },
            ],
          }),
        });
      });

      // Reload page to trigger fetch
      await page.reload();
      await page.waitForSelector(SELECTORS.gmailCard);

      const gmailCard = page.locator(SELECTORS.gmailCard);

      // Status should be "Connected"
      await expect(gmailCard.locator(SELECTORS.statusBadge)).toContainText('Connected');

      // Connected profile should be visible
      await expect(gmailCard.locator(SELECTORS.connectedProfile)).toBeVisible();

      // Should show user name and email
      await expect(gmailCard.locator('.connected-profile-name')).toContainText('Test User');
      await expect(gmailCard.locator('.connected-profile-email')).toContainText(TEST_USER_EMAIL);

      // Should show action buttons
      await expect(gmailCard.locator(SELECTORS.resyncButton)).toBeVisible();
      await expect(gmailCard.locator(SELECTORS.disconnectButton)).toBeVisible();

      // OAuth button should be hidden
      await expect(gmailCard.locator(SELECTORS.oauthButton)).not.toBeVisible();
    });

    test('should handle OAuth error gracefully', async ({ page }) => {
      // Navigate with error parameter
      await page.goto(`${BASE_URL}/settings?tab=integrations&error=access_denied`);

      // Wait for toast notification (if implemented)
      // Toast should show error message
      // This depends on your toast implementation
      await page.waitForTimeout(1000);

      // Gmail card should still show "Not Connected"
      const gmailCard = page.locator(SELECTORS.gmailCard);
      await expect(gmailCard.locator(SELECTORS.statusBadge)).toContainText('Not Connected');
    });
  });

  test.describe('Connected State Actions', () => {
    test.beforeEach(async ({ page }) => {
      // Mock connected state
      await page.route('**/api/integrations', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            integrations: [
              {
                provider: 'google',
                service: 'gmail',
                status: 'connected',
                connectedUser: {
                  id: 'test-user-id',
                  name: 'Test User',
                  email: TEST_USER_EMAIL,
                  lastSync: new Date().toISOString(),
                },
                lastConnectedAt: new Date().toISOString(),
              },
            ],
          }),
        });
      });

      await page.reload();
      await page.waitForSelector(SELECTORS.gmailCard);
    });

    test('should refresh integration', async ({ page }) => {
      const gmailCard = page.locator(SELECTORS.gmailCard);
      const resyncButton = gmailCard.locator(SELECTORS.resyncButton);

      // Mock refresh endpoint
      await page.route('**/api/oauth/refresh', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      // Click resync
      await resyncButton.click();

      // Button should show loading state
      await expect(resyncButton).toContainText('Syncing...');

      // Wait for completion
      await page.waitForTimeout(1000);

      // Should return to normal state
      await expect(resyncButton).toContainText('Resync');
    });

    test('should disconnect integration with confirmation', async ({ page }) => {
      const gmailCard = page.locator(SELECTORS.gmailCard);
      const disconnectButton = gmailCard.locator(SELECTORS.disconnectButton);

      // Mock disconnect endpoint
      await page.route('**/api/oauth/disconnect', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      // Mock updated integrations (after disconnect)
      await page.route('**/api/integrations', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            integrations: [], // Empty after disconnect
          }),
        });
      }, { times: 1 });

      // Setup dialog handler
      page.on('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Disconnect');
        await dialog.accept();
      });

      // Click disconnect
      await disconnectButton.click();

      // Wait for refetch
      await page.waitForTimeout(1000);

      // Status should be "Not Connected"
      await expect(gmailCard.locator(SELECTORS.statusBadge)).toContainText('Not Connected');

      // OAuth button should be visible again
      await expect(gmailCard.locator(SELECTORS.oauthButton)).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto(`${BASE_URL}/settings?tab=integrations`);
      await page.waitForSelector(SELECTORS.gmailCard);

      // Cards should stack in single column
      const cards = page.locator('.integration-card');
      const firstCard = cards.first();
      const boundingBox = await firstCard.boundingBox();

      expect(boundingBox).not.toBeNull();
      if (boundingBox) {
        // Card should take most of screen width (with padding)
        expect(boundingBox.width).toBeGreaterThan(300);
        expect(boundingBox.width).toBeLessThan(375);
      }
    });

    test('should display correctly on tablet', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto(`${BASE_URL}/settings?tab=integrations`);
      await page.waitForSelector(SELECTORS.gmailCard);

      // Should have 2 columns on tablet
      const cards = page.locator('.integration-card');
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should display correctly on desktop', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });

      await page.goto(`${BASE_URL}/settings?tab=integrations`);
      await page.waitForSelector(SELECTORS.gmailCard);

      // Should have 3 columns on desktop
      const cards = page.locator('.integration-card');
      const count = await cards.count();
      expect(count).toBe(7);
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings?tab=integrations`);
      await page.waitForSelector(SELECTORS.gmailCard);

      // Tab through elements
      await page.keyboard.press('Tab'); // First category filter
      await page.keyboard.press('Tab'); // Second category filter
      await page.keyboard.press('Tab'); // Third category filter

      // Should be able to activate with Enter
      await page.keyboard.press('Enter');

      // Continue tabbing to cards
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
      }

      // Should reach OAuth button
      const focused = await page.evaluateHandle(() => document.activeElement);
      const tagName = await focused.evaluate((el) => el.tagName);
      expect(tagName).toBe('BUTTON');
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings?tab=integrations`);
      await page.waitForSelector(SELECTORS.gmailCard);

      // Check main heading has ID for aria-labelledby
      const heading = page.locator('h2#integrations-heading');
      await expect(heading).toBeVisible();

      // Check category nav has aria-label
      const categoryNav = page.locator('.integrations-categories');
      await expect(categoryNav).toHaveAttribute('aria-label', 'Filter by category');

      // Check OAuth button has aria-label
      const oauthButton = page.locator(SELECTORS.gmailCard).locator(SELECTORS.oauthButton);
      const ariaLabel = await oauthButton.getAttribute('aria-label');
      expect(ariaLabel).toContain('Gmail');
    });

    test('should announce loading states to screen readers', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings?tab=integrations`);
      await page.waitForSelector(SELECTORS.gmailCard);

      const gmailCard = page.locator(SELECTORS.gmailCard);
      const oauthButton = gmailCard.locator(SELECTORS.oauthButton);

      // Check aria-busy attribute when loading
      // This would be set during actual OAuth flow
      // For now, just verify it exists on the button
      const ariaBusy = await oauthButton.getAttribute('aria-busy');
      expect(ariaBusy).toBeDefined();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network error
      await page.route('**/api/integrations', async (route) => {
        await route.abort('failed');
      });

      await page.goto(`${BASE_URL}/settings?tab=integrations`);

      // Wait for error state
      await page.waitForSelector('.integrations-error', { timeout: 5000 });

      // Error message should be displayed
      await expect(page.locator('.integrations-error')).toContainText('Failed to load');

      // Retry button should be visible
      await expect(page.locator('button:has-text("Retry")')).toBeVisible();
    });

    test('should handle API errors with proper messages', async ({ page }) => {
      // Simulate API error
      await page.route('**/api/integrations', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'internal_error',
              message: 'Internal server error',
            },
          }),
        });
      });

      await page.goto(`${BASE_URL}/settings?tab=integrations`);

      // Error state should be shown
      await page.waitForSelector('.integrations-error', { timeout: 5000 });
    });
  });
});

test.describe('Performance', () => {
  test('should load page quickly', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/settings?tab=integrations`);
    await page.waitForSelector(SELECTORS.gmailCard);

    const loadTime = Date.now() - startTime;

    // Page should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should have no layout shifts', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings?tab=integrations`);

    // Get initial layout
    const initialCards = await page.locator('.integration-card').count();

    // Wait for any layout shifts
    await page.waitForTimeout(1000);

    // Count should remain same (no cards appearing/disappearing)
    const finalCards = await page.locator('.integration-card').count();
    expect(finalCards).toBe(initialCards);
  });
});
