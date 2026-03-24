/**
 * API route wrapper with structured logging and error handling.
 *
 * Usage:
 *   import { withLogging } from '@/lib/api';
 *   export const POST = withLogging(async ({ params, request, log, background }) => {
 *     log.info('doing something');
 *     // background() keeps the function alive for fire-and-forget work
 *     background(sendSms(phone, body, { log }));
 *     return Response.json({ ok: true });
 *   });
 *
 * What it does:
 * - Generates a requestId per request
 * - Logs request start & end with method, path, status, duration
 * - Catches unhandled errors and returns a clean 500
 * - Provides a child logger with requestId/route pre-filled
 * - Provides background() to register promises that must complete after response
 */

import type { APIContext, APIRoute } from 'astro';
import { waitUntil } from '@vercel/functions';
import { log as rootLog, type Logger } from './logger';

export interface LoggingAPIContext extends APIContext {
  log: Logger;
  requestId: string;
  /** Register a promise that must complete even after the response is sent.
   *  Uses Vercel's waitUntil to keep the function alive. */
  background: (promise: Promise<unknown>) => void;
}

type LoggingHandler = (context: LoggingAPIContext) => Promise<Response>;

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function withLogging(handler: LoggingHandler): APIRoute {
  return async (context: APIContext): Promise<Response> => {
    const requestId = crypto.randomUUID();
    const method = context.request.method;
    const path = context.url.pathname;
    const start = performance.now();

    const requestLog = rootLog.child({ requestId, method, path });

    requestLog.info('request.start');

    // Collect background promises so we can waitUntil them
    const backgroundPromises: Promise<unknown>[] = [];
    const background = (promise: Promise<unknown>) => {
      backgroundPromises.push(promise);
    };

    try {
      const loggingContext = Object.assign(context, {
        log: requestLog,
        requestId,
        background,
      }) as LoggingAPIContext;

      const response = await handler(loggingContext);
      const duration_ms = Math.round(performance.now() - start);

      requestLog.info('request.end', { status: response.status, duration_ms });

      // Keep function alive until all background work completes
      if (backgroundPromises.length > 0) {
        waitUntil(Promise.allSettled(backgroundPromises));
      }

      return response;
    } catch (err) {
      const duration_ms = Math.round(performance.now() - start);
      const errorMessage = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;

      requestLog.error('request.unhandled_error', {
        error: errorMessage,
        stack,
        duration_ms,
      });

      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }
  };
}
