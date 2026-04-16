import { describe, it, expect } from 'vitest';
import { maskPhone, maskEmail, trackCall } from './track';

describe('maskPhone', () => {
  it('masks a full phone number', () => {
    expect(maskPhone('+15551234567')).toBe('+1***4567');
  });

  it('masks a short number', () => {
    expect(maskPhone('+1234')).toBe('***');
  });

  it('handles empty-ish input', () => {
    expect(maskPhone('')).toBe('***');
  });

  it('masks exactly 6-char input as ***', () => {
    expect(maskPhone('123456')).toBe('***');
  });

  it('masks a 7-char input with first 2 and last 4', () => {
    expect(maskPhone('1234567')).toBe('12***4567');
  });
});

describe('maskEmail', () => {
  it('masks a standard email', () => {
    expect(maskEmail('pete@example.com')).toBe('p***@example.com');
  });

  it('handles missing domain', () => {
    expect(maskEmail('nodomain')).toBe('***');
  });
});

describe('trackCall', () => {
  const mockLog = { info: () => {}, error: () => {}, warn: () => {}, child: () => mockLog } as any;

  it('returns ok result for successful call', async () => {
    const result = await trackCall({
      service: 'test',
      action: 'do-thing',
      fn: async () => ({ id: 42 }),
      log: mockLog,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ id: 42 });
    }
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('returns error result when fn throws', async () => {
    const result = await trackCall({
      service: 'test',
      action: 'fail-thing',
      fn: async () => {
        throw new Error('boom');
      },
      log: mockLog,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('boom');
    }
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
  });
});
