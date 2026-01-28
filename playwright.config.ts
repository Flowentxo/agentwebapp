import { defineConfig, devices } from '@playwright/test';

/**
 * Flowent Inbox v2 - Playwright E2E Test Configuration
 *
 * This configuration sets up comprehensive E2E testing with:
 * - Multi-browser support (Chromium, Firefox, WebKit)
 * - Global authentication setup
 * - Trace viewer for debugging failed tests
 * - Network request interception capabilities
 */

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Global timeout for each test
  timeout: 60_000,

  // Expect timeout
  expect: { timeout: 10_000 },

  // Run tests in parallel (disabled for stable execution)
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests
  retries: process.env.CI ? 2 : 1,

  // Limit parallel workers
  workers: process.env.CI ? 2 : 1,

  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3003',

    // Timeouts
    navigationTimeout: 30_000,
    actionTimeout: 15_000,

    // Collect trace on first retry for debugging
    trace: 'on-first-retry',

    // Video on failure
    video: 'retain-on-failure',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Ignore HTTPS errors (useful for local development)
    ignoreHTTPSErrors: true,
  },

  // Configure projects for different browsers
  projects: [
    // Authentication setup - runs before all browser tests
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },

    // Desktop Chromium (primary)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Desktop Firefox
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        headless: true,
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Desktop WebKit (Safari)
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        headless: true,
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  // Web server configuration
  webServer: {
    // Production build + start (platform-safe)
    command: process.platform === 'win32'
      ? 'cmd /c "npm run build && npx next start -p 3003"'
      : 'npm run build && npx next start -p 3003',
    port: 3003,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NODE_ENV: 'production',
      NEXT_TELEMETRY_DISABLED: '1',
      E2E_TEST_MODE: '1',
    },
  },

  // Output folder for test artifacts
  outputDir: 'test-results/',
});
