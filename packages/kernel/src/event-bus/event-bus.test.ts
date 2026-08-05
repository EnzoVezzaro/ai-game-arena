import { describe, it, expect } from 'bun:test';
import { InProcessEventBus } from './event-bus';

describe('InProcessEventBus (hexagonal unit test)', () => {
  it('delivers published events to subscribers', async () => {
    const bus = new InProcessEventBus();
    const received: unknown[] = [];

    await bus.subscribe('BattleStarted', async (e) => {
      received.push(e);
    });

    await bus.publish({
      type: 'BattleStarted',
      aggregateId: 'b1',
      timestamp: new Date(),
      payload: { foo: 'bar' },
      metadata: { correlationId: 'b1', version: 1 },
    });

    expect(received).toHaveLength(1);
  });

  it('supports subscribeAll for multiple event types', async () => {
    const bus = new InProcessEventBus();
    const received: string[] = [];

    await bus.subscribeAll([
      { eventType: 'BattleStarted', handler: async (e) => received.push(e.type) },
      { eventType: 'BattleFinished', handler: async (e) => received.push(e.type) },
    ]);

    await bus.publish({
      type: 'BattleStarted',
      aggregateId: 'b1',
      timestamp: new Date(),
      payload: {},
      metadata: { version: 1 },
    });
    await bus.publish({
      type: 'BattleFinished',
      aggregateId: 'b1',
      timestamp: new Date(),
      payload: {},
      metadata: { version: 1 },
    });

    expect(received).toEqual(['BattleStarted', 'BattleFinished']);
  });

  it('unsubscribe removes a handler', async () => {
    const bus = new InProcessEventBus();
    let count = 0;
    const handler = async () => {
      count++;
    };

    const sub = await bus.subscribe('TurnStarted', handler);
    await bus.publish({
      type: 'TurnStarted',
      aggregateId: 'b1',
      timestamp: new Date(),
      payload: {},
      metadata: { version: 1 },
    });
    await bus.unsubscribe(sub);
    await bus.publish({
      type: 'TurnStarted',
      aggregateId: 'b1',
      timestamp: new Date(),
      payload: {},
      metadata: { version: 1 },
    });

    expect(count).toBe(1);
  });
});
