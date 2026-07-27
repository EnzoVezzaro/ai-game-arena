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

export interface TankState {
  x: number;
  y: number;
  health: number;
  alive: boolean;
}

export interface BattleTanksState {
  gridWidth: number;
  gridHeight: number;
  tanks: Record<string, TankState>;
  turn: number;
  phase: string;
  events: GameEvent[];
}

export class BattleTanksArena implements IArenaPlugin {
  config: ArenaConfig = {
    id: 'battle-tanks',
    name: 'Battle Tanks',
    description: 'Grid-based tank battle for 2-4 AI agents',
    version: '1.0.0',
    minPlayers: 2,
    maxPlayers: 4,
  };

  private readonly GRID_SIZE = 8;
  private readonly ATTACK_DAMAGE = 35;

  initialize(seed?: number): WorldState {
    const state: BattleTanksState = {
      gridWidth: this.GRID_SIZE,
      gridHeight: this.GRID_SIZE,
      tanks: {},
      turn: 0,
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
        description: 'Move your tank in a direction (up, down, left, right)',
        parameters: [
          { name: 'direction', type: 'string', description: 'Direction to move', required: true },
        ],
        mandatory: true,
      },
      {
        name: 'attack',
        description: 'Attack a target position',
        parameters: [
          { name: 'targetX', type: 'number', description: 'Target X coordinate', required: true },
          { name: 'targetY', type: 'number', description: 'Target Y coordinate', required: true },
        ],
        mandatory: false,
      },
      {
        name: 'scan',
        description: 'Scan an area for enemy tanks',
        parameters: [
          { name: 'x', type: 'number', description: 'Center X coordinate', required: true },
          { name: 'y', type: 'number', description: 'Center Y coordinate', required: true },
        ],
        mandatory: false,
      },
      {
        name: 'shield',
        description: 'Activate shield for one turn (reduces damage by 50%)',
        parameters: [],
        mandatory: false,
      },
    ];
  }

  validateAction(action: AgentAction, state: WorldState): ValidationResult {
    const battleState = state.data as unknown as BattleTanksState;

    if (action.type === 'move') {
      const direction = action.parameters.direction as string;
      if (!['up', 'down', 'left', 'right'].includes(direction)) {
        return { valid: false, error: 'Invalid direction. Use: up, down, left, right' };
      }
      return { valid: true };
    }

    if (action.type === 'attack') {
      const { targetX, targetY } = action.parameters as { targetX: number; targetY: number };
      if (typeof targetX !== 'number' || typeof targetY !== 'number') {
        return { valid: false, error: 'Invalid target coordinates' };
      }
      if (
        targetX < 0 ||
        targetX >= battleState.gridWidth ||
        targetY < 0 ||
        targetY >= battleState.gridHeight
      ) {
        return { valid: false, error: 'Target out of bounds' };
      }
      return { valid: true };
    }

    if (action.type === 'scan') {
      return { valid: true };
    }

    if (action.type === 'shield') {
      return { valid: true };
    }

    if (action.type === 'pass') {
      return { valid: true };
    }

    return { valid: false, error: `Unknown action: ${action.type}` };
  }

  executeAction(action: AgentAction, state: WorldState): ActionOutcome {
    const battleState = { ...(state.data as unknown as BattleTanksState) };
    const events: GameEvent[] = [];

    if (action.type === 'pass') {
      return { success: true, events };
    }

    if (action.type === 'move') {
      const direction = action.parameters.direction as string;
      const tank = battleState.tanks[action.agentId as string];
      if (!tank || !tank.alive) {
        return { success: false, events, error: 'Tank not found or destroyed' };
      }

      const newPos = this.calculateNewPosition(tank.x, tank.y, direction, battleState);
      tank.x = newPos.x;
      tank.y = newPos.y;

      events.push({
        type: 'TANK_MOVED',
        timestamp: Date.now(),
        data: { agentId: action.agentId, from: { x: tank.x, y: tank.y }, to: newPos, direction },
      });
    }

    if (action.type === 'attack') {
      const { targetX, targetY } = action.parameters as { targetX: number; targetY: number };
      const attacker = battleState.tanks[action.agentId as string];
      if (!attacker || !attacker.alive) {
        return { success: false, events, error: 'Attacker not found or destroyed' };
      }

      // Find tank at target position
      for (const [id, tank] of Object.entries(battleState.tanks)) {
        if (id !== action.agentId && tank.alive && tank.x === targetX && tank.y === targetY) {
          tank.health -= this.ATTACK_DAMAGE;
          events.push({
            type: 'TANK_ATTACKED',
            timestamp: Date.now(),
            data: {
              attackerId: action.agentId,
              targetId: id,
              damage: this.ATTACK_DAMAGE,
              targetHealth: tank.health,
            },
          });

          if (tank.health <= 0) {
            tank.alive = false;
            events.push({
              type: 'TANK_DESTROYED',
              timestamp: Date.now(),
              data: { agentId: id, destroyedBy: action.agentId },
            });
          }
          break;
        }
      }
    }

    if (action.type === 'scan') {
      events.push({
        type: 'SCAN_PERFORMED',
        timestamp: Date.now(),
        data: { agentId: action.agentId, position: action.parameters },
      });
    }

    return { success: true, events, state: battleState as unknown as Record<string, unknown> };
  }

  getObservation(agentId: string, state: WorldState): Observation {
    const battleState = state.data as unknown as BattleTanksState;
    const tank = battleState.tanks[agentId];

    return {
      timestamp: Date.now(),
      agentId,
      type: 'board-state',
      data: {
        content: {
          myPosition: tank ? { x: tank.x, y: tank.y, health: tank.health } : null,
          gridSize: { width: battleState.gridWidth, height: battleState.gridHeight },
          turn: battleState.turn,
          tanks: Object.entries(battleState.tanks)
            .filter(([, t]) => t.alive)
            .map(([id, t]) => ({ id, x: t.x, y: t.y, health: t.health, isMe: id === agentId })),
        },
        format: 'json',
      },
      metadata: {
        turnNumber: battleState.turn,
        gameState: battleState.phase,
        availableActions: ['move', 'attack', 'scan', 'shield', 'pass'],
      },
    };
  }

  checkWinCondition(state: WorldState): WinCondition | null {
    const battleState = state.data as unknown as BattleTanksState;
    const aliveTanks = Object.entries(battleState.tanks)
      .filter(([, tank]) => tank.alive)
      .map(([id]) => id);

    if (aliveTanks.length === 1) {
      return { winner: aliveTanks[0]!, reason: 'Last tank standing' };
    }

    if (aliveTanks.length === 0) {
      return { winner: 'draw', reason: 'All tanks destroyed' };
    }

    if (battleState.turn >= 100) {
      // Highest health wins
      let bestId = aliveTanks[0]!;
      let bestHealth = 0;
      for (const id of aliveTanks) {
        const health = battleState.tanks[id]?.health ?? 0;
        if (health > bestHealth) {
          bestHealth = health;
          bestId = id;
        }
      }
      return { winner: bestId, reason: 'Highest health after 100 turns' };
    }

    return null;
  }

  getScores(state: WorldState): Record<string, number> {
    const battleState = state.data as unknown as BattleTanksState;
    const scores: Record<string, number> = {};

    for (const [id, tank] of Object.entries(battleState.tanks)) {
      scores[id] = tank.alive ? tank.health : 0;
    }

    return scores;
  }

  getRenderState(state: WorldState): RenderState {
    const battleState = state.data as unknown as BattleTanksState;
    return {
      type: 'battle-tanks-grid',
      data: {
        grid: battleState,
        tanks: Object.entries(battleState.tanks).map(([id, tank]) => ({
          id,
          ...tank,
        })),
      },
    };
  }

  private calculateNewPosition(
    x: number,
    y: number,
    direction: string,
    state: BattleTanksState,
  ): { x: number; y: number } {
    switch (direction) {
      case 'up':
        return { x, y: Math.max(0, y - 1) };
      case 'down':
        return { x, y: Math.min(state.gridHeight - 1, y + 1) };
      case 'left':
        return { x: Math.max(0, x - 1), y };
      case 'right':
        return { x: Math.min(state.gridWidth - 1, x + 1), y };
      default:
        return { x, y };
    }
  }
}

export default BattleTanksArena;
