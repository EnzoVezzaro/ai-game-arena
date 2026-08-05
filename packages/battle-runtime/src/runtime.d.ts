import type { AgentConfig, ArenaPlugin, BattleConfig, Logger, EventBus } from '@ai-game-arena/sdk';
import { MatchEngine } from '@ai-game-arena/engine';
import type { StorageAdapter } from '@ai-game-arena/sdk';
import type { GameBridge } from '@ai-game-arena/controllers';
export interface BattleSession {
    id: string;
    arenaId: string;
    gameId?: string;
    agents: AgentConfig[];
    config: BattleConfig;
    state: BattleState;
    matchEngine: MatchEngine | null;
    createdAt: Date;
    startedAt?: Date;
    finishedAt?: Date;
}
export type BattlePhase = 'created' | 'initializing' | 'running' | 'paused' | 'completed' | 'aborted';
export interface BattleState {
    phase: BattlePhase;
    currentTurn: number;
    scores: Record<string, number>;
}
export interface RuntimeOptions {
    logger: Logger;
    eventBus: EventBus;
    storage: StorageAdapter;
    adapterFactory?: (gameId?: string) => GameBridge | null;
}
export declare class Runtime {
    private battles;
    private arenas;
    private logger;
    private storage;
    private wrappedEventBus;
    private adapterFactory;
    constructor(options: RuntimeOptions);
    registerArena(id: string, arena: ArenaPlugin): void;
    getArena(id: string): ArenaPlugin | undefined;
    getArenas(): ArenaPlugin[];
    abortBattle(battleId: string): Promise<void>;
    createBattle(arenaId: string, agents: AgentConfig[], config?: Partial<BattleConfig>): Promise<BattleSession>;
    startBattle(battleId: string): Promise<void>;
    pauseBattle(battleId: string): Promise<void>;
    resumeBattle(battleId: string): Promise<void>;
    getBattle(battleId: string): BattleSession | undefined;
    getBattleRenderState(battleId: string): Record<string, unknown> | null;
    getAllBattles(): BattleSession[];
    getActiveBattles(): BattleSession[];
    getEventBus(): EventBus;
    shutdown(): Promise<void>;
    private wrapEventBusForPersistence;
    private persistEvent;
}
//# sourceMappingURL=runtime.d.ts.map