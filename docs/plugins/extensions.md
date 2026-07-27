# Plugin Extensions

> Advanced extension patterns, cross-cutting concerns, and ecosystem growth.

---

## Extension Patterns

### 1. Capability Extension

Plugins add new agent capabilities by registering MCP tools:

```typescript
// Plugin registers new capability
export const diplomacyTools: McpTool[] = [
  {
    name: 'diplomacy.propose_alliance',
    description: 'Propose an alliance to another agent',
    inputSchema: {
      type: 'object',
      properties: {
        targetAgent: { type: 'string' },
        terms: { type: 'string' },
      },
      required: ['targetAgent'],
    },
  },
  {
    name: 'diplomacy.vote',
    description: 'Vote on a proposal',
    inputSchema: {
      type: 'object',
      properties: {
        proposalId: { type: 'string' },
        vote: { type: 'string', enum: ['yes', 'no', 'abstain'] },
      },
      required: ['proposalId', 'vote'],
    },
  },
];

// Agents automatically discover and can use these
// No code changes needed in agent runtime
```

### 2. Arena Extension

Arena plugins modify environment behavior:

```typescript
// Plugin adds new win condition
export class ArenaExtension {
  activate(context: PluginContext) {
    // Register custom win condition checker
    context.eventBus.subscribe('TurnFinished', async (event) => {
      const battle = await context.getBattle(event.payload.battleId);
      if (this.checkCustomVictory(battle)) {
        context.eventBus.publish({
          type: 'WinConditionMet',
          payload: { winner: this.determineWinner(battle), condition: 'custom' },
        });
      }
    });
  }
  
  checkCustomVictory(battle: Battle): boolean {
    // Custom logic
    return battle.turn > 100 && this.hasDominantPlayer(battle);
  }
}
```

### 3. Observation Extension

Plugins add new observation types:

```typescript
// Plugin contributes new observation adapter
{
  "contributions": {
    "observations": ["tactical-map", "threat-analysis"]
  }
}

// Observation adapter implementation
export class TacticalMapObservation implements ObservationAdapter {
  capture(gameState: GameState, agentId: AgentId): Observation {
    return {
      type: 'tactical-map',
      data: this.generateTacticalMap(gameState, agentId),
      metadata: { priority: 'high' },
    };
  }
}
```

### 4. Controller Extension

Plugins add new input devices:

```typescript
// Plugin contributes new controller device
{
  "contributions": {
    "controllers": ["vr-hand-tracking", "eye-tracking"]
  }
}

// Device implementation
export class VRHandTracking implements InputDevice {
  readonly type = 'vr-hand';
  readonly capabilities = ['point', 'grab', 'gesture'];
  
  async execute(action: ControllerAction): Promise<ActionResult> {
    // Translate to VR input
  }
}
```

### 5. UI Extension

Plugins contribute entire UI workflows:

```typescript
// Plugin contributes multi-panel workflow
{
  "contributions": {
    "uiPanels": [
      { "id": "tactical-map", "component": "TacticalMap", "position": "center", "type": "panel" },
      { "id": "unit-selector", "component": "UnitSelector", "position": "left", "type": "sidebar" },
      { "id": "command-palette", "component": "CommandPalette", "position": "overlay", "type": "overlay" }
    ],
    "navigationItems": [
      { "id": "tactical", "label": "Tactical View", "path": "/tactical", "icon": "map" }
    ]
  }
}
```

---

## Cross-Plugin Communication

### Event-Driven (Recommended)

```typescript
// Plugin A: Combat Log
export const combatLogHandlers: EventHandler[] = [
  {
    eventType: 'ActionExecuted',
    handler: async (event, context) => {
      const { agentId, action, outcome } = event.payload;
      await context.storage.append('combat:log', {
        turn: event.version,
        agent: agentId,
        action: action.tool,
        success: outcome.success,
        damage: outcome.data?.damage,
      });
    },
  },
];

// Plugin B: Damage Analytics (reacts to combat log)
export const analyticsHandlers: EventHandler[] = [
  {
    eventType: 'ActionExecuted',
    handler: async (event, context) => {
      if (event.payload.action.tool === 'attack') {
        const damage = event.payload.outcome.data?.damage || 0;
        await context.storage.increment('analytics:damage:dealt', damage);
      }
    },
  },
];
```

### Registry Query

```typescript
// Plugin discovers capabilities from other plugins
async function setupIntegration(context: PluginContext): Promise<void> {
  // Check if chat plugin is available
  const chatTools = context.getAvailableTools()
    .filter(t => t.name.startsWith('chat.'));
  
  if (chatTools.length > 0) {
    // Register enhanced tools that use chat
    context.registerMcpTool({
      name: 'tactical.broadcast',
      description: 'Broadcast tactical info to team via chat',
      inputSchema: { /* ... */ },
      handler: async (params) => {
        await context.mcpClient.callTool('chat.send', {
          recipients: 'team',
          message: `TACTICAL: ${params.info}`,
          type: 'team',
        });
      },
    });
  }
}
```

### Shared Storage Namespace

```typescript
// Plugins agree on shared namespace convention
// plugin-a writes
await context.storage.set('shared:battle:config', { ruleSet: 'tournament' });

// plugin-b reads
const config = await context.storage.get('shared:battle:config');
```

---

## Advanced Patterns

### 1. Plugin Composition

```typescript
// Core plugin provides base, extensions add features
// Base: plugin-chat
// Extension: plugin-chat-emoji
// Extension: plugin-chat-threads
// Extension: plugin-chat-translation

// All contribute to same UI panel
{
  "contributions": {
    "uiPanels": [
      { "id": "chat", "component": "ChatPanel", "type": "chat" }
    ]
  }
}

// Emoji extension adds toolbar
{
  "contributions": {
    "uiPanels": [
      { "id": "chat-emoji-toolbar", "component": "EmojiToolbar", "type": "custom", "when": { "panel": "chat" } }
    ]
  }
}
```

### 2. Conditional Contributions

```typescript
// Only contribute if specific arena is active
{
  "contributions": {
    "uiPanels": [
      { 
        "id": "space-radar", 
        "component": "SpaceRadar", 
        "type": "overlay",
        "when": { "arenaId": "space-combat" }
      }
    ],
    "mcpTools": [
      "space.warp",
      "space.scan"
    ]
  }
}
```

### 3. Plugin Configuration UI

```typescript
// Manifest declares settings
{
  "settings": {
    "maxHistory": { "type": "number", "default": 1000, "description": "Max messages" },
    "allowAgentChat": { "type": "boolean", "default": true },
    "theme": { "type": "select", "default": "dark", "options": ["light", "dark", "system"] },
    "channels": { "type": "multiselect", "default": ["general"], "options": ["general", "tactical", "social"] }
  }
}

// Frontend auto-generates settings panel
// Plugin reads settings at runtime
const settings = await context.config.getAll settings');
```

### 4. Plugin Dependencies with Interfaces

```json
// plugin-advanced-chat
{
  "dependencies": {
    "plugin-chat": "^1.0.0",
    "plugin-translation": "^1.0.0"
  }
}

// plugin-advanced-chat/src/index.ts
export async function activate(context: PluginContext) {
  // Get interface from dependency
  const chatApi = await context.getPluginInterface('plugin-chat', 'chat-api');
  const translationApi = await context.getPluginInterface('plugin-translation', 'translation-api');
  
  // Use them
  chatApi.onMessage(async (msg) => {
    const translated = await translationApi.translate(msg.text, 'en');
    await chatApi.sendTranslated(msg.id, translated);
  });
}
```

---

## Extension Points Reference

### MCP Tools

| Aspect | Detail |
|--------|--------|
| **Registration** | Static via manifest `mcpTools` array |
| **Discovery** | `context.getAvailableTools()` |
| **Execution** | Via MCP server in Controller |
| **Versioning** | Tool name includes version: `tool.v2` |
| **Annotations** | `readOnly`, `destructive`, `idempotent` |

### Event Handlers

| Aspect | Detail |
|--------|--------|
| **Registration** | Static via manifest `eventHandlers` array |
| **Execution** | Async, parallel, error-isolated |
| **Context** | Full PluginContext + event payload |
| **Ordering** | Not guaranteed; use correlation IDs |

### UI Panels

| Aspect | Detail |
|--------|--------|
| **Registration** | Static via manifest `uiPanels` array |
| **Component** | Must be registered in frontend registry |
| **Position** | `center`, `left`, `right`, `top`, `bottom`, `overlay` |
| **Type** | `panel`, `sidebar`, `event-log`, `chat`, `scoreboard`, `header`, `footer`, `overlay`, `custom` |
| **Conditions** | `when` clause for conditional display |

### Server Routes

| Aspect | Detail |
|--------|--------|
| **Registration** | Static via manifest `serverRoutes` array |
| **Handler** | `(req, res, context) => Promise<void>` |
| **Context** | PluginContext (storage, eventBus, config) |
| **Auth** | Inherits platform auth middleware |

### CLI Commands

| Aspect | Detail |
|--------|--------|
| **Registration** | Static via manifest `cliCommands` array |
| **Handler** | `(args, context) => Promise<void>` |
| **Context** | PluginContext |
| **Output** | Console (stdout/stderr) |

### Dashboard Widgets

| Aspect | Detail |
|--------|--------|
| **Registration** | Static via manifest `dashboardWidgets` array |
| **Component** | React component in frontend registry |
| **Props** | Injected: `storage`, `eventBus`, `config` |

### Navigation Items

| Aspect | Detail |
|--------|--------|
| **Registration** | Static via manifest `navigationItems` array |
| **Path** | React Router path |
| **Icon** | Lucide icon name |

### Context Menus

| Aspect | Detail |
|--------|--------|
| **Registration** | Static via manifest `contextMenus` object |
| **Targets** | `agent`, `battle`, `arena`, `game`, `plugin` |
| **Command** | CLI command name to execute |

### Storage

| Aspect | Detail |
|--------|--------|
| **Registration** | Static via manifest `storage` array |
| **Namespace** | `plugin:{id}:{key}` |
| **Access** | Only owning plugin + admin |
| **Migration** | Handled by StorageManager |

---

## Ecosystem Growth

### Plugin Registry (Future)

```
aga registry
├── search "chess"
├── install @aga/plugin-chess-engine
├── update @aga/plugin-chat
├── list
└── info @aga/plugin-chat
```

### Versioning Strategy

| Component | Versioning |
|-----------|------------|
| Platform (aga) | Semantic (major.minor.patch) |
| Plugin Manifest | Semantic, independent |
| Plugin Contracts | Platform version range in `engines.aga` |
| Contribution APIs | Backwards compatible within major |

### Compatibility Matrix

```json
// Plugin manifest
{
  "engines": {
    "aga": "^1.2.0",  // Compatible with 1.2.x, 1.3.x, but not 2.0.0
    "node": ">=18.0.0"
  },
  "peerDependencies": {
    "plugin-chat": "^1.0.0"
  }
}
```

### Deprecation Policy

| Stage | Timeline | Action |
|-------|----------|--------|
| **Deprecated** | 6 months | Warning in logs, docs updated |
| **Legacy** | 12 months | Still works, no new features |
| **Removed** | 18 months | Fails validation, migration guide |

---

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| **God Plugin** | Does everything, hard to maintain | Split into focused plugins |
| **Direct Plugin Import** | Breaks isolation, version coupling | Use events/registries |
| **Global State Mutation** | Conflicts, non-determinism | Namespaced storage only |
| **Sync I/O in Activation** | Blocks startup | Async only |
| **Unbounded Event Subscriptions** | Memory leaks | Unsubscribe on deactivate |
| **Hardcoded Plugin IDs** | Brittle coupling | Query registries by capability |
| **Skipping Validation** | Runtime failures | Always validate manifests |
| **Ignoring Permissions** | Security holes | Declare and enforce |

---

## Migration Guide: v0 → v1

### Manifest Changes

```json
// v0 (old)
{
  "id": "my-plugin",
  "version": "1.0",
  "main": "index.js",
  "contributes": {
    "tools": ["my.tool"],
    "panels": [{ "id": "panel", "component": "Panel" }]
  }
}

// v1 (new)
{
  "id": "my-plugin",
  "version": "1.0.0",
  "entry": "./dist/index.js",
  "activation": { "startup": true },
  "contributions": {
    "mcpTools": ["my.tool"],
    "uiPanels": [{ "id": "panel", "component": "Panel", "type": "panel", "position": "center" }]
  }
}
```

### Code Changes

```typescript
// v0 (old)
export function activate(api) {
  api.registerTool({ name: 'my.tool', ... });
  api.onEvent('BattleStarted', handler);
}

// v1 (new)
import { PluginContext, McpTool, EventHandler } from '@aga/sdk';

export const tools: McpTool[] = [{ name: 'my.tool', ... }];
export const handlers: EventHandler[] = [{ eventType: 'BattleStarted', handler }];

export default {
  async activate(context: PluginContext) {
    // Use context APIs
  }
};
```