# Arena Architecture

> **CRITICAL ARCHITECTURAL PRINCIPLE:** An **Arena is a self-contained battle ENVIRONMENT. It is NOT a game.** The Arena owns everything required for the battle: the layout/environment, the agents, the spectators, chat, events, overlays, telemetry, scoring, recordings, battle lifecycle, plugins, and any future interaction systems. The Game is merely ONE COMPONENT hosted INSIDE the Arena. The Arena orchestrates the entire battle. Different Arenas can host the same Game. **There is ZERO architectural dependency between Arena and Game beyond composition.**

---

## ⚠️ CRITICAL: Arena vs Game — The Separation Is Absolute

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    ARENA                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                         BATTLE ENVIRONMENT                                    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │   │
│  │  │   Arena      │  │  Spectators  │  │   Plugins    │  │  Battle      │    │   │
│  │  │  Layout/     │  │  (Chat, UI)  │  │  (Tools)     │  │  Lifecycle   │    │   │
│  │  │  Environment │  │              │  │              │  │  (Turns, Win  │    │   │
│  │  │  (World)     │  │              │  │              │  │   Conditions)│    │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │   │
│  │  │  Overlays    │  │  Inspectors  │  │  Dashboards  │  │  Telemetry   │    │   │
│  │  │  (HUD, Map)  │  │  (State, AI) │  │  (Metrics)   │  │  & Events    │    │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │   │
│  │  │  Recordings  │  │  Agents      │  │  Game        │  │  Scoring     │    │   │
│  │  │  & Replay    │  │  (AI Minds)  │  │  (Component) │  │  & Win Cond  │    │   │
│  │  └──────────────┘  └──────────────┘  └──────┬───────┘  └──────────────┘    │   │
│  └───────────────────────────────────────────────┼──────────────────────────────┘   │
└──────────────────────────────────────────────────┼───────────────────────────────────┘
                                                   │
                                                   ▼
                                    ┌─────────────────────────────┐
                                    │         GAME                │
                                    │  (Native Application)       │
                                    │  ┌──────────────────────┐   │
                                    │  │  Controller Adapter  │   │
                                    │  │  Observation Adapter │   │
                                    │  │  Process Management  │   │
                                    │  └──────────────────────┘   │
                                    └─────────────────────────────┘
                                                   │
                                    ┌──────────────┴──────────────┐
                                    │    Native Game Binary       │
                                    │    (e.g., Battle Tanks,     │
                                    │     Chess Engine, etc.)     │
                                    └─────────────────────────────┘
```

**THE ARENA DOES NOT KNOW GAME LOGIC. THE GAME DOES NOT KNOW THE ARENA EXISTS.**

| Aspect | Arena (Environment) | Game (Native Adapter) |
|--------|---------------------|----------------------|
| **Role** | Battle environment & orchestrator | Native application adapter |
| **Knows about** | UI, spectators, plugins, overlays, agents, chat, events, telemetry, scoring, recordings, lifecycle | Native input/output APIs ONLY |
| **Implements** | World logic, rules, scoring, battle orchestration, agent coordination | Process management, bridging to native game |
| **Contains** | Game, Agents, Spectators, Plugins, Chat, Overlays, Events, Telemetry, Recordings, Battle Lifecycle | — (contained BY Arena) |
| **Multiple per** | Game (many arenas per game) | Arena (one game per arena instance) |
| **Example** | "Battle Tanks Arena" (3D, chat, replay, coaching) | "Battle Tanks Game" (native executable, no arena knowledge) |
| **Example** | "Chess Arena 3D" (AR spectator, analysis overlay) | "Chess Game" (Stockfish, UCI protocol) |

**CRITICAL DESIGN PRINCIPLE — NO ARCHITECTURAL DEPENDENCY EXISTS:**

> The Arena **CONTAINS** a Game. The Game does **NOT** contain or manage an Arena. The Game **MUST NOT** know about any Arena systems (spectators, chat, plugins, overlays, telemetry, recordings, battle lifecycle, agents, controllers, observations, or any other arena concern).

---

## Arena Plugin Interface (Pure Environment Logic)

The Arena plugin implements **pure environment logic** — world state, validation, execution, observations, win conditions, scoring, and rendering. **This is NOT game logic.** This is the arena's world simulation.

```typescript
// packages/sdk/src/contracts/arena.ts
export interface ArenaPlugin {
  readonly config: ArenaConfig;
  readonly manifest: ArenaManifest;

  // Core lifecycle
  initialize(seed?: number): WorldState;
  shutdown(): Promise<void>;

  // Environment logic (pure functions) — THIS IS ARENA LOGIC, NOT GAME LOGIC
  getTools(): ToolDefinition[];                    // What agents CAN DO in this environment
  validateAction(action: AgentAction, state: WorldState): ValidationResult;
  executeAction(action: AgentAction, state: WorldState): ActionOutcome;
  getObservation(agentId: string, state: WorldState): Observation;
  checkWinCondition(state: WorldState): WinCondition | null;
  getScores(state: WorldState): Record<string, number>;

  // Rendering (arena's view of the world)
  getRenderState(state: WorldState): RenderState;

  // Optional UI contributions (arena-specific UI)
  getUiContributions?(): ArenaUiContribution[];
}
```

### What Arena Logic IS:
- **World/Environment simulation** — grid, physics, terrain, entities, resources
- **Action validation** — is this move legal in THIS environment?
- **Action execution** — apply action to world state, produce events
- **Observations** — what can an agent see from its position in THIS environment?
- **Win conditions** — has someone won in THIS environment?
- **Scoring** — how are points calculated in THIS environment?
- **Rendering** — how does THIS environment look to spectators?

### What Arena Logic is NOT:
- ❌ Native game process management
- ❌ Native input/output bridging
- ❌ AI reasoning / LLM calls
- ❌ Controller/MCP logic
- ❌ Observation capture from native game
- ❌ Network/protocol handling

---

## World State (Arena's World, Not Game's State)

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

**This is the ARENA's world state.** It represents the battle environment. The Game adapter has its own internal state (the native game's state). The Arena's world state is what agents interact with through the Controller/MCP layer.

---

## Actions & Validation (Arena Environment Rules)

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

**Arena validates actions against ITS world state. The Agent executes via Controller/MCP directly on the Game. The Game never sees Arena actions. After Game runs, Arena updates its world state via executeAction().**

---

## Win Conditions & Scoring (Arena Rules)

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

**The Arena decides who wins. The Game just runs.**

---

## Render State (Arena's Visual Representation)

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

**The Arena renders ITS world. The Game renders ITS native view. Spectators see the Arena's render state.**

---

## Arena Manifest (Declares What Game It Hosts)

See [Arena Manifests](manifests.md) for complete schema.

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
      "mandatoryCapabilities": ["move", "attack"],
      "ui": [
        { "id": "battlefield", "type": "panel", "component": "GridRenderer", "label": "Battlefield", "position": "center" },
        { "id": "event-log", "type": "event-log", "component": "EventLog", "label": "Event Log", "position": "right" },
        { "id": "chat", "type": "chat", "component": "SpectatorChat", "label": "Chat", "position": "right" }
      ]
    }
  }
}
```

**Key field: `"game": "battle-tanks"`** — This declares which Game adapter this Arena hosts. Multiple Arenas can declare the same `game` ID.

---

## Arena Types (Environment Categories)

| Category | Description | Examples |
|----------|-------------|----------|
| **competitive** | PvP, ranked, tournament | Battle Tanks, Chess, Battle Royale |
| **cooperative** | PvE, team vs environment | Raid, Horde Defense, Escape Room |
| **sandbox** | Creative, no objectives | Building, Simulation, God Mode |
| **training** | Tutorial, skill practice | Target Range, Movement Course, Strategy Drills |
| **social** | Chat, roleplay, hangout | Lobby, Tavern, Meeting Space |
| **experimental** | Research, prototype | New mechanics, ML environments |

---

## Multi-Arena Games (One Game, Many Environments)

A **single Game** can be hosted in **multiple Arenas**:

```
Game: Chess
├── Arena: Classic Chess (2D board, standard UI)
├── Arena: 3D Chess (3D pieces, AR spectator view)
├── Arena: Chess Arena (chat, polls, coaching overlay)
├── Arena: Speed Chess (clock UI, time pressure visualizations)
└── Arena: Chess Tutorial (guided moves, hints, lessons)
```

Each Arena declares the same `gameId` but different `display.arena` configuration.

**The Game is identical. The Arena (environment) is different.**

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
  readonly tickRate: number;        // Hz
  readonly maxTurns: number;
  readonly turnTimeout: number;     // ms
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

## Arena Lifecycle (Arena Owns the Battle)

The Arena **owns the battle lifecycle**:

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
│             │ ← Game LAUNCHED by Arena
│             │ ← Agents CONNECTED by Arena
│             │ ← Plugins ACTIVATED by Arena
│             │ ← Spectators ADMITTED by Arena
└──────┬──────┘
       │ battle runs (Arena ORCHESTRATES)
       ▼
┌─────────────┐
│  Shutdown   │ ← shutdown() called
│             │ ← Game STOPPED by Arena
│             │ ← Agents DISCONNECTED by Arena
│             │ ← Plugins DEACTIVATED by Arena
│             │ ← Recordings FINALIZED by Arena
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Unregistered│ ← Contributions removed
└─────────────┘
```

**The Arena starts the Game. The Arena stops the Game. The Arena coordinates everything.**

---

## Building an Arena

See [Arena Development](development.md) for step-by-step guide.

---

## Testing Arenas (Pure Environment Logic)

```typescript
// packages/runtime/tests/arena.test.ts
describe('BattleTanksArena', () => {
  let arena: ArenaPlugin;
  let state: WorldState;

  beforeEach(() => {
    arena = createBattleTanksArena();
    state = arena.initialize(42);
  });

  it('validates move actions against environment', () => {
    const action = createMoveAction('agent-1', { x: 1, y: 0 });
    const result = arena.validateAction(action, state);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid moves (out of bounds)', () => {
    const action = createMoveAction('agent-1', { x: 100, y: 100 });
    const result = arena.validateAction(action, state);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('out of bounds');
  });

  it('executes actions and produces environment events', () => {
    const action = createAttackAction('agent-1', 'agent-2');
    const outcome = arena.executeAction(action, state);
    
    expect(outcome.success).toBe(true);
    expect(outcome.events).toContainEqual(
      expect.objectContaining({ type: 'EntityDamaged' })
    );
  });

  it('detects win condition in this environment', () => {
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

**Test the Arena's environment logic in isolation. The Game is not involved.**

---

## Summary: The Separation Is Non-Negotiable

| Arena (Environment) | Game (Native Adapter) |
|---------------------|----------------------|
| **Owns** the battle | **Is owned by** the battle |
| **Contains** the Game | **Contained by** the Arena |
| **Knows** everything about the battle | **Knows nothing** about the battle |
| **Orchestrates** agents, spectators, plugins, UI | **Bridges** to native process only |
| **Defines** world, rules, win conditions, scoring | **Exposes** native input/output |
| **Renders** for spectators | **Renders** for itself (native) |
| **Records** replays, telemetry, events | **Runs** the native executable |
| **Multiple per Game** | **One per Arena instance** |

**The Arena is the battlefield. The Game is just what's being played on it. They are architecturally separate.**