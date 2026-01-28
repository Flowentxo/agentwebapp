import { APIRequestContext, expect } from '@playwright/test';

/**
 * Wait for server to be ready by polling health endpoint
 * @param api - Playwright API request context
 * @param path - Path to check (default: '/api/health'), uses baseURL from config
 * @param timeoutMs - Maximum time to wait (default: 30s)
 */
export async function waitForServer(
  api: APIRequestContext,
  path: string = '/api/health',
  timeoutMs: number = 30_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastErr: any;

  while (Date.now() < deadline) {
    try {
      const r = await api.get('/api/health');
      if (r.ok()) {
        // Verify we get JSON, not HTML
        const ct = r.headers()['content-type'] || '';
        expect(ct).toContain('application/json');
        return;
      }
      lastErr = await r.text();
    } catch (e) {
      lastErr = e;
    }

    // Wait 300ms before retrying
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  throw new Error(`Server not ready after ${timeoutMs}ms: ${String(lastErr)}`);
}
