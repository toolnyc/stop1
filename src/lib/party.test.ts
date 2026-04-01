import { describe, it, expect } from 'vitest';
import { getPartyStatus, getUnarrivedSlots } from './party';

const arrived = '2026-04-01T22:00:00Z';

describe('getPartyStatus', () => {
  it('solo guest, not arrived', () => {
    const status = getPartyStatus({
      name: 'Jane',
      arrived_at: null,
      plus_one_count: 0,
      plus_ones_arrived: 0,
    });
    expect(status).toEqual({
      primaryArrived: false,
      guestsArrived: 0,
      total: 1,
      fullyArrived: false,
    });
  });

  it('solo guest, arrived', () => {
    const status = getPartyStatus({
      name: 'Jane',
      arrived_at: arrived,
      plus_one_count: 0,
      plus_ones_arrived: 0,
    });
    expect(status).toEqual({
      primaryArrived: true,
      guestsArrived: 0,
      total: 1,
      fullyArrived: true,
    });
  });

  it('party of 3, nobody arrived', () => {
    const status = getPartyStatus({
      name: 'Jane',
      arrived_at: null,
      plus_one_count: 2,
      plus_ones_arrived: 0,
    });
    expect(status).toEqual({
      primaryArrived: false,
      guestsArrived: 0,
      total: 3,
      fullyArrived: false,
    });
  });

  it('party of 3, primary arrived but not guests', () => {
    const status = getPartyStatus({
      name: 'Jane',
      arrived_at: arrived,
      plus_one_count: 2,
      plus_ones_arrived: 0,
    });
    expect(status).toEqual({
      primaryArrived: true,
      guestsArrived: 0,
      total: 3,
      fullyArrived: false,
    });
  });

  it('party of 3, 2 of 3 arrived (primary + 1 guest)', () => {
    const status = getPartyStatus({
      name: 'Jane',
      arrived_at: arrived,
      plus_one_count: 2,
      plus_ones_arrived: 1,
    });
    expect(status).toEqual({
      primaryArrived: true,
      guestsArrived: 1,
      total: 3,
      fullyArrived: false,
    });
  });

  it('party of 3, all arrived', () => {
    const status = getPartyStatus({
      name: 'Jane',
      arrived_at: arrived,
      plus_one_count: 2,
      plus_ones_arrived: 2,
    });
    expect(status).toEqual({
      primaryArrived: true,
      guestsArrived: 2,
      total: 3,
      fullyArrived: true,
    });
  });

  it('party of 4, guests arrived but not primary', () => {
    const status = getPartyStatus({
      name: 'Jane',
      arrived_at: null,
      plus_one_count: 3,
      plus_ones_arrived: 2,
    });
    expect(status).toEqual({
      primaryArrived: false,
      guestsArrived: 2,
      total: 4,
      fullyArrived: false,
    });
  });
});

describe('getUnarrivedSlots', () => {
  it('returns primary slot when solo and not arrived', () => {
    const slots = getUnarrivedSlots({
      name: 'Jane',
      arrived_at: null,
      plus_one_count: 0,
      plus_ones_arrived: 0,
    });
    expect(slots).toEqual([{ label: 'Jane', isGuest: false }]);
  });

  it('returns empty array when solo and already arrived', () => {
    const slots = getUnarrivedSlots({
      name: 'Jane',
      arrived_at: arrived,
      plus_one_count: 0,
      plus_ones_arrived: 0,
    });
    expect(slots).toEqual([]);
  });

  it('returns all slots when nobody in party has arrived', () => {
    const slots = getUnarrivedSlots({
      name: 'Jane',
      arrived_at: null,
      plus_one_count: 2,
      plus_ones_arrived: 0,
    });
    expect(slots).toEqual([
      { label: 'Jane', isGuest: false },
      { label: 'Guest 1', isGuest: true },
      { label: 'Guest 2', isGuest: true },
    ]);
  });

  it('omits primary when already arrived', () => {
    const slots = getUnarrivedSlots({
      name: 'Jane',
      arrived_at: arrived,
      plus_one_count: 2,
      plus_ones_arrived: 0,
    });
    expect(slots).toEqual([
      { label: 'Guest 1', isGuest: true },
      { label: 'Guest 2', isGuest: true },
    ]);
  });

  it('omits already-arrived guests (first N are considered arrived)', () => {
    const slots = getUnarrivedSlots({
      name: 'Jane',
      arrived_at: arrived,
      plus_one_count: 3,
      plus_ones_arrived: 2,
    });
    expect(slots).toEqual([{ label: 'Guest 3', isGuest: true }]);
  });

  it('returns empty when all arrived', () => {
    const slots = getUnarrivedSlots({
      name: 'Jane',
      arrived_at: arrived,
      plus_one_count: 2,
      plus_ones_arrived: 2,
    });
    expect(slots).toEqual([]);
  });
});
