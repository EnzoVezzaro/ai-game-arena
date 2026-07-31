import { describe, it, expect, afterEach } from 'bun:test';
import { ReplayManager } from './replayManager';

const fixture = {
  id: 'b1',
  arenaId: 'fun',
  agents: [],
  events: [
    { type: 'TurnStarted', timestamp: 1, payload: { turnNumber: 0 } },
    { type: 'ActionExecuted', timestamp: 2, payload: { agentId: 'a1' } },
    { type: 'ActionExecuted', timestamp: 3, payload: { agentId: 'a2' } },
    { type: 'BattleFinished', timestamp: 4, payload: { winner: 'a1' } },
  ],
  renderStates: [
    { frame: 'start' },
    { frame: 'after-1' },
    { frame: 'after-2' },
    { frame: 'after-3' },
    { frame: 'final' },
  ],
};

describe('ReplayManager (winner screen behavior)', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  async function loaded() {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as never;
    const mgr = new ReplayManager();
    await mgr.load('b1');
    return mgr;
  }

  it('starts at the first event after load', async () => {
    const mgr = await loaded();
    expect(mgr.currentIndex).toBe(0);
    expect(mgr.renderStateAt(0)).toEqual({ frame: 'start' });
  });

  it('jumpToEnd stops at the last move with the final frame and done state', async () => {
    const mgr = await loaded();
    const step = mgr.jumpToEnd();
    expect(step.done).toBe(true);
    expect(mgr.currentIndex).toBe(fixture.events.length);
    expect(mgr.renderStateAt(mgr.currentIndex)).toEqual({ frame: 'final' });
  });

  it('play restarts from the beginning when stopped at the end (no auto-restart)', async () => {
    const mgr = await loaded();
    mgr.jumpToEnd();
    expect(mgr.currentIndex).toBe(fixture.events.length);
    // Not playing after load: the game sits at the last move.
    expect(mgr.isPlaying()).toBe(false);
    // Pressing play restarts the replay from the top.
    mgr.play();
    expect(mgr.currentIndex).toBe(0);
    expect(mgr.isPlaying()).toBe(true);
    mgr.pause();
  });

  it('renderStateAt clamps to the timeline bounds', async () => {
    const mgr = await loaded();
    expect(mgr.renderStateAt(-5)).toEqual({ frame: 'start' });
    expect(mgr.renderStateAt(999)).toEqual({ frame: 'final' });
  });
});
