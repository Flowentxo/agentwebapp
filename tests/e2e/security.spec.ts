import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE_URL = "http://localhost:3003";

test.describe("Security – Headers", () => {
  test("sets security headers on all responses", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/dashboard`);
    expect(response).not.toBeNull();

    const headers = response!.headers();

    // Content Security Policy
    expect(headers["content-security-policy"]).toBeDefined();
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'"
    );

    // X-Content-Type-Options
    expect(headers["x-content-type-options"]).toBe("nosniff");

    // X-Frame-Options
    expect(headers["x-frame-options"]).toBe("DENY");

    // Referrer-Policy
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");

    // Permissions-Policy
    expect(headers["permissions-policy"]).toContain("geolocation=()");
    expect(headers["permissions-policy"]).toContain("microphone=()");
    expect(headers["permissions-policy"]).toContain("camera=()");

    // Cross-Origin policies
    expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
    expect(headers["cross-origin-resource-policy"]).toBe("same-origin");
  });

  test("sets security headers on API responses", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/recipes`);

    const headers = response.headers();

    expect(headers["content-security-policy"]).toBeDefined();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
  });
});

test.describe("Security – CSP", () => {
  test("CSP allows legitimate content and passes axe check", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 10000 });

    // Run axe accessibility check (verifies CSP doesn't break a11y)
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const criticalOrSerious = accessibilityScanResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(criticalOrSerious).toHaveLength(0);
  });
});

test.describe("Security – CSRF Protection", () => {
  test("blocks mutating API request with wrong origin", async ({ request }) => {
    // Create a provider with spoofed origin
    const response = await request.post(
      `${BASE_URL}/api/integrations/providers`,
      {
        headers: {
          "Content-Type": "application/json",
          Origin: "https://evil.example.com",
        },
        data: {
          type: "webhook",
          name: "Evil Provider",
        },
      }
    );

    // Should be blocked with 403
    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.error).toBe("csrf_blocked");
  });

  test("blocks mutating API request with wrong referer", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}/api/recipes`, {
      headers: {
        "Content-Type": "application/json",
        Referer: "https://evil.example.com/attack",
      },
      data: {
        name: "Evil Recipe",
        steps: [],
      },
    });

    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.error).toBe("csrf_blocked");
  });

  test("allows mutating API request with correct origin", async ({
    request,
  }) => {
    const response = await request.post(
      `${BASE_URL}/api/integrations/providers`,
      {
        headers: {
          "Content-Type": "application/json",
          Origin: BASE_URL,
        },
        data: {
          type: "webhook",
          name: "Legitimate Provider",
        },
      }
    );

    // Should succeed (201 Created)
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.name).toBe("Legitimate Provider");
  });

  test("allows mutating API request with correct referer", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}/api/recipes`, {
      headers: {
        "Content-Type": "application/json",
        Referer: `${BASE_URL}/recipes`,
      },
      data: {
        name: "Legitimate Recipe",
        steps: [
          {
            id: "s1",
            type: "agent.run",
            agentId: "dexter",
          },
        ],
      },
    });

    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.name).toBe("Legitimate Recipe");
  });

  test("allows mutating API request with no origin/referer (same-origin)", async ({
    request,
  }) => {
    // Same-origin requests may not send Origin/Referer
    const response = await request.post(`${BASE_URL}/api/recipes`, {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        name: "Same-Origin Recipe",
        steps: [
          {
            id: "s1",
            type: "agent.run",
            agentId: "nova",
          },
        ],
      },
    });

    expect(response.status()).toBe(201);
  });

  test("does not block GET requests", async ({ request }) => {
    // GET requests should not be CSRF-protected
    const response = await request.get(`${BASE_URL}/api/recipes`, {
      headers: {
        Origin: "https://evil.example.com",
      },
    });

    // Should succeed (GET is safe)
    expect(response.status()).toBe(200);
  });
});

test.describe("Security – XSS Guards", () => {
  test("escapeHTML prevents XSS", async () => {
    const { escapeHTML } = await import("@/lib/security/security");

    const dangerous = '<script>alert("XSS")</script>';
    const safe = escapeHTML(dangerous);

    expect(safe).toBe("&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;");
    expect(safe).not.toContain("<script>");
  });

  test("escapeHTML handles all special chars", async () => {
    const { escapeHTML } = await import("@/lib/security/security");

    expect(escapeHTML("&")).toBe("&amp;");
    expect(escapeHTML("<")).toBe("&lt;");
    expect(escapeHTML(">")).toBe("&gt;");
    expect(escapeHTML('"')).toBe("&quot;");
    expect(escapeHTML("'")).toBe("&#39;");
  });
});

test.describe("Security – Safe Downloads", () => {
  test("sanitizes dangerous filenames", async () => {
    const { safeDownloadName } = await import("@/lib/security/security");

    // Directory traversal attempt
    expect(safeDownloadName("../../etc/passwd")).toBe("__..__etc_passwd");

    // Special characters
    expect(safeDownloadName("file<script>.txt")).toBe("file_script_.txt");

    // Null bytes
    expect(safeDownloadName("file\x00.txt")).toBe("file_.txt");

    // Very long name
    const longName = "a".repeat(100);
    const safe = safeDownloadName(longName);
    expect(safe.length).toBeLessThanOrEqual(64);
  });

  test("download endpoint returns secure headers", async ({ request }) => {
    const content = "Log entry 1\nLog entry 2\nLog entry 3";
    const encodedContent = encodeURIComponent(content);

    const response = await request.get(
      `${BASE_URL}/api/download?type=logs&name=report.txt&content=${encodedContent}`
    );

    expect(response.status()).toBe(200);

    const headers = response.headers();

    // Content-Type
    expect(headers["content-type"]).toBe("text/plain; charset=utf-8");

    // Content-Disposition with sanitized filename
    expect(headers["content-disposition"]).toContain("attachment");
    expect(headers["content-disposition"]).toContain('filename="report.txt"');

    // X-Content-Type-Options
    expect(headers["x-content-type-options"]).toBe("nosniff");

    // Verify content
    const body = await response.text();
    expect(body).toBe(content);
  });

  test("download endpoint sanitizes filename", async ({ request }) => {
    const content = "test content";
    const encodedContent = encodeURIComponent(content);

    // Dangerous filename
    const response = await request.get(
      `${BASE_URL}/api/download?type=logs&name=../../etc/passwd&content=${encodedContent}`
    );

    expect(response.status()).toBe(200);

    const headers = response.headers();
    const disposition = headers["content-disposition"];

    // Should be sanitized
    expect(disposition).not.toContain("../");
    expect(disposition).toContain("__..__etc_passwd");
  });

  test("download endpoint caps content size", async ({ request }) => {
    // Create content larger than 200KB
    const largeContent = "x".repeat(300_000);
    const encodedContent = encodeURIComponent(largeContent);

    const response = await request.get(
      `${BASE_URL}/api/download?type=logs&name=large.txt&content=${encodedContent}`
    );

    expect(response.status()).toBe(200);

    const body = await response.text();

    // Should be capped at 200KB
    expect(body.length).toBeLessThanOrEqual(200_000);
  });

  test("download endpoint rejects unsupported types", async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/download?type=malware&name=evil.exe&content=hack`
    );

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("unsupported_type");
  });
});

test.describe("Security – Audit Chain", () => {
  test("audit chain links entries with hash", async () => {
    const { audit } = await import("@/lib/security/security");

    // Clear previous entries
    audit.clear();

    // Log some entries
    const entry1 = audit.log({
      actor: "test",
      action: "test_action_1",
      target: "test_target_1",
    });

    const entry2 = audit.log({
      actor: "test",
      action: "test_action_2",
      target: "test_target_2",
    });

    const entry3 = audit.log({
      actor: "test",
      action: "test_action_3",
      target: "test_target_3",
    });

    // Verify chain linkage
    expect(entry1.prevHash).toBe(""); // First entry has no previous
    expect(entry1.hash).toBeDefined();
    expect(entry1.hash.length).toBe(64); // SHA-256 hex = 64 chars

    expect(entry2.prevHash).toBe(entry1.hash);
    expect(entry2.hash).toBeDefined();
    expect(entry2.hash).not.toBe(entry1.hash);

    expect(entry3.prevHash).toBe(entry2.hash);
    expect(entry3.hash).toBeDefined();
    expect(entry3.hash).not.toBe(entry2.hash);

    // Verify integrity
    expect(audit.verify()).toBe(true);
  });

  test("audit chain detects tampering", async () => {
    const { audit } = await import("@/lib/security/security");

    audit.clear();

    audit.log({ actor: "test", action: "action1", target: "target1" });
    audit.log({ actor: "test", action: "action2", target: "target2" });

    // Tamper with an entry
    const entries = audit.getAll();
    if (entries.length > 0) {
      // @ts-ignore - intentionally tampering
      entries[0].action = "tampered";
    }

    // Verification should fail
    expect(audit.verify()).toBe(false);
  });

  test("audit logs downloads", async ({ request }) => {
    const { audit } = await import("@/lib/security/security");

    audit.clear();

    // Make a download request
    await request.get(
      `${BASE_URL}/api/download?type=logs&name=test.txt&content=test`
    );

    const entries = audit.latest(1);
    expect(entries.length).toBe(1);

    const entry = entries[0];
    expect(entry.actor).toBe("web");
    expect(entry.action).toBe("download");
    expect(entry.target).toBe("test.txt");
    expect(entry.meta.size).toBeDefined();
  });

  test("audit logs CSRF blocks", async ({ request }) => {
    const { audit } = await import("@/lib/security/security");

    audit.clear();

    // Trigger CSRF block
    await request.post(`${BASE_URL}/api/recipes`, {
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil.example.com",
      },
      data: { name: "Evil", steps: [] },
    });

    const entries = audit.latest(1);
    expect(entries.length).toBe(1);

    const entry = entries[0];
    expect(entry.actor).toBe("web");
    expect(entry.action).toBe("csrf_block");
    expect(entry.meta.origin).toBe("https://evil.example.com");
  });

  test("audit logs API mutations", async ({ request }) => {
    const { audit } = await import("@/lib/security/security");

    audit.clear();

    // Make legitimate mutation
    await request.post(`${BASE_URL}/api/recipes`, {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        name: "Audit Test Recipe",
        steps: [{ id: "s1", type: "agent.run", agentId: "dexter" }],
      },
    });

    const entries = audit.latest(1);
    expect(entries.length).toBe(1);

    const entry = entries[0];
    expect(entry.actor).toBe("web");
    expect(entry.action).toBe("api_mutation");
    expect(entry.target).toBe("/api/recipes");
    expect(entry.meta.method).toBe("POST");
  });
});

test.describe("Security – CSP Report Endpoint", () => {
  test("accepts CSP violation reports", async ({ request }) => {
    const cspReport = {
      "csp-report": {
        "document-uri": "http://localhost:3003/",
        "violated-directive": "script-src",
        "blocked-uri": "https://evil.example.com/malicious.js",
      },
    };

    const response = await request.post(
      `${BASE_URL}/api/security/csp-report`,
      {
        headers: { "Content-Type": "application/json" },
        data: cspReport,
      }
    );

    // Should return 204 No Content
    expect(response.status()).toBe(204);
  });

  test("logs CSP violations to audit chain", async ({ request }) => {
    const { audit } = await import("@/lib/security/security");

    audit.clear();

    const cspReport = {
      "csp-report": {
        "violated-directive": "img-src",
        "blocked-uri": "https://untrusted.example.com/image.png",
      },
    };

    await request.post(`${BASE_URL}/api/security/csp-report`, {
      headers: { "Content-Type": "application/json" },
      data: cspReport,
    });

    const entries = audit.latest(1);
    expect(entries.length).toBe(1);

    const entry = entries[0];
    expect(entry.actor).toBe("browser");
    expect(entry.action).toBe("csp_violation");
    expect(entry.target).toBe("csp");
    expect(entry.meta).toEqual(cspReport);
  });
});
