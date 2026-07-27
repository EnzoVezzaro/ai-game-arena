import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createContainer } from '@ai-game-arena/core';
import { Tokens } from '@ai-game-arena/core';
import type { Logger, EventBus } from '@ai-game-arena/sdk';
import { PluginManager } from '@ai-game-arena/plugin-manager';
import { Runtime } from '@ai-game-arena/runtime';
import { SqliteStorage } from '@ai-game-arena/storage';
import { createApiRoutes } from './routes/api';
import { createBattleRoutes } from './routes/battles';
import { createAgentRoutes } from './routes/agents';
import { createPluginRoutes } from './routes/plugins';
import { createArenasRoutes } from './routes/arenas';
import { createProfilesRoutes } from './routes/profiles';
import { BattleWebSocketServer } from './ws/battle-ws';

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

  // Plugin manager
  const pluginManager = new PluginManager({
    pluginDirs: [
      `${projectRoot}/plugins`,
      `${projectRoot}/games`,
    ],
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
  });
  container.register('runtime', runtime);

  // Load plugins
  try {
    await pluginManager.loadAll();
    log.info('Plugins loaded', { component: 'server' });
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

  // Routes
  app.route('/api', createApiRoutes(container));
  app.route('/api/battles', createBattleRoutes(container));
  app.route('/api/agents', createAgentRoutes(container));
  app.route('/api/plugins', createPluginRoutes(container));
  app.route('/api/arenas', createArenasRoutes(container));
  app.route('/api/profiles', createProfilesRoutes(container));

  app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
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
