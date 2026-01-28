/**
 * Asserts that E2E_TEST_MODE is enabled.
 * Throws an error if not, preventing test-only endpoints from being used in production.
 */
export function assertE2EMode() {
  if (process.env.E2E_TEST_MODE !== '1') {
    const err = new Error('E2E_TEST_MODE is not enabled');
    (err as any).status = 404;
    (err as any).code = 'disabled';
    throw err;
  }
}

/**
 * Returns true if E2E_TEST_MODE is enabled.
 */
export function isE2EMode(): boolean {
  return process.env.E2E_TEST_MODE === '1';
}
