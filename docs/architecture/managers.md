# Manager Architecture

> Every artifact type owns a dedicated manager. Managers are isolated, communicate only through registries and events.

---

## Overview

The platform has **11 core managers**, each owning a complete lifecycle for its artifact type:

```
┌─────────────────────────────────────────────────────────────┐
│                        Runtime                               │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │Arena Mgr │ │Game Mgr  │ │Plugin Mgr│ │Ctrl Mgr  │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       │            │            │            │              │
│  ┌────▼─────┐ ┌────▼─────┐ ┌────▼─────┐ ┌────▼─────┐       │
│  │Prov Mgr  │ │Prof Mgr  │ │Obsv Mgr  │ │Battle Mgr│       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       │            │            │            │              │
│  ┌────▼─────┐ ┌────▼─────┐ ┌────▼─────┐ ┌────▼─────┐       │
│  │Cap Mgr   │ │ReplayMgr │ │Store Mgr │ │          │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## Manager Interface

All managers implement a common interface:

```typescript
// packages/sdk/src/manager/manager.ts
export interface Manager<TArtifact, TManifest, TConfig> {
  readonly type: ManagerType;
  readonly registry: Registry<TArtifact>;
  readonly eventBus: EventBus;

  // Discovery
  discover(): Promise<DiscoveryResult<TManifest>>;
  validate(manifests: TManifest[]): ValidationResult;

  // Dependency Resolution
  resolveDependencies(manifests: TManifest[]): ResolvedOrder<TManifest>;

  // Registration
  registerContributions(manifests: TManifest[]): Promise<void>;

  // Lifecycle
  activate(artifactId: ArtifactId, config?: TConfig): Promise<ActivationResult>;
  deactivate(artifactId: ArtifactId): Promise<void>;
  activateAll(): Promise<void>;
  deactivateAll(): Promise<void>;

  // Hot Reload
  reload(artifactId: ArtifactId): Promise<void>;
  reloadAll(): Promise<void>;

  // Queries
  get(artifactId: ArtifactId): TArtifact | undefined;
  getAll(): TArtifact[];
  query(filter: ArtifactFilter): TArtifact[];
}

export type ManagerType = 
  | 'arena'
  | 'game'
  | 'plugin'
  | 'controller'
  | 'provider'
  | 'profile'
  | 'observation'
  | 'battle'
  | 'capability'
  | 'replay'
  | 'storage';
```

---

## Manager Responsibilities

| Manager | Artifact | Manifest | Key Responsibilities |
|---------|----------|----------|---------------------|
| **ArenaManager** | Arena | `arena.json` | Environment discovery, UI layout registration, capability requirements |
| **GameManager** | Game | `game.json` | Adapter discovery, lifecycle hooks, observation/controller bridging |
| **PluginManager** | Plugin | `plugin.json` | Extension discovery, contribution registration, dependency resolution |
| **ControllerManager** | Controller | `controller.json` | Virtual device registry, MCP server management, platform adapters |
| **ProviderManager** | Provider | `provider.json` | LLM provider abstraction, auth, streaming, model routing |
| **ProfileManager** | Profile | `profile.json` | Agent identity, strategy, memory, capability selection |
| **ObservationManager** | ObservationAdapter | `observation.json` | Perception pipeline, capture types, transform filters |
| **BattleManager** | Battle | `battle.json` | Session orchestration, turn execution, agent coordination |
| **CapabilityManager** | Capability | `capability.json` | MCP tool registry, tier management, dynamic discovery |
| **ReplayManager** | Replay | `replay.json` | Recording, playback, determinism verification |
| **StorageManager** | StorageAdapter | `storage.json` | Persistence abstraction, namespacing, migrations |

---

## Manager Isolation

**Managers never directly depend on each other.**

```typescript
// FORBIDDEN
class GameManager {
  constructor(private pluginManager: PluginManager) {} // ❌ Direct dependency
  async loadGame(id: string) {
    const plugin = this.pluginManager.getPlugin(id); // ❌ Implementation access
  }
}

// ALLOWED
class GameManager {
  constructor(
    private pluginRegistry: PluginRegistry,  // ✅ Registry interface
    private eventBus: EventBus               // ✅ Event bus
  ) {}
  async loadGame(id: string) {
    const plugin = this.pluginRegistry.get(id); // ✅ Registry query
  }
}
```

### Communication Patterns

| Pattern | Use Case | Example |
|---------|----------|---------|
| **Registry Query** | Synchronous capability lookup | `arenaRegistry.get('battle-tanks')` |
| **Event Subscription** | Async reaction to changes | `eventBus.subscribe('ArenaRegistered', handler)` |
| **Contract Invocation** | Cross-manager operations | `battleManager.createBattle(config)` → uses `arenaRegistry`, `gameRegistry`, `controllerRegistry` |
| **Capability Query** | Dynamic capability discovery | `capabilityManager.getToolsForAgent(agentId)` |

---

## Discovery & Registration Flow

```
┌─────────────┐
│  Manager    │
│  .discover()│
└──────┬──────┘
       │ Scan directories for manifests
       ▼
┌─────────────┐
│  .validate()│
└──────┬──────┘
       │ Zod schema validation
       ▼
┌─────────────────┐
│ .resolveDeps()  │
└────────┬────────┘
         │ Topological sort
         ▼
┌──────────────────────┐
│ .registerContrib()   │
└──────────┬───────────┘
           │ Register in registries
           ▼
┌─────────────┐
│  .activate()│
└──────┬──────┘
       │ Call artifact activate()
       ▼
┌────────────┐
│  Runtime   │
└────────────┘
```

---

## ArenaManager

```typescript
// packages/sdk/src/managers/arena-manager.ts
export interface ArenaManager extends Manager<ArenaPlugin, ArenaManifest, ArenaConfig> {
  readonly type: 'arena';
  readonly registry: ArenaRegistry;

  // Arena-specific
  getArenaByGameId(gameId: GameId): ArenaPlugin | undefined;
  getArenasWithCapability(capability: string): ArenaPlugin[];
  getDefaultArena(): ArenaPlugin | undefined;
}

export interface ArenaRegistry {
  get(id: ArenaId): ArenaPlugin | undefined;
  getAll(): ArenaPlugin[];
  register(arena: ArenaPlugin): void;
  unregister(id: ArenaId): void;
  query(filter: ArenaFilter): ArenaPlugin[];
}

export interface ArenaFilter {
  capability?: string;
  gameId?: GameId;
  minPlayers?: number;
  maxPlayers?: number;
}
```

**ArenaManager responsibilities:**

- Discover arena manifests in `arenas/` and `games/` (arenas can be embedded in games)
- Validate `arena.json` against schema
- Register arena UI contributions (panels, overlays, layouts)
- Register mandatory capabilities per arena
- Provide arena query by capability, game, player count

---

## GameManager

```typescript
// packages/sdk/src/managers/game-manager.ts
export interface GameManager extends Manager<GameAdapter, GameManifest, GameConfig> {
  readonly type: 'game';
  readonly registry: GameRegistry;

  // Game-specific
  getAdapter(gameId: GameId): GameAdapter | undefined;
  getAdaptersByArena(arenaId: ArenaId): GameAdapter[];
  launchGame(gameId: GameId, config: GameConfig): Promise<GameSession>;
}

export interface GameRegistry {
  get(id: GameId): GameAdapter | undefined;
  getAll(): GameAdapter[];
  register(adapter: GameAdapter): void;
  unregister(id: GameId): void;
}

export interface GameSession {
  readonly id: SessionId;
  readonly gameId: GameId;
  readonly process: ChildProcess | null;
  readonly controllerPort: number;
  readonly observationPort: number;
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  dispose(): Promise<void>;
}
```

**GameManager responsibilities:**

- Discover game manifests in `games/`
- Validate `game.json` against schema
- Register game adapters (native bridges)
- Manage game process lifecycle (launch, stop, suspend)
- Bridge controller and observation adapters

---

## PluginManager

```typescript
// packages/sdk/src/managers/plugin-manager.ts
export interface PluginManager extends Manager<Plugin, PluginManifest, PluginConfig> {
  readonly type: 'plugin';
  readonly registry: PluginRegistry;

  // Plugin-specific
  activateStartupPlugins(): Promise<void>;
  getContributions<T>(type: ContributionType): T[];
  getAvailableTools(): McpTool[];
  getEventHandlers(eventType: string): EventHandler[];
}

export interface PluginRegistry {
  get(id: PluginId): Plugin | undefined;
  getAll(): Plugin[];
  register(plugin: Plugin): void;
  unregister(id: PluginId): void;
}

export type ContributionType = 
  | 'mcpTools'
  | 'eventHandlers'
  | 'uiPanels'
  | 'serverRoutes'
  | 'cliCommands'
  | 'dashboardWidgets'
  | 'navigationItems'
  | 'contextMenus'
  | 'storage';
```

**PluginManager responsibilities:**

- Discover all plugin manifests in `plugins/` and `games/` (games can be plugins too)
- Validate `plugin.json` against schema
- **Topological dependency resolution** — critical for load order
- Register all contribution types without executing plugin code
- Activate plugins in dependency order
- Provide contribution query APIs for other managers

---

## ControllerManager

```typescript
// packages/sdk/src/managers/controller-manager.ts
export interface ControllerManager extends Manager<Controller, ControllerManifest, ControllerConfig> {
  readonly type: 'controller';
  readonly registry: ControllerRegistry;

  // Controller-specific
  createController(config: ControllerConfig): Promise<ControllerInstance>;
  getDeviceRegistry(): DeviceRegistry;
  getCapabilityRegistry(): CapabilityRegistry;
  getMcpServer(): McpServer;
}

export interface ControllerRegistry {
  get(id: ControllerId): Controller | undefined;
  getAll(): Controller[];
  register(controller: Controller): void;
  unregister(id: ControllerId): void;
}

export interface ControllerInstance {
  readonly id: ControllerInstanceId;
  readonly controller: Controller;
  readonly mcpSession: MCPSession;
  readonly devices: InputDevice[];
  connect(agentId: AgentId): Promise<void>;
  disconnect(): Promise<void>;
  execute(action: ControllerAction): Promise<ActionResult>;
}
```

**ControllerManager responsibilities:**

- Discover controller manifests
- Register virtual input devices (keyboard, mouse, gamepad, touch, pen, wheel)
- Manage MCP server lifecycle
- Coordinate platform adapters (desktop, browser, terminal, WASM, remote)
- Handle middleware (permissions, recording, replay, latency, logging)

---

## ProviderManager

```typescript
// packages/sdk/src/managers/provider-manager.ts
export interface ProviderManager extends Manager<Provider, ProviderManifest, ProviderConfig> {
  readonly type: 'provider';
  readonly registry: ProviderRegistry;

  // Provider-specific
  getProvider(providerId: ProviderId): Provider | undefined;
  getModel(modelId: ModelId): Model | undefined;
  routeRequest(request: RouteRequest): Promise<RouteResult>;
  streamCompletion(request: CompletionRequest): AsyncIterable<CompletionChunk>;
}

export interface ProviderRegistry {
  get(id: ProviderId): Provider | undefined;
  getAll(): Provider[];
  register(provider: Provider): void;
  unregister(id: ProviderId): void;
}

export interface Provider {
  readonly id: ProviderId;
  readonly name: string;
  readonly models: Model[];
  readonly capabilities: ProviderCapability[];
  authenticate(config: AuthConfig): Promise<AuthResult>;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  streamComplete(request: CompletionRequest): AsyncIterable<CompletionChunk>;
  estimateCost(request: CompletionRequest): CostEstimate;
}
```

**ProviderManager responsibilities:**

- Discover provider manifests (local, cloud, specialized)
- Manage authentication (API keys, OAuth, local model paths)
- Implement model routing (fallback, cost optimization, capability matching)
- Handle streaming completions
- Cost estimation and tracking

---

## ProfileManager

```typescript
// packages/sdk/src/managers/profile-manager.ts
export interface ProfileManager extends Manager<Profile, ProfileManifest, ProfileConfig> {
  readonly type: 'profile';
  readonly registry: ProfileRegistry;

  // Profile-specific
  getProfile(profileId: ProfileId): Profile | undefined;
  createProfile(config: ProfileConfig): Promise<Profile>;
  updateProfile(profileId: ProfileId, updates: Partial<ProfileConfig>): Promise<Profile>;
  deleteProfile(profileId: ProfileId): Promise<void>;
  getCapabilitiesForProfile(profileId: ProfileId): CapabilitySet;
}

export interface ProfileRegistry {
  get(id: ProfileId): Profile | undefined;
  getAll(): Profile[];
  register(profile: Profile): void;
  unregister(id: ProfileId): void;
}

export interface Profile {
  readonly id: ProfileId;
  readonly name: string;
  readonly providerId: ProviderId;
  readonly modelId: ModelId;
  readonly strategy: Strategy;
  readonly customStrategy?: string;
  readonly capabilities: CapabilitySelection;
  readonly memory: MemoryConfig;
  readonly personality: PersonalityConfig;
}
```

**ProfileManager responsibilities:**

- Manage agent identities and personalities
- Link profiles to providers and models
- Handle capability selection (mandatory + optional skills)
- Manage memory configuration (short-term, long-term, social, strategic)

---

## ObservationManager

```typescript
// packages/sdk/src/managers/observation-manager.ts
export interface ObservationManager extends Manager<ObservationAdapter, ObservationManifest, ObservationConfig> {
  readonly type: 'observation';
  readonly registry: ObservationRegistry;

  // Observation-specific
  createPipeline(config: PipelineConfig): ObservationPipeline;
  getAvailableTypes(): ObservationType[];
  capture(adapter: ObservationAdapter, gameState: GameState): Observation;
}

export interface ObservationRegistry {
  get(id: ObservationId): ObservationAdapter | undefined;
  getAll(): ObservationAdapter[];
  register(adapter: ObservationAdapter): void;
  unregister(id: ObservationId): void;
}

export interface ObservationPipeline {
  readonly adapters: ObservationAdapter[];
  readonly filters: ObservationFilter[];
  readonly transformers: ObservationTransformer[];
  capture(gameState: GameState, agentId: AgentId): Observation;
}
```

**ObservationManager responsibilities:**

- Discover observation adapters (screenshot, accessibility, DOM, board-state, semantic)
- Build perception pipelines per agent/arena
- Manage filters (privacy, relevance, compression)
- Manage transformers (format conversion, annotation)

---

## BattleManager

```typescript
// packages/sdk/src/managers/battle-manager.ts
export interface BattleManager extends Manager<Battle, BattleManifest, BattleConfig> {
  readonly type: 'battle';
  readonly registry: BattleRegistry;

  // Battle-specific
  createBattle(config: BattleConfig): Promise<BattleInstance>;
  getBattle(battleId: BattleId): BattleInstance | undefined;
  getActiveBattles(): BattleInstance[];
  startBattle(battleId: BattleId): Promise<void>;
  pauseBattle(battleId: BattleId): Promise<void>;
  resumeBattle(battleId: BattleId): Promise<void>;
  abortBattle(battleId: BattleId, reason: string): Promise<void>;
}

export interface BattleRegistry {
  get(id: BattleId): BattleInstance | undefined;
  getAll(): BattleInstance[];
  register(battle: BattleInstance): void;
  unregister(id: BattleId): void;
}

export interface BattleInstance {
  readonly id: BattleId;
  readonly config: BattleConfig;
  readonly state: BattleState;
  readonly arena: ArenaSession;
  readonly game: GameSession;
  readonly agents: AgentSession[];
  readonly plugins: PluginSession[];
  readonly replay: ReplayRecorder;
  start(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  abort(reason: string): Promise<void>;
}
```

**BattleManager responsibilities:**

- Create battle instances from configuration
- Coordinate arena, game, controllers, agents, plugins
- Manage battle lifecycle (start, pause, resume, abort)
- Own the interaction loop
- Coordinate replay recording

---

## CapabilityManager

```typescript
// packages/sdk/src/managers/capability-manager.ts
export interface CapabilityManager extends Manager<Capability, CapabilityManifest, CapabilityConfig> {
  readonly type: 'capability';
  readonly registry: CapabilityRegistry;

  // Capability-specific
  getSystemMandatory(): Capability[];
  getGameMandatory(arenaId: ArenaId): Capability[];
  getSpecialSkills(arenaId: ArenaId): Capability[];
  getAgentCapabilities(agentId: AgentId): CapabilitySet;
  registerTool(tool: McpTool): void;
  unregisterTool(toolId: string): void;
}

export interface CapabilityRegistry {
  get(id: CapabilityId): Capability | undefined;
  getAll(): Capability[];
  register(capability: Capability): void;
  unregister(id: CapabilityId): void;
  query(filter: CapabilityFilter): Capability[];
}

export type CapabilityTier = 'system-mandatory' | 'game-mandatory' | 'special-skill';

export interface Capability {
  readonly id: CapabilityId;
  readonly name: string;
  readonly tier: CapabilityTier;
  readonly mcpTool: McpTool;
  readonly arenaId?: ArenaId;
  readonly toggleable: boolean;
}
```

**CapabilityManager responsibilities:**

- Manage three-tier capability system
- Register MCP tools from plugins, arenas, system
- Compute agent capability sets
- Handle dynamic capability registration

---

## ReplayManager

```typescript
// packages/sdk/src/managers/replay-manager.ts
export interface ReplayManager extends Manager<Replay, ReplayManifest, ReplayConfig> {
  readonly type: 'replay';
  readonly registry: ReplayRegistry;

  // Replay-specific
  recordBattle(battleId: BattleId): ReplayRecorder;
  getReplay(replayId: ReplayId): Replay | undefined;
  replayBattle(replayId: ReplayId, options: ReplayOptions): Promise<ReplaySession>;
  verifyDeterminism(replayId: ReplayId): Promise<DeterminismReport>;
}

export interface ReplayRegistry {
  get(id: ReplayId): Replay | undefined;
  getAll(): Replay[];
  register(replay: Replay): void;
  unregister(id: ReplayId): void;
}

export interface ReplayRecorder {
  readonly battleId: BattleId;
  readonly events: DomainEvent[];
  record(event: DomainEvent): void;
  finalize(): Replay;
}

export interface ReplaySession {
  readonly replay: Replay;
  readonly currentTurn: number;
  readonly totalTurns: number;
  step(): Promise<ReplayStep>;
  jumpToTurn(turn: number): Promise<void>;
  getStateAtTurn(turn: number): BattleState;
}
```

**ReplayManager responsibilities:**

- Record all domain events during battle
- Store replays with full event streams
- Support replay playback with step/jump
- Verify deterministic replay

---

## StorageManager

```typescript
// packages/sdk/src/managers/storage-manager.ts
export interface StorageManager extends Manager<StorageAdapter, StorageManifest, StorageConfig> {
  readonly type: 'storage';
  readonly registry: StorageRegistry;

  // Storage-specific
  getAdapter(name: string): StorageAdapter | undefined;
  getDefaultAdapter(): StorageAdapter;
  createNamespace(namespace: string): NamespacedStorage;
  runMigrations(): Promise<void>;
}

export interface StorageRegistry {
  get(name: string): StorageAdapter | undefined;
  getAll(): StorageAdapter[];
  register(adapter: StorageAdapter): void;
  unregister(name: string): void;
}

export interface NamespacedStorage {
  readonly namespace: string;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  query<T>(table: string, filter: QueryFilter): Promise<T[]>;
}
```

**StorageManager responsibilities:**

- Manage storage adapters (SQLite, PostgreSQL, object storage, vector DB)
- Provide namespaced storage for plugins
- Run migrations
- Handle event store, match store, agent store, cache, assets

---

## Manager Lifecycle Events

All managers emit standard lifecycle events:

```typescript
// packages/sdk/src/managers/manager-events.ts
export type ManagerEvent =
  | { type: 'ManagerInitialized'; managerType: ManagerType; timestamp: Date }
  | { type: 'ManagerStarted'; managerType: ManagerType; timestamp: Date }
  | { type: 'ManagerStopped'; managerType: ManagerType; timestamp: Date }
  | { type: 'ArtifactDiscovered'; managerType: ManagerType; artifactId: string; manifest: unknown; timestamp: Date }
  | { type: 'ArtifactValidated'; managerType: ManagerType; artifactId: string; valid: boolean; errors?: string[]; timestamp: Date }
  | { type: 'ArtifactRegistered'; managerType: ManagerType; artifactId: string; timestamp: Date }
  | { type: 'ArtifactActivated'; managerType: ManagerType; artifactId: string; timestamp: Date }
  | { type: 'ArtifactDeactivated'; managerType: ManagerType; artifactId: string; timestamp: Date }
  | { type: 'ArtifactReloaded'; managerType: ManagerType; artifactId: string; timestamp: Date }
  | { type: 'ArtifactError'; managerType: ManagerType; artifactId: string; error: Error; timestamp: Date };
```

---

## Testing Managers

Each manager can be tested in isolation:

```typescript
// packages/runtime/tests/arena-manager.test.ts
describe('ArenaManager', () => {
  let manager: ArenaManager;
  let mockRegistry: ArenaRegistry;
  let mockEventBus: EventBus;
  let mockContainer: Container;

  beforeEach(() => {
    mockRegistry = createMockArenaRegistry();
    mockEventBus = createMockEventBus();
    mockContainer = createMockContainer({
      [Tokens.ArenaRegistry]: mockRegistry,
      [Tokens.EventBus]: mockEventBus,
    });
    manager = createArenaManager(mockContainer);
  });

  it('discovers arenas from manifests', async () => {
    const result = await manager.discover();
    expect(result.manifests).toHaveLength(3);
  });

  it('validates manifest schema', async () => {
    const valid = [{ id: 'test', name: 'Test', version: '1.0.0', ... }];
    const invalid = [{ id: 'bad', name: 'Bad' }]; // missing version
    
    expect(await manager.validate(valid)).toEqual({ valid: true });
    expect(await manager.validate(invalid)).toEqual({ 
      valid: false, 
      errors: expect.arrayContaining([expect.stringContaining('version')])
    });
  });

  it('registers contributions without executing code', async () => {
    await manager.registerContributions(manifests);
    expect(mockRegistry.register).toHaveBeenCalledTimes(3);
    // Plugin code never executed
  });
});
```

---

## Forbidden Patterns

| Pattern | Forbidden | Correct |
|---------|-----------|---------|
| Manager → Manager import | `import { PluginManager } from '../plugin-manager'` | Use `PluginRegistry` token |
| Shared mutable state | `static instances = new Map()` | Registry pattern |
| Direct activation | `pluginManager.activatePlugin('chat')` | `pluginRegistry.get('chat')?.activate()` |
| Hardcoded discovery paths | `fs.readdirSync('./plugins')` | `discover()` with configurable paths |

---

## Adding a New Manager

To add a new artifact type:

1. Create manifest schema in `packages/sdk/src/schemas/`
2. Create artifact interface in `packages/sdk/src/types/`
3. Create registry interface in `packages/sdk/src/registries/`
4. Create manager in `packages/runtime/src/managers/`
5. Register in composition root
6. Add discovery path to plugin manager config
7. Write tests

**No core runtime modifications required.**