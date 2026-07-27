import { Container } from './di/container';
import { InProcessEventBus } from './event-bus/event-bus';
import { ConsoleLogger } from './logging/logger';
import { Config } from './config/config';
import { Tokens } from './tokens';

export interface CompositionConfig {
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  logComponent?: string;
  dataDir?: string;
}

export function createContainer(config: CompositionConfig = {}): Container {
  const container = new Container();

  const log = new ConsoleLogger(config.logLevel ?? 'info', {
    component: config.logComponent ?? 'core',
  });

  const eventBus = new InProcessEventBus();
  const cfg = new Config({
    logLevel: config.logLevel ?? 'info',
    dataDir: config.dataDir ?? './data',
  });

  container.register(Tokens.Logger, log);
  container.register(Tokens.EventBus, eventBus);
  container.register(Tokens.Config, cfg);

  return container;
}