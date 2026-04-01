/**
 * Build the SMS body for RSVP confirmation.
 * Kept under 160 chars for a single SMS segment (~$0.008/msg US).
 */
export function rsvpConfirmationSms(
  name: string,
  event: { title: string; date: string; venue_name: string | null },
  plusOneCount = 0,
): string {
  const d = new Date(event.date);
  const date = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York',
  });
  const venue = event.venue_name || 'TBA';
  const party =
    plusOneCount > 0
      ? ` You + ${plusOneCount} guest${plusOneCount > 1 ? 's' : ''} are on the list.`
      : '';
  return `You're on the list for ${event.title} on ${date} @ ${venue}.${party} See you there!`;
}
