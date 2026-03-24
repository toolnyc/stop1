const EMAIL_FROM = import.meta.env.EMAIL_FROM || 'Stop One <noreply@stop1.party>';

export function dayOfReminderEmail(
  name: string,
  email: string,
  event: { title: string; date: string; venue_name: string | null; venue_address: string | null }
) {
  const eventDate = new Date(event.date);
  const timeFormatted = eventDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const venue = event.venue_name || 'TBA';
  const address = event.venue_address || '';

  return {
    from: EMAIL_FROM,
    to: email,
    subject: `Tonight: ${event.title}`,
    text: `Hey ${name}! Just a reminder — ${event.title} is tonight at ${timeFormatted}. ${venue}${address ? `, ${address}` : ''}. See you there!`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h1 style="color: #e8ff00; font-size: 24px;">Tonight!</h1>
        <p>Hey <strong>${name}</strong>!</p>
        <p>Just a reminder — <strong>${event.title}</strong> is tonight.</p>
        <table style="margin: 24px 0; font-size: 14px;">
          <tr><td style="color: #888; padding-right: 16px;">Time</td><td>${timeFormatted}</td></tr>
          <tr><td style="color: #888; padding-right: 16px;">Venue</td><td>${venue}</td></tr>
          ${address ? `<tr><td style="color: #888; padding-right: 16px;">Address</td><td>${address}</td></tr>` : ''}
        </table>
        <p>See you there!</p>
        <p style="color: #888; font-size: 12px; margin-top: 32px;">— Stop One</p>
      </div>
    `,
  };
}
