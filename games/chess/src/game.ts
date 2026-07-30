import type { AgentAction, ValidationResult, WinCondition, GameEvent } from '@ai-game-arena/sdk';

type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
type PieceColor = 'white' | 'black';

interface ChessPiece { type: PieceType; color: PieceColor; hasMoved: boolean; }
interface ChessPosition { row: number; col: number; }
interface ChessMove { from: ChessPosition; to: ChessPosition; piece: ChessPiece; captured?: ChessPiece; }

export interface ChessState {
  board: (ChessPiece | null)[][];
  currentTurn: PieceColor;
  moveHistory: ChessMove[];
  halfMoveClock: number;
  fullMoveNumber: number;
  phase: string;
}

export function createInitialState(_seed?: number, _agentIds?: string[]): ChessState {
  const board: (ChessPiece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  const backRow: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  for (let col = 0; col < 8; col++) {
    const pieceType = backRow[col]!;
    board[0]![col] = { type: pieceType, color: 'black', hasMoved: false };
    board[7]![col] = { type: pieceType, color: 'white', hasMoved: false };
    board[1]![col] = { type: 'pawn', color: 'black', hasMoved: false };
    board[6]![col] = { type: 'pawn', color: 'white', hasMoved: false };
  }
  return { board, currentTurn: 'white', moveHistory: [], halfMoveClock: 0, fullMoveNumber: 1, phase: 'running' };
}

export function validateAction(action: AgentAction, state: ChessState): ValidationResult {
  if (action.type === 'pass') return { valid: false, error: 'Cannot pass in chess — you must make a move' };
  if (action.type === 'move_piece') {
    const { fromRow, fromCol, toRow, toCol } = action.parameters as { fromRow: number; fromCol: number; toRow: number; toCol: number };
    if (fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7 || toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7)
      return { valid: false, error: 'Coordinates must be between 0 and 7' };
    const sourceRow = state.board[fromRow];
    if (!sourceRow) return { valid: false, error: 'Invalid source row' };
    const piece = sourceRow[fromCol];
    if (!piece) return { valid: false, error: 'No piece at source position' };
    if (piece.color !== state.currentTurn) return { valid: false, error: 'Not your turn' };
    const destRow = state.board[toRow];
    const destPiece = destRow?.[toCol] ?? null;
    if (destPiece && destPiece.color === piece.color) return { valid: false, error: 'Cannot capture your own piece' };
    return { valid: true };
  }
  if (action.type === 'get_legal_moves') return { valid: true };
  return { valid: false, error: `Unknown action: ${action.type}` };
}

export function executeAction(action: AgentAction, state: ChessState): { success: boolean; events: GameEvent[]; state: ChessState } {
  const newState: ChessState = JSON.parse(JSON.stringify(state));
  const events: GameEvent[] = [];
  if (action.type === 'pass') return { success: true, events, state: newState };
  if (action.type === 'move_piece') {
    const { fromRow, fromCol, toRow, toCol } = action.parameters as { fromRow: number; fromCol: number; toRow: number; toCol: number };
    const sourceRow = newState.board[fromRow]!;
    const destRow = newState.board[toRow]!;
    const piece = sourceRow[fromCol]!;
    const captured = destRow[toCol] ?? undefined;
    destRow[toCol] = piece;
    sourceRow[fromCol] = null;
    piece.hasMoved = true;
    const move: ChessMove = { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol }, piece: JSON.parse(JSON.stringify(piece)), captured };
    newState.moveHistory.push(move);
    events.push({ type: 'PIECE_MOVED', timestamp: Date.now(), data: { piece: piece.type, color: piece.color, from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol }, captured: captured?.type } });
    newState.currentTurn = newState.currentTurn === 'white' ? 'black' : 'white';
    if (newState.currentTurn === 'white') newState.fullMoveNumber++;
  }
  return { success: true, events, state: newState };
}

export function checkWinCondition(state: ChessState): WinCondition | null {
  let whiteKing = false, blackKing = false;
  for (const row of state.board) {
    for (const piece of row) {
      if (piece?.type === 'king') {
        if (piece.color === 'white') whiteKing = true;
        if (piece.color === 'black') blackKing = true;
      }
    }
  }
  if (!whiteKing) return { winner: 'black', reason: 'White king captured' };
  if (!blackKing) return { winner: 'white', reason: 'Black king captured' };
  if (state.fullMoveNumber > 200) return { winner: 'draw', reason: 'Move limit reached' };
  return null;
}

export function getScores(state: ChessState): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const row of state.board) {
    for (const piece of row) {
      if (piece) {
        const id = piece.color === 'white' ? 'white' : 'black';
        const values: Record<PieceType, number> = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 100 };
        scores[id] = (scores[id] ?? 0) + (values[piece.type] ?? 0);
      }
    }
  }
  return scores;
}

export function getLegalMoves(board: (ChessPiece | null)[][], row: number, col: number): Array<{ row: number; col: number; capture: boolean }> {
  const piece = board[row]?.[col];
  if (!piece) return [];

  const color = piece.color;
  const enemy = color === 'white' ? 'black' : 'white';
  const moves: Array<{ row: number; col: number; capture: boolean }> = [];
  const inBounds = (r: number, c: number) => r >= 0 && r <= 7 && c >= 0 && c <= 7;
  const occupied = (r: number, c: number) => {
    const p = board[r]?.[c];
    return p != null;
  };
  const enemyAt = (r: number, c: number) => {
    const p = board[r]?.[c];
    return p?.color === enemy;
  };
  const addIf = (r: number, c: number) => {
    if (!inBounds(r, c)) return false;
    if (enemyAt(r, c)) {
      moves.push({ row: r, col: c, capture: true });
      return false;
    }
    if (occupied(r, c)) return false;
    moves.push({ row: r, col: c, capture: false });
    return true;
  };
  const dirs = (deltas: Array<[number, number]>, single = true) => {
    for (const [dr, dc] of deltas) {
      if (single) {
        addIf(row + dr, col + dc);
      } else {
        for (let i = 1; i < 8; i++) {
          if (!addIf(row + dr * i, col + dc * i)) break;
        }
      }
    }
  };

  switch (piece.type) {
    case 'pawn': {
      const forward = color === 'white' ? -1 : 1;
      const startRow = color === 'white' ? 6 : 1;
      if (inBounds(row + forward, col) && !occupied(row + forward, col)) {
        moves.push({ row: row + forward, col, capture: false });
        if (row === startRow && !occupied(row + 2 * forward, col)) {
          moves.push({ row: row + 2 * forward, col, capture: false });
        }
      }
      for (const dc of [-1, 1]) {
        if (inBounds(row + forward, col + dc) && enemyAt(row + forward, col + dc)) {
          moves.push({ row: row + forward, col: col + dc, capture: true });
        }
      }
      break;
    }
    case 'knight':
      dirs([
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ]);
      break;
    case 'bishop':
      dirs([[-1, -1], [-1, 1], [1, -1], [1, 1]], false);
      break;
    case 'rook':
      dirs([[-1, 0], [1, 0], [0, -1], [0, 1]], false);
      break;
    case 'queen':
      dirs(
        [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1], [0, 1],
          [1, -1], [1, 0], [1, 1],
        ],
        false,
      );
      break;
    case 'king':
      dirs([
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1],
      ]);
      break;
  }

  return moves;
}

export function serializeBoard(board: (ChessPiece | null)[][]): string[][] {
  return board.map(row => row.map(piece => {
    if (!piece) return '';
    return (piece.color === 'white' ? 'w' : 'b') + piece.type.charAt(0).toUpperCase();
  }));
}

export function getAgentColor(agentId: string): PieceColor {
  return agentId === 'agent-1' ? 'white' : 'black';
}
