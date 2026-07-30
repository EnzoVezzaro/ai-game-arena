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
import type { GameAdapter } from '@ai-game-arena/controller';
import { AgentRuntime } from '@ai-game-arena/agent-runtime';
import { ObservationSystem } from '@ai-game-arena/observation';

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
  visibility?: 'perfect' | 'filtered' | 'private';
  observationFilter?: (observation: Observation, agentId: string) => Observation;
  observationSystem?: ObservationSystem;
  adapterFactory?: (arenaId: string, agentId: string) => GameAdapter | null;
  onAgentBlocked?: (agentId: string, error: string) => void;
  onAgentUnblocked?: (agentId: string) => void;
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

export type ErrorCategory = 'auth' | 'billing' | 'rate-limit' | 'transient' | 'unknown';

export function classifyError(message: string): ErrorCategory {
  if (/401|unauthorized|invalid.*api.?key|auth|permission/i.test(message)) return 'auth';
  if (/402|403|payment|billing|quota|credit|forbidden/i.test(message)) return 'billing';
  if (/429|rate.?limit|too many requests/i.test(message)) return 'rate-limit';
  if (/5\d{2}|internal.?server|service.?unavailable|timeout|temporarily/i.test(message)) return 'transient';
  return 'unknown';
}

const NON_RECOVERABLE: Set<ErrorCategory> = new Set(['auth', 'billing', 'rate-limit']);

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
  private observationSystem?: ObservationSystem;
  private battleId: string;
  private adapterFactory?: (arenaId: string, agentId: string) => GameAdapter | null;
  private gameAdapters: Map<string, GameAdapter> = new Map();
  private agentErrors: Map<string, { category: ErrorCategory; message: string; turn: number }> = new Map();
  private agentRetries: Map<string, number> = new Map();
  private onAgentBlocked?: (agentId: string, error: string) => void;
  private onAgentUnblocked?: (agentId: string) => void;

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
    this.observationSystem = options?.observationSystem;
    this.adapterFactory = options?.adapterFactory;
    this.battleId = options?.battleId ?? `match-${this.config.seed}`;
    this.onAgentBlocked = options?.onAgentBlocked;
    this.onAgentUnblocked = options?.onAgentUnblocked;
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
    this.state.worldState = this.arena.initialize(
      this.config.seed,
      this.agents.map((agent) => agent.id),
    );

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

      // Create a game adapter and register its tools with the controller
      const adapter = this.createAdapterForAgent(agent);
      if (adapter) {
        adapter.registerTools(controller);
        this.gameAdapters.set(agent.id, adapter);
      }

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
          // Forward device-level input to the adapter for translation
          if (adapter) {
            adapter.processInput(action);
          }
          this.logger.debug(
            `Agent ${agent.name} performed action: ${action.device}.${action.action}`,
            {
              component: 'match-engine',
              agentId: agent.id,
            },
          );
          if (action.device === 'game' && action.action !== 'pass') {
            this.publishEvent({
              type: 'ToolCalled',
              aggregateId: this.battleId,
              timestamp: new Date(),
              payload: { agentId: agent.id, tool: action.action, parameters: action.parameters },
              metadata: { correlationId: this.battleId, version: 1 },
            });
          }
        },
      };

      const sandbox = new AgentSandbox(agent, sandboxOptions);
      this.sandboxes.set(agent.id, sandbox);
    }

    // Publish BattleStarted event
    await this.publishEvent({
      type: 'BattleStarted',
      aggregateId: this.battleId,
      timestamp: new Date(),
      payload: {},
      metadata: { correlationId: this.battleId, version: 1 },
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

  private createAdapterForAgent(agent: AgentConfig): GameAdapter | null {
    if (!this.adapterFactory) return null;
    return this.adapterFactory(this.arena.config.id, agent.id);
  }

  private async runMatchLoop(): Promise<void> {
    while (this.state.phase === 'running') {
      // Check win condition
      const winCondition = this.arena.checkWinCondition(this.state.worldState!);
      if (winCondition) {
        this.state.scores[winCondition.winner] = (this.state.scores[winCondition.winner] ?? 0) + 1;

        await this.publishEvent({
          type: 'WinConditionMet',
          aggregateId: this.battleId,
          timestamp: new Date(),
          payload: { winner: winCondition.winner, reason: winCondition.reason },
          metadata: { correlationId: this.battleId, version: 1 },
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
        aggregateId: this.battleId,
        timestamp: new Date(),
        payload: { turnNumber: this.state.currentTurn },
        metadata: { correlationId: this.battleId, version: 1 },
      });

      const turnStart = Date.now();

      // Process each agent's turn (agents do NOT see each other's turns)
      for (const agent of this.agents) {
        if (this.state.phase !== 'running') break;

        const agentStart = Date.now();
        const sandbox = this.sandboxes.get(agent.id)!;

        // 0. Reset game adapter state for this turn
        const adapter = this.gameAdapters.get(agent.id);
        if (adapter && this.state.worldState) {
          adapter.onTurnStart(agent.id, this.state.worldState);
        }

        // 1. Get observation for this agent (filtered by arena)
        const rawObservation = this.arena.getObservation(agent.id, this.state.worldState!);

        // 1b. Pass the observation through the ObservationSystem (if wired)
        if (this.observationSystem) {
          const availableActions = rawObservation.metadata?.['availableActions'];
          this.observationSystem.capture(
            agent.id,
            (rawObservation.data?.content as Record<string, unknown>) ?? {},
            (Array.isArray(availableActions) ? availableActions : []) as string[],
          );
        }

        // 2. Deliver to agent's sandbox (sandbox applies its own filter)
        await sandbox.receiveObservation(rawObservation);

        // 3. Publish ObservationCaptured (for UI, not for other agents)
        await this.publishEvent({
          type: 'ObservationCaptured',
          aggregateId: this.battleId,
          timestamp: new Date(),
          payload: { agentId: agent.id, observationType: rawObservation.type },
          metadata: { correlationId: this.battleId, version: 1 },
        });

        // 4. Agent decides action (inside its private sandbox)
        await this.publishEvent({
          type: 'ThinkingStarted',
          aggregateId: this.battleId,
          timestamp: new Date(),
          payload: { agentId: agent.id, turnNumber: this.state.currentTurn },
          metadata: { correlationId: this.battleId, version: 1 },
        });

        let rawAction: import('@ai-game-arena/sdk').AgentAction;
        try {
          rawAction = await sandbox.decide();
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.error(`Agent ${agent.name} decision error: ${errorMessage}`, {
            component: 'match-engine',
            agentId: agent.id,
          });

          const category = classifyError(errorMessage);
          this.agentErrors.set(agent.id, { category, message: errorMessage, turn: this.state.currentTurn });

          await this.publishEvent({
            type: 'AgentError',
            aggregateId: this.battleId,
            timestamp: new Date(),
            payload: { agentId: agent.id, turnNumber: this.state.currentTurn, error: errorMessage },
            metadata: { correlationId: this.battleId, version: 1 },
          });

          const isNonRecoverable = NON_RECOVERABLE.has(category);
          if (isNonRecoverable) {
            this.onAgentBlocked?.(agent.id, errorMessage);
          }

          if (isNonRecoverable && this.allAgentsHaveNonRecoverableErrors()) {
            const errors = Array.from(this.agentErrors.entries()).map(([id, e]) => ({
              agentId: id,
              error: e.message,
            }));
            this.logger.warn(
            `All agents hit non-recoverable errors — pausing battle.`,
            {
              component: 'match-engine',
              battleId: this.battleId,
            },
            { errors },
          );
            await this.publishEvent({
              type: 'BattlePaused',
              aggregateId: this.battleId,
              timestamp: new Date(),
              payload: { reason: `All agents blocked: ${this.describeErrors(errors)}`, errors },
              metadata: { correlationId: this.battleId, version: 1 },
            });
            this.state.phase = 'paused';
            return;
          }

          const retryCount = (this.agentRetries.get(agent.id) ?? 0) + 1;
          this.agentRetries.set(agent.id, retryCount);

          if (retryCount >= 3) {
            const errors = Array.from(this.agentErrors.entries()).map(([id, e]) => ({
              agentId: id,
              error: e.message,
            }));
            this.logger.warn(
              `Agent ${agent.name} failed 3 times — pausing battle.`,
              {
                component: 'match-engine',
                battleId: this.battleId,
              },
              { errors },
            );
            await this.publishEvent({
              type: 'BattlePaused',
              aggregateId: this.battleId,
              timestamp: new Date(),
              payload: { reason: `Agent ${agent.name} failed to decide after 3 retries: ${errorMessage}`, errors },
              metadata: { correlationId: this.battleId, version: 1 },
            });
            this.state.phase = 'paused';
            return;
          }

          continue;
        }

        this.agentRetries.delete(agent.id);
        this.onAgentUnblocked?.(agent.id);

        this.logger.info(`Agent ${agent.name} decided: ${rawAction.type}(${JSON.stringify(rawAction.parameters)})`, {
          component: 'match-engine',
          agentId: agent.id,
        });

        await this.publishEvent({
          type: 'ThinkingFinished',
          aggregateId: this.battleId,
          timestamp: new Date(),
          payload: { agentId: agent.id, turnNumber: this.state.currentTurn, actionType: rawAction.type },
          metadata: { correlationId: this.battleId, version: 1 },
        });

        // 4b. Check if the game adapter has a translated action (from device-level input)
        const adapterAction = adapter?.extractAction() ?? null;
        const action = adapterAction ?? rawAction;

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
          this.agentRetries.delete(agent.id);
          await this.publishEvent({
            type: 'ActionExecuted',
            aggregateId: this.battleId,
            timestamp: new Date(),
            payload: { agentId: agent.id, action: action as unknown as Record<string, unknown>, success: true },
            metadata: { correlationId: this.battleId, version: 1 },
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
            aggregateId: this.battleId,
            timestamp: new Date(),
            payload: { agentId: agent.id, action: action as unknown as Record<string, unknown>, reason: validation.error ?? 'Invalid action' },
            metadata: { correlationId: this.battleId, version: 1 },
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
        aggregateId: this.battleId,
        timestamp: new Date(),
        payload: { turnNumber: this.state.currentTurn, duration: Date.now() - turnStart },
        metadata: { correlationId: this.battleId, version: 1 },
      });

      this.state.currentTurn++;
    }
  }

  private finish(_winner: string | undefined, _reason: string): void {
    this.state.phase = 'completed';
  }

  private allAgentsHaveNonRecoverableErrors(): boolean {
    return this.agents.every((a) => {
      const err = this.agentErrors.get(a.id);
      return err && NON_RECOVERABLE.has(err.category);
    });
  }

  private describeErrors(errors: Array<{ agentId: string; error: string }>): string {
    return errors.map((e) => `${e.agentId.slice(0, 8)}: ${e.error.split('"')[0]?.slice(0, 60) ?? e.error}`).join('; ');
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
