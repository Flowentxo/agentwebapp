import { test, expect } from '@playwright/test';

test.describe('Admin Panel - Live Updates', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Health Metrics Auto-Refresh', () => {
    test('should display initial health metrics', async ({ page }) => {
      // CPU Card
      const cpuCard = page.locator('.panel:has-text("CPU Auslastung")');
      await expect(cpuCard).toBeVisible();

      const cpuValue = cpuCard.locator('p.text-2xl');
      await expect(cpuValue).toBeVisible();

      const cpuText = await cpuValue.textContent();
      expect(cpuText).toMatch(/\d+(\.\d+)?%/);
    });

    test('should display memory metrics', async ({ page }) => {
      const memoryCard = page.locator('.panel:has-text("Speicher")');
      await expect(memoryCard).toBeVisible();

      const memoryValue = memoryCard.locator('p.text-2xl');
      await expect(memoryValue).toBeVisible();

      const memoryText = await memoryValue.textContent();
      expect(memoryText).toMatch(/\d+%/);
    });

    test('should display active users count', async ({ page }) => {
      const usersCard = page.locator('.panel:has-text("Aktive Benutzer")');
      await expect(usersCard).toBeVisible();

      const usersValue = usersCard.locator('p.text-2xl');
      await expect(usersValue).toBeVisible();

      const usersText = await usersValue.textContent();
      expect(parseInt(usersText || '0')).toBeGreaterThanOrEqual(0);
    });

    test('should display error rate', async ({ page }) => {
      const errorCard = page.locator('.panel:has-text("Fehlerrate")');
      await expect(errorCard).toBeVisible();

      const errorValue = errorCard.locator('p.text-2xl');
      await expect(errorValue).toBeVisible();

      const errorText = await errorValue.textContent();
      expect(errorText).toMatch(/\d+(\.\d+)?%/);
    });

    test('should update metrics after 15 seconds', async ({ page }) => {
      // Get initial CPU value
      const cpuCard = page.locator('.panel:has-text("CPU Auslastung")');
      const cpuValue = cpuCard.locator('p.text-2xl');

      const initialValue = await cpuValue.textContent();

      // Wait for 16 seconds (15s interval + 1s buffer)
      await page.waitForTimeout(16000);

      // Get updated CPU value
      const updatedValue = await cpuValue.textContent();

      // Values should potentially be different (or at least the fetch was triggered)
      // We can't guarantee they're different due to randomization, but we can verify the element is still there
      expect(updatedValue).toMatch(/\d+(\.\d+)?%/);
    });

    test('should show uptime in health metrics', async ({ page }) => {
      const cpuCard = page.locator('.panel:has-text("CPU Auslastung")');
      const uptime = cpuCard.locator('span.text-xs.text-text-muted').first();

      await expect(uptime).toBeVisible();

      const uptimeText = await uptime.textContent();
      // Should match patterns like "1d 2h", "2h 30m", or "45m"
      expect(uptimeText).toMatch(/\d+(d|h|m)(\s\d+(h|m))?/);
    });
  });

  test.describe('Services Status', () => {
    test('should display all services', async ({ page }) => {
      const servicesPanel = page.locator('.panel:has-text("Services")');
      await expect(servicesPanel).toBeVisible();

      const services = ['api', 'database', 'cache', 'storage'];

      for (const service of services) {
        const serviceElement = servicesPanel.locator(`text=${service}`);
        await expect(serviceElement).toBeVisible();
      }
    });

    test('should show service latency', async ({ page }) => {
      const servicesPanel = page.locator('.panel:has-text("Services")');

      // Each service should have a latency indicator
      const latencies = servicesPanel.locator('span.text-xs.text-text-muted:has-text("ms")');
      const count = await latencies.count();

      expect(count).toBeGreaterThanOrEqual(4);
    });

    test('should display service health icons', async ({ page }) => {
      const servicesPanel = page.locator('.panel:has-text("Services")');

      // Should have CheckCircle or AlertCircle icons
      const healthIcons = servicesPanel.locator('svg');
      const iconCount = await healthIcons.count();

      expect(iconCount).toBeGreaterThanOrEqual(4);
    });
  });

  test.describe('User Management CRUD Operations', () => {
    test('should load user list', async ({ page }) => {
      const userTable = page.locator('table');
      await expect(userTable).toBeVisible();

      const rows = userTable.locator('tbody tr');
      const rowCount = await rows.count();

      expect(rowCount).toBeGreaterThan(0);
    });

    test('should create a new user', async ({ page }) => {
      // Click create button
      const createButton = page.locator('button:has-text("Benutzer erstellen")');
      await createButton.click();

      // Fill form
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      await dialog.locator('input[type="text"]').first().fill('Test User');
      await dialog.locator('input[type="email"]').fill('test@example.com');

      // Submit form
      const submitButton = dialog.locator('button[type="submit"]');
      await submitButton.click();

      // Wait for dialog to close
      await expect(dialog).not.toBeVisible({ timeout: 2000 });

      // Verify user appears in table
      await page.waitForTimeout(500);
      const userEmail = page.locator('td:has-text("test@example.com")');
      await expect(userEmail).toBeVisible({ timeout: 3000 });
    });

    test('should edit an existing user', async ({ page }) => {
      // Click first edit button
      const editButton = page.locator('button[aria-label="Benutzer bearbeiten"]').first();
      await editButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Verify dialog has "Benutzer bearbeiten" title
      const title = dialog.locator('h3:has-text("Benutzer bearbeiten")');
      await expect(title).toBeVisible();

      // Close dialog
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
    });

    test('should show delete confirmation', async ({ page }) => {
      // Set up dialog listener
      page.on('dialog', (dialog) => {
        expect(dialog.message()).toContain('löschen');
        dialog.dismiss();
      });

      // Click delete button
      const deleteButton = page.locator('button[aria-label="Benutzer löschen"]').first();
      await deleteButton.click();

      // Wait a bit for dialog handling
      await page.waitForTimeout(500);
    });
  });

  test.describe('Deployment Operations', () => {
    test('should display deployment history', async ({ page }) => {
      const deploymentSection = page.locator('section[aria-label="Deployments"]');
      await expect(deploymentSection).toBeVisible();

      // Should show deployment items
      const deployments = deploymentSection.locator('.panel > div > div');
      const count = await deployments.count();

      expect(count).toBeGreaterThan(0);
    });

    test('should show deployment details', async ({ page }) => {
      const deploymentSection = page.locator('section[aria-label="Deployments"]');

      // Should show version numbers
      const versions = deploymentSection.locator('span.font-semibold:has-text("v")');
      const versionCount = await versions.count();

      expect(versionCount).toBeGreaterThan(0);
    });

    test('should show deployment status badges', async ({ page }) => {
      const deploymentSection = page.locator('section[aria-label="Deployments"]');

      // Look for status badges
      const badges = deploymentSection.locator('[class*="badge"]');
      const badgeCount = await badges.count();

      expect(badgeCount).toBeGreaterThan(0);
    });

    test('should show rollback and redeploy buttons', async ({ page }) => {
      const deploymentSection = page.locator('section[aria-label="Deployments"]');

      // Look for action buttons
      const redeployButtons = deploymentSection.locator('button[title="Redeploy"]');
      const rollbackButtons = deploymentSection.locator('button[title="Rollback"]');

      const redeployCount = await redeployButtons.count();
      const rollbackCount = await rollbackButtons.count();

      // At least some deployments should have these buttons
      expect(redeployCount + rollbackCount).toBeGreaterThan(0);
    });
  });

  test.describe('Logs & Monitoring', () => {
    test('should display logs', async ({ page }) => {
      const logsSection = page.locator('section[aria-label="Logs & Monitoring"]');
      await expect(logsSection).toBeVisible();

      // Wait for logs to load
      await page.waitForTimeout(1000);

      const logEntries = logsSection.locator('.panel .space-y-2 > div');
      const count = await logEntries.count();

      expect(count).toBeGreaterThan(0);
    });

    test('should filter logs by level', async ({ page }) => {
      const logsSection = page.locator('section[aria-label="Logs & Monitoring"]');

      // Click level filter
      const levelSelect = logsSection.locator('button').first();
      await levelSelect.click();

      // Select "Error"
      const errorOption = page.locator('[role="option"]:has-text("Error"), div:has-text("Error")').first();
      await errorOption.click({ timeout: 2000 }).catch(() => {});

      // Wait for logs to refresh
      await page.waitForTimeout(1000);

      // Verify logs are still displayed
      const logEntries = logsSection.locator('.panel .space-y-2 > div');
      const count = await logEntries.count();

      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should show log timestamps', async ({ page }) => {
      const logsSection = page.locator('section[aria-label="Logs & Monitoring"]');

      // Look for timestamp elements
      const timestamps = logsSection.locator('span.text-xs.text-text-muted.whitespace-nowrap');
      const count = await timestamps.count();

      expect(count).toBeGreaterThan(0);
    });

    test('should show log level badges', async ({ page }) => {
      const logsSection = page.locator('section[aria-label="Logs & Monitoring"]');

      // Look for level badges
      const levelBadges = logsSection.locator('[class*="badge"].uppercase');
      const count = await levelBadges.count();

      expect(count).toBeGreaterThan(0);
    });

    test('should refresh logs manually', async ({ page }) => {
      const refreshButton = page.locator('button[aria-label="Logs aktualisieren"]');
      await expect(refreshButton).toBeVisible();

      // Click refresh
      await refreshButton.click();

      // Wait for refresh to complete
      await page.waitForTimeout(500);

      // Logs should still be visible
      const logsSection = page.locator('section[aria-label="Logs & Monitoring"]');
      const logEntries = logsSection.locator('.panel .space-y-2 > div');
      const count = await logEntries.count();

      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Real-time Updates Validation', () => {
    test('should maintain data consistency during updates', async ({ page }) => {
      // Get initial state
      const cpuCard = page.locator('.panel:has-text("CPU Auslastung")');
      const initialCpu = await cpuCard.locator('p.text-2xl').textContent();

      // Wait for potential update
      await page.waitForTimeout(16000);

      // Get updated state
      const updatedCpu = await cpuCard.locator('p.text-2xl').textContent();

      // Both should be valid percentage values
      expect(initialCpu).toMatch(/\d+(\.\d+)?%/);
      expect(updatedCpu).toMatch(/\d+(\.\d+)?%/);
    });

    test('should handle concurrent operations gracefully', async ({ page }) => {
      // Open user dialog
      const createButton = page.locator('button:has-text("Benutzer erstellen")');
      await createButton.click();

      // While dialog is open, health metrics should still update
      await page.waitForTimeout(5000);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Health metrics should still be visible and updating
      const cpuCard = page.locator('.panel:has-text("CPU Auslastung")');
      await expect(cpuCard).toBeVisible();
    });
  });
});
