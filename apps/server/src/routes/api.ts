import { Hono } from 'hono';
import { Container } from '@ai-game-arena/kernel';
import { PluginManager } from '@ai-game-arena/plugin-manager';
import { Runtime } from '@ai-game-arena/battle-runtime';

export function createApiRoutes(container: Container) {
  const app = new Hono();

  const pluginManager = container.resolve<PluginManager>('pluginManager');
  const runtime = container.resolve<Runtime>('runtime');

  // List all loaded plugins
  app.get('/plugins', (c) => {
    const plugins = pluginManager.getAllPlugins();
    return c.json(
      plugins.map((p) => ({
        id: p.manifest.id,
        name: p.manifest.name,
        version: p.manifest.version,
        category: p.manifest.category,
      })),
    );
  });

  // List all battles
  app.get('/battles', (c) => {
    const battles = runtime.getAllBattles();
    return c.json(
      battles.map((b) => ({
        id: b.id,
        arenaId: b.arenaId,
        agents: b.agents.map((a) => ({ id: a.id, name: a.name })),
        state: b.state,
        createdAt: b.createdAt,
      })),
    );
  });

  // Get health
  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      version: '0.1.0',
      uptime: process.uptime(),
    });
  });

  return app;
}
