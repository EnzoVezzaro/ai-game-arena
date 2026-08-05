export interface SessionConfig {
    readonly id: string;
    readonly seed?: number;
    readonly fps?: number;
    readonly maxTurns?: number;
    readonly turnTimeout?: number;
    readonly agents?: string[];
}
export interface SessionState {
    readonly phase: 'created' | 'running' | 'paused' | 'completed' | 'aborted';
    readonly currentTurn: number;
    readonly startedAt?: Date;
    readonly finishedAt?: Date;
}
export interface Session {
    readonly id: string;
    readonly config: SessionConfig;
    readonly state: SessionState;
    readonly players: string[];
}
//# sourceMappingURL=session.d.ts.map