import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ConsoleLogger, InProcessEventBus } from '@ai-game-arena/kernel';
import { PluginManager } from '@ai-game-arena/plugin-manager';
import { Runtime } from '@ai-game-arena/battle-runtime';
import { SqliteStorage } from '@ai-game-arena/storage';
import { parseArgs } from '../utils/args';
import { GamesManager } from '@ai-game-arena/games-manager';
import { PackagesManager } from '@ai-game-arena/packages-manager';
import { ArenasManager } from '@ai-game-arena/arenas-manager';

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

  // Entity managers
  const projectRoot = new URL('../../..', import.meta.url).pathname;
  const gamesManager = new GamesManager(projectRoot);
  const packagesManager = new PackagesManager(projectRoot);
  const arenasManager = new ArenasManager(projectRoot, logger);

  // Plugin manager — only plugins/
  const pluginManager = new PluginManager({
    pluginDirs: [`${projectRoot}/plugins`],
    logger,
    eventBus,
    storage,
  });

  // Runtime
  const runtime = new Runtime({ logger, eventBus, storage });

  // Load plugins + arenas independently
  try {
    await pluginManager.loadAll();
    logger.info('Plugins loaded', { component: 'server' });

    const arenas = await arenasManager.loadAll();
    for (const arena of arenas) {
      runtime.registerArena(arena.arenaId, arena.instance);
      logger.info(`Registered arena "${arena.arenaId}"`, { component: 'server' });
    }
  } catch (error) {
    logger.warn('Failed to load plugins or arenas', { component: 'server' }, error as Error);
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
        description: p.manifest.description,
      })),
    );
  });

  // Arenas
  app.get('/api/arenas', (c) => {
    const arenas = runtime.getArenas();
    return c.json(
      arenas.map((a) => ({
        id: a.config.id,
        name: a.config.name,
        description: a.config.description,
        minPlayers: a.config.minPlayers,
        maxPlayers: a.config.maxPlayers,
      })),
    );
  });

  // Games
  app.get('/api/games', async (c) => c.json(await gamesManager.list()));

  // Packages
  app.get('/api/packages', async (c) => c.json(await packagesManager.list()));

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
