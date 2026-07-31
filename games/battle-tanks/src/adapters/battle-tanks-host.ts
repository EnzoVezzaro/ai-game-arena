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

  /**
   * Player-facing observation: a readable description of the board plus
   * structured data. This is what the agent actually sees (the render HTML
   * stays out of the observation). The engine treats it as opaque data.
   */
  captureObservation(playerId: string): unknown {
    if (!this.state) return null;
    const { gridWidth, gridHeight, tanks, turn, phase } = this.state;
    const you = tanks[playerId] ?? null;
    const others = Object.entries(tanks)
      .filter(([id]) => id !== playerId)
      .map(([id, t]) => ({ id, x: t.x, y: t.y, health: t.health, alive: t.alive }));

    // ASCII map: you are ▲, alive enemies are ◼, dead enemies are ✕, empty . 
    const rows: string[] = [];
    for (let y = 0; y < gridHeight; y++) {
      const row: string[] = [];
      for (let x = 0; x < gridWidth; x++) {
        if (you && you.x === x && you.y === y && you.alive) row.push('▲');
        else if (others.some((o) => o.x === x && o.y === y && o.alive)) row.push('◼');
        else if (others.some((o) => o.x === x && o.y === y && !o.alive)) row.push('✕');
        else row.push('.');
      }
      rows.push(row.join(' '));
    }
    const map = ['BOARD: (▲ = you, ◼ = enemy, ✕ = destroyed, . = empty)', ...rows.map((r) => `  ${r}`)].join('\n');

    const lines = [
      `You are playing Battle Tanks on a ${gridWidth}x${gridHeight} grid (columns 0-${gridWidth - 1} left to right, rows 0-${gridHeight - 1} top to bottom).`,
      '',
      map,
      '',
      you
        ? `YOUR TANK: you are at (${you.x},${you.y}) with ${you.health} HP, alive: ${you.alive}.`
        : 'YOUR TANK: unknown.',
      'ENEMY TANKS:',
      ...(others.length > 0
        ? others.map((o) => `- Tank at (${o.x},${o.y}) with ${o.health} HP, alive: ${o.alive}.`)
        : ['- none']),
      '',
      `TURN: ${turn} — PHASE: ${phase}`,
      '',
      'ACTIONS AVAILABLE: move(direction: up|down|left|right), attack(targetX, targetY), scan(direction: up|down|left|right), pass().',
      'RULES:',
      '- Take exactly one action per turn.',
      '- You cannot move outside the grid; moving into a wall does nothing.',
      '- attack(targetX, targetY) damages any enemy tank occupying that cell for 35 HP.',
      '- scan(direction) moves you one step in that direction and scans the area; it is a move action.',
      '- You win by being the last tank alive. If the game is over, just pass().',
    ].join('\n');

    return {
      text: lines,
      grid: { width: gridWidth, height: gridHeight },
      turn,
      phase,
      you: you ? { id: playerId, x: you.x, y: you.y, health: you.health, alive: you.alive } : null,
      tanks: others,
      availableActions: ['move', 'attack', 'scan', 'pass'],
      winner: this.winner,
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
