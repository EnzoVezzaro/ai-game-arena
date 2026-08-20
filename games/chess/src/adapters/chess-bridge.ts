import { BridgeEventEmitter } from '@ai-game-arena/platforms';
import type {
  BridgeAction,
  BridgeCapabilities,
  BridgeConfig,
  BridgeEvent,
  BridgeGameState,
  BridgeObservation,
  Controller,
  GameBridge,
} from '@ai-game-arena/sdk';
import {
  checkWinCondition,
  createInitialState,
  executeAction,
  serializeBoard,
  type ChessState,
} from '../game';

const DEFAULT_CAPABILITIES: BridgeCapabilities = {
  keyboard: false,
  mouse: false,
  gamepad: false,
  touch: false,
  screenshot: false,
  structuredState: true,
  audio: false,
};

/**
 * Chess bridge.
 *
 * Wraps the chess game logic (rules-only) so the engine can drive
 * the game through the standard bridge contract. The bridge produces
 * board-state observations and a grid render state for the UI.
 */
export class ChessBridge extends BridgeEventEmitter implements GameBridge {
  readonly platform = 'chess';
  readonly capabilities: BridgeCapabilities = DEFAULT_CAPABILITIES;

  private state: ChessState | null = null;
  private agentIds: string[] = [];

  initialize(config: BridgeConfig): Promise<void> {
    this.agentIds = config.agentIds ?? [];
    this.state = createInitialState(config.seed, this.agentIds);
    this.emit('ready');
    return Promise.resolve();
  }

  reset(): Promise<void> {
    this.state = createInitialState(undefined, this.agentIds);
    this.emit('reset');
    return Promise.resolve();
  }

  pause(): Promise<void> {
    if (this.state) {
      this.state = { ...this.state, phase: 'paused' };
    }
    this.emit('paused');
    return Promise.resolve();
  }

  resume(): Promise<void> {
    if (this.state && this.state.phase === 'paused') {
      this.state = { ...this.state, phase: 'running' };
    }
    this.emit('resumed');
    return Promise.resolve();
  }

  dispose(): Promise<void> {
    this.state = null;
    this.emit('disposed');
    return Promise.resolve();
  }

  applyActions(playerId: string, actions: BridgeAction[]): Promise<void> {
    if (!this.state || this.state.phase !== 'running') return Promise.resolve();

    for (const action of actions) {
      const validation = executeAction(
        {
          agentId: playerId,
          type: action.type,
          parameters: action.payload as Record<string, unknown>,
          timestamp: Date.now(),
        },
        this.state,
      );
      if (!validation.success) continue;
      this.state = validation.state;
      for (const event of validation.events) {
        this.emit(event.type.toLowerCase(), event.data);
      }

      const win = checkWinCondition(this.state);
      if (win) {
        this.state = { ...this.state, phase: 'finished' };
        this.emit('game-over', win);
      }
    }

    return Promise.resolve();
  }

  observe(_playerId: string): Promise<BridgeObservation> {
    if (!this.state) {
      return Promise.resolve({ timestamp: Date.now(), data: null });
    }
    return Promise.resolve({
      timestamp: Date.now(),
      data: {
        board: serializeBoard(this.state.board),
        currentTurn: this.state.currentTurn,
        phase: this.state.phase,
        turn: this.state.fullMoveNumber,
        moveHistory: this.state.moveHistory.map((m) => ({
          from: m.from,
          to: m.to,
          piece: m.piece.type,
          captured: m.captured?.type ?? null,
        })),
      },
    });
  }

  getState(): Promise<BridgeGameState> {
    return Promise.resolve({
      phase: this.state?.phase ?? 'idle',
      running: this.state?.phase === 'running',
    });
  }

  onEvent(handler: (event: BridgeEvent) => void): void {
    super.onEvent(handler);
  }

  registerTools(_controller: Controller, _playerId?: string): void {
    // Chess actions are passed through directly; no tool registration needed.
  }

  getScores(): Record<string, number> {
    if (!this.state) return {};
    const scores: Record<string, number> = {};
    for (const id of this.agentIds) {
      scores[id] = 0;
    }
    const win = checkWinCondition(this.state);
    if (win?.winner) {
      scores[win.winner] = 1;
    }
    return scores;
  }

  getWinner(): string | null {
    if (!this.state) return null;
    return checkWinCondition(this.state)?.winner ?? null;
  }

  getRenderState(): Record<string, unknown> | null {
    if (!this.state) return null;
    return {
      type: 'board',
      grid_size: 8,
      units: this.buildUnits(),
    };
  }

  private buildUnits(): Array<{
    agent_id: string;
    x: number;
    y: number;
    hp: number;
    alive: boolean;
    color: string;
    symbol: string;
  }> {
    const units: Array<{
      agent_id: string;
      x: number;
      y: number;
      hp: number;
      alive: boolean;
      color: string;
      symbol: string;
    }> = [];
    if (!this.state) return units;

    const whiteAgentId = this.agentIds[0] ?? 'agent-1';
    const blackAgentId = this.agentIds[1] ?? 'agent-2';

    const symbolMap: Record<string, string> = {
      king: '♔',
      queen: '♕',
      rook: '♖',
      bishop: '♗',
      knight: '♘',
      pawn: '♙',
    };

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.state.board[row]?.[col];
        if (!piece) continue;
        const isWhite = piece.color === 'white';
        const color = isWhite ? '#f0f0f0' : '#303030';
        const symbol = isWhite
          ? (symbolMap[piece.type] ?? '?')
          : (symbolMap[piece.type]?.toLowerCase() ?? '?');
        const agentId = isWhite ? whiteAgentId : blackAgentId;
        units.push({
          agent_id: agentId,
          x: col,
          y: row,
          hp: 1,
          alive: true,
          color,
          symbol,
        });
      }
    }
    return units;
  }
}
