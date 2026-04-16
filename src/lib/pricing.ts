import type { PricingEvent } from './pricing';

export interface PricingEvent {
  door_price: number;
  early_price: number | null;
  early_cutoff: string | null;
}

export function getEffectivePrice(
  event: PricingEvent,
  now: Date = new Date(),
): { price: number; isEarly: boolean } {
  if (
    event.early_price !== null &&
    event.early_price !== undefined &&
    event.early_cutoff !== null &&
    now < new Date(event.early_cutoff)
  ) {
    return { price: event.early_price, isEarly: true };
  }
  return { price: event.door_price, isEarly: false };
}
