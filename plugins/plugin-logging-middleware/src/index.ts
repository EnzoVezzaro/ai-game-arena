import type { PluginContext } from '@ai-game-arena/sdk';

export async function activate(ctx: PluginContext): Promise<void> {
  ctx.registerServerMiddleware({
    name: 'structured-logger',
    priority: 10,
    async handle(c, next) {
      const start = Date.now();
      const path = c.req?.url ?? c.req?.path ?? String(c.req ?? '');
      await next();
      const duration = Date.now() - start;
      ctx.logger.info(`request ${path} ${duration}ms`, {
        component: 'middleware:logger',
      });
    },
  });
  ctx.logger.info('Logging middleware registered', { component: 'plugin:logging-middleware' });
}

export async function deactivate(): Promise<void> {}