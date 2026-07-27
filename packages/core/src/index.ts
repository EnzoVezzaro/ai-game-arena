// Core Runtime Kernel
// Provides: DI, Event Bus, Lifecycle, Config, Logging

export { Container } from './di/container';
export type { ServiceIdentifier } from './di/container';

export { InProcessEventBus } from './event-bus/event-bus';

export { ConsoleLogger } from './logging/logger';

export { Config } from './config/config';

export { LifecycleManager } from './lifecycle/lifecycle';
export type { LifecycleHook, LifecyclePhase, HealthStatus } from './lifecycle/lifecycle';

export { Tokens } from './tokens';
export { createContainer } from './composition';
export type { CompositionConfig } from './composition';
