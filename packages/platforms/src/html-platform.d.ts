import type { BridgeAction, BridgeCapabilities, BridgeConfig, BridgeGameState, BridgeObservation, Controller, GameBridge } from '@ai-game-arena/sdk';
import { BridgeEventEmitter } from './platform-adapter';
/**
 * Minimal API an HTML game exposes to the HTML bridge.
 *
 * The HTML Bridge is responsible for exactly four things (GAME_ENGINE.md):
 * attach to an existing game instance, inject the runtime, receive abstract
 * actions and dispatch them as DOM/native events, and collect observations.
 */
export interface HtmlGameHost {
    readonly name: string;
    /** Dispatch a translated event into the game (e.g. a KeyboardEvent). */
    dispatchEvent(type: string, payload: unknown): void | Promise<void>;
    /** Collect an observation (DOM snapshot, canvas, screenshot, state). */
    capture(): unknown | Promise<unknown>;
    getPhase(): string;
    isRunning(): boolean;
    reset(): void | Promise<void>;
    pause(): void | Promise<void>;
    resume(): void | Promise<void>;
    dispose(): void | Promise<void>;
    /** Optional: game-originated events (goal, checkpoint, coin, death, ...). */
    onGameEvent?(handler: (type: string, data?: unknown) => void): void;
    /**
     * Optional: a player-facing structured observation (positions, board,
     * available actions). When absent, the bridge falls back to `capture()`.
     * The engine treats the observation as opaque data; a readable observation
     * lets the agent actually play the game.
     */
    captureObservation?(playerId: string): unknown | Promise<unknown>;
}
export interface HTMLBridgeOptions {
    /** Optional browser-style target for postMessage-based hosts. */
    target?: {
        postMessage(message: unknown): void;
    } | null;
    /**
     * Public URL of the game entry (rendered in an iframe by the UI). When set,
     * the bridge can run without a server-side host: the game lives in the
     * browser and `getRenderState()` reports this URL.
     */
    url?: string;
}
/**
 * HTML platform bridge.
 *
 * ```
 * Engine → applyActions → HTMLBridge → host.dispatchEvent → Game
 * Game   → host.capture  → HTMLBridge → observe → Engine
 * ```
 *
 * The bridge translates engine requests into native game operations. It never
 * contains game logic, never opens tabs and never performs navigation.
 */
export declare class HTMLBridge extends BridgeEventEmitter implements GameBridge {
    readonly platform: "html";
    readonly capabilities: BridgeCapabilities;
    private host;
    private initialized;
    private running;
    private phase;
    private readonly target?;
    private readonly url?;
    constructor(options?: HTMLBridgeOptions);
    /** True when the game has no server-side host (it lives in the browser iframe). */
    private get remote();
    /** Attach the bridge to an existing game instance (never opens tabs). */
    attach(host: HtmlGameHost): void;
    getHost(): HtmlGameHost | null;
    initialize(config: BridgeConfig): Promise<void>;
    reset(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    dispose(): Promise<void>;
    applyActions(playerId: string, actions: BridgeAction[]): Promise<void>;
    observe(playerId: string): Promise<BridgeObservation>;
    getState(): Promise<BridgeGameState>;
    /** Render payload for spectators/UI — separate from the agent observation. */
    getRenderState(): Record<string, unknown> | null;
    /**
     * Generic action vocabulary for HTML games: press a key, click a position,
     * or pass. Each tool dispatches through `applyActions`, so hosts and remote
     * iframes receive the same abstract actions.
     */
    registerTools(controller: Controller, playerId?: string): void;
}
//# sourceMappingURL=html-platform.d.ts.map