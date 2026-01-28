import { test, expect } from '@playwright/test';

const SECTIONS = [
  { path: '/workflows', title: 'Workflows', buttonText: 'Workflow erstellen' },
  { path: '/analytics', title: 'Analytics', heading: 'Traffic' },
  { path: '/board', title: 'Board', heading: 'Tag Swimlanes' },
  { path: '/admin', title: 'Admin', heading: 'Playbooks' },
  { path: '/settings', title: 'Einstellungen', heading: 'Bald verfügbar' },
];

test.describe('Sections - No Secondary Sidebar', () => {
  test.describe('Desktop (≥lg)', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    for (const section of SECTIONS) {
      test(`${section.title}: should show only main Shell sidebar`, async ({ page }) => {
        await page.goto(section.path);
        await page.waitForLoadState('networkidle');

        // Main Shell sidebar should be visible
        const mainSidebar = page.locator('nav[aria-label="Hauptnavigation"]');
        await expect(mainSidebar).toBeVisible({ timeout: 5000 });

        // Verify sidebar width (expanded or collapsed)
        const box = await mainSidebar.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThanOrEqual(70); // At least 70px
      });

      test(`${section.title}: should NOT show "SINTRA SYSTEM" in content`, async ({ page }) => {
        await page.goto(section.path);
        await page.waitForLoadState('networkidle');

        // "SINTRA SYSTEM" should only appear in the main sidebar (if at all)
        const sintraSystemElements = page.locator('text=/SINTRA SYSTEM/i');
        const count = await sintraSystemElements.count();

        // Expect at most 1 occurrence (in the main Shell sidebar only)
        expect(count).toBeLessThanOrEqual(1);
      });

      test(`${section.title}: should have exactly one navigation region`, async ({ page }) => {
        await page.goto(section.path);
        await page.waitForLoadState('networkidle');

        // Count role="navigation" elements
        const navigationRegions = page.locator('[role="navigation"]');
        const navCount = await navigationRegions.count();

        // Should have exactly 1 (the main Shell sidebar)
        expect(navCount).toBe(1);
      });

      test(`${section.title}: should show page title and content`, async ({ page }) => {
        await page.goto(section.path);
        await page.waitForLoadState('networkidle');

        // Page title should be visible
        const pageTitle = page.locator('h1#page-title');
        await expect(pageTitle).toBeVisible();
        await expect(pageTitle).toContainText(section.title);

        // Check for specific content based on section
        if (section.buttonText) {
          const button = page.locator(`button:has-text("${section.buttonText}")`);
          await expect(button).toBeVisible();
        }

        if (section.heading) {
          const heading = page.locator(`text=${section.heading}`).first();
          await expect(heading).toBeVisible();
        }
      });

      test(`${section.title}: should render in full-width layout`, async ({ page }) => {
        await page.goto(section.path);
        await page.waitForLoadState('networkidle');

        // Find the main content section
        const section_el = page.locator('section[aria-labelledby="page-title"]');
        await expect(section_el).toBeVisible();

        // Section should have max-width constraint
        const sectionBox = await section_el.boundingBox();
        expect(sectionBox).not.toBeNull();

        // Width should be reasonable (not squeezed by a secondary sidebar)
        expect(sectionBox!.width).toBeGreaterThan(800);
        expect(sectionBox!.width).toBeLessThan(1200);
      });

      test(`${section.title}: should not have AppShell grid structure`, async ({ page }) => {
        await page.goto(section.path);
        await page.waitForLoadState('networkidle');

        // AppShell renders a grid with col-span-12 for content
        // Check that there's no secondary sidebar structure
        const mainContent = page.locator('section[aria-labelledby="page-title"]');
        const nestedGrids = mainContent.locator('.grid.grid-cols-12 > aside');
        const nestedGridCount = await nestedGrids.count();

        // Should not have nested AppShell grid structure
        expect(nestedGridCount).toBe(0);
      });
    }
  });

  test.describe('Mobile (<lg)', () => {
    test.use({ viewport: { width: 375, height: 750 } });

    for (const section of SECTIONS) {
      test(`${section.title}: should hide sidebar by default`, async ({ page }) => {
        await page.goto(section.path);
        await page.waitForLoadState('networkidle');

        // Desktop sidebar should not be visible on mobile
        const desktopSidebar = page.locator('nav[aria-label="Hauptnavigation"]').first();
        const isVisible = await desktopSidebar.isVisible().catch(() => false);

        if (isVisible) {
          // If it exists, check it's not taking space (hidden or overlay mode)
          const box = await desktopSidebar.boundingBox();
          expect(box === null || box.width < 10).toBeTruthy();
        }
      });

      test(`${section.title}: should show hamburger menu`, async ({ page }) => {
        await page.goto(section.path);
        await page.waitForLoadState('networkidle');

        // Hamburger button should be visible
        const hamburger = page
          .locator('button[aria-label*="menu" i], button[aria-label*="Navigation" i]')
          .first();
        await expect(hamburger).toBeVisible({ timeout: 5000 });
      });

      test(`${section.title}: should open sidebar overlay on hamburger click`, async ({
        page,
      }) => {
        await page.goto(section.path);
        await page.waitForLoadState('networkidle');

        // Find hamburger
        const hamburger = page
          .locator('button[aria-label*="menu" i], button[aria-label*="Navigation" i]')
          .first();
        await expect(hamburger).toBeVisible();

        // Click hamburger
        await hamburger.click();

        // Overlay should appear
        const overlay = page.locator('[role="dialog"][aria-modal="true"]').first();
        await expect(overlay).toBeVisible({ timeout: 1000 });

        // Should contain navigation
        const nav = overlay.locator('nav');
        await expect(nav).toBeVisible();
      });

      test(`${section.title}: should not show second overlay`, async ({ page }) => {
        await page.goto(section.path);
        await page.waitForLoadState('networkidle');

        // Open main navigation overlay
        const hamburger = page
          .locator('button[aria-label*="menu" i], button[aria-label*="Navigation" i]')
          .first();
        await hamburger.click();

        // Wait for overlay
        const mainOverlay = page.locator('[role="dialog"][aria-modal="true"]').first();
        await expect(mainOverlay).toBeVisible({ timeout: 1000 });

        // Count all overlays
        const allOverlays = page.locator('[role="dialog"][aria-modal="true"]');
        const overlayCount = await allOverlays.count();

        // Should be exactly 1 (just the main sidebar overlay)
        expect(overlayCount).toBe(1);

        // Close overlay
        await page.keyboard.press('Escape');
        await expect(mainOverlay).not.toBeVisible({ timeout: 1000 });
      });

      test(`${section.title}: should show page content on mobile`, async ({ page }) => {
        await page.goto(section.path);
        await page.waitForLoadState('networkidle');

        // Page title should be visible
        const pageTitle = page.locator('h1#page-title');
        await expect(pageTitle).toBeVisible();
      });
    }
  });

  test.describe('Accessibility', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    for (const section of SECTIONS) {
      test(`${section.title}: should have proper ARIA landmark structure`, async ({ page }) => {
        await page.goto(section.path);
        await page.waitForLoadState('networkidle');

        // Section should be labeled
        const section_el = page.locator('section[aria-labelledby="page-title"]');
        await expect(section_el).toBeVisible();

        // Title should have correct id
        const title = page.locator('#page-title');
        await expect(title).toBeVisible();

        // Should have proper heading hierarchy
        const h1 = page.locator('h1#page-title');
        await expect(h1).toBeVisible();
      });

      test(`${section.title}: should have single navigation landmark`, async ({ page }) => {
        await page.goto(section.path);
        await page.waitForLoadState('networkidle');

        // Should have exactly one navigation region
        const navLandmarks = page.locator('nav, [role="navigation"]');
        const count = await navLandmarks.count();

        expect(count).toBe(1);
      });
    }
  });

  test.describe('Visual Regression', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    for (const section of SECTIONS) {
      test(`${section.title}: should match page screenshot`, async ({ page }) => {
        await page.goto(section.path);
        await page.waitForLoadState('networkidle');

        // Wait for main content to be visible
        await page.locator('h1#page-title').waitFor({ state: 'visible' });

        // Take screenshot of main content area
        const section_el = page.locator('section[aria-labelledby="page-title"]');
        await expect(section_el).toHaveScreenshot(`${section.title.toLowerCase()}-desktop.png`, {
          animations: 'disabled',
          maxDiffPixels: 100,
        });
      });
    }
  });

  test.describe('No AppShell Pattern', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    for (const section of SECTIONS) {
      test(`${section.title}: should not use AppShell grid-cols-12 pattern`, async ({ page }) => {
        await page.goto(section.path);
        await page.waitForLoadState('networkidle');

        // AppShell uses grid-cols-12, content-only layouts should not
        const mainContent = page.locator('section[aria-labelledby="page-title"]');
        const gridElements = mainContent.locator('.grid-cols-12');

        // Content grids inside are allowed, but not the AppShell wrapper grid
        const hasAppShellGrid = await mainContent.locator('xpath=ancestor::div[contains(@class, "grid-cols-12")]').count();

        // Section should not be wrapped in AppShell's grid structure
        expect(hasAppShellGrid).toBe(0);
      });

      test(`${section.title}: should use Shell layout from (app) group`, async ({ page }) => {
        await page.goto(section.path);
        await page.waitForLoadState('networkidle');

        // Verify we're using the Shell layout (Sidebar + Topbar + Main)
        // Main sidebar should exist
        const mainSidebar = page.locator('nav[aria-label="Hauptnavigation"]');
        await expect(mainSidebar).toBeVisible();

        // Section should be directly in the layout
        const section_el = page.locator('section[aria-labelledby="page-title"]');
        await expect(section_el).toBeVisible();

        // Verify breadcrumb shows correct section name
        const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
        await expect(breadcrumb).toBeVisible();
      });
    }
  });
});
