# SDK Reference

> Complete API reference for building on the AI Game Arena platform.

---

## Core Packages

| Package | Description | Stability |
|---------|-------------|-----------|
| `@aga/sdk` | Public API - types, schemas, contracts | Stable |
| `@aga/core` | Runtime kernel, DI, event bus | Internal |
| `@aga/runtime` | Battle orchestration | Internal |
| `@aga/plugin-manager` | Plugin discovery, validation, lifecycle | Internal |
| `@aga/controller` | Virtual input devices, MCP server | Internal |
| `@aga/observation` | Perception pipeline | Internal |
| `@aga/agent-runtime` | AI agent execution | Internal |
| `@aga/storage` | Persistence abstraction | Internal |
| `@aga/mcp` | Model Context Protocol implementation | Internal |

---

## @aga/sdk - Public API

### Types

```typescript
// Identifiers
import type { 
  EntityId, AgentId, BattleId, ArenaId, GameId, 
  PluginId, ControllerId, ProviderId, ProfileId,
  CapabilityId, ReplayId, SessionId 
} from '@aga/sdk';

// Battle
import type { 
  BattleConfig, BattleState, BattlePhase, AgentConfig, 
  MatchConfig, Strategy, BattleMetadata 
} from '@aga/sdk';

// Arena';

Arena types
import type { 
  ArenaConfig, ArenaCategory, ArenaUiConfig, UiElementConfig,
  UiElementType, UiPosition, ArenaSettings, ArenaManifest
} from '@aga/sdk';

// Game
import type { 
  GameManifest, GameAdapter, GameConfig, GameProcess,
  LaunchConfig, AdapterType, PortMapping
} from '@aga/sdk';

// Agent
import type { 
  AgentProfile, CapabilitySelection, MemoryConfig,
  ShortTermMemoryConfig, PersonalityConfig,
  CommunicationStyle 
} from '@aga/sdk';

// Controller
import type { 
  ControllerManifest, DeviceManifest, DeviceType,
  PlatformAdapterManifest, Platform, MiddlewareManifest
} from '@aga/sdk';

// Provider
import type { 
  ProviderManifest, ModelManifest, ProviderCapability,
  AuthManifest, PricingManifest, ModelPricing
} from '@aga/sdk';

// Observation
import type { 
  ObservationType, Observation, ObservationData,
  ObservationMetadata, ScreenshotData, BoardStateData
} from '@aga/sdk';

// Plugin
import type { 
  PluginManifest, PluginCategory, PluginActivation,
  PluginContributions, UiPanelConfig, DashboardWidgetConfig,
  NavigationItemConfig, ContextMenuConfig
} from '@aga/sdk';

// MCP
import type { 
  McpTool, McpToolSchema, McpResource, McpPrompt
} from '@aga/sdk';
```

### Schemas (Zod)

```typescript
import { 
  BattleConfigSchema, AgentConfigSchema,
  ArenaManifestSchema, GameManifestSchema,
  PluginManifestSchema, ControllerManifestSchema,
  ProviderManifestSchema, McpToolSchema
} from '@aga/sdk';

const config = BattleConfigSchema.parse(rawConfig);
```

### Contracts

```typescript
import { 
  ArenaPlugin, GameAdapter, Plugin, Controller,
  Provider, ObservationAdapter
} from '@aga/sdk';
```

### Events

```typescript
import { 
  DomainEvent, BattleCreated, BattleStarted, BattleFinished,
  ActionExecuted, ObservationCaptured, AgentMessage
} from '@aga/sdk';
```

### Utilities

```typescript
import { 
  createEntityId, createAgentId, createBattleId,
  Duration, parseDuration, formatDuration
} from '@aga/sdk';
```

---

## Usage Examples

### Create Battle Config

```typescript
import { 
  BattleConfigSchema, createBattleId, createAgentId,
  Strategy 
} from '@aga/sdk';

const config = BattleConfigSchema.parse({
  id: createBattleId('battle-001'),
  arenaId: 'battle-tanks',
  gameId: 'battle-tanks',
  agents: [
    { 
      id: createAgentId('agent-1'),
      name: 'GPT Strategist',
      strategy: 'aggressive' as Strategy,
      profileId: 'profile-gpt4'
    },
    { 
      id: createAgentId('agent-2'),
      name: 'Local Llama',
      strategy: 'defensive' as Strategy
    }
  ],
  plugins: ['plugin-chat', 'plugin-polls'],
  match: {
    maxTurns: 100,
    timeout: '30m',
    seed: 42,
    deterministic: true,
    replayEnabled: true
  }
});
```

### Create Arena Manifest

```typescript
import { ArenaManifestSchema, UiElementSchema } from '@aga/sdk';

const manifest = ArenaManifestSchema.parse({
  id: 'my-arena',
  name: 'My Arena',
  description: 'Custom arena',
  version: '1.0.0',
  type: 'arena',
  category: 'competitive',
  engines: { aga: '^1.0.0' },
  entry: './dist/index.js',
  activation: { startup: true },
  contributions: { arenas: ['my-arena'] },
  capabilities: ['move', 'attack'],
  display: {
    arena: {
      game: 'my-game',
      plugins: ['plugin-chat'],
      defaultStrategies: ['aggressive', 'defensive'],
      mandatoryCapabilities: ['move'],
      ui: [
        { id: 'world', type: 'panel', component: 'WorldView', label: 'World', position: 'center' }
      ]
    }
  }
});
```

### Validate Plugin Manifest

```typescript
import { PluginManifestSchema } from '@aga/sdk';

const result = PluginManifestSchema.safeParse(pluginJson);
if (!result.success) {
  console.error('Invalid manifest:', result.error.issues);
}
```

---

## Runtime APIs (Internal)

These are available via `PluginContext` in plugins:

```typescript
interface PluginContext {
  // Identity
  readonly manifest: PluginManifest;
  
  // Logging
  readonly logger: Logger;
  
  // Configuration
  readonly config: ConfigReader;
  
  // Storage (namespaced)
  readonly storage: StorageAdapter;
  
  // Event Bus
  readonly eventBus: EventBus;
  
  // Registration APIs (write-only during registration phase)
  registerMcpTool(tool: McpTool): void;
  registerEventHandler(handler: EventHandler): void;
  registerUiPanel(panel: UiPanelContribution): void;
  registerServerRoute(route: ServerRoute): void;
  registerCliCommand(command: CliCommand): void;
  
  // Query APIs (read-only)
  getAvailableTools(): McpTool[];
  getAvailableArenas(): ArenaPlugin[];
  getAvailableGames(): GameAdapter[];
  getAvailableControllers(): Controller[];
  getAvailableProviders(): Provider[];
  getAvailableProfiles(): AgentProfile[];
}
```

---

## CLI Commands

```bash
# Development
aga dev                    # Start dev server
aga build                  # Build all packages
aga test [package]         # Run tests
aga lint                   # Run linter
aga typecheck              # Type check

# Configuration
aga config get <key>
aga config set <key> <value>
aga config list

# Plugin Management
aga plugin install <pkg>
aga plugin uninstall <id>
aga plugin list
aga plugin enable <id>
aga plugin disable <id>

# Battle Management
aga battle create
aga battle start <id>
aga battle pause <id>
aga battle list
aga battle show <id>
aga battle replay <id>
aga battle export <id>

# Arena
aga arena list
aga arena show <id>
aga arena test <id>

# Agent
aga agent list
aga agent create
aga agent test <id>
```

---

## Configuration

### Default Config

```json
{
  "runtime": {
    "dataDir": "~/.aga/data",
    "pluginsDir": "~/.aga/plugins",
    "gamesDir": "~/.aga/games",
    "arenasDir": "~/.aga/arenas",
    "tempDir": "~/.aga/tmp",
    "maxConcurrentBattles": 10,
    "battleTimeout": 1800000,
    "enableHotReload": true
  },
  "storage": {
    "type": "sqlite",
    "path": "~/.aga/data/arena.db"
  },
  "logging": {
    "level": "info",
    "format": "json",
    "output": "stdout"
  },
  "server": {
    "host": "0.0.0.0",
    "port": 3000,
    "cors": true
  },
  "frontend": {
    "url": "http://localhost:5173"
  }
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AGA_DATA_DIR` | Data directory | `~/.aga/data` |
| `AGA_PLUGINS_DIR` | Plugins directory | `~/.aga/plugins` |
| `AGA_CONFIG_FILE` | Config file path | `~/.aga/config.json` |
| `AGA_LOG_LEVEL` | Log level | `info` |
| `AGA_SERVER_PORT` | Server port | `3000` |
| `AGA_FRONTEND_URL` | Frontend URL | `http://localhost:5173` |

---

## Version Compatibility

| SDK Version | Runtime Version | Notes |
|-------------|-----------------|-------|
| 1.0.x | 1.0.x | Stable |
| 0.x.x | 0.x.x | Experimental |

**Rule:** SDK major version must match Runtime major version.

---

## Migration Guide

### 0.x → 1.0

```typescript
// Old (0.x)
export function activate(api) {
  api.registerTool({ name: 'my.tool', ... });
  api.onEvent('BattleStarted', handler);
}

// New (1.0)
import { Plugin, PluginContext, McpTool, EventHandler } from '@aga/sdk';

export const tools: McpTool[] = [{ name: 'my.tool', ... }];
export const handlers: EventHandler[] = [{ eventType: 'BattleStarted', handler }];

export class MyPlugin implements Plugin {
  async activate(ctx: PluginContext) {
    for (const tool of tools) ctx.registerMcpTool(tool);
    for (const h of handlers) ctx.registerEventHandler(h);
  }
}

export default new MyPlugin();
```

---

## Error Handling

```typescript
import { 
  BattleError, ValidationError, NotFoundError,
  PermissionError, TimeoutError, ProviderError
} from '@aga/sdk';

try {
  await battleManager.createBattle(config);
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors
    console.error('Validation failed:', error.details);
  } else if (error instanceof NotFoundError) {
    // Resource not found
  } else if (error instanceof ProviderError) {
    // LLM provider error
  }
}
```

---

## Testing Utilities

```typescript
import { 
  createTestRuntime, createTestBattle, 
  createMockArena, createMockProvider,
  createMockController, createMockStorage
} from '@aga/testing';

const runtime = await createTestRuntime({
  plugins: ['plugin-chat'],
  config: { enableSpectators: true }
});

const battle = await createTestBattle({
  arenaId: 'test-arena',
  agents: [{ id: 'agent-1', strategy: 'aggressive' }],
  match: { maxTurns: 10 }
});
```