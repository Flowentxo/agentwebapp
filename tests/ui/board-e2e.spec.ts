import { test, expect } from "@playwright/test";

test.describe("Board Enterprise - E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/board");
    await page.waitForLoadState("networkidle");
  });

  test("displays board header with quick stats", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Operations Board");
    await expect(page.locator("text=Aktive Agents")).toBeVisible();
    await expect(page.locator("text=Inaktive Agents")).toBeVisible();
    await expect(page.locator("text=Incidents (24h)")).toBeVisible();
    await expect(page.locator("text=Erfolgsquote")).toBeVisible();
  });

  test("switches between status and tags view", async ({ page }) => {
    // Initial view should be status
    await expect(page.locator('button[aria-checked="true"]:has-text("Nach Status")')).toBeVisible();

    // Switch to tags view
    await page.click('button:has-text("Nach Tags")');
    await expect(page.locator('button[aria-checked="true"]:has-text("Nach Tags")')).toBeVisible();

    // Verify tags view is displayed
    await expect(page.locator("text=#")).toBeVisible();
  });

  test("opens inspector drawer on card click", async ({ page }) => {
    // Wait for cards to load
    await page.waitForSelector(".panel p-4", { timeout: 5000 });

    // Click first card
    const firstCard = page.locator(".panel.p-4").first();
    await firstCard.click();

    // Verify drawer opens
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator("text=Übersicht")).toBeVisible();
    await expect(page.locator("text=Aktivität")).toBeVisible();
    await expect(page.locator("text=Metriken")).toBeVisible();
  });

  test("closes drawer with X button or backdrop", async ({ page }) => {
    // Open drawer
    const firstCard = page.locator(".panel.p-4").first();
    await firstCard.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Close with X button
    await page.click('button[aria-label="Drawer schließen"]');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Re-open drawer
    await firstCard.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Close with backdrop
    await page.click(".fixed.inset-0.bg-black\\/50");
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test("team activity section displays activities", async ({ page }) => {
    await expect(page.locator("text=Team-Aktivität")).toBeVisible();
    await expect(page.locator("text=Letzte Änderungen und Statusübergänge")).toBeVisible();

    // Check for time range filter
    await expect(page.locator("text=Letzte 24h")).toBeVisible();
  });

  test("keyboard navigation works", async ({ page }) => {
    // Tab to first card
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Open with Enter
    await page.keyboard.press("Enter");
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Close with Escape
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test("refresh button works", async ({ page }) => {
    const refreshButton = page.locator('button[aria-label="Board aktualisieren"]');
    await refreshButton.click();

    // Check for loading state (spinning icon)
    await expect(refreshButton.locator(".animate-spin")).toBeVisible({ timeout: 1000 });
  });

  test("view mode persists in localStorage", async ({ page }) => {
    // Switch to tags view
    await page.click('button:has-text("Nach Tags")');

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Verify tags view is still active
    await expect(page.locator('button[aria-checked="true"]:has-text("Nach Tags")')).toBeVisible();
  });
});
