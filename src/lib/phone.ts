import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Normalize a raw phone input to E.164 format.
 * US numbers work without '+' prefix; international numbers need '+'.
 * Returns null if the input is not a valid phone number.
 */
export function normalizePhone(raw: string, defaultCountry: 'US' | string = 'US'): string | null {
  if (!raw || !raw.trim()) return null;
  const parsed = parsePhoneNumberFromString(raw.trim(), defaultCountry as any);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.format('E.164');
}

/** Format E.164 phone for human-readable display. */
export function formatPhoneDisplay(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed) return e164;
  return parsed.formatNational();
}
