import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { waitForServer } from "../helpers/server";
import {
  createOrgViaAPI,
  listOrgsViaAPI,
  inviteMemberViaAPI,
  createProjectViaAPI,
  listProjectsViaAPI,
  createPatViaAPI,
  runAgentInProjectViaAPI,
} from "../helpers/api";

// Ensure server is ready before running any tests
test.beforeAll(async ({ request }) => {
  await waitForServer(request);
});

// Reset state before each test for deterministic results
test.beforeEach(async ({ request }) => {
  await request.post('/api/test/reset');
});

test.describe("Projects – A11y & UI", () => {
  test("projects page has proper labels and passes axe", async ({ page }) => {
    // First, log in to access the projects page
    await page.goto("/auth");
    await page.waitForLoadState("networkidle");
    await page.fill("#email", "alice@example.com");
    await page.fill("#name", "Alice");
    await page.selectOption("#role", "editor");
    await page.getByRole("button", { name: /login/i }).click();

    // Wait for login to complete by checking for PAT form
    await expect(page.locator("#pat-name")).toBeVisible({ timeout: 10000 });

    // Navigate to projects page
    await page.goto("/projects");
    await page.waitForLoadState("networkidle");

    // Check for proper labels
    await expect(page.locator('label[for="org-name"]')).toBeVisible();
    await expect(page.locator('label[for="select-org"]')).toBeVisible();

    // Check for exactly 1 primary CTA
    await expect(page.getByTestId("primary-cta")).toHaveCount(1);

    // Run axe accessibility scan
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(
      results.violations.filter((v) => ["critical", "serious"].includes(v.impact!))
    ).toHaveLength(0);
  });
});

test.describe("Projects – Org & Project CRUD", () => {
  test.describe.configure({ mode: 'serial' });

  test("creates org, invites member, creates project", async ({ page }) => {
    // Log in as Alice (still need UI login for session)
    await page.goto(`/auth`);
    await page.waitForLoadState("networkidle");
    await page.fill("#email", "alice@example.com");
    await page.fill("#name", "Alice");
    await page.selectOption("#role", "editor");
    await page.getByRole("button", { name: /login/i }).click();

    // Wait for login to complete
    await expect(page.locator("#pat-name")).toBeVisible({ timeout: 10000 });

    // Create organization via API
    const org = await createOrgViaAPI(page.context(), { name: 'Acme Corp' });
    const orgs = await listOrgsViaAPI(page.context());
    expect(orgs.find((o: any) => o.id === org.id)).toBeTruthy();

    // Invite Bob via API
    await inviteMemberViaAPI(page.context(), {
      orgId: org.id,
      email: "bob@example.com",
      role: "member"
    });

    // Create project via API
    const project = await createProjectViaAPI(page.context(), {
      orgId: org.id,
      name: 'Marketing Automation'
    });
    const projects = await listProjectsViaAPI(page.context(), org.id);
    expect(projects.find((p: any) => p.id === project.id)).toBeTruthy();
    expect(project.name).toBe("Marketing Automation");
  });
});

test.describe("Projects – Membership Guards", () => {
  test.describe.configure({ mode: 'serial' });

  test("denies non-member, allows member with agents:run", async ({
    browser,
  }) => {
    // Create separate contexts for Alice and Bob to avoid cookie collisions
    const aliceCtx = await browser.newContext();
    const alice = await aliceCtx.newPage();

    // Alice logs in
    await alice.goto(`/auth`);
    await alice.waitForLoadState("networkidle");
    await alice.fill("#email", "alice@example.com");
    await alice.fill("#name", "Alice");
    await alice.selectOption("#role", "editor");
    await alice.getByRole("button", { name: /login/i }).click();
    await expect(alice.locator("#pat-name")).toBeVisible({ timeout: 10000 });

    // Create Alice's PAT via API
    const { token: aliceToken } = await createPatViaAPI(alice.context(), {
      name: 'TestRunner',
      scopes: 'agents:run'
    });

    // Create org and project via API
    const org = await createOrgViaAPI(alice.context(), { name: 'Beta Inc' });
    const project = await createProjectViaAPI(alice.context(), {
      orgId: org.id,
      name: 'Sales Pipeline'
    });

    // Create Bob's context
    const bobCtx = await browser.newContext();
    const bob = await bobCtx.newPage();

    // Bob logs in
    await bob.goto(`/auth`);
    await bob.waitForLoadState("networkidle");
    await bob.fill("#email", "bob@example.com");
    await bob.fill("#name", "Bob");
    await bob.selectOption("#role", "editor");
    await bob.getByRole("button", { name: /login/i }).click();
    await expect(bob.locator("#pat-name")).toBeVisible({ timeout: 10000 });

    // Create Bob's PAT via API
    const { token: bobToken } = await createPatViaAPI(bob.context(), {
      name: 'BobRunner',
      scopes: 'agents:run'
    });

    // Try to run agent as Bob (non-member) => 403
    let runRes = await runAgentInProjectViaAPI(bob.context().request, project.id, bobToken);
    expect(runRes.status()).toBe(403);
    const bobErr = await runRes.json();
    expect(bobErr.error).toBe("not_member");

    // Add Bob as member via API
    await inviteMemberViaAPI(alice.context(), {
      orgId: org.id,
      email: "bob@example.com",
      role: "member"
    });

    // Try again as Bob (now member with agents:run) => 200
    runRes = await runAgentInProjectViaAPI(bob.context().request, project.id, bobToken);
    expect(runRes.status()).toBe(200);
    const runData = await runRes.json();
    expect(runData.runId).toMatch(/^run-/);
    expect(runData.projectId).toBe(project.id);
    expect(runData.orgId).toBe(org.id);

    // Cleanup
    await aliceCtx.close();
    await bobCtx.close();
  });
});

test.describe("Projects – Scope Enforcement", () => {
  test("denies member without agents:run scope", async ({ page }) => {
    // Login as Carol
    await page.goto(`/auth`);
    await page.waitForLoadState("networkidle");
    await page.fill("#email", "carol@example.com");
    await page.fill("#name", "Carol");
    await page.selectOption("#role", "editor");
    await page.getByRole("button", { name: /login/i }).click();

    // Wait for login to complete
    await expect(page.locator("#pat-name")).toBeVisible({ timeout: 10000 });

    // Create PAT WITHOUT agents:run via API
    const { token: carolToken } = await createPatViaAPI(page.context(), {
      name: 'ReadOnly',
      scopes: 'knowledge:read'
    });

    // Create org via API
    const org = await createOrgViaAPI(page.context(), { name: 'Gamma LLC' });

    // Create project via API (needs agents:run scope, so create another token)
    const { token: fullToken } = await createPatViaAPI(page.context(), {
      name: 'FullAccess',
      scopes: 'agents:run'
    });

    const project = await createProjectViaAPI(page.context(), {
      orgId: org.id,
      name: 'Data Pipeline'
    });

    // Try to run agent with read-only token => 403 (insufficient_scopes)
    const runRes = await runAgentInProjectViaAPI(page.context().request, project.id, carolToken);
    expect(runRes.status()).toBe(403);
    const err = await runRes.json();
    expect(err.error).toBe("insufficient_scopes");
  });
});

test.describe("Projects – Role Hierarchy", () => {
  test("viewer can list but not create projects", async ({ browser }) => {
    // Create separate contexts for Dave and Eve
    const daveCtx = await browser.newContext();
    const dave = await daveCtx.newPage();

    // Login as Dave (owner)
    await dave.goto(`/auth`);
    await dave.waitForLoadState("networkidle");
    await dave.fill("#email", "dave@example.com");
    await dave.fill("#name", "Dave");
    await dave.selectOption("#role", "editor");
    await dave.getByRole("button", { name: /login/i }).click();
    await expect(dave.locator("#pat-name")).toBeVisible({ timeout: 10000 });

    // Create PAT via API
    const { token: daveToken } = await createPatViaAPI(dave.context(), {
      name: 'DaveToken',
      scopes: 'agents:run'
    });

    // Create org via API
    const org = await createOrgViaAPI(dave.context(), { name: 'Delta Corp' });

    // Invite Eve as viewer via API
    await inviteMemberViaAPI(dave.context(), {
      orgId: org.id,
      email: "eve@example.com",
      role: "viewer"
    });

    // Create Eve's context
    const eveCtx = await browser.newContext();
    const eve = await eveCtx.newPage();

    // Login as Eve
    await eve.goto(`/auth`);
    await eve.waitForLoadState("networkidle");
    await eve.fill("#email", "eve@example.com");
    await eve.fill("#name", "Eve");
    await eve.selectOption("#role", "editor");
    await eve.getByRole("button", { name: /login/i }).click();
    await expect(eve.locator("#pat-name")).toBeVisible({ timeout: 10000 });

    // Create Eve's PAT via API
    const { token: eveToken } = await createPatViaAPI(eve.context(), {
      name: 'EveToken',
      scopes: 'agents:run'
    });

    // Eve can list projects (viewer access)
    const projects = await listProjectsViaAPI(eve.context(), org.id);
    expect(Array.isArray(projects)).toBeTruthy();

    // Eve cannot create projects (requires member role) => 403
    const createRes = await eve.context().request.post(
      `/api/orgs/${org.id}/projects`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${eveToken}`,
        },
        data: { name: "Unauthorized Project" },
      }
    );

    expect(createRes.status()).toBe(403);
    const err = await createRes.json();
    expect(err.error).toBe("insufficient_role");

    // Cleanup
    await daveCtx.close();
    await eveCtx.close();
  });
});
