import type { ConfigReader } from '@ai-game-arena/sdk';
export declare class Config implements ConfigReader {
    private data;
    constructor(initial?: Record<string, unknown>);
    get<T>(key: string): T | undefined;
    getOrThrow<T>(key: string): T;
    has(key: string): boolean;
    getAll(): Record<string, unknown>;
    set(key: string, value: unknown): void;
    merge(other: Record<string, unknown>): void;
}
//# sourceMappingURL=config.d.ts.map