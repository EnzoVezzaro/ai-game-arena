import { Hono } from 'hono';
import { Container } from '@ai-game-arena/core';
import { PluginManager } from '@ai-game-arena/plugin-manager';

export function createPluginRoutes(container: Container) {
  const app = new Hono();

  const pluginManager = container.resolve<PluginManager>('pluginManager');

  // List all plugins with detailed info
  app.get('/', (c) => {
    const plugins = pluginManager.getAllPlugins();
    return c.json(
      plugins.map((p) => ({
        id: p.manifest.id,
        name: p.manifest.name,
        version: p.manifest.version,
        category: p.manifest.category,
        description: p.manifest.description,
        author: p.manifest.author,
        activation: p.manifest.activation,
        contributions: p.manifest.contributions,
      })),
    );
  });

  // Get plugin by ID
  app.get('/:id', (c) => {
    const id = c.req.param('id');
    const plugin = pluginManager.getPlugin(id);
    if (!plugin) {
      return c.json({ error: 'Plugin not found' }, 404);
    }
    return c.json({
      id: plugin.manifest.id,
      name: plugin.manifest.name,
      version: plugin.manifest.version,
      category: plugin.manifest.category,
      description: plugin.manifest.description,
      author: plugin.manifest.author,
      activation: plugin.manifest.activation,
      contributions: plugin.manifest.contributions,
    });
  });

  return app;
}
