import type {
  ArenaPlugin as IArenaPlugin,
  ArenaConfig,
  WorldState,
  AgentAction,
  ValidationResult,
  ActionOutcome,
  Observation,
  WinCondition,
  ToolDefinition,
  GameEvent,
  RenderState,
} from '@ai-game-arena/sdk';

export interface FighterState {
  x: number;
  y: number;
  health: number;
  alive: boolean;
  shieldTurns: number;
}

export interface BattleRoyaleState {
  gridWidth: number;
  gridHeight: number;
  fighters: Record<string, FighterState>;
  turn: number;
  safeZoneRadius: number;
  safeZoneCenter: { x: number; y: number };
  phase: string;
  events: GameEvent[];
}

const GRID_SIZE = 16;
const ATTACK_DAMAGE = 30;
const MAX_TURNS = 200;

export class BattleRoyaleArena implements IArenaPlugin {
  config: ArenaConfig = {
    id: 'battle-royale',
    name: 'Battle Royale',
    description: 'Large-grid survival arena with shrinking safe zone (2-8 agents)',
    version: '1.0.0',
    minPlayers: 2,
    maxPlayers: 8,
  };

  private readonly VISION_RADIUS = 3;

  initialize(seed?: number, agentIds: string[] = []): WorldState {
    const center = { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) };
    const fighters: Record<string, FighterState> = {};
    for (let i = 0; i < agentIds.length; i++) {
      const id = agentIds[i]!;
      fighters[id] = {
        x: (i * 3 + 1) % GRID_SIZE,
        y: (i * 5 + 1) % GRID_SIZE,
        health: 100,
        alive: true,
        shieldTurns: 0,
      };
    }
    const state: BattleRoyaleState = {
      gridWidth: GRID_SIZE,
      gridHeight: GRID_SIZE,
      fighters,
      turn: 0,
      safeZoneRadius: GRID_SIZE,
      safeZoneCenter: center,
      phase: 'running',
      events: [],
    };
    return {
      turn: 0,
      phase: 'running',
      data: state as unknown as Record<string, unknown>,
      seed,
    };
  }

  getTools(): ToolDefinition[] {
    return [
      {
        name: 'move',
        description: 'Move in a direction (up, down, left, right)',
        parameters: [
          { name: 'direction', type: 'string', description: 'Direction to move', required: true },
        ],
        mandatory: true,
      },
      {
        name: 'attack',
        description: 'Attack a target position',
        parameters: [
          { name: 'targetX', type: 'number', description: 'Target X', required: true },
          { name: 'targetY', type: 'number', description: 'Target Y', required: true },
        ],
        mandatory: false,
      },
      {
        name: 'shield',
        description: 'Activate shield for one turn (50% damage reduction)',
        parameters: [],
        mandatory: false,
      },
      {
        name: 'pass',
        description: 'Skip this turn',
        parameters: [],
        mandatory: false,
      },
    ];
  }

  validateAction(action: AgentAction, state: WorldState): ValidationResult {
    const s = state.data as unknown as BattleRoyaleState;
    if (action.type === 'move') {
      const direction = action.parameters.direction as string;
      if (!['up', 'down', 'left', 'right'].includes(direction)) {
        return { valid: false, error: 'Invalid direction' };
      }
      return { valid: true };
    }
    if (action.type === 'attack') {
      const { targetX, targetY } = action.parameters as { targetX: number; targetY: number };
      if (typeof targetX !== 'number' || typeof targetY !== 'number') {
        return { valid: false, error: 'Invalid target coordinates' };
      }
      if (targetX < 0 || targetX >= s.gridWidth || targetY < 0 || targetY >= s.gridHeight) {
        return { valid: false, error: 'Target out of bounds' };
      }
      return { valid: true };
    }
    if (action.type === 'shield' || action.type === 'pass') {
      return { valid: true };
    }
    return { valid: false, error: `Unknown action: ${action.type}` };
  }

  executeAction(action: AgentAction, state: WorldState): ActionOutcome {
    const s = { ...(state.data as unknown as BattleRoyaleState) };
    const events: GameEvent[] = [];

    if (action.type === 'pass') return { success: true, events };

    const agentId = action.agentId as string;
    const fighter = s.fighters[agentId];
    if (!fighter || !fighter.alive) {
      return { success: false, events, error: 'Fighter not found or eliminated' };
    }

    if (action.type === 'move') {
      const direction = action.parameters.direction as string;
      const pos = this.calculateNewPosition(fighter.x, fighter.y, direction, s);
      fighter.x = pos.x;
      fighter.y = pos.y;
      events.push({ type: 'MOVED', timestamp: Date.now(), data: { agentId, ...pos } });
    }

    if (action.type === 'attack') {
      const { targetX, targetY } = action.parameters as { targetX: number; targetY: number };
      for (const [id, f] of Object.entries(s.fighters)) {
        if (id !== agentId && f.alive && f.x === targetX && f.y === targetY) {
          const dmg = f.shieldTurns > 0 ? Math.floor(ATTACK_DAMAGE / 2) : ATTACK_DAMAGE;
          f.health -= dmg;
          events.push({
            type: 'ATTACKED',
            timestamp: Date.now(),
            data: { attackerId: agentId, targetId: id, damage: dmg },
          });
          if (f.health <= 0) {
            f.alive = false;
            events.push({ type: 'ELIMINATED', timestamp: Date.now(), data: { agentId: id } });
          }
          break;
        }
      }
    }

    if (action.type === 'shield') {
      fighter.shieldTurns = 1;
      events.push({ type: 'SHIELDED', timestamp: Date.now(), data: { agentId } });
    }

    // Decrement shield
    if (fighter.shieldTurns > 0) fighter.shieldTurns--;

    return { success: true, events, state: s as unknown as Record<string, unknown> };
  }

  getObservation(agentId: string, state: WorldState): Observation {
    const s = state.data as unknown as BattleRoyaleState;
    const fighter = s.fighters[agentId];
    const inSafeZone = this.isInSafeZone(fighter?.x ?? 0, fighter?.y ?? 0, s);

    // Fog-of-war: only reveal fighters within VISION_RADIUS
    const visible: Array<{ id: string; x: number; y: number; health: number }> = [];
    for (const [id, f] of Object.entries(s.fighters)) {
      if (!f.alive || id === agentId) continue;
      if (fighter) {
        const dist = Math.abs(f.x - fighter.x) + Math.abs(f.y - fighter.y);
        if (dist <= this.VISION_RADIUS) {
          visible.push({ id, x: f.x, y: f.y, health: f.health });
        }
      }
    }

    return {
      timestamp: Date.now(),
      agentId,
      type: 'board-state',
      data: {
        content: {
          myPosition: fighter ? { x: fighter.x, y: fighter.y, health: fighter.health } : null,
          inSafeZone,
          safeZoneRadius: s.safeZoneRadius,
          gridSize: { width: s.gridWidth, height: s.gridHeight },
          turn: s.turn,
          visibleEnemies: visible,
        },
        format: 'json',
      },
      metadata: {
        turnNumber: s.turn,
        gameState: s.phase,
        availableActions: ['move', 'attack', 'shield', 'pass'],
      },
    };
  }

  checkWinCondition(state: WorldState): WinCondition | null {
    const s = state.data as unknown as BattleRoyaleState;
    const alive = Object.entries(s.fighters)
      .filter(([, f]) => f.alive)
      .map(([id]) => id);

    if (alive.length === 1) {
      return { winner: alive[0]!, reason: 'Sole survivor' };
    }
    if (alive.length === 0) {
      return { winner: 'draw', reason: 'No survivors' };
    }
    if (s.turn >= MAX_TURNS) {
      let bestId = alive[0]!;
      let bestHealth = -1;
      for (const id of alive) {
        const h = s.fighters[id]?.health ?? 0;
        if (h > bestHealth) {
          bestHealth = h;
          bestId = id;
        }
      }
      return { winner: bestId, reason: 'Highest health at turn limit' };
    }
    return null;
  }

  getScores(state: WorldState): Record<string, number> {
    const s = state.data as unknown as BattleRoyaleState;
    const scores: Record<string, number> = {};
    for (const [id, f] of Object.entries(s.fighters)) {
      scores[id] = f.alive ? f.health : 0;
    }
    return scores;
  }

  getRenderState(state: WorldState): RenderState {
    const s = state.data as unknown as BattleRoyaleState;
    return {
      type: 'battle-royale-grid',
      data: {
        grid: s,
        fighters: Object.entries(s.fighters).map(([id, f]) => ({ id, ...f })),
      },
    };
  }

  private isInSafeZone(x: number, y: number, s: BattleRoyaleState): boolean {
    const dx = x - s.safeZoneCenter.x;
    const dy = y - s.safeZoneCenter.y;
    return Math.sqrt(dx * dx + dy * dy) <= s.safeZoneRadius;
  }

  private calculateNewPosition(
    x: number,
    y: number,
    direction: string,
    s: BattleRoyaleState,
  ): { x: number; y: number } {
    switch (direction) {
      case 'up':
        return { x, y: Math.max(0, y - 1) };
      case 'down':
        return { x, y: Math.min(s.gridHeight - 1, y + 1) };
      case 'left':
        return { x: Math.max(0, x - 1), y };
      case 'right':
        return { x: Math.min(s.gridWidth - 1, x + 1), y };
      default:
        return { x, y };
    }
  }
}

export const arena = new BattleRoyaleArena();
export default BattleRoyaleArena;
