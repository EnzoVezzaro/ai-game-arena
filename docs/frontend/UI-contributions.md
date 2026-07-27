# UI Contributions

> Detailed reference for all UI contribution types — panels, overlays, widgets, navigation, and context menus.

---

## UI Panel Types

### Panel (Main Content Area)

```typescript
{
  "id": "game-board",
  "type": "panel",
  "component": "GameBoard",
  "label": "Game Board",
  "position": "center",
  "props": { "showCoordinates": true }
}
```

**Characteristics:**
- Occupies center workspace
- Tabbed interface (multiple panels can share center)
- Primary content area
- Receives focus by default

### Sidebar (Persistent Side Content)

```typescript
{
  "id": "agent-inspector",
  "type": "sidebar",
  "component": "AgentInspector",
  "label": "Agent Inspector",
  "position": "left",
  "props": { "showMemory": true }
}
```

**Characteristics:**
- Fixed position (left/right)
- Always visible when open
- Collapsible
- Good for inspectors, property grids, trees

### Event Log (Streaming Events)

```typescript
{
  "id": "event-log",
  "type": "event-log",
  "component": "EventLog",
  "label": "Event Log",
  "position": "right",
  "props": { 
    "maxEvents": 1000,
    "filter": ["ActionExecuted", "TurnStarted"],
    "groupByTurn": true
  }
}
```

**Characteristics:**
- Auto-scroll to bottom
- Filterable by event type
- Timestamp display
- Grouping options
- Search/highlight

### Chat (Communication)

```typescript
{
  "id": "chat",
  "type": "chat",
  "component": "SpectatorChat",
  "label": "Chat",
  "position": "right",
  "props": {
    "allowSpectators": true,
    "allowAgents": true,
    "messageHistory": 100,
    "channels": ["general", "tactical", "social"]
  }
}
```

**Characteristics:**
- Message input at bottom
- Channel tabs
- Agent/spectator distinction
- Markdown support
- Mentions (@agent)

### Scoreboard (Rankings)

```typescript
{
  "id": "scoreboard",
  "type": "scoreboard",
  "component": "Scoreboard",
  "label": "Scores",
  "position": "top",
  "props": {
    "sortBy": "score",
    "showTeamScores": true,
    "columns": ["rank", "name", "kills", "deaths", "score", "ping"]
  }
}
```

**Characteristics:**
- Horizontal or vertical layout
- Real-time updates
- Sortable columns
- Team grouping

### Header (Top Bar)

```typescript
{
  "id": "battle-header",
  "type": "header",
  "component": "BattleHeader",
  "label": "Battle Controls",
  "position": "top",
  "props": {
    "showTimer": true,
    "showTurnCounter": true,
    "showPauseButton": true,
    "showSpeedControl": true
  }
}
```

**Characteristics:**
- Full-width at top
- Battle controls (pause, speed, reset)
- Timer/turn display
- Connection status

### Footer (Bottom Bar)

```typescript
{
  "id": "status-bar",
  "type": "footer",
  "component": "StatusBar",
  "label": "Status",
  "position": "bottom",
  "props": {
    "showConnection": true,
    "showPerformance": true,
    "showAgentStatus": true
  }
}
```

**Characteristics:**
- Full-width at bottom
- Status indicators
- Performance metrics
- Quick actions

### Overlay (Floating)

```typescript
{
  "id": "minimap",
  "type": "overlay",
  "component": "Minimap",
  "label": "Minimap",
  "position": "top-right",
  "props": {
    "size": 200,
    "draggable": true,
    "resizable": true,
    "showAgents": true,
    "showTerrain": true
  }
}
```

**Characteristics:**
- Absolute positioning
- Draggable/resizable
- Z-index managed
- Can be minimized to icon
- Persistent across battles

### Custom (Arbitrary Component)

```typescript
{
  "id": "custom-visualization",
  "type": "custom",
  "component": "CustomVisualization",
  "label": "Custom View",
  "position": "center",
  "props": {
    "dataSource": "battle-metrics",
    "visualizationType": "heatmap"
  }
}
```

**Characteristics:**
- Full control over rendering
- Receives standard PanelProps
- Can be any position
- Must be registered in ComponentRegistry

---

## Conditional Display (`when`)

```typescript
interface UICondition {
  // Arena/Game context
  arenaId?: string | string[];
  gameId?: string | string[];
  
  // Capability-based
  hasCapability?: string | string[];
  agentHasCapability?: string;
  
  // User context
  isSpectator?: boolean;
  isParticipant?: boolean;
  isAdmin?: boolean;
  
  // Battle state
  battlePhase?: 'running' | 'paused' | 'finished';
  hasActiveBattle?: boolean;
  
  // Configuration
  config?: Record<string, unknown>;
  
  // Custom evaluation
  custom?: string; // Expression evaluated at runtime
}
```

### Examples

```json
// Only for specific arena
{ "when": { "arenaId": "battle-tanks" } }

// Only when agent has tactical-map capability
{ "when": { "agentHasCapability": "tactical-map" } }

// Only for spectators
{ "when": { "isSpectator": true } }

// Only when config flag enabled
{ "when": { "config": { "showAdvancedUI": true } } }

// Multiple conditions (AND)
{ "when": { "arenaId": "chess-arena", "isSpectator": true } }
```

---

## Dashboard Widgets

```json
{
  "contributions": {
    "dashboardWidgets": [
      {
        "id": "win-rate",
        "component": "WinRateWidget",
        "label": "Win Rate",
        "defaultSize": { "width": 300, "height": 200 },
        "configSchema": {
          "type": "object",
          "properties": {
            "timeRange": { "type": "string", "enum": ["day", "week", "month", "all"] },
            "agentFilter": { "type": "string" }
          }
        }
      }
    ]
  }
}
```

### Widget Props

```typescript
interface WidgetProps extends PanelProps {
  // Widget-specific config
  config: Record<string, any>;
  
  // Actions
  onConfigChange: (config: Record<string, any>) => void;
  onResize: (size: { width: number; height: number }) => void;
}
```

---

## Navigation Items

```json
{
  "contributions": {
    "navigationItems": [
      {
        "id": "replay-browser",
        "label": "Replays",
        "path": "/replays",
        "icon": "film",
        "order": 10,
        "when": { "hasActiveBattle": false }
      },
      {
        "id": "agent-profiles",
        "label": "Agents",
        "path": "/agents",
        "icon": "users",
        "order": 20
      },
      {
        "id": "arena-builder",
        "label": "Arena Builder",
        "path": "/arenas/builder",
        "icon": "hammer",
        "order": 30,
        "when": { "isAdmin": true }
      }
    ]
  }
}
```

### Navigation Props

```typescript
interface NavigationItemProps {
  readonly item: NavigationItemConfig;
  readonly active: boolean;
  readonly onClick: () => void;
}
```

---

## Context Menus

```json
{
  "contributions": {
    "contextMenus": {
      "agent": [
        { "command": "agent:message", "label": "Send Message", "icon": "message-square" },
        { "command": "agent:challenge", "label": "Challenge", "icon": "sword" },
        { "separator": true },
        { "command": "agent:view-profile", "label": "View Profile", "icon": "user" },
        { "command": "agent:spectate", "label": "Spectate", "icon": "eye" }
      ],
      "battle": [
        { "command": "battle:pause", "label": "Pause", "icon": "pause" },
        { "command": "battle:export-replay", "label": "Export Replay", "icon": "download" },
        { "separator": true },
        { "command": "battle:clone", "label": "Clone Battle", "icon": "copy" }
      ],
      "arena": [
        { "command": "arena:edit", "label": "Edit", "icon": "edit" },
        { "command": "arena:duplicate", "label": "Duplicate", "icon": "copy" },
        { "command": "arena:delete", "label": "Delete", "icon": "trash-2", "dangerous": true }
      ],
      "panel": [
        { "command": "panel:close", "label": "Close Panel", "icon": "x" },
        { "command": "panel:float", "label": "Float Panel", "icon": "maximize" },
        { "command": "panel:reset", "label": "Reset Layout", "icon": "refresh-cw" }
      ]
    }
  }
}
```

### Menu Targets

| Target | Context | Available Data |
|--------|---------|----------------|
| `agent` | Agent list/avatar | `agentId`, `agentName`, `battleId` |
| `battle` | Battle list/card | `battleId`, `battleState` |
| `arena` | Arena card | `arenaId`, `arenaConfig` |
| `game` | Game card | `gameId`, `gameConfig` |
| `panel` | Panel title bar | `panelId`, `panelPosition` |
| `replay` | Replay list | `replayId`, `battleId` |

---

## Position Reference

### Dock Positions

```
┌──────────────────────────────────────────────────────────────┐
│ Header (position: "top")                                     │
├──────────┬─────────────────────────────────────────────┬─────┤
│          │                                             │     │
│ Left     │           Center                            │Right │
│ (position│           (position: "center")              │(pos: │
│ "left")  │                                             │"right")│
│          │                                             │     │
├──────────┴─────────────────────────────────────────────┴─────┤
│ Bottom (position: "bottom")                                  │
├──────────────────────────────────────────────────────────────┤
│ Footer (position: "bottom") - below bottom dock              │
└──────────────────────────────────────────────────────────────┘
```

### Overlay Positions

```
position: "overlay" + props.position:
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  top-left          top           top-right                   │
│     ●───────────────────●───────────────────●                │
│     │                   │                   │                │
│     │                   │                   │                │
│     │                   │                   │                │
│  left                 center               right             │
│     │                   │                   │                │
│     │                   │                   │                │
│     │                   │                   │                │
│     ●───────────────────●───────────────────●                │
│  bottom-left      bottom         bottom-right                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Position Values

```typescript
type PanelPosition = 
  | 'center'           // Main workspace
  | 'left' | 'right'   // Side docks
  | 'top' | 'bottom'   // Header/footer
  | 'top-left' | 'top-right'
  | 'bottom-left' | 'bottom-right'
  | 'overlay';         // Floating (use props.position for exact)
```

---

## Component Props Reference

### Base PanelProps (Injected by Shell)

```typescript
interface PanelProps {
  // Identity
  panelId: string;
  component: string;
  
  // Layout
  position: PanelPosition;
  size: { width: number; height: number };
  focused: boolean;
  zIndex: number;
  
  // Actions
  onClose: () => void;
  onResize: (size: { width: number; height: number }) => void;
  onFocus: () => void;
  onMove: (newPosition: PanelPosition) => void;
  
  // Context
  battleId?: BattleId;
  agentId?: AgentId;
  arenaId?: ArenaId;
  gameId?: GameId;
  
  // Custom props from manifest
  [key: string]: any;
}
```

### Overlay Props (Additional)

```typescript
interface OverlayProps extends PanelProps {
  draggable: boolean;
  resizable: boolean;
  minimizable: boolean;
  minimized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
}
```

---

## Registration Flow

```
1. Plugin activates
   │
   ▼
2. Plugin calls registerComponents()
   │
   ▼
3. ComponentRegistry.register('ComponentName', Component)
   │
   ▼
4. Shell reads plugin manifest
   │
   ▼
5. For each uiPanel:
   a) ComponentRegistry.get(componentName)
   b) Create React element with PanelProps
   c) Mount in appropriate DockPanel/Overlay
   │
   ▼
6. Panel receives events via eventBus
   │
   ▼
7. On plugin deactivate:
   a) ComponentRegistry.unregister()
   b) Shell unmounts panels
   c) Cleanup
```

---

## Testing Components

```typescript
// tests/TacticalMap.test.tsx
import { render, screen } from '@testing-library/react';
import { TacticalMap } from '../TacticalMap';
import { createMockPanelProps } from '@aga/web/testing';

describe('TacticalMap', () => {
  it('renders canvas', () => {
    const props = createMockPanelProps({
      panelId: 'tactical-map',
      battleId: 'battle-1',
    });
    
    render(<TacticalMap {...props} />);
    
    expect(screen.getByRole('canvas')).toBeInTheDocument();
  });

  it('handles close', () => {
    const onClose = vi.fn();
    const props = createMockPanelProps({ onClose });
    
    render(<TacticalMap {...props} />);
    
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('subscribes to battle events', () => {
    const props = createMockPanelProps({ battleId: 'battle-1' });
    
    render(<TacticalMap {...props} />);
    
    expect(eventBus.subscribe).toHaveBeenCalledWith(
      'RenderStateUpdated',
      expect.any(Function)
    );
  });
});
```