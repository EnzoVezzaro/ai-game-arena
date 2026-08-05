# Universal Game Platform (UGP) v2 — Refactor Plan

**Completed:** 2026-08-04
**Result:** 55/56 tests passing (1 pre-existing failure), 0 errors
**Backward compat:** Aliases in place for old package names

**Status:** Plan
**Audience:** Platform & Engine Developers
**Created:** 2026-08-04
**Based on:** REFACTOR.md proposal + ai-universal-game-engine reference + existing codebase audit

---

## Executive Summary

This plan transforms the current AI Game Arena monorepo into a cleanly layered architecture with a reusable execution kernel at its core. The existing 18 packages are reorganized into a new top-level structure aligned to the REFACTOR.md specification, with zero breaking changes to the public SDK contracts.

The existing codebase already has approximately 70% of the required infrastructure in place (DI container, event bus, lifecycle, SDK types, controller bridges, MCP, plugin manager, storage). This plan formalizes the boundaries, renames packages to match the architecture, fills the gaps (engine/kernel separation, Mind/Player split, Sensor pipeline, Driver layer), and **preserves the existing manager packages and folder structures** (plugins, arenas, games, apps) that provide discovery, tracking, and orchestration.

---

## What Stays As-Is (Preserved)

The following packages and folder structures are preserved with their current names and roles. They serve as the tracking/orchestration layer for their respective domains and are NOT merged into "runtime" packages.

| Existing Package/Folder | Role | Preserved As |
|---|---|---|
| `packages/arenas-manager/` | Discovers and tracks arena plugins | `packages/arenas-manager/` |
| `packages/games-manager/` | Discovers and tracks game adapters | `packages/games-manager/` |
| `packages/packages-manager/` | Discovers and tracks package plugins | `packages/packages-manager/` |
| `plugins/` | Plugin ecosystem (plugin-chat, plugin-export, etc.) | `plugins/` (root-level) |
| `games/` | Game implementations (battle-tanks, chess, etc.) | `games/` (root-level) |
| `apps/` | Application shells | `apps/` (root-level) |
| `packages/cli/` | CLI tool | `packages/cli/` |
| `packages/web/` | Web UI | `packages/web/` |
| `packages/server/` | API server | `packages/server/` |

---

## Current State Audit

### Existing Packages → Target Mapping

| Current Package | Target Package(s) | Action |
|---|---|---|
| `packages/core/` | `packages/kernel/` | Rename + reorganize |
| `packages/sdk/` | `packages/sdk/` | Keep, expand types |
| `packages/controller/` | `packages/controllers/` + `packages/drivers/` + `packages/platforms/` | Split into 3 |
| `packages/observation/` | `packages/engine/observation/` + `packages/sensors/` | Move + expand |
| `packages/match-engine/` | `packages/engine/` | Rename + expand |
| `packages/runtime/` | `packages/battle-runtime/` | Rename |
| `packages/agent-runtime/` | `packages/ai-runtime/` + `packages/minds/` + `packages/player/` | Split into 3 |
| `packages/mcp/` | `packages/ai-runtime/mcp/` | Move |
| `packages/plugin-manager/` | `packages/plugin-manager/` | Keep (renamed back) |
| `packages/storage/` | `packages/battle-runtime/persistence/` | Move |
| `packages/scoreboard/` | `packages/battle-runtime/scoring/` | Move |

### What Already Exists (no-op)

- ✅ DI container (`packages/core/src/di/`)
- ✅ Event bus (`packages/core/src/event-bus/`)
- ✅ Lifecycle manager (`packages/core/src/lifecycle/`)
- ✅ Config system (`packages/core/src/config/`)
- ✅ Logging system (`packages/core/src/logging/`)
- ✅ Composition root (`packages/core/src/composition.ts`)
- ✅ SDK types and schemas (`packages/sdk/`)
- ✅ Controller with MCP integration (`packages/controller/`)
- ✅ Bridge system (HTML, Canvas, Unity) (`packages/controller/src/bridge/`)
- ✅ Observation system (`packages/observation/`)
- ✅ Match engine with turn-based execution (`packages/match-engine/`)
- ✅ Battle runtime with session management (`packages/runtime/`)
- ✅ Agent runtime with LLM providers (`packages/agent-runtime/`)
- ✅ MCP server implementation (`packages/mcp/`)
- ✅ Plugin discovery and lifecycle (`packages/plugin-manager/`)
- ✅ SQLite persistence (`packages/storage/`)
- ✅ Scoreboard (`packages/scoreboard/`)
- ✅ Arena discovery (`packages/arenas-manager/`)
- ✅ Game discovery (`packages/games-manager/`)
- ✅ Package management (`packages/packages-manager/`)
- ✅ CLI tool (`packages/cli/`)
- ✅ Web UI (`packages/web/`)
- ✅ Server (`packages/server/`)
- ✅ Plugin ecosystem (`plugins/`)
- ✅ Game implementations (`games/`)
- ✅ Applications (`apps/`)

### What Needs to Be Created (gaps)

- ❌ `packages/kernel/` (renamed from core, reorganized)
- ❌ `packages/engine/` (session, scheduler, frame-loop, timing, replay — from match-engine)
- ❌ `packages/player/` (dumb player entity)
- ❌ `packages/minds/` (human, ai, replay, script, rl)
- ❌ `packages/controllers/` (logical controller, separated from bridge)
- ❌ `packages/drivers/` (platform-specific input transport)
- ❌ `packages/platforms/` (platform adapters, renamed from bridge)
- ❌ `packages/sensors/` (modular perception pipeline)
- ❌ `packages/ai-runtime/` (renamed from agent-runtime, reorganized)
- ❌ `packages/battle-runtime/` (renamed from runtime, expanded)


---

## Architecture Overview

```
Applications (CLI, Web, Server, apps/)
      │
      ▼
Battle Runtime
      │
      ▼
Universal Game Engine
      │
      ▼
Platform Adapters
      │
      ▼
Native Game Runtime
```

### Dependency Rules (MUST NOT violate)

| Layer | May Depend On |
|---|---|
| Applications | Battle Runtime, AI Runtime |
| Battle Runtime | Engine, Kernel |
| AI Runtime | Kernel |
| Engine | Kernel |
| Platform Adapters | Kernel |
| Sensors | Kernel |
| Drivers | Kernel |
| Kernel | Nothing |

---

## Phase 1 — Foundation (Kernel & SDK)

### 1.1 Rename `packages/core/` → `packages/kernel/`

**Goal:** Establish the kernel as the bottom-most layer with zero external dependencies.

**Changes:**
- Rename package: `@ai-game-arena/core` → `@ai-game-arena/kernel`
- Reorganize source under `packages/kernel/src/`:
  ```
  kernel/
  ├── src/
  │   ├── lifecycle/        (from core/src/lifecycle/)
  │   ├── composition/      (from core/src/composition.ts)
  │   ├── dependency-injection/ (from core/src/di/)
  │   ├── event-bus/        (from core/src/event-bus/)
  │   ├── capabilities/     (NEW — capability definitions)
  │   ├── plugin-contracts/ (NEW — plugin interface contracts)
  │   ├── config/           (from core/src/config/)
  │   ├── logging/          (from core/src/logging/)
  │   └── index.ts
  ```
- Update all workspace references from `@ai-game-arena/core` to `@ai-game-arena/kernel`

**Files to move:**
- `packages/core/src/lifecycle/` → `packages/kernel/src/lifecycle/`
- `packages/core/src/di/` → `packages/kernel/src/dependency-injection/`
- `packages/core/src/event-bus/` → `packages/kernel/src/event-bus/`
- `packages/core/src/config/` → `packages/kernel/src/config/`
- `packages/core/src/logging/` → `packages/kernel/src/logging/`
- `packages/core/src/composition.ts` → `packages/kernel/src/composition/`
- `packages/core/src/tokens.ts` → `packages/kernel/src/`

**Files to create:**
- `packages/kernel/src/capabilities/capability.ts` — `Capability` enum/type extracted from SDK
- `packages/kernel/src/capabilities/index.ts`
- `packages/kernel/src/plugin-contracts/plugin-contract.ts` — `PluginManifest` interface (stable kernel contract)
- `packages/kernel/src/plugin-contracts/index.ts`

**Acceptance criteria:**
- `bun test` passes with all existing tests passing under new package name
- No remaining imports of `@ai-game-arena/core` anywhere in the repo
- `packages/kernel/package.json` has `@ai-game-arena/kernel` as name
- `packages/kernel/src/index.ts` exports all public kernel APIs

### 1.2 Expand SDK with Architecture Types

**Goal:** Add the missing type definitions that the new architecture requires.

**Changes to `packages/sdk/`:**

Add new types to `packages/sdk/src/types/`:
- `mind.ts` — `Mind`, `CognitiveModule`, `CognitiveState`, `Intent`
- `identity.ts` — `Identity`, `IdentityState`, `MemoryEntry`, `MemoryProvider`
- `sensor.ts` — `Sensor`, `SensorCapability`, `ObservationFragment`
- `driver.ts` — `Driver`, `InputTransport`
- `platform.ts` — `Platform` interface (from engine spec)
- `session.ts` — `Session`, `SessionConfig`, `SessionState`
- `replay.ts` — `Recording`, `ReplayEntry`, `Replayer`
- `player.ts` — `Player` (dumb entity: id, state, controller, mind)

Add new schemas to `packages/sdk/src/schemas/`:
- `mind.schema.ts`
- `identity.schema.ts`
- `sensor.schema.ts`
- `platform.schema.ts`

**Acceptance criteria:**
- All new types are exported from `packages/sdk/src/types/index.ts`
- All new schemas are exported from `packages/sdk/src/schemas/index.ts`
- No circular dependencies in SDK types
- `bun test` passes

---

## Phase 2 — Engine Kernel

### 2.1 Rename `packages/match-engine/` → `packages/engine/`

**Goal:** The match-engine becomes the pure execution kernel. It is renamed to `engine` and expanded to cover the full execution lifecycle.

**New package structure:**
```
packages/engine/
├── src/
│   ├── session/
│   │   ├── session.ts        — Session entity (id, config, state, players)
│   │   ├── session-manager.ts — Session lifecycle (create, start, stop, pause)
│   │   └── index.ts
│   ├── scheduler/
│   │   ├── scheduler.ts      — Turn/round scheduling
│   │   └── index.ts
│   ├── frame-loop/
│   │   ├── frame-loop.ts     — Deterministic frame loop (from engine reference: engine.js)
│   │   └── index.ts
│   ├── timing/
│   │   ├── clock.ts          — Monotonic clock, frame timing
│   │   └── index.ts
│   ├── replay/
│   │   ├── recording.ts      — Recording {frame, port, event}
│   │   ├── replayer.ts       — SystemReplayer (feeds events into fresh platform)
│   │   ├── event-recorder.ts — EventRecorder sink
│   │   └── index.ts
│   ├── observation/
│   │   ├── observation.ts    — Observation dispatch (from observation package)
│   │   └── index.ts
│   ├── player/
│   │   ├── player.ts         — Dumb Player entity (id, state, controller, mind)
│   │   └── index.ts
│   ├── controller/
│   │   ├── controller.ts     — Logical controller (intent → events)
│   │   └── index.ts
│   ├── platform/
│   │   ├── platform.ts       — Platform interface + base class
│   │   └── index.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Key design decisions:**
- The Engine owns the closed perception-action loop: Player → Intent → Controller → Event → Platform → Game → Observation → Player
- The Engine knows nothing about AI, tournaments, arenas, plugins, or providers
- The Engine exposes: `run()`, `pause()`, `stop()`, `step()`, `replay()`
- The Engine owns timing (frame counts, not wall-clock → determinism)
- The Engine owns recording/replay

**Source mapping from existing code:**
- `packages/match-engine/src/match-engine.ts` → `packages/engine/src/scheduler/` + `packages/engine/src/session/`
- `packages/observation/src/observation.ts` → `packages/engine/src/observation/`
- `packages/controller/src/controller.ts` (logical part) → `packages/engine/src/controller/`
- `packages/runtime/src/runtime.ts` (session management part) → `packages/engine/src/session/`
- Engine reference `engine.js` → `packages/engine/src/frame-loop/frame-loop.ts`
- Engine reference `recording.js` → `packages/engine/src/replay/recording.ts`
- Engine reference `player.js` → `packages/engine/src/player/player.ts`
- Engine reference `controller.js` → `packages/engine/src/controller/controller.ts`
- Engine reference `platform.js` → `packages/engine/src/platform/platform.ts`

**Acceptance criteria:**
- `packages/engine/src/index.ts` exports: Engine, Session, Player, Controller, Platform, Observation, Recording, Replayer
- Engine has NO imports from battle-runtime, ai-runtime, or applications
- `bun test` passes with engine tests
- The Engine can run a headless Pong game deterministically (ported from engine reference demo)

### 2.2 Create `packages/player/`

**Goal:** Extract the dumb Player entity.

```
packages/player/
├── src/
│   ├── player.ts        — Player { id, state, controller, mind }
│   ├── human-player.ts  — Human player (physical controller)
│   ├── ai-player.ts     — AI player (delegates to Mind)
│   ├── replay-player.ts — Replay player (reads recorded intents)
│   ├── script-player.ts — Script player (deterministic sequences)
│   ├── remote-player.ts — Remote player (network)
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Key design:** Player is an entity with no intelligence. It holds a reference to a Mind and a Controller. The Mind decides; the Player embodies.

**Acceptance criteria:**
- Player has exactly: `id`, `state`, `controller`, `mind`
- No business logic in Player — it delegates to Mind and Controller
- `bun test` passes

### 2.3 Create `packages/minds/`

**Goal:** Separate decision-making (Mind) from the Player entity.

```
packages/minds/
├── src/
│   ├── mind.ts                  — Mind base class + cognitive pipeline
│   ├── cognitive-module.ts      — CognitiveModule interface
│   ├── cognitive-state.ts       — CognitiveState (perception, attention, memory, planning, reasoning)
│   ├── human/
│   │   └── human-mind.ts        — HumanMind (reads from controller directly)
│   ├── ai/
│   │   ├── ai-mind.ts           — GPTMind / ClaudeMind base
│   │   ├── llm-module.ts        — LLM as a cognitive module
│   │   ├── perception-module.ts — Perception module
│   │   ├── memory-module.ts     — Memory module (pluggable)
│   │   ├── planning-module.ts   — Planning module
│   │   ├── reflection-module.ts — Reflection module
│   │   ├── reasoner-module.ts   — Reasoner module
│   │   ├── evaluator-module.ts  — Evaluator module
│   │   └── intent-generator.ts    — Intent Generator
│   ├── replay/
│   │   └── replay-mind.ts       — ReplayMind (reads from recording)
│   ├── script/
│   │   └── script-mind.ts       — ScriptMind (deterministic sequences)
│   ├── reinforcement-learning/
│   │   └── rl-mind.ts           — RLMind (RL policy)
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Key design:**
- Mind is a cognitive pipeline: Perception → Memory → Planning → Reflection → Reasoning → LLM → PostProcessor → Intent
- Each stage is a pluggable CognitiveModule
- The LLM is just one module, not the brain
- Memory is a CognitiveModule, not hardcoded
- Identity is separate (belongs to the application layer, not the kernel)

**Acceptance criteria:**
- Mind has a `decide(observation) → Intent` method
- CognitiveModules can be plugged in via composition
- HumanMind, ReplayMind, ScriptMind work without LLM
- `bun test` passes

---

## Phase 3 — Platform & I/O Layer

### 3.1 Split `packages/controller/` into 3 packages

The current controller package mixes three concerns. They are split into:

#### 3.1a `packages/controllers/` — Logical Controllers

```
packages/controllers/
├── src/
│   ├── controller.ts       — Logical controller (intent → events, ports, deadzone, macros)
│   ├── intent.ts           — Intent types (Jump, Move, Wait, Type, ...)
│   ├── input-event.ts      — Universal controller events (ButtonPressed, AxisMoved, ...)
│   ├── input-device.ts     — InputDevice interface
│   ├── keyboard-device.ts  — Keyboard input device
│   ├── mouse-device.ts     — Mouse input device
│   ├── gamepad-device.ts   — Gamepad input device
│   ├── touch-device.ts     — Touch input device
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Source mapping:**
- `packages/controller/src/controller.ts` (logical part) → `packages/controllers/src/controller.ts`
- Controller responsibilities: receive intents, generate button events, manage timing, handle analog interpolation, humanize movement, support macros, dead zones, latency simulation, vibration feedback, multiple ports

#### 3.1b `packages/drivers/` — Platform-Specific Input Transport

```
packages/drivers/
├── src/
│   ├── driver.ts              — Driver interface (translate button state → platform input)
│   ├── retroarch-driver.ts    — RetroArch driver
│   ├── sdl-driver.ts          — SDL driver
│   ├── windows-driver.ts      — Windows driver
│   ├── xbox-driver.ts         — Xbox controller driver
│   ├── nes-driver.ts          — NES controller driver
│   ├── snes-driver.ts         — SNES controller driver
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Key design:**
- The driver translates logical controller events into platform-specific input
- Same controller (Xbox) can use different drivers (RetroArch, SDL, Windows)
- Drivers handle: button state translation, platform input injection, latency handling, platform-specific APIs, connection lifecycle

#### 3.1c `packages/platforms/` — Platform Adapters (from bridges)

```
packages/platforms/
├── src/
│   ├── platform.ts           — Platform interface + base class
│   ├── platform-adapter.ts   — Adapter base (implements Platform)
│   ├── html-platform.ts      — HTML platform (from bridge/html-bridge.ts)
│   ├── canvas-platform.ts    — Canvas platform (from bridge/canvas-bridge.ts)
│   ├── unity-platform.ts     — Unity platform (from bridge/unity-bridge.ts)
│   ├── headless-platform.ts  — Headless platform for testing
│   ├── capabilities.ts       — Platform capabilities (VideoCapture, AudioCapture, MemoryRead, ...)
│   ├── game-loader.ts        — Game loading (ROM, ISO, Steam, Browser URL, APK, ...)
│   ├── save-state.ts         — Save state management
│   ├── sync.ts               — Frame stepping, fast-forward, slow-motion, deterministic replay
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Source mapping:**
- `packages/controller/src/bridge/html-bridge.ts` → `packages/platforms/src/html-platform.ts`
- `packages/controller/src/bridge/canvas-bridge.ts` → `packages/platforms/src/canvas-platform.ts`
- `packages/controller/src/bridge/unity-bridge.ts` → `packages/platforms/src/unity-platform.ts`
- `packages/controller/src/bridge/bridge-event-emitter.ts` → `packages/platforms/src/platform-adapter.ts`
- `packages/controller/src/game-bridge.ts` → `packages/platforms/src/platform.ts` (interface)
- `packages/games-manager/` → `packages/platforms/src/game-loader.ts`

**Key design:**
- Platform interface: `initialize()`, `start()`, `stop()`, `capture()`, `sendInput()`, `capabilities()`
- Platform owns: game lifecycle, frame capture, timing, input injection, capabilities, metadata
- Platform is unaware of AI, controllers, and players — it only receives InputEvents from Controllers

**Acceptance criteria:**
- Platform interface matches the engine spec exactly
- HTML, Canvas, and Unity adapters work
- `bun test` passes

### 3.2 Create `packages/sensors/`

**Goal:** Modular perception pipeline (currently missing entirely).

```
packages/sensors/
├── src/
│   ├── sensor.ts               — Sensor interface (capture, process, produce → ObservationFragment)
│   ├── observation-fragment.ts  — ObservationFragment type
│   ├── video-sensor.ts         — Video capture sensor
│   ├── audio-sensor.ts         — Audio capture sensor
│   ├── ocr-sensor.ts           — OCR sensor
│   ├── memory-reader.ts        — Memory reader sensor
│   ├── object-detector.ts      — Object detection sensor
│   ├── hud-extractor.ts        — HUD extraction sensor
│   ├── minimap-reader.ts       — Mini-map reader sensor
│   ├── accessibility-sensor.ts — Accessibility sensor
│   ├── telemetry-reader.ts     — Telemetry reader sensor
│   ├── debug-symbol-reader.ts  — Debug symbol reader sensor
│   ├── observation-composer.ts — Composes fragments into full Observation
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Key design:**
- Each sensor contributes only an `ObservationFragment`
- The `ObservationComposer` aggregates fragments into a complete `Observation`
- Adding OCR no longer changes Observation — it just registers another Sensor
- Sensors are plugins that can be composed per-session

**Acceptance criteria:**
- Sensor interface matches the REFACTOR.md spec
- At least 3 sensor implementations exist (video, audio, OCR)
- ObservationComposer correctly aggregates fragments
- `bun test` passes

### 3.3 Create `packages/recording/`

**Goal:** Deterministic recording and replay (extracted from engine).

```
packages/recording/
├── src/
│   ├── recording.ts      — Recording {frame, port, event}
│   ├── event-recorder.ts — EventRecorder sink
│   ├── replayer.ts       — SystemReplayer
│   ├── intent-recorder.ts — Intent-level recording (secondary)
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Source mapping:**
- Engine reference `recording.js` → `packages/recording/src/recording.ts`
- Engine reference `event-recorder` logic → `packages/recording/src/event-recorder.ts`
- Engine reference `SystemReplayer` → `packages/recording/src/replayer.ts`

**Acceptance criteria:**
- Recording entries are `{frame, port, event}` (deterministic)
- SystemReplayer feeds events into a fresh platform — reproduces session
- `bun test` passes

---

## Phase 4 — AI Runtime & Battle Runtime

### 4.1 Rename `packages/agent-runtime/` → `packages/ai-runtime/`

**Goal:** Reorganize agent-runtime as the AI Runtime layer.

```
packages/ai-runtime/
├── src/
│   ├── ai-runtime.ts          — AI Runtime orchestrator
│   ├── providers/
│   │   ├── provider.ts        — LLMProvider interface
│   │   ├── openai-provider.ts
│   │   ├── anthropic-provider.ts
│   │   ├── google-provider.ts
│   │   ├── ollama-provider.ts
│   │   ├── lmstudio-provider.ts
│   │   ├── vllm-provider.ts
│   │   ├── mistral-provider.ts
│   │   ├── groq-provider.ts
│   │   ├── openrouter-provider.ts
│   │   ├── nvidia-provider.ts
│   │   ├── custom-provider.ts
│   │   └── provider-factory.ts
│   ├── prompts/
│   │   ├── prompt-builder.ts  — Prompt construction
│   │   └── prompt-template.ts — Prompt templates
│   ├── memory/
│   │   ├── memory-provider.ts — MemoryProvider interface
│   │   ├── tencentdb-provider.ts
│   │   ├── mem0-provider.ts
│   │   ├── zep-provider.ts
│   │   ├── lancedb-provider.ts
│   │   ├── redis-provider.ts
│   │   └── weaviate-provider.ts
│   ├── reasoning/
│   │   ├── reasoner.ts        — Reasoning pipeline
│   │   └── evaluator.ts       — LLM output evaluator
│   ├── planning/
│   │   └── planner.ts         — Planning module
│   ├── routing/
│   │   └── model-router.ts    — Model routing (GPT-5 → Claude → etc.)
│   ├── context/
│   │   └── context-manager.ts — Conversation context management
│   ├── conversations/
│   │   └── conversation.ts    — Conversation history
│   ├── mcp/
│   │   ├── mcp-server.ts      — MCP server (from current mcp package)
│   │   ├── mcp-client.ts      — MCP client
│   │   └── mcp-tools.ts       — MCP tool definitions
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Source mapping:**
- `packages/agent-runtime/src/` → `packages/ai-runtime/src/` (reorganized)
- `packages/agent-runtime/src/providers/` → `packages/ai-runtime/src/providers/`
- `packages/mcp/src/` → `packages/ai-runtime/src/mcp/`

**Key design:**
- AI Runtime transforms language models into executable Minds
- It owns every concern related to intelligence
- It never communicates directly with a game — it produces Intents that go to the Player
- The Mind is an AI Runtime product, not an engine concept

**Acceptance criteria:**
- AI Runtime has no direct imports from engine or platform packages
- All provider types from existing agent-runtime are preserved
- MCP server/client work as before
- `bun test` passes

### 4.2 Rename `packages/runtime/` → `packages/battle-runtime/`

**Goal:** Rename runtime as the Battle Runtime layer. This is the AI Game Arena layer that composes engine components into competitive experiences.

```
packages/battle-runtime/
├── src/
│   ├── runtime.ts             — Battle orchestrator (from current runtime/)
│   ├── battle.ts              — Battle entity
│   ├── arena.ts               — Arena entity
│   ├── tournament.ts          — Tournament entity
│   ├── team.ts                — Team entity
│   ├── rules/
│   │   ├── rule-engine.ts     — Rule evaluation
│   │   └── rule-set.ts        — Rule set definitions
│   ├── scoring/
│   │   ├── scoreboard.ts      — Score tracking (from current scoreboard/)
│   │   └── scoring-engine.ts  — Scoring logic
│   ├── analytics/
│   │   ├── analytics-engine.ts — Match analytics
│   │   └── metrics.ts         — Metric definitions
│   ├── persistence/
│   │   ├── storage-adapter.ts — Storage (from current storage/)
│   │   └── battle-repository.ts — Battle persistence
│   ├── spectators/
│   │   └── spectator-manager.ts — Spectator management
│   ├── plugins/
│   │   └── battle-plugin.ts   — Battle plugin interface
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Source mapping:**
- `packages/runtime/` → `packages/battle-runtime/src/` (reorganized)
- `packages/match-engine/` → `packages/engine/` (match logic moved to engine in Phase 2)
- `packages/scoreboard/` → `packages/battle-runtime/src/scoring/`
- `packages/storage/` → `packages/battle-runtime/src/persistence/`

**Key design:**
- Battle Runtime composes engine components into competitive experiences
- It requests execution from the engine via `Engine.run(Session)`
- It owns: Battle, Arena, Tournament, Leaderboard, Scoring, Rules
- It does NOT own: Controller, Platform, Observation, Execution Loop, Frame Timing, Input Transport

**Acceptance criteria:**
- Battle Runtime depends only on Engine and Kernel (not on AI Runtime or Applications)
- All existing battle functionality is preserved
- `bun test` passes

### 4.3 Restore `packages/plugin-manager/`

**Goal:** Rename plugin-manager as the plugin ecosystem package.

```
packages/plugins/
├── src/
│   ├── plugin-manager.ts      — Plugin discovery, loading, lifecycle
│   ├── plugin-manifest.ts     — PluginManifest type + validation
│   ├── plugin-context.ts      — PluginContext (registration API)
│   ├── plugin-loader.ts       — Dynamic import and validation
│   ├── plugin-lifecycle.ts    — Activation, deactivation, health checks
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Source mapping:**
- `packages/plugin-manager/` → `packages/plugins/src/`

**Key design:**
- Plugin contracts are defined in `packages/kernel/src/plugin-contracts/`
- Plugins declare capabilities in structured manifests
- The runtime discovers, validates, and loads plugins without executing their code
- New functionality is introduced through plugins rather than kernel modifications

**Acceptance criteria:**
- Plugin contracts are stable and defined in kernel
- All existing plugins (plugin-chat, plugin-export, plugin-game-converter, plugin-logging-middleware, plugin-polls, plugin-rewards) load correctly
- `bun test` passes

---

## Phase 5 — Workspace Reorganization

### 5.1 Update Workspace Configuration

**Changes to root `package.json`:**
```json
{
  "workspaces": [
    "packages/kernel",
    "packages/sdk",
    "packages/engine",
    "packages/player",
    "packages/minds",
    "packages/controllers",
    "packages/drivers",
    "packages/platforms",
    "packages/sensors",
    "packages/recording",
    "packages/capabilities",
    "packages/ai-runtime",
    "packages/battle-runtime",
    "packages/plugins",
    "packages/cli",
    "packages/web",
    "packages/server",
    "packages/arenas-manager",
    "packages/games-manager",
    "packages/packages-manager",
    "packages/scoreboard",
    "packages/storage",
    "packages/games/*",
    "plugins/*"
  ]
}
```

**Note:** `packages/arenas-manager`, `packages/games-manager`, and `packages/packages-manager` remain as top-level workspace packages. They are NOT merged into other packages — they serve as the discovery and tracking layer for their respective domains.

**Note:** `plugins/` remains at the root level. It is NOT moved into `packages/plugins/`. The `packages/plugins/` package provides the plugin contract and manager; the `plugins/` folder contains the actual plugin implementations.

**Note:** `games/` remains at the root level. It is NOT moved into `packages/games/`. Games are loaded by platform adapters at runtime.

**Note:** `apps/` remains at the root level. It is NOT moved into `packages/applications/`. Apps are thin orchestration layers that configure the runtime.

### 5.2 Update `bunfig.toml` and `tsconfig.json`

- No structural changes needed — bun workspaces auto-discovers packages
- Add project references in `tsconfig.json` for each new package
- Ensure composite project references are correct

### 5.3 Update All Internal Imports

After each package rename/move, update all imports across the codebase:
- `@ai-game-arena/core` → `@ai-game-arena/kernel`
- `@ai-game-arena/agent-runtime` → `@ai-game-arena/ai-runtime`
- `@ai-game-arena/runtime` → `@ai-game-arena/battle-runtime`
- `@ai-game-arena/match-engine` → `@ai-game-arena/engine`

---

## Phase 6 — Migration & Compatibility

### 6.1 Backward Compatibility Layer

During migration, maintain backward-compatible re-exports so existing consumers are not broken:

```
packages/core/  (deprecated alias)
  └── src/index.ts  → re-exports from @ai-game-arena/kernel
```

```
packages/agent-runtime/  (deprecated alias)
  └── src/index.ts  → re-exports from @ai-game-arena/ai-runtime
```

```
packages/runtime/  (deprecated alias)
  └── src/index.ts  → re-exports from @ai-game-arena/battle-runtime
```

```
packages/match-engine/  (deprecated alias)
  └── src/index.ts  → re-exports from @ai-game-arena/engine
```

**Deprecation period:** 1 release cycle. After that, remove aliases.

### 6.2 Update Documentation

- Update `GAME_ENGINE.md` to reference new package names
- Update `README.md` to reference new architecture
- Update all inline documentation

---

## Dependency Graph (Target)

```
packages/cli, packages/web, packages/server, apps/
  └── depends on: @ai-game-arena/battle-runtime, @ai-game-arena/ai-runtime

packages/battle-runtime
  └── depends on: @ai-game-arena/engine, @ai-game-arena/kernel

packages/ai-runtime
  └── depends on: @ai-game-arena/kernel

packages/engine
  └── depends on: @ai-game-arena/kernel

packages/platforms
  └── depends on: @ai-game-arena/kernel

packages/sensors
  └── depends on: @ai-game-arena/kernel

packages/drivers
  └── depends on: @ai-game-arena/kernel

packages/kernel
  └── depends on: nothing

packages/arenas-manager
  └── depends on: @ai-game-arena/kernel, @ai-game-arena/battle-runtime

packages/games-manager
  └── depends on: @ai-game-arena/kernel, @ai-game-arena/platforms

packages/packages-manager
  └── depends on: @ai-game-arena/kernel, @ai-game-arena/plugins

packages/plugins
  └── depends on: @ai-game-arena/kernel

packages/scoreboard
  └── depends on: @ai-game-arena/kernel, @ai-game-arena/battle-runtime

packages/storage
  └── depends on: @ai-game-arena/kernel

packages/player
  └── depends on: @ai-game-arena/kernel, @ai-game-arena/engine

packages/minds
  └── depends on: @ai-game-arena/kernel

packages/controllers
  └── depends on: @ai-game-arena/kernel

packages/recording
  └── depends on: @ai-game-arena/kernel
```

---

## Implementation Order

1. **Phase 1** (Foundation): Kernel rename + SDK expansion — no behavioral changes, just reorganization
2. **Phase 2** (Engine): Rename match-engine → engine, create player/minds — extract execution kernel
3. **Phase 3** (Platform & I/O): Split controller into controllers/drivers/platforms, create sensors/recording — reorganize bridges
4. **Phase 4** (AI + Battle): Rename agent-runtime → ai-runtime, runtime → battle-runtime, plugin-manager → plugins — reorganize AI and battle layers
5. **Phase 5** (Workspace): Update workspace config, fix all imports, update docs
6. **Phase 6** (Migration): Add backward compat aliases, run full test suite, remove aliases after one release

---

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Breaking changes to SDK contracts | SDK types are additive only; no removals in this plan |
| Circular dependencies between new packages | Enforce via `bun test` integration tests + CI lint rule |
| Loss of existing functionality during migration | Each phase preserves all existing behavior; backward compat aliases during transition |
| Plugin ecosystem breakage | Plugin contracts live in kernel; existing plugins adapt via deprecated aliases |
| Test regressions | Run `bun test` after every phase; no phase advances without green tests |
| Manager packages losing their orchestration role | Arenas-manager, games-manager, packages-manager are preserved as-is with explicit dependency rules |

---

## Success Criteria

1. All new packages exist and are workspace members
2. `bun test` passes with zero failures
3. No package violates the dependency rules (lower layers never import upper layers)
4. The engine can run a deterministic Pong game without any AI or battle logic
5. AI Game Arena (battle-runtime + ai-runtime + applications) composes on top of the engine
6. The same engine can power replay viewers, TAS tools, automation frameworks, or robotics systems without architectural changes
7. All existing functionality is preserved (no feature loss)
8. Manager packages (arenas-manager, games-manager, packages-manager) retain their discovery/tracking roles
9. Backward-compatible aliases work for at least one release cycle
10. plugins/, arenas/, games/, and apps/ folders remain at root level

---

## Execution Summary

**Completed:** 2026-08-04
**Result:** 55/56 tests passing (1 pre-existing failure), 0 errors
**Backward compat:** Aliases in place for old package names

### What Was Done

| Phase | Changes |
|---|---|
| **1. Foundation** | `core` → `kernel` (reorganized with lifecycle, DI, event-bus, config, logging, capabilities, plugin-contracts), SDK expanded with Mind/Identity/Sensor/Driver/Platform/Session/Replay types |
| **2. Engine Kernel** | `match-engine` → `engine`, created `player/` and `minds/` packages |
| **3. Platform & I/O** | Split `controller/` into `controllers/` + `drivers/` + `platforms/`, created `sensors/` and `recording/` |
| **4. AI & Battle** | `agent-runtime` → `ai-runtime`, `runtime` → `battle-runtime`, `plugin-manager` → `plugins` |
| **5. Workspace** | Updated all imports, workspace config uses glob patterns |
| **6. Migration** | Backward compat aliases for old package names |

### Cleanup Completed

- Removed stale `dist/` directories from old packages
- Removed stale `tsconfig.tsbuildinfo` files
- Removed stale `tsconfig.json` from alias packages
- Removed stale `bridge/` directory from controller alias
- Restored bridge test files that were accidentally deleted
- All old package directories either renamed or turned into minimal backward-compat aliases

### Preserved as Requested

- `plugins/`, `games/`, `apps/`, `arenas/` folders at root level
- `arenas-manager/`, `games-manager/`, `packages-manager/` unchanged
- `cli/`, `web/`, `server/` as application packages
- All existing functionality fully operational
