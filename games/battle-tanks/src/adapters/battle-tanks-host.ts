import type { HtmlGameHost } from '@ai-game-arena/controller';
import type { AgentAction } from '@ai-game-arena/sdk';
import type { BattleTanksState } from '../game';
import {
  checkWinCondition,
  createInitialState,
  executeAction,
  validateAction,
} from '../game';
import { renderGameHtml, toUnits } from '../game-view';

const KEY_DIRECTIONS: Record<string, string> = {
  W: 'up',
  w: 'up',
  ArrowUp: 'up',
  A: 'left',
  a: 'left',
  ArrowLeft: 'left',
  S: 'down',
  s: 'down',
  ArrowDown: 'down',
  D: 'right',
  d: 'right',
  ArrowRight: 'right',
};

/**
 * The battle-tanks game runtime exposed to the HTML bridge.
 *
 * It contains game logic only: it translates abstract actions into game
 * operations, keeps the authoritative game state, emits game events, and
 * collects observations. It knows nothing about the engine, agents, or arena.
 */
export class BattleTanksHost implements HtmlGameHost {
  readonly name = 'battle-tanks';

  private state: BattleTanksState | null = null;
  private seed: number | undefined;
  private agentIds: string[] = [];
  private activePlayer: string | null = null;
  private paused = false;
  private winner: string | null = null;
  private eventSink: ((type: string, data?: unknown) => void) | null = null;

  onGameEvent(handler: (type: string, data?: unknown) => void): void {
    this.eventSink = handler;
  }

  initialize(seed?: number, agentIds?: string[]): void {
    this.seed = seed;
    this.agentIds = agentIds ?? [];
    this.state = createInitialState(seed, this.agentIds);
    this.winner = null;
    this.paused = false;
  }

  setActivePlayer(playerId: string): void {
    this.activePlayer = playerId;
  }

  getActivePlayer(): string | null {
    return this.activePlayer;
  }

  private translate(type: string, payload: unknown): AgentAction {
    const playerId = this.activePlayer ?? 'unknown';
    const params = (payload ?? {}) as Record<string, unknown>;

    // Device-level actions (per GAME_ENGINE.md) → game actions.
    if (type === 'keyboard.press') {
      const key = params.key as string | undefined;
      const direction = key ? KEY_DIRECTIONS[key] : undefined;
      if (direction) {
        return { agentId: playerId, type: 'move', parameters: { direction }, timestamp: Date.now() };
      }
    }

    // Game actions are passed through directly.
    return { agentId: playerId, type, parameters: params, timestamp: Date.now() };
  }

  dispatchEvent(type: string, payload: unknown): void {
    if (!this.state) {
      throw new Error('BattleTanksHost is not initialized');
    }
    if (this.paused || this.state.phase !== 'running') {
      return;
    }

    const action = this.translate(type, payload);
    const validation = validateAction(action, this.state);
    if (!validation.valid) {
      this.eventSink?.('error', { action: type, error: validation.error });
      return;
    }

    const result = executeAction(action, this.state);
    if (!result.success) {
      this.eventSink?.('error', { action: type, error: result.error });
      return;
    }

    this.state = result.state;
    for (const event of result.events) {
      this.eventSink?.(event.type.toLowerCase(), event.data);
    }

    const win = checkWinCondition(this.state);
    if (win) {
      this.winner = win.winner;
      this.state = { ...this.state, phase: 'finished' };
      this.eventSink?.('game-over', win);
    }
  }

  capture(): unknown {
    if (!this.state) return null;
    const { gridWidth, gridHeight, tanks, turn, phase } = this.state;
    return {
      // The game's own render output, served to the engine for display.
      html: renderGameHtml(this.state, this.winner),
      gridWidth,
      gridHeight,
      tanks,
      turn,
      phase,
      winner: this.winner,
      units: toUnits(this.state),
    };
  }

  getScores(): Record<string, number> {
    if (!this.state) return {};
    const scores: Record<string, number> = {};
    for (const [id, tank] of Object.entries(this.state.tanks)) {
      scores[id] = tank.alive ? tank.health : 0;
    }
    return scores;
  }

  getWinner(): string | null {
    return this.winner;
  }

  getPhase(): string {
    return this.state?.phase ?? 'created';
  }

  isRunning(): boolean {
    return !!this.state && this.state.phase === 'running' && !this.paused;
  }

  reset(): void {
    this.initialize(this.seed, this.agentIds);
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  dispose(): void {
    this.state = null;
    this.winner = null;
    this.activePlayer = null;
  }
}
