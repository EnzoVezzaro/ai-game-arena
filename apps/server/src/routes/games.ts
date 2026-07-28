import { Hono } from 'hono';
import type { GamesManager } from '@ai-game-arena/games-manager';

export function createGamesRoutes(gamesManager: GamesManager) {
  const app = new Hono();

  app.get('/', async (c) => {
    const games = await gamesManager.list();
    return c.json(games);
  });

  app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const game = await gamesManager.get(id);
    if (!game) return c.json({ error: 'Game not found' }, 404);
    return c.json(game);
  });

  return app;
}
