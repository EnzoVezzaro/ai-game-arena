import type { ArenaPlugin, AgentAction, AgentConfig, WorldState, ValidationResult, ActionOutcome, Observation, Logger, EventBus } from '@ai-game-arena/sdk';
import { AgentSandbox } from './agent-sandbox';
import type { GameBridge } from '@ai-game-arena/platforms';
import { ObservationSystem } from '@ai-game-arena/engine';
export interface MatchEngineConfig {
    maxTurns: number;
    turnTimeout: number;
    seed: number;
}
export interface MatchEngineState {
    phase: 'waiting' | 'running' | 'paused' | 'completed' | 'aborted';
    currentTurn: number;
    worldState: WorldState | null;
    scores: Record<string, number>;
}
export interface TurnResult {
    turnNumber: number;
    agentId: string;
    action: AgentAction;
    validation: ValidationResult;
    outcome: ActionOutcome;
    observation: Observation;
    duration: number;
}
export interface MatchResult {
    state: MatchEngineState;
    winner?: string;
    reason?: string;
    turns: TurnResult[];
    duration: number;
}
export interface MatchEngineOptions {
    logger: Logger;
    eventBus?: EventBus;
    battleId?: string;
    /** Game id when the battle targets a specific game (drives bridge selection). */
    gameId?: string;
    visibility?: 'perfect' | 'filtered' | 'private';
    observationFilter?: (observation: Observation, agentId: string) => Observation;
    observationSystem?: ObservationSystem;
    adapterFactory?: (gameId?: string) => GameBridge | null;
    onAgentBlocked?: (agentId: string, error: string) => void;
    onAgentUnblocked?: (agentId: string) => void;
}
export type ErrorCategory = 'auth' | 'billing' | 'rate-limit' | 'transient' | 'unknown';
export declare function classifyError(message: string): ErrorCategory;
export declare class MatchEngine {
    private config;
    private arena;
    private agents;
    private state;
    private turnResults;
    private startTime;
    private sandboxes;
    private logger;
    private eventBus?;
    private visibility;
    private observationFilter?;
    private observationSystem?;
    private adapterFactory?;
    private battleId;
    private gameId?;
    private bridge;
    private lastBridgeObservation;
    private agentErrors;
    private agentRetries;
    private lastPublishedScores;
    private onAgentBlocked?;
    private onAgentUnblocked?;
    constructor(arena: ArenaPlugin, agents: AgentConfig[], config: MatchEngineConfig, options?: MatchEngineOptions);
    getState(): MatchEngineState;
    start(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    abort(_reason: string): void;
    private createBridge;
    private getObservationForAgent;
    /** Forward bridge events to the engine's event bus (the engine does not interpret them). */
    private onBridgeEvent;
    /** Render state from the bridge (for the UI), separate from observations. */
    getBridgeRenderState(): Record<string, unknown> | null;
    private runMatchLoop;
    private finish;
    private allAgentsHaveNonRecoverableErrors;
    private describeErrors;
    private publishScoreUpdates;
    private publishEvent;
    getTurnResults(): TurnResult[];
    getMatchResult(): MatchResult;
    getSandbox(agentId: string): AgentSandbox | undefined;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=match-engine.d.ts.map