import { test, expect } from "@playwright/test";
import { waitForServer } from "../helpers/server";
import { reset } from "../helpers/api";

test.beforeAll(async ({ request }) => {
  await waitForServer(request);
});

test.beforeEach(async ({ request }) => {
  await reset(request);
});

test("redacts emails, phones, and tokens", async ({ request }) => {
  const secretText = [
    "Contact: alice+dev@example.com, bob@example.co.uk",
    "Phone: +1 (415) 555-2671 or 030 1234 5678",
    "Tokens: pat_ABC-123_def, flwnt_live_51H9abcXYZ, ghp_abcdEFGH1234",
    "Slack: xoxb-12345-abcdef",
    "Auth: Bearer flwnt_test_12345",
  ].join("\n");

  const res = await request.post("/api/test/redact", { data: { text: secretText }, failOnStatusCode: false });
  expect(res.status()).toBe(200);
  const { masked } = await res.json();

  // Must NOT contain raw values
  expect(masked).not.toContain("alice+dev@example.com");
  expect(masked).not.toContain("bob@example.co.uk");
  expect(masked).not.toContain("flwnt_live_51H9abcXYZ");
  expect(masked).not.toContain("pat_ABC-123_def");
  expect(masked).not.toContain("xoxb-12345-abcdef");
  expect(masked).not.toContain("ghp_abcdEFGH1234");

  // Must contain placeholders
  expect(masked).toMatch(/\[REDACTED_EMAIL]/);
  expect(masked).toMatch(/\[REDACTED_TOKEN]/);

  // Phone digits should be masked
  expect(masked).not.toMatch(/\b\+1 \(415\) 555-2671\b/);
  expect(masked).not.toMatch(/\b030 1234 5678\b/);
});

test("idempotent masking (double pass doesn't unmask)", async ({ request }) => {
  const s = "bob@example.com pat_ABC-123";
  const once = await (await request.post("/api/test/redact", { data: { text: s } })).json();
  const twice = await (await request.post("/api/test/redact", { data: { text: once.masked } })).json();
  expect(once.masked).toBe(twice.masked);
});
