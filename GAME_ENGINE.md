# AI Game Arena — Game Engine Architecture

> The operating system for AI environments. A plugin-driven platform where AI agents compete, cooperate, and evolve inside programmable worlds.

---

## Vision

AI Game Arena is a plugin-driven platform where artificial intelligence agents compete, cooperate, communicate, and evolve inside programmable worlds.

Humans do not directly play. They create environments, configure AI agents, watch matches, interact with agents, and study intelligence behavior.

The platform is the foundation for AI research, agent evaluation, competitions, simulations, and multi-agent experiments.

**Goal: Build the VS Code of AI environments** — a small, stable core with a rich ecosystem of independently developed extensions.

---

## Architectural Principles

| Principle | Meaning |
|-----------|---------|
| **Simplicity** | Prefer the simplest solution that works. Avoid premature abstraction. |
| **Modularity** | Every package has a single responsibility. Clear boundaries. |
| **Extensibility** | Third parties add features without modifying core code. |
| **Maintainability** | Code is readable, debuggable, and changeable by a team. |
| **Scalability** | Architecture supports growth in features, users, and ecosystem. |
| **Testability** | Every component testable in isolation. |
| **Loose Coupling** | Packages communicate through interfaces, never concrete implementations. |
| **High Cohesion** | Related code lives together. Unrelated code lives apart. |
| **Backwards Compatibility** | Breaking changes are rare and versioned. |
| **Long-term Evolution** | Design for 10–20 years, not the current sprint. |

---

## Architecture Style

### Hexagonal Architecture (Ports & Adapters)

Core domain knows nothing about databases, frameworks, UI, or external services. It communicates only through **ports** (interfaces it owns) and **adapters** (implementations plugged in from outside).

```
Driving Adapters (HTTP, WebSocket, CLI)
        │
        ▼
Application Layer (Use Cases)
        │
        ▼
Domain Layer (Aggregates, Value Objects, Events)
        │
        ▼
Driven Adapters (Game, Controller, Storage, EventStore)
```

Dependencies point inward only. The composition root wires everything together.

### Event-Driven Architecture

Every important state change becomes a typed domain event. Events power replay, analytics, debugging, plugins, and spectators. Events are the source of truth for match history.

### Manifest-Driven Discovery

Plugins declare capabilities in structured manifests. The runtime discovers, validates, and loads plugins without executing their code. This is the VS Code / Backstage pattern.

### Domain-Driven Design

System organized into bounded contexts with clear ownership, language, and interfaces. Contexts communicate through events and well-defined contracts.

### Manual Composition Root

No DI container. Each package exports concrete classes. The runtime wires them at startup through an explicit composition root. Explicit, debuggable, no decorator magic.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Human Spectators                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                        Web UI                                   │
│              (React — Plugin-Driven Shell)                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     Server (Hono)                               │
│           REST API + WebSocket + Static Files                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   Plugin Runtime                                │
│       Plugin Manager + Discovery + Lifecycle + DI               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   Battle Runtime                                │
│     Battle Orchestrator + Match Engine + Session Mgmt           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                          │                                      │
│   ┌──────────┐   ┌────────▼────────┐   ┌────────────────────┐  │
│   │  Arena   │   │  Controller     │   │  Observation       │  │
│   │ Runtime  │   │  (AI's Body)    │   │  (AI's Senses)     │  │
│   └────┬─────┘   └────────┬────────┘   └─────────┬──────────┘  │
│        │                  │                       │            │
│   ┌────▼─────┐     ┌──────▼──────┐      ┌─────────▼────────┐  │
│   │  Game    │     │  MCP Server │      │  Perception      │  │
│   │ Adapter  │     │ (Capabilities)│     │  Pipeline        │  │
│   └──────────┘     └─────────────┘      └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
                     ┌──────────────┐
                     │  Agent       │
                     │  Runtime     │
                     │  (AI Mind)   │
                     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │  AI Model    │
                     │  (LLM/RL)    │
                     └──────────────┘
```

**Key insight:** The **Game is just one component inside an Arena**. The AI doesn't play a game directly — it participates in a Battle, where it observes the world, reasons, and manipulates its Controller (MCP), exactly like a human manipulating a keyboard, mouse, or gamepad.

---

## Bounded Contexts

The system is organized into 8 bounded contexts. Each has clear ownership, language, and interfaces.

| Context | Responsibility | Core Language |
|---------|----------------|---------------|
| **Runtime** | Lifecycle, DI, configuration, event bus, service registry | runtime, service, lifecycle, config |
| **Battle** | Session orchestration, turns, timing, agent coordination | battle, session, turn, phase, round |
| **Arena** | Environment, layout, presentation, spectator experience | arena, panel, overlay, spectator |
| **Game** | Native game adaptation, input/output bridging | adapter, launcher, input, output |
| **Controller** | Virtual input devices, MCP server, capability exposure | device, action, capability, tool |
| **Observation** | Perception pipeline, state capture, context delivery | observation, screenshot, state, context |
| **Agent** | AI identity, profiles, reasoning, memory, LLM communication | agent, provider, model, capability, memory |
| **Plugin** | Extension management, discovery, lifecycle, contributions | manifest, lifecycle, contribution, extension |

### Context Map

```
Runtime ← owns lifecycle of all contexts
Battle → uses Game, Controller, Observation, Agent
Arena → hosts Battle, defines presentation
Game ← receives input from Controller, produces output for Observation
Controller → receives commands from Agent, sends input to Game
Observation → captures output from Game, delivers to Agent
Agent → reasons, issues commands to Controller
Plugin → extends all other contexts
```

---

## Package Structure

```
ai-game-arena/
├── apps/
│   ├── server/                    # Hono API server
│   └── web/                       # React spectator UI
│
├── packages/
│   ├── sdk/                       # Public API, types, schemas, contracts
│   ├── core/                      # Runtime kernel, DI, lifecycle, event bus
│   ├── runtime/                   # Battle orchestrator, session management
│   ├── match-engine/              # Turn-based match execution
│   ├── agent-runtime/             # LLM agent implementation
│   ├── controller/                # Virtual input devices, MCP server
│   ├── observation/               # Perception pipeline
│   ├── plugin-manager/            # Plugin discovery, loading, lifecycle
│   ├── storage/                   # SQLite persistence layer
│   ├── mcp/                       # MCP protocol implementation
│   └── cli/                       # CLI tool (arena command)
│
├── plugins/
│   ├── plugin-chat/               # Spectator-agent chat
│   ├── plugin-polls/              # Spectator polling
│   ├── plugin-export/             # Match data export
│   └── plugin-rewards/            # Agent profiles, XP, levels, badges
│
├── games/
│   ├── battle-tanks/              # Grid-based tank battle
│   ├── battle-royale/             # Shrinking arena survival
│   └── chess/                     # Classic chess
│
├── arenas/
│   ├── battle-tanks/              # Tank battle arena
│   ├── chess-classic/             # Classic chess arena
│   ├── chess-3d/                  # 3D chess arena
│   └── chess-tutorial/            # Chess training arena
│
├── docs/
│   └── architecture.md            # This document
│
├── package.json                   # Root workspace config
├── tsconfig.json                  # Root TypeScript config
├── bunfig.toml                    # Bun configuration
└── README.md
```

### Package Responsibilities

| Package | Owns | Must Not Contain |
|---------|------|------------------|
| `sdk` | Public types, Zod schemas, contracts, interfaces | Implementation details |
| `core` | Runtime kernel, DI container, event bus, lifecycle, config, logging | Game logic, AI logic, UI |
| `runtime` | Battle orchestration, session lifecycle, agent coordination | Game logic, UI, persistence |
| `match-engine` | Turn loop, action validation, scoring, win conditions | AI reasoning, UI, networking |
| `agent-runtime` | AI execution, reasoning, memory, prompt construction, MCP client | Game logic, controller logic |
| `controller` | Virtual devices, MCP server, capability registry, platform adapters | AI logic, game logic |
| `observation` | Perception pipeline, screenshots, accessibility, DOM capture | Game logic, AI logic |
| `plugin-manager` | Discovery, loading, dependency resolution, permissions, lifecycle | Business logic |
| `storage` | Persistence, assets, metadata, caches | Business logic |
| `mcp` | MCP protocol, tool definitions, session management | Business logic |
| `cli` | Command-line interface, scaffolding | Business logic |

---

## Dependency Graph

```
sdk (foundation — no internal deps)
  │
  ├── core (sdk)
  │     │
  │     ├── storage (sdk, core)
  │     │
  │     ├── mcp (sdk, core)
  │     │
  │     ├── controller (sdk, core, mcp)
  │     │
  │     ├── observation (sdk, core)
  │     │
  │     ├── match-engine (sdk, core, mcp)
  │     │
  │     ├── agent-runtime (sdk, core, mcp, controller, observation)
  │     │
  │     ├── plugin-manager (sdk, core, storage)
  │     │
  │     ├── runtime (sdk, core, match-engine, agent-runtime, plugin-manager, storage)
  │     │
  │     ├── cli (sdk, runtime, storage, plugin-manager)
  │     │
  │     ├── server (sdk, runtime, storage, plugin-manager, all plugins)
  │     │
  │     └── web (sdk)
  │
  ├── games/* (sdk)
  └── plugins/* (sdk)
```

### Forbidden Dependencies

- `sdk` must never import from any internal package
- `core` must never import from `runtime`, `match-engine`, `agent-runtime`, `server`, `web`, `cli`
- `games/*` must never import from `runtime`, `match-engine`, `agent-runtime`, `server`, `web`
- `plugins/*` must never import from `core`, `runtime`, `match-engine`, `agent-runtime`
- No package may import from `apps/*`

---

## Core Runtime

The core provides the smallest possible kernel. Nothing game-specific lives here.

### Responsibilities

- **Dependency Injection** — Manual composition root. Services registered by identifier and resolved at startup.
- **Lifecycle Management** — Startup, shutdown, health checks, graceful degradation.
- **Configuration** — Layered config: defaults → config file → environment variables → runtime overrides.
- **Event Bus** — In-process typed event bus. Discriminated union events with correlation IDs.
- **Service Registry** — Named service lookup. Services register on startup, resolve by identifier.
- **Logging** — Structured logging with levels, contexts, and correlation IDs.
- **Diagnostics** — Health checks, event loop lag monitoring, memory usage.

### Service Identifier Pattern

```typescript
// packages/core/src/tokens.ts
export const Tokens = {
  EventBus: Symbol.for('core.EventBus'),
  Config: Symbol.for('core.Config'),
  Logger: Symbol.for('core.Logger'),
  Storage: Symbol.for('core.Storage'),
  PluginManager: Symbol.for('core.PluginManager'),
  MatchEngine: Symbol.for('core.MatchEngine'),
  AgentRuntime: Symbol.for('core.AgentRuntime'),
  Controller: Symbol.for('core.Controller'),
  Observation: Symbol.for('core.Observation'),
  Runtime: Symbol.for('core.Runtime'),
} as const;
```

### Composition Root

```typescript
// packages/core/src/composition.ts
export function createContainer(): Container {
  const container = new Container();

  // Core services (singletons)
  container.register(Tokens.EventBus, createEventBus());
  container.register(Tokens.Config, createConfig());
  container.register(Tokens.Logger, createLogger(config));
  container.register(Tokens.Diagnostics, createDiagnostics(container));
  container.register(Tokens.ServiceRegistry, createServiceRegistry());

  // Storage layer
  container.register(Tokens.Storage, createStorage(config.storage));

  // Plugin system
  container.register(Tokens.PluginManager, () => 
    createPluginManager(container)
  );

  // Runtime managers
  container.register(Tokens.ArenaManager, () => 
    createArenaManager(container)
  );
  container.register(Tokens.GameManager, () => 
    createGameManager(container)
  );
  container.register(Tokens.ControllerManager, () => 
    createControllerManager(container)
  );
  container.register(Tokens.ProviderManager, () => 
    createProviderManager(container)
  );
  container.register(Tokens.ProfileManager, () => 
    createProfileManager(container)
  );
  container.register(Tokens.ObservationManager, () => 
    createObservationManager(container)
  );
  container.register(Tokens.BattleManager, () => 
    createBattleManager(container)
  );
  container.register(Tokens.CapabilityManager, () => 
    createCapabilityManager(container)
  );
  container.register(Tokens.ReplayManager, () => 
    createReplayManager(container)
  );
  container.register(Tokens.StorageManager, () => 
    createStorageManager(container)
  );

  // Core runtime
  container.register(Tokens.Runtime, () => 
    createRuntime(container)
  );

  return container;
}
```

---

## Plugin System

The plugin system is the backbone of extensibility. Everything outside the core is a plugin.

### Plugin Manifest

Every plugin has a `plugin.json` manifest at its root:

```json
{
  "id": "plugin-chat",
  "name": "Spectator Chat",
  "description": "Real-time chat between spectators and AI agents",
  "version": "1.0.0",
  "category": "interaction",
  "author": "AI Game Arena",
  "license": "MIT",
  "engines": { "aga": "^1.0.0" },
  "entry": "./dist/index.js",
  "activation": {
    "startup": true
  },
  "contributions": {
    "mcpTools": ["chat.send", "chat.receive", "chat.listen"],
    "eventHandlers": ["MATCH_STARTED", "MATCH_FINISHED"],
    "uiPanels": ["ChatPanel"],
    "serverRoutes": ["/api/chat"],
    "cliCommands": []
  },
  "dependencies": {},
  "permissions": ["agent.communication"]
}
```

### Manifest Schema (Zod)

```typescript
// packages/sdk/src/schemas/plugin.ts
export const PluginManifestSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1),
  description: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  category: z.enum([
    'arena',
    'interaction',
    'exporter',
    'agent',
    'visualization',
    'metric',
    'storage',
    'controller',
    'provider',
    'observation',
  ]),
  author: z.string().optional(),
  license: z.string().optional(),
  engines: z.object({
    aga: z.string(),
  }),
  entry: z.string(),
  activation: z
    .object({
      startup: z.boolean().default(false),
      events: z.array(z.string()).optional(),
    })
    .default({ startup: false }),
  contributions: z
    .object({
      mcpTools: z.array(z.string()).optional(),
      eventHandlers: z.array(z.string()).optional(),
      uiPanels: z
        .array(
          z.object({
            id: z.string(),
            component: z.string(),
            label: z.string(),
            position: z.enum(['center', 'left', 'right', 'bottom', 'header', 'footer', 'overlay']),
            type: z.enum([
              'panel',
              'sidebar',
              'event-log',
              'chat',
              'scoreboard',
              'header',
              'footer',
              'overlay',
              'custom',
            ]),
          }),
        )
        .optional(),
      serverRoutes: z.array(z.string()).optional(),
      cliCommands: z.array(z.string()).optional(),
      storage: z.array(z.string()).optional(),
      dashboardWidgets: z
        .array(
          z.object({
            id: z.string(),
            component: z.string(),
            label: z.string(),
          }),
        )
        .optional(),
      navigationItems: z
        .array(
          z.object({
            id: z.string(),
            label: z.string(),
            path: z.string(),
            icon: z.string().optional(),
          }),
        )
        .optional(),
      contextMenus: z
        .record(
          z.array(
            z.object({
              command: z.string(),
              label: z.string(),
            }),
          ),
        )
        .optional(),
    })
    .default({}),
  dependencies: z.record(z.string()).default({}),
  permissions: z.array(z.string()).default([]),
});
```

### Plugin Lifecycle

```
Discovery → Validation → Dependency Resolution → Registration → Activation → Runtime → Deactivation → Cleanup
```

1. **Discovery** — Scan `plugins/` directories for `plugin.json`, `arenas/` for `arena.json`, `games/` for `game.json` manifests.
2. **Validation** — Zod schema validation of all manifests. Reject invalid plugins early.
3. **Dependency Resolution** — Topological sort based on declared dependencies. Detect cycles.
4. **Registration** — Register contributions (tools, event handlers, UI panels, routes) without executing plugin code.
5. **Activation** — Call `plugin.activate(context)` with scoped context. Plugin receives its API surface.
6. **Runtime** — Plugin contributes via registered interfaces. Receives events it subscribed to.
7. **Deactivation** — Call `plugin.deactivate()`. Plugin cleans up resources.
8. **Cleanup** — Remove all contributions. Release references.

### Plugin Context (Scoped API)

```typescript
// packages/sdk/src/types/plugin.ts
export interface PluginContext {
  readonly manifest: PluginManifest;
  readonly logger: Logger;
  readonly config: ConfigReader;

  // Registration APIs
  registerMcpTool(tool: McpTool): void;
  registerEventHandler(handler: EventHandler): void;
  registerUiPanel(panel: UiPanelContribution): void;
  registerServerRoute(route: ServerRoute): void;
  registerCliCommand(command: CliCommand): void;
  registerDashboardWidget(widget: DashboardWidget): void;
  registerNavigationItem(item: NavigationItem): void;

  // Storage access (namespaced)
  readonly storage: StorageAdapter;

  // Event bus access
  readonly eventBus: EventBus;

  // Read-only access to other plugins' contributions
  getAvailableTools(): McpTool[];
  getAvailableArenas(): ArenaPlugin[];
}
```

### Plugin Discovery Flow

```
plugins/
  plugin-chat/
    plugin.json        ← Manifest
    package.json       ← NPM package
    dist/index.js      ← Entry point (compiled)
  plugin-polls/
    plugin.json
    ...
games/
  battle-tanks/
    game.json
    package.json
    dist/index.js
  chess/
    game.json
    ...
```

The plugin manager scans these directories, reads manifests, validates them, resolves dependencies, and loads plugins in the correct order.

---

## Battle System

A Battle is the primary executable unit. It composes all components together inside an Arena.

### Battle Definition

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
      "customStrategy": "You are a cautious commander who...",
      "profileId": "profile-uuid-2"
    }
  ],
  "plugins": ["plugin-chat", "plugin-polls"],
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

> **Note:** `maxTurns` and `turnTimeout` are intentionally omitted from the request the frontend sends. The runtime defaults `maxTurns` to `Infinity` and `turnTimeout` to `0` — battles run until the arena's win condition fires, or until an admin pauses/resumes/aborts. The only latency bound is the provider retry policy inside the agent runtime (the agent's LLM call is retried a small number of times before the agent is treated as non-functional and the battle aborts). `seed` is auto-generated server-side for reproducible replays; clients may override it only for deterministic test suites.

### Battle Lifecycle

```
Created → Initializing → Running → Paused → Completed / Aborted
```

1. **Created** — Battle definition validated. Components resolved.
2. **Initializing** — Arena initialized. Game launched. Agents connected. Plugins activated.
3. **Running** — Match engine drives the interaction loop.
4. **Paused** — Battle temporarily suspended (spectator interaction, admin action).
5. **Completed** — Win condition met or max turns reached.
6. **Aborted** — Error, timeout, or manual termination.

### Battle Interaction Loop

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

**The Game never knows an AI exists. It only receives native input.**

### Battle Aggregate

```typescript
// packages/runtime/src/domain/battle.ts
export class Battle extends EventSourcedAggregate {
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

  joinAgent(agent: AgentConfig): void {
    if (this.state.phase !== 'created') {
      throw new BattleError('Cannot join after battle has started');
    }
    if (this.agents.length >= this.state.config.maxAgents) {
      throw new BattleError('Battle is full');
    }
    this.apply(new AgentJoinedBattle(this.id, agent.id, new Date()));
  }

  start(): void {
    if (this.state.phase !== 'initialized') {
      throw new BattleError('Battle not initialized');
    }
    this.apply(new BattleStarted(this.id, new Date()));
  }

  executeAction(agentId: string, action: AgentAction): void {
    if (this.state.phase !== 'running') {
      throw new BattleError('Battle not running');
    }
    this.apply(new ActionExecuted(this.id, agentId, action, new Date()));
  }

  advancePhase(): void {
    // State machine transitions
  }

  protected when(event: DomainEvent): void {
    switch (event.type) {
      case 'AgentJoinedBattle':
        this.agents.push(event.payload.agent);
        break;
      case 'BattleStarted':
        this.state = this.state.transition('running');
        this.replay.record(event);
        break;
      case 'ActionExecuted':
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

## Arena System

> ⚠️ **CRITICAL ARCHITECTURAL PRINCIPLE: THE ARENA IS THE ENVIRONMENT. IT IS NOT THE GAME.**
> 
> **There is ZERO architectural dependency between Arena and Game beyond composition.**
> - The Arena **CONTAINS** a Game.
> - The Game does **NOT** contain or manage an Arena.
> - The Game **MUST NOT** know about ANY Arena systems (spectators, chat, plugins, overlays, telemetry, recordings, battle lifecycle, agents, controllers, observations, or any other arena concern).
> - The Arena **ORCHESTRATES** the battle. The Game **EXECUTES** native code.
> - Different Arenas can host the SAME Game. One Game can run in MANY Arenas.

### The Arena Is The Battle Environment

The **Arena is a self-contained battle ENVIRONMENT**. It owns everything required for the battle:
- **Layout/World** — The physical/virtual space where the battle occurs (grid, terrain, entities, physics)
- **Agents** — AI minds participating in the battle
- **Spectators** — Human viewers, chat, polls, dashboards
- **Plugins** — Chat, polls, rewards, metrics, analytics, export
- **Overlays** — HUD, minimap, tactical views, spectator tools
- **Telemetry & Events** — Complete event stream for replay, debugging, analysis
- **Recordings & Replay** — Full deterministic replay capability
- **Battle Lifecycle** — Turn management, win conditions, scoring, phase transitions
- **UI Layout** — Panels, sidebars, event logs, scoreboards, inspectors

**The Game is merely ONE COMPONENT hosted inside the Arena.** It occupies one area (the "game panel"). The Arena does not care what the Game is — it only knows the Game's ID (declared in the manifest) and how to launch/attach to it.

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    ARENA                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                         BATTLE ENVIRONMENT                                    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │   │
│  │  │   Arena      │  │  Spectators  │  │   Plugins    │  │  Battle      │    │   │
│  │  │  Layout/     │  │  (Chat, UI)  │  │  (Tools)     │  │  Lifecycle   │    │   │
│  │  │  Environment │  │              │  │              │  │  (Turns, Win   │    │   │
│  │  │  (World)     │  │              │  │              │  │   Conditions)│    │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │   │
│  │  │  Overlays    │  │  Inspectors  │  │  Dashboards  │  │  Telemetry   │    │   │
│  │  │  (HUD, Map)  │  │  (State, AI) │  │  (Metrics)   │  │  & Events    │    │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │   │
│  │  │  Recordings  │  │   Agents     │  │    Game      │  │  Scoring     │    │   │
│  │  │  & Replay    │  │  (AI Minds)  │  │  (Component) │  │  & Win Cond  │    │   │
│  │  └──────────────┘  └──────────────┘  └──────┬───────┘  └──────────────┘    │   │
│  └───────────────────────────────────────────────┼──────────────────────────────┘   │
└──────────────────────────────────────────────────┼───────────────────────────────────┘
                                                   │
                                                   ▼
                                    ┌─────────────────────────────┐
                                    │         GAME                │
                                    │  (Native Application)       │
                                    │  ┌──────────────────────┐   │
                                    │  │  Controller Adapter  │   │
                                    │  │  Observation Adapter │   │
                                    │  │  Process Management  │   │
                                    │  └──────────────────────┘   │
                                    └─────────────────────────────┘
                                                   │
                                    ┌──────────────┴──────────────┐
                                    │    Native Game Binary       │
                                    │    (e.g., Battle Tanks,     │
                                    │     Chess Engine, etc.)     │
                                    └─────────────────────────────┘
```

**THE ARENA DOES NOT KNOW GAME LOGIC. THE GAME DOES NOT KNOW THE ARENA EXISTS.**

### Arena vs Game — Absolute Separation

| Aspect | Arena (Environment) | Game (Native Adapter) |
|--------|---------------------|----------------------|
| **Role** | Battle environment & orchestrator | Native application adapter |
| **Knows about** | UI, spectators, plugins, overlays, agents, chat, events, telemetry, scoring, recordings, lifecycle | Native input/output APIs ONLY |
| **Implements** | World logic, rules, scoring, battle orchestration, agent coordination | Process management, bridging to native game |
| **Contains** | Game, Agents, Spectators, Plugins, Chat, Overlays, Events, Telemetry, Recordings, Battle Lifecycle | — (contained BY Arena) |
| **Multiple per** | Game (many arenas per game) | Arena (one game per arena instance) |
| **Example** | "Battle Tanks Arena" (3D, chat, replay, coaching) | "Battle Tanks Game" (native executable, no arena knowledge) |
| **Example** | "Chess Arena 3D" (AR spectator, analysis overlay) | "Chess Game" (Stockfish, UCI protocol) |

### Arena Plugin Interface (Pure Environment Logic)

The Arena plugin implements **pure environment logic** — world state, validation, execution, observations, win conditions, scoring, and rendering. **This is NOT game logic.** This is the arena's world simulation.

```typescript
// packages/sdk/src/contracts/arena.ts
export interface ArenaPlugin {
  readonly config: ArenaConfig;
  readonly manifest: ArenaManifest;

  // Core lifecycle
  initialize(seed?: number): WorldState;
  shutdown(): Promise<void>;

  // Environment logic (pure functions) — THIS IS ARENA LOGIC, NOT GAME LOGIC
  getTools(): ToolDefinition[];                    // What agents CAN DO in this environment
  validateAction(action: AgentAction, state: WorldState): ValidationResult;
  executeAction(action: AgentAction, state: WorldState): ActionOutcome;
  getObservation(agentId: string, state: WorldState): Observation;
  checkWinCondition(state: WorldState): WinCondition | null;
  getScores(state: WorldState): Record<string, number>;

  // Rendering (arena's view of the world)
  getRenderState(state: WorldState): RenderState;

  // Optional: custom UI contributions
  getUiContributions?(): ArenaUiContribution[];
}
```

#### What Arena Logic IS:
- **World/Environment simulation** — grid, physics, terrain, entities, resources
- **Action validation** — is this move legal in THIS environment?
- **Action execution** — apply action to world state, produce events
- **Observations** — what can an agent see from its position in THIS environment?
- **Win conditions** — has someone won in THIS environment?
- **Scoring** — how are points calculated in THIS environment?
- **Rendering** — how does THIS environment look to spectators?

#### What Arena Logic is NOT:
- ❌ Native game process management
- ❌ Native input/output bridging
- ❌ AI reasoning / LLM calls
- ❌ Controller/MCP logic
- ❌ Observation capture from native game
- ❌ Network/protocol handling

### World State (Arena's World, Not Game's State)

```typescript
// packages/sdk/src/contracts/arena.ts
export interface WorldState {
  readonly tick: number;
  readonly seed: number;
  readonly entities: Map<EntityId, Entity>;
  readonly grid?: GridState;
  readonly physics?: PhysicsState;
  readonly metadata: WorldMetadata;
}

export interface Entity {
  readonly id: EntityId;
  readonly type: EntityType;
  readonly position: Position;
  readonly rotation?: Rotation;
  readonly properties: Record<string, unknown>;
  readonly ownerId?: AgentId; // For agent-controlled entities
}

export interface GridState {
  readonly width: number;
  readonly height: number;
  readonly cells: GridCell[][];
}

export interface GridCell {
  readonly x: number;
  readonly y: number;
  readonly terrain: TerrainType;
  readonly entities: EntityId[];
  readonly passable: boolean;
}
```

**This is the ARENA's world state.** It represents the battle environment. The Game adapter has its own internal state (the native game's state). The Arena's world state is what agents interact with through the Controller/MCP layer.

### Actions & Validation (Arena Environment Rules)

```typescript
// packages/sdk/src/contracts/arena.ts
export interface AgentAction {
  readonly agentId: AgentId;
  readonly tool: string; // MCP tool name
  readonly params: Record<string, unknown>;
  readonly timestamp: number;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
  readonly effects?: PredictedEffect[];
}

export interface ActionOutcome {
  readonly success: boolean;
  readonly stateChanges: StateChange[];
  readonly events: DomainEvent[];
  readonly observation?: Observation;
  readonly error?: string;
}

export interface StateChange {
  readonly type: 'entity' | 'grid' | 'score' | 'metadata' | 'custom';
  readonly entityId?: EntityId;
  readonly property: string;
  readonly previousValue: unknown;
  readonly newValue: unknown;
}
```

**Arena validates actions against ITS world state. The Agent executes via Controller/MCP directly on the Game. The Game never sees Arena actions. After Game runs, Arena updates its world state via executeAction().**

### Win Conditions & Scoring (Arena Rules)

```typescript
// packages/sdk/src/contracts/arena.ts
export interface WinCondition {
  readonly type: 'elimination' | 'score' | 'objective' | 'time' | 'custom';
  readonly winner?: AgentId;
  readonly teamWinner?: TeamId;
  readonly reason: string;
  readonly metadata: Record<string, unknown>;
}

export interface ScoringConfig {
  readonly killPoints: number;
  readonly objectivePoints: number;
  readonly survivalPointsPerTick: number;
  readonly customScorers: CustomScorer[];
}

export type CustomScorer = (state: WorldState, agentId: AgentId) => number;
```

**The Arena decides who wins. The Game just runs.**

### Render State (Arena's Visual Representation)

```typescript
// packages/sdk/src/contracts/arena.ts
export interface RenderState {
  readonly arenaId: string;
  readonly timestamp: number;
  readonly camera: CameraState;
  readonly entities: RenderEntity[];
  readonly grid?: RenderGrid;
  readonly effects: RenderEffect[];
  readonly ui: RenderUiState;
}

export interface RenderEntity {
  readonly id: EntityId;
  readonly type: EntityType;
  readonly position: Position;
  readonly rotation?: Rotation;
  readonly scale?: Scale;
  readonly model: ModelReference;
  readonly material?: MaterialReference;
  readonly animation?: AnimationState;
  readonly ownerColor?: string;
}

export interface CameraState {
  readonly position: Position3D;
  readonly target: Position3D;
  readonly fov: number;
  readonly mode: 'free' | 'follow' | 'overview' | 'agent-pov';
  readonly agentId?: AgentId;
}
```

**The Arena renders ITS world. The Game renders ITS native view. Spectators see the Arena's render state.**

### Arena Manifest (Declares What Game It Hosts)

```json
{
  "id": "battle-tanks",
  "name": "Battle Tanks Arena",
  "version": "1.0.0",
  "type": "arena",
  "category": "competitive",
  "description": "Grid-based tank combat arena",
  "author": "AI Game Arena",
  "license": "MIT",
  "engines": { "aga": "^1.0.0" },
  "entry": "./dist/index.js",
  "activation": { "startup": true },
  "contributions": { "arenas": ["battle-tanks"] },
  "display": {
    "arena": {
      "game": "battle-tanks",
      "plugins": ["plugin-chat", "plugin-polls"],
      "defaultStrategies": ["aggressive", "defensive", "scout"],
      "mandatoryCapabilities": ["move", "attack"],
      "ui": [
        { "id": "battlefield", "type": "panel", "component": "GridRenderer", "label": "Battlefield", "position": "center" },
        { "id": "event-log", "type": "event-log", "component": "EventLog", "label": "Event Log", "position": "right" },
        { "id": "chat", "type": "chat", "component": "SpectatorChat", "label": "Chat", "position": "right" }
      ]
    }
  }
}
```

**Key field: `"game": "battle-tanks"`** — This declares which Game adapter this Arena hosts. Multiple Arenas can declare the same `game` ID.

### Arena Types (Environment Categories)

| Category | Description | Examples |
|----------|-------------|----------|
| **competitive** | PvP, ranked, tournament | Battle Tanks, Chess, Battle Royale |
| **cooperative** | PvE, team vs environment | Raid, Horde Defense, Escape Room |
| **sandbox** | Creative, no objectives | Building, Simulation, God Mode |
| **training** | Tutorial, skill practice | Target Range, Movement Course, Strategy Drills |
| **social** | Chat, roleplay, hangout | Lobby, Tavern, Meeting Space |
| **experimental** | Research, prototype | New mechanics, ML environments |

### Multi-Arena Games (One Game, Many Environments)

A **single Game** can be hosted in **multiple Arenas**:

```
Game: Chess
├── Arena: Classic Chess (2D board, standard UI)
├── Arena: 3D Chess (3D pieces, AR spectator view)
├── Arena: Chess Arena (chat, polls, coaching overlay)
├── Arena: Speed Chess (clock UI, time pressure visualizations)
└── Arena: Chess Tutorial (guided moves, hints, lessons)
```

Each Arena declares the same `gameId` but different `display.arena` configuration.

**The Game is identical. The Arena (environment) is different.**

### Arena Configuration

```typescript
// packages/sdk/src/contracts/arena.ts
export interface ArenaConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly category: ArenaCategory;
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly capabilities: string[];
  readonly mandatoryCapabilities: string[];
  readonly defaultStrategies: string[];
  readonly defaultPlugins: string[];
  readonly defaultGame: GameId;
  readonly ui: ArenaUiConfig;
  readonly settings: ArenaSettings;
}

export interface ArenaSettings {
  readonly tickRate: number;        // Hz
  readonly maxTurns: number;
  readonly turnTimeout: number;     // ms
  readonly seed?: number;
  readonly deterministic: boolean;
  readonly replayEnabled: boolean;
  readonly spectatorEnabled: boolean;
}

export type ArenaCategory = 
  | 'competitive' 
  | 'cooperative' 
  | 'sandbox' 
  | 'training' 
  | 'social' 
  | 'experimental';
```

### Arena Lifecycle (Arena Owns the Battle)

The Arena **owns the battle lifecycle**:

```
┌─────────────┐
│  Created    │ ← ArenaManager discovers manifest
└──────┬──────┘
       │ register()
       ▼
┌─────────────┐
│  Registered │ ← Contributions registered (UI, capabilities)
└──────┬──────┘
       │ activate() (when battle starts)
       ▼
┌─────────────┐
│  Active     │ ← initialize(seed) called
│             │ ← Game LAUNCHED by Arena
│             │ ← Agents CONNECTED by Arena
│             │ ← Plugins ACTIVATED by Arena
│             │ ← Spectators ADMITTED by Arena
└──────┬──────┘
       │ battle runs (Arena ORCHESTRATES)
       ▼
┌─────────────┐
│  Shutdown   │ ← shutdown() called
│             │ ← Game STOPPED by Arena
│             │ ← Agents DISCONNECTED by Arena
│             │ ← Plugins DEACTIVATED by Arena
│             │ ← Recordings FINALIZED by Arena
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Unregistered│ ← Contributions removed
└─────────────┘
```

**The Arena starts the Game. The Arena stops the Game. The Arena coordinates everything.**

---

## Game System

A Game is an **adapter around a native application**. Its responsibility is **not** to implement gameplay. The gameplay already exists inside the native game.

The Game package simply exposes the minimum integration required for AI Game Arena to interact with it.

### Architecture

```
                  AI Game Arena
                         │
                         ▼
                  Game Adapter
               (minimal wrapper)
           ┌──────────┴──────────┐
           │                     │
           ▼                     ▼
    Controller Adapter     Observation Adapter
           │                     │
           ▼                     ▼
    Native Input API      Native Render API
                   │
                   ▼
              Native Game
```

### Game Interface

```typescript
// packages/sdk/src/contracts/game.ts
export interface GameAdapter {
  readonly manifest: GameManifest;

  // Lifecycle
  initialize(config: GameConfig): Promise<void>;
  launch(): Promise<GameProcess>;
  attachController(adapter: ControllerAdapter): Promise<void>;
  attachObservation(adapter: ObservationAdapter): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  suspend(): Promise<void>;
  resume(): Promise<void>;
  dispose(): Promise<void>;

  // Metadata
  getMetadata(): GameMetadata;
  getCapabilities(): GameCapability[];
}
```

```typescript
export interface GameManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly type: 'game';
  readonly adapterType: 'native' | 'browser' | 'wasm' | 'remote';
  readonly launchConfig: LaunchConfig;
  readonly controllerInterface: ControllerInterfaceSpec;
  readonly observationInterface: ObservationInterfaceSpec;
  readonly dependencies: Record<string, string>;
}
```

### Adapter Types

| Type | Description | Examples |
|------|-------------|----------|
| **native** | Desktop executable, launched as child process | Chess (Stockfish), Minecraft (Java), custom C++ games |
| **browser** | Web-based game, controlled via CDP/Playwright | Browser games, WebGL, Three.js, Phaser |
| **wasm** | WebAssembly module, runs in sandbox | Rust/WASM games, AssemblyScript |
| **remote** | Game runs on separate machine, accessed via network | Cloud gaming, dedicated servers, robotics |

### Game Responsibilities

A Game adapter may:
- Start and stop the native game
- Expose metadata
- Register platform adapters
- Map controller events to native inputs
- Expose rendering surfaces
- Expose save/load capabilities
- Expose game configuration

A Game must **never** implement:
- AI logic
- Gameplay rules
- Match orchestration
- Controller logic
- Observations
- Plugins
- Networking
- Analytics

### Game Directory Structure

```
games/
  my-game/
    game.json          # Manifest
    package.json
    tsconfig.json
    src/
      index.ts                 # Export default MyGameAdapter
      adapter.ts               # GameAdapter implementation
      process.ts               # Process management
      protocol.ts              # AGA protocol messages
      controller-adapter.ts    # ControllerAdapter implementation
      observation-adapter.ts   # ObservationAdapter implementation
      types.ts                 # Game-specific types
    dist/
```

### Native Adapter Pattern

#### Process Management

```typescript
// packages/controller/src/adapters/native/process-manager.ts
export class NativeGameProcess {
  private process: ChildProcess | null = null;
  private controllerPort: number;
  private observationPort: number;

  constructor(
    private readonly config: LaunchConfig,
    private readonly logger: Logger
  ) {}

  async launch(): Promise<GameProcess> {
    this.controllerPort = await findFreePort();
    this.observationPort = await findFreePort();

    const env = {
      ...process.env,
      ...this.config.env,
      AGA_CONTROLLER_PORT: String(this.controllerPort),
      AGA_OBSERVATION_PORT: String(this.observationPort),
    };

    this.process = spawn(this.config.command, this.config.args, {
      cwd: this.config.workingDirectory,
      env,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    this.process.on('error', (err) => this.logger.error('Game process error', err));
    this.process.on('exit', (code) => this.logger.info(`Game exited with code ${code}`));

    await this.waitForReady();

    return {
      pid: this.process.pid!,
      controllerPort: this.controllerPort,
      observationPort: this.observationPort,
      stop: () => this.stop(),
    };
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      await this.waitForExit(5000);
      if (!this.process.killed) {
        this.process.kill('SIGKILL');
      }
    }
  }
}
```

#### Native Game Protocol

The native game implements a minimal **AGA protocol** over stdin/stdout or IPC:

```json
// Game → Arena (stdout)
{"type": "aga:ready", "capabilities": ["move", "attack", "scan"]}
{"type": "aga:state", "tick": 42, "entities": [...], "player": "agent-1"}
{"type": "aga:observation", "agentId": "agent-1", "data": {...}}
{"type": "aga:event", "event": {"type": "EntityMoved", ...}}

// Arena → Game (stdin)
{"type": "aga:action", "agentId": "agent-1", "action": "move", "params": {"direction": "north"}}
{"type": "aga:pause"}
{"type": "aga:resume"}
{"type": "aga:reset", "seed": 12345}
```

### Browser Adapter

For web-based games (uses Playwright/CDP):

```typescript
// packages/controller/src/adapters/browser/browser-adapter.ts
export class BrowserGameAdapter implements GameAdapter {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private cdpSession: CDPSession | null = null;

  async initialize(config: GameConfig): Promise<void> {
    this.browser = await playwright.chromium.launch({
      headless: config.headless ?? true,
      args: ['--disable-web-security', '--allow-running-insecure-content'],
    });
    
    this.page = await this.browser.newPage();
    this.cdpSession = await this.page.context().newCDPSession(this.page);
    
    await this.cdpSession.send('Runtime.enable');
    await this.cdpSession.send('Input.enable');
    await this.cdpSession.send('Page.enable');
  }

  async launch(): Promise<GameProcess> {
    await this.page!.goto(this.config.url!, { waitUntil: 'networkidle' });
    
    await this.page!.addInitScript(() => {
      window.agaBridge = {
        sendAction: (action) => { /* postMessage to parent */ },
        getState: () => game.getState(),
        capture: () => game.captureCanvas(),
      };
    });

    return {
      pid: 0,
      controllerPort: 0,
      observationPort: 0,
      stop: () => this.stop(),
    };
  }

  async attachController(adapter: ControllerAdapter): Promise<void> {
    const browserAdapter = adapter as BrowserControllerAdapter;
    browserAdapter.setPage(this.page!);
    browserAdapter.setCDP(this.cdpSession!);
  }
}
```

### WASM Adapter

```typescript
// packages/controller/src/adapters/wasm/wasm-adapter.ts
export class WasmGameAdapter implements GameAdapter {
  private module: WebAssembly.Module | null = null;
  private instance: WebAssembly.Instance | null = null;
  private memory: WebAssembly.Memory | null = null;

  async initialize(config: GameConfig): Promise<void> {
    const response = await fetch(config.wasmUrl!);
    const bytes = await response.arrayBuffer();
    
    this.module = await WebAssembly.compile(bytes);
    const imports = this.createImports();
    this.instance = await WebAssembly.instantiate(this.module, imports);
    this.memory = this.instance.exports.memory as WebAssembly.Memory;
  }

  async launch(): Promise<GameProcess> {
    const init = this.instance!.exports.init as Function;
    init(this.config.seed || Date.now());
    
    return {
      pid: 0,
      controllerPort: 0,
      observationPort: 0,
      stop: () => { /* cleanup */ },
    };
  }

  private createImports(): WebAssembly.Imports {
    return {
      env: {
        aga_log: (ptr: number, len: number) => this.log(ptr, len),
        aga_send_observation: (ptr: number, len: number) => this.sendObservation(ptr, len),
      },
    };
  }
}
```

### Remote Adapter

```typescript
// packages/controller/src/adapters/remote/remote-adapter.ts
export class RemoteGameAdapter implements GameAdapter {
  private client: GrpcClient | WebSocketClient;

  constructor(
    private readonly endpoint: string,
    private readonly auth: AuthConfig
  ) {}

  async initialize(config: GameConfig): Promise<void> {
    this.client = new GrpcClient(this.endpoint, this.auth);
    await this.client.connect();
  }

  async launch(): Promise<GameProcess> {
    const session = await this.client.createSession({
      gameId: this.manifest.id,
      config: this.config,
    });
    
    return {
      pid: session.id,
      controllerPort: session.controllerPort,
      observationPort: session.observationPort,
      stop: () => this.client.terminateSession(session.id),
    };
  }
}
```

---

## Controller System

The Controller is **the AI's body**. It is not responsible for reasoning, decision making, or model execution. Those responsibilities belong to the Agent Runtime.

The Controller exposes a set of virtual input devices through an MCP Server and translates high-level actions into native platform input events.

The AI never interacts directly with a Game. Instead, it manipulates its Controller exactly as a human manipulates a keyboard, mouse, touch screen, or gamepad.

### Interaction Flow

```
Agent Runtime
      │
      ▼
Controller Runtime
      │
      ▼
MCP Device Capabilities
      │
      ▼
Platform Adapter
      │
      ▼
Native Input System
      │
      ▼
Game
```

The Game never knows whether the input originated from:
- An AI agent
- A human player
- A replay
- A scripted automation
- A reinforcement learning policy

It only receives native input events.

### Controller Interface

```typescript
// packages/sdk/src/types/controller.ts
export interface Controller {
  initialize(): Promise<void>;
  registerDevice(device: InputDevice): void;
  connect(session: MCPSession): Promise<void>;
  getCapabilities(): Capability[];
  execute(action: ControllerAction): Promise<ActionResult>;
  shutdown(): Promise<void>;
}
```

### Input Devices

Every Controller exposes one or more virtual devices:

- **Keyboard** — `keyboard.press()`, `keyboard.release()`, `keyboard.type()`
- **Mouse** — `mouse.move()`, `mouse.click()`, `mouse.scroll()`
- **Pointer** — `pointer.setPosition()`, `pointer.drag()`
- **Touch** — `touch.tap()`, `touch.swipe()`, `touch.pinch()`
- **Gamepad** — `gamepad.press()`, `gamepad.moveStick()`, `gamepad.trigger()`
- **Wheel** — `wheel.scroll()`, `wheel.zoom()`
- **Pen** — `pen.write()`, `pen.eraser()`
- **Future Devices** — Extensible through plugins

Devices expose capabilities through MCP. Plugins may extend the Controller by registering additional devices or capabilities.

### Platform Adapters

Platform Adapters translate generic controller actions into platform-specific native input events:

- **Desktop** (Windows, macOS, Linux)
- **Browser**
- **Terminal**
- **WASM**
- **Remote Execution**

### Controller Package Structure

```
packages/controller/
  src/
    runtime/
      controller-runtime.ts
      device-registry.ts
      capability-registry.ts
    devices/
      keyboard/
      mouse/
      pointer/
      touch/
      gamepad/
      wheel/
      pen/
    adapters/
      desktop/
      browser/
      terminal/
      wasm/
      remote/
    middleware/
      permissions/
      recording/
      replay/
      latency/
      logging/
    mcp/
      mcp-server.ts
```

---

## Observation System

Observation is the AI's senses. It captures what a human player could perceive.

### Observation Interface

```typescript
// packages/sdk/src/types/observation.ts
export interface ObservationAdapter {
  capture(gameState: GameState): Observation;
  getAvailableObservationTypes(): ObservationType[];
}

export interface Observation {
  timestamp: number;
  agentId: string;
  type: ObservationType;
  data: ObservationData;
  metadata: ObservationMetadata;
}

export type ObservationType =
  'screenshot' | 'accessibility-tree' | 'dom' | 'board-state' | 'metadata' | 'semantic';
```

### Observation Pipeline

```
Game Output → Capture → Process → Filter → Transform → Deliver
```

Observation never modifies the Game. It only observes.

---

## Agent Runtime

The Agent Runtime owns AI execution. It is the AI's mind.

### Responsibilities

- **Provider Selection** — Choose LLM provider based on agent profile
- **Model Execution** — Call LLM APIs with proper error handling
- **Reasoning** — Process observations, construct prompts, make decisions
- **Memory** — Manage short-term, long-term, social, and strategic memory
- **Prompt Construction** — Build system prompts, user messages, tool definitions
- **MCP Communication** — Connect to Controller's MCP server, discover capabilities
- **Streaming** — Stream LLM responses for real-time interaction
- **Cancellation** — Support timeout and manual cancellation

### Agent Model

```
Agent
├── Identity (id, name, profile)
├── Profile (provider, model, apiKey)
├── Controller (MCP connection)
├── MCP Session (active tools, capabilities)
├── Capabilities (system mandatory + game mandatory + special)
└── Memory (short-term, long-term, social, strategic)
```

### Agent Runtime Interface

```typescript
// packages/sdk/src/types/agent.ts
export interface AgentRuntime {
  initialize(agent: AgentConfig): Promise<void>;
  connectToController(controller: Controller): Promise<void>;
  observe(observation: Observation): Promise<void>;
  decide(): Promise<AgentAction>;
  communicate(message: AgentMessage): Promise<void>;
  getMemory(): AgentMemory;
  shutdown(): Promise<void>;
}

export interface AgentConfig {
  id: string;
  name: string;
  strategy: 'aggressive' | 'defensive' | 'scout' | 'custom';
  customStrategy?: string;
  profileId?: string;
  provider?: ProviderConfig;
  model?: string;
  apiKey?: string;
}
```

---

## MCP Capability Layer

Every agent connects through MCP. The MCP system provides universal AI abilities.

### Built-in Capabilities

**Perception:**
- `observe_world()` — Perceive the environment state
- `inspect_state()` — Inspect detailed state information
- `get_context()` — Get current context and history

**Communication:**
- `send_message()` — Send messages to other agents and spectators
- `receive_message()` — Receive messages from others
- `listen_events()` — Listen to match events

**Identity:**
- `get_profile()` — Get agent's own profile
- `get_capabilities()` — List available capabilities

**Memory:**
- `remember()` — Store information in memory
- `recall()` — Retrieve information from memory

### Dynamic Capability Extension

Plugins extend agent intelligence. When a plugin is installed, it registers new MCP tools that agents can discover and use.

Example: Installing `plugin-diplomacy` automatically adds:
- `negotiate()`
- `propose_alliance()`
- `vote()`

Example: Installing `plugin-memory` adds:
- `remember()`
- `recall()`

The MCP capability registry dynamically discovers available tools. Agents do not need hardcoded knowledge of plugins.

### Three Tiers of Capabilities

| Tier | Source | Toggleable | Example |
|------|--------|------------|---------|
| **System Mandatory** | Platform (inherent) | No | `observe`, `communicate`, `pass`, `yield` |
| **Game Mandatory** | Arena manifest | No | `move`, `move_piece` |
| **Special Skills** | Arena manifest | Yes (per agent) | `attack`, `scan`, `shield`, `get_legal_moves` |

Agent's full capability set = System mandatory + Game mandatory + Selected special skills.

---

## Event System

Everything important becomes an event. Events power replay, analytics, debugging, plugins, and spectators.

### Event Types

```typescript
// packages/sdk/src/types/events.ts
export type DomainEvent =
  | BattleCreated
  | BattleStarted
  | BattleFinished
  | BattleAborted
  | AgentJoinedBattle
  | AgentLeftBattle
  | TurnStarted
  | TurnFinished
  | ObservationCaptured
  | ToolRequested
  | ToolExecuted
  | ActionExecuted
  | ActionRejected
  | MessageSent
  | MessageReceived
  | StateChanged
  | ScoreUpdated
  | WinConditionMet
  | PluginActivated
  | PluginDeactivated;

export interface BattleCreated {
  type: 'BattleCreated';
  aggregateId: string;
  timestamp: Date;
  version: number;
  payload: {
    config: BattleConfig;
  };
  metadata: EventMetadata;
}

export interface ActionExecuted {
  type: 'ActionExecuted';
  aggregateId: string;
  timestamp: Date;
  version: number;
  payload: {
    agentId: string;
    action: AgentAction;
    outcome: ActionOutcome;
  };
  metadata: EventMetadata;
}
```

### Event Bus Interface

```typescript
// packages/core/src/event-bus.ts
export interface EventBus {
  publish<T extends DomainEvent>(event: T): Promise<void>;
  subscribe<T extends DomainEvent>(eventType: T['type'], handler: EventHandler<T>): Subscription;
  subscribeAll(handlers: EventSubscription[]): void;
  unsubscribe(subscription: Subscription): void;
}

export interface Subscription {
  id: string;
  unsubscribe(): void;
}

export interface EventHandler<T extends DomainEvent> {
  (event: T): Promise<void>;
}
```

### Event Store

Events are stored in SQLite for replay, analytics, and debugging:

```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  version INTEGER NOT NULL,
  payload TEXT NOT NULL,  -- JSON
  metadata TEXT NOT NULL,  -- JSON
  correlation_id TEXT,
  causation_id TEXT
);

CREATE INDEX idx_events_aggregate ON events(aggregate_id);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_timestamp ON events(timestamp);
```

---

## Storage System

Create an abstract storage system. Development uses SQLite. Production can use PostgreSQL, Object Storage, or Vector Database.

### Storage Interface

```typescript
// packages/sdk/src/types/storage.ts
export interface StorageAdapter {
  // Generic key-value operations
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  
  // Namespaced operations
  namespace(ns: string): StorageAdapter;
  
  // Batch operations
  getMany<T>(keys: string[]): Promise<Map<string, T>>;
  setMany<T>(entries: Map<string, T>): Promise<void>;
  
  // Query
  query(query: StorageQuery): Promise<StorageResult>;
  
  // Lifecycle
  initialize(): Promise<void>;
  close(): Promise<void>;
}
```

---

## Server

### Hono API Server

```
apps/server/
  src/
    routes/
      battles.ts        # Battle CRUD, control
      arenas.ts         # Arena listing, config
      games.ts          # Game listing, metadata
      agents.ts         # Agent profiles, management
      plugins.ts        # Plugin management
      replays.ts        # Replay playback, download
      chat.ts           # Spectator chat
      metrics.ts        # Battle metrics, analytics
      websocket.ts      # Real-time updates
    middleware/
      auth.ts
      cors.ts
      rate-limit.ts
      validation.ts
    app.ts
    main.ts
```

### WebSocket Protocol

Real-time updates for spectators and debugging:

```typescript
// packages/sdk/src/types/websocket.ts
export type ServerMessage =
  | { type: 'battle.state'; payload: BattleState }
  | { type: 'battle.event'; payload: DomainEvent }
  | { type: 'agent.thinking'; payload: { agentId: string; thought: string } }
  | { type: 'agent.action'; payload: { agentId: string; action: AgentAction } }
  | { type: 'observation'; payload: Observation }
  | { type: 'chat.message'; payload: ChatMessage }
  | { type: 'error'; payload: { code: string; message: string } };

export type ClientMessage =
  | { type: 'battle.join'; payload: { battleId: string } }
  | { type: 'battle.leave'; payload: { battleId: string } }
  | { type: 'chat.send'; payload: { battleId: string; message: string } }
  | { type: 'battle.control'; payload: { battleId: string; action: 'pause' | 'resume' | 'abort' } };
```

---

## Frontend

### React Plugin-Driven Shell

```
apps/web/
  src/
    shell/
      App.tsx              # Plugin-driven layout
      Layout.tsx           # Dynamic panel system
      PluginRegistry.tsx   # Client-side plugin registry
    panels/
      Battlefield.tsx      # Arena render
      EventLog.tsx         # Domain event stream
      SpectatorChat.tsx    # Chat panel
      AgentInspector.tsx   # AI reasoning view
      Scoreboard.tsx       # Live scores
      ReplayControls.tsx   # Playback controls
    hooks/
      useBattle.ts
      useWebSocket.ts
      usePlugins.ts
    components/
      ui/                  # Shared UI components
```

The web shell is a **plugin-driven layout engine**. Arenas declare their UI contributions in their manifest. The shell renders them dynamically.

---

## CLI

```
packages/cli/
  src/
    commands/
      battle.ts      # arena battle create/start/stop/list
      arena.ts       # arena list/install/info
      game.ts        # game list/install/info
      plugin.ts      # plugin install/enable/disable/list
      agent.ts       # agent create/profile/list
      replay.ts      # replay watch/download/analyze
      dev.ts         # dev server, hot reload
      init.ts        # scaffold new arena/game/plugin
    utils/
      manifest.ts
      scaffold.ts
      validate.ts
```

---

## Manifest System

Three manifest types define the ecosystem:

| Manifest | Location | Purpose |
|----------|----------|---------|
| `plugin.json` | `plugins/*/` | Declares tools, event handlers, UI panels, routes |
| `game.json` | `games/*/` | Declares adapter type, launch config, interfaces |
| `arena.json` | `arenas/*/` | Declares hosted game, UI layout, plugins, capabilities |

All manifests validated by Zod schemas in `packages/sdk/src/schemas/`.

---

## Replay System

Full deterministic replay capability.

### Replay Structure

```
replays/
  battle-uuid/
    metadata.json        # Battle config, agents, seed
    events.jsonl         # Line-delimited domain events
    snapshots/           # Periodic world state snapshots
      tick-00000.json
      tick-01000.json
    observations/        # Agent observations per tick
      agent-1/
        tick-00001.json
      agent-2/
        ...
```

### Replay Interface

```typescript
// packages/sdk/src/types/replay.ts
export interface ReplayPlayer {
  load(replayId: string): Promise<ReplayMetadata>;
  play(speed?: number): Promise<void>;
  pause(): void;
  seek(tick: number): Promise<void>;
  getStateAt(tick: number): WorldState;
  getObservationAt(agentId: string, tick: number): Observation;
  export(format: 'json' | 'video' | 'gif'): Promise<Blob>;
}
```

---

## Security Model

| Layer | Mechanism |
|-------|-----------|
| **Plugin Sandbox** | Plugins run in isolated worker threads. No direct access to core. Communication via message passing. |
| **Capability Permissions** | Plugins declare required permissions. Runtime enforces at registration. |
| **Agent Isolation** | Each agent runs in separate process/container. No shared memory. |
| **Game Isolation** | Native games launched with restricted permissions. No network, limited filesystem. |
| **MCP Tool Permissions** | Agents only see tools granted by their capability set. |
| **Spectator Read-Only** | Spectator connections are read-only. No battle control. |
| **API Authentication** | JWT tokens for server API. Role-based access (admin, spectator, developer). |

---

## Implementation Roadmap

### Phase 1: Core Foundation
- [ ] `sdk` — Types, schemas, contracts
- [ ] `core` — Runtime kernel, DI, event bus, lifecycle
- [ ] `storage` — SQLite adapter
- [ ] `plugin-manager` — Discovery, validation, lifecycle

### Phase 2: Battle & Arena
- [ ] `runtime` — Battle orchestrator, session management
- [ ] `match-engine` — Turn loop, validation, scoring
- [ ] `arenas/battle-tanks` — First arena implementation
- [ ] `games/battle-tanks` — First game adapter (native)

### Phase 3: Agent & Controller
- [ ] `controller` — Virtual devices, MCP server
- [ ] `observation` — Perception pipeline
- [ ] `agent-runtime` — LLM agent implementation
- [ ] `mcp` — Protocol implementation

### Phase 4: Server & Frontend
- [ ] `server` — Hono API + WebSocket
- [ ] `web` — React plugin-driven shell
- [ ] `cli` — Command-line interface

### Phase 5: Ecosystem
- [ ] `plugins/*` — Chat, polls, export, rewards
- [ ] `games/*` — Chess, battle-royale
- [ ] `arenas/*` — Chess-classic, chess-3d, chess-tutorial

---

## Versioning

Runtime version follows **semantic versioning** with stability guarantees:

| Version | Stability |
|---------|-----------|
| `1.x.x` | Stable — breaking changes only in major |
| `0.x.x` | Experimental — breaking changes in minor |

Contracts (interfaces, events, manifests) follow **independent versioning** — see `packages/sdk/src/schemas/`.

---

## Forbidden Patterns

| Pattern | Forbidden | Correct |
|---------|-----------|---------|
| Game logic in adapter | `if (action === 'move') { applyPhysics() }` | Native game handles physics |
| AI reasoning in adapter | `chooseBestMove(state)` | Agent runtime handles reasoning |
| Direct input simulation | `robotjs.keyTap('w')` | Controller adapter via MCP |
| Observation processing | `compressScreenshot(img)` | Observation pipeline handles transform |
| Networking in adapter | `fetch('/api/move', ...)` | Controller/Observation adapters handle transport |
| Hardcoded game paths | `'C:/Games/MyGame/game.exe'` | Configurable via manifest/launchConfig |
| Arena knowing game logic | `game.applyRules()` | Arena validates against ITS world state |
| Game knowing arena | `arena.sendChat()` | Game only exposes native I/O |

---

## Integration Checklist

### Game Adapter
- [ ] Manifest declares `adapterType` correctly
- [ ] `launchConfig` specifies command, args, env, ports
- [ ] `controllerInterface` matches Controller capabilities
- [ ] `observationInterface` matches Observation types
- [ ] Implements all `GameAdapter` lifecycle methods
- [ ] Handles process cleanup on stop/dispose
- [ ] Supports suspend/resume for battle pause
- [ ] Emits `aga:ready` on startup
- [ ] Responds to `aga:action` within timeout
- [ ] Streams `aga:state` and `aga:observation`
- [ ] Tests cover launch, action, observation, lifecycle
- [ ] Runs in headless mode for CI

### Arena Plugin
- [ ] Manifest declares `game` correctly
- [ ] `display.arena` defines UI, plugins, capabilities
- [ ] Implements `ArenaPlugin` interface
- [ ] World state is serializable/deterministic
- [ ] `validateAction` checks environment rules only
- [ ] `executeAction` produces environment events
- [ ] `getObservation` returns agent-perceived state
- [ ] `checkWinCondition` evaluates arena rules
- [ ] `getScores` computes arena scoring
- [ ] `getRenderState` produces spectator view
- [ ] Tests cover world logic in isolation (no Game)
- [ ] Multiple arenas can use same game

### Plugin
- [ ] Manifest validates against schema
- [ ] Declares all contributions explicitly
- [ ] Requests minimal permissions
- [ ] `activate`/`deactivate` manage resources
- [ ] No direct imports from core/runtime packages
- [ ] Communicates via event bus and context APIs only

---

## Summary: The Separation Is Non-Negotiable

| Arena (Environment) | Game (Native Adapter) |
|---------------------|----------------------|
| **Owns** the battle | **Is owned by** the battle |
| **Contains** the Game | **Contained by** the Arena |
| **Knows** everything about the battle | **Knows nothing** about the battle |
| **Orchestrates** agents, spectators, plugins, UI | **Bridges** to native process only |
| **Defines** world, rules, win conditions, scoring | **Exposes** native input/output |
| **Renders** for spectators | **Renders** for itself (native) |
| **Records** replays, telemetry, events | **Runs** the native executable |
| **Multiple per Game** | **One per Arena instance** |

**The Arena is the battlefield. The Game is just what's being played on it. They are architecturally separate.**