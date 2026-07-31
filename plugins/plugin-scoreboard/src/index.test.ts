import { describe, it, expect } from 'bun:test';
import { InProcessEventBus } from '@ai-game-arena/core';
import { activate } from './index';
import type { PluginContext, PluginManifest, ServerRoute } from '@ai-game-arena/sdk';

const noop = () => {};
const logger = {
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop,
  child: () => logger,
};

function createContext(): {
  ctx: PluginContext;
  bus: InProcessEventBus;
  storage: Map<string, unknown>;
  routes: ServerRoute[];
} {
  const bus = new InProcessEventBus();
  const storage = new Map<string, unknown>();
  const routes: ServerRoute[] = [];

  const manifest: PluginManifest = {
    id: 'plugin-scoreboard',
    name: 'Scoreboard',
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
      namespace: manifest.id,
      async get<T>(key: string) {
        return (storage.get(`${manifest.id}:${key}`) as T | undefined) ?? null;
      },
      async set<T>(key: string, value: T) {
        storage.set(`${manifest.id}:${key}`, value);
      },
      async delete(key: string) {
        storage.delete(`${manifest.id}:${key}`);
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

  return { ctx, bus, storage, routes };
}

async function activateTest() {
  const env = createContext();
  await activate(env.ctx);
  return env;
}

function battleFinished(battleId: string, winner: string, scores: Record<string, number>) {
  return {
    type: 'BattleFinished' as const,
    aggregateId: battleId,
    timestamp: new Date(),
    payload: { winner, reason: 'Match completed', scores },
    metadata: { correlationId: battleId, version: 1 },
  };
}

describe('plugin-scoreboard', () => {
  it('registers its server routes', async () => {
    const env = await activateTest();
    const paths = env.routes.map((r) => r.path).sort();
    expect(paths).toEqual([
      '/api/scoreboard/battles/:battleId',
      '/api/scoreboard/leaderboard',
    ]);
  });

  it('records scores during a battle and finalizes at BattleFinished', async () => {
    const env = await activateTest();
    const battleId = 'battle-1';

    await env.bus.publish({
      type: 'ScoreUpdated',
      aggregateId: battleId,
      timestamp: new Date(),
      payload: { agentId: 'a1', score: 100, delta: 100 },
      metadata: { correlationId: battleId, version: 1 },
    } as never);
    await env.bus.publish({
      type: 'ScoreUpdated',
      aggregateId: battleId,
      timestamp: new Date(),
      payload: { agentId: 'a2', score: 65, delta: 65 },
      metadata: { correlationId: battleId, version: 1 },
    } as never);

    await env.bus.publish(battleFinished(battleId, 'a1', { a1: 100, a2: 65 }));

    const boardRoute = env.routes.find(
      (r) => r.path === '/api/scoreboard/battles/:battleId',
    )!;
    const board = (await boardRoute.handler({
      param: (name: string) => (name === 'battleId' ? battleId : undefined),
    })) as {
      status: string;
      winner: string;
      scores: Array<{ agentId: string; score: number; winner?: boolean }>;
    };

    expect(board.status).toBe('finished');
    expect(board.winner).toBe('a1');
    expect(board.scores).toEqual([
      { agentId: 'a1', score: 100, winner: true },
      { agentId: 'a2', score: 65, winner: false },
    ]);
  });

  it('rolls scores up into the leaderboard', async () => {
    const env = await activateTest();
    await env.bus.publish(battleFinished('b1', 'a1', { a1: 100, a2: 40 }));
    await env.bus.publish(battleFinished('b2', 'a2', { a1: 55, a2: 120 }));

    const lbRoute = env.routes.find((r) => r.path === '/api/scoreboard/leaderboard')!;
    const rows = (await lbRoute.handler({})) as Array<{
      agentId: string;
      battles: number;
      wins: number;
      totalScore: number;
    }>;

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ agentId: 'a2', battles: 2, wins: 1, totalScore: 160 });
    expect(rows[1]).toMatchObject({ agentId: 'a1', battles: 2, wins: 1, totalScore: 155 });
  });

  it('returns an empty live board for battles with no scores yet', async () => {
    const env = await activateTest();
    const boardRoute = env.routes.find(
      (r) => r.path === '/api/scoreboard/battles/:battleId',
    )!;
    const board = (await boardRoute.handler({
      param: (name: string) => (name === 'battleId' ? 'nope' : undefined),
    })) as { battleId: string; status: string; scores: unknown[] };
    expect(board).toEqual({ battleId: 'nope', status: 'live', scores: [] });
  });
});
