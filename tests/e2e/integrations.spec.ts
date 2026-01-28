import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE_URL = "http://localhost:3003";

test.describe("Integrations – Create Provider & A11y", () => {
  test("creates provider with secret and masks it in GET", async ({
    page,
    request,
  }) => {
    await page.goto(`${BASE_URL}/integrations`);

    // Wait for page load
    await page.waitForSelector('h1:has-text("Integrations")', {
      timeout: 10000,
    });

    // Fill provider form
    const providerName = page.locator('input#provider-name');
    const providerType = page.locator('select#provider-type');
    const secretValue = page.locator('input#secret-value');

    await providerName.fill("Test Webhook Provider");
    await providerType.selectOption("webhook");
    await secretValue.fill("flwnt_test_abcdef123456789");

    // Submit
    const createButton = page.locator('button[data-testid="create-provider"]');
    await createButton.click();

    // Wait for success
    await page.waitForSelector('text=Provider created successfully', {
      timeout: 5000,
    });

    // Verify GET response masks secret
    const response = await request.get(
      `${BASE_URL}/api/integrations/providers`
    );
    expect(response.status()).toBe(200);

    const providers = await response.json();
    expect(Array.isArray(providers)).toBe(true);

    const testProvider = providers.find(
      (p: any) => p.name === "Test Webhook Provider"
    );
    expect(testProvider).toBeDefined();

    // Secret should be masked (not contain full original value)
    if (testProvider.secretValue) {
      expect(testProvider.secretValue).not.toBe("flwnt_test_abcdef123456789");
      expect(testProvider.secretValue).toContain("****");
      expect(testProvider.secretValue.length).toBeLessThan(
        "flwnt_test_abcdef123456789".length
      );
    }

    // Run axe scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const criticalOrSerious = accessibilityScanResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(
      criticalOrSerious,
      `Expected 0 critical/serious violations, but found ${criticalOrSerious.length}`
    ).toHaveLength(0);
  });

  test("form fields have proper labels", async ({ page }) => {
    await page.goto(`${BASE_URL}/integrations`);

    // Provider form
    await expect(page.locator('label[for="provider-name"]')).toContainText(
      "Name"
    );
    await expect(page.locator('input#provider-name')).toBeVisible();

    await expect(page.locator('label[for="provider-type"]')).toContainText(
      "Type"
    );
    await expect(page.locator('select#provider-type')).toBeVisible();

    await expect(page.locator('label[for="secret-value"]')).toContainText(
      "Secret"
    );
    await expect(page.locator('input#secret-value')).toBeVisible();

    // Action form
    await expect(page.locator('label[for="action-name"]')).toContainText(
      "Name"
    );
    await expect(page.locator('input#action-name')).toBeVisible();

    await expect(page.locator('label[for="action-provider"]')).toContainText(
      "Provider"
    );
    await expect(page.locator('select#action-provider')).toBeVisible();

    await expect(
      page.locator('label[for="payload-template"]')
    ).toContainText("Payload Template");
    await expect(page.locator('textarea#payload-template')).toBeVisible();
  });
});

test.describe("Integrations – Create Action", () => {
  test("creates action and appears in grid", async ({ page }) => {
    await page.goto(`${BASE_URL}/integrations`);

    // First create a provider
    await page.locator('input#provider-name').fill("Test Provider");
    await page.locator('select#provider-type').selectOption("webhook");
    await page.locator('button[data-testid="create-provider"]').click();
    await page.waitForSelector('text=Provider created successfully', {
      timeout: 5000,
    });
    await page.waitForTimeout(500);

    // Now create action
    await page.locator('input#action-name').fill("Send Alert");
    await page
      .locator('textarea#payload-template')
      .fill('{"message":"Alert from {{agentName}}","env":"{{env}}"}');

    await page.locator('button[data-testid="create-action"]').click();

    // Wait for success
    await page.waitForSelector('text=Action created successfully', {
      timeout: 5000,
    });

    // Verify card appears
    const cards = page.locator('[data-testid="integration-card"]');
    await expect(cards).toHaveCount(1);

    const card = cards.first();
    await expect(card.locator("h3")).toContainText("Send Alert");
    await expect(card.locator('text=Provider:')).toBeVisible();
  });
});

test.describe("Integrations – Invoke Action", () => {
  test("invokes action with context and creates delivery", async ({
    page,
    request,
  }) => {
    await page.goto(`${BASE_URL}/integrations`);

    // Create provider
    await page.locator('input#provider-name').fill("Invoke Test Provider");
    await page.locator('button[data-testid="create-provider"]').click();
    await page.waitForTimeout(1000);

    // Create action with template
    await page.locator('input#action-name').fill("Test Invoke Action");
    await page
      .locator('textarea#payload-template')
      .fill(
        '{"agent":"{{agentName}}","environment":"{{env}}","missing":"{{unknown}}"}'
      );
    await page.locator('button[data-testid="create-action"]').click();
    await page.waitForTimeout(1000);

    // Find card and invoke
    const card = page.locator('[data-testid="integration-card"]').first();
    await expect(card).toBeVisible();

    // Update context
    const contextTextarea = card.locator("textarea");
    await contextTextarea.clear();
    await contextTextarea.fill('{"agentName":"Dexter","env":"production"}');

    // Click invoke
    const invokeButton = card.locator('button[data-testid="primary-cta"]');
    await invokeButton.click();

    // Wait for success message
    await page.waitForSelector('text=Invoked successfully', { timeout: 5000 });

    // Check deliveries API
    const deliveriesResponse = await request.get(
      `${BASE_URL}/api/integrations/deliveries`
    );
    expect(deliveriesResponse.status()).toBe(200);

    const deliveries = await deliveriesResponse.json();
    expect(Array.isArray(deliveries)).toBe(true);
    expect(deliveries.length).toBeGreaterThan(0);

    const lastDelivery = deliveries[0];
    expect(lastDelivery.status).toBe("sent");

    // Verify template rendering
    const payload = JSON.parse(lastDelivery.payload);
    expect(payload.agent).toBe("Dexter");
    expect(payload.environment).toBe("production");
    // Missing variable should remain as template
    expect(payload.missing).toBe("{{unknown}}");
  });

  test("shows error for invalid context JSON", async ({ page }) => {
    await page.goto(`${BASE_URL}/integrations`);

    // Create provider and action
    await page.locator('input#provider-name').fill("Error Test Provider");
    await page.locator('button[data-testid="create-provider"]').click();
    await page.waitForTimeout(1000);

    await page.locator('input#action-name').fill("Error Test Action");
    await page.locator('textarea#payload-template').fill('{"test":"{{x}}"}');
    await page.locator('button[data-testid="create-action"]').click();
    await page.waitForTimeout(1000);

    // Find card
    const card = page.locator('[data-testid="integration-card"]').first();

    // Enter invalid JSON
    const contextTextarea = card.locator("textarea");
    await contextTextarea.clear();
    await contextTextarea.fill("invalid json");

    // Click invoke
    const invokeButton = card.locator('button[data-testid="primary-cta"]');
    await invokeButton.click();

    // Wait for error
    await page.waitForSelector('[role="alert"]', { timeout: 2000 });

    const errorAlert = card.locator('[role="alert"][aria-live="assertive"]');
    await expect(errorAlert).toBeVisible();
  });
});

test.describe("Integrations – Primary CTA Rule", () => {
  test("exactly one primary CTA per card with ≥40px touch target", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/integrations`);

    // Create provider
    await page.locator('input#provider-name').fill("CTA Test Provider");
    await page.locator('button[data-testid="create-provider"]').click();
    await page.waitForTimeout(1000);

    // Create two actions
    for (let i = 1; i <= 2; i++) {
      await page.locator('input#action-name').fill(`Action ${i}`);
      await page.locator('textarea#payload-template').fill('{"test":"ok"}');
      await page.locator('button[data-testid="create-action"]').click();
      await page.waitForTimeout(500);
    }

    // Check each card
    const cards = page.locator('[data-testid="integration-card"]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i);
      const primaryCTAs = card.locator('button[data-testid="primary-cta"]');
      const ctaCount = await primaryCTAs.count();

      expect(ctaCount, `Card ${i} should have exactly 1 primary CTA`).toBe(1);

      // Check touch target
      const buttonBox = await primaryCTAs.first().boundingBox();
      expect(buttonBox?.height).toBeGreaterThanOrEqual(40);
    }
  });
});

test.describe("Integrations – Templating", () => {
  test("renders variables and preserves missing placeholders", async ({
    page,
    request,
  }) => {
    await page.goto(`${BASE_URL}/integrations`);

    // Create provider
    await page.locator('input#provider-name').fill("Template Test");
    await page.locator('button[data-testid="create-provider"]').click();
    await page.waitForTimeout(1000);

    // Create action with multiple placeholders
    await page.locator('input#action-name').fill("Template Action");
    await page
      .locator('textarea#payload-template')
      .fill(
        '{"name":"{{name}}","age":"{{age}}","active":"{{active}}","missing":"{{notProvided}}"}'
      );
    await page.locator('button[data-testid="create-action"]').click();
    await page.waitForTimeout(1000);

    // Invoke with partial context
    const card = page.locator('[data-testid="integration-card"]').first();
    const contextTextarea = card.locator("textarea");
    await contextTextarea.clear();
    await contextTextarea.fill('{"name":"Alice","age":30,"active":true}');

    await card.locator('button[data-testid="primary-cta"]').click();
    await page.waitForTimeout(1000);

    // Check delivery
    const deliveriesResponse = await request.get(
      `${BASE_URL}/api/integrations/deliveries`
    );
    const deliveries = await deliveriesResponse.json();
    const lastDelivery = deliveries[0];

    const payload = JSON.parse(lastDelivery.payload);
    expect(payload.name).toBe("Alice");
    expect(payload.age).toBe("30"); // Numbers get converted to strings
    expect(payload.active).toBe("true"); // Booleans get converted to strings
    expect(payload.missing).toBe("{{notProvided}}"); // Missing stays as template
  });

  test("handles headers template rendering", async ({ page, request }) => {
    await page.goto(`${BASE_URL}/integrations`);

    // Create provider
    await page.locator('input#provider-name').fill("Headers Test");
    await page.locator('button[data-testid="create-provider"]').click();
    await page.waitForTimeout(1000);

    // Create action with headers template
    await page.locator('input#action-name').fill("Headers Action");
    await page.locator('textarea#payload-template').fill('{"msg":"test"}');
    await page
      .locator('textarea#headers-template')
      .fill('{"Authorization":"Bearer {{token}}","X-Env":"{{env}}"}');
    await page.locator('button[data-testid="create-action"]').click();
    await page.waitForTimeout(1000);

    // Invoke
    const card = page.locator('[data-testid="integration-card"]').first();
    const contextTextarea = card.locator("textarea");
    await contextTextarea.clear();
    await contextTextarea.fill('{"token":"abc123","env":"staging"}');

    await card.locator('button[data-testid="primary-cta"]').click();
    await page.waitForTimeout(1000);

    // Check delivery headers
    const deliveriesResponse = await request.get(
      `${BASE_URL}/api/integrations/deliveries`
    );
    const deliveries = await deliveriesResponse.json();
    const lastDelivery = deliveries[0];

    expect(lastDelivery.headers).toBeDefined();
    expect(lastDelivery.headers.Authorization).toBe("Bearer abc123");
    expect(lastDelivery.headers["X-Env"]).toBe("staging");
  });
});

test.describe("Integrations – Error Handling", () => {
  test("shows error with aria-live for invalid headers template JSON", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/integrations`);

    // Create provider
    await page.locator('input#provider-name').fill("JSON Error Test");
    await page.locator('button[data-testid="create-provider"]').click();
    await page.waitForTimeout(1000);

    // Try to create action with invalid headers JSON
    await page.locator('input#action-name').fill("Bad JSON Action");
    await page.locator('textarea#payload-template').fill('{"test":"ok"}');
    await page
      .locator('textarea#headers-template')
      .fill("not valid json at all");

    await page.locator('button[data-testid="create-action"]').click();

    // Should show error
    await page.waitForSelector('[role="alert"][aria-live="assertive"]', {
      timeout: 3000,
    });

    const errorDiv = page.locator('[role="alert"][aria-live="assertive"]');
    await expect(errorDiv).toContainText(
      "Headers template must be valid JSON"
    );
  });

  test("success messages use aria-live=polite", async ({ page }) => {
    await page.goto(`${BASE_URL}/integrations`);

    await page.locator('input#provider-name').fill("Success Test");
    await page.locator('button[data-testid="create-provider"]').click();

    const successMessage = page.locator('[aria-live="polite"]');
    await expect(successMessage).toBeVisible({ timeout: 5000 });
    await expect(successMessage).toContainText("Provider created successfully");
  });
});

test.describe("Integrations – Security", () => {
  test("secret masking works correctly", async ({ request }) => {
    // Create provider with secret via API
    const createResponse = await request.post(
      `${BASE_URL}/api/integrations/providers`,
      {
        data: {
          type: "webhook",
          name: "Security Test",
          secret: {
            name: "test-secret",
            value: "flwnt_live_1234567890abcdef",
          },
        },
      }
    );

    expect(createResponse.status()).toBe(201);

    // GET providers and verify secret is masked
    const getResponse = await request.get(
      `${BASE_URL}/api/integrations/providers`
    );
    const providers = await getResponse.json();

    const testProvider = providers.find(
      (p: any) => p.name === "Security Test"
    );
    expect(testProvider).toBeDefined();

    if (testProvider.secretValue) {
      // Should be masked
      expect(testProvider.secretValue).not.toBe("flwnt_live_1234567890abcdef");
      expect(testProvider.secretValue).toContain("****");
      // Should start with first 2 chars and end with last 3
      expect(testProvider.secretValue.startsWith("sk")).toBe(true);
      expect(testProvider.secretValue.endsWith("def")).toBe(true);
    }
  });
});
