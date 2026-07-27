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