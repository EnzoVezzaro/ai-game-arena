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

    // The agent-facing observation is a readable, structured description of
    // the game — NOT the render HTML. It tells the agent where it is, the
    // enemies, the rules and the actions available.
    const observation = await bridge.observe('a');
    const view = observation.data as {
      text: string;
      grid: { width: number; height: number };
      turn: number;
      phase: string;
      you: { id: string; x: number; y: number; health: number; alive: boolean };
      tanks: Array<{ id: string; x: number; y: number; health: number; alive: boolean }>;
      availableActions: string[];
    };
    expect(view.grid).toEqual({ width: 8, height: 8 });
    expect(view.you).toMatchObject({ id: 'a', x: 0, y: 0, health: 100, alive: true });
    expect(view.tanks).toHaveLength(1);
    expect(view.tanks[0]).toMatchObject({ id: 'b', x: 7, y: 7, health: 100 });
    expect(view.availableActions).toEqual(['move', 'attack', 'scan', 'shield', 'pass']);
    expect(view.text).toContain('YOUR TANK: you are at (0,0) with 100 HP');
    expect(view.text).toContain('Tank at (7,7)');
    expect(view.text).toContain('ACTIONS AVAILABLE');
    expect(view.text).toContain('BOARD:');
    expect(view.text).toContain('▲ . . . . . . .');
    expect(view.text).toContain('. . . . . . . ◼');

    // The render payload (for spectators/UI) still carries the game's own
    // HTML plus structured units. It is separate from the observation.
    const render = bridge.getRenderState();
    expect(render?.html).toBeTruthy();
    expect((render?.html as string).includes('Battle Tanks')).toBe(true);
    expect((render?.units as Array<{ agent_id: string }>)).toHaveLength(2);
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
    const beforeView = before.data as { you: { x: number } };
    const x = beforeView.you.x;

    await bridge.applyActions('a', [{ type: 'move', payload: { direction: 'right' } }]);

    const after = await bridge.observe('a');
    const afterView = after.data as { you: { x: number } };
    expect(afterView.you.x).toBe(x + 1);
    expect(events.some((e) => e.type === 'input')).toBe(true);
    expect(events.some((e) => e.type === 'tank_moved')).toBe(true);
  });

  it('translates keyboard.press into game movement', async () => {
    const bridge = new BattleTanksBridge();
    await bridge.initialize({ id: 'battle-tanks', seed: 42, agentIds: ['a', 'b'] });

    const before = await bridge.observe('a');
    const beforeView = before.data as { you: { x: number } };
    const x = beforeView.you.x;

    await bridge.applyActions('a', [{ type: 'keyboard.press', payload: { key: 'D' } }]);

    const after = await bridge.observe('a');
    const afterView = after.data as { you: { x: number } };
    expect(afterView.you.x).toBe(x + 1);
  });

  it('reports the winner when the game is over', async () => {
    const bridge = new BattleTanksBridge();
    const events: BridgeEvent[] = [];
    bridge.onEvent((event) => events.push(event));
    await bridge.initialize({ id: 'battle-tanks', seed: 42, agentIds: ['a', 'b'] });

    // Player b observes: enemy tanks (a) are listed in the tanks array.
    const board = (await bridge.observe('b')).data as {
      tanks: Array<{ id: string; x: number; y: number }>;
    };
    const target = board.tanks.find((t) => t.id === 'a')!;

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
