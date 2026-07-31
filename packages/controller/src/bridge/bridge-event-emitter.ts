import type { BridgeEvent } from '@ai-game-arena/sdk';

/**
 * Shared event plumbing for Bridge implementations (GAME_ENGINE.md).
 *
 * Bridges emit events instead of exposing internal implementation. The engine
 * simply forwards them. Standard events: ready, started, paused, resumed,
 * reset, disposed, error. Custom events (goal, checkpoint, coin, death,
 * respawn, ...) are allowed and forwarded as-is.
 */
export abstract class BridgeEventEmitter {
  private handlers: Array<(event: BridgeEvent) => void> = [];
  private emitted: BridgeEvent[] = [];

  onEvent(handler: (event: BridgeEvent) => void): void {
    this.handlers.push(handler);
  }

  protected emit(type: string, data?: unknown): void {
    const event: BridgeEvent = { type, timestamp: Date.now(), data };
    this.emitted.push(event);
    for (const handler of [...this.handlers]) {
      handler(event);
    }
  }

  /** Emitted events so far (used by tests and the engine). */
  getEmittedEvents(): BridgeEvent[] {
    return [...this.emitted];
  }

  clearEvents(): void {
    this.emitted = [];
  }
}
