# TRACK.md — Implementation Progress Tracker

> Updated each session. Tracks what's done, what's in-progress, and what's pending.

## Progress Summary

| Phase | Task | Status | Started | Completed |
|-------|------|--------|---------|-----------|
| A.1   | Wire AgentRuntime.decide() to LLM provider | ✅ Done | — | Done |
| A.2   | Dynamic frontend plugin loading | ✅ Done | — | Done |
| A.3   | Static file serving | ✅ Done | — | Done |
| A.4   | Battle viewer components (GridRenderer, EventLog, TurnTimeline, AgentRoster) | ✅ Done | — | Done |
| B.1   | Complete REST API routes | ⬜ Pending | — | — |
| B.2   | WebSocket multiplexing per battleId | ⬜ Pending | — | — |
| B.3   | CLI completion (plugin create, export, replay, profile) | ⬜ Pending | — | — |
| B.4   | `run --names` flag | ⬜ Pending | — | — |
| C.1   | Wire plugin contributions | ⬜ Pending | — | — |
| C.2   | permissions/deps in manifests | ⬜ Pending | — | — |
| C.3   | Tournament + Leaderboard plugins | ⬜ Pending | — | — |
| C.4   | Fog-of-war filter | ⬜ Pending | — | — |
| D.1   | tokens.ts + composition.ts | ⬜ Pending | — | — |
| D.2   | Dependency graph fix | ⬜ Pending | — | — |
| D.3   | Middleware plugin system | ⬜ Pending | — | — |
| D.4   | Dockerfile + CI | ⬜ Pending | — | — |
| E.1   | Sync CONTRIBUTING.md with SYNC.md | ⬜ Pending | — | — |
| E.2   | License acknowledgment in SYNC.md | ⬜ Pending | — | — |
| E.3   | Plugin publishing guide | ⬜ Pending | — | — |
| F.1   | Test strategy | ⬜ Pending | — | — |
| F.2   | Error handling standards | ⬜ Pending | — | — |
| F.3   | Observability (structured logging, health depth) | ⬜ Pending | — | — |
| VII.1 | UI Primitives + Dark Theme | ⬜ Pending | — | — |
| VII.2 | Battle Components (from ui-example) | ⬜ Pending | — | — |
| VII.3 | Game Cards + Dashboard | ⬜ Pending | — | — |
| VII.4 | Animation System | ⬜ Pending | — | — |
| VII.5 | Layout Patterns | ⬜ Pending | — | — |

## Notes

- After each session: run `bun run typecheck` + `bun run build` across all packages
- Agent isolation is non-negotiable
- EventBus is the single source of truth
- Plugins declare, core orchestrates

## Compliance Audit Results

### README Compliance (9/10 compliant)
- ✅ Plugin-Driven Shell, VS Code-style Shell, Agent Isolation, Event-Driven
- ✅ Manifest-Driven Plugins, WebSocket, CLI, ProviderConfig, LLM Providers
- ❌ HTTP API Routes — missing arenas CRUD, profiles CRUD, strategies, battle abort/replay/events

### Architecture.doc Compliance (6/10 compliant)
- ✅ Manifest-Driven Discovery, InProcessEventBus, Package Boundaries (mostly)
- ⚠️ Hexagonal (partial — direct instantiation in agent-sandbox), Event-Driven (partial — missing BattleFinished/Aborted events)
- ❌ DDD Tactical Patterns — no Battle aggregate, no value objects, no EventSourcedAggregate
- ❌ Manual Composition Root — no createContainer(), no tokens.ts
- ❌ Dependency Graph — match-engine → agent-runtime/controller (not in spec), web → match-engine (should be sdk only)
- ❌ Tokens — tokens.ts does not exist, defined in index.ts instead
- ⚠️ Plugin Lifecycle — missing cycle detection, stub registration methods, no rollback on failure
- ❌ Extension Points — no PluginContext method documentation, no middleware plugin system, no observability hooks

### Critical Architecture Gaps to Fix
1. Move tokens.ts from index.ts to dedicated file
2. Create composition.ts with createContainer()
3. Make match-engine not import agent-runtime/controller directly (use DI instead)
4. Add missing HTTP API routes (arenas, profiles, strategies, battle abort/replay/events)
5. Fix dependency graph violations
6. Add DDD patterns (Battle aggregate, value objects)
7. Add missing event publishing (BattleFinished, BattleAborted, ScoreUpdated)
8. Define PluginContext extension points (registerCliCommand, registerMcpTool, registerServerRoute, etc.)
9. Add middleware plugin system (auth, rate-limit, logging as plugins)
10. Create plugin development guide (docs/plugin-dev-guide.md)
11. Add test strategy and quality gates
12. Add error handling standards and observability (structured logging, correlation IDs)
13. Add API versioning strategy
