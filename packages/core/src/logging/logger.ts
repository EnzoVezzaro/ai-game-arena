import type { Logger, LogLevel, LogContext } from '@ai-game-arena/sdk';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m', // green
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
  fatal: '\x1b[35m', // magenta
};

const RESET = '\x1b[0m';

export class ConsoleLogger implements Logger {
  private minLevel: number;
  private context: LogContext;

  constructor(minLevel: LogLevel = 'info', context: LogContext = { component: 'app' }) {
    this.minLevel = LOG_LEVELS[minLevel];
    this.context = context;
  }

  debug(message: string, context?: LogContext, data?: unknown): void {
    this.log('debug', message, context, data);
  }

  info(message: string, context?: LogContext, data?: unknown): void {
    this.log('info', message, context, data);
  }

  warn(message: string, context?: LogContext, data?: unknown): void {
    this.log('warn', message, context, data);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log('error', message, context, error);
  }

  fatal(message: string, context?: LogContext, error?: Error): void {
    this.log('fatal', message, context, error);
  }

  child(context: LogContext): Logger {
    return new ConsoleLogger(
      Object.keys(LOG_LEVELS).find((k) => LOG_LEVELS[k as LogLevel] === this.minLevel) as LogLevel,
      { ...this.context, ...context },
    );
  }

  private log(level: LogLevel, message: string, context?: LogContext, data?: unknown): void {
    if (LOG_LEVELS[level] < this.minLevel) return;

    const mergedContext = { ...this.context, ...context };
    const timestamp = new Date().toISOString();
    const color = LEVEL_COLORS[level];
    const prefix = `${color}[${timestamp}] ${level.toUpperCase()}${RESET}`;
    const ctxStr = `[${mergedContext.component}]${mergedContext.correlationId ? ` [${mergedContext.correlationId}]` : ''}`;

    const logMessage = `${prefix} ${ctxStr} ${message}`;

    if (data !== undefined) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
}
