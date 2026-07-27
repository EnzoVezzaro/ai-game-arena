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

The codebase is roughly 66% complete against the README spec. The biggest gaps are in **agent intelligence** (LLM wiring), **dynamic frontend plugin loading**, **battle viewer/replay**, **server infrastructure** (static serving, more API routes), **open source contribution workflow**, and **plugin extension points documentation**.

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
| P3 | Middleware plugin system | Missing | No `ServerMiddleware` interface; auth/rate-limit/logging are hardcoded, not plugin-extensible |
| P3 | Plugin development guide | Missing | No `docs/plugin-dev-guide.md` explaining extension points |
| P3 | Test strategy | Missing | No test structure or standards in the action plan |
| P3 | Error handling standards | Missing | No consistent error response shape for API routes |
| P3 | Observability | Missing | No structured logging, correlation IDs, or health check depth |
| P3 | API versioning | Missing | No `/api/v1/` prefix strategy |

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

### Plugin Extension Points
The following extension points are available for third-party plugins to hook into the system:

| Extension Point | Plugin Method | Description |
|----------------|---------------|-------------|
| MCP Tools | `manifest.contributions.mcpTools` | Register tools agents can call |
| Event Handlers | `manifest.contributions.eventHandlers` | Subscribe to domain events |
| UI Panels | `manifest.contributions.uiPanels` | Contribute components to shell regions |
| CLI Commands | `manifest.contributions.cliCommands` | Register `arena` CLI subcommands |
| Server Routes | `manifest.contributions.serverRoutes` | Register REST API endpoints |
| WebSocket Channels | `manifest.contributions.wsChannels` | Register WebSocket event channels |
| Observation Filters | `manifest.contributions.observationFilters` | Arena-specific observation filtering |
| Arena Renderers | `manifest.contributions.arenaRenderers` | Custom grid/board renderers for battle viewer |

Every extension point is wired at plugin activation time by the PluginManager. Plugins never import core internals; they receive a scoped `PluginContext` at runtime.

### Middleware as Plugin Extensions
Server middleware (auth, rate-limiting, logging) is planned as a plugin-friendly extensibility point:

- **Spec**: Middleware is a `ServerMiddleware` interface plugins can register via manifest
- **Actual**: No middleware plugin system exists yet
- **Fix**: Define `ServerMiddleware` in SDK, implement auth/rate-limit/plugins as middleware plugins

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
arenas/
```

### What's missing (need to create)
```
packages/core/src/tokens.ts          # Move from index.ts
packages/core/src/composition.ts     # createContainer() composition root
apps/server/src/middleware/           # Auth, rate-limit, logging middleware plugins
apps/web/src/runtime/application/     # App initialization, bootstrap
apps/web/src/runtime/router/          # Dynamic route registration from registry
apps/web/src/runtime/navigation/      # Dynamic nav from registry
apps/web/src/runtime/docking/         # Resize/reorder/drag docking
apps/web/src/services/arena-loader/   # Load arena manifests → UI contributions
apps/web/src/services/game-loader/    # Load game adapters → UI contributions
plugins/plugin-tournament/            # Tournament system plugin
plugins/plugin-leaderboard/           # Rankings/leaderboards plugin
docs/plugin-dev-guide.md              # How to create and publish a plugin
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
9. **Module boundaries are enforced** — Packages only import from their own SDK types or other packages' public APIs; never internals
10. **Tests follow hexagonal pattern** — Unit tests for services in each package, integration tests at package boundaries
11. **Consistent error responses** — All API routes return `{ error: string, code?: string }` shape; web UI has error boundary components
12. **Structured logging mandatory** — All log messages include `{ component, correlationId? }` for traceability across services
13. **Open source first** — All contributions welcome per `CONTRIBUTING.md`; MIT licensed; PRs require clear description and tests

---

## VI. Merge Strategy

The merge from spec → code follows this priority order:

1. **Phase A** (P1): Agent LLM wiring + dynamic plugin loading + static serving + battle viewer — these unblock the full gameplay loop
2. **Phase B** (P2): Server Infrastructure (modular sub-phases):
   - **B.1** — Complete REST API routes (arenas CRUD, profiles, strategies, battle abort/replay/events)
   - **B.2** — WebSocket multiplexing per battleId
   - **B.3** — CLI completion (plugin create, export, replay, profile)
   - **B.4** — `run --names` flag and middleware plugin system
3. **Phase C** (P3): Plugin ecosystem wiring + tournament/leaderboard + fog-of-war — these complete the platform
4. **Phase D** (P3): DevEx improvements (tokens.ts, composition root, Docker, CI, middleware plugin system) — these improve maintainability
5. **Phase E** (P3): Open source & contribution guide — enables external contributors and plugin ecosystem
6. **Phase F** (P3): Quality gates (tests, error standards, observability) — ensures long-term reliability
7. **Phase G** (P3): UI Example Integration — visual polish

Each phase should be implemented in 1-3 sessions. Checkpoint after each: `bun run typecheck` + `bun run build` across all packages.

---

## VII. Open Source & Contribution

### Project Details
- **License**: MIT License
- **Contributing**: See `CONTRIBUTING.md`
- **Repository**: `ai-game-arena-refactor`

### How to Contribute
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes following the SYNC.md action plan
4. Run `bun run typecheck` and `bun run build` before committing
5. Create a PR with a clear description of what you changed and why
6. Update SYNC.md `Progress Tracker` if your change adds or modifies tracked items

### Plugin Development
Third-party developers can extend the platform by creating plugins:
1. Create a new directory in `plugins/`
2. Add `arena-plugin.json` manifest with `contributions` declaring extensions
3. Implement `activate()` and `deactivate()` exports
4. Register MCP tools, event handlers, UI panels, CLI commands, or server routes via the manifest
5. See existing plugins in `plugins/plugin-chat/` and `plugins/plugin-polls/` for examples
6. See `docs/plugin-dev-guide.md` for the full plugin development guide

### Architecture Extension Points
The system is designed to be extended at every level:
- **Server routes** — Plugins can register REST API endpoints
- **WebSocket channels** — Plugins can subscribe to and publish events on named channels
- **CLI commands** — Plugins can register `arena` subcommands
- **UI regions** — Plugins can contribute components to any shell region
- **Observation filters** — Plugins can define arena-specific observation filtering
- **Arena renderers** — Plugins can provide custom grid/board renderers
- **Middleware** — Plugins can register server middleware (auth, logging, rate-limit)

---

## VIII. Progress Tracker

| Phase | Task | Status |
|-------|------|--------|
| A.1   | Wire AgentRuntime.decide() to LLM provider | ✅ Done |
| A.2   | Dynamic frontend plugin loading | ✅ Done |
| A.3   | Static file serving | ✅ Done |
| A.4   | Battle viewer components (GridRenderer, EventLog, TurnTimeline, AgentRoster) | ✅ Done |
| B.1   | Complete REST API routes | ⬜ Pending |
| B.2   | WebSocket multiplexing per battleId | ⬜ Pending |
| B.3   | CLI completion (plugin create, export, replay, profile) | ⬜ Pending |
| B.4   | `run --names` flag and middleware plugin system | ⬜ Pending |
| C.1   | Wire plugin contributions | ⬜ Pending |
| C.2   | permissions/deps in manifests | ⬜ Pending |
| C.3   | Tournament + Leaderboard plugins | ⬜ Pending |
| C.4   | Fog-of-war filter | ⬜ Pending |
| D.1   | tokens.ts + composition.ts | ⬜ Pending |
| D.2   | Dependency graph fix | ⬜ Pending |
| D.3   | Middleware plugin system | ⬜ Pending |
| D.4   | Dockerfile + CI | ⬜ Pending |
| E.1   | Sync CONTRIBUTING.md with SYNC.md | ⬜ Pending |
| E.2   | License acknowledgment in SYNC.md | ⬜ Pending |
| E.3   | Plugin publishing guide (docs/plugin-dev-guide.md) | ⬜ Pending |
| F.1   | Test strategy | ⬜ Pending |
| F.2   | Error handling standards | ⬜ Pending |
| F.3   | Observability (structured logging, health depth) | ⬜ Pending |
| VII.1 | UI Primitives + Dark Theme | ⬜ Pending |
| A.1   | Wire AgentRuntime.decide() to LLM provider | ✅ Done |
| A.2   | Dynamic frontend plugin loading | ✅ Done |
| A.3   | Static file serving | ✅ Done |
| A.4   | Battle viewer components (GridRenderer, EventLog, TurnTimeline, AgentRoster) | ✅ Done |
| B.1   | Complete REST API routes | ⬜ Pending |
| B.2   | WebSocket multiplexing per battleId | ⬜ Pending |
| B.3   | CLI completion (plugin create, export, replay, profile) | ⬜ Pending |
| B.4   | `run --names` flag and middleware plugin system | ⬜ Pending |
| C.1   | Wire plugin contributions | ⬜ Pending |
| C.2   | permissions/deps in manifests | ⬜ Pending |
| C.3   | Tournament + Leaderboard plugins | ⬜ Pending |
| C.4   | Fog-of-war filter | ⬜ Pending |
| D.1   | tokens.ts + composition.ts | ⬜ Pending |
| D.2   | Dependency graph fix | ⬜ Pending |
| D.3   | Middleware plugin system | ⬜ Pending |
| D.4   | Dockerfile + CI | ⬜ Pending |
| E.1   | Sync CONTRIBUTING.md with SYNC.md | ⬜ Pending |
| E.2   | License acknowledgment in SYNC.md | ⬜ Pending |
| E.3   | Plugin publishing guide (docs/plugin-dev-guide.md) | ⬜ Pending |
| F.1   | Test strategy | ⬜ Pending |
| F.2   | Error handling standards | ⬜ Pending |
| F.3   | Observability (structured logging, health depth) | ⬜ Pending |
| VII.1 | UI Primitives + Dark Theme | ⬜ Pending |
| A.1   | Wire AgentRuntime.decide() to LLM provider | ✅ Done |
| A.2   | Dynamic frontend plugin loading | ✅ Done |
| A.3   | Static file serving | ✅ Done |
| A.4   | Battle viewer components (GridRenderer, EventLog, TurnTimeline, AgentRoster) | ✅ Done |
| B     | Server Infrastructure (API routes, WebSocket mux, CLI) | ⬜ Pending |
| C     | Plugin ecosystem wiring | ⬜ Pending |
| D     | DevEx (tokens.ts, composition.ts, Docker, CI) | ⬜ Pending |
| VII   | UI Example Integration | ⬜ Pending |

Source: `apps/examples/ui-example` — Base44-generated React 18 app (NOT a dependency).
We extract design patterns and visual quality, adapting to our React 19 + Tailwind v4 + shadcn-style shell.

### What we're extracting (6 categories)

| # | Category | What to take | Our target | Effort |
|---|----------|-------------|------------|--------|
| 1 | **UI Primitives** | shadcn-style: button, card, dialog, tabs, input, select, dropdown-menu, checkbox, switch, badge, skeleton, tooltip, toast | Replace minimal primitives in `apps/web/src/components/` | 1 session |
| 2 | **Battle Components** | ArenaGrid (grid renderer), EventLog (stream), TurnTimeline (progress bar), AgentRoster (HP bars + scores), BattleControls, SpectatorChat | Replace stub `BattleEventLog.tsx` with real components | 2 sessions |
| 3 | **Dark Theme Colors** | HSL palette: `--background: 224 47% 5%` (dark navy), `--primary: 189 95% 52%` (cyan), `--accent: 265 90% 66%` (purple), glass effects, scanline | Merge into `apps/web/src/styles/global.css` | 0.5 session |
| 4 | **Animations** | Keyframes: pulse-glow, scan, fade-in, slide-up, shimmer, float, blink | Add to global CSS `@keyframes` | 0.5 session |
| 5 | **Game Cards** | GameCard, ArenaCard, PluginCard, AgentCard, AgentAvatar, StatCard, GameBadge, LiveBadge | Modernize Dashboard + Plugins pages | 1 session |
| 6 | **Layout Patterns** | AuthLayout (→ Shell), PageLoader (→ loading states), ScrollToTop | Adapt Shell + routing | 0.5 session |

### What we're NOT taking
- Auth system (Login/Register) — not needed yet
- Base44 SDK (`@base44/sdk`) — incompatible with our Hono server
- Stripe/payment — irrelevant
- Marketing pages (Home, Packages) — not our use case
- React 18 deps — we use React 19
- `cmdk` command palette — we already built our own
- `framer-motion` — use CSS animations instead (lighter)
- `recharts` charts — not needed yet

### Dependencies to add to `apps/web/package.json`
- `@radix-ui/react-dialog`
- `@radix-ui/react-tabs`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-slot`
- `@radix-ui/react-checkbox`
- `@radix-ui/react-switch`
- `@radix-ui/react-select`
- `@radix-ui/react-tooltip`
- `@radix-ui/react-toast`
- `@radix-ui/react-collapsible`
- `@radix-ui/react-accordion`
- `@radix-ui/react-popover`
- `@radix-ui/react-hover-card`
- `@radix-ui/react-context-menu`
- `tailwindcss-animate`
- `clsx`
- `tailwind-merge`
- `lucide-react`

### Order of implementation
1. UI Primitives + Dark Theme → immediate visual upgrade (1 session)
2. Battle Components → replaces stub BattleEventLog (2 sessions)
3. Game Cards + Dashboard → modern dashboard (1 session)
4. Animation System → adds life to UI (0.5 session)
5. Layout Patterns → better Shell structure (0.5 session)

### Adaptation pattern for each extracted component
1. Remove `@/lib/utils` and `@/components/Icon` imports (Base44-specific)
2. Replace with our imports (Tailwind classes, our shell components)
3. Remove any `db.entities.*` Base44 SDK calls (use our API hooks instead)
4. Make component work with our data structures (WorldState, TurnResult, AgentAction)
5. TypeScript conversion: `.jsx` → `.tsx` with proper types
6. Place in existing `apps/web/src/components/` (not a new directory)
7. Preserve our business logic — these are UI-only, no data fetching logic
