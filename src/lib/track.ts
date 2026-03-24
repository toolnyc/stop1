/**
 * External service call tracker.
 *
 * Wraps calls to Twilio, Resend, Stripe, etc. with structured logging
 * so you always know: was it called? did it succeed? how long did it take?
 *
 * Usage:
 *   import { trackCall } from '@/lib/track';
 *
 *   const result = await trackCall({
 *     service: 'twilio',
 *     action: 'send-rsvp-sms',
 *     meta: { to: phone, eventSlug: slug },
 *     fn: () => twilioClient.messages.create({ to, from, body }),
 *   });
 *
 *   if (!result.ok) {
 *     // result.error has the message
 *   }
 */

import { log as rootLog, type Logger } from './logger';

interface TrackCallOptions<T> {
  /** Service name: 'twilio', 'resend', 'stripe', 'supabase', 'blob' */
  service: string;
  /** What we're doing: 'send-rsvp-sms', 'send-confirmation-email', 'create-payment-intent' */
  action: string;
  /** Extra context to log (mask PII — e.g. last 4 of phone) */
  meta?: Record<string, unknown>;
  /** The actual async operation */
  fn: () => Promise<T>;
  /** Optional parent logger (e.g. from withLogging) to inherit requestId */
  log?: Logger;
}

interface TrackResult<T> {
  ok: true;
  data: T;
  duration_ms: number;
}

interface TrackError {
  ok: false;
  error: string;
  duration_ms: number;
}

export type TrackOutcome<T> = TrackResult<T> | TrackError;

export async function trackCall<T>(opts: TrackCallOptions<T>): Promise<TrackOutcome<T>> {
  const logger = (opts.log ?? rootLog).child({ service: opts.service });
  const start = performance.now();

  logger.info(`${opts.action}.attempt`, opts.meta);

  try {
    const data = await opts.fn();
    const duration_ms = Math.round(performance.now() - start);

    logger.info(`${opts.action}.success`, { ...opts.meta, duration_ms });
    return { ok: true, data, duration_ms };
  } catch (err) {
    const duration_ms = Math.round(performance.now() - start);
    const error = err instanceof Error ? err.message : String(err);
    const code = (err as any)?.code;
    const status = (err as any)?.status ?? (err as any)?.statusCode;

    logger.error(`${opts.action}.failure`, {
      ...opts.meta,
      error,
      code,
      status,
      duration_ms,
    });

    return { ok: false, error, duration_ms };
  }
}

/** Mask a phone number for logging: +1234567890 → +1***7890 */
export function maskPhone(phone: string): string {
  if (phone.length <= 6) return '***';
  return phone.slice(0, 2) + '***' + phone.slice(-4);
}

/** Mask an email for logging: pete@example.com → p***@example.com */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return local[0] + '***@' + domain;
}
