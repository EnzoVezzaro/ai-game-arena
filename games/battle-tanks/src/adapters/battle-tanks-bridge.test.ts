import { describe, it, expect } from 'bun:test';
import { BattleTanksBridge } from './battle-tanks-bridge';
import { Controller } from '@ai-game-arena/controller';
import type { BridgeEvent } from '@ai-game-arena/sdk';

describe('BattleTanksBridge (GAME_ENGINE.md)', () => {
  it('is hosted on the html platform with an action vocabulary', () => {
    const bridge = new BattleTanksBridge();
    expect(bridge.platform).toBe('html');
    expect(bridge.capabilities.keyboard).toBe(true);
    expect(bridge.capabilities.mouse).toBe(true);
    expect(bridge.capabilities.structuredState).toBe(true);
  });

  it('initializes a game for the given players', async () => {
    const bridge = new BattleTanksBridge();
    await bridge.initialize({ id: 'battle-tanks', seed: 42, agentIds: ['a', 'b'] });

    const state = await bridge.getState();
    expect(state.phase).toBe('running');
    expect(state.running).toBe(true);

    const observation = await bridge.observe('a');
    const board = observation.data as {
      gridWidth: number;
      tanks: Record<string, { x: number; y: number; health: number; alive: boolean }>;
    };
    expect(board.gridWidth).toBe(8);
    expect(Object.keys(board.tanks)).toEqual(['a', 'b']);
    expect(board.tanks.a!.health).toBe(100);
  });

  it('registers the game tools on a controller', () => {
    const bridge = new BattleTanksBridge();
    const controller = new Controller();
    bridge.registerTools(controller);
    const capabilities = controller.getCapabilities();
    const names = capabilities.map((c) => c.name).sort();
    expect(names).toEqual(['attack', 'move', 'pass', 'scan', 'shield']);
  });

  it('applies a move action to the game and emits events', async () => {
    const bridge = new BattleTanksBridge();
    const events: BridgeEvent[] = [];
    bridge.onEvent((event) => events.push(event));
    await bridge.initialize({ id: 'battle-tanks', seed: 42, agentIds: ['a', 'b'] });

    const before = await bridge.observe('a');
    const beforeBoard = before.data as { tanks: Record<string, { x: number; y: number }> };
    const x = beforeBoard.tanks.a!.x;

    await bridge.applyActions('a', [{ type: 'move', payload: { direction: 'right' } }]);

    const after = await bridge.observe('a');
    const afterBoard = after.data as { tanks: Record<string, { x: number; y: number }> };
    expect(afterBoard.tanks.a!.x).toBe(x + 1);
    expect(events.some((e) => e.type === 'input')).toBe(true);
    expect(events.some((e) => e.type === 'tank_moved')).toBe(true);
  });

  it('translates keyboard.press into game movement', async () => {
    const bridge = new BattleTanksBridge();
    await bridge.initialize({ id: 'battle-tanks', seed: 42, agentIds: ['a', 'b'] });

    const before = await bridge.observe('a');
    const beforeBoard = before.data as { tanks: Record<string, { x: number; y: number }> };
    const x = beforeBoard.tanks.a!.x;

    await bridge.applyActions('a', [{ type: 'keyboard.press', payload: { key: 'D' } }]);

    const after = await bridge.observe('a');
    const afterBoard = after.data as { tanks: Record<string, { x: number; y: number }> };
    expect(afterBoard.tanks.a!.x).toBe(x + 1);
  });

  it('reports the winner when the game is over', async () => {
    const bridge = new BattleTanksBridge();
    const events: BridgeEvent[] = [];
    bridge.onEvent((event) => events.push(event));
    await bridge.initialize({ id: 'battle-tanks', seed: 42, agentIds: ['a', 'b'] });

    const board = (await bridge.observe('b')).data as {
      tanks: Record<string, { x: number; y: number }>;
    };
    const target = board.tanks.a!;

    // Three attacks (35 dmg each) destroy the target tank.
    await bridge.applyActions('b', [
      { type: 'attack', payload: { targetX: target.x, targetY: target.y } },
    ]);
    await bridge.applyActions('b', [
      { type: 'attack', payload: { targetX: target.x, targetY: target.y } },
    ]);
    await bridge.applyActions('b', [
      { type: 'attack', payload: { targetX: target.x, targetY: target.y } },
    ]);

    const state = await bridge.getState();
    expect(state.phase).toBe('finished');
    expect(state.running).toBe(false);
    expect(bridge.getWinner()).toBe('b');
    expect(events.some((e) => e.type === 'game-over')).toBe(true);
  });

  it('exposes scores through the engine convenience method', async () => {
    const bridge = new BattleTanksBridge();
    await bridge.initialize({ id: 'battle-tanks', seed: 42, agentIds: ['a', 'b'] });

    const scores = bridge.getScores();
    expect(scores.a).toBe(100);
    expect(scores.b).toBe(100);
  });

  it('follows the bridge lifecycle', async () => {
    const bridge = new BattleTanksBridge();
    await bridge.initialize({ id: 'battle-tanks', seed: 42, agentIds: ['a', 'b'] });

    await bridge.pause();
    expect((await bridge.getState()).running).toBe(false);

    await bridge.resume();
    expect((await bridge.getState()).running).toBe(true);

    await bridge.reset();
    expect((await bridge.getState()).phase).toBe('running');

    await bridge.dispose();
    expect(await bridge.getState()).toEqual({ phase: 'disposed', running: false });
  });
});
