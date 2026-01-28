import { BrowserContext } from '@playwright/test';

/**
 * Login via API (only works when E2E_TEST_MODE is set)
 * Returns the session cookie for further use
 */
export async function loginViaAPI(
  ctx: BrowserContext,
  options: {
    email: string;
    name?: string;
    role?: 'admin' | 'editor' | 'viewer';
  }
) {
  const response = await ctx.request.post('/api/test/login', {
    headers: { 'content-type': 'application/json' },
    data: {
      email: options.email,
      name: options.name,
      role: options.role || 'editor',
    },
  });

  if (!response.ok()) {
    throw new Error(`Login failed: ${response.status()} ${await response.text()}`);
  }

  return await response.json();
}
