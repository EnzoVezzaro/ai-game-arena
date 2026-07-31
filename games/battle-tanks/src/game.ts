import type { GameEvent } from '@ai-game-arena/sdk';

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

export function createInitialState(_seed?: number, agentIds?: string[]): BattleTanksState {
  const GRID_SIZE = 8;
  const positions = [
    { x: 0, y: 0 },
    { x: GRID_SIZE - 1, y: GRID_SIZE - 1 },
    { x: 0, y: GRID_SIZE - 1 },
    { x: GRID_SIZE - 1, y: 0 },
  ];
  return {
    gridWidth: GRID_SIZE,
    gridHeight: GRID_SIZE,
    tanks: Object.fromEntries(
      (agentIds ?? []).map((agentId, index) => [
        agentId,
        { ...positions[index % positions.length]!, health: 100, alive: true },
      ]),
    ),
    turn: 0,
    phase: 'running',
    events: [],
  };
}

export function calculateNewPosition(x: number, y: number, direction: string, state: BattleTanksState): { x: number; y: number } {
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

export function validateAction(action: { agentId: string; type: string; parameters: Record<string, unknown> }, state: BattleTanksState): { valid: boolean; error?: string } {
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
    if (targetX < 0 || targetX >= state.gridWidth || targetY < 0 || targetY >= state.gridHeight) {
      return { valid: false, error: 'Target out of bounds' };
    }
    return { valid: true };
  }

  if (action.type === 'scan') {
    const direction = action.parameters.direction as string;
    if (!['up', 'down', 'left', 'right'].includes(direction)) {
      return { valid: false, error: 'Invalid scan direction. Use: up, down, left, right' };
    }
    return { valid: true };
  }
  if (action.type === 'shield') return { valid: true };
  if (action.type === 'pass') return { valid: true };

  return { valid: false, error: `Unknown action: ${action.type}` };
}

export function executeAction(
  action: { agentId: string; type: string; parameters: Record<string, unknown> },
  state: BattleTanksState,
  attackDamage: number = 35,
): { success: boolean; events: GameEvent[]; state: BattleTanksState; error?: string } {
  const newState: BattleTanksState = JSON.parse(JSON.stringify(state));
  const events: GameEvent[] = [];

  if (action.type === 'pass') {
    return { success: true, events, state: newState };
  }

  if (action.type === 'move') {
    const direction = action.parameters.direction as string;
    const tank = newState.tanks[action.agentId];
    if (!tank || !tank.alive) {
      return { success: false, events, state: newState, error: 'Tank not found or destroyed' };
    }

    const from = { x: tank.x, y: tank.y };
    const newPos = calculateNewPosition(tank.x, tank.y, direction, newState);
    tank.x = newPos.x;
    tank.y = newPos.y;

    events.push({
      type: 'TANK_MOVED',
      timestamp: Date.now(),
      data: { agentId: action.agentId, from, to: newPos, direction },
    });
  }

  if (action.type === 'attack') {
    const { targetX, targetY } = action.parameters as { targetX: number; targetY: number };
    const attacker = newState.tanks[action.agentId];
    if (!attacker || !attacker.alive) {
      return { success: false, events, state: newState, error: 'Attacker not found or destroyed' };
    }

    for (const [id, tank] of Object.entries(newState.tanks)) {
      if (id !== action.agentId && tank.alive && tank.x === targetX && tank.y === targetY) {
        tank.health -= attackDamage;
        events.push({
          type: 'TANK_ATTACKED',
          timestamp: Date.now(),
          data: { attackerId: action.agentId, targetId: id, damage: attackDamage, targetHealth: tank.health },
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
    // scan(direction) is a move action: the tank moves one step in the given
    // direction and scans the area. It is never a wasted turn.
    const direction = action.parameters.direction as string;
    const tank = newState.tanks[action.agentId];
    if (!tank || !tank.alive) {
      return { success: false, events, state: newState, error: 'Tank not found or destroyed' };
    }

    const from = { x: tank.x, y: tank.y };
    const newPos = calculateNewPosition(tank.x, tank.y, direction, newState);
    tank.x = newPos.x;
    tank.y = newPos.y;

    events.push({
      type: 'SCAN_PERFORMED',
      timestamp: Date.now(),
      data: { agentId: action.agentId, from, to: newPos, direction },
    });
  }

  return { success: true, events, state: newState };
}

export function checkWinCondition(state: BattleTanksState): { winner: string; reason: string } | null {
  const aliveTanks = Object.entries(state.tanks)
    .filter(([, tank]) => tank.alive)
    .map(([id]) => id);

  if (aliveTanks.length === 1) {
    return { winner: aliveTanks[0]!, reason: 'Last tank standing' };
  }

  if (aliveTanks.length === 0) {
    return { winner: 'draw', reason: 'All tanks destroyed' };
  }

  if (state.turn >= 100) {
    let bestId = aliveTanks[0]!;
    let bestHealth = 0;
    for (const id of aliveTanks) {
      const health = state.tanks[id]?.health ?? 0;
      if (health > bestHealth) {
        bestHealth = health;
        bestId = id;
      }
    }
    return { winner: bestId, reason: 'Highest health after 100 turns' };
  }

  return null;
}
