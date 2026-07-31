import { describe, it, expect } from 'bun:test';
import { HTMLBridge } from './html-bridge';
import type { HtmlGameHost } from './html-bridge';
import type { BridgeEvent } from '@ai-game-arena/sdk';

class FakeHost implements HtmlGameHost {
  readonly name = 'fake';
  dispatched: Array<{ type: string; payload: unknown }> = [];
  captures = 0;
  phase = 'running';
  running = true;
  private gameHandler: ((type: string, data?: unknown) => void) | null = null;

  onGameEvent(handler: (type: string, data?: unknown) => void): void {
    this.gameHandler = handler;
  }

  fireGameEvent(type: string, data?: unknown): void {
    this.gameHandler?.(type, data);
  }

  dispatchEvent(type: string, payload: unknown): void {
    this.dispatched.push({ type, payload });
  }

  capture(): unknown {
    this.captures += 1;
    return { frame: this.captures, phase: this.phase };
  }

  getPhase(): string {
    return this.phase;
  }

  isRunning(): boolean {
    return this.running;
  }

  reset(): void {
    this.phase = 'ready';
    this.running = false;
  }

  pause(): void {
    this.phase = 'paused';
    this.running = false;
  }

  resume(): void {
    this.phase = 'running';
    this.running = true;
  }

  dispose(): void {
    this.phase = 'disposed';
    this.running = false;
  }
}

function track(bridge: HTMLBridge): BridgeEvent[] {
  const events: BridgeEvent[] = [];
  bridge.onEvent((event) => events.push(event));
  return events;
}

describe('HTMLBridge (GAME_ENGINE.md)', () => {
  it('exposes the html platform and its capabilities', () => {
    const bridge = new HTMLBridge();
    expect(bridge.platform).toBe('html');
    expect(bridge.capabilities.keyboard).toBe(true);
    expect(bridge.capabilities.mouse).toBe(true);
    expect(bridge.capabilities.screenshot).toBe(true);
  });

  it('cannot be used before attaching a host and initializing', async () => {
    const bridge = new HTMLBridge();
    await expect(bridge.initialize({ id: 'game' })).rejects.toThrow(/without an attached game host/);
    await expect(bridge.observe('p1')).rejects.toThrow(/not initialized/);
    await expect(bridge.applyActions('p1', [{ type: 'x', payload: {} }])).rejects.toThrow(/not initialized/);
  });

  it('initializes, emits ready and reflects host state', async () => {
    const host = new FakeHost();
    const bridge = new HTMLBridge();
    const events = track(bridge);
    bridge.attach(host);

    await bridge.initialize({ id: 'game', seed: 1, agentIds: ['a', 'b'] });

    expect(events.map((e) => e.type)).toContain('ready');
    const state = await bridge.getState();
    expect(state.phase).toBe('running');
    expect(state.running).toBe(true);
  });

  it('applies actions by dispatching DOM events to the host', async () => {
    const host = new FakeHost();
    const bridge = new HTMLBridge();
    const events = track(bridge);
    bridge.attach(host);
    await bridge.initialize({ id: 'game' });

    await bridge.applyActions('p1', [
      { type: 'keyboard.press', payload: { key: 'W' } },
      { type: 'mouse.click', payload: { button: 'left' } },
    ]);

    expect(host.dispatched).toEqual([
      { type: 'keyboard.press', payload: { key: 'W' } },
      { type: 'mouse.click', payload: { button: 'left' } },
    ]);
    expect(events.filter((e) => e.type === 'input')).toHaveLength(2);
  });

  it('observes by collecting from the host', async () => {
    const host = new FakeHost();
    const bridge = new HTMLBridge();
    bridge.attach(host);
    await bridge.initialize({ id: 'game' });

    const observation = await bridge.observe('p1');
    expect(observation.timestamp).toBeGreaterThan(0);
    expect(observation.data).toEqual({ frame: 1, phase: 'running' });
    expect(host.captures).toBe(1);
  });

  it('follows the lifecycle and emits the standard events', async () => {
    const host = new FakeHost();
    const bridge = new HTMLBridge();
    const events = track(bridge);
    bridge.attach(host);
    await bridge.initialize({ id: 'game' });

    await bridge.pause();
    expect((await bridge.getState()).running).toBe(false);
    expect(events.map((e) => e.type)).toContain('paused');

    await bridge.resume();
    expect((await bridge.getState()).running).toBe(true);
    expect(events.map((e) => e.type)).toContain('resumed');

    await bridge.reset();
    expect(events.map((e) => e.type)).toContain('reset');

    await bridge.dispose();
    expect(events.map((e) => e.type)).toContain('disposed');
    expect(bridge.getHost()).toBeNull();
  });

  it('forwards custom game events (goal, death, respawn) to the engine', async () => {
    const host = new FakeHost();
    const bridge = new HTMLBridge();
    const events = track(bridge);
    bridge.attach(host);
    await bridge.initialize({ id: 'game' });

    host.fireGameEvent('goal', { player: 'p1' });
    host.fireGameEvent('death', { player: 'p2' });

    expect(events.map((e) => e.type)).toEqual(['ready', 'goal', 'death']);
    expect(events[1]!.data).toEqual({ player: 'p1' });
  });
});
