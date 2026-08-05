import type { Logger, LogLevel, LogContext } from '@ai-game-arena/sdk';
export declare class ConsoleLogger implements Logger {
    private minLevel;
    private context;
    constructor(minLevel?: LogLevel, context?: LogContext);
    debug(message: string, context?: LogContext, data?: unknown): void;
    info(message: string, context?: LogContext, data?: unknown): void;
    warn(message: string, context?: LogContext, data?: unknown): void;
    error(message: string, context?: LogContext, error?: Error): void;
    fatal(message: string, context?: LogContext, error?: Error): void;
    child(context: LogContext): Logger;
    private log;
}
//# sourceMappingURL=logger.d.ts.map