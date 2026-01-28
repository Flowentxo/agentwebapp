import { test, expect } from "@playwright/test";
import { waitForServer } from "../helpers/server";
import { reset } from "../helpers/api";

test.beforeAll(async ({ request }) => {
  await waitForServer(request);
});

test.beforeEach(async ({ request }) => {
  await reset(request);
});

test("rate limit returns 429 after N hits within window", async ({ request }) => {
  const cfg = { key: "k1", limit: 3, windowMs: 1000 };

  // 3 allowed
  for (let i = 0; i < cfg.limit; i++) {
    const r = await request.post("/api/test/ratelimit", { data: cfg, failOnStatusCode: false });
    expect(r.status()).toBe(200);
    const js = await r.json();
    expect(js.ok).toBe(true);
  }

  // 4th should be 429
  const r429 = await request.post("/api/test/ratelimit", { data: cfg, failOnStatusCode: false });
  expect(r429.status()).toBe(429);
  expect(r429.headers()["retry-after"]).toBeDefined();
  const js429 = await r429.json();
  expect(js429.reason).toBe("rate_limit");

  // After reset, allowed again
  await reset(request);
  const rAfter = await request.post("/api/test/ratelimit", { data: cfg, failOnStatusCode: false });
  expect(rAfter.status()).toBe(200);
});
