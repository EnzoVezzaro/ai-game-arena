import type { PluginContext } from '@ai-game-arena/sdk';

export async function activate(ctx: PluginContext): Promise<void> {
  ctx.registerServerMiddleware({
    name: 'structured-logger',
    priority: 10,
    async handle(c, next) {
      const start = Date.now();
      const method = c.req?.method ?? 'UNKNOWN';
      const path = c.req?.url ?? c.req?.path ?? '';
      await next();
      const duration = Date.now() - start;
      ctx.logger.info(`${method} ${path} ${duration}ms`, {
        component: 'middleware:logger',
        method,
        path,
        duration,
      });
    },
  });
  ctx.logger.info('Logging middleware registered', { component: 'plugin:logging-middleware' });
}

export async function deactivate(): Promise<void> {}