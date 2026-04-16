import { describe, it, expect } from 'vitest';
import { parsePlusOneCount } from './plus-ones';

describe('parsePlusOneCount', () => {
  it('returns 0 for undefined', () => {
    expect(parsePlusOneCount(undefined)).toBe(0);
  });

  it('returns 0 for null', () => {
    expect(parsePlusOneCount(null)).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parsePlusOneCount('')).toBe(0);
  });

  it('returns 0 for non-numeric string', () => {
    expect(parsePlusOneCount('abc')).toBe(0);
  });

  it('parses numeric string', () => {
    expect(parsePlusOneCount('2')).toBe(2);
  });

  it('parses integer', () => {
    expect(parsePlusOneCount(3)).toBe(3);
  });

  it('clamps 4 down to 3', () => {
    expect(parsePlusOneCount(4)).toBe(3);
  });

  it('clamps negative to 0', () => {
    expect(parsePlusOneCount(-1)).toBe(0);
  });

  it('rounds down a float', () => {
    expect(parsePlusOneCount(1.9)).toBe(1);
  });

  it('returns 0 for NaN-producing string', () => {
    expect(parsePlusOneCount('3x')).toBe(0);
  });

  it('parses string "0" to 0', () => {
    expect(parsePlusOneCount('0')).toBe(0);
  });

  it('parses string "1" to 1', () => {
    expect(parsePlusOneCount('1')).toBe(1);
  });

  it('parses string "3" to 3', () => {
    expect(parsePlusOneCount('3')).toBe(3);
  });

  it('clamps string "4" to 3', () => {
    expect(parsePlusOneCount('4')).toBe(3);
  });

  it('clamps string "-1" to 0', () => {
    expect(parsePlusOneCount('-1')).toBe(0);
  });

  it('floors string "1.7" to 1', () => {
    expect(parsePlusOneCount('1.7')).toBe(1);
  });

  it('clamps number -5 to 0', () => {
    expect(parsePlusOneCount(-5)).toBe(0);
  });

  it('clamps number 100 to 3', () => {
    expect(parsePlusOneCount(100)).toBe(3);
  });

  it('coerces true to 1', () => {
    expect(parsePlusOneCount(true)).toBe(1);
  });

  it('coerces false to 0', () => {
    expect(parsePlusOneCount(false)).toBe(0);
  });
});
