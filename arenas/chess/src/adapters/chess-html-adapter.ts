import type { GameAdapter } from '@ai-game-arena/controller';
import type { AgentAction, InputAction, WorldState } from '@ai-game-arena/sdk';
import type { Controller } from '@ai-game-arena/sdk';

export class ChessHtmlAdapter implements GameAdapter {
  private agentId = '';
  private worldState: WorldState | null = null;
  private pendingAction: AgentAction | null = null;

  onTurnStart(agentId: string, worldState: WorldState): void {
    this.agentId = agentId;
    this.worldState = worldState;
    this.pendingAction = null;
  }

  registerTools(controller: Controller): void {
    const self = this;

    controller.registerTool(
      'move_piece',
      'Move a chess piece from one square to another. Use row/col coordinates where row 0 = top (black back rank), row 7 = bottom (white back rank).',
      {
        fromRow: {
          type: 'number',
          description: 'Source row (0-7, 0=top/black side, 7=bottom/white side)',
          required: true,
        },
        fromCol: {
          type: 'number',
          description: 'Source column (0-7, 0=a-file/left)',
          required: true,
        },
        toRow: {
          type: 'number',
          description: 'Destination row (0-7)',
          required: true,
        },
        toCol: {
          type: 'number',
          description: 'Destination column (0-7)',
          required: true,
        },
      },
      async (args) => {
        self.pendingAction = {
          agentId: self.agentId,
          type: 'move_piece',
          parameters: args as Record<string, unknown>,
          timestamp: Date.now(),
        };
        return {
          content: [
            {
              type: 'text',
              text: `Move queued: (${String(args.fromRow)},${String(args.fromCol)}) → (${String(args.toRow)},${String(args.toCol)})`,
            },
          ],
        };
      },
    );

    controller.registerTool(
      'get_legal_moves',
      'Get all legal moves for a piece at a given board position. Returns an array of valid destination squares.',
      {
        row: { type: 'number', description: 'Row (0-7)', required: true },
        col: { type: 'number', description: 'Column (0-7)', required: true },
      },
      async (args) => {
        const board = (self.worldState?.data as { board?: unknown[][] | undefined })?.board;
        if (!board || !board[args.row as number]) {
          return { content: [{ type: 'text', text: 'Invalid board position' }], isError: true };
        }
        const piece = board[args.row as number]?.[args.col as number] as
          | { type: string; color: string }
          | undefined;
        if (!piece) {
          return { content: [{ type: 'text', text: 'No piece at this position' }], isError: true };
        }
        const moves = self.computeLegalMoves(
          board as unknown[][],
          args.row as number,
          args.col as number,
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                piece: `${piece.color} ${piece.type}`,
                position: { row: args.row, col: args.col },
                legalMoves: moves,
                count: moves.length,
              }),
            },
          ],
        };
      },
    );
  }

  processInput(_action: InputAction): void {
    // For future use: translate device-level input (mouse clicks, keyboard) into game actions
    // Example: two mouse clicks on board squares → move_piece action
  }

  extractAction(): AgentAction | null {
    const action = this.pendingAction;
    this.pendingAction = null;
    return action;
  }

  private computeLegalMoves(
    board: unknown[][],
    row: number,
    col: number,
  ): Array<{ row: number; col: number; capture: boolean }> {
    const piece = board[row]?.[col] as
      | { type: string; color: string; hasMoved?: boolean }
      | undefined;
    if (!piece) return [];

    const color = piece.color;
    const enemy = color === 'white' ? 'black' : 'white';
    const moves: Array<{ row: number; col: number; capture: boolean }> = [];
    const inBounds = (r: number, c: number) => r >= 0 && r <= 7 && c >= 0 && c <= 7;
    const occupied = (r: number, c: number) => {
      const p = board[r]?.[c] as { color?: string } | undefined;
      return p != null;
    };
    const enemyAt = (r: number, c: number) => {
      const p = board[r]?.[c] as { color?: string } | undefined;
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
}
