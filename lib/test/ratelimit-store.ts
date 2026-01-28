type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Returns { allowed, remaining, retryAfterMs } */
export function checkAndIncrement(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }
  if (b.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: b.resetAt - now };
  }
  b.count += 1;
  return { allowed: true, remaining: limit - b.count, retryAfterMs: 0 };
}

export function resetForTests() {
  buckets.clear();
}
