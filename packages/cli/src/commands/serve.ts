import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ConsoleLogger, InProcessEventBus } from '@ai-game-arena/core';
import { PluginManager } from '@ai-game-arena/plugin-manager';
import { Runtime } from '@ai-game-arena/runtime';
import { SqliteStorage } from '@ai-game-arena/storage';
import { parseArgs } from '../utils/args';

export async function serveCommand(rawArgs: string[]) {
  const args = parseArgs(rawArgs);
  const port = parseInt((args.port as string) || '3000');
  const host = (args.host as string) || 'localhost';
  const dataDir = (args['data-dir'] as string) || './data';

  console.log(`🎮 Starting AI Game Arena server...`);
  console.log(`   Port: ${port}`);
  console.log(`   Host: ${host}`);
  console.log(`   Data: ${dataDir}`);
  console.log();

  // Core services
  const logger = new ConsoleLogger('info', { component: 'server' });
  const eventBus = new InProcessEventBus();
  const storage = new SqliteStorage(`${dataDir}/arena.db`);

  // Plugin manager
  const projectRoot = new URL('../../..', import.meta.url).pathname;
  const pluginManager = new PluginManager({
    pluginDirs: [`${projectRoot}/plugins`, `${projectRoot}/games`],
    logger,
    eventBus,
    storage,
  });

  // Runtime
  const runtime = new Runtime({ logger, eventBus, storage });

  // Load plugins
  try {
    await pluginManager.loadAll();
    logger.info('Plugins loaded', { component: 'server' });
  } catch (error) {
    logger.warn('No plugins found', { component: 'server' }, error as Error);
  }

  // Create Hono app
  const app = new Hono();
  app.use('*', cors());

  // Health
  app.get('/health', (c) => c.json({ status: 'ok' }));

  // Plugins
  app.get('/api/plugins', (c) => {
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

  // Battles
  app.get('/api/battles', (c) => {
    const battles = runtime.getAllBattles();
    return c.json(
      battles.map((b) => ({
        id: b.id,
        arenaId: b.arenaId,
        state: b.state,
      })),
    );
  });

  app.post('/api/battles', async (c) => {
    const { arenaId, agents, config } = await c.req.json();
    const battle = await runtime.createBattle(arenaId, agents, config);
    return c.json(battle, 201);
  });

  app.post('/api/battles/:id/start', async (c) => {
    await runtime.startBattle(c.req.param('id'));
    return c.json({ status: 'started' });
  });

  // Start server
  Bun.serve({ fetch: app.fetch, port, hostname: host });
  console.log(`✅ Server running at http://${host}:${port}`);
}
