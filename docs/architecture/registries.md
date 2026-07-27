# Runtime Registries

> Registries are the **only** way consumers access artifacts. No direct imports. No singletons. Query, don't import.

---

## Overview

Every manager exposes a **registry** — a typed, queryable collection of its artifacts.

```
ArenaManager  ──►  ArenaRegistry
GameManager   ──►  GameRegistry
PluginManager ──►  PluginRegistry
ControllerMgr ──►  ControllerRegistry
ProviderMgr   ──►  ProviderRegistry
ProfileMgr    ──►  ProfileRegistry
ObservationMgr►  ObservationRegistry
BattleManager ──►  BattleRegistry
CapabilityMgr ──►  CapabilityRegistry
ReplayManager ──►  ReplayRegistry
StorageManager►  StorageRegistry
```

---

## Registry Interface

```typescript
// packages/sdk/src/registry/registry.ts
export interface Registry<TArtifact, TId extends string = string> {
  // Core operations
  get(id: TId): TArtifact | undefined;
  getAll(): TArtifact[];
  has(id: TId): boolean;
  
  // Registration (manager-only)
  register(artifact: TArtifact): void;
  unregister(id: TId): void;
  clear(): void;
  
  // Query
  query(filter: ArtifactFilter<TArtifact>): TArtifact[];
  find(predicate: (a: TArtifact) => boolean): TArtifact | undefined;
  
  // Events
  onRegistered: Event<TArtifact>;
  onUnregistered: Event<TId>;
  onCleared: Event<void>;
}

export interface ArtifactFilter<T> {
  // Common filters
  ids?: string[];
  tags?: string[];
  capabilities?: string[];
  
  // Type-specific filters (extended by implementations)
  [key: string]: unknown;
}

export interface Event<T> {
  subscribe(handler: (payload: T) => void): Subscription;
}
```

---

## Arena Registry

```typescript
// packages/sdk/src/registries/arena-registry.ts
export interface ArenaRegistry extends Registry<ArenaPlugin, ArenaId> {
  // Arena-specific queries
  getByGameId(gameId: GameId): ArenaPlugin | undefined;
  getByCapability(capability: string): ArenaPlugin[];
  getByPlayerCount(min: number, max: number): ArenaPlugin[];
  getDefault(): ArenaPlugin | undefined;
  setDefault(arenaId: ArenaId): void;
}

export interface ArenaFilter extends ArtifactFilter<ArenaPlugin> {
  gameId?: GameId;
  capability?: string;
  minPlayers?: number;
  maxPlayers?: number;
  hasUI?: boolean;
}

// Usage
const arenaRegistry = container.get(Tokens.ArenaRegistry);

// Get arena for a game
const arena = arenaRegistry.getByGameId('battle-tanks');

// Find arenas supporting observation capability
const observationArenas = arenaRegistry.getByCapability('observation');

// Query with filter
const twoPlayerArenas = arenaRegistry.query({
  minPlayers: 2,
  maxPlayers: 2,
  capability: 'multiplayer',
});

// Subscribe to changes
arenaRegistry.onRegistered.subscribe(arena => {
  logger.info(`Arena registered: ${arena.config.id}`);
});
```

---

## Game Registry

```typescript
// packages/sdk/src/registries/game-registry.ts
export interface GameRegistry extends Registry<GameAdapter, GameId> {
  getByArenaId(arenaId: ArenaId): GameAdapter[];
  getLaunchable(): GameAdapter[]; // Games that can be launched
  getByAdapterType(type: 'native' | 'browser' | 'wasm' | 'remote'): GameAdapter[];
}

export interface GameFilter extends ArtifactFilter<GameAdapter> {
  arenaId?: ArenaId;
  launchable?: boolean;
  adapterType?: 'native' | 'browser' | 'wasm' | 'remote';
}

// Usage
const gameRegistry = container.get(Tokens.GameRegistry);

// Launch a game
const game = gameRegistry.get('battle-tanks');
const session = await game.launch(config);
```

---

## Plugin Registry

```typescript
// packages/sdk/src/registries/plugin-registry.ts
export interface PluginRegistry extends Registry<Plugin, PluginId> {
  getByCategory(category: PluginCategory): Plugin[];
  getStartupPlugins(): Plugin[];
  getEventHandlers(eventType: string): Plugin[];
  getMcpTools(): McpTool[];
  getUiPanels(): UiPanelContribution[];
  getServerRoutes(): ServerRoute[];
  getCliCommands(): CliCommand[];
}

export interface PluginFilter extends ArtifactFilter<Plugin> {
  category?: PluginCategory;
  startup?: boolean;
  providesTool?: string;
  providesPanel?: string;
}

// Usage
const pluginRegistry = container.get(Tokens.PluginRegistry);

// Get all MCP tools from all plugins
const allTools = pluginRegistry.getMcpTools();

// Get plugins handling MATCH_STARTED event
const handlers = pluginRegistry.getEventHandlers('MATCH_STARTED');

// Query by category
const interactionPlugins = pluginRegistry.getByCategory('interaction');
```

---

## Controller Registry

```typescript
// packages/sdk/src/registries/controller-registry.ts
export interface ControllerRegistry extends Registry<Controller, ControllerId> {
  getDevices(): InputDeviceRegistry extends Registry<InputDevice, DeviceId> {
  getByType(type: DeviceType): InputDevice[];
  getCapabilities(): Capability[];
}

export interface ControllerFilter extends ArtifactFilter<Controller> {
  deviceType?: DeviceType;
  platform?: Platform;
  hasMcpServer?: boolean;
}

export type DeviceType = 
  | 'keyboard' 
  | 'mouse' 
  | 'pointer' 
  | 'touch' 
  | 'gamepad' 
  | 'wheel' 
  | 'pen' 
  | 'custom';

export type Platform = 'desktop' | 'browser' | 'terminal' | 'wasm' | 'remote';
```

---

## Provider Registry

```typescript
// packages/sdk/src/registries/provider-registry.ts
export interface ProviderRegistry extends Registry<Provider, ProviderId> {
  getByModel(model: string): Provider[];
  getByCapability(capability: ProviderCapability): Provider[];
  getDefault(): Provider | undefined;
  setDefault(providerId: ProviderId): void;
  getRoutingRules(): RoutingRule[];
  setRoutingRules(rules: RoutingRule[]): void;
}

export interface ProviderFilter extends ArtifactFilter<Provider> {
  model?: string;
  capability?: ProviderCapability;
  streaming?: boolean;
  local?: boolean;
}

export type ProviderCapability = 
  | 'chat' 
  | 'completion' 
  | 'embedding' 
  | 'vision' 
  | 'audio' 
  | 'function-calling' 
  | 'reasoning';

export interface RoutingRule {
  readonly pattern: string; // Model name pattern
  readonly providerId: ProviderId;
  readonly priority: number;
  readonly fallback?: ProviderId;
  readonly conditions?: RoutingCondition[];
}

export interface RoutingCondition {
  readonly type: 'cost' | 'latency' | 'capability' | 'availability';
  readonly operator: '<' | '<=' | '>' | '>=' | '==' | '!=';
  readonly value: number | string | boolean;
}
```

---

## Profile Registry

```typescript
// packages/sdk/src/registries/profile-registry.ts
export interface ProfileRegistry extends Registry<AgentProfile, ProfileId> {
  getByStrategy(strategy: string): AgentProfile[];
  getByProvider(providerId: ProviderId): AgentProfile[];
  getByCapability(capability: string): AgentProfile[];
  getDefault(): AgentProfile | undefined;
}

export interface ProfileFilter extends ArtifactFilter<AgentProfile> {
  strategy?: string;
  providerId?: ProviderId;
  capability?: string;
}
```

---

## Observation Registry

```typescript
// packages/sdk/src/registries/observation-registry.ts
export interface ObservationRegistry extends Registry<ObservationAdapter, ObservationId> {
  getByType(type: ObservationType): ObservationAdapter[];
  getByGameId(gameId: GameId): ObservationAdapter[];
  getPipeline(): ObservationPipeline;
}

export interface ObservationFilter extends ArtifactFilter<ObservationAdapter> {
  type?: ObservationType;
  gameId?: GameId;
}

export type ObservationType = 
  | 'screenshot' 
  | 'accessibility-tree' 
  | 'dom' 
  | 'board-state' 
  | 'metadata' 
  | 'semantic';

export interface ObservationPipeline {
  readonly stages: PipelineStage[];
  addStage(stage: PipelineStage): void;
  removeStage(stageId: string): void;
  process(input: RawObservation): Promise<ProcessedObservation>;
}
```

---

## Battle Registry

```typescript
// packages/sdk/src/registries/battle-registry.ts
export interface BattleRegistry extends Registry<Battle, BattleId> {
  getByArenaId(arenaId: ArenaId): Battle[];
  getByGameId(gameId: GameId): Battle[];
  getByStatus(status: BattleStatus): Battle[];
  getActive(): Battle[];
  getCompleted(): Battle[];
  getByAgentId(agentId: AgentId): Battle[];
}

export interface BattleFilter extends ArtifactFilter<Battle> {
  arenaId?: ArenaId;
  gameId?: GameId;
  status?: BattleStatus;
  agentId?: AgentId;
  dateRange?: { from: Date; to: Date };
}

export type BattleStatus = 
  | 'created' 
  | 'initializing' 
  | 'running' 
  | 'paused' 
  | 'completed' 
  | 'aborted' 
  | 'error';
```

---

## Capability Registry

```typescript
// packages/sdk/src/registries/capability-registry.ts
export interface CapabilityRegistry extends Registry<Capability, CapabilityId> {
  getByTier(tier: CapabilityTier): Capability[];
  getByGameId(gameId: GameId): Capability[];
  getSystemMandatory(): Capability[];
  getGameMandatory(gameId: GameId): Capability[];
  getSpecialSkills(gameId: GameId): Capability[];
  getAgentCapabilities(agentId: AgentId): Capability[];
  setAgentCapabilities(agentId: AgentId, capabilities: CapabilityId[]): void;
}

export interface CapabilityFilter extends ArtifactFilter<Capability> {
  tier?: CapabilityTier;
  gameId?: GameId;
  agentId?: AgentId;
}

export type CapabilityTier = 
  | 'system-mandatory' 
  | 'game-mandatory' 
  | 'special-skill';

export interface Capability {
  readonly id: CapabilityId;
  readonly name: string;
  readonly description: string;
  readonly tier: CapabilityTier;
  readonly gameId?: GameId;
  readonly mcpTool: McpToolDefinition;
  readonly permissions: string[];
  readonly toggleable: boolean;
  readonly defaultEnabled: boolean;
}
```

---

## Replay Registry

```typescript
// packages/sdk/src/registries/replay-registry.ts
export interface ReplayRegistry extends Registry<Replay, ReplayId> {
  getByBattleId(battleId: BattleId): Replay[];
  getByAgentId(agentId: AgentId): Replay[];
  getByDateRange(from: Date, to: Date): Replay[];
  getDeterministic(): Replay[]; // Verified deterministic replays
}

export interface ReplayFilter extends ArtifactFilter<Replay> {
  battleId?: BattleId;
  agentId?: AgentId;
  deterministic?: boolean;
  dateRange?: { from: Date; to: Date };
}

export interface Replay {
  readonly id: ReplayId;
  readonly battleId: BattleId;
  readonly events: DomainEvent[];
  readonly initialState: BattleState;
  readonly metadata: ReplayMetadata;
  readonly deterministic: boolean;
  readonly verifiedAt?: Date;
}

export interface ReplayMetadata {
  readonly recordedAt: Date;
  readonly duration: number;
  readonly turnCount: number;
  readonly agentCount: number;
  readonly seed: number;
}
```

---

## Storage Registry

```typescript
// packages/sdk/src/registries/storage-registry.ts
export interface StorageRegistry extends Registry<StorageAdapter, StorageId> {
  getDefault(): StorageAdapter | undefined;
  getByType(type: StorageType): StorageAdapter[];
  getNamespaced(namespace: string): NamespacedStorage;
}

export interface StorageFilter extends ArtifactFilter<StorageAdapter> {
  type?: StorageType;
}

export type StorageType = 
  | 'sqlite' 
  | 'postgresql' 
  | 'memory' 
  | 'filesystem' 
  | 'object-store' 
  | 'vector-db';

export interface NamespacedStorage {
  readonly namespace: string;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  query<T>(table: string, filter: QueryFilter): Promise<T[]>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}
```

---

## Registry Implementation

```typescript
// packages/core/src/registry/registry-impl.ts
export class RegistryImpl<TArtifact, TId extends string> implements Registry<TArtifact, TId> {
  private readonly artifacts = new Map<TId, TArtifact>();
  private readonly registered = new EventEmitter<TArtifact>();
  private readonly unregistered = new EventEmitter<TId>();
  private readonly cleared = new EventEmitter<void>();

  get(id: TId): TArtifact | undefined {
    return this.artifacts.get(id);
  }

  getAll(): TArtifact[] {
    return Array.from(this.artifacts.values());
  }

  has(id: TId): boolean {
    return this.artifacts.has(id);
  }

  register(artifact: TArtifact): void {
    const id = this.extractId(artifact);
    if (this.artifacts.has(id)) {
      throw new RegistryError(`Artifact ${id} already registered`);
    }
    this.artifacts.set(id, artifact);
    this.registered.emit(artifact);
  }

  unregister(id: TId): void {
    if (!this.artifacts.has(id)) return;
    this.artifacts.delete(id);
    this.unregistered.emit(id);
  }

  clear(): void {
    this.artifacts.clear();
    this.cleared.emit();
  }

  query(filter: ArtifactFilter<TArtifact>): TArtifact[] {
    let results = this.getAll();
    
    if (filter.ids) {
      const idSet = new Set(filter.ids);
      results = results.filter(a => idSet.has(this.extractId(a)));
    }
    
    if (filter.tags) {
      const tagSet = new Set(filter.tags);
      results = results.filter(a => 
        a.tags?.some(t => tagSet.has(t))
      );
    }
    
    if (filter.capabilities) {
      const capSet = new Set(filter.capabilities);
      results = results.filter(a => 
        a.capabilities?.some(c => capSet.has(c))
      );
    }

    return results;
  }

  find(predicate: (a: TArtifact) => boolean): TArtifact | undefined {
    return this.getAll().find(predicate);
  }

  get onRegistered(): Event<TArtifact> {
    return this.registered;
  }

  get onUnregistered(): Event<TId> {
    return this.unregistered;
  }

  get onCleared(): Event<void> {
    return this.cleared;
  }

  protected extractId(artifact: TArtifact): TId {
    // Default: assume artifact has `id` property
    return (artifact as any).id as TId;
  }
}
```

---

## Lazy Loading

Registries support **lazy loading** — artifacts are loaded on first access:

```typescript
// packages/core/src/registry/lazy-registry.ts
export class LazyRegistry<TArtifact, TId extends string> implements Registry<TArtifact, TId> {
  private readonly loaded = new Map<TId, TArtifact>();
  private readonly loaders = new Map<TId, () => Promise<TArtifact>>();
  private readonly registry: Registry<TArtifact, TId>;

  constructor(registry: Registry<TArtifact, TId>) {
    this.registry = registry;
  }

  registerLazy(id: TId, loader: () => Promise<TArtifact>): void {
    this.loaders.set(id, loader);
    // Register placeholder in main registry
    this.registry.register({ id } as TArtifact);
  }

  async get(id: TId): Promise<TArtifact | undefined> {
    if (this.loaded.has(id)) return this.loaded.get(id);
    
    const loader = this.loaders.get(id);
    if (!loader) return this.registry.get(id);
    
    const artifact = await loader();
    this.loaded.set(id, artifact);
    this.registry.unregister(id);
    this.registry.register(artifact);
    return artifact;
  }

  // Delegate other methods to underlying registry
  getAll(): TArtifact[] { return this.registry.getAll(); }
  has(id: TId): boolean { return this.registry.has(id) || this.loaders.has(id); }
  query(filter: ArtifactFilter<TArtifact>): TArtifact[] { return this.registry.query(filter); }
  // ... other methods delegate
}
```

**Usage:**

```typescript
// In GameManager
const gameRegistry = new LazyRegistry(container.get(Tokens.GameRegistry));

// Register lazy loader
gameRegistry.registerLazy('minecraft', async () => {
  const mod = await import('aga-game-minecraft');
  return mod.createMinecraftAdapter();
});

// First access loads the module
const minecraft = await gameRegistry.get('minecraft');
```

---

## Hot Reload Support

Registries emit events on changes for hot reload:

```typescript
// packages/core/src/registry/hot-reload.ts
export function enableRegistryHotReload<TArtifact, TId extends string>(
  registry: Registry<TArtifact, TId>,
  reloader: ArtifactReloader<TArtifact, TId>
): HotReloadHandle {
  const subscriptions: Subscription[] = [];

  subscriptions.push(
    registry.onRegistered.subscribe(async (artifact) => {
      await reloader.onArtifactRegistered(artifact);
    })
  );

  subscriptions.push(
    registry.onUnregistered.subscribe(async (id) => {
      await reloader.onArtifactUnregistered(id);
    })
  );

  return {
    dispose: () => subscriptions.forEach(s => s.unsubscribe()),
  };
}

export interface ArtifactReloader<TArtifact, TId extends string> {
  onArtifactRegistered(artifact: TArtifact): Promise<void>;
  onArtifactUnregistered(id: TId): Promise<void>;
  reloadArtifact(id: TId): Promise<TArtifact>;
}
```

---

## Forbidden Registry Patterns

| Pattern | Forbidden | Correct |
|---------|-----------|---------|
| Direct import | `import Chess from './games/chess'` | `gameRegistry.get('chess')` |
| Static arrays | `const games = [Chess, Pong]` | `gameRegistry.getAll()` |
| Global registry | `global.gameRegistry = ...` | Container-managed registry |
| Registry mutation outside manager | `registry.register(...)` in plugin | Manager-only registration |
| Sync iteration during async | `registry.getAll().forEach(async ...)` | `await Promise.all(registry.getAll().map(...))` |

---

## Testing Registries

```typescript
// packages/core/tests/registry.test.ts
describe('Registry', () => {
  let registry: Registry<TestArtifact, string>;

  beforeEach(() => {
    registry = new RegistryImpl<TestArtifact, string>();
  });

  it('registers and retrieves artifacts', () => {
    const artifact = { id: 'test-1', name: 'Test' };
    registry.register(artifact);
    
    expect(registry.get('test-1')).toEqual(artifact);
    expect(registry.has('test-1')).toBe(true);
  });

  it('emits events on registration', () => {
    const handler = vi.fn();
    registry.onRegistered.subscribe(handler);
    
    registry.register({ id: 'test-1', name: 'Test' });
    
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'test-1' })
    );
  });

  it('queries with filters', () => {
    registry.register({ id: 'a', tags: ['tag1'], capabilities: ['cap1'] });
    registry.register({ id: 'b', tags: ['tag2'], capabilities: ['cap1'] });
    registry.register({ id: 'c', tags: ['tag1'], capabilities: ['cap2'] });
    
    const results = registry.query({ tags: ['tag1'], capabilities: ['cap1'] });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('a');
  });

  it('supports lazy loading', async () => {
    const lazy = new LazyRegistry(registry);
    let loadCount = 0;
    
    lazy.registerLazy('lazy-1', async () => {
      loadCount++;
      return { id: 'lazy-1', name: 'Lazy' };
    });
    
    expect(loadCount).toBe(0);
    const artifact = await lazy.get('lazy-1');
    expect(loadCount).toBe(1);
    expect(artifact.name).toBe('Lazy');
    
    // Second call uses cache
    const artifact2 = await lazy.get('lazy-1');
    expect(loadCount).toBe(1);
    expect(artifact2).toBe(artifact);
  });
});
```