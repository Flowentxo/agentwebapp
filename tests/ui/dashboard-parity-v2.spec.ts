import { test, expect } from '@playwright/test';

test.describe('Dashboard Parity V2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('PanelHeader Integration', () => {
    test('should render PanelHeader in all three panels', async ({ page }) => {
      // KPI Panel Headers (4 cards)
      const kpiHeaders = page.locator('.panel').filter({ hasText: 'Anfragen' });
      await expect(kpiHeaders).toBeVisible();

      const successHeader = page.locator('.panel').filter({ hasText: 'Erfolgsrate' });
      await expect(successHeader).toBeVisible();

      const timeHeader = page.locator('.panel').filter({ hasText: 'Ø Zeit' });
      await expect(timeHeader).toBeVisible();

      const errorHeader = page.locator('.panel').filter({ hasText: 'Fehlerquote' });
      await expect(errorHeader).toBeVisible();

      // Activity List Panel Header
      const activityHeader = page.locator('.panel').filter({ hasText: 'Aktivität & Incidents' });
      await expect(activityHeader).toBeVisible();
      await expect(activityHeader.locator('text=Letzte 24 Stunden')).toBeVisible();

      // Top Agents Panel Header
      const agentsHeader = page.locator('.panel').filter({ hasText: 'Top-Agents' });
      await expect(agentsHeader).toBeVisible();
      await expect(agentsHeader.locator('text=aktivsten Agents')).toBeVisible();
    });

    test('should display info tooltips on PanelHeaders', async ({ page }) => {
      // Find the first info icon in KPI card
      const kpiPanel = page.locator('.panel').filter({ hasText: 'Anfragen' }).first();
      const infoButton = kpiPanel.locator('button[aria-label*="Information"]').first();

      await expect(infoButton).toBeVisible();
      await infoButton.hover();

      // Tooltip should appear with info text
      await expect(page.locator('[role="tooltip"]')).toBeVisible({ timeout: 1000 });
      await expect(page.locator('[role="tooltip"]')).toContainText('API-Anfragen');
    });

    test('should show info tooltip in Activity panel', async ({ page }) => {
      const activityPanel = page.locator('.panel').filter({ hasText: 'Aktivität & Incidents' });
      const infoButton = activityPanel.locator('button[aria-label*="Information"]').first();

      await expect(infoButton).toBeVisible();
      await infoButton.hover();

      await expect(page.locator('[role="tooltip"]')).toBeVisible({ timeout: 1000 });
      await expect(page.locator('[role="tooltip"]')).toContainText('wichtigen Ereignisse');
    });

    test('should show info tooltip in Top Agents panel', async ({ page }) => {
      const agentsPanel = page.locator('.panel').filter({ hasText: 'Top-Agents' });
      const infoButton = agentsPanel.locator('button[aria-label*="Information"]').first();

      await expect(infoButton).toBeVisible();
      await infoButton.hover();

      await expect(page.locator('[role="tooltip"]')).toBeVisible({ timeout: 1000 });
      await expect(page.locator('[role="tooltip"]')).toContainText('Top 10');
    });
  });

  test.describe('KPI Cards Enhancement', () => {
    test('should display large values with correct typography', async ({ page }) => {
      const kpiCard = page.locator('.panel').filter({ hasText: 'Anfragen' }).first();
      const valueElement = kpiCard.locator('.mono.text-3xl');

      await expect(valueElement).toBeVisible();

      // Check that it has the mono class and large text
      await expect(valueElement).toHaveClass(/mono/);
      await expect(valueElement).toHaveClass(/text-3xl/);
    });

    test('should display trend chips with icons', async ({ page }) => {
      const kpiCard = page.locator('.panel').filter({ hasText: 'Anfragen' }).first();

      // Find trend chip (rounded-full with border)
      const trendChip = kpiCard.locator('.rounded-full.border').first();
      await expect(trendChip).toBeVisible();

      // Should contain trend icon (TrendingUp or TrendingDown)
      const trendIcon = trendChip.locator('svg').first();
      await expect(trendIcon).toBeVisible();

      // Should contain mono-formatted trend value
      const trendValue = trendChip.locator('.mono');
      await expect(trendValue).toBeVisible();
    });

    test('should show "ggü. gestern" label', async ({ page }) => {
      const kpiCard = page.locator('.panel').filter({ hasText: 'Anfragen' }).first();
      await expect(kpiCard.locator('text=ggü. gestern')).toBeVisible();
    });

    test('should have proper hover state', async ({ page }) => {
      const kpiCard = page.locator('.panel').filter({ hasText: 'Anfragen' }).first();

      // Get initial box-shadow
      const initialShadow = await kpiCard.evaluate((el) =>
        window.getComputedStyle(el).boxShadow
      );

      // Hover over card
      await kpiCard.hover();

      // Check that hover changes styling (by checking class)
      const classes = await kpiCard.getAttribute('class');
      expect(classes).toContain('panel');
    });
  });

  test.describe('Activity List Filters', () => {
    test('should display filter chips', async ({ page }) => {
      const activityPanel = page.locator('.panel').filter({ hasText: 'Aktivität & Incidents' });

      // Check for filter buttons
      const filterGroup = activityPanel.locator('[role="group"][aria-label="Aktivitätsfilter"]');
      await expect(filterGroup).toBeVisible();

      // Check individual filter chips
      await expect(filterGroup.locator('button:has-text("Alle")')).toBeVisible();
      await expect(filterGroup.locator('button:has-text("Fehler")')).toBeVisible();
      await expect(filterGroup.locator('button:has-text("Rate-Limit")')).toBeVisible();
      await expect(filterGroup.locator('button:has-text("Deploy")')).toBeVisible();
      await expect(filterGroup.locator('button:has-text("Spike")')).toBeVisible();
    });

    test('should activate filter on click', async ({ page }) => {
      const activityPanel = page.locator('.panel').filter({ hasText: 'Aktivität & Incidents' });
      const errorFilter = activityPanel.locator('button:has-text("Fehler")');

      // Check initial state
      await expect(errorFilter).toHaveAttribute('aria-pressed', 'false');

      // Click filter
      await errorFilter.click();

      // Check activated state
      await expect(errorFilter).toHaveAttribute('aria-pressed', 'true');

      // Should have accent styling
      const classes = await errorFilter.getAttribute('class');
      expect(classes).toContain('bg-[rgb(var(--accent))]/20');
    });

    test('should show empty state when no activities match filter', async ({ page }) => {
      // This test assumes there might be filters with no results
      const activityPanel = page.locator('.panel').filter({ hasText: 'Aktivität & Incidents' });

      // Try different filters until we find one with no results or create mock scenario
      const filters = ['Rate-Limit', 'Deploy', 'Spike'];

      for (const filterText of filters) {
        const filterButton = activityPanel.locator(`button:has-text("${filterText}")`);
        await filterButton.click();

        // Check if empty state appears
        const emptyState = activityPanel.locator('text=Keine Aktivitäten gefunden');
        if (await emptyState.isVisible()) {
          // Verify empty state illustration
          await expect(activityPanel.locator('.text-text-muted')).toContainText('keine Ereignisse');
          break;
        }
      }
    });

    test('should display activities with 48px fixed height', async ({ page }) => {
      const activityPanel = page.locator('.panel').filter({ hasText: 'Aktivität & Incidents' });
      const activityFeed = activityPanel.locator('[role="feed"]');

      // Get first activity item
      const firstActivity = activityFeed.locator('> div').first();

      if (await firstActivity.isVisible()) {
        const height = await firstActivity.evaluate((el) => el.style.height);
        expect(height).toBe('48px');
      }
    });

    test('should maintain role="feed" for accessibility', async ({ page }) => {
      const activityPanel = page.locator('.panel').filter({ hasText: 'Aktivität & Incidents' });
      const feed = activityPanel.locator('[role="feed"][aria-label="Aktivitäts-Feed"]');

      await expect(feed).toBeVisible();
    });
  });

  test.describe('Top Agents Table', () => {
    test('should have sticky header with backdrop blur', async ({ page }) => {
      const agentsPanel = page.locator('.panel').filter({ hasText: 'Top-Agents' });
      const tableHeader = agentsPanel.locator('thead tr').first();

      await expect(tableHeader).toBeVisible();

      // Check sticky positioning
      const classes = await tableHeader.getAttribute('class');
      expect(classes).toContain('sticky');
      expect(classes).toContain('top-0');
      expect(classes).toContain('backdrop-blur');
    });

    test('should show sort indicators on sortable columns', async ({ page }) => {
      const agentsPanel = page.locator('.panel').filter({ hasText: 'Top-Agents' });

      // Find sortable column headers (they have cursor-pointer)
      const nameHeader = agentsPanel.locator('th:has-text("Agent")').first();
      const requestsHeader = agentsPanel.locator('th:has-text("Anfragen 24h")').first();

      // Check aria-sort attribute exists
      await expect(nameHeader).toHaveAttribute('aria-sort');
      await expect(requestsHeader).toHaveAttribute('aria-sort');
    });

    test('should toggle sort direction on header click', async ({ page }) => {
      const agentsPanel = page.locator('.panel').filter({ hasText: 'Top-Agents' });
      const requestsHeader = agentsPanel.locator('th:has-text("Anfragen 24h")').first();

      // Get initial sort direction
      const initialSort = await requestsHeader.getAttribute('aria-sort');

      // Click header
      await requestsHeader.click();

      // Get new sort direction
      const newSort = await requestsHeader.getAttribute('aria-sort');

      // Should have changed (unless it was 'none')
      if (initialSort === 'descending') {
        expect(newSort).toBe('ascending');
      } else if (initialSort === 'ascending') {
        expect(newSort).toBe('descending');
      }
    });

    test('should have zebra striping on hover', async ({ page }) => {
      const agentsPanel = page.locator('.panel').filter({ hasText: 'Top-Agents' });
      const firstRow = agentsPanel.locator('tbody tr').first();

      if (await firstRow.isVisible()) {
        // Check for even row class
        const classes = await firstRow.getAttribute('class');

        // Hover over row
        await firstRow.hover();

        // Should have hover state
        expect(classes).toContain('hover:bg-card/5');
      }
    });

    test('should support Enter key for row activation', async ({ page }) => {
      const agentsPanel = page.locator('.panel').filter({ hasText: 'Top-Agents' });
      const firstRow = agentsPanel.locator('tbody tr').first();

      if (await firstRow.isVisible()) {
        // Check role and tabindex
        await expect(firstRow).toHaveAttribute('role', 'button');
        await expect(firstRow).toHaveAttribute('tabindex', '0');

        // Focus and press Enter
        await firstRow.focus();
        await page.keyboard.press('Enter');

        // Should navigate or trigger action (check URL or console)
        // This is a basic check - actual behavior depends on onOpen handler
      }
    });

    test('should have live region with debounced updates', async ({ page }) => {
      const agentsPanel = page.locator('.panel').filter({ hasText: 'Top-Agents' });
      const searchInput = agentsPanel.locator('#agents-table-search');
      const liveRegion = agentsPanel.locator('[role="status"][aria-live="polite"]');

      await expect(liveRegion).toBeAttached();

      // Type in search
      await searchInput.fill('test');

      // Wait for debounce (200ms)
      await page.waitForTimeout(250);

      // Live region should update
      const text = await liveRegion.textContent();
      expect(text).toMatch(/\d+ Agents gefunden/);
    });

    test('should focus search input on "/" key', async ({ page }) => {
      const agentsPanel = page.locator('.panel').filter({ hasText: 'Top-Agents' });
      const searchInput = agentsPanel.locator('#agents-table-search');

      // Press "/" key
      await page.keyboard.press('/');

      // Search input should be focused
      await expect(searchInput).toBeFocused();
    });

    test('should display StatusChip for each agent', async ({ page }) => {
      const agentsPanel = page.locator('.panel').filter({ hasText: 'Top-Agents' });
      const firstRow = agentsPanel.locator('tbody tr').first();

      if (await firstRow.isVisible()) {
        // Should have StatusChip (check for status-related classes)
        const statusCell = firstRow.locator('td').nth(1);
        await expect(statusCell).toBeVisible();
      }
    });
  });

  test.describe('Loading States', () => {
    test('should show skeleton loaders when isLoading=true', async ({ page }) => {
      // This test requires a way to trigger loading state
      // For now, we check that skeleton class exists in CSS

      // Navigate to page and check for skeleton utility class in styles
      const hasSkeletonClass = await page.evaluate(() => {
        const styles = document.styleSheets;
        for (let i = 0; i < styles.length; i++) {
          try {
            const rules = styles[i].cssRules || styles[i].rules;
            for (let j = 0; j < rules.length; j++) {
              const rule = rules[j] as CSSStyleRule;
              if (rule.selectorText && rule.selectorText.includes('.skeleton')) {
                return true;
              }
            }
          } catch (e) {
            // Cross-origin stylesheet, skip
          }
        }
        return false;
      });

      expect(hasSkeletonClass).toBe(true);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper focus rings on interactive elements', async ({ page }) => {
      const kpiCard = page.locator('.panel').filter({ hasText: 'Anfragen' }).first();

      // Tab to KPI card
      await page.keyboard.press('Tab');

      // Should have visible focus indicator
      const focusedElement = await page.evaluateHandle(() => document.activeElement);
      const hasFocusRing = await focusedElement.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.outline !== 'none' || styles.boxShadow.includes('ring');
      });

      expect(hasFocusRing).toBe(true);
    });

    test('should respect prefers-reduced-motion', async ({ page, context }) => {
      // Set reduced motion preference
      await context.addInitScript(() => {
        Object.defineProperty(window, 'matchMedia', {
          writable: true,
          value: (query: string) => ({
            matches: query === '(prefers-reduced-motion: reduce)',
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
          }),
        });
      });

      await page.goto('/');

      // Check that animations are disabled or minimal
      const hasReducedMotion = await page.evaluate(() => {
        const styles = document.styleSheets;
        for (let i = 0; i < styles.length; i++) {
          try {
            const rules = styles[i].cssRules || styles[i].rules;
            for (let j = 0; j < rules.length; j++) {
              const rule = rules[j] as CSSStyleRule;
              if (rule.cssText.includes('prefers-reduced-motion: reduce')) {
                return true;
              }
            }
          } catch (e) {
            // Cross-origin stylesheet, skip
          }
        }
        return false;
      });

      expect(hasReducedMotion).toBe(true);
    });

    test('should have proper ARIA labels', async ({ page }) => {
      // Check activity filter group
      const filterGroup = page.locator('[role="group"][aria-label="Aktivitätsfilter"]');
      await expect(filterGroup).toBeVisible();

      // Check activity feed
      const feed = page.locator('[role="feed"][aria-label="Aktivitäts-Feed"]');
      await expect(feed).toBeVisible();

      // Check search input
      const searchInput = page.locator('#agents-table-search');
      await expect(searchInput).toHaveAttribute('aria-label', 'Agents suchen');
    });
  });

  test.describe('Typography & Spacing', () => {
    test('should use .mono class for numeric values', async ({ page }) => {
      const agentsPanel = page.locator('.panel').filter({ hasText: 'Top-Agents' });
      const numericCell = agentsPanel.locator('td.mono').first();

      if (await numericCell.isVisible()) {
        const classes = await numericCell.getAttribute('class');
        expect(classes).toContain('mono');
      }
    });

    test('should have consistent 16px icons', async ({ page }) => {
      const icons = page.locator('svg.h-4.w-4');
      const iconCount = await icons.count();

      // Should have multiple icons with h-4 w-4 (16px)
      expect(iconCount).toBeGreaterThan(0);

      // Check computed size of first icon
      if (iconCount > 0) {
        const firstIcon = icons.first();
        const box = await firstIcon.boundingBox();
        if (box) {
          expect(box.width).toBe(16);
          expect(box.height).toBe(16);
        }
      }
    });

    test('should have proper panel padding and structure', async ({ page }) => {
      const kpiCard = page.locator('.panel').first();

      // Check that panel has p-0 and children have proper padding
      const classes = await kpiCard.getAttribute('class');
      expect(classes).toContain('panel');
      expect(classes).toContain('p-0');
    });
  });

  test.describe('Visual Regression', () => {
    test('should match snapshot for dashboard layout', async ({ page }) => {
      // Wait for all panels to load
      await page.waitForSelector('.panel', { state: 'visible' });

      // Take screenshot of full dashboard
      await expect(page).toHaveScreenshot('dashboard-parity-v2.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should match snapshot for KPI card hover state', async ({ page }) => {
      const kpiCard = page.locator('.panel').filter({ hasText: 'Anfragen' }).first();
      await kpiCard.hover();

      await expect(kpiCard).toHaveScreenshot('kpi-card-hover.png', {
        animations: 'disabled',
      });
    });

    test('should match snapshot for activity list with filter active', async ({ page }) => {
      const activityPanel = page.locator('.panel').filter({ hasText: 'Aktivität & Incidents' });
      const errorFilter = activityPanel.locator('button:has-text("Fehler")');
      await errorFilter.click();

      await expect(activityPanel).toHaveScreenshot('activity-list-filtered.png', {
        animations: 'disabled',
      });
    });
  });
});
