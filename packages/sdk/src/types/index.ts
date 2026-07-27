// Core types - identifiers
export type {
  BattleId,
  AgentId,
  GameId,
  ArenaId,
  PluginId,
  ProfileId,
  MatchId,
} from './identifiers';
export {
  createBattleId,
  createAgentId,
  createGameId,
  createArenaId,
  createPluginId,
  createProfileId,
  createMatchId,
} from './identifiers';

// Core domain types
export type {
  BattleConfig,
  BattleState,
  BattlePhase,
  AgentConfig,
  AgentProfile,
  AgentStrategy,
  ProviderConfig,
  MatchConfig,
} from './battle';
export type {
  ObservationType,
  Observation,
  ObservationData,
  ObservationMetadata,
} from './observation';
export type {
  ArenaConfig,
  ArenaPlugin,
  ArenaContainer,
  UiElement,
  UiElementType,
  UiPosition,
  DisplayConfig,
  WorldState,
  RenderState,
  ToolDefinition,
  ToolParameter,
  ValidationResult,
  ActionOutcome,
  GameEvent,
  WinCondition,
  ScoreMap,
} from './arena';
export type {
  AgentRuntime,
  AgentAction,
  AgentMessage,
  AgentMemory,
  MemoryEntry,
  AgentSession,
  Controller,
  InputAction,
  Capability,
  ParameterDefinition,
} from './agent';
export type {
  GameConfig,
  GameAdapter,
  ControllerAdapter,
  ObservationAdapter,
  GameState,
  NativeInputType,
  NativeInput,
} from './game';

// Plugin system
export type {
  PluginCategory,
  PluginManifest,
  ActivationConfig,
  Contributions,
  PluginContext,
  McpTool,
  EventHook,
  ServerRoute,
  CliCommand,
  UiPanelContribution,
  DashboardWidget,
  NavigationItem,
  ContextMenuItem,
  PluginStorage,
  Subscription,
  ServerMiddleware,
} from './plugin';

// Events
export type {
  DomainEvent,
  EventMetadata,
  EventHandler,
  EventBus,
  BattleCreated,
  BattleStarted,
  BattleFinished,
  BattleAborted,
  AgentJoinedBattle,
  AgentLeftBattle,
  TurnStarted,
  TurnFinished,
  ObservationCaptured,
  ToolRequested,
  ToolExecuted,
  ActionExecuted,
  ActionRejected,
  MessageSent,
  MessageReceived,
  StateChanged,
  ScoreUpdated,
  WinConditionMet,
  PluginActivated,
  PluginDeactivated,
} from './events';

// Infrastructure
export type { StorageAdapter, QueryFilter, QueryOperator } from './storage';
export type { Logger, LogLevel, LogContext } from './logging';
export type { ConfigReader } from './config';
