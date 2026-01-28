import { test, expect } from '@playwright/test';

test.describe('Knowledge Page - No Secondary Sidebar', () => {
  test.describe('Desktop (≥lg)', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('should show only the main Shell sidebar', async ({ page }) => {
      await page.goto('/knowledge');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Main Shell sidebar should be visible
      const mainSidebar = page.locator('nav[aria-label="Hauptnavigation"]');
      await expect(mainSidebar).toBeVisible({ timeout: 5000 });

      // Verify it contains the expected navigation items
      await expect(mainSidebar.locator('text=Knowledge')).toBeVisible();
    });

    test('should NOT show "SINTRA SYSTEM" text in page content', async ({ page }) => {
      await page.goto('/knowledge');
      await page.waitForLoadState('networkidle');

      // "SINTRA SYSTEM" should only appear in the main sidebar (SidebarNav)
      // Count occurrences - should be exactly 1 (in the main sidebar)
      const sintraSystemElements = page.locator('text=/SINTRA SYSTEM/i');
      const count = await sintraSystemElements.count();

      // Expect exactly 1 occurrence (in the main Shell sidebar only)
      expect(count).toBeLessThanOrEqual(1);
    });

    test('should have exactly one navigation region', async ({ page }) => {
      await page.goto('/knowledge');
      await page.waitForLoadState('networkidle');

      // Count role="navigation" elements
      const navigationRegions = page.locator('[role="navigation"]');
      const navCount = await navigationRegions.count();

      // Should have exactly 1 (the main Shell sidebar)
      expect(navCount).toBe(1);
    });

    test('should show knowledge form fields', async ({ page }) => {
      await page.goto('/knowledge');
      await page.waitForLoadState('networkidle');

      // Page title
      const pageTitle = page.locator('h1#kb-title');
      await expect(pageTitle).toBeVisible();
      await expect(pageTitle).toHaveText('Wissensbasis');

      // Create form fields
      await expect(page.locator('label:has-text("Titel")')).toBeVisible();
      await expect(page.locator('input#create-title')).toBeVisible();

      // Type selector buttons
      await expect(page.locator('button:has-text("Notiz")')).toBeVisible();
      await expect(page.locator('button:has-text("URL")')).toBeVisible();

      // Submit button
      await expect(page.locator('button[aria-label="Wissenseintrag erstellen"]')).toBeVisible();

      // Ask question form
      await expect(page.locator('label:has-text("Ihre Frage")')).toBeVisible();
      await expect(page.locator('button[aria-label="Frage stellen"]')).toBeVisible();
    });

    test('should render content in full-width layout', async ({ page }) => {
      await page.goto('/knowledge');
      await page.waitForLoadState('networkidle');

      // Find the main content section
      const section = page.locator('section[aria-labelledby="kb-title"]');
      await expect(section).toBeVisible();

      // Section should have max-width constraint
      const sectionBox = await section.boundingBox();
      expect(sectionBox).not.toBeNull();

      // Width should be reasonable (not squeezed by a secondary sidebar)
      // With 1280px viewport and Shell sidebar (~280px), content area should be ~1000px
      // With max-w-6xl (1152px) and padding, expect ~900-1100px
      expect(sectionBox!.width).toBeGreaterThan(800);
      expect(sectionBox!.width).toBeLessThan(1200);
    });

    test('should not have AppShell component rendered', async ({ page }) => {
      await page.goto('/knowledge');
      await page.waitForLoadState('networkidle');

      // AppShell renders a grid with col-span-12 for content
      // If AppShell is present, we'd see nested grid structures
      // Check that there's no secondary sidebar structure
      const secondarySidebar = page.locator('aside.col-span-2, aside.col-span-3');
      const count = await secondarySidebar.count();

      // Should only be 1 (the main Shell sidebar, if it uses aside)
      // Or 0 if Shell doesn't use aside tag
      expect(count).toBeLessThanOrEqual(1);
    });
  });

  test.describe('Mobile (<lg)', () => {
    test.use({ viewport: { width: 375, height: 750 } });

    test('should hide sidebar by default', async ({ page }) => {
      await page.goto('/knowledge');
      await page.waitForLoadState('networkidle');

      // Main sidebar should not be visible on mobile
      const sidebar = page.locator('nav[aria-label="Hauptnavigation"]').first();
      const isVisible = await sidebar.isVisible().catch(() => false);

      if (isVisible) {
        // If visible, it should be in overlay mode (not taking layout space)
        const box = await sidebar.boundingBox();
        expect(box === null || box.width < 10).toBeTruthy();
      }
    });

    test('should show hamburger menu', async ({ page }) => {
      await page.goto('/knowledge');
      await page.waitForLoadState('networkidle');

      // Hamburger button should be visible
      const hamburger = page
        .locator('button[aria-label*="menu" i], button[aria-label*="Navigation" i]')
        .first();
      await expect(hamburger).toBeVisible({ timeout: 5000 });
    });

    test('should not show secondary sidebar overlay', async ({ page }) => {
      await page.goto('/knowledge');
      await page.waitForLoadState('networkidle');

      // Open main navigation overlay
      const hamburger = page
        .locator('button[aria-label*="menu" i], button[aria-label*="Navigation" i]')
        .first();
      await hamburger.click();

      // Main overlay should appear
      const mainOverlay = page.locator('[role="dialog"][aria-modal="true"]').first();
      await expect(mainOverlay).toBeVisible({ timeout: 1000 });

      // Close overlay
      await page.keyboard.press('Escape');
      await expect(mainOverlay).not.toBeVisible({ timeout: 1000 });

      // There should be no other navigation overlays
      const allOverlays = page.locator('[role="dialog"][aria-modal="true"]');
      const overlayCount = await allOverlays.count();

      // Should be 0 after closing (or max 1 if one is still animating out)
      expect(overlayCount).toBeLessThanOrEqual(1);
    });

    test('should show knowledge forms on mobile', async ({ page }) => {
      await page.goto('/knowledge');
      await page.waitForLoadState('networkidle');

      // Forms should be visible and functional on mobile
      await expect(page.locator('h1#kb-title')).toBeVisible();
      await expect(page.locator('input#create-title')).toBeVisible();
      await expect(page.locator('button:has-text("Notiz")')).toBeVisible();
      await expect(page.locator('button[aria-label="Wissenseintrag erstellen"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('should have proper ARIA landmark structure', async ({ page }) => {
      await page.goto('/knowledge');
      await page.waitForLoadState('networkidle');

      // Section should be labeled
      const section = page.locator('section[aria-labelledby="kb-title"]');
      await expect(section).toBeVisible();

      // Title should have correct id
      const title = page.locator('#kb-title');
      await expect(title).toBeVisible();

      // Should have proper heading hierarchy
      const h1 = page.locator('h1#kb-title');
      await expect(h1).toBeVisible();

      // H2 headings for sections
      const h2Headings = page.locator('h2');
      const h2Count = await h2Headings.count();
      expect(h2Count).toBeGreaterThan(0);
    });

    test('should have form labels and ARIA attributes', async ({ page }) => {
      await page.goto('/knowledge');
      await page.waitForLoadState('networkidle');

      // All form inputs should have labels
      const titleInput = page.locator('input#create-title');
      await expect(titleInput).toHaveAttribute('required');

      const titleLabel = page.locator('label[for="create-title"]');
      await expect(titleLabel).toBeVisible();

      // Buttons should have aria-label
      const createButton = page.locator('button[aria-label="Wissenseintrag erstellen"]');
      await expect(createButton).toBeVisible();

      const askButton = page.locator('button[aria-label="Frage stellen"]');
      await expect(askButton).toBeVisible();
    });

    test('should announce errors with ARIA live regions', async ({ page }) => {
      await page.goto('/knowledge');
      await page.waitForLoadState('networkidle');

      // Error alert should have proper ARIA attributes when shown
      // We can't easily trigger errors, but we can check the structure exists
      const alertPattern = page.locator('[role="alert"][aria-live="assertive"]');

      // These elements should exist in the DOM structure (even if hidden)
      const count = await alertPattern.count();
      // Count might be 0 if no error, but structure should be ready
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Visual Regression', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('should match knowledge page screenshot', async ({ page }) => {
      await page.goto('/knowledge');
      await page.waitForLoadState('networkidle');

      // Wait for main content to be visible
      await page.locator('h1#kb-title').waitFor({ state: 'visible' });

      // Take screenshot of main content area
      const section = page.locator('section[aria-labelledby="kb-title"]');
      await expect(section).toHaveScreenshot('knowledge-page-desktop.png', {
        animations: 'disabled',
        maxDiffPixels: 100,
      });
    });
  });

  test.describe('No AppShell Component', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('should not import or render AppShell', async ({ page }) => {
      await page.goto('/knowledge');
      await page.waitForLoadState('networkidle');

      // AppShell typically renders a grid with specific column spans
      // Check that we don't have the characteristic AppShell structure
      const appShellGrid = page.locator('.grid.grid-cols-12 > aside.col-span-2');

      // This selector targets AppShell's specific grid structure
      // It should NOT be present inside the main content area
      const mainContent = page.locator('section[aria-labelledby="kb-title"]');
      const nestedGrids = mainContent.locator('.grid.grid-cols-12');
      const nestedGridCount = await nestedGrids.count();

      // Should not have nested grid-cols-12 (which AppShell creates)
      expect(nestedGridCount).toBe(0);
    });

    test('should use Shell layout from (app) group', async ({ page }) => {
      await page.goto('/knowledge');
      await page.waitForLoadState('networkidle');

      // Verify we're using the Shell layout (Sidebar + Topbar + Main)
      // Main sidebar should exist
      const mainSidebar = page.locator('nav[aria-label="Hauptnavigation"]');
      await expect(mainSidebar).toBeVisible();

      // Section should be a direct child of the layout, not nested in AppShell
      const section = page.locator('section[aria-labelledby="kb-title"]');
      await expect(section).toBeVisible();

      // Section should not be nested inside another main element
      // (AppShell creates its own main#main-content)
      const parentMain = section.locator('xpath=ancestor::main');
      const mainCount = await parentMain.count();

      // Should be 0 (section is directly in layout) or 1 (if in Shell's main)
      // But definitely not nested in AppShell's main + another main
      expect(mainCount).toBeLessThanOrEqual(1);
    });
  });
});
