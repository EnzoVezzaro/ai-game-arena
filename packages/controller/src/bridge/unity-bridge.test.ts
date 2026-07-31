import { describe, it, expect } from 'bun:test';
import { UnityBridge } from './unity-bridge';
import type { BridgeTransport, BridgeTransportMessage } from './unity-bridge';
import type { BridgeEvent } from '@ai-game-arena/sdk';

class FakeTransport implements BridgeTransport {
  connected = false;
  sent: BridgeTransportMessage[] = [];
  private handlers: Array<(message: BridgeTransportMessage) => void> = [];

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async send(message: BridgeTransportMessage): Promise<void> {
    this.sent.push(message);
  }

  onMessage(handler: (message: BridgeTransportMessage) => void): void {
    this.handlers.push(handler);
  }

  simulate(message: BridgeTransportMessage): void {
    for (const handler of this.handlers) {
      handler(message);
    }
  }
}

describe('UnityBridge (GAME_ENGINE.md)', () => {
  it('connects over an arbitrary transport and initializes', async () => {
    const transport = new FakeTransport();
    const bridge = new UnityBridge({ transport });
    const events: BridgeEvent[] = [];
    bridge.onEvent((event) => events.push(event));

    await bridge.initialize({ id: 'unity-game', seed: 1 });

    expect(transport.connected).toBe(true);
    expect(transport.sent[0]).toMatchObject({ type: 'initialize', payload: { id: 'unity-game' } });
    expect(events.map((e) => e.type)).toContain('ready');
  });

  it('sends abstract actions to the Unity input system', async () => {
    const transport = new FakeTransport();
    const bridge = new UnityBridge({ transport });
    await bridge.initialize({ id: 'unity-game' });

    await bridge.applyActions('p1', [{ type: 'keyboard.press', payload: { key: 'W' } }]);

    const actionMessage = transport.sent.find((m) => m.type === 'action');
    expect(actionMessage?.payload).toEqual({
      playerId: 'p1',
      actions: [{ type: 'keyboard.press', payload: { key: 'W' } }],
    });
  });

  it('captures observations over the transport', async () => {
    const transport = new FakeTransport();
    const bridge = new UnityBridge({ transport });
    await bridge.initialize({ id: 'unity-game' });

    const promise = bridge.observe('p1');
    const capture = transport.sent.find((m) => m.type === 'capture')!;
    transport.simulate({ type: 'capture-result', id: capture.id, payload: { health: 100 } });
    const observation = await promise;

    expect(observation.data).toEqual({ health: 100 });
    expect(observation.timestamp).toBeGreaterThan(0);
  });

  it('tracks game state from transport messages', async () => {
    const transport = new FakeTransport();
    const bridge = new UnityBridge({ transport });
    await bridge.initialize({ id: 'unity-game' });

    transport.simulate({ type: 'state', payload: { phase: 'playing', running: true } });
    expect(await bridge.getState()).toEqual({ phase: 'playing', running: true });
  });

  it('forwards custom events from the game', async () => {
    const transport = new FakeTransport();
    const bridge = new UnityBridge({ transport });
    const events: BridgeEvent[] = [];
    bridge.onEvent((event) => events.push(event));
    await bridge.initialize({ id: 'unity-game' });

    transport.simulate({ type: 'event', payload: { type: 'goal', data: { player: 'p1' } } });

    expect(events.map((e) => e.type)).toContain('goal');
    expect(events.at(-1)?.data).toEqual({ player: 'p1' });
  });

  it('supports the full lifecycle over the transport', async () => {
    const transport = new FakeTransport();
    const bridge = new UnityBridge({ transport });
    const events: BridgeEvent[] = [];
    bridge.onEvent((event) => events.push(event));
    await bridge.initialize({ id: 'unity-game' });

    await bridge.pause();
    await bridge.resume();
    await bridge.reset();
    await bridge.dispose();

    expect(transport.sent.map((m) => m.type)).toEqual([
      'initialize',
      'pause',
      'resume',
      'reset',
      'dispose',
    ]);
    expect(events.map((e) => e.type)).toContain('paused');
    expect(events.map((e) => e.type)).toContain('resumed');
    expect(events.map((e) => e.type)).toContain('reset');
    expect(events.map((e) => e.type)).toContain('disposed');
    expect(transport.connected).toBe(false);
  });
});
