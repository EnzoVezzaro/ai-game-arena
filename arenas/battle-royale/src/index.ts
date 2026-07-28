import type { ArenaPlugin as IArenaPlugin, ArenaConfig, WorldState, AgentAction, ValidationResult, ActionOutcome, Observation, WinCondition, ToolDefinition, RenderState } from '@ai-game-arena/sdk';
import { createInitialState, validateAction as validateGameAction, executeAction as executeGameAction, checkWinCondition as checkGameWin, type BattleRoyaleState } from 'battle-royale';

const ATTACK_DAMAGE = 30;
const VISION_RADIUS = 3;

export class BattleRoyaleArena implements IArenaPlugin {
  config: ArenaConfig = {
    id: 'battle-royale',
    name: 'Battle Royale',
    description: 'Large-grid survival arena with shrinking safe zone (2-8 agents)',
    version: '1.0.0',
    minPlayers: 2,
    maxPlayers: 8,
  };

  initialize(seed?: number, agentIds?: string[]): WorldState {
    const state = createInitialState(seed, agentIds);
    return { turn: 0, phase: 'running', data: state as unknown as Record<string, unknown>, seed };
  }

  getTools(): ToolDefinition[] {
    return [
      { name: 'move', description: 'Move in a direction (up, down, left, right)', parameters: [{ name: 'direction', type: 'string', description: 'Direction to move', required: true }], mandatory: true },
      { name: 'attack', description: 'Attack a target position', parameters: [
        { name: 'targetX', type: 'number', description: 'Target X', required: true },
        { name: 'targetY', type: 'number', description: 'Target Y', required: true },
      ], mandatory: false },
      { name: 'shield', description: 'Activate shield for one turn (50% damage reduction)', parameters: [], mandatory: false },
      { name: 'pass', description: 'Skip this turn', parameters: [], mandatory: false },
    ];
  }

  validateAction(action: AgentAction, state: WorldState): ValidationResult {
    const s = state.data as unknown as BattleRoyaleState;
    return validateGameAction(action, s);
  }

  executeAction(action: AgentAction, state: WorldState): ActionOutcome {
    const s = state.data as unknown as BattleRoyaleState;
    const result = executeGameAction(action, s, ATTACK_DAMAGE);
    return { success: result.success, events: result.events, state: result.state as unknown as Record<string, unknown> ?? undefined };
  }

  getObservation(agentId: string, state: WorldState): Observation {
    const s = state.data as unknown as BattleRoyaleState;
    const fighter = s.fighters[agentId];
    const visible: Array<{ id: string; x: number; y: number; health: number }> = [];
    for (const [id, f] of Object.entries(s.fighters)) {
      if (!f.alive || id === agentId) continue;
      if (fighter) {
        const dist = Math.abs(f.x - fighter.x) + Math.abs(f.y - fighter.y);
        if (dist <= VISION_RADIUS) visible.push({ id, x: f.x, y: f.y, health: f.health });
      }
    }
    return {
      timestamp: Date.now(), agentId, type: 'board-state',
      data: { content: {
        myPosition: fighter ? { x: fighter.x, y: fighter.y, health: fighter.health } : null,
        safeZoneRadius: s.safeZoneRadius,
        gridSize: { width: s.gridWidth, height: s.gridHeight },
        turn: s.turn,
        visibleEnemies: visible,
      }, format: 'json' },
      metadata: { turnNumber: s.turn, gameState: s.phase, availableActions: ['move', 'attack', 'shield', 'pass'] },
    };
  }

  checkWinCondition(state: WorldState): WinCondition | null {
    const s = state.data as unknown as BattleRoyaleState;
    return checkGameWin(s);
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
}

export default BattleRoyaleArena;
