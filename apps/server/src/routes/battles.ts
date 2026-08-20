import { Hono } from 'hono';
import { Container } from '@ai-game-arena/kernel';
import { Runtime } from '@ai-game-arena/battle-runtime';
import { SqliteStorage } from '@ai-game-arena/storage';
import type { AgentConfig, BattleConfig } from '@ai-game-arena/sdk';
import { createGameBridge } from '../lib/game-bridge-factory';

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
    // Enrich agent configs from stored agent profiles (provider, apiKey, model, etc.)
    const enriched = await Promise.all(
      agents.map(async (a) => {
        const stored = await storage.getOne<{ id: string; name: string; config: string }>(
          'SELECT * FROM agents WHERE id = ?',
          [a.id],
        );
        if (!stored) return a;
        const full: AgentConfig = {
          ...(JSON.parse(stored.config) as AgentConfig),
          id: a.id,
          name: stored.name,
        };
        return { ...full, strategy: a.strategy ?? full.strategy };
      }),
    );
    let battle;
    try {
      battle = await runtime.createBattle(arenaId, enriched, {
        ...config,
        gameId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith('Arena not found:')) {
        return c.json({ error: msg }, 400);
      }
      throw err;
    }
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
    const renderState = runtime.getBattleRenderState(id);
    return c.json({
      id: battle.id,
      arenaId: battle.arenaId,
      gameId: battle.gameId,
      agents: battle.agents,
      config: battle.config,
      state: battle.state,
      renderState,
      createdAt: battle.createdAt,
      startedAt: battle.startedAt,
      finishedAt: battle.finishedAt,
    });
  });

  // Start a battle
  app.post('/:id/start', async (c) => {
    const id = c.req.param('id');
    setTimeout(() => {
      runtime
        .startBattle(id)
        .catch((err) => console.error(`[battle] start failed for ${id}:`, err));
    }, 0);
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
    const mapped = events.map((e) => ({
      type: e.type,
      timestamp: e.timestamp,
      payload: JSON.parse(e.payload),
      metadata: JSON.parse(e.metadata),
    }));

    // Reconstruct the board timeline from the recorded actions by replaying
    // them through the game's bridge (deterministic). renderStates[i] is the
    // render state after the first i events; index 0 is the initial board.
    // This makes replay show the game actually being played, not the final
    // snapshot.
    const bridge = await createGameBridge(battle.gameId);
    let renderStates: Array<Record<string, unknown> | null> | null = null;
    if (bridge) {
      try {
        await bridge.initialize({
          id: battle.arenaId,
          seed: battle.config.seed,
          agentIds: battle.agents.map((a) => a.id),
        });
        renderStates = [bridge.getRenderState?.() ?? null];
        for (const event of mapped) {
          if (event.type === 'ActionExecuted') {
            const action = (event.payload.action ?? event.payload) as {
              agentId?: string;
              type?: string;
              parameters?: Record<string, unknown>;
            };
            if (action.agentId && action.type) {
              try {
                await bridge.applyActions(action.agentId, [
                  { type: action.type, payload: action.parameters ?? {} },
                ]);
              } catch {
                // A rejected action did not change the board.
              }
            }
          }
          renderStates.push(bridge.getRenderState?.() ?? null);
        }
      } catch {
        renderStates = null;
      }
    }

    return c.json({
      id: battle.id,
      arenaId: battle.arenaId,
      agents: battle.agents,
      events: mapped,
      renderStates,
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
