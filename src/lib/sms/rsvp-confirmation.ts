import { EVENT_TIMEZONE } from '@/lib/constants';

/**
 * Build the SMS body for RSVP confirmation.
 * Kept under 160 chars for a single SMS segment (~$0.008/msg US).
 */
export function rsvpConfirmationSms(
  name: string,
  event: { title: string; date: string; venue_name: string | null },
): string {
  const d = new Date(event.date);
  const date = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: EVENT_TIMEZONE,
  });
  const venue = event.venue_name || 'TBA';
  return `You're on the list for ${event.title} on ${date} @ ${venue}. See you there!`;
}
