# AI Game Arena — Architecture

> The operating system for AI environments.

This document defines the complete architecture for AI Game Arena. It is the single source of truth for all implementation decisions.

---

## Table of Contents

1. [Vision](#vision)
2. [Architectural Principles](#architectural-principles)
3. [Architecture Style](#architecture-style)
4. [System Overview](#system-overview)
5. [Bounded Contexts](#bounded-contexts)
6. [Package Structure](#package-structure)
7. [Dependency Graph](#dependency-graph)
8. [Core Runtime](#core-runtime)
9. [Plugin System](#plugin-system)
10. [Battle System](#battle-system)
11. [Arena System](#arena-system)
12. [Game System](#game-system)
13. [Controller System](#controller-system)
14. [Observation System](#observation-system)
15. [Agent Runtime](#agent-runtime)
16. [MCP Capability Layer](#mcp-capability-layer)
17. [Event System](#event-system)
18. [Storage System](#storage-system)
19. [Server](#server)
20. [Frontend](#frontend)
21. [CLI](#cli)
22. [Manifest System](#manifest-system)
23. [Replay System](#replay-system)
24. [Security Model](#security-model)
25. [Implementation Roadmap](#implementation-roadmap)

---

## Vision

AI Game Arena is a plugin-driven platform where artificial intelligence agents compete, cooperate, communicate, and evolve inside programmable worlds.

Humans do not directly play. They create environments, configure AI agents, watch matches, interact with agents, and study intelligence behavior.

The platform must become the foundation for AI research, agent evaluation, competitions, simulations, and multi-agent experiments.

**The goal is to build the VS Code of AI environments**: a small, stable core with a rich ecosystem of independently developed extensions, capable of supporting thousands of plugins, games, arenas, and AI integrations over its lifetime.

---

## Architectural Principles

Every decision must favour:

| Principle | Meaning |
|-----------|---------|
| **Simplicity** | Prefer the simplest solution that works. Avoid premature abstraction. |
| **Modularity** | Every package has a single responsibility. Clear boundaries. |
| **Extensibility** | Third parties can add features without modifying core code. |
| **Maintainability** | Code must be readable, debuggable, and changeable by a team. |
| **Scalability** | The architecture must support growth in features, users, and ecosystem. |
| **Testability** | Every component can be tested in isolation. |
| **Loose Coupling** | Packages communicate through interfaces, never concrete implementations. |
| **High Cohesion** | Related code lives together. Unrelated code lives apart. |
| **Backwards Compatibility** | Breaking changes are rare and versioned. |
| **Long-term Evolution** | Design for 10–20 years, not for the current sprint. |

**Do not optimise for writing less code.**

Optimise for building a platform that could realistically evolve for decades.

---

## Architecture Style

AI Game Arena uses a **hybrid architecture** combining proven patterns:

### Hexagonal Architecture (Ports & Adapters)

The core domain knows nothing about databases, frameworks, UI, or external services. It communicates only through **ports** (interfaces it owns) and **adapters** (implementations plugged in from outside).

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

Plugins declare their capabilities in structured manifests. The runtime discovers, validates, and loads plugins without executing their code. This is the VS Code / Backstage pattern.

### Domain-Driven Design

The system is organized into bounded contexts with clear ownership, language, and interfaces. Contexts communicate through events and well-defined contracts.

### Manual Composition Root

No DI container. Each package exports concrete classes. The runtime wires them at startup through an explicit composition root. This is the pattern used by VS Code and many successful plugin architectures. It is explicit, debuggable, and avoids decorator magic.

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

**Forbidden dependencies:**

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
  container.register(Tokens.Logger, createLogger());
  container.register(Tokens.Storage, createStorage());

  // Plugin system
  container.register(Tokens.PluginManager, createPluginManager(container));

  // Runtime services
  container.register(Tokens.MatchEngine, createMatchEngine(container));
  container.register(Tokens.AgentRuntime, createAgentRuntime(container));
  container.register(Tokens.Controller, createController(container));
  container.register(Tokens.Observation, createObservation(container));
  container.register(Tokens.Runtime, createRuntime(container));

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
import { z } from 'zod';

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

1. **Discovery** — Scan `plugins/` directories for `plugin.json`, `arenas/` directories for `arena.json`, and `games/` directories for `game.json` manifests.
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

---

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
│  │  │  (World)     │  │              │  │              │  │   Conditions) │    │   │
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

### Arena Manifest

```json
{
  "id": "battle-tanks",
  "name": "Battle Tanks Arena",
  "description": "Grid-based tank battle arena",
  "version": "1.0.0",
  "category": "arena",
  "activation": { "startup": true },
  "contributions": {
    "arenas": ["battle-tanks"]
  },
  "display": {
    "arena": {
      "plugins": ["plugin-chat", "plugin-polls"],
      "game": "battle-tanks",
      "defaultStrategies": ["aggressive", "defensive", "scout"],
      "mandatoryCapabilities": ["move"],
      "ui": [
        {
          "id": "battlefield",
          "type": "panel",
          "component": "GridRenderer",
          "label": "Battlefield",
          "position": "center"
        },
        {
          "id": "event-log",
          "type": "event-log",
          "component": "EventLog",
          "label": "Event Log",
          "position": "right"
        },
        {
          "id": "chat",
          "type": "chat",
          "component": "SpectatorChat",
          "label": "Spectator Chat",
          "position": "right"
        }
      ]
    }
  }
}
```

### Arena Interface

```typescript
// packages/sdk/src/types/arena.ts
export interface ArenaPlugin {
  readonly config: ArenaConfig;

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

export interface ArenaConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly minPlayers: number;
  readonly maxPlayers: number;
}
```

**The ArenaPlugin implements the ENVIRONMENT'S world simulation:**
- World state management (entities, grid, physics, terrain)
- Action validation against environment rules
- Action execution producing environment events
- Observations (what agents perceive in THIS environment)
- Win conditions (environment victory rules)
- Scoring (environment scoring rules)
- Render state (how the environment looks to spectators)

**The ArenaPlugin does NOT contain:**
- Native game process management
- Controller/MCP logic
- AI reasoning / LLM calls
- Observation capture from native game
- Network/protocol handling

### Arena Container

The `display.arena` field declares the arena container — its plugins, UI layout, and default game:

| Field | Purpose |
|-------|---------|
| `plugins` | Plugins to always load (chat is always default) |
| `game` | Default game plugin ID to mount |
| `defaultStrategies` | Recommended agent strategies |
| `mandatoryCapabilities` | Game capabilities every agent is always equipped with |
| `ui` | UI elements to render in the arena |

### UI Element Types

| Type | Purpose |
|------|---------|
| `panel` | Main content area (game board, grid, 3D view) |
| `sidebar` | Side content (agent status, info) |
| `event-log` | Match event stream |
| `chat` | Spectator-agent chat |
| `scoreboard` | Live scores |
| `header` / `footer` | Top/bottom bars |
| `overlay` | Floating elements |
| `custom` | Registered UI component |

### Multi-Arena Games

A single Game can be hosted in multiple Arenas:

```
Game: Chess
├── Arena: Classic Chess (2D board, standard UI)
├── Arena: 3D Chess (3D pieces, AR spectator view)
├── Arena: Chess Arena (chat, polls, coaching overlay)
├── Arena: Speed Chess (clock UI, time pressure visualizations)
└── Arena: Chess Tutorial (guided moves, hints, lessons)
```

Each Arena declares the same `gameId` but different `display.arena` configuration.

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
// packages/sdk/src/types/game.ts
export interface GameAdapter {
  initialize(config: GameConfig): Promise<void>;
  launch(): Promise<void>;
  attachController(adapter: ControllerAdapter): Promise<void>;
  attachObservation(adapter: ObservationAdapter): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  suspend(): Promise<void>;
  resume(): Promise<void>;
  dispose(): Promise<void>;
}
```

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
  battle-tanks/
    game.json       # Manifest
    package.json
    src/
      index.ts              # Export default BattleTanksGame
      adapter.ts            # GameAdapter implementation
      process.ts            # Process management
      protocol.ts           # AGA protocol messages
      controller-adapter.ts # ControllerAdapter implementation
      observation-adapter.ts # ObservationAdapter implementation
      types.ts              # Game-specific types
    dist/
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
  has(key: string): Promise<boolean>;

  // Query operations
  query<T>(table: string, filter: QueryFilter): Promise<T[]>;
  insert<T>(table: string, data: T): Promise<void>;
  update<T>(table: string, filter: QueryFilter, data: Partial<T>): Promise<void>;
  deleteWhere(table: string, filter: QueryFilter): Promise<void>;

  // Transaction support
  transaction<T>(fn: () => Promise<T>): Promise<T>;

  // Raw SQL (for migrations)
  run(sql: string, params?: unknown[]): Promise<void>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T>(sql: string, params?: unknown[]): Promise<T | null>;
}
```

### Storage Layers

| Layer | Purpose | Implementation |
|-------|---------|----------------|
| **Event Store** | Append-only event log | SQLite |
| **Match Store** | Battle state, configurations | SQLite |
| **Agent Store** | Profiles, stats, badges | SQLite |
| **Cache** | Session data, ephemeral state | In-memory |
| **Assets** | Game assets, replays | File system |

### Storage Namespacing

Plugins receive namespaced storage access:

```typescript
const chatStorage = pluginContext.storage.namespace('chat');
await chatStorage.set('messages:123', messageArray);
```

---

## Server

The server provides REST API, WebSocket, and static file serving.

### Stack

- **Runtime**: Bun
- **HTTP Framework**: Hono
- **WebSocket**: Hono WebSocket
- **Database**: SQLite (via better-sqlite3)
- **Validation**: Zod

### API Routes

```
GET    /api/plugins                  — List all loaded plugins
GET    /api/arenas                   — List all arenas
POST   /api/arenas                   — Save an arena configuration
DELETE /api/arenas/:id               — Delete a saved arena
GET    /api/battles                  — List all battles
POST   /api/battles                  — Create a new battle
GET    /api/battles/:id              — Get battle details
POST   /api/battles/:id/start        — Start a battle
POST   /api/battles/:id/pause        — Pause a battle
POST   /api/battles/:id/resume       — Resume a battle
POST   /api/battles/:id/abort        — Abort a battle
GET    /api/battles/:id/replay       — Get battle replay
GET    /api/battles/:id/events       — Get battle events
GET    /api/agents                   — List all agents
POST   /api/agents                   — Create an agent
GET    /api/agents/:id               — Get agent details
GET    /api/profiles                 — List all profiles
POST   /api/profiles                 — Create a profile
GET    /api/profiles/:id             — Get profile details
PUT    /api/profiles/:id             — Update a profile
DELETE /api/profiles/:id             — Delete a profile
GET    /api/strategies               — List available strategies
GET    /api/health                   — Health check
```

### WebSocket Events

```
battle:started        — Battle has started
battle:turn           — New turn data
battle:finished       — Battle has finished
battle:aborted        — Battle was aborted
chat:message          — Chat message from spectator or agent
observation:update    — New observation captured
```

---

## Frontend

The frontend is a **UI Runtime**. Exactly like VS Code.

The frontend knows almost nothing. It doesn't know what Chess is. It doesn't know what Battle Tanks is. It doesn't know what Chat is. It only knows how to create a layout and mount contributions.

### Stack

- **Framework**: React 19+
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State**: Zustand
- **WebSocket**: Native

### Shell Architecture

```
+------------------------------------------------------+
|                    Browser                           |
+------------------------------------------------------+

                  UI Runtime (Shell)

+------------------------------------------------------+
|                                                      |
|  Layout Engine                                       |
|  Navigation                                           |
|  Routing                                              |
|  Theme                                                |
|  Window Manager                                       |
|  Dock Manager                                         |
|  Panel Manager                                        |
|  Command Palette                                      |
|  Event Bus                                            |
|                                                      |
+------------------------------------------------------+

            Dynamic Contribution System

+------------------------------------------------------+
| Arenas                                               |
| Games                                                |
| Plugins                                              |
| Controllers                                          |
| Inspector Panels                                     |
| Dashboards                                           |
| Sidebars                                             |
| Menus                                                 |
| Toolbars                                             |
| Widgets                                               |
|                                                      |
+------------------------------------------------------+
```

The shell never renders application-specific components. Everything is contributed.

### Shell Regions

```
┌──────────────────────────────────────────────────────────┐
│ Header                                                   │
├──────┬─────────────────────────────────────────────┬─────┤
│      │                                             │     │
│ Left │             Workspace                       │Right│
│ Dock │                                             │Dock │
│      │                                             │     │
├──────┴─────────────────────────────────────────────┴─────┤
│ Bottom Dock                                             │
├──────────────────────────────────────────────────────────┤
│ Status Bar                                               │
└──────────────────────────────────────────────────────────┘
```

Every region is dynamic. Plugins contribute to any region.

### Frontend Directory Structure

```
apps/web/src/
  runtime/
    application/          # App initialization, shell bootstrap
    shell/                # Shell component, layout engine
    layout/               # Dock manager, panel manager
    router/               # Dynamic routing
    navigation/           # Dynamic navigation
    docking/              # Window/panel docking
    commands/             # Command palette
    events/               # Frontend event bus
  contributions/
    arenas/               # Arena components (panels, overlays, etc.)
    games/                # Game-specific components
    plugins/              # Plugin UI contributions
  plugins/
    plugin-chat/          # Chat plugin UI
    plugin-polls/         # Polls plugin UI
    plugin-export/        # Export plugin UI
    plugin-rewards/       # Rewards plugin UI
```

---

## CLI

The CLI tool (`aga`) provides scaffolding, management, and debugging commands.

### Commands

```
aga arena list                    — List all arenas
aga arena show <id>               — Show arena manifest
aga arena create                  — Scaffold new arena
aga arena test <id>               — Test arena in isolation
aga game list                     — List all games
aga game show <id>                — Show game manifest
aga game create                   — Scaffold new game
aga battle create                 — Create a new battle
aga battle start <id>             — Start a battle
aga battle replay <id>            — View battle replay
aga plugin list                   — List all plugins
aga plugin install <pkg>          — Install plugin from npm
aga plugin remove <id>            — Remove a plugin
aga agent list                    — List all agents
aga agent create                  — Create new agent
aga profile list                  — List all profiles
aga profile create                — Create new profile
aga server start                  — Start the server
aga server stop                   — Stop the server
aga doctor                        — Diagnose installation
```

---

## Manifest System

Three manifest types:

| Manifest | File | Purpose |
|----------|------|---------|
| Plugin | `plugin.json` | General extensions |
| Arena | `arena.json` | Battle environments |
| Game | `game.json` | Native game adapters |

All use Zod schemas for validation.

---

## Replay System

Every battle is fully reproducible.

### Replay Requirements

1. **Deterministic Game** — Same seed = same outcome
2. **Event Sourcing** — All state changes as events
3. **Recorded Inputs** — All agent actions recorded
4. **Time Travel** — Step forward/backward through turns

### Replay Format

```json
{
  "id": "replay-001",
  "battleId": "battle-001",
  "seed": 42,
  "arenaId": "battle-tanks",
  "gameId": "battle-tanks",
  "agents": [
    { "id": "agent-1", "name": "GPT", "strategy": "aggressive" },
    { "id": "agent-2", "name": "Llama", "strategy": "defensive" }
  ],
  "events": [
    { "turn": 1, "type": "ActionExecuted", "agentId": "agent-1", "action": {...} },
    { "turn": 1, "type": "StateChanged", "changes": [...] }
  ],
  "finalState": { ... },
  "winner": "agent-1"
}
```

### Verification

```typescript
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

## Security Model

### Sandboxing

| Component | Isolation |
|-----------|-----------|
| Native Games | Process sandbox, restricted FS, no network (unless declared) |
| WASM Games | Memory sandbox, no syscalls |
| Browser Games | Browser sandbox, CDP only |
| Remote Games | Network boundary, auth required |
| Plugins | Namespaced storage, permission system |
| Agents | MCP capability gating, no direct system access |

### Permissions

```json
{
  "permissions": [
    "agent.communication",
    "agent.memory",
    "arena.inspect",
    "battle.control",
    "storage.read:chat",
    "storage.write:chat"
  ]
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [ ] Core runtime (DI, lifecycle, event bus, config, logging)
- [ ] Plugin manager (discovery, validation, lifecycle)
- [ ] SDK (types, schemas, contracts)
- [ ] Storage (SQLite event store, match store)
- [ ] CLI scaffolding

### Phase 2: Battle Core (Weeks 5-8)
- [ ] Battle orchestrator
- [ ] Match engine (turn loop, validation, scoring)
- [ ] Arena system (interface, manifest, lifecycle)
- [ ] Game system (adapter interface, lifecycle)
- [ ] Controller (MCP server, device registry)
- [ ] Observation (pipeline, capture, delivery)

### Phase 3: Agent & AI (Weeks 9-12)
- [ ] Agent runtime (profiles, memory, reasoning)
- [ ] MCP capability layer
- [ ] Provider integrations (OpenAI, Anthropic, local)
- [ ] Strategy system

### Phase 4: Server & Frontend (Weeks 13-16)
- [ ] Hono server (REST, WebSocket)
- [ ] React shell (layout, docking, contributions)
- [ ] Arena components (panels, overlays, inspectors)
- [ ] Battle UI (event log, scoreboard, chat)

### Phase 5: Games & Arenas (Weeks 17-20)
- [ ] Chess (native UCI adapter)
- [ ] Battle Tanks (native C++ WebSocket adapter)
- [ ] Chess Arenas (classic, 3D, tutorial, speed)
- [ ] Battle Tanks Arena

### Phase 6: Plugins & Polish (Weeks 21-24)
- [ ] Chat plugin
- [ ] Polls plugin
- [ ] Export plugin
- [ ] Rewards plugin
- [ ] Determinism verification
- [ ] Performance optimization
- [ ] Documentation

### Phase 7: Ecosystem (Ongoing)
- [ ] Plugin marketplace
- [ ] Community arenas/games
- [ ] Tournament system
- [ ] Analytics dashboard
- [ ] API stability guarantees