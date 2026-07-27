# Frontend Extensions

> How plugins contribute UI to the frontend shell — dynamic registration, lifecycle, and communication.

---

## Overview

The frontend is a **UI Runtime**. It knows nothing about games, arenas, or agents. It only knows how to:

- Mount/unmount React components
- Manage layouts (docks, panels, overlays)
- Route URLs
- Dispatch events
- Provide extension APIs

Everything else is **contributed by plugins**.

---

## Extension Points

### 1. UI Panels

```typescript
// Plugin manifest contribution
{
  "contributions": {
    "uiPanels": [
      {
        "id": "tactical-map",
        "component": "TacticalMap",
        "label": "Tactical Map",
        "position": "overlay",
        "type": "overlay",
        "props": { "defaultZoom": 1.5 },
        "when": { "hasCapability": "tactical-map" }
      }
    ]
  }
}
```

### 2. Dashboard Widgets

```typescript
{
  "contributions": {
    "dashboardWidgets": [
      { "id": "active-battles", "component": "ActiveBattlesWidget", "label": "Active Battles" },
      { "id": "agent-performance", "component": "AgentPerformanceWidget", "label": "Agent Performance" }
    ]
  }
}
```

### 3. Navigation Items

```typescript
{
  "contributions": {
    "navigationItems": [
      { "id": "replay-browser", "label": "Replays", "path": "/replays", "icon": "film" },
      { "id": "agent-profiles", "label": "Agents", "path": "/agents", "icon": "users" }
    ]
  }
}
```

### 4. Context Menus

```typescript
{
  "contributions": {
    "contextMenus": {
      "agent": [
        { "command": "agent:challenge", "label": "Challenge to Duel" },
        { "command": "agent:view-profile", "label": "View Profile" }
      ],
      "battle": [
        { "command": "battle:export-replay", "label": "Export Replay" }
      ]
    }
  }
}
```

---

## Component Registration

### Frontend Plugin Entry

```typescript
// plugins/my-plugin/frontend/index.ts
import { componentRegistry } from '@aga/web/runtime/registry';
import { TacticalMap } from './components/TacticalMap';
import { ActiveBattlesWidget } from './components/ActiveBattlesWidget';

// Register components (called during plugin activation)
export function registerComponents(): void {
  componentRegistry.register('TacticalMap', TacticalMap);
  componentRegistry.register('ActiveBattlesWidget', ActiveBattlesWidget);
}

// Cleanup (called during plugin deactivation)
export function unregisterComponents(): void {
  componentRegistry.unregister('TacticalMap');
  componentRegistry.unregister('ActiveBattlesWidget');
}
```

### Component Registry

```typescript
// apps/web/src/runtime/registry/component-registry.ts
export class ComponentRegistry {
  private components = new Map<string, React.ComponentType<any>>();

  register(name: string, component: React.ComponentType<any>): void {
    if (this.components.has(name)) {
      console.warn(`Component ${name} already registered, overwriting`);
    }
    this.components.set(name, component);
  }

  unregister(name: string): void {
    this.components.delete(name);
  }

  get(name: string): React.ComponentType<any> | undefined {
    return this.components.get(name);
  }

  getAll(): Map<string, React.ComponentType<any>> {
    return new Map(this.components);
  }
}
```

---

## Panel Lifecycle

### Mounting

```
Plugin activates
      │
      ▼
registerComponents() called
      │
      ▼
UI Panel registered in manifest
      │
      ▼
Shell reads manifest
      │
      ▼
ComponentRegistry.get(componentName)
      │
      ▼
React.createElement(Component, props)
      │
      ▼
Mounted in DockPanel / Overlay
```

### Panel Props

```typescript
// apps/web/src/runtime/layout/types.ts
export interface PanelProps {
  // Standard props injected by shell
  readonly panelId: string;
  readonly position: PanelPosition;
  readonly size: PanelSize;
  readonly focused: boolean;
  
  // Actions
  readonly onClose: () => void;
  readonly onResize: (size: PanelSize) => void;
  readonly onFocus: () => void;
  
  // Context
  readonly battleId?: BattleId;
  readonly agentId?: AgentId;
  
  // Custom props from manifest
  readonly [key: string]: any;
}
```

### Panel Component Example

```tsx
// plugins/tactical-map/frontend/TacticalMap.tsx
import React, { useEffect, useRef } from 'react';
import { useBattleStore } from '@aga/web/runtime/store';
import { PanelProps } from '@aga/web/runtime/layout';

interface TacticalMapProps extends PanelProps {
  defaultZoom?: number;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({ 
  panelId, 
  battleId, 
  onClose,
  defaultZoom = 1,
  ...props 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { renderState, viewport } = useBattleStore();
  
  // Subscribe to battle events
  useEffect(() => {
    if (!battleId) return;
    const unsubscribe = eventBus.subscribe('RenderStateUpdated', handleRenderUpdate);
    return unsubscribe;
  }, [battleId]);

  const handleRenderUpdate = (event: DomainEvent) => {
    if (event.aggregateId === battleId) {
      // Trigger re-render
      draw();
    }
  };

  const draw = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    // Render logic here
  };

  return (
    <div className="w-full h-full relative bg-gray-900">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full" 
        style={{ touchAction: 'none' }}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
      />
      <div className="absolute top-2 right-2 flex gap-2">
        <button onClick={onClose} className="p-1 bg-gray-800 hover:bg-gray-700 rounded">
          ✕
        </button>
      </div>
    </div>
  );
}
```

---

## State Management

### Extension Store

```typescript
// apps/web/src/runtime/store/extension-store.ts
export function createExtensionStore() {
  return create<ExtensionState>()(
    persist(
      (set, get) => ({
        // Per-extension namespaced storage
        namespaces: {},
        
        setExtensionState: (extensionId: string, state: any) => 
          set(s => ({ 
            namespaces: { ...s.namespaces, [extensionId]: state } 
          })),
        
        getExtensionState: (extensionId: string) => 
          get().namespaces[extensionId],
        
        // Battle-scoped state
        battleStates: {},
        
        setBattleState: (battleId: string, extensionId: string, state: any) =>
          set(s => ({
            battleStates: {
              ...s.battleStates,
              [battleId]: { ...s.battleStates[battleId], [extensionId]: state }
            }
          })),
      }),
      { name: 'aga-extensions' }
    )
  );
}
```

### Battle Store (Shared)

```typescript
// apps/web/src/runtime/store/battle-store.ts
export const useBattleStore = create<BattleState>()(
  subscribeWithSelector((set, get) => ({
    // Current battle
    battleId: null,
    renderState: null,
    viewport: { x: 0, y: 0, zoom: 1 },
    
    // Actions
    setBattle: (battleId: BattleId | null) => set({ battleId }),
    setRenderState: (state: RenderState) => set({ renderState: state }),
    setViewport: (viewport: Viewport) => set({ viewport }),
    
    // Event handlers
    handleEvent: (event: DomainEvent) => {
      switch (event.type) {
        case 'RenderStateUpdated':
          set({ renderState: event.payload });
          break;
        case 'ViewportChanged':
          set({ viewport: event.payload });
          break;
      }
    },
  }))
);
```

---

## Event Communication

### Frontend Event Bus

```typescript
// apps/web/src/runtime/events/event-bus.ts
export class FrontendEventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private middleware: EventMiddleware[] = [];

  subscribe(eventType: string, handler: EventHandler): Subscription {
    if (!this.handlers.has(eventType)) this.handlers.set(eventType, new Set());
    this.handlers.get(eventType)!.add(handler);
    
    return {
      unsubscribe: () => this.handlers.get(eventType)?.delete(handler),
    };
  }

  publish(event: FrontendEvent): void {
    // Run middleware
    let processedEvent = event;
    for (const mw of this.middleware) {
      processedEvent = mw(processedEvent);
      if (!processedEvent) return; // Middleware cancelled
    }

    // Deliver to handlers
    const handlers = this.handlers.get(processedEvent.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(processedEvent);
        } catch (error) {
          console.error(`Handler error for ${processedEvent.type}:`, error);
        }
      });
    }

    // Wildcard handlers
    const wildcards = this.handlers.get('*');
    if (wildcards) {
      wildcards.forEach(handler => handler(processedEvent));
    }
  }

  // Subscribe to backend events via WebSocket
  connectToBackend(ws: WebSocket): void {
    ws.onmessage = (msg) => {
      const event = JSON.parse(msg.data);
      this.publish({ ...event, source: 'backend' });
    };
  }
}
```

### Extension Events

```typescript
// plugins/chat/frontend/events.ts
export const chatEvents = {
  // Incoming from backend
  'chat:message': (event: { channel: string; message: ChatMessage }) => {
    chatStore.getState().addMessage(event.channel, event.message);
  },
  
  'chat:channel-created': (event: { channel: ChatChannel }) => {
    chatStore.getState().addChannel(event.channel);
  },

  // Outgoing to backend
  sendMessage: (channel: string, message: string) => {
    ws.send(JSON.stringify({
      type: 'chat:send',
      payload: { channel, message },
    }));
  },
};

// Register in component
useEffect(() => {
  const unsub1 = eventBus.subscribe('chat:message', chatEvents['chat:message']);
  const unsub2 = eventBus.subscribe('chat:channel-created', chatEvents['chat:channel-created']);
  return () => { unsub1.unsubscribe(); unsub2.unsubscribe(); };
}, []);
```

---

## Commands

### Command Palette Integration

```typescript
// plugins/chat/frontend/commands.ts
import { commandPalette } from '@aga/web/runtime/commands';

export const chatCommands = [
  {
    id: 'chat:focus',
    title: 'Focus Chat',
    keybinding: 'ctrl+shift+c',
    execute: () => {
      const panel = panelManager.getPanel('chat');
      panel?.focus();
    },
  },
  {
    id: 'chat:clear-history',
    title: 'Clear Chat History',
    execute: () => {
      chatStore.getState().clearHistory();
    },
  },
  {
    id: 'chat:export',
    title: 'Export Chat Log',
    execute: async () => {
      const history = chatStore.getState().getHistory();
      await downloadJSON(history, 'chat-history.json');
    },
  },
];

// Register on activation
commandPalette.registerCommands(chatCommands);
```

---

## Settings UI

```typescript
// plugins/chat/frontend/Settings.tsx
import { useExtensionSettings } from '@aga/web/runtime/hooks';

export const ChatSettings: React.FC = () => {
  const { settings, updateSetting } = useExtensionSettings('plugin-chat');

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Chat Settings</h3>
      
      <div className="flex items-center justify-between">
        <label className="text-sm">Max History</label>
        <input
          type="number"
          value={settings.maxHistory}
          onChange={e => updateSetting('maxHistory', parseInt(e.target.value))}
          className="w-24 px-2 py-1 bg-gray-800 border border-gray-600 rounded"
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm">Allow Agent Chat</label>
        <input
          type="checkbox"
          checked={settings.allowAgentChat}
          onChange={e => updateSetting('allowAgentChat', e.target.checked)}
          className="w-4 h-4 accent-blue-500"
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm">Theme</label>
        <select
          value={settings.theme}
          onChange={e => updateSetting('theme', e.target.value)}
          className="px-2 py-1 bg-gray-800 border border-gray-600 rounded"
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
    </div>
  );
}
```

---

## Best Practices

| Practice | Why |
|----------|-----|
| **Lazy-load components** | `React.lazy(() => import('./HeavyComponent'))` reduces initial bundle |
| **Clean up on deactivate** | Unregister components, remove event listeners, cancel subscriptions |
| **Namespace storage** | Prevents conflicts between plugins |
| **Handle missing battle** | Panels should show empty state when no battle active |
| **Use TypeScript** | Type-safe component props and event payloads |
| **Test in isolation** | Mount components with mock stores for unit tests |