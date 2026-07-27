import { Hono } from 'hono';
import { Container } from '@ai-game-arena/core';
import { Runtime } from '@ai-game-arena/runtime';
import type { AgentConfig, BattleConfig } from '@ai-game-arena/sdk';

export function createBattleRoutes(container: Container) {
  const app = new Hono();

  const runtime = container.resolve<Runtime>('runtime');

  // Create a new battle
  app.post('/', async (c) => {
    const { arenaId, agents, config } = await c.req.json<{
      arenaId: string;
      agents: AgentConfig[];
      config?: Partial<BattleConfig>;
    }>();
    const battle = await runtime.createBattle(arenaId, agents, config);
    return c.json(
      {
        id: battle.id,
        arenaId: battle.arenaId,
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

  return app;
}
