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
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px; background-color: #f0ebe4; color: #1a1714;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="display: inline-block; background: #cd2e2a; color: #f0ebe4; font-weight: bold; font-size: 18px; padding: 6px 12px; letter-spacing: -0.03em;">S1</span>
        </div>
        <h1 style="color: #cd2e2a; font-size: 24px; font-weight: 700; letter-spacing: -0.03em; margin: 0 0 16px;">Tonight!</h1>
        <p style="margin: 0 0 8px;">Hey <strong>${name}</strong>!</p>
        <p style="margin: 0 0 24px;">Just a reminder &mdash; <strong>${event.title}</strong> is tonight.</p>
        <table style="margin: 0 0 24px; font-size: 14px; border-collapse: collapse;">
          <tr><td style="color: #6b6560; padding: 4px 16px 4px 0; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; font-weight: 500;">Time</td><td style="padding: 4px 0;">${timeFormatted}</td></tr>
          <tr><td style="color: #6b6560; padding: 4px 16px 4px 0; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; font-weight: 500;">Venue</td><td style="padding: 4px 0;">${venue}</td></tr>
          ${address ? `<tr><td style="color: #6b6560; padding: 4px 16px 4px 0; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; font-weight: 500;">Address</td><td style="padding: 4px 0;">${address}</td></tr>` : ''}
        </table>
        <p style="margin: 0 0 8px;">See you there!</p>
        <p style="color: #6b6560; font-size: 12px; margin-top: 32px; border-top: 1px solid #d0c9c1; padding-top: 16px;">&mdash; Stop One</p>
      </div>
    `,
  };
}
