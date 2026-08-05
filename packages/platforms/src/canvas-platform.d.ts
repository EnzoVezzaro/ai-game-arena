import type { BridgeAction, BridgeCapabilities, BridgeConfig, BridgeGameState, BridgeObservation, GameBridge } from '@ai-game-arena/sdk';
import { BridgeEventEmitter } from './platform-adapter';
/**
 * Minimal API a canvas game exposes to the canvas bridge.
 *
 * Responsibilities (GAME_ENGINE.md): translate abstract input actions into
 * canvas input events, capture pixels, and collect observations.
 */
export interface CanvasGameHost {
    readonly name: string;
    /** Dispatch a translated input event onto the canvas (mouse, pointer, ...). */
    dispatchInput(type: string, payload: unknown): void | Promise<void>;
    /** Capture the canvas (pixels / buffer / state). */
    capturePixels(): unknown | Promise<unknown>;
    getPhase(): string;
    isRunning(): boolean;
    reset(): void | Promise<void>;
    pause(): void | Promise<void>;
    resume(): void | Promise<void>;
    dispose(): void | Promise<void>;
}
/**
 * Canvas platform bridge.
 *
 * ```
 * Engine → applyActions → CanvasBridge → host.dispatchInput → Game
 * Game   → host.capturePixels → CanvasBridge → observe → Engine
 * ```
 */
export declare class CanvasBridge extends BridgeEventEmitter implements GameBridge {
    readonly platform: "canvas";
    readonly capabilities: BridgeCapabilities;
    private host;
    private initialized;
    private running;
    private phase;
    attach(host: CanvasGameHost): void;
    getHost(): CanvasGameHost | null;
    initialize(config: BridgeConfig): Promise<void>;
    reset(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    dispose(): Promise<void>;
    applyActions(playerId: string, actions: BridgeAction[]): Promise<void>;
    observe(_playerId: string): Promise<BridgeObservation>;
    getState(): Promise<BridgeGameState>;
}
//# sourceMappingURL=canvas-platform.d.ts.map