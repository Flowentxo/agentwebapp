import { test, expect } from "@playwright/test";
import { waitForServer } from "../helpers/server";

// Ensure server is ready before running any tests
test.beforeAll(async ({ request }) => {
  await waitForServer(request);
});

test.describe("API Guards – Security & Format", () => {
  test("session cookie uses ~ separator (not .)", async ({ page }) => {
    // Login to get session cookie
    await page.goto("/auth");
    await page.waitForLoadState("networkidle");
    await page.fill("#email", "test@example.com");
    await page.fill("#name", "Test User");
    await page.selectOption("#role", "editor");
    await page.getByRole("button", { name: /login/i }).click();

    // Wait for login to complete
    await expect(page.locator("#pat-name")).toBeVisible({ timeout: 10000 });

    // Check cookies
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "sid");

    expect(sessionCookie).toBeDefined();
    expect(sessionCookie!.value).toContain("~"); // explicit tilde
    expect(sessionCookie!.value).not.toMatch(/\.\d/); // no dot-based split regressions
  });

  test("reset endpoint returns 405 for non-POST methods", async ({
    request,
  }) => {
    // GET should return 405
    const getRes = await request.get("/api/test/reset", {
      failOnStatusCode: false,
    });
    expect(getRes.status()).toBe(405);
    const getAllow = getRes.headers()["allow"];
    expect(getAllow).toBe("POST");

    // PUT should return 405
    const putRes = await request.put("/api/test/reset", {
      failOnStatusCode: false,
    });
    expect(putRes.status()).toBe(405);

    // DELETE should return 405
    const delRes = await request.delete("/api/test/reset", {
      failOnStatusCode: false,
    });
    expect(delRes.status()).toBe(405);

    // PATCH should return 405
    const patchRes = await request.patch("/api/test/reset", {
      failOnStatusCode: false,
    });
    expect(patchRes.status()).toBe(405);
  });

  test("reset endpoint works with POST when E2E_TEST_MODE is set", async ({
    request,
  }) => {
    // POST should work (E2E_TEST_MODE is set in playwright.config.ts)
    const postRes = await request.post("/api/test/reset");
    expect(postRes.ok()).toBeTruthy();
    const json = await postRes.json();
    expect(json.ok).toBe(true);
  });
});

test.describe("API Guards – Content-Type Smoke Tests", () => {
  const apiRoutes = [
    { path: "/api/orgs", needsAuth: true },
    { path: "/api/auth/pats", needsAuth: true },
  ];

  test.beforeEach(async ({ page }) => {
    // Login to get session for authenticated routes
    await page.goto("/auth");
    await page.waitForLoadState("networkidle");
    await page.fill("#email", "smoke@example.com");
    await page.fill("#name", "Smoke Test");
    await page.selectOption("#role", "editor");
    await page.getByRole("button", { name: /login/i }).click();
    await expect(page.locator("#pat-name")).toBeVisible({ timeout: 10000 });
  });

  for (const route of apiRoutes) {
    test(`${route.path} returns application/json content-type`, async ({
      page,
    }) => {
      const res = await page.context().request.get(route.path, {
        failOnStatusCode: false,
      });

      // Check content-type header
      const contentType = res.headers()["content-type"] ?? "";
      expect(contentType).toContain("application/json");

      // Ensure body is parseable JSON
      const text = await res.text();
      expect(() => JSON.parse(text)).not.toThrow();
    });
  }
});
