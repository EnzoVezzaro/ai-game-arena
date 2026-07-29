import type { ArenaPlugin as IArenaPlugin, ArenaConfig, WorldState, AgentAction, ValidationResult, ActionOutcome, Observation, WinCondition, ToolDefinition, RenderState } from '@ai-game-arena/sdk';
import { createInitialState, validateAction as validateGameAction, executeAction as executeGameAction, checkWinCondition as checkGameWin, getScores as getGameScores, serializeBoard, getAgentColor, type ChessState } from 'chess';

export class ChessArena implements IArenaPlugin {
  config: ArenaConfig = {
    id: 'chess',
    name: 'Chess',
    description: 'Classic chess for 2 AI players',
    version: '1.0.0',
    minPlayers: 2,
    maxPlayers: 2,
  };

  initialize(seed?: number, _agentIds?: string[]): WorldState {
    const state = createInitialState(seed, _agentIds);
    return { turn: 0, phase: 'running', data: state as unknown as Record<string, unknown>, seed };
  }

  getTools(): ToolDefinition[] {
    return [
      { name: 'move_piece', description: 'Move a chess piece from one square to another', parameters: [
        { name: 'fromRow', type: 'number', description: 'Source row (0-7)', required: true },
        { name: 'fromCol', type: 'number', description: 'Source column (0-7)', required: true },
        { name: 'toRow', type: 'number', description: 'Destination row (0-7)', required: true },
        { name: 'toCol', type: 'number', description: 'Destination column (0-7)', required: true },
      ], mandatory: true },
      { name: 'get_legal_moves', description: 'Get all legal moves for a piece at a given position', parameters: [
        { name: 'row', type: 'number', description: 'Row (0-7)', required: true },
        { name: 'col', type: 'number', description: 'Column (0-7)', required: true },
      ], mandatory: false },
    ];
  }

  validateAction(action: AgentAction, state: WorldState): ValidationResult {
    const chessState = state.data as unknown as ChessState;
    return validateGameAction(action, chessState);
  }

  executeAction(action: AgentAction, state: WorldState): ActionOutcome {
    const chessState = state.data as unknown as ChessState;
    const result = executeGameAction(action, chessState);
    return { success: result.success, events: result.events, state: result.state as unknown as Record<string, unknown> ?? undefined };
  }

  getObservation(agentId: string, state: WorldState): Observation {
    const chessState = state.data as unknown as ChessState;
    const color = getAgentColor(agentId);
    return {
      timestamp: Date.now(), agentId, type: 'board-state',
      data: { content: {
        board: serializeBoard(chessState.board),
        currentTurn: chessState.currentTurn,
        moveHistory: chessState.moveHistory.slice(-10),
        isMyTurn: chessState.currentTurn === color,
        pieceColor: color,
      }, format: 'json' },
      metadata: { turnNumber: chessState.fullMoveNumber, gameState: chessState.phase, availableActions: ['move_piece', 'get_legal_moves', 'pass'] },
    };
  }

  checkWinCondition(state: WorldState): WinCondition | null {
    const chessState = state.data as unknown as ChessState;
    return checkGameWin(chessState);
  }

  getScores(state: WorldState): Record<string, number> {
    const chessState = state.data as unknown as ChessState;
    return getGameScores(chessState);
  }

  getRenderState(state: WorldState): RenderState {
    const chessState = state.data as unknown as ChessState;
    const units: Array<{
      agentId: string; x: number; y: number;
      symbol: string; color: string; id: string; alive: boolean; hp: number;
    }> = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = chessState.board[row]?.[col];
        if (piece) {
          const agentId = piece.color === 'white' ? 'agent-1' : 'agent-2';
          const prefix = piece.color === 'white' ? 'w' : 'b';
          const symbol = prefix + piece.type.charAt(0).toUpperCase();
          units.push({
            agentId,
            id: agentId + '-' + col + '-' + row,
            x: col,
            y: row,
            symbol,
            color: piece.color === 'white' ? '#ffffff' : '#1a1a1a',
            alive: true,
            hp: 100,
          });
        }
      }
    }
    return {
      type: 'grid',
      data: {
        grid_size: 8,
        units,
        currentTurn: chessState.currentTurn,
        moveHistory: chessState.moveHistory,
      },
    };
  }
}

export { ChessHtmlAdapter } from './adapters/chess-html-adapter';
export default ChessArena;
