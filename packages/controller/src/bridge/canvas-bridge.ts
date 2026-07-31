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
 * Minimal API a canvas game exposes to the canvas bridge.
 *
 * Responsibilities (GAME_ENGINE.md): translate abstract input actions into
 * canvas input events, capture pixels, and collect observations.
 */
export interface CanvasGameHost {
  readonly name: string;
  /** Dispatch a translated input event onto the canvas (mouse, pointer, ...). */
  dispatchInput(type: string, payload: unknown): void | Promise<void>;
  /** Capture the canvas (pixels / buffer / state). */
  capturePixels(): unknown | Promise<unknown>;
  getPhase(): string;
  isRunning(): boolean;
  reset(): void | Promise<void>;
  pause(): void | Promise<void>;
  resume(): void | Promise<void>;
  dispose(): void | Promise<void>;
}

/**
 * Canvas platform bridge.
 *
 * ```
 * Engine → applyActions → CanvasBridge → host.dispatchInput → Game
 * Game   → host.capturePixels → CanvasBridge → observe → Engine
 * ```
 */
export class CanvasBridge extends BridgeEventEmitter implements GameBridge {
  readonly platform = 'canvas' as const;
  readonly capabilities: BridgeCapabilities = {
    keyboard: false,
    mouse: true,
    gamepad: false,
    touch: false,
    screenshot: true,
    structuredState: false,
    audio: false,
  };

  private host: CanvasGameHost | null = null;
  private initialized = false;
  private running = false;
  private phase = 'created';

  attach(host: CanvasGameHost): void {
    this.host = host;
  }

  getHost(): CanvasGameHost | null {
    return this.host;
  }

  async initialize(config: BridgeConfig): Promise<void> {
    if (!this.host) {
      throw new Error('CanvasBridge cannot initialize without an attached game host');
    }
    this.phase = 'initializing';
    this.running = false;
    this.phase = this.host.getPhase() || 'ready';
    this.running = this.host.isRunning();
    this.initialized = true;
    this.emit('ready', config);
  }

  async reset(): Promise<void> {
    if (!this.initialized) throw new Error('CanvasBridge is not initialized');
    await this.host?.reset();
    this.phase = this.host?.getPhase() ?? 'ready';
    this.running = this.host?.isRunning() ?? false;
    this.emit('reset');
  }

  async pause(): Promise<void> {
    if (!this.initialized) throw new Error('CanvasBridge is not initialized');
    await this.host?.pause();
    this.phase = 'paused';
    this.running = false;
    this.emit('paused');
  }

  async resume(): Promise<void> {
    if (!this.initialized) throw new Error('CanvasBridge is not initialized');
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
      throw new Error('CanvasBridge is not initialized');
    }
    for (const action of actions) {
      await this.host.dispatchInput(action.type, action.payload);
      this.emit('input', { playerId, action });
    }
  }

  async observe(_playerId: string): Promise<BridgeObservation> {
    if (!this.initialized || !this.host) {
      throw new Error('CanvasBridge is not initialized');
    }
    const data = await this.host.capturePixels();
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
