import { BridgeEventEmitter } from '@ai-game-arena/platforms';
import type { BridgeAction, BridgeCapabilities, BridgeConfig, BridgeEvent, BridgeGameState, BridgeObservation, Controller, GameBridge } from '@ai-game-arena/sdk';
/**
 * Battle Royale bridge.
 *
 * Wraps the battle-royale game logic (rules-only) so the engine
 * can drive the game through the standard bridge contract. The
 * bridge produces grid-state observations and a grid render state
 * for the UI.
 */
export declare class BattleRoyaleBridge extends BridgeEventEmitter implements GameBridge {
    readonly platform = "battle-royale";
    readonly capabilities: BridgeCapabilities;
    private state;
    private agentIds;
    private agentNames;
    initialize(config: BridgeConfig): Promise<void>;
    reset(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    dispose(): Promise<void>;
    applyActions(playerId: string, actions: BridgeAction[]): Promise<void>;
    observe(playerId: string): Promise<BridgeObservation>;
    getState(): Promise<BridgeGameState>;
    onEvent(handler: (event: BridgeEvent) => void): void;
    registerTools(_controller: Controller, _playerId?: string): void;
    getScores(): Record<string, number>;
    getWinner(): string | null;
    getRenderState(): Record<string, unknown> | null;
    private buildUnits;
}
//# sourceMappingURL=battle-royale-bridge.d.ts.map