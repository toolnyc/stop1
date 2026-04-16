import { describe, it, expect } from 'vitest';
import { normalizePhone, formatPhoneDisplay } from './phone';

describe('normalizePhone', () => {
  it('normalizes a US number with parentheses', () => {
    expect(normalizePhone('(212) 555-1234')).toBe('+12125551234');
  });

  it('normalizes a US number without formatting', () => {
    expect(normalizePhone('2125551234')).toBe('+12125551234');
  });

  it('normalizes a number with +1 prefix', () => {
    expect(normalizePhone('+1 212 555 1234')).toBe('+12125551234');
  });

  it('returns null for empty input', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('   ')).toBeNull();
  });

  it('returns null for invalid input', () => {
    expect(normalizePhone('abc')).toBeNull();
    expect(normalizePhone('123')).toBeNull();
  });

  it('trims whitespace', () => {
    expect(normalizePhone('  (212) 555-1234  ')).toBe('+12125551234');
  });

  it('normalizes a US number with country code prefix (no plus)', () => {
    expect(normalizePhone('12125551234')).toBe('+12125551234');
  });

  it('normalizes a compact +1 number', () => {
    expect(normalizePhone('+12125551234')).toBe('+12125551234');
  });

  it('normalizes a US number with dashes', () => {
    expect(normalizePhone('212-555-1234')).toBe('+12125551234');
  });

  it('normalizes an international UK number', () => {
    expect(normalizePhone('+447911123456')).toBe('+447911123456');
  });
});

describe('formatPhoneDisplay', () => {
  it('formats E.164 to national format', () => {
    const result = formatPhoneDisplay('+12125551234');
    expect(result).toContain('212');
    expect(result).toContain('1234');
  });

  it('returns raw string for unparseable input', () => {
    expect(formatPhoneDisplay('invalid')).toBe('invalid');
  });
});
