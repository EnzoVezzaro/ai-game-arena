import { Hono } from 'hono';
import { Container } from '@ai-game-arena/kernel';
import { SqliteStorage } from '@ai-game-arena/storage';

export function createAgentRoutes(container: Container) {
  const app = new Hono();

  const storage = container.resolve<SqliteStorage>('storage');

  // List all agents
  app.get('/', async (c) => {
    const agents = await storage.all<{ id: string; name: string; config: string }>(
      'SELECT * FROM agents ORDER BY name',
    );
    const blockedMap = new Map<string, { error: string; turn: number }>();
    const blockedResults = await Promise.all(
      agents.map((a) =>
        storage.getOne<{ value: string }>(
          'SELECT value FROM kv_store WHERE key = ?',
          [`agent-blocked:${a.id}`],
        ),
      ),
    );
    for (let i = 0; i < agents.length; i++) {
      if (blockedResults[i]) {
        blockedMap.set(agents[i]!.id, JSON.parse(blockedResults[i]!.value));
      }
    }
    return c.json(
      agents.map((a) => ({
        ...a,
        config: JSON.parse(a.config),
        blocked: blockedMap.get(a.id) ?? null,
      })),
    );
  });

  // Create an agent
  app.post('/', async (c) => {
    const { name, config } = await c.req.json<{ name: string; config: Record<string, unknown> }>();
    const id = `agent-${Date.now()}`;
    await storage.run('INSERT INTO agents (id, name, config, created_at) VALUES (?, ?, ?, ?)', [
      id,
      name,
      JSON.stringify(config),
      Date.now(),
    ]);
    return c.json({ id, name, config }, 201);
  });

  // Get agent by ID
  app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const agent = await storage.getOne<{ id: string; name: string; config: string }>(
      'SELECT * FROM agents WHERE id = ?',
      [id],
    );
    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }
    const blocked = await storage.getOne<{ value: string }>(
      'SELECT value FROM kv_store WHERE key = ?',
      [`agent-blocked:${id}`],
    );
    return c.json({
      ...agent,
      config: JSON.parse(agent.config),
      blocked: blocked ? JSON.parse(blocked.value) : null,
    });
  });

  return app;
}
