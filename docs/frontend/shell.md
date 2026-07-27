# Frontend Shell

> The frontend is a **UI Runtime** — exactly like VS Code. It knows almost nothing. It doesn't know what Chess is. It doesn't know what Battle Tanks is. It doesn't know what Chat is. It only knows how to create a layout and mount contributions.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                  UI RUNTIME (SHELL)                      │   │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │   │
│   │  │ Layout   │ │ Routing  │ │ Docking  │ │ Windows  │    │   │
│   │  │ Engine   │ │ System   │ │ Manager  │ │ Manager  │    │   │
│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │   │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │   │
│   │  │ Command  │ │ Event    │ │ Extension│ │ State    │    │   │
│   │  │ Palette  │ │ Bus      │ │ Loader   │ │ Mgmt     │    │   │
│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│              ┌───────────────┼───────────────┐                   │
│              ▼               ▼               ▼                   │
│       ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│       │  Arenas    │ │   Games    │ │  Plugins   │              │
│       │ (Layouts,  │ │ (Controls, │ │ (Panels,   │              │
│       │  Overlays) │ │  Views)    │ │  Commands) │              │
│       └────────────┘ └────────────┘ └────────────┘              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Framework** | React | 19+ |
| **Build** | Vite | 6+ |
| **Styling** | Tailwind CSS | 4+ |
| **State** | Zustand | 5+ |
| **Routing** | React Router | 7+ |
| **WebSocket** | Native | - |
| **Language** | TypeScript | 5+ |

---

## Directory Structure

```
apps/web/
├── public/
├── src/
│   ├── runtime/
│   │   ├── application/          # App initialization, bootstrap
│   │   ├── shell/                # Shell component, layout engine
│   │   ├── layout/               # Dock manager, panel manager
│   │   ├── router/               # Dynamic routing
│   │   ├── navigation/           # Dynamic navigation
│   │   ├── docking/              # Window/panel docking
│   │   ├── commands/             # Command palette
│   │   ├── events/               # Frontend event bus
│   │   ├── registry/             # Component registry
│   │   ├── extension-loader/     # Extension loading
│   │   └── store/                # Global state (Zustand)
│   │
│   ├── components/
│   │   ├── layout/               # DockPanel, Splitter, TabBar
│   │   ├── shell/                # Header, StatusBar, Workspace
│   │   ├── common/               # Button, Input, Modal, Tooltip
│   │   └── battle/               # Battle-specific (EventLog, Chat)
│   │
│   ├── pages/                    # Route-level pages
│   │   ├── Dashboard.tsx
│   │   ├── Battles.tsx
│   │   ├── Arenas.tsx
│   │   ├── Plugins.tsx
│   │   └── Settings.tsx
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useBattleWebSocket.ts
│   │   ├── useApi.ts
│   │   └── useLayout.ts
│   │
│   ├── services/                 # API clients, WebSocket
│   │   ├── api.ts
│   │   ├── websocket.ts
│   │   └── storage.ts
│   │
│   ├── styles/                   # Global styles
│   │   └── global.css
│   │
│   ├── App.tsx                   # Root component
│   ├── main.tsx                  # Entry point
│   └── vite-env.d.ts
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

---

## Shell Bootstrap

```tsx
// apps/web/src/main.tsx
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initializeRuntime } from './runtime/application/bootstrap';
import './styles/global.css';

async function bootstrap() {
  // 1. Initialize runtime (connect to server, load plugins)
  const runtime = await initializeRuntime();
  
  // 2. Mount React app
  const root = createRoot(document.getElementById('root')!);
  root.render(
    <RuntimeProvider value={runtime}>
      <App />
    </RuntimeProvider>
  );
}

bootstrap().catch(console.error);
```

```tsx
// apps/web/src/runtime/application/bootstrap.ts
export async function initializeRuntime(): Promise<Runtime> {
  // 1. Connect to server
  const api = createApiClient();
  const ws = createWebSocketClient();
  
  await api.healthCheck();
  await ws.connect();
  
  // 2. Load plugin manifests
  const plugins = await api.getPlugins();
  
  // 3. Load extension modules
  const extensionLoader = new ExtensionLoader();
  for (const plugin of plugins) {
    if (plugin.activation.startup) {
      await extensionLoader.loadExtension(plugin.id, plugin);
    }
  }
  
  // 4. Initialize component registry
  const componentRegistry = new ComponentRegistry();
  
  // 5. Initialize layout from storage
  const layout = await loadLayout();
  layoutStore.setState({ ...layout });
  
  return {
    api,
    ws,
    componentRegistry,
    extensionLoader,
    eventBus: new FrontendEventBus(),
  };
}
```

---

## Layout System

### Region Definitions

```typescript
// apps/web/src/runtime/layout/types.ts
export interface LayoutState {
  // Dock regions
  leftPanels: PanelConfig[];
  rightPanels: PanelConfig[];
  bottomPanels: PanelConfig[];
  
  // Center workspace
  centerPanels: PanelConfig[];
  activeCenterPanel: string | null;
  
  // Workspaces
  workspaces: Workspace[];
  activeWorkspace: string;
}

export interface PanelConfig {
  id: string;
  component: string;        // Component name from registry
  title: string;
  icon?: string;
  position: PanelPosition;
  size?: { width: number; height: number };
  minimizable: boolean;
  closable: boolean;
  movable: boolean;
  props?: Record<string, any>;
  when?: UICondition;       // Conditional display
}
```

### Dock Manager

```typescript
// apps/web/src/runtime/layout/dock-manager.ts
export class DockManager {
  private docks = new Map<DockSide, DockState>();
  
  getLayout(): LayoutState {
    return {
      left: this.getDock('left'),
      right: this.getDock('right'),
      bottom: this.getDock('bottom'),
      center: this.centerWorkspace,
    };
  }
  
  addPanel(side: DockSide, config: PanelConfig): void {
    const dock = this.docks.get(side) || { panels: [], activeIndex: 0 };
    dock.panels.push({ ...config, visible: true });
    this.docks.set(side, dock);
    this.emit('layout-changed', this.getLayout());
  }
  
  removePanel(side: DockSide, panelId: string): void {
    const dock = this.docks.get(side);
    if (!dock) return;
    dock.panels = dock.panels.filter(p => p.id !== panelId);
    this.emit('layout-changed', this.getLayout());
  }
  
  movePanel(panelId: string, fromSide: DockSide, toSide: DockSide): void {
    const panel = this.removePanel(fromSide, panelId);
    if (panel) this.addPanel(toSide, panel);
    this.emit('layout-changed', this.getLayout());
  }
  
  resizePanel(side: DockSide, panelId: string, size: number): void {
    const dock = this.docks.get(side);
    const panel = dock?.panels.find(p => p.id === panelId);
    if (panel) {
      panel.size = size;
      this.emit('layout-changed', this.getLayout());
    }
  }
}
```

---

## Dynamic Routing

```typescript
// apps/web/src/runtime/router/dynamic-router.tsx
export function DynamicRoutes() {
  const routes = useRouteRegistry();
  
  return (
    <Routes>
      {/* Core routes */}
      <Route path="/" element={<Dashboard />} />
      <Route path="/battles" element={<Battles />} />
      <Route path="/battles/:id" element={<BattleDetail />} />
      <Route path="/arenas" element={<Arenas />} />
      <Route path="/plugins" element={<Plugins />} />
      <Route path="/settings" element={<Settings />} />
      
      {/* Plugin routes */}
      {Array.from(routes.values()).map(route => (
        <Route
          key={route.path}
          path={route.path}
          element={<DynamicPage route={route} />}
        />
      ))}
    </Routes>
  );
}

function DynamicPage({ route }: { route: RouteConfig }) {
  const Component = useComponentRegistry().get(route.component);
  if (!Component) return <div>Component not found: {route.component}</div>;
  return <Component />;
}
```

---

## Extension Loading

```typescript
// apps/web/src/runtime/extension-loader/extension-loader.ts
export class ExtensionLoader {
  private loaded = new Map<string, LoadedExtension>();
  private componentRegistry: ComponentRegistry;
  
  async loadExtension(extensionId: string, manifest: ExtensionManifest): Promise<void> {
    // 1. Load module (ESM dynamic import)
    const module = await import(manifest.entry);
    
    // 2. Register components
    if (manifest.contributes?.components) {
      for (const comp of manifest.contributes.components) {
        const Component = module[comp.export];
        if (!Component) {
          console.warn(`Component ${comp.export} not found in ${extensionId}`);
          continue;
        }
        this.componentRegistry.register(comp.name, Component);
      }
    }
    
    // 3. Register styles
    if (manifest.contributes?.styles) {
      for (const style of manifest.contributes.styles) {
        this.injectStyle(style);
      }
    }
    
    // 4. Initialize extension
    if (module.initialize) {
      await module.initialize(this.createContext(extensionId));
    }
    
    this.loaded.set(extensionId, { manifest, module });
  }
  
  async unloadExtension(extensionId: string): Promise<void> {
    const ext = this.loaded.get(extensionId);
    if (!ext) return;
    
    // Unregister components
    if (ext.manifest.contributes?.components) {
      for (const comp of ext.manifest.contributes.components) {
        this.componentRegistry.unregister(comp.name);
      }
    }
    
    // Deactivate
    if (ext.module.deactivate) {
      await ext.module.deactivate();
    }
    
    this.loaded.delete(extensionId);
  }
}
```

---

## Event Bus Integration

```typescript
// apps/web/src/runtime/events/frontend-event-bus.ts
export class FrontendEventBus {
  private ws: WebSocketClient;
  private localBus = new EventEmitter<DomainEvent>();
  private subscriptions = new Map<string, Set<EventListener>>();
  
  constructor(ws: WebSocketClient) {
    this.ws = ws;
    this.ws.onMessage(this.handleServerEvent.bind(this));
  }
  
  subscribe(eventType: string, listener: EventListener): Subscription {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Set());
    }
    this.subscriptions.get(eventType)!.add(listener);
    
    // Subscribe on server if needed
    if (!eventType.startsWith('local:')) {
      this.ws.send({ type: 'subscribe', events: [eventType] });
    }
    
    return {
      unsubscribe: () => {
        this.subscriptions.get(eventType)?.delete(listener);
        if (this.subscriptions.get(eventType)?.size === 0) {
          this.ws.send({ type: 'unsubscribe', events: [eventType] });
        }
      },
    };
  }
  
  publish(event: DomainEvent): void {
    // Local only
    if (event.type.startsWith('local:')) {
      this.localBus.emit(event.type, event);
      return;
    }
    
    // Send to server
    this.ws.send({ type: 'event', event });
  }
  
  private handleServerEvent(message: any): void {
    if (message.type === 'event') {
      const listeners = this.subscriptions.get(message.event.type);
      listeners?.forEach(l => l(message.event));
    }
  }
}
```

---

## State Management

```typescript
// apps/web/src/runtime/shell/store.ts
export interface AppState {
  // User
  user: User | null;
  authenticated: boolean;
  
  // Battle
  currentBattle: Battle | null;
  battleState: BattleState | null;
  replay: ReplaySession | null;
  
  // UI
  layout: LayoutState;
  theme: 'dark' | 'light' | 'system';
  sidebarOpen: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setBattle: (battle: Battle | null) => void;
  setBattleState: (state: BattleState) => void;
  setLayout: (layout: LayoutState) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      authenticated: false,
      currentBattle: null,
      battleState: null,
      replay: null,
      layout: defaultLayout,
      theme: 'dark',
      sidebarOpen: true,
      
      setUser: (user) => set({ user, authenticated: !!user }),
      setBattle: (battle) => set({ currentBattle: battle }),
      setBattleState: (state) => set({ battleState: state }),
      setLayout: (layout) => set({ layout }),
      toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    { name: 'aga-app-state', version: 1 }
  )
);
```

---

## Theming

```css
/* apps/web/src/styles/global.css */
@import "tailwindcss";

@theme {
  --color-bg-primary: #030712;
  --color-bg-secondary: #0f172a;
  --color-bg-tertiary: #1e293b;
  --color-border: #334155;
  --color-border-focus: #3b82f6;
  --color-text-primary: #f8fafc;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
  --color-accent: #3b82f6;
  --color-accent-hover: #2563eb;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-agent-1: #3b82f6;
  --color-agent-2: #ef4444;
  --color-agent-3: #22c55e;
  --color-agent-4: #f59e0b;
}

:root {
  color-scheme: dark;
}

body {
  @apply bg-bg-primary text-text-primary antialiased;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-bg-primary;
}

::-webkit-scrollbar-thumb {
  @apply bg-bg-tertiary rounded-full;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-border;
}
```

---

## Performance

| Optimization | Implementation |
|--------------|----------------|
| **Code Splitting** | React.lazy + Suspense for pages |
| **Virtualization** | react-window for lists (events, agents) |
| **Memoization** | React.memo, useMemo, useCallback |
| **Bundle Analysis** | vite-bundle-analyzer |
| **Lazy Loading** | Extension modules loaded on demand |
| **Web Workers** | Heavy computation offloaded |

---

## Testing

```typescript
// apps/web/src/runtime/shell/Shell.test.tsx
import { render, screen } from '@testing-library/react';
import { Shell } from './Shell';
import { createMockRuntime } from '../testing';

describe('Shell', () => {
  it('renders layout regions', () => {
    const runtime = createMockRuntime();
    render(<Shell runtime={runtime} />);
    
    expect(screen.getByRole('banner')).toBeInTheDocument(); // Header
    expect(screen.getByRole('main')).toBeInTheDocument();   // Center
    expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // Footer
  });
  
  it('loads panels from layout state', () => {
    const runtime = createMockRuntime({
      layout: { leftPanels: [{ id: 'test', component: 'TestPanel', ... }] },
    });
    
    render(<Shell runtime={runtime} />);
    expect(screen.getByText('TestPanel')).toBeInTheDocument();
  });
});
```