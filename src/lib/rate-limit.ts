/** In-memory rate limiter — no Redis needed for development. */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30; // per window

export function rateLimit(
  key: string,
  max?: number,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  entry.count++;
  if (entry.count > (max ?? MAX_REQUESTS)) {
    return { allowed: false, remaining: 0 };
  }

  return {
    allowed: true,
    remaining: (max ?? MAX_REQUESTS) - entry.count,
  };
}

/** Get the number of remaining requests for a key without incrementing. */
export function getRemaining(key: string): number {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) return MAX_REQUESTS;
  return Math.max(0, MAX_REQUESTS - entry.count);
}

/** Reset the counter for a specific key. */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 300_000; // 5 min
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    Array.from(store.entries()).forEach(([key, entry]) => {
      if (now > entry.resetAt) store.delete(key);
    });
  }, CLEANUP_INTERVAL);
}
