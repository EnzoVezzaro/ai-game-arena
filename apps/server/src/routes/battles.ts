import { Hono } from 'hono';
import { Container } from '@ai-game-arena/core';
import { Runtime } from '@ai-game-arena/runtime';
import { SqliteStorage } from '@ai-game-arena/storage';
import type { AgentConfig, BattleConfig } from '@ai-game-arena/sdk';

export function createBattleRoutes(container: Container) {
  const app = new Hono();

  const runtime = container.resolve<Runtime>('runtime');
  const storage = container.resolve<SqliteStorage>('storage');

  // Create a new battle
  app.post('/', async (c) => {
    const { arenaId, gameId, agents, config } = await c.req.json<{
      arenaId: string;
      gameId?: string;
      agents: AgentConfig[];
      config?: Partial<BattleConfig>;
    }>();
    const battle = await runtime.createBattle(arenaId, agents, {
      ...config,
      gameId,
    });
    return c.json(
      {
        id: battle.id,
        arenaId: battle.arenaId,
        gameId: battle.gameId,
        state: battle.state,
        createdAt: battle.createdAt,
      },
      201,
    );
  });

  // Get battle by ID
  app.get('/:id', (c) => {
    const id = c.req.param('id');
    const battle = runtime.getBattle(id);
    if (!battle) {
      return c.json({ error: 'Battle not found' }, 404);
    }
    return c.json({
      id: battle.id,
      arenaId: battle.arenaId,
      gameId: battle.gameId,
      agents: battle.agents,
      config: battle.config,
      state: battle.state,
      createdAt: battle.createdAt,
      startedAt: battle.startedAt,
      finishedAt: battle.finishedAt,
    });
  });

  // Start a battle
  app.post('/:id/start', async (c) => {
    const id = c.req.param('id');
    await runtime.startBattle(id);
    return c.json({ status: 'started' });
  });

  // Pause a battle
  app.post('/:id/pause', async (c) => {
    const id = c.req.param('id');
    await runtime.pauseBattle(id);
    return c.json({ status: 'paused' });
  });

  // Resume a battle
  app.post('/:id/resume', async (c) => {
    const id = c.req.param('id');
    await runtime.resumeBattle(id);
    return c.json({ status: 'resumed' });
  });

  // Abort a battle
  app.post('/:id/abort', async (c) => {
    const id = c.req.param('id');
    await runtime.abortBattle(id);
    return c.json({ status: 'aborted' });
  });

  app.get('/:id/replay', async (c) => {
    const id = c.req.param('id');
    const battle = runtime.getBattle(id);
    if (!battle) {
      return c.json({ error: 'Battle not found' }, 404);
    }
    const events = await storage.all<{
      type: string;
      timestamp: number;
      payload: string;
      metadata: string;
    }>(
      'SELECT type, timestamp, payload, metadata FROM events WHERE aggregate_id = ? ORDER BY timestamp',
      [id],
    );
    return c.json({
      id: battle.id,
      arenaId: battle.arenaId,
      agents: battle.agents,
      events: events.map((e) => ({
        type: e.type,
        timestamp: e.timestamp,
        payload: JSON.parse(e.payload),
        metadata: JSON.parse(e.metadata),
      })),
    });
  });

  app.get('/:id/events', async (c) => {
    const id = c.req.param('id');
    const battle = runtime.getBattle(id);
    if (!battle) {
      return c.json({ error: 'Battle not found' }, 404);
    }
    const events = await storage.all<{
      type: string;
      timestamp: number;
      payload: string;
      metadata: string;
    }>(
      'SELECT type, timestamp, payload, metadata FROM events WHERE aggregate_id = ? ORDER BY timestamp',
      [id],
    );
    return c.json(
      events.map((e) => ({
        type: e.type,
        timestamp: e.timestamp,
        payload: JSON.parse(e.payload),
        metadata: JSON.parse(e.metadata),
      })),
    );
  });

  return app;
}
