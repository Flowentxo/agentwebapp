/**
 * Auth Logger Utility
 * Provides structured logging with request IDs and PII protection
 */

export function newRequestId(): string {
  // 16-byte hex string
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function logAuth(event: string, data: Record<string, unknown>): void {
  try {
    const safe = { ...data };
    // Remove sensitive fields
    if ('password' in safe) delete (safe as any).password;
    if ('token' in safe) delete (safe as any).token;
    if ('passwordHash' in safe) delete (safe as any).passwordHash;
    if ('mfaSecret' in safe) delete (safe as any).mfaSecret;

    // eslint-disable-next-line no-console
    console.info(`[AUTH] ${event}`, JSON.stringify(safe));
  } catch {
    // Swallow logging errors
  }
}
