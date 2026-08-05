import { describe, it, expect } from 'bun:test';
import { InProcessEventBus } from '@ai-game-arena/kernel';
import { SqliteStorage } from '@ai-game-arena/storage';
import { Scoreboard } from './scoreboard';
import type { StorageAdapter } from '@ai-game-arena/sdk';

const noop = () => {};
const logger = {
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop,
  child: () => logger,
};

function makeEnv() {
  const bus = new InProcessEventBus();
  const storage = new SqliteStorage(':memory:') as StorageAdapter;
  const scoreboard = new Scoreboard({ logger: logger as never, eventBus: bus, storage });
  return { bus, storage, scoreboard };
}

function scoreUpdated(battleId: string, agentId: string, score: number, delta: number) {
  return {
    type: 'ScoreUpdated',
    aggregateId: battleId,
    timestamp: new Date(),
    payload: { agentId, score, delta },
    metadata: { correlationId: battleId, version: 1 },
  } as never;
}

function battleFinished(battleId: string, winner: string, scores: Record<string, number>) {
  return {
    type: 'BattleFinished',
    aggregateId: battleId,
    timestamp: new Date(),
    payload: { winner, reason: 'Match completed', scores },
    metadata: { correlationId: battleId, version: 1 },
  } as never;
}

describe('Scoreboard (core package)', () => {
  it('returns an empty live board for battles with no scores yet', async () => {
    const env = makeEnv();
    const board = await env.scoreboard.getBattleScores('nope');
    expect(board).toEqual({ battleId: 'nope', status: 'live', scores: [] });
  });

  it('records scores during a battle and finalizes at BattleFinished', async () => {
    const env = makeEnv();
    await env.bus.publish(scoreUpdated('b1', 'a1', 100, 100));
    await env.bus.publish(scoreUpdated('b1', 'a2', 65, 65));
    await env.bus.publish(battleFinished('b1', 'a1', { a1: 100, a2: 65 }));

    const board = await env.scoreboard.getBattleScores('b1');
    expect(board.status).toBe('finished');
    expect(board.winner).toBe('a1');
    expect(board.scores).toEqual([
      { agentId: 'a1', score: 100, winner: true },
      { agentId: 'a2', score: 65, winner: false },
    ]);
  });

  it('falls back to ScoreUpdated history when BattleFinished has no scores', async () => {
    const env = makeEnv();
    await env.bus.publish(scoreUpdated('b1', 'a1', 90, 90));
    await env.bus.publish(scoreUpdated('b1', 'a2', 30, 30));
    await env.bus.publish({
      type: 'BattleFinished',
      aggregateId: 'b1',
      timestamp: new Date(),
      payload: { winner: 'a1', reason: 'Match completed' },
      metadata: { correlationId: 'b1', version: 1 },
    } as never);

    const board = await env.scoreboard.getBattleScores('b1');
    expect(board.status).toBe('finished');
    expect(board.scores).toEqual([
      { agentId: 'a1', score: 90, winner: true },
      { agentId: 'a2', score: 30, winner: false },
    ]);
  });

  it('rolls scores up into the leaderboard', async () => {
    const env = makeEnv();
    await env.bus.publish(battleFinished('b1', 'a1', { a1: 100, a2: 40 }));
    await env.bus.publish(battleFinished('b2', 'a2', { a1: 55, a2: 120 }));

    const rows = await env.scoreboard.getLeaderboard();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ agentId: 'a2', battles: 2, wins: 1, totalScore: 160 });
    expect(rows[1]).toMatchObject({ agentId: 'a1', battles: 2, wins: 1, totalScore: 155 });
  });

  it('publishes a BattleScored event after finalizing', async () => {
    const env = makeEnv();
    const scored: Array<{ type: string; payload?: Record<string, unknown> }> = [];
    env.bus.subscribe('BattleScored' as never, async (e) => {
      scored.push({ type: e.type, payload: e.payload as Record<string, unknown> });
    });

    await env.bus.publish(battleFinished('b1', 'a1', { a1: 100, a2: 65 }));

    expect(scored).toHaveLength(1);
    expect(scored[0]?.payload).toEqual({
      battleId: 'b1',
      winner: 'a1',
      scores: { a1: 100, a2: 65 },
    });
  });

  it('persists through the storage adapter and survives a new instance', async () => {
    const env = makeEnv();
    await env.bus.publish(battleFinished('b1', 'a1', { a1: 80, a2: 20 }));

    // A fresh Scoreboard over the same storage sees the leaderboard.
    const bus2 = new InProcessEventBus();
    const scoreboard2 = new Scoreboard({
      logger: logger as never,
      eventBus: bus2,
      storage: env.storage,
    });
    const rows = await scoreboard2.getLeaderboard();
    expect(rows[0]).toMatchObject({ agentId: 'a1', totalScore: 80, wins: 1 });
    await scoreboard2.shutdown();
  });
});
