import { test, expect } from "@playwright/test";
import { waitForServer } from "../helpers/server";
import { reset, createOrg, createProject } from "../helpers/api";

test.beforeAll(async ({ request }) => {
  await waitForServer(request);
});

test.beforeEach(async ({ request }) => {
  await reset(request);
});

test("Run Logs endpoint returns redacted logs (no raw PII/secrets)", async ({ request }) => {
  // 1) Create org and project
  const org = await createOrg(request, "RedactOrg");
  const proj = await createProject(request, org.id, "RedactProj");

  // 2) Emit sensitive lines into the run via test-only helper
  const lines = [
    "Email: alice+dev@example.com, bob@example.co.uk",
    "Phone: +1 (415) 555-2671, 030 1234 5678",
    "Tokens: pat_ABC-123_def flwnt_live_51H9abcXYZ ghp_abcdEFGH1234 xoxb-12345-abcdef",
    "Bearer flwnt_test_12345",
  ];

  const emit = await request.post("/api/test/runs/emit", {
    data: { projectId: proj.id, lines },
    failOnStatusCode: false,
  });
  expect(emit.status()).toBe(201);
  const { runId } = await emit.json();
  expect(runId).toBeTruthy();

  // 3) Fetch logs via the *real* logs endpoint
  const res = await request.get(`/api/projects/${proj.id}/runs/${runId}/logs`, {
    failOnStatusCode: false,
  });
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"] ?? "").toContain("application/json");
  const js = await res.json();
  expect(js?.ok).toBe(true);
  expect(Array.isArray(js?.logs)).toBe(true);

  const text = JSON.stringify(js.logs);

  // 4) No raw values present
  expect(text).not.toContain("alice+dev@example.com");
  expect(text).not.toContain("bob@example.co.uk");
  expect(text).not.toContain("flwnt_live_51H9abcXYZ");
  expect(text).not.toContain("pat_ABC-123_def");
  expect(text).not.toContain("xoxb-12345-abcdef");
  expect(text).not.toContain("ghp_abcdEFGH1234");
  expect(text).not.toMatch(/\b\+1 \(415\) 555-2671\b/);
  expect(text).not.toMatch(/\b030 1234 5678\b/);

  // 5) Placeholders are present
  expect(text).toMatch(/\[REDACTED_EMAIL]/);
  expect(text).toMatch(/\[REDACTED_TOKEN]/);
});
