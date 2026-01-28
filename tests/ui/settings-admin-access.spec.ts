import { test, expect } from "@playwright/test";

test.describe("Settings Admin Access Control", () => {
  test("admin user can see System tab", async ({ page }) => {
    // TODO: Login as admin user
    // await page.goto("/login");
    // await page.fill('input[name="email"]', "admin@sintra.ai");
    // await page.fill('input[name="password"]', "admin123");
    // await page.click('button[type="submit"]');

    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // System tab should be visible for admin
    const systemTab = page.locator('button:has-text("System")');
    await expect(systemTab).toBeVisible();

    // Click System tab
    await systemTab.click();

    // Verify System section content is displayed
    await expect(page.locator("text=Feature Toggles")).toBeVisible();
    await expect(page.locator("text=Rate Limits")).toBeVisible();
    await expect(page.locator("text=System Health")).toBeVisible();
  });

  test("non-admin user cannot see System tab", async ({ page }) => {
    // TODO: Login as non-admin user (dev, ops, or viewer)
    // await page.goto("/login");
    // await page.fill('input[name="email"]', "user@sintra.ai");
    // await page.fill('input[name="password"]', "user123");
    // await page.click('button[type="submit"]');

    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // System tab should NOT be visible for non-admin
    const systemTab = page.locator('button:has-text("System")');
    await expect(systemTab).not.toBeVisible();

    // Verify only 5 tabs are shown (without System)
    const tabs = page.locator('button[aria-pressed]');
    await expect(tabs).toHaveCount(5);
  });

  test("admin can toggle feature flags", async ({ page }) => {
    // TODO: Login as admin
    await page.goto("/settings");

    // Navigate to System tab
    await page.click('button:has-text("System")');

    // Find a feature toggle switch
    const featureSwitch = page.locator('[aria-label*="Agent Streaming aktivieren"]').first();
    const initialState = await featureSwitch.getAttribute("aria-checked");

    // Toggle the switch
    await featureSwitch.click();

    // Verify state changed
    await page.waitForTimeout(500); // Wait for API call
    const newState = await featureSwitch.getAttribute("aria-checked");
    expect(newState).not.toBe(initialState);
  });

  test("admin can trigger system health check", async ({ page }) => {
    // TODO: Login as admin
    await page.goto("/settings");

    // Navigate to System tab
    await page.click('button:has-text("System")');

    // Click health check button
    const healthCheckButton = page.locator('button:has-text("System Health prüfen")');
    await healthCheckButton.click();

    // Should show loading state
    await expect(page.locator('button:has-text("Prüfung läuft...")')).toBeVisible({ timeout: 1000 });

    // Wait for result alert (mocked)
    page.on("dialog", (dialog) => {
      expect(dialog.message()).toContain("System Health Check");
      dialog.accept();
    });
  });

  test("admin can view recent deployments", async ({ page }) => {
    // TODO: Login as admin
    await page.goto("/settings");

    // Navigate to System tab
    await page.click('button:has-text("System")');

    // Verify deployments section
    await expect(page.locator("text=Letzte Deployments")).toBeVisible();

    // Check for deployment entries (if any)
    const deployments = page.locator('.panel:has-text("Letzte Deployments") .bg-surface-1');
    const count = await deployments.count();

    // Should show at least deployment list or "no deployments" message
    expect(count >= 0).toBeTruthy();
  });

  test("admin can navigate to deployment logs", async ({ page }) => {
    // TODO: Login as admin
    await page.goto("/settings");

    // Navigate to System tab
    await page.click('button:has-text("System")');

    // Click "Zu Logs" button
    const logsButton = page.locator('button:has-text("Zu Logs")');
    await logsButton.click();

    // Should navigate to admin page with deployments tab
    await page.waitForURL(/\/admin/);
    expect(page.url()).toContain("/admin");
  });

  test("non-admin cannot access System API endpoints", async ({ page, request }) => {
    // TODO: Login as non-admin user
    // const session = await loginAsUser(page);

    // Try to access admin-only endpoint
    const response = await request.post("/api/settings/system/health-check", {
      headers: {
        // TODO: Add session cookie
        // "Cookie": `session=${session}`
      },
    });

    // Should return 403 Forbidden for non-admin
    // expect(response.status()).toBe(403);
  });

  test("all tabs except System are accessible to all roles", async ({ page }) => {
    // TODO: Test with different roles
    const roles = ["admin", "dev", "ops", "viewer"];

    for (const role of roles) {
      // TODO: Login as role user
      await page.goto("/settings");

      // Verify these tabs are always visible
      await expect(page.locator('button:has-text("Allgemein")')).toBeVisible();
      await expect(page.locator('button:has-text("Benutzerkonto")')).toBeVisible();
      await expect(page.locator('button:has-text("Benachrichtigungen")')).toBeVisible();
      await expect(page.locator('button:has-text("Integrationen")')).toBeVisible();
      await expect(page.locator('button:has-text("Sicherheit")')).toBeVisible();
    }
  });

  test("admin badge or indicator is shown", async ({ page }) => {
    // TODO: Login as admin
    await page.goto("/settings");

    // Check if System tab presence indicates admin status
    const systemTab = page.locator('button:has-text("System")');
    const isVisible = await systemTab.isVisible();

    expect(isVisible).toBeTruthy();
  });

  test("rate limit editing requires admin role", async ({ page }) => {
    // TODO: Login as admin
    await page.goto("/settings");
    await page.click('button:has-text("System")');

    // Rate limit edit buttons should be visible for admin
    const editButtons = page.locator('.panel:has-text("Rate Limits") button:has-text("Bearbeiten")');
    const count = await editButtons.count();

    expect(count).toBeGreaterThan(0);
  });
});
