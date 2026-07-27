export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  readonly component: string;
  readonly correlationId?: string;
  readonly battleId?: string;
  readonly agentId?: string;
  readonly pluginId?: string;
}

export interface Logger {
  debug(message: string, context?: LogContext, data?: unknown): void;
  info(message: string, context?: LogContext, data?: unknown): void;
  warn(message: string, context?: LogContext, data?: unknown): void;
  error(message: string, context?: LogContext, error?: Error): void;
  fatal(message: string, context?: LogContext, error?: Error): void;
  child(context: LogContext): Logger;
}
