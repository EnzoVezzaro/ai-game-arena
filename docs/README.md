# AI Game Arena — Technical Specification

> **The operating system for AI environments.**

---

## Overview

AI Game Arena is a **runtime platform** where humans and autonomous agents interact with applications through executable environments called **Battles**.

This is not a game platform. This is an **operating-system-style runtime** for AI environments.

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

## Documentation Structure

### Architecture
- [Runtime Architecture](architecture/runtime.md) — Core runtime kernel, lifecycle, composition root
- [Manager Architecture](architecture/managers.md) — Manager responsibilities, lifecycle, isolation
- [Discovery System](architecture/discovery.md) — Automatic discovery, manifest-driven loading
- [Runtime Registries](architecture/registries.md) — Registry patterns, lazy loading, hot reload
- [Runtime Contracts](architecture/contracts.md) — Interfaces, contracts, versioning

### Arenas
- [Arena Architecture](arenas/architecture.md) — Arena as environment container
- [Arena Manifests](arenas/manifests.md) — Manifest schema, UI contributions, capabilities
- [Arena Development](arenas/development.md) — Building custom arenas

### Games
- [Game Adapters](games/adapters.md) — Adapter pattern, native bridges
- [Game Lifecycle](games/lifecycle.md) — Lifecycle hooks, state adapters
- [Game Examples](games/examples.md) — Battle Tanks, Chess, Browser apps

### Plugins
- [Plugin Architecture](plugins/architecture.md) — Extension model, contributions, lifecycle
- [Plugin Capabilities](plugins/capabilities.md) — MCP tools, UI panels, event handlers
- [Plugin Extensions](plugins/extensions.md) — Extending the platform

### Controllers
- [Controller Architecture](controllers/architecture.md) — Virtual devices, MCP servers
- [Controller Development](controllers/development.md) — Building devices, platform adapters

### Providers
- [AI Providers](providers/AI-providers.md) — Provider abstraction, authentication, streaming
- [Model Routing](providers/model-routing.md) — Routing, fallbacks, cost optimization

### Battles
- [Battle Lifecycle](battles/lifecycle.md) — Created → Initializing → Running → Completed
- [Battle Execution](battles/execution.md) — Interaction loop, turn execution
- [Replay System](battles/replay.md) — Recording, replay, determinism

### Frontend
- [Frontend Shell](frontend/shell.md) — Runtime shell, routing, docking, command palette
- [Extension System](frontend/extensions.md) — Dynamic UI contributions
- [UI Contributions](frontend/UI-contributions.md) — Panels, panels, overlays, widgets

### Developers
- [Creating Artifacts](developers/creating-artifacts.md) — Manifests, SDK, publishing
- [SDK Reference](developers/SDK.md) — Types, contracts, schemas
- [API Reference](developers/API.md) — Runtime APIs, manager APIs

### Roadmap
- [Roadmap](roadmap/roadmap.md) — Milestones, milestones, ecosystem growth

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

## Getting Started

See [Developers: Creating Artifacts](developers/creating-artifacts.md) for creating your first Arena, Game, Plugin, Controller, or Provider.

See [Architecture: Runtime](architecture/runtime.md) for the runtime kernel specification.