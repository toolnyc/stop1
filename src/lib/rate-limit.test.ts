import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter, getClientIp } from './rate-limit';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under the limit', () => {
    const limiter = new RateLimiter(3, 60_000);

    limiter.hit('key');
    limiter.hit('key');

    const result = limiter.check('key');
    expect(result.allowed).toBe(true);
  });

  it('blocks after maxAttempts hits within window', () => {
    const limiter = new RateLimiter(3, 60_000);

    limiter.hit('key');
    limiter.hit('key');
    limiter.hit('key');

    const result = limiter.check('key');
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(60_000);
  });

  it('resets after window expires', () => {
    const limiter = new RateLimiter(3, 60_000);

    limiter.hit('key');
    limiter.hit('key');
    limiter.hit('key');

    expect(limiter.check('key').allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    const result = limiter.check('key');
    expect(result.allowed).toBe(true);
  });
});

describe('getClientIp', () => {
  it('extracts first IP from x-forwarded-for', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIp(request)).toBe('1.2.3.4');
  });

  it('returns unknown when no header', () => {
    const request = new Request('http://localhost');
    expect(getClientIp(request)).toBe('unknown');
  });
});
