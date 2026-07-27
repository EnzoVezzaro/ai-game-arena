# Plugin Architecture

> The plugin system is the **backbone of extensibility**. Everything outside the core runtime is a plugin.

---

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      RUNTIME                                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  Plugin Manager                      │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │    │
│  │  │Discovery│ │Validation│ │Resolution│ │Activation│   │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
│           │                │                │                │
│           ▼                ▼                ▼                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  Contribution Registries             │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │    │
│  │  │ MCP    │ │ Event  │ │ UI     │ │ Server │  ...   │    │
│  │  │ Tools  │ │Handlers│ │ Panels │ │ Routes │        │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘        │    │
│  └─────────────────────────────────────────────────────┘    │
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
  
  // Contributions (extension points)
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
    options: z.array(z.string()).optional(),
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
];

// In manifest
"contributions": {
  "mcpTools": ["chat.send", "chat.receive", "chat.listen"]
}
```

**Registration (static, no code execution):**

```typescript
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
```

### 2. Event Handlers

React to domain events:

```typescript
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
    },
  },
  {
    eventType: 'BattleStarted',
    handler: async (event, context) => {
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
export const UiPanelSchema = z.object({
  id: z.string(),
  component: z.string(), // Must be registered in frontend
  label: z.string(),
  position: z.enum(['center', 'left', 'right', 'top', 'bottom', 'overlay']),
  type: z.enum([
    'panel', 'sidebar', 'event-log', 'chat', 
    'scoreboard', 'header', 'footer', 'overlay', 'custom'
  ]),
  props: z.record(z.unknown()).optional(),
  when: z.object({
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
      await context.eventBus.publish({ 
        type: 'SpectatorMessage', 
        payload: req.body 
      });
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
export const chatCommands: CliCommand[] = [
  {
    name: 'chat:history',
    description: 'Show chat history for a battle',
    args: [
      { name: 'battleId', required: true },
      { name: 'channel', required: false, default: 'general' },
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

```json
{
  "contributions": {
    "dashboardWidgets": [
      { "id": "active-chats", "component": "ActiveChatsWidget", "label": "Active Chats" }
    ]
  }
}
```

### 7. Navigation Items

```json
{
  "contributions": {
    "navigationItems": [
      { "id": "chat-history", "label": "Chat History", "path": "/chat/history", "icon": "message" }
    ]
  }
}
```

### 8. Context Menus

```json
{
  "contributions": {
    "contextMenus": {
      "agent": [
        { "command": "chat:message-agent", "label": "Send Message" }
      ],
      "battle": [
        { "command": "battle:export-replay", "label": "Export Replay" }
      ]
    }
  }
}
```

### 9. Storage Namespaces

```json
{
  "contributions": {
    "storage": ["chat:messages", "chat:channels", "chat:settings"]
  }
}
```

---

## Plugin Lifecycle

```
Discovery → Validation → Dependency Resolution → Registration → Activation → Runtime → Deactivation → Cleanup
```

### 1. Discovery

Scans directories for `arena-plugin.json`:

```typescript
export async function discoverPlugins(
  roots: string[],
  manifestName = 'arena-plugin.json'
): Promise<DiscoveredPlugin[]> {
  // Recursively scan roots
  // Return { root, path, manifestPath, manifest, relativePath }
}
```

### 2. Validation

Zod schema validation:

```typescript
export async function validateManifests(
  plugins: DiscoveredPlugin[],
  schema: ZodSchema
): Promise<ValidationResult> {
  // Returns { valid: ValidPlugin[], errors: ValidationError[] }
}
```

### 3. Dependency Resolution

Topological sort:

```typescript
export function resolveDependencies(
  plugins: ValidPlugin[]
): ResolvedPluginOrder {
  // Build graph, Kahn's algorithm
  // Detects circular dependencies
  // Returns activation order
}
```

### 4. Contribution Registration

Registers without executing plugin code:

```typescript
export async function registerContributions(
  plugins: ValidPlugin[],
  registrar: ContributionRegistrar
): Promise<RegistrationResult> {
  // Load static definitions (tools, panels, routes)
  // Register in registries
}
```

### 5. Activation

Executes plugin code:

```typescript
export async function activatePlugins(
  plugins: ValidPlugin[],
  contextFactory: PluginContextFactory
): Promise<ActivationResult> {
  for (const plugin of plugins) {
    if (!plugin.manifest.activation?.startup) continue;
    
    const context = contextFactory.create(plugin);
    const module = await importPluginModule(plugin.path);
    
    if (module.activate) {
      await module.activate(context);
    }
  }
}
```

---

## Plugin Context API

```typescript
export interface PluginContext {
  readonly manifest: PluginManifest;
  readonly logger: Logger;
  readonly config: ConfigReader;
  readonly storage: StorageAdapter; // Namespaced to plugin:{id}
  readonly eventBus: EventBus;
  
  // Queries
  getAvailableTools(): McpTool[];
  getAvailableArenas(): ArenaPlugin[];
  getAvailableGames(): GameAdapter[];
  getAvailableControllers(): Controller[];
  getAvailableProviders(): Provider[];
  getAvailableProfiles(): AgentProfile[];
  
  // Battle integration
  getCurrentBattle?(): BattleContext | null;
  getAgentContext(agentId: AgentId): AgentContext | null;
}
```

---

## Settings System

```typescript
export class SettingsManager {
  async loadSettings(pluginId: string): Promise<Record<string, unknown>> {
    const stored = await this.storage.get(`settings:${pluginId}`);
    const defaults = this.getManifest(pluginId).settings || {};
    return { ...defaults, ...stored };
  }
  
  async updateSettings(pluginId: string, updates: Record<string, unknown>): Promise<void> {
    const current = await this.loadSettings(pluginId);
    const merged = { ...current, ...updates };
    await this.storage.set(`settings:${pluginId}`, merged);
    
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
export const PERMISSIONS = {
  'agent.communication': 'Send/receive messages with agents',
  'agent.observation': 'Access agent observations',
  'agent.action': 'Execute actions on behalf of agent',
  'agent.memory': 'Read/write agent memory',
  'agent.profile': 'Read agent profile',
  
  'spectator.chat': 'Send chat messages',
  'spectator.view': 'View battle state',
  'spectator.control': 'Control battle (pause/resume)',
  
  'system.storage': 'Access plugin storage',
  'system.events': 'Publish/subscribe to events',
  'system.ui': 'Contribute UI components',
  'system.api': 'Register server routes',
  'system.cli': 'Register CLI commands',
  'system.battle': 'Create/manage battles',
  
  'capability.mcp': 'Register MCP tools',
  'capability.controller': 'Register controller devices',
  'capability.observation': 'Register observation adapters',
  'capability.provider': 'Register AI providers',
} as const;
```

---

## Plugin Isolation

| Level | Mechanism |
|-------|-----------|
| **Process** | Optional separate process for untrusted plugins |
| **Module** | Separate module scope |
| **Storage** | Namespaced: `plugin:{id}:key` |
| **Events** | Scoped subscriptions |
| **Permissions** | Declared in manifest, enforced at runtime |
| **Dependencies** | Explicit, versioned, topologically sorted |

---

## Forbidden Patterns

| Pattern | Forbidden | Alternative |
|---------|-----------|-------------|
| Import core internals | `import { Runtime } from '@aga/core'` | Use `PluginContext` APIs |
| Direct manager access | `pluginManager.getPlugin()` | Use registries via context |
| Global state mutation | `global.myState = ...` | Namespaced storage |
| Sync I/O in activation | `fs.readFileSync()` | Async only |
| Unscoped events | `eventBus.subscribe('*', ...)` | Specific event types |
| Direct filesystem | `fs.writeFileSync('/etc/passwd')` | Storage API only |
| Modifying other plugins | `otherPlugin.settings = ...` | Events + context APIs |

---

## Testing

```typescript
// tests/plugin.test.ts
import { createTestRuntime } from '@aga/testing';

describe('ChatPlugin', () => {
  let runtime: TestRuntime;
  
  beforeEach(async () => {
    runtime = await createTestRuntime({
      plugins: ['plugin-chat'],
      config: { enableSpectators: true },
    });
  });
  
  it('registers MCP tools', () => {
    const tools = runtime.toolRegistry.getAll();
    expect(tools.map(t => t.name)).toContain('chat.send');
  });
  
  it('handles AgentMessage event', async () => {
    await runtime.eventBus.publish({
      type: 'AgentMessage',
      payload: { agentId: 'agent-1', message: 'Hello', channel: 'general' },
      // ...
    });
    
    const messages = await runtime.storage.query('chat:messages', { channel: 'general' });
    expect(messages).toHaveLength(1);
  });
});
```