import { test as setup, expect } from '@playwright/test';

/**
 * Flowent Inbox v2 - Global Authentication Setup
 *
 * This setup file runs before all browser tests to:
 * 1. Authenticate a test user
 * 2. Save the authentication state to be reused by all tests
 *
 * This avoids logging in for every single test, saving time.
 */

const AUTH_FILE = 'tests/e2e/.auth/user.json';

// Test credentials - should match a seeded test user in the database
const TEST_USER = {
  email: process.env.E2E_TEST_EMAIL || 'test@flowent.ai',
  password: process.env.E2E_TEST_PASSWORD || 'TestPassword123!',
};

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');

  // Wait for login form to be visible
  await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

  // Fill in credentials
  await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
  await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for successful navigation (should redirect to dashboard or inbox)
  await page.waitForURL((url) => {
    const path = url.pathname;
    return (
      path.includes('/dashboard') ||
      path.includes('/inbox') ||
      path === '/' ||
      path.includes('/brain')
    );
  }, { timeout: 30000 });

  // Verify we're logged in by checking for user-specific elements
  // Wait for either the sidebar or a user menu to appear
  await expect(
    page.locator('[data-testid="sidebar"], [data-testid="user-menu"], nav').first()
  ).toBeVisible({ timeout: 10000 });

  // Save the authentication state
  await page.context().storageState({ path: AUTH_FILE });

  console.log('✅ Authentication successful, state saved to:', AUTH_FILE);
});

/**
 * Alternative: Mock authentication for faster tests
 *
 * If your app supports cookie-based auth, you can directly set cookies
 * instead of going through the login flow:
 */
setup.describe.configure({ mode: 'serial' });

setup('mock-authenticate (fallback)', async ({ page, context }) => {
  // Skip if real auth succeeded
  const fs = await import('fs');
  if (fs.existsSync(AUTH_FILE)) {
    const content = fs.readFileSync(AUTH_FILE, 'utf-8');
    const state = JSON.parse(content);
    if (state.cookies && state.cookies.length > 0) {
      console.log('✅ Using existing auth state');
      return;
    }
  }

  console.log('⚠️ Real auth failed, setting up mock session...');

  // Set mock session cookie directly
  // This should match your app's session cookie format
  await context.addCookies([
    {
      name: 'flowent-session',
      value: 'e2e-test-session-token',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      expires: Date.now() / 1000 + 86400, // 24 hours from now
    },
    {
      name: 'flowent-user-id',
      value: 'e2e-test-user-id',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
      expires: Date.now() / 1000 + 86400,
    },
  ]);

  // Also set localStorage for client-side auth state
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem(
      'flowent-auth',
      JSON.stringify({
        user: {
          id: 'e2e-test-user-id',
          email: 'test@flowent.ai',
          name: 'E2E Test User',
        },
        isAuthenticated: true,
        expiresAt: Date.now() + 86400000,
      })
    );
  });

  // Save the mock state
  await page.context().storageState({ path: AUTH_FILE });

  console.log('✅ Mock authentication state saved');
});
