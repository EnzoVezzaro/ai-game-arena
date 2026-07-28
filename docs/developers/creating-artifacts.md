# Creating Artifacts

> Step-by-step guide to creating Arenas, Games, Plugins, Controllers, Providers, and Observations.

---

## Prerequisites

```bash
# Install CLI
npm install -g @aga/cli

# Or use npx
npx aga --help
```

---

## Creating an Arena

### 1. Scaffold

```bash
aga create arena my-arena
```

Generates:

```
my-arena/
├── arena-plugin.json
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── arena.ts
│   ├── state.ts
│   ├── tools.ts
│   └── render.ts
├── ui/
│   └── WorldView.tsx
└── tests/
    └── arena.test.ts
```

### 2. Configure Manifest

```json
{
  "id": "my-arena",
  "name": "My Arena",
  "description": "A custom arena for AI battles",
  "version": "1.0.0",
  "type": "arena",
  "category": "competitive",
  "engines": { "aga": "^1.0.0" },
  "entry": "./dist/index.js",
  "activation": { "startup": true },
  "contributions": { "arenas": ["my-arena"] },
  "capabilities": ["move", "attack", "scan"],
  "display": {
    "arena": {
      "game": "my-game",
      "plugins": ["plugin-chat"],
      "defaultStrategies": ["aggressive", "defensive"],
      "mandatoryCapabilities": ["move"],
      "ui": [
        {
          "id": "world",
          "type": "panel",
          "component": "WorldView",
          "label": "World",
          "position": "center"
        }
      ]
    }
  }
}
```

### 3. Implement Arena

```typescript
// src/arena.ts
import {
  ArenaPlugin,
  WorldState,
  AgentAction,
  ValidationResult,
  ActionOutcome,
  Observation,
  WinCondition,
  RenderState,
} from '@aga/sdk';

export class MyArena implements ArenaPlugin {
  readonly config = {
    id: 'my-arena',
    name: 'My Arena',
    version: '1.0.0',
    minPlayers: 2,
    maxPlayers: 4,
    capabilities: ['move', 'attack', 'scan'],
    mandatoryCapabilities: ['move'],
  };

  initialize(seed?: number): WorldState {
    const rng = seed ? new SeededRandom(seed) : new MathRandom();
    return {
      tick: 0,
      seed: seed || Date.now(),
      entities: new Map(),
      // ... your initial world state
    };
  }

  getTools(): ToolDefinition[] {
    return [
      { name: 'move', description: 'Move entity', inputSchema: {/* ... */} },
      { name: 'attack', description: 'Attack target', inputSchema: {/* ... */} },
    ];
  }

  validateAction(action: AgentAction, state: WorldState): ValidationResult {
    // Pure validation - no side effects
    return { valid: true };
  }

  executeAction(action: AgentAction, state: WorldState): ActionOutcome {
    // Pure execution - return new state + events
    return { success: true, newState: state, events: [] };
  }

  getObservation(agentId: string, state: WorldState): Observation {
    return { type: 'board-state', data: {/* agent-specific view */} };
  }

  checkWinCondition(state: WorldState): WinCondition | null {
    return null; // or { type: 'victory', winner: 'agent-1' }
  }

  getScores(state: WorldState): Record<string, number> {
    return {};
  }

  getRenderState(state: WorldState): RenderState {
    return { entities: [], tick: state.tick };
  }
}

export default new MyArena();
```

### 4. Build & Test

```bash
cd my-arena
npm run build
npm test

# Install locally for testing
cd /path/to/aga
npm install /path/to/my-arena

# Or copy to arenas/ for auto-discovery
cp -r /path/to/my-arena /path/to/aga/arenas/
```

---

## Creating a Game Adapter

### 1. Scaffold

```bash
aga create game my-game
```

### 2. Configure Manifest

```json
{
  "id": "my-game",
  "name": "My Game",
  "version": "1.0.0",
  "type": "game",
  "adapterType": "native",
  "launchConfig": {
    "command": "./my-game-binary",
    "args": ["--aga-mode"],
    "ports": [
      { "name": "controller", "protocol": "websocket" },
      { "name": "observation", "protocol": "websocket" }
    ]
  },
  "controllerInterface": { "type": "websocket", "capabilities": ["move", "attack"] },
  "observationInterface": { "types": ["board-state"], "transport": "websocket" }
}
```

### 3. Implement Adapter

```typescript
// src/adapter.ts
import {
  GameAdapter,
  GameConfig,
  GameProcess,
  ControllerAdapter,
  ObservationAdapter,
} from '@aga/sdk';

export class MyGameAdapter implements GameAdapter {
  readonly manifest = require('../arena-plugin.json');
  private process: GameProcess | null = null;

  async initialize(config: GameConfig): Promise<void> {
    // Validate config, prepare assets
  }

  async launch(): Promise<GameProcess> {
    // Spawn native process, wait for ready signal
    this.process = await spawnGameProcess(this.manifest.launchConfig);
    return this.process;
  }

  async attachController(adapter: ControllerAdapter): Promise<void> {
    // Connect adapter to game's controller port
  }

  async attachObservation(adapter: ObservationAdapter): Promise<void> {
    // Connect adapter to game's observation port
  }

  async start(): Promise<void> {
    /* Send start signal */
  }
  async stop(): Promise<void> {
    /* Graceful shutdown */
  }
  async suspend(): Promise<void> {
    /* Pause game */
  }
  async resume(): Promise<void> {
    /* Resume game */
  }
  async dispose(): Promise<void> {
    await this.stop();
  }

  getMetadata(): GameMetadata {
    return { name: 'My Game', type: 'turn-based' };
  }
  getCapabilities(): GameCapability[] {
    return ['move', 'attack'];
  }
}

export default new MyGameAdapter();
```

---

## Creating a Plugin

### 1. Scaffold

```bash
aga create plugin my-plugin --category interaction
```

### 2. Configure Manifest

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "description": "Adds custom functionality",
  "version": "1.0.0",
  "category": "interaction",
  "engines": { "aga": "^1.0.0" },
  "entry": "./dist/index.js",
  "activation": { "startup": true },
  "contributions": {
    "mcpTools": ["my.customTool"],
    "eventHandlers": ["BattleStarted"],
    "uiPanels": [
      {
        "id": "my-panel",
        "component": "MyPanel",
        "label": "My Panel",
        "position": "right",
        "type": "sidebar"
      }
    ]
  },
  "permissions": ["system.events", "system.ui"]
}
```

### 3. Implement Plugin

```typescript
// src/index.ts
import { Plugin, PluginContext, McpTool, EventHandler } from '@aga/sdk';

export const tools: McpTool[] = [
  { name: 'my.customTool', description: 'Does something', inputSchema: {/* ... */} },
];

export const handlers: EventHandler[] = [
  {
    eventType: 'BattleStarted',
    handler: async (event, ctx) => {
      /* ... */
    },
  },
];

export class MyPlugin implements Plugin {
  readonly manifest = require('../arena-plugin.json');

  async activate(ctx: PluginContext): Promise<void> {
    // Register tools
    for (const tool of tools) ctx.registerMcpTool(tool);
    // Register handlers
    for (const h of handlers) ctx.registerEventHandler(h);
  }

  async deactivate(): Promise<void> {
    // Cleanup
  }
}

export default new MyPlugin();
```

### 4. Frontend Components (if needed)

```tsx
// ui/MyPanel.tsx
import { PanelProps } from '@aga/web/runtime/layout';

export function MyPanel({ panelId, battleId, onClose }: PanelProps) {
  const data = usePluginStore((s) => s.myPluginData);

  return (
    <div className="p-4 h-full">
      <h2 className="text-lg font-semibold mb-4">My Panel</h2>
      {/* Your UI */}
    </div>
  );
}

// Register in frontend entry
import { componentRegistry } from '@aga/web/runtime/registry';
import { MyPanel } from './ui/MyPanel';
componentRegistry.register('MyPanel', MyPanel);
```

---

## Creating a Controller

### 1. Scaffold

```bash
aga create controller my-controller
```

### 2. Implement

```typescript
// src/controller.ts
import { Controller, InputDevice, ControllerAction, ActionResult, Capability } from '@aga/sdk';

export class MyController implements Controller {
  readonly manifest = {/* ... */};
  private devices = new Map<string, InputDevice>();

  async initialize(): Promise<void> {
    this.registerDevice(new MyCustomDevice());
  }

  registerDevice(device: InputDevice): void {
    this.devices.set(device.id, device);
  }

  getDevice(id: string): InputDevice | undefined {
    return this.devices.get(id);
  }

  async execute(action: ControllerAction): Promise<ActionResult> {
    const device = this.devices.get(action.tool.split('.')[0]);
    return device?.execute(action) || { success: false, error: 'Device not found' };
  }

  getCapabilities(): Capability[] {
    return Array.from(this.devices.values()).flatMap((d) => d.getCapabilities());
  }
}

export default new MyController();
```

---

## Creating a Provider

### 1. Scaffold

```bash
aga create provider my-provider
```

### 2. Implement

```typescript
// src/provider.ts
import { Provider, CompletionRequest, CompletionResponse, CompletionChunk } from '@aga/sdk';

export class MyProvider implements Provider {
  readonly manifest = {/* ... */};

  async authenticate(config: AuthConfig): Promise<AuthResult> {
    // Validate credentials
    return { success: true };
  }

  getModels(): Model[] {
    return [{ id: 'my-model', name: 'My Model', contextWindow: 4096, capabilities: ['chat'] }];
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // Call your model API
    return { id: '...', model: 'my-model', choices: [], usage: {} };
  }

  async *streamComplete(request: CompletionRequest): AsyncIterable<CompletionChunk> {
    // Stream from your model
    yield { id: '...', model: 'my-model', choices: [] };
  }

  estimateCost(request: CompletionRequest): CostEstimate {
    return { estimated: true, inputCost: 0, outputCost: 0, totalCost: 0, currency: 'USD' };
  }
}

export default new MyProvider();
```

---

## Creating an Observation Adapter

### 1. Scaffold

```bash
aga create observation my-observation
```

### 2. Implement

```typescript
// src/observation.ts
import { ObservationAdapter, Observation, GameState } from '@aga/sdk';

export class MyObservation implements ObservationAdapter {
  readonly manifest = {/* ... */};

  capture(gameState: GameState, agentId: string): Observation {
    return {
      timestamp: Date.now(),
      agentId,
      type: 'board-state',
      data: this.extractRelevantState(gameState, agentId),
      metadata: { captureDurationMs: 0, source: 'my-observation', version: '1.0.0' },
    };
  }

  getAvailableTypes(): ObservationType[] {
    return ['board-state', 'metadata'];
  }

  private extractRelevantState(state: GameState, agentId: string): any {
    // Filter state for agent
    return { self: state.entities.get(agentId), visible: [] };
  }
}

export default new MyObservation();
```

---

## Publishing

```bash
# Build
npm run build

# Test
npm test

# Version bump
npm version patch  # or minor, major

# Publish
npm publish --access public

# Users install
aga plugin install @your-org/aga-plugin-my-plugin
```

---

## Artifact Lifecycle & Marketplace

Every artifact (plugin, game, or arena) moves through a lifecycle that is managed
from the web UI (Arenas / Games / Plugins pages) and persisted in the server's
SQLite `artifacts` table. The runtime still discovers on-disk artifacts, but the
staged upload + status + marketplace flags live in the registry.

### Lifecycle states

```
                 upload (zip)
                       │
                       ▼
                  ┌─────────┐
        ┌────────▶│ uploaded│◀─────── uninstall ──────────┐
        │         └────┬────┘                              │
        │              │ install                           │
        │              ▼                                   │
        │         ┌──────────┐                        ┌────┴─────┐
        │         │ installed│──enable ─────────────▶│ enabled  │
        │         └──────────┘ ◀───────── disable ───└──────────┘
        │                                                  │
        │                                                  │ publish
        │                                                  ▼
        │                                            ┌──────────┐
        └────────────── remove (delete) ─────────────│published │
                                                     └──────────┘
                              unpublish ──────────────────▶ installed/enabled
```

| Status      | Meaning                                                             |
| ----------- | ------------------------------------------------------------------- |
| `uploaded`  | Zip extracted on disk; not yet registered with the runtime.         |
| `installed` | Registered (entry path known) but activation is off.                |
| `enabled`   | Activated — the plugin-manager will call `activate()` on next load. |
| `disabled`  | Explicitly paused after being enabled.                              |

`published` is an orthogonal boolean flag — an artifact must be `installed` or
`enabled` before it can be published to the marketplace. Unpublishing leaves the
on-disk artifact intact and only clears the marketplace listing.

### Zip layout

The `.zip` uploaded from the web UI must contain a manifest at one of:

```
my-artifact.zip
├── arena-plugin.json         # plugin or arena manifest (preferred)
└── ...                       # dist/, src/, package.json, etc.
```

or a single top-level subdirectory:

```
my-artifact.zip
└── my-artifact/
    ├── arena-plugin.json
    └── ...
```

For **games** the loader also accepts `game.json`. The manifest `id` (or the
subdirectory name) becomes the artifact `slug` and must be lowercase letters,
digits, and dashes.

### HTTP API

| Method   | Path                             | Body / Query                        | Effect                                             |
| -------- | -------------------------------- | ----------------------------------- | -------------------------------------------------- |
| `POST`   | `/api/artifacts/upload?type=...` | multipart `file` field              | Extracts zip, persists manifest, status=`uploaded` |
| `GET`    | `/api/artifacts?type=...`        | optional `type=plugin\|game\|arena` | List staged artifacts                              |
| `GET`    | `/api/artifacts/marketplace`     | —                                   | Published artifacts only                           |
| `POST`   | `/api/artifacts/:id/install`     | —                                   | status → `installed`                               |
| `POST`   | `/api/artifacts/:id/uninstall`   | —                                   | status → `uploaded`                                |
| `POST`   | `/api/artifacts/:id/enable`      | —                                   | status → `enabled`                                 |
| `POST`   | `/api/artifacts/:id/disable`     | —                                   | status → `disabled`                                |
| `DELETE` | `/api/artifacts/:id`             | —                                   | Remove from disk + registry                        |
| `POST`   | `/api/artifacts/:id/publish`     | header `x-user` (optional)          | `published_at` set; listed on marketplace          |
| `POST`   | `/api/artifacts/:id/unpublish`   | —                                   | Cleared from marketplace                           |

### Web UI

- **Arenas / Games / Plugins** pages each have an "Uploaded {type}" section with an
  **Upload zip** button. Each artifact card shows a status badge and contextual
  action buttons: Install/Uninstall, Enable/Disable, Publish/Unpublish, Remove.
- The **Marketplace** page (`/marketplace`) lists every published artifact with
  type, slug, version, and publisher.
- `packages/*` workspace packages are listed on the **Packages** page — these
  are core platform modules (not lifecycle-managed via the registry).

### Persistence

State is stored in the SQLite `artifacts` table:

```sql
CREATE TABLE artifacts (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL,        -- plugin | game | arena
  slug         TEXT NOT NULL,
  name         TEXT NOT NULL,
  version      TEXT NOT NULL,
  manifest     TEXT NOT NULL,        -- serialized JSON manifest
  status       TEXT NOT NULL,        -- uploaded | installed | enabled | disabled
  path         TEXT NOT NULL,        -- on-disk dir under plugins/ | games/
  description  TEXT,
  published_at INTEGER,
  published_by TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX idx_artifacts_type   ON artifacts(type);
CREATE INDEX idx_artifacts_status ON artifacts(status);
CREATE INDEX idx_artifacts_slug   ON artifacts(slug);
```

Uploading extracts the zip into `.staging/artifacts/<uuid>/`, validates the
manifest, then copies the artifact into the runtime discovery directory
(`plugins/<slug>` or `games/<slug>`) and inserts the registry row. The
plugin-manager's `discover()` will see it on the next load cycle.

---

## Checklist

- [ ] Valid `arena-plugin.json` manifest
- [ ] All required interface methods implemented
- [ ] TypeScript compiles without errors
- [ ] Unit tests pass
- [ ] Deterministic behavior (for arenas/games)
- [ ] Proper error handling
- [ ] Clean shutdown in `dispose()`/`deactivate()`
- [ ] Frontend components registered (if applicable)
- [ ] Manifest `engines.aga` matches target runtime version
