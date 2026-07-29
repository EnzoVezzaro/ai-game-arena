# Game Lifecycle

> The complete lifecycle of a Game Adapter as a component hosted inside an Arena, from initialization to disposal.

---

## Overview

The Game is **hosted by the Arena**. The Arena owns the Game's lifecycle — launching it, connecting controllers/observations, starting/stopping it, and disposing it. The Game itself knows nothing about the Arena, battles, agents, spectators, or any other Arena systems.

```
┌─────────────────────────────────────────────────────────────────────┐
│                            ARENA                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      GAME LIFECYCLE                           │   │
│  │                                                               │   │
│  │  Created ──► Initializing ──► Launching ──► Connecting       │   │
│  │                                    │                           │   │
│  │                                    ▼                           │   │
│  │                              Running ◄──► Suspended           │   │
│  │                                    │                           │   │
│  │                                    ▼                           │   │
│  │                              Stopping ──► Disposed            │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         ▲                    ▲                    ▲                │
│         │                    │                    │                │
│    Arena calls          Arena calls         Arena calls         │
│    initialize()         launch()            start()              │
│    attachController()   attachObservation() suspend/resume()     │
│    stop()               dispose()                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Lifecycle Methods

### initialize(config)

```typescript
interface GameAdapter {
  initialize(config: GameConfig): Promise<void>;
}

interface GameConfig {
  readonly seed?: number;
  readonly headless?: boolean;
  readonly config?: Record<string, unknown>;
  readonly arenaId?: ArenaId;    // For context only — Game doesn't use this
  readonly battleId?: BattleId;  // For context only — Game doesn't use this
}
```

**Responsibilities:**
- Validate configuration
- Prepare working directory
- Download/verify assets if needed
- Initialize random seed
- **Must not** start the game process

**Errors:**
- `InvalidConfigError` — Config validation failed
- `AssetMissingError` — Required assets not found
- `IncompatibleVersionError` — Engine version mismatch

### launch()

```typescript
interface GameAdapter {
  launch(): Promise<GameProcess>;
}

interface GameProcess {
  readonly pid: number;
  readonly controllerPort: number;
  readonly observationPort: number;
  stop(): Promise<void>;
}
```

**Responsibilities:**
- Spawn native process (or connect to browser/WASM/remote)
- Allocate controller/observation ports
- Wait for `aga:ready` handshake
- Return process handle with ports

**Timeline:**
```
T+0ms      spawn()
T+50ms     process stdout: "aga:ready"
T+100ms    WebSocket servers listening on ports
T+200ms    launch() resolves
```

**Errors:**
- `LaunchTimeoutError` — No ready signal within 30s
- `PortConflictError` — Ports already in use
- `ProcessSpawnError` — Executable not found, permissions

### attachController(adapter)

```typescript
interface GameAdapter {
  attachController(adapter: ControllerAdapter): Promise<void>;
}

interface ControllerAdapter {
  readonly gameId: GameId;
  sendAction(action: ControllerAction): Promise<ActionResult>;
  sendBatch(actions: ControllerAction[]): Promise<ActionResult[]>;
  getGameState(): Promise<GameState>;
  subscribeToState(handler: StateHandler): Subscription;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}
```

**Responsibilities:**
- Connect to game's controller port
- Register action handlers
- Set up state synchronization
- **Must be called before start()**

### attachObservation(adapter)

```typescript
interface GameAdapter {
  attachObservation(adapter: ObservationAdapter): Promise<void>;
}

interface ObservationAdapter {
  readonly gameId: GameId;
  capture(agentId: AgentId): Promise<Observation>;
  captureAll(): Promise<Map<AgentId, Observation>>;
  subscribe(agentId: AgentId, handler: ObservationHandler): Subscription;
  unsubscribe(agentId: AgentId): void;
  setConfig(config: ObservationConfig): void;
  getConfig(): ObservationConfig;
}
```

**Responsibilities:**
- Connect to game's observation port
- Register capture handlers
- Set up streaming subscriptions
- **Must be called before start()**

### start()

```typescript
interface GameAdapter {
  start(): Promise<void>;
}
```

**Responsibilities:**
- Send `aga:start` to game
- Begin game loop (if turn-based)
- Enable action processing
- Start observation streaming

### stop()

```typescript
interface GameAdapter {
  stop(): Promise<void>;
}
```

**Responsibilities:**
- Send `aga:stop` to game
- Wait for graceful shutdown (5s timeout)
- Force kill if needed
- Stop observation streaming
- Close controller connection

### suspend()

```typescript
interface GameAdapter {
  suspend(): Promise<void>;
}
```

**Responsibilities:**
- Send `aga:pause` to game
- Pause game loop
- Preserve all state
- Stop accepting new actions
- Keep connections alive

### resume()

```typescript
interface GameAdapter {
  resume(): Promise<void>;
}
```

**Responsibilities:**
- Send `aga:resume` to game
- Resume game loop
- Resume action processing
- Resume observation streaming

### dispose()

```typescript
interface GameAdapter {
  dispose(): Promise<void>;
}
```

**Responsibilities:**
- Call `stop()` if running
- Terminate process
- Close all connections
- Release ports
- Clean up temp files
- **Idempotent** — safe to call multiple times

---

## State Transitions

| From → To | Trigger | Required | Optional |
|-----------|---------|----------|----------|
| Created → Initializing | `initialize()` | config | - |
| Initializing → Launching | `launch()` | - | - |
| Launching → Connecting | `attachController()` + `attachObservation()` | both | - |
| Connecting → Running | `start()` | - | - |
| Running → Suspended | `suspend()` | - | - |
| Suspended → Running | `resume()` | - | - |
| Running → Stopping | `stop()` | - | - |
| Suspended → Stopping | `stop()` | - | - |
| Stopping → Disposed | `dispose()` | - | - |
| Any → Disposed | `dispose()` (force) | - | - |

---

## Error Handling

```typescript
type GameAdapterError = 
  | { type: 'InvalidConfig'; message: string; field?: string }
  | { type: 'LaunchTimeout'; timeout: number }
  | { type: 'ProcessSpawnFailed'; cause: Error }
  | { type: 'ConnectionFailed'; port: number; cause: Error }
  | { type: 'ActionTimeout'; action: ControllerAction; timeout: number }
  | { type: 'GameCrashed'; exitCode: number; signal?: string }
  | { type: 'ProtocolError'; message: string; rawMessage: string };

interface GameAdapter {
  onError: Event<GameAdapterError>;
}
```

**Error Recovery:**

| Error | Recovery |
|-------|----------|
| `ActionTimeout` | Retry once, then abort battle |
| `ConnectionFailed` | Reconnect (max 3 attempts) |
| `GameCrashed` | Abort battle, record crash in replay |
| `ProtocolError` | Log, continue (may be transient) |

---

## Battle Integration

The Arena orchestrates the Game through a `GameSession`:

```typescript
// packages/runtime/src/battle/game-session.ts
export class GameSession {
  private state: GameSessionState = 'created';
  private adapter: GameAdapter;
  private controllerAdapter: ControllerAdapter;
  private observationAdapter: ObservationAdapter;

  constructor(
    private readonly gameId: GameId,
    private readonly config: GameConfig,
    private readonly battleId: BattleId
  ) {}

  async initialize(): Promise<void> {
    this.adapter = await this.createAdapter();
    await this.adapter.initialize(this.config);
    
    this.controllerAdapter = await this.createControllerAdapter();
    this.observationAdapter = await this.createObservationAdapter();
    
    await this.adapter.attachController(this.controllerAdapter);
    await this.adapter.attachObservation(this.observationAdapter);
    
    this.state = 'initialized';
  }

  async start(): Promise<void> {
    if (this.state !== 'initialized') {
      throw new GameError('Game not initialized');
    }
    await this.adapter.start();
    this.state = 'running';
  }

  async suspend(): Promise<void> {
    if (this.state !== 'running') return;
    await this.adapter.suspend();
    this.state = 'suspended';
  }

  async resume(): Promise<void> {
    if (this.state !== 'suspended') return;
    await this.adapter.resume();
    this.state = 'running';
  }

  async stop(): Promise<void> {
    if (this.state === 'disposed') return;
    
    this.state = 'stopping';
    try {
      await this.adapter.stop();
    } finally {
      await this.adapter.dispose();
      this.state = 'disposed';
    }
  }

  async executeAction(agentId: AgentId, action: ControllerAction): Promise<ActionResult> {
    if (this.state !== 'running') {
      throw new GameError('Game not running');
    }
    return this.controllerAdapter.sendAction({ ...action, agentId });
  }

  async captureObservation(agentId: AgentId): Promise<Observation> {
    return this.observationAdapter.capture(agentId);
  }
}
```

---

## Determinism Requirements

For replay to work, games **must** be deterministic:

| Requirement | Implementation |
|-------------|----------------|
| **Seedable RNG** | Accept `seed` in config, use for all randomness |
| **Fixed timestep** | Game logic runs at fixed tick rate (e.g., 20Hz) |
| **No wall-clock time** | Never use `Date.now()` or `performance.now()` in logic |
| **Deterministic physics** | Fixed-point or deterministic float math |
| **Ordered events** | Event queue processed in deterministic order |
| **No external entropy** | No `Math.random()`, no system RNG |

**Validation:**

```typescript
// packages/runtime/tests/determinism.test.ts
it('produces identical replays with same seed', async () => {
  const seed = 42;
  const config = { seed, maxTurns: 100 };
  
  const replay1 = await runBattle(config);
  const replay2 = await runBattle(config);
  
  expect(replay1.events).toEqual(replay2.events);
  expect(replay1.finalState).toEqual(replay2.finalState);
});
```

---

## Configuration Schema

```typescript
// packages/sdk/src/schemas/game-config.ts
export const GameConfigSchema = z.object({
  seed: z.number().int().optional(),
  headless: z.boolean().default(true),
  config: z.record(z.unknown()).optional(),
  arenaId: z.string().optional(),
  battleId: z.string().optional(),
  
  // Engine-specific
  difficulty: z.enum(['easy', 'normal', 'hard', 'expert']).optional(),
  mapSize: z.enum(['small', 'medium', 'large', 'custom']).optional(),
  customMap: z.string().optional(),
  
  // Performance
  tickRate: z.number().int().min(1).max(120).default(20),
  maxTurns: z.number().int().min(1).default(1000),
  turnTimeoutMs: z.number().int().min(1000).default(30000),
  
  // Features
  fogOfWar: z.boolean().default(true),
  friendlyFire: z.boolean().default(false),
  replaysEnabled: z.boolean().default(true),
});
```

---

## Forbidden in Game Adapter

| Forbidden | Reason |
|-----------|--------|
| AI decision logic | Belongs in AgentRuntime |
| Controller implementation | Belongs in Controller package |
| Observation processing | Belongs in Observation package |
| Battle orchestration | Belongs in BattleManager (Arena) |
| Plugin management | Belongs in PluginManager |
| Networking (except adapter transport) | Transport only |
| Persistence | Belongs in Storage package |
| UI rendering | Belongs in Frontend |

---

## Testing Checklist

- [ ] `initialize()` validates config correctly
- [ ] `launch()` spawns process and waits for ready
- [ ] `attachController()` connects to controller port
- [ ] `attachObservation()` connects to observation port
- [ ] `start()` begins game loop
- [ ] `stop()` gracefully shuts down
- [ ] `suspend()`/`resume()` preserve state
- [ ] `dispose()` cleans up resources (idempotent)
- [ ] Handles process crashes
- [ ] Supports deterministic replay with same seed
- [ ] Runs in headless mode for CI