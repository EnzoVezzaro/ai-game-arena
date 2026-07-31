import { describe, it, expect } from 'bun:test';
import { InProcessEventBus } from '@ai-game-arena/core';
import { SqliteStorage } from '@ai-game-arena/storage';
import { Scoreboard } from '@ai-game-arena/scoreboard';
import { activate as activateRewards } from './index';
import type { PluginContext, PluginManifest, ServerRoute, StorageAdapter } from '@ai-game-arena/sdk';

const noop = () => {};
const logger = {
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop,
  child: () => logger,
};

function makeContext(
  manifestId: string,
  bus: InProcessEventBus,
  storage: Map<string, unknown>,
): { ctx: PluginContext; routes: ServerRoute[] } {
  const routes: ServerRoute[] = [];
  const manifest: PluginManifest = {
    id: manifestId,
    name: manifestId,
    description: 'test',
    version: '0.1.0',
    category: 'metric',
    engines: { aga: '^0.1.0' },
    entry: './dist/index.js',
    activation: { startup: true },
    dependencies: {},
    permissions: [],
    contributions: {},
  };
  const ctx: PluginContext = {
    manifest,
    logger: logger as never,
    config: {
      get: () => undefined,
      getOrThrow: (key: string) => {
        throw new Error(`Config key "${key}" not found`);
      },
      has: () => false,
      getAll: () => ({}),
    },
    storage: {
      namespace: manifestId,
      async get<T>(key: string) {
        return (storage.get(`${manifestId}:${key}`) as T | undefined) ?? null;
      },
      async set<T>(key: string, value: T) {
        storage.set(`${manifestId}:${key}`, value);
      },
      async delete(key: string) {
        storage.delete(`${manifestId}:${key}`);
      },
    },
    eventBus: bus,
    registerMcpTool() {},
    registerEventHandler(hook) {
      for (const eventType of hook.eventTypes) {
        bus.subscribe(eventType as never, hook.handler as never);
      }
    },
    registerUiPanel() {},
    registerServerRoute(route) {
      routes.push(route);
    },
    registerCliCommand() {},
    registerDashboardWidget() {},
    registerNavigationItem() {},
    registerServerMiddleware() {},
    getAvailableTools: () => [],
    getAvailableArenas: () => [],
  };
  return { ctx, routes };
}

function battleScored(battleId: string, winner: string, scores: Record<string, number>) {
  return {
    type: 'BattleScored',
    aggregateId: battleId,
    timestamp: new Date(),
    payload: { battleId, winner, scores },
    metadata: { correlationId: battleId, version: 1 },
  } as never;
}

describe('plugin-rewards', () => {
  it('registers its routes', async () => {
    const bus = new InProcessEventBus();
    const env = makeContext('plugin-rewards', bus, new Map());
    await activateRewards(env.ctx);
    expect(env.routes.map((r) => r.path).sort()).toEqual([
      '/api/rewards/agents/:agentId',
      '/api/rewards/leaderboard',
    ]);
  });

  it('awards achievements from the scoreboard BattleScored event', async () => {
    const bus = new InProcessEventBus();
    const env = makeContext('plugin-rewards', bus, new Map());
    await activateRewards(env.ctx);

    await bus.publish(battleScored('b1', 'a1', { a1: 120, a2: 60 }));

    const agentRoute = env.routes.find((r) => r.path === '/api/rewards/agents/:agentId')!;
    const a1 = (await agentRoute.handler({
      param: (n: string) => (n === 'agentId' ? 'a1' : undefined),
    })) as { agentId: string; achievements: Record<string, number> };
    const a2 = (await agentRoute.handler({
      param: (n: string) => (n === 'agentId' ? 'a2' : undefined),
    })) as { agentId: string; achievements: Record<string, number> };

    expect(a1.agentId).toBe('a1');
    expect(a1.achievements).toEqual({
      'battle-played': 1,
      victory: 1,
      'top-scorer': 1,
      'scored-50': 1,
      century: 1,
    });
    expect(a2.achievements).toEqual({ 'battle-played': 1, 'scored-50': 1 });
  });

  it('connects to the core scoreboard end to end (BattleFinished → BattleScored → achievements)', async () => {
    const bus = new InProcessEventBus();
    const storage = new SqliteStorage(':memory:') as StorageAdapter;

    // The scoreboard core package finalizes battles and emits BattleScored.
    new Scoreboard({ logger: logger as never, eventBus: bus, storage });
    const rewards = makeContext('plugin-rewards', bus, new Map());
    await activateRewards(rewards.ctx);

    await bus.publish({
      type: 'ScoreUpdated',
      aggregateId: 'b1',
      timestamp: new Date(),
      payload: { agentId: 'a1', score: 100, delta: 100 },
      metadata: { correlationId: 'b1', version: 1 },
    } as never);
    await bus.publish({
      type: 'ScoreUpdated',
      aggregateId: 'b1',
      timestamp: new Date(),
      payload: { agentId: 'a2', score: 65, delta: 65 },
      metadata: { correlationId: 'b1', version: 1 },
    } as never);
    await bus.publish({
      type: 'BattleFinished',
      aggregateId: 'b1',
      timestamp: new Date(),
      payload: { winner: 'a1', reason: 'Match completed', scores: { a1: 100, a2: 65 } },
      metadata: { correlationId: 'b1', version: 1 },
    } as never);

    const agentRoute = rewards.routes.find((r) => r.path === '/api/rewards/agents/:agentId')!;
    const a1 = (await agentRoute.handler({
      param: (n: string) => (n === 'agentId' ? 'a1' : undefined),
    })) as { achievements: Record<string, number> };

    expect(a1.achievements.victory).toBe(1);
    expect(a1.achievements.century).toBe(1);
    expect(a1.achievements['battle-played']).toBe(1);
  });

  it('extends the scoreboard leaderboard with achievements via its route', async () => {
    const bus = new InProcessEventBus();
    const env = makeContext('plugin-rewards', bus, new Map());
    await activateRewards(env.ctx);
    await bus.publish(battleScored('b1', 'a1', { a1: 100, a2: 40 }));

    // A stand-in for the core scoreboard route serving its leaderboard.
    const scoreboardServer = Bun.serve({
      port: 0,
      fetch() {
        return Response.json([
          { agentId: 'a1', battles: 1, wins: 1, totalScore: 100, bestScore: 100 },
          { agentId: 'a2', battles: 1, wins: 0, totalScore: 40, bestScore: 40 },
        ]);
      },
    });

    const lbRoute = env.routes.find((r) => r.path === '/api/rewards/leaderboard')!;
    const rows = (await lbRoute.handler({
      url: `http://127.0.0.1:${scoreboardServer.port}/api/rewards/leaderboard`,
    })) as Array<Record<string, unknown>>;

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      agentId: 'a1',
      totalScore: 100,
      achievements: { 'battle-played': 1, victory: 1, 'top-scorer': 1, century: 1 },
    });
    expect(rows[1]).toMatchObject({
      agentId: 'a2',
      achievements: { 'battle-played': 1 },
    });

    scoreboardServer.stop();
  });

  it('returns an empty extended leaderboard when the scoreboard is unreachable', async () => {
    const bus = new InProcessEventBus();
    const env = makeContext('plugin-rewards', bus, new Map());
    await activateRewards(env.ctx);

    const lbRoute = env.routes.find((r) => r.path === '/api/rewards/leaderboard')!;
    const rows = await lbRoute.handler({ url: 'http://127.0.0.1:1/api/rewards/leaderboard' });
    expect(rows).toEqual([]);
  });
});
