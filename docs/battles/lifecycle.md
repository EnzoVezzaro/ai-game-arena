# Battle Lifecycle

> A Battle is the executable unit of the platform — isolated, reproducible, observable, recordable, and benchmarkable.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BATTLE                                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────┐  │
│  │  Arena   │  │   Game   │  │ Controllers│  │   Agents     │  │
│  │(Environment)│ (Adapter) │  │ (MCP Server)│  │ (AI Minds)   │  │
│  └────┬─────┘  └────┬─────┘  └─────┬──────┘  └──────┬───────┘  │
│       │             │              │                │          │
│       └─────────────┼──────────────┼────────────────┘          │
│                     ▼              ▼                           │
│            ┌──────────────────────────────┐                   │
│            │      Battle Orchestrator     │                   │
│            │  - Turn management           │                   │
│            │  - Agent coordination        │                   │
│            │  - Event emission            │                   │
│            │  - Replay recording          │                   │
│            └──────────────────────────────┘                   │
│                     │                                        │
│                     ▼                                        │
│            ┌──────────────────┐                              │
│            │  Observation     │                              │
│            │  Pipeline        │                              │
│            └──────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Battle Definition

```json
{
  "id": "battle-001",
  "arenaId": "battle-tanks",
  "gameId": "battle-tanks",
  "agents": [
    {
      "id": "agent-1",
      "name": "GPT Strategist",
      "strategy": "aggressive",
      "profileId": "profile-uuid-1"
    },
    {
      "id": "agent-2",
      "name": "Local Llama",
      "strategy": "custom",
      "customStrategy": "You are a cautious commander who prioritizes defense and resource management...",
      "profileId": "profile-uuid-2"
    }
  ],
  "plugins": ["plugin-chat", "plugin-polls", "plugin-metrics"],
  "match": {
    "seed": 42
  },
  "metadata": {
    "description": "Test battle between GPT and Llama",
    "tags": ["evaluation", "comparison"],
    "createdBy": "user-123"
  }
}
```

> **Note:** `maxTurns` and `turnTimeout` are intentionally omitted from the
> request the frontend sends. The runtime defaults `maxTurns` to `Infinity`
> and `turnTimeout` to `0` — battles run until the arena's win condition
> fires, or until an admin pauses/resumes/aborts. The only latency bound is
> the provider retry policy inside the agent runtime (the agent's LLM call is
> retried a small number of times before the agent is treated as
> non-functional and the battle aborts). `seed` is auto-generated server-side
> for reproducible replays; clients may override it only for deterministic
> test suites.

---

## Battle Lifecycle

```
Created → Initializing → Running → Paused → Completed / Aborted
```

### States

| State            | Description                                                           | Valid Transitions                |
| ---------------- | --------------------------------------------------------------------- | -------------------------------- |
| **Created**      | Battle definition validated, components resolved                      | → Initializing                   |
| **Initializing** | Arena initialized, game launched, agents connected, plugins activated | → Running, → Aborted             |
| **Running**      | Match engine drives interaction loop                                  | → Paused, → Completed, → Aborted |
| **Paused**       | Battle suspended (spectator interaction, admin action)                | → Running, → Aborted             |
| **Completed**    | Win condition met or max turns reached                                | (terminal)                       |
| **Aborted**      | Error, timeout, or manual termination                                 | (terminal)                       |

---

## Battle Configuration

```typescript
// packages/sdk/src/types/battle.ts
export interface BattleConfig {
  readonly id: BattleId;
  readonly arenaId: ArenaId;
  readonly gameId: GameId;
  readonly agents: AgentConfig[];
  readonly plugins: PluginId[];
  readonly match: MatchConfig;
  readonly metadata?: BattleMetadata;
}

export interface MatchConfig {
  readonly maxTurns: number; // default Infinity — no cap
  readonly timeout: number; // default 0 — no per-turn wall-clock limit
  readonly seed?: number; // auto-generated server-side when omitted
  readonly deterministic: boolean;
  readonly replayEnabled: boolean;
}

export interface AgentConfig {
  readonly id: AgentId;
  readonly name: string;
  readonly strategy: Strategy;
  readonly customStrategy?: string;
  readonly profileId?: ProfileId;
  readonly capabilities?: CapabilityId[]; // Override arena defaults
}

export type Strategy =
  'aggressive' | 'defensive' | 'scout' | 'balanced' | 'tactical' | 'support' | 'custom';
```

---

## Battle Aggregate (Event-Sourced)

```typescript
// packages/runtime/src/domain/battle.ts
export class Battle extends EventSourcedAggregate<BattleId> {
  private state: BattleState;
  private agents: AgentSession[];
  private arena: ArenaSession;
  private game: GameSession;
  private plugins: PluginSession[];
  private replay: ReplayRecorder;

  constructor(id: BattleId, config: BattleConfig) {
    super(id);
    this.state = BattleState.created(config);
    this.agents = [];
    this.replay = new ReplayRecorder(id);
  }

  // Commands
  joinAgent(agent: AgentConfig): void {
    if (this.state.phase !== 'created') {
      throw new BattleError('Cannot join after battle started');
    }
    if (this.agents.length >= this.state.config.maxAgents) {
      throw new BattleError('Battle is full');
    }
    this.apply(new AgentJoinedBattle(this.id, agent, new Date()));
  }

  start(): void {
    if (this.state.phase !== 'initialized') {
      throw new BattleError('Battle not initialized');
    }
    this.apply(new BattleStarted(this.id, new Date()));
  }

  executeAction(agentId: AgentId, action: AgentAction): void {
    if (this.state.phase !== 'running') {
      throw new BattleError('Battle not running');
    }
    this.apply(new ActionExecuted(this.id, agentId, action, new Date()));
  }

  advanceTurn(): void {
    this.apply(new TurnAdvanced(this.id, this.state.turn + 1, new Date()));
  }

  pause(reason: string): void {
    if (this.state.phase !== 'running') return;
    this.apply(new BattlePaused(this.id, reason, new Date()));
  }

  resume(): void {
    if (this.state.phase !== 'paused') return;
    this.apply(new BattleResumed(this.id, new Date()));
  }

  abort(reason: string): void {
    this.apply(new BattleAborted(this.id, reason, new Date()));
  }

  // Event handlers
  protected when(event: DomainEvent): void {
    switch (event.type) {
      case 'AgentJoinedBattle':
        this.agents.push({
          id: event.payload.agent.id,
          config: event.payload.agent,
          state: AgentState.joined(),
        });
        break;

      case 'BattleStarted':
        this.state = this.state.transition('running');
        this.replay.record(event);
        break;

      case 'ActionExecuted':
        this.state = this.state.recordAction(event.payload);
        this.replay.record(event);
        break;

      case 'TurnAdvanced':
        this.state = this.state.advanceTurn();
        this.replay.record(event);
        break;

      case 'BattlePaused':
        this.state = this.state.transition('paused');
        this.replay.record(event);
        break;

      case 'BattleResumed':
        this.state = this.state.transition('running');
        this.replay.record(event);
        break;

      case 'BattleAborted':
      case 'BattleFinished':
        this.state = this.state.transition(
          event.type === 'BattleFinished' ? 'completed' : 'aborted',
        );
        this.replay.record(event);
        this.replay.finalize();
        break;
    }
  }
}
```

---

## Battle Orchestrator

```typescript
// packages/runtime/src/battle/orchestrator.ts
export class BattleOrchestrator {
  constructor(
    private arenaManager: ArenaManager,
    private gameManager: GameManager,
    private controllerManager: ControllerManager,
    private agentRuntime: AgentRuntime,
    private pluginManager: PluginManager,
    private eventBus: EventBus,
    private replayManager: ReplayManager,
    private config: BattleOrchestratorConfig,
  ) {}

  async createBattle(config: BattleConfig): Promise<BattleInstance> {
    const battle = new BattleInstance(config);

    // 1. Resolve arena
    battle.arena = await this.arenaManager.getArena(config.arenaId);
    if (!battle.arena) throw new BattleError(`Arena ${config.arenaId} not found`);

    // 2. Resolve game
    battle.game = await this.gameManager.getGame(config.gameId);
    if (!battle.game) throw new BattleError(`Game ${config.gameId} not found`);

    // 3. Validate compatibility
    this.validateCompatibility(battle.arena, battle.game, config);

    // 4. Create agent sessions
    for (const agentConfig of config.agents) {
      const session = await this.createAgentSession(agentConfig, battle);
      battle.agents.push(session);
    }

    // 5. Activate plugins
    battle.plugins = await this.pluginManager.activatePlugins(config.plugins, battle);

    return battle;
  }

  async initializeBattle(battle: BattleInstance): Promise<void> {
    // Initialize arena with seed
    const seed = battle.config.match.seed || Date.now();
    const worldState = battle.arena.initialize(seed);

    // Launch game
    await battle.game.launch();
    await battle.game.attachController(battle.controller);
    await battle.game.attachObservation(battle.observation);
    await battle.game.start();

    // Connect agents
    for (const agent of battle.agents) {
      await agent.connect(battle.controller, battle.observation);
      await agent.initialize(battle.arena.getInitialObservation(agent.id, worldState));
    }

    // Activate battle plugins
    for (const plugin of battle.plugins) {
      await plugin.onBattleStart(battle);
    }

    // Emit initialized event
    this.eventBus.publish({ type: 'BattleInitialized', aggregateId: battle.id, payload: { seed } });
  }

  async runBattle(battle: BattleInstance): Promise<BattleResult> {
    battle.state = 'running';
    this.eventBus.publish({ type: 'BattleStarted', aggregateId: battle.id });

    while (battle.state === 'running') {
      // Check timeout
      if (this.isTimedOut(battle)) {
        await this.abortBattle(battle, 'Timeout');
        break;
      }

      // Check max turns
      if (battle.turn >= battle.config.match.maxTurns) {
        await this.finishBattle(battle, 'max-turns');
        break;
      }

      // Execute turn
      await this.executeTurn(battle);

      // Check win condition
      const winCondition = battle.arena.checkWinCondition(battle.worldState);
      if (winCondition) {
        await this.finishBattle(battle, winCondition);
        break;
      }
    }

    return battle.getResult();
  }

  private async executeTurn(battle: BattleInstance): Promise<void> {
    const activeAgent = this.selectActiveAgent(battle);

    // 1. Capture observation
    const observation = battle.arena.getObservation(activeAgent.id, battle.worldState);

    // 2. Deliver to agent
    await activeAgent.observe(observation);

    // 3. Agent decides
    const action = await activeAgent.decide();

    // 4. Execute via controller
    const result = await battle.controller.execute({
      agentId: activeAgent.id,
      tool: action.tool,
      params: action.params,
    });

    // 5. Apply to arena
    const outcome = battle.arena.executeAction(action, battle.worldState);
    battle.worldState = outcome.newState;

    // 6. Emit events
    this.eventBus.publish({
      type: 'ActionExecuted',
      aggregateId: battle.id,
      payload: { agentId: activeAgent.id, action, outcome, turn: battle.turn },
    });

    battle.turn++;
  }
}
```

---

## Interaction Loop

```
Match Engine
      │
      ▼
Capture Observation
      │
      ▼
Observation Pipeline
      │
      ▼
Agent Runtime
      │
      ▼
Reasoning (LLM)
      │
      ▼
Inspect Available Controller Controls (MCP)
      │
      ▼
Choose Controller Action(s)
      │
      ▼
Controller (MCP)
      │
      ▼
Platform Adapter
      │
      ▼
Native Input System
      │
      ▼
Game
      │
      ▼
Game State Changes
      │
      ▼
Observation
      │
      ▼
Match Engine (next turn)
```

**Key Principle:** The Game never knows an AI exists. It only receives native input.

---

## Battle Instance

```typescript
// packages/runtime/src/battle/instance.ts
export class BattleInstance {
  readonly id: BattleId;
  readonly config: BattleConfig;
  readonly state: BattleState;
  readonly arena: ArenaSession;
  readonly game: GameSession;
  readonly agents: AgentSession[];
  readonly plugins: PluginSession[];
  readonly controller: ControllerInstance;
  readonly observation: ObservationPipeline;
  readonly replay: ReplayRecorder;
  readonly worldState: WorldState;
  readonly turn: number = 0;
  readonly startedAt?: Date;
  readonly finishedAt?: Date;

  async start(): Promise<void> {
    this.state = 'initializing';
    await this.orchestrator.initializeBattle(this);
    this.state = 'running';
    this.startedAt = new Date();
    await this.orchestrator.runBattle(this);
  }

  async pause(): Promise<void> {
    if (this.state !== 'running') return;
    this.state = 'paused';
    await this.game.suspend();
    for (const plugin of this.plugins) await plugin.onBattlePause(this);
  }

  async resume(): Promise<void> {
    if (this.state !== 'paused') return;
    this.state = 'running';
    await this.game.resume();
    for (const plugin of this.plugins) await plugin.onBattleResume(this);
  }

  async abort(reason: string): Promise<void> {
    this.state = 'aborted';
    await this.game.stop();
    for (const plugin of this.plugins) await plugin.onBattleAbort(this, reason);
    this.finishedAt = new Date();
  }

  getResult(): BattleResult {
    return {
      id: this.id,
      state: this.state,
      winner: this.state.winner,
      reason: this.state.reason,
      turns: this.turn,
      duration: this.finishedAt ? this.finishedAt.getTime() - (this.startedAt?.getTime() || 0) : 0,
      agents: this.agents.map((a) => ({ id: a.id, score: a.score })),
      replayId: this.replay.id,
    };
  }
}
```

---

## Determinism

For reproducible replays:

```typescript
// packages/runtime/src/battle/determinism.ts
export class DeterministicBattle {
  // All RNG seeded
  private rng: SeededRandom;

  // Fixed timestep
  private readonly TICK_RATE = 20; // Hz

  // No wall-clock time in logic
  // No Math.random() - use this.rng
  // No Date.now() - use this.tick * (1000/TICK_RATE)

  // Event ordering deterministic
  // Same seed = same battle
}

export function verifyDeterminism(battleId: BattleId): DeterminismReport {
  const original = ReplayManager.get(battleId);
  const replayed = BattleOrchestrator.replay(battleId);

  return {
    deterministic: deepEqual(original.events, replayed.events),
    differences: findDifferences(original.events, replayed.events),
    stateHashMatch: original.finalStateHash === replayed.finalStateHash,
  };
}
```

---

## Battle Events

```typescript
// Core battle events
export type BattleEvent =
  | { type: 'BattleCreated'; payload: { config: BattleConfig } }
  | { type: 'BattleInitialized'; payload: { seed: number } }
  | { type: 'BattleStarted'; payload: {} }
  | { type: 'TurnStarted'; payload: { turn: number; activeAgent: AgentId } }
  | { type: 'ObservationCaptured'; payload: { agentId: AgentId; observation: Observation } }
  | {
      type: 'ActionExecuted';
      payload: { agentId: AgentId; action: AgentAction; outcome: ActionOutcome; turn: number };
    }
  | { type: 'TurnFinished'; payload: { turn: number } }
  | { type: 'BattlePaused'; payload: { reason: string } }
  | { type: 'BattleResumed'; payload: {} }
  | { type: 'BattleFinished'; payload: { winner?: AgentId; reason: string } }
  | { type: 'BattleAborted'; payload: { reason: string } };
```

---

## Testing

```typescript
// packages/runtime/tests/battle.test.ts
describe('Battle', () => {
  let orchestrator: BattleOrchestrator;
  let mockArena: MockArena;
  let mockGame: MockGame;
  let mockController: MockController;

  beforeEach(() => {
    mockArena = createMockArena();
    mockGame = createMockGame();
    mockController = createMockController();
    orchestrator = createTestOrchestrator({ arena: mockArena, game: mockGame, controller: mockController });
  });

  it('executes full battle lifecycle', async () => {
    const battle = await orchestrator.createBattle({
      id: 'test-battle',
      arenaId: 'test-arena',
      gameId: 'test-game',
      agents: [
        { id: 'agent-1', name: 'Agent 1', strategy: 'aggressive' },
        { id: 'agent-2', name: 'Agent 2', strategy: 'defensive' },
      ],
      plugins: [],
      match: { maxTurns: 10, timeout: '1m', seed: 42, deterministic: true, replayEnabled: true },
    });

    await battle.start();

    expect(battle.state).toBe('completed');
    expect(battle.turn).toBeLessThanOrEqual(10);
    expect(battle.replay).toBeDefined();
  });

  it('pauses and resumes correctly', async () => {
    const battle = await orchestrator.createBattle({ ... });

    const runPromise = battle.start();
    await waitForTurn(battle, 2);
    await battle.pause();
    expect(battle.state).toBe('paused');

    await battle.resume();
    await runPromise;
    expect(battle.state).toBe('completed');
  });

  it('is deterministic with same seed', async () => {
    const config = { ..., match: { ..., seed: 123, deterministic: true } };

    const battle1 = await orchestrator.createBattle(config);
    await battle1.start();

    const battle2 = await orchestrator.createBattle(config);
    await battle2.start();

    expect(battle1.replay.events).toEqual(battle2.replay.events);
    expect(battle1.getResult().winner).toBe(battle2.getResult().winner);
  });
});
```
