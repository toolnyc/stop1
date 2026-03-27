const EMAIL_FROM = import.meta.env.EMAIL_FROM || 'Stop One <noreply@stop1.party>';

/** Wordmark SVG (stop1 logotype) inlined as base64 so email clients render it without fetching. */
const WORDMARK_DATA_URI =
  'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDgwIiBoZWlnaHQ9IjEwODAiIHZpZXdCb3g9IjAgMCAxMDgwIDEwODAiPgogIDxwYXRoIGQ9Ik0xMjAuOCw1OTUuMjFoMjUuNTNjMy42NSwzNS4yNSwyNy45Niw0OS40NCw2MS41OSw0OS40NHM1My4wOC0xNi4yMSw1My4wOC00MC41Mi0xMi45Ny0zMC44LTU1LjkyLTQwLjUyYy00Mi41NS05LjcyLTc2LjU5LTE5Ljg2LTc2LjU5LTYwLjM4LDAtMzQuODUsMjkuOTktNTYuNzMsNzIuOTQtNTYuNzMsNDkuODQsMCw3Mi45NCwyNS4xMiw3Ny44LDYyaC0yNS4xMmMtMi44NC0yNy4xNS0yMS40Ny00MS4zMy01Mi42OC00MS4zM3MtNDcuODEsMTUuNC00Ny44MSwzNC44NWMwLDIzLjkxLDE5Ljg2LDI5LjU4LDU5Ljk3LDM4LjksNDIuMTQsOC45MSw3Mi41MywxOS40NSw3Mi41Myw2Mi44MSwwLDM3LjI4LTI5Ljk4LDYyLjQtNzguNjEsNjIuNC01NS45MiwwLTg0LjI4LTMwLjM5LTg2LjcxLTcwLjkxWiIvPgogIDxwYXRoIGQ9Ik0zMjAuMTcsNjI0LjM5di0xNTIuNzZoLTMxLjYxdi0yMC42N2gzMS42MXYtNjQuNDNoMjUuMTJ2NjQuNDNoMzguOXYyMC42N2gtMzguOXYxNDguNzFjMCwxNC45OSw2Ljg5LDE5Ljg2LDIwLjI2LDE5Ljg2LDUuNjcsMCwxMi45Ny0xLjYyLDE2LjYxLTMuMjRoMS4yMXYyMS40OGMtNi44OSwyLjQzLTE0LjE4LDMuNjUtMjMuMSwzLjY1LTIzLjkxLDAtNDAuMTItMTAuOTQtNDAuMTItMzcuNjlaIi8+CiAgPHBhdGggZD0iTTM5My45Miw1NTUuOTFjMC02Mi40LDM2Ljg4LTEwOS44MSw5Ny4yNS0xMDkuODFzOTYuNDQsNDcuNDEsOTYuNDQsMTA5LjgxLTM2LjA2LDEwOS44MS05Ni40NCwxMDkuODEtOTcuMjUtNDcuNDEtOTcuMjUtMTA5LjgxWk01NjIuMDgsNTU1LjkxYzAtNDkuMDMtMjQuMzEtODguNzQtNzAuOTEtODguNzRzLTcxLjMyLDM5LjcxLTcxLjMyLDg4Ljc0LDI0LjMxLDg4Ljc0LDcxLjMyLDg4Ljc0LDcwLjkxLTM5LjcxLDcwLjkxLTg4Ljc0WiIvPgogIDxwYXRoIGQ9Ik02MTEuMTIsNDUwLjk2aDI1LjEydjM2LjA2aC44MWMxNC41OS0yNC43MiwzNy42OS00MC41Miw3MC45MS00MC41Miw1MC4yNSwwLDg2LjcxLDM5LjcxLDg2LjcxLDEwOS40MSwwLDY0LjQzLTMzLjIzLDEwOS44MS04OC4zNCwxMDkuODEtMzIuMDEsMC01My40OS0xMi41Ni02OS4yOS0zNS42NmgtLjgxdjk3LjY2aC0yNS4xMnYtMjc2Ljc2Wk03NjkuMTUsNTU2LjMxYzAtNTIuMjctMjIuNjktODguNzQtNjQuNDMtODguNzQtNDYuMTksMC03MC41MSwzOS4zMS03MC41MSw4OS4xNXMyMy4xLDg3LjkzLDcwLjkxLDg3LjkzYzQyLjk1LDAsNjQuMDItMzkuNzEsNjQuMDItODguMzRaIi8+CiAgPHBhdGggZD0iTTg2My4xNiw0OTkuMThoLTU2Ljczdi01NS41MWM0MC4xMi0xLjYyLDY5LjI5LTIzLjkxLDc3LjQtNjMuMjFoNjAuMzh2MjgwaC04MS4wNHYtMTYxLjI3WiIvPgo8L3N2Zz4=';

export function rsvpConfirmationEmail(
  name: string,
  email: string,
  event: { title: string; date: string; venue_name: string | null },
) {
  const eventDate = new Date(event.date);
  const tz = 'America/New_York';
  const dateFormatted = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: tz,
  });
  const timeFormatted = eventDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz,
  });

  const venue = event.venue_name || 'TBA';

  return {
    from: EMAIL_FROM,
    to: email,
    subject: `You're on the list for ${event.title}!`,
    text: `Hi ${name}, you're confirmed for ${event.title} on ${dateFormatted} at ${timeFormatted} at ${venue}. See you there!`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px; background-color: #f0ebe4; color: #1a1714;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${WORDMARK_DATA_URI}" alt="stop1" width="120" height="120" style="display: inline-block; width: 120px; height: auto;" />
        </div>
        <h1 style="color: #1a1714; font-size: 24px; font-weight: 700; letter-spacing: -0.03em; margin: 0 0 16px;">You're on the list!</h1>
        <p style="margin: 0 0 8px;">Hi <strong>${name}</strong>,</p>
        <p style="margin: 0 0 24px;">You're confirmed for <strong>${event.title}</strong>.</p>
        <table style="margin: 0 0 24px; font-size: 14px; border-collapse: collapse;">
          <tr><td style="color: #6b6560; padding: 4px 16px 4px 0; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; font-weight: 500;">Date</td><td style="padding: 4px 0;">${dateFormatted}</td></tr>
          <tr><td style="color: #6b6560; padding: 4px 16px 4px 0; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; font-weight: 500;">Time</td><td style="padding: 4px 0;">${timeFormatted}</td></tr>
          <tr><td style="color: #6b6560; padding: 4px 16px 4px 0; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; font-weight: 500;">Venue</td><td style="padding: 4px 0;">${venue}</td></tr>
        </table>
        <p style="margin: 0 0 8px;">See you there!</p>
        <p style="color: #6b6560; font-size: 12px; margin-top: 32px; border-top: 1px solid #d0c9c1; padding-top: 16px;">&mdash; Stop One</p>
      </div>
    `,
  };
}
