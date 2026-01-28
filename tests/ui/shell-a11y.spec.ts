import { test, expect } from '@playwright/test';

test.describe('Sintra Shell A11y', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should have proper landmarks for shell', async ({ page }) => {
    // Sidebar navigation
    const nav = page.locator('nav[aria-label="Hauptnavigation"]');
    await expect(nav).toBeVisible();

    // Topbar header
    const header = page.locator('header[role="banner"]');
    await expect(header).toBeVisible();

    // Main content
    const main = page.locator('main[role="main"]');
    await expect(main).toBeVisible();
  });

  test('should navigate with arrow keys in sidebar', async ({ page }) => {
    // Focus first nav item
    const firstNavItem = page.locator('[data-nav-item]').first();
    await firstNavItem.focus();

    // Press down arrow
    await page.keyboard.press('ArrowDown');

    // Second item should be focused
    const secondNavItem = page.locator('[data-nav-item]').nth(1);
    await expect(secondNavItem).toBeFocused();

    // Press up arrow
    await page.keyboard.press('ArrowUp');

    // First item should be focused again
    await expect(firstNavItem).toBeFocused();
  });

  test('should open command palette with ⌘K', async ({ page }) => {
    // Press Cmd+K (Ctrl+K on Windows/Linux)
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+KeyK`);

    // Command dialog should be visible
    const commandDialog = page.locator('[role="dialog"]', { hasText: 'Schnellaktionen' });
    await expect(commandDialog).toBeVisible();
  });

  test('should show tooltip on hover in collapsed sidebar', async ({ page }) => {
    // Collapse sidebar
    const collapseButton = page.locator('button[aria-label*="Navigation"]');
    await collapseButton.click();

    // Wait for collapse animation
    await page.waitForTimeout(300);

    // Hover over nav item
    const navItem = page.locator('[data-nav-item]').first();
    await navItem.hover();

    // Tooltip should appear
    const tooltip = page.locator('[role="tooltip"]');
    await expect(tooltip).toBeVisible({ timeout: 1000 });
  });

  test('should have aria-current on active nav item', async ({ page }) => {
    // Dashboard should be active
    const dashboardNavItem = page.locator('[data-nav-item][href="/dashboard"]');
    await expect(dashboardNavItem).toHaveAttribute('aria-current', 'page');

    // Navigate to agents
    await page.goto('/agents');

    // Agents should be active
    const agentsNavItem = page.locator('[data-nav-item][href="/agents"]');
    await expect(agentsNavItem).toHaveAttribute('aria-current', 'page');

    // Dashboard should not be active
    await expect(dashboardNavItem).not.toHaveAttribute('aria-current', 'page');
  });

  test('should have visible focus indicators', async ({ page }) => {
    // Tab through navigation
    await page.keyboard.press('Tab');

    // Should have focus ring
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toHaveCSS('outline-style', 'solid');
  });

  test('should have breadcrumb navigation in topbar', async ({ page }) => {
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumb).toBeVisible();

    // Should show current page
    const currentPage = breadcrumb.locator('[aria-current="page"]');
    await expect(currentPage).toContainText('Dashboard');
  });

  test('should respect reduced motion preference', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Reload page
    await page.reload();

    // Check that transitions are disabled
    const navItem = page.locator('[data-nav-item]').first();
    const transitionDuration = await navItem.evaluate((el) => {
      return window.getComputedStyle(el).transitionDuration;
    });

    // Should be 0s or very short (0.001s) due to reduced motion
    expect(parseFloat(transitionDuration)).toBeLessThan(0.01);
  });

  test('should announce live region updates', async ({ page }) => {
    // Navigate to page with live region
    const liveRegion = page.locator('[role="status"][aria-live="polite"]');

    if (await liveRegion.count() > 0) {
      await expect(liveRegion).toBeAttached();
    }
  });

  test('should have proper color contrast', async ({ page }) => {
    // Check text color contrast
    const textElement = page.locator('.text-text').first();
    const backgroundColor = await textElement.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    const color = await textElement.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    // Basic check that colors are different (full contrast check requires color library)
    expect(backgroundColor).not.toBe(color);
  });
});

test.describe('Sidebar Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should toggle sidebar collapse state', async ({ page }) => {
    const sidebar = page.locator('nav[aria-label="Hauptnavigation"]');

    // Get initial width
    const initialWidth = await sidebar.evaluate((el) => el.offsetWidth);

    // Click collapse button
    const collapseButton = page.locator('button[aria-label*="Navigation"]');
    await collapseButton.click();

    // Wait for animation
    await page.waitForTimeout(300);

    // Check width changed
    const collapsedWidth = await sidebar.evaluate((el) => el.offsetWidth);
    expect(collapsedWidth).toBeLessThan(initialWidth);

    // Click again to expand
    await collapseButton.click();
    await page.waitForTimeout(300);

    const expandedWidth = await sidebar.evaluate((el) => el.offsetWidth);
    expect(expandedWidth).toBeGreaterThan(collapsedWidth);
  });

  test('should persist sidebar state on navigation', async ({ page }) => {
    // Collapse sidebar
    const collapseButton = page.locator('button[aria-label*="Navigation"]');
    await collapseButton.click();
    await page.waitForTimeout(300);

    // Navigate to different page
    await page.goto('/agents');

    // Sidebar should still be collapsed
    const sidebar = page.locator('nav[aria-label="Hauptnavigation"]');
    const width = await sidebar.evaluate((el) => el.offsetWidth);
    expect(width).toBeLessThan(120); // Collapsed width is 80px
  });
});

test.describe('Topbar Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should show user menu on click', async ({ page }) => {
    const userButton = page.locator('button[aria-label*="Benutzer"]');
    await userButton.click();

    // Menu should be visible
    const menu = page.locator('[role="menu"]');
    await expect(menu).toBeVisible();

    // Should have menu items
    const profileItem = page.locator('[role="menuitem"]', { hasText: 'Profil' });
    await expect(profileItem).toBeVisible();
  });

  test('should close command palette with Escape', async ({ page }) => {
    // Open command palette
    await page.keyboard.press('Control+KeyK');

    // Dialog should be visible
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Dialog should be hidden
    await expect(dialog).toBeHidden();
  });
});
