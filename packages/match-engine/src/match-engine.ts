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
  DomainEvent,
  BridgeEvent,
  BridgeObservation,
} from '@ai-game-arena/sdk';
import { AgentSandbox } from './agent-sandbox';
import type { AgentSandboxOptions } from './agent-sandbox';
import { Controller } from '@ai-game-arena/controller';
import type { GameBridge } from '@ai-game-arena/controller';
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
  adapterFactory?: (arenaId: string) => GameBridge | null;
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

/** Events the engine can publish, including forwarded bridge events. */
type ForwardableEvent =
  | DomainEvent
  | {
      readonly type: string;
      readonly aggregateId: string;
      readonly timestamp: Date;
      readonly payload: Record<string, unknown>;
      readonly metadata: import('@ai-game-arena/sdk').EventMetadata;
    };

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
  private adapterFactory?: (arenaId: string) => GameBridge | null;
  private bridge: GameBridge | null = null;
  private lastBridgeObservation: BridgeObservation | null = null;
  private agentErrors: Map<string, { category: ErrorCategory; message: string; turn: number }> = new Map();
  private agentRetries: Map<string, number> = new Map();
  private lastPublishedScores: Map<string, number> = new Map();
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

    // Create one bridge for the game and initialize it. The engine talks to
    // the game exclusively through the bridge (GAME_ENGINE.md).
    const bridge = this.createBridge();
    this.bridge = bridge;
    if (bridge) {
      // Subscribe before initialize so lifecycle events (ready, ...) are seen.
      bridge.onEvent((event) => {
        void this.onBridgeEvent(event);
      });
      await bridge.initialize({
        id: this.arena.config.id,
        seed: this.config.seed,
        agentIds: this.agents.map((agent) => agent.id),
      });
    }

    // Create isolated sandbox for each agent
    for (const agent of this.agents) {
      const controller = new Controller({
        id: `controller-${agent.id}`,
        name: `Controller for ${agent.name}`,
      });

      // Register the bridge's action vocabulary with the agent's controller
      bridge?.registerTools(controller);

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

  private createBridge(): GameBridge | null {
    if (!this.adapterFactory) return null;
    return this.adapterFactory(this.arena.config.id);
  }

  private async getObservationForAgent(agentId: string): Promise<Observation> {
    if (this.bridge) {
      const obs = await this.bridge.observe(agentId);
      this.lastBridgeObservation = obs;
      return {
        timestamp: obs.timestamp,
        agentId,
        type: 'board-state',
        data: { content: obs.data, format: 'json' },
        metadata: {
          turnNumber: this.state.currentTurn,
          gameState: this.state.phase,
          availableActions: [],
        },
      };
    }
    return this.arena.getObservation(agentId, this.state.worldState!);
  }

  /** Forward bridge events to the engine's event bus (the engine does not interpret them). */
  private async onBridgeEvent(event: BridgeEvent): Promise<void> {
    await this.publishEvent({
      type: 'BridgeEvent',
      aggregateId: this.battleId,
      timestamp: new Date(event.timestamp),
      payload: {
        bridge: this.bridge?.platform ?? 'unknown',
        event: event.type,
        data: event.data ?? null,
      },
      metadata: { correlationId: this.battleId, version: 1 },
    });
  }

  /** Render state from the latest bridge observation (for the UI). */
  getBridgeRenderState(): Record<string, unknown> | null {
    if (!this.bridge || !this.lastBridgeObservation) return null;
    const data = (this.lastBridgeObservation.data as Record<string, unknown>) ?? {};
    return { type: this.bridge.platform, data, ...data };
  }

  private async runMatchLoop(): Promise<void> {
    while (this.state.phase === 'running') {
      // Check win condition. With a bridge, the game reports its own end
      // through getState(); the engine does not interpret game rules.
      if (this.bridge) {
        const bridgeState = await this.bridge.getState();
        if (bridgeState.phase !== 'running' || !bridgeState.running) {
          const winner = this.bridge.getWinner?.() ?? undefined;
          await this.publishEvent({
            type: 'WinConditionMet',
            aggregateId: this.battleId,
            timestamp: new Date(),
            payload: { winner: winner ?? 'unknown', reason: `Bridge reported phase "${bridgeState.phase}"` },
            metadata: { correlationId: this.battleId, version: 1 },
          });
          this.finish(winner, 'Bridge reported game over');
          return;
        }
      } else {
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

        // 1. Get observation for this agent (from the bridge when present,
        // otherwise filtered by the arena).
        const rawObservation = await this.getObservationForAgent(agent.id);

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

        // 4b. Apply the action. With a bridge, the bridge is the game: it
        // validates and applies the action itself. Otherwise the arena does.
        const action = rawAction;

        let validation: ValidationResult;
        let outcome: ActionOutcome;
        if (this.bridge) {
          await this.bridge.applyActions(agent.id, [
            { type: action.type, payload: action.parameters },
          ]);
          validation = { valid: true };
          outcome = { success: true, events: [] };
          if (this.bridge.getScores) {
            this.state.scores = this.bridge.getScores();
          }
        } else {
          // 5. Validate action against world state
          validation = this.arena.validateAction(action, this.state.worldState!);
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
            this.state.scores = this.arena.getScores(this.state.worldState!);
          } else {
            outcome = {
              success: false,
              events: [],
              error: validation.error,
            };
          }
        }

        // Publish ScoreUpdated for every agent whose score changed, so
        // plugins (scoreboard, rewards) can track scores independently.
        await this.publishScoreUpdates();

        if (validation.valid) {
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

  private async publishScoreUpdates(): Promise<void> {
    for (const agent of this.agents) {
      const score = this.state.scores[agent.id] ?? 0;
      const last = this.lastPublishedScores.get(agent.id) ?? 0;
      if (score === last) continue;
      this.lastPublishedScores.set(agent.id, score);
      await this.publishEvent({
        type: 'ScoreUpdated',
        aggregateId: this.battleId,
        timestamp: new Date(),
        payload: { agentId: agent.id, score, delta: score - last },
        metadata: { correlationId: this.battleId, version: 1 },
      });
    }
  }

  private async publishEvent(event: ForwardableEvent): Promise<void> {
    if (this.eventBus) {
      await this.eventBus.publish(event as DomainEvent);
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
          ? (this.bridge?.getWinner?.() ??
              Object.entries(this.state.scores).sort(([, a], [, b]) => b - a)[0]?.[0])
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
