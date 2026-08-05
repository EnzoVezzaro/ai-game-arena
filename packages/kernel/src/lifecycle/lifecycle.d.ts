import type { Logger } from '@ai-game-arena/sdk';
export type LifecyclePhase = 'created' | 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
export interface LifecycleHook {
    onStart?(): Promise<void>;
    onStop?(): Promise<void>;
    onHealthCheck?(): Promise<HealthStatus>;
}
export interface HealthStatus {
    healthy: boolean;
    message?: string;
    details?: Record<string, unknown>;
}
export declare class LifecycleManager {
    private phase;
    private hooks;
    private logger;
    constructor(logger: Logger);
    addHook(hook: LifecycleHook): void;
    getPhase(): LifecyclePhase;
    start(): Promise<void>;
    stop(): Promise<void>;
    healthCheck(): Promise<HealthStatus>;
}
//# sourceMappingURL=lifecycle.d.ts.map