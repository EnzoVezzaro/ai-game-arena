// Kernel Runtime
// Provides: DI, Event Bus, Lifecycle, Config, Logging, Capabilities, Plugin Contracts

export { Container } from './dependency-injection/container';
export type { ServiceIdentifier } from './dependency-injection/container';

export { InProcessEventBus } from './event-bus/event-bus';

export { ConsoleLogger } from './logging/logger';

export { Config } from './config/config';

export { LifecycleManager } from './lifecycle/lifecycle';
export type { LifecycleHook, LifecyclePhase, HealthStatus } from './lifecycle/lifecycle';

export { Tokens } from './tokens';
export { createContainer } from './composition/composition';
export type { CompositionConfig } from './composition/composition';

// Capabilities
export { Capability } from './capabilities/capability';

// Plugin Contracts
export { PluginManifestSchema } from './plugin-contracts/plugin-contract';
export type { PluginManifest, PluginCategory, PluginContext } from './plugin-contracts/plugin-contract';
