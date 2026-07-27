import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { mkdirSync } from 'fs';
import { ConsoleLogger, InProcessEventBus, Container } from '@ai-game-arena/core';
import { PluginManager } from '@ai-game-arena/plugin-manager';
import { Runtime } from '@ai-game-arena/runtime';
import { SqliteStorage } from '@ai-game-arena/storage';
import { createApiRoutes } from './routes/api';
import { createBattleRoutes } from './routes/battles';
import { createAgentRoutes } from './routes/agents';
import { createPluginRoutes } from './routes/plugins';
import { BattleWebSocketServer } from './ws/battle-ws';

export interface ServerConfig {
  port: number;
  host: string;
  dataDir: string;
}

export async function createServer(config: ServerConfig) {
  const app = new Hono();

  app.use('*', cors());
  app.use('*', logger());

  // Core services
  const log = new ConsoleLogger('info', { component: 'server' });
  const eventBus = new InProcessEventBus();
  mkdirSync(config.dataDir, { recursive: true });
  const storage = new SqliteStorage(`${config.dataDir}/arena.db`);
  const container = new Container();

  container.register('storage', storage);
  container.register('eventBus', eventBus);
  container.register('logger', log);

  // WebSocket server
  const wsServer = new BattleWebSocketServer(eventBus);
  container.register('wsServer', wsServer);

  // Plugin manager
  const projectRoot = new URL('../../..', import.meta.url).pathname;
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

  // Routes
  app.route('/api', createApiRoutes(container));
  app.route('/api/battles', createBattleRoutes(container));
  app.route('/api/agents', createAgentRoutes(container));
  app.route('/api/plugins', createPluginRoutes(container));

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
