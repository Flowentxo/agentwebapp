import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = "http://localhost:3003";

test.describe("Auth – Dev Login & A11y", () => {
  test("login page has proper labels and passes axe", async ({ page }) => {
    await page.goto(`${BASE}/auth`);

    await expect(page.locator('label[for="email"]')).toBeVisible();
    await expect(page.locator('label[for="name"]')).toBeVisible();
    await expect(page.locator('label[for="role"]')).toBeVisible();

    await expect(page.getByTestId("primary-cta")).toHaveCount(1);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(
      results.violations.filter((v) => ["critical", "serious"].includes(v.impact!))
    ).toHaveLength(0);
  });
});

test.describe("Auth – Session & PAT", () => {
  test("logs in, creates PAT, lists masked tokens", async ({ page, request }) => {
    await page.goto(`${BASE}/auth`);

    await page.fill("#email", "alice@example.com");
    await page.fill("#name", "Alice");
    await page.selectOption("#role", "editor");
    await page.getByRole("button", { name: /login/i }).click();

    await expect(page.locator("text=/Logged in./i")).toBeVisible();

    await page.fill("#pat-name", "CLI");
    await page.fill("#pat-scopes", "agents:run,integrations:invoke");
    await page.getByRole("button", { name: /create token/i }).click();

    const tokenText = await page
      .locator("text=Token (copy now")
      .locator("code")
      .textContent();
    expect(tokenText).toMatch(/^pat_[A-Za-z0-9-_]+$/);

    // List via API
    const list = await request.get(`${BASE}/api/auth/pats`, {
      headers: { Accept: "application/json" },
    });
    expect(list.ok()).toBeTruthy();

    const items = await list.json();
    expect(items[0].masked).toMatch(/^\w{6}\*{4}\w{4}$/);
  });
});

test.describe("Auth – Secure API enforcement", () => {
  test("denies without scope; allows with agents:run", async ({ request, page }) => {
    // Create a viewer (no write)
    await page.goto(`${BASE}/auth`);

    await page.fill("#email", "bob@example.com");
    await page.fill("#name", "Bob");
    await page.selectOption("#role", "viewer");
    await page.getByRole("button", { name: /login/i }).click();

    // Create PAT with limited scope (viewer can't, expect 403) -> switch to editor
    await page.selectOption("#role", "editor");
    await page.getByRole("button", { name: /login/i }).click();

    await page.fill("#pat-name", "Limited");
    await page.fill("#pat-scopes", "knowledge:read");
    await page.getByRole("button", { name: /create token/i }).click();

    const limited = await page
      .locator("text=Token (copy now")
      .locator("code")
      .textContent();

    // Try POST /api/secure/run with limited token => 403
    let res = await request.post(`${BASE}/api/secure/run`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${limited}`,
      },
      data: { agentId: "dexter" },
    });

    expect(res.status()).toBe(403);

    // Create full token with agents:run
    await page.fill("#pat-name", "Runner");
    await page.fill("#pat-scopes", "agents:run");
    await page.getByRole("button", { name: /create token/i }).click();

    const runner = await page
      .locator("text=Token (copy now")
      .locator("code")
      .textContent();

    res = await request.post(`${BASE}/api/secure/run`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${runner}`,
      },
      data: { agentId: "dexter" },
    });

    expect(res.status()).toBe(200);

    const j = await res.json();
    expect(j.runId).toMatch(/^run-/);
  });
});
