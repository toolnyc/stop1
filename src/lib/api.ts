/**
 * API route wrapper with structured logging and error handling.
 *
 * Usage:
 *   import { withLogging } from '@/lib/api';
 *   export const POST = withLogging(async ({ params, request, log }) => {
 *     log.info('doing something');
 *     return Response.json({ ok: true });
 *   });
 *
 * What it does:
 * - Generates a requestId per request
 * - Logs request start & end with method, path, status, duration
 * - Catches unhandled errors and returns a clean 500
 * - Provides a child logger with requestId/route pre-filled
 */

import type { APIContext, APIRoute } from 'astro';
import { log as rootLog, type Logger } from './logger';

export interface LoggingAPIContext extends APIContext {
  log: Logger;
  requestId: string;
  /** Queue a promise that must finish before the function shuts down. */
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

    // Collect background promises so the function stays alive until they settle.
    // On Vercel the adapter exposes waitUntil; locally we just await at the end.
    const pending: Promise<unknown>[] = [];
    const waitUntil = (context.locals as Record<string, unknown>).vercel
      ? (
          (context.locals as Record<string, unknown>).vercel as Record<
            string,
            Record<string, (p: Promise<unknown>) => void>
          >
        ).edge?.waitUntil
      : undefined;

    const background = (promise: Promise<unknown>) => {
      if (waitUntil) {
        waitUntil(promise);
      } else {
        pending.push(promise);
      }
    };

    try {
      const loggingContext = Object.assign(context, {
        log: requestLog,
        requestId,
        background,
      }) as LoggingAPIContext;

      const response = await handler(loggingContext);

      // In local dev (no waitUntil), drain background tasks before returning.
      if (pending.length > 0) {
        await Promise.allSettled(pending);
      }

      const duration_ms = Math.round(performance.now() - start);

      requestLog.info('request.end', { status: response.status, duration_ms });
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
