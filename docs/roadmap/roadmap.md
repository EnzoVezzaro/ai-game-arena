# Roadmap

> Development roadmap for AI Game Arena — from MVP to ecosystem platform.

---

## Vision

**Build the VS Code of AI Environments**: A small, stable core with a rich ecosystem of independently developed extensions, capable of supporting thousands of arenas, games, agents, and AI integrations over decades.

---

## Phase 0: Foundation (Current)

**Status**: ✅ Complete  
**Timeline**: Weeks 1-4

### Core Runtime
- [x] TypeScript monorepo with Bun
- [x] Hexagonal architecture (ports & adapters)
- [x] Manual composition root (no DI container)
- [x] Event bus with correlation IDs
- [x] SQLite persistence layer
- [x] Zod schema validation

### Plugin System
- [x] Manifest-driven discovery (`arena-plugin.json`)
- [x] Topological dependency resolution
- [x] Contribution registration (tools, events, UI, routes, CLI)
- [x] Activation lifecycle with scoped context
- [x] Hot reload in development

### Battle Orchestration
- [x] Battle aggregate (event-sourced)
- [x] Turn-based interaction loop
- [x] Agent runtime with MCP client
- [x] Observation pipeline
- [x] Replay recording

### Controllers & Observations
- [x] Virtual keyboard, mouse, gamepad devices
- [x] MCP server exposing device capabilities
- [x] Desktop platform adapter
- [x] Screenshot & board-state observations

### Frontend Shell
- [x] React 19 + Vite + Tailwind
- [x] Dock-based layout (center, left, right, bottom)
- [x] Dynamic component registry
- [x] Command palette
- [x] WebSocket event bus
- [x] Zustand state management

### Built-in Content
- [x] Battle Tanks arena + game
- [x] Chess arena + game (Stockfish)
- [x] Chat plugin
- [x] Polls plugin
- [x] Rewards/XP plugin

---

## Phase 1: Platform Hardening (Next)

**Timeline**: Weeks 5-8  
**Goal**: Production-ready core

### Reliability
- [ ] Graceful degradation (circuit breakers, retries)
- [ ] Comprehensive health checks
- [ ] Structured logging with correlation IDs
- [ ] Metrics collection (Prometheus format)
- [ ] Distributed tracing (OpenTelemetry)
- [ ] Crash recovery & state reconstruction

### Security
- [ ] Plugin sandboxing (WASM/Worker isolation)
- [ ] Capability-based permissions enforcement
- [ ] API key management & rotation
- [ ] Rate limiting & DDoS protection
- [ ] Audit logging for sensitive operations

### Testing
- [ ] Integration test suite (full battle runs)
- [ ] Chaos testing (network partitions, crashes)
- [ ] Determinism verification (1000+ seed runs)
- [ ] Performance benchmarks (100 concurrent battles)
- [ ] Contract tests for all public interfaces

### Developer Experience
- [ ] `aga` CLI with scaffolding templates
- [ ] Interactive `aga create` wizard
- [ ] Local plugin registry (`aga plugin install ./my-plugin`)
- [ ] Debug adapter protocol support
- [ ] VS Code extension for manifest validation

---

## Phase 2: AI Provider Ecosystem (Month 3)

**Timeline**: Weeks 9-12  
**Goal**: Universal AI integration

### Provider Framework
- [ ] Provider manifest schema
- [ ] Authentication abstraction (API keys, OAuth, local)
- [ ] Streaming completion support
- [ ] Function calling / tool use normalization
- [ ] Cost estimation & budget tracking

### Built-in Providers
- [ ] OpenAI (GPT-4o, o1, embeddings)
- [ ] Anthropic (Claude 3.5 Sonnet/Haiku)
- [ ] Google (Gemini Pro/Flash)
- [ ] Local via Ollama (Llama 3, Mistral, etc.)
- [ ] Custom HTTP provider template

### Model Router
- [ ] Capability-based routing (vision → GPT-4o, reasoning → o1)
- [ ] Cost optimization (cheapest capable model)
- [ ] Fallback chains with health checks
- [ ] Latency-aware routing
- [ ] Per-agent budget enforcement

### Agent Profiles
- [ ] Strategy prompt library
- [ ] Memory configuration (short/long/social/strategic)
- [ ] Personality traits system
- [ ] Capability selection UI
- [ ] Profile versioning & sharing

---

## Phase 3: Frontend Platform (Month 4)

**Timeline**: Weeks 13-16  
**Goal**: Extensible UI runtime

### Shell Enhancements
- [ ] Tabbed workspaces per battle
- [ ] Persistent layout save/restore
- [ ] Keyboard shortcuts customization
- [ ] Theme system (dark/light/custom)
- [ ] Accessibility (WCAG 2.1 AA)

### Extension APIs
- [ ] Custom panel types (WebGL canvas, WebGPU)
- [ ] Dashboard widget framework
- [ ] Context menu contributions
- [ ] Status bar items
- [ ] Notification system
- [ ] Settings UI generator from manifest

### Spectator Experience
- [ ] Live battle streaming (low latency)
- [ ] Replay scrubber with timeline
- [ ] Multi-agent POV switching
- [ ] Chat with agent mentions
- [ ] Betting/prediction overlay

---

## Phase 4: Advanced Battle Features (Month 5)

**Timeline**: Weeks 17-20  
**Goal**: Rich battle semantics

### Battle Types
- [ ] Simultaneous turns (real-time)
- [ ] Team battles (2v2, 3v3)
- [ ] Tournament bracket system
- [ ] Asymmetric scenarios (boss raids)
- [ ] Cooperative PvE modes

### Agent Communication
- [ ] Agent-to-agent messaging
- [ ] Team coordination protocols
- [ ] Negotiation/diplomacy tools
- [ ] Shared memory namespaces

### Observability
- [ ] Real-time agent reasoning view
- [ ] Decision tree visualization
- [ ] Token usage & cost per turn
- [ ] Attention heatmaps
- [ ] Counterfactual analysis ("what if?")

---

## Phase 5: Marketplace & Distribution (Month 6)

**Timeline**: Weeks 21-24  
**Goal**: Self-sustaining ecosystem

### Plugin Registry
- [ ] Public registry (`aga plugin search`)
- [ ] Semantic versioning enforcement
- [ ] Dependency resolution
- [ ] Security scanning (static analysis)
- [ ] Ratings & reviews
- [ ] Featured/curated collections

### Content Packaging
- [ ] Arena bundles (arena + game + UI)
- [ ] Agent packs (profile + strategy + avatar)
- [ ] Theme packs
- [ ] Localization packs

### Monetization (Optional)
- [ ] Paid plugin support
- [ ] Revenue sharing
- [ ] Enterprise licensing

---

## Phase 6: Platform Maturity (Months 7-12)

**Timeline**: Months 7-12  
**Goal**: Enterprise readiness

### Scalability
- [ ] Horizontal scaling (battle workers)
- [ ] Multi-region deployment
- [ ] CDN for assets
- [ ] Database sharding
- [ ] WebSocket connection pooling

### Enterprise Features
- [ ] SSO (OIDC/SAML)
- [ ] RBAC (roles, teams, organizations)
- [ ] Audit logging
- [ ] Compliance (SOC 2, GDPR)
- [ ] Private registry
- [ ] Air-gapped deployment

### AI Research Tools
- [ ] Experiment tracking (MLflow integration)
- [ ] Hyperparameter sweeps
- [ ] Population-based training
- [ ] ELO/TrueSkill rating system
- [ ] Statistical significance testing

---

## Long-term Vision (Years 2-3)

### Ecosystem Growth
- 1000+ community plugins
- 100+ arenas/games
- 50+ AI providers
- Active marketplace

### Platform Extensions
- [ ] Mobile companion app
- [ ] CLI-only headless mode
- [ ] Kubernetes operator
- [ ] Unreal/Unity native plugins
- [ ] Robotics integration (ROS2 bridge)

### Research Platform
- [ ] Benchmark suites (Arcade Learning Environment, etc.)
- [ ] Standardized evaluation protocols
- [ ] Reproducible experiment publishing
- [ ] Interoperability with other AI benchmarks

---

## Success Metrics

| Metric | Phase 1 | Phase 3 | Phase 6 |
|--------|---------|---------|---------|
| Concurrent battles | 10 | 100 | 10,000 |
| Plugin count | 10 | 100 | 1,000+ |
| Arena/Game count | 5 | 50 | 500+ |
| AI providers | 3 | 10 | 50+ |
| Active developers | 5 | 50 | 500+ |
| Battle uptime | 99% | 99.9% | 99.99% |
| Determinism rate | 100% | 100% | 100% |

---

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for:
- Code style & conventions
- PR process
- Release process
- Governance model

---

## Versioning Strategy

| Component | Scheme |
|-----------|--------|
| Runtime (`@aga/*`) | Semantic (major.minor.patch) |
| Plugin Manifest | Independent, declared in `engines.aga` |
| Contracts (SDK) | Semantic, backwards compatible within major |
| Frontend Shell | Semantic, tied to runtime major |

**Support Window**: 2 major versions (current + previous)

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking changes in LLM APIs | High | High | Provider abstraction layer, adapter pattern |
| Plugin security vulnerabilities | Medium | High | Sandboxing, permission model, scanning |
| Determinism failures | Low | High | CI enforcement, property-based testing |
| Ecosystem fragmentation | Medium | Medium | Strong conventions, curated registry |
| Performance at scale | Medium | Medium | Load testing, horizontal architecture |
| Community adoption | Medium | High | Great DX, documentation, examples |

---

## Release Cadence

| Channel | Frequency | Stability |
|---------|-----------|-----------|
| Nightly | Daily | Experimental |
| Beta | Bi-weekly | Feature complete |
| Stable | Monthly | Production ready |
| LTS | Every 6 months | 18 months support |

---

*Last updated: 2024-01-15*  
*Next review: 2024-02-15*