import type { AgentAction, ValidationResult, WinCondition, GameEvent } from '@ai-game-arena/sdk';

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
const MAX_TURNS = 200;

export function createInitialState(_seed?: number, agentIds: string[] = []): BattleRoyaleState {
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
  return {
    gridWidth: GRID_SIZE,
    gridHeight: GRID_SIZE,
    fighters,
    turn: 0,
    safeZoneRadius: GRID_SIZE,
    safeZoneCenter: center,
    phase: 'running',
    events: [],
  };
}

export function validateAction(action: AgentAction, state: BattleRoyaleState): ValidationResult {
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
    if (targetX < 0 || targetX >= state.gridWidth || targetY < 0 || targetY >= state.gridHeight) {
      return { valid: false, error: 'Target out of bounds' };
    }
    return { valid: true };
  }
  if (action.type === 'shield' || action.type === 'pass') {
    return { valid: true };
  }
  return { valid: false, error: `Unknown action: ${action.type}` };
}

export function executeAction(
  action: AgentAction,
  state: BattleRoyaleState,
  attackDamage: number,
): { success: boolean; events: GameEvent[]; state: BattleRoyaleState } {
  const newState: BattleRoyaleState = JSON.parse(JSON.stringify(state));
  const events: GameEvent[] = [];

  if (action.type === 'pass') return { success: true, events, state: newState };

  const agentId = action.agentId as string;
  const fighter = newState.fighters[agentId];
  if (!fighter || !fighter.alive) {
    return { success: false, events, state: newState };
  }

  if (action.type === 'move') {
    const direction = action.parameters.direction as string;
    const pos = calculateNewPosition(fighter.x, fighter.y, direction, newState);
    fighter.x = pos.x;
    fighter.y = pos.y;
    events.push({ type: 'MOVED', timestamp: Date.now(), data: { agentId, ...pos } });
  }

  if (action.type === 'attack') {
    const { targetX, targetY } = action.parameters as { targetX: number; targetY: number };
    for (const [id, f] of Object.entries(newState.fighters)) {
      if (id !== agentId && f.alive && f.x === targetX && f.y === targetY) {
        const dmg = f.shieldTurns > 0 ? Math.floor(attackDamage / 2) : attackDamage;
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

  if (fighter.shieldTurns > 0) fighter.shieldTurns--;

  return { success: true, events, state: newState };
}

export function checkWinCondition(state: BattleRoyaleState): WinCondition | null {
  const alive = Object.entries(state.fighters)
    .filter(([, f]) => f.alive)
    .map(([id]) => id);

  if (alive.length === 1) {
    return { winner: alive[0]!, reason: 'Sole survivor' };
  }
  if (alive.length === 0) {
    return { winner: 'draw', reason: 'No survivors' };
  }
  if (state.turn >= MAX_TURNS) {
    let bestId = alive[0]!;
    let bestHealth = -1;
    for (const id of alive) {
      const h = state.fighters[id]?.health ?? 0;
      if (h > bestHealth) {
        bestHealth = h;
        bestId = id;
      }
    }
    return { winner: bestId, reason: 'Highest health at turn limit' };
  }
  return null;
}

export function calculateNewPosition(
  x: number,
  y: number,
  direction: string,
  state: BattleRoyaleState,
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
