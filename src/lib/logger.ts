/**
 * Structured logger for Stop One.
 *
 * In production (Vercel), outputs single-line JSON that Vercel's log system
 * parses automatically. In dev, outputs readable prefixed messages.
 *
 * Usage:
 *   import { log } from '@/lib/logger';
 *   log.info('RSVP created', { slug: 'pool-party', phone: '+1***' });
 *   log.error('DB insert failed', { error, table: 'rsvps' });
 *
 *   // Child logger with default fields:
 *   const smsLog = log.child({ service: 'twilio' });
 *   smsLog.info('SMS sent', { to: '+1***', duration_ms: 340 });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  msg: string;
  timestamp: string;
  [key: string]: unknown;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const IS_PROD = typeof process !== 'undefined'
  ? process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
  : false;

const MIN_LEVEL: LogLevel = IS_PROD ? 'info' : 'debug';

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[90m',  // gray
  info: '\x1b[36m',   // cyan
  warn: '\x1b[33m',   // yellow
  error: '\x1b[31m',  // red
};
const RESET = '\x1b[0m';

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];
}

function formatDev(entry: LogEntry): string {
  const color = LEVEL_COLORS[entry.level];
  const { level, msg, timestamp, ...rest } = entry;
  const extra = Object.keys(rest).length > 0 ? ' ' + JSON.stringify(rest) : '';
  return `${color}[${level.toUpperCase()}]${RESET} ${msg}${extra}`;
}

function emit(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return;

  if (IS_PROD) {
    // Single-line JSON for Vercel log parsing
    const output = JSON.stringify(entry);
    if (entry.level === 'error') {
      console.error(output);
    } else if (entry.level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  } else {
    // Pretty dev output
    const output = formatDev(entry);
    if (entry.level === 'error') {
      console.error(output);
    } else if (entry.level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }
}

export interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
  child(defaults: Record<string, unknown>): Logger;
}

function createLogger(defaults: Record<string, unknown> = {}): Logger {
  function write(level: LogLevel, msg: string, data?: Record<string, unknown>) {
    emit({
      level,
      msg,
      timestamp: new Date().toISOString(),
      ...defaults,
      ...data,
    });
  }

  return {
    debug: (msg, data) => write('debug', msg, data),
    info: (msg, data) => write('info', msg, data),
    warn: (msg, data) => write('warn', msg, data),
    error: (msg, data) => write('error', msg, data),
    child: (childDefaults) => createLogger({ ...defaults, ...childDefaults }),
  };
}

/** Root logger — import this everywhere */
export const log = createLogger();
