import { randomUUID } from 'crypto';
import type {
  AgentConfig,
  ArenaPlugin,
  BattleConfig,
  Logger,
  EventBus,
  DomainEvent,
} from '@ai-game-arena/sdk';
import { MatchEngine } from '@ai-game-arena/match-engine';
import type { MatchEngineConfig } from '@ai-game-arena/match-engine';
import { ObservationSystem } from '@ai-game-arena/observation';
import type { StorageAdapter } from '@ai-game-arena/sdk';

export interface BattleSession {
  id: string;
  arenaId: string;
  agents: AgentConfig[];
  config: BattleConfig;
  state: BattleState;
  matchEngine: MatchEngine | null;
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
}

export type BattlePhase =
  'created' | 'initializing' | 'running' | 'paused' | 'completed' | 'aborted';

export interface BattleState {
  phase: BattlePhase;
  currentTurn: number;
  scores: Record<string, number>;
}

export interface RuntimeOptions {
  logger: Logger;
  eventBus: EventBus;
  storage: StorageAdapter;
}

export class Runtime {
  private battles = new Map<string, BattleSession>();
  private arenas = new Map<string, ArenaPlugin>();
  private logger: Logger;
  private eventBus: EventBus;
  private storage: StorageAdapter;

  constructor(options: RuntimeOptions) {
    this.logger = options.logger;
    this.eventBus = options.eventBus;
    this.storage = options.storage;
  }

  registerArena(id: string, arena: ArenaPlugin): void {
    this.arenas.set(id, arena);
    this.logger.info(`Registered arena: ${id}`, { component: 'runtime' });
  }

  getArena(id: string): ArenaPlugin | undefined {
    return this.arenas.get(id);
  }

  getArenas(): ArenaPlugin[] {
    return Array.from(this.arenas.values());
  }

  async abortBattle(battleId: string): Promise<void> {
    const session = this.battles.get(battleId);
    if (!session) throw new Error(`Battle not found: ${battleId}`);
    if (!session.matchEngine) throw new Error(`Battle not started`);

    await session.matchEngine.abort('Manual abort');
    session.state.phase = 'aborted';
    session.finishedAt = new Date();

    this.logger.info(`Battle aborted: ${battleId}`, { component: 'runtime', battleId });

    await this.eventBus.publish({
      type: 'BattleAborted',
      aggregateId: battleId,
      timestamp: new Date(),
      payload: { reason: 'Manual abort' },
      metadata: { correlationId: battleId, version: 1 },
    } as DomainEvent);
  }

  async createBattle(
    arenaId: string,
    agents: AgentConfig[],
    config: Partial<BattleConfig> = {},
  ): Promise<BattleSession> {
    const arena = this.arenas.get(arenaId);
    if (!arena) {
      throw new Error(`Arena not found: ${arenaId}`);
    }

    const battleConfig: BattleConfig = {
      maxAgents: config.maxAgents ?? arena.config.maxPlayers,
      turnTimeout: config.turnTimeout ?? 30000,
      maxTurns: config.maxTurns ?? 100,
      seed: config.seed ?? Math.floor(Math.random() * 1000000),
    };

    // Validate agent count
    if (agents.length < arena.config.minPlayers) {
      throw new Error(`Arena requires at least ${arena.config.minPlayers} agents`);
    }
    if (agents.length > arena.config.maxPlayers) {
      throw new Error(`Arena supports at most ${arena.config.maxPlayers} agents`);
    }

    const battleId = randomUUID();

    const session: BattleSession = {
      id: battleId,
      arenaId,
      agents,
      config: battleConfig,
      state: {
        phase: 'created',
        currentTurn: 0,
        scores: {},
      },
      matchEngine: null,
      createdAt: new Date(),
    };

    this.battles.set(battleId, session);

    // Emit event
    await this.eventBus.publish({
      type: 'BattleCreated',
      aggregateId: battleId,
      timestamp: new Date(),
      payload: { config: battleConfig as unknown as Record<string, unknown> },
      metadata: { correlationId: battleId, version: 1 },
    } as DomainEvent);

    // Persist battle
    await this.storage.set(`battle:${battleId}`, {
      id: battleId,
      arenaId,
      agents,
      config: battleConfig,
      createdAt: session.createdAt.toISOString(),
    });

    this.logger.info(`Created battle: ${battleId}`, { component: 'runtime', battleId });

    return session;
  }

  async startBattle(battleId: string): Promise<void> {
    const session = this.battles.get(battleId);
    if (!session) {
      throw new Error(`Battle not found: ${battleId}`);
    }
    if (session.state.phase !== 'created') {
      throw new Error(`Battle cannot be started from phase "${session.state.phase}"`);
    }

    session.state.phase = 'initializing';
    session.startedAt = new Date();

    // Create match engine
    const matchConfig: MatchEngineConfig = {
      maxTurns: session.config.maxTurns,
      turnTimeout: session.config.turnTimeout,
      seed: session.config.seed,
    };

    const arena = this.arenas.get(session.arenaId)!;
    const observationSystem = new ObservationSystem();
    session.matchEngine = new MatchEngine(arena, session.agents, matchConfig, {
      logger: this.logger,
      eventBus: this.eventBus,
      observationSystem,
    });

    session.state.phase = 'running';

    this.logger.info(`Starting battle: ${battleId}`, { component: 'runtime', battleId });

    // Start match engine (this runs the game loop)
    try {
      await session.matchEngine.start();
      session.state.phase = 'completed';
      session.finishedAt = new Date();

      // Update final state from match engine
      const matchState = session.matchEngine.getState();
      session.state.currentTurn = matchState.currentTurn;
      session.state.scores = matchState.scores;

      this.logger.info(`Battle completed: ${battleId}`, { component: 'runtime', battleId });
    } catch (error) {
      session.state.phase = 'aborted';
      session.finishedAt = new Date();
      this.logger.error(
        `Battle aborted: ${battleId}`,
        { component: 'runtime', battleId },
        error as Error,
      );
    }
  }

  async pauseBattle(battleId: string): Promise<void> {
    const session = this.battles.get(battleId);
    if (!session) throw new Error(`Battle not found: ${battleId}`);
    if (!session.matchEngine) throw new Error(`Battle not started`);

    await session.matchEngine.pause();
    session.state.phase = 'paused';
  }

  async resumeBattle(battleId: string): Promise<void> {
    const session = this.battles.get(battleId);
    if (!session) throw new Error(`Battle not found: ${battleId}`);
    if (!session.matchEngine) throw new Error(`Battle not started`);

    await session.matchEngine.resume();
    session.state.phase = 'running';
  }

  getBattle(battleId: string): BattleSession | undefined {
    return this.battles.get(battleId);
  }

  getAllBattles(): BattleSession[] {
    return Array.from(this.battles.values());
  }

  getActiveBattles(): BattleSession[] {
    return this.getAllBattles().filter(
      (b) => b.state.phase === 'running' || b.state.phase === 'initializing',
    );
  }

  async shutdown(): Promise<void> {
    // Pause all active battles
    for (const battle of this.getActiveBattles()) {
      try {
        await this.pauseBattle(battle.id);
      } catch (error) {
        this.logger.error(
          `Failed to pause battle: ${battle.id}`,
          { component: 'runtime' },
          error as Error,
        );
      }
    }
    this.battles.clear();
    this.arenas.clear();
  }
}
