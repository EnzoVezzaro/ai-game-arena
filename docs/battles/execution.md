# Battle Execution

> The interaction loop, turn execution, agent coordination, and battle orchestration — all running inside an Arena.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ARENA                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    BATTLE ORCHESTRATOR                         │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │                                                              │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │   │
│  │  │   TURN 1    │───►│   TURN 2    │───►│   TURN N    │      │   │
│  │  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘      │   │
│  │         │                  │                  │              │   │
│  │    ┌────┴────┐         ┌────┴────┐        ┌────┴────┐       │   │
│  │    │ Observe │         │ Observe │        │ Observe │       │   │
│  │    └────┬────┘         └────┬────┘        └────┬────┘       │   │
│  │         │                   │                   │             │   │
│  │    ┌────┴────┐         ┌────┴────┐        ┌────┴────┐       │   │
│  │    │  Agent  │         │  Agent  │        │  Agent  │       │   │
│  │    │ Decides │         │ Decides │        │ Decides │       │   │
│  │    └────┬────┘         └────┬────┘        └────┬────┘       │   │
│  │         │                   │                   │             │   │
│  │    ┌────┴────┐         ┌────┴────┐        ┌────┴────┐       │   │
│  │    │ Action  │         │ Action  │        │ Action  │       │   │
│  │    └────┬────┘         └────┬────┘        └────┬────┘       │   │
│  │         │                   │                   │             │   │
│  │    ┌────┴────┐         ┌────┴────┐        ┌────┴────┐       │   │
│  │    │ Execute │         │ Execute │        │ Execute │       │   │
│  │    └────┬────┘         └────┬────┘        └────┬────┘       │   │
│  │         │                   │                   │             │   │
│  │    ┌────┴────┐         ┌────┴────┐        ┌────┴────┐       │   │
│  │    │  State  │         │  State  │        │  State  │       │   │
│  │    │ Update  │         │ Update  │        │ Update  │       │   │
│  │    └─────────┘         └─────────┘        └─────────┘       │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Turn Execution

### Turn Phases

```typescript
// packages/runtime/src/battle/turn.ts
export type TurnPhase = 
  | 'observation'    // Capture & deliver observations
  | 'reasoning'      // Agent LLM processing
  | 'action'         // Execute chosen action
  | 'resolution'     // Apply state changes, check win
  | 'cleanup';       // Emit events, advance turn

export interface TurnContext {
  readonly battleId: BattleId;
  readonly turn: number;
  readonly phase: TurnPhase;
  readonly activeAgent: AgentId;
  readonly worldState: WorldState;
  readonly startTime: number;
  readonly timeBudget: number; // ms remaining
}
```

### Turn Executor

```typescript
// packages/runtime/src/battle/turn-executor.ts
export class TurnExecutor {
  constructor(
    private arena: ArenaPlugin,
    private controller: ControllerInstance,
    private observation: ObservationPipeline,
    private agentRuntime: AgentRuntime,
    private eventBus: EventBus,
    private config: TurnExecutorConfig
  ) {}

  async executeTurn(context: TurnContext): Promise<TurnResult> {
    const { battleId, turn, activeAgent, worldState } = context;
    const startTime = Date.now();

    try {
      // Phase 1: Observation
      context.phase = 'observation';
      const observation = await this.captureObservation(activeAgent, worldState);
      await this.agentRuntime.observe(activeAgent, observation);

      // Phase 2: Reasoning
      context.phase = 'reasoning';
      const action = await this.executeWithTimeout(
        () => this.agentRuntime.decide(activeAgent),
        this.getTimeBudget(context)
      );

      // Phase 3: Action
      context.phase = 'action';
      const result = await this.executeAction(activeAgent, action);

      // Phase 4: Resolution
      context.phase = 'resolution';
      const newState = this.arena.executeAction(action, worldState);
      const winCondition = this.arena.checkWinCondition(newState);

      // Phase 5: Cleanup
      context.phase = 'cleanup';
      await this.emitTurnEvents(battleId, turn, activeAgent, action, result, newState, winCondition);

      return {
        success: true,
        newState,
        winCondition,
        duration: Date.now() - startTime,
        action,
        result,
      };

    } catch (error) {
      return this.handleTurnError(context, error, Date.now() - startTime);
    }
  }

  private async captureObservation(agentId: AgentId, state: WorldState): Promise<Observation> {
    const observation = this.arena.getObservation(agentId, state);
    this.observation.record(agentId, observation);
    return observation;
  }

  private async executeAction(agentId: AgentId, action: AgentAction): Promise<ActionResult> {
    // Convert to controller action
    const controllerAction: ControllerAction = {
      agentId,
      tool: action.tool,
      params: action.params,
    };

    // Execute via controller (MCP)
    return this.controller.execute(controllerAction);
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new TimeoutError(`Timeout after ${timeout}ms`)), timeout)
      ),
    ]);
  }

  private getTimeBudget(context: TurnContext): number {
    const elapsed = Date.now() - context.startTime;
    return Math.max(1000, context.timeBudget - elapsed);
  }
}
```

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

### Simultaneous Actions

```typescript
// packages/runtime/src/battle/simultaneous.ts
export class SimultaneousTurnExecutor {
  async executeSimultaneousTurn(
    agents: AgentSession[],
    worldState: WorldState
  ): Promise<SimultaneousTurnResult> {
    // 1. Capture all observations in parallel
    const observations = await Promise.all(
      agents.map(agent => this.arena.getObservation(agent.id, worldState))
    );

    // 2. Deliver to all agents
    await Promise.all(
      agents.map((agent, i) => agent.observe(observations[i]))
    );

    // 3. Collect all decisions in parallel
    const decisions = await Promise.all(
      agents.map(agent => agent.decide())
    );

    // 4. Validate all actions
    const validated = await this.validateActions(decisions, worldState);

    // 5. Execute all actions (order may matter for conflicts)
    const results = await this.executeActions(validated);

    // 6. Resolve conflicts (same target, mutually exclusive actions)
    const resolved = this.resolveConflicts(results);

    // 7. Apply state changes
    const newState = this.applyAllChanges(worldState, resolved);

    return { newState, results: resolved, conflicts: resolved.conflicts };
  }

  private resolveConflicts(results: ActionResult[]): ResolvedActions {
    // Detect: same target, mutually exclusive actions
    const conflicts = this.detectConflicts(results);
    
    for (const conflict of conflicts) {
      // Resolution: priority by initiative, or random, or arena rules
      const winner = this.resolveConflict(conflict);
      // Loser actions become no-ops or alternatives
    }

    return { actions: results, conflicts };
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

    // Hard timeout
    const timer = setTimeout(() => {
      this.emitWarning(agentId, 'time-expired', { remaining: 0 });
      this.handleTimeout(agentId);
    }, budgetMs);

    this.timers.set(agentId, timer);
  }

  extendTurn(agentId: AgentId, extraMs: number): void {
    const current = this.budgets.get(agentId) || 0;
    this.budgets.set(agentId, current + extraMs);
    
    // Reset timer
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
    // Force 'pass' action
    this.controller.execute({
      agentId,
      tool: 'pass',
      params: {},
    });
  }
}
```

### Time Budget Allocation

```typescript
// packages/runtime/src/battle/budget.ts
export interface TimeBudgetConfig {
  readonly baseBudget: number;        // Base ms per turn
  readonly complexityMultiplier: number; // Multiply by action complexity
  readonly observationBudget: number; // Ms for observation capture
  readonly reasoningBudget: number;   // Ms for LLM reasoning
  readonly actionBudget: number;      // Ms for action execution
  readonly buffer: number;            // Safety buffer
}

export const DEFAULT_TIME_BUDGET: TimeBudgetConfig = {
  baseBudget: 30000,      // 30 seconds
  complexityMultiplier: 1.5,
  observationBudget: 2000, // 2 seconds
  reasoningBudget: 25000,  // 25 seconds
  actionBudget: 3000,      // 3 seconds
  buffer: 1000,            // 1 second
};

export function calculateTurnBudget(
  config: TimeBudgetConfig,
  agent: AgentSession,
  turn: number,
  worldState: WorldState
): number {
  let budget = config.baseBudget;
  
  // Adjust for complexity (more entities = more complex)
  const complexity = Math.log10(worldState.entities.size + 1);
  budget *= 1 + complexity * 0.1;
  
  // Adjust for agent performance history
  const avgTime = agent.metrics.avgTurnTime || config.baseBudget;
  budget = Math.max(budget, avgTime * 1.2);
  
  // Minimum budget
  return Math.max(budget, config.observationBudget + config.reasoningBudget + config.actionBudget + config.buffer);
}
```

---

## State Management

### World State

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

### State Transitions

```typescript
// packages/runtime/src/battle/state-machine.ts
export class BattleStateMachine {
  private state: BattlePhase = 'created';

  transition(event: BattleEvent): BattlePhase {
    const current = this.state;
    const next = this.getNextState(current, event);
    
    if (next === current) return current;
    
    // Validate transition
    if (!this.isValidTransition(current, next)) {
      throw new BattleError(`Invalid transition: ${current} → ${next}`);
    }

    this.state = next;
    this.emitStateChange(current, next, event);
    
    return next;
  }

  private getNextState(current: BattlePhase, event: BattleEvent): BattlePhase {
    switch (current) {
      case 'created':
        return event.type === 'BattleInitialized' ? 'initializing' : current;
      
      case 'initializing':
        return event.type === 'BattleStarted' ? 'running' : current;
      
      case 'running':
        if (event.type === 'BattlePaused') return 'paused';
        if (event.type === 'BattleFinished') return 'completed';
        if (event.type === 'BattleAborted') return 'aborted';
        return current;
      
      case 'paused':
        if (event.type === 'BattleResumed') return 'running';
        if (event.type === 'BattleAborted') return 'aborted';
        return current;
      
      case 'completed':
      case 'aborted':
        return current; // Terminal states
      
      default:
        return current;
    }
  }

  private isValidTransition(from: BattlePhase, to: BattlePhase): boolean {
    const validTransitions: Record<BattlePhase, BattlePhase[]> = {
      created: ['initializing'],
      initializing: ['running', 'aborted'],
      running: ['paused', 'completed', 'aborted'],
      paused: ['running', 'aborted'],
      completed: [],
      aborted: [],
    };
    
    return validTransitions[from]?.includes(to) ?? false;
  }
}
```

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
    // Log error
    battle.logger.error('Battle error', { error: error.message, context });

    // Determine severity
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
    // Retry logic
    if (context.retryCount < 3) {
      await this.delay(1000 * (context.retryCount + 1));
      return { action: 'retry', retryCount: context.retryCount + 1 };
    }

    // Fallback: pass turn
    return { action: 'pass-turn' };
  }

  private async handleAgentError(battle: BattleInstance, error: Error, context: ErrorContext): Promise<ErrorResolution> {
    const agent = battle.agents.find(a => a.id === context.agentId);
    if (!agent) return { action: 'continue' };

    // Disconnect problematic agent
    await agent.disconnect();
    
    // Replace with spectator or AI
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
    // Single arena call for all observations
    const observations = await this.arena.getBatchObservations(
      agents.map(a => a.id),
      worldState
    );
    
    // Parallel delivery
    await Promise.all(
      agents.map(agent => agent.observe(observations.get(agent.id)!))
    );
    
    return observations;
  }

  // Batch action execution for simultaneous turns
  async executeBatchActions(
    actions: Map<AgentId, AgentAction>,
    worldState: WorldState
  ): Promise<Map<AgentId, ActionResult>> {
    // Validate all first
    const validations = await Promise.all(
      Array.from(actions.entries()).map(([agentId, action]) => 
        this.arena.validateAction(action, worldState).then(v => [agentId, v] as const)
      )
    );

    // Execute valid actions in parallel
    const validActions = new Map(validations.filter(([, v]) => v.valid));
    const results = await Promise.all(
      Array.from(validActions.entries()).map(([agentId, action]) =>
        this.controller.execute({ agentId, tool: action.tool, params: action.params })
          .then(r => [agentId, r] as const)
      )
    );

    return new Map(results);
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
      // LRU eviction
      const firstKey = this.observationCache.keys().next().value;
      this.observationCache.delete(firstKey);
    }
    this.observationCache.set(this.getObservationCacheKey(agentId, stateHash), observation);
  }
}
```