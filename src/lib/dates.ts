import { EVENT_TIMEZONE } from './constants';

/**
 * Interpret a datetime-local string (e.g. "2026-04-18T20:00") as Eastern Time
 * and return an ISO 8601 UTC string suitable for storing in Postgres timestamptz.
 *
 * Without this, Supabase (whose session timezone is UTC) would interpret the
 * bare datetime as UTC, silently shifting the intended Eastern time by 4-5 hours.
 */
export function easternToISO(datetimeLocal: string): string {
  if (!datetimeLocal) return datetimeLocal;

  const [datePart, timePart] = datetimeLocal.split('T');
  if (!datePart || !timePart) return datetimeLocal;

  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = (timePart + ':0').split(':').map(Number);

  // Try both possible UTC offsets for America/New_York: -5 (EST) and -4 (EDT).
  // Verify which one produces the desired wall-clock time.
  for (const offset of [5, 4]) {
    const candidate = new Date(Date.UTC(year, month - 1, day, hours + offset, minutes));

    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: EVENT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(candidate);

    const get = (t: string) => parseInt(parts.find((p) => p.type === t)!.value);
    if (get('hour') === hours && get('day') === day && get('month') === month) {
      return candidate.toISOString();
    }
  }

  // Fallback: assume EST (-5)
  return new Date(Date.UTC(year, month - 1, day, hours + 5, minutes)).toISOString();
}

/**
 * Convert a UTC ISO string from the database into a datetime-local value
 * displayed in Eastern Time. Used to populate admin edit form inputs.
 *
 * Example: "2026-04-19T00:00:00Z" → "2026-04-18T20:00" (EDT)
 */
export function toDatetimeLocal(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  // Intl with hour12:false may return "24" for midnight in some engines
  const hour = get('hour') === '24' ? '00' : get('hour');

  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}
