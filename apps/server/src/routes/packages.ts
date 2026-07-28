import { Hono } from 'hono';
import type { PackagesManager } from '@ai-game-arena/packages-manager';

export function createPackagesRoutes(packagesManager: PackagesManager) {
  const app = new Hono();

  app.get('/', async (c) => {
    const packages = await packagesManager.list();
    return c.json(packages);
  });

  return app;
}
