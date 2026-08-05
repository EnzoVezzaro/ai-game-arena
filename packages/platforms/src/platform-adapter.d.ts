import type { BridgeEvent } from '@ai-game-arena/sdk';
/**
 * Shared event plumbing for Bridge implementations (GAME_ENGINE.md).
 *
 * Bridges emit events instead of exposing internal implementation. The engine
 * simply forwards them. Standard events: ready, started, paused, resumed,
 * reset, disposed, error. Custom events (goal, checkpoint, coin, death,
 * respawn, ...) are allowed and forwarded as-is.
 */
export declare abstract class BridgeEventEmitter {
    private handlers;
    private emitted;
    onEvent(handler: (event: BridgeEvent) => void): void;
    protected emit(type: string, data?: unknown): void;
    /** Emitted events so far (used by tests and the engine). */
    getEmittedEvents(): BridgeEvent[];
    clearEvents(): void;
}
//# sourceMappingURL=platform-adapter.d.ts.map