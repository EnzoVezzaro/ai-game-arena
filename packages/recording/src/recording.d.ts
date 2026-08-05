export interface ReplayEntry {
    readonly frame: number;
    readonly port: number;
    readonly event: unknown;
}
export declare class Recording {
    readonly meta: Record<string, unknown>;
    constructor(meta?: Record<string, unknown>);
    readonly entries: ReplayEntry[];
    push(entry: ReplayEntry): void;
    get length(): number;
    toJSON(): unknown;
}
//# sourceMappingURL=recording.d.ts.map