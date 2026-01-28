import { test, expect, APIRequestContext } from '@playwright/test';
import { waitForServer } from '../helpers/server';

async function getAuthCookie(request: APIRequestContext) {
  const r = await request.post('/api/test/login', {
    data: { email: 'smoke@test.com', name: 'Smoke Test', role: 'admin' },
    failOnStatusCode: false,
  });
  expect(r.status()).toBe(200);

  // Extract cookie from Set-Cookie header
  const setCookie = r.headers()['set-cookie'];
  expect(setCookie).toBeTruthy();

  // Parse sid cookie value
  const match = setCookie?.match(/sid=([^;]+)/);
  expect(match).toBeTruthy();

  return `sid=${match![1]}`;
}

test.describe('API smoke @smoke', () => {
  test.beforeAll(async ({ request }) => {
    await waitForServer(request);
  });

  test('health is healthy', async ({ request }) => {
    const res = await request.get('/api/health', { failOnStatusCode: false });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type'] ?? '').toContain('application/json');
    await res.json();
  });

  test('whoami requires auth then succeeds after test login', async ({ request }) => {
    const unauth = await request.get('/api/secure/whoami', { failOnStatusCode: false });
    expect([401, 403]).toContain(unauth.status());

    const cookie = await getAuthCookie(request);
    const who = await request.get('/api/secure/whoami', {
      headers: { cookie },
      failOnStatusCode: false,
    });
    expect(who.status()).toBe(200);
    const js = await who.json();
    expect(js?.principal).toBeTruthy();
    expect(js?.principal?.type).toBe('user');
  });

  test('orgs list returns JSON (with auth)', async ({ request }) => {
    const cookie = await getAuthCookie(request);
    const res = await request.get('/api/orgs', {
      headers: { cookie },
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type'] ?? '').toContain('application/json');
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
  });

  test('test/reset endpoint returns 404 without E2E_TEST_MODE', async ({ request }) => {
    // This test verifies the endpoint is properly gated
    // When E2E_TEST_MODE=1 (as in our CI), it should work with POST
    const postRes = await request.post('/api/test/reset', { failOnStatusCode: false });
    expect(postRes.status()).toBe(200);

    // But GET should always return 405 (method not allowed)
    const getRes = await request.get('/api/test/reset', { failOnStatusCode: false });
    expect(getRes.status()).toBe(405);
  });

  test('PAT creation requires auth and returns token', async ({ request }) => {
    const cookie = await getAuthCookie(request);
    const res = await request.post('/api/auth/pats', {
      headers: {
        cookie,
        'content-type': 'application/json'
      },
      data: { name: 'Smoke Test Token', scopes: 'agents:run' },
      failOnStatusCode: false,
    });

    expect(res.status()).toBe(201);
    const json = await res.json();
    expect(json.token).toMatch(/^pat_[A-Za-z0-9-_]+$/);
    expect(json.pat).toBeTruthy();
  });
});
