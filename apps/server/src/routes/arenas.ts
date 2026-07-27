import { Hono } from 'hono';
import { Container } from '@ai-game-arena/core';
import { Runtime } from '@ai-game-arena/runtime';

export function createArenasRoutes(container: Container) {
  const app = new Hono();

  const runtime = container.resolve<Runtime>('runtime');

  app.get('/', (c) => {
    const arenas = runtime.getArenas();
    return c.json(
      arenas.map((arena) => ({
        id: arena.config.id,
        name: arena.config.name,
        description: arena.config.description,
        minPlayers: arena.config.minPlayers,
        maxPlayers: arena.config.maxPlayers,
      })),
    );
  });

  app.get('/:id', (c) => {
    const id = c.req.param('id');
    const arena = runtime.getArena(id);
    if (!arena) {
      return c.json({ error: 'Arena not found' }, 404);
    }
    return c.json({
      id: arena.config.id,
      name: arena.config.name,
      description: arena.config.description,
      minPlayers: arena.config.minPlayers,
      maxPlayers: arena.config.maxPlayers,
      config: arena.config,
    });
  });

  return app;
}