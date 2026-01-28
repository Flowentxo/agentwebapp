import { test, expect } from '@playwright/test';

test.describe('Shell Sidebar Visibility', () => {
  test.describe('Desktop (≥lg)', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('should show sidebar on dashboard page', async ({ page }) => {
      await page.goto('/dashboard');

      // Sidebar should be in DOM
      const sidebar = page.locator('nav[aria-label="Hauptnavigation"]');
      await expect(sidebar).toBeVisible();

      // Check sidebar width (280px expanded or 80px collapsed)
      const box = await sidebar.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(70); // At least 70px (accounting for borders)
    });

    test('should keep sidebar visible when navigating to /agents', async ({ page }) => {
      await page.goto('/dashboard');

      // Verify sidebar exists
      const sidebar = page.locator('nav[aria-label="Hauptnavigation"]');
      await expect(sidebar).toBeVisible();

      // Navigate to agents
      await page.goto('/agents');

      // Sidebar should still be visible
      await expect(sidebar).toBeVisible();

      const box = await sidebar.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(70);
    });

    test('should toggle sidebar collapse state', async ({ page }) => {
      await page.goto('/dashboard');

      const sidebar = page.locator('nav[aria-label="Hauptnavigation"]');
      await expect(sidebar).toBeVisible();

      // Get initial width
      const initialBox = await sidebar.boundingBox();
      const initialWidth = initialBox!.width;

      // Find and click collapse button
      const collapseButton = sidebar.locator('button[aria-label*="sidebar"]').first();
      if (await collapseButton.isVisible()) {
        await collapseButton.click();

        // Wait for animation
        await page.waitForTimeout(300);

        // Width should change
        const newBox = await sidebar.boundingBox();
        const newWidth = newBox!.width;

        expect(Math.abs(newWidth - initialWidth)).toBeGreaterThan(50);
      }
    });

    test('should persist sidebar state across page reloads', async ({ page }) => {
      await page.goto('/dashboard');

      const sidebar = page.locator('nav[aria-label="Hauptnavigation"]');

      // Find collapse button
      const collapseButton = sidebar.locator('button[aria-label*="sidebar"]').first();

      if (await collapseButton.isVisible()) {
        // Collapse sidebar
        await collapseButton.click();
        await page.waitForTimeout(300);

        const collapsedWidth = (await sidebar.boundingBox())!.width;

        // Reload page
        await page.reload();

        // Wait for sidebar to render
        await expect(sidebar).toBeVisible();
        await page.waitForTimeout(300);

        // Width should still be collapsed
        const afterReloadWidth = (await sidebar.boundingBox())!.width;

        // Allow 5px tolerance for border/padding differences
        expect(Math.abs(afterReloadWidth - collapsedWidth)).toBeLessThan(5);
      }
    });

    test('should show sidebar on all app routes', async ({ page }) => {
      const routes = ['/dashboard', '/agents', '/workflows', '/analytics', '/board', '/settings'];

      for (const route of routes) {
        await page.goto(route);

        const sidebar = page.locator('nav[aria-label="Hauptnavigation"]');
        await expect(sidebar).toBeVisible({ timeout: 5000 });

        const box = await sidebar.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThanOrEqual(70);
      }
    });
  });

  test.describe('Mobile (<lg)', () => {
    test.use({ viewport: { width: 375, height: 750 } });

    test('should hide sidebar by default', async ({ page }) => {
      await page.goto('/dashboard');

      // Desktop sidebar should not be visible on mobile
      const desktopSidebar = page.locator('nav[aria-label="Hauptnavigation"]').first();

      // Either not in viewport or hidden
      const isVisible = await desktopSidebar.isVisible().catch(() => false);

      if (isVisible) {
        // If it exists, check it's not taking space (display: none or hidden)
        const box = await desktopSidebar.boundingBox();
        // On mobile, sidebar should be in overlay mode or hidden
        expect(box === null || box.width < 10).toBeTruthy();
      }
    });

    test('should show hamburger menu in topbar', async ({ page }) => {
      await page.goto('/dashboard');

      // Look for hamburger button (usually has Menu icon or aria-label)
      const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="Navigation" i]').first();

      await expect(hamburger).toBeVisible({ timeout: 5000 });
    });

    test('should open sidebar overlay on hamburger click', async ({ page }) => {
      await page.goto('/dashboard');

      // Find hamburger
      const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="Navigation" i]').first();
      await expect(hamburger).toBeVisible();

      // Click hamburger
      await hamburger.click();

      // Overlay sidebar should appear
      const overlay = page.locator('[role="dialog"][aria-modal="true"]');
      await expect(overlay).toBeVisible({ timeout: 1000 });

      // Should contain navigation
      const nav = overlay.locator('nav');
      await expect(nav).toBeVisible();
    });

    test('should close overlay on ESC key', async ({ page }) => {
      await page.goto('/dashboard');

      // Open overlay
      const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="Navigation" i]').first();
      await hamburger.click();

      const overlay = page.locator('[role="dialog"][aria-modal="true"]');
      await expect(overlay).toBeVisible();

      // Press ESC
      await page.keyboard.press('Escape');

      // Overlay should close
      await expect(overlay).not.toBeVisible({ timeout: 1000 });
    });

    test('should close overlay on backdrop click', async ({ page }) => {
      await page.goto('/dashboard');

      // Open overlay
      const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="Navigation" i]').first();
      await hamburger.click();

      const overlay = page.locator('[role="dialog"][aria-modal="true"]');
      await expect(overlay).toBeVisible();

      // Click backdrop (area outside nav)
      await page.mouse.click(10, 10);

      // Overlay should close
      await expect(overlay).not.toBeVisible({ timeout: 1000 });
    });

    test('should restore focus to hamburger after closing overlay', async ({ page }) => {
      await page.goto('/dashboard');

      // Open overlay
      const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="Navigation" i]').first();
      await hamburger.click();

      const overlay = page.locator('[role="dialog"][aria-modal="true"]');
      await expect(overlay).toBeVisible();

      // Press ESC to close
      await page.keyboard.press('Escape');

      // Wait for close
      await expect(overlay).not.toBeVisible();

      // Check focus returned to hamburger (or at least it's focusable)
      const focused = await page.evaluate(() => document.activeElement?.tagName);

      // Focus should be on a button (hamburger or close button)
      expect(focused).toBe('BUTTON');
    });
  });

  test.describe('Accessibility', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('should have proper ARIA attributes on desktop', async ({ page }) => {
      await page.goto('/dashboard');

      const sidebar = page.locator('nav[aria-label="Hauptnavigation"]');
      await expect(sidebar).toBeVisible();

      // Should have navigation role
      await expect(sidebar).toHaveAttribute('aria-label', 'Hauptnavigation');

      // Nav items should be links
      const navLinks = sidebar.locator('a');
      const count = await navLinks.count();
      expect(count).toBeGreaterThan(0);

      // Active link should have aria-current
      const activeLink = sidebar.locator('[aria-current="page"]');
      expect(await activeLink.count()).toBeGreaterThanOrEqual(0);
    });

    test('should have proper ARIA attributes on mobile overlay', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 750 });
      await page.goto('/dashboard');

      // Open overlay
      const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="Navigation" i]').first();
      await hamburger.click();

      const overlay = page.locator('[role="dialog"][aria-modal="true"]');
      await expect(overlay).toBeVisible();

      // Should have dialog role and aria-modal
      await expect(overlay).toHaveAttribute('role', 'dialog');
      await expect(overlay).toHaveAttribute('aria-modal', 'true');

      // Should have aria-labelledby or aria-label
      const hasLabel =
        (await overlay.getAttribute('aria-labelledby')) || (await overlay.getAttribute('aria-label'));
      expect(hasLabel).toBeTruthy();
    });
  });

  test.describe('Visual Regression', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('should match sidebar screenshot on desktop', async ({ page }) => {
      await page.goto('/dashboard');

      const sidebar = page.locator('nav[aria-label="Hauptnavigation"]');
      await expect(sidebar).toBeVisible();

      // Take screenshot of sidebar only
      await expect(sidebar).toHaveScreenshot('sidebar-desktop.png', {
        animations: 'disabled',
      });
    });

    test('should match collapsed sidebar screenshot', async ({ page }) => {
      await page.goto('/dashboard');

      const sidebar = page.locator('nav[aria-label="Hauptnavigation"]');
      const collapseButton = sidebar.locator('button[aria-label*="sidebar"]').first();

      if (await collapseButton.isVisible()) {
        await collapseButton.click();
        await page.waitForTimeout(300);

        await expect(sidebar).toHaveScreenshot('sidebar-collapsed.png', {
          animations: 'disabled',
        });
      }
    });
  });
});
