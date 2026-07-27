import type {
  ArenaPlugin,
  AgentAction,
  AgentConfig,
  WorldState,
  ValidationResult,
  ActionOutcome,
  Observation,
  Logger,
  EventBus,
} from '@ai-game-arena/sdk';
import { AgentSandbox } from './agent-sandbox';
import type { AgentSandboxOptions } from './agent-sandbox';
import { Controller } from '@ai-game-arena/controller';
import { AgentRuntime } from '@ai-game-arena/agent-runtime';

export interface MatchEngineConfig {
  maxTurns: number;
  turnTimeout: number;
  seed: number;
}

export interface MatchEngineState {
  phase: 'waiting' | 'running' | 'completed' | 'aborted';
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
  visibility?: 'perfect' | 'filtered' | 'private';
  observationFilter?: (observation: Observation, agentId: string) => Observation;
}

function createNoopLogger(): Logger {
  const noop = () => {};
  const noopLogger: Logger = {
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    child: () => noopLogger,
  };
  return noopLogger;
}

export class MatchEngine {
  private config: MatchEngineConfig;
  private arena: ArenaPlugin;
  private agents: AgentConfig[];
  private state: MatchEngineState;
  private turnResults: TurnResult[] = [];
  private startTime: number = 0;
  private sandboxes: Map<string, AgentSandbox> = new Map();
  private logger: Logger;
  private eventBus?: EventBus;
  private visibility: 'perfect' | 'filtered' | 'private';
  private observationFilter?: (observation: Observation, agentId: string) => Observation;

  constructor(
    arena: ArenaPlugin,
    agents: AgentConfig[],
    config: MatchEngineConfig,
    options?: MatchEngineOptions,
  ) {
    this.arena = arena;
    this.agents = agents;
    this.config = config;
    this.logger = options?.logger ?? createNoopLogger();
    this.eventBus = options?.eventBus;
    this.visibility = options?.visibility ?? 'perfect';
    this.observationFilter = options?.observationFilter;
    this.state = {
      phase: 'waiting',
      currentTurn: 0,
      worldState: null,
      scores: {},
    };
  }

  getState(): MatchEngineState {
    return { ...this.state };
  }

  async start(): Promise<void> {
    this.state.phase = 'running';
    this.startTime = Date.now();

    // Initialize world
    this.state.worldState = this.arena.initialize(this.config.seed);

    // Initialize scores
    for (const agent of this.agents) {
      this.state.scores[agent.id] = 0;
    }

    // Create isolated sandbox for each agent
    for (const agent of this.agents) {
      const controller = new Controller({
        id: `controller-${agent.id}`,
        name: `Controller for ${agent.name}`,
      });
      const runtime = new AgentRuntime({
        logger: this.logger.child({ component: 'agent-runtime', agentId: agent.id }),
      });

      const sandboxOptions: AgentSandboxOptions = {
        logger: this.logger,
        controller,
        runtime,
        visibility: this.visibility,
        filterFn: this.observationFilter,
        onAction: (action) => {
          this.logger.debug(`Agent ${agent.name} performed action: ${action.device}.${action.action}`, {
            component: 'match-engine',
            agentId: agent.id,
          });
        },
      };

      const sandbox = new AgentSandbox(agent, sandboxOptions);
      this.sandboxes.set(agent.id, sandbox);
    }

    // Publish BattleStarted event
    await this.publishEvent({
      type: 'BattleStarted',
      aggregateId: `match-${this.config.seed}`,
      timestamp: new Date(),
      payload: {},
      metadata: { correlationId: `match-${this.config.seed}`, version: 1 },
    });

    this.logger.info('Match started', {
      component: 'match-engine',
    });

    // Run match loop
    await this.runMatchLoop();
  }

  async pause(): Promise<void> {
    if (this.state.phase !== 'running') {
      throw new Error('Match is not running');
    }
    this.state.phase = 'waiting';
  }

  async resume(): Promise<void> {
    if (this.state.phase !== 'waiting') {
      throw new Error('Match is not waiting');
    }
    this.state.phase = 'running';
  }

  abort(_reason: string): void {
    this.state.phase = 'aborted';
    this.state.worldState = null;
  }

  private async runMatchLoop(): Promise<void> {
    while (this.state.phase === 'running') {
      // Check win condition
      const winCondition = this.arena.checkWinCondition(this.state.worldState!);
      if (winCondition) {
        this.state.scores[winCondition.winner] = (this.state.scores[winCondition.winner] ?? 0) + 1;

        await this.publishEvent({
          type: 'WinConditionMet',
          aggregateId: `match-${this.config.seed}`,
          timestamp: new Date(),
          payload: { winner: winCondition.winner, reason: winCondition.reason },
          metadata: { correlationId: `match-${this.config.seed}`, version: 1 },
        });

        this.finish(winCondition.winner, winCondition.reason);
        return;
      }

      // Check max turns
      if (this.state.currentTurn >= this.config.maxTurns) {
        this.finish(undefined, 'Max turns reached');
        return;
      }

      // Publish TurnStarted
      await this.publishEvent({
        type: 'TurnStarted',
        aggregateId: `match-${this.config.seed}`,
        timestamp: new Date(),
        payload: { turnNumber: this.state.currentTurn },
        metadata: { correlationId: `match-${this.config.seed}`, version: 1 },
      });

      const turnStart = Date.now();

      // Process each agent's turn (agents do NOT see each other's turns)
      for (const agent of this.agents) {
        if (this.state.phase !== 'running') break;

        const agentStart = Date.now();
        const sandbox = this.sandboxes.get(agent.id)!;

        // 1. Get observation for this agent (filtered by arena)
        const rawObservation = this.arena.getObservation(agent.id, this.state.worldState!);

        // 2. Deliver to agent's sandbox (sandbox applies its own filter)
        await sandbox.receiveObservation(rawObservation);

        // 3. Publish ObservationCaptured (for UI, not for other agents)
        await this.publishEvent({
          type: 'ObservationCaptured',
          aggregateId: `match-${this.config.seed}`,
          timestamp: new Date(),
          payload: { agentId: agent.id, observationType: rawObservation.type },
          metadata: { correlationId: `match-${this.config.seed}`, version: 1 },
        });

        // 4. Agent decides action (inside its private sandbox)
        const action = await sandbox.decide();

        // 5. Validate action against world state
        const validation = this.arena.validateAction(action, this.state.worldState!);

        let outcome: ActionOutcome;
        if (validation.valid) {
          // 6. Execute action (only the match engine sees the result)
          outcome = this.arena.executeAction(action, this.state.worldState!);

          // 7. Update world state
          if (outcome.state) {
            this.state.worldState = {
              ...this.state.worldState!,
              data: outcome.state,
              turn: this.state.currentTurn,
            };
          }

          // 8. Update scores
          const scores = this.arena.getScores(this.state.worldState!);
          this.state.scores = scores;

          // 9. Publish ActionExecuted
          await this.publishEvent({
            type: 'ActionExecuted',
            aggregateId: `match-${this.config.seed}`,
            timestamp: new Date(),
            payload: { agentId: agent.id, action: action as unknown as Record<string, unknown>, success: true },
            metadata: { correlationId: `match-${this.config.seed}`, version: 1 },
          });
        } else {
          outcome = {
            success: false,
            events: [],
            error: validation.error,
          };

          // Publish ActionRejected
          await this.publishEvent({
            type: 'ActionRejected',
            aggregateId: `match-${this.config.seed}`,
            timestamp: new Date(),
            payload: { agentId: agent.id, action: action as unknown as Record<string, unknown>, reason: validation.error ?? 'Invalid action' },
            metadata: { correlationId: `match-${this.config.seed}`, version: 1 },
          });
        }

        const duration = Date.now() - agentStart;

        this.turnResults.push({
          turnNumber: this.state.currentTurn,
          agentId: agent.id,
          action,
          validation,
          outcome,
          observation: rawObservation,
          duration,
        });
      }

      // Publish TurnFinished
      await this.publishEvent({
        type: 'TurnFinished',
        aggregateId: `match-${this.config.seed}`,
        timestamp: new Date(),
        payload: { turnNumber: this.state.currentTurn, duration: Date.now() - turnStart },
        metadata: { correlationId: `match-${this.config.seed}`, version: 1 },
      });

      this.state.currentTurn++;
    }
  }

  private finish(_winner: string | undefined, _reason: string): void {
    this.state.phase = 'completed';
  }

  private async publishEvent(event: Parameters<EventBus['publish']>[0]): Promise<void> {
    if (this.eventBus) {
      await this.eventBus.publish(event);
    }
  }

  getTurnResults(): TurnResult[] {
    return [...this.turnResults];
  }

  getMatchResult(): MatchResult {
    return {
      state: this.state,
      winner:
        this.state.phase === 'completed'
          ? Object.entries(this.state.scores).sort(([, a], [, b]) => b - a)[0]?.[0]
          : undefined,
      reason: this.state.phase === 'completed' ? 'Match completed' : undefined,
      turns: this.turnResults,
      duration: Date.now() - this.startTime,
    };
  }

  getSandbox(agentId: string): AgentSandbox | undefined {
    return this.sandboxes.get(agentId);
  }

  async shutdown(): Promise<void> {
    for (const sandbox of this.sandboxes.values()) {
      await sandbox.shutdown();
    }
    this.sandboxes.clear();
  }
}
