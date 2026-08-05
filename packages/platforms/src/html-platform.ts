import type {
  BridgeAction,
  BridgeCapabilities,
  BridgeConfig,
  BridgeGameState,
  BridgeObservation,
  Controller,
  GameBridge,
} from '@ai-game-arena/sdk';
import { BridgeEventEmitter } from './platform-adapter';

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
  /**
   * Public URL of the game entry (rendered in an iframe by the UI). When set,
   * the bridge can run without a server-side host: the game lives in the
   * browser and `getRenderState()` reports this URL.
   */
  url?: string;
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
  private readonly url?: string;

  constructor(options: HTMLBridgeOptions = {}) {
    super();
    this.target = options.target;
    this.url = options.url;
  }

  /** True when the game has no server-side host (it lives in the browser iframe). */
  private get remote(): boolean {
    return !this.host && Boolean(this.url ?? this.target);
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
    if (!this.host && !this.remote) {
      throw new Error('HTMLBridge cannot initialize without an attached game host');
    }
    this.phase = 'initializing';
    this.running = false;

    // Inject the runtime / prepare observations.
    this.target?.postMessage({ type: 'aga:bridge', bridge: 'html', config });
    if (this.host) {
      this.phase = this.host.getPhase() || 'ready';
      this.running = this.host.isRunning();
    } else {
      // Remote game: it runs in the browser iframe; the engine keeps it live.
      this.phase = 'running';
      this.running = true;
    }
    this.initialized = true;
    this.emit('ready', config);
  }

  async reset(): Promise<void> {
    if (!this.initialized) throw new Error('HTMLBridge is not initialized');
    await this.host?.reset();
    this.phase = this.host?.getPhase() ?? 'running';
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
    if (!this.initialized) throw new Error('HTMLBridge is not initialized');
    for (const action of actions) {
      if (this.host) {
        await this.host.dispatchEvent(action.type, action.payload);
      } else {
        // Remote game: forward the action into the browser iframe.
        this.target?.postMessage({ type: 'aga:action', playerId, action });
      }
      this.emit('input', { playerId, action });
    }
  }

  async observe(playerId: string): Promise<BridgeObservation> {
    if (!this.initialized) throw new Error('HTMLBridge is not initialized');
    if (!this.host) {
      // Remote game: the game state lives client-side; report the entry URL.
      return { timestamp: Date.now(), data: { url: this.url ?? null } };
    }
    // Prefer the host's structured, player-facing observation so the agent can
    // actually read the game; fall back to the raw render capture otherwise.
    const data = this.host.captureObservation
      ? await this.host.captureObservation(playerId)
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

  /** Render payload for spectators/UI — separate from the agent observation. */
  getRenderState(): Record<string, unknown> | null {
    if (this.url) {
      return { type: 'web', url: this.url, data: { url: this.url } };
    }
    if (!this.host) return null;
    const data = (this.host.capture() ?? {}) as Record<string, unknown>;
    return { type: this.platform, data, ...data };
  }

  /**
   * Generic action vocabulary for HTML games: press a key, click a position,
   * or pass. Each tool dispatches through `applyActions`, so hosts and remote
   * iframes receive the same abstract actions.
   */
  registerTools(controller: Controller, playerId?: string): void {
    const pid = playerId ?? 'unknown';
    controller.registerTool(
      'press',
      'Press a keyboard key in the game (e.g. ArrowUp, ArrowLeft, space).',
      {
        type: 'object',
        properties: { key: { type: 'string', description: 'Keyboard key to press' } },
        required: ['key'],
      },
      async (args: Record<string, unknown>) => {
        await this.applyActions(pid, [{ type: 'keydown', payload: { key: String(args.key) } }]);
        return { content: [{ type: 'text', text: `Pressed ${String(args.key)}` }] };
      },
    );
    controller.registerTool(
      'click',
      'Click at a position in the game.',
      {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'X coordinate' },
          y: { type: 'number', description: 'Y coordinate' },
        },
        required: ['x', 'y'],
      },
      async (args: Record<string, unknown>) => {
        await this.applyActions(pid, [
          { type: 'pointerdown', payload: { x: Number(args.x), y: Number(args.y) } },
        ]);
        return { content: [{ type: 'text', text: `Clicked at (${String(args.x)}, ${String(args.y)})` }] };
      },
    );
    controller.registerTool(
      'pass',
      'Skip your turn.',
      {},
      async () => ({ content: [{ type: 'text', text: 'Turn passed' }] }),
    );
  }
}
