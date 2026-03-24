import twilio from 'twilio';
import { trackCall, maskPhone, type TrackOutcome } from './track';
import type { Logger } from './logger';

const accountSid = import.meta.env.TWILIO_ACCOUNT_SID;
const authToken = import.meta.env.TWILIO_AUTH_TOKEN;
const fromNumber = import.meta.env.TWILIO_FROM_NUMBER;

export const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

export const twilioConfigured = !!(twilioClient && fromNumber);

export async function sendSms(
  to: string,
  body: string,
  opts?: { action?: string; log?: Logger },
): Promise<TrackOutcome<boolean>> {
  if (!twilioClient || !fromNumber) {
    return {
      ok: false,
      error: `Twilio not configured (sid=${!!accountSid}, token=${!!authToken}, from=${!!fromNumber})`,
      duration_ms: 0,
    };
  }

  return trackCall({
    service: 'twilio',
    action: opts?.action ?? 'send-sms',
    meta: { to: maskPhone(to), bodyLength: body.length },
    log: opts?.log,
    fn: async () => {
      await twilioClient.messages.create({ to, from: fromNumber, body });
      return true;
    },
  });
}
