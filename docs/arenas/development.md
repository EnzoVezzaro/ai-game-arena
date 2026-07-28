# Arena Development

> Building custom arenas — environments, UI, capabilities, and integration.

---

## Overview

An **Arena** is an **environment container**. It defines:

1. **World logic** — Rules, physics, win conditions
2. **UI layout** — Panels, overlays, spectator experience
3. **Capabilities** — What agents can do
4. **Default configuration** — Game, plugins, strategies

**The Arena is not the Game.** The Game is a native application adapter. The Arena *hosts* the Game and adds the environment layer.

---

## Project Structure

```
my-arena/
├── arena.json          # Manifest
├── package.json               # NPM package
├── tsconfig.json              # TypeScript config
├── src/
│   ├── index.ts               # Export default
│   ├── arena.ts               # ArenaPlugin implementation
│   ├── state.ts               # WorldState, types
│   ├── tools.ts               # ToolDefinitions (MCP)
│   ├── validation.ts          # Action validation
│   ├── scoring.ts             # Scoring, win conditions
│   └── render.ts              # RenderState types
├── ui/                        # Frontend components (optional)
│   ├── GridRenderer.tsx
│   ├── Minimap.tsx
│   └── BattleOverlay.tsx
├── tests/
│   ├── arena.test.ts
│   └── fixtures/
└── dist/                      # Compiled output
```

---

## Step 1: Create Manifest

```json
// arena.json
{
  "id": "my-arena",
  "name": "My Custom Arena",
  "description": "A unique environment for AI agents",
  "version": "1.0.0",
  "type": "arena",
  "category": "competitive",
  "engines": { "aga": "^1.0.0" },
  "entry": "./dist/index.js",
  "activation": { "startup": true },
  "contributions": { "arenas": ["my-arena"] },
  "capabilities": ["move", "interact", "scan"],
  "display": {
    "arena": {
      "game": "my-game",
      "plugins": ["plugin-chat"],
      "defaultStrategies": ["explorer", "builder"],
      "mandatoryCapabilities": ["move"],
      "ui": [
        { "id": "world", "type": "panel", "component": "WorldView", "label": "World", "position": "center" },
        { "id": "log", "type": "event-log", "component": "EventLog", "label": "Log", "position": "right" }
      ]
    }
  }
}
```

---

## Step 2: Implement ArenaPlugin

```typescript
// src/arena.ts
import { ArenaPlugin, ArenaConfig, WorldState, AgentAction, ValidationResult, ActionOutcome, Observation, WinCondition, RenderState } from '@aga/sdk';

export class MyArena implements ArenaPlugin {
  readonly config: ArenaConfig = {
    id: 'my-arena',
    name: 'My Custom Arena',
    description: 'A unique environment for AI agents',
    version: '1.0.0',
    minPlayers: 2,
    maxPlayers: 8,
    capabilities: ['move', 'interact', 'scan'],
    mandatoryCapabilities: ['move'],
  };

  readonly manifest = {
    id: 'my-arena',
    name: 'My Custom Arena',
    version: '1.0.0',
    type: 'arena' as const,
    category: 'competitive' as const,
    capabilities: ['move', 'interact', 'scan'],
    display: {
      arena: {
        game: 'my-game',
        plugins: ['plugin-chat'],
        defaultStrategies: ['explorer', 'builder'],
        mandatoryCapabilities: ['move'],
        ui: [
          { id: 'world', type: 'panel', component: 'WorldView', label: 'World', position: 'center' },
          { id: 'log', type: 'event-log', component: 'EventLog', label: 'Log', position: 'right' },
        ],
      },
    },
  };

  // Initialize world with optional seed for determinism
  initialize(seed?: number): WorldState {
    const rng = seed ? new SeededRandom(seed) : new MathRandom();
    
    return {
      tick: 0,
      seed: seed ?? Date.now(),
      entities: new Map(),
      terrain: this.generateTerrain(rng),
      resources: this.generateResources(rng),
      players: new Map(),
      projectiles: [],
      effects: [],
      config: this.config,
    };
  }

  // Pure validation — no side effects
  validateAction(action: AgentAction, state: WorldState): ValidationResult {
    const entity = state.entities.get(action.agentId);
    if (!entity) return { valid: false, reason: 'Agent not found' };

    switch (action.type) {
      case 'move':
        return this.validateMove(action, entity, state);
      case 'interact':
        return this.validateInteract(action, entity, state);
      case 'scan':
        return this.validateScan(action, entity, state);
      default:
        return { valid: false, reason: `Unknown action: ${action.type}` };
    }
  }

  // Pure execution — returns new state + events
  executeAction(action: AgentAction, state: WorldState): ActionOutcome {
    const validation = this.validateAction(action, state);
    if (!validation.valid) {
      return { success: false, events: [], reason: validation.reason };
    }

    const events: DomainEvent[] = [];
    const newState = { ...state };

    switch (action.type) {
      case 'move':
        this.executeMove(action, newState, events);
        break;
      case 'interact':
        this.executeInteract(action, newState, events);
        break;
      case 'scan':
        this.executeScan(action, newState, events);
        break;
    }

    newState.tick++;
    return { success: true, events, newState };
  }

  // Observation for specific agent
  getObservation(agentId: string, state: WorldState): Observation {
    const entity = state.entities.get(agentId);
    if (!entity) {
      return this.createEmptyObservation(agentId);
    }

    return {
      timestamp: Date.now(),
      agentId,
      type: 'board-state',
      data: {
        self: entity,
        visibleEntities: this.getVisibleEntities(entity, state),
        terrain: this.getVisibleTerrain(entity, state),
        resources: this.getVisibleResources(entity, state),
      },
      metadata: {
        captureDurationMs: 0,
        source: 'my-arena',
        version: '1.0.0',
        filtersApplied: ['fog-of-war'],
        transformsApplied: [],
      },
    };
  }

  // Win condition check
  checkWinCondition(state: WorldState): WinCondition | null {
    const alivePlayers = Array.from(state.players.values()).filter(p => p.alive);
    
    if (alivePlayers.length <= 1) {
      return {
        type: alivePlayers.length === 1 ? 'victory' : 'draw',
        winner: alivePlayers[0]?.id,
        reason: alivePlayers.length === 1 ? 'Last agent standing' : 'All agents eliminated',
      };
    }

    // Check score victory
    const maxScore = Math.max(...alivePlayers.map(p => p.score));
    if (maxScore >= 1000) {
      const winner = alivePlayers.find(p => p.score === maxScore)!;
      return { type: 'victory', winner: winner.id, reason: 'Score limit reached' };
    }

    return null;
  }

  // Scoring
  getScores(state: WorldState): Record<string, number> {
    const scores: Record<string, number> = {};
    for (const [id, player] of state.players) {
      scores[id] = player.score;
    }
    return scores;
  }

  // Render state for UI
  getRenderState(state: WorldState): RenderState {
    return {
      tick: state.tick,
      entities: Array.from(state.entities.values()),
      terrain: state.terrain,
      resources: state.resources,
      projectiles: state.projectiles,
      effects: state.effects,
      players: Array.from(state.players.values()),
    };
  }

  // MCP Tool definitions for agents
  getTools(): ToolDefinition[] {
    return [
      {
        name: 'move',
        description: 'Move to adjacent cell',
        inputSchema: {
          type: 'object',
          properties: {
            direction: { type: 'string', enum: ['north', 'south', 'east', 'west'] },
          },
          required: ['direction'],
        },
      },
      {
        name: 'interact',
        description: 'Interact with entity at target position',
        inputSchema: {
          type: 'object',
          properties: {
            targetId: { type: 'string' },
            action: { type: 'string', enum: ['collect', 'attack', 'use', 'talk'] },
          },
          required: ['targetId', 'action'],
        },
      },
      {
        name: 'scan',
        description: 'Scan area for entities and resources',
        inputSchema: {
          type: 'object',
          properties: {
            radius: { type: 'number', minimum: 1, maximum: 10 },
          },
          required: ['radius'],
        },
      },
    ];
  }

  // Private implementation details
  private validateMove(action: AgentAction, entity: Entity, state: WorldState): ValidationResult {
    const target = action.payload as MoveAction;
    const newPos = this.addDirection(entity.position, target.direction);
    
    if (!this.inBounds(newPos, state)) {
      return { valid: false, reason: 'Target position out of bounds' };
    }
    if (this.isBlocked(newPos, state)) {
      return { valid: false, reason: 'Target position blocked' };
    }
    if (entity.actionPoints < 1) {
      return { valid: false, reason: 'Insufficient action points' };
    }
    return { valid: true };
  }

  private executeMove(action: AgentAction, state: WorldState, events: DomainEvent[]): void {
    const entity = state.entities.get(action.agentId)!;
    const target = action.payload as MoveAction;
    const newPos = this.addDirection(entity.position, target.direction);
    
    entity.position = newPos;
    entity.actionPoints--;
    
    events.push({
      type: 'EntityMoved',
      aggregateId: action.agentId,
      timestamp: new Date(),
      version: state.tick,
      payload: { agentId: action.agentId, from: entity.position, to: newPos },
      metadata: { correlationId: '', causationId: '', source: 'my-arena' },
    });
  }

  // ... other private methods
}

// Export default for plugin loader
export default new MyArena();
```

---

## Step 3: Define World State

```typescript
// src/state.ts
export interface WorldState {
  readonly tick: number;
  readonly seed: number;
  readonly entities: Map<string, Entity>;
  readonly terrain: TerrainMap;
  readonly resources: ResourceMap;
  readonly players: Map<string, PlayerState>;
  readonly projectiles: Projectile[];
  readonly effects: Effect[];
  readonly config: ArenaConfig;
}

export interface Entity {
  readonly id: string;
  readonly type: EntityType;
  readonly position: Position;
  readonly ownerId?: string;
  readonly health: number;
  readonly maxHealth: number;
  readonly actionPoints: number;
  readonly maxActionPoints: number;
  readonly properties: Record<string, unknown>;
}

export interface PlayerState {
  readonly id: string;
  readonly name: string;
  readonly entityId: string;
  readonly score: number;
  readonly alive: boolean;
  readonly connected: boolean;
}

export interface Position {
  readonly x: number;
  readonly y: number;
  readonly z?: number;
}

export type EntityType = 'agent' | 'resource' | 'structure' | 'projectile' | 'effect';

export interface TerrainMap {
  readonly width: number;
  readonly height: number;
  readonly tiles: TerrainTile[][];
}

export interface TerrainTile {
  readonly type: TerrainType;
  readonly walkable: boolean;
  readonly properties: Record<string, unknown>;
}

export type TerrainType = 'empty' | 'wall' | 'water' | 'grass' | 'sand' | 'lava';

export interface ResourceMap {
  readonly resources: Map<string, Resource>;
}

export interface Resource {
  readonly id: string;
  readonly type: ResourceType;
  readonly position: Position;
  readonly amount: number;
  readonly maxAmount: number;
  readonly respawnTime?: number;
}

export type ResourceType = 'energy' | 'material' | 'data' | 'artifact';
```

---

## Step 4: Frontend Components (Optional)

If your arena needs custom UI, create React components:

```tsx
// ui/WorldView.tsx
import React from 'react';
import { useArenaStore } from '@aga/web/runtime/store';

export function WorldView() {
  const renderState = useArenaStore(s => s.renderState);
  
  if (!renderState) return <div className="p-4 text-center text-gray-500">Waiting for battle...</div>;

  return (
    <div className="relative w-full h-full bg-gray-900 overflow-hidden">
      <CanvasRenderer 
        entities={renderState.entities}
        terrain={renderState.terrain}
        projectiles={renderState.projectiles}
        effects={renderState.effects}
      />
      <EntityLabels entities={renderState.entities} />
    </div>
  );
}
```

```tsx
// ui/Minimap.tsx
import React from 'react';
import { useArenaStore } from '@aga/web/runtime/store';

export function Minimap() {
  const renderState = useArenaStore(s => s.renderState);
  const viewport = useArenaStore(s => s.viewport);
  
  if (!renderState) return null;

  return (
    <div className="w-64 h-64 bg-gray-800 rounded border border-gray-700 relative overflow-hidden">
      <MiniMapRenderer 
        terrain={renderState.terrain}
        entities={renderState.entities}
        viewport={viewport}
        onClick={setViewportCenter}
      />
      <ViewportIndicator viewport={viewport} />
    </div>
  );
}
```

**Register components in manifest:**

```json
{
  "display": {
    "arena": {
      "ui": [
        { "id": "world", "type": "panel", "component": "WorldView", "label": "World", "position": "center" },
        { "id": "minimap", "type": "overlay", "component": "Minimap", "label": "Minimap", "position": "top-right" }
      ]
    }
  }
}
```

---

## Step 5: Build and Install

```bash
# package.json
{
  "name": "@my-org/aga-arena-my-arena",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run"
  },
  "dependencies": {
    "@aga/sdk": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

```bash
# Build
npm run build

# Install locally (development)
cd /path/to/ai-game-arena
npm install /path/to/my-arena

# Or add to plugins/ directory for auto-discovery
cp -r /path/to/my-arena /path/to/ai-game-arena/arenas/my-arena
```

---

## Step 6: Test

```typescript
// tests/arena.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MyArena } from '../src/arena';

describe('MyArena', () => {
  let arena: MyArena;
  let state: WorldState;

  beforeEach(() => {
    arena = new MyArena();
    state = arena.initialize(42); // Deterministic seed
  });

  it('initializes deterministic world', () => {
    const state2 = arena.initialize(42);
    expect(state).toEqual(state2);
  });

  it('validates move actions', () => {
    const action = { type: 'move', agentId: 'agent-1', payload: { direction: 'north' } };
    const result = arena.validateAction(action, state);
    expect(result.valid).toBe(true);
  });

  it('rejects out-of-bounds moves', () => {
    // Place agent at edge
    state.entities.set('agent-1', createAgentAt(0, 0));
    const action = { type: 'move', agentId: 'agent-1', payload: { direction: 'west' } };
    const result = arena.validateAction(action, state);
    expect(result.valid).toBe(false);
  });

  it('executes moves and emits events', () => {
    const action = { type: 'move', agentId: 'agent-1', payload: { direction: 'north' } };
    const outcome = arena.executeAction(action, state);
    expect(outcome.success).toBe(true);
    expect(outcome.events).toContainEqual(
      expect.objectContaining({ type: 'EntityMoved' })
    );
  });

  it('detects victory', () => {
    state.players.set('agent-1', createPlayer('agent-1', 1000));
    state.players.set('agent-2', createPlayer('agent-2', 0, false));
    const win = arena.checkWinCondition(state);
    expect(win).toEqual({ type: 'victory', winner: 'agent-1', reason: 'Score limit reached' });
  });
});
```

---

## Advanced Patterns

### Multi-Game Arena

An arena can support multiple games:

```json
{
  "display": {
    "arena": {
      "game": "chess",
      "plugins": ["plugin-chat"],
      "ui": [...]
    }
  }
}
```

```json
{
  "display": {
    "arena": {
      "game": "chess-3d",
      "plugins": ["plugin-chat", "plugin-analysis"],
      "ui": [...]
    }
  }
}
```

### Dynamic UI Based on Game State

```typescript
// In arena.ts
getUiContributions(): ArenaUiContribution[] {
  const base = [
    { id: 'world', type: 'panel', component: 'WorldView', label: 'World', position: 'center' }
  ];
  
  if (this.config.enableTacticalView) {
    base.push({ id: 'tactical', type: 'overlay', component: 'TacticalMap', label: 'Tactical', position: 'overlay' });
  }
  
  return base;
}
```

### Custom Capabilities

```typescript
// In arena.ts
getTools(): ToolDefinition[] {
  return [
    {
      name: 'build_structure',
      description: 'Build a structure at target position',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['wall', 'turret', 'generator', 'factory'] },
          position: { type: 'object', properties: { x: 'number', y: 'number' } },
        },
        required: ['type', 'position'],
      },
    },
    {
      name: 'program_unit',
      description: 'Program autonomous unit behavior',
      inputSchema: {
        type: 'object',
        properties: {
          unitId: { type: 'string' },
          behavior: { type: 'string', enum: ['patrol', 'guard', 'harvest', 'attack'] },
          params: { type: 'object' },
        },
        required: ['unitId', 'behavior'],
      },
    },
  ];
}
```

---

## Publishing

```bash
# Build and publish to npm
npm run build
npm publish --access public

# Users install via:
npm install @my-org/aga-arena-my-arena

# Or via CLI
aga plugin install @my-org/aga-arena-my-arena
```

**Manifest discovery works automatically** — no registration needed.

---

## Debugging

```bash
# Enable debug logging
DEBUG=aga:arena:* aga server start

# Inspect registered arenas
aga arena list

# View arena manifest
aga arena show my-arena

# Test arena in isolation
aga arena test my-arena --seed 42 --turns 10
```

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Mutating state in `validateAction` | Keep validation pure; only read state |
| Non-deterministic `initialize` | Use seeded RNG; avoid `Math.random()` |
| Heavy computation in `getObservation` | Cache visible entities; use spatial index |
| Missing win condition | Always implement `checkWinCondition` |
| UI component not found | Register component in frontend plugin; match manifest `component` name exactly |
| Capability not available to agents | Declare in `capabilities` array AND `mandatoryCapabilities` or `specialSkills` |