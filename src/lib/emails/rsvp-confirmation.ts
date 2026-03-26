import { EVENT_TIMEZONE } from '@/lib/constants';

const EMAIL_FROM = import.meta.env.EMAIL_FROM || 'Stop One <noreply@stop1.party>';

export function rsvpConfirmationEmail(
  name: string,
  email: string,
  event: {
    title: string;
    date: string;
    time_end: string | null;
    door_price: number;
    venue_name: string | null;
    venue_address: string | null;
  },
) {
  const eventDate = new Date(event.date);
  const dateFormatted = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: EVENT_TIMEZONE,
  });
  const startTime = eventDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: EVENT_TIMEZONE,
  });

  let timeDisplay = startTime;
  if (event.time_end) {
    const endDate = new Date(event.time_end);
    const endTime = endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: EVENT_TIMEZONE,
    });
    timeDisplay = `${startTime} – ${endTime}`;
  }

  const venue = event.venue_name || 'TBA';

  const priceText = event.door_price === 0 ? 'Free' : `$${event.door_price.toFixed(2)}`;

  // Build details rows for HTML
  const detailRows = [
    `<tr><td style="color: #666666; padding: 4px 16px 4px 0; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; font-weight: 500;">Date</td><td style="padding: 4px 0;">${dateFormatted}</td></tr>`,
    `<tr><td style="color: #666666; padding: 4px 16px 4px 0; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; font-weight: 500;">Time</td><td style="padding: 4px 0;">${timeDisplay}</td></tr>`,
    `<tr><td style="color: #666666; padding: 4px 16px 4px 0; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; font-weight: 500;">Venue</td><td style="padding: 4px 0;">${venue}</td></tr>`,
  ];

  if (event.venue_address) {
    detailRows.push(
      `<tr><td style="color: #666666; padding: 4px 16px 4px 0; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; font-weight: 500;">Address</td><td style="padding: 4px 0;">${event.venue_address}</td></tr>`,
    );
  }

  detailRows.push(
    `<tr><td style="color: #666666; padding: 4px 16px 4px 0; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; font-weight: 500;">Price</td><td style="padding: 4px 0;">${priceText}</td></tr>`,
  );

  // Build plain text
  const textParts = [
    `Hi ${name}, you're confirmed for ${event.title}.`,
    `Date: ${dateFormatted}`,
    `Time: ${timeDisplay}`,
    `Venue: ${venue}`,
  ];
  if (event.venue_address) {
    textParts.push(`Address: ${event.venue_address}`);
  }
  textParts.push(`Price: ${priceText}`);
  textParts.push('See you there!');

  return {
    from: EMAIL_FROM,
    to: email,
    subject: `You're on the list for ${event.title}!`,
    text: textParts.join('\n'),
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px; background-color: #f5f3f0; color: #1a1816;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="https://stop1.party/images/wordmark.png" alt="Stop One" style="height: 28px; width: auto;" />
        </div>
        <h1 style="color: #1a1816; font-size: 24px; font-weight: 700; letter-spacing: -0.03em; margin: 0 0 16px;">You're on the list!</h1>
        <p style="margin: 0 0 8px;">Hi <strong>${name}</strong>,</p>
        <p style="margin: 0 0 24px;">You're confirmed for <strong>${event.title}</strong>.</p>
        <table style="margin: 0 0 24px; font-size: 14px; border-collapse: collapse;">
          ${detailRows.join('\n          ')}
        </table>
        <p style="margin: 0 0 8px;">See you there!</p>
        <p style="color: #666666; font-size: 12px; margin-top: 32px; border-top: 1px solid #d8d6d3; padding-top: 16px;">&mdash; Stop One</p>
      </div>
    `,
  };
}
