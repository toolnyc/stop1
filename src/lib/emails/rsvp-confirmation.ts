const EMAIL_FROM = import.meta.env.EMAIL_FROM || 'Stop One <noreply@stop1.party>';

export function rsvpConfirmationEmail(
  name: string,
  email: string,
  event: { title: string; date: string; venue_name: string | null }
) {
  const eventDate = new Date(event.date);
  const dateFormatted = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timeFormatted = eventDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const venue = event.venue_name || 'TBA';

  return {
    from: EMAIL_FROM,
    to: email,
    subject: `You're on the list for ${event.title}!`,
    text: `Hi ${name}, you're confirmed for ${event.title} on ${dateFormatted} at ${timeFormatted} at ${venue}. See you there!`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h1 style="color: #e8ff00; font-size: 24px;">You're on the list!</h1>
        <p>Hi <strong>${name}</strong>,</p>
        <p>You're confirmed for <strong>${event.title}</strong>.</p>
        <table style="margin: 24px 0; font-size: 14px;">
          <tr><td style="color: #888; padding-right: 16px;">Date</td><td>${dateFormatted}</td></tr>
          <tr><td style="color: #888; padding-right: 16px;">Time</td><td>${timeFormatted}</td></tr>
          <tr><td style="color: #888; padding-right: 16px;">Venue</td><td>${venue}</td></tr>
        </table>
        <p>See you there!</p>
        <p style="color: #888; font-size: 12px; margin-top: 32px;">— Stop One</p>
      </div>
    `,
  };
}
