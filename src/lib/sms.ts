import twilio from 'twilio';

const accountSid = import.meta.env.TWILIO_ACCOUNT_SID;
const authToken = import.meta.env.TWILIO_AUTH_TOKEN;
const fromNumber = import.meta.env.TWILIO_FROM_NUMBER;

export const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendSms(to: string, body: string): Promise<boolean> {
  if (!twilioClient || !fromNumber) return false;
  try {
    await twilioClient.messages.create({ to, from: fromNumber, body });
    return true;
  } catch (err) {
    console.error('[twilio] SMS send error:', err);
    return false;
  }
}
