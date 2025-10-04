import { randomUUID } from 'crypto';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogEvent = {
  event: string;
  level?: LogLevel;
  message?: string;
  context?: Record<string, unknown>;
  error?: unknown;
  correlationId?: string;
  timestamp?: string;
};

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return error;
}

function shouldLog(level: LogLevel): boolean {
  const envLevel = (process.env.KAPGEL_LOG_MIN_LEVEL as LogLevel | undefined) ?? 'info';
  return levelPriority[level] >= levelPriority[envLevel];
}

export function logEvent(entry: LogEvent): void {
  const level: LogLevel = entry.level ?? 'info';
  if (!shouldLog(level)) return;

  const payload = {
    level,
    event: entry.event,
    message: entry.message ?? entry.event,
    timestamp: entry.timestamp ?? new Date().toISOString(),
    correlationId: entry.correlationId ?? randomUUID(),
    context: entry.context,
    error: entry.error ? normalizeError(entry.error) : undefined,
  };

  const serialized = JSON.stringify(payload);

  if (level === 'error') {
    console.error(serialized);
  } else if (level === 'warn') {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
}

export function createLogger(base: Partial<Pick<LogEvent, 'event' | 'context' | 'correlationId'>> = {}) {
  return {
    info(message: string, context?: Record<string, unknown>) {
      logEvent({ ...base, event: base.event ?? 'log', message, context: { ...base.context, ...context }, level: 'info', correlationId: base.correlationId });
    },
    warn(message: string, context?: Record<string, unknown>) {
      logEvent({ ...base, event: base.event ?? 'log', message, context: { ...base.context, ...context }, level: 'warn', correlationId: base.correlationId });
    },
    error(message: string, error: unknown, context?: Record<string, unknown>) {
      logEvent({ ...base, event: base.event ?? 'log', message, context: { ...base.context, ...context }, level: 'error', error, correlationId: base.correlationId });
    },
    debug(message: string, context?: Record<string, unknown>) {
      logEvent({ ...base, event: base.event ?? 'log', message, context: { ...base.context, ...context }, level: 'debug', correlationId: base.correlationId });
    },
  };
}
