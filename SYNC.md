# SYNC.md — Docs Spec ↔ Codebase Gap Analysis

> Auto-generated from full codebase audit against `docs/README.md`, `docs/architecture/`, and `docs/developers/`.
> Maps every documented specification item to its implementation status with gap analysis and action plan.

---

## Summary

| Source | Items Checked | EXISTS | MISSING | DIVERGES |
|--------|--------------|--------|---------|----------|
| docs/README.md (spec) | ~120 | ~70 | ~35 | ~15 |
| docs/architecture/*.md | ~80 | ~45 | ~25 | ~10 |
| docs/developers/SDK.md | ~30 | ~20 | ~8 | ~2 |
| docs/roadmap/roadmap.md | ~28 | ~10 | ~18 | — |
| **Total** | **~258** | **~145** | **~86** | **~27** |

The codebase is roughly 56% complete against the full documentation spec. The biggest gaps are in **server API routes**, **WebSocket multiplexing**, **CLI completion**, **plugin contribution wiring**, **DDD architecture patterns**, **middleware plugin system**, **developer experience tooling**, and **observability**.

---

## I. docs/README.md → Code Mapping

### Completed Items (Docs say done → Code confirms)

| Doc Item | Code Location | Status |
|----------|---------------|--------|
| Monorepo (Bun workspaces) | `package.json` workspaces | ✅ |
| SDK types + schemas | `packages/sdk/src/types/` + `packages/sdk/src/schemas/` | ✅ |
| Core (EventBus, Logger, Lifecycle) | `packages/core/src/` | ✅ (no DI container yet) |
| Storage (bun:sqlite) | `packages/storage/` | ✅ |
| Plugin Manager (discovery, validation, topological sort) | `packages/plugin-manager/` | ✅ |
| MatchEngine + AgentSandbox | `packages/match-engine/` | ✅ |
| Runtime (battle orchestration) | `packages/runtime/` | ✅ |
| MCP protocol (McpServer, LocalMcpClient) | `packages/mcp/` | ✅ |
| Controller (virtual input devices) | `packages/controller/` | ✅ (does not implement SDK Controller interface) |
| Observation pipeline | `packages/observation/` | ✅ (orphaned — not wired to runtime) |
| Agent Runtime (4 memory compartments) | `packages/agent-runtime/` | ✅ (LLM wiring functional) |
| Battle Tanks arena | `games/battle-tanks/` | ✅ |
| Chess arena | `games/chess/` | ✅ |
| Server (Hono REST + WebSocket) | `apps/server/` | ✅ (partial — missing routes) |
| Web UI (React shell with regions) | `apps/web/` | ✅ (basic shell, components exist) |
| CLI (`arena run/plugin/arena/battle/agent/serve`) | `packages/cli/` | ✅ (partial — missing commands) |
| Chat plugin | `plugins/plugin-chat/` | ✅ (MCP tool + event handler) |
| Polls plugin | `plugins/plugin-polls/` | ✅ (MCP tools only) |
| Export plugin | `plugins/plugin-export/` | ✅ (MCP tool only) |
| Rewards plugin | `plugins/plugin-rewards/` | ✅ (MCP tools + event wiring) |
| Agent Isolation (AgentSandbox) | `packages/match-engine/src/agent-sandbox.ts` | ✅ |
| WebSocket live streaming | `apps/server/src/ws/battle-ws.ts` | ✅ (basic, no multiplexing) |
| Dynamic component registry | `apps/web/src/runtime/registry/` | ✅ |
| Battle viewer components (GridRenderer, EventLog, AgentRoster, TurnTimeline) | `apps/web/src/components/battle/` | ✅ |
| Plugin manifest schema (arena-plugin.json) | All plugins/games | ✅ |
| Manifest-driven discovery | `packages/plugin-manager/src/` | ✅ |
| Topological dependency resolution | `packages/plugin-manager/src/` | ✅ |
| Zod schema validation | `packages/sdk/src/schemas/` | ✅ |
| EventBus with correlation IDs | `packages/core/src/event-bus/` + SDK `DomainEvent.metadata` | ✅ |
| SQLite persistence | `packages/storage/` | ✅ |
| Zustand state management | `apps/web/src/runtime/shell/store.ts` | ✅ |
| Command palette | `apps/web/src/App.tsx` (CommandPalette) | ✅ |
| Dock-based layout | `apps/web/src/runtime/layout/` | ✅ |

### Missing Items (Docs say planned → Code missing)

| Priority | Doc Item | Code Status | Gap |
|----------|----------|-------------|-----|
| P1 | `createContainer()` composition root in `packages/core/src/composition.ts` | Missing | Server does inline composition; no DI container wiring |
| P1 | `tokens.ts` in `packages/core/src/` | Missing | Tokens defined inline in `index.ts` |
| P1 | HTTP API routes (arenas CRUD, profiles CRUD, strategies, battle abort/replay/events) | Missing | Server has only `/api/plugins`, `/api/battles`, `/api/agents` |
| P1 | WebSocket multiplexing per battleId | Missing | BattleWebSocketServer broadcasts all events to all clients; no per-subscription filtering |
| P1 | DDD Battle aggregate (event-sourced) | Missing | `MatchEngine` is procedural; no Battle aggregate, no value objects |
| P1 | Controller implements SDK Controller interface | Missing | `Controller` class has `registerTool/onAction/getMcpServer`, not `initialize/connect/execute/shutdown` |
| P1 | PluginContext methods wired to actual implementations | Stub | `registerServerRoute`, `registerCliCommand`, `registerDashboardWidget`, `registerNavigationItem` are no-ops; `config` stubs return undefined |
| P1 | ObservationSystem wired into MatchEngine | Missing | `packages/observation/` exists but is orphaned — never imported |
| P2 | Dynamic frontend plugin loading (plugin-loader called from App.tsx at runtime) | Stub | `plugin-loader.ts` exists; `loadPluginContributions()` is called but only registers UI panels from manifests — does not dynamically load rendered components |
| P2 | Middleware plugin system (auth, rate-limit, logging as plugins) | Missing | No `ServerMiddleware` interface; all middleware is hardcoded in server |
| P2 | CLI completion (`plugin create`, `export`, `replay`, `profile`, `show`, `run --names`) | Missing | CLI has `run`, `plugin`, `arena`, `battle`, `agent`, `serve` commands but missing subcommands |
| P2 | `packages/cli` scaffolding (`aga create`, `aga config`) | Missing | No scaffolding or config commands |
| P2 | Structured logging with correlation IDs | Missing | Logger has component context but no correlation ID propagation |
| P2 | Health check depth (beyond basic `/health`) | Missing | Server has `/health` but no depth checks (DB, storage, plugin system) |
| P3 | Dependency graph fix (match-engine → agent-runtime/controller should use DI) | Not fixed | `match-engine` imports `agent-runtime` and `controller` directly |
| P3 | Dependency graph fix (web → match-engine should only import sdk) | Not fixed | Web app imports match-engine types directly |
| P3 | `PluginContext.storage` type alignment (should be `StorageAdapter`) | Diverges | Uses narrower `PluginStorage` instead of `StorageAdapter` |
| P3 | Fog-of-war observation filter | Partial | `ObservationFilter` exists with `perfect`/`private`/`filtered` modes but no line-of-sight for battle-tanks |
| P3 | Battle royale arena | Empty | `games/battle-royale/` exists with no source files |
| P3 | Plugin scaffolding utility | Missing | No CLI scaffolding command |
| P3 | Docker support | Missing | No `Dockerfile` or docker-compose |
| P3 | Auth & authorization | Missing | No auth middleware on server |
| P3 | Plugin permission enforcement at runtime | Missing | Permissions declared in manifests but never checked |
| P3 | PostgreSQL storage adapter | Missing | Only SQLite exists |
| P3 | API key storage per profile | Missing | `AgentConfig.apiKey` exists but never resolved or encrypted |
| P3 | API versioning (`/api/v1/` prefix) | Missing | Routes are at `/api/plugins`, `/api/battles`, etc. with no version prefix |
| P3 | Plugin development guide (`docs/plugin-dev-guide.md`) | Missing | `docs/developers/` has SDK.md and API.md but no plugin-dev guide |
| P3 | Test strategy | Missing | No test structure or standards |
| P3 | Error handling standards | Missing | No consistent error response shape for API routes |
| P3 | Observability (structured logging, metrics, OpenTelemetry) | Missing | No metrics, tracing, or structured logging beyond console output |
| P3 | `docs/plugin-dev-guide.md` | Missing | No standalone plugin development guide |
| P3 | Determinism verification tooling | Missing | No seed verification or replay determinism checks |
| P3 | Performance benchmarks | Missing | No benchmark suite |

### Architecture Divergences

| Spec (docs/) | Actual | Fix |
|-------------|--------|-----|
| `packages/core/src/composition.ts` with `createContainer()` | No such file; composition is inline in `apps/server/src/index.ts` | Create `composition.ts` and `createContainer()` |
| `packages/core/src/tokens.ts` | Tokens defined inline in `core/src/index.ts` | Extract to `tokens.ts` |
| `ServerMiddleware` interface for plugin-registered middleware | No middleware plugin system exists | Define `ServerMiddleware` in SDK, implement as plugins |
| `PluginContext.registerServerRoute` actually wires routes | Stub — does nothing | Implement route wiring in `PluginManager.createContext()` |
| `PluginContext.registerCliCommand` actually wires commands | Stub — does nothing | Implement command wiring in `PluginManager.createContext()` |
| `PluginContext.registerDashboardWidget` actually registers widgets | Stub — does nothing | Implement widget registration |
| `PluginContext.registerNavigationItem` actually registers nav items | Stub — does nothing | Implement nav registration |
| `PluginContext.config` returns real config values | All stubs return `undefined`/throw | Wire `ConfigReader` to actual config |
| `Controller` implements SDK `Controller` interface (`initialize/connect/execute/shutdown`) | `Controller` class has `registerTool/onAction/getMcpServer` | Either implement SDK interface or rename spec type |
| `match-engine` only imports SDK types | `match-engine` imports `agent-runtime` and `controller` directly | Use DI to decouple match-engine from agent-runtime/controller |
| `web` only imports SDK types | `web` imports `match-engine` directly | Restrict to SDK imports only |
| `observation` package is wired into match pipeline | `observation` is orphaned — never used | Wire `ObservationSystem` into MatchEngine observation step |
| `PluginContext.storage` is `StorageAdapter` | Uses narrower `PluginStorage` | Align type or add `StorageAdapter` as compatible |
| DDD patterns (Battle aggregate, value objects, EventSourcedAggregate) | No DDD patterns; procedural MatchEngine | Introduce Battle aggregate, value objects, event sourcing |
| `EventBus.subscribeAll(Array<{eventType, handler}>)` | Implemented correctly | N/A |
| `StorageAdapter` interface matches SDK | SQL implementation matches interface | N/A |
| `DomainEvent` includes all 19 event types | All 19 exist in SDK types | N/A |

---

## II. Architecture Doc → Code Mapping (Key Areas)

### Runtime Architecture (`docs/architecture/runtime.md`)

| Spec Item | Code Status | Gap |
|-----------|-------------|-----|
| Composition root with `createContainer()` | Missing | Inline composition in server |
| `tokens.ts` with Symbol-based token definitions | Missing | Inline in `core/src/index.ts` |
| Lifecycle phases (created → starting → running → stopping → stopped) | Exists in `packages/core/src/lifecycle/` | N/A |
| Health check with depth | Basic `/health` only | No depth checks |
| Structured logging with correlation IDs | ConsoleLogger with component context only | No correlation ID |
| Hot reload in development | Not implemented | No watch/reload mechanism |
| DI container with scoped lifetimes | `Container` class exists | Missing singleton vs transient scope support |

### Manager Architecture (`docs/architecture/managers.md`)

| Spec Item | Code Status | Gap |
|-----------|-------------|-----|
| ArenaManager | No separate manager; handled by `Runtime` | Missing |
| GameManager | No separate manager; handled by plugin manifests | Missing |
| PluginManager | `packages/plugin-manager/` exists | N/A |
| ControllerManager | No separate manager; handled by `Controller` class directly | Missing |
| ProviderManager | No separate manager; handled by `AgentRuntime` internally | Missing |
| ProfileManager | No separate manager; stored in SQLite directly | Missing |
| ObservationManager | `packages/observation/` exists but orphaned | Not wired |
| BattleManager | `packages/runtime/` handles battle lifecycle | Partial — no dedicated manager class |
| CapabilityManager | No separate capability manager | Missing |
| ReplayManager | No replay management | Missing |
| StorageManager | `packages/storage/` exists as `SqliteStorage` | No dedicated manager |

### Discovery System (`docs/architecture/discovery.md`)

| Spec Item | Code Status | Gap |
|-----------|-------------|-----|
| Manifest-driven discovery via file system scan | `discover()` scans plugin dirs | N/A |
| Validation of arena-plugin.json | `validate()` exists in plugin-manager | N/A |
| Dependency resolution (topological sort) | `topologicalSort()` exists | N/A |
| Cycle detection | Yes, via `visited`/`visiting` sets | N/A |
| Hot reload in development | Missing | No watch/reload mechanism |
| Remote package discovery | Missing | No remote registry support |

### Registries (`docs/architecture/registries.md`)

| Spec Item | Code Status | Gap |
|-----------|-------------|-----|
| ArenaRegistry | Managed inline by `Runtime` | No dedicated registry class |
| GameRegistry | Managed inline by plugin system | No dedicated registry class |
| PluginRegistry | Managed inline by `PluginManager` | No dedicated registry class |
| ControllerRegistry | No registry | Missing |
| ProviderRegistry | No registry | Missing |
| ProfileRegistry | No registry | Missing |
| ObservationRegistry | No registry | Missing |
| BattleRegistry | Managed inline by `Runtime` | No dedicated registry class |
| CapabilityRegistry | No registry | Missing |
| ReplayRegistry | No registry | Missing |
| StorageRegistry | No registry | Missing |
| Lazy loading support | Plugin manager loads on demand | Partial |
| Hot reload support | Not implemented | Missing |

### Contracts (`docs/architecture/contracts.md`)

| Spec Item | Code Status | Gap |
|-----------|-------------|-----|
| `ArenaPlugin` interface | Exists in SDK `types/arena.ts` | N/A |
| `GameAdapter` interface | Exists in SDK `types/game.ts` | N/A |
| `Plugin` interface with `activate`/`deactivate` | Exists in SDK `types/plugin.ts` | N/A |
| `Controller` interface | Exists in SDK `types/agent.ts` | `Controller` class does NOT implement it |
| `Provider` interface | Exists in SDK agent types | Partial — provider implementations exist but no formal `Provider` interface |
| `ObservationAdapter` interface | Exists in SDK `types/observation.ts` | N/A |
| Zod schema validation for all contracts | Schemas exist in `packages/sdk/src/schemas/` | N/A |
| Version compatibility checks | Not implemented | Missing |

### Storage Architecture (`docs/architecture/storage.md`)

| Spec Item | Code Status | Gap |
|-----------|-------------|-----|
| `StorageAdapter` interface | Exists in SDK `types/storage.ts` | N/A |
| Event store | `events` table exists in SQLite | No separate event store abstraction |
| Match store | `battles` table exists | No separate match store abstraction |
| Agent store | `agents` table exists | No separate agent store abstraction |
| Plugin namespaced storage | `PluginStorage` class exists | Narrower than spec's `StorageAdapter` |
| Migrations | Not implemented | Missing |
| PostgreSQL adapter | Missing | Only SQLite |
| Object storage adapter | Missing | Not implemented |
| Vector database adapter | Missing | Not implemented |

### Plugins Architecture (`docs/plugins/architecture.md`)

| Spec Item | Code Status | Gap |
|-----------|-------------|-----|
| Manifest schema (`arena-plugin.json`) | Implemented in all plugins/games | N/A |
| Categories (arena, game, plugin, metric, exporter) | Implemented | N/A |
| Activation lifecycle | Implemented in plugin-manager | No cycle detection for dependency loops |
| Stubs registration | `createContext()` creates stubs for server routes, CLI commands, etc. | Stubs do nothing |
| Contribution wiring at activation | Not implemented | `activate()` registers MCP tools and event handlers but does not wire contributions |
| Plugin isolation | No sandboxing; plugins run in same process | Missing |
| Plugin permissions enforcement | Not implemented | Missing |

### Plugins Capabilities (`docs/plugins/capabilities.md`)

| Spec Item | Code Status | Gap |
|-----------|-------------|-----|
| MCP tools registration | Implemented — all plugins register MCP tools via `ctx.registerMcpTool()` | N/A |
| Event handlers registration | Implemented — plugins subscribe to events | N/A |
| UI panels registration | Implemented in manifests; `registerUiPanel` stub does nothing | Not wired |
| Server routes registration | Stub — does nothing | Not implemented |
| CLI commands registration | Stub — does nothing | Not implemented |
| Dashboard widgets | Stub — does nothing | Not implemented |
| Navigation items | Stub — does nothing | Not implemented |

### Frontend Shell (`docs/frontend/shell.md`)

| Spec Item | Code Status | Gap |
|-----------|-------------|-----|
| VS Code-style dock layout | Implemented (Header, DockPanel, StatusBar) | N/A |
| Dynamic component registry | Implemented in `apps/web/src/runtime/registry/` | N/A |
| Command palette | Implemented in `App.tsx` | N/A |
| Dynamic route registration from registry | Not implemented | `runtime/router/` directories exist but are empty |
| Dynamic nav from registry | Not implemented | `runtime/navigation/` directory exists but is empty |
| Resize/reorder/drag docking | Not implemented | `runtime/docking/` directory exists but is empty |
| App initialization/bootstrap | `runtime/application/` directory exists but is empty | Missing |

### AI Providers (`docs/providers/AI-providers.md`)

| Spec Item | Code Status | Gap |
|-----------|-------------|-----|
| Provider abstraction | Exists in `agent-runtime/providers/` | N/A |
| OpenAI provider | Exists | N/A |
| Ollama provider | Exists | N/A |
| Mock provider | Exists | N/A |
| Provider factory | Exists | N/A |
| Streaming completion support | Implemented in provider classes | N/A |
| Function calling / tool use | Implemented in `AgentRuntime.decide()` | N/A |
| Cost estimation & budget tracking | Missing | Not implemented |
| Latency-aware routing | Missing | Not implemented |
| Per-agent budget enforcement | Missing | Not implemented |
| API key management & rotation | Missing | `AgentConfig.apiKey` exists but never resolved or encrypted |
| Capability-based routing | Missing | Not implemented |

### Roadmap (`docs/roadmap/roadmap.md`)

| Phase | Items | Code Status |
|-------|-------|-------------|
| Phase 0 (Complete) | TypeScript monorepo, hexagonal arch, event bus, SQLite, Zod | ✅ |
| Phase 0 (Complete) | Manifest-driven discovery, topological sort, contribution registration | ✅ |
| Phase 0 (Complete) | Battle aggregate, turn loop, agent runtime, observation, replay | ✅ (procedural, not DDD) |
| Phase 0 (Complete) | Virtual devices, MCP server, desktop adapter, observations | ✅ |
| Phase 0 (Complete) | React shell, dock layout, component registry, command palette, WS | ✅ |
| Phase 0 (Complete) | Battle Tanks, Chess, Chat, Polls, Rewards plugins | ✅ |
| Phase 1 (Pending) | Graceful degradation, circuit breakers, retries | ❌ |
| Phase 1 (Pending) | Comprehensive health checks with depth | ❌ |
| Phase 1 (Pending) | Structured logging with correlation IDs | ❌ |
| Phase 1 (Pending) | Metrics (Prometheus) | ❌ |
| Phase 1 (Pending) | Distributed tracing (OpenTelemetry) | ❌ |
| Phase 1 (Pending) | Crash recovery & state reconstruction | ❌ |
| Phase 1 (Pending) | Plugin sandboxing (WASM/Worker isolation) | ❌ |
| Phase 1 (Pending) | Capability-based permissions enforcement | ❌ |
| Phase 1 (Pending) | API key management & rotation | ❌ |
| Phase 1 (Pending) | Rate limiting & DDoS protection | ❌ |
| Phase 1 (Pending) | Audit logging | ❌ |
| Phase 1 (Pending) | Integration test suite | ❌ |
| Phase 1 (Pending) | Chaos testing | ❌ |
| Phase 1 (Pending) | Determinism verification | ❌ |
| Phase 1 (Pending) | Performance benchmarks | ❌ |
| Phase 1 (Pending) | Contract tests | ❌ |
| Phase 1 (Pending) | `aga` CLI with scaffolding | ❌ |
| Phase 2 (Pending) | Provider manifest schema | ❌ |
| Phase 2 (Pending) | Authentication abstraction | ❌ |
| Phase 2 (Pending) | Cost estimation & budget tracking | ❌ |
| Phase 2 (Pending) | All built-in providers (Anthropic, Google, etc.) | ❌ (only OpenAI, Ollama, Mock) |
| Phase 2 (Pending) | Model router with capability-based routing | ❌ |
| Phase 2 (Pending) | Agent profiles with strategy prompt library | ❌ |
| Phase 3 (Pending) | Tabbed workspaces per battle | ❌ |
| Phase 3 (Pending) | Persistent layout save/restore | ❌ |
| Phase 3 (Pending) | Theme system (dark/light/custom) | ❌ |
| Phase 3 (Pending) | Accessibility (WCAG 2.1 AA) | ❌ |
| Phase 3 (Pending) | Custom panel types (WebGL, WebGPU) | ❌ |
| Phase 3 (Pending) | Dashboard widget framework | ❌ |
| Phase 3 (Pending) | Live battle streaming | ❌ |
| Phase 3 (Pending) | Replay scrubber with timeline | ❌ |
| Phase 3 (Pending) | Multi-agent POV switching | ❌ |
| Phase 4 (Pending) | Simultaneous turns (real-time) | ❌ |
| Phase 4 (Pending) | Team battles (2v2, 3v3) | ❌ |
| Phase 4 (Pending) | Tournament bracket system | ❌ |
| Phase 4 (Pending) | Agent-to-agent messaging | ❌ |
| Phase 4 (Pending) | Real-time agent reasoning view | ❌ |
| Phase 4 (Pending) | Decision tree visualization | ❌ |
| Phase 4 (Pending) | Token usage & cost per turn | ❌ |
| Phase 5 (Pending) | Public plugin registry | ❌ |
| Phase 5 (Pending) | Semantic versioning enforcement | ❌ |
| Phase 5 (Pending) | Security scanning | ❌ |
| Phase 5 (Pending) | Ratings & reviews | ❌ |
| Phase 6 (Pending) | Horizontal scaling (battle workers) | ❌ |
| Phase 6 (Pending) | SSO (OIDC/SAML) | ❌ |
| Phase 6 (Pending) | RBAC | ❌ |
| Phase 6 (Pending) | Compliance (SOC 2, GDPR) | ❌ |
| Phase 6 (Pending) | Experiment tracking (MLflow) | ❌ |
| Phase 6 (Pending) | ELO/TrueSkill rating system | ❌ |

---

## III. Efficient Action Plan

### Phase A — Architecture Foundation (P1 — blocks all other work)

**Action 1: Create `tokens.ts`**
- File: `packages/core/src/tokens.ts`
- Move all `Symbol.for` tokens from `core/src/index.ts` to a dedicated `tokens.ts`
- Re-export from `index.ts`
- Est. effort: 30 min

**Action 2: Create `composition.ts` with `createContainer()`**
- File: `packages/core/src/composition.ts`
- Implement `createContainer()` that wires EventBus, Logger, Config, LifecycleManager, Storage, PluginManager, Runtime, MatchEngine, AgentRuntime, Controller, MCP
- Have server import from composition root instead of inline wiring
- Est. effort: 1 session

**Action 3: Complete HTTP API routes**
- Files: `apps/server/src/routes/`
- Add: arenas CRUD, profiles CRUD, strategies, battle abort, replay, events endpoints
- Follow existing pattern in `battles.ts`, `agents.ts`
- Est. effort: 2-3 sessions

**Action 4: WebSocket multiplexing per battleId**
- File: `apps/server/src/ws/battle-ws.ts`
- Add `subscribed` set per connection; filter events by `battleId`
- Currently broadcasts all events to all clients
- Est. effort: 1 session

**Action 5: DDD — Battle aggregate and value objects**
- Files: `packages/runtime/src/` (new directory)
- Create `Battle` aggregate (event-sourced), `BattleId` value object, `Turn` value object, `Action` value object
- Refactor `MatchEngine` to use Battle aggregate
- Est. effort: 2-3 sessions

**Action 6: Fix dependency graph violations**
- `match-engine`: inject `AgentRuntime` and `Controller` via DI instead of importing directly
- `web`: ensure it only imports from `@ai-game-arena/sdk`, never from `match-engine`
- Est. effort: 1 session

### Phase B — Plugin & Contribution Wiring (P2)

**Action 7: Wire plugin contributions at runtime**
- File: `packages/plugin-manager/src/plugin-manager.ts` — `createContext()` method
- Implement actual wiring for `registerServerRoute`, `registerCliCommand`, `registerDashboardWidget`, `registerNavigationItem`
- Est. effort: 2 sessions

**Action 8: Implement middleware plugin system**
- Define `ServerMiddleware` interface in SDK
- Implement auth, rate-limit, logging as middleware plugins
- Wire into server startup via composition root
- Est. effort: 2 sessions

**Action 9: Wire ObservationSystem into MatchEngine**
- File: `packages/match-engine/src/match-engine.ts`
- Import `ObservationSystem` from `packages/observation/` and integrate into the observation step of the match loop
- Est. effort: 1 session

**Action 10: Fix `PluginContext.storage` type**
- Align `PluginStorage` with `StorageAdapter` interface or rename to `StorageAdapter`
- Est. effort: 30 min

**Action 11: Fix Controller to implement SDK Controller interface**
- Either implement `initialize/connect/execute/shutdown` on the `Controller` class, or rename the SDK interface to match the actual `Controller` API
- Est. effort: 1 session

**Action 12: Complete CLI commands**
- Add `plugin create`, `export`, `replay`, `profile`, `show`, `run --names`, `config`, `create` scaffolding commands
- File: `packages/cli/src/commands/`
- Est. effort: 2 sessions

### Phase C — Developer Experience & Quality (P3)

**Action 13: Structured logging with correlation IDs**
- Add `correlationId` to all log messages
- Propagate correlation IDs through event bus and HTTP request chains
- Est. effort: 1 session

**Action 14: Health check with depth**
- Add database connectivity check, storage check, plugin system check to `/health`
- Est. effort: 1 session

**Action 15: Create `docs/plugin-dev-guide.md`**
- Document extension points, manifest schema, contribution types, lifecycle
- Est. effort: 1 session

**Action 16: Create `Dockerfile` + `.dockerignore`**
- Multi-stage build for production
- Est. effort: 30 min

**Action 17: Error handling standards**
- Define consistent `{ error: string, code?: string }` response shape for all API routes
- Add error boundary components in web UI
- Est. effort: 1 session

**Action 18: API versioning**
- Add `/api/v1/` prefix to all routes
- Est. effort: 30 min

**Action 19: Test strategy**
- Define test structure (unit, integration, contract, e2e)
- Add hexagonal test pattern (service tests at package boundary)
- Est. effort: 1 session

**Action 20: AgentConfig.apiKey security**
- Implement API key resolution and encryption at rest
- Est. effort: 1 session

### Phase D — Advanced Features (P3)

**Action 21: Determinism verification tooling**
- Replay verification with seed comparison
- Est. effort: 2 sessions

**Action 22: Performance benchmarks**
- Benchmark suite for concurrent battles, plugin loading, event throughput
- Est. effort: 1 session

**Action 23: FOG-of-war observation filter**
- Add line-of-sight filtering for battle-tanks arena
- Est. effort: 1 session

**Action 24: Battle royale arena**
- Create `games/battle-royale/` with full plugin implementation
- Est. effort: 2-3 sessions

**Action 25: Plugin sandboxing**
- WASM/Worker isolation for third-party plugins
- Est. effort: 3+ sessions

### Phase E — Observability & Ecosystem (P3)

**Action 26: Metrics (Prometheus format)**
- Add metrics endpoint and collection
- Est. effort: 1 session

**Action 27: Distributed tracing (OpenTelemetry)**
- Integrate OpenTelemetry SDK
- Est. effort: 1 session

**Action 28: Crash recovery & state reconstruction**
- Event store replay for state reconstruction
- Est. effort: 2 sessions

---

## IV. Quick Reference — File Map

### What exists (codebase)

```
apps/
├── server/src/
│   ├── index.ts                    # Hono server + WebSocket + static serving
│   ├── ws/battle-ws.ts             # Battle event streaming (no multiplexing)
│   └── routes/                     # API routes (api, battles, agents, plugins)
├── web/src/
│   ├── App.tsx                     # Shell + routing + command palette + plugin loader
│   ├── index.tsx                   # Entry point
│   ├── styles/global.css           # Tailwind import
│   ├── components/
│   │   ├── battle/                   # GridRenderer, EventLog, AgentRoster, TurnTimeline
│   │   └── shell/                    # Header, StatusBar, BattleEventLog, DockPanel
│   ├── hooks/
│   │   ├── useApi.ts               # REST API fetch hook
│   │   └── useBattleWebSocket.ts   # WebSocket hook
│   ├── pages/                      # Dashboard, Battles, Plugins, Settings
│   ├── runtime/
│   │   ├── registry/                 # ComponentRegistry (fully implemented)
│   │   ├── shell/                    # Shell.tsx, store.ts, dock-manager
│   │   ├── events/                   # Client-side event bus
│   │   ├── commands/                 # Command palette
│   │   ├── layout/                   # Dock layout
│   │   ├── application/              # (empty)
│   │   ├── router/                   # (empty)
│   │   ├── navigation/               # (empty)
│   │   └── docking/                  # (empty)
│   └── services/
│       └── plugin-loader/            # plugin-loader.ts (stub — not meaningfully wired)
packages/
├── sdk/src/types/                  # 13 type files (identifiers, battle, arena, agent, etc.)
├── sdk/src/schemas/                # 4 Zod schema files
├── core/src/
│   ├── index.ts                    # Exports Container, EventBus, Logger, Lifecycle, Tokens (inline)
│   ├── di/container.ts             # DI Container (register/resolve/has/clear)
│   ├── event-bus/event-bus.ts      # InProcessEventBus
│   ├── logging/logger.ts           # ConsoleLogger with child context
│   ├── lifecycle/lifecycle.ts      # LifecycleManager
│   └── config/config.ts            # Config class (exported)
├── runtime/src/                    # Runtime (battle orchestration, session management)
├── match-engine/src/               # MatchEngine, AgentSandbox, ObservationFilter
├── agent-runtime/src/              # AgentRuntime + LLM providers (OpenAI, Ollama, Mock)
├── controller/src/                 # Controller class (virtual input devices, MCP)
├── mcp/src/                        # McpServer + LocalMcpClient
├── observation/src/                # ObservationSystem (orphaned — not wired)
├── plugin-manager/src/             # Discovery, validation, topological sort, lifecycle
├── storage/src/                    # SqliteStorage via bun:sqlite
├── cli/src/                        # arena CLI entry point
└── cli/src/commands/               # run, plugin, arena, battle, agent, serve
games/
├── battle-tanks/                   # Full ArenaPlugin (8x8 grid)
├── chess/                          # Full ArenaPlugin (8x8 board)
└── battle-royale/                  # EMPTY (no source files)
plugins/
├── plugin-chat/                    # MCP tool + event handler (partial wiring)
├── plugin-polls/                   # MCP tools only (no event handler wiring)
├── plugin-export/                  # MCP tool only (no wiring)
└── plugin-rewards/                 # MCP tools + event handler wiring (most complete)
data/
└── arena.db                        # SQLite database
docs/
├── README.md                       # Technical specification (source of truth)
├── architecture.md                 # Full architecture (1787 lines)
├── architecture/                   # Modular architecture docs (6 files, ~5700 lines)
├── arenas/                         # Arena docs (3 files)
├── battles/                        # Battle docs (3 files)
├── controllers/                    # Controller docs (2 files)
├── developers/                     # Developer docs (3 files)
├── frontend/                       # Frontend docs (4 files)
├── games/                          # Game adapter docs (3 files)
├── plugins/                        # Plugin docs (3 files)
├── providers/                      # AI provider docs (2 files)
└── roadmap/                        # Roadmap (1 file)
```

### What's missing / needs creation

```
packages/core/src/tokens.ts           # Move from index.ts
packages/core/src/composition.ts      # createContainer() composition root
packages/runtime/src/domain/           # Battle aggregate, value objects
packages/runtime/src/replay/          # Replay manager
packages/observation/src/             # Wire into match-engine
apps/server/src/middleware/           # Auth, rate-limit, logging middleware plugins
apps/server/src/routes/               # arenas.ts, profiles.ts, strategies.ts, replay.ts
apps/server/src/routes/               # events.ts, abort.ts, export.ts
apps/web/src/runtime/application/     # App initialization, bootstrap
apps/web/src/runtime/router/            # Dynamic route registration from registry
apps/web/src/runtime/navigation/      # Dynamic nav from registry
apps/web/src/runtime/docking/         # Resize/reorder/drag docking
apps/web/src/services/arena-loader/   # Load arena manifests → UI contributions
apps/web/src/services/game-loader/    # Load game adapters → UI contributions
plugins/plugin-tournament/              # Tournament system plugin
plugins/plugin-leaderboard/             # Rankings/leaderboards plugin
docs/plugin-dev-guide.md                # How to create and publish a plugin
Dockerfile                                # Production container
.github/workflows/                        # CI pipeline
packages/observation/src/               # Wire into match-engine
```

---

## V. Rules of Engagement

1. **Follow docs/** — `docs/README.md` and `docs/architecture/` are the source of truth for what exists vs what's planned
2. **Use existing code** — Do not rewrite what works; extend it
3. **Minimal changes** — Each session should change ≤ 10 files, ≤ 500 lines added/deleted
4. **Typecheck after every session** — All packages must pass `bun run typecheck`
5. **Build after every session** — All packages must pass `bun run build`
6. **Agent isolation is non-negotiable** — Agents must never see each other's thoughts/observations/actions
7. **EventBus is the single source of truth** — All state changes become events; no direct state sharing
8. **Plugins declare, core orchestrates** — Never hardcode plugin behavior in core
9. **Module boundaries are enforced** — Packages only import from their own SDK types or other packages' public APIs; never internals
10. **Tests follow hexagonal pattern** — Unit tests for services in each package, integration tests at package boundaries
11. **Consistent error responses** — All API routes return `{ error: string, code?: string }` shape; web UI has error boundary components
12. **Structured logging mandatory** — All log messages include `{ component, correlationId? }` for traceability across services
13. **Open source first** — All contributions welcome per `CONTRIBUTING.md`; MIT licensed; PRs require clear description and tests
14. **Check documentation when in doubt** — Always cross-reference `docs/` before making implementation decisions

---

## VI. Merge Strategy

The merge from docs spec → code follows this priority order:

1. **Phase A** (P1): Composition root + tokens + HTTP API routes + WebSocket multiplexing + DDD Battle aggregate + dependency graph fix — these unblock the platform architecture
2. **Phase B** (P2): Plugin contribution wiring + middleware plugin system + ObservationSystem integration + Controller interface fix + CLI completion — these complete the plugin ecosystem
3. **Phase C** (P3): Developer experience + observability + error handling + security + API versioning — these improve reliability and DX
4. **Phase D** (P3): Advanced features (determinism, benchmarks, fog-of-war, battle royale, sandboxing)
5. **Phase E** (P3): Observability + ecosystem tooling (metrics, tracing, crash recovery)

Each phase should be implemented in 1-3 sessions. Checkpoint after each: `bun run typecheck` + `bun run build` across all packages.

---

## VII. Compliance Checklist

### docs/README.md Compliance

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Monorepo with Bun workspaces | ✅ |
| 2 | SDK with types, schemas, contracts | ✅ |
| 3 | Core (DI, event bus, lifecycle, logging) | ✅ (DI exists, no composition root) |
| 4 | Storage abstraction (bun:sqlite) | ✅ |
| 5 | Plugin Manager (discovery, lifecycle) | ✅ |
| 6 | Match Engine + AgentSandbox | ✅ |
| 7 | Runtime (battle orchestration) | ✅ (procedural, not DDD) |
| 8 | MCP protocol | ✅ |
| 9 | Controller (virtual input devices) | ✅ (does not implement SDK interface) |
| 10 | Observation pipeline | ✅ (orphaned — not wired) |
| 11 | Agent Runtime (4 memory compartments) | ✅ |
| 12 | Battle Tanks arena | ✅ |
| 13 | Chess arena | ✅ |
| 14 | Server (Hono REST + WebSocket) | ✅ (partial routes) |
| 15 | Web UI (React shell with regions) | ✅ |
| 16 | CLI (arena run/plugin/arena/battle/agent/serve) | ✅ (partial) |
| 17 | Chat plugin | ✅ |
| 18 | Polls plugin | ✅ |
| 19 | Export plugin | ✅ |
| 20 | Rewards plugin | ✅ |
| 21 | Agent isolation | ✅ (AgentSandbox provides isolation) |
| 22 | WebSocket live streaming | ✅ (basic, no multiplexing) |
| 23 | Dynamic frontend plugin loading | ⚠️ Stub exists but contributions not fully wired |
| 24 | Static file serving | ✅ |
| 25 | Manifest-driven discovery | ✅ |
| 26 | Topological dependency resolution | ✅ |
| 27 | Contribution registration (MCP tools, event handlers) | ✅ |
| 28 | Contribution registration (UI panels, server routes, CLI) | ⚠️ Stubs exist but do nothing |
| 29 | Zod schema validation | ✅ |
| 30 | Event-driven architecture | ✅ |
| 31 | `createContainer()` composition root | ❌ Missing |
| 32 | `tokens.ts` | ❌ Missing |
| 33 | `ServerMiddleware` interface | ❌ Missing |
| 34 | Full HTTP API routes | ❌ Missing (arenas CRUD, profiles, strategies, abort/replay/events) |
| 35 | WebSocket multiplexing | ❌ Missing |
| 36 | DDD Battle aggregate | ❌ Missing |
| 37 | Controller implements SDK Controller interface | ❌ Missing |
| 38 | Plugin contribution wiring (server routes, CLI, widgets, nav) | ❌ Missing |
| 39 | ObservationSystem wired into runtime | ❌ Missing |
| 40 | Structured logging with correlation IDs | ❌ Missing |
| 41 | Health check depth | ❌ Missing |
| 42 | Complete CLI | ❌ Missing (no plugin create, export, replay, profile, run --names) |
| 43 | Docker support | ❌ Missing |
| 44 | Auth & authorization | ❌ Missing |
| 45 | Test strategy | ❌ Missing |
| 46 | Error handling standards | ❌ Missing |
| 47 | API versioning | ❌ Missing |
| 48 | Plugin dev guide | ❌ Missing |

---

## VIII. Progress Tracker

| Phase | Task | Status |
|-------|------|--------|
| A.1   | Create tokens.ts | ✅ Done |
| A.2   | Create composition.ts with createContainer() | ✅ Done |
| A.3   | Complete HTTP API routes | ✅ Done |
| A.4   | WebSocket multiplexing per battleId | ⬜ Pending |
| A.5   | DDD — Battle aggregate and value objects | ⬜ Pending |
| A.6   | Fix dependency graph violations | ⬜ Pending |
| B.1   | Wire plugin contributions at runtime | ⬜ Pending |
| B.2   | Implement middleware plugin system | ⬜ Pending |
| B.3   | Wire ObservationSystem into MatchEngine | ⬜ Pending |
| B.4   | Fix PluginContext.storage type | ⬜ Pending |
| B.5   | Fix Controller to implement SDK Controller interface | ⬜ Pending |
| B.6   | Complete CLI commands | ⬜ Pending |
| C.1   | Structured logging with correlation IDs | ⬜ Pending |
| C.2   | Health check with depth | ⬜ Pending |
| C.3   | Create docs/plugin-dev-guide.md | ⬜ Pending |
| C.4   | Dockerfile | ⬜ Pending |
| C.5   | Error handling standards | ⬜ Pending |
| C.6   | API versioning | ⬜ Pending |
| C.7   | Test strategy | ⬜ Pending |
| C.8   | AgentConfig.apiKey security | ⬜ Pending |
| D.1   | Determinism verification tooling | ⬜ Pending |
| D.2   | Performance benchmarks | ⬜ Pending |
| D.3   | Fog-of-war observation filter | ⬜ Pending |
| D.4   | Battle royale arena | ⬜ Pending |
| D.5   | Plugin sandboxing | ⬜ Pending |
| E.1   | Metrics (Prometheus) | ⬜ Pending |
| E.2   | Distributed tracing (OpenTelemetry) | ⬜ Pending |
| E.3   | Crash recovery & state reconstruction | ⬜ Pending |
| VII.1 | UI Primitives + Dark Theme | ⬜ Pending |
| VII.2 | Battle Components (from ui-example) | ⬜ Pending |
| VII.3 | Game Cards + Dashboard | ⬜ Pending |
| VII.4 | Animation System | ⬜ Pending |
| VII.5 | Layout Patterns | ⬜ Pending |