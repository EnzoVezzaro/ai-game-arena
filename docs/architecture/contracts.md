# Runtime Contracts

> Contracts are the **stable interfaces** between the runtime and artifacts. Versioned independently. Backwards compatible by default.

---

## Overview

Contracts define **what** artifacts must implement, not **how**. They are:

- **Interfaces** — TypeScript interfaces in `packages/sdk`
- **Schemas** — Zod schemas for manifest validation
- **Events** — Discriminated union types for domain events
- **Protocols** — MCP tool definitions, capability specifications

**Contracts are the API surface of the platform.**

---

## Contract Versioning

Contracts follow **independent semantic versioning**:

| Contract | Version | Stability |
|----------|---------|-----------|
| `ArenaPlugin` | 1.0.0 | Stable |
| `GameAdapter` | 1.0.0 | Stable |
| `PluginManifest` | 1.2.0 | Stable |
| `Controller` | 1.0.0 | Stable |
| `Provider` | 1.1.0 | Stable |
| `ObservationAdapter` | 1.0.0 | Stable |
| `BattleConfig` | 1.0.0 | Stable |
| `DomainEvent` | 1.3.0 | Stable |
| `McpTool` | 1.0.0 | Stable |

**Compatibility guarantees:**

- **Patch** (1.0.1): Bug fixes, internal improvements — always compatible
- **Minor** (1.1.0): New optional fields, new optional methods — backwards compatible
- **Major** (2.0.0): Breaking changes — requires migration, supported for 2 major versions

---

## Interface Contracts

### Arena Contract

```typescript
// packages/sdk/src/contracts/arena.ts
export interface ArenaPlugin {
  readonly config: ArenaConfig;
  readonly manifest: ArenaManifest;

  // Lifecycle
  initialize(seed?: number): WorldState;
  shutdown(): Promise<void>;

  // Game logic (pure functions)
  getTools(): ToolDefinition[];
  validateAction(action: AgentAction, state: WorldState): ValidationResult;
  executeAction(action: AgentAction, state: WorldState): ActionOutcome;
  getObservation(agentId: string, state: WorldState): Observation;
  checkWinCondition(state: WorldState): WinCondition | null;
  getScores(state: WorldState): Record<string, number>;

  // Rendering
  getRenderState(state: WorldState): RenderState;

  // Optional: custom UI contributions
  getUiContributions?(): ArenaUiContribution[];
}

export interface ArenaConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly capabilities: string[];
  readonly mandatoryCapabilities: string[];
}

export interface ArenaManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly type: 'arena';
  readonly category: ArenaCategory;
  readonly dependencies: Record<string, string>;
  readonly capabilities: string[];
  readonly display?: ArenaDisplayConfig;
}

export type ArenaCategory = 'competitive' | 'cooperative' | 'simulation' | 'sandbox' | 'educational';

export interface ArenaDisplayConfig {
  readonly arena: {
    readonly plugins: string[];
    readonly game: string;
    readonly defaultStrategies: string[];
    readonly mandatoryCapabilities: string[];
    readonly ui: UiElementConfig[];
  };
}

export interface UiElementConfig {
  readonly id: string;
  readonly type: UiElementType;
  readonly component: string;
  readonly label: string;
  readonly position: UiPosition;
  readonly props?: Record<string, unknown>;
}

export type UiElementType = 
  | 'panel' 
  | 'sidebar' 
  | 'event-log' 
  | 'chat' 
  | 'scoreboard' 
  | 'header' 
  | 'footer' 
  | 'overlay' 
  | 'custom';

export type UiPosition = 'center' | 'left' | 'right' | 'top' | 'bottom' | 'overlay';
```

### Game Adapter Contract

```typescript
// packages/sdk/src/contracts/game.ts
export interface GameAdapter {
  readonly manifest: GameManifest;

  // Lifecycle
  initialize(config: GameConfig): Promise<void>;
  launch(): Promise<GameProcess>;
  attachController(adapter: ControllerAdapter): Promise<void>;
  attachObservation(adapter: ObservationAdapter): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  suspend(): Promise<void>;
  resume(): Promise<void>;
  dispose(): Promise<void>;

  // Metadata
  getMetadata(): GameMetadata;
  getCapabilities(): GameCapability[];
}

export interface GameManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly type: 'game';
  readonly adapterType: 'native' | 'browser' | 'wasm' | 'remote';
  readonly launchConfig: LaunchConfig;
  readonly controllerInterface: ControllerInterfaceSpec;
  readonly observationInterface: ObservationInterfaceSpec;
  readonly dependencies: Record<string, string>;
}

export interface LaunchConfig {
  readonly command: string;
  readonly args: string[];
  readonly env?: Record<string, string>;
  readonly workingDirectory?: string;
  readonly ports?: PortMapping[];
}

export interface PortMapping {
  readonly name: string;
  readonly internal: number;
  readonly external?: number;
  readonly protocol: 'tcp' | 'websocket' | 'stdio';
}

export interface ControllerInterfaceSpec {
  readonly type: 'mcp' | 'websocket' | 'stdio' | 'custom';
  readonly capabilities: string[];
}

export interface ObservationInterfaceSpec {
  readonly types: ObservationType[];
  readonly transport: 'websocket' | 'stdio' | 'shared-memory' | 'custom';
}
```

### Plugin Contract

```typescript
// packages/sdk/src/contracts/plugin.ts
export interface Plugin {
  readonly manifest: PluginManifest;

  // Lifecycle
  activate(context: PluginContext): Promise<void>;
  deactivate(): Promise<void>;

  // Optional: contribution factories (for lazy contribution loading)
  createMcpTools?(): McpTool[];
  createEventHandlers?(): EventHandler[];
  createUiPanels?(): UiPanelContribution[];
  createServerRoutes?(): ServerRoute[];
  createCliCommands?(): CliCommand[];
}

export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly category: PluginCategory;
  readonly author?: string;
  readonly license?: string;
  readonly engines: { aga: string };
  readonly entry: string;
  readonly activation: PluginActivation;
  readonly contributions: PluginContributions;
  readonly dependencies: Record<string, string>;
  readonly permissions: string[];
}

export type PluginCategory = 
  | 'arena' 
  | 'interaction' 
  | 'exporter' 
  | 'agent' 
  | 'visualization' 
  | 'metric' 
  | 'storage' 
  | 'controller' 
  | 'provider' 
  | 'observation';

export interface PluginActivation {
  readonly startup: boolean;
  readonly events?: string[];
  readonly conditions?: ActivationCondition[];
}

export interface ActivationCondition {
  readonly type: 'arena' | 'game' | 'capability' | 'config';
  readonly value: string | string[];
}

export interface PluginContributions {
  readonly mcpTools?: string[]; // Tool IDs from plugin's tool definitions
  readonly eventHandlers?: string[]; // Event types
  readonly uiPanels?: UiPanelContribution[];
  readonly serverRoutes?: ServerRoute[];
  readonly cliCommands?: CliCommand[];
  readonly dashboardWidgets?: DashboardWidget[];
  readonly navigationItems?: NavigationItem[];
  readonly contextMenus?: Record<string, ContextMenuItem[]>;
  readonly storage?: StorageContribution[];
}
```

### Controller Contract

```typescript
// packages/sdk/src/contracts/controller.ts
export interface Controller {
  readonly manifest: ControllerManifest;

  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;

  // Device management
  registerDevice(device: InputDevice): void;
  unregisterDevice(deviceId: DeviceId): void;
  getDevice(deviceId: DeviceId): InputDevice | undefined;
  getAllDevices(): InputDevice[];

  // MCP
  getMcpServer(): McpServer;
  connectAgent(agentId: AgentId, session: MCPSession): Promise<void>;
  disconnectAgent(agentId: AgentId): Promise<void>;

  // Execution
  execute(action: ControllerAction): Promise<ActionResult>;
  executeBatch(actions: ControllerAction[]): Promise<ActionResult[]>;

  // Capabilities
  getCapabilities(): Capability[];
  getCapabilitiesForAgent(agentId: AgentId): Capability[];
}

export interface ControllerManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly type: 'controller';
  readonly devices: DeviceManifest[];
  readonly platformAdapters: PlatformAdapterManifest[];
  readonly middleware: MiddlewareManifest[];
}

export interface DeviceManifest {
  readonly id: string;
  readonly type: DeviceType;
  readonly capabilities: string[];
  readonly configSchema: ZodSchema;
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

export interface PlatformAdapterManifest {
  readonly platform: Platform;
  readonly entry: string;
  readonly capabilities: string[];
}

export type Platform = 'desktop' | 'browser' | 'terminal' | 'wasm' | 'remote';

export interface MiddlewareManifest {
  readonly name: string;
  readonly type: 'permissions' | 'recording' | 'replay' | 'latency' | 'logging' | 'custom';
  readonly config?: Record<string, unknown>;
}
```

### Provider Contract

```typescript
// packages/sdk/src/contracts/provider.ts
export interface Provider {
  readonly manifest: ProviderManifest;

  // Authentication
  authenticate(config: AuthConfig): Promise<AuthResult>;
  validateAuth(config: AuthConfig): Promise<boolean>;
  refreshAuth(config: AuthConfig): Promise<AuthResult>;

  // Completion
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  streamComplete(request: CompletionRequest): AsyncIterable<CompletionChunk>;

  // Models
  getModels(): Model[];
  getModel(modelId: string): Model | undefined;
  supportsModel(modelId: string): boolean;

  // Capabilities
  getCapabilities(): ProviderCapability[];
  supportsCapability(cap: ProviderCapability): boolean;

  // Costs
  estimateCost(request: CompletionRequest): CostEstimate;
  getUsage(): UsageStats;
}

export interface ProviderManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly type: 'provider';
  readonly category: 'local' | 'cloud' | 'hybrid';
  readonly models: ModelManifest[];
  readonly auth: AuthManifest;
  readonly capabilities: ProviderCapability[];
  readonly pricing?: PricingManifest;
}

export interface ModelManifest {
  readonly id: string;
  readonly name: string;
  readonly contextWindow: number;
  readonly maxOutputTokens: number;
  readonly capabilities: ProviderCapability[];
  readonly pricing?: ModelPricing;
}

export type ProviderCapability = 
  | 'chat' 
  | 'completion' 
  | 'embedding' 
  | 'vision' 
  | 'audio' 
  | 'function-calling' 
  | 'reasoning' 
  | 'streaming' 
  | 'json-mode' 
  | 'parallel-tools';

export interface AuthManifest {
  readonly type: 'api-key' | 'oauth' | 'bearer' | 'none' | 'local';
  readonly fields: AuthField[];
  readonly refreshable: boolean;
}

export interface AuthField {
  readonly name: string;
  readonly label: string;
  readonly type: 'text' | 'password' | 'url' | 'file';
  readonly required: boolean;
  readonly description?: string;
}
```

### Observation Contract

```typescript
// packages/sdk/src/contracts/observation.ts
export interface ObservationAdapter {
  readonly manifest: ObservationManifest;

  // Capture
  capture(gameState: GameState, agentId: AgentId): Observation;
  captureAsync(gameState: GameState, agentId: AgentId): Promise<Observation>;

  // Metadata
  getAvailableTypes(): ObservationType[];
  getType(type: ObservationType): ObservationTypeInfo | undefined;

  // Configuration
  configure(config: ObservationConfig): void;
  getConfig(): ObservationConfig;
}

export interface ObservationManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly type: 'observation';
  readonly observationTypes: ObservationTypeManifest[];
  readonly pipeline: PipelineManifest;
}

export interface ObservationTypeManifest {
  readonly type: ObservationType;
  readonly name: string;
  readonly description: string;
  readonly mimeType?: string;
  readonly schema?: ZodSchema;
  readonly configSchema?: ZodSchema;
}

export interface PipelineManifest {
  readonly stages: PipelineStageManifest[];
}

export interface PipelineStageManifest {
  readonly id: string;
  readonly type: 'filter' | 'transform' | 'enrich' | 'compress';
  readonly config?: Record<string, unknown>;
}

export type ObservationType = 
  | 'screenshot' 
  | 'accessibility-tree' 
  | 'dom' 
  | 'board-state' 
  | 'metadata' 
  | 'semantic' 
  | 'custom';

export interface Observation {
  readonly timestamp: number;
  readonly agentId: string;
  readonly type: ObservationType;
  readonly data: ObservationData;
  readonly metadata: ObservationMetadata;
}

export type ObservationData = 
  | ScreenshotData 
  | AccessibilityTreeData 
  | DomData 
  | BoardStateData 
  | MetadataData 
  | SemanticData 
  | CustomData;

export interface ObservationMetadata {
  readonly captureDurationMs: number;
  readonly source: string;
  readonly version: string;
  readonly filtersApplied: string[];
  readonly transformsApplied: string[];
}
```

### Profile Contract

```typescript
// packages/sdk/src/contracts/profile.ts
export interface AgentProfile {
  readonly id: ProfileId;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly providerId: ProviderId;
  readonly modelId: string;
  readonly strategy: Strategy;
  readonly customStrategy?: string;
  readonly capabilities: CapabilitySelection;
  readonly memory: MemoryConfig;
  readonly personality: PersonalityConfig;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type Strategy = 
  | 'aggressive' 
  | 'defensive' 
  | 'scout' 
  | 'balanced' 
  | 'custom';

export interface CapabilitySelection {
  readonly systemMandatory: boolean; // Always included
  readonly gameMandatory: boolean;   // From arena manifest
  readonly specialSkills: string[];  // Selected from available
}

export interface MemoryConfig {
  readonly shortTerm: ShortTermMemoryConfig;
  readonly longTerm: LongTermMemoryConfig;
  readonly social: SocialMemoryConfig;
  readonly strategic: StrategicMemoryConfig;
}

export interface ShortTermMemoryConfig {
  readonly enabled: boolean;
  readonly maxTurns: number;
  readonly maxTokens: number;
  readonly includeObservations: boolean;
  readonly includeActions: boolean;
  readonly includeReasoning: boolean;
}

export interface LongTermMemoryConfig {
  readonly enabled: boolean;
  readonly storage: 'vector' | 'keyword' | 'hybrid';
  readonly maxEntries: number;
  readonly retentionDays: number;
  readonly importanceThreshold: number;
}

export interface SocialMemoryConfig {
  readonly enabled: boolean;
  readonly trackAgents: boolean;
  readonly trackRelationships: boolean;
  readonly maxAgents: number;
}

export interface StrategicMemoryConfig {
  readonly enabled: boolean;
  readonly trackPatterns: boolean;
  readonly trackOutcomes: boolean;
  readonly maxPatterns: number;
}

export interface PersonalityConfig {
  readonly traits: Record<string, number>; // -1 to 1
  readonly communicationStyle: CommunicationStyle;
  readonly riskTolerance: number; // 0 to 1
  readonly cooperationLevel: number; // 0 to 1
}

export type CommunicationStyle = 
  | 'concise' 
  | 'verbose' 
  | 'analytical' 
  | 'intuitive' 
  | 'aggressive' 
  | 'diplomatic';
```

---

## Manifest Schemas

All manifests use **Zod schemas** for validation:

```typescript
// packages/sdk/src/schemas/manifests.ts
import { z } from 'zod';

export const ArenaManifestSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(1000),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  type: z.literal('arena'),
  category: z.enum(['competitive', 'cooperative', 'simulation', 'sandbox', 'educational']),
  dependencies: z.record(z.string()).default({}),
  capabilities: z.array(z.string()).default([]),
  display: z.object({
    arena: z.object({
      plugins: z.array(z.string()).default([]),
      game: z.string(),
      defaultStrategies: z.array(z.string()).default([]),
      mandatoryCapabilities: z.array(z.string()).default([]),
      ui: z.array(z.object({
        id: z.string(),
        type: z.enum(['panel', 'sidebar', 'event-log', 'chat', 'scoreboard', 'header', 'footer', 'overlay', 'custom']),
        component: z.string(),
        label: z.string(),
        position: z.enum(['center', 'left', 'right', 'top', 'bottom', 'overlay']),
        props: z.record(z.unknown()).optional(),
      })).default([]),
    }),
  }).optional(),
});

export const GameManifestSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  type: z.literal('game'),
  adapterType: z.enum(['native', 'browser', 'wasm', 'remote']),
  launchConfig: z.object({
    command: z.string(),
    args: z.array(z.string()).default([]),
    env: z.record(z.string()).optional(),
    workingDirectory: z.string().optional(),
    ports: z.array(z.object({
      name: z.string(),
      internal: z.number(),
      external: z.number().optional(),
      protocol: z.enum(['tcp', 'websocket', 'stdio']),
    })).default([]),
  }),
  controllerInterface: z.object({
    type: z.enum(['mcp', 'websocket', 'stdio', 'custom']),
    capabilities: z.array(z.string()).default([]),
  }),
  observationInterface: z.object({
    types: z.array(z.enum(['screenshot', 'accessibility-tree', 'dom', 'board-state', 'metadata', 'semantic', 'custom'])).default([]),
    transport: z.enum(['websocket', 'stdio', 'shared-memory', 'custom']),
  }),
  dependencies: z.record(z.string()).default({}),
});

export const PluginManifestSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(1000),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  category: z.enum(['arena', 'interaction', 'exporter', 'agent', 'visualization', 'metric', 'storage', 'controller', 'provider', 'observation']),
  author: z.string().optional(),
  license: z.string().optional(),
  engines: z.object({ aga: z.string() }),
  entry: z.string(),
  activation: z.object({
    startup: z.boolean().default(false),
    events: z.array(z.string()).optional(),
    conditions: z.array(z.object({
      type: z.enum(['arena', 'game', 'capability', 'config']),
      value: z.union([z.string(), z.array(z.string())]),
    })).optional(),
  }).default({ startup: false }),
  contributions: z.object({
    mcpTools: z.array(z.string()).optional(),
    eventHandlers: z.array(z.string()).optional(),
    uiPanels: z.array(z.object({
      id: z.string(),
      component: z.string(),
      label: z.string(),
      position: z.enum(['center', 'left', 'right', 'top', 'bottom', 'overlay']),
      type: z.enum(['panel', 'sidebar', 'event-log', 'chat', 'scoreboard', 'header', 'footer', 'overlay', 'custom']),
    })).optional(),
    serverRoutes: z.array(z.string()).optional(),
    cliCommands: z.array(z.string()).optional(),
    dashboardWidgets: z.array(z.object({
      id: z.string(),
      component: z.string(),
      label: z.string(),
    })).optional(),
    navigationItems: z.array(z.object({
      id: z.string(),
      label: z.string(),
      path: z.string(),
      icon: z.string().optional(),
    })).optional(),
    contextMenus: z.record(z.array(z.object({
      command: z.string(),
      label: z.string(),
    }))).optional(),
    storage: z.array(z.string()).optional(),
  }).default({}),
  dependencies: z.record(z.string()).default({}),
  permissions: z.array(z.string()).default([]),
});

// ... similar schemas for Controller, Provider, Profile, Observation
```

---

## Domain Event Contracts

```typescript
// packages/sdk/src/schemas/events.ts
export const DomainEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('BattleCreated'),
    aggregateId: z.string(),
    timestamp: z.date(),
    version: z.number(),
    payload: z.object({
      config: BattleConfigSchema,
    }),
    metadata: EventMetadataSchema,
  }),
  z.object({
    type: z.literal('BattleStarted'),
    aggregateId: z.string(),
    timestamp: z.date(),
    version: z.number(),
    payload: z.object({}),
    metadata: EventMetadataSchema,
  }),
  z.object({
    type: z.literal('BattleFinished'),
    aggregateId: z.string(),
    timestamp: z.date(),
    version: z.number(),
    payload: z.object({
      winner: z.string().optional(),
      reason: z.string(),
    }),
    metadata: EventMetadataSchema,
  }),
  z.object({
    type: z.literal('ActionExecuted'),
    aggregateId: z.string(),
    timestamp: z.date(),
    version: z.number(),
    payload: z.object({
      agentId: z.string(),
      action: AgentActionSchema,
      outcome: ActionOutcomeSchema,
    }),
    metadata: EventMetadataSchema,
  }),
  z.object({
    type: z.literal('ObservationCaptured'),
    aggregateId: z.string(),
    timestamp: z.date(),
    version: z.number(),
    payload: z.object({
      agentId: z.string(),
      observation: ObservationSchema,
    }),
    metadata: EventMetadataSchema,
  }),
  // ... all event types
]);

export const EventMetadataSchema = z.object({
  correlationId: z.string(),
  causationId: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  source: z.string(),
});
```

---

## MCP Tool Contracts

```typescript
// packages/sdk/src/schemas/mcp.ts
export const McpToolSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  inputSchema: z.object({
    type: z.literal('object'),
    properties: z.record(z.unknown()),
    required: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
    type: z.literal('object'),
    properties: z.record(z.unknown()),
  }).optional(),
  annotations: z.object({
    title: z.string().optional(),
    readOnly: z.boolean().optional(),
    destructive: z.boolean().optional(),
    idempotent: z.boolean().optional(),
  }).optional(),
});

export type McpTool = z.infer<typeof McpToolSchema>;

// Built-in system tools
export const SYSTEM_MANDATORY_TOOLS: McpTool[] = [
  {
    name: 'observe',
    description: 'Perceive the current environment state',
    inputSchema: { type: 'object', properties: {}, required: [] },
    outputSchema: { type: 'object', properties: { observation: ObservationSchema } },
    annotations: { readOnly: true },
  },
  {
    name: 'communicate',
    description: 'Send a message to other agents or spectators',
    inputSchema: {
      type: 'object',
      properties: {
        recipients: { type: 'array', items: { type: 'string' } },
        message: { type: 'string' },
        type: { type: 'string', enum: ['broadcast', 'direct', 'team'] },
      },
      required: ['message'],
    },
    annotations: { destructive: false },
  },
  {
    name: 'pass',
    description: 'Pass turn without taking action',
    inputSchema: { type: 'object', properties: {}, required: [] },
    annotations: { readOnly: true },
  },
  {
    name: 'yield',
    description: 'Yield remaining time in turn',
    inputSchema: { type: 'object', properties: {}, required: [] },
    annotations: { readOnly: true },
  },
];
```

---

## Contract Testing

```typescript
// packages/sdk/tests/contracts.test.ts
describe('Contract Compatibility', () => {
  it('ArenaPlugin v1.0.0 accepts v1.0.0 manifests', () => {
    const manifest = createArenaManifestV1();
    const result = ArenaManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('ArenaPlugin v1.1.0 accepts v1.0.0 manifests (backwards compatible)', () => {
    const manifest = createArenaManifestV1(); // missing new optional field
    const result = ArenaManifestSchemaV11.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('ArenaPlugin v2.0.0 rejects v1.0.0 manifests (breaking change)', () => {
    const manifest = createArenaManifestV1(); // missing required field
    const result = ArenaManifestSchemaV20.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('DomainEvent discriminated union is exhaustive', () => {
    type EventType = DomainEvent['type'];
    const allTypes: EventType[] = [
      'BattleCreated', 'BattleStarted', 'BattleFinished',
      'ActionExecuted', 'ObservationCaptured', // ...
    ];
    
    // Compile-time check: all event types handled
    const handler = (event: DomainEvent) => {
      switch (event.type) {
        case 'BattleCreated': return handleCreated(event);
        case 'BattleStarted': return handleStarted(event);
        // ... all cases required by TypeScript
      }
    };
  });
});
```

---

## Contract Evolution Rules

| Change | Version Bump | Example |
|--------|--------------|---------|
| Add optional field | Minor | `description?: string` |
| Add optional method | Minor | `getExtraInfo?(): Info` |
| Add new event type | Minor | `PluginInstalled` event |
| Add new enum value | Minor | `UiPosition: 'floating'` |
| Remove field | **Major** | Delete `deprecatedField` |
| Rename field | **Major** | `id` → `identifier` |
| Change field type | **Major** | `string` → `number` |
| Make optional required | **Major** | `name?: string` → `name: string` |
| Remove method | **Major** | Delete `legacyMethod()` |
| Change method signature | **Major** | `(a: string) => void` → `(a: number) => void` |

---

## Migration Utilities

```typescript
// packages/sdk/src/migrations/migrations.ts
export interface ManifestMigration {
  fromVersion: string;
  toVersion: string;
  migrate(manifest: unknown): unknown;
}

export const MANIFEST_MIGRATIONS: ManifestMigration[] = [
  {
    fromVersion: '1.0.0',
    toVersion: '1.1.0',
    migrate: (manifest: any) => ({
      ...manifest,
      display: manifest.display || { arena: { plugins: [], game: '', defaultStrategies: [], mandatoryCapabilities: [], ui: [] }},
    }),
  },
  {
    fromVersion: '1.1.0',
    toVersion: '1.2.0',
    migrate: (manifest: any) => ({
      ...manifest,
      activation: manifest.activation || { startup: false },
      contributions: manifest.contributions || {},
    }),
  },
];

export function migrateManifest(
  manifest: unknown,
  targetVersion: string
): unknown {
  let current = manifest;
  for (const migration of MANIFEST_MIGRATIONS) {
    if (semver.lt(migration.fromVersion, targetVersion)) {
      current = migration.migrate(current);
    }
  }
  return current;
}
```

---

## Forbidden Contract Patterns

| Pattern | Forbidden | Correct |
|---------|-----------|---------|
| Breaking changes in patch | `1.0.0` → `1.0.1` removes field | Major version bump |
| Optional becoming required | `name?: string` → `name: string` in minor | Major version bump |
| Interface mutation | Adding required method to `ArenaPlugin` | New interface `ArenaPluginV2` |
| Schema without version | `z.object({...})` without version field | Include `version` in all manifests |
| Untyped event payloads | `payload: any` | Discriminated union with Zod |
| Circular contract deps | `ArenaPlugin` imports `GameAdapter` | Shared types in `sdk/contracts` |