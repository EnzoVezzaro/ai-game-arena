import type {
  BridgeAction,
  BridgeCapabilities,
  BridgeConfig,
  BridgeGameState,
  BridgeObservation,
  GameBridge,
} from '@ai-game-arena/sdk';
import { BridgeEventEmitter } from './bridge-event-emitter';

export interface BridgeTransportMessage {
  readonly type: string;
  readonly id?: string;
  readonly payload?: unknown;
}

/**
 * Transport used by the Unity bridge. The engine does not care which transport
 * is used (WebSocket, Named Pipe, TCP, Shared Memory, Native Plugin).
 */
export interface BridgeTransport {
  readonly connected: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: BridgeTransportMessage): Promise<void>;
  onMessage(handler: (message: BridgeTransportMessage) => void): void;
}

export interface UnityBridgeOptions {
  transport: BridgeTransport;
  /** Timeout (ms) waiting for observation replies. Default 5000. */
  captureTimeoutMs?: number;
}

interface PendingCapture {
  resolve: (data: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * Unity platform bridge.
 *
 * ```
 * Engine → applyActions → UnityBridge → transport.send → Unity Input System
 * Unity  → transport message → UnityBridge → observe/getState → Engine
 * ```
 */
export class UnityBridge extends BridgeEventEmitter implements GameBridge {
  readonly platform = 'unity' as const;
  readonly capabilities: BridgeCapabilities = {
    keyboard: true,
    mouse: true,
    gamepad: true,
    touch: false,
    screenshot: true,
    structuredState: true,
    audio: false,
  };

  private readonly transport: BridgeTransport;
  private readonly captureTimeoutMs: number;
  private initialized = false;
  private state: BridgeGameState = { phase: 'created', running: false };
  private pending = new Map<string, PendingCapture>();
  private messageSeq = 0;

  constructor(options: UnityBridgeOptions) {
    super();
    this.transport = options.transport;
    this.captureTimeoutMs = options.captureTimeoutMs ?? 5000;
    this.transport.onMessage((message) => this.handleMessage(message));
  }

  getTransport(): BridgeTransport {
    return this.transport;
  }

  private nextId(): string {
    this.messageSeq += 1;
    return `req-${this.messageSeq}`;
  }

  private handleMessage(message: BridgeTransportMessage): void {
    switch (message.type) {
      case 'state': {
        const payload = (message.payload ?? {}) as Partial<BridgeGameState>;
        this.state = {
          phase: typeof payload.phase === 'string' ? payload.phase : this.state.phase,
          running: typeof payload.running === 'boolean' ? payload.running : this.state.running,
        };
        break;
      }
      case 'capture-result': {
        const pending = message.id ? this.pending.get(message.id) : undefined;
        if (pending) {
          this.pending.delete(message.id!);
          clearTimeout(pending.timeout);
          pending.resolve(message.payload);
        }
        break;
      }
      case 'event': {
        const payload = message.payload as { type?: string; data?: unknown } | undefined;
        this.emit(payload?.type ?? 'event', payload?.data);
        break;
      }
      default:
        break;
    }
  }

  async initialize(config: BridgeConfig): Promise<void> {
    if (!this.transport.connected) {
      await this.transport.connect();
    }
    await this.transport.send({ type: 'initialize', payload: config });
    this.state = { phase: 'initializing', running: false };
    this.initialized = true;
    this.emit('ready', config);
  }

  async reset(): Promise<void> {
    if (!this.initialized) throw new Error('UnityBridge is not initialized');
    await this.transport.send({ type: 'reset' });
    this.state = { phase: 'ready', running: false };
    this.emit('reset');
  }

  async pause(): Promise<void> {
    if (!this.initialized) throw new Error('UnityBridge is not initialized');
    await this.transport.send({ type: 'pause' });
    this.state = { phase: 'paused', running: false };
    this.emit('paused');
  }

  async resume(): Promise<void> {
    if (!this.initialized) throw new Error('UnityBridge is not initialized');
    await this.transport.send({ type: 'resume' });
    this.state = { phase: 'running', running: true };
    this.emit('resumed');
  }

  async dispose(): Promise<void> {
    await this.transport.send({ type: 'dispose' });
    await this.transport.disconnect();
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('UnityBridge disposed'));
    }
    this.pending.clear();
    this.initialized = false;
    this.state = { phase: 'disposed', running: false };
    this.emit('disposed');
  }

  async applyActions(playerId: string, actions: BridgeAction[]): Promise<void> {
    if (!this.initialized) throw new Error('UnityBridge is not initialized');
    await this.transport.send({
      type: 'action',
      payload: { playerId, actions },
    });
    this.emit('input', { playerId, actions });
  }

  async observe(playerId: string): Promise<BridgeObservation> {
    if (!this.initialized) throw new Error('UnityBridge is not initialized');
    const id = this.nextId();
    const data = await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`UnityBridge observe timed out for ${playerId}`));
      }, this.captureTimeoutMs);
      this.pending.set(id, { resolve, reject, timeout });
      void this.transport.send({ type: 'capture', id, payload: { playerId } });
    });
    return { timestamp: Date.now(), data };
  }

  async getState(): Promise<BridgeGameState> {
    return { ...this.state };
  }
}
