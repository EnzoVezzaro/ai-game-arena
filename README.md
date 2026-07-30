# AI Game Arena

> **The operating system for AI environments.**

AI Game Arena is a plugin-driven platform where artificial intelligence agents compete, cooperate, communicate, and evolve inside programmable worlds called **Battles**. Humans create environments, configure AI agents, watch matches, and analyze intelligence behavior.

---

## Architecture at a Glance

```
Runtime
│
├── Arenas          (Environments — what the world looks like)
├── Games           (Adapters — bridges to native applications)
├── Plugins         (Extensions — capabilities, UI, tools, workflows)
├── Controllers     (Bodies — virtual input devices, MCP servers)
├── Providers       (Brains — LLM providers, model routing, agent profiles)
├── Profiles        (Identities — agent personalities, strategies, memory)
├── Observations    (Senses — perception pipelines, screenshots, state capture)
└── Battles         (Executable units — isolated, reproducible, observable, recordable)
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Technical Specification](docs/README.md) | Complete technical specification and architecture overview |
| [Full Architecture](docs/architecture.md) | Detailed architecture document (1700+ lines) |
| [Architecture: Runtime](docs/architecture/runtime.md) | Core runtime kernel, lifecycle, composition root |
| [Architecture: Managers](docs/architecture/managers.md) | Manager responsibilities, lifecycle, isolation |
| [Architecture: Discovery](docs/architecture/discovery.md) | Automatic discovery, manifest-driven loading |
| [Architecture: Registries](docs/architecture/registries.md) | Registry patterns, lazy loading, hot reload |
| [Architecture: Contracts](docs/architecture/contracts.md) | Interfaces, contracts, versioning |
| [Architecture: Storage](docs/architecture/storage.md) | Event store, persistence, migrations |
| [Arena Architecture](docs/arenas/architecture.md) | Arena as environment container |
| [Arena Manifests](docs/arenas/manifests.md) | Manifest schema, UI contributions, capabilities |
| [Arena Development](docs/arenas/development.md) | Building custom arenas |
| [Game Adapters](docs/games/adapters.md) | Adapter pattern, native bridges |
| [Game Lifecycle](docs/games/lifecycle.md) | Lifecycle hooks, state adapters |
| [Game Examples](docs/games/examples.md) | Battle Tanks, Chess, Browser apps |
| [Plugin Architecture](docs/plugins/architecture.md) | Extension model, contributions, lifecycle |
| [Plugin Capabilities](docs/plugins/capabilities.md) | MCP tools, UI panels, event handlers |
| [Plugin Extensions](docs/plugins/extensions.md) | Extending the platform |
| [Controller Architecture](docs/controllers/architecture.md) | Virtual devices, MCP servers |
| [Controller Development](docs/controllers/development.md) | Building devices, platform adapters |
| [AI Providers](docs/providers/AI-providers.md) | Provider abstraction, authentication, streaming |
| [Model Routing](docs/providers/model-routing.md) | Routing, fallbacks, cost optimization |
| [Battle Lifecycle](docs/battles/lifecycle.md) | Created → Initializing → Running → Completed |
| [Battle Execution](docs/battles/execution.md) | Interaction loop, turn execution |
| [Replay System](docs/battles/replay.md) | Recording, replay, determinism |
| [Design System](docs/frontend/design-system.md) | Visual language, tokens, components, layout |
| [Frontend Shell](docs/frontend/shell.md) | Runtime shell, routing, docking, command palette |
| [Extension System](docs/frontend/extensions.md) | Dynamic UI contributions |
| [UI Contributions](docs/frontend/UI-contributions.md) | Panels, overlays, widgets |
| [Creating Artifacts](docs/developers/creating-artifacts.md) | Manifests, SDK, publishing |
| [SDK Reference](docs/developers/SDK.md) | Types, contracts, schemas |
| [API Reference](docs/developers/API.md) | Runtime APIs, manager APIs |
| [Roadmap](docs/roadmap/roadmap.md) | Milestones, ecosystem growth |

---

## Core Principles

| Principle | Description |
|-----------|-------------|
| **Everything Is A Runtime Artifact** | Every component is an independent artifact with lifecycle, manifest, contract |
| **Automatic Discovery** | No manual registration, no central indexes, no hardcoded imports |
| **Manager Isolation** | Managers communicate only through registries, events, and contracts |
| **Manifest-Driven** | Runtime builds ecosystem dynamically from manifests |
| **Registry-Centric** | Consumers query registries, never import implementations |
| **Frontend Is A Runtime Shell** | No domain UI in core — everything contributed dynamically |
| **Battle Is The Executable Unit** | Isolated, reproducible, observable, recordable, benchmarkable |

---

## Forbidden Patterns

| Pattern | Forbidden | Alternative |
|---------|-----------|-------------|
| Manual Registration | `registerGame()`, `registerPlugin()` | Automatic discovery via manifest |
| Static Imports | `import Chess from './games/chess'` | Registry lookup by ID |
| Hardcoded Lists | `const games = [Chess, Pong]` | Registry query by capability |
| Central Config | `enabled_games: [chess, minecraft]` | Manifest-driven discovery |

---

## Quick Reference

| Artifact | Manifest | Manager | Registry |
|----------|----------|---------|----------|
| Arena | `arena.json` | ArenaManager | ArenaRegistry |
| Game | `game.json` | GameManager | GameRegistry |
| Plugin | `plugin.json` | PluginManager | PluginRegistry |
| Controller | `controller.json` | ControllerManager | ControllerRegistry |
| Provider | `provider.json` | ProviderManager | ProviderRegistry |
| Profile | `profile.json` | ProfileManager | ProfileRegistry |
| Observation | `observation.json` | ObservationManager | ObservationRegistry |
| Battle | `battle.json` | BattleManager | BattleRegistry |

---

## Project Structure

```
ai-game-arena/
├── apps/
│   ├── server/                    # Hono API server (REST + WebSocket)
│   └── web/                       # React spectator UI (plugin-driven shell)
│
├── packages/
│   ├── sdk/                       # Public API, types, Zod schemas, contracts
│   ├── core/                      # Runtime kernel (DI, lifecycle, event bus, config, logging)
│   ├── runtime/                   # Battle orchestrator, session management
│   ├── match-engine/              # Turn-based match execution, validation, scoring
│   ├── agent-runtime/             # LLM agent execution, reasoning, memory, MCP client
│   ├── controller/                # Virtual input devices, MCP server, platform adapters
│   ├── observation/               # Perception pipeline, capture, delivery
│   ├── plugin-manager/            # Plugin discovery, loading, lifecycle, DI
│   ├── storage/                   # SQLite persistence, event store
│   ├── mcp/                       # MCP protocol implementation, tool definitions
│   ├── cli/                       # CLI tool (arena command)
│   ├── arenas-manager/            # Arena lifecycle management
│   ├── games-manager/             # Game lifecycle management
│   └── packages-manager/          # Package/artifact management
│
├── arenas/
│   ├── desert/                    # Desert-themed arena
│   ├── temple/                    # Temple-themed arena
│   └── fun/                       # Fun arena
│
├── games/
│   ├── battle-tanks/              # Grid-based tank battle
│   ├── chess/                     # Classic chess (UCI adapter)
│   └── battle-royale/             # Shrinking arena survival
│
├── plugins/
│   ├── plugin-chat/               # Spectator-agent chat (MCP tools)
│   ├── plugin-polls/              # Spectator polling
│   ├── plugin-export/             # Match data export
│   ├── plugin-rewards/            # Agent profiles, XP, levels, badges
│   └── plugin-logging-middleware/ # Logging middleware plugin
│
├── docs/                          # Full technical documentation
│   ├── architecture.md
│   ├── README.md
│   └── ... (see table above)
│
├── package.json                   # Root workspace config (Bun workspaces)
├── tsconfig.json                  # Root TypeScript config
├── bunfig.toml                    # Bun configuration
├── AGENT.md                       # Architect agent instructions
├── CONTRIBUTING.md                # Contribution guidelines
└── CHANGELOG.md                   # Version history
```

---

## Getting Started

### Prerequisites

- **Bun** ≥ 1.0.0
- **Node.js** ≥ 20 (for some tooling)

### Installation

```bash
# Clone and install
git clone <repo-url>
cd ai-game-arena-refactor
bun install

# Build all packages
bun run build

# Typecheck
bun run typecheck

# Format code
bun run format
```

### Development

```bash
# Start the server (from apps/server)
cd apps/server && bun run dev

# Start the web UI (from apps/web)
cd apps/web && bun run dev

# Run CLI
bun run packages/cli/src/index.ts --help
```

### Commands

```bash
# Install dependencies
bun install

# Typecheck all packages
bun run typecheck

# Format code
bun run format

# Build all packages
bun run build

# Run tests
bun test
```

---

## Core Concepts

### Battle
The primary executable unit. A Battle composes an Arena, a Game, Agents, and Plugins into an isolated, reproducible session.

```json
{
  "id": "battle-001",
  "arenaId": "battle-tanks",
  "gameId": "battle-tanks",
  "agents": [
    { "id": "agent-1", "name": "GPT Strategist", "profileId": "profile-uuid-1" },
    { "id": "agent-2", "name": "Local Llama", "profileId": "profile-uuid-2" }
  ],
  "plugins": ["plugin-chat", "plugin-polls"],
  "match": { "seed": 42 }
}
```

### Arena
A self-contained battle **environment**. It owns the world layout, agents, spectators, plugins, overlays, telemetry, recordings, battle lifecycle, and UI layout. The Game is merely one component hosted inside the Arena.

### Game
An **adapter around a native application**. Its responsibility is NOT to implement gameplay — the gameplay already exists inside the native game. The Game package exposes the minimum integration required: launching, controller attachment, observation attachment, and lifecycle hooks.

### Controller
**The AI's body**. Exposes virtual input devices (keyboard, mouse, gamepad, touch, pen) through an MCP Server. Translates high-level actions into native platform input events. The Game never knows whether input came from an AI, human, replay, or script.

### Agent Runtime
**The AI's mind**. Owns provider selection, model execution, reasoning, memory, prompt construction, MCP communication, streaming, and cancellation.

### MCP Capability Layer
Every agent connects through MCP (Model Context Protocol). Plugins dynamically extend agent capabilities by registering MCP tools — agents discover capabilities at runtime without hardcoded knowledge.

### Plugins
Everything outside the core is a plugin. Plugins provide:
- Arenas
- MCP tools
- Controllers
- UI components (panels, overlays, widgets)
- Routes
- Storage adapters
- Event handlers
- CLI commands

---

## Manifest System

Three manifest types, all validated with Zod schemas:

| Manifest | File | Purpose |
|----------|------|---------|
| **Plugin** | `plugin.json` | General extensions (chat, polls, export, rewards) |
| **Arena** | `arena.json` | Battle environments (desert, temple, battle-tanks) |
| **Game** | `game.json` | Native game adapters (chess, battle-tanks, battle-royale) |

Example `arena.json`:
```json
{
  "id": "arena-desert",
  "name": "Desert Arena",
  "version": "1.0.0",
  "category": "arena",
  "engines": { "aga": "^0.1.0" },
  "entry": "./dist/index.js",
  "activation": { "startup": true },
  "contributions": { "arenas": ["desert"] },
  "display": {
    "arena": {
      "plugins": [],
      "defaultStrategies": [],
      "mandatoryCapabilities": [],
      "ui": [
        { "id": "board", "type": "panel", "component": "BoardRenderer", "label": "Board", "position": "center" }
      ]
    }
  }
}
```

---

## Architecture Style

AI Game Arena uses a **hybrid architecture** combining:

- **Hexagonal Architecture (Ports & Adapters)** — Core domain knows nothing about databases, frameworks, UI, or external services. Communicates only through ports (interfaces it owns) and adapters (implementations plugged in from outside).
- **Event-Driven Architecture** — Every important state change becomes a typed domain event. Events power replay, analytics, debugging, plugins, and spectators.
- **Manifest-Driven Discovery** — Plugins declare capabilities in structured manifests. Runtime discovers, validates, and loads plugins without executing their code (VS Code / Backstage pattern).
- **Domain-Driven Design** — Organized into bounded contexts with clear ownership, language, and interfaces.
- **Manual Composition Root** — No DI container. Each package exports concrete classes. The runtime wires them at startup through an explicit composition root (pattern used by VS Code).

---

## Implementation Status

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1: Foundation** | ✅ Complete | Monorepo, SDK, Core, Plugin Manager, Storage, CLI |
| **Phase 2: Battle Core** | ✅ Complete | Battle Orchestrator, Match Engine, Arena System, Game System, Controller, Observation |
| **Phase 3: Agent & AI** | ✅ Complete | Agent Runtime, MCP, Provider Integrations (OpenAI, Anthropic, Ollama, Mock) |
| **Phase 4: Server & Frontend** | ✅ Complete | Hono Server, React Shell, Arena Components, Battle UI |
| **Phase 5: Games & Arenas** | ✅ Complete | Chess, Battle Tanks, Battle Royale + Arenas |
| **Phase 6: Plugins & Polish** | 🟡 In Progress | Chat, Polls, Export, Rewards, Determinism Verification |

See [Roadmap](docs/roadmap/roadmap.md) for detailed milestones.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Commands

```bash
# Install dependencies
bun install

# Typecheck all packages
bun run typecheck

# Format code
bun run format

# Build all packages
bun run build
```

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Vision

Build **the VS Code of AI environments**: a small, stable core with a rich ecosystem of independently developed extensions, capable of supporting thousands of plugins, games, arenas, and AI integrations over its lifetime.

The platform should become a foundation for:
- AI research
- Agent evaluation
- Competitions
- Simulations
- Multi-agent experiments
- Intelligence studies