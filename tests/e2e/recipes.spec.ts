import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE_URL = "http://localhost:3003";

test.describe("Recipes – Setup Provider & Action", () => {
  let providerId: string;
  let actionId: string;

  test("setup: create provider and action for recipes tests", async ({
    request,
  }) => {
    // Create provider
    const providerRes = await request.post(
      `${BASE_URL}/api/integrations/providers`,
      {
        data: {
          type: "webhook",
          name: "Recipes Test Provider",
        },
      }
    );
    expect(providerRes.status()).toBe(201);
    const provider = await providerRes.json();
    providerId = provider.id;

    // Create action with template
    const actionRes = await request.post(
      `${BASE_URL}/api/integrations/actions`,
      {
        data: {
          providerId,
          name: "Recipes Test Action",
          payloadTemplate: '{"msg":"Hello {{agentName}} ({{env}})"}',
        },
      }
    );
    expect(actionRes.status()).toBe(201);
    const action = await actionRes.json();
    actionId = action.id;

    // Store IDs for other tests to use
    test.info().annotations.push(
      { type: "providerId", description: providerId },
      { type: "actionId", description: actionId }
    );
  });
});

test.describe("Recipes – Create & A11y", () => {
  test("creates recipe with if/else and passes axe checks", async ({
    page,
    request,
  }) => {
    // First create action
    const providerRes = await request.post(
      `${BASE_URL}/api/integrations/providers`,
      {
        data: {
          type: "webhook",
          name: "Recipe Create Test Provider",
        },
      }
    );
    const provider = await providerRes.json();

    const actionRes = await request.post(
      `${BASE_URL}/api/integrations/actions`,
      {
        data: {
          providerId: provider.id,
          name: "Recipe Create Test Action",
          payloadTemplate: '{"test":"{{value}}"}',
        },
      }
    );
    const action = await actionRes.json();

    // Go to recipes page
    await page.goto(`${BASE_URL}/recipes`);
    await page.waitForSelector('h1:has-text("Recipes")', { timeout: 10000 });

    // Fill create form
    await page.locator('input#recipe-name').fill("Test If/Else Recipe");
    await page
      .locator('input#recipe-description')
      .fill("Tests conditional logic");

    const stepsJson = JSON.stringify([
      {
        id: "s1",
        type: "if",
        expr: 'env == "dev"',
        then: [
          {
            id: "s2",
            type: "action.invoke",
            actionId: action.id,
            context: { value: "dev_branch" },
          },
        ],
        else: [
          {
            id: "s3",
            type: "action.invoke",
            actionId: action.id,
            context: { value: "prod_branch" },
          },
        ],
      },
    ]);

    await page.locator('textarea#recipe-steps').fill(stepsJson);
    await page
      .locator('textarea#recipe-defaults')
      .fill('{"env":"dev","flag":true}');

    // Submit
    await page.locator('button[data-testid="create-recipe"]').click();

    // Wait for success
    await page.waitForSelector('text=Recipe created successfully', {
      timeout: 5000,
    });

    // Verify card appears
    const cards = page.locator('[data-testid="recipe-card"]');
    await expect(cards).toHaveCount(1);

    const card = cards.first();
    await expect(card.locator("h3")).toContainText("Test If/Else Recipe");
    await expect(card.locator('text=Steps:')).toBeVisible();

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
    await page.goto(`${BASE_URL}/recipes`);

    await expect(page.locator('label[for="recipe-name"]')).toContainText(
      "Name"
    );
    await expect(page.locator('input#recipe-name')).toBeVisible();

    await expect(
      page.locator('label[for="recipe-description"]')
    ).toContainText("Description");
    await expect(page.locator('input#recipe-description')).toBeVisible();

    await expect(page.locator('label[for="recipe-steps"]')).toContainText(
      "Steps"
    );
    await expect(page.locator('textarea#recipe-steps')).toBeVisible();

    await expect(page.locator('label[for="recipe-defaults"]')).toContainText(
      "Defaults"
    );
    await expect(page.locator('textarea#recipe-defaults')).toBeVisible();
  });
});

test.describe("Recipes – If/Else Execution", () => {
  test("runs recipe with env=dev (then branch)", async ({ page, request }) => {
    // Setup
    const providerRes = await request.post(
      `${BASE_URL}/api/integrations/providers`,
      {
        data: { type: "webhook", name: "Dev Test Provider" },
      }
    );
    const provider = await providerRes.json();

    const actionRes = await request.post(
      `${BASE_URL}/api/integrations/actions`,
      {
        data: {
          providerId: provider.id,
          name: "Dev Test Action",
          payloadTemplate: '{"msg":"Hello {{agentName}} ({{env}})"}',
        },
      }
    );
    const action = await actionRes.json();

    // Create recipe
    const recipeRes = await request.post(`${BASE_URL}/api/recipes`, {
      data: {
        name: "Dev/Prod Recipe",
        steps: [
          {
            id: "s1",
            type: "if",
            expr: 'env == "dev"',
            then: [
              {
                id: "s2",
                type: "action.invoke",
                actionId: action.id,
                context: { agentName: "Dexter" },
              },
            ],
            else: [
              {
                id: "s3",
                type: "action.invoke",
                actionId: action.id,
                context: { agentName: "Prod" },
              },
            ],
          },
        ],
      },
    });
    expect(recipeRes.status()).toBe(201);
    const recipe = await recipeRes.json();

    // Run with env=dev
    const runRes = await request.post(
      `${BASE_URL}/api/recipes/${recipe.id}?action=run`,
      {
        data: { input: { env: "dev" } },
      }
    );
    expect(runRes.status()).toBe(200);
    const run = await runRes.json();

    expect(run.status).toBe("success");
    expect(run.outputs.deliveries.length).toBe(1);

    // Check delivery payload
    const deliveriesRes = await request.get(
      `${BASE_URL}/api/integrations/deliveries?limit=5`
    );
    const deliveries = await deliveriesRes.json();
    const lastDelivery = deliveries[0];

    const payload = JSON.parse(lastDelivery.payload);
    expect(payload.msg).toBe("Hello Dexter (dev)");
  });

  test("runs recipe with env=prod (else branch)", async ({ page, request }) => {
    // Setup
    const providerRes = await request.post(
      `${BASE_URL}/api/integrations/providers`,
      {
        data: { type: "webhook", name: "Prod Test Provider" },
      }
    );
    const provider = await providerRes.json();

    const actionRes = await request.post(
      `${BASE_URL}/api/integrations/actions`,
      {
        data: {
          providerId: provider.id,
          name: "Prod Test Action",
          payloadTemplate: '{"msg":"Hello {{agentName}} ({{env}})"}',
        },
      }
    );
    const action = await actionRes.json();

    // Create recipe
    const recipeRes = await request.post(`${BASE_URL}/api/recipes`, {
      data: {
        name: "Prod Branch Recipe",
        steps: [
          {
            id: "s1",
            type: "if",
            expr: 'env == "prod"',
            then: [
              {
                id: "s2",
                type: "action.invoke",
                actionId: action.id,
                context: { agentName: "Prod" },
              },
            ],
            else: [
              {
                id: "s3",
                type: "action.invoke",
                actionId: action.id,
                context: { agentName: "Dev" },
              },
            ],
          },
        ],
      },
    });
    const recipe = await recipeRes.json();

    // Run with env=prod
    const runRes = await request.post(
      `${BASE_URL}/api/recipes/${recipe.id}?action=run`,
      {
        data: { input: { env: "prod" } },
      }
    );
    const run = await runRes.json();

    expect(run.status).toBe("success");

    // Check delivery
    const deliveriesRes = await request.get(
      `${BASE_URL}/api/integrations/deliveries?limit=5`
    );
    const deliveries = await deliveriesRes.json();
    const lastDelivery = deliveries[0];

    const payload = JSON.parse(lastDelivery.payload);
    expect(payload.msg).toBe("Hello Prod (prod)");
  });
});

test.describe("Recipes – Expression Parsing", () => {
  test("supports comparison operators (>=, <=, >, <)", async ({ request }) => {
    const providerRes = await request.post(
      `${BASE_URL}/api/integrations/providers`,
      {
        data: { type: "webhook", name: "Expr Test Provider" },
      }
    );
    const provider = await providerRes.json();

    const actionRes = await request.post(
      `${BASE_URL}/api/integrations/actions`,
      {
        data: {
          providerId: provider.id,
          name: "Expr Test Action",
          payloadTemplate: '{"result":"passed"}',
        },
      }
    );
    const action = await actionRes.json();

    // Test score >= 10
    const recipeRes = await request.post(`${BASE_URL}/api/recipes`, {
      data: {
        name: "Score Test",
        steps: [
          {
            id: "s1",
            type: "if",
            expr: "score >= 10",
            then: [
              {
                id: "s2",
                type: "action.invoke",
                actionId: action.id,
              },
            ],
          },
        ],
      },
    });
    const recipe = await recipeRes.json();

    // Run with score=15
    const runRes = await request.post(
      `${BASE_URL}/api/recipes/${recipe.id}?action=run`,
      {
        data: { input: { score: 15 } },
      }
    );
    const run = await runRes.json();

    expect(run.status).toBe("success");
    expect(run.outputs.deliveries.length).toBe(1);
  });

  test("supports boolean expressions", async ({ request }) => {
    const providerRes = await request.post(
      `${BASE_URL}/api/integrations/providers`,
      {
        data: { type: "webhook", name: "Bool Test Provider" },
      }
    );
    const provider = await providerRes.json();

    const actionRes = await request.post(
      `${BASE_URL}/api/integrations/actions`,
      {
        data: {
          providerId: provider.id,
          name: "Bool Test Action",
          payloadTemplate: '{"bool":"ok"}',
        },
      }
    );
    const action = await actionRes.json();

    // Test flag == true
    const recipeRes = await request.post(`${BASE_URL}/api/recipes`, {
      data: {
        name: "Boolean Test",
        steps: [
          {
            id: "s1",
            type: "if",
            expr: "flag == true",
            then: [
              {
                id: "s2",
                type: "action.invoke",
                actionId: action.id,
              },
            ],
          },
        ],
      },
    });
    const recipe = await recipeRes.json();

    const runRes = await request.post(
      `${BASE_URL}/api/recipes/${recipe.id}?action=run`,
      {
        data: { input: { flag: true } },
      }
    );
    const run = await runRes.json();

    expect(run.status).toBe("success");
    expect(run.outputs.deliveries.length).toBe(1);
  });

  test("supports && combinator", async ({ request }) => {
    const providerRes = await request.post(
      `${BASE_URL}/api/integrations/providers`,
      {
        data: { type: "webhook", name: "AND Test Provider" },
      }
    );
    const provider = await providerRes.json();

    const actionRes = await request.post(
      `${BASE_URL}/api/integrations/actions`,
      {
        data: {
          providerId: provider.id,
          name: "AND Test Action",
          payloadTemplate: '{"and":"ok"}',
        },
      }
    );
    const action = await actionRes.json();

    // Test score >= 10 && flag == true
    const recipeRes = await request.post(`${BASE_URL}/api/recipes`, {
      data: {
        name: "AND Test",
        steps: [
          {
            id: "s1",
            type: "if",
            expr: "score >= 10 && flag == true",
            then: [
              {
                id: "s2",
                type: "action.invoke",
                actionId: action.id,
              },
            ],
          },
        ],
      },
    });
    const recipe = await recipeRes.json();

    const runRes = await request.post(
      `${BASE_URL}/api/recipes/${recipe.id}?action=run`,
      {
        data: { input: { score: 15, flag: true } },
      }
    );
    const run = await runRes.json();

    expect(run.status).toBe("success");
    expect(run.outputs.deliveries.length).toBe(1);
  });

  test("handles unparseable expression gracefully", async ({ request }) => {
    const providerRes = await request.post(
      `${BASE_URL}/api/integrations/providers`,
      {
        data: { type: "webhook", name: "Invalid Expr Provider" },
      }
    );
    const provider = await providerRes.json();

    const actionRes = await request.post(
      `${BASE_URL}/api/integrations/actions`,
      {
        data: {
          providerId: provider.id,
          name: "Invalid Expr Action",
          payloadTemplate: '{"test":"ok"}',
        },
      }
    );
    const action = await actionRes.json();

    // Invalid expression
    const recipeRes = await request.post(`${BASE_URL}/api/recipes`, {
      data: {
        name: "Invalid Expr Test",
        steps: [
          {
            id: "s1",
            type: "if",
            expr: "invalid syntax here $%^&*",
            then: [
              {
                id: "s2",
                type: "action.invoke",
                actionId: action.id,
              },
            ],
            else: [
              {
                id: "s3",
                type: "action.invoke",
                actionId: action.id,
              },
            ],
          },
        ],
      },
    });
    const recipe = await recipeRes.json();

    // Run - should not crash, should take else branch
    const runRes = await request.post(
      `${BASE_URL}/api/recipes/${recipe.id}?action=run`,
      {
        data: { input: {} },
      }
    );
    const run = await runRes.json();

    // Should complete successfully, taking else branch
    expect(run.status).toBe("success");
    // Check logs for warning
    const warningLog = run.logs.find(
      (log: any) => log.level === "info" && log.msg.includes("result: false")
    );
    expect(warningLog).toBeDefined();
  });
});

test.describe("Recipes – Agent Run Step", () => {
  test("agent.run step creates agent run", async ({ request }) => {
    // Create recipe with agent.run step
    const recipeRes = await request.post(`${BASE_URL}/api/recipes`, {
      data: {
        name: "Agent Run Test",
        steps: [
          {
            id: "s1",
            type: "agent.run",
            agentId: "dexter",
            note: "Test agent run",
          },
        ],
      },
    });
    expect(recipeRes.status()).toBe(201);
    const recipe = await recipeRes.json();

    // Run recipe
    const runRes = await request.post(
      `${BASE_URL}/api/recipes/${recipe.id}?action=run`,
      {
        data: { input: {} },
      }
    );
    expect(runRes.status()).toBe(200);
    const run = await runRes.json();

    expect(run.status).toBe("success");
    expect(run.outputs.agentRuns.length).toBe(1);

    const agentRun = run.outputs.agentRuns[0];
    expect(agentRun.agentId).toBe("dexter");
    expect(agentRun.runId).toBeDefined();

    // Check logs
    const agentRunLog = run.logs.find(
      (log: any) =>
        log.msg.includes("Agent run created") && log.msg.includes(agentRun.runId)
    );
    expect(agentRunLog).toBeDefined();
  });
});

test.describe("Recipes – Primary CTA Rule", () => {
  test("exactly one primary CTA per card with ≥40px touch target", async ({
    page,
    request,
  }) => {
    // Create two recipes
    for (let i = 1; i <= 2; i++) {
      await request.post(`${BASE_URL}/api/recipes`, {
        data: {
          name: `CTA Test Recipe ${i}`,
          steps: [
            {
              id: "s1",
              type: "agent.run",
              agentId: "dexter",
            },
          ],
        },
      });
    }

    await page.goto(`${BASE_URL}/recipes`);
    await page.waitForTimeout(1000);

    const cards = page.locator('[data-testid="recipe-card"]');
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

test.describe("Recipes – Error Handling", () => {
  test("shows error with aria-live for invalid steps JSON", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/recipes`);

    await page.locator('input#recipe-name').fill("Invalid JSON Test");
    await page.locator('textarea#recipe-steps').fill("not valid json");

    await page.locator('button[data-testid="create-recipe"]').click();

    // Should show error
    await page.waitForSelector('[role="alert"][aria-live="assertive"]', {
      timeout: 3000,
    });

    const errorDiv = page.locator('[role="alert"][aria-live="assertive"]');
    await expect(errorDiv).toContainText("Invalid Steps JSON");
  });

  test("success messages use aria-live=polite", async ({ page, request }) => {
    // Create action first
    const providerRes = await request.post(
      `${BASE_URL}/api/integrations/providers`,
      {
        data: { type: "webhook", name: "Success Test Provider" },
      }
    );
    const provider = await providerRes.json();

    const actionRes = await request.post(
      `${BASE_URL}/api/integrations/actions`,
      {
        data: {
          providerId: provider.id,
          name: "Success Test Action",
          payloadTemplate: '{"test":"ok"}',
        },
      }
    );
    const action = await actionRes.json();

    await page.goto(`${BASE_URL}/recipes`);

    await page.locator('input#recipe-name').fill("Success Test Recipe");
    await page
      .locator('textarea#recipe-steps')
      .fill(
        JSON.stringify([
          { id: "s1", type: "action.invoke", actionId: action.id },
        ])
      );

    await page.locator('button[data-testid="create-recipe"]').click();

    const successMessage = page.locator('[aria-live="polite"]');
    await expect(successMessage).toBeVisible({ timeout: 5000 });
    await expect(successMessage).toContainText("Recipe created successfully");
  });
});
