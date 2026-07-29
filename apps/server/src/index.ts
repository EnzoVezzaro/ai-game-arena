import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { createContainer } from '@ai-game-arena/core';
import { Tokens } from '@ai-game-arena/core';
import type { Logger, EventBus } from '@ai-game-arena/sdk';
import { PluginManager } from '@ai-game-arena/plugin-manager';
import { Runtime } from '@ai-game-arena/runtime';
import { ChessHtmlAdapter } from 'chess-arena';
import type { GameAdapter } from '@ai-game-arena/controller';
import { SqliteStorage } from '@ai-game-arena/storage';
import { createApiRoutes } from './routes/api';
import { createBattleRoutes } from './routes/battles';
import { createAgentRoutes } from './routes/agents';
import { createPluginRoutes } from './routes/plugins';
import { createArenasRoutes } from './routes/arenas';
import { createGamesRoutes } from './routes/games';
import { createProfilesRoutes } from './routes/profiles';
import { createModelsRoutes } from './routes/models';
import { createPackagesRoutes } from './routes/packages';
import { createArtifactRoutes } from './routes/artifacts';
import { BattleWebSocketServer } from './ws/battle-ws';
import { GamesManager } from '@ai-game-arena/games-manager';
import { PackagesManager } from '@ai-game-arena/packages-manager';
import { ArenasManager } from '@ai-game-arena/arenas-manager';

const projectRoot = new URL('../../..', import.meta.url).pathname;
const webDistPath = join(projectRoot, 'apps', 'web', 'dist');

export interface ServerConfig {
  port: number;
  host: string;
  dataDir: string;
}

export async function createServer(config: ServerConfig) {
  const app = new Hono();

  app.use('*', cors());
  app.use('*', logger());

  // C.1: Correlation ID middleware (auto-propagate correlation IDs across requests)
  app.use('*', async (c, next) => {
    const correlationId = c.req.header('X-Correlation-ID') ?? randomUUID();
    c.header('X-Correlation-ID', correlationId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).set('correlationId', correlationId);
    await next();
  });

  // C.5: Global error handler (consistent error response shape)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.onError((err: any, c) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const correlationId = (c as any).get('correlationId') as string | undefined;
    const status = err?.status ?? (err instanceof TypeError ? 400 : 500);
    return c.json(
      {
        error: {
          code: err?.code ?? (err instanceof TypeError ? 'bad_request' : 'internal_error'),
          message: err.message,
          details: err?.details,
        },
        correlationId,
      },
      status as any,
    );
  });

  // Core services via composition root
  mkdirSync(config.dataDir, { recursive: true });
  const container = createContainer({ logComponent: 'server', dataDir: config.dataDir });
  const log = container.resolve(Tokens.Logger) as Logger;
  const eventBus = container.resolve(Tokens.EventBus) as EventBus;

  // Storage
  const storage = new SqliteStorage(`${config.dataDir}/arena.db`);
  container.register('storage', storage);

  // WebSocket server
  const wsServer = new BattleWebSocketServer(eventBus);
  container.register('wsServer', wsServer);

  // Entity managers
  const gamesManager = new GamesManager(projectRoot);
  container.register('gamesManager', gamesManager);
  const packagesManager = new PackagesManager(projectRoot);
  container.register('packagesManager', packagesManager);
  const arenasManager = new ArenasManager(projectRoot, log);
  container.register('arenasManager', arenasManager);

  // Plugin manager — only scans plugins/
  const pluginManager = new PluginManager({
    pluginDirs: [`${projectRoot}/plugins`],
    logger: log,
    eventBus,
    storage,
  });
  container.register('pluginManager', pluginManager);

  // Runtime
  const runtime = new Runtime({
    logger: log,
    eventBus,
    storage,
    adapterFactory: (arenaId: string, _agentId: string): GameAdapter | null => {
      if (arenaId === 'chess') return new ChessHtmlAdapter();
      return null;
    },
  });
  container.register('runtime', runtime);

  // Load plugins + arenas independently
  try {
    await pluginManager.loadAll();
    log.info('Plugins loaded', { component: 'server' });

    const arenas = await arenasManager.loadAll();
    for (const arena of arenas) {
      runtime.registerArena(arena.arenaId, arena.instance);
      log.info(`Registered arena "${arena.arenaId}"`, { component: 'server' });
    }

    // Apply plugin-contributed middleware
    const middlewares = pluginManager.getRegisteredServerMiddlewares();
    for (const middleware of middlewares) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      app.use('*', async (c: any, next: any) => {
        await middleware.handle(c, next);
      });
      log.info(`Plugin middleware applied: ${middleware.name} (from ${middleware.pluginId})`, {
        component: 'server',
      });
    }

    // Register any plugin-contributed server routes on the Hono app
    const routes = pluginManager.getRegisteredServerRoutes();
    for (const route of routes) {
      const handler = route.handler as (req: unknown) => Promise<unknown>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wrapped = async (c: any) => {
        try {
          const result = await handler(c.req);
          return c.json(result);
        } catch (err) {
          return c.json({ error: (err as Error).message }, 500);
        }
      };
      const methodName = route.method.toLowerCase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const appAny = app as any;
      if (typeof appAny[methodName] === 'function') {
        appAny[methodName](route.path, wrapped);
        log.info(`Plugin route mounted: ${route.method} ${route.path} (from ${route.pluginId})`, {
          component: 'server',
        });
      }
    }
  } catch (error) {
    log.warn('No plugins found or failed to load', { component: 'server' }, error as Error);
  }

  // Static file serving for web UI
  if (existsSync(webDistPath)) {
    app.use('*', async (c, next) => {
      const url = new URL(c.req.url);
      const pathname = url.pathname;

      if (pathname === '/' || pathname === '') {
        const htmlPath = join(webDistPath, 'index.html');
        if (existsSync(htmlPath)) {
          return c.html(readFileSync(htmlPath, 'utf-8'));
        }
      }

      const filePath = join(webDistPath, pathname.replace(/^\//, ''));
      if (existsSync(filePath)) {
        const ext = pathname.split('.').pop()?.toLowerCase();
        const contentType =
          ext === '.js'
            ? 'application/javascript'
            : ext === '.css'
              ? 'text/css'
              : ext === '.html'
                ? 'text/html'
                : ext === '.json'
                  ? 'application/json'
                  : ext === '.svg'
                    ? 'image/svg+xml'
                    : 'application/octet-stream';
        return new Response(readFileSync(filePath), {
          headers: { 'Content-Type': contentType },
        });
      }

      await next();
      return c.res;
    });
  }

  // Routes (C.6: API versioned under /api/v1/)
  app.route('/api/v1', createApiRoutes(container));
  app.route('/api/v1/battles', createBattleRoutes(container));
  app.route('/api/v1/agents', createAgentRoutes(container));
  app.route('/api/v1/plugins', createPluginRoutes(container));
  app.route('/api/v1/arenas', createArenasRoutes(container, projectRoot));
  app.route('/api/v1/games', createGamesRoutes(gamesManager));
  app.route('/api/v1/profiles', createProfilesRoutes(container));
  app.route('/api/v1/models', createModelsRoutes());
  app.route('/api/v1/packages', createPackagesRoutes(packagesManager));
  app.route('/api/v1/artifacts', createArtifactRoutes(container, projectRoot));

  // Unversioned aliases for frontend compatibility
  app.route('/api', createApiRoutes(container));
  app.route('/api/battles', createBattleRoutes(container));
  app.route('/api/agents', createAgentRoutes(container));
  app.route('/api/plugins', createPluginRoutes(container));
  app.route('/api/arenas', createArenasRoutes(container, projectRoot));
  app.route('/api/games', createGamesRoutes(gamesManager));
  app.route('/api/profiles', createProfilesRoutes(container));
  app.route('/api/models', createModelsRoutes());
  app.route('/api/packages', createPackagesRoutes(packagesManager));
  app.route('/api/artifacts', createArtifactRoutes(container, projectRoot));

  // C.2: Deep health check (server uptime, db, plugin system)
  app.get('/health', async (c) => {
    const checks: Record<string, { ok: boolean; detail?: string }> = {};
    // DB check
    try {
      await storage.get('__healthcheck__');
      checks.database = { ok: true };
    } catch (err) {
      checks.database = { ok: false, detail: (err as Error).message };
    }
    // Plugin system check
    try {
      const plugins = pluginManager.getAllPlugins();
      checks.plugins = { ok: true, detail: `${plugins.length} plugin(s) loaded` };
    } catch (err) {
      checks.plugins = { ok: false, detail: (err as Error).message };
    }
    // Runtime check
    try {
      const battles = runtime.getAllBattles();
      checks.runtime = { ok: true, detail: `${battles.length} battle(s) tracked` };
    } catch (err) {
      checks.runtime = { ok: false, detail: (err as Error).message };
    }
    const healthy = Object.values(checks).every((c) => c.ok);
    return c.json(
      {
        status: healthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks,
      },
      healthy ? 200 : 503,
    );
  });

  return { app, wsServer };
}

export async function startServer() {
  const config: ServerConfig = {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || 'localhost',
    dataDir: process.env.DATA_DIR || './data',
  };

  const { app, wsServer } = await createServer(config);

  console.log(`🎮 AI Game Arena server starting on http://${config.host}:${config.port}`);

  Bun.serve<{ clientId: string }>({
    fetch: (req, server) => {
      const url = new URL(req.url);

      if (url.pathname === '/ws/battles') {
        const upgraded = server.upgrade(req, {
          data: { clientId: `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
        });
        if (upgraded) {
          return undefined;
        }
      }

      return app.fetch(req);
    },
    websocket: {
      open: (ws) => {
        wsServer.onOpen(ws, ws.data.clientId);
      },
      message: (ws, message) => {
        wsServer.onMessage(ws, message.toString(), ws.data.clientId);
      },
      close: (ws) => {
        wsServer.onClose(ws, ws.data.clientId);
      },
    },
    port: config.port,
    hostname: config.host,
  });
}

if (import.meta.main) {
  startServer();
}
