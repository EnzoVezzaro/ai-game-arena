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

type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
type PieceColor = 'white' | 'black';

interface ChessPiece {
  type: PieceType;
  color: PieceColor;
  hasMoved: boolean;
}

interface ChessPosition {
  row: number;
  col: number;
}

interface ChessMove {
  from: ChessPosition;
  to: ChessPosition;
  piece: ChessPiece;
  captured?: ChessPiece;
}

export interface ChessState {
  board: (ChessPiece | null)[][];
  currentTurn: PieceColor;
  moveHistory: ChessMove[];
  halfMoveClock: number;
  fullMoveNumber: number;
  phase: string;
}

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
    const board = this.createInitialBoard();
    const state: ChessState = {
      board,
      currentTurn: 'white',
      moveHistory: [],
      halfMoveClock: 0,
      fullMoveNumber: 1,
      phase: 'running',
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
        name: 'move_piece',
        description: 'Move a chess piece from one square to another',
        parameters: [
          { name: 'fromRow', type: 'number', description: 'Source row (0-7)', required: true },
          { name: 'fromCol', type: 'number', description: 'Source column (0-7)', required: true },
          { name: 'toRow', type: 'number', description: 'Destination row (0-7)', required: true },
          {
            name: 'toCol',
            type: 'number',
            description: 'Destination column (0-7)',
            required: true,
          },
        ],
        mandatory: true,
      },
      {
        name: 'get_legal_moves',
        description: 'Get all legal moves for a piece at a given position',
        parameters: [
          { name: 'row', type: 'number', description: 'Row (0-7)', required: true },
          { name: 'col', type: 'number', description: 'Column (0-7)', required: true },
        ],
        mandatory: false,
      },
    ];
  }

  validateAction(action: AgentAction, state: WorldState): ValidationResult {
    if (action.type === 'pass') {
      return { valid: true };
    }

    if (action.type === 'move_piece') {
      const { fromRow, fromCol, toRow, toCol } = action.parameters as {
        fromRow: number;
        fromCol: number;
        toRow: number;
        toCol: number;
      };

      const chessState = state.data as unknown as ChessState;

      // Validate coordinates
      if (
        fromRow < 0 ||
        fromRow > 7 ||
        fromCol < 0 ||
        fromCol > 7 ||
        toRow < 0 ||
        toRow > 7 ||
        toCol < 0 ||
        toCol > 7
      ) {
        return { valid: false, error: 'Coordinates must be between 0 and 7' };
      }

      // Check piece exists at source
      const sourceRow = chessState.board[fromRow];
      if (!sourceRow) {
        return { valid: false, error: 'Invalid source row' };
      }
      const piece = sourceRow[fromCol];
      if (!piece) {
        return { valid: false, error: 'No piece at source position' };
      }

      // Check piece color matches current turn
      if (piece.color !== chessState.currentTurn) {
        return { valid: false, error: 'Not your turn' };
      }

      // Check destination doesn't have own piece
      const destRow = chessState.board[toRow];
      const destPiece = destRow?.[toCol] ?? null;
      if (destPiece && destPiece.color === piece.color) {
        return { valid: false, error: 'Cannot capture your own piece' };
      }

      return { valid: true };
    }

    if (action.type === 'get_legal_moves') {
      return { valid: true };
    }

    return { valid: false, error: `Unknown action: ${action.type}` };
  }

  executeAction(action: AgentAction, state: WorldState): ActionOutcome {
    const chessState = { ...(state.data as unknown as ChessState) };
    const events: GameEvent[] = [];

    if (action.type === 'pass') {
      return { success: true, events };
    }

    if (action.type === 'move_piece') {
      const { fromRow, fromCol, toRow, toCol } = action.parameters as {
        fromRow: number;
        fromCol: number;
        toRow: number;
        toCol: number;
      };

      const sourceRow = chessState.board[fromRow];
      const destRow = chessState.board[toRow];
      if (!sourceRow || !destRow) {
        return { success: false, events, error: 'Invalid coordinates' };
      }

      const piece = sourceRow[fromCol] ?? null;
      const captured = destRow[toCol] ?? null;

      // Execute move
      destRow[toCol] = piece;
      sourceRow[fromCol] = null;
      if (piece) piece.hasMoved = true;

      // Record move
      const move: ChessMove = {
        from: { row: fromRow, col: fromCol },
        to: { row: toRow, col: toCol },
        piece: piece!,
        captured: captured ?? undefined,
      };
      chessState.moveHistory.push(move);

      events.push({
        type: 'PIECE_MOVED',
        timestamp: Date.now(),
        data: {
          piece: piece?.type,
          color: piece?.color,
          from: { row: fromRow, col: fromCol },
          to: { row: toRow, col: toCol },
          captured: captured?.type,
        },
      });

      // Switch turns
      chessState.currentTurn = chessState.currentTurn === 'white' ? 'black' : 'white';
      if (chessState.currentTurn === 'white') {
        chessState.fullMoveNumber++;
      }
    }

    return { success: true, events, state: chessState as unknown as Record<string, unknown> };
  }

  getObservation(agentId: string, state: WorldState): Observation {
    const chessState = state.data as unknown as ChessState;
    const color = this.getAgentColor(agentId);

    return {
      timestamp: Date.now(),
      agentId,
      type: 'board-state',
      data: {
        content: {
          board: this.serializeBoard(chessState.board),
          currentTurn: chessState.currentTurn,
          moveHistory: chessState.moveHistory.slice(-10),
          isMyTurn: chessState.currentTurn === color,
          pieceColor: color,
        },
        format: 'json',
      },
      metadata: {
        turnNumber: chessState.fullMoveNumber,
        gameState: chessState.phase,
        availableActions: ['move_piece', 'get_legal_moves', 'pass'],
      },
    };
  }

  checkWinCondition(state: WorldState): WinCondition | null {
    const chessState = state.data as unknown as ChessState;

    // Check if king is missing (simplified checkmate detection)
    let whiteKing = false;
    let blackKing = false;

    for (const row of chessState.board) {
      for (const piece of row) {
        if (piece?.type === 'king') {
          if (piece.color === 'white') whiteKing = true;
          if (piece.color === 'black') blackKing = true;
        }
      }
    }

    if (!whiteKing) {
      return { winner: 'black', reason: 'White king captured' };
    }
    if (!blackKing) {
      return { winner: 'white', reason: 'Black king captured' };
    }

    // Max moves limit
    if (chessState.fullMoveNumber > 200) {
      return { winner: 'draw', reason: 'Move limit reached' };
    }

    return null;
  }

  getScores(state: WorldState): Record<string, number> {
    const chessState = state.data as unknown as ChessState;
    const scores: Record<string, number> = {};

    for (const row of chessState.board) {
      for (const piece of row) {
        if (piece) {
          const id = piece.color === 'white' ? 'white' : 'black';
          scores[id] = (scores[id] ?? 0) + this.getPieceValue(piece.type);
        }
      }
    }

    return scores;
  }

  getRenderState(state: WorldState): RenderState {
    const chessState = state.data as unknown as ChessState;
    return {
      type: 'chess-board',
      data: {
        board: this.serializeBoard(chessState.board),
        currentTurn: chessState.currentTurn,
        moveHistory: chessState.moveHistory,
      },
    };
  }

  private createInitialBoard(): (ChessPiece | null)[][] {
    const board: (ChessPiece | null)[][] = Array(8)
      .fill(null)
      .map(() => Array(8).fill(null));

    // Place pieces
    const backRow: PieceType[] = [
      'rook',
      'knight',
      'bishop',
      'queen',
      'king',
      'bishop',
      'knight',
      'rook',
    ];

    for (let col = 0; col < 8; col++) {
      const pieceType = backRow[col];
      if (pieceType) {
        board[0]![col] = { type: pieceType, color: 'black', hasMoved: false };
        board[7]![col] = { type: pieceType, color: 'white', hasMoved: false };
      }
      board[1]![col] = { type: 'pawn', color: 'black', hasMoved: false };
      board[6]![col] = { type: 'pawn', color: 'white', hasMoved: false };
    }

    return board;
  }

  private serializeBoard(board: (ChessPiece | null)[][]): string[][] {
    return board.map((row) =>
      row.map((piece) => {
        if (!piece) return '';
        const prefix = piece.color === 'white' ? 'w' : 'b';
        return prefix + piece.type.charAt(0).toUpperCase();
      }),
    );
  }

  private getAgentColor(agentId: string): PieceColor {
    // Simple mapping: first agent is white, second is black
    return agentId === 'agent-1' ? 'white' : 'black';
  }

  private getPieceValue(type: PieceType): number {
    const values: Record<PieceType, number> = {
      pawn: 1,
      knight: 3,
      bishop: 3,
      rook: 5,
      queen: 9,
      king: 100,
    };
    return values[type];
  }
}

export default ChessArena;
