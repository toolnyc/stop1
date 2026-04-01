export interface PartyRsvp {
  name: string;
  arrived_at: string | null;
  plus_one_count: number;
  plus_ones_arrived: number;
}

export interface PartyStatus {
  primaryArrived: boolean;
  guestsArrived: number;
  total: number;
  fullyArrived: boolean;
}

export interface PartySlot {
  label: string;
  isGuest: boolean;
}

export function getPartyStatus(rsvp: PartyRsvp): PartyStatus {
  const primaryArrived = rsvp.arrived_at !== null;
  const guestsArrived = rsvp.plus_ones_arrived;
  const total = 1 + rsvp.plus_one_count;
  const fullyArrived = primaryArrived && guestsArrived === rsvp.plus_one_count;
  return { primaryArrived, guestsArrived, total, fullyArrived };
}

/**
 * Returns the list of un-arrived slots to show in the door check-in overlay.
 * Guests are anonymous and numbered from 1. Already-arrived guests are the
 * first N slots (guests arrive in order), so un-arrived guests start at
 * plus_ones_arrived + 1.
 */
export function getUnarrivedSlots(rsvp: PartyRsvp): PartySlot[] {
  const slots: PartySlot[] = [];

  if (!rsvp.arrived_at) {
    slots.push({ label: rsvp.name, isGuest: false });
  }

  for (let i = rsvp.plus_ones_arrived + 1; i <= rsvp.plus_one_count; i++) {
    slots.push({ label: `Guest ${i}`, isGuest: true });
  }

  return slots;
}
