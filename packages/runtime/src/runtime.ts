import { randomUUID } from 'crypto';
import type {
  AgentConfig,
  ArenaPlugin,
  BattleConfig,
  DomainEvent,
  Logger,
  EventBus,
} from '@ai-game-arena/sdk';
import { MatchEngine } from '@ai-game-arena/match-engine';
import type { MatchEngineConfig } from '@ai-game-arena/match-engine';
import { ObservationSystem } from '@ai-game-arena/observation';
import type { StorageAdapter } from '@ai-game-arena/sdk';
import type { GameAdapter } from '@ai-game-arena/controller';

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
  adapterFactory?: (arenaId: string, agentId: string) => GameAdapter | null;
}

export class Runtime {
  private battles = new Map<string, BattleSession>();
  private arenas = new Map<string, ArenaPlugin>();
  private logger: Logger;
  private storage: StorageAdapter;
  private wrappedEventBus: EventBus;
  private adapterFactory: NonNullable<RuntimeOptions['adapterFactory']>;

  constructor(options: RuntimeOptions) {
    this.logger = options.logger;
    this.storage = options.storage;
    this.wrappedEventBus = this.wrapEventBusForPersistence(options.eventBus);
    this.adapterFactory = options.adapterFactory ?? (() => null);
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

    await this.wrappedEventBus.publish({
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
      // No per-turn timeout: agents respond on their own; the only latency
      // bound is the provider retry policy inside the agent runtime.
      turnTimeout: config.turnTimeout ?? 0,
      // No turn cap: battles run until the arena's win condition fires or an
      // admin pauses/resumes/aborts. Infinity keeps the match-engine's
      // `currentTurn >= maxTurns` guard inert.
      maxTurns: config.maxTurns ?? Number.POSITIVE_INFINITY,
      seed: config.seed ?? Math.floor(Math.random() * 1_000_000),
      gameId: config.gameId,
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
      gameId: config.gameId,
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
    await this.wrappedEventBus.publish({
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
      eventBus: this.wrappedEventBus,
      battleId,
      observationSystem,
      adapterFactory: this.adapterFactory,
      onAgentBlocked: async (agentId, error) => {
        await this.storage.set(`agent-blocked:${agentId}`, { error, turn: session.matchEngine?.getState().currentTurn });
      },
      onAgentUnblocked: async (agentId) => {
        await this.storage.delete(`agent-blocked:${agentId}`);
      },
    });

    session.state.phase = 'running';

    this.logger.info(`Starting battle: ${battleId}`, { component: 'runtime', battleId });

    // Start match engine (this runs the game loop)
    try {
      await session.matchEngine.start();

      // Match engine may have paused itself (e.g. all agents hit non-recoverable errors)
      const meState = session.matchEngine.getState();
      session.state = {
        phase: meState.phase as 'paused' | 'completed',
        currentTurn: meState.currentTurn,
        scores: meState.scores,
      };
      if (meState.phase === 'paused') {
        this.logger.warn(`Battle paused: ${battleId}`, { component: 'runtime', battleId });
      } else {
        session.finishedAt = new Date();
        this.logger.info(`Battle completed: ${battleId}`, { component: 'runtime', battleId });
        await this.wrappedEventBus.publish({
          type: 'BattleFinished',
          aggregateId: battleId,
          timestamp: new Date(),
          payload: {
            winner: session.matchEngine.getMatchResult().winner,
            reason: session.matchEngine.getMatchResult().reason ?? 'Match completed',
          },
          metadata: { correlationId: battleId, version: 1 },
        } as DomainEvent);
      }
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

  getBattleRenderState(battleId: string): Record<string, unknown> | null {
    const session = this.battles.get(battleId);
    if (!session || !session.matchEngine) return null;
    const meState = session.matchEngine.getState();
    if (!meState.worldState) return null;
    const arena = this.arenas.get(session.arenaId);
    if (!arena) return null;
    return arena.getRenderState(meState.worldState).data ?? null;
  }

  getAllBattles(): BattleSession[] {
    return Array.from(this.battles.values());
  }

  getActiveBattles(): BattleSession[] {
    return this.getAllBattles().filter(
      (b) => b.state.phase === 'running' || b.state.phase === 'initializing',
    );
  }

  getEventBus(): EventBus {
    return this.wrappedEventBus;
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

  private wrapEventBusForPersistence(eventBus: EventBus): EventBus {
    const self = this;
    return {
      async publish(event) {
        await self.persistEvent(event);
        await eventBus.publish(event);
      },
      subscribe: eventBus.subscribe.bind(eventBus),
      subscribeAll: eventBus.subscribeAll.bind(eventBus),
      unsubscribe: eventBus.unsubscribe.bind(eventBus),
    };
  }

  private async persistEvent(event: DomainEvent): Promise<void> {
    try {
      await this.storage.insert('events', {
        id: randomUUID(),
        type: event.type,
        aggregate_id: event.aggregateId,
        aggregate_type: 'battle',
        timestamp: event.timestamp.getTime(),
        version: event.metadata.version,
        payload: JSON.stringify(event.payload),
        metadata: JSON.stringify(event.metadata),
        correlation_id: event.metadata.correlationId,
        causation_id: event.metadata.causationId ?? null,
      });
    } catch (error) {
      this.logger.error('Failed to persist event', { component: 'runtime' }, error as Error);
    }
  }
}
