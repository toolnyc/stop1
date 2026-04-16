import { describe, it, expect } from 'vitest';
import { getEffectivePrice, type PricingEvent } from './pricing';
import { easternToISO } from '@/lib/dates';

describe('getEffectivePrice', () => {
  const CUTOFF = '2026-04-19T00:00:00.000Z';
  const DOOR = 25;
  const EARLY = 10;

  describe('basic behavior', () => {
    it('returns door_price when both early fields are null', () => {
      const event: PricingEvent = { door_price: DOOR, early_price: null, early_cutoff: null };
      const result = getEffectivePrice(event, new Date('2026-04-18T12:00:00Z'));
      expect(result).toEqual({ price: DOOR, isEarly: false });
    });

    it('returns door_price when early_price is null but cutoff is set', () => {
      const event: PricingEvent = { door_price: DOOR, early_price: null, early_cutoff: CUTOFF };
      const result = getEffectivePrice(event, new Date('2026-04-18T12:00:00Z'));
      expect(result).toEqual({ price: DOOR, isEarly: false });
    });

    it('returns door_price when early_price is set but cutoff is null', () => {
      const event: PricingEvent = { door_price: DOOR, early_price: EARLY, early_cutoff: null };
      const result = getEffectivePrice(event, new Date('2026-04-18T12:00:00Z'));
      expect(result).toEqual({ price: DOOR, isEarly: false });
    });

    it('returns early_price before cutoff', () => {
      const event: PricingEvent = { door_price: DOOR, early_price: EARLY, early_cutoff: CUTOFF };
      const result = getEffectivePrice(event, new Date('2026-04-18T12:00:00Z'));
      expect(result).toEqual({ price: EARLY, isEarly: true });
    });

    it('returns door_price after cutoff', () => {
      const event: PricingEvent = { door_price: DOOR, early_price: EARLY, early_cutoff: CUTOFF };
      const result = getEffectivePrice(event, new Date('2026-04-19T12:00:00Z'));
      expect(result).toEqual({ price: DOOR, isEarly: false });
    });

    it('returns early_price of 0 (free) before cutoff without treating it as falsy', () => {
      const event: PricingEvent = { door_price: DOOR, early_price: 0, early_cutoff: CUTOFF };
      const result = getEffectivePrice(event, new Date('2026-04-18T12:00:00Z'));
      expect(result).toEqual({ price: 0, isEarly: true });
    });

    it('returns non-zero early_price before cutoff', () => {
      const event: PricingEvent = { door_price: DOOR, early_price: 10, early_cutoff: CUTOFF };
      const result = getEffectivePrice(event, new Date('2026-04-18T12:00:00Z'));
      expect(result).toEqual({ price: 10, isEarly: true });
    });
  });

  describe('boundary precision', () => {
    it('returns early_price 1 second before cutoff', () => {
      const event: PricingEvent = { door_price: DOOR, early_price: EARLY, early_cutoff: CUTOFF };
      const now = new Date(new Date(CUTOFF).getTime() - 1000);
      expect(getEffectivePrice(event, now)).toEqual({ price: EARLY, isEarly: true });
    });

    it('returns door_price at exact cutoff moment (< is strict)', () => {
      const event: PricingEvent = { door_price: DOOR, early_price: EARLY, early_cutoff: CUTOFF };
      const now = new Date(CUTOFF);
      expect(now.getTime()).toBe(new Date(CUTOFF).getTime());
      expect(getEffectivePrice(event, now)).toEqual({ price: DOOR, isEarly: false });
    });

    it('returns door_price 1 second after cutoff', () => {
      const event: PricingEvent = { door_price: DOOR, early_price: EARLY, early_cutoff: CUTOFF };
      const now = new Date(new Date(CUTOFF).getTime() + 1000);
      expect(getEffectivePrice(event, now)).toEqual({ price: DOOR, isEarly: false });
    });

    it('returns early_price 1 millisecond before cutoff', () => {
      const event: PricingEvent = { door_price: DOOR, early_price: EARLY, early_cutoff: CUTOFF };
      const now = new Date(new Date(CUTOFF).getTime() - 1);
      expect(getEffectivePrice(event, now)).toEqual({ price: EARLY, isEarly: true });
    });
  });

  describe('DST edge cases', () => {
    it('spring forward 2026 (March 8): cutoff at 20:00 Eastern converts correctly', () => {
      const cutoffUTC = easternToISO('2026-03-08T20:00');
      const event: PricingEvent = { door_price: DOOR, early_price: EARLY, early_cutoff: cutoffUTC };

      // Before cutoff
      const before = new Date(new Date(cutoffUTC).getTime() - 60_000);
      expect(getEffectivePrice(event, before)).toEqual({ price: EARLY, isEarly: true });

      // After cutoff
      const after = new Date(new Date(cutoffUTC).getTime() + 60_000);
      expect(getEffectivePrice(event, after)).toEqual({ price: DOOR, isEarly: false });
    });

    it('fall back 2026 (November 1): cutoff at 20:00 Eastern converts correctly', () => {
      const cutoffUTC = easternToISO('2026-11-01T20:00');
      const event: PricingEvent = { door_price: DOOR, early_price: EARLY, early_cutoff: cutoffUTC };

      // Before cutoff
      const before = new Date(new Date(cutoffUTC).getTime() - 60_000);
      expect(getEffectivePrice(event, before)).toEqual({ price: EARLY, isEarly: true });

      // After cutoff
      const after = new Date(new Date(cutoffUTC).getTime() + 60_000);
      expect(getEffectivePrice(event, after)).toEqual({ price: DOOR, isEarly: false });
    });
  });

  describe('integration round-trip', () => {
    it('easternToISO round-trip: 1 min before UTC cutoff returns early_price', () => {
      const cutoffUTC = easternToISO('2026-04-18T20:00');
      const event: PricingEvent = { door_price: DOOR, early_price: EARLY, early_cutoff: cutoffUTC };
      const now = new Date(new Date(cutoffUTC).getTime() - 60_000);
      expect(getEffectivePrice(event, now)).toEqual({ price: EARLY, isEarly: true });
    });

    it('easternToISO round-trip: 1 min after UTC cutoff returns door_price', () => {
      const cutoffUTC = easternToISO('2026-04-18T20:00');
      const event: PricingEvent = { door_price: DOOR, early_price: EARLY, early_cutoff: cutoffUTC };
      const now = new Date(new Date(cutoffUTC).getTime() + 60_000);
      expect(getEffectivePrice(event, now)).toEqual({ price: DOOR, isEarly: false });
    });
  });
});
