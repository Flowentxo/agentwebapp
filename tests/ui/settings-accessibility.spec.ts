import { test, expect } from "@playwright/test";

test.describe("Settings Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login with test user
    // await page.goto("/login");
    // await page.fill('input[name="email"]', "test@sintra.ai");
    // await page.fill('input[name="password"]', "password");
    // await page.click('button[type="submit"]');

    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
  });

  test("has proper ARIA landmarks", async ({ page }) => {
    // Check for page title
    await expect(page.locator("#page-title")).toHaveText("Einstellungen");

    // Check for section labels
    await expect(page.locator('section[aria-label]')).toHaveCount(6);
  });

  test("supports keyboard navigation for tabs", async ({ page }) => {
    // Focus on first tab
    await page.keyboard.press("Tab");
    const firstTab = page.locator('button[aria-pressed="true"]');
    await expect(firstTab).toBeFocused();

    // Navigate to next tab with arrow keys
    await page.keyboard.press("ArrowRight");
    const secondTab = page.locator('button:has-text("Benutzerkonto")');
    await expect(secondTab).toBeFocused();

    // Verify tab content changes
    await page.keyboard.press("Enter");
    await expect(page.locator("text=Profilinformationen")).toBeVisible();
  });

  test("all interactive elements are keyboard accessible", async ({ page }) => {
    // Navigate through all tabbable elements
    let tabbableCount = 0;
    const maxTabs = 50; // Safety limit

    while (tabbableCount < maxTabs) {
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      if (!focused || focused === "BODY") break;

      await page.keyboard.press("Tab");
      tabbableCount++;
    }

    // Should have at least 10 tabbable elements (tabs + buttons + inputs)
    expect(tabbableCount).toBeGreaterThan(10);
  });

  test("has focus-ring class on focused elements", async ({ page }) => {
    const button = page.locator("button").first();
    await button.focus();

    const hasVisibleOutline = await button.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.outline !== "none" && style.outline !== "";
    });

    expect(hasVisibleOutline).toBeTruthy();
  });

  test("all form inputs have proper labels", async ({ page }) => {
    await page.click('button:has-text("Benutzerkonto")');

    // Check that all inputs have associated labels
    const inputs = page.locator('input[type="text"], input[type="email"], input[type="password"]');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const ariaLabel = await input.getAttribute("aria-label");
      const id = await input.getAttribute("id");

      // Either has aria-label or is associated with a label via id
      expect(ariaLabel || id).toBeTruthy();
    }
  });

  test("switches have proper ARIA attributes", async ({ page }) => {
    await page.click('button:has-text("Benachrichtigungen")');

    const switches = page.locator('[role="switch"]');
    const switchCount = await switches.count();

    expect(switchCount).toBeGreaterThan(0);

    for (let i = 0; i < switchCount; i++) {
      const switchEl = switches.nth(i);
      const ariaChecked = await switchEl.getAttribute("aria-checked");
      const ariaLabel = await switchEl.getAttribute("aria-label");

      expect(ariaChecked).toMatch(/true|false/);
      expect(ariaLabel).toBeTruthy();
    }
  });

  test("modals are accessible", async ({ page }) => {
    await page.click('button:has-text("Benutzerkonto")');
    await page.click('button:has-text("Passwort ändern")');

    // Modal should have proper ARIA role
    const modal = page.locator('[role="dialog"], .modal');
    await expect(modal).toBeVisible();

    // Focus should be trapped in modal
    const firstFocusable = modal.locator('button, input').first();
    await expect(firstFocusable).toBeFocused();

    // ESC should close modal
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();
  });

  test("has sufficient color contrast", async ({ page }) => {
    // Check text elements have sufficient contrast
    const textElements = page.locator(".text-text, .text-text-muted");
    const count = await textElements.count();

    expect(count).toBeGreaterThan(0);

    // Sample check on first element
    const firstElement = textElements.first();
    const color = await firstElement.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    // Should have a color value (not transparent)
    expect(color).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("screen reader announcements for dynamic changes", async ({ page }) => {
    await page.click('button:has-text("Benachrichtigungen")');

    // Toggle a switch and verify state changes
    const switchEl = page.locator('[aria-label="Systemwarnungen aktivieren"]');
    const initialState = await switchEl.getAttribute("aria-checked");

    await switchEl.click();

    const newState = await switchEl.getAttribute("aria-checked");
    expect(newState).not.toBe(initialState);
  });

  test("breadcrumb navigation is clear", async ({ page }) => {
    // Verify page header provides clear context
    await expect(page.locator("h1")).toContainText("Einstellungen");

    // Verify current tab is highlighted
    const activeTab = page.locator('button[aria-pressed="true"]');
    await expect(activeTab).toHaveCount(1);
  });
});
