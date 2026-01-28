import { test, expect } from '@playwright/test';

test.describe('Sidebar Persistence & Responsive', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/dashboard');
    await page.evaluate(() => localStorage.clear());
  });

  test('should persist sidebar collapsed state across reload', async ({ page }) => {
    await page.goto('/dashboard');

    // Click collapse button
    const collapseButton = page.locator('button[aria-label*="Navigation einklappen"]');
    await collapseButton.click();

    // Wait for animation
    await page.waitForTimeout(300);

    // Check localStorage is set
    const collapsed = await page.evaluate(() => {
      return localStorage.getItem('ui.sidebarCollapsed');
    });
    expect(collapsed).toBe('true');

    // Reload page
    await page.reload();
    await page.waitForTimeout(500);

    // Sidebar should still be collapsed
    const sidebar = page.locator('nav[aria-label="Hauptnavigation"]').first();
    const width = await sidebar.evaluate((el) => el.offsetWidth);
    expect(width).toBeLessThan(100); // Collapsed width is 80px
  });

  test('should persist expanded state across navigation', async ({ page }) => {
    await page.goto('/dashboard');

    // Ensure sidebar is expanded (default)
    const sidebar = page.locator('nav[aria-label="Hauptnavigation"]').first();
    const initialWidth = await sidebar.evaluate((el) => el.offsetWidth);
    expect(initialWidth).toBeGreaterThan(200); // Expanded width is 280px

    // Navigate to agents
    await page.click('a[href="/agents"]');
    await page.waitForURL('**/agents');

    // Sidebar should still be expanded
    const newWidth = await sidebar.evaluate((el) => el.offsetWidth);
    expect(newWidth).toBeGreaterThan(200);
  });

  test('should toggle collapsed state and persist', async ({ page }) => {
    await page.goto('/dashboard');

    const collapseButton = page.locator('button[aria-label*="Navigation"]').first();
    const sidebar = page.locator('nav[aria-label="Hauptnavigation"]').first();

    // Collapse
    await collapseButton.click();
    await page.waitForTimeout(300);
    let width = await sidebar.evaluate((el) => el.offsetWidth);
    expect(width).toBeLessThan(100);

    // Expand
    await collapseButton.click();
    await page.waitForTimeout(300);
    width = await sidebar.evaluate((el) => el.offsetWidth);
    expect(width).toBeGreaterThan(200);

    // Reload and check it's expanded
    await page.reload();
    await page.waitForTimeout(500);
    width = await sidebar.evaluate((el) => el.offsetWidth);
    expect(width).toBeGreaterThan(200);
  });
});

test.describe('Sidebar Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should navigate with arrow keys', async ({ page }) => {
    // Focus first nav item
    const firstNavItem = page.locator('[data-nav-item]').first();
    await firstNavItem.focus();

    // Press ArrowDown
    await page.keyboard.press('ArrowDown');

    // Second item should be focused
    const secondNavItem = page.locator('[data-nav-item]').nth(1);
    await expect(secondNavItem).toBeFocused();

    // Press ArrowUp
    await page.keyboard.press('ArrowUp');

    // First item should be focused again
    await expect(firstNavItem).toBeFocused();
  });

  test('should wrap focus at end with ArrowDown', async ({ page }) => {
    // Focus last nav item
    const navItems = page.locator('[data-nav-item]');
    const count = await navItems.count();
    const lastItem = navItems.nth(count - 1);
    await lastItem.focus();

    // Press ArrowDown (should wrap to first)
    await page.keyboard.press('ArrowDown');

    const firstItem = navItems.first();
    await expect(firstItem).toBeFocused();
  });

  test('should activate nav item with Enter', async ({ page }) => {
    // Focus agents nav item
    const agentsItem = page.locator('[data-nav-item][href="/agents"]');
    await agentsItem.focus();

    // Press Enter
    await page.keyboard.press('Enter');

    // Should navigate to /agents
    await page.waitForURL('**/agents', { timeout: 3000 });
    expect(page.url()).toContain('/agents');
  });

  test('should show tooltips only when collapsed', async ({ page }) => {
    const collapseButton = page.locator('button[aria-label*="Navigation einklappen"]');

    // In expanded mode, tooltips should not appear immediately
    const firstNavItem = page.locator('[data-nav-item]').first();
    await firstNavItem.hover();
    await page.waitForTimeout(300);

    let tooltip = page.locator('[role="tooltip"]');
    await expect(tooltip).toBeHidden();

    // Collapse sidebar
    await collapseButton.click();
    await page.waitForTimeout(300);

    // Now tooltip should appear on hover
    await firstNavItem.hover();
    await page.waitForTimeout(300);

    tooltip = page.locator('[role="tooltip"]');
    await expect(tooltip).toBeVisible();
  });
});

test.describe('Mobile Overlay', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
  });

  test('should open sidebar overlay with hamburger button', async ({ page }) => {
    // Hamburger should be visible on mobile
    const hamburger = page.locator('button[aria-label="Navigation öffnen"]');
    await expect(hamburger).toBeVisible();

    // Click hamburger
    await hamburger.click();

    // Sidebar overlay should be visible
    const overlay = page.locator('aside[role="dialog"][aria-modal="true"]');
    await expect(overlay).toBeVisible();

    // Backdrop should be visible
    const backdrop = page.locator('.fixed.inset-0.bg-black\\/60');
    await expect(backdrop).toBeVisible();
  });

  test('should close overlay with close button', async ({ page }) => {
    // Open overlay
    const hamburger = page.locator('button[aria-label="Navigation öffnen"]');
    await hamburger.click();

    const overlay = page.locator('aside[role="dialog"]');
    await expect(overlay).toBeVisible();

    // Click close button
    const closeButton = page.locator('button[aria-label="Navigation schließen"]');
    await closeButton.click();

    // Overlay should be hidden
    await expect(overlay).toBeHidden();
  });

  test('should close overlay with Escape key', async ({ page }) => {
    // Open overlay
    await page.click('button[aria-label="Navigation öffnen"]');

    const overlay = page.locator('aside[role="dialog"]');
    await expect(overlay).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Overlay should be hidden
    await expect(overlay).toBeHidden();
  });

  test('should close overlay when clicking backdrop', async ({ page }) => {
    // Open overlay
    await page.click('button[aria-label="Navigation öffnen"]');

    const overlay = page.locator('aside[role="dialog"]');
    await expect(overlay).toBeVisible();

    // Click backdrop
    const backdrop = page.locator('.fixed.inset-0.bg-black\\/60');
    await backdrop.click({ position: { x: 10, y: 10 } });

    // Overlay should be hidden
    await expect(overlay).toBeHidden();
  });

  test('should trap focus in overlay', async ({ page }) => {
    // Open overlay
    await page.click('button[aria-label="Navigation öffnen"]');

    const overlay = page.locator('aside[role="dialog"]');
    await expect(overlay).toBeVisible();

    // Focus first focusable element (close button)
    const closeButton = overlay.locator('button[aria-label="Navigation schließen"]');
    await closeButton.focus();

    // Tab through all elements
    const focusableElements = overlay.locator('a[href], button:not([disabled])');
    const count = await focusableElements.count();

    for (let i = 0; i < count; i++) {
      await page.keyboard.press('Tab');
    }

    // Focus should wrap back to first element
    await expect(closeButton).toBeFocused();
  });

  test('should close overlay and navigate when clicking nav item', async ({ page }) => {
    // Open overlay
    await page.click('button[aria-label="Navigation öffnen"]');

    const overlay = page.locator('aside[role="dialog"]');
    await expect(overlay).toBeVisible();

    // Click agents nav item
    await overlay.locator('a[href="/agents"]').click();

    // Should navigate
    await page.waitForURL('**/agents', { timeout: 3000 });

    // Overlay should be closed
    await expect(overlay).toBeHidden();
  });

  test('should restore focus to hamburger when closing overlay', async ({ page }) => {
    const hamburger = page.locator('button[aria-label="Navigation öffnen"]');

    // Focus and click hamburger
    await hamburger.focus();
    await hamburger.click();

    const overlay = page.locator('aside[role="dialog"]');
    await expect(overlay).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');

    // Wait a bit for focus restoration
    await page.waitForTimeout(100);

    // Hamburger should be focused again
    await expect(hamburger).toBeFocused();
  });
});

test.describe('Command Palette', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should open command palette with Cmd/Ctrl+K', async ({ page }) => {
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

    // Press Cmd/Ctrl+K
    await page.keyboard.press(`${modifier}+KeyK`);

    // Command dialog should be visible
    const commandDialog = page.locator('[role="dialog"]', { hasText: 'Schnellaktionen' });
    await expect(commandDialog).toBeVisible();

    // Input should be focused
    const input = commandDialog.locator('input[type="text"]');
    await expect(input).toBeFocused();
  });

  test('should close command palette with Escape', async ({ page }) => {
    // Open palette
    await page.keyboard.press('Control+KeyK');

    const commandDialog = page.locator('[role="dialog"]');
    await expect(commandDialog).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Dialog should be hidden
    await expect(commandDialog).toBeHidden();
  });

  test('should navigate with "Zu Agents wechseln" command', async ({ page }) => {
    // Open palette
    await page.keyboard.press('Control+KeyK');

    // Click "Zu Agents wechseln"
    const agentsCommand = page.locator('[role="option"]', { hasText: 'Zu Agents wechseln' });
    await agentsCommand.click();

    // Should navigate to /agents
    await page.waitForURL('**/agents', { timeout: 3000 });
    expect(page.url()).toContain('/agents');
  });

  test('should show agent list in command palette', async ({ page }) => {
    // Open palette
    await page.keyboard.press('Control+KeyK');

    // Should show "Agents öffnen" section
    const agentsSection = page.locator('text=Agents öffnen');
    await expect(agentsSection).toBeVisible();

    // Should show at least one agent
    const agentOption = page.locator('[role="option"]', { hasText: 'Agent öffnen:' }).first();
    await expect(agentOption).toBeVisible();
  });

  test('should restore focus when closing command palette', async ({ page }) => {
    // Focus a button
    const hamburger = page.locator('button[aria-label*="Benutzermenü"]');
    await hamburger.focus();

    // Open palette
    await page.keyboard.press('Control+KeyK');

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Close palette
    await page.keyboard.press('Escape');

    // Wait for focus restoration
    await page.waitForTimeout(100);

    // Original button should be focused again
    await expect(hamburger).toBeFocused();
  });
});
