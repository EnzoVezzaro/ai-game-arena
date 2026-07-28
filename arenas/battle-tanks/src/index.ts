import type { ArenaPlugin as IArenaPlugin, ArenaConfig, WorldState, AgentAction, ValidationResult, ActionOutcome, Observation, WinCondition, ToolDefinition, RenderState } from '@ai-game-arena/sdk';
import { createInitialState, validateAction as validateGameAction, executeAction as executeGameAction, checkWinCondition as checkGameWin, type BattleTanksState } from 'battle-tanks';

const ATTACK_DAMAGE = 35;

export class BattleTanksArena implements IArenaPlugin {
  config: ArenaConfig = {
    id: 'battle-tanks', name: 'Battle Tanks',
    description: 'Grid-based tank battle for 2-4 AI agents',
    version: '1.0.0', minPlayers: 2, maxPlayers: 4,
  };

  initialize(seed?: number, agentIds?: string[]): WorldState {
    const state = createInitialState(seed, agentIds);
    return { turn: 0, phase: 'running', data: state as unknown as Record<string, unknown>, seed };
  }

  getTools(): ToolDefinition[] {
    return [
      { name: 'move', description: 'Move your tank in a direction (up, down, left, right)', parameters: [{ name: 'direction', type: 'string', description: 'Direction to move', required: true }], mandatory: true },
      { name: 'attack', description: 'Attack a target position', parameters: [
        { name: 'targetX', type: 'number', description: 'Target X coordinate', required: true },
        { name: 'targetY', type: 'number', description: 'Target Y coordinate', required: true },
      ], mandatory: false },
      { name: 'scan', description: 'Scan an area for enemy tanks', parameters: [
        { name: 'x', type: 'number', description: 'Center X coordinate', required: true },
        { name: 'y', type: 'number', description: 'Center Y coordinate', required: true },
      ], mandatory: false },
      { name: 'shield', description: 'Activate shield for one turn (reduces damage by 50%)', parameters: [], mandatory: false },
    ];
  }

  validateAction(action: AgentAction, state: WorldState): ValidationResult {
    const battleState = state.data as unknown as BattleTanksState;
    return validateGameAction(action, battleState);
  }

  executeAction(action: AgentAction, state: WorldState): ActionOutcome {
    const battleState = state.data as unknown as BattleTanksState;
    const result = executeGameAction(action, battleState, ATTACK_DAMAGE);
    return { success: result.success, events: result.events, state: result.state as unknown as Record<string, unknown> ?? undefined };
  }

  getObservation(agentId: string, state: WorldState): Observation {
    const battleState = state.data as unknown as BattleTanksState;
    const tank = battleState.tanks[agentId];
    return {
      timestamp: Date.now(), agentId, type: 'board-state',
      data: { content: {
        myPosition: tank ? { x: tank.x, y: tank.y, health: tank.health } : null,
        gridSize: { width: battleState.gridWidth, height: battleState.gridHeight },
        turn: battleState.turn,
        tanks: (Object.entries(battleState.tanks) as [string, import('battle-tanks').TankState][]).filter(([, t]) => t.alive).map(([id, t]) => ({ id, x: t.x, y: t.y, health: t.health, isMe: id === agentId })),
      }, format: 'json' },
      metadata: { turnNumber: battleState.turn, gameState: battleState.phase, availableActions: ['move', 'attack', 'scan', 'shield', 'pass'] },
    };
  }

  checkWinCondition(state: WorldState): WinCondition | null {
    const battleState = state.data as unknown as BattleTanksState;
    return checkGameWin(battleState);
  }

  getScores(state: WorldState): Record<string, number> {
    const battleState = state.data as unknown as BattleTanksState;
    const scores: Record<string, number> = {};
    for (const [id, tank] of Object.entries(battleState.tanks) as [string, import('battle-tanks').TankState][]) {
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
        tanks: (Object.entries(battleState.tanks) as [string, import('battle-tanks').TankState][]).map(([id, tank]) => ({ id, ...tank })),
      },
    };
  }
}

export default BattleTanksArena;
