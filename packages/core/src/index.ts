// Core Runtime Kernel
// Provides: DI, Event Bus, Lifecycle, Config, Logging

export { Container } from './di/container';
export type { ServiceIdentifier } from './di/container';

export { InProcessEventBus } from './event-bus/event-bus';

export { ConsoleLogger } from './logging/logger';

export { Config } from './config/config';

export { LifecycleManager } from './lifecycle/lifecycle';
export type { LifecycleHook, LifecyclePhase, HealthStatus } from './lifecycle/lifecycle';

// Service identifiers
export const Tokens = {
  EventBus: Symbol.for('core.EventBus'),
  Config: Symbol.for('core.Config'),
  Logger: Symbol.for('core.Logger'),
  Storage: Symbol.for('core.Storage'),
  PluginManager: Symbol.for('core.PluginManager'),
  MatchEngine: Symbol.for('core.MatchEngine'),
  AgentRuntime: Symbol.for('core.AgentRuntime'),
  Controller: Symbol.for('core.Controller'),
  Observation: Symbol.for('core.Observation'),
  Runtime: Symbol.for('core.Runtime'),
} as const;
