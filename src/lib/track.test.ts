import { describe, it, expect } from 'vitest';
import { maskPhone, maskEmail } from './track';

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
});

describe('maskEmail', () => {
  it('masks a standard email', () => {
    expect(maskEmail('pete@example.com')).toBe('p***@example.com');
  });

  it('handles missing domain', () => {
    expect(maskEmail('nodomain')).toBe('***');
  });
});
