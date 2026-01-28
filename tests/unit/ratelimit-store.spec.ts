import { describe, it, expect, beforeEach } from 'vitest';
import * as RL from '@/lib/test/ratelimit-store';

describe('ratelimit-store', () => {
  beforeEach(() => RL.resetForTests());

  it('allows N then blocks with 429 semantics', () => {
    const key = 'k1';
    const limit = 3;
    const windowMs = 1000;

    for (let i = 0; i < limit; i++) {
      const r = RL.checkAndIncrement(key, limit, windowMs);
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(limit - (i + 1));
    }
    const blocked = RL.checkAndIncrement(key, limit, windowMs);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('resets bucket after window expires', async () => {
    const key = 'k2';
    const limit = 2;
    const windowMs = 100; // Short window for testing

    // Hit limit
    RL.checkAndIncrement(key, limit, windowMs);
    RL.checkAndIncrement(key, limit, windowMs);
    const blocked = RL.checkAndIncrement(key, limit, windowMs);
    expect(blocked.allowed).toBe(false);

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, windowMs + 10));

    // Should be allowed again
    const allowed = RL.checkAndIncrement(key, limit, windowMs);
    expect(allowed.allowed).toBe(true);
    expect(allowed.remaining).toBe(limit - 1);
  });

  it('tracks separate keys independently', () => {
    const limit = 2;
    const windowMs = 1000;

    // Key 1
    RL.checkAndIncrement('k1', limit, windowMs);
    RL.checkAndIncrement('k1', limit, windowMs);
    const k1Blocked = RL.checkAndIncrement('k1', limit, windowMs);
    expect(k1Blocked.allowed).toBe(false);

    // Key 2 should still be allowed
    const k2First = RL.checkAndIncrement('k2', limit, windowMs);
    expect(k2First.allowed).toBe(true);
    expect(k2First.remaining).toBe(limit - 1);
  });
});
