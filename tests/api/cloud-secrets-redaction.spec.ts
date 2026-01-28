import { test, expect } from "@playwright/test";
import { waitForServer } from "../helpers/server";
import { reset } from "../helpers/api";

test.beforeAll(async ({ request }) => {
  await waitForServer(request);
});

test.beforeEach(async ({ request }) => {
  await reset(request);
});

test("redacts AWS/GCP/Azure and DB credentials", async ({ request }) => {
  const sample = [
    "AWS AK: AKIAIOSFODNN7EXAMPLE",
    "aws_secret_access_key=abcdEFGHijklMNOPqrstUVWXyz0123456789+/==",
    "GCP API key: AIzaSyA1234567890abcdefGhIJkLmNopQrstu",
    "Azure conn: DefaultEndpointsProtocol=https;AccountName=foo;AccountKey=abcdEFGHijklMNOPqrstUVWXyz0123456789+/=abcdEFGHijklMNOPqrstUVWXyz0123456789+/=;EndpointSuffix=core.windows.net",
    "Azure SAS: https://x.blob.core.windows.net/c?sv=2021-08-06&sig=wHeN3VrY%2BabcDEF%3D",
    "PG URI: postgres://user:superSecretP@ss@db.example.com:5432/app",
    "Mongo URI: mongodb+srv://user:myS3cret!@cluster0.mongodb.net/app",
  ].join("\n");

  const res = await request.post("/api/test/redact", { data: { text: sample }, failOnStatusCode: false });
  expect(res.status()).toBe(200);
  const { masked } = await res.json();

  // No raw secrets
  expect(masked).not.toContain("AKIAIOSFODNN7EXAMPLE");
  expect(masked).not.toContain("aws_secret_access_key=abcd");
  expect(masked).not.toContain("AIzaSyA1234567890abcdefGhIJkLmNopQrstu");
  expect(masked).not.toContain("AccountKey=abcd");
  expect(masked).not.toContain("sig=wHeN3VrY");
  expect(masked).not.toContain("superSecretP@ss");
  expect(masked).not.toContain("myS3cret!");

  // Placeholders / masked shapes present
  expect(masked).toContain("[REDACTED_AWS_KEY_ID]");
  expect(masked).toContain("[REDACTED_AWS_SECRET]");
  expect(masked).toContain("[REDACTED_GCP_API_KEY]");
  expect(masked).toContain("[REDACTED_AZURE_CONN_KEY]");
  expect(masked).toContain("[REDACTED_AZURE_SIG]");
  expect(masked).toContain("postgres://user:***@");
  expect(masked).toContain("mongodb+srv://user:***@");
});
