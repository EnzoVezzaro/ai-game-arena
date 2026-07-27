# Runtime Architecture

> The runtime kernel — the operating system kernel for AI environments.

---

## Overview

The Runtime is the **kernel** of the platform. It is a minimal, stable core that:

- Owns the process lifecycle
- Provides dependency injection
- Manages the event bus
- Owns the composition root
- Coordinates manager lifecycle
- Provides configuration, logging, diagnostics

**The Runtime knows nothing about games, arenas, agents, or AI.** It only knows about managers, services, and contracts.

---

## Responsibilities

| Responsibility | Description |
|----------------|-------------|
| **Lifecycle Management** | Startup, shutdown, health checks, graceful degradation |
| **Dependency Injection** | Manual composition root, explicit wiring, no DI container magic |
| **Event Bus** | In-process typed event bus with correlation IDs |
| **Service Registry** | Named service lookup, registration, resolution |
| **Configuration** | Layered config: defaults → file → env → runtime overrides |
| **Logging** | Structured logging with levels, contexts, correlation IDs |
| **Diagnostics** | Health checks, event loop lag, memory monitoring |

---

## Runtime Interface

```typescript
// packages/sdk/src/runtime/runtime.ts
export interface Runtime {
  readonly id: RuntimeId;
  readonly state: RuntimeState;
  readonly config: Config;
  readonly eventBus: EventBus;
  readonly serviceRegistry: ServiceRegistry;
  readonly logger: Logger;
  readonly diagnostics: Diagnostics;

  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  healthCheck(): Promise<HealthReport>;
}

export type RuntimeState = 
  | 'uninitialized'
  | 'initializing'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'error';
```

---

## Composition Root

The composition root is **explicit, manual, and debuggable**. No decorators, no reflection, no magic.

```typescript
// packages/core/src/composition.ts
export function createRuntimeContainer(config: Config): Container {
  const container = new Container();

  // 1. Core infrastructure (singletons)
  container.registerSingleton(Tokens.EventBus, () => createEventBus());
  container.registerSingleton(Tokens.Config, () => config);
  container.registerSingleton(Tokens.Logger, () => createLogger(config));
  container.registerSingleton(Tokens.Diagnostics, () => createDiagnostics(container));
  container.registerSingleton(Tokens.ServiceRegistry, () => createServiceRegistry());

  // 2. Storage layer
  container.registerSingleton(Tokens.Storage, () => createStorage(config.storage));

  // 3. Plugin system
  container.registerSingleton(Tokens.PluginManager, () => 
    createPluginManager(container)
  );

  // 4. Runtime managers (created after plugin manager for contribution registration)
  container.registerSingleton(Tokens.ArenaManager, () => 
    createArenaManager(container)
  );
  container.registerSingleton(Tokens.GameManager, () => 
    createGameManager(container)
  );
  container.registerSingleton(Tokens.ControllerManager, () => 
    createControllerManager(container)
  );
  container.registerSingleton(Tokens.ProviderManager, () => 
    createProviderManager(container)
  );
  container.registerSingleton(Tokens.ProfileManager, () => 
    createProfileManager(container)
  );
  container.registerSingleton(Tokens.ObservationManager, () => 
    createObservationManager(container)
  );
  container.registerSingleton(Tokens.BattleManager, () => 
    createBattleManager(container)
  );
  container.registerSingleton(Tokens.CapabilityManager, () => 
    createCapabilityManager(container)
  );
  container.registerSingleton(Tokens.ReplayManager, () => 
    createReplayManager(container)
  );
  container.registerSingleton(Tokens.StorageManager, () => 
    createStorageManager(container)
  );

  // 5. Core runtime
  container.registerSingleton(Tokens.Runtime, () => 
    createRuntime(container)
  );

  return container;
}
```

---

## Service Tokens

All services are registered and resolved by **symbol tokens** — no string keys, no collisions.

```typescript
// packages/core/src/tokens.ts
export const Tokens = {
  // Core
  EventBus: Symbol.for('runtime.EventBus'),
  Config: Symbol.for('runtime.Config'),
  Logger: Symbol.for('runtime.Logger'),
  Diagnostics: Symbol.for('runtime.Diagnostics'),
  ServiceRegistry: Symbol.for('runtime.ServiceRegistry'),
  Storage: Symbol.for('runtime.Storage'),

  // Managers
  PluginManager: Symbol.for('runtime.PluginManager'),
  ArenaManager: Symbol.for('runtime.ArenaManager'),
  GameManager: Symbol.for('runtime.GameManager'),
  ControllerManager: Symbol.for('runtime.ControllerManager'),
  ProviderManager: Symbol.for('runtime.ProviderManager'),
  ProfileManager: Symbol.for('runtime.ProfileManager'),
  ObservationManager: Symbol.for('runtime.ObservationManager'),
  BattleManager: Symbol.for('runtime.BattleManager'),
  CapabilityManager: Symbol.for('runtime.CapabilityManager'),
  ReplayManager: Symbol.for('runtime.ReplayManager'),
  StorageManager: Symbol.for('runtime.StorageManager'),

  // Runtime
  Runtime: Symbol.for('runtime.Runtime'),
} as const;

export type TokenKey = keyof typeof Tokens;
export type TokenValue = typeof Tokens[TokenKey];
```

---

## Event Bus

The event bus is the **nervous system** of the runtime.

```typescript
// packages/sdk/src/events/event-bus.ts
export interface EventBus {
  publish<T extends DomainEvent>(event: T): void;
  subscribe<T extends DomainEvent>(
    eventType: T['type'],
    handler: EventHandler<T>
  ): Subscription;
  subscribeAll(handler: EventHandler<DomainEvent>): Subscription;
}

export interface EventHandler<T extends DomainEvent> {
  (event: T): Promise<void> | void;
}

export interface Subscription {
  unsubscribe(): void;
}

export interface DomainEvent {
  type: string;
  aggregateId: string;
  timestamp: Date;
  version: number;
  payload: unknown;
  metadata: EventMetadata;
}

export interface EventMetadata {
  correlationId: string;
  causationId?: string;
  userId?: string;
  sessionId?: string;
  source: string;
}
```

**Design decisions:**

| Decision | Rationale |
|----------|-----------|
| In-process only | Zero latency, no serialization overhead, debuggable |
| Typed discriminated unions | Type-safe handlers, exhaustive matching |
| Correlation IDs | Distributed tracing, causality chains |
| Sync publish, async handlers | Deterministic ordering, non-blocking publishers |

---

## Configuration

Configuration is **layered** with clear precedence:

```
Defaults (code)
    ↓
Config File (aga.config.json)
    ↓
Environment Variables (AGA_*)
    ↓
Runtime Overrides (API, CLI)
```

```typescript
// packages/sdk/src/config/config.ts
export interface Config {
  readonly runtime: RuntimeConfig;
  readonly storage: StorageConfig;
  readonly plugin: PluginConfig;
  readonly battle: BattleConfig;
  readonly frontend: FrontendConfig;
  readonly logging: LoggingConfig;
  readonly diagnostics: DiagnosticsConfig;
}

export interface RuntimeConfig {
  readonly dataDir: string;
  readonly pluginsDir: string;
  readonly gamesDir: string;
  readonly arenasDir: string;
  readonly tempDir: string;
  readonly maxConcurrentBattles: number;
  readonly battleTimeout: number;
  readonly enableHotReload: boolean;
}
```

---

## Lifecycle

```
┌─────────────┐
│ Uninitialized │
└──────┬──────┘
       │ initialize()
       ▼
┌──────────────┐
│ Initializing │ ──► Load config
│              │ ──► Initialize storage
│              │ ──► Create event bus
│              │ ──► Register core services
│              │ ──► Discover plugins
│              │ ──► Validate manifests
│              │ ──► Resolve dependencies
│              │ ──► Register contributions
└──────┬───────┘
       │ start()
       ▼
┌─────────┐
│ Running │ ──► Activate startup plugins
│         │ ──► Start managers
│         │ ──► Start diagnostics
└────┬────┘
     │ stop()
     ▼
┌──────────┐
│ Stopping │ ──► Stop accepting new battles
│          │ ──► Graceful battle shutdown
│          │ ──► Deactivate plugins
│          │ ──► Close storage
│          │ ──► Stop diagnostics
└────┬─────┘
     │ cleanup()
     ▼
┌─────────┐
│ Stopped │
└─────────┘
```

---

## Manager Coordination

The Runtime **does not** coordinate managers directly. Coordination happens through:

1. **Registries** — Query for capabilities
2. **Events** — React to lifecycle changes
3. **Contracts** — Request operations through interfaces

```typescript
// packages/runtime/src/runtime.ts
export class RuntimeImpl implements Runtime {
  constructor(
    private readonly container: Container,
    private readonly config: Config,
    private readonly eventBus: EventBus,
    private readonly serviceRegistry: ServiceRegistry,
    private readonly logger: Logger,
    private readonly diagnostics: Diagnostics
  ) {}

  async initialize(): Promise<void> {
    this.state = 'initializing';
    
    // Initialize storage first
    const storage = this.container.get(Tokens.Storage);
    await storage.initialize();

    // Initialize plugin manager (discovers all artifacts)
    const pluginManager = this.container.get(Tokens.PluginManager);
    await pluginManager.discover();
    await pluginManager.validate();
    await pluginManager.resolveDependencies();
    await pluginManager.registerContributions();

    // Initialize all managers (they query plugin registry for artifacts)
    await this.initializeManagers();

    this.state = 'initialized';
    this.eventBus.publish({ type: 'RuntimeInitialized', ... });
  }

  async start(): Promise<void> {
    this.state = 'starting';
    
    // Activate startup plugins
    const pluginManager = this.container.get(Tokens.PluginManager);
    await pluginManager.activateStartupPlugins();

    // Start all managers
    await this.startManagers();

    this.state = 'running';
    this.diagnostics.start();
    this.eventBus.publish({ type: 'RuntimeStarted', ... });
  }

  async stop(): Promise<void> {
    this.state = 'stopping';
    this.diagnostics.stop();
    
    // Stop managers in reverse dependency order
    await this.stopManagers();
    
    // Deactivate plugins
    const pluginManager = this.container.get(Tokens.PluginManager);
    await pluginManager.deactivateAll();

    // Close storage
    const storage = this.container.get(Tokens.Storage);
    await storage.close();

    this.state = 'stopped';
    this.eventBus.publish({ type: 'RuntimeStopped', ... });
  }
}
```

---

## Hot Reload

The runtime supports **hot reload** for development:

```typescript
// packages/core/src/hot-reload.ts
export interface HotReloadConfig {
  enabled: boolean;
  watchPaths: string[];
  debounceMs: number;
  onReload: (changedArtifacts: Artifact[]) => Promise<void>;
}

export async function enableHotReload(
  runtime: Runtime,
  config: HotReloadConfig
): Promise<HotReloadHandle> {
  if (!config.enabled) return { dispose: () => {} };

  const watcher = createFileWatcher(config.watchPaths);
  
  let debounceTimer: NodeJS.Timeout;
  watcher.on('change', (path) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const changed = await detectChangedArtifacts(path);
      await config.onReload(changed);
    }, config.debounceMs);
  });

  return {
    dispose: () => watcher.close()
  };
}
```

**Hot reload flow:**

1. File watcher detects manifest or code change
2. Debounce to batch changes
3. Re-discover only affected artifact directories
4. Re-validate manifests
5. Hot-swap contributions in registries
6. Notify managers of capability changes
7. Emit `ArtifactsReloaded` event

---

## Diagnostics

```typescript
// packages/sdk/src/diagnostics/diagnostics.ts
export interface Diagnostics {
  readonly healthChecks: ReadonlyArray<HealthCheck>;
  readonly metrics: MetricsCollector;
  readonly eventLoopLag: EventLoopLagMonitor;
  readonly memory: MemoryMonitor;

  start(): void;
  stop(): void;
  getHealthReport(): Promise<HealthReport>;
}

export interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, HealthCheckResult>;
  metrics: RuntimeMetrics;
  timestamp: Date;
}

export interface RuntimeMetrics {
  uptimeMs: number;
  eventLoopLagMs: number;
  memoryUsageMb: number;
  heapUsedMb: number;
  activeBattles: number;
  loadedPlugins: number;
  registeredArenas: number;
  registeredGames: number;
}
```

---

## Forbidden in Runtime

| Pattern | Reason |
|---------|--------|
| Importing game/arena/plugin code | Runtime is domain-agnostic |
| Game logic in core | Violates bounded contexts |
| Direct manager-to-manager calls | Use registries/events |
| Global singletons (except tokens) | Testability, isolation |
| Async initialization in constructors | Explicit lifecycle control |

---

## Versioning

Runtime version follows **semantic versioning** with stability guarantees:

| Version | Stability |
|---------|-----------|
| `1.x.x` | Stable — breaking changes only in major |
| `0.x.x` | Experimental — breaking changes in minor |

Contracts (interfaces, events, manifests) follow **independent versioning** — see [Contracts](contracts.md).