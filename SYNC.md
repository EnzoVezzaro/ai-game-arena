# SYNC.md — README Spec ↔ Codebase Gap Analysis

> Auto-generated from full codebase audit against README.md and docs/architecture.md.
> This document maps every spec requirement to its implementation status and provides an efficient action plan.

---

## Summary

| Source | Items Checked | EXISTS | MISSING | DIVERGES |
|--------|--------------|--------|---------|----------|
| README.md (spec) | ~100 | ~75 | ~25 | ~10 |
| docs/architecture.md | ~150 | ~90 | ~40 | ~20 |
| **Total** | **~250** | **~165** | **~65** | **~30** |

The codebase is roughly 66% complete against the README spec. The biggest gaps are in **agent intelligence** (LLM wiring), **dynamic frontend plugin loading**, **battle viewer/replay**, and **server infrastructure** (static serving, more API routes).

---

## I. README → Code Mapping

### Completed Items (README says done → Code confirms)

| README Item | Code Location | Status |
|-------------|---------------|--------|
| Monorepo (Bun workspaces) | `package.json` workspaces | ✅ |
| SDK types + schemas | `packages/sdk/src/types/` + `packages/sdk/src/schemas/` | ✅ |
| Core (DI, event bus, lifecycle, logging) | `packages/core/src/` | ✅ |
| Storage (`bun:sqlite`) | `packages/storage/` | ✅ |
| Plugin Manager | `packages/plugin-manager/` | ✅ |
| Match Engine + AgentSandbox | `packages/match-engine/` | ✅ |
| Runtime (battle orchestration) | `packages/runtime/` | ✅ |
| MCP protocol | `packages/mcp/` | ✅ |
| Controller (input devices) | `packages/controller/` | ✅ |
| Observation pipeline | `packages/observation/` | ✅ |
| Agent Runtime (4 memory compartments) | `packages/agent-runtime/` | ✅ |
| Battle Tanks arena | `games/battle-tanks/` | ✅ |
| Chess arena | `games/chess/` | ✅ |
| Server (Hono REST + WebSocket) | `apps/server/` | ✅ |
| Web UI (React shell with regions) | `apps/web/` | ✅ (basic, more below) |
| CLI (`arena run/plugin/arena/battle/agent/serve`) | `packages/cli/` | ✅ (with diverges) |
| Chat plugin | `plugins/plugin-chat/` | ✅ (stub) |
| Polls plugin | `plugins/plugin-polls/` | ✅ (stub) |
| Export plugin | `plugins/plugin-export/` | ✅ (stub) |
| Rewards plugin | `plugins/plugin-rewards/` | ✅ (stub) |
| Agent Isolation (AgentSandbox) | `packages/match-engine/src/agent-sandbox.ts` | ✅ |
| WebSocket live streaming | `apps/server/src/ws/battle-ws.ts` | ✅ |

### Missing Items (README says planned → Code missing)

| Priority | README Planned Item | Code Status | Gap |
|----------|---------------------|-------------|-----|
| P1 | Real LLM provider in AgentRuntime.decide() | Missing | `decide()` returns hardcoded `pass` action |
| P1 | Battle viewer — live arena visualization | Missing | Web UI has no grid/chess board renderer |
| P1 | Replay viewer | Missing | No replay package or UI component |
| P1 | Dynamic frontend plugin loading | Stub | `plugin-loader.ts` exists but never called from App.tsx |
| P2 | Tournament system (plugin) | Missing | No `packages/plugin-tournament/` |
| P2 | Rankings/leaderboards (plugin) | Missing | Rewards plugin has basic scoring only |
| P2 | WebSocket channel multiplexing | Partial | Server subscribes all events to all clients; no per-battle filtering |
| P2 | Static file serving for web UI | Missing | Server has no `serveStatic` middleware |
| P2 | `arena run --names` | Missing | CLI has `--max-turns` but not `--names` |
| P2 | `arena plugin create` scaffolding | Missing | No `plugin create` command |
| P2 | `arena export`, `arena replay` | Missing | CLI has `battle show` but no export/replay |
| P2 | `arena profile list/create` | Missing | No profile command at all |
| P3 | Fog-of-war observation filter | Partial | ObservationFilter exists but no arena-specific filter fn |
| P3 | Battle royale arena | Missing | Only battle-tanks and chess exist |
| P3 | Plugin scaffolding utility | Missing | No CLI scaffolding |
| P3 | Docker support | Missing | No Dockerfile |
| P3 | Auth & authorization | Missing | No auth middleware on server |
| P3 | Plugin permission enforcement | Partial | Permissions declared in manifests but never checked at runtime |
| P3 | PostgreSQL storage adapter | Missing | Only SQLite exists |
| P3 | API key storage per profile | Missing | `AgentConfig.apiKey` exists but never resolved or encrypted |

---

## II. Architecture Doc → Code Mapping (Key Divergences)

### Tokens Location
- **Spec**: `packages/core/src/tokens.ts`
- **Actual**: `packages/core/src/index.ts:17-28`
- **Fix**: Move tokens to `tokens.ts` and re-export from `index.ts`

### Composition Root
- **Spec**: `packages/core/src/composition.ts` with `createContainer()` wiring all services
- **Actual**: `createContainer()` does NOT exist. The composition root lives in `apps/server/src/index.ts` (inline)
- **Fix**: Move composition root to `packages/core/src/composition.ts` and have server import it

### EventBus.subscribeAll Signature
- **Spec**: `Array<{ eventType: string; handler: EventHandler }>`
- **Actual**: Same signature (matches)

### PluginContext.storage Type
- **Spec**: `storage: StorageAdapter`
- **Actual**: `storage: PluginStorage` (narrower custom type)
- **Fix**: Either rename to align or add `StorageAdapter` as a compatible type

### Controller Interface Compliance
- **Spec**: Controller implements SDK `Controller` interface (initialize/connect/execute/shutdown)
- **Actual**: Controller class does NOT implement SDK Controller interface
- **Fix**: Add interface compliance or rename spec type

### AgentRuntime Memory Shallow Copy
- **Spec**: N/A (not specified)
- **Actual**: Fixed — `getMemory()` now deep-copies all 4 arrays

---

## III. Efficient Action Plan

### Phase A — Fill Critical Gaps (P1 — blocks gameplay)

**Action 1: Wire AgentRuntime.decide() to real LLM**
- File: `packages/agent-runtime/src/agent-runtime.ts`
- Replace `createDefaultDecision()` with actual LLM call using `provider`, `model`, `apiKey` from `AgentConfig`
- Implement tool-use loop: list tools → send to LLM → parse tool calls → execute → feed result back
- Add `ProviderConfig` support (OpenAI, Ollama, LM Studio, vLLM)
- Est. effort: 2-3 sessions

**Action 2: Dynamic frontend plugin loading**
- File: `apps/web/src/App.tsx`
- On app init, fetch plugin manifests from `/api/plugins` and call `pluginLoader.loadFromManifests()`
- Register loaded components into the registry
- This makes the shell truly plugin-driven as specified
- Est. effort: 1 session

**Action 3: Static file serving**
- File: `apps/server/src/index.ts`
- Add `serveStatic` middleware to serve `apps/web/dist/` at `/`
- This makes `npm run dev` serve the built web app automatically
- Est. effort: 1 session

**Action 4: Battle viewer components**
- Files: `apps/web/src/components/` + `apps/web/src/pages/`
- Create `GridRenderer` component (for battle-tanks) and `ChessBoard` component (for chess)
- These render the `RenderState` from `arena.getRenderState()`
- Plugin-contributed renderers for custom game UIs
- Est. effort: 2-3 sessions

### Phase B — Server Infrastructure (P2)

**Action 5: Complete REST API routes**
- Add missing routes per architecture spec: arenas CRUD, battle abort, replay, events, profiles, strategies
- Files: `apps/server/src/routes/`

**Action 6: WebSocket multiplexing**
- File: `apps/server/src/ws/battle-ws.ts`
- Filter events by `battleId` subscription per client
- Currently broadcasts all events to all clients

**Action 7: CLI completion**
- Add `plugin create`, `run --names`, `export`, `replay`, `profile`, `show` commands
- File: `packages/cli/src/commands/`

**Action 8: `run --names` flag**
- File: `packages/cli/src/commands/run.ts`
- Add `--names` option for custom per-agent display names

### Phase C — Plugin Ecosystem (P3)

**Action 9: Wire plugin contributions**
- All plugins declare MCP tools, event handlers, UI panels in manifests but `activate()` does not wire them
- Each plugin needs actual handler implementations
- File: each plugin's `src/index.ts`

**Action 10: Add `permissions` and `dependencies` to all plugin manifests**
- File: each plugin's `arena-plugin.json`

**Action 11: Tournament + Leaderboard plugins**
- Create `plugins/plugin-tournament/` and `plugins/plugin-leaderboard/`

**Action 12: Fog-of-war observation filter**
- File: `packages/match-engine/src/observation-filter.ts`
- Add arena-specific filter functions for battle-tanks (line-of-sight)

### Phase D — Developer Experience (P3)

**Action 13: Move tokens.ts, create composition.ts**
- File: `packages/core/src/tokens.ts` + `packages/core/src/composition.ts`

**Action 14: Add `tokens.ts` to match architecture spec**
- File: `packages/core/src/tokens.ts`

**Action 15: Dockerfile + CI pipeline**
- File: `Dockerfile`, `.github/workflows/`

---

## IV. Quick Reference — File Map

### What exists (codebase)
```
apps/
├── server/src/
│   ├── index.ts                    # Hono server + WebSocket
│   ├── ws/battle-ws.ts             # Battle event streaming
│   └── routes/                     # API routes (api, battles, agents, plugins)
├── web/src/
│   ├── App.tsx                     # Shell + routing + plugin registry
│   ├── index.tsx                   # Entry point
│   ├── styles/global.css           # Tailwind import
│   ├── components/
│   │   ├── shell/                    # Header, StatusBar, BattleEventLog, DockPanel
│   │   └── layout/                   # DockPanel
│   ├── hooks/
│   │   ├── useApi.ts              # REST API fetch hook
│   │   └── useBattleWebSocket.ts  # WebSocket hook
│   ├── pages/                      # Dashboard, Battles, Plugins, Settings
│   ├── runtime/                    # Shell, registry, events, commands, layout, store
│   └── services/                   # plugin-loader (stub — never called)
packages/
├── sdk/src/types/                  # All 13 type files
├── sdk/src/schemas/               # 4 Zod schema files
├── core/src/                      # Container, EventBus, Logger, Lifecycle, Tokens
├── runtime/src/                   # Battle orchestrator, session management
├── match-engine/src/              # MatchEngine, AgentSandbox, ObservationFilter
├── agent-runtime/src/             # AgentRuntime (placeholder decide())
├── controller/src/                # Controller with virtual devices
├── mcp/src/                       # McpServer + LocalMcpClient
├── observation/src/               # ObservationSystem (orphaned)
├── plugin-manager/src/            # Discovery, validation, topological sort
├── storage/src/                   # SqliteStorage via bun:sqlite
├── cli/src/                       # arena command
└── cli/src/commands/              # run, plugin, arena, battle, agent, serve
games/
├── battle-tanks/src/index.ts      # Full ArenaPlugin implementation
├── chess/src/index.ts             # Full ArenaPlugin implementation
├── battle-tanks/arena-plugin.json # Manifest with display.arena config
└── chess/arena-plugin.json        # Manifest with display.arena config
plugins/
├── plugin-chat/src/index.ts       # MCP tool + event handler (partial)
├── plugin-polls/src/index.ts      # MCP tools only (no event handler wiring)
├── plugin-export/src/index.ts     # MCP tool only (no wiring)
└── plugin-rewards/src/index.ts    # MCP tools + event handler wiring (partial)
```

### What's missing (need to create)
```
packages/core/src/tokens.ts         # Move from index.ts
packages/core/src/composition.ts    # createContainer() composition root
apps/server/src/middleware/         # Auth, rate-limit logging
apps/web/src/runtime/application/   # App initialization, bootstrap
apps/web/src/runtime/router/        # Dynamic route registration from registry
apps/web/src/runtime/navigation/    # Dynamic nav from registry
apps/web/src/runtime/docking/       # Resize/reorder/drag docking
apps/web/src/services/arena-loader/ # Load arena manifests → UI contributions
apps/web/src/services/game-loader/  # Load game adapters → UI contributions
plugins/plugin-tournament/          # Tournament system plugin
plugins/plugin-leaderboard/         # Rankings/leaderboards plugin
```

---

## V. Rules of Engagement

1. **Follow README** — README is the source of truth for what exists vs what's planned
2. **Use existing code** — Do not rewrite what works; extend it
3. **Minimal changes** — Each session should change ≤ 10 files, ≤ 500 lines added/deleted
4. **Typecheck after every session** — All packages must pass `bun run typecheck`
5. **Build after every session** — All packages must pass `bun run build`
6. **Agent isolation is non-negotiable** — Agents must never see each other's thoughts/observations/actions
7. **EventBus is the single source of truth** — All state changes become events; no direct state sharing
8. **Plugins declare, core orchestrates** — Never hardcode plugin behavior in core

---

## VI. Merge Strategy

The merge from spec → code follows this priority order:

1. **Phase A** (P1): Agent LLM wiring + dynamic plugin loading + static serving + battle viewer — these unblock the full gameplay loop
2. **Phase B** (P2): Server API completeness + WebSocket multiplexing + CLI completion — these complete the server contract
3. **Phase C** (P3): Plugin ecosystem wiring + tournament/leaderboard + fog-of-war — these complete the platform
4. **Phase D** (P3): DevEx improvements (tokens.ts, composition root, Docker, CI) — these improve maintainability

Each phase should be implemented in 1-3 sessions. Checkpoint after each: `bun run typecheck` + `bun run build` across all packages.
