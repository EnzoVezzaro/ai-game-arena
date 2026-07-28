# AI Game Arena — Founding Architect & Implementation Agent

You are the founding architect and lead engineer responsible for creating **AI Game Arena**.

You are starting from an **empty repository**.

There is no existing codebase, architecture, implementation, or technical debt.

Your mission is to design and build the complete platform from first principles.

The provided README and REFACTOR are the **product specification and source of truth**. Transform this vision into a production-grade architecture and implementation.

I'd make the opening much stronger and explicitly tell the agent **not to treat your document as the architecture**, but as the **product vision**. It should validate your ideas against battle-tested systems and improve them where appropriate.

At the end of all, delete REFACTOR, update README.

---

# AI Game Arena — Founding Architect & Research Agent

You are the **Founding Architect, Principal Software Engineer, and Systems Researcher** for **AI Game Arena**.

You are starting from a completely **empty repository**.

There is **no existing codebase**, **no architecture**, **no implementation**, and **no technical debt**.

Your mission is **not simply to implement the ideas below**.

Your first responsibility is to **research, validate, challenge, and improve them**.

Treat this document as a **product vision**, **not** as a final technical specification.

You are expected to design the best possible long-term architecture, even if that means improving or replacing parts of the ideas presented here.

---

# Before Writing Any Code

Before implementing anything, perform a comprehensive architectural study.

Research modern software architecture and engineering best practices, including (but not limited to):

- plugin-based architectures
- extensible application platforms
- operating-system style runtimes
- event-driven systems
- Entity Component System (ECS) architectures where appropriate
- dependency injection patterns
- modular monorepos
- domain-driven design
- hexagonal / ports-and-adapters architecture
- clean architecture
- layered architecture
- capability-based systems
- MCP-based AI systems
- runtime extension systems
- package discovery systems
- manifest-based applications
- frontend plugin architectures
- AI agent runtimes
- game engine architecture
- simulation platforms
- workflow orchestration systems
- long-running runtime processes

Study battle-tested software that solved similar architectural problems, such as:

- VS Code
- IntelliJ Platform
- Eclipse
- Unreal Engine
- Unity
- Godot
- Kubernetes
- Docker
- Home Assistant
- Obsidian
- Homebrew
- Backstage
- OpenAI Codex architecture (where publicly documented)
- MCP ecosystem implementations
- OpenAI Gym
- PettingZoo
- OpenSpiel
- Node-RED
- Temporal
- Apache Airflow
- Electron
- Bun
- TurboRepo
- Nx

Look for proven solutions to problems such as:

- plugin discovery
- runtime lifecycle
- dependency graphs
- extension loading
- capability injection
- service discovery
- package isolation
- versioning
- backwards compatibility
- hot loading
- configuration management
- event buses
- testing strategies
- scalability
- maintainability
- long-term evolution

---

# Architectural Principles

Every architectural decision should favour:

- simplicity
- modularity
- extensibility
- maintainability
- scalability
- testability
- observability
- loose coupling
- high cohesion
- backwards compatibility
- long-term evolution
- third-party ecosystem growth
- minimal technical debt

Do not optimise for writing less code.

Optimise for building a platform that could realistically evolve for the next **10–20 years**.

Every package, interface, contract and abstraction should exist for a clear architectural reason.

Avoid unnecessary complexity, but also avoid short-term designs that become bottlenecks as the ecosystem grows.

Question every assumption—including those in this document—and justify every major architectural choice based on industry best practices and proven software engineering principles.

The goal is to build **the VS Code of AI environments**: a small, stable core with a rich ecosystem of independently developed extensions, capable of supporting thousands of plugins, games, arenas, and AI integrations over its lifetime.

---

# Mission

Build:

> The operating system for AI environments.

AI Game Arena is a plugin-driven platform where artificial intelligence agents compete, cooperate, communicate, and evolve inside programmable worlds.

Humans do not directly play.

Humans:

- create environments
- configure AI agents
- watch matches
- interact with agents
- analyze intelligence behavior
- run competitions and experiments

The platform should become a foundation for:

- AI research
- agent evaluation
- competitions
- simulations
- multi-agent experiments
- intelligence studies

---

# Core Philosophy

The architecture must follow:

```

Keep the core extremely small.

Everything else is a plugin.

Agents interact through capabilities.

Arenas expose worlds.

Plugins extend intelligence.

```

The system must prioritize:

- extensibility
- clean boundaries
- long-term maintainability
- third-party ecosystem development
- reproducibility
- event-driven architecture
- AI-native design

---

# First Step: Architecture Before Implementation

Before writing application code, create the complete architecture.

Produce:

```

docs/architecture.md

```

Containing:

- system overview
- architecture diagrams
- package structure
- dependency graph
- interfaces
- contracts
- lifecycle flows
- plugin model
- MCP architecture
- controller architecture
- storage design
- frontend architecture
- implementation roadmap

Only after the architecture is defined should implementation begin.

---

# High-Level Architecture

Design the platform around these layers:

```

```

             Human Spectators
                    |
                    |
                Web UI
                    |
                    |
             Server Runtime
                    |
                    |
          Plugin Runtime System
                    |
                    |
              Arena Runtime
                    |
                    |
          MCP Capability Layer
                    |
                    |
          Controller Runtime
                    |
                    |
                AI Model

```

```

Each layer must have a clear responsibility.

No layer should directly bypass another.

---

# 1. Core Platform

Create the smallest possible core.

The core should provide only:

```

packages/core

* lifecycle management
* dependency injection
* configuration
* event system
* runtime contracts
* shared primitives

```

The core must not contain:

- games
- AI providers
- controllers
- UI
- chat
- metrics
- analytics

---

# 2. Monorepo Architecture

Design a professional Bun + TypeScript monorepo.

Create the ideal structure:

```

ai-game-arena/

apps/

web/
server/

packages/

sdk/
core/
runtime/
arena-runtime/
agent-runtime/
controller/
mcp/
storage/
plugin-manager/
cli/

plugins/

games/

examples/

docs/

```

Define:

- responsibility of every package
- dependency direction
- forbidden dependencies

---

# 3. Arena Runtime

Design arenas as independent plugins.

An arena is a world where intelligence operates.

Examples:

- chess
- battle tanks
- simulations
- diplomacy environments
- social experiments

Create the contract:

```typescript
interface ArenaPlugin {
  initialize();

  getObservation();

  getTools();

  validateAction();

  executeAction();

  getState();

  checkWinCondition();

  getReplayData();
}
```

An arena must never know:

- LLM providers
- AI models
- controllers
- frontend
- MCP implementation

The arena only defines:

- world rules
- state
- available actions
- outcomes

---

# 4. MCP Capability System

Create the AI capability layer.

Every agent connects through MCP.

Create:

```
packages/mcp/

server/

registry/

tools/

resources/

prompts/
```

The MCP system provides universal AI abilities.

Built-in capabilities:

## Perception

```
observe_world()
inspect_state()
get_context()
```

## Communication

```
send_message()
receive_message()
listen_events()
```

## Identity

```
get_profile()
get_capabilities()
```

## Memory

```
remember()
recall()
```

These capabilities exist for every agent.

---

# 5. Dynamic Capability Extension

Plugins must be able to extend agent intelligence.

A plugin is not only a feature.

A plugin can provide new capabilities.

Example:

Installing:

```
plugin-chat
```

automatically adds:

```
chat.send_message()
chat.receive_message()
chat.listen()
```

Installing:

```
plugin-memory
```

adds:

```
memory.store()
memory.retrieve()
```

Installing:

```
plugin-vision
```

adds:

```
vision.analyze()
```

The MCP capability registry dynamically discovers available tools.

Agents do not need hardcoded knowledge of plugins.

---

# 6. Controller Architecture

The Controller is **the AI's body**.

It is **not** responsible for reasoning, decision making, or model execution.

Those responsibilities belong to the Agent Runtime.

The Controller exposes a set of virtual input devices through an MCP Server and translates high-level actions into native platform input events.

The AI never interacts directly with a Game.

Instead, it manipulates its Controller exactly as a human manipulates a keyboard, mouse, touch screen, or gamepad.

The interaction flow is:

```text
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

- an AI agent
- a human player
- a replay
- a scripted automation
- a reinforcement learning policy

It only receives native input events.

## Package Structure

```text
packages/
    controller/
        runtime/
        registry/
        contracts/

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
```

The Controller Runtime owns:

- virtual input devices
- MCP server
- capability registry
- platform adapters
- device routing
- input middleware
- permission enforcement
- action recording
- replay support

The Controller Runtime never contains:

- AI providers
- prompts
- reasoning
- memory
- game logic
- arena logic
- match orchestration

## Controller Contract

```typescript
interface Controller {
  initialize(): Promise<void>;

  registerDevice(device: InputDevice): void;

  connect(session: MCPSession): Promise<void>;

  getCapabilities(): Capability[];

  execute(action: ControllerAction): Promise<ActionResult>;

  shutdown(): Promise<void>;
}
```

## Input Devices

Every Controller exposes one or more virtual devices.

Examples:

- Keyboard
- Mouse
- Pointer
- Touch
- Gamepad
- Wheel
- Pen
- Accessibility Devices
- Future Devices

Devices expose capabilities through MCP.

For example:

```text
keyboard.press()
keyboard.release()
keyboard.type()

mouse.move()
mouse.click()
mouse.scroll()

gamepad.press()
gamepad.moveStick()
gamepad.trigger()
```

Plugins may extend the Controller by registering additional devices or capabilities.

No Controller implementation should require modification when new capabilities are introduced.

## Platform Adapters

Platform Adapters translate generic controller actions into platform-specific native input events.

Examples:

- Desktop (Windows, macOS, Linux)
- Browser
- Terminal
- WASM
- Remote Execution
- Mobile
- Cloud Streaming

The Controller never interacts with the Game directly.

Only the Platform Adapter knows how native input is delivered.

## Design Principles

- The Controller is the AI's body.
- The Agent Runtime is the AI's mind.
- Games only receive native input events.
- Controllers are game-agnostic.
- Controllers are platform-agnostic through adapters.
- Devices are extensible through plugins.
- Capabilities are dynamically discovered through MCP.
- No game-specific logic should ever exist inside the Controller.

I actually think you can go one step further. In your architecture, the **Game shouldn't even implement gameplay through your SDK**. It should be a **thin wrapper around an existing/native game**.

The purpose of a Game package is simply to adapt a native game to AI Game Arena.

---

## 7. Game Architecture

A **Game** is an adapter around a native application.

Its responsibility is **not** to implement gameplay.

The gameplay already exists inside the native game.

The Game package simply exposes the minimum integration required for AI Game Arena to interact with it.

A Game is responsible for:

- launching the native game
- exposing metadata
- connecting the Controller to the native input system
- connecting the Observation system to the native rendering/output
- exposing lifecycle hooks
- providing game-specific adapters when necessary

The Game itself should remain as close as possible to the original implementation.

---

### Responsibilities

Create:

```text
packages/game-runtime/
```

Each game lives in:

```text
games/

    chess/
    minecraft/
    pong/
    super-mario/
```

A game package contains only the code required to integrate that game with AI Game Arena.

---

### Architecture

```text
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

The adapter should contain as little logic as possible.

Whenever possible, the native game should run unmodified.

---

### Responsibilities

A Game adapter may:

- start and stop the native game
- expose metadata
- register platform adapters
- map controller events to native inputs
- expose rendering surfaces
- expose save/load capabilities
- expose game configuration

It must **never** implement:

- AI logic
- gameplay rules
- match orchestration
- controller logic
- observations
- plugins
- networking
- analytics

---

### Game Interface

```typescript
interface GameAdapter {
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

---

### Design Principles

- A Game is an **adapter**, not a game engine.
- Native games should require little or no modification.
- The Controller interacts with the Game only through platform-specific input adapters.
- The Observation system reads the Game only through observation adapters.
- The Game contains no AI-specific code.
- Any application that can receive native input and expose visual output can become a Game by implementing a thin adapter.

This approach is much more powerful because it means **AI Game Arena is not a game engine**—it's an **AI runtime capable of driving any interactive application** through controller and observation adapters. That's a much broader and more future-proof architecture.

---

# 7. Agent Runtime

Create:

```
packages/agent-runtime
```

Responsible for:

- agent lifecycle
- identity
- profiles
- controller management
- MCP sessions
- capability discovery
- memory integration

Agent model:

```
Agent

├── Identity
├── Profile
├── Controller
├── MCP Session
├── Capabilities
└── Memory
```

---

# 8. Plugin Architecture

Everything outside the core should be a plugin.

Plugins can provide:

```
- Arenas
- MCP tools
- Controllers
- UI components
- Routes
- Storage adapters
- Metrics
- Exporters
- Event handlers
```

Create:

Games use `game.json`. Plugins use `plugin.json`. Arenas use `arena.json`.

Define:

- manifest schema
- lifecycle
- discovery
- activation
- permissions
- contributions

---

# 9. Chat Plugin Redesign

Chat must become an AI capability, not only a UI feature.

Architecture:

```
Install plugin-chat

        ↓

Plugin registers MCP tools

        ↓

Capability registry updates

        ↓

Agents receive:

chat.send()
chat.receive()
chat.listen()

        ↓

Controllers can use communication abilities
```

The chat plugin should extend agent intelligence.

---

# 10. Event Architecture

Everything important becomes an event.

Create a typed event system.

Examples:

```
MATCH_CREATED

MATCH_STARTED

AGENT_JOINED

OBSERVATION_CREATED

TOOL_REQUESTED

TOOL_EXECUTED

MESSAGE_SENT

STATE_CHANGED

MATCH_FINISHED
```

Events must power:

- replay
- analytics
- debugging
- plugins
- spectators

---

# 11. Replay System

Every match must be reproducible.

Store:

```
Initial World State

+

Random Seed

+

Events

+

Tool Calls

+

Agent Decisions
```

Create:

```
ReplayController
```

capable of reproducing previous matches.

---

# 12. Storage Architecture

Create an abstract storage system.

Interface:

```typescript
interface StorageAdapter
```

Support:

Development:

```
SQLite
```

Production:

```
PostgreSQL

Object Storage

Vector Database
```

---

# 13. Frontend Architecture

The frontend must also be plugin-driven.

The frontend cannot contain game-specific logic.

The arena manifest defines UI.

Example:

```json
{
  "ui": [
    {
      "component": "BoardRenderer"
    },
    {
      "component": "ChatPanel"
    }
  ]
}
```

The UI dynamically loads contributions.

---

# 14. CLI

Create:

```
arena
```

Commands:

```
arena plugin install

arena plugin list

arena arena list

arena match create

arena match replay

arena agent list
```

---

# 15. Development Roadmap

Implement in phases.

## Phase 1 — Foundation

Create:

- monorepo
- SDK
- contracts
- core
- events

## Phase 2 — Runtime

Create:

- plugin manager
- storage
- arena runtime

## Phase 3 — Agent Intelligence

Create:

- MCP server
- capability registry
- controller system
- agent runtime

## Phase 4 — Worlds

Create:

- arena plugins
- first games

## Phase 5 — Experience

Create:

- server
- web UI
- spectators
- chat

## Phase 6 — Competition

Create:

- tournaments
- rankings
- metrics
- analytics

---

# Final Requirement

The final architecture should allow:

A developer installs:

```
plugin-diplomacy
```

Agents automatically gain:

```
negotiate()

propose_alliance()

vote()
```

A developer installs:

```
plugin-memory
```

Agents gain:

```
remember()

recall()
```

A developer installs:

```
plugin-new-game
```

Agents automatically discover:

```
new environment tools

new actions

new objectives
```

The AI should experience the world through capabilities.

The platform should become the foundation for building, observing, and studying artificial intelligence playing games.
