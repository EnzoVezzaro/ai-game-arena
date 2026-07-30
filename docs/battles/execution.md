# Battle Execution

> The interaction loop, turn execution, agent coordination, and battle orchestration — all running inside an Arena. The Arena is the battle ground (environment). The Game is just a component loaded into the Arena. **The Agent executes actions through Controller/MCP directly on the Game. The Arena observes and reacts.**

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    ARENA (BATTLE ENVIRONMENT)                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                         BATTLE ORCHESTRATOR                                  │   │
│  │  (Coordinates turn flow, emits events, records replay)                       │   │
│  ├─────────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                              │   │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                    │   │
│  │   │   TURN 1    │───►│   TURN 2    │───►│   TURN N    │                    │   │
│  │   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                    │   │
│  │          │                  │                  │                            │   │
│  │    ┌─────┴─────┐      ┌─────┴─────┐      ┌─────┴─────┐                    │   │
│  │    │  OBSERVE  │      │  OBSERVE  │      │  OBSERVE  │                    │   │
│  │    │ Arena calls│      │ Arena calls│      │ Arena calls│                    │   │
│  │    │ getObs()  │      │ getObs()  │      │ getObs()  │                    │   │
│  │    │ (from     │      │ (from     │      │ (from     │                    │   │
│  │    │  Observer) │      │  Observer) │      │  Observer) │                    │   │
│  │    └─────┬─────┘      └─────┬─────┘      └─────┬─────┘                    │   │
│  │          │                  │                  │                            │   │
│  │    ┌─────┴─────┐      ┌─────┴─────┐      ┌─────┴─────┐                    │   │
│  │    │  AGENT    │      │  AGENT    │      │  AGENT    │                    │   │
│  │    │  DECIDES  │      │  DECIDES  │      │  DECIDES  │                    │   │
│  │    │  (LLM)    │      │  (LLM)    │      │  (LLM)    │                    │   │
│  │    └─────┬─────┘      └─────┬─────┘      └─────┬─────┘                    │   │
│  │          │                  │                  │                            │   │
│  │    ┌─────┴─────┐      ┌─────┴─────┐      ┌─────┴─────┐                    │   │
│  │    │  AGENT    │      │  AGENT    │      │  AGENT    │                    │   │
│  │    │  EXECUTES │      │  EXECUTES │      │  EXECUTES │                    │   │
│  │    │  VIA      │      │  VIA      │      │  VIA      │                    │   │
│  │    │  CONTROLLER/MCP    │  CONTROLLER/MCP    │  CONTROLLER/MCP    │   │
│  │    │  (Direct to Game)  │  (Direct to Game)  │  (Direct to Game)  │   │
│  │    └─────┬─────┘      └─────┬─────┘      └─────┬─────┘                    │   │
│  │          │                  │                  │                            │   │
│  │    ┌─────┴─────┐      ┌─────┴─────┐      ┌─────┴─────┐                    │   │
│  │    │  GAME     │      │  GAME     │      │  GAME     │                    │   │
│  │    │  RUNS     │      │  RUNS     │      │  RUNS     │                    │   │
│  │    │  (Native  │      │  (Native  │      │  (Native  │                    │   │
│  │    │  Binary)  │      │  Binary)  │      │  Binary)  │                    │   │
│  │    └─────┬─────┘      └─────┬─────┘      └─────┬─────┘                    │   │
│  │          │                  │                  │                            │   │
│  │    ┌─────┴─────┐      ┌─────┴─────┐      ┌─────┴─────┐                    │   │
│  │    │ OBSERVER  │      │ OBSERVER  │      │ OBSERVER  │                    │   │
│  │    │ CAPTURES  │      │ CAPTURES  │      │ CAPTURES  │                    │   │
│  │    │  Game     │      │  Game     │      │  Game     │                    │   │
│  │    │  OUTPUT   │      │  OUTPUT   │      │  OUTPUT   │                    │   │
│  │    └─────┬─────┘      └─────┬─────┘      └─────┬─────┘                    │   │
│  │          │                  │                  │                            │   │
│  │    ┌─────┴─────┐      ┌─────┴─────┐      ┌─────┴─────┐                    │   │
│  │    │  ARENA    │      │  ARENA    │      │  ARENA    │                    │   │
│  │    │  REACTS   │      │  REACTS   │      │  REACTS   │                    │   │
│  │    │ getObs()  │      │ getObs()  │      │ getObs()  │                    │   │
│  │    │ Updates   │      │ Updates   │      │ Updates   │                    │   │
│  │    │  world    │      │  world    │      │  world    │                    │   │
│  │    │  state    │      │  state    │      │  state    │                    │   │
│  │    │ checkWin()│      │ checkWin()│      │ checkWin()│                    │   │
│  │    └───────────┘      └───────────┘      └───────────┘                    │   │
│  │                                                                              │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**KEY FLOW:**
1. **Agent** decides action (LLM reasoning)
2. **Agent** executes via **Controller/MCP** → **Game** (direct, no Arena involvement)
3. **Game** runs, produces new state
4. **Observer** captures Game output
5. **Arena** calls `getObservation()` from Observer data
6. **Arena** updates its world state, checks win conditions
7. **Battle Orchestrator** emits events, advances turn

**The Arena NEVER executes actions on the Game. The Agent does. The Arena only observes and reacts.**

---

## Turn Execution

### Turn Phases

```typescript
// packages/runtime/src/battle/turn.ts
export type TurnPhase = 
  | 'observation'    // Arena gets observation from Observer
  | 'reasoning'      // Agent LLM processing
  | 'action'         // Agent executes via Controller/MCP on Game
  | 'resolution'     // Arena updates world state, checks win
  | 'cleanup';       // Emit events, advance turn

export interface TurnContext {
  readonly battleId: BattleId;
  readonly turn: number;
  readonly phase: TurnPhase;
  readonly activeAgent: AgentId;
  readonly worldState: WorldState;        // Arena's world state
  readonly startTime: number;
  readonly timeBudget: number; // ms remaining
}
```

### Turn Executor

```typescript
// packages/runtime/src/battle/turn-executor.ts
export class TurnExecutor {
  constructor(
    private arena: ArenaPlugin,           // Arena environment logic
    private controller: ControllerInstance,  // Agent's body (MCP)
    private observation: ObservationPipeline, // Captures Game output
    private agentRuntime: AgentRuntime,      // Agent's mind (LLM)
    private eventBus: EventBus,
    private config: TurnExecutorConfig
  ) {}

  async executeTurn(context: TurnContext): Promise<TurnResult> {
    const { battleId, turn, activeAgent, worldState } = context;
    const startTime = Date.now();

    try {
      // Phase 1: Observation - Arena gets obs from Observer pipeline
      context.phase = 'observation';
      const observation = await this.captureObservation(activeAgent, worldState);
      await this.agentRuntime.observe(activeAgent, observation);

      // Phase 2: Reasoning - Agent decides
      context.phase = 'reasoning';
      const action = await this.executeWithTimeout(
        () => this.agentRuntime.decide(activeAgent),
        this.getTimeBudget(context)
      );

      // Phase 3: Action - AGENT executes via Controller/MCP directly on Game
      // Arena does NOT execute here. Agent → Controller → Game.
      context.phase = 'action';
      const controllerResult = await this.controller.execute({
        agentId: activeAgent,
        tool: action.tool,
        params: action.params,
      });

      // Phase 4: Resolution - Arena reacts: gets fresh obs, updates world, checks win
      context.phase = 'resolution';
      
      // Get fresh observation after Game executed
      const postActionObs = await this.captureObservation(activeAgent, worldState);
      
      // Arena updates ITS world state based on what happened
      const newState = this.arena.executeAction(action, worldState);
      
      // Arena checks win condition on ITS world state
      const winCondition = this.arena.checkWinCondition(newState);

      // Phase 5: Cleanup
      context.phase = 'cleanup';
      await this.emitTurnEvents(battleId, turn, activeAgent, action, controllerResult, newState, winCondition);

      return {
        success: true,
        newState,
        winCondition,
        duration: Date.now() - startTime,
        action,
        controllerResult,
      };

    } catch (error) {
      return this.handleTurnError(context, error, Date.now() - startTime);
    }
  }

  private async captureObservation(agentId: AgentId, state: WorldState): Promise<Observation> {
    // Arena gets observation from Observer pipeline (which captured Game output)
    const observation = this.arena.getObservation(agentId, state);
    this.observation.record(agentId, observation);
    return observation;
  }
  // ...
}
```

**CRITICAL:** In Phase 3 (`action`), the **Agent executes via Controller/MCP directly on the Game**. The Arena is NOT involved in executing the action on the Game. The Arena only reacts in Phase 4 (`resolution`) by updating its world state and checking win conditions.

---

## Agent Coordination

### Turn Order

```typescript
// packages/runtime/src/battle/turn-order.ts
export type TurnOrderStrategy = 
  | 'sequential'      // Agent 1, 2, 3... repeat
  | 'simultaneous'    // All agents act in parallel
  | 'initiative'      // Based on stats/speed
  | 'round-robin'     // Fair rotation
  | 'custom';         // Arena-defined

export class TurnOrderManager {
  private order: AgentId[] = [];
  private currentIndex = 0;
  private strategy: TurnOrderStrategy;

  constructor(agents: AgentSession[], strategy: TurnOrderStrategy) {
    this.strategy = strategy;
    this.recalculateOrder(agents);
  }

  getCurrentAgent(): AgentId {
    return this.order[this.currentIndex];
  }

  advance(): void {
    this.currentIndex = (this.currentIndex + 1) % this.order.length;
  }

  recalculateOrder(agents: AgentSession[]): void {
    switch (this.strategy) {
      case 'sequential':
        this.order = agents.map(a => a.id);
        break;
      case 'initiative':
        this.order = [...agents]
          .sort((a, b) => b.stats.initiative - a.stats.initiative)
          .map(a => a.id);
        break;
      case 'round-robin':
        // Maintain relative order but rotate
        break;
    }
    this.currentIndex = 0;
  }

  getRemainingAgents(): AgentId[] {
    return this.order.slice(this.currentIndex + 1).concat(this.order.slice(0, this.currentIndex + 1));
  }
}
```

---

## Time Management

### Turn Timeouts

```typescript
// packages/runtime/src/battle/timeouts.ts
export class TimeoutManager {
  private timers = new Map<string, NodeJS.Timeout>();
  private budgets = new Map<string, number>();

  startTurn(agentId: AgentId, budgetMs: number): void {
    this.budgets.set(agentId, budgetMs);
    
    // Warning at 80%
    setTimeout(() => {
      this.emitWarning(agentId, 'time-warning', { remaining: budgetMs * 0.2 });
    }, budgetMs * 0.8);

    // Hard timeout - forces Agent to pass via Controller
    const timer = setTimeout(() => {
      this.emitWarning(agentId, 'time-expired', { remaining: 0 });
      this.handleTimeout(agentId);
    }, budgetMs);

    this.timers.set(agentId, timer);
  }

  extendTurn(agentId: AgentId, extraMs: number): void {
    const current = this.budgets.get(agentId) || 0;
    this.budgets.set(agentId, current + extraMs);
    
    const timer = this.timers.get(agentId);
    if (timer) clearTimeout(timer);
    this.startTurn(agentId, current + extraMs);
  }

  endTurn(agentId: AgentId): void {
    const timer = this.timers.get(agentId);
    if (timer) clearTimeout(timer);
    this.timers.delete(agentId);
    this.budgets.delete(agentId);
  }

  private handleTimeout(agentId: AgentId): void {
    // Forces Agent to pass turn via Controller/MCP
    this.controller.execute({
      agentId,
      tool: 'pass',
      params: {},
    });
  }
}
```

---

## State Management

### World State (ARENA'S World State)

```typescript
// packages/sdk/src/types/world-state.ts
export interface WorldState {
  readonly tick: number;
  readonly turn: number;
  readonly seed: number;
  readonly entities: Map<EntityId, Entity>;
  readonly grid?: GridState;
  readonly physics?: PhysicsState;
  readonly resources: Map<ResourceId, Resource>;
  readonly players: Map<AgentId, PlayerState>;
  readonly projectiles: Projectile[];
  readonly effects: Effect[];
  readonly events: DomainEvent[]; // This turn's events
  readonly metadata: WorldMetadata;
}

export interface Entity {
  readonly id: EntityId;
  readonly type: EntityType;
  readonly position: Position;
  readonly rotation?: Rotation;
  readonly velocity?: Velocity;
  readonly health: number;
  readonly maxHealth: number;
  readonly ownerId?: AgentId;
  readonly properties: Record<string, unknown>;
  readonly tags: string[];
}

export interface GridState {
  readonly width: number;
  readonly height: number;
  readonly cells: GridCell[][];
  readonly fogOfWar?: FogOfWar;
}
```

**This is the ARENA's world state model. It's updated by the Arena after observing Game results. The Game has its own native internal state.**

---

## Event Emission

```typescript
// packages/runtime/src/battle/events.ts
export class BattleEventEmitter {
  constructor(private eventBus: EventBus) {}

  emitTurnStart(battleId: BattleId, turn: number, agentId: AgentId): void {
    this.eventBus.publish({
      type: 'TurnStarted',
      aggregateId: battleId,
      timestamp: new Date(),
      version: turn,
      payload: { turn, activeAgent: agentId },
      metadata: { correlationId: battleId, causationId: '', source: 'battle' },
    });
  }

  emitAction(battleId: BattleId, turn: number, agentId: AgentId, action: AgentAction, result: ActionResult): void {
    this.eventBus.publish({
      type: 'ActionExecuted',
      aggregateId: battleId,
      timestamp: new Date(),
      version: turn,
      payload: { agentId, action, result },
      metadata: { correlationId: battleId, causationId: '', source: 'battle' },
    });
  }

  emitStateChange(battleId: BattleId, turn: number, changes: StateChange[]): void {
    this.eventBus.publish({
      type: 'StateChanged',
      aggregateId: battleId,
      timestamp: new Date(),
      version: turn,
      payload: { changes },
      metadata: { correlationId: battleId, causationId: '', source: 'battle' },
    });
  }

  emitWinCondition(battleId: BattleId, winner: AgentId, condition: WinCondition): void {
    this.eventBus.publish({
      type: 'WinConditionMet',
      aggregateId: battleId,
      timestamp: new Date(),
      version: 0,
      payload: { winner, condition },
      metadata: { correlationId: battleId, causationId: '', source: 'battle' },
    });
  }
}
```

---

## Error Handling & Recovery

```typescript
// packages/runtime/src/battle/errors.ts
export class BattleErrorHandler {
  async handleError(battle: BattleInstance, error: Error, context: ErrorContext): Promise<ErrorResolution> {
    battle.logger.error('Battle error', { error: error.message, context });

    const severity = this.classifyError(error);

    switch (severity) {
      case 'recoverable':
        return this.attemptRecovery(battle, error, context);
      
      case 'agent':
        return this.handleAgentError(battle, error, context);
      
      case 'critical':
        return this.abortBattle(battle, error);
    }
  }

  private async attemptRecovery(battle: BattleInstance, error: Error, context: ErrorContext): Promise<ErrorResolution> {
    if (context.retryCount < 3) {
      await this.delay(1000 * (context.retryCount + 1));
      return { action: 'retry', retryCount: context.retryCount + 1 };
    }
    return { action: 'pass-turn' };
  }

  private async handleAgentError(battle: BattleInstance, error: Error, context: ErrorContext): Promise<ErrorResolution> {
    const agent = battle.agents.find(a => a.id === context.agentId);
    if (!agent) return { action: 'continue' };

    await agent.disconnect();
    const replacement = await this.createReplacementAgent(agent);
    battle.agents = battle.agents.map(a => a.id === agent.id ? replacement : a);
    
    return { action: 'replace-agent', newAgent: replacement };
  }

  private async abortBattle(battle: BattleInstance, error: Error): Promise<ErrorResolution> {
    await battle.abort(`Critical error: ${error.message}`);
    return { action: 'aborted' };
  }
}
```

---

## Performance Optimization

### Batching & Parallelism

```typescript
// packages/runtime/src/battle/optimization.ts
export class BatchOptimizer {
  // Batch observations for multiple agents
  async captureBatchObservations(
    agents: AgentSession[],
    worldState: WorldState
  ): Promise<Map<AgentId, Observation>> {
    const observations = await this.arena.getBatchObservations(
      agents.map(a => a.id),
      worldState
    );
    
    await Promise.all(
      agents.map(agent => agent.observe(observations.get(agent.id)!))
    );
    
    return observations;
  }

  // Batch action validation for simultaneous turns (Arena validates)
  async validateBatchActions(
    actions: Map<AgentId, AgentAction>,
    worldState: WorldState
  ): Promise<Map<AgentId, ValidationResult>> {
    const validations = await Promise.all(
      Array.from(actions.entries()).map(([agentId, action]) => 
        this.arena.validateAction(action, worldState).then(v => [agentId, v] as const)
      )
    );
    return new Map(validations);
  }
}
```

### Caching

```typescript
// packages/runtime/src/battle/caching.ts
export class BattleCache {
  private observationCache = new Map<string, Observation>();
  private validationCache = new Map<string, ValidationResult>();
  private maxSize = 1000;

  getObservationCacheKey(agentId: AgentId, stateHash: string): string {
    return `${agentId}:${stateHash}`;
  }

  getObservation(agentId: AgentId, stateHash: string): Observation | undefined {
    return this.observationCache.get(this.getObservationCacheKey(agentId, stateHash));
  }

  setObservation(agentId: AgentId, stateHash: string, observation: Observation): void {
    if (this.observationCache.size >= this.maxSize) {
      const firstKey = this.observationCache.keys().next().value;
      this.observationCache.delete(firstKey);
    }
    this.observationCache.set(this.getObservationCacheKey(agentId, stateHash), observation);
  }
}
```

---

## Summary: Who Does What

| Step | Who | What |
|------|-----|------|
| **Decide** | Agent (LLM) | Reasons about observation, chooses action |
| **Execute** | Agent → Controller/MCP | Sends input directly to Game (NO Arena) |
| **Run** | Game (native) | Processes input, updates native state |
| **Capture** | Observer | Captures Game output (frames, accessibility, etc.) |
| **Observe** | Arena | Calls `getObservation()` from Observer data |
| **React** | Arena | Updates its world state via `executeAction()`, checks `checkWinCondition()` |
| **Coordinate** | Battle Orchestrator | Emits events, advances turn, manages lifecycle |

**The Arena is the environment that observes and reacts. The Agent is the actor that executes on the Game. The Game just runs. The Observer just captures.**