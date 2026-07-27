import { Hono } from 'hono';
import { Container } from '@ai-game-arena/core';
import { SqliteStorage } from '@ai-game-arena/storage';

export function createProfilesRoutes(container: Container) {
  const app = new Hono();

  const storage = container.resolve<SqliteStorage>('storage');

  app.get('/', async (c) => {
    const profiles = await storage.all<{ id: string; name: string; data: string; created_at: number }>(
      'SELECT * FROM profiles ORDER BY name',
    );
    return c.json(
      profiles.map((p) => ({
        id: p.id,
        name: p.name,
        data: JSON.parse(p.data),
      })),
    );
  });

  app.post('/', async (c) => {
    const { name, data } = await c.req.json<{ name: string; data?: Record<string, unknown> }>();
    const id = `profile-${Date.now()}`;
    await storage.run(
      'INSERT INTO profiles (id, name, data, created_at) VALUES (?, ?, ?, ?)',
      [id, name, JSON.stringify(data ?? {}), Date.now()],
    );
    return c.json({ id, name, data: data ?? {} }, 201);
  });

  app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const profile = await storage.getOne<{ id: string; name: string; data: string }>(
      'SELECT * FROM profiles WHERE id = ?',
      [id],
    );
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }
    return c.json({
      id: profile.id,
      name: profile.name,
      data: JSON.parse(profile.data),
    });
  });

  app.put('/:id', async (c) => {
    const id = c.req.param('id');
    const existing = await storage.getOne<{ id: string; name: string }>('SELECT * FROM profiles WHERE id = ?', [id]);
    if (!existing) {
      return c.json({ error: 'Profile not found' }, 404);
    }
    const { name, data } = await c.req.json<{ name?: string; data?: Record<string, unknown> }>();
    await storage.run(
      'UPDATE profiles SET name = ?, data = ? WHERE id = ?',
      [name ?? existing.name, JSON.stringify(data ?? {}), id],
    );
    return c.json({ id, name: name ?? existing.name, data: data ?? {} });
  });

  app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const existing = await storage.getOne<{ id: string; name: string }>('SELECT * FROM profiles WHERE id = ?', [id]);
    if (!existing) {
      return c.json({ error: 'Profile not found' }, 404);
    }
    await storage.run('DELETE FROM profiles WHERE id = ?', [id]);
    return c.json({ deleted: true });
  });

  return app;
}