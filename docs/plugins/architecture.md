# Plugin Architecture

> The plugin system is the **backbone of extensibility**. Everything outside the core runtime is a plugin.

---

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PLUGIN ECOSYSTEM                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  Arena  │  │  Game   │  │ Plugin  │  │ Controller│     │
│  │Plugins  │  │Plugins  │  │Plugins  │  │Plugins  │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
│       └────────────┼────────────┼────────────┘              │
│                    ▼            ▼                            │
│         ┌─────────────────────────────┐                      │
│         │      Plugin Manager          │                      │
│         │  Discovery │ Validation     │                      │
│         │  Resolution │ Registration  │                      │
│         │  Activation │ Lifecycle     │                      │
│         └──────────────┬──────────────┘                      │
│                        │                                     │
│         ┌──────────────┼──────────────┐                      │
│         ▼              ▼              ▼                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ Contribution│ │   Registry  │ │  Event Bus  │            │
│  │  Registries │ │  (Typed)    │ │  (Pub/Sub)  │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Plugin Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| **arena** | Environment definitions | battle-tanks, chess-arena, training-ground |
| **game** | Native game adapters | chess, minecraft, battle-tanks |
| **interaction** | Spectator/agent communication | chat, polls, voice |
| **exporter** | Data export | replay, metrics, analytics |
| **agent** | AI agent implementations | llm-agent, rl-agent, scripted-agent |
| **visualization** | Custom rendering | 3d-renderer, tactical-map, heatmap |
| **metric** | Scoring, analysis | elo, performance, behavior |
| **storage** | Custom persistence | s3, postgres, vector-db |
| **controller** | Input devices | vr-controller, gamepad, eye-tracking |
| **provider** | LLM providers | openai, anthropic, local-llama |
| **observation** | Perception pipelines | screenshot, semantic, lidar |

---

## Plugin Manifest

Every plugin has an `arena-plugin.json` at its root:

```json
{
  "id": "plugin-chat",
  "name": "Spectator Chat",
  "description": "Real-time chat between spectators and AI agents",
  "version": "1.2.0",
  "category": "interaction",
  "author": "AI Game Arena",
  "license": "MIT",
  "engines": { "aga": "^1.0.0" },
  "entry": "./dist/index.js",
  "activation": {
    "startup": true,
    "events": ["BattleCreated", "BattleStarted"],
    "conditions": [
      { "type": "config", "value": "enableSpectators" }
    ]
  },
  "contributions": {
    "mcpTools": ["chat.send", "chat.receive", "chat.listen"],
    "eventHandlers": ["AgentMessage", "SpectatorMessage"],
    "uiPanels": [
      { "id": "chat", "component": "ChatPanel", "label": "Chat", "position": "right", "type": "chat" }
    ],
    "serverRoutes": ["/api/chat"],
    "cliCommands": ["chat:history"],
    "dashboardWidgets": [
      { "id": "active-chats", "component": "ActiveChatsWidget", "label": "Active Chats" }
    ],
    "navigationItems": [
      { "id": "chat-history", "label": "Chat History", "path": "/chat/history", "icon": "message" }
    ],
    "contextMenus": {
      "agent": [
        { "command": "chat:message-agent", "label": "Message Agent" }
      ]
    },
    "storage": ["chat:messages", "chat:channels"]
  },
  "dependencies": {
    "controller.basic": "^1.0.0"
  },
  "permissions": ["agent.communication", "spectator.chat"],
  "settings": {
    "maxHistory": { "type": "number", "default": 1000, "description": "Max messages to keep" },
    "allowAgentChat": { "type": "boolean", "default": true }
  }
}
```

---

## Manifest Schema

```typescript
// packages/sdk/src/schemas/plugin.ts
export const PluginManifestSchema = z.object({
  // Identity
  id: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(200),
  description: z.string().max(1000),
  version: z.string().regex(/^\d+\.\d+\.\d+(-[a-z0-9.-]+)?$/),
  
  // Classification
  category: z.enum([
    'arena', 'game', 'interaction', 'exporter', 
    'agent', 'visualization', 'metric', 'storage',
    'controller', 'provider', 'observation'
  ]),
  
  // Metadata
  author: z.string().optional(),
  license: z.string().optional(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  
  // Engine compatibility
  engines: z.object({
    aga: z.string(), // semver range
  }),
  
  // Entry point
  entry: z.string().regex(/^\.\//),
  
  // Activation
  activation: z.object({
    startup: z.boolean().default(false),
    events: z.array(z.string()).optional(),
    conditions: z.array(z.object({
      type: z.enum(['arena', 'game', 'capability', 'config']),
      value: z.union([z.string(), z.array(z.string())]),
    })).optional(),
  }).default({ startup: false }),
  
  // Contributions (the extension points)
  contributions: z.object({
    mcpTools: z.array(z.string()).optional(),
    eventHandlers: z.array(z.string()).optional(),
    uiPanels: z.array(UiPanelSchema).optional(),
    serverRoutes: z.array(z.string()).optional(),
    cliCommands: z.array(z.string()).optional(),
    dashboardWidgets: z.array(DashboardWidgetSchema).optional(),
    navigationItems: z.array(NavigationItemSchema).optional(),
    contextMenus: z.record(z.array(ContextMenuItemSchema)).optional(),
    storage: z.array(z.string()).optional(),
  }).default({}),
  
  // Dependencies
  dependencies: z.record(z.string()).default({}),
  peerDependencies: z.record(z.string()).default({}),
  
  // Security
  permissions: z.array(z.string()).default([]),
  
  // User-configurable settings
  settings: z.record(z.object({
    type: z.enum(['string', 'number', 'boolean', 'select', 'multiselect']),
    default: z.unknown(),
    description: z.string().optional(),
    options: z.array(z.string()).optional(), // for select
  })).optional(),
});
```

---

## Contribution Types

### 1. MCP Tools

Tools exposed to agents via Model Context Protocol:

```typescript
// Plugin code
export const chatTools: McpTool[] = [
  {
    name: 'chat.send',
    description: 'Send a message to spectators or other agents',
    inputSchema: {
      type: 'object',
      properties: {
        recipients: { type: 'array', items: { type: 'string' } },
        message: { type: 'string' },
        type: { type: 'string', enum: ['broadcast', 'direct', 'team'] },
      },
      required: ['message'],
    },
    annotations: { destructive: false, idempotent: false },
  },
  {
    name: 'chat.listen',
    description: 'Start listening for incoming messages',
    inputSchema: {
      type: 'object',
      properties: {
        channels: { type: 'array', items: { type: 'string' } },
      },
    },
  },
];

// In manifest
"contributions": {
  "mcpTools": ["chat.send", "chat.receive", "chat.listen"]
}
```

**Registration (static, no code execution):**

```typescript
// packages/plugin-manager/src/tool-registration.ts
export function registerMcpTools(
  pluginPath: string, 
  toolIds: string[], 
  registry: ToolRegistry
): void {
  for (const toolId of toolIds) {
    const toolDef = loadToolDefinition(pluginPath, toolId);
    registry.register(toolDef);
  }
}

function loadToolDefinition(pluginPath: string, toolId: string): McpTool {
  // Load from plugin's tool definition file (JSON/TS)
  const toolPath = path.join(pluginPath, 'dist', 'tools', `${toolId}.json`);
  return JSON.parse(fs.readFileSync(toolPath, 'utf-8'));
}
```

### 2. Event Handlers

React to domain events:

```typescript
// Plugin code
export const chatEventHandlers: EventHandler[] = [
  {
    eventType: 'AgentMessage',
    handler: async (event, context) => {
      const { agentId, message, channel } = event.payload;
      await context.storage.set(`chat:messages:${channel}`, {
        agentId,
        message,
        timestamp: event.timestamp,
      });
      context.eventBus.publish({
        type: 'ChatMessageReceived',
        payload: { channel, agentId, message },
      });
    },
  },
  {
    eventType: 'BattleStarted',
    handler: async (event, context) => {
      // Initialize chat channel for battle
      await context.storage.set(`chat:channels:${event.aggregateId}`, ['general', 'tactical']);
    },
  },
];

// In manifest
"contributions": {
  "eventHandlers": ["AgentMessage", "BattleStarted", "SpectatorMessage"]
}
```

### 3. UI Panels

Frontend components contributed to the shell:

```typescript
// packages/sdk/src/schemas/ui.ts
export const UiPanelSchema = z.object({
  id: z.string(),
  component: z.string(), // Component name (must be registered in frontend)
  label: z.string(),
  position: z.enum(['center', 'left', 'right', 'top', 'bottom', 'overlay']),
  type: z.enum([
    'panel', 'sidebar', 'event-log', 'chat', 
    'scoreboard', 'header', 'footer', 'overlay', 'custom'
  ]),
  props: z.record(z.unknown()).optional(),
  when: z.object({ // Conditional display
    arenaId: z.string().optional(),
    gameId: z.string().optional(),
    hasCapability: z.string().optional(),
  }).optional(),
});

// In manifest
"contributions": {
  "uiPanels": [
    { "id": "chat", "component": "ChatPanel", "label": "Chat", "position": "right", "type": "chat" },
    { "id": "tactical-map", "component": "TacticalMap", "label": "Tactical Map", "position": "overlay", "type": "overlay", "when": { "hasCapability": "tactical-map" } }
  ]
}
```

### 4. Server Routes

REST API endpoints:

```typescript
// Plugin code
export const chatRoutes: ServerRoute[] = [
  {
    method: 'GET',
    path: '/api/chat/messages/:channel',
    handler: async (req, res, context) => {
      const messages = await context.storage.query('chat:messages', { channel: req.params.channel });
      res.json(messages);
    },
  },
  {
    method: 'POST',
    path: '/api/chat/message',
    handler: async (req, res, context) => {
      const { channel, message, sender } = req.body;
      await context.eventBus.publish({ type: 'SpectatorMessage', payload: { channel, message, sender } });
      res.json({ success: true });
    },
  },
];

// In manifest
"contributions": {
  "serverRoutes": ["/api/chat"]
}
```

### 5. CLI Commands

```typescript
// Plugin code
export const chatCommands: CliCommand[] = [
  {
    name: 'chat:history',
    description: 'Show chat history for a battle',
    args: [
      { name: 'battleId', required: true, description: 'Battle ID' },
      { name: 'channel', required: false, description: 'Channel name', default: 'general' },
    ],
    handler: async (args, context) => {
      const messages = await context.storage.query('chat:messages', { 
        battleId: args.battleId,
        channel: args.channel,
      });
      console.table(messages.map(m => ({ time: m.timestamp, from: m.sender, message: m.message })));
    },
  },
];

// In manifest
"contributions": {
  "cliCommands": ["chat:history"]
}
```

### 6. Dashboard Widgets

```typescript
// In manifest
"contributions": {
  "dashboardWidgets": [
    { "id": "active-chats", "component": "ActiveChatsWidget", "label": "Active Chats" },
    { "id": "agent-stats", "component": "AgentStatsWidget", "label": "Agent Stats" }
  ]
}
```

### 7. Navigation Items

```typescript
// In manifest
"contributions": {
  "navigationItems": [
    { "id": "chat-history", "label": "Chat History", "path": "/chat/history", "icon": "message" },
    { "id": "agent-profiles", "label": "Agent Profiles", "path": "/agents/profiles", "icon": "user" }
  ]
}
```

### 8. Context Menus

```typescript
// In manifest
"contributions": {
  "contextMenus": {
    "agent": [
      { "command": "chat:message-agent", "label": "Send Message" },
      { "command": "agent:view-profile", "label": "View Profile" }
    ],
    "battle": [
      { "command": "battle:export-replay", "label": "Export Replay" }
    ]
  }
}
```

### 9. Storage Namespaces

```typescript
// In manifest
"contributions": {
  "storage": ["chat:messages", "chat:channels", "chat:settings"]
}
```

---

## Plugin Lifecycle

```
Discovery → Validation → Dependency Resolution → Registration → Activation → Runtime → Deactivation → Cleanup
```

### 1. Discovery

```typescript
// packages/plugin-manager/src/discovery.ts
export async function discoverPlugins(config: DiscoveryConfig): Promise<DiscoveredPlugin[]> {
  const roots = config.roots || [
    path.join(config.dataDir, 'plugins'),
    path.join(config.dataDir, 'games'),
    path.join(config.dataDir, 'arenas'),
  ];

  const results: DiscoveredPlugin[] = [];
  
  for (const root of roots) {
    const entries = await fs.readdir(root, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (config.ignorePatterns?.some(p => minimatch(entry.name, p))) continue;
      
      const pluginDir = path.join(root, entry.name);
      const manifestPath = path.join(pluginDir, 'arena-plugin.json');
      
      if (await fs.pathExists(manifestPath)) {
        const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
        results.push({ root, path: pluginDir, manifest });
      }
    }
  }
  
  return results;
}
```

### 2. Validation

```typescript
// packages/plugin-manager/src/validation.ts
export async function validatePlugins(
  plugins: DiscoveredPlugin[],
  schema: ZodSchema
): Promise<ValidationResult> {
  const valid: ValidatedPlugin[] = [];
  const errors: ValidationError[] = [];
  
  for (const plugin of plugins) {
    const result = schema.safeParse(plugin.manifest);
    
    if (result.success) {
      valid.push({ ...plugin, manifest: result.data });
    } else {
      errors.push({
        pluginId: plugin.manifest.id,
        path: plugin.path,
        errors: result.error.issues.map(i => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
  }
  
  return { valid, errors };
}
```

### 3. Dependency Resolution

```typescript
// packages/plugin-manager/src/dependency-resolution.ts
export function resolveDependencies(
  plugins: ValidatedPlugin[]
): ResolvedOrder {
  const graph = buildDependencyGraph(plugins);
  const order = topologicalSort(graph);
  
  if (order.hasCycles) {
    throw new CircularDependencyError(order.cycles);
  }
  
  return { order: order.sorted, external: order.external };
}

function buildDependencyGraph(plugins: ValidatedPlugin[]): DependencyGraph {
  const nodes = new Map<string, PluginNode>();
  const edges = new Map<string, Set<string>>();
  
  for (const plugin of plugins) {
    nodes.set(plugin.manifest.id, { id: plugin.manifest.id, plugin });
    edges.set(plugin.manifest.id, new Set());
  }
  
  for (const plugin of plugins) {
    const deps = plugin.manifest.dependencies || {};
    for (const [depId, depVersion] of Object.entries(deps)) {
      if (nodes.has(depId)) {
        edges.get(plugin.manifest.id)!.add(depId);
      } else {
        // External dependency - resolved via package manager
        edges.get(plugin.manifest.id)!.add(`external:${depId}@${depVersion}`);
      }
    }
  }
  
  return { nodes, edges };
}
```

### 4. Contribution Registration

```typescript
// packages/plugin-manager/src/contribution-registration.ts
export async function registerContributions(
  plugins: ValidatedPlugin[],
  registrar: ContributionRegistrar
): Promise<RegistrationResult> {
  const result: RegistrationResult = {
    mcpTools: [], eventHandlers: [], uiPanels: [],
    serverRoutes: [], cliCommands: [], dashboardWidgets: [],
    navigationItems: [], contextMenus: [], storage: [],
    errors: [],
  };
  
  for (const plugin of plugins) {
    const contrib = plugin.manifest.contributions || {};
    
    try {
      if (contrib.mcpTools) {
        const tools = loadTools(plugin.path, contrib.mcpTools);
        for (const tool of tools) {
          registrar.registerMcpTool(tool);
          result.mcpTools.push(tool.id);
        }
      }
      
      if (contrib.eventHandlers) {
        const handlers = loadHandlers(plugin.path, contrib.eventHandlers);
        for (const handler of handlers) {
          registrar.registerEventHandler(handler);
          result.eventHandlers.push(handler.eventType);
        }
      }
      
      if (contrib.uiPanels) {
        for (const panel of contrib.uiPanels) {
          registrar.registerUiPanel({ ...panel, pluginId: plugin.manifest.id });
          result.uiPanels.push(panel.id);
        }
      }
      
      // ... other contribution types
      
    } catch (error) {
      result.errors.push({ pluginId: plugin.manifest.id, error: String(error) });
    }
  }
  
  return result;
}
```

### 5. Activation

```typescript
// packages/plugin-manager/src/activation.ts
export async function activatePlugins(
  plugins: ValidatedPlugin[],
  contextFactory: PluginContextFactory
): Promise<ActivationResult> {
  const activated: ActivatedPlugin[] = [];
  const errors: ActivationError[] = [];
  
  for (const plugin of plugins) {
    if (!plugin.manifest.activation?.startup) continue;
    
    try {
      const context = contextFactory.create(plugin);
      const module = await importPluginModule(plugin.path);
      
      if (module.activate) {
        await module.activate(context);
      }
      
      activated.push({ id: plugin.manifest.id, module, context });
      
    } catch (error) {
      errors.push({ pluginId: plugin.manifest.id, error: String(error) });
    }
  }
  
  return { activated, errors };
}

function createPluginContext(plugin: ValidatedPlugin): PluginContext {
  return {
    manifest: plugin.manifest,
    logger: createLogger(`plugin:${plugin.manifest.id}`),
    config: createConfigReader(plugin.manifest.id),
    storage: createNamespacedStorage(plugin.manifest.id),
    eventBus: getEventBus(),
    
    // Query APIs (read-only)
    getAvailableTools: () => getToolRegistry().getAll(),
    getAvailableArenas: () => getArenaRegistry().getAll(),
    getAvailableGames: () => getGameRegistry().getAll(),
    getAvailableControllers: () => getControllerRegistry().getAll(),
    getAvailableProviders: () => getProviderRegistry().getAll(),
    getAvailableProfiles: () => getProfileRegistry().getAll(),
    
    // Registration APIs (throw after registration phase)
    registerMcpTool: () => { throw new Error('Registration phase complete'); },
    registerEventHandler: () => { throw new Error('Registration phase complete'); },
    registerUiPanel: () => { throw new Error('Registration phase complete'); },
    // ...
  };
}
```

---

## Plugin Context API

```typescript
// packages/sdk/src/types/plugin.ts
export interface PluginContext {
  readonly manifest: PluginManifest;
  readonly logger: Logger;
  readonly config: ConfigReader;
  readonly storage: StorageAdapter;
  readonly eventBus: EventBus;
  
  // Queries (available at runtime)
  getAvailableTools(): McpTool[];
  getAvailableArenas(): ArenaPlugin[];
  getAvailableGames(): GameAdapter[];
  getAvailableControllers(): Controller[];
  getAvailableProviders(): Provider[];
  getAvailableProfiles(): AgentProfile[];
  getAvailableCapabilities(): Capability[];
  
  // Battle integration
  getCurrentBattle?(): BattleContext | null;
  getAgentContext(agentId: AgentId): AgentContext | null;
}
```

---

## Settings System

```typescript
// packages/plugin-manager/src/settings.ts
export interface PluginSettings {
  readonly pluginId: string;
  readonly settings: Record<string, unknown>;
}

export class SettingsManager {
  private settings = new Map<string, PluginSettings>();
  
  async loadSettings(pluginId: string): Promise<Record<string, unknown>> {
    const stored = await this.storage.get(`settings:${pluginId}`);
    const manifest = this.getManifest(pluginId);
    
    // Merge with defaults
    const defaults = manifest.settings ? 
      Object.fromEntries(Object.entries(manifest.settings).map(([k, v]) => [k, v.default])) : 
      {};
    
    return { ...defaults, ...stored };
  }
  
  async updateSettings(pluginId: string, updates: Record<string, unknown>): Promise<void> {
    const current = await this.loadSettings(pluginId);
    const merged = { ...current, ...updates };
    await this.storage.set(`settings:${pluginId}`, merged);
    this.settings.set(pluginId, { pluginId, settings: merged });
    
    // Notify plugin if active
    const plugin = this.activePlugins.get(pluginId);
    if (plugin?.onSettingsChange) {
      await plugin.onSettingsChange(merged);
    }
  }
}
```

---

## Permissions Model

```typescript
// packages/sdk/src/permissions/permissions.ts
export const PERMISSIONS = {
  // Agent permissions
  'agent.communication': 'Send/receive messages with agents',
  'agent.observation': 'Access agent observations',
  'agent.action': 'Execute actions on behalf of agent',
  'agent.memory': 'Read/write agent memory',
  'agent.profile': 'Read agent profile',
  
  // Spectator permissions
  'spectator.chat': 'Send chat messages',
  'spectator.view': 'View battle state',
  'spectator.control': 'Control battle (pause/resume)',
  
  // System permissions
  'system.storage': 'Access plugin storage',
  'system.events': 'Publish/subscribe to events',
  'system.ui': 'Contribute UI components',
  'system.api': 'Register server routes',
  'system.cli': 'Register CLI commands',
  'system.battle': 'Create/manage battles',
  
  // Capability permissions
  'capability.mcp': 'Register MCP tools',
  'capability.controller': 'Register controller devices',
  'capability.observation': 'Register observation adapters',
  'capability.provider': 'Register AI providers',
} as const;

export type Permission = keyof typeof PERMISSIONS;
```

---

## Plugin Isolation

| Isolation Level | Mechanism |
|-----------------|-----------|
| **Process** | Each plugin runs in separate process (optional, for untrusted) |
| **Module** | Separate module scope, no global pollution |
| **Storage** | Namespaced storage (`plugin:{id}:key`) |
| **Events** | Scoped event subscriptions |
| **Permissions** | Declared in manifest, enforced at runtime |
| **Dependencies** | Explicit, versioned, topologically sorted |

---

## Forbidden in Plugins

| Pattern | Forbidden | Alternative |
|---------|-----------|-------------|
| Import core internals | `import { Runtime } from '@aga/core'` | Use `PluginContext` APIs |
| Direct manager access | `pluginManager.getPlugin()` | Use registries via context |
| Global state mutation | `global.myState = ...` | Use namespaced storage |
| Synchronous I/O in activation | `fs.readFileSync()` | Async only |
| Unscoped event subscriptions | `eventBus.subscribe('*', ...)` | Subscribe to specific events |
| Direct filesystem access | `fs.writeFileSync('/etc/passwd')` | Storage API only |
| Modifying other plugins | `otherPlugin.settings = ...` | Events + context APIs only |

---

## Testing Plugins

```typescript
// plugins/plugin-chat/tests/integration.test.ts
import { createTestRuntime } from '@aga/testing';

describe('ChatPlugin', () => {
  let runtime: TestRuntime;
  let plugin: ChatPlugin;
  
  beforeEach(async () => {
    runtime = await createTestRuntime({
      plugins: ['plugin-chat'],
      config: { enableSpectators: true },
    });
    plugin = runtime.getPlugin('plugin-chat');
  });
  
  it('registers MCP tools', () => {
    const tools = runtime.toolRegistry.getAll();
    expect(tools.map(t => t.name)).toContain('chat.send');
    expect(tools.map(t => t.name)).toContain('chat.listen');
  });
  
  it('handles AgentMessage event', async () => {
    await runtime.eventBus.publish({
      type: 'AgentMessage',
      aggregateId: 'battle-1',
      payload: { agentId: 'agent-1', message: 'Hello', channel: 'general' },
      timestamp: new Date(),
      version: 1,
      metadata: { correlationId: '', source: 'test' },
    });
    
    const messages = await runtime.storage.query('chat:messages', { channel: 'general' });
    expect(messages).toHaveLength(1);
    expect(messages[0].message).toBe('Hello');
  });
  
  it('provides chat UI panel', () => {
    const panels = runtime.uiRegistry.getPanels();
    expect(panels.find(p => p.id === 'chat')).toBeDefined();
  });
});
```