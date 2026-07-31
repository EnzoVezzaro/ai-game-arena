import type {
  BridgeAction,
  BridgeCapabilities,
  BridgeConfig,
  BridgeGameState,
  BridgeObservation,
  GameBridge,
} from '@ai-game-arena/sdk';
import { BridgeEventEmitter } from './bridge-event-emitter';

/**
 * Minimal API an HTML game exposes to the HTML bridge.
 *
 * The HTML Bridge is responsible for exactly four things (GAME_ENGINE.md):
 * attach to an existing game instance, inject the runtime, receive abstract
 * actions and dispatch them as DOM/native events, and collect observations.
 */
export interface HtmlGameHost {
  readonly name: string;
  /** Dispatch a translated event into the game (e.g. a KeyboardEvent). */
  dispatchEvent(type: string, payload: unknown): void | Promise<void>;
  /** Collect an observation (DOM snapshot, canvas, screenshot, state). */
  capture(): unknown | Promise<unknown>;
  getPhase(): string;
  isRunning(): boolean;
  reset(): void | Promise<void>;
  pause(): void | Promise<void>;
  resume(): void | Promise<void>;
  dispose(): void | Promise<void>;
  /** Optional: game-originated events (goal, checkpoint, coin, death, ...). */
  onGameEvent?(handler: (type: string, data?: unknown) => void): void;
  /**
   * Optional: a player-facing structured observation (positions, board,
   * available actions). When absent, the bridge falls back to `capture()`.
   * The engine treats the observation as opaque data; a readable observation
   * lets the agent actually play the game.
   */
  captureObservation?(playerId: string): unknown | Promise<unknown>;
}

export interface HTMLBridgeOptions {
  /** Optional browser-style target for postMessage-based hosts. */
  target?: { postMessage(message: unknown): void } | null;
}

/**
 * HTML platform bridge.
 *
 * ```
 * Engine → applyActions → HTMLBridge → host.dispatchEvent → Game
 * Game   → host.capture  → HTMLBridge → observe → Engine
 * ```
 *
 * The bridge translates engine requests into native game operations. It never
 * contains game logic, never opens tabs and never performs navigation.
 */
export class HTMLBridge extends BridgeEventEmitter implements GameBridge {
  readonly platform = 'html' as const;
  readonly capabilities: BridgeCapabilities = {
    keyboard: true,
    mouse: true,
    gamepad: false,
    touch: false,
    screenshot: true,
    structuredState: true,
    audio: false,
  };

  private host: HtmlGameHost | null = null;
  private initialized = false;
  private running = false;
  private phase = 'created';
  private readonly target?: { postMessage(message: unknown): void } | null;

  constructor(options: HTMLBridgeOptions = {}) {
    super();
    this.target = options.target;
  }

  /** Attach the bridge to an existing game instance (never opens tabs). */
  attach(host: HtmlGameHost): void {
    this.host = host;
    host.onGameEvent?.((type, data) => this.emit(type, data));
  }

  getHost(): HtmlGameHost | null {
    return this.host;
  }

  async initialize(config: BridgeConfig): Promise<void> {
    if (!this.host) {
      throw new Error('HTMLBridge cannot initialize without an attached game host');
    }
    this.phase = 'initializing';
    this.running = false;

    // Inject the runtime / prepare observations.
    this.target?.postMessage({ type: 'aga:bridge', bridge: 'html', config });
    this.phase = this.host.getPhase() || 'ready';
    this.running = this.host.isRunning();
    this.initialized = true;
    this.emit('ready', config);
  }

  async reset(): Promise<void> {
    if (!this.initialized) throw new Error('HTMLBridge is not initialized');
    await this.host?.reset();
    this.phase = this.host?.getPhase() ?? 'ready';
    this.running = this.host?.isRunning() ?? false;
    this.emit('reset');
  }

  async pause(): Promise<void> {
    if (!this.initialized) throw new Error('HTMLBridge is not initialized');
    await this.host?.pause();
    this.phase = 'paused';
    this.running = false;
    this.emit('paused');
  }

  async resume(): Promise<void> {
    if (!this.initialized) throw new Error('HTMLBridge is not initialized');
    await this.host?.resume();
    this.phase = this.host?.getPhase() ?? 'running';
    this.running = true;
    this.emit('resumed');
  }

  async dispose(): Promise<void> {
    await this.host?.dispose();
    this.host = null;
    this.initialized = false;
    this.running = false;
    this.phase = 'disposed';
    this.emit('disposed');
  }

  async applyActions(playerId: string, actions: BridgeAction[]): Promise<void> {
    if (!this.initialized || !this.host) {
      throw new Error('HTMLBridge is not initialized');
    }
    for (const action of actions) {
      await this.host.dispatchEvent(action.type, action.payload);
      this.emit('input', { playerId, action });
    }
  }

  async observe(_playerId: string): Promise<BridgeObservation> {
    if (!this.initialized || !this.host) {
      throw new Error('HTMLBridge is not initialized');
    }
    // Prefer the host's structured, player-facing observation so the agent can
    // actually read the game; fall back to the raw render capture otherwise.
    const data = this.host.captureObservation
      ? await this.host.captureObservation(_playerId)
      : await this.host.capture();
    return { timestamp: Date.now(), data };
  }

  async getState(): Promise<BridgeGameState> {
    if (!this.host) {
      return { phase: this.phase, running: this.running };
    }
    return {
      phase: this.host.getPhase(),
      running: this.host.isRunning(),
    };
  }
}
