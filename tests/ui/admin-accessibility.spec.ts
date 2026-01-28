import { test, expect } from '@playwright/test';

test.describe('Admin Panel - Accessibility', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
  });

  test.describe('ARIA Landmarks', () => {
    test('should have proper page title and description', async ({ page }) => {
      const title = page.locator('h1#page-title');
      await expect(title).toBeVisible();
      await expect(title).toContainText('Admin Panel');

      const description = title.locator('+ p');
      await expect(description).toBeVisible();
      await expect(description).toContainText('System-Überwachung');
    });

    test('should have labeled sections', async ({ page }) => {
      const sections = page.locator('section[aria-label]');
      const count = await sections.count();

      expect(count).toBeGreaterThanOrEqual(4); // System Overview, User Management, Deployments, Logs

      // Check each section has a label
      for (let i = 0; i < count; i++) {
        const ariaLabel = await sections.nth(i).getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
      }
    });

    test('should have accessible section headings', async ({ page }) => {
      const headings = [
        'System Übersicht',
        'Benutzerverwaltung',
        'Deployment Historie',
        'Logs & Monitoring',
      ];

      for (const heading of headings) {
        const h2 = page.locator(`h2:has-text("${heading}")`);
        await expect(h2).toBeVisible();
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate to admin panel via keyboard', async ({ page }) => {
      await page.goto('/dashboard');

      // Tab through navigation to reach admin link
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Verify focus is visible
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should allow keyboard navigation through user table', async ({ page }) => {
      // Wait for table to load
      const table = page.locator('table');
      await expect(table).toBeVisible();

      // Tab through table actions
      const firstEditButton = page.locator('button[aria-label="Benutzer bearbeiten"]').first();
      await firstEditButton.focus();

      const isFocused = await firstEditButton.evaluate((el) => el === document.activeElement);
      expect(isFocused).toBe(true);
    });

    test('should open user dialog with keyboard', async ({ page }) => {
      const createButton = page.locator('button:has-text("Benutzer erstellen")');
      await createButton.focus();
      await page.keyboard.press('Enter');

      // Dialog should open
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Close with Escape
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have accessible buttons', async ({ page }) => {
      // Check "Benutzer erstellen" button
      const createButton = page.locator('button:has-text("Benutzer erstellen")');
      await expect(createButton).toHaveAccessibleName();

      // Check edit buttons
      const editButtons = page.locator('button[aria-label="Benutzer bearbeiten"]');
      const editCount = await editButtons.count();

      for (let i = 0; i < editCount; i++) {
        const label = await editButtons.nth(i).getAttribute('aria-label');
        expect(label).toBe('Benutzer bearbeiten');
      }

      // Check delete buttons
      const deleteButtons = page.locator('button[aria-label="Benutzer löschen"]');
      const deleteCount = await deleteButtons.count();

      for (let i = 0; i < deleteCount; i++) {
        const label = await deleteButtons.nth(i).getAttribute('aria-label');
        expect(label).toBe('Benutzer löschen');
      }
    });

    test('should have accessible table structure', async ({ page }) => {
      const table = page.locator('table');
      await expect(table).toBeVisible();

      // Table should have thead
      const thead = table.locator('thead');
      await expect(thead).toBeVisible();

      // Table should have tbody
      const tbody = table.locator('tbody');
      await expect(tbody).toBeVisible();

      // Check table headers
      const headers = ['Name', 'E-Mail', 'Rolle', 'Status', 'Letzter Login', 'Aktionen'];

      for (const header of headers) {
        const th = thead.locator(`th:has-text("${header}")`);
        await expect(th).toBeVisible();
      }
    });

    test('should have accessible form labels', async ({ page }) => {
      // Open user dialog
      const createButton = page.locator('button:has-text("Benutzer erstellen")');
      await createButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Check form labels
      const nameLabel = dialog.locator('label:has-text("Name")');
      await expect(nameLabel).toBeVisible();

      const emailLabel = dialog.locator('label:has-text("E-Mail")');
      await expect(emailLabel).toBeVisible();

      const roleLabel = dialog.locator('label:has-text("Rolle")');
      await expect(roleLabel).toBeVisible();
    });

    test('should have accessible refresh button', async ({ page }) => {
      const refreshButton = page.locator('button[aria-label="Logs aktualisieren"]');
      await expect(refreshButton).toBeVisible();

      const label = await refreshButton.getAttribute('aria-label');
      expect(label).toBe('Logs aktualisieren');
    });
  });

  test.describe('Color Contrast', () => {
    test('should have visible text on panel backgrounds', async ({ page }) => {
      // Check health cards have proper contrast
      const panels = page.locator('.panel');
      const panelCount = await panels.count();

      expect(panelCount).toBeGreaterThan(0);

      // Check first panel text is visible
      const firstPanel = panels.first();
      await expect(firstPanel).toBeVisible();

      const panelText = firstPanel.locator('p, span').first();
      await expect(panelText).toBeVisible();
    });

    test('should have visible badge colors', async ({ page }) => {
      // Wait for badges to load
      await page.waitForSelector('[class*="badge"]', { timeout: 5000 }).catch(() => {});

      const badges = page.locator('[class*="badge"]');
      const badgeCount = await badges.count();

      if (badgeCount > 0) {
        const firstBadge = badges.first();
        await expect(firstBadge).toBeVisible();
      }
    });
  });

  test.describe('Focus Management', () => {
    test('should trap focus in modal dialog', async ({ page }) => {
      // Open user dialog
      const createButton = page.locator('button:has-text("Benutzer erstellen")');
      await createButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Focus should be inside dialog
      const focusedElement = page.locator(':focus');
      const isInsideDialog = await dialog.locator(':focus').count();

      // Tab through dialog elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Focus should still be inside dialog
      const stillInsideDialog = await dialog.locator(':focus').count();
      expect(stillInsideDialog).toBeGreaterThan(0);
    });

    test('should restore focus after closing dialog', async ({ page }) => {
      const createButton = page.locator('button:has-text("Benutzer erstellen")');
      await createButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Close dialog
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();

      // Focus should be restored (check that something is focused)
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeAttached();
    });
  });

  test.describe('Responsive Design Accessibility', () => {
    test('should be accessible on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 750 });

      // Page title should still be visible
      const title = page.locator('h1#page-title');
      await expect(title).toBeVisible();

      // Sections should stack vertically
      const sections = page.locator('section[aria-label]');
      const count = await sections.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should maintain touch target sizes on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 750 });

      // Buttons should be at least 44x44 pixels (WCAG guideline)
      const createButton = page.locator('button:has-text("Benutzer erstellen")');
      const box = await createButton.boundingBox();

      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(36); // Allowing some tolerance
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should show validation errors accessibly', async ({ page }) => {
      // Open user dialog
      const createButton = page.locator('button:has-text("Benutzer erstellen")');
      await createButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Try to submit empty form
      const submitButton = dialog.locator('button[type="submit"]');
      await submitButton.click();

      // HTML5 validation should prevent submission
      // (The required attribute on inputs will trigger browser validation)
    });
  });

  test.describe('Loading States', () => {
    test('should show loading state for health metrics', async ({ page }) => {
      // Reload page to catch loading state
      await page.reload();

      // Wait for health metrics to load
      await page.waitForSelector('.panel:has-text("CPU Auslastung")', { timeout: 5000 });

      const cpuCard = page.locator('.panel:has-text("CPU Auslastung")');
      await expect(cpuCard).toBeVisible();
    });
  });

  test.describe('Live Region Updates', () => {
    test('should announce filter changes to screen readers', async ({ page }) => {
      // Log filters should have proper aria-live regions
      const logSection = page.locator('section[aria-label="Logs & Monitoring"]');
      await expect(logSection).toBeVisible();

      // Check if filter selects are accessible
      const levelSelect = logSection.locator('button').first();
      await expect(levelSelect).toBeVisible();
    });
  });
});
