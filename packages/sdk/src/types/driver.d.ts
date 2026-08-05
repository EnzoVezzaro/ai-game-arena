export interface InputTransport {
    readonly type: string;
    readonly name: string;
    sendInput(events: unknown[]): Promise<void>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
}
export interface Driver {
    readonly name: string;
    readonly type: string;
    initialize(): Promise<void>;
    translate(intent: unknown): Promise<unknown>;
    inject(input: unknown): Promise<void>;
    getLatency(): Promise<number>;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=driver.d.ts.map