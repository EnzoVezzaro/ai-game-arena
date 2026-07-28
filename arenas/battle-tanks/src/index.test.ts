import { describe, it, expect } from 'bun:test';
import { BattleTanksArena } from './index';

describe('BattleTanksArena', () => {
  const arena = new BattleTanksArena();

  it('initializes tanks for all agents', () => {
    const state = arena.initialize(42, ['agent-1', 'agent-2']);
    const battleState = state.data as { tanks: Record<string, { health: number; alive: boolean }> };
    expect(Object.keys(battleState.tanks)).toEqual(['agent-1', 'agent-2']);
    expect(battleState.tanks['agent-1']!.health).toBe(100);
    expect(battleState.tanks['agent-1']!.alive).toBe(true);
    expect(battleState.tanks['agent-2']!.health).toBe(100);
    expect(battleState.tanks['agent-2']!.alive).toBe(true);
  });

  it('returns empty map when no agent IDs provided', () => {
    const state = arena.initialize(42);
    const battleState = state.data as { tanks: Record<string, unknown> };
    expect(Object.keys(battleState.tanks)).toHaveLength(0);
  });

  it('does not declare a winner when multiple tanks alive', () => {
    const state = arena.initialize(42, ['a', 'b', 'c']);
    const win = arena.checkWinCondition(state);
    expect(win).toBeNull();
  });

  it('declares winner when one tank alive', () => {
    const state = arena.initialize(42, ['a', 'b']);
    const battleState = state.data as { tanks: Record<string, { health: number; alive: boolean }> };
    battleState.tanks['b']!.alive = false;
    battleState.tanks['b']!.health = 0;
    const win = arena.checkWinCondition(state);
    expect(win).not.toBeNull();
    expect(win!.winner).toBe('a');
  });

  it('reports draw when no tanks alive', () => {
    const state = arena.initialize(42, ['a', 'b']);
    const battleState = state.data as { tanks: Record<string, { health: number; alive: boolean }> };
    battleState.tanks['a']!.alive = false;
    battleState.tanks['a']!.health = 0;
    battleState.tanks['b']!.alive = false;
    battleState.tanks['b']!.health = 0;
    const win = arena.checkWinCondition(state);
    expect(win).not.toBeNull();
    expect(win!.winner).toBe('draw');
  });

  it('move action preserves from position correctly', () => {
    const state = arena.initialize(42, ['agent-1']);
    const battleState = state.data as { tanks: Record<string, { x: number; y: number }> };
    const originalX = battleState.tanks['agent-1']!.x;
    const originalY = battleState.tanks['agent-1']!.y;

    const result = arena.executeAction(
      { agentId: 'agent-1', type: 'move', parameters: { direction: 'right' }, timestamp: Date.now() },
      state,
    );

    expect(result.success).toBe(true);
    expect(result.events[0]!.data['from']).toEqual({ x: originalX, y: originalY });
  });

  it('getTools returns move, attack, scan, shield', () => {
    const tools = arena.getTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain('move');
    expect(names).toContain('attack');
    expect(names).toContain('scan');
    expect(names).toContain('shield');
  });

  it('getTools move is mandatory', () => {
    const tools = arena.getTools();
    const moveTool = tools.find((t) => t.name === 'move');
    expect(moveTool!.mandatory).toBe(true);
  });
});
