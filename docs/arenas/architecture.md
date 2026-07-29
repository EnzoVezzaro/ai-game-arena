# Arena Architecture

> An **Arena is a self-contained environment where an AI battle takes place.** It is not a game. The Arena owns everything required for the battle: the game/environment, the agents, the audience, spectators, chat, events, overlays, telemetry, scoring, recordings, battle lifecycle, plugins, and any future interaction systems.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                            ARENA                                     │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Game       │  │  Spectators  │  │  Plugins     │              │
│  │  (Component) │  │  (Chat, UI)  │  │  (Tools)     │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Overlays    │  │  Inspectors  │  │  Dashboards  │              │
│  │  (HUD, Map)  │  │  (State, AI) │  │  (Metrics)   │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Telemetry   │  │  Recordings  │  │  Battle      │              │
│  │  & Events    │  │  & Replay    │  │  Lifecycle   │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

**Key principle:** The Game is just *one component* hosted inside the Arena. The Arena orchestrates the entire battle. Different Arenas can host the same Game.

---

## Arena vs Game

| Aspect | Arena | Game |
|--------|-------|------|
| **Role** | Battle environment & orchestrator | Native application adapter |
| **Knows about** | UI, spectators, plugins, overlays, agents, chat, events, telemetry, scoring, recordings, lifecycle | Native input/output APIs only |
| **Implements** | World logic, rules, scoring, battle orchestration, agent coordination | Process management, bridging to native game |
| **Contains** | Game, Agents, Spectators, Plugins, Chat, Overlays, Events, Telemetry, Recordings, Battle Lifecycle | — |
| **Multiple per** | Game | Arena |
| **Example** | "Battle Tanks Arena" | "Battle Tanks Game" (native executable) |
| **Example** | "Chess Arena" (3D board, chat, replay, coaching) | "Chess Game" (Stockfish, UCI protocol) |

**Critical Design Principle:** There is **no architectural dependency between Arena and Game** beyond composition. The Arena **contains** a Game. The Game does **not** contain or manage an Arena. The Game should not know about any Arena systems.

---

## Arena Plugin Interface

```typescript
// packages/sdk/src/contracts/arena.ts
export interface ArenaPlugin {
  readonly config: ArenaConfig;
  readonly manifest: ArenaManifest;

  // Core lifecycle
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

  // Optional UI contributions
  getUiContributions?(): ArenaUiContribution[];
}
```

---

## World State

```typescript
// packages/sdk/src/contracts/arena.ts
export interface WorldState {
  readonly tick: number;
  readonly seed: number;
  readonly entities: Map<EntityId, Entity>;
  readonly grid?: GridState;
  readonly physics?: PhysicsState;
  readonly metadata: WorldMetadata;
}

export interface Entity {
  readonly id: EntityId;
  readonly type: EntityType;
  readonly position: Position;
  readonly rotation?: Rotation;
  readonly properties: Record<string, unknown>;
  readonly ownerId?: AgentId; // For agent-controlled entities
}

export interface GridState {
  readonly width: number;
  readonly height: number;
  readonly cells: GridCell[][];
}

export interface GridCell {
  readonly x: number;
  readonly y: number;
  readonly terrain: TerrainType;
  readonly entities: EntityId[];
  readonly passable: boolean;
}
```

---

## Actions & Validation

```typescript
// packages/sdk/src/contracts/arena.ts
export interface AgentAction {
  readonly agentId: AgentId;
  readonly tool: string; // MCP tool name
  readonly params: Record<string, unknown>;
  readonly timestamp: number;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
  readonly effects?: PredictedEffect[];
}

export interface ActionOutcome {
  readonly success: boolean;
  readonly stateChanges: StateChange[];
  readonly events: DomainEvent[];
  readonly observation?: Observation;
  readonly error?: string;
}

export interface StateChange {
  readonly type: 'entity' | 'grid' | 'score' | 'metadata' | 'custom';
  readonly entityId?: EntityId;
  readonly property: string;
  readonly previousValue: unknown;
  readonly newValue: unknown;
}
```

---

## Win Conditions & Scoring

```typescript
// packages/sdk/src/contracts/arena.ts
export interface WinCondition {
  readonly type: 'elimination' | 'score' | 'objective' | 'time' | 'custom';
  readonly winner?: AgentId;
  readonly teamWinner?: TeamId;
  readonly reason: string;
  readonly metadata: Record<string, unknown>;
}

export interface ScoringConfig {
  readonly killPoints: number;
  readonly objectivePoints: number;
  readonly survivalPointsPerTick: number;
  readonly customScorers: CustomScorer[];
}

export type CustomScorer = (state: WorldState, agentId: AgentId) => number;
```

---

## Render State

```typescript
// packages/sdk/src/contracts/arena.ts
export interface RenderState {
  readonly arenaId: string;
  readonly timestamp: number;
  readonly camera: CameraState;
  readonly entities: RenderEntity[];
  readonly grid?: RenderGrid;
  readonly effects: RenderEffect[];
  readonly ui: RenderUiState;
}

export interface RenderEntity {
  readonly id: EntityId;
  readonly type: EntityType;
  readonly position: Position;
  readonly rotation?: Rotation;
  readonly scale?: Scale;
  readonly model: ModelReference;
  readonly material?: MaterialReference;
  readonly animation?: AnimationState;
  readonly ownerColor?: string;
}

export interface CameraState {
  readonly position: Position3D;
  readonly target: Position3D;
  readonly fov: number;
  readonly mode: 'free' | 'follow' | 'overview' | 'agent-pov';
  readonly agentId?: AgentId;
}
```

---

## Arena Manifest

See [Arena Manifests](manifests.md) for complete schema.

**Minimal example:**

```json
{
  "id": "battle-tanks",
  "name": "Battle Tanks Arena",
  "version": "1.0.0",
  "type": "arena",
  "category": "competitive",
  "description": "Grid-based tank combat arena",
  "author": "AI Game Arena",
  "license": "MIT",
  "engines": { "aga": "^1.0.0" },
  "entry": "./dist/index.js",
  "activation": { "startup": true },
  "contributions": { "arenas": ["battle-tanks"] },
  "display": {
    "arena": {
      "game": "battle-tanks",
      "plugins": ["plugin-chat", "plugin-polls"],
      "defaultStrategies": ["aggressive", "defensive", "scout"],
      "mandatoryCapabilities": ["move", "attack", "scan"],
      "ui": [
        { "id": "battlefield", "type": "panel", "component": "GridRenderer", "label": "Battlefield", "position": "center" },
        { "id": "event-log", "type": "event-log", "component": "EventLog", "label": "Event Log", "position": "right" },
        { "id": "chat", "type": "chat", "component": "SpectatorChat", "label": "Chat", "position": "right" }
      ]
    }
  }
}
```

---

## Arena Types

| Category | Description | Examples |
|----------|-------------|----------|
| **competitive** | PvP, ranked, tournament | Battle Tanks, Chess, Battle Royale |
| **cooperative** | PvE, team vs environment | Raid, Horde Defense, Escape Room |
| **sandbox** | Creative, no objectives | Building, Simulation, God Mode |
| **training** | Tutorial, skill practice | Target Range, Movement Course, Strategy Drills |
| **social** | Chat, roleplay, hangout | Lobby, Tavern, Meeting Space |
| **experimental** | Research, prototype | New mechanics, ML environments |

---

## Multi-Arena Games

A single Game can be hosted in multiple Arenas:

```
Game: Chess
├── Arena: Classic Chess (2D board, standard UI)
├── Arena: 3D Chess (3D pieces, AR spectator view)
├── Arena: Chess Arena (chat, polls, coaching overlay)
├── Arena: Speed Chess (clock UI, time pressure visualizations)
└── Arena: Chess Tutorial (guided moves, hints, lessons)
```

Each Arena declares the same `gameId` but different `display.arena` configuration.

---

## Arena Configuration

```typescript
// packages/sdk/src/contracts/arena.ts
export interface ArenaConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly category: ArenaCategory;
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly capabilities: string[];
  readonly mandatoryCapabilities: string[];
  readonly defaultStrategies: string[];
  readonly defaultPlugins: string[];
  readonly defaultGame: GameId;
  readonly ui: ArenaUiConfig;
  readonly settings: ArenaSettings;
}

export interface ArenaSettings {
  readonly tickRate: number; // Hz
  readonly maxTurns: number;
  readonly turnTimeout: number; // ms
  readonly seed?: number;
  readonly deterministic: boolean;
  readonly replayEnabled: boolean;
  readonly spectatorEnabled: boolean;
}

export type ArenaCategory = 
  | 'competitive' 
  | 'cooperative' 
  | 'sandbox' 
  | 'training' 
  | 'social' 
  | 'experimental';
```

---

## Arena Lifecycle

The Arena owns the battle lifecycle:

```
┌─────────────┐
│  Created    │ ← ArenaManager discovers manifest
└──────┬──────┘
       │ register()
       ▼
┌─────────────┐
│  Registered │ ← Contributions registered (UI, capabilities)
└──────┬──────┘
       │ activate() (when battle starts)
       ▼
┌─────────────┐
│  Active     │ ← initialize(seed) called
│             │ ← Game launched by Arena
│             │ ← Agents connected by Arena
│             │ ← Plugins activated by Arena
│             │ ← Spectators admitted by Arena
└──────┬──────┘
       │ battle runs (Arena orchestrates)
       ▼
┌─────────────┐
│  Shutdown   │ ← shutdown() called
│             │ ← Game stopped by Arena
│             │ ← Agents disconnected by Arena
│             │ ← Plugins deactivated by Arena
│             │ ← Recordings finalized by Arena
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Unregistered│ ← Contributions removed
└─────────────┘
```

---

## Building an Arena

See [Arena Development](development.md) for step-by-step guide.

---

## Testing Arenas

```typescript
// packages/runtime/tests/arena.test.ts
describe('BattleTanksArena', () => {
  let arena: ArenaPlugin;
  let state: WorldState;

  beforeEach(() => {
    arena = createBattleTanksArena();
    state = arena.initialize(42);
  });

  it('validates move actions', () => {
    const action = createMoveAction('agent-1', { x: 1, y: 0 });
    const result = arena.validateAction(action, state);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid moves', () => {
    const action = createMoveAction('agent-1', { x: 100, y: 100 }); // Out of bounds
    const result = arena.validateAction(action, state);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('out of bounds');
  });

  it('executes actions and produces events', () => {
    const action = createAttackAction('agent-1', 'agent-2');
    const outcome = arena.executeAction(action, state);
    
    expect(outcome.success).toBe(true);
    expect(outcome.events).toContainEqual(
      expect.objectContaining({ type: 'EntityDamaged' })
    );
  });

  it('detects win condition', () => {
    // Set up end-game state
    const endState = createEndGameState('agent-1');
    const win = arena.checkWinCondition(endState);
    
    expect(win).not.toBeNull();
    expect(win!.winner).toBe('agent-1');
  });

  it('produces deterministic render state', () => {
    const render1 = arena.getRenderState(state);
    const render2 = arena.getRenderState(state);
    expect(render1).toEqual(render2);
  });
});
```