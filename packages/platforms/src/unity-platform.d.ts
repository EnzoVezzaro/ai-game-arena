import type { BridgeAction, BridgeCapabilities, BridgeConfig, BridgeGameState, BridgeObservation, GameBridge } from '@ai-game-arena/sdk';
import { BridgeEventEmitter } from './platform-adapter';
export interface BridgeTransportMessage {
    readonly type: string;
    readonly id?: string;
    readonly payload?: unknown;
}
/**
 * Transport used by the Unity bridge. The engine does not care which transport
 * is used (WebSocket, Named Pipe, TCP, Shared Memory, Native Plugin).
 */
export interface BridgeTransport {
    readonly connected: boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    send(message: BridgeTransportMessage): Promise<void>;
    onMessage(handler: (message: BridgeTransportMessage) => void): void;
}
export interface UnityBridgeOptions {
    transport: BridgeTransport;
    /** Timeout (ms) waiting for observation replies. Default 5000. */
    captureTimeoutMs?: number;
}
/**
 * Unity platform bridge.
 *
 * ```
 * Engine → applyActions → UnityBridge → transport.send → Unity Input System
 * Unity  → transport message → UnityBridge → observe/getState → Engine
 * ```
 */
export declare class UnityBridge extends BridgeEventEmitter implements GameBridge {
    readonly platform: "unity";
    readonly capabilities: BridgeCapabilities;
    private readonly transport;
    private readonly captureTimeoutMs;
    private initialized;
    private state;
    private pending;
    private messageSeq;
    constructor(options: UnityBridgeOptions);
    getTransport(): BridgeTransport;
    private nextId;
    private handleMessage;
    initialize(config: BridgeConfig): Promise<void>;
    reset(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    dispose(): Promise<void>;
    applyActions(playerId: string, actions: BridgeAction[]): Promise<void>;
    observe(playerId: string): Promise<BridgeObservation>;
    getState(): Promise<BridgeGameState>;
}
//# sourceMappingURL=unity-platform.d.ts.map