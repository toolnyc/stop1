export class RateLimiter {
  private attempts: Map<string, { count: number; resetAt: number }>;
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number, windowMs: number) {
    this.attempts = new Map();
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  check(key: string): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    const entry = this.attempts.get(key);

    // Prune stale entry
    if (entry && now > entry.resetAt) {
      this.attempts.delete(key);
      return { allowed: true };
    }

    if (entry && entry.count >= this.maxAttempts) {
      return { allowed: false, retryAfterMs: entry.resetAt - now };
    }

    return { allowed: true };
  }

  hit(key: string): void {
    const now = Date.now();
    const entry = this.attempts.get(key);

    if (entry && now <= entry.resetAt) {
      entry.count++;
    } else {
      this.attempts.set(key, { count: 1, resetAt: now + this.windowMs });
    }
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  return 'unknown';
}
